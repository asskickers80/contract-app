import { useEffect, useRef, useState } from 'react'
import CaptureBoard from '../components/CaptureBoard.jsx'
import { loadCardBoard, saveCardBoard, listCardBoards, deleteCardBoard } from '../lib/boardStore.js'
import { formatPhone } from '../lib/format.js'

// 보드 저장 키 자동 생성 (폼 제거로 전화번호 키 폐지)
const newBoardKey = () => `cap-${Date.now()}`

// ── 메인 ─────────────────────────────────────────────────────
export default function ListingTab({ onActiveCard }) {
  const [view, setView] = useState('home') // home | library | viewer
  const [boardKey, setBoardKey] = useState(null)
  const [initBoard, setInitBoard] = useState(null) // 신규 진입 시 초기 보드

  // 노트 탭에 현재 보드 키 전달
  useEffect(() => {
    onActiveCard?.(view === 'viewer' ? boardKey : null)
  }, [view, boardKey])

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
    return <CaptureViewer boardKey={boardKey} initBoard={initBoard} onBack={goHome} />
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
      <h1 className="text-2xl font-bold text-gray-800">캡처 뷰어</h1>
      <p className="text-sm text-gray-400">캡처 이미지에 포스트잇 메모를 붙여 보관하세요</p>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-2xl bg-blue-600 px-6 py-8 text-white active:bg-blue-700"
        >
          <span className="text-4xl">📷</span>
          <span className="text-lg font-bold">신규</span>
          <span className="text-xs opacity-80">사진첩에서 이미지를 선택해 새 보드를 만들어요</span>
        </button>

        <button
          onClick={onLibrary}
          className="flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-8 shadow-sm active:bg-gray-50"
        >
          <span className="text-4xl">📁</span>
          <span className="text-lg font-bold text-gray-800">불러오기</span>
          <span className="text-xs text-gray-400">저장된 캡처 보드를 이어서 편집해요</span>
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
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
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <button onClick={onBack} className="rounded-xl px-3 py-1.5 text-sm font-bold text-gray-500 active:bg-gray-100">← 뒤로</button>
        <span className="font-bold text-gray-900">불러오기</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {loading && <p className="py-10 text-center text-sm text-gray-300">불러오는 중…</p>}

        {!loading && (
          <div className="mx-auto max-w-2xl p-4">
            {captures.length === 0 && <p className="py-10 text-center text-sm text-gray-300">저장된 캡처 보드가 없어요</p>}
            <div className="grid grid-cols-2 gap-3">
              {captures.map(entry => (
                <div key={entry.key} onClick={() => onOpen(entry)}
                  className="relative cursor-pointer overflow-hidden rounded-xl bg-white shadow-sm active:opacity-80">
                  <img src={entry.image} alt="" className="aspect-[4/3] w-full object-cover" />
                  <div className="p-2 text-left">
                    <p className="text-xs font-semibold text-gray-700">
                      {String(entry.key).startsWith('cap-') ? '캡처 보드' : formatPhone(entry.key)}
                    </p>
                    <p className="text-[11px] text-gray-400">
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

// ── 캡처 뷰어 ────────────────────────────────────────────────
function CaptureViewer({ boardKey, initBoard, onBack }) {
  const [board, setBoard] = useState(initBoard)
  const [notice, setNotice] = useState(null)
  const imageFileRef = useRef()

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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3 py-2">
        <button onClick={onBack} className="rounded-xl px-3 py-1.5 text-sm font-bold text-gray-500 active:bg-gray-100">← 목록으로</button>
        <span className="flex-1 truncate text-center text-sm font-bold text-gray-900">캡처 뷰어</span>
        <button onClick={() => imageFileRef.current?.click()}
          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 active:bg-gray-200">
          {board?.image ? '이미지 교체' : '이미지 추가'}
        </button>
        <button onClick={handleSave} disabled={!board?.image}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white active:bg-blue-700 disabled:bg-gray-300">
          저장
        </button>
        <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      </div>

      {notice && (
        <p className={`shrink-0 px-4 py-2 text-center text-xs font-semibold ${notice.startsWith('저장 실패') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
          {notice}
        </p>
      )}

      {/* 보드: 남은 화면을 전부 차지, 이미지는 object-contain으로 딱 맞춤 */}
      <div className="min-h-0 flex-1 p-2">
        {board?.image
          ? <CaptureBoard board={board} onBoardChange={setBoard} />
          : <p className="py-8 text-center text-xs text-gray-300">이미지 추가 버튼으로 사진첩에서 불러올 수 있어요</p>
        }
      </div>
    </div>
  )
}
