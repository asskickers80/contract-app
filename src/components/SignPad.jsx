import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import SignaturePad from 'signature_pad'

// signature_pad 래퍼 — 터치/Apple Pencil 지원, ref로 clear/isEmpty/toDataURL 제공
const SignPad = forwardRef(function SignPad({ height = 160, disabled = false, onChange }, ref) {
  const canvasRef = useRef(null)
  const padRef = useRef(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const canvas = canvasRef.current
    const pad = new SignaturePad(canvas, {
      penColor: '#111827',
      minWidth: 1,
      maxWidth: 2.5,
    })
    padRef.current = pad

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const data = pad.toData()
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d').scale(ratio, ratio)
      pad.fromData(data)
    }
    resize()
    window.addEventListener('resize', resize)
    pad.addEventListener('endStroke', () => onChangeRef.current?.(!pad.isEmpty()))

    return () => {
      window.removeEventListener('resize', resize)
      pad.off()
    }
  }, [])

  useEffect(() => {
    if (!padRef.current) return
    if (disabled) padRef.current.off()
    else padRef.current.on()
  }, [disabled])

  useImperativeHandle(ref, () => ({
    clear: () => {
      padRef.current?.clear()
      onChangeRef.current?.(false)
    },
    isEmpty: () => padRef.current?.isEmpty() ?? true,
    // 배경 투명 PNG로 추출 → PDF에 그대로 합성
    toDataURL: () => (padRef.current && !padRef.current.isEmpty() ? padRef.current.toDataURL('image/png') : null),
  }))

  return (
    <canvas
      ref={canvasRef}
      className={`w-full touch-none rounded-xl border-2 border-dashed ${disabled ? 'border-gray-200 bg-gray-50' : 'border-blue-300 bg-white'}`}
      style={{ height }}
    />
  )
})

export default SignPad
