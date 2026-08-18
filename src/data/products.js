// 광고 상품 프리셋 — 버튼 한 번으로 광고료/부가세/총액 일괄 입력
export const PRODUCTS = [
  { key: 'bottom', name: '하단광고', fee: 1_000_000, vat: 100_000, total: 1_100_000 },
  { key: 'middle', name: '중간광고', fee: 2_000_000, vat: 200_000, total: 2_200_000 },
  { key: 'top', name: '최상단광고', fee: 3_000_000, vat: 300_000, total: 3_300_000 },
  // 2026-08-18 대표님 지시로 배너 패키지 3종 추가 (부가세 별도가 기준 금액)
  { key: 'banner-center', name: '중앙배너 패키지', fee: 8_000_000, vat: 800_000, total: 8_800_000 },
  { key: 'banner-top', name: 'TOP배너 패키지', fee: 6_000_000, vat: 600_000, total: 6_600_000 },
  { key: 'banner-side', name: '돌출배너 패키지', fee: 5_000_000, vat: 500_000, total: 5_500_000 },
]
