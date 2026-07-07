import { useRef, useEffect, useState, useCallback } from 'react';
import { useContract } from '../context/ContractContext';
import { formatCurrency } from '../lib/utils';

const W = 855;
const H = 1268;
const FONT = '"Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return;
  const chars = text.split('');
  let line = '';
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = ch;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

export default function Step2Sign({ onNext, onBack }) {
  const { data, update } = useContract();
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const w = Math.min(window.innerWidth, 855);
    setScale(w / W);
  }, []);

  const drawBase = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    ctx.fillStyle = '#111';

    const today = new Date();

    // ── 매물 표시 표 ──
    ctx.font = `bold 15px ${FONT}`;
    if (data.storeName)    ctx.fillText(data.storeName,    153, 163);
    if (data.businessType) ctx.fillText(data.businessType, 414, 163);
    if (data.bizNumber)    ctx.fillText(data.bizNumber,    659, 163);
    drawWrappedText(ctx, data.address, 154, 194, 480, 16);
    ctx.fillText('김태우', 660, 194);

    // ── 제1조 광고조건 표 ──
    ctx.font = `bold 15px ${FONT}`;
    const productShort = data.productName ? data.productName.replace('광고', '') : '';
    if (productShort)      ctx.fillText(productShort,                        92, 362);
    if (data.adFee)        ctx.fillText(formatCurrency(data.adFee),         204, 362);
    if (data.vat)          ctx.fillText(formatCurrency(data.vat),           298, 362);
    if (data.totalFee)     ctx.fillText(formatCurrency(data.totalFee),      383, 362);
    if (data.startDate) {
      const [sy, sm, sd] = data.startDate.split('-');
      ctx.fillText(sy,            472, 362);
      ctx.fillText(parseInt(sm),  524, 362);
      ctx.fillText(parseInt(sd),  550, 362);
    }
    if (data.endDate) {
      const [ey, em, ed] = data.endDate.split('-');
      ctx.fillText(ey,            576, 362);
      ctx.fillText(parseInt(em),  621, 362);
      ctx.fillText(parseInt(ed),  654, 362);
    }

    // ── 계약일 (연도 고정 26, 월·일 오늘 날짜) ──
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillText('26',                          606, 1153);
    ctx.fillText(String(today.getMonth() + 1),  662, 1153);
    ctx.fillText(String(today.getDate()),        711, 1153);
  }, [data]);

  useEffect(() => {
    const img = new Image();
    img.src = '/contract-bg.jpg';
    img.onload = () => {
      imgRef.current = img;
      drawBase();
      setReady(true);
    };
  }, [drawBase]);

  // pointer 좌표 → canvas 좌표 변환
  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = W / rect.width;
    const sy = H / rect.height;
    const src = e.touches?.[0] || e;
    return {
      x: (src.clientX - rect.left) * sx,
      y: (src.clientY - rect.top)  * sy,
    };
  }

  function onPointerDown(e) {
    // 손가락(touch)은 스크롤, pen·mouse만 그리기
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function onPointerMove(e) {
    if (!isDrawing) return;
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth   = 1.8;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function onPointerUp(e) {
    if (e.pointerType === 'touch') return;
    setIsDrawing(false);
  }

  function handleClear() {
    drawBase();
  }

  function handleDone() {
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const signedAt = new Date().toISOString();
    update({ canvasDataUrl: dataUrl, signedAt });
    onNext();
  }

  return (
    <div className="flex flex-col min-h-svh bg-gray-900">
      <header className="bg-gray-900 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 border-b border-gray-700">
        <button type="button" onClick={onBack} className="text-gray-300 text-sm px-2 py-1">← 뒤로</button>
        <div className="flex-1">
          <p className="text-white font-medium text-sm">고객 서명</p>
          <p className="text-gray-400 text-xs">펜슬로 자필확인란·서명란에 직접 작성하세요</p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-yellow-400 text-sm px-2 py-1"
        >
          전체 지우기
        </button>
      </header>

      {/* 계약서 canvas (손가락=스크롤, 펜슬=그리기) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{
            display: 'block',
            width: `${W * scale}px`,
            height: `${H * scale}px`,
            touchAction: 'pan-y', // 손가락 세로 스크롤 허용
            cursor: 'crosshair',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <div className="h-4" />
      </div>

      <div className="bg-gray-900 border-t border-gray-700 px-4 py-4">
        <button
          type="button"
          onClick={handleDone}
          disabled={!ready}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition ${
            ready ? 'bg-blue-600 text-white active:bg-blue-700' : 'bg-gray-600 text-gray-400'
          }`}
        >
          서명 완료
        </button>
      </div>
    </div>
  );
}
