import { useEffect, useRef, useState } from 'react'

const COLORS = ['#fef3c7', '#fce7f3', '#dcfce7', '#dbeafe']

export default function CaptureBoard({ board, onBoardChange }) {
  const containerRef = useRef(null)
  const dragRef = useRef(null)

  const notes = board?.notes || []

  function setNotes(updater) {
    onBoardChange({ ...board, notes: typeof updater === 'function' ? updater(notes) : updater })
  }

  function addNote() {
    const id = `n${Date.now()}`
    setNotes(ns => [...ns, {
      id,
      x: 0.05 + (ns.length % 4) * 0.04,
      y: 0.05 + (ns.length % 4) * 0.04,
      color: COLORS[ns.length % COLORS.length],
      text: '',
      strokes: [],
      mode: 'text',
    }])
  }

  function pointerPos(e) {
    const rect = containerRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
  }

  function startDrag(e, note) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const p = pointerPos(e)
    dragRef.current = { id: note.id, dx: p.x - note.x, dy: p.y - note.y }
  }

  function onDrag(e) {
    const d = dragRef.current
    if (!d) return
    const p = pointerPos(e)
    setNotes(ns => ns.map(n => n.id === d.id
      ? { ...n, x: Math.min(0.85, Math.max(0, p.x - d.dx)), y: Math.min(0.9, Math.max(0, p.y - d.dy)) }
      : n
    ))
  }

  if (!board?.image) return null

  return (
    <div>
      <div className="flex items-center gap-2 pb-2">
        <button
          onClick={addNote}
          className="h-10 rounded-xl bg-amber-400 px-4 text-sm font-bold text-amber-950 shadow-sm active:bg-amber-500"
        >
          + 메모 붙이기
        </button>
        <span className="min-w-0 flex-1 truncate text-right text-[11px] text-gray-300">
          {board.capturedAt ? `캡처: ${new Date(board.capturedAt).toLocaleString('ko-KR')}` : ''}
          {' · '}헤더 드래그, 접기(−)로 축소
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative select-none overflow-hidden rounded-xl border border-gray-200 shadow-sm"
        onPointerMove={onDrag}
        onPointerUp={() => { dragRef.current = null }}
        onPointerCancel={() => { dragRef.current = null }}
      >
        <img src={board.image} alt="캡처된 화면" className="block w-full" draggable={false} />

        {notes.map(note => (
          <PostItNote
            key={note.id}
            note={note}
            onUpdate={updated => setNotes(ns => ns.map(n => n.id === note.id ? updated : n))}
            onDelete={() => setNotes(ns => ns.filter(n => n.id !== note.id))}
            onDragStart={e => startDrag(e, note)}
          />
        ))}
      </div>
    </div>
  )
}

