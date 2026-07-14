// 매물작업 탭용 AI 작성 서버리스 함수 (구글 Gemini API)
// - task 'fill89'  : 8번 상권 / 9번 프랜차이즈 항목을 대표님 기준대로 자동 작성
// - task 'compose' : 12개 항목을 토대로 매물광고 전문 작성
// 작성 기준 문서는 2026-07-14 대표님이 제공한 3종 기준을 그대로 반영한 것 — 임의 수정 금지.

const MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash']

// ── 공통 문체 규칙 ──
const COMMON_STYLE = `
공통 문체 규칙 (반드시 지킬 것):
- 한국어 존댓말. 긴 서술형 문장 금지, 짧고 압축적인 요약체.
- 형식은 "✅ 항목명" + 짧은 대시(-) 문장 구조.
- 과장·단정 금지: "무조건 성공", "매출 보장", "순익 보장", "권리금 회수 확정", "독점입니다" 등 금지.
- 대신 "기대", "가능", "유리", "검토 가능", "구조", "여지" 같은 신뢰도 있는 표현 사용.
- 확인되지 않은 사실은 단정하지 않는다. 제공된 정보와 일반적으로 확실한 사실만 쓴다.
- "신규 오픈 대비" 표현 금지.`

// ── 8번 상권 작성 기준 (압축형 — 광고에 들어갈 분량) ──
const TRADE_AREA_GUIDE = `
[상권분석 작성 기준]
- 부동산 매물광고에 바로 넣을 수 있는 세일즈형 상권분석. 읽는 사람이 "이 자리는 좋다", "인수하고 싶다"고 느끼게.
- 압축형으로 작성: ✅ 항목 4~5개, 각 항목 대시 문장 3~4줄, 마지막 핵심정리 3~4개.
- 첫 부분에 반드시 입지 강점을 최우선 배치. 아래 요소가 확인되면 강하게 강조:
  항아리상권 / 대단지 배후세대 / 아파트 대단지 정문 / 코너 / 횡단보도 앞 / 버스정류장 앞 / 상권 진입로 / 먹자라인 입구 / 1층 / 전면 자리 / 역세권 / 대학·학교 앞 / 병원·메디컬빌딩 / 메인 건물 / 공실 없는 완성형 상가 / 경쟁점 적은 자리
- 입지 설명만 하지 말고 반드시 해당 업종과 왜 잘 맞는지 연결한다.
  · 카페(컴포즈커피 등): 출근·등교·장보기·귀가 동선, 학생·학부모, 병원 방문객·의료진 수요, 저가·테이크아웃·반복 구매 구조
  · 노래연습장: 먹자상권·회식·2차 수요, 역세권·귀가 동선, 단체·모임·체류형 소비 (불법 영업 암시 금지 — "식사 후 2차 체류 수요" 등 합법적 표현)
  · 음식점·프랜차이즈: 주거 배후·오피스·학교·병원·배달권, 점심·저녁·주말·가족외식·배달 수요 구분
  · 병원·학원·생활서비스: 반복 방문, 대기 수요, 동선 고정성, 생활밀착 안정성
- 좋은 문장 예: "입주민 고정수요를 확보하기 좋습니다.", "생활동선에서 반복 노출되는 구조입니다.", "신규 수요를 만들어야 하는 자리가 아니라, 이미 형성된 유동을 선점하는 자리입니다."
- 경쟁 관련: 제공된 정보에 경쟁점이 적다는 내용이 있을 때만 "경쟁이 제한적인 환경", "대표 매장으로 자리 잡기 좋은 구조" 정도로 표현.
- 일반적인 지역 소개만 길게 늘어놓지 말 것. 주소로 확인 가능한 범위(행정구역 성격, 주거지/역세권 등 일반 상식 수준)를 넘는 구체 시설·세대수는 제공된 정보에 있을 때만 사용.
- 구성: ✅ 핵심 입지 / ✅ 배후수요 / ✅ 업종과의 궁합 / ✅ 경쟁력(정보 있을 때) / ✅ 핵심 정리(3~4개 번호)`

