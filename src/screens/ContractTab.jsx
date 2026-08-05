import { useEffect, useState } from 'react'
import StepProgress from '../components/StepProgress.jsx'
import SettingsSheet from '../components/SettingsSheet.jsx'
import ContractForm from './ContractForm.jsx'
import SignScreen from './SignScreen.jsx'
import { makeEmptyDraft, validateDraft } from '../lib/draft.js'
import { loadCardBoard, patchCardBoard } from '../lib/boardStore.js'
import { listContracts, downloadContractPdf, isSupabaseConfigured } from '../lib/supabase.js'
import { sharePdf, downloadBlob } from '../lib/share.js'
import { formatBizNo, digitsOnly } from '../lib/format.js'
import { CATEGORIES } from '../constants/categories.js'
import { loadUi, saveUi } from '../lib/uiState.js'
import { useBackClose } from '../lib/backNav.js'

// AI가 "서비스업 기타서비스업"처럼 대분류까지 붙여 읽어도 계약서에는 세부 업종명만 쓴다
const LEAF_TYPES = CATEGORIES.flatMap(c => c.items)
export function normalizeBizType(v) {
  const s = (v || '').trim()
  if (!s || LEAF_TYPES.includes(s)) return s
  const tokens = s.split(/\s+/)
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (LEAF_TYPES.includes(tokens[i])) return tokens[i]
  }
  return tokens.length > 1 ? tokens[tokens.length - 1] : s
}

// [계약] 탭 — 기존 계약서 앱의 2단계 흐름을 탭 하나 안에 단계 전환 방식으로 구현
//   1단계 [입력]: 정보 입력 → 필수 필드 완료 시 [계약서 생성] 활성화
//   2단계 [계약서]: 열람(스크롤 게이트) + 자필 확인 + 성명·서명
// 상단 진행 표시(① 입력 → ② 계약서)에서 2단계 중에도 ①로 돌아가 수정 가능.
// 서명 완료 결과는 App으로 올려보내고 전달·결제 탭이 이어받는다(자동 전환).
// 새로고침 대비: 작성 중이던 입력을 복원 (저장된 값 위에 최신 기본값을 깔아 스키마 변화에도 안전)
function restoreDraft() {
  const saved = loadUi('contract.draft')
  return saved ? { ...makeEmptyDraft(), ...saved } : makeEmptyDraft()
}

export default function ContractTab({ onComplete, cardKey, active }) {
  // input | paper — 계약서 단계였고 필수 입력이 온전하면 그 단계로 복원
  const [step, setStep] = useState(() =>
    loadUi('contract.step') === 'paper' && validateDraft(restoreDraft()).length === 0 ? 'paper' : 'input'
  )
  const [draft, setDraft] = useState(restoreDraft)
  const [showSettings, setShowSettings] = useState(false)
  const [done, setDone] = useState(null)      // 이 카드에 연결된 완료 계약 (있으면 완료 화면)
  const [writeNew, setWriteNew] = useState(false) // 완료된 매물에서 '새 계약 작성'을 눌렀는지

  // 입력할 때마다 자동 임시저장 — 새로고침해도 쓰던 내용 유지
  useEffect(() => {
    saveUi('contract.draft', draft)
    saveUi('contract.step', step)
  }, [draft, step])

  // 뒤로 가기: 계약서 화면이면 입력 단계로, 설정이 열려 있으면 설정만 닫기
  useBackClose(active && step === 'paper', () => setStep('input'))
  useBackClose(active && showSettings, () => setShowSettings(false))

  // 열려 있는 매물카드의 AI 추출 정보(상호·업종·사업자등록번호·소재지)를
  // 계약서 입력의 빈 칸에 자동으로 채운다 (사용자가 이미 쓴 값은 건드리지 않음)
  // 단, "다른" 매물 카드를 새로 열었으면 이전 매물의 작성 내용을 비우고 새로 시작한다
  // (같은 카드를 다시 열 때는 쓰던 내용 유지 — 2026-07-24 대표님 지시)
  useEffect(() => {
    if (!active || !cardKey) return
    const prevKey = loadUi('contract.cardKey')
    const isNewCard = Boolean(prevKey) && prevKey !== cardKey
    saveUi('contract.cardKey', cardKey)
    if (isNewCard) { setStep('input'); setWriteNew(false) }
    loadCardBoard(cardKey)
      .then(async board => {
        // 이 매물로 완료된 계약이 있으면 완료 화면을 먼저 보여준다 (서명본 유실 아님 — 재전달 가능)
        let c = board?.contract || null
        if (!c && isSupabaseConfigured && board?.info?.storeName) {
          // 연결 정보가 없는 옛 카드 — 계약 목록에서 상호로 찾아 자동 연결
          try {
            const rows = await listContracts(board.info.storeName)
            if (rows?.length) {
              const r = rows[0]
              c = {
                id: r.id, pdfPath: r.pdf_path, fileName: r.file_name,
                storeName: r.store_name, customerName: '', total: r.total ?? null,
                signedAt: r.signed_at || null,
              }
              patchCardBoard(cardKey, { contract: c }).catch(() => {})
            }
          } catch { /* 조회 실패 시 그냥 서식으로 */ }
        }
        setDone(c)
        const info = board?.info
        setDraft(d => {
          const base = isNewCard ? makeEmptyDraft() : d
          if (!info) return base
          return {
            ...base,
            storeName: base.storeName?.trim() ? base.storeName : (info.storeName || ''),
            businessType: base.businessType?.trim() ? base.businessType : normalizeBizType(info.businessType),
            bizNo: digitsOnly(base.bizNo) ? base.bizNo : (info.bizNo ? formatBizNo(info.bizNo) : ''),
            address: base.address?.trim() ? base.address : (info.address || ''),
          }
        })
      })
      .catch(() => { if (isNewCard) { setDone(null); setDraft(makeEmptyDraft()) } })
  }, [active, cardKey])

  return (
    <div className="flex h-full flex-col bg-surface">
      <StepProgress
        step={step}
        onBackToInput={() => setStep('input')}
        onSettings={() => setShowSettings(true)}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {step === 'input' && done && !writeNew && (
          <CompletedContract done={done} onWriteNew={() => setWriteNew(true)} />
        )}
        {step === 'input' && !(done && !writeNew) && (
          <ContractForm
            draft={draft}
            onChange={setDraft}
            onGenerate={() => setStep('paper')}
          />
        )}
        {step === 'paper' && (
          <SignScreen
            draft={draft}
            onDone={result => {
              // 서명 완료 — 임시저장을 비워 다음 계약이 빈 화면에서 시작되게
              saveUi('contract.draft', null)
              saveUi('contract.step', null)
              onComplete(result)
            }}
          />
        )}
      </div>

      {showSettings && (
        <SettingsSheet
          onClose={() => setShowSettings(false)}
          onAgentChange={v => {
            if (!draft.agentName?.trim()) setDraft(d => ({ ...d, agentName: v }))
          }}
        />
      )}
    </div>
  )
}

