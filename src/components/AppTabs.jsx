// [매물카드][노트][계약][전달·결제]
export const APP_TABS = [
  { key: 'listing',  label: '매물카드', ready: true  },
  { key: 'note',     label: '노트',     ready: false },
  { key: 'contract', label: '계약',     ready: true  },
  { key: 'delivery', label: '전달·결제', ready: true  },
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
                : tab.ready
                  ? 'font-semibold text-gray-600 active:bg-gray-50'
                  : 'text-gray-300 active:bg-gray-50'
            }`}
          >
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              active === i ? 'bg-blue-600 text-white' : tab.ready ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-300'
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
