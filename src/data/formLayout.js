// 원본 계약서 이미지 위 오버레이 좌표 (이미지 가로/세로에 대한 비율 0~1)
// 화면(ContractPaper)과 PDF(pdf.js)가 같은 좌표를 공유한다.
// 좌표는 2% 눈금 그리드를 원본 이미지에 겹쳐 측정한 값 — 이미지를 교체하면 재측정 필요.
// 현재 이미지: 대표님 제공 최종 스캔본 1080×1527 (A4 비율)
export const FORM_IMAGE = `${import.meta.env.BASE_URL}contract-form.jpg` // 앱 base(/app/) 기준
export const FORM_RATIO = 1527 / 1080 // 세로/가로

// A4에 이미지를 맞췄을 때 이미지 폭(pt) — pos.size(pt)를 화면/캔버스 px로 환산하는 기준
export const IMG_PT_WIDTH = 595.3

// x,y: 글자 시작점(baseline 기준). align: 'center'면 x가 중심점.
export const POS = {
  storeName:    { x: 0.175, y: 0.1342, size: 9 },
  businessType: { x: 0.492, y: 0.1342, size: 9 },
  bizNo:        { x: 0.785, y: 0.1342, size: 8.5 },
  address:      { x: 0.175, y: 0.1502, size: 9 },
  agentName:    { x: 0.785, y: 0.1502, size: 9 },

  // 제1조 광고조건 표 (7열) — 값 행. 셀 경계 실측:
  // 0.0852 | 0.2278 | 0.337 | 0.4389 | 0.5509 | 0.6713 | 0.7944 | 0.913
  // patch가 {x0,x1}이면 그 셀 구간을 흰색으로 덮고 쓴다 (인쇄된 기본값/점 제거)
  productPatch: { x: 0.1565, y: 0.2839, size: 9.5, align: 'center', bold: true, patch: { x0: 0.093, x1: 0.2265 } }, // '광고' 인쇄됨 — 다를 때만 덮어씀
  fee:          { x: 0.236,  y: 0.2839, size: 7.5 }, // 셀 왼쪽 정렬
  vat:          { x: 0.345,  y: 0.2839, size: 7.5 },
  total:        { x: 0.447,  y: 0.2839, size: 7.5, bold: true },
  startDate:    { x: 0.6111, y: 0.2839, size: 7.5, align: 'center', patch: { x0: 0.557, x1: 0.665 } }, // 인쇄된 ". ." 점 덮기
  endDate:      { x: 0.7329, y: 0.2839, size: 7.5, align: 'center', patch: { x0: 0.677, x1: 0.789 } },
  periodPatch:  { x: 0.855,  y: 0.2839, size: 7.5, align: 'center', patch: { x0: 0.797, x1: 0.908 } }, // '( 3 )개월간' 인쇄됨 — 3개월 아닐 때만 덮어씀

  // 하단 "20  년  월  일" 빈칸 — 값은 단위 글자(년/월/일) 앞 빈칸에 쓴다
  signYY: { x: 0.702, y: 0.9035, size: 9.5 },          // "20" 뒤 두 자리
  signMM: { x: 0.785, y: 0.9035, size: 9.5, align: 'center' },
  signDD: { x: 0.848, y: 0.9035, size: 9.5, align: 'center' },

  // 광고주 성명
  customerName: { x: 0.235, y: 0.9525, size: 10.5, bold: true },
}

// 이미지 영역(비율 사각형): x,y = 좌상단, w,h = 크기
// 직인 오버레이는 없음 — 원본 스캔에 이미 회사 직인이 찍혀 있다.
export const RECTS = {
  handwriting: { x: 0.760, y: 0.834, w: 0.155, h: 0.050 }, // 자필 확인 란 ('들었음' 워터마크 위)
  signature:   { x: 0.305, y: 0.920, w: 0.155, h: 0.033 }, // 성명 옆 빈칸
}
