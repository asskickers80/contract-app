import { supabase } from './supabase';

export async function findCustomerByPhone(phone) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findLatestListing(customerId) {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('customer_id', customerId)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

export async function fetchListings() {
  const { data, error } = await supabase
    .from('listings')
    .select('*, customers(*)')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
}

export async function saveCard({ customer, listing, listingId }) {
  const { data: cust, error: custErr } = await supabase
    .from('customers')
    .upsert(
      { phone: customer.phone, name: customer.name, type: customer.type },
      { onConflict: 'phone' },
    )
    .select()
    .single();
  if (custErr) throw custErr;

  const payload = {
    ...listing,
    customer_id: cust.id,
    updated_at: new Date().toISOString(),
  };

  const res = listingId
    ? await supabase.from('listings').update(payload).eq('id', listingId).select().single()
    : await supabase.from('listings').insert(payload).select().single();
  if (res.error) throw res.error;

  return { customer: cust, listing: res.data };
}
