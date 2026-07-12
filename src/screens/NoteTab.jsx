import { useEffect, useRef, useState } from 'react'
import InkPad from '../components/InkPad.jsx'
import { loadCardBoard, saveCardBoard } from '../lib/boardStore.js'
import { formatComma, parseAmount } from '../lib/format.js'

// 요율 고정 규칙
const BROKER_RATE = 0.9 // 중개보수: 환산보증금의 0.9%
// 권리금 수수료: 4,000만 이하 일괄 200만 원, 1억 미만 5%, 1억 이상 2억 미만 4%, 2억 이상 3%
function premiumFeeOf(premium) {
  if (!premium || premium <= 0) return { fee: 0, label: null }
  if (premium <= 40000000) return { fee: 2000000, label: '일괄 200만 원 적용' }
  if (premium >= 200000000) return { fee: Math.round(premium * 0.03), label: '3% 적용' }
  if (premium >= 100000000) return { fee: Math.round(premium * 0.04), label: '4% 적용' }
  return { fee: Math.round(premium * 0.05), label: '5% 적용' }
}

// 보드의 매물 정보(AI 추출)와 저장된 계산값으로 계산기 초기값 구성
function initFee(board) {
  const info = board?.info || {}
  const saved = board?.fee || {} // 이 카드에서 계산하던 값이 있으면 그것을 우선
  return {
    deposit: saved.deposit ?? info.deposit ?? 0,
    monthlyRent: saved.monthlyRent ?? info.monthlyRent ?? 0,
    premium: saved.premium ?? info.premium ?? 0,
  }
}

