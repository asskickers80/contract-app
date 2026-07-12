import { useEffect, useRef, useState } from 'react'

// 손글씨 노트 (애플 메모장 스타일)
// - 펜슬/마우스로 쓰고, 손가락은 스크롤 전용 (팜 리젝션)
// - 좌표는 논리 공간(1000×1600)에 저장 → 화면 회전/크기 변화에도 비율 유지
const LOGICAL_W = 1000
const LOGICAL_H = 1600
const SCALE = 2 // 렌더링 해상도 배율
const COLORS = [
  '#1f2937', // 검정
  '#6b7280', // 회색
  '#dc2626', // 빨강
  '#ea580c', // 주황
  '#ca8a04', // 노랑(진)
  '#16a34a', // 초록
  '#2563eb', // 파랑
  '#7c3aed', // 보라
]
const SIZES = [2, 3.5, 6]
const ERASE_R = 14 // 지우개 반경(논리 px)

// 시드 고정 난수 — 연필 질감을 다시 그려도 똑같이 재현하기 위해
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0
    let t = Math.imul(a ^ a >>> 15, 1 | a)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

export default function InkPad({ initialStrokes, onCommit }) {
  const canvasRef = useRef(null)
  const scrollRef = useRef(null)
  const touchesRef = useRef(new Map()) // 화면에 닿아 있는 손가락들 (두 손가락 스크롤용)
  const strokesRef = useRef(initialStrokes || [])
  const undoRef = useRef([])
  const activeRef = useRef(null) // 그리는 중인 획
  const modeRef = useRef(null)   // 'draw' | 'erase' | null
  const erasedRef = useRef(false)
  const [color, setColor] = useState(COLORS[0])
  const [size, setSize] = useState(SIZES[1])
  const [tool, setTool] = useState('pen') // 'pen' | 'pencil' | 'eraser'
  const lastDrawTool = useRef('pen') // 지우개에서 색/굵기를 누르면 돌아갈 도구
  const [, bump] = useState(0)

  function pickTool(next) {
    setTool(next)
    if (next !== 'eraser') lastDrawTool.current = next
  }

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width = LOGICAL_W * SCALE
    canvas.height = LOGICAL_H * SCALE
    const ctx = canvas.getContext('2d')
    ctx.scale(SCALE, SCALE)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    redraw()
  }, [])

  function redraw() {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H)
    for (const s of strokesRef.current) drawStroke(ctx, s)
  }

  function drawStroke(ctx, s) {
    const pts = s.points
    if (!pts.length) return
    const rng = mulberry32(s.seed || 1) // 연필 질감 재현용 (획마다 고정)
    if (pts.length === 1) return drawDot(ctx, s, pts[0], rng)
    for (let i = 1; i < pts.length; i++) drawSegment(ctx, s, pts[i - 1], pts[i], rng)
  }

  function drawDot(ctx, s, pt, rng) {
    if (s.tool === 'pencil' && rng) {
      // 점도 입자 스탬프로 — 톡 찍은 연필 자국
      drawPencilSegment(ctx, s, pt, { x: pt.x + 0.6, y: pt.y + 0.6, p: pt.p }, rng)
      return
    }
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, Math.max(0.7, s.size * (pt.p ?? 0.5)), 0, Math.PI * 2)
    ctx.fillStyle = s.color
    ctx.fill()
  }

  function drawSegment(ctx, s, a, b, rng) {
    if (s.tool === 'pencil') return drawPencilSegment(ctx, s, a, b, rng)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.strokeStyle = s.color
    ctx.lineWidth = Math.max(0.7, s.size * ((b.p ?? 0.5) + 0.5))
    ctx.stroke()
  }

  // 연필: 흑연 입자를 경로를 따라 뿌리는 스탬프 방식 — 중심은 진하고 가장자리는
  // 입자가 흩어져 종이에 갈리는 질감이 난다. 필압이 셀수록 진하고 굵게.
  // (시드 고정 난수 → 다시 그려도 동일하게 재현)
  function drawPencilSegment(ctx, s, a, b, rng) {
    const dx = b.x - a.x, dy = b.y - a.y
    const dist = Math.hypot(dx, dy)
    const steps = Math.max(1, Math.ceil(dist / 1.3))
    ctx.fillStyle = s.color
    for (let i = 0; i < steps; i++) {
      const t = (i + 1) / steps
      const p = (a.p ?? 0.5) + ((b.p ?? 0.5) - (a.p ?? 0.5)) * t // 필압 보간
      const w = Math.max(1.2, s.size * (p + 0.5))
      const cx = a.x + dx * t
      const cy = a.y + dy * t
      // 진한 심지 (중심부)
      ctx.globalAlpha = 0.16 + 0.22 * p
      ctx.beginPath()
      ctx.arc(cx + (rng() - 0.5) * 0.4, cy + (rng() - 0.5) * 0.4, w * 0.28, 0, Math.PI * 2)
      ctx.fill()
      // 흩어지는 흑연 입자 (가장자리로 갈수록 성김)
      const grains = 3 + Math.floor(w * 1.6)
      for (let k = 0; k < grains; k++) {
        const r = (rng() + rng() - 1) * w * 0.62 // 중심에 몰리는 분포
        const ang = rng() * Math.PI * 2
        ctx.globalAlpha = (0.05 + 0.14 * p) * (0.4 + rng())
        const sz = 0.45 + rng() * 0.75
        ctx.fillRect(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, sz, sz)
      }
    }
    ctx.globalAlpha = 1
  }

  function pos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width * LOGICAL_W,
      y: (e.clientY - rect.top) / rect.height * LOGICAL_H,
      p: e.pressure || 0.5,
    }
  }

  function commit() {
    onCommit?.(strokesRef.current)
    bump(n => n + 1)
  }

  function pushUndo() {
    undoRef.current.push(strokesRef.current)
    if (undoRef.current.length > 40) undoRef.current.shift()
  }

  function eraseAt(p) {
    const before = strokesRef.current.length
    const r2 = ERASE_R * ERASE_R
    strokesRef.current = strokesRef.current.filter(
      s => !s.points.some(pt => (pt.x - p.x) ** 2 + (pt.y - p.y) ** 2 < r2)
    )
    if (strokesRef.current.length !== before) {
      erasedRef.current = true
      redraw()
    }
  }

  function capture(e) {
    try { canvasRef.current.setPointerCapture(e.pointerId) } catch { /* 캡처 불가 환경 무시 */ }
  }

  function onDown(e) {
    // 손바닥/손가락 하나는 완전히 무시(종이 고정), 두 손가락일 때만 스크롤
    if (e.pointerType === 'touch') {
      capture(e)
      touchesRef.current.set(e.pointerId, { y: e.clientY })
      return
    }
    e.preventDefault()
    capture(e)
    pushUndo()
    if (tool === 'eraser') {
      modeRef.current = 'erase'
      erasedRef.current = false
      eraseAt(pos(e))
    } else {
      modeRef.current = 'draw'
      const seed = (Math.random() * 0xffffffff) | 0
      const stroke = { tool, color, size, seed, points: [pos(e)] }
      stroke._rng = mulberry32(seed) // 실시간 그리기용 (저장 시 제외)
      activeRef.current = stroke
    }
  }

  function onMove(e) {
    if (e.pointerType === 'touch') {
      const t = touchesRef.current.get(e.pointerId)
      if (!t) return
      // 두 손가락 이상일 때만 스크롤 — 손바닥 하나로는 안 움직인다
      if (touchesRef.current.size >= 2 && scrollRef.current) {
        scrollRef.current.scrollTop -= (e.clientY - t.y) / 2 // 손가락 2개 평균만큼 이동
      }
      t.y = e.clientY
      return
    }
    if (!modeRef.current) return
    // coalesced events로 획을 부드럽게 (펜슬 고빈도 입력 반영)
    const events = e.nativeEvent.getCoalescedEvents?.() || [e]
    if (modeRef.current === 'erase') {
      for (const ev of events) eraseAt(pos(ev))
      return
    }
    const stroke = activeRef.current
    if (!stroke) return
    const ctx = canvasRef.current.getContext('2d')
    for (const ev of events) {
      const p = pos(ev)
      drawSegment(ctx, stroke, stroke.points[stroke.points.length - 1], p, stroke._rng)
      stroke.points.push(p)
    }
  }

  function onUp(e) {
    if (e?.pointerType === 'touch') {
      touchesRef.current.delete(e.pointerId)
      return
    }
    const mode = modeRef.current
    modeRef.current = null
    if (mode === 'draw' && activeRef.current) {
      const { _rng, ...stroke } = activeRef.current // 함수는 IndexedDB에 저장 불가 — 제외
      strokesRef.current = [...strokesRef.current, stroke]
      activeRef.current = null
      commit()
    } else if (mode === 'erase') {
      if (erasedRef.current) commit()
      else undoRef.current.pop() // 아무것도 못 지웠으면 스냅샷 취소
    }
  }

  function undo() {
    if (!undoRef.current.length) return
    strokesRef.current = undoRef.current.pop()
    redraw()
    commit()
  }

  function clearAll() {
    if (!strokesRef.current.length) return
    if (!confirm('손글씨를 모두 지울까요?')) return
    pushUndo()
    strokesRef.current = []
    redraw()
    commit()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 도구 막대 (좁은 화면에서는 줄바꿈) */}
      <div className="flex shrink-0 flex-wrap items-center gap-1 bg-card px-3 py-1.5">
        {/* 도구: 펜 / 연필 / 지우개 */}
        <div className="flex rounded-full bg-chip p-[3px]">
          {[['pen', '펜'], ['pencil', '연필'], ['eraser', '지우개']].map(([key, label]) => (
            <button key={key} onClick={() => pickTool(key)}
              className={`rounded-full px-3.5 py-2.5 text-sm font-bold transition-colors duration-150 ${
                tool === key
                  ? key === 'eraser' ? 'bg-danger-container text-on-danger-container' : 'bg-primary-container text-on-primary-container'
                  : 'text-fg-2'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <span className="mx-1.5" />
        {COLORS.map(c => (
          <button key={c} onClick={() => { setColor(c); if (tool === 'eraser') setTool(lastDrawTool.current) }}
            aria-label={`펜 색 ${c}`}
            className="flex h-11 w-9 items-center justify-center">
            <span
              className="h-5 w-5 rounded-full"
              style={{
                backgroundColor: c,
                boxShadow: color === c && tool !== 'eraser' ? `0 0 0 2px var(--card), 0 0 0 3.5px ${c}` : 'inset 0 0 0 1px rgba(0,0,0,.1)',
              }}
            />
          </button>
        ))}
        <span className="mx-1.5" />
        {SIZES.map(s => (
          <button key={s} onClick={() => { setSize(s); if (tool === 'eraser') setTool(lastDrawTool.current) }}
            aria-label={`펜 굵기 ${s}`}
            className="flex h-11 w-10 items-center justify-center">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-150 ${size === s && tool !== 'eraser' ? 'bg-primary-container' : ''}`}>
              <span className="rounded-full bg-fg" style={{ width: s * 2 + 3, height: s * 2 + 3 }} />
            </span>
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={undo} disabled={!undoRef.current.length}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-fg-2 active:bg-chip disabled:opacity-30">
          ↩
        </button>
        <button onClick={clearAll}
          className="flex h-11 items-center justify-center rounded-full px-3 text-[12.5px] font-semibold text-fg-2 active:bg-chip">
          모두 지우기
        </button>
      </div>

      {/* 필기 영역 — 펜슬 필기, 손바닥 무시(종이 고정), 두 손가락 스크롤 */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="block w-full"
          style={{
            touchAction: 'none', // 브라우저 터치 스크롤 차단 — 손바닥에 종이가 밀리지 않게
            backgroundColor: 'var(--note-paper)',
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 38px, var(--note-line) 38px, var(--note-line) 39px)',
            borderTop: '1px solid var(--note-divider)',
          }}
        />
      </div>
    </div>
  )
}
