// 입력·표시 포맷 유틸

// 숫자만 남기기
export function digitsOnly(str) {
  return String(str || '').replace(/\D/g, '')
}

// 사업자등록번호: 숫자 10자리 → 000-00-00000
export function formatBizNo(str) {
  const d = digitsOnly(str).slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`
}

// 금액: 콤마 포맷 (입력 중에도 사용)
export function formatComma(value) {
  const d = digitsOnly(value)
  if (!d) return ''
  return Number(d).toLocaleString('ko-KR')
}

export function parseAmount(value) {
  const d = digitsOnly(value)
  return d ? Number(d) : 0
}

// Date → "2026-07-07" (input[type=date] 값)
export function toDateInputValue(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "2026-07-07" → "2026년 7월 7일"
export function formatKoreanDate(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return ''
  return `${y}년 ${m}월 ${d}일`
}

// 개시일 + n개월 - 1일 = 종료일 (예: 7/7 시작 3개월 → 10/6 종료)
export function addMonths(isoDate, months) {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return ''
  const date = new Date(y, m - 1 + months, d)
  // 말일 보정: 1/31 + 1개월이 3/3으로 넘어가면 2월 말일로 당김
  if (date.getDate() !== d) date.setDate(0)
  date.setDate(date.getDate() - 1)
  return toDateInputValue(date)
}

// 전화번호: 010-0000-0000 자동 하이픈 (10~11자리)
export function formatPhone(str) {
  const d = digitsOnly(str).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

// 파일명: 계약서_{상호}_{YYYYMMDD}.pdf
export function buildPdfFileName(storeName, isoDate) {
  const compact = (isoDate || '').replaceAll('-', '')
  const safeName = String(storeName || '무제').replace(/[\\/:*?"<>|]/g, '').trim() || '무제'
  return `계약서_${safeName}_${compact}.pdf`
}
