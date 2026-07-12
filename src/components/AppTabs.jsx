import { useState } from 'react'
import { getTheme, setTheme } from '../lib/theme.js'

// [매물카드][상담][계약][전달·결제] — 세그먼티드 필 스텝바 (머티리얼 토널)
// 네 탭 모두 동일 형식. 오른쪽 끝에 다크 모드 토글.
export const APP_TABS = [
  { key: 'listing',  label: '매물카드' },
  { key: 'note',     label: '상담' },
  { key: 'contract', label: '계약' },
  { key: 'delivery', label: '전달·결제' },
]

function ThemeToggle() {
  const [theme, set] = useState(getTheme)
  const dark = theme === 'dark'
  function toggle() {
    const next = dark ? 'light' : 'dark'
    setTheme(next)
    set(next)
  }
  return (
    <button
      onClick={toggle}
      aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className="relative flex h-11 w-11 shrink-0 items-center justify-center"
    >
      <span className={`relative block h-5 w-9 rounded-full transition-colors duration-150 ${dark ? 'bg-primary' : 'bg-line'}`}>
        <span
          className={`absolute top-0.5 block h-4 w-4 rounded-full transition-all duration-150 ${
            dark ? 'left-[18px] bg-surface' : 'left-0.5 bg-white shadow-sm'
          }`}
        />
      </span>
    </button>
  )
}

export default function AppTabs({ active, onSelect }) {
  return (
    <div className="bg-surface px-4 py-2.5">
      <div className="mx-auto flex max-w-4xl items-center gap-2">
        <div className="flex min-w-0 flex-1 rounded-full bg-card p-1 shadow-track">
          {APP_TABS.map((tab, i) => (
            <button
              key={tab.key}
              onClick={() => onSelect(i)}
              className={`flex h-10 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-2 text-sm transition-colors duration-150 ${
                active === i
                  ? 'bg-primary-container font-bold text-on-primary-container'
                  : 'font-medium text-fg-2 active:bg-chip'
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                active === i ? 'bg-primary text-on-primary' : 'bg-chip text-fg-2'
              }`}>
                {i + 1}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
        <ThemeToggle />
      </div>
    </div>
  )
}
