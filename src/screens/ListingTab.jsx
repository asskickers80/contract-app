import { useEffect, useRef, useState } from 'react'
import CaptureBoard from '../components/CaptureBoard.jsx'
import { loadCardBoard, saveCardBoard, listCardBoards, deleteCardBoard } from '../lib/boardStore.js'
import { formatPhone, formatComma, parseAmount, formatBizNo } from '../lib/format.js'
import { loadUi, saveUi } from '../lib/uiState.js'
import { useBackClose } from '../lib/backNav.js'

// 보드 저장 키 자동 생성 (폼 제거로 전화번호 키 폐지)
const newBoardKey = () => `cap-${Date.now()}`

// ── 메인 ─────────────────────────────────────────────────────
export default function ListingTab({ onActiveCard, active }) {
  // 새로고침해도 보던 화면(라이브러리/캡처 뷰어)으로 복원
  const [view, setView] = useState(() => {
    const s = loadUi('listing')
    if (s?.view === 'viewer' && s.boardKey) return 'viewer'
    if (s?.view === 'library') return 'library'
    return 'home' // home | library | viewer
  })
  const [boardKey, setBoardKey] = useState(() => loadUi('listing')?.boardKey ?? null)
  const [initBoard, setInitBoard] = useState(null) // 신규 진입 시 초기 보드 (복원 시엔 저장소에서 로드)

  useEffect(() => { saveUi('listing', { view, boardKey }) }, [view, boardKey])

  // 노트 탭에 현재 보드 키 전달
  useEffect(() => {
    onActiveCard?.(view === 'viewer' ? boardKey : null)
  }, [view, boardKey])

  // 뒤로 가기: 뷰어/라이브러리가 열려 있으면 홈으로 (앱 밖으로 나가지 않음)
  useBackClose(active && view !== 'home', goHome)

  function openNew(image) {
    setBoardKey(newBoardKey())
    setInitBoard({ image, notes: [], capturedAt: new Date().toISOString() })
    setView('viewer')
  }

  function openSaved(entry) {
    setBoardKey(entry.key)
    setInitBoard(null)
    setView('viewer')
  }

  function goHome() {
    setView('home')
    setBoardKey(null)
    setInitBoard(null)
  }

  if (view === 'viewer' && boardKey) {
    return <CaptureViewer boardKey={boardKey} initBoard={initBoard} onBack={goHome} active={active} />
  }

  if (view === 'library') {
    return <LibraryScreen onOpen={openSaved} onBack={goHome} />
  }

  return <HomeScreen onNew={openNew} onLibrary={() => setView('library')} />
}

// ── 홈: 신규 / 불러오기 ──────────────────────────────────────
function HomeScreen({ onNew, onLibrary }) {
  const fileRef = useRef()

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onNew(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-8">
      <h1 className="text-2xl font-extrabold text-fg">캡처 뷰어</h1>
      <p className="text-sm text-fg-hint">캡처 이미지에 포스트잇 메모를 붙여 보관하세요</p>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-2xl bg-primary px-6 py-8 text-on-primary shadow-card active:opacity-90"
        >
          {/* 사진 추가 아이콘 (Material add_photo_alternate) */}
          <svg viewBox="0 0 24 24" className="h-10 w-10 fill-current opacity-95" aria-hidden="true">
            <path d="M21.02 5H19V2.98c0-.54-.44-.98-.98-.98h-.03c-.55 0-.99.44-.99.98V5h-2.01c-.54 0-.98.44-.99.98v.03c0 .55.44.99.99.99H17v2.01c0 .54.44.99.99.98h.03c.54 0 .98-.44.98-.98V7h2.02c.54 0 .98-.44.98-.98v-.04c0-.54-.44-.98-.98-.98zM16 9.01V8h-1.01c-.53 0-1.03-.21-1.41-.58-.37-.38-.58-.88-.58-1.44 0-.36.1-.69.27-.98H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8.28c-.3.17-.64.28-1.02.28-1.09-.01-1.98-.9-1.98-1.99zM15.96 19H6.04c-.41 0-.65-.47-.4-.8l1.98-2.63c.21-.28.62-.26.82.02L10.22 18l2.61-3.48c.2-.26.59-.27.79-.01l2.75 3.69c.25.33.01.8-.41.8z"/>
          </svg>
          <span className="text-lg font-extrabold tracking-widest">NEW</span>
          <span className="text-xs opacity-80">새로운 매물카드로 보드를 시작해요</span>
        </button>

        <button
          onClick={onLibrary}
          className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-8 shadow-card active:opacity-80"
        >
          <span className="text-4xl">📁</span>
          <span className="text-lg font-bold text-fg">불러오기</span>
          <span className="text-xs text-fg-hint">저장된 캡처 보드를 이어서 편집해요</span>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="text-[11px] text-fg-disabled">버전 {__BUILD_TIME__} 빌드</p>
    </div>
  )
}

