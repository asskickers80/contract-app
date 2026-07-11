// 캡처+포스트잇 보드 저장소 (IndexedDB)
// v2: 카드별 보드('cards' 스토어, key = 전화번호 숫자) — 매물카드 귀속 구조
// v1의 전역 보드('board' 스토어)는 레거시 데이터 보존을 위해 삭제하지 않고 읽기만 유지한다.
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

// ── 카드별 보드: { image, notes: [{id,x,y,color,text}], capturedAt } ──
export function saveCardBoard(cardKey, board) {
  return put(CARD_STORE, cardKey, board)
}

export function loadCardBoard(cardKey) {
  return get(CARD_STORE, cardKey)
}

// ── 저장된 보드 전체 목록: [{ key, image, capturedAt }] ──
export function listCardBoards() {
  return openDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(CARD_STORE, 'readonly')
    const store = tx.objectStore(CARD_STORE)
    const keys = [], values = []
    store.openKeyCursor().onsuccess = e => {
      const cursor = e.target.result
      if (cursor) { keys.push(cursor.key); cursor.continue() }
    }
    store.openCursor().onsuccess = e => {
      const cursor = e.target.result
      if (cursor) { values.push({ key: cursor.key, ...cursor.value }); cursor.continue() }
      else resolve(values.sort((a, b) => (b.capturedAt || '').localeCompare(a.capturedAt || '')))
    }
    tx.onerror = () => reject(tx.error)
  }))
}

export function deleteCardBoard(cardKey) {
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
