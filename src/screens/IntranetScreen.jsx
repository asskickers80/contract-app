import { useEffect, useRef, useState } from 'react'

// 회사 전산(점포라인) 내장 브라우저 — 프록시(api/proxy)를 거쳐 같은 출처가 되므로
// 앱 안에서 로그인·탐색이 되고, [이 매물 읽기]로 열린 페이지를 바로 AI 추출한다.
// 새 창 대응: 전산이 window.open·target 링크·target 폼으로 여는 창을 앱 안의 탭(iframe)으로 받는다.
//  - 이름 있는 창('매물카드' 등)은 같은 이름이면 그 탭을 재사용한다 (옛 전산의 팝업 방식)
//  - ensure 요청은 폼 제출용 빈 창을 먼저 확보한다 (이미 있으면 내용을 건드리지 않음)
const MAX_TABS = 6
const NAME_OK = /^[\w-]{1,60}$/

export default function IntranetScreen({ onBack, onRead, busy }) {
  const [tabs, setTabsState] = useState([{ id: 1, src: '/', name: '', rev: 0 }])
  const [activeTab, setActiveTab] = useState(1)
  const nextId = useRef(2)
  const frameRefs = useRef({})
  // 창 목록은 ref가 진실 — 메시지가 연달아 와도(빈 창 생성 직후 location 대입 등) 같은 이름 창이 중복 생성되지 않게
  const tabsRef = useRef(tabs)
  function commitTabs(next) {
    tabsRef.current = next
    setTabsState(next)
  }

  // 전산 페이지가 연 새 창 요청 수신 → 앱 안의 탭으로
  useEffect(() => {
    function onMsg(e) {
      if (e.origin !== location.origin) return
      const d = e.data
      if (!d || typeof d.__intranetOpen !== 'string') return
      const name = typeof d.name === 'string' && NAME_OK.test(d.name) ? d.name : ''
      let path = 'about:blank'
      if (d.__intranetOpen && d.__intranetOpen !== 'about:blank') {
        try {
          const u = new URL(d.__intranetOpen, location.origin)
          if (u.origin !== location.origin) return // 외부 도메인은 열지 않는다
          path = u.pathname + u.search
        } catch { return }
        if (path.startsWith('/app')) return
      }
      const cur = tabsRef.current
      const existing = name ? cur.find(t => t.name === name) : null
      if (existing) {
        setActiveTab(existing.id)
        if (!d.ensure) {
          commitTabs(cur.map(t => (t.id === existing.id ? { ...t, src: path, rev: t.rev + 1 } : t)))
        }
        return
      }
      if (cur.length >= MAX_TABS) {
        // 창이 너무 많으면 마지막 탭을 재사용
        const last = cur[cur.length - 1]
        setActiveTab(last.id)
        commitTabs(cur.map(t => (t.id === last.id ? { ...t, src: path, name, rev: t.rev + 1 } : t)))
        return
      }
      const id = nextId.current++
      setActiveTab(id)
      commitTabs([...cur, { id, src: path, name, rev: 0 }])
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  function addTab() {
    const cur = tabsRef.current
    if (cur.length >= MAX_TABS) return
    const id = nextId.current++
    setActiveTab(id)
    commitTabs([...cur, { id, src: '/', name: '', rev: 0 }])
  }

  function closeTab(id) {
    const cur = tabsRef.current
    if (cur.length <= 1) return
    const next = cur.filter(t => t.id !== id)
    delete frameRefs.current[id]
    if (activeTab === id) setActiveTab(next[next.length - 1].id)
    commitTabs(next)
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

      {/* 창(탭) 막대 — 전산이 새 창을 열면 여기 쌓인다. 어느 창이든 [이 매물 읽기]는 보고 있는 창을 읽는다 */}
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
            key={`${t.id}-${t.rev}`}
            name={t.name || undefined}
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
