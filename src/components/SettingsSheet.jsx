import { useState } from 'react'
import { savePin } from '../screens/PinLock.jsx'
import { isSupabaseConfigured } from '../lib/supabase.js'
import { AGENT_KEY } from '../lib/draft.js'

// 설정 시트 — 담당 에이전트 이름(계약서 기본값), PIN 변경
export default function SettingsSheet({ onClose, onAgentChange }) {
  const [agentName, setAgentName] = useState(localStorage.getItem(AGENT_KEY) || '')
  const [pinDraft, setPinDraft] = useState('')
  const [notice, setNotice] = useState('')

  function saveAgent(v) {
    setAgentName(v)
    localStorage.setItem(AGENT_KEY, v)
    onAgentChange?.(v)
  }

  async function changePin() {
    if (!/^\d{4}$/.test(pinDraft)) {
      setNotice('PIN은 숫자 4자리로 입력해 주세요.')
      return
    }
    await savePin(pinDraft)
    setPinDraft('')
    setNotice('PIN이 변경되었어요.')
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">설정</h2>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-bold text-gray-400 active:bg-gray-100">닫기</button>
        </div>

        <label className="mt-4 block">
          <span className="text-[13px] font-semibold text-gray-700">담당 에이전트 이름 (계약서 기본값)</span>
          <input
            type="text" value={agentName} onChange={e => saveAgent(e.target.value)}
            placeholder="예: 홍길동"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
          />
        </label>

        <div className="mt-4">
          <span className="text-[13px] font-semibold text-gray-700">PIN 변경 (숫자 4자리)</span>
          <div className="mt-1 flex gap-2">
            <input
              type="password" inputMode="numeric" maxLength={4} value={pinDraft}
              onChange={e => setPinDraft(e.target.value.replace(/\D/g, ''))}
              placeholder="새 PIN"
              className="flex-1 rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
            />
            <button onClick={changePin} className="rounded-xl bg-gray-900 px-5 text-sm font-bold text-white">변경</button>
          </div>
        </div>
        {notice && <p className="mt-2 text-sm text-blue-600">{notice}</p>}

        <p className={`mt-5 rounded-xl px-3 py-2.5 text-xs leading-relaxed ${isSupabaseConfigured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>
          {isSupabaseConfigured
            ? 'Supabase 연결됨 — 계약서가 자동 저장됩니다.'
            : 'Supabase 미설정 — PDF 생성·전달은 되지만 저장·목록은 동작하지 않아요. (.env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 입력)'}
        </p>
        <p className="mt-3 text-center text-xs text-gray-300">내부 전용 · ㈜점포라인</p>
      </div>
    </div>
  )
}
