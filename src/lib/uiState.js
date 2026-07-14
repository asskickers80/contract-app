// 화면 위치·작성 중 입력을 localStorage에 보관 — 새로고침해도 하던 자리로 복원
const NS = 'contract.ui.'

export function loadUi(key, fallback = null) {
  try {
    const raw = localStorage.getItem(NS + key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function saveUi(key, value) {
  try {
    if (value == null) localStorage.removeItem(NS + key)
    else localStorage.setItem(NS + key, JSON.stringify(value))
  } catch {
    // 저장 실패(용량 초과 등)해도 앱 동작에는 지장 없음
  }
}

// 앱을 "새로 켠" 실행인지 (스플래시가 뜨는 실행) — 모듈 로드 시점에 판정해야 정확하다.
// 새 실행: 매물카드 첫 화면에서 시작 / 사용 중 새로고침: 보던 자리 복원 (2026-07-14 대표님 지시)
export const FRESH_LAUNCH = typeof sessionStorage !== 'undefined'
  && sessionStorage.getItem('contract.splashDone') !== '1'
