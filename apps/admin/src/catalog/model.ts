// Katalog veri tipleri ve sabitler.
// Not: Katalogda stok ve günlük tüketim bilgisi yoktur (gereksinim kararı).

export const BRANDS = ['Proplan', "Hill's", 'Royal Canin', 'Virbac', 'Carni'] as const
export type Brand = (typeof BRANDS)[number]

export type ProductSpecies = 'cat' | 'dog' | 'both'
export const PRODUCT_SPECIES_LABEL: Record<ProductSpecies, string> = {
  cat: 'Kedi',
  dog: 'Köpek',
  both: 'Her ikisi',
}

export type Product = {
  id: string
  brand: Brand
  name: string
  species: ProductSpecies
  series: string | null
  flavor: string | null
  age_group: string | null
  package_grams: number
  price_try: number
  code: string | null
  description: string | null
  image_path: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Kaydedilecek ürün bilgisi (görsel ayrıca yüklenir). */
export type ProductInput = Pick<
  Product,
  | 'brand'
  | 'name'
  | 'species'
  | 'series'
  | 'flavor'
  | 'age_group'
  | 'package_grams'
  | 'price_try'
  | 'code'
  | 'description'
  | 'is_active'
>

const tl = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const int = new Intl.NumberFormat('tr-TR')

export function formatPrice(value: number) {
  return `${tl.format(value)} TL`
}

export function formatGrams(grams: number) {
  return `${int.format(grams)} g`
}

/** Barkod/ürün kodunu karşılaştırma için sadeleştirir. */
export function codeKey(code: string | null | undefined) {
  return code ? code.trim().toLocaleLowerCase('tr-TR') : ''
}

/** Aynı ürünü barkod olmadan tanımak için: marka + ad + paket. */
export function productKey(p: { brand: string; name: string; package_grams: number }) {
  return `${p.brand}|${p.name.trim().toLocaleLowerCase('tr-TR')}|${p.package_grams}`
}
