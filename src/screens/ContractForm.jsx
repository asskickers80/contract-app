import { useState } from 'react'
import CategoryPicker from '../components/CategoryPicker.jsx'
import { PRODUCTS } from '../data/products.js'
import { formatBizNo, formatComma, parseAmount, addMonths, formatKoreanDate } from '../lib/format.js'
import { validateDraft, AGENT_KEY } from '../lib/draft.js'
import { isSupabaseConfigured } from '../lib/supabase.js'

const PERIOD_OPTIONS = [1, 3, 6, 12]

function Section({ title, children }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-gray-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function TextInput({ label, value, onChange, placeholder, required, inputMode, autoComplete = 'off' }) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none"
      />
    </label>
  )
}

// 1단계 [입력]: 건별 4필드 + 상품 프리셋 + 기본값(수정 가능)
// 필수 필드 완료 시 [계약서 생성] 활성화 → 2단계(계약서 화면)로 전환
export default function ContractForm({ draft, onChange, onGenerate }) {

  const set = patch => onChange({ ...draft, ...patch })

  function selectProduct(p) {
    set({ productKey: p.key, fee: p.fee, vat: p.vat, total: p.total })
  }
  // 광고료 수정 → 부가세 10%·총액 자동 재계산 / 부가세 수정 → 총액 재계산
  function changeFee(v) {
    const fee = parseAmount(v)
    const vat = Math.round(fee * 0.1)
    set({ fee, vat, total: fee + vat, productKey: null })
  }
  function changeVat(v) {
    const vat = parseAmount(v)
    set({ vat, total: draft.fee + vat, productKey: null })
  }
  function changeTotal(v) {
    set({ total: parseAmount(v), productKey: null })
  }
  function changeStartDate(v) {
    set({ startDate: v, endDate: v ? addMonths(v, draft.periodMonths) : '' })
  }
  function changePeriod(months) {
    set({ periodMonths: months, endDate: draft.startDate ? addMonths(draft.startDate, months) : '' })
  }
  function changeAgent(v) {
    set({ agentName: v })
    localStorage.setItem(AGENT_KEY, v)
  }

  const missing = validateDraft(draft)
  const ready = missing.length === 0

  return (
    <div className="pb-32">
      <div className="mx-auto mt-4 max-w-2xl space-y-4 px-4">
        {!isSupabaseConfigured && (
          <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-800">
            Supabase 미설정 — PDF 생성·공유는 되지만 저장·목록은 동작하지 않아요. (설정 ⚙ 참고)
          </p>
        )}

        <Section title="건별 입력 (매번 새로 입력)">
          <div className="space-y-4">
            <TextInput label="상호" required value={draft.storeName} onChange={v => set({ storeName: v })} placeholder="예: 행복분식" />
            <div>
              <span className="text-[13px] font-semibold text-gray-700">업종 <span className="text-red-500">*</span></span>
              <div className="mt-1">
                <CategoryPicker value={draft.businessType} onSelect={v => set({ businessType: v })} />
              </div>
            </div>
            <TextInput
              label="사업자등록번호" required inputMode="numeric"
              value={draft.bizNo} onChange={v => set({ bizNo: formatBizNo(v) })}
              placeholder="숫자 10자리만 입력 (자동 하이픈)"
            />
            <TextInput label="소재지" required value={draft.address} onChange={v => set({ address: v })} placeholder="예: 서울시 강남구 ○○동 123-4" />
          </div>
        </Section>

        <Section title="광고 상품 선택 (탭 한 번으로 금액 입력)">
          <div className="grid grid-cols-3 gap-2">
            {PRODUCTS.map(p => (
              <button key={p.key} onClick={() => selectProduct(p)}
                className={`rounded-xl border-2 px-2 py-3 text-center ${draft.productKey === p.key ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                <div className={`text-sm font-bold ${draft.productKey === p.key ? 'text-blue-700' : 'text-gray-900'}`}>{p.name}</div>
                <div className="mt-1 text-xs text-gray-500">총 {p.total.toLocaleString('ko-KR')}원</div>
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">광고료</span>
              <input type="text" inputMode="numeric" value={formatComma(draft.fee)} onChange={e => changeFee(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 px-2 py-2.5 text-right text-sm focus:border-blue-500 focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">부가세</span>
              <input type="text" inputMode="numeric" value={formatComma(draft.vat)} onChange={e => changeVat(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 px-2 py-2.5 text-right text-sm focus:border-blue-500 focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-gray-500">총액</span>
              <input type="text" inputMode="numeric" value={formatComma(draft.total)} onChange={e => changeTotal(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 bg-blue-50 px-2 py-2.5 text-right text-sm font-bold focus:border-blue-500 focus:outline-none" />
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-400">광고료를 고치면 부가세(10%)와 총액이 자동 계산됩니다.</p>
        </Section>

        <Section title="기본값 (필요 시 수정)">
          <div className="space-y-4">
            <TextInput label="담당 에이전트" required value={draft.agentName} onChange={changeAgent} placeholder="이름 (한 번 입력하면 저장됩니다)" />
            <TextInput label="광고상품명" value={draft.productName} onChange={v => set({ productName: v })} />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[13px] font-semibold text-gray-700">광고개시일</span>
                <input type="date" value={draft.startDate} onChange={e => changeStartDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:border-blue-500 focus:outline-none" />
                <p className="mt-1 text-xs text-gray-400">{formatKoreanDate(draft.startDate)}</p>
              </label>
              <div>
                <span className="text-[13px] font-semibold text-gray-700">광고기간</span>
                <div className="mt-1 flex gap-1.5">
                  {PERIOD_OPTIONS.map(m => (
                    <button key={m} onClick={() => changePeriod(m)}
                      className={`flex-1 rounded-xl border-2 py-3 text-sm font-bold ${draft.periodMonths === m ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                      {m}개월
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
              광고종료일 <span className="font-bold text-gray-900">{formatKoreanDate(draft.endDate) || '—'}</span>
              <span className="ml-1 text-xs text-gray-400">(개시일 + {draft.periodMonths}개월, 자동 계산)</span>
            </div>
          </div>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          {!ready && <p className="mb-2 text-center text-xs text-red-500">입력 필요: {missing.join(', ')}</p>}
          <button onClick={onGenerate} disabled={!ready}
            className="w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white active:bg-blue-700 disabled:bg-gray-300">
            계약서 생성
          </button>
        </div>
      </div>
    </div>
  )
}
