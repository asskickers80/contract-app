// 계약 작성 데이터(draft) 생성·검증 — App(탭 활성 판단)과 작성 화면이 공유
import { digitsOnly, toDateInputValue, addMonths } from './format.js'

export const AGENT_KEY = 'contract.agentName'

export function makeEmptyDraft() {
  const today = toDateInputValue(new Date())
  return {
    storeName: '',
    businessType: '',
    bizNo: '',
    address: '',
    agentName: '김태우', // 담당 에이전트 고정 (2026-07-12 대표님 지시)
    productName: '광고',
    productKey: null,
    fee: 0,
    vat: 0,
    total: 0,
    startDate: today,
    periodMonths: 3,
    endDate: addMonths(today, 3),
    customerName: '',
  }
}

// 부족한 항목 이름 배열 반환 (빈 배열 = 서명 진행 가능)
export function validateDraft(d) {
  if (!d) return ['작성 정보 없음']
  const missing = []
  if (!d.storeName?.trim()) missing.push('상호')
  if (!d.businessType?.trim()) missing.push('업종')
  if (digitsOnly(d.bizNo).length !== 10) missing.push('사업자등록번호(10자리)')
  if (!d.address?.trim()) missing.push('소재지')
  if (!d.agentName?.trim()) missing.push('담당 에이전트')
  if (!d.total) missing.push('광고 상품(금액)')
  return missing
}