// ── 완료된 계약 화면 — 서명본은 서버에 있으므로 재전달·다운로드로 바로 쓴다 ──
function CompletedContract({ done, onWriteNew }) {
  const [busy, setBusy] = useState(false)

  async function withPdf(action) {
    if (!done.pdfPath) return
    setBusy(true)
    try {
      const blob = await downloadContractPdf(done.pdfPath)
      await action(blob, done.fileName || `${done.storeName || '계약서'}.pdf`)
    } catch (err) {
      alert(`PDF를 가져오지 못했어요: ${err.message || err}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-2xl px-4 pb-10">
      <div className="rounded-2xl bg-card p-5 shadow-card">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ok px-3 py-1 text-xs font-bold text-on-ok">✓ 계약 완료</span>
        <p className="mt-3 text-lg font-extrabold text-fg">{done.storeName || '상호 미확인'}</p>
        <p className="mt-1 text-sm text-fg-2">
          {done.customerName ? `광고주 ${done.customerName} · ` : ''}
          서명 {done.signedAt ? new Date(done.signedAt).toLocaleString('ko-KR') : '—'}
        </p>
        {done.total != null && (
          <p className="mt-0.5 text-sm text-fg-2">총 {Number(done.total).toLocaleString('ko-KR')}원 <span className="text-xs text-fg-hint">(부가세 포함)</span></p>
        )}

        {done.pdfPath ? (
          <div className="mt-4 flex gap-2">
            <button onClick={() => withPdf((blob, name) => sharePdf(blob, name))} disabled={busy}
              className="flex-1 rounded-full bg-primary py-3 text-sm font-bold text-on-primary active:opacity-90 disabled:opacity-50">
              {busy ? '…' : '계약서 재전달'}
            </button>
            <button onClick={() => withPdf((blob, name) => downloadBlob(blob, name))} disabled={busy}
              className="flex-1 rounded-full border border-line bg-card py-3 text-sm font-semibold text-primary active:bg-chip disabled:opacity-50">
              다운로드
            </button>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-inset px-3.5 py-2.5 text-xs text-fg-2">
            서명된 계약서 PDF는 전달·결제 탭의 <b>계약 목록 · 재전달</b>에서 상호로 검색해 받을 수 있어요.
          </p>
        )}
      </div>

      <button onClick={onWriteNew}
        className="mt-4 w-full rounded-full border border-line bg-card py-3 text-sm font-semibold text-fg-2 active:bg-chip">
        이 매물로 새 계약 작성 (완료된 계약은 그대로 보관됩니다)
      </button>
    </div>
  )
}
