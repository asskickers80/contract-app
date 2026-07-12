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
