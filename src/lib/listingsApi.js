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

export async function fetchAttachments(listingId) {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const withUrls = await Promise.all(
    (data || []).map(async (a) => {
      const { data: urlData } = await supabase.storage
        .from('contracts')
        .createSignedUrl(a.image_path, 3600);
      return { ...a, url: urlData?.signedUrl || '' };
    }),
  );
  return withUrls;
}

export async function uploadAttachments(listingId, files) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `attachments/${listingId}/${Date.now()}_${i}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('contracts')
      .upload(path, file, { contentType: file.type || 'image/jpeg' });
    if (upErr) throw upErr;

    const { error: insErr } = await supabase
      .from('attachments')
      .insert({ listing_id: listingId, image_path: path });
    if (insErr) throw insErr;
  }
}

export async function deleteAttachment(attachment) {
  await supabase.storage.from('contracts').remove([attachment.image_path]);
  const { error } = await supabase.from('attachments').delete().eq('id', attachment.id);
  if (error) throw error;
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
