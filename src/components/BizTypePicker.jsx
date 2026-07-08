import { useState } from 'react';
import { CATEGORIES } from '../constants/categories';

const RECENT_KEY = 'recent_biz_types';

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}
function saveRecent(type) {
  const prev = getRecent().filter(t => t !== type);
  localStorage.setItem(RECENT_KEY, JSON.stringify([type, ...prev].slice(0, 3)));
}

export default function BizTypePicker({ value, onChange }) {
  const [catTab, setCatTab] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [customType, setCustomType] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [recent, setRecent] = useState(getRecent);

  const handleSelect = (type) => {
    onChange(type);
    saveRecent(type);
    setRecent(getRecent());
    setShowPicker(false);
    setShowCustomInput(false);
  };

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 border border-gray-700 rounded-xl px-3 py-3 bg-gray-800 text-base text-gray-100">
          {value}
        </div>
        <button
          type="button"
          onClick={() => { onChange(''); setShowPicker(false); }}
          className="text-sm text-gray-400 px-2"
        >
          변경
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowPicker(v => !v)}
        className="w-full border border-gray-700 bg-gray-800 rounded-xl px-3 py-3 text-left text-gray-500 text-base"
      >
        업종 선택
      </button>

      {showPicker && (
        <div className="mt-2 border border-gray-700 rounded-2xl bg-gray-900 overflow-hidden">
          {recent.length > 0 && (
            <div className="px-3 py-2 border-b border-gray-800">
              <p className="text-xs text-gray-400 mb-1.5">최근 선택</p>
              <div className="flex flex-wrap gap-2">
                {recent.map(t => (
                  <button key={t} type="button" onClick={() => handleSelect(t)}
                    className="px-3 py-1.5 bg-blue-950 text-blue-300 rounded-lg text-sm">
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="overflow-x-auto flex border-b border-gray-800">
            {CATEGORIES.map((cat, i) => (
              <button key={cat.label} type="button"
                onClick={() => setCatTab(i)}
                className={`flex-shrink-0 px-3 py-2 text-sm border-b-2 transition ${
                  catTab === i ? 'border-blue-500 text-blue-400 font-medium' : 'border-transparent text-gray-500'
                }`}>
                {cat.label}
              </button>
            ))}
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {CATEGORIES[catTab].items.map(item => (
              <button key={item} type="button" onClick={() => handleSelect(item)}
                className="px-3 py-1.5 border border-gray-700 rounded-lg text-sm text-gray-300 bg-gray-800 active:bg-gray-700">
                {item}
              </button>
            ))}
            <button type="button" onClick={() => setShowCustomInput(v => !v)}
              className="px-3 py-1.5 border-dashed border-2 border-gray-600 rounded-lg text-sm text-gray-500">
              직접입력
            </button>
          </div>
          {showCustomInput && (
            <div className="px-3 pb-3 flex gap-2">
              <input
                type="text"
                value={customType}
                onChange={e => setCustomType(e.target.value)}
                placeholder="업종명 직접 입력"
                className="flex-1 border border-gray-700 bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <button type="button"
                onClick={() => { if (customType.trim()) handleSelect(customType.trim()); }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                확인
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
