import { useEffect, useRef, useState } from 'react'

const COLORS = ['#fef3c7', '#fce7f3', '#dcfce7', '#dbeafe']

export default function CaptureBoard({ board, onBoardChange }) {
  const containerRef = useRef(null)
  const dragRef = useRef(null)
  const resizeRef = useRef(null)
  const movedRef = useRef(false) // 드래그로 이동했으면 놓을 때 펼침 클릭 무시
  const [placing, setPlacing] = useState(false)
  const [newNoteId, setNewNoteId] = useState(null)

  const notes = board?.notes || []

  function setNotes(updater) {
    onBoardChange({ ...board, notes: typeof updater === 'function' ? updater(notes) : updater })
  }

  function placeNote(e) {
    if (!placing) return
    // 이미지(배경)를 눌렀을 때만 배치 — 기존 메모 클릭은 제외
    if (e.target.tagName !== 'IMG' && e.target !== containerRef.current) return
    const p = pointerPos(e)
    const id = `n${Date.now()}`
    setNotes(ns => [...ns, {
      id,
      x: Math.min(0.85, Math.max(0, p.x - 0.02)),
      y: Math.min(0.9, Math.max(0, p.y - 0.02)),
      color: COLORS[ns.length % COLORS.length],
      text: '',
      strokes: [],
      mode: 'draw', // 아이패드 펜슬 우선 — 손글씨 모드로 시작
    }])
    setNewNoteId(id)
    setPlacing(false)
  }

  function pointerPos(e) {
    const rect = containerRef.current.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
  }

  function startDrag(e, note) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    movedRef.current = false
    const p = pointerPos(e)
    dragRef.current = { id: note.id, dx: p.x - note.x, dy: p.y - note.y, sx: p.x, sy: p.y }
  }

  function startResize(e, note) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const rect = containerRef.current.getBoundingClientRect()
    resizeRef.current = {
      id: note.id, startX: e.clientX, startY: e.clientY,
      w: note.w ?? 0.42, h: note.h ?? 120, cw: rect.width,
    }
  }

  function onDrag(e) {
    const r = resizeRef.current
    if (r) {
      const w = Math.min(0.9, Math.max(0.15, r.w + (e.clientX - r.startX) / r.cw))
      const h = Math.min(400, Math.max(60, r.h + (e.clientY - r.startY)))
      setNotes(ns => ns.map(n => n.id === r.id ? { ...n, w, h } : n))
      return
    }
    const d = dragRef.current
    if (!d) return
    const p = pointerPos(e)
    if (Math.abs(p.x - d.sx) + Math.abs(p.y - d.sy) > 0.01) movedRef.current = true
    setNotes(ns => ns.map(n => n.id === d.id
      ? { ...n, x: Math.min(0.85, Math.max(0, p.x - d.dx)), y: Math.min(0.9, Math.max(0, p.y - d.dy)) }
      : n
    ))
  }

  if (!board?.image) return null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 pb-2">
        <button
          onClick={() => setPlacing(p => !p)}
          className={`h-10 rounded-xl px-4 text-sm font-bold shadow-sm ${
            placing
              ? 'bg-amber-600 text-white active:bg-amber-700'
              : 'bg-amber-400 text-amber-950 active:bg-amber-500'
          }`}
        >
          {placing ? '위치 선택 중… (취소)' : '+ 메모 붙이기'}
        </button>
        <span className="min-w-0 flex-1 truncate text-right text-[11px] text-gray-300">
          {placing
            ? '이미지에서 원하는 위치를 눌러 주세요'
            : `${board.capturedAt ? `캡처: ${new Date(board.capturedAt).toLocaleString('ko-KR')} · ` : ''}메모를 누르면 펼쳐져요 · 드래그로 이동, 모서리로 크기 조절`}
        </span>
      </div>

      <div
        ref={containerRef}
        className={`relative min-h-0 flex-1 touch-none select-none overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm ${placing ? 'cursor-crosshair' : ''}`}
        onClick={placeNote}
        onPointerMove={onDrag}
        onPointerUp={() => { dragRef.current = null; resizeRef.current = null }}
        onPointerCancel={() => { dragRef.current = null; resizeRef.current = null }}
      >
        <img src={board.image} alt="캡처된 화면" className="h-full w-full object-contain" draggable={false} />

        {notes.map(note => (
          <PostItNote
            key={note.id}
            note={note}
            defaultExpanded={note.id === newNoteId}
            wasDragged={() => movedRef.current}
            onUpdate={updated => setNotes(ns => ns.map(n => n.id === note.id ? updated : n))}
            onDelete={() => setNotes(ns => ns.filter(n => n.id !== note.id))}
            onDragStart={e => startDrag(e, note)}
            onResizeStart={e => startResize(e, note)}
          />
        ))}
      </div>
    </div>
  )
}

