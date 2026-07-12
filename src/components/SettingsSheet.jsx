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
      <div className="w-full max-w-lg rounded-t-3xl bg-card p-5 sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-fg">설정</h2>
          <button onClick={onClose} className="rounded-full px-3.5 py-2 text-sm font-bold text-fg-2 active:bg-chip">닫기</button>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-fg-2">담당 에이전트 이름 (계약서 기본값)</span>
          <input
            type="text" value={agentName} onChange={e => saveAgent(e.target.value)}
            placeholder="예: 홍길동"
            className="mt-1 w-full rounded-xl bg-field px-3.5 py-3 text-base font-semibold text-fg placeholder:font-normal placeholder:text-fg-hint focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <div className="mt-4">
          <span className="text-xs font-medium text-fg-2">PIN 변경 (숫자 4자리)</span>
          <div className="mt-1 flex gap-2">
            <input
              type="password" inputMode="numeric" maxLength={4} value={pinDraft}
              onChange={e => setPinDraft(e.target.value.replace(/\D/g, ''))}
              placeholder="새 PIN"
              className="flex-1 rounded-xl bg-field px-3.5 py-3 text-base font-semibold text-fg placeholder:font-normal placeholder:text-fg-hint focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button onClick={changePin} className="rounded-full bg-primary px-5 text-sm font-bold text-on-primary active:opacity-90">변경</button>
          </div>
        </div>
        {notice && <p className="mt-2 text-sm font-semibold text-primary">{notice}</p>}

        <p className={`mt-5 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${isSupabaseConfigured ? 'bg-ok text-on-ok' : 'bg-warn text-on-warn'}`}>
          {isSupabaseConfigured
            ? 'Supabase 연결됨 — 계약서가 자동 저장됩니다.'
            : 'Supabase 미설정 — PDF 생성·전달은 되지만 저장·목록은 동작하지 않아요. (.env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 입력)'}
        </p>
        <p className="mt-3 text-center text-xs text-fg-disabled">내부 전용 · ㈜점포라인 · 버전 {__BUILD_TIME__} 빌드</p>
      </div>
    </div>
  )
}
