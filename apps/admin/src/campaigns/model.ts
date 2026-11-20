// Kampanya kuralları (panel tarafı). Asıl hesap veritabanındadır.

export type DiscountType = 'percent' | 'fixed_price'

export type Campaign = {
  id: string
  name: string
  discount_type: DiscountType
  percent: number | null
  start_date: string
  end_date: string
  products: { product_id: string; fixed_price_try: number | null }[]
}

export type CampaignStatus = 'active' | 'upcoming' | 'ended'

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  active: 'Devam ediyor',
  upcoming: 'Başlayacak',
  ended: 'Bitti',
}

/** Türkiye saatine göre bugün (YYYY-AA-GG) */
export function todayTr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(now)
}

/** Başlangıç ve bitiş günleri dahil */
export function campaignStatus(start: string, end: string, today: string): CampaignStatus {
  if (today < start) return 'upcoming'
  if (today > end) return 'ended'
  return 'active'
}

/** İndirimli fiyat (veritabanıyla aynı yuvarlama) */
export function discountedPrice(list: number, pct: number) {
  return Math.round((Math.round(list * 100) * (100 - pct)) / 100) / 100
}

export type CampaignForm = {
  name: string
  type: DiscountType
  percent: number | null
  start: string
  end: string
  items: { productId: string; listPrice: number; fixedPrice: number | null }[]
}

/** Kaydetmeden önce denetim; hatalar ve kaydı engellemeyen uyarılar döner. */
export function validateCampaign(f: CampaignForm, standardPct: number) {
  const errors: string[] = []
  const warnings: string[] = []
  if (!f.name.trim()) errors.push('Kampanya adını girin.')
  if (!f.start || !f.end) errors.push('Başlangıç ve bitiş tarihlerini girin.')
  else if (f.end < f.start) errors.push('Bitiş tarihi başlangıçtan önce olamaz.')
  if (f.items.length === 0) errors.push('Kampanyaya en az bir ürün ekleyin.')
  if (f.type === 'percent') {
    if (f.percent === null || f.percent <= 0 || f.percent > 90) errors.push('İndirim yüzdesi 0 ile 90 arasında olmalı.')
    else if (f.percent <= standardPct)
      warnings.push(
        `Kampanya oranı (%${f.percent}) sabit indirimden (%${standardPct}) yüksek değil. İndirimler birleşmediği için müşteriler zaten sabit indirimi alır; kampanya fark yaratmaz.`,
      )
  } else {
    for (const it of f.items) {
      if (it.fixedPrice === null || it.fixedPrice <= 0) {
        errors.push('Sabit fiyatlı kampanyada her ürün için kampanya fiyatı girin.')
        break
      }
    }
    const notCheaper = f.items.filter(
      (it) => it.fixedPrice !== null && it.fixedPrice > 0 && it.fixedPrice >= discountedPrice(it.listPrice, standardPct),
    )
    if (notCheaper.length > 0)
      warnings.push(
        `${notCheaper.length} üründe kampanya fiyatı, %${standardPct} sabit indirimli fiyattan düşük değil; bu ürünlerde müşteriler sabit indirimi alır.`,
      )
  }
  return { errors, warnings }
}
