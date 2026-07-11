// 업종 선택 목록 — 점포라인 매물 검색 분류 기준 (스펙 부록 A)
// ※ '기타업종' 대분류는 사이트 인코딩 문제로 일부 추정 포함 — 점포라인 검색 페이지와 대조 후 수정 권장
export const CATEGORIES = [
  {
    group: '휴게음식점',
    items: ['카페', '치킨점', '커피점', '패스트푸드', '피자점', '제과점', '아이스크림점', '떡볶이/튀김', '기타휴게점'],
  },
  {
    group: '일반음식점',
    items: ['한식점', '고깃집', '분식점', '중국집', '일식점', '생선회/해물', '레스토랑', '돈까스/우동', '기타음식점'],
  },
  {
    group: '주류점',
    items: ['맥주호프점', '노래주점', '바', '이자카야', '실내포차', '꼬치구이', '기타주점'],
  },
  {
    group: '오락스포츠',
    items: ['스크린골프장', '당구장', '노래방', '요가/필라테스', '골프연습장', 'PC방', '헬스클럽', '만화방', '기타오락스포츠'],
  },
  {
    group: '판매업',
    items: ['편의점', '의류판매점', '1층다용도', '이동통신점', '슈퍼마켓', '아이스크림 할인점', '문구팬시', '화장품점', '기타판매점'],
  },
  {
    group: '서비스업',
    items: ['독서실', '미용실', '마사지', '피부미용', '빨래방', '세차장/카센타', '네일아트', '키즈카페', '기타서비스업'],
  },
  {
    group: '기타업종',
    items: ['상가매매', '모텔', '학원', '펜션', '병원/약국', '다용도상가', '기타부동산'],
  },
]

const RECENT_KEY = 'contract.recentCategories'

export function getRecentCategories() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(raw) ? raw.slice(0, 3) : []
  } catch {
    return []
  }
}

export function pushRecentCategory(name) {
  if (!name) return
  const next = [name, ...getRecentCategories().filter(c => c !== name)].slice(0, 3)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
}
