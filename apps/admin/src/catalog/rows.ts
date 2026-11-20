// Toplu yükleme: dosya satırlarını okuma, denetleme ve önizleme hazırlama.
// Bu dosya tarayıcıya veya veritabanına bağlı değildir; testlerle denetlenir.

import {
  BRANDS,
  codeKey,
  PRODUCT_SPECIES_LABEL,
  productKey,
  type Brand,
  type Product,
  type ProductInput,
  type ProductSpecies,
} from './model.ts'

export type ColumnKey =
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

export type Column = {
  key: ColumnKey
  header: string
  required: boolean
  help: string
  example: string
}

// Şablondaki sütunlar. Sıra ve başlıklar şablonla aynıdır.
export const COLUMNS: Column[] = [
  { key: 'brand', header: 'Marka', required: true, help: "Şunlardan biri: Proplan, Hill's, Royal Canin, Virbac, Carni.", example: 'Proplan' },
  { key: 'name', header: 'Ürün adı', required: true, help: 'Ürünün paketteki tam adı.', example: 'ÖRNEK — içe aktarmadan önce silin' },
  { key: 'species', header: 'Hayvan türü', required: true, help: 'Kedi, Köpek veya Her ikisi.', example: 'Kedi' },
  { key: 'series', header: 'Seri', required: false, help: 'İsteğe bağlı. Ürünün ait olduğu seri.', example: '' },
  { key: 'flavor', header: 'İçerik / tat', required: false, help: 'İsteğe bağlı. Ör. ana içerik veya tat.', example: '' },
  { key: 'age_group', header: 'Yaş grubu', required: false, help: 'İsteğe bağlı. Ör. yavru, yetişkin.', example: '' },
  { key: 'package_grams', header: 'Paket ağırlığı (gram)', required: true, help: 'Yalnızca gram, tam sayı. 1,5 kg için 1500 yazın.', example: '1500' },
  { key: 'price_try', header: 'Satış fiyatı (TL)', required: true, help: 'Kuruş için virgül kullanın. Ör. 1249,90. "TL" yazmanız gerekmez.', example: '100,00' },
  { key: 'code', header: 'Barkod / ürün kodu', required: false, help: 'Varsa. Her ürün için farklı olmalı. Aynı kod katalogda varsa o ürün güncellenir (onayınızla).', example: 'ÖRNEK-0001' },
  { key: 'description', header: 'Açıklama', required: false, help: 'İsteğe bağlı. Müşterinin göreceği kısa açıklama.', example: '' },
  { key: 'is_active', header: 'Aktif', required: false, help: 'Evet veya Hayır. Boş bırakılırsa Evet sayılır. Hayır olan ürünü müşteriler görmez.', example: 'Evet' },
]

export const EXAMPLE_MARKER = 'ÖRNEK — içe aktarmadan önce silin'

export type RawRow = { rowNumber: number; cells: Partial<Record<ColumnKey, string | number | null>> }

// ---------------------------------------------------------------------
// Başlık eşleştirme
// ---------------------------------------------------------------------

