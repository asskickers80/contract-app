import { useEffect, useRef, useState } from 'react'
import { loadCardBoard, saveCardBoard } from '../lib/boardStore.js'
import { formatComma, parseAmount } from '../lib/format.js'

// 수수료 요율 기본값 — 사무소 공통 설정이라 localStorage에 기억한다
const DEFAULT_RATES = { brokerRate: 0.9, premiumRate: 10 }

function loadRates() {
  try {
    return { ...DEFAULT_RATES, ...JSON.parse(localStorage.getItem('contract.feeRates') || '{}') }
  } catch {
    return { ...DEFAULT_RATES }
  }
}

// 보드의 매물 정보(AI 추출)와 저장된 계산값으로 계산기 초기값 구성
function initFee(board) {
  const info = board?.info || {}
  return {
    deposit: info.deposit ?? 0,
    monthlyRent: info.monthlyRent ?? 0,
    premium: info.premium ?? 0,
    ...loadRates(),
    ...(board?.fee || {}), // 이 카드에서 계산하던 값이 있으면 그것을 우선
  }
}

export default function NoteTab({ cardKey }) {
  const [note, setNote] = useState('')
  const [fee, setFee] = useState(null)
  const [info, setInfo] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef(null)
  const feeTimer = useRef(null)

  useEffect(() => {
    setLoaded(false)
    setFee(null)
    setInfo(null)
    if (!cardKey) return
    loadCardBoard(cardKey)
      .then(board => {
        setNote(board?.note || '')
        setInfo(board?.info || null)
        setFee(initFee(board))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [cardKey])

  function handleChange(e) {
    const val = e.target.value
    setNote(val)
    if (!cardKey) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const board = await loadCardBoard(cardKey).catch(() => null)
      await saveCardBoard(cardKey, { ...(board || {}), note: val })
    }, 500)
  }

  function updateFee(patch) {
    const next = { ...fee, ...patch }
    setFee(next)
    localStorage.setItem('contract.feeRates', JSON.stringify({
      brokerRate: next.brokerRate, premiumRate: next.premiumRate,
    }))
    if (!cardKey) return
    clearTimeout(feeTimer.current)
    feeTimer.current = setTimeout(async () => {
      const board = await loadCardBoard(cardKey).catch(() => null)
      await saveCardBoard(cardKey, { ...(board || {}), fee: next })
    }, 500)
  }

  // 매물 정보(AI 추출값)에서 금액 다시 불러오기
  function pullFromInfo() {
    updateFee({
      deposit: info?.deposit ?? 0,
      monthlyRent: info?.monthlyRent ?? 0,
      premium: info?.premium ?? 0,
    })
  }

  if (!cardKey) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="text-4xl">📋</p>
        <p className="text-sm font-semibold text-gray-400">매물카드에서 카드를 먼저 열어주세요</p>
        <p className="text-xs text-gray-300">카드를 열면 이 탭에서 수수료 계산과 노트를 쓸 수 있어요</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {loaded && fee && (
        <FeeCalc fee={fee} hasInfo={!!info} onChange={updateFee} onPullInfo={pullFromInfo} />
      )}

      <div className="border-b border-gray-100 px-4 py-2">
        <p className="text-sm font-bold text-gray-700">노트</p>
      </div>
      <textarea
        value={loaded ? note : ''}
        onChange={handleChange}
        disabled={!loaded}
        placeholder={loaded ? '자유롭게 메모하세요…' : '불러오는 중…'}
        className="min-h-0 flex-1 resize-none p-4 text-base leading-relaxed text-gray-900 placeholder:text-gray-300 focus:outline-none disabled:bg-gray-50"
      />
    </div>
  )
}

// ── 수수료 계산기 ────────────────────────────────────────────
function FeeCalc({ fee, hasInfo, onChange, onPullInfo }) {
  // 환산보증금 = 보증금 + 월세 × 100
  const converted = (fee.deposit || 0) + (fee.monthlyRent || 0) * 100
  const brokerFee = Math.round(converted * (fee.brokerRate || 0) / 100)
  const premiumFee = Math.round((fee.premium || 0) * (fee.premiumRate || 0) / 100)
  const total = brokerFee + premiumFee
  const totalVat = Math.round(total * 1.1)

  const money = (label, key) => (
    <label className="block min-w-0">
      <span className="text-[11px] font-semibold text-gray-500">{label}</span>
      <div className="mt-0.5 flex items-center gap-1">
        <input type="text" inputMode="numeric"
          value={fee[key] ? formatComma(fee[key]) : ''}
          onChange={e => onChange({ [key]: parseAmount(e.target.value) })}
          placeholder="0"
          className="w-full min-w-0 rounded-lg border border-gray-300 px-2 py-2 text-right text-sm focus:border-blue-500 focus:outline-none" />
        <span className="shrink-0 text-[11px] text-gray-400">원</span>
      </div>
    </label>
  )

  const rate = (key) => (
    <span className="inline-flex items-center gap-0.5">
      <input type="number" inputMode="decimal" step="0.1" min="0"
        value={fee[key] ?? ''}
        onChange={e => onChange({ [key]: e.target.value === '' ? 0 : Number(e.target.value) })}
        className="w-14 rounded-lg border border-gray-300 px-1.5 py-1 text-right text-sm focus:border-blue-500 focus:outline-none" />
      <span className="text-[11px] text-gray-400">%</span>
    </span>
  )

  return (
    <div className="shrink-0 border-b border-gray-200 bg-blue-50/50 px-4 py-3">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-800">수수료 계산</p>
          {hasInfo
            ? <button onClick={onPullInfo}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm active:bg-blue-50">
                매물 정보 다시 불러오기
              </button>
            : <span className="text-[11px] text-gray-400">매물카드에서 &lsquo;AI 읽기&rsquo;를 하면 자동으로 채워져요</span>
          }
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {money('보증금', 'deposit')}
          {money('월세', 'monthlyRent')}
          {money('권리금', 'premium')}
        </div>

        <div className="mt-3 space-y-1.5 rounded-xl bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">환산보증금 <span className="text-[11px] text-gray-300">(보증금+월세×100)</span></span>
            <span className="font-semibold text-gray-700">{formatComma(converted)}원</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-gray-500">중개보수 {rate('brokerRate')}</span>
            <span className="font-semibold text-gray-700">{formatComma(brokerFee)}원</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-gray-500">권리금 수수료 {rate('premiumRate')}</span>
            <span className="font-semibold text-gray-700">{formatComma(premiumFee)}원</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-gray-100 pt-1.5">
            <span className="text-sm font-bold text-gray-800">합계</span>
            <span className="text-right">
              <span className="text-lg font-bold text-blue-700">{formatComma(total)}원</span>
              <span className="block text-[11px] text-gray-400">부가세 포함 {formatComma(totalVat)}원</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
