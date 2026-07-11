// 매물카드 저장소 — customers(전화번호 key) + listings (Supabase)
// 스키마: contract-app/supabase/listings-schema.sql (콘솔 실행은 대표님이 직접)
import { supabase, isSupabaseConfigured } from './supabase.js'
import { genId } from './compat.js'
import { digitsOnly } from './format.js'

function requireDb() {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다 (.env의 VITE_SUPABASE_URL/ANON_KEY)')
}

export { isSupabaseConfigured }

// 전화번호로 고객+최신 매물카드 조회. 없으면 null
export async function findCardByPhone(phone) {
  requireDb()
  const key = digitsOnly(phone)
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*, listings(*)')
    .eq('phone', key)
    .maybeSingle()
  if (error) throw error
  if (!customer) return null
  const listings = (customer.listings || []).sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
  return { customer, listing: listings[0] || null }
}

// 카드 저장: 고객 upsert(전화번호 key) + 매물 upsert
export async function saveCard({ customer, listing }) {
  requireDb()
  const phone = digitsOnly(customer.phone)
  if (phone.length < 10) throw new Error('전화번호를 확인해 주세요')

  let customerId = customer.id
  if (!customerId) {
    // 동시 생성 대비: 이미 있으면 재사용
    const { data: existing } = await supabase.from('customers').select('id').eq('phone', phone).maybeSingle()
    customerId = existing?.id || genId()
  }
  const { error: cErr } = await supabase.from('customers').upsert({
    id: customerId,
    phone,
    name: customer.name || '',
    type: customer.type || '기타',
  })
  if (cErr) throw cErr

  const listingId = listing.id || genId()
  const { error: lErr } = await supabase.from('listings').upsert({
    id: listingId,
    customer_id: customerId,
    store_name: listing.storeName || '',
    business_type: listing.businessType || '',
    biz_reg_no: listing.bizNo || '',
    address: listing.address || '',
    deposit: listing.deposit || 0,
    monthly_rent: listing.monthlyRent || 0,
    premium: listing.premium || 0,
    maintenance_fee: listing.maintenanceFee || 0,
    updated_at: new Date().toISOString(), // 최근 상담순 정렬 기준
  })
  if (lErr) throw lErr
  return { customerId, listingId }
}

// 목록: 최근 상담순. keyword는 전화번호/상호 부분일치 (내부 1인용 규모 — 클라이언트 필터)
export async function listCards(keyword) {
  requireDb()
  const { data, error } = await supabase
    .from('listings')
    .select('*, customers(*)')
    .order('updated_at', { ascending: false })
    .limit(100)
  if (error) throw error
  const kw = (keyword || '').trim()
  if (!kw) return data
  const kwDigits = digitsOnly(kw)
  return data.filter(row =>
    (row.store_name || '').includes(kw) ||
    (kwDigits && (row.customers?.phone || '').includes(kwDigits)),
  )
}
