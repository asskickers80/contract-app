import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'

// 1번 탭 '천하통일' — 인트라넷을 브라우저처럼 사용 + 창 스트립(멀티 창) + 캡처
//
// 동작 모드 2가지:
// 1) 중계(프록시) 모드 — .env에 INTRANET_TARGET 설정 시.
//    개발 서버가 인트라넷을 같은 출처(/)로 중계 → iframe 내부 접근 가능 →
//    [캡처] 버튼으로 현재 창 화면을 캡처 → 모달에서 매물카드를 골라 첨부한다.
// 2) 직접 모드 — 주소를 앱에서 입력해 iframe으로 직접 임베드.
//    다른 출처라 캡처는 불가하고, 임베드 차단 대비 '인트라넷 열기 ↗' 폴백 제공.
const URL_KEY = 'app.intranetUrl'
const MAX_WINDOWS = 5
const LONG_PRESS_MS = 500
const PROXY_MODE = import.meta.env.VITE_PROXY_ENABLED === '1'
const PROXY_HOME = '/' // 중계 모드에서 인트라넷 루트
const DEFAULT_WIN_NAME = '천하통일' // 창 기본 대표문구 (로드 후 실제 페이지 제목으로 교체)

// 열린 창을 세션에 보존 → 로그인 성공 시 인트라넷이 앱(맨 위 창)을 리로드시켜도
// 창이 사라지지 않고 자동 복원된다. (탭 세션 동안 유지, 탭 닫으면 사라짐)
const WINDOWS_KEY = 'app.intranet.windows'
const ACTIVE_KEY = 'app.intranet.activeId'

function loadWindows() {
  try {
    const arr = JSON.parse(sessionStorage.getItem(WINDOWS_KEY) || 'null')
    if (Array.isArray(arr) && arr.length) return arr
  } catch { /* 무시 */ }
  return []
}

function normalizeUrl(input) {
  const t = String(input || '').trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `http://${t}`
}

