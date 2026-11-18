// 회사 전산 페이지 읽기 — 옛 전산은 ① frameset/중첩 iframe ② 값이 입력칸(input/select/textarea)에 들어 있음
// ③ 상세 정보가 숨겨진 탭 영역에 있음 → innerText만으로는 상호·금액 등 세부 정보가 빠진다.
// DOM을 직접 순회해 화면 글자 + 입력칸 값([값: …]) + 선택칸([선택: …]) + 표 칸 구분(|)을 모으고,
// 숨겨진 영역은 따로 뒤에 붙인다.
// ⚠ api/proxy.js의 앱 밖 새 창 [이 매물 읽기] 주입 스크립트가 같은 규칙으로 구현되어 있다 — 함께 수정할 것.
const MAX_DEPTH = 5
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'LINK', 'META'])
const BLOCK = new Set([
  'DIV', 'P', 'TR', 'LI', 'UL', 'OL', 'TABLE', 'TBODY', 'THEAD', 'TFOOT', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'BR', 'HR', 'SECTION', 'ARTICLE', 'FORM', 'DL', 'DT', 'DD', 'FIELDSET', 'LEGEND', 'CAPTION', 'HEADER', 'FOOTER', 'NAV', 'CENTER',
])
const SKIP_INPUT = new Set(['button', 'submit', 'reset', 'image', 'file', 'password'])

function controlText(el) {
  const tag = el.tagName
  if (tag === 'INPUT') {
    const type = (el.type || 'text').toLowerCase()
    if (SKIP_INPUT.has(type)) return ''
    if (type === 'checkbox' || type === 'radio') {
      return el.checked ? `[선택됨${el.value && el.value !== 'on' ? ': ' + el.value : ''}]` : ''
    }
    const v = (el.value || '').trim()
    if (type === 'hidden') {
      const n = el.name || el.id || ''
      if (!n || v.length > 100 || /view|token|csrf|auth|state/i.test(n)) return ''
      return v ? `[값(${n}): ${v}]` : ''
    }
    return v ? `[값: ${v}]` : ''
  }
  if (tag === 'TEXTAREA') {
    const x = (el.value || '').trim()
    return x ? `[값: ${x}]` : ''
  }
  if (tag === 'SELECT') {
    const o = el.options && el.options[el.selectedIndex]
    const t = o && (o.text || '').trim()
    return t ? `[선택: ${t}]` : ''
  }
  return ''
}

function walk(node, view, visible, bufs, depth) {
  if (node.nodeType === 3) {
    const t = (node.nodeValue || '').replace(/\s+/g, ' ').trim()
    if (t) bufs[visible ? 0 : 1].push(t, ' ')
    return
  }
  if (node.nodeType !== 1) return
  const tag = node.tagName
  if (SKIP.has(tag) || node.id === '__intraRead') return // 프록시가 새 창에 띄우는 읽기 버튼 자신은 제외
  let vis = visible
  if (vis) {
    try {
      const cs = view.getComputedStyle(node)
      if (cs.display === 'none' || cs.visibility === 'hidden') vis = false
    } catch { /* 계산 실패 시 보이는 것으로 */ }
  }
  const buf = bufs[vis ? 0 : 1]
  if (tag === 'IFRAME' || tag === 'FRAME') {
    if (depth < MAX_DEPTH) {
      try {
        const d = node.contentDocument
        if (d && d.body) {
          buf.push('\n')
          walk(d.documentElement, d.defaultView, vis, bufs, depth + 1)
          buf.push('\n')
        }
      } catch { /* 다른 출처 프레임은 건너뜀 */ }
    }
    return
  }
  const ctrl = controlText(node)
  if (ctrl) { buf.push(ctrl, ' '); return }
  if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return
  const block = BLOCK.has(tag)
  if (block) buf.push('\n')
  for (const c of node.childNodes) walk(c, view, vis, bufs, depth)
  if (tag === 'TD' || tag === 'TH') buf.push(' | ')
  if (block) buf.push('\n')
}

const tidy = arr => arr.join('').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

export function collectPageText(doc) {
  if (!doc || !doc.documentElement) return ''
  const bufs = [[], []]
  try { walk(doc.documentElement, doc.defaultView, true, bufs, 0) } catch { /* 일부만 읽혀도 진행 */ }
  const visible = tidy(bufs[0])
  const hidden = tidy(bufs[1]).slice(0, 8000)
  return hidden ? `${visible}\n\n[숨겨진 영역]\n${hidden}` : visible
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
