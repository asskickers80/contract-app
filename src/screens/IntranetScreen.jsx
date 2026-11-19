import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

// 회사 전산(점포라인) 내장 브라우저 — 프록시(api/proxy)를 거쳐 같은 출처가 되므로
// 앱 안에서 로그인·탐색이 되고, [이 매물 읽기]로 열린 페이지를 바로 AI 추출한다.
//
// 새 창은 앱 안의 "창 탭"(iframe)으로 받되 진짜 브라우저 창처럼 동작해야 한다:
// 옛 전산의 매물카드는 팝업이고, 그 안의 주소검색 팝업이 opener의 입력칸에 값을 넣고 window.close()로 닫히며,
// 저장 후에는 opener를 갱신하고 스스로 닫는다. 프록시가 주입한 스크립트가 window.__intranet(아래)을 직접 호출한다
// (같은 출처라 동기 호출 가능 → window.open이 진짜 창을 즉시 돌려줄 수 있다).
const MAX_TABS = 6

// 새 창에 열 주소 정리 — 같은 출처는 경로만, 외부 http(s)는 그대로, javascript: 등은 거부
function normalizeUrl(u) {
  const s = String(u || '').trim()
  if (!s || s === 'about:blank') return 'about:blank'
  if (/^javascript:/i.test(s)) return null
  try {
    const x = new URL(s, location.origin)
    if (!/^https?:$/.test(x.protocol)) return null
    if (x.origin === location.origin) return x.pathname.startsWith('/app') ? null : x.pathname + x.search + x.hash
    return x.href
  } catch {
    return null
  }
}

