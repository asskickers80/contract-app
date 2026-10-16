import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

// 계약서 설명용 펜 레이어 — 고객에게 설명하며 본문 위에 밑줄·동그라미를 긋는다.
// 화면 설명 전용: 저장되는 계약서 PDF에는 절대 포함되지 않는다 (2026-10-16 대표님 지시).
// 펜 켬: Apple Pencil·마우스만 그려지고 손바닥(터치)은 무시. 펜 끄면 그대로 보이며 스크롤 가능.
const PaperInk = forwardRef(function PaperInk({ penOn, children }, ref) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const strokesRef = useRef([]) // 비율 좌표 [{points:[{x,y}]}]
  const activeRef = useRef(null)

  function redraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#dc2626' // 설명용 빨간 펜
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2, canvas.width / 450)
    for (const s of strokesRef.current) {
      if (s.points.length < 2) continue
      ctx.beginPath()
      ctx.moveTo(s.points[0].x * canvas.width, s.points[0].y * canvas.height)
      for (const p of s.points.slice(1)) ctx.lineTo(p.x * canvas.width, p.y * canvas.height)
      ctx.stroke()
    }
  }

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = Math.round(wrap.clientWidth * ratio)
      canvas.height = Math.round(wrap.clientHeight * ratio)
      redraw()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  function pos(e) {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  function down(e) {
    if (e.pointerType === 'touch') return // 손바닥·손가락 무시 (팜 리젝션)
    e.preventDefault()
    canvasRef.current.setPointerCapture(e.pointerId)
    activeRef.current = { points: [pos(e)] }
    strokesRef.current.push(activeRef.current)
  }
  function move(e) {
    if (!activeRef.current) return
    e.preventDefault()
    activeRef.current.points.push(pos(e))
    redraw()
  }
  function up() {
    activeRef.current = null
  }

  useImperativeHandle(ref, () => ({
    undo: () => { strokesRef.current.pop(); redraw() },
    clear: () => { strokesRef.current = []; redraw() },
    isEmpty: () => strokesRef.current.length === 0,
  }))

  return (
    <div ref={wrapRef} className="relative">
      {children}
      <canvas
        ref={canvasRef}
        onPointerDown={penOn ? down : undefined}
        onPointerMove={penOn ? move : undefined}
        onPointerUp={penOn ? up : undefined}
        onPointerCancel={penOn ? up : undefined}
        className={`absolute inset-0 h-full w-full ${penOn ? 'touch-none' : 'pointer-events-none'}`}
      />
    </div>
  )
})

export default PaperInk
