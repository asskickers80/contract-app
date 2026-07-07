import { forwardRef } from 'react';
import { toShortDate, formatCurrency } from '../lib/utils';

/**
 * 계약서 원본 이미지(855×1268)를 배경으로 각 필드를 절대 위치로 오버레이.
 * html2canvas 캡처 → PDF 생성에 사용.
 *
 * 좌표 기준: 이미지 픽셀(top-left origin).
 * writingSlot / signatureSlot: 서명 canvas 주입 (Step2)
 * writingDataUrl / signatureDataUrl: 완성된 서명 이미지 (PDF용)
 */
const ContractTemplate = forwardRef(function ContractTemplate(
  { data, writingSlot, signatureSlot, writingDataUrl, signatureDataUrl },
  ref,
) {
  const F = {
    base: '12px',
    sm: '11px',
    xs: '10px',
    date: '9.5px',
  };
  const FONT = "Malgun Gothic, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

  const T = (top, left, value, style = {}) =>
    value ? (
      <div
        style={{
          position: 'absolute',
          top,
          left,
          fontSize: F.base,
          fontFamily: FONT,
          color: '#111',
          lineHeight: 1,
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        {value}
      </div>
    ) : null;

  const {
    storeName, businessType, bizNumber, address, agentName,
    adFee, vat, totalFee, startDate, endDate,
    clientName, signedAt,
  } = data;

  const startShort = toShortDate(startDate);
  const endShort   = toShortDate(endDate);

  let signYear = '', signMonth = '', signDay = '';
  if (signedAt) {
    const d = new Date(signedAt);
    signYear  = String(d.getFullYear());
    signMonth = String(d.getMonth() + 1);
    signDay   = String(d.getDate());
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: '855px',
        height: '1268px',
        overflow: 'hidden',
        backgroundColor: '#fff',
        flexShrink: 0,
      }}
    >
      {/* 계약서 원본 배경 */}
      <img
        src="/contract-bg.jpg"
        alt=""
        style={{ position: 'absolute', top: 0, left: 0, width: '855px', height: '1268px', display: 'block' }}
        crossOrigin="anonymous"
      />

      {/* ── 매물 표시 표 ── */}
      {/* 행1: 상호(x=65~285) / 업종(x=340~457) / 사번(x=611~843) */}
      {T(157, 68,  storeName,     { fontSize: F.sm })}
      {T(157, 345, businessType,  { fontSize: F.sm })}
      {T(157, 614, bizNumber,     { fontSize: F.sm })}

      {/* 행2: 소재지(x=65~457) / 담당에이전트(x=611~843) */}
      {T(192, 68,  address,       { fontSize: F.sm, maxWidth: '370px', whiteSpace: 'normal', lineHeight: '13px' })}
      {T(192, 614, agentName,     { fontSize: F.sm })}

      {/* ── 제1조 광고조건 표 ── */}
      {/* 데이터 행 y ≈ 372, 각 열 시작 x */}
      {T(372, 182, formatCurrency(adFee),   { fontSize: F.xs })}
      {T(372, 319, formatCurrency(vat),     { fontSize: F.xs })}
      {T(372, 419, formatCurrency(totalFee),{ fontSize: F.xs })}
      {T(372, 524, startShort,              { fontSize: F.date })}
      {T(372, 644, endShort,                { fontSize: F.date })}

      {/* ── 자필 확인란 ── */}
      {/* 박스 위치: left=762, top=977, w=82, h=82 */}
      <div style={{ position: 'absolute', top: '977px', left: '762px', width: '82px', height: '82px' }}>
        {writingSlot || (writingDataUrl && (
          <img src={writingDataUrl} alt="" style={{ width: '82px', height: '82px', objectFit: 'contain' }} />
        ))}
      </div>

      {/* ── 서명 날짜 "20  년  월  일" ── */}
      {T(1104, 648, signYear,  { fontSize: F.sm })}
      {T(1104, 697, signMonth, { fontSize: F.sm })}
      {T(1104, 737, signDay,   { fontSize: F.sm })}

      {/* ── 광고주 성명 ── */}
      {T(1157, 92, clientName, { fontSize: F.base })}

      {/* ── 광고주 서명 ── */}
      <div style={{ position: 'absolute', top: '1142px', left: '88px', width: '230px', height: '50px' }}>
        {signatureSlot || (signatureDataUrl && (
          <img src={signatureDataUrl} alt="" style={{ width: '230px', height: '50px', objectFit: 'contain' }} />
        ))}
      </div>
    </div>
  );
});

export default ContractTemplate;