// ── 9번 프랜차이즈 작성 기준 (브랜드 자체만 — 입지·상권·주소 금지) ──
const FRANCHISE_GUIDE = `
[프랜차이즈 브랜드 분석 작성 기준]
- 프랜차이즈 브랜드 자체의 경쟁력만 정리한다. 입지·상권·주소·매물 정보는 절대 쓰지 않는다.
- 압축형: ✅ 항목 3~4개, 각 항목 대시 문장 2~4줄, 마지막 한 줄 요약.
- 구성: ✅ 브랜드 경쟁력(인지도·가맹망 규모·트렌드 적합성) / ✅ 메뉴·상품 경쟁력(대표 메뉴·객단가·반복 구매) / ✅ 본사 운영 시스템(교육·매뉴얼·물류·마케팅·앱) / ✅ 인수창업 메리트(브랜드 인지도 활용·시스템 승계·초보 접근성)
- 브랜드별 확정 방향(해당 브랜드일 때 반영):
  · 컴포즈커피: 대표 저가커피 프랜차이즈, 전국 가맹망·합리적 가격·안정적 품질, 아메리카노 반복구매 + 라떼·에이드·디저트 폭넓은 메뉴, 테이크아웃 회전율·소형 평수 효율, 앱 멤버십·쿠폰·전국 마케팅·본사 물류.
  · 룩스필라테스: 100% 기구필라테스, 소규모 그룹·개인레슨, 체형관리·자세교정 수요, 본사 교육·커리큘럼·수업 품질 관리.
  · 메가혼밥: 배달전문 한식, 도시락·덮밥·찌개 등 폭넓은 한식 수요, 멀티브랜드 배달 운영, 원팩 중심 빠른 조리, 배달앱 채널 다변화.
  · 버거앤프라이즈: 수제버거 포지션, 매일 준비하는 패티·신선 재료, 버거+사이드 객단가 구조, 홀·포장·배달 복합.
  · 포케올데이: 포케·샐러드·저당식 건강식 트렌드, 여성·직장인·운동 고객층, 매출 채널 다변화, 공식 선정 이력 있으면 활용.
- 마지막 한 줄 요약 예: "컴포즈커피는 단순 저가커피 매장이 아니라, 강한 브랜드 인지도와 반복 소비 수요를 기반으로 안정적인 카페 운영을 검토할 수 있는 대표 프랜차이즈입니다."`

// ── 작성완료(매물광고) 작성 기준 ──
const COMPOSE_GUIDE = `
[매물광고 작성 기준]
- 제공한 숫자·사실·조건·매출·수익·시설·양도사유는 절대 누락하지 않는다. 제공되지 않은 정보는 지어내지 않는다.
- 구성 (이 흐름을 그대로 따른다):

✳ 2줄 헤드라인
- 1줄차: 가장 강한 입지·상권·브랜드·매출 포인트
- 2줄차: 인수자가 혹할 만한 핵심 강점

매장 기본정보
- 상호 / 주소 / 면적 / 보증금·월세 / 권리금 / 관리비 / 프랜차이즈 여부 — 제공된 항목만 줄별로.

핵심 한 줄 요약
- 이 매물을 왜 봐야 하는지 한 문장.

✅ 상권 · 입지 — 제공된 상권분석 내용을 반영 (단순 지역 설명 아닌 업종 궁합 중심)
✅ 업종 또는 프랜차이즈 경쟁력 — 제공된 프랜차이즈 분석 반영, 브랜드 경쟁력 + 입지 궁합. "프랜차이즈 아님"이면 업종 자체의 경쟁력으로.
✅ 시설 상태 — 인수자의 추가 투자 부담 관점. 신규급이면 "별도 시설투자 없이 바로 운영에 집중하기 좋은 상태", 오래됐으면 "선택적 보완 중심으로 접근 가능".
✅ 영업 · 매출 · 수익성 — "월평균 매출 약 OOO만원", "월순익 OOO만원 수준을 목표로 검토 가능한 구조", "운영 방식에 따라 달라질 수 있습니다" 등. 보장 표현 금지.
✅ 매출 상승 여력 — 제공 정보 기반 개선 여지만.
✅ 이 매물의 포인트 — 핵심 강점 4~6개 압축.
✅ 왜 지금 검토할 만한가 — 양도 사유의 신뢰도 반영 ("매출 부진이 아닌 개인 사정" 등 제공된 사유 기반).
✅ 핵심 정리 — 번호 3~5개.

한 줄 요약 — OOO한 매물입니다.

- 매출·순익·회수는 보장처럼 쓰지 않는다. 입지 구조 + 반복수요 + 검증된 매출 + 운영 개선 여지 + 양도 사유의 신뢰도로 설득한다.
- 정보가 비어 있는 섹션(예: 매출 미제공)은 지어내지 말고 해당 섹션을 생략한다.`

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }

const pickText = data => data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''

