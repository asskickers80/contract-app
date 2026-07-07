import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import SigPad from 'signature_pad';

const SignaturePad = forwardRef(function SignaturePad({ width, height, className }, ref) {
  const canvasRef = useRef(null);
  const padRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    padRef.current = new SigPad(canvas, {
      minWidth: 1,
      maxWidth: 3,
      penColor: '#000000',
    });
    return () => padRef.current?.off();
  }, []);

  useImperativeHandle(ref, () => ({
    isEmpty: () => padRef.current?.isEmpty() ?? true,
    toDataURL: (type = 'image/png') => padRef.current?.toDataURL(type) ?? null,
    clear: () => padRef.current?.clear(),
  }));

  return (
    <div className={`relative bg-white border-2 border-dashed border-gray-300 rounded ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="touch-none block"
        style={{ width, height }}
      />
      <button
        type="button"
        onClick={() => padRef.current?.clear()}
        className="absolute top-1 right-1 text-xs text-gray-400 bg-white border border-gray-200 rounded px-2 py-0.5"
      >
        지우기
      </button>
    </div>
  );
});

export default SignaturePad;
