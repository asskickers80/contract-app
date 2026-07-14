// 캡처+포스트잇 보드 저장소 — 서버(Supabase boards) 우선 + 기기(IndexedDB) 캐시 이중 저장
// 2026-07-14: 홈 화면 앱 재설치/기기 변경 시 기기 저장소가 비워져 작업이 사라지는 문제를 겪음
//  → 모든 보드를 서버에도 저장한다. 서버 실패(오프라인·테이블 미생성)여도 로컬 저장은 유지.
// v2: 카드별 보드('cards' 스토어) — v1 전역 보드('board')는 레거시 보존.
import { supabase, isSupabaseConfigured } from './supabase.js'

const DB_NAME = 'unify-board'
const DB_VER = 2
const LEGACY_STORE = 'board'
const CARD_STORE = 'cards'
const LEGACY_KEY = 'current'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(LEGACY_STORE)) db.createObjectStore(LEGACY_STORE)
      if (!db.objectStoreNames.contains(CARD_STORE)) db.createObjectStore(CARD_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function put(store, key, value) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}

function get(store, key) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const req = tx.objectStore(store).get(key)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  }))
}

// ── 이미지 지문/썸네일 (서버 전송량 절약 + 같은 캡처 중복 방지) ──

// 큰 dataURL을 매번 비교하지 않도록 간단한 지문 생성
export function imageSig(dataUrl) {
  if (!dataUrl) return null
  let h = 0
  for (let i = 0; i < dataUrl.length; i += 997) h = (h * 31 + dataUrl.charCodeAt(i)) | 0
  return `${dataUrl.length}:${h}`
}

// 목록 표시용 썸네일 (원본 이미지는 보드를 열 때만 내려받는다)
async function makeThumb(dataUrl) {
  try {
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const scale = Math.min(1, 480 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  }
}

// ── 원격 동기화 ──────────────────────────────────────────────
const pushedSig = new Map()   // key → 서버에 올라간 이미지 지문 (이미지 재전송 방지)
const pushChain = new Map()   // key → 순서 보장용 프로미스 체인
const pushTimers = new Map()  // key → 디바운스 타이머 (필기 중 과도한 전송 방지)
const pendingBoards = new Map()

async function pushRemote(cardKey, board) {
  if (!isSupabaseConfigured || !board) return
  try {
    const key = String(cardKey)
    const sig = imageSig(board.image)
    const row = {
      key,
      store_name: board.info?.storeName || null,
      captured_at: board.capturedAt || null,
      updated_at: new Date().toISOString(),
      image_sig: sig,
      data: { ...board, image: null }, // 원본 이미지는 별도 컬럼 — 변경 시에만 전송
    }
    if (pushedSig.get(key) !== sig) {
      row.image = board.image || null
      row.thumb = board.image ? await makeThumb(board.image) : null
    }
    const { error } = await supabase.from('boards').upsert(row)
    if (!error && 'image' in row) pushedSig.set(key, sig)
  } catch {
    // 오프라인 등 — 로컬 저장은 유지되며 다음 저장 때 다시 시도된다
  }
}

function queuePush(cardKey, board) {
  const key = String(cardKey)
  const prev = pushChain.get(key) || Promise.resolve()
  const next = prev.then(() => pushRemote(cardKey, board))
  pushChain.set(key, next)
  return next
}

// 필기처럼 잦은 저장은 1.5초 묶어서 서버로 보낸다
function schedulePush(cardKey, board) {
  const key = String(cardKey)
  pendingBoards.set(key, { cardKey, board })
  if (pushTimers.has(key)) return
  pushTimers.set(key, setTimeout(() => {
    pushTimers.delete(key)
    const p = pendingBoards.get(key)
    pendingBoards.delete(key)
    if (p) queuePush(p.cardKey, p.board)
  }, 1500))
}

function flushPending() {
  for (const [key, t] of pushTimers) clearTimeout(t)
  pushTimers.clear()
  for (const [, p] of pendingBoards) queuePush(p.cardKey, p.board)
  pendingBoards.clear()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPending)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPending()
  })
}