function simplify(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[’‘`´']/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Dosyanın başlık satırını sütunlarla eşleştirir.
 * Büyük/küçük harf, boşluk ve noktalama farkları önemsenmez.
 */
export function matchHeaders(headers: string[]) {
  const map = new Map<number, ColumnKey>()
  const byHeader = new Map(COLUMNS.map((c) => [simplify(c.header), c.key]))
  const unknown: string[] = []
  headers.forEach((h, i) => {
    const key = byHeader.get(simplify(String(h ?? '')))
    if (key && ![...map.values()].includes(key)) map.set(i, key)
    else if (String(h ?? '').trim()) unknown.push(String(h).trim())
  })
  const found = new Set(map.values())
  const missing = COLUMNS.filter((c) => c.required && !found.has(c.key)).map((c) => c.header)
  return { map, missing, unknown }
}

// ---------------------------------------------------------------------
// Değer okuma
// ---------------------------------------------------------------------

function text(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toFixed(0) : String(value)
  }
  return String(value).trim()
}

export function parseBrand(value: unknown): Brand | null {
  const v = simplify(text(value))
  if (!v) return null
  const aliases: Record<string, Brand> = { proplan: 'Proplan', purinaproplan: 'Proplan' }
  if (aliases[v]) return aliases[v]
  return BRANDS.find((b) => simplify(b) === v) ?? null
}

export function parseSpecies(value: unknown): ProductSpecies | null {
  const v = simplify(text(value))
  if (!v) return null
  if (v === 'kedi') return 'cat'
  if (v === 'kopek') return 'dog'
  if (['herikisi', 'ikisi', 'kedivekopek', 'kedikopek', 'hepsi'].includes(v)) return 'both'
  return null
}

/** Gram: tam sayı. "1500", "1.500" kabul; "1,5" (kg) reddedilir. */
export function parseGrams(value: unknown): number | null {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : null
  const v = text(value).replace(/\s/g, '').replace(/(gr|g|gram)$/i, '')
  if (/^\d+$/.test(v)) return Number(v)
  if (/^\d{1,3}(\.\d{3})+$/.test(v)) return Number(v.replace(/\./g, ''))
  return null
}

/**
 * Fiyat (TL). Türkçe yazımla: "1249,90", "1.249,90", "1249".
 * "1249.90" gibi tek noktalı ve 1-2 haneli kuruşlu yazım da kabul edilir.
 */
export function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
  let v = text(value).replace(/\s/g, '').replace(/(tl|₺)$/i, '').replace(/^₺/, '')
  if (!v) return null
  if (v.includes(',')) {
    if (!/^\d{1,3}(\.\d{3})*,\d{1,2}$|^\d+,\d{1,2}$/.test(v)) return null
    v = v.replace(/\./g, '').replace(',', '.')
  } else if (/^\d{1,3}(\.\d{3})+$/.test(v)) {
    v = v.replace(/\./g, '')
  } else if (!/^\d+(\.\d{1,2})?$/.test(v)) {
    return null
  }
  return Math.round(Number(v) * 100) / 100
}

export function parseActive(value: unknown): boolean | null {
  const v = simplify(text(value))
  if (!v) return true
  if (['evet', 'e', 'aktif', 'var', '1', 'true'].includes(v)) return true
  if (['hayir', 'h', 'pasif', 'yok', '0', 'false'].includes(v)) return false
  return null
}

// ---------------------------------------------------------------------
// Önizleme
// ---------------------------------------------------------------------

export type FieldChange = { field: string; before: string; after: string }

export type PreviewRow = {
  rowNumber: number
  status: 'new' | 'update' | 'error'
  product: ProductInput | null
  /** Güncellenecek mevcut ürün */
  existing?: Product
  changes: FieldChange[]
  errors: string[]
  warnings: string[]
  /** Hata durumunda tabloda göstermek için dosyadaki ham değerler */
  raw: Partial<Record<ColumnKey, string>>
}

export type Preview = {
  rows: PreviewRow[]
  counts: { total: number; new: number; update: number; error: number; unchanged: number }
}

const LIMITS: Partial<Record<ColumnKey, number>> = {
  name: 200,
  series: 100,
  flavor: 100,
  age_group: 100,
  code: 64,
  description: 2000,
}

function describe(p: ProductInput): Record<string, string> {
  return {
    Marka: p.brand,
    'Ürün adı': p.name,
    'Hayvan türü': PRODUCT_SPECIES_LABEL[p.species],
    Seri: p.series ?? '',
    'İçerik / tat': p.flavor ?? '',
    'Yaş grubu': p.age_group ?? '',
    'Paket ağırlığı (gram)': String(p.package_grams),
    'Satış fiyatı (TL)': p.price_try.toFixed(2).replace('.', ','),
    'Barkod / ürün kodu': p.code ?? '',
    Açıklama: p.description ?? '',
    Aktif: p.is_active ? 'Evet' : 'Hayır',
  }
}

export function diffProducts(before: ProductInput, after: ProductInput): FieldChange[] {
  const a = describe(before)
  const b = describe(after)
  return Object.keys(a)
    .filter((k) => a[k] !== b[k])
    .map((k) => ({ field: k, before: a[k], after: b[k] }))
}

function validateRow(row: RawRow): { product: ProductInput | null; errors: string[]; raw: PreviewRow['raw'] } {
  const c = row.cells
  const raw = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, text(v)])) as PreviewRow['raw']
  const errors: string[] = []

  if (Object.values(raw).some((v) => v && v.includes('ÖRNEK') && /sil/i.test(v)) || raw.name === EXAMPLE_MARKER) {
    errors.push('Bu, şablondaki örnek satırdır. İçe aktarmadan önce silin.')
  }

  const brand = parseBrand(c.brand)
  if (!raw.brand) errors.push('Marka boş.')
  else if (!brand) errors.push(`Marka tanınmadı: "${raw.brand}". Proplan, Hill's, Royal Canin, Virbac veya Carni yazın.`)

  if (!raw.name) errors.push('Ürün adı boş.')

  const species = parseSpecies(c.species)
  if (!raw.species) errors.push('Hayvan türü boş.')
  else if (!species) errors.push(`Hayvan türü tanınmadı: "${raw.species}". Kedi, Köpek veya Her ikisi yazın.`)

  const grams = parseGrams(c.package_grams)
  if (!raw.package_grams) errors.push('Paket ağırlığı boş.')
  else if (grams === null) errors.push(`Paket ağırlığı gram olarak tam sayı olmalı: "${raw.package_grams}". Ör. 1,5 kg için 1500.`)
  else if (grams < 1 || grams > 100000) errors.push('Paket ağırlığı 1 ile 100.000 gram arasında olmalı.')

  const price = parsePrice(c.price_try)
  if (!raw.price_try) errors.push('Satış fiyatı boş.')
  else if (price === null) errors.push(`Satış fiyatı okunamadı: "${raw.price_try}". Ör. 1249,90 yazın.`)
  else if (price <= 0) errors.push('Satış fiyatı sıfırdan büyük olmalı.')
  else if (price >= 1000000) errors.push('Satış fiyatı çok yüksek.')

  const active = parseActive(c.is_active)
  if (active === null) errors.push(`Aktif sütunu okunamadı: "${raw.is_active}". Evet veya Hayır yazın.`)

  for (const col of COLUMNS) {
    const limit = LIMITS[col.key]
    const v = raw[col.key]
    if (limit && v && v.length > limit) errors.push(`${col.header} en fazla ${limit} karakter olabilir.`)
  }

  if (errors.length > 0 || !brand || !species || grams === null || price === null || active === null) {
    return { product: null, errors, raw }
  }

  return {
    product: {
      brand,
      name: raw.name!,
      species,
      series: raw.series || null,
      flavor: raw.flavor || null,
      age_group: raw.age_group || null,
      package_grams: grams,
      price_try: price,
      code: raw.code || null,
      description: raw.description || null,
      is_active: active,
    },
    errors,
    raw,
  }
}

function isEmptyRow(row: RawRow) {
  return Object.values(row.cells).every((v) => text(v) === '')
}

/**
 * Dosya satırlarını denetler ve önizleme oluşturur.
 * - Hatalı satır varsa içe aktarma yapılmamalıdır.
 * - Barkodu katalogda zaten olan satır "güncellenecek" olarak işaretlenir.
 */
export function buildPreview(rawRows: RawRow[], existing: Product[]): Preview {
  const byCode = new Map(existing.filter((p) => p.code).map((p) => [codeKey(p.code), p]))
  const byKey = new Map(existing.map((p) => [productKey(p), p]))

  const rows: PreviewRow[] = rawRows
    .filter((r) => !isEmptyRow(r))
    .map((r) => {
      const { product, errors, raw } = validateRow(r)
      return { rowNumber: r.rowNumber, status: 'new', product, changes: [], errors, warnings: [], raw }
    })

  // Dosya içinde aynı barkod
  const codeRows = new Map<string, number[]>()
  for (const row of rows) {
    const key = codeKey(row.raw.code)
    if (key) codeRows.set(key, [...(codeRows.get(key) ?? []), row.rowNumber])
  }
  // Dosya içinde barkodsuz aynı ürün (marka + ad + paket)
  const productRows = new Map<string, number[]>()
  for (const row of rows) {
    if (row.product && !row.product.code) {
      const key = productKey(row.product)
      productRows.set(key, [...(productRows.get(key) ?? []), row.rowNumber])
    }
  }

  for (const row of rows) {
    const key = codeKey(row.raw.code)
    const sameCode = key ? codeRows.get(key)! : []
    if (sameCode.length > 1) {
      const others = sameCode.filter((n) => n !== row.rowNumber).join(', ')
      row.errors.push(`Mükerrer barkod/ürün kodu: "${row.raw.code}" dosyada ${others}. satırda da var. Her ürünün kodu farklı olmalı.`)
    }

    if (row.product) {
      const match = key ? byCode.get(key) : undefined
      if (match) {
        row.existing = match
        row.changes = diffProducts(match, row.product)
        row.warnings.push(
          row.changes.length
            ? `Bu barkod/ürün kodu katalogda zaten kayıtlı ("${match.name}"). Onaylarsanız bu ürün güncellenecek.`
            : `Bu barkod/ürün kodu katalogda zaten kayıtlı ("${match.name}") ve bilgiler aynı; değişiklik yapılmayacak.`,
        )
      } else if (!row.product.code) {
        const similar = byKey.get(productKey(row.product))
        if (similar) {
          row.warnings.push(
            'Aynı marka, ad ve paket ağırlığında bir ürün katalogda zaten var. Barkod olmadığı için yeni ürün olarak eklenecek; mükerrer olmadığından emin olun.',
          )
        }
        const same = productRows.get(productKey(row.product)) ?? []
        if (same.length > 1) {
          const others = same.filter((n) => n !== row.rowNumber).join(', ')
          row.warnings.push(`Aynı marka, ad ve paket ağırlığı dosyada ${others}. satırda da var.`)
        }
      }
    }

    row.status = row.errors.length > 0 ? 'error' : row.existing ? 'update' : 'new'
  }

  const counts = {
    total: rows.length,
    new: rows.filter((r) => r.status === 'new').length,
    update: rows.filter((r) => r.status === 'update' && r.changes.length > 0).length,
    unchanged: rows.filter((r) => r.status === 'update' && r.changes.length === 0).length,
    error: rows.filter((r) => r.status === 'error').length,
  }
  return { rows, counts }
}

/** Veritabanına gönderilecek satırlar (değişmeyen mevcut ürünler hariç). */
export function rowsToImport(preview: Preview) {
  return preview.rows
    .filter((r) => r.product && (r.status === 'new' || (r.status === 'update' && r.changes.length > 0)))
    .map((r) => ({ ...r.product!, id: r.status === 'update' ? r.existing!.id : null }))
}
