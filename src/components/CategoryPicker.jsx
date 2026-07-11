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
          <span className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white">{value}</span>
          <button onClick={() => onSelect('')} className="text-sm text-gray-400 underline">다시 선택</button>
        </div>
      )}
      {!value && (
        <>
          {recent.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-gray-400">최근 선택</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {recent.map(name => (
                  <button key={name} onClick={() => pick(name)}
                    className="rounded-full border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 active:bg-blue-100">
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {CATEGORIES.map(c => (
              <button key={c.group} onClick={() => { setGroup(c.group); setCustomMode(false) }}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${group === c.group && !customMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {c.group}
              </button>
            ))}
            <button onClick={() => setCustomMode(true)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${customMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
              직접입력
            </button>
          </div>
          {customMode ? (
            <CustomCategoryInput onSubmit={pick} />
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {items.map(name => (
                <button key={name} onClick={() => pick(name)}
                  className="rounded-full border border-gray-200 px-4 py-2.5 text-sm text-gray-800 active:bg-blue-50">
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
        className="flex-1 rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
      />
      <button onClick={() => text.trim() && onSubmit(text.trim())}
        className="rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:opacity-40" disabled={!text.trim()}>
        확인
      </button>
    </div>
  )
}