// ── 불러오기 라이브러리 ──────────────────────────────────────
function LibraryScreen({ onOpen, onBack }) {
  const [captures, setCaptures] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listCardBoards()
      .then(b => setCaptures(b.filter(entry => entry.image)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(e, entry) {
    e.stopPropagation()
    if (!confirm('이 캡처 보드를 삭제할까요?')) return
    await deleteCardBoard(entry.key).catch(() => {})
    setCaptures(cs => cs.filter(c => c.key !== entry.key))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-3">
        <button onClick={onBack} className="rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-fg-2 active:bg-chip">← 뒤로</button>
        <span className="text-base font-extrabold text-fg">불러오기</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {loading && <p className="py-10 text-center text-sm text-fg-hint">불러오는 중…</p>}

        {!loading && (
          <div className="mx-auto max-w-2xl p-4">
            {captures.length === 0 && <p className="py-10 text-center text-sm text-fg-hint">저장된 캡처 보드가 없어요</p>}
            <div className="grid grid-cols-2 gap-3">
              {captures.map(entry => (
                <div key={entry.key} onClick={() => onOpen(entry)}
                  className="relative cursor-pointer overflow-hidden rounded-xl bg-card shadow-card active:opacity-80">
                  <img src={entry.image} alt="" className="aspect-[4/3] w-full object-cover" />
                  <div className="p-2 text-left">
                    <p className="text-xs font-semibold text-fg-2">
                      {String(entry.key).startsWith('cap-') ? '캡처 보드' : formatPhone(entry.key)}
                    </p>
                    <p className="text-[11px] text-fg-hint">
                      {entry.capturedAt ? new Date(entry.capturedAt).toLocaleString('ko-KR') : ''}
                    </p>
                  </div>
                  <button
                    onClick={e => handleDelete(e, entry)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white active:bg-black/60"
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// AI 추출 전 이미지 축소 — 전송 용량(Vercel 4.5MB 제한) 안에서 최대 해상도 유지(정확도 우선)
function downscaleImage(dataUrl, max = 2048) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      resolve(c.toDataURL('image/jpeg', 0.9))
    }
    img.onerror = () => reject(new Error('이미지를 읽을 수 없어요'))
    img.src = dataUrl
  })
}

// ── 캡처 뷰어 ────────────────────────────────────────────────
function CaptureViewer({ boardKey, initBoard, onBack, active }) {
  const [board, setBoard] = useState(initBoard)
  const [notice, setNotice] = useState(null)
  const [extracting, setExtracting] = useState(false)
  const [infoDraft, setInfoDraft] = useState(null) // 열려 있는 매물 정보 패널의 편집본
  const imageFileRef = useRef()
  const extractedImageRef = useRef(null) // 이번 세션에서 추출을 마친 이미지 (중복 실행 방지)

  // 뒤로 가기: 매물 정보 패널이 열려 있으면 패널만 닫는다
  useBackClose(active && !!infoDraft, () => setInfoDraft(null))

  // 캡처를 열면 자동으로 추출 시작 — 정보가 없는 새 캡처, 또는 이미지를 교체했을 때
  useEffect(() => {
    const img = board?.image
    if (!img || extracting) return
    if (extractedImageRef.current === img) return
    if (board.info && extractedImageRef.current === null) {
      extractedImageRef.current = img // 이미 저장된 정보가 있는 보드 — 재추출하지 않음
      return
    }
    extractedImageRef.current = img
    handleExtract()
  }, [board?.image])

  // 라이브러리에서 열 땐 저장된 키로 보드 로드
  useEffect(() => {
    if (initBoard) return
    loadCardBoard(boardKey)
      .then(b => setBoard(b || { image: null, notes: [] }))
      .catch(() => setBoard({ image: null, notes: [] }))
  }, [boardKey])

  // 자동 저장 (디바운스)
  useEffect(() => {
    if (!board?.image) return
    const t = setTimeout(() => saveCardBoard(boardKey, board).catch(() => {}), 400)
    return () => clearTimeout(t)
  }, [board, boardKey])

  async function handleSave() {
    if (!board?.image) return
    try {
      await saveCardBoard(boardKey, board)
      setNotice('저장되었습니다')
    } catch (err) {
      setNotice(`저장 실패: ${err.message || err}`)
    }
    setTimeout(() => setNotice(null), 2000)
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setBoard(prev => ({ ...(prev || { notes: [] }), image: ev.target.result, capturedAt: new Date().toISOString() }))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // AI로 캡처에서 매물 정보 추출 — 결과는 보드에 바로 저장 (자동 실행 전제)
  async function handleExtract({ openPanel = false } = {}) {
    if (!board?.image || extracting) return
    setExtracting(true)
    setNotice(null)
    try {
      const image = await downscaleImage(board.image)
      const r = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ image }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      // 기존 저장값 위에 새 추출값을 덮되, null(못 찾음)은 기존 값을 지우지 않는다
      const merged = { ...(board.info || {}) }
      for (const [k, v] of Object.entries(data.fields || {})) {
        if (v !== null && v !== undefined && v !== '') merged[k] = v
      }
      setBoard(prev => ({ ...prev, info: merged })) // 자동 저장(디바운스)으로 함께 저장됨
      if (openPanel || infoDraft) setInfoDraft(merged) // 패널이 열려 있으면 갱신
      else {
        setNotice('매물 정보 추출 완료 — [매물 정보] 버튼에서 확인·수정할 수 있어요')
        setTimeout(() => setNotice(null), 4000)
      }
    } catch (err) {
      setNotice(`정보 읽기 실패: ${err.message || err}`)
      setTimeout(() => setNotice(null), 4000)
    } finally {
      setExtracting(false)
    }
  }

  function handleInfoSave() {
    setBoard(prev => ({ ...prev, info: infoDraft }))
    setInfoDraft(null)
    setNotice('매물 정보가 저장되었습니다')
    setTimeout(() => setNotice(null), 2000)
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex shrink-0 items-center gap-2 px-4 py-2">
        <button onClick={onBack} className="rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-fg-2 active:bg-chip">← 목록으로</button>
        <span className="flex-1 truncate text-center text-base font-extrabold text-fg">캡처 뷰어</span>
        <button
          onClick={() => (board?.info ? setInfoDraft({ ...board.info }) : handleExtract({ openPanel: true }))}
          disabled={!board?.image || extracting}
          className="h-9 rounded-full bg-primary-container px-4 text-[13px] font-semibold text-on-primary-container active:opacity-80 disabled:opacity-40"
        >
          {extracting ? 'AI 읽는 중…' : board?.info ? '매물 정보' : 'AI 읽기'}
        </button>
        <button onClick={() => imageFileRef.current?.click()}
          className="h-9 rounded-full border border-line bg-card px-4 text-[13px] font-semibold text-primary active:bg-chip">
          {board?.image ? '이미지 교체' : '이미지 추가'}
        </button>
        <button onClick={handleSave} disabled={!board?.image}
          className="h-9 rounded-full bg-primary px-5 text-[13px] font-semibold text-on-primary active:opacity-90 disabled:bg-off-bg disabled:text-off-fg">
          저장
        </button>
        <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      </div>

      {notice && (
        <p className={`mx-4 shrink-0 rounded-xl px-4 py-2 text-center text-xs font-bold ${notice.startsWith('저장 실패') || notice.startsWith('정보 읽기 실패') ? 'bg-danger-container text-on-danger-container' : 'bg-ok text-on-ok'}`}>
          {notice}
        </p>
      )}

      {/* 보드: 남은 화면을 전부 차지, 이미지는 object-contain으로 딱 맞춤 */}
      <div className="min-h-0 flex-1 px-4 pb-4 pt-1">
        {board?.image
          ? <CaptureBoard board={board} onBoardChange={setBoard} />
          : <p className="py-8 text-center text-xs text-fg-hint">이미지 추가 버튼으로 사진첩에서 불러올 수 있어요</p>
        }
      </div>

      {/* 매물 정보 확인·수정 패널 (AI 추출 결과) */}
      {infoDraft && (
        <InfoPanel
          info={infoDraft}
          setInfo={setInfoDraft}
          extracting={extracting}
          onReextract={handleExtract}
          onSave={handleInfoSave}
          onClose={() => setInfoDraft(null)}
        />
      )}
    </div>
  )
}

// ── 매물 정보 패널 ───────────────────────────────────────────
const INFO_FIELDS = [
  ['storeName', '상호', 'text'],
  ['businessType', '업종', 'text'],
  ['address', '소재지', 'text'],
  ['bizNo', '사업자등록번호', 'biz'],
  ['deposit', '보증금', 'money'],
  ['monthlyRent', '월세', 'money'],
  ['premium', '희망권리금', 'money'],
  ['maintenanceFee', '관리비', 'money'],
  ['phone', '전화번호', 'phone'],
  ['ownerName', '연락처 이름', 'text'],
]

function InfoPanel({ info, setInfo, extracting, onReextract, onSave, onClose }) {
  const set = (key, value) => setInfo(prev => ({ ...prev, [key]: value }))

  const field = ([key, label, type]) => (
    <label key={key} className={`block ${type === 'money' ? '' : 'col-span-2'}`}>
      <span className="text-xs font-medium text-fg-2">{label}</span>
      {type === 'money' ? (
        <div className="mt-1 flex items-center gap-1">
          <input type="text" inputMode="numeric"
            value={info[key] == null || info[key] === '' ? '' : formatComma(info[key])}
            onChange={e => set(key, e.target.value.trim() === '' ? null : parseAmount(e.target.value))}
            className="w-full min-w-0 rounded-xl bg-field px-3 py-2.5 text-right text-base font-bold text-fg focus:outline-none focus:ring-2 focus:ring-primary" />
          <span className="shrink-0 text-xs text-fg-hint">원</span>
        </div>
      ) : (
        <input type={type === 'phone' ? 'tel' : 'text'}
          inputMode={type === 'phone' || type === 'biz' ? 'numeric' : undefined}
          value={type === 'biz' ? formatBizNo(info[key] || '') : (info[key] || '')}
          onChange={e => set(key, type === 'phone' ? formatPhone(e.target.value) : type === 'biz' ? formatBizNo(e.target.value) : e.target.value)}
          className="mt-1 w-full rounded-xl bg-field px-3.5 py-2.5 text-base font-semibold text-fg focus:outline-none focus:ring-2 focus:ring-primary" />
      )}
    </label>
  )

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-fg">매물 정보</p>
            <p className="text-[11px] text-fg-hint">AI가 읽은 내용이에요 — 확인·수정 후 저장하세요</p>
          </div>
          <button onClick={onReextract} disabled={extracting}
            className="rounded-full bg-primary-container px-3.5 py-2 text-xs font-semibold text-on-primary-container active:opacity-80 disabled:opacity-40">
            {extracting ? '읽는 중…' : '다시 읽기'}
          </button>
          <button onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-fg-2 active:bg-chip">✕</button>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-3 overflow-y-auto px-4 py-3">
          {INFO_FIELDS.map(field)}
        </div>

        <div className="shrink-0 p-3">
          <button onClick={onSave}
            className="w-full rounded-full bg-primary py-3 text-sm font-bold text-on-primary active:opacity-90">
            정보 저장
          </button>
        </div>
      </div>
    </div>
  )
}