export default function NoteTab({ cardKey }) {
  const [note, setNote] = useState('')
  const [fee, setFee] = useState(null)
  const [info, setInfo] = useState(null)
  const [ink, setInk] = useState(null) // 손글씨 획 배열 (로드 시 1회 설정)
  const [mode, setMode] = useState(() => localStorage.getItem('contract.noteMode') || 'ink')
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef(null)
  const feeTimer = useRef(null)
  const inkTimer = useRef(null)

  useEffect(() => {
    setLoaded(false)
    setFee(null)
    setInfo(null)
    setInk(null)
    if (!cardKey) return
    loadCardBoard(cardKey)
      .then(board => {
        setNote(board?.note || '')
        setInfo(board?.info || null)
        setFee(initFee(board))
        setInk(board?.ink?.strokes || [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [cardKey])

  function switchMode(next) {
    setMode(next)
    localStorage.setItem('contract.noteMode', next)
  }

  // 손글씨 저장 (디바운스)
  function handleInkCommit(strokes) {
    if (!cardKey) return
    clearTimeout(inkTimer.current)
    inkTimer.current = setTimeout(async () => {
      const board = await loadCardBoard(cardKey).catch(() => null)
      await saveCardBoard(cardKey, { ...(board || {}), ink: { strokes } })
    }, 500)
  }

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

      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-1.5">
        <p className="text-sm font-bold text-gray-700">노트</p>
        <div className="flex overflow-hidden rounded-lg bg-gray-100 p-0.5">
          <button onClick={() => switchMode('ink')}
            className={`rounded-md px-4 py-2 text-xs font-bold ${mode === 'ink' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>
            ✏ 손글씨
          </button>
          <button onClick={() => switchMode('text')}
            className={`rounded-md px-4 py-2 text-xs font-bold ${mode === 'text' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>
            ⌨ 텍스트
          </button>
        </div>
      </div>

      {mode === 'ink' ? (
        loaded && ink !== null
          ? <InkPad key={cardKey} initialStrokes={ink} onCommit={handleInkCommit} />
          : <p className="py-10 text-center text-sm text-gray-300">불러오는 중…</p>
      ) : (
        <textarea
          value={loaded ? note : ''}
          onChange={handleChange}
          disabled={!loaded}
          placeholder={loaded ? '자유롭게 메모하세요…' : '불러오는 중…'}
          className="min-h-0 flex-1 resize-none p-4 text-base leading-relaxed text-gray-900 placeholder:text-gray-300 focus:outline-none disabled:bg-gray-50"
        />
      )}
    </div>
  )
}

// ── 수수료 계산기 ────────────────────────────────────────────
function FeeCalc({ fee, hasInfo, onChange, onPullInfo }) {
  const [open, setOpen] = useState(true) // 기본은 펼침 — 노트 쓸 때 접어서 공간 확보
  // 환산보증금 = 보증금 + 월세 × 100
  const converted = (fee.deposit || 0) + (fee.monthlyRent || 0) * 100
  const brokerFee = Math.round(converted * BROKER_RATE / 100)
  const { fee: premiumFee, label: premiumLabel } = premiumFeeOf(fee.premium || 0)
  const total = brokerFee + premiumFee
  const totalVat = Math.round(total * 1.1)

  // 접힌 상태: 합계 한 줄 요약만
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full shrink-0 items-center gap-2 border-b border-gray-200 bg-blue-50/50 px-4 py-2.5 text-left"
      >
        <span className="text-sm font-bold text-gray-800">수수료</span>
        <span className="text-sm font-bold text-blue-700">{formatComma(total) || 0}원</span>
        <span className="text-[11px] text-gray-400">(부가세 별도{premiumLabel ? ` · 권리금 ${premiumLabel}` : ''})</span>
        <span className="flex-1" />
        <span className="text-xs font-semibold text-gray-400">펼치기 ▾</span>
      </button>
    )
  }

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

  return (
    <div className="shrink-0 border-b border-gray-200 bg-blue-50/50 px-4 py-3">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-gray-800">수수료 계산</p>
          <span className="flex-1" />
          {hasInfo
            ? <button onClick={onPullInfo}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 shadow-sm active:bg-blue-50">
                매물 정보 다시 불러오기
              </button>
            : <span className="text-[11px] text-gray-400">매물카드에서 &lsquo;AI 읽기&rsquo;를 하면 자동으로 채워져요</span>
          }
          <button onClick={() => setOpen(false)}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 shadow-sm active:bg-gray-50">
            접기 ▴
          </button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {money('보증금', 'deposit')}
          {money('월세', 'monthlyRent')}
          {money('권리금', 'premium')}
        </div>

        <div className="mt-3 space-y-1.5 rounded-xl bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">환산보증금 <span className="text-[11px] text-gray-300">(보증금+월세×100)</span></span>
            <span className="font-semibold text-gray-700">{formatComma(converted) || 0}원</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">중개보수 <span className="text-[11px] text-gray-400">{BROKER_RATE}%</span></span>
            <span className="font-semibold text-gray-700">
              {formatComma(brokerFee) || 0}원 <span className="text-[11px] font-normal text-gray-400">(부가세 별도)</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">권리금 수수료</span>
            <span className="font-semibold text-gray-700">
              {formatComma(premiumFee) || 0}원{' '}
              {premiumLabel && (
                <span className={`text-[11px] font-normal ${premiumLabel.startsWith('일괄') ? 'rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-700' : 'text-blue-600'}`}>
                  {premiumLabel}
                </span>
              )}{' '}
              <span className="text-[11px] font-normal text-gray-400">(부가세 별도)</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between border-t border-gray-100 pt-1.5">
            <span className="text-sm font-bold text-gray-800">합계 <span className="text-[11px] font-normal text-gray-400">(부가세 별도)</span></span>
            <span className="text-right">
              <span className="text-lg font-bold text-blue-700">{formatComma(total) || 0}원</span>
              <span className="block text-[11px] text-gray-400">부가세 포함 시 {formatComma(totalVat) || 0}원</span>
            </span>
          </div>
        </div>
        <p className="mt-1.5 text-right text-[11px] text-gray-400">권리금 수수료: 4,000만 이하 일괄 200만 원 · 1억 미만 5% · 1억~2억 미만 4% · 2억 이상 3%</p>
      </div>
    </div>
  )
}