async function callGemini(key, prompt, schema) {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      response_mime_type: 'application/json',
      response_schema: schema,
      temperature: 0.4, // 문안 작성 — 완전 고정보다 약간의 표현 다양성
    },
  })
  let lastStatus = 502
  let lastMsg = 'Gemini API 오류'
  for (const model of MODELS) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key }, body },
    )
    const data = await r.json().catch(() => ({}))
    if (r.ok) return { ok: true, json: JSON.parse(pickText(data)), model }
    lastStatus = r.status
    lastMsg = data?.error?.message || `Gemini API 오류 (HTTP ${r.status})`
  }
  return { ok: false, status: lastStatus, msg: lastMsg }
}

// 매물 정보를 프롬프트용 텍스트로 (빈 값 제외)
function infoBlock(d) {
  const rows = [
    ['상호', d.storeName], ['업종', d.businessType], ['주소', d.address], ['전용면적', d.area],
    ['보증금', d.deposit], ['월세', d.monthlyRent], ['희망권리금', d.premium], ['관리비', d.maintenanceFee],
    ['프랜차이즈', d.franchiseBrand],
  ]
  return rows.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k, v]) => `- ${k}: ${v}`).join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용됩니다' })
    return
  }
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다' })
    return
  }

  try {
    const { task, data } = req.body || {}
    if (!task || !data) {
      res.status(400).json({ error: 'task와 data가 필요합니다' })
      return
    }

    let result
    if (task === 'fill89') {
      const prompt = `너는 상가 권리금 매물 광고를 쓰는 전문 부동산 카피라이터다.
${COMMON_STYLE}

아래 매물 정보를 근거로 두 항목을 작성하라.
${infoBlock(data)}

1) tradeArea — 아래 기준의 상권분석.
${TRADE_AREA_GUIDE}

2) franchise — 프랜차이즈 항목.
- 위 매물 정보에 프랜차이즈 브랜드가 없으면 정확히 "프랜차이즈 아님" 다섯 글자만 쓴다.
- 브랜드가 있으면 아래 기준으로 작성한다.
${FRANCHISE_GUIDE}`
      result = await callGemini(key, prompt, {
        type: 'OBJECT',
        properties: {
          tradeArea: { type: 'STRING', description: '상권분석 (✅ 형식)' },
          franchise: { type: 'STRING', description: "프랜차이즈 분석 또는 '프랜차이즈 아님'" },
        },
        required: ['tradeArea', 'franchise'],
      })
      if (result.ok) {
        res.status(200).json({ fields: result.json, model: result.model })
        return
      }
    } else if (task === 'compose') {
      const f = data
      const numbered = [
        ['1. 상호', f.storeName], ['2. 주소', f.address], ['3. 면적', f.area],
        ['4. 보증금', f.deposit], ['5. 월세', f.monthlyRent], ['6. 희망권리금', f.premium], ['7. 관리비', f.maintenanceFee],
        ['8. 상권', f.tradeArea], ['9. 프랜차이즈', f.franchise],
        ['10. 매출과 수익', f.revenue], ['11. 특장점', f.strengths], ['12. 특이사항 및 매도사유', f.notes],
      ].filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')
        .map(([k, v]) => `${k} :\n${v}`).join('\n\n')

      const prompt = `너는 상가·프랜차이즈 양도양수 매물광고를 쓰는 전문 부동산 카피라이터다.
${COMMON_STYLE}

아래는 광고작성 페이지에 입력된 매물 정보다. 이 정보만 근거로 매물광고 전문을 작성하라.
${f.businessType ? `(참고 — 업종: ${f.businessType})\n` : ''}
${numbered}

${COMPOSE_GUIDE}

출력은 광고 본문 텍스트만. 마크다운 헤더(#) 없이 ✳/✅/대시(-)/번호만 사용해 바로 복사해 쓸 수 있는 완성형으로.`
      result = await callGemini(key, prompt, {
        type: 'OBJECT',
        properties: { adText: { type: 'STRING', description: '매물광고 전문' } },
        required: ['adText'],
      })
      if (result.ok) {
        res.status(200).json({ adText: result.json.adText, model: result.model })
        return
      }
    } else {
      res.status(400).json({ error: `알 수 없는 task: ${task}` })
      return
    }

    res.status(result.status === 429 ? 429 : 502).json({
      error: result.status === 429 ? '무료 사용량 한도 초과 — 잠시 후 다시 시도해 주세요' : result.msg,
    })
  } catch (err) {
    res.status(502).json({ error: `작성 실패: ${err.message || err}` })
  }
}
