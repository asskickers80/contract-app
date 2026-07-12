// 계약 탭 상단 진행 표시 — ① 입력 → ② 계약서 (하위 탭이 아니라 단계 전환 표시)
// 2단계에서 ① 입력을 누르면 돌아가서 수정할 수 있다. ②로의 진입은 [계약서 생성] 버튼만.
export default function StepProgress({ step, onBackToInput, onSettings }) {
  const items = [
    { key: 'input', num: 1, label: '입력' },
    { key: 'paper', num: 2, label: '계약서' },
  ]
  return (
    <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-4 py-2">
        {items.map((it, i) => {
          const isCurrent = step === it.key
          const isPast = it.key === 'input' && step === 'paper'
          return (
            <span key={it.key} className="flex items-center gap-2.5">
              {i > 0 && <span className="text-sm text-fg-disabled">→</span>}
              <button
                onClick={() => isPast && onBackToInput()}
                disabled={!isPast}
                className={`flex h-11 items-center gap-1.5 rounded-full text-[13px] font-bold transition-colors duration-150 ${
                  isCurrent
                    ? 'bg-primary-container py-1 pl-1.5 pr-3.5 text-on-primary-container'
                    : isPast
                      ? 'py-1 pl-1.5 pr-3 text-primary active:bg-chip'
                      : 'px-2 py-1 font-medium text-fg-hint'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  isCurrent
                    ? 'bg-primary text-on-primary'
                    : isPast
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-chip-ghost text-fg-disabled'
                }`}>
                  {isPast ? '✓' : it.num}
                </span>
                {it.label}
                {isPast && <span className="text-[10px] font-normal">(수정)</span>}
              </button>
            </span>
          )
        })}
        <span className="ml-1 hidden text-xs text-fg-hint sm:inline">서명이 끝나면 전달·결제 탭으로 이동합니다</span>
        <div className="ml-auto">
          <button onClick={onSettings} aria-label="설정"
            className="flex h-11 w-11 items-center justify-center rounded-full text-lg text-fg-2 active:bg-chip">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-track">⚙</span>
          </button>
        </div>
      </div>
    </div>
  )
}
