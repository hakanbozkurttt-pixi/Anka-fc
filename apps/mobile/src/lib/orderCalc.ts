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

export type CartLine = { unitPrice: number; quantity: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function cartTotals(lines: CartLine[], deliveryType: DeliveryType, shippingFee: number) {
  const items = round2(lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0));
  const shipping = deliveryType === 'address' ? round2(shippingFee) : 0;
  return { items, shipping, total: round2(items + shipping) };
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
