// [매물카드][상담][계약][전달·결제] — 네 탭 모두 동일 형식
export const APP_TABS = [
  { key: 'listing',  label: '매물카드' },
  { key: 'note',     label: '상담' },
  { key: 'contract', label: '계약' },
  { key: 'delivery', label: '전달·결제' },
]

export default function AppTabs({ active, onSelect }) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-stretch overflow-x-auto px-2">
        {APP_TABS.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => onSelect(i)}
            className={`relative flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-2 text-sm ${
              active === i
                ? 'font-bold text-blue-700'
                : 'font-semibold text-gray-600 active:bg-gray-50'
            }`}
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              active === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {i + 1}
            </span>
            {tab.label}
            {active === i && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-blue-600" />}
          </button>
        ))}
      </div>
    </div>
  )
}