// 서버 행 → 보드 객체
function rowToBoard(r, { thumbAsImage = false } = {}) {
  if (!r) return null
  return {
    ...(r.data || {}),
    image: thumbAsImage ? (r.thumb || r.image || null) : (r.image || null),
    imageSig: r.image_sig || null,
    capturedAt: r.captured_at || r.data?.capturedAt || null,
  }
}

// ── 공개 API (기존 시그니처 유지) ────────────────────────────

// 저장: 기기 즉시 + 서버 디바운스
export function saveCardBoard(cardKey, board) {
  schedulePush(cardKey, board)
  return put(CARD_STORE, cardKey, board)
}

// 열기: 서버 우선(기기 교체·재설치 대응), 실패 시 기기 캐시
export async function loadCardBoard(cardKey) {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('boards').select('*').eq('key', String(cardKey)).maybeSingle()
      if (!error && data) {
        const board = rowToBoard(data)
        pushedSig.set(String(cardKey), board.imageSig || imageSig(board.image))
        put(CARD_STORE, cardKey, board).catch(() => {}) // 기기 캐시 갱신
        return board
      }
    } catch { /* 원격 실패 → 기기 캐시로 */ }
  }
  return get(CARD_STORE, cardKey)
}

function listLocalBoards() {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(CARD_STORE, 'readonly')
    const store = tx.objectStore(CARD_STORE)
    const values = []
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result
      if (cursor) { values.push({ key: cursor.key, ...cursor.value }); cursor.continue() }
      else resolve(values.sort((a, b) => (b.capturedAt || '').localeCompare(a.capturedAt || '')))
    }
    tx.onerror = () => reject(tx.error)
  }))
}

// 목록: 서버 + 기기 병합 (서버 우선). 기기에만 있는 보드는 서버로 자동 업로드(복구 겸 이관).
// 목록의 image는 썸네일 — 실제 열기는 loadCardBoard가 원본을 가져온다.
export async function listCardBoards() {
  const localP = listLocalBoards().catch(() => [])
  if (!isSupabaseConfigured) return localP
  try {
    const { data, error } = await supabase
      .from('boards')
      .select('key, store_name, captured_at, thumb, image_sig, data')
      .order('captured_at', { ascending: false })
      .limit(300)
    if (error || !data) return localP
    const remote = data.map(r => ({ key: r.key, ...rowToBoard(r, { thumbAsImage: true }) }))
    const remoteKeys = new Set(remote.map(r => String(r.key)))
    const local = await localP
    const localOnly = local.filter(l => !remoteKeys.has(String(l.key)))
    for (const l of localOnly) queuePush(l.key, l) // 기기에만 남은 작업 → 서버로 복구
    return [...remote, ...localOnly]
      .sort((a, b) => (b.capturedAt || '').localeCompare(a.capturedAt || ''))
  } catch {
    return localP
  }
}

export async function deleteCardBoard(cardKey) {
  const key = String(cardKey)
  // 예약된 서버 전송 취소 — 삭제 직후 디바운스 저장이 도착해 보드가 되살아나는 것 방지
  const timer = pushTimers.get(key)
  if (timer) { clearTimeout(timer); pushTimers.delete(key) }
  pendingBoards.delete(key)
  if (isSupabaseConfigured) {
    // 진행 중인 전송이 있으면 그 뒤에 삭제를 붙여 순서 보장
    const prev = pushChain.get(key) || Promise.resolve()
    const del = prev.then(() => supabase.from('boards').delete().eq('key', key)).catch(() => {})
    pushChain.set(key, del)
    try { await del } catch { /* 로컬만 삭제 */ }
  }
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(CARD_STORE, 'readwrite')
    tx.objectStore(CARD_STORE).delete(cardKey)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  }))
}

// ── 레거시(폐지된 상담 메모 탭) 전역 보드 — 읽기 전용, 삭제 금지 ──
export function loadLegacyBoard() {
  return get(LEGACY_STORE, LEGACY_KEY)
}
