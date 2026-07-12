import { useEffect, useState } from 'react'
import StepProgress from '../components/StepProgress.jsx'
import SettingsSheet from '../components/SettingsSheet.jsx'
import ContractForm from './ContractForm.jsx'
import SignScreen from './SignScreen.jsx'
import { makeEmptyDraft, validateDraft } from '../lib/draft.js'
import { loadCardBoard } from '../lib/boardStore.js'
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
  useEffect(() => {
    if (!active || !cardKey) return
    loadCardBoard(cardKey)
      .then(board => {
        const info = board?.info
        if (!info) return
        setDraft(d => ({
          ...d,
          storeName: d.storeName?.trim() ? d.storeName : (info.storeName || ''),
          businessType: d.businessType?.trim() ? d.businessType : normalizeBizType(info.businessType),
          bizNo: digitsOnly(d.bizNo) ? d.bizNo : (info.bizNo ? formatBizNo(info.bizNo) : ''),
          address: d.address?.trim() ? d.address : (info.address || ''),
        }))
      })
      .catch(() => {})
  }, [active, cardKey])

  return (
    <div className="flex h-full flex-col bg-slate-100">
      <StepProgress
        step={step}
        onBackToInput={() => setStep('input')}
        onSettings={() => setShowSettings(true)}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {step === 'input' && (
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
