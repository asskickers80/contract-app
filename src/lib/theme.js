// 라이트/다크 테마 — <html data-theme> 스왑 + localStorage 영속화 (기본 라이트)
const KEY = 'theme'

export function getTheme() {
  return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
}

export function setTheme(t) {
  document.documentElement.dataset.theme = t
  try { localStorage.setItem(KEY, t) } catch { /* 저장 실패해도 화면 전환은 유지 */ }
}
