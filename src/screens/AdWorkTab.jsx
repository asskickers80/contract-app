import { useEffect, useRef, useState } from 'react'
import { loadCardBoard, patchCardBoard } from '../lib/boardStore.js'
import { formatComma, parseAmount } from '../lib/format.js'

// [매물작업] 탭 — 광고작성(12항목 입력) ↔ 작성완료(AI가 쓴 매물광고)
// 1~7번은 매물카드 AI 추출값으로 자동 채움, 8~9번은 AI가 대표님 기준대로 작성,
// 대표님은 10~12번만 쓰고 [반영하기] → 작성완료에서 광고 전문을 받아 복사.
// 입력·결과는 카드(board.ad)에 자동 저장.

const EMPTY_FIELDS = {
  storeName: '', address: '', area: '',
  deposit: null, monthlyRent: null, premium: null, maintenanceFee: null,
  tradeArea: '', franchise: '',
  facility: '', revenue: '', strengths: '', notes: '',
}

const FIELD_DEFS = [
  ['storeName', '1. 상호', 'text'],
  ['address', '2. 주소', 'text'],
  ['area', '3. 면적', 'text'],
  ['deposit', '4. 보증금', 'money'],
  ['monthlyRent', '5. 월세', 'money'],
  ['premium', '6. 희망권리금', 'money'],
  ['maintenanceFee', '7. 관리비', 'money'],
  ['tradeArea', '8. 상권', 'multi'],
  ['franchise', '9. 프랜차이즈', 'multi'],
  ['facility', '10. 시설 상태', 'multi'],
  ['revenue', '11. 매출과 수익', 'multi'],
  ['strengths', '12. 특장점', 'multi'],
  ['notes', '13. 특이사항 및 매도사유', 'multi'],
]

// 금액을 프롬프트·광고용 "3,000만원" 표기로
const wonToMan = n => (n ? `${formatComma(Math.round(n / 10000))}만원` : null)

