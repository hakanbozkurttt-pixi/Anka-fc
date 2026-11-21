import { supabase } from './supabase';

export const REQUEST_MAX_LENGTH = 160;

export type ProductRequest = {
  id: string;
  request_no: number;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  decided_at: string | null;
  product: { id: string; brand: string; name: string; package_grams: number; price_try: number; is_active: boolean } | null;
};

export const REQUEST_STATUS_LABEL: Record<ProductRequest['status'], string> = {
  pending: 'Değerlendiriliyor',
  approved: 'Onaylandı',
  rejected: 'Onaylanmadı',
};

function client() {
  if (!supabase) throw new Error('Supabase ayarı eksik.');
  return supabase;
}

export async function listMyRequests(): Promise<ProductRequest[]> {
  const { data, error } = await client()
    .from('product_requests')
    .select('id, request_no, message, status, created_at, decided_at, product:products(id, brand, name, package_grams, price_try, is_active)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as unknown as ProductRequest[]).map((r) => ({
    ...r,
    product: r.product ? { ...r.product, price_try: Number(r.product.price_try) } : null,
  }));
}

export async function createRequest(message: string): Promise<void> {
  const { error } = await client().from('product_requests').insert({ message: message.trim() });
  if (error) throw error;
}
