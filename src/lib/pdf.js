// 계약서 PDF 생성 — 대표님이 주신 원본 계약서 이미지를 그대로 바탕에 깔고,
// 입력값·자필·서명만 정해진 좌표에 얹는다. (계약서를 새로 그리지 않는다)
//
// 글자 오버레이는 폰트 임베드 대신 캔버스로 그려 PNG로 합성한다.
// (pdf-lib 한글 폰트 subset 임베드가 글리프를 깨뜨리는 문제 회피 + PDF 용량 절감)
import { PDFDocument } from 'pdf-lib'
import { FORM_IMAGE, POS, RECTS, IMG_PT_WIDTH } from '../data/formLayout.js'

const A4 = { width: 595.28, height: 841.89 }
const A4_IMG_W = IMG_PT_WIDTH // A4에 이미지를 맞췄을 때 이미지 폭(pt) — pos.size(pt) 환산 기준
const INK = '#141a59' // 볼펜 느낌의 진한 남색
const OVERLAY_SCALE = 2.2 // 원본 이미지 해상도 대비 오버레이 캔버스 배율 (선명도)

let formBytesCache = null

async function fetchBytes(url, label) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${label} 로드 실패`)
  return res.arrayBuffer()
}

const won = n => `${Number(n || 0).toLocaleString('ko-KR')}원`
const dotDate = iso => {
  const [y, m, d] = (iso || '').split('-').map(Number)
  return y ? `${y}.  ${m}.  ${d}.` : ''
}

// 모든 글자 오버레이를 투명 캔버스에 그려 PNG(dataURL)로 반환
function buildTextOverlay(contract, signedDate, imgW, imgH) {
  const W = Math.round(imgW * OVERLAY_SCALE)
  const H = Math.round(imgH * OVERLAY_SCALE)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  function drawField(pos, text) {
    const t = String(text ?? '')
    if (!t) return
    const px = (pos.size / A4_IMG_W) * W // pt → 캔버스 px
    ctx.font = `${pos.bold ? 700 : 500} ${px}px -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`
    ctx.textBaseline = 'alphabetic'
    let x = pos.x * W
    const y = pos.y * H
    const tw = ctx.measureText(t).width
    if (pos.align === 'center') x -= tw / 2
    if (pos.patch) { // 인쇄된 기존 값을 흰 상자로 덮고 쓴다
      ctx.fillStyle = 'rgba(255,255,255,1)'
      if (typeof pos.patch === 'object') {
        // 셀 구간({x0,x1}) 전체를 덮는다 — 인쇄된 기본값·점이 남지 않게
        ctx.fillRect(pos.patch.x0 * W, y - px * 1.15, (pos.patch.x1 - pos.patch.x0) * W, px * 1.6)
      } else {
        ctx.fillRect(x - px * 0.3, y - px * 1.1, tw + px * 0.6, px * 1.5)
      }
    }
    ctx.fillStyle = INK
    ctx.fillText(t, x, y)
  }

  drawField(POS.storeName, contract.storeName)
  drawField(POS.businessType, contract.businessType)
  drawField(POS.bizNo, contract.bizNo)
  drawField(POS.address, contract.address)
  drawField(POS.agentName, contract.agentName)

  if (contract.productName && contract.productName !== '광고') drawField(POS.productPatch, contract.productName)
  drawField(POS.fee, won(contract.fee))
  drawField(POS.vat, won(contract.vat))
  drawField(POS.total, won(contract.total))
  drawField(POS.startDate, dotDate(contract.startDate))
  drawField(POS.endDate, dotDate(contract.endDate))
  if (Number(contract.periodMonths) !== 3) drawField(POS.periodPatch, `( ${contract.periodMonths} )개월간`)

  // 서명일 "20  년  월  일" 빈칸
  const [sy, sm, sd] = (signedDate || '').split('-').map(Number)
  if (sy) {
    drawField(POS.signYY, String(sy).slice(2)) // "20" 뒤 두 자리
    drawField(POS.signMM, String(sm))
    drawField(POS.signDD, String(sd))
  }

  drawField(POS.customerName, contract.customerName)

  return canvas.toDataURL('image/png')
}

export async function generateContractPdf(contract, images, signedDate) {
  if (!formBytesCache) formBytesCache = await fetchBytes(FORM_IMAGE, '계약서 원본 이미지')

  const doc = await PDFDocument.create()
  const form = await doc.embedJpg(formBytesCache)
  const page = doc.addPage([A4.width, A4.height])

  // 원본 이미지를 A4에 비율 유지로 꽉 채움 (중앙 정렬)
  const scale = Math.min(A4.width / form.width, A4.height / form.height)
  const w = form.width * scale
  const h = form.height * scale
  const ox = (A4.width - w) / 2
  const oy = (A4.height - h) / 2
  page.drawImage(form, { x: ox, y: oy, width: w, height: h })

  // 글자 오버레이 (전체 페이지 크기 투명 PNG 한 장)
  const overlayPng = buildTextOverlay(contract, signedDate, form.width, form.height)
  const overlayImg = await doc.embedPng(overlayPng)
  page.drawImage(overlayImg, { x: ox, y: oy, width: w, height: h })

  // 자필/서명/직인 — 비율 사각형 안에 맞춰 얹기
  async function drawInRect(rect, pngDataUrlOrBytes, opacity = 1) {
    if (!pngDataUrlOrBytes) return
    const img = await doc.embedPng(pngDataUrlOrBytes)
    const areaX = ox + rect.x * w
    const areaYTop = oy + h - rect.y * h
    const areaW = rect.w * w
    const areaH = rect.h * h
    const s = Math.min(areaW / img.width, areaH / img.height)
    page.drawImage(img, {
      x: areaX + (areaW - img.width * s) / 2,
      y: areaYTop - areaH + (areaH - img.height * s) / 2,
      width: img.width * s,
      height: img.height * s,
      opacity,
    })
  }

  await drawInRect(RECTS.handwriting, images.handwrittenPng)
  await drawInRect(RECTS.signature, images.signaturePng)
  // 회사 직인은 원본 사진에 이미 찍혀 있으므로 별도 오버레이 없음

  const bytes = await doc.save()
  return new Blob([bytes], { type: 'application/pdf' })
}
