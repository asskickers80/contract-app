// iPad 공유 시트 (Web Share API Level 2) — HTTPS에서만 동작
// 반환값: 'shared' 공유 완료 / 'downloaded' 다운로드 폴백 / 'cancelled' 사용자가 공유 취소

export async function sharePdf(pdfBlob, fileName) {
  const file = new File([pdfBlob], fileName, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName })
      return 'shared'
    } catch (err) {
      if (err.name === 'AbortError') return 'cancelled'
      // 공유 실패 → 다운로드 폴백으로 계속
    }
  }
  downloadBlob(pdfBlob, fileName)
  return 'downloaded'
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