export default function AdWorkTab({ cardKey, active }) {
  const [view, setView] = useState('write') // write | done
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [adText, setAdText] = useState('')
  const [info, setInfo] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(null) // 'fill' | 'compose' | null
  const [notice, setNotice] = useState(null)
  const [copied, setCopied] = useState(false)
  const saveTimer = useRef(null)
  const filledRef = useRef(null) // 이 카드에서 8·9 자동작성을 시도했는지

  // 카드 로드 — 저장된 작성 내용 + 매물 정보(1~7 자동 채움)
  // 탭이 활성화될 때마다 다시 읽어, 늦게 끝난 AI 추출 정보도 반영되게 한다
  useEffect(() => {
    if (!cardKey || !active) { if (!cardKey) setLoaded(false); return }
    let alive = true
    setLoaded(false)
    loadCardBoard(cardKey)
      .then(board => {
        if (!alive) return
        const bi = board?.info || null
        const saved = board?.ad?.fields || {}
        setInfo(bi)
        setFields({
          ...EMPTY_FIELDS,
          ...saved,
          // 비어 있는 1~7번은 추출 정보로 채움 (사용자가 쓴 값은 유지)
          storeName: saved.storeName || bi?.storeName || '',
          address: saved.address || bi?.address || '',
          area: saved.area || bi?.area || '',
          deposit: saved.deposit ?? bi?.deposit ?? null,
          monthlyRent: saved.monthlyRent ?? bi?.monthlyRent ?? null,
          premium: saved.premium ?? bi?.premium ?? null,
          maintenanceFee: saved.maintenanceFee ?? bi?.maintenanceFee ?? null,
        })
        setAdText(board?.ad?.generated || '')
        setLoaded(true)
      })
      .catch(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [cardKey, active])

  // 자동 저장 (디바운스)
  function persist(nextFields, nextAd) {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      // 자기 필드(광고)만 부분 저장 — 다른 탭 작업을 덮어쓰지 않음
      patchCardBoard(cardKey, {
        ad: { fields: nextFields ?? fields, generated: nextAd ?? adText },
      }).catch(() => {})
    }, 500)
  }

  function setField(key, value) {
    setFields(prev => {
      const next = { ...prev, [key]: value }
      persist(next)
      return next
    })
  }

  function flash(msg, ms = 4000) {
    setNotice(msg)
    setTimeout(() => setNotice(null), ms)
  }

  // 8·9번 AI 작성 — 탭을 열었을 때 비어 있으면 자동 1회, 버튼으로 전체/개별 재작성 가능
  // only: 'tradeArea' | 'franchise' 를 주면 그 항목만 새 결과로 교체한다
  async function fillTradeAndFranchise({ force = false, only = null } = {}) {
    if (busy) return
    if (!force && fields.tradeArea.trim() && fields.franchise.trim()) return
    setBusy('fill')
    try {
      const r = await fetch('/api/adwrite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          task: 'fill89',
          data: {
            storeName: fields.storeName, businessType: info?.businessType,
            address: fields.address, area: fields.area,
            deposit: wonToMan(fields.deposit), monthlyRent: wonToMan(fields.monthlyRent),
            premium: wonToMan(fields.premium), maintenanceFee: wonToMan(fields.maintenanceFee),
            franchiseBrand: info?.franchise || null,
          },
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      setFields(prev => {
        const apply = key =>
          (!only || only === key) && (force || !prev[key].trim())
            ? (data.fields?.[key] || prev[key])
            : prev[key]
        const next = { ...prev, tradeArea: apply('tradeArea'), franchise: apply('franchise') }
        persist(next)
        return next
      })
      flash('상권·프랜차이즈 항목을 AI가 작성했어요 — 확인·수정 후 사용하세요')
    } catch (err) {
      flash(`상권·프랜차이즈 작성 실패: ${err.message || err}`)
    } finally {
      setBusy(null)
    }
  }

  useEffect(() => {
    if (!active || !loaded || !cardKey) return
    if (filledRef.current === cardKey) return
    if (fields.tradeArea.trim() && fields.franchise.trim()) { filledRef.current = cardKey; return }
    if (!fields.address.trim() && !fields.storeName.trim()) return // 정보가 아직 없음
    filledRef.current = cardKey
    fillTradeAndFranchise()
  }, [active, loaded, cardKey])

  // [반영하기] — 12개 항목으로 매물광고 작성 → 작성완료로 전환
  async function compose() {
    if (busy) return
    setBusy('compose')
    try {
      const r = await fetch('/api/adwrite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          task: 'compose',
          data: {
            ...fields,
            deposit: wonToMan(fields.deposit), monthlyRent: wonToMan(fields.monthlyRent),
            premium: wonToMan(fields.premium), maintenanceFee: wonToMan(fields.maintenanceFee),
            businessType: info?.businessType,
          },
        }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`)
      setAdText(data.adText || '')
      persist(undefined, data.adText || '')
      setView('done')
    } catch (err) {
      flash(`광고 작성 실패: ${err.message || err}`)
    } finally {
      setBusy(null)
    }
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(adText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      flash('복사 실패 — 텍스트를 길게 눌러 직접 복사해 주세요')
    }
  }

  if (!cardKey) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="text-sm font-semibold text-fg-2">매물카드에서 카드를 먼저 열어주세요</p>
        <p className="text-xs text-fg-hint">카드를 열면 추출된 매물 정보로 광고작성이 자동으로 채워져요</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      {/* 내부 전환: 광고작성 | 작성완료 */}
      <div className="flex shrink-0 items-center gap-2 px-4 py-2">
        <div className="flex rounded-full bg-chip p-[3px]">
          {[['write', '광고작성'], ['done', '작성완료']].map(([key, label]) => (
            <button key={key} onClick={() => setView(key)}
              className={`rounded-full px-5 py-2 text-[13px] font-bold transition-colors duration-150 ${
                view === key ? 'bg-opt-container text-on-opt-container' : 'text-fg-2'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        {view === 'write' && (
          <button onClick={() => fillTradeAndFranchise({ force: true })} disabled={!!busy}
            className="h-9 rounded-full bg-opt-container px-4 text-xs font-bold text-on-opt-container active:opacity-80 disabled:opacity-40">
            {busy === 'fill' ? 'AI 작성 중…' : '상권·프랜차이즈 다시 작성'}
          </button>
        )}
      </div>

      {notice && (
        <p className={`mx-4 shrink-0 rounded-xl px-4 py-2 text-center text-xs font-bold ${notice.includes('실패') ? 'bg-danger-container text-on-danger-container' : 'bg-ok text-on-ok'}`}>
          {notice}
        </p>
      )}

      {view === 'write' ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-1">
          <div className="mx-auto max-w-2xl rounded-2xl bg-card p-4 shadow-card">
            {!loaded && <p className="py-8 text-center text-sm text-fg-hint">불러오는 중…</p>}
            {loaded && (
              <div className="space-y-3.5">
                {FIELD_DEFS.map(([key, label, type]) => (
                  <label key={key} className="block">
                    <span className="flex items-center text-xs font-medium text-fg-2">
                      {label}
                      {(key === 'tradeArea' || key === 'franchise') && (
                        <>
                          <span className="ml-1.5 rounded-full bg-opt-container px-2 py-0.5 text-[10px] font-bold text-on-opt-container">AI 자동작성</span>
                          <span className="flex-1" />
                          <button type="button"
                            onClick={() => fillTradeAndFranchise({ force: true, only: key })}
                            disabled={!!busy}
                            className="rounded-full bg-chip px-3 py-1.5 text-[11px] font-bold text-opt active:opacity-80 disabled:opacity-40">
                            {busy === 'fill' ? '작성 중…' : '↺ AI 다시 작성'}
                          </button>
                        </>
                      )}
                    </span>
                    {type === 'text' && (
                      <input type="text" value={fields[key] || ''} onChange={e => setField(key, e.target.value)}
                        className="mt-1 w-full rounded-xl bg-field px-3.5 py-2.5 text-[15px] font-semibold text-fg focus:outline-none focus:ring-2 focus:ring-primary" />
                    )}
                    {type === 'money' && (
                      <div className="mt-1 flex items-center gap-1.5 rounded-xl bg-field px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-primary">
                        <input type="text" inputMode="numeric"
                          value={fields[key] ? formatComma(fields[key]) : ''}
                          onChange={e => setField(key, e.target.value.trim() === '' ? null : parseAmount(e.target.value))}
                          placeholder="0"
                          className="w-full min-w-0 bg-transparent text-right text-[15px] font-bold text-fg placeholder:font-normal placeholder:text-fg-hint focus:outline-none" />
                        <span className="shrink-0 text-xs text-fg-hint">원</span>
                      </div>
                    )}
                    {type === 'multi' && (
                      <textarea value={fields[key] || ''} onChange={e => setField(key, e.target.value)}
                        rows={key === 'tradeArea' || key === 'franchise' ? 6 : 3}
                        placeholder={busy === 'fill' && (key === 'tradeArea' || key === 'franchise') ? 'AI가 작성 중…' : ''}
                        className="mt-1 w-full resize-y rounded-xl bg-field px-3.5 py-2.5 text-[14px] leading-relaxed text-fg placeholder:text-fg-hint focus:outline-none focus:ring-2 focus:ring-primary" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-1">
          <div className="mx-auto flex h-full max-w-2xl flex-col rounded-2xl bg-card p-4 shadow-card">
            <div className="flex shrink-0 items-center gap-2">
              <p className="text-base font-extrabold text-fg">매물광고</p>
              <span className="text-[11px] text-fg-hint">자유롭게 수정 후 복사하세요</span>
              <span className="flex-1" />
              <button onClick={compose} disabled={!!busy}
                className="h-9 rounded-full bg-opt-container px-4 text-xs font-bold text-on-opt-container active:opacity-80 disabled:opacity-40">
                {busy === 'compose' ? '작성 중…' : '다시 생성'}
              </button>
              <button onClick={copyAll} disabled={!adText}
                className="h-9 rounded-full bg-primary px-5 text-xs font-bold text-on-primary active:opacity-90 disabled:bg-off-bg disabled:text-off-fg">
                {copied ? '✓ 복사됨' : '전체 복사'}
              </button>
            </div>
            {adText ? (
              <>
                <textarea value={adText}
                  onChange={e => { setAdText(e.target.value); persist(undefined, e.target.value) }}
                  className="mt-3 min-h-0 flex-1 resize-none rounded-xl bg-inset p-4 text-[14px] leading-relaxed text-fg focus:outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={() => setView('write')}
                  className="mt-3 w-full shrink-0 rounded-full border border-line bg-card py-3 text-[13px] font-bold text-opt active:bg-chip">
                  ← 광고작성으로 돌아가 수정 (수정 후 다시 [반영하기])
                </button>
              </>
            ) : (
              <p className="py-16 text-center text-sm text-fg-hint">
                아직 작성된 광고가 없어요 — 광고작성에서 [반영하기]를 눌러 주세요
              </p>
            )}
          </div>
        </div>
      )}

      {/* 반영하기 — 광고작성 화면 하단 고정 */}
      {view === 'write' && (
        <div className="fixed inset-x-0 bottom-0 bg-surface/95 p-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <button onClick={compose} disabled={!!busy || !loaded}
              className="w-full rounded-full bg-opt px-4 py-3.5 text-[15px] font-bold text-on-opt transition-colors duration-150 active:opacity-90 disabled:bg-off-bg disabled:text-off-fg">
              {busy === 'compose' ? 'AI가 광고를 작성하고 있어요…' : '반영하기 — 매물광고 작성'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
