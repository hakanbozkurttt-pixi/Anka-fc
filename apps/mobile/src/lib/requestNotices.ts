// Katalog dışı ürün talebinin sonucu (onay/ret) müşteriye uygulama açılınca gösterilir.

export type RequestRow = {
  id: string;
  request_no: number;
  status: 'pending' | 'approved' | 'rejected';
  decided_at: string | null;
};

export type RequestSeen = Record<string, string>; // talep id → görülen karar zamanı

export type RequestNotice = { requestId: string; title: string; body: string };

/** @param seen null ise bu cihazda ilk kontroldür: eski kararlar için bildirim gösterilmez. */
export function requestNotices(rows: RequestRow[], seen: RequestSeen | null) {
  const next: RequestSeen = {};
  const notices: RequestNotice[] = [];
  for (const r of rows) {
    if (!r.decided_at) continue;
    next[r.id] = r.decided_at;
    if (!seen || seen[r.id] === r.decided_at) continue;
    notices.push(
      r.status === 'approved'
        ? {
            requestId: r.id,
            title: `Talep #${r.request_no}: Onaylandı`,
            body: 'Talep ettiğiniz ürün onaylandı. Artık sipariş verebilir ve mama takibine ekleyebilirsiniz.',
          }
        : {
            requestId: r.id,
            title: `Talep #${r.request_no}: Onaylanmadı`,
            body: 'Talep ettiğiniz ürün onaylanmadı. Bilgi için hastaneyle iletişime geçebilirsiniz.',
          },
    );
  }
  return { notices, seen: next };
}
