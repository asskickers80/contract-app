// 캡처 이미지에서 매물 정보를 추출하는 서버리스 함수 (구글 Gemini API)
// Vercel 환경변수 GEMINI_API_KEY 필요 — https://aistudio.google.com 에서 무료 발급
// 무료 등급 주의: 무료 API로 보낸 데이터는 구글 서비스 개선(학습)에 사용될 수 있다.

// 정확도 우선: pro를 먼저 쓰고, 한도 초과/불가 시 flash로 폴백
const MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash']

// Gemini structured output 스키마 — 항상 이 형태의 JSON으로 응답을 강제한다
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    storeName: { type: 'STRING', nullable: true, description: '상호(가게 이름)' },
    businessType: { type: 'STRING', nullable: true, description: '업종' },
    address: { type: 'STRING', nullable: true, description: '소재지/주소' },
    bizNo: { type: 'STRING', nullable: true, description: '사업자등록번호 (숫자 10자리, 000-00-00000 형식)' },
    deposit: { type: 'NUMBER', nullable: true, description: '보증금(원 단위 숫자)' },
    monthlyRent: { type: 'NUMBER', nullable: true, description: '월세(원 단위 숫자)' },
    premium: { type: 'NUMBER', nullable: true, description: '희망권리금(원 단위 숫자)' },
    maintenanceFee: { type: 'NUMBER', nullable: true, description: '관리비(원 단위 숫자)' },
    phone: { type: 'STRING', nullable: true, description: '전화번호(숫자와 하이픈만)' },
    ownerName: { type: 'STRING', nullable: true, description: '연락처 이름/담당자' },
    area: { type: 'STRING', nullable: true, description: "전용면적 — 단위 포함 그대로, 예: '39.7㎡ (12.0평)'" },
    franchise: { type: 'STRING', nullable: true, description: '프랜차이즈 칸의 브랜드명. 비어 있거나 개인이면 null' },
  },
}

const PROMPT = `이 이미지는 상가 매물 정보 페이지의 화면 캡처다. 정확도가 가장 중요하다.
이미지를 꼼꼼히 읽고 다음 항목을 JSON으로 추출하라:
상호, 업종, 소재지(주소), 사업자등록번호, 보증금, 월세, 희망권리금(권리금), 관리비, 전화번호, 연락처 이름, 전용면적, 프랜차이즈.

규칙:
- 표/라벨 형식이면 라벨과 값을 정확히 대응시켜 읽는다. 옆 칸의 다른 항목 값과 절대 섞지 마라.
- 금액은 원 단위 숫자로 변환한다. 예: "3,000만" → 30000000, "1억 2000" → 120000000, "5,000/300" 같은 표기는 보증금 5000만/월세 300만이다.
- 사업자등록번호는 숫자 10자리(000-00-00000)다. 전화번호와 혼동하지 마라.
- 업종은 가장 세부 업종명 하나만 쓴다. 예: "서비스업 기타서비스업"으로 보이면 "기타서비스업".
- 전화번호는 숫자와 하이픈만 남긴다 (010/02/031 등으로 시작).
- 전용면적은 '전용면적' 라벨의 값을 단위까지 그대로 쓴다. 예: "39.7㎡ ( 12.0 평)" → "39.7㎡ (12.0평)". 대지·연면적과 혼동하지 마라.
- 프랜차이즈는 프랜차이즈 칸의 브랜드명만 쓴다. 칸이 비어 있거나 개인/직영이면 null.
- 이미지에서 확인할 수 없는 항목은 null로 둔다. 절대 추측하거나 지어내지 마라.
- 최종 답 전에 각 값을 이미지에서 한 번 더 대조 확인하라.`

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } }

// dataURL 파싱 — 테스트에서 직접 호출
export function parseDataUrl(image) {
  const m = /^data:(image\/[a-z+.-]+);base64,(.+)$/s.exec(image || '')
  return m ? { mimeType: m[1], data: m[2] } : null
}

// Gemini 응답에서 추출 필드 꺼내기 — 테스트에서 직접 호출
export function pickFields(data) {
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''
  return JSON.parse(text)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용됩니다' })
    return
  }
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    res.status(500).json({ error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다 (Vercel 대시보드에서 등록하세요)' })
    return
  }

  try {
    const parsed = parseDataUrl(req.body?.image)
    if (!parsed) {
      res.status(400).json({ error: 'image(dataURL)가 필요합니다' })
      return
    }

    const body = JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: parsed.mimeType, data: parsed.data } },
          { text: PROMPT },
        ],
      }],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: SCHEMA,
        temperature: 0,
      },
    })

    // pro 먼저 시도, 실패(한도 초과 등) 시 flash로 폴백
    let lastStatus = 502
    let lastMsg = 'Gemini API 오류'
    for (const model of MODELS) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body,
        },
      )
      const data = await r.json().catch(() => ({}))
      if (r.ok) {
        res.status(200).json({ fields: pickFields(data), model })
        return
      }
      lastStatus = r.status
      lastMsg = data?.error?.message || `Gemini API 오류 (HTTP ${r.status})`
    }

    // 모든 모델 실패 — 429 = 무료 등급 사용량 초과
    res.status(lastStatus === 429 ? 429 : 502).json({
      error: lastStatus === 429 ? '무료 사용량 한도 초과 — 잠시 후 다시 시도해 주세요' : lastMsg,
    })
  } catch (err) {
    res.status(502).json({ error: `추출 실패: ${err.message || err}` })
  }
}
