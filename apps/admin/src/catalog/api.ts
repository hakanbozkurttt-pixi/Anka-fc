import { fetchAll } from '../lib/fetchAll'
import { supabase } from '../lib/supabase'
import type { Product, ProductInput } from './model.ts'

function client() {
  if (!supabase) throw new Error('Supabase ayarı eksik.')
  return supabase
}

export const IMAGE_BUCKET = 'product-images'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function listProducts(): Promise<Product[]> {
  const data = await fetchAll<Product>((from, to) =>
    client()
      .from('products')
      .select('*')
      .order('brand')
      .order('name')
      .order('package_grams')
      .order('id')
      .range(from, to),
  )
  return data.map((p) => ({ ...p, price_try: Number(p.price_try) }))
}

export async function createProduct(input: ProductInput & { image_path?: string | null }) {
  const { data, error } = await client().from('products').insert(input).select('id').single()
  if (error) throw error
  return data.id as string
}

export async function updateProduct(id: string, input: Partial<ProductInput> & { image_path?: string | null }) {
  const { error } = await client().from('products').update(input).eq('id', id)
  if (error) throw error
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `products/${crypto.randomUUID()}.${ext}`
  const { error } = await client().storage.from(IMAGE_BUCKET).upload(path, file, { contentType: file.type })
  if (error) throw error
  return path
}

export async function removeProductImage(path: string) {
  await client().storage.from(IMAGE_BUCKET).remove([path])
}

export function imageUrl(path: string | null) {
  if (!path || !supabase) return null
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function importProducts(rows: (ProductInput & { id: string | null })[]) {
  const { data, error } = await client().rpc('import_products', { rows })
  if (error) throw error
  return data as { inserted: number; updated: number }
}

/** Veritabanı hatalarını Türkçe, anlaşılır mesaja çevirir. */
export function productErrorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string }
  if (e?.code === '23505') return 'Bu barkod / ürün kodu başka bir üründe kayıtlı. Her ürünün kodu farklı olmalı.'
  if (e?.code === '42501') return 'Bu işlem için yönetici yetkisi gerekiyor.'
  if (e?.code === '23514') return 'Bazı bilgiler geçersiz (ör. fiyat veya gram sıfırdan büyük olmalı).'
  if (/failed to fetch|network/i.test(e?.message ?? '')) return 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.'
  if (/mime type|invalid_mime/i.test(e?.message ?? '')) return 'Görsel JPEG, PNG veya WebP olmalı.'
  if (/exceeded the maximum allowed size|payload too large/i.test(e?.message ?? '')) return 'Görsel 5 MB’tan büyük olamaz.'
  return 'İşlem tamamlanamadı. Lütfen tekrar deneyin.'
}
