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
        <p className="text-sm font-semibold text-fg-2">매물카드에서 카드를 먼저 열어주세요</p>
        <p className="text-xs text-fg-hint">카드를 열면 이 탭에서 수수료 계산과 노트를 쓸 수 있어요</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-surface px-4 pb-4 pt-1">
      {loaded && fee && (
        <FeeCalc fee={fee} hasInfo={!!info} onChange={updateFee} onPullInfo={pullFromInfo} />
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-card">
      <div className="flex items-center justify-between px-4 py-1.5">
        <p className="text-[15px] font-extrabold text-fg">노트</p>
        <div className="flex rounded-full bg-chip p-[3px]">
          <button onClick={() => switchMode('ink')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors duration-150 ${mode === 'ink' ? 'bg-primary-container text-on-primary-container' : 'text-fg-2'}`}>
            ✏ 손글씨
          </button>
          <button onClick={() => switchMode('text')}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors duration-150 ${mode === 'text' ? 'bg-primary-container text-on-primary-container' : 'text-fg-2'}`}>
            ⌨ 텍스트
          </button>
        </div>
      </div>

      {mode === 'ink' ? (
        loaded && ink !== null
          ? <InkPad key={cardKey} initialStrokes={ink} onCommit={handleInkCommit} />
          : <p className="py-10 text-center text-sm text-fg-hint">불러오는 중…</p>
      ) : (
        <textarea
          value={loaded ? note : ''}
          onChange={handleChange}
          disabled={!loaded}
          placeholder={loaded ? '자유롭게 메모하세요…' : '불러오는 중…'}
          className="min-h-0 flex-1 resize-none bg-card p-4 text-base leading-relaxed text-fg placeholder:text-fg-hint focus:outline-none"
        />
      )}
      </div>
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

  // 접힌 상태: 수수료 총액 한 줄 요약
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full shrink-0 items-baseline gap-2 rounded-2xl bg-card px-4 py-2.5 text-left shadow-card"
      >
        <span className="text-sm font-extrabold text-fg">수수료 합계</span>
        <span className="text-base font-extrabold text-primary">{formatComma(total) || 0}원</span>
        <span className="text-[11px] text-fg-hint">(부가세 별도)</span>
        <span className="text-xs text-fg-2">부가세 포함 {formatComma(totalVat) || 0}원</span>
        {premiumLabel?.startsWith('일괄') && (
          <span className="rounded-full bg-warn px-2 py-0.5 text-[11px] font-bold text-on-warn">{premiumLabel}</span>
        )}
        <span className="flex-1" />
        <span className="shrink-0 text-xs font-semibold text-fg-hint">펼치기 ▾</span>
      </button>
    )
  }

  const money = (label, key) => (
    <label className="block min-w-0">
      <span className="text-xs font-medium text-fg-2">{label}</span>
      <div className="mt-1 flex items-center gap-1.5 rounded-xl bg-field px-3 py-2 focus-within:ring-2 focus-within:ring-primary">
        <input type="text" inputMode="numeric"
          value={fee[key] ? formatComma(fee[key]) : ''}
          onChange={e => onChange({ [key]: parseAmount(e.target.value) })}
          placeholder="0"
          className="w-full min-w-0 bg-transparent text-right text-base font-bold text-fg placeholder:font-normal placeholder:text-fg-hint focus:outline-none" />
        <span className="shrink-0 text-xs text-fg-hint">원</span>
      </div>
    </label>
  )

  return (
    <div className="shrink-0 rounded-2xl bg-card px-4 py-3.5 shadow-card">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-extrabold text-fg">수수료 계산</p>
          <span className="flex-1" />
          {hasInfo
            ? <button onClick={onPullInfo}
                className="rounded-full bg-primary-container px-3.5 py-2 text-xs font-semibold text-on-primary-container active:opacity-80">
                매물 정보 다시 불러오기
              </button>
            : <span className="text-[11px] text-fg-hint">매물카드에서 &lsquo;AI 읽기&rsquo;를 하면 자동으로 채워져요</span>
          }
          <button onClick={() => setOpen(false)}
            className="rounded-full bg-chip px-3.5 py-2 text-xs font-semibold text-fg-2 active:opacity-80">
            접기 ▴
          </button>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {money('보증금', 'deposit')}
          {money('월세', 'monthlyRent')}
          {money('권리금', 'premium')}
        </div>

        <div className="mt-3 rounded-xl bg-inset px-3.5 py-1">
          <div className="flex items-center justify-between border-b border-inset-line py-2 text-sm">
            <span className="text-fg-2">환산보증금 <span className="text-[11px] text-fg-hint">(보증금+월세×100)</span></span>
            <span className="font-bold text-fg">{formatComma(converted) || 0}원</span>
          </div>
          <div className="flex items-center justify-between border-b border-inset-line py-2 text-sm">
            <span className="text-fg-2">중개보수 <span className="text-[11px] text-fg-hint">{BROKER_RATE}%</span></span>
            <span className="font-bold text-fg">
              {formatComma(brokerFee) || 0}원 <span className="text-[11px] font-normal text-fg-hint">(부가세 별도)</span>
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-inset-line py-2 text-sm">
            <span className="text-fg-2">권리금 수수료</span>
            <span className="font-bold text-fg">
              {formatComma(premiumFee) || 0}원{' '}
              {premiumLabel && (
                <span className={`text-[11px] ${premiumLabel.startsWith('일괄') ? 'rounded-full bg-warn px-2 py-0.5 font-bold text-on-warn' : 'font-normal text-primary'}`}>
                  {premiumLabel}
                </span>
              )}{' '}
              <span className="text-[11px] font-normal text-fg-hint">(부가세 별도)</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between py-2">
            <span className="text-sm font-extrabold text-fg">합계 <span className="text-[11px] font-normal text-fg-hint">(부가세 별도)</span></span>
            <span className="text-right">
              <span className="text-[23px] font-extrabold leading-tight text-primary">{formatComma(total) || 0}원</span>
              <span className="block text-[11px] text-fg-hint">부가세 포함 시 {formatComma(totalVat) || 0}원</span>
            </span>
          </div>
        </div>
        <p className="mt-1.5 text-right text-[11px] text-fg-hint">권리금 수수료: 4,000만 이하 일괄 200만 원 · 1억 미만 5% · 1억~2억 미만 4% · 2억 이상 3%</p>
      </div>
    </div>
  )
}
