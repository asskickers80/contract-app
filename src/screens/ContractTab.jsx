import { useEffect, useState } from 'react'
import StepProgress from '../components/StepProgress.jsx'
import SettingsSheet from '../components/SettingsSheet.jsx'
import ContractForm from './ContractForm.jsx'
import SignScreen from './SignScreen.jsx'
import { makeEmptyDraft } from '../lib/draft.js'
import { loadCardBoard } from '../lib/boardStore.js'
import { formatBizNo, digitsOnly } from '../lib/format.js'

// [계약] 탭 — 기존 계약서 앱의 2단계 흐름을 탭 하나 안에 단계 전환 방식으로 구현
//   1단계 [입력]: 정보 입력 → 필수 필드 완료 시 [계약서 생성] 활성화
//   2단계 [계약서]: 열람(스크롤 게이트) + 자필 확인 + 성명·서명
// 상단 진행 표시(① 입력 → ② 계약서)에서 2단계 중에도 ①로 돌아가 수정 가능.
// 서명 완료 결과는 App으로 올려보내고 전달·결제 탭이 이어받는다(자동 전환).
export default function ContractTab({ onComplete, cardKey, active }) {
  const [step, setStep] = useState('input') // input | paper
  const [draft, setDraft] = useState(() => makeEmptyDraft())
  const [showSettings, setShowSettings] = useState(false)

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
          businessType: d.businessType?.trim() ? d.businessType : (info.businessType || ''),
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
            onDone={onComplete}
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
