// 오래 걸릴 수 있는 요청(AI 호출 등)에 시간 제한 — 멈춘 것처럼 보이는 무한 대기 방지
export async function fetchWithTimeout(url, opts = {}, ms = 75_000) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), ms)
  try {
    return await fetch(url, { ...opts, signal: ac.signal })
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('응답 지연 — 잠시 후 다시 시도해 주세요')
    throw err
  } finally {
    clearTimeout(t)
  }
}
