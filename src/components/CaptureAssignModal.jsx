import { useEffect, useState } from 'react'
import { formatPhone, digitsOnly } from '../lib/format.js'
import { listCards, isSupabaseConfigured } from '../lib/customerStore.js'

// 캡처 첨부 모달 — "기존 매물카드 선택 / 새 카드 생성" 중 선택해 캡처를 카드에 붙인다
export default function CaptureAssignModal({ image, onAssign, onClose }) {
  const [phone, setPhone] = useState('')
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    listCards('').then(setRows).catch(() => {}).finally(() => setLoaded(true))
  }, [])

  const canCreate = digitsOnly(phone).length >= 10

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">캡처를 어느 매물카드에 붙일까요?</h2>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-bold text-gray-400 active:bg-gray-100">취소</button>
        </div>

        <img src={image} alt="캡처 미리보기" className="mt-3 max-h-40 w-full rounded-xl border border-gray-100 object-cover object-top" />

        {/* 새 카드 생성 */}
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-gray-700">새 카드 생성 (전화번호)</p>
          <div className="mt-1 flex gap-2">
            <input
              type="tel" inputMode="numeric" value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              onKeyDown={e => e.key === 'Enter' && canCreate && onAssign(phone)}
              placeholder="010-0000-0000"
              className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-3 text-base tracking-wide focus:border-blue-500 focus:outline-none"
            />
            <button onClick={() => onAssign(phone)} disabled={!canCreate}
              className="rounded-xl bg-blue-600 px-5 text-sm font-bold text-white disabled:bg-gray-300">
              여기에 붙이기
            </button>
          </div>
        </div>

        {/* 기존 카드 선택 */}
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-gray-700">기존 매물카드 선택</p>
          <div className="mt-1 space-y-1.5">
            {!loaded && <p className="py-4 text-center text-xs text-gray-300">불러오는 중…</p>}
            {loaded && rows.length === 0 && (
              <p className="py-4 text-center text-xs text-gray-300">
                {isSupabaseConfigured ? '저장된 카드가 없어요 — 위에서 새 카드로 붙여주세요' : 'Supabase 미설정 — 새 카드(전화번호)로 붙여주세요'}
              </p>
            )}
            {rows.map(row => (
              <button key={row.id} onClick={() => onAssign(row.customers?.phone || '')}
                className="block w-full rounded-xl border border-gray-100 px-3 py-2.5 text-left active:bg-blue-50">
                <span className="font-bold text-gray-900">{row.store_name || '(상호 미입력)'}</span>
                <span className="ml-2 text-xs text-gray-400">{formatPhone(row.customers?.phone || '')} · {row.customers?.name || '이름 미입력'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
