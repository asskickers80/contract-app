// 부드러운 펜 획 렌더러 — 상담 노트(InkPad)와 포스트잇이 공유
// 직선 연결 대신 중점 이차곡선으로 잇고, 필압(굵기)을 잘게 보간해
// 모서리 각짐·굵기 계단 현상 없이 애플 메모장 수준의 획을 만든다 (2026-11-11 대표님 요청)

export function strokeWidth(size, p) {
  return Math.max(0.7, size * ((p ?? 0.5) + 0.5))
}

// 획의 i번째 점이 추가된 구간을 그린다 (실시간·다시 그리기 공용 — 결과 동일)
// 중점 방식: mid(prev,a) → [제어점 a] → mid(a,b) 이차곡선을 잘게 나눠 굵기 보간
export function drawSmoothTail(ctx, pts, i, color, size) {
  const a = pts[i - 1]
  const b = pts[i]
  const prev = pts[i - 2] || a
  const pa = a.p ?? 0.5
  const m1 = { x: (prev.x + a.x) / 2, y: (prev.y + a.y) / 2, p: ((prev.p ?? 0.5) + pa) / 2 }
  const m2 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, p: (pa + (b.p ?? 0.5)) / 2 }
  const dist = Math.hypot(m2.x - m1.x, m2.y - m1.y)
  const steps = Math.min(24, Math.max(1, Math.ceil(dist / 2)))
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  let px = m1.x
  let py = m1.y
  for (let k = 1; k <= steps; k++) {
    const t = k / steps
    const u = 1 - t
    const x = u * u * m1.x + 2 * u * t * a.x + t * t * m2.x
    const y = u * u * m1.y + 2 * u * t * a.y + t * t * m2.y
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(x, y)
    ctx.lineWidth = strokeWidth(size, m1.p + (m2.p - m1.p) * t)
    ctx.stroke()
    px = x
    py = y
  }
}

// 저장된 획 전체 다시 그리기
export function drawSmoothStroke(ctx, pts, color, size) {
  if (!pts || !pts.length) return
  if (pts.length === 1) {
    ctx.beginPath()
    ctx.arc(pts[0].x, pts[0].y, Math.max(0.7, size * (pts[0].p ?? 0.5)), 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    return
  }
  for (let i = 1; i < pts.length; i++) drawSmoothTail(ctx, pts, i, color, size)
}

// 필압 떨림 완화 — 직전 점과 절반씩 섞는다 (저장 시점에 적용해 다시 그려도 동일)
export function smoothPressure(prevP, rawP) {
  return prevP == null ? rawP : prevP * 0.5 + rawP * 0.5
}
