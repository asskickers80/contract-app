import { FORM_IMAGE, POS, RECTS, IMG_PT_WIDTH } from '../data/formLayout.js'
import { toDateInputValue } from '../lib/format.js'

// 원본 계약서 이미지를 그대로 보여주고, 입력값만 제자리에 얹는다. (미리보기·고객 열람 공용)
// 좌표(비율)는 formLayout.js에서 PDF와 공유한다.
// 글자 크기: PDF의 pt 크기를 이미지 폭 대비 비율로 환산 (컨테이너 쿼리 cqw 단위)
const A4_IMG_W = IMG_PT_WIDTH // PDF에서 이미지가 그려지는 폭(pt) — 크기 환산 기준

const won = n => `${Number(n || 0).toLocaleString('ko-KR')}원`
const dotDate = iso => {
  const [y, m, d] = (iso || '').split('-').map(Number)
  return y ? `${y}.  ${m}.  ${d}.` : ''
}

function Overlay({ pos, text }) {
  if (!text) return null
  const cellPatch = typeof pos.patch === 'object' ? pos.patch : null
  const style = {
    position: 'absolute',
    left: `${pos.x * 100}%`,
    top: `${pos.y * 100}%`,
    fontSize: `${(pos.size / A4_IMG_W) * 100}cqw`,
    lineHeight: 1,
    transform: `translateY(-100%)${pos.align === 'center' ? ' translateX(-50%)' : ''}`,
    fontWeight: pos.bold ? 700 : 500,
    letterSpacing: pos.tracking ? `${pos.tracking}em` : undefined,
    color: '#141a59',
    whiteSpace: 'nowrap',
    background: pos.patch && !cellPatch ? 'rgba(255,255,255,0.92)' : 'transparent',
    padding: pos.patch && !cellPatch ? '0.2em 0.3em' : 0,
  }
  return (
    <>
      {cellPatch && (
        <span
          style={{
            position: 'absolute',
            left: `${cellPatch.x0 * 100}%`,
            width: `${(cellPatch.x1 - cellPatch.x0) * 100}%`,
            top: `${pos.y * 100}%`,
            height: `${(pos.size / A4_IMG_W) * 160}cqw`,
            transform: 'translateY(-92%)',
            background: 'rgba(255,255,255,1)',
          }}
        />
      )}
      <span style={style}>{text}</span>
    </>
  )
}

export default function ContractPaper({ contract }) {
  const c = contract
  const today = toDateInputValue(new Date())
  const [ty, tm, td] = today.split('-').map(Number)

  return (
    <div
      className="relative bg-white"
      style={{
        containerType: 'inline-size',
        // 리스킨(Pretendard·자간 -0.01em·tabular-nums) 격리 — PDF 캔버스와 동일한 서체·자간을
        // 유지해야 확정 좌표(formLayout.js)와 화면 미리보기가 계속 일치한다. 수정 금지.
        fontFamily: '-apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
        letterSpacing: 0,
        fontVariantNumeric: 'normal',
      }}
    >
      <img src={FORM_IMAGE} alt="계약서 원본" className="block w-full select-none" draggable={false} />

      <Overlay pos={POS.storeName} text={c.storeName} />
      <Overlay pos={POS.businessType} text={c.businessType} />
      <Overlay pos={POS.bizNo} text={c.bizNo} />
      <Overlay pos={POS.address} text={c.address} />
      <Overlay pos={POS.agentName} text={c.agentName} />

      {c.productName && c.productName !== '광고' && <Overlay pos={POS.productPatch} text={c.productName} />}
      <Overlay pos={POS.fee} text={won(c.fee)} />
      <Overlay pos={POS.vat} text={won(c.vat)} />
      <Overlay pos={POS.total} text={won(c.total)} />
      <Overlay pos={POS.startDate} text={dotDate(c.startDate)} />
      <Overlay pos={POS.endDate} text={dotDate(c.endDate)} />
      {Number(c.periodMonths) !== 3 && <Overlay pos={POS.periodPatch} text={`( ${c.periodMonths} )개월간`} />}

      {/* 서명일 (오늘) */}
      <Overlay pos={POS.signYY} text={String(ty).slice(2)} />
      <Overlay pos={POS.signMM} text={String(tm)} />
      <Overlay pos={POS.signDD} text={String(td)} />

      <Overlay pos={POS.customerName} text={c.customerName} />

      {/* 자필/서명이 들어갈 자리 안내 (화면에서만 표시, PDF에는 실제 손글씨가 들어감) */}
      {!c.customerName && (
        <>
          <GuideBox rect={RECTS.handwriting} label="자필" />
          <GuideBox rect={RECTS.signature} label="서명" />
        </>
      )}
    </div>
  )
}

function GuideBox({ rect, label }) {
  return (
    <span
      className="pointer-events-none absolute flex items-center justify-center rounded border border-dashed border-blue-300 text-blue-300"
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
        fontSize: '1.2cqw',
      }}
    >
      {label}
    </span>
  )
}
