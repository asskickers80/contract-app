import { useRef, useState } from 'react'

// 회사 전산(점포라인) 내장 브라우저 — 프록시(api/proxy)를 거쳐 같은 출처가 되므로
// 앱 안에서 로그인·탐색이 되고, [이 매물 읽기]로 열린 페이지를 바로 AI 추출한다.
// (2026-11-11 대표님 요청: 캡처 없이 전산 화면을 직접 읽어 매물카드 시작)
export default function IntranetScreen({ onBack, onRead, busy }) {
  const frameRef = useRef(null)
  const [frameKey, setFrameKey] = useState(0)

  function readPage() {
    let doc = null
    try {
      doc = frameRef.current?.contentDocument
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
        <button onClick={() => setFrameKey(k => k + 1)} aria-label="전산 새로고침"
          className="rounded-full bg-chip px-3 py-1.5 text-xs font-bold text-fg-2 active:opacity-80">↻</button>
        <div className="flex-1" />
        <button onClick={readPage} disabled={busy}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-on-primary active:opacity-90 disabled:opacity-50">
          {busy ? '읽는 중…' : '📋 이 매물 읽기'}
        </button>
      </div>
      <p className="px-4 pb-2 text-[11px] text-fg-hint">
        매물 상세 화면을 띄운 상태에서 [이 매물 읽기]를 누르면 캡처 없이 바로 매물카드가 만들어져요.
      </p>
      {/* 프록시 루트(/)가 곧 전산 — 로그인 세션은 쿠키로 유지된다 */}
      <iframe key={frameKey} ref={frameRef} src="/" title="회사 전산"
        className="min-h-0 w-full flex-1 border-0 bg-white" />
    </div>
  )
}
