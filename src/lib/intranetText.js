// 전산 화면(프록시가 띄우는 일반 브라우저 화면)의 [읽기]·[캡처] 버튼이 앱으로 넘겨 둔 것을 확인한다.
// 같은 출처라 localStorage로 주고받는다. 본문 수집 규칙은 api/proxy.js 주입 스크립트 한 곳에만 있다.
const PENDING_KEY = 'contract.intranetPending' // { text, url, ts } — 읽기
const CAPTURE_KEY = 'contract.captureImage'    // { image, ts } — 전산 화면을 바로 캡처한 이미지
const FRESH_MS = 10 * 60 * 1000

function peek(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const v = JSON.parse(raw)
    const ts = typeof v === 'object' && v ? v.ts : Number(v)
    return Date.now() - (ts || 0) <= FRESH_MS ? v : null
  } catch {
    return null
  }
}

function take(key) {
  const v = peek(key)
  try { localStorage.removeItem(key) } catch { /* 무시 */ }
  return v
}

export const takeIntranetPending = () => {
  const p = take(PENDING_KEY)
  return p?.text ? p : null
}
export const hasIntranetPending = () => !!peek(PENDING_KEY)?.text
export const takeCaptureImage = () => {
  const c = take(CAPTURE_KEY)
  return c?.image || null
}
export const hasCaptureImage = () => !!peek(CAPTURE_KEY)?.image