// ── 포스트잇 ────────────────────────────────────────────────────
function PostItNote({ note, defaultExpanded, wasDragged, onUpdate, onDelete, onDragStart, onResizeStart }) {
  const [expanded, setExpanded] = useState(!!defaultExpanded)
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
  }, [note.mode, expanded, note.w, note.h])

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
        className="absolute cursor-pointer touch-none rounded-lg px-3 py-2.5 shadow-md"
        style={{
          left: `${note.x * 100}%`, top: `${note.y * 100}%`,
          backgroundColor: note.color, maxWidth: 200, transform: 'rotate(-0.5deg)',
        }}
        onPointerDown={onDragStart}
        onClick={() => { if (!wasDragged?.()) setExpanded(true) }}
      >
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate text-sm font-medium text-gray-700">{preview}</span>
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="-m-2 p-2 text-sm text-black/30 active:text-black/70"
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
        backgroundColor: note.color, width: `${(note.w ?? 0.42) * 100}%`, minWidth: 230,
        transform: 'rotate(-0.5deg)',
      }}
    >
      {/* 헤더 (드래그 영역) */}
      <div
        className="flex cursor-grab touch-none items-center gap-1 px-2 pt-1.5 pb-0.5 active:cursor-grabbing"
        onPointerDown={onDragStart}
      >
        <span className="flex-1 text-sm text-black/30">≡</span>
        {/* 모드 선택: 손글씨 / 텍스트 */}
        <div className="flex overflow-hidden rounded-lg bg-black/5" onPointerDown={e => e.stopPropagation()}>
          <button
            onClick={() => onUpdate({ ...note, mode: 'draw' })}
            title="손글씨"
            className={`flex h-11 w-11 items-center justify-center text-lg ${
              note.mode === 'draw' ? 'bg-black/15 text-black/80' : 'text-black/35'
            }`}
          >✏</button>
          <button
            onClick={() => onUpdate({ ...note, mode: 'text' })}
            title="키보드 입력"
            className={`flex h-11 w-11 items-center justify-center text-lg font-bold ${
              note.mode !== 'draw' ? 'bg-black/15 text-black/80' : 'text-black/35'
            }`}
          >T</button>
        </div>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setExpanded(false)}
          title="접기"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-black/40 active:bg-black/10 active:text-black/70"
        >−</button>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={onDelete}
          title="삭제"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-lg text-black/40 active:bg-black/10 active:text-black/70"
        >✕</button>
      </div>

      {/* 내용 영역 */}
      {note.mode === 'draw' ? (
        <div className="px-2 pb-2">
          <canvas
            ref={canvasRef}
            className="block w-full rounded bg-white/50"
            style={{ height: note.h ?? 120, touchAction: 'none' }}
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerUp}
          />
          {(note.strokes || []).length > 0 && (
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={clearCanvas}
              className="-mx-1.5 mt-0.5 rounded-lg px-3 py-2 text-sm text-black/40 active:bg-black/10 active:text-black/70"
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
          style={{ height: note.h ?? 120 }}
          className="block w-full resize-none bg-transparent px-2 pb-2 text-base leading-snug text-gray-900 focus:outline-none"
          placeholder="메모 입력…"
        />
      )}

      {/* 크기 조절 핸들 */}
      <div
        onPointerDown={onResizeStart}
        className="absolute -bottom-2 -right-2 flex h-11 w-11 touch-none cursor-nwse-resize items-end justify-end p-1.5 text-xl leading-none text-black/30 active:text-black/70"
      >◢</div>
    </div>
  )
}