// ── 포스트잇 ────────────────────────────────────────────────────
function PostItNote({ note, onUpdate, onDelete, onDragStart }) {
  const [expanded, setExpanded] = useState(true)
  const canvasRef = useRef(null)
  const activeStroke = useRef(null)

  // 캔버스 초기화 + 저장된 획 복원
  useEffect(() => {
    if (note.mode !== 'draw' || !expanded) return
    const canvas = canvasRef.current
    if (!canvas) return
    const raf = requestAnimationFrame(() => {
      const rect = canvas.getBoundingClientRect()
      if (!rect.width) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ;(note.strokes || []).forEach(s => redrawStroke(ctx, s, rect.width, rect.height))
    })
    return () => cancelAnimationFrame(raf)
  }, [note.mode, expanded])

  function redrawStroke(ctx, stroke, w, h) {
    if (!stroke || stroke.length < 2) return
    ctx.beginPath()
    stroke.forEach((pt, i) => {
      const x = pt.x * w, y = pt.y * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  function onCanvasPointerDown(e) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    activeStroke.current = [{
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      p: e.pressure || 0.5,
    }]
  }

  function onCanvasPointerMove(e) {
    if (!activeStroke.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const cssX = e.clientX - rect.left
    const cssY = e.clientY - rect.top
    const prev = activeStroke.current[activeStroke.current.length - 1]
    activeStroke.current.push({ x: cssX / rect.width, y: cssY / rect.height, p: e.pressure || 0.5 })

    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(prev.x * rect.width, prev.y * rect.height)
    ctx.lineTo(cssX, cssY)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = Math.max(0.8, (e.pressure || 0.5) * 3.5)
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  function onCanvasPointerUp() {
    const stroke = activeStroke.current
    activeStroke.current = null
    if (!stroke || stroke.length < 2) return
    onUpdate({ ...note, strokes: [...(note.strokes || []), stroke] })
  }

  function clearCanvas() {
    onUpdate({ ...note, strokes: [] })
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }

  // ── 접힌 상태 ─────────────────────────────────────────────
  if (!expanded) {
    const preview = note.mode === 'draw' && (note.strokes || []).length > 0
      ? `✏ ${note.strokes.length}획`
      : (note.text?.slice(0, 18) || '빈 메모')
    return (
      <div
        className="absolute cursor-pointer rounded px-2 py-1 shadow-md"
        style={{
          left: `${note.x * 100}%`, top: `${note.y * 100}%`,
          backgroundColor: note.color, maxWidth: 120, transform: 'rotate(-0.5deg)',
        }}
        onPointerDown={onDragStart}
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center gap-1">
          <span className="flex-1 truncate text-xs text-gray-700">{preview}</span>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="text-[10px] text-black/30 active:text-black/70"
          >✕</button>
        </div>
      </div>
    )
  }

  // ── 펼친 상태 ─────────────────────────────────────────────
  return (
    <div
      className="absolute rounded-sm shadow-lg"
      style={{
        left: `${note.x * 100}%`, top: `${note.y * 100}%`,
        backgroundColor: note.color, width: '42%', minWidth: 140,
        transform: 'rotate(-0.5deg)',
      }}
    >
      {/* 헤더 (드래그 영역) */}
      <div
        className="flex cursor-grab items-center gap-0.5 px-2 pt-1.5 pb-0.5 active:cursor-grabbing"
        onPointerDown={onDragStart}
      >
        <span className="flex-1 text-[10px] text-black/30">≡</span>
        {/* 모드 토글: 손글씨 ↔ 텍스트 */}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onUpdate({ ...note, mode: note.mode === 'draw' ? 'text' : 'draw' })}
          title={note.mode === 'draw' ? '키보드 전환' : '손글씨 전환'}
          className={`rounded px-1.5 py-0.5 text-[11px] font-bold transition-colors ${
            note.mode === 'draw' ? 'bg-black/10 text-black/70' : 'text-black/30'
          }`}
        >
          {note.mode === 'draw' ? '✏' : 'T'}
        </button>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setExpanded(false)}
          className="px-1 text-[11px] text-black/30 active:text-black/70"
        >−</button>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={onDelete}
          className="px-1 text-[11px] text-black/30 active:text-black/70"
        >✕</button>
      </div>

      {/* 내용 영역 */}
      {note.mode === 'draw' ? (
        <div className="px-2 pb-2">
          <canvas
            ref={canvasRef}
            className="block w-full rounded bg-white/50"
            style={{ height: 120, touchAction: 'none' }}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerUp}
          />
          {(note.strokes || []).length > 0 && (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={clearCanvas}
              className="mt-0.5 text-[10px] text-black/30 active:text-black/60"
            >
              모두 지우기
            </button>
          )}
        </div>
      ) : (
        <textarea
          key={`${note.id}-text`}
          defaultValue={note.text}
          onPointerDown={e => e.stopPropagation()}
          onBlur={e => onUpdate({ ...note, text: e.target.value })}
          rows={4}
          className="block w-full resize-none bg-transparent px-2 pb-2 text-sm leading-snug text-gray-900 focus:outline-none"
          placeholder="메모 입력…"
        />
      )}
    </div>
  )
}
