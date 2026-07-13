import { useEffect, useState } from 'react'
import { FORM_IMAGE, RECTS, FORM_RATIO } from '../data/formLayout.js'
import { buildTextOverlay } from '../lib/pdf.js'
import { toDateInputValue } from '../lib/format.js'

// 원본 계약서 이미지를 그대로 보여주고, 입력값만 제자리에 얹는다. (미리보기·고객 열람 공용)
//
// ⚠ 글자 오버레이는 PDF와 완전히 같은 캔버스 함수(buildTextOverlay)로 그린다.
//   → 화면 미리보기와 실제 PDF의 글자 위치가 구조적으로 100% 일치 (2026-07-13 대표님 검수 반영).
//   확정 좌표는 formLayout.js에 있고 여기서는 좌표를 일절 다루지 않는다.
const IMG_W = 1080 // 원본 스캔 크기 기준 (formLayout 좌표 측정 기준과 동일)
const IMG_H = Math.round(IMG_W * FORM_RATIO)

export default function ContractPaper({ contract }) {
  const c = contract
  const [overlay, setOverlay] = useState(null)

  useEffect(() => {
    // 서명일은 미리보기에선 오늘 날짜 (PDF 생성 시에도 당일이 들어간다)
    try {
      setOverlay(buildTextOverlay(c, toDateInputValue(new Date()), IMG_W, IMG_H))
    } catch {
      setOverlay(null)
    }
  }, [
    c.storeName, c.businessType, c.bizNo, c.address, c.agentName,
    c.productName, c.fee, c.vat, c.total, c.startDate, c.endDate, c.periodMonths,
    c.customerName,
  ])

  return (
    <div className="relative bg-white" style={{ containerType: 'inline-size' }}>
      <img src={FORM_IMAGE} alt="계약서 원본" className="block w-full select-none" draggable={false} />

      {overlay && (
        <img src={overlay} alt="" draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none" />
      )}

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
