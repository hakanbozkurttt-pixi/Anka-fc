export type OrderStatus = 'pending' | 'approved' | 'delivered' | 'cancelled'
export type DeliveryType = 'pickup' | 'address'

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Onay bekliyor',
  approved: 'Onaylandı',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
}

export const DELIVERY_LABEL: Record<DeliveryType, string> = {
  pickup: 'Hastaneden teslim alma',
  address: 'Adrese teslimat',
}

/** Yöneticinin yapabileceği durum değişiklikleri (veritabanı da aynı kuralı uygular). */
export const ADMIN_ACTIONS: Record<OrderStatus, { status: OrderStatus; label: string; danger?: boolean }[]> = {
  pending: [
    { status: 'approved', label: 'Onayla' },
    { status: 'cancelled', label: 'İptal et', danger: true },
  ],
  approved: [
    { status: 'delivered', label: 'Teslim edildi' },
    { status: 'cancelled', label: 'İptal et', danger: true },
  ],
  delivered: [],
  cancelled: [],
}

export const DISCOUNT_LABEL = {
  none: 'İndirim',
  first_order: 'İlk sipariş indirimi',
  standard: 'İndirim',
} as const

export function lineDiscountLabel(i: { discount_source: string; discount_pct: number; campaign_name: string | null }) {
  const pct = `%${String(i.discount_pct).replace('.', ',')}`
  if (i.discount_source === 'campaign') return `Kampanya: ${i.campaign_name ?? ''}${i.discount_pct > 0 ? ` (${pct})` : ''}`
  if (i.discount_source === 'first_order') return `İlk sipariş (${pct})`
  if (i.discount_source === 'standard') return `İndirim (${pct})`
  return '—'
}

export type AdminOrder = {
  id: string
  order_no: number
  status: OrderStatus
  delivery_type: DeliveryType
  delivery_address: string | null
  delivery_date: string | null
  delivery_time: string | null
  discount_kind: 'none' | 'first_order' | 'standard'
  discount_pct: number
  items_list_total_try: number
  discount_total_try: number
  items_total_try: number
  shipping_fee_try: number
  total_try: number
  status_changed_at: string
  status_changed_by: 'customer' | 'admin'
  created_at: string
  customer: { first_name: string; last_name: string; phone: string; email: string } | null
  order_items: {
    id: string
    brand: string
    product_name: string
    package_grams: number
    list_price_try: number
    discount_source: 'none' | 'first_order' | 'standard' | 'campaign'
    discount_pct: number
    campaign_name: string | null
    unit_price_try: number
    quantity: number
    line_total_try: number
  }[]
}

/** Arama: müşteri adı, telefon, sipariş numarası; tarih ayrı filtre. */
export function matchesOrder(o: AdminOrder, query: string, date: string): boolean {
  if (date) {
    const d = new Date(o.created_at)
    const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (local !== date) return false
  }
  const q = query.trim().toLocaleLowerCase('tr-TR')
  if (!q) return true
  const name = `${o.customer?.first_name ?? ''} ${o.customer?.last_name ?? ''}`.toLocaleLowerCase('tr-TR')
  const qDigits = q.replace(/[^0-9]/g, '')
  const phone = (o.customer?.phone ?? '').replace(/[^0-9]/g, '')
  return (
    name.includes(q) ||
    String(o.order_no) === q.replace('#', '') ||
    (qDigits.length >= 3 && phone.includes(qDigits))
  )
}
