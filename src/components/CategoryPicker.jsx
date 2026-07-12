import { useMemo, useState } from 'react'
import { CATEGORIES, getRecentCategories, pushRecentCategory } from '../data/categories.js'

// 업종 2단계 선택: 최근 3개 → 대분류 탭 → 소분류 버튼, 없으면 직접입력
// (계약서 작성·매물카드에서 공용)
export default function CategoryPicker({ value, onSelect }) {
  const [group, setGroup] = useState(CATEGORIES[0].group)
  const [customMode, setCustomMode] = useState(false)
  const recent = useMemo(() => getRecentCategories(), [])
  const items = CATEGORIES.find(c => c.group === group)?.items || []

  function pick(name) {
    pushRecentCategory(name)
    onSelect(name)
  }

  return (
    <div>
      {value && (
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-primary px-4 py-2 text-[13px] font-bold text-on-primary">{value}</span>
          <button onClick={() => onSelect('')} className="text-[12.5px] font-semibold text-primary underline underline-offset-2">다시 선택</button>
        </div>
      )}
      {!value && (
        <>
          {recent.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-fg-hint">최근 선택</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {recent.map(name => (
                  <button key={name} onClick={() => pick(name)}
                    className="rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary-container active:opacity-80">
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {CATEGORIES.map(c => (
              <button key={c.group} onClick={() => { setGroup(c.group); setCustomMode(false) }}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-150 ${group === c.group && !customMode ? 'bg-primary text-on-primary' : 'bg-chip text-fg-2'}`}>
                {c.group}
              </button>
            ))}
            <button onClick={() => setCustomMode(true)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-150 ${customMode ? 'bg-primary text-on-primary' : 'bg-chip text-fg-2'}`}>
              직접입력
            </button>
          </div>
          {customMode ? (
            <CustomCategoryInput onSubmit={pick} />
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {items.map(name => (
                <button key={name} onClick={() => pick(name)}
                  className="rounded-full border border-line bg-card px-4 py-2.5 text-sm text-fg active:bg-chip">
                  {name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CustomCategoryInput({ onSubmit }) {
  const [text, setText] = useState('')
  return (
    <div className="mt-2 flex gap-2">
      <input
        type="text" value={text} onChange={e => setText(e.target.value)}
        placeholder="업종을 직접 입력"
        className="flex-1 rounded-xl bg-field px-3.5 py-3 text-base font-semibold text-fg placeholder:font-normal placeholder:text-fg-hint focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button onClick={() => text.trim() && onSubmit(text.trim())}
        className="rounded-full bg-primary px-5 text-sm font-bold text-on-primary disabled:bg-off-bg disabled:text-off-fg" disabled={!text.trim()}>
        확인
      </button>
    </div>
  )
}
