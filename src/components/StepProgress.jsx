// 계약 탭 상단 진행 표시 — ① 입력 → ② 계약서 (하위 탭이 아니라 단계 전환 표시)
// 2단계에서 ① 입력을 누르면 돌아가서 수정할 수 있다. ②로의 진입은 [계약서 생성] 버튼만.
export default function StepProgress({ step, onBackToInput, onSettings }) {
  const items = [
    { key: 'input', num: 1, label: '입력' },
    { key: 'paper', num: 2, label: '계약서' },
  ]
  return (
    <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2">
        {items.map((it, i) => {
          const isCurrent = step === it.key
          const isPast = it.key === 'input' && step === 'paper'
          return (
            <span key={it.key} className="flex items-center gap-2">
              {i > 0 && <span className="text-gray-300">→</span>}
              <button
                onClick={() => isPast && onBackToInput()}
                disabled={!isPast}
                className={`flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold ${
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : isPast
                      ? 'text-blue-600 active:bg-blue-50'
                      : 'text-gray-300'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                  isCurrent ? 'bg-white/25' : isPast ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-300'
                }`}>
                  {isPast ? '✓' : it.num}
                </span>
                {it.label}
                {isPast && <span className="text-[10px] font-normal">(수정)</span>}
              </button>
            </span>
          )
        })}
        <span className="ml-2 hidden text-xs text-gray-300 sm:inline">서명이 끝나면 전달·결제 탭으로 이동합니다</span>
        <div className="ml-auto">
          <button onClick={onSettings} aria-label="설정"
            className="h-11 rounded-xl px-2.5 text-lg text-gray-400 active:bg-gray-100">
            ⚙
          </button>
        </div>
      </div>
    </div>
  )
}
