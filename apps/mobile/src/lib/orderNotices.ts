// Sipariş durumu bildirimleri: uygulama açılınca, son bakıştan sonra
// HASTANE tarafından yapılan durum değişiklikleri müşteriye gösterilir.
// (Müşterinin kendi yaptığı iptal veya "Teslim aldım" için bildirim gösterilmez.)

import { STATUS_LABEL, type OrderStatus } from './orderCalc.ts';

export type OrderStatusRow = {
  id: string;
  order_no: number;
  status: OrderStatus;
  status_changed_at: string;
  status_changed_by: 'customer' | 'admin';
};

/** sipariş id → en son görülen durum değişikliği zamanı */
export type SeenMap = Record<string, string>;

export type OrderNotice = { orderId: string; title: string; body: string };

const BODY: Partial<Record<OrderStatus, string>> = {
  approved: 'Siparişiniz onaylandı.',
  cancelled: 'Siparişiniz hastane tarafından iptal edildi. Bilgi için hastaneyle iletişime geçebilirsiniz.',
  delivered: 'Siparişiniz teslim edildi olarak işaretlendi. Yeni paketi kullanmaya başladıysanız uygulamada belirtebilirsiniz.',
};

/**
 * @param seen null ise bu cihazda ilk kontroldür: eski değişiklikler için bildirim gösterilmez.
 * @returns gösterilecek bildirimler ve güncellenmiş "görüldü" kaydı
 */
export function orderNotices(rows: OrderStatusRow[], seen: SeenMap | null): { notices: OrderNotice[]; seen: SeenMap } {
  const next: SeenMap = {};
  const notices: OrderNotice[] = [];
  for (const r of rows) {
    next[r.id] = r.status_changed_at;
    if (!seen) continue;
    const before = seen[r.id];
    const changed = before === undefined ? r.status !== 'pending' : r.status_changed_at > before;
    if (changed && r.status_changed_by === 'admin' && BODY[r.status]) {
      notices.push({
        orderId: r.id,
        title: `Sipariş #${r.order_no}: ${STATUS_LABEL[r.status]}`,
        body: BODY[r.status]!,
      });
    }
  }
  return { notices, seen: next };
}
