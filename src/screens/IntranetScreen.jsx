import { useEffect, useRef, useState } from 'react'

// 회사 전산(점포라인) 내장 브라우저 — 프록시(api/proxy)를 거쳐 같은 출처가 되므로
// 앱 안에서 로그인·탐색이 되고, [이 매물 읽기]로 열린 페이지를 바로 AI 추출한다.
// 새 창 대응: 전산이 window.open·target=_blank로 여는 창을 앱 안의 탭(iframe)으로 받는다.
// (프록시 주입 스크립트가 __intranetOpen postMessage를 보낸다 — 앱 밖 이탈 방지)
const MAX_TABS = 6

export default function IntranetScreen({ onBack, onRead, busy }) {
  const [tabs, setTabs] = useState([{ id: 1, src: '/' }])
  const [activeTab, setActiveTab] = useState(1)
  const nextId = useRef(2)
  const frameRefs = useRef({})

  // 전산 페이지가 연 새 창 요청 수신 → 앱 안의 새 탭으로
  useEffect(() => {
    function onMsg(e) {
      if (e.origin !== location.origin) return
      const url = e.data && e.data.__intranetOpen
      if (typeof url !== 'string' || !url) return
      let path
      try {
        const u = new URL(url, location.origin)
        if (u.origin !== location.origin) return // 외부 도메인은 열지 않는다
        path = u.pathname + u.search
      } catch { return }
      if (path.startsWith('/app')) return
      setTabs(ts => {
        if (ts.length >= MAX_TABS) {
          // 창이 너무 많으면 마지막 탭을 재사용
          const last = ts[ts.length - 1]
          setActiveTab(last.id)
          return ts.map(t => (t.id === last.id ? { ...t, src: path } : t))
        }
        const id = nextId.current++
        setActiveTab(id)
        return [...ts, { id, src: path }]
      })
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  function addTab() {
    setTabs(ts => {
      if (ts.length >= MAX_TABS) return ts
      const id = nextId.current++
      setActiveTab(id)
      return [...ts, { id, src: '/' }]
    })
  }

  function closeTab(id) {
    setTabs(ts => {
      if (ts.length <= 1) return ts
      const next = ts.filter(t => t.id !== id)
      delete frameRefs.current[id]
      if (activeTab === id) setActiveTab(next[next.length - 1].id)
      return next
    })
  }

  function readPage() {
    let doc = null
    try {
      doc = frameRefs.current[activeTab]?.contentDocument
    } catch { /* 접근 불가 — 아래에서 안내 */ }
    if (!doc || !doc.body) {
      alert('전산 페이지를 읽을 수 없어요. 페이지가 다 열린 뒤 다시 눌러 주세요.')
      return
    }
    onRead(doc)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-2">
        <button onClick={onBack}
          className="rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-fg-2 active:bg-chip">← 뒤로</button>
        <span className="text-base font-extrabold text-fg">회사 전산</span>
        <button
          onClick={() => {
            const f = frameRefs.current[activeTab]
            if (f) f.src = f.src // eslint-disable-line no-self-assign
          }}
          aria-label="전산 새로고침"
          className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold text-fg-2 active:opacity-80">↻</button>
        <div className="flex-1" />
        <button onClick={readPage} disabled={busy}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary active:opacity-90 disabled:opacity-50">
          {busy ? '읽는 중…' : '📋 이 매물 읽기'}
        </button>
      </div>

      {/* 창(탭) 막대 — 전산이 새 창을 열면 여기 쌓인다 */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-4 pb-2">
        {tabs.map((t, i) => (
          <span key={t.id} className={`flex shrink-0 items-center overflow-hidden rounded-full text-xs font-bold ${
            activeTab === t.id ? 'bg-primary-container text-on-primary-container' : 'bg-chip text-fg-2'
          }`}>
            <button onClick={() => setActiveTab(t.id)} className="py-1.5 pl-3.5 pr-1.5">창 {i + 1}</button>
            {tabs.length > 1 && (
              <button onClick={() => closeTab(t.id)} aria-label={`창 ${i + 1} 닫기`} className="py-1.5 pl-1 pr-3 opacity-70">✕</button>
            )}
          </span>
        ))}
        {tabs.length < MAX_TABS && (
          <button onClick={addTab} aria-label="새 창"
            className="shrink-0 rounded-full bg-chip px-3 py-1.5 text-xs font-bold text-fg-2 active:opacity-80">＋</button>
        )}
        <span className="shrink-0 pl-1 text-[11px] text-fg-hint">
          매물 상세를 띄우고 [이 매물 읽기] — 캡처 없이 매물카드가 만들어져요
        </span>
      </div>

      {/* 모든 창을 유지하고 보이는 것만 전환 (로그인 세션·보던 페이지 유지) */}
      <div className="relative min-h-0 flex-1">
        {tabs.map(t => (
          <iframe
            key={t.id}
            ref={el => { if (el) frameRefs.current[t.id] = el }}
            src={t.src}
            title={`회사 전산 창 ${t.id}`}
            className={`absolute inset-0 h-full w-full border-0 bg-white ${activeTab === t.id ? '' : 'invisible'}`}
          />
        ))}
      </div>
    </div>
  )
}
