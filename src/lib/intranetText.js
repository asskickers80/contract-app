// 회사 전산 페이지 읽기 보조 — 옛 전산은 frameset/중첩 iframe 구조라 최상위 body에는 글자가 없다.
// 모든 하위 프레임(같은 출처)의 본문을 재귀로 모아서 읽는다.
const MAX_DEPTH = 5

export function collectPageText(doc, depth = 0) {
  if (!doc) return ''
  let text = ''
  try { text = doc.body?.innerText || '' } catch { /* 접근 불가 */ }
  if (depth < MAX_DEPTH) {
    let frames = []
    try { frames = [...doc.querySelectorAll('iframe,frame')] } catch { /* 무시 */ }
    for (const f of frames) {
      try {
        const d = f.contentDocument
        if (d) text += '\n' + collectPageText(d, depth + 1)
      } catch { /* 다른 출처 프레임은 건너뜀 */ }
    }
  }
  return text
}

// 화면 이미지로 만들 대상 문서 — frameset이면 글자가 가장 많은 프레임(본문 프레임)을 고른다
export function pickCaptureDoc(doc, depth = 0) {
  if (!doc) return doc
  let best = { doc, len: 0 }
  try { best.len = (doc.body?.innerText || '').trim().length } catch { /* 무시 */ }
  if (depth >= MAX_DEPTH) return best.doc
  let frames = []
  try { frames = [...doc.querySelectorAll('iframe,frame')] } catch { /* 무시 */ }
  for (const f of frames) {
    try {
      const d = f.contentDocument
      if (!d) continue
      const cand = pickCaptureDoc(d, depth + 1)
      const len = (cand.body?.innerText || '').trim().length
      if (len > best.len) best = { doc: cand, len }
    } catch { /* 무시 */ }
  }
  return best.doc
}

// 새 창(앱 밖)에서 [이 매물 읽기]를 눌러 넘겨 둔 본문 — 앱이 열리면 이어서 처리한다
export const INTRANET_PENDING_KEY = 'contract.intranetPending'

export function takeIntranetPending() {
  try {
    const raw = localStorage.getItem(INTRANET_PENDING_KEY)
    if (!raw) return null
    localStorage.removeItem(INTRANET_PENDING_KEY)
    const p = JSON.parse(raw)
    if (!p?.text || Date.now() - (p.ts || 0) > 10 * 60 * 1000) return null
    return p
  } catch {
    return null
  }
}

export function hasIntranetPending() {
  try {
    const p = JSON.parse(localStorage.getItem(INTRANET_PENDING_KEY) || 'null')
    return !!(p?.text && Date.now() - (p.ts || 0) <= 10 * 60 * 1000)
  } catch {
    return false
  }
}
