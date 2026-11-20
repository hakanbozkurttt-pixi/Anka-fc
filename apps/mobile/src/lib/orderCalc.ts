// Sipariş özeti hesabı (müşteri formu doldururken önizleme için).
// Asıl fiyat ve kargo hesabı veritabanında (place_order) yapılır.

export type DeliveryType = 'pickup' | 'address';

export const DELIVERY_LABEL: Record<DeliveryType, string> = {
  pickup: 'Hastaneden teslim alma',
  address: 'Adrese teslimat',
};

export type OrderStatus = 'pending' | 'approved' | 'delivered' | 'cancelled';

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Onay bekliyor',
  approved: 'Onaylandı',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
};

export type DiscountKind = 'none' | 'first_order' | 'standard';

export const DISCOUNT_LABEL: Record<DiscountKind, string> = {
  none: 'İndirim',
  first_order: 'İlk sipariş indirimi',
  standard: 'İndirim',
};

export type CartLine = { listPrice: number; unitPrice: number; quantity: number };

const toKurus = (tl: number) => Math.round(tl * 100);

/**
 * İndirimli birim fiyat, kuruşa yuvarlanır.
 * Veritabanındaki discounted_price ile aynı kural: round(liste × (100 − oran) / 100, 2)
 */
export function discountedPrice(listPrice: number, pct: number): number {
  return Math.round((toKurus(listPrice) * (100 - pct)) / 100) / 100;
}

export type ActiveCampaign = {
  id: string;
  name: string;
  discount_type: 'percent' | 'fixed_price';
  percent: number | null;
  products: { product_id: string; fixed_price_try: number | null }[];
};

export type PriceSource = 'none' | 'first_order' | 'standard' | 'campaign';

export type BestPrice = { unit: number; source: PriceSource; pct: number; campaignName: string | null };

/**
 * Bir ürün için en avantajlı TEK indirim (indirimler birleşmez).
 * Adaylar: siparişin sabit indirimi (ilk sipariş / sonraki siparişler) ve bugün geçerli kampanyalar.
 * En düşük fiyat seçilir; eşitlikte sabit indirim. Veritabanındaki best_unit_price ile aynı kural.
 */
export function bestUnitPrice(
  productId: string,
  listPrice: number,
  orderKind: DiscountKind,
  orderPct: number,
  campaigns: ActiveCampaign[],
): BestPrice {
  let best: BestPrice = {
    unit: discountedPrice(listPrice, orderPct),
    source: orderPct > 0 ? orderKind : 'none',
    pct: orderPct,
    campaignName: null,
  };
  const sorted = [...campaigns].sort((a, b) => a.name.localeCompare(b.name));
  for (const c of sorted) {
    const cp = c.products.find((p) => p.product_id === productId);
    if (!cp) continue;
    const unit =
      c.discount_type === 'percent'
        ? discountedPrice(listPrice, c.percent ?? 0)
        : Math.min(listPrice, cp.fixed_price_try ?? listPrice);
    if (unit < best.unit) {
      best = { unit, source: 'campaign', pct: c.discount_type === 'percent' ? (c.percent ?? 0) : 0, campaignName: c.name };
    }
  }
  return best;
}

/** Sepet satırında gösterilecek indirim açıklaması */
export function priceSourceLabel(b: { source: PriceSource; pct: number; campaignName: string | null }) {
  const pct = `%${String(b.pct).replace('.', ',')}`;
  if (b.source === 'campaign') return `Kampanya: ${b.campaignName}${b.pct > 0 ? ` (${pct})` : ''}`;
  if (b.source === 'first_order') return `İlk sipariş indirimi (${pct})`;
  if (b.source === 'standard') return `İndirim (${pct})`;
  return '';
}

/**
 * Sipariş özeti. İndirim yalnızca ürünlere uygulanır, kargoya uygulanmaz.
 * Hesap kuruş üzerinden yapılır (ondalık hatası olmasın diye).
 */
export function cartTotals(lines: CartLine[], deliveryType: DeliveryType, shippingFee: number) {
  let listK = 0;
  let itemsK = 0;
  for (const l of lines) {
    listK += toKurus(l.listPrice) * l.quantity;
    itemsK += toKurus(l.unitPrice) * l.quantity;
  }
  const shippingK = deliveryType === 'address' ? toKurus(shippingFee) : 0;
  return {
    list: listK / 100,
    discount: (listK - itemsK) / 100,
    items: itemsK / 100,
    shipping: shippingK / 100,
    total: (itemsK + shippingK) / 100,
  };
}

const tl = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function formatTL(value: number) {
  return `${tl.format(value)} TL`;
}

/** "14:30" / "9:05" → "14:30" / "09:05"; geçersizse null */
export function parseTime(value: string): string | null {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/**
 * Adrese teslimat tarih/saat denetimi (Türkiye saatiyle).
 * @param dateIso  YYYY-AA-GG
 * @param time     SS:DD
 * @param nowLocal Şu anki yerel tarih-saat, "YYYY-AA-GGTSS:DD" biçiminde
 */
export function deliveryTimeError(dateIso: string, time: string, nowLocal: string): string | null {
  if (`${dateIso}T${time}` <= nowLocal) return 'Teslimat tarihi ve saati ileri bir zaman olmalı.';
  const [y, m, d] = nowLocal.slice(0, 10).split('-').map(Number);
  const limit = new Date(Date.UTC(y, m - 1, d + 90)).toISOString().slice(0, 10);
  if (dateIso > limit) return 'Teslimat tarihi en fazla 90 gün sonrası olabilir.';
  return null;
}

export function nowLocalIso(now: Date = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}T${p(now.getHours())}:${p(now.getMinutes())}`;
}
