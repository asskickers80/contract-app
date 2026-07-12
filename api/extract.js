// 캡처 이미지에서 매물 정보를 추출하는 서버리스 함수 (구글 Gemini API)
// Vercel 환경변수 GEMINI_API_KEY 필요 — https://aistudio.google.com 에서 무료 발급
// 무료 등급 주의: 무료 API로 보낸 데이터는 구글 서비스 개선(학습)에 사용될 수 있다.

const MODEL = 'gemini-2.5-flash'

// Gemini structured output 스키마 — 항상 이 형태의 JSON으로 응답을 강제한다
const SCHEMA = {
  type: 'OBJECT',
  properties: {
    storeName: { type: 'STRING', nullable: true, description: '상호(가게 이름)' },
    businessType: { type: 'STRING', nullable: true, description: '업종' },
    address: { type: 'STRING', nullable: true, description: '소재지/주소' },
    deposit: { type: 'NUMBER', nullable: true, description: '보증금(원 단위 숫자)' },
    monthlyRent: { type: 'NUMBER', nullable: true, description: '월세(원 단위 숫자)' },
    premium: { type: 'NUMBER', nullable: true, description: '희망권리금(원 단위 숫자)' },
    maintenanceFee: { type: 'NUMBER', nullable: true, description: '관리비(원 단위 숫자)' },
    phone: { type: 'STRING', nullable: true, description: '전화번호(숫자와 하이픈만)' },
    ownerName: { type: 'STRING', nullable: true, description: '연락처 이름/담당자' },
  },
}

const PROMPT = `이 이미지는 상가 매물 정보 페이지의 화면 캡처다.
이미지에서 다음 항목을 찾아 JSON으로 추출하라:
상호, 업종, 소재지(주소), 보증금, 월세, 희망권리금(권리금), 관리비, 전화번호, 연락처 이름.
- 금액은 원 단위 숫자로 변환한다. 예: "3,000만" → 30000000, "1억 2000" → 120000000.
- 이미지에서 확인할 수 없는 항목은 null로 둔다. 절대 추측하지 마라.
- 전화번호는 숫자와 하이픈만 남긴다.`

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

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
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
        }),
      },
    )

    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      const msg = data?.error?.message || `Gemini API 오류 (HTTP ${r.status})`
      // 429 = 무료 등급 사용량 초과 — 잠시 후 재시도 안내
      res.status(r.status === 429 ? 429 : 502).json({
        error: r.status === 429 ? '무료 사용량 한도 초과 — 잠시 후 다시 시도해 주세요' : msg,
      })
      return
    }

    res.status(200).json({ fields: pickFields(data) })
  } catch (err) {
    res.status(502).json({ error: `추출 실패: ${err.message || err}` })
  }
}