export default function IntranetScreen({ onBack, onRead, busy }) {
  // 새 창 방식: 'native' = 브라우저 그대로(새 창이 진짜 새 창으로 열림, 전산 본래 동작) / 'app' = 앱 안 창 탭으로 흉내
  // 전산 팝업(주소검색·매물카드 저장 등)이 어느 쪽에서 되는지 현장에서 바로 바꿔 볼 수 있게 한다
  const [mode, setModeState] = useState(() => {
    try { return localStorage.getItem('contract.intranetMode') === 'app' ? 'app' : 'native' } catch { return 'native' }
  })
  window.__intranetMode = mode // 프록시 주입 스크립트가 문서를 불러올 때 읽는다
  const [logOpen, setLogOpen] = useState(false)
  const [logTick, setLogTick] = useState(0)
  const [copied, setCopied] = useState(false)
  const [tabs, setTabsState] = useState([{ id: 1, src: '/', name: '' }])
  const [activeTab, setActiveTab] = useState(1)
  const nextId = useRef(2)
  const frameRefs = useRef({})
  const openers = useRef({}) // 창 이름 → 그 창을 연 window (팝업의 opener)
  const [loading, setLoading] = useState({ 1: true }) // 창별 불러오는 중 표시 — 느릴 때 멈춘 것처럼 보이지 않게
  const markLoading = (id, v) => setLoading(l => (l[id] === v ? l : { ...l, [id]: v }))
  // 창 목록·선택 창은 ref가 진실 — 프록시 스크립트가 동기로 호출하므로 state 갱신을 기다리지 않는다
  const tabsRef = useRef(tabs)
  const activeRef = useRef(1)
  function commitTabs(next) {
    tabsRef.current = next
    setTabsState(next)
  }
  function selectTab(id) {
    activeRef.current = id
    setActiveTab(id)
  }

  // 어떤 창(window)이 속한 탭 찾기 — 중첩 프레임이면 위로 올라가며 탭의 루트 프레임을 찾는다
  function tabOfWindow(w) {
    let r = w
    for (let i = 0; i < 8 && r; i++) {
      const hit = tabsRef.current.find(t => frameRefs.current[t.id]?.contentWindow === r)
      if (hit) return hit.id
      if (!r.parent || r.parent === r) break
      r = r.parent
    }
    return null
  }

  function removeTab(id, backId) {
    const cur = tabsRef.current
    if (cur.length <= 1) return
    const gone = cur.find(t => t.id === id)
    const next = cur.filter(t => t.id !== id)
    delete frameRefs.current[id]
    if (gone?.name) delete openers.current[gone.name]
    const target = next.find(t => t.id === backId) || next.find(t => t.id === activeRef.current) || next[next.length - 1]
    selectTab(target.id)
    commitTabs(next)
  }

  // 프록시가 주입한 스크립트가 쓰는 창 API (같은 출처, 동기)
  useEffect(() => {
    // 창 열기(또는 같은 이름 창 재사용): 진짜 창(window)을 즉시 돌려준다. url이 about:blank면 이동하지 않는다
    function open(url, name, openerWin) {
      const src = normalizeUrl(url)
      if (src === null) return null
      if (name && openerWin) openers.current[name] = openerWin
      const cur = tabsRef.current
      const existing = name ? cur.find(t => t.name === name) : null
      if (existing) {
        flushSync(() => selectTab(existing.id))
        const w = frameRefs.current[existing.id]?.contentWindow || null
        if (w && src !== 'about:blank') {
          markLoading(existing.id, true)
          try { w.location.href = src } catch { /* 이동 불가 */ }
        }
        return w
      }
      if (cur.length >= MAX_TABS) {
        // 창이 너무 많으면 마지막 탭을 재사용
        const last = cur[cur.length - 1]
        flushSync(() => {
          commitTabs(cur.map(t => (t.id === last.id ? { ...t, name: name || '' } : t)))
          selectTab(last.id)
        })
        const w = frameRefs.current[last.id]?.contentWindow || null
        if (w && src !== 'about:blank') {
          markLoading(last.id, true)
          try { w.location.href = src } catch { /* 이동 불가 */ }
        }
        return w
      }
      const id = nextId.current++
      flushSync(() => {
        markLoading(id, src !== 'about:blank')
        commitTabs([...cur, { id, src, name: name || '' }])
        selectTab(id)
      })
      return frameRefs.current[id]?.contentWindow || null
    }
    // 이름 있는 창을 앞으로 (이미 열려 있는 창에 window.open을 다시 했을 때)
    function activate(name) {
      const t = tabsRef.current.find(x => x.name === name)
      if (t) selectTab(t.id)
    }
    // window.close() — 팝업 탭을 닫고 그 창을 연 창으로 돌아간다
    function close(name) {
      setTimeout(() => {
        const tab = tabsRef.current.find(t => t.name === name)
        if (!tab || tabsRef.current.length <= 1) return
        const op = openers.current[name]
        removeTab(tab.id, op ? tabOfWindow(op) : null)
      }, 0)
    }
    window.__intranetOpeners = openers.current
    window.__intranet = { open, activate, close }
    return () => {
      delete window.__intranet
      delete window.__intranetOpeners
    }
  }, [])

  function addTab() {
    const cur = tabsRef.current
    if (cur.length >= MAX_TABS) return
    const id = nextId.current++
    markLoading(id, true)
    commitTabs([...cur, { id, src: '/', name: '' }])
    selectTab(id)
  }

  function closeTab(id) {
    removeTab(id, null)
  }

  function switchMode(next) {
    setModeState(next)
    window.__intranetMode = next
    try { localStorage.setItem('contract.intranetMode', next) } catch { /* 저장 불가 */ }
    // 열려 있는 창을 새 방식으로 다시 불러온다
    for (const t of tabsRef.current) {
      const f = frameRefs.current[t.id]
      try { if (f?.contentWindow && f.src !== 'about:blank') { markLoading(t.id, true); f.contentWindow.location.reload() } } catch { /* 무시 */ }
    }
  }

  const logs = () => (Array.isArray(window.__intraLog) ? window.__intraLog : [])
  const errCount = logs().filter(l => l.k === 'error').length
  // 기록 패널이 열려 있는 동안 + 오류 표시를 위해 주기적으로 갱신
  useEffect(() => {
    const id = setInterval(() => setLogTick(n => n + 1), 1500)
    return () => clearInterval(id)
  }, [])
  const fmtLog = l => {
    const d = new Date(l.t)
    const hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0')
    return `${hh} [${l.k}] ${l.f} ${l.m}`.trim()
  }
  async function copyLogs() {
    const head = `# 전산 기록 (${new Date().toLocaleString('ko-KR')}) 모드=${mode} 창=${tabsRef.current.length}\n# ${navigator.userAgent}\n`
    const text = head + logs().slice(-120).map(fmtLog).join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* 무시 */ }
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    <div className="relative flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-2">
        <button onClick={onBack}
          className="rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-fg-2 active:bg-chip">← 뒤로</button>
        <span className="text-base font-extrabold text-fg">회사 전산</span>
        <button
          onClick={() => {
            const f = frameRefs.current[activeTab]
            if (f) { markLoading(activeTab, true); f.src = f.src } // eslint-disable-line no-self-assign
          }}
          aria-label="전산 새로고침"
          className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold text-fg-2 active:opacity-80">↻</button>
        <button
          onClick={() => switchMode(mode === 'native' ? 'app' : 'native')}
          aria-label="새 창 방식 전환"
          className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold text-fg-2 active:opacity-80">
          새 창: {mode === 'native' ? '원본' : '앱 안'}
        </button>
        <button
          onClick={() => setLogOpen(v => !v)}
          aria-label="전산 기록"
          className={`rounded-full px-3 py-1.5 text-xs font-bold active:opacity-80 ${errCount ? 'bg-danger-container text-on-danger-container' : 'bg-chip text-fg-2'}`}>
          🛠 기록{errCount ? ` ${errCount}` : ''}
        </button>
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

      {loading[activeTab] && (
        <div className="h-1 w-full shrink-0 overflow-hidden bg-chip" role="progressbar" aria-label="전산 불러오는 중">
          <div className="h-full w-2/5 animate-pulse rounded-full bg-primary" />
        </div>
      )}

      {logOpen && (
        <div className="absolute inset-x-0 bottom-0 z-40 flex max-h-[55%] flex-col rounded-t-2xl bg-card shadow-card">
          <div className="flex items-center gap-2 px-4 py-2">
            <p className="flex-1 text-sm font-extrabold text-fg">전산 기록 <span className="text-xs font-normal text-fg-hint">(저장이 안 넘어갈 때 [복사]해서 보내 주세요)</span></p>
            <button onClick={copyLogs} className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-on-primary active:opacity-90">{copied ? '✓ 복사됨' : '복사'}</button>
            <button onClick={() => { if (Array.isArray(window.__intraLog)) window.__intraLog.length = 0; setLogTick(n => n + 1) }}
              className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold text-fg-2 active:opacity-80">지우기</button>
            <button onClick={() => setLogOpen(false)} className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold text-fg-2 active:opacity-80">닫기</button>
          </div>
          <pre key={logTick} className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all px-4 pb-3 text-[11px] leading-snug text-fg-2">
            {logs().length ? logs().slice(-80).map(fmtLog).join('\n') : '아직 기록이 없어요 — 전산에서 동작하면 여기에 쌓여요'}
          </pre>
        </div>
      )}

      {/* 모든 창을 유지하고 보이는 것만 전환 (로그인 세션·보던 페이지 유지) */}
      <div className="relative min-h-0 flex-1">
        {tabs.map(t => (
          <iframe
            key={t.id}
            name={t.name || `__tab${t.id}`}
            ref={el => { if (el) frameRefs.current[t.id] = el }}
            src={t.src}
            // 원본 모드: top-navigation 미허용 — 전산 스크립트의 top.location 이동(프레임 탈출)이 앱 전체를 갈아엎어 홈으로 돌아가는 것 방지
            // 앱 안 모드에는 걸지 않는다: 샌드박스는 형제 창(이름 있는 팝업 탭) 조작도 막아 창 흉내가 깨진다
            sandbox={mode === 'native' ? 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads' : undefined}
            onLoad={() => markLoading(t.id, false)}
            title={`회사 전산 창 ${t.id}`}
            className={`absolute inset-0 h-full w-full border-0 bg-white ${activeTab === t.id ? '' : 'invisible'}`}
          />
        ))}
      </div>
    </div>
  )
}
