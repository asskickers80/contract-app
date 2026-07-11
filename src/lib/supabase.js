import { createClient } from '@supabase/supabase-js'
import { genId } from './compat.js'

// Supabase 설정 — .env 파일에 아래 두 값이 있어야 저장/목록 기능이 동작합니다.
// 미설정 시에도 PDF 생성·공유는 가능하며, 저장만 건너뜁니다.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
export const isSupabaseConfigured = Boolean(supabase)

export const STORAGE_BUCKET = 'contracts'

// PDF 업로드 + contracts 테이블 기록. 성공 시 저장된 행 반환.
export async function saveContract({ pdfBlob, fileName, contract, signedAt }) {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다 (.env 확인)')

  const id = genId() // 인트라넷(HTTP)에서는 crypto.randomUUID가 없어 폴백 사용
  const datePart = (contract.startDate || '').replaceAll('-', '')
  // Storage 키는 한글 파일명 문제를 피하려고 ASCII로 구성. 원래 파일명은 DB에 보관.
  const pdfPath = `${new Date(signedAt).getFullYear()}/${datePart}_${id}.pdf`

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(pdfPath, pdfBlob, { contentType: 'application/pdf', upsert: false })
  if (uploadError) throw uploadError

  const row = {
    id,
    store_name: contract.storeName,
    business_type: contract.businessType,
    biz_reg_no: contract.bizNo,
    address: contract.address,
    agent_name: contract.agentName,
    product_name: contract.productName,
    ad_fee: contract.fee,
    vat: contract.vat,
    total: contract.total,
    start_date: contract.startDate,
    end_date: contract.endDate,
    period_months: contract.periodMonths,
    customer_name: contract.customerName,
    signed_at: signedAt,
    pdf_path: pdfPath,
    file_name: fileName,
    device_info: { userAgent: navigator.userAgent, signedAt },
  }
  const { error: insertError } = await supabase.from('contracts').insert(row)
  if (insertError) {
    // 업로드는 됐는데 DB 기록 실패 → 고아 파일 정리 시도 후 에러 전달
    await supabase.storage.from(STORAGE_BUCKET).remove([pdfPath]).catch(() => {})
    throw insertError
  }
  return row
}

export async function listContracts(keyword) {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다')
  let query = supabase
    .from('contracts')
    .select('id, store_name, business_type, total, start_date, signed_at, pdf_path, file_name, payment_opened_at')
    .order('signed_at', { ascending: false })
    .limit(100)
  if (keyword?.trim()) query = query.ilike('store_name', `%${keyword.trim()}%`)
  const { data, error } = await query
  if (error) throw error
  return data
}

// 비공개 버킷이므로 signed URL로만 접근
export async function downloadContractPdf(pdfPath) {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다')
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(pdfPath)
  if (error) throw error
  return data // Blob
}

export async function markPaymentOpened(contractId) {
  if (!supabase || !contractId) return
  await supabase
    .from('contracts')
    .update({ payment_opened_at: new Date().toISOString() })
    .eq('id', contractId)
}
