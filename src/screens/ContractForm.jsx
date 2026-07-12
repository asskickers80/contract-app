import { useState } from 'react'
import CategoryPicker from '../components/CategoryPicker.jsx'
import { PRODUCTS } from '../data/products.js'
import { formatBizNo, formatComma, parseAmount, addMonths, formatKoreanDate } from '../lib/format.js'
import { validateDraft } from '../lib/draft.js'
import { isSupabaseConfigured } from '../lib/supabase.js'

const PERIOD_OPTIONS = [1, 3, 6, 12]

// 섹션 타이틀 "제목 (보조설명)" — 보조 괄호 부분은 힌트색으로 분리 표시
function splitTitle(title) {
  const m = title.match(/^(.*?)\s*(\(.*\))$/)
  return m ? [m[1], m[2]] : [title, null]
}

function Section({ title, children }) {
  const [main, sub] = splitTitle(title)
  return (
    <section className="rounded-2xl bg-card p-4 shadow-card">
      <h2 className="text-sm font-extrabold text-fg">
        {main} {sub && <span className="text-xs font-normal text-fg-hint">{sub}</span>}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function TextInput({ label, value, onChange, placeholder, required, inputMode, autoComplete = 'off' }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-fg-2">
        {label} {required && <span className="text-danger">*</span>}
      </span>
      <input
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl bg-field px-3.5 py-3 text-base font-semibold text-fg placeholder:font-normal placeholder:text-fg-hint focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </label>
  )
}

// 1단계 [입력]: 건별 4필드 + 상품 프리셋 + 기본값(수정 가능)
// 필수 필드 완료 시 [계약서 생성] 활성화 → 2단계(계약서 화면)로 전환
export default function ContractForm({ draft, onChange, onGenerate }) {

  const set = patch => onChange({ ...draft, ...patch })

  function selectProduct(p) {
    // 상품명도 함께 반영 — 계약서 '광고상품명' 칸에 최상단광고/중간광고/하단광고로 찍힌다
    set({ productKey: p.key, productName: p.name, fee: p.fee, vat: p.vat, total: p.total })
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

  const missing = validateDraft(draft)
  const ready = missing.length === 0

  return (
    <div className="pb-32">
      <div className="mx-auto mt-4 max-w-2xl space-y-4 px-4">
        {!isSupabaseConfigured && (
          <p className="rounded-xl bg-warn px-4 py-2.5 text-xs leading-relaxed text-on-warn">
            Supabase 미설정 — PDF 생성·전달은 되지만 저장·목록은 동작하지 않아요. (설정 ⚙ 참고)
          </p>
        )}

        <Section title="건별 입력 (매번 새로 입력)">
          <div className="space-y-4">
            <TextInput label="상호" required value={draft.storeName} onChange={v => set({ storeName: v })} placeholder="예: 행복분식" />
            <div>
              <span className="text-xs font-medium text-fg-2">업종 <span className="text-danger">*</span></span>
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
          <div className="grid grid-cols-3 gap-2.5">
            {PRODUCTS.map(p => (
              <button key={p.key} onClick={() => selectProduct(p)}
                className={`rounded-xl border px-2 py-3 text-center transition-colors duration-150 ${
                  draft.productKey === p.key ? 'border-2 border-primary bg-inset' : 'border-line bg-card'
                }`}>
                <div className={`text-sm font-bold ${draft.productKey === p.key ? 'text-primary' : 'text-fg'}`}>{p.name}</div>
                <div className="mt-1 text-xs text-fg-2">총 <span className="font-extrabold text-fg">{p.total.toLocaleString('ko-KR')}</span>원</div>
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <label className="block">
              <span className="text-xs font-medium text-fg-2">광고료</span>
              <input type="text" inputMode="numeric" value={formatComma(draft.fee)} onChange={e => changeFee(e.target.value)}
                className="mt-1 w-full rounded-xl bg-field px-3 py-2.5 text-right text-base font-bold text-fg focus:outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-fg-2">부가세</span>
              <input type="text" inputMode="numeric" value={formatComma(draft.vat)} onChange={e => changeVat(e.target.value)}
                className="mt-1 w-full rounded-xl bg-field px-3 py-2.5 text-right text-base font-bold text-fg focus:outline-none focus:ring-2 focus:ring-primary" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-fg-2">총액</span>
              <input type="text" inputMode="numeric" value={formatComma(draft.total)} onChange={e => changeTotal(e.target.value)}
                className="mt-1 w-full rounded-xl bg-field-em px-3 py-2.5 text-right text-base font-bold text-fg focus:outline-none focus:ring-2 focus:ring-primary" />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-fg-hint">광고료를 고치면 부가세(10%)와 총액이 자동 계산됩니다.</p>
        </Section>

        <Section title="기본값 (필요 시 수정)">
          <div className="space-y-4">
            {/* 담당 에이전트 고정 — 수정 불가 (2026-07-12 대표님 지시) */}
            <div className="rounded-xl bg-inset px-3.5 py-2.5 text-sm text-fg-2">
              담당 에이전트 <span className="font-bold text-fg">{draft.agentName}</span>
              <span className="ml-1 text-xs text-fg-hint">(고정)</span>
            </div>
            <TextInput label="광고상품명" value={draft.productName} onChange={v => set({ productName: v })} />
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-fg-2">광고개시일</span>
                <input type="date" value={draft.startDate} onChange={e => changeStartDate(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-field px-3.5 py-3 text-base font-semibold text-fg focus:outline-none focus:ring-2 focus:ring-primary" />
                <p className="mt-1 text-[11px] text-fg-hint">{formatKoreanDate(draft.startDate)}</p>
              </label>
              <div>
                <span className="text-xs font-medium text-fg-2">광고기간</span>
                <div className="mt-1 flex gap-1.5">
                  {PERIOD_OPTIONS.map(m => (
                    <button key={m} onClick={() => changePeriod(m)}
                      className={`flex-1 rounded-full py-3 text-sm font-bold transition-colors duration-150 ${
                        draft.periodMonths === m ? 'bg-primary-container text-on-primary-container' : 'bg-chip text-fg-2'
                      }`}>
                      {m}개월
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-inset px-3.5 py-2.5 text-sm text-fg-2">
              광고종료일 <span className="font-bold text-fg">{formatKoreanDate(draft.endDate) || '—'}</span>
              <span className="ml-1 text-xs text-fg-hint">(개시일 + {draft.periodMonths}개월, 자동 계산)</span>
            </div>
          </div>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 bg-surface/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          {!ready && <p className="mb-2 text-center text-[12.5px] font-semibold text-danger">입력 필요: {missing.join(', ')}</p>}
          <button onClick={onGenerate} disabled={!ready}
            className="w-full rounded-full bg-primary py-3.5 text-[15px] font-bold text-on-primary transition-colors duration-150 active:opacity-90 disabled:bg-off-bg disabled:text-off-fg">
            계약서 생성
          </button>
        </div>
      </div>
    </div>
  )
}
