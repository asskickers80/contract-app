// 인트라넷(HTTP, 비보안 컨텍스트) 호환 유틸
// http://192.168.x.x 접속 시 crypto.subtle / crypto.randomUUID가 없어서 폴백이 필요하다.
// (모두앱의 device_id UUID 폴백과 같은 이유)

// SHA-256 (보안 컨텍스트) → FNV-1a 반복 해시 (폴백)
export async function hashText(text) {
  if (crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return 'sha256:' + Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  // 폴백: FNV-1a 32bit를 시드를 바꿔 4회 — PIN 잠금 용도로 충분
  let out = ''
  for (let seed = 0; seed < 4; seed++) {
    let h = (0x811c9dc5 ^ seed) >>> 0
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    out += h.toString(16).padStart(8, '0')
  }
  return 'fnv:' + out
}

// UUID v4 (보안 컨텍스트) → getRandomValues 기반 폴백
export function genId() {
  if (crypto?.randomUUID) return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