export default function IntranetBrowser({ onCapture }) {
  const [savedUrl, setSavedUrl] = useState(localStorage.getItem(URL_KEY) || '')
  const [editing, setEditing] = useState(!PROXY_MODE && !savedUrl)
  const [draftUrl, setDraftUrl] = useState(savedUrl)
  const [showHint, setShowHint] = useState(!PROXY_MODE)
  const [capturing, setCapturing] = useState(false)

  const homeSrc = PROXY_MODE ? PROXY_HOME : savedUrl

  // 창 목록 — 첫 방문엔 비어 있고(자동 로드 안 함), 세션에 남아 있으면 복원한다.
  const [windows, setWindows] = useState(loadWindows)
  const [activeId, setActiveId] = useState(() => {
    const saved = Number(sessionStorage.getItem(ACTIVE_KEY))
    return saved || 1
  })
  // 다음 창 id — 복원된 창들의 최대 id + 1 (닫으면 1로 리셋)
  const nextIdRef = useRef(windows.reduce((m, w) => Math.max(m, w.id), 0) + 1)
  const frameRefs = useRef({}) // id → iframe 엘리먼트

  // 창 목록/활성 창을 세션에 보존 (리로드 시 복원용). 비면 저장분도 지운다.
  useEffect(() => {
    if (windows.length) {
      sessionStorage.setItem(WINDOWS_KEY, JSON.stringify(windows))
      sessionStorage.setItem(ACTIVE_KEY, String(activeId))
    } else {
      sessionStorage.removeItem(WINDOWS_KEY)
      sessionStorage.removeItem(ACTIVE_KEY)
    }
  }, [windows, activeId])

  const pressTimerRef = useRef(null)
  const longPressedRef = useRef(false)

  function saveUrl() {
    const url = normalizeUrl(draftUrl)
    if (!url) return
    localStorage.setItem(URL_KEY, url)
    setSavedUrl(url)
    setEditing(false)
    setWindows(ws => {
      if (ws.length === 0) {
        const id = nextIdRef.current++
        setActiveId(id)
        return [{ id, name: DEFAULT_WIN_NAME, src: url, frameKey: 0 }]
      }
      return ws.map(w => (w.id === activeId ? { ...w, src: url, frameKey: w.frameKey + 1 } : w))
    })
  }

  function addWindow() {
    if (windows.length >= MAX_WINDOWS || !homeSrc) return
    const id = nextIdRef.current++
    setWindows(ws => [...ws, { id, name: DEFAULT_WIN_NAME, src: homeSrc, frameKey: 0 }])
    setActiveId(id)
  }

  function reloadActive() {
    setWindows(ws => ws.map(w => (w.id === activeId ? { ...w, frameKey: w.frameKey + 1 } : w)))
  }

  function closeWindow(id) {
    setWindows(ws => {
      const idx = ws.findIndex(w => w.id === id)
      const next = ws.filter(w => w.id !== id)
      if (id === activeId && next.length) setActiveId(next[Math.max(0, idx - 1)].id)
      if (next.length === 0) nextIdRef.current = 1 // 모두 닫으면 번호 리셋
      return next
    })
  }

  // 창이 로드되면 그 페이지의 실제 제목을 창 대표문구로 삼는다 (같은출처=중계 모드에서만 가능).
  function handleFrameLoad(id) {
    try {
      const title = frameRefs.current[id]?.contentDocument?.title?.trim()
      if (title) setWindows(ws => ws.map(w => (w.id === id ? { ...w, name: title } : w)))
    } catch { /* 다른 출처 — 제목 못 읽음, 기본 대표문구 유지 */ }
  }

  function renameWindow(id) {
    const target = windows.find(w => w.id === id)
    if (!target) return
    const name = window.prompt('창 이름을 입력하세요', target.name)
    if (name?.trim()) {
      setWindows(ws => ws.map(w => (w.id === id ? { ...w, name: name.trim() } : w)))
    }
  }

  function chipPressStart(id) {
    longPressedRef.current = false
    pressTimerRef.current = setTimeout(() => {
      longPressedRef.current = true
      renameWindow(id)
    }, LONG_PRESS_MS)
  }

  function chipPressEnd(id) {
    clearTimeout(pressTimerRef.current)
    if (!longPressedRef.current) setActiveId(id)
  }

  // [캡처] — 현재 창 화면을 캡처해 매물카드에 첨부 (v3: '반영'은 매물카드→수수료 계산 전용 용어)
  async function reflect() {
    const iframe = frameRefs.current[activeId]
    let doc = null
    try {
      doc = iframe?.contentDocument
    } catch { /* 다른 출처 — 아래에서 안내 */ }
    if (!doc?.documentElement) {
      window.alert('이 창은 화면 캡처가 안 돼요.\n중계 모드(.env의 INTRANET_TARGET 설정)에서만 캡처가 가능합니다.')
      return
    }
    setCapturing(true)
    try {
      const canvas = await html2canvas(doc.documentElement, {
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      })
      onCapture?.(canvas.toDataURL('image/jpeg', 0.9))
    } catch (err) {
      window.alert(`캡처에 실패했어요: ${err.message || err}`)
    } finally {
      setCapturing(false)
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* 브라우저 툴바 */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 bg-white px-2 py-1.5">
        <button onClick={() => window.history.back()} aria-label="뒤로"
          className="h-10 w-10 shrink-0 rounded-xl text-lg text-gray-600 active:bg-gray-100">
          ←
        </button>
        <button onClick={reloadActive} aria-label="새로고침"
          className="h-10 w-10 shrink-0 rounded-xl text-lg text-gray-600 active:bg-gray-100">
          ⟳
        </button>
        {PROXY_MODE ? (
          <span className="min-w-0 flex-1 truncate rounded-xl bg-gray-100 px-3 py-2 text-xs text-gray-500">
            {windows.find(w => w.id === activeId)?.name || '천하통일'}
          </span>
        ) : (
          <button onClick={() => { setDraftUrl(savedUrl); setEditing(true) }}
            className="min-w-0 flex-1 truncate rounded-xl bg-gray-100 px-3 py-2 text-left text-xs text-gray-500 active:bg-gray-200"
            title="주소 변경">
            {savedUrl || '주소를 설정해 주세요'}
          </button>
        )}
        <button onClick={reflect} disabled={capturing || windows.length === 0}
          className="h-10 shrink-0 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white active:bg-blue-700 disabled:bg-gray-300">
          {capturing ? '캡처 중…' : '캡처'}
        </button>
        <button onClick={() => window.open(PROXY_MODE ? PROXY_HOME : savedUrl, '_blank')}
          className="h-10 shrink-0 rounded-xl bg-gray-900 px-3 text-xs font-bold text-white active:bg-gray-700">
          인트라넷 열기 ↗
        </button>
      </div>

      {/* 창 스트립 */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-slate-50 px-2 py-1">
        {windows.map(w => (
          <span
            key={w.id}
            className={`flex h-9 shrink-0 items-stretch overflow-hidden rounded-lg ${
              w.id === activeId ? 'bg-blue-600' : 'bg-white shadow-sm'
            }`}
          >
            <button
              onPointerDown={() => chipPressStart(w.id)}
              onPointerUp={() => chipPressEnd(w.id)}
              onPointerLeave={() => clearTimeout(pressTimerRef.current)}
              onContextMenu={e => e.preventDefault()}
              className={`max-w-[11rem] select-none truncate pl-3 text-xs font-semibold ${
                w.id === activeId ? 'pr-1 text-white' : 'pr-3 text-gray-600 active:bg-blue-50'
              }`}
              style={{ WebkitTouchCallout: 'none' }}
              title={`${w.name} · 길게 누르면 이름 변경`}
            >
              {w.name}
            </button>
            {w.id === activeId && (
              <button
                onClick={() => closeWindow(w.id)}
                aria-label={`${w.name} 닫기`}
                className="pl-1 pr-2.5 text-sm text-white/70 active:text-white"
              >
                ✕
              </button>
            )}
          </span>
        ))}
        {windows.length < MAX_WINDOWS && homeSrc && (
          <button onClick={addWindow} aria-label="새 창"
            className="h-9 w-9 shrink-0 rounded-lg bg-white text-base font-bold text-gray-500 shadow-sm active:bg-blue-50">
            +
          </button>
        )}
        <span className="ml-auto shrink-0 pr-1 text-[10px] text-gray-300">{windows.length}/{MAX_WINDOWS} · 길게 눌러 이름 변경</span>
      </div>

      {showHint && !PROXY_MODE && (
        <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-3 py-2">
          <p className="flex-1 text-xs leading-relaxed text-amber-800">
            아래 화면이 비어 보이거나 로그인이 자꾸 풀리면, 인트라넷이 앱 내 표시(임베드)를 막는 경우예요.
            그때는 오른쪽 위 <b>인트라넷 열기 ↗</b> 버튼으로 새 창에서 사용해 주세요.
          </p>
          <button onClick={() => setShowHint(false)} className="shrink-0 px-1 text-sm text-amber-400">✕</button>
        </div>
      )}

      {/* 임베드 영역 — 모든 창 상시 마운트, 비활성은 숨김(상태 유지) */}
      <div className="relative min-h-0 flex-1 bg-white">
        {windows.map(w => (
          <iframe
            key={`${w.id}-${w.frameKey}`}
            ref={el => { frameRefs.current[w.id] = el }}
            src={w.src}
            title={`인트라넷 ${w.name}`}
            onLoad={() => handleFrameLoad(w.id)}
            className={`absolute inset-0 h-full w-full border-0 ${w.id === activeId ? '' : 'hidden'}`}
          />
        ))}
        {windows.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            {homeSrc ? (
              <>
                <img src={`${import.meta.env.BASE_URL}jeompoline-tree.png`} alt="" className="h-16 w-16 object-contain opacity-90" />
                <p className="text-sm text-gray-400">점포라인 인트라넷을 앱 안에서 엽니다</p>
                <button onClick={addWindow}
                  className="rounded-2xl bg-blue-600 px-8 py-4 text-base font-bold text-white shadow-sm active:bg-blue-700">
                  인트라넷 열기
                </button>
                <p className="text-xs text-gray-300">열고 나면 [캡처]로 화면을 매물카드에 붙일 수 있어요</p>
              </>
            ) : (
              <p className="text-sm text-gray-300">주소를 설정하면 창이 열립니다</p>
            )}
          </div>
        )}
      </div>

      {/* 주소 설정 오버레이 (직접 모드 전용) */}
      {editing && !PROXY_MODE && (
        <div className="absolute inset-0 z-10 flex items-start justify-center bg-slate-100/95 px-4 pt-16">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">인트라넷 주소 설정</h2>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              천하통일 탭에서 열 인트라넷 주소를 입력해 주세요. 저장하면 현재 창에 적용됩니다.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="url"
                value={draftUrl}
                onChange={e => setDraftUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveUrl()}
                placeholder="예: 192.168.0.10:8080 또는 http://intranet.example.com"
                className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
              />
              <button onClick={saveUrl} disabled={!draftUrl.trim()}
                className="rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:bg-gray-300">
                저장
              </button>
            </div>
            {savedUrl && (
              <button onClick={() => { setDraftUrl(savedUrl); setEditing(false) }}
                className="mt-3 text-sm text-gray-400 underline">
                취소
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
