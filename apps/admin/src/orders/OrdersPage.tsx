import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatPrice } from '../catalog/model'
import { fetchAll } from '../lib/fetchAll'
import { supabase } from '../lib/supabase'
import { ADMIN_ACTIONS, DELIVERY_LABEL, DISCOUNT_LABEL, matchesOrder, STATUS_LABEL, type AdminOrder, type OrderStatus } from './model'

const COLUMNS: string = [
  'id, order_no, status, delivery_type, delivery_address, delivery_date, delivery_time',
  'discount_kind, discount_pct, items_list_total_try, discount_total_try',
  'items_total_try, shipping_fee_try, total_try, status_changed_at, status_changed_by, created_at',
  'customer:profiles(first_name, last_name, phone, email)',
  'order_items(id, brand, product_name, package_grams, list_price_try, unit_price_try, quantity, line_total_try)',
].join(', ')

const FILTERS: { id: OrderStatus | 'all'; label: string }[] = [
  { id: 'pending', label: 'Onay bekliyor' },
  { id: 'approved', label: 'Onaylandı' },
  { id: 'delivered', label: 'Teslim edildi' },
  { id: 'cancelled', label: 'İptal edildi' },
  { id: 'all', label: 'Tümü' },
]

function dateTr(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function errorMessage(e: unknown) {
  const m = (e as { message?: string })?.message ?? ''
  if (/yapılamaz|bulunamadı|yetkisi/.test(m)) return m
  return 'İşlem tamamlanamadı. Sayfayı yenileyip tekrar deneyin.'
}

export function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<OrderStatus | 'all'>('pending')
  const [query, setQuery] = useState('')
  const [date, setDate] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    const client = supabase
    if (!client) return Promise.resolve()
    return fetchAll<AdminOrder>((from, to) =>
      client
        .from('orders')
        .select(COLUMNS)
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to)
        .overrideTypes<AdminOrder[], { merge: false }>(),
    )
      .then((list) => {
        setOrders(
          list.map((o) => ({
            ...o,
            discount_pct: Number(o.discount_pct),
            items_list_total_try: Number(o.items_list_total_try),
            discount_total_try: Number(o.discount_total_try),
            items_total_try: Number(o.items_total_try),
            shipping_fee_try: Number(o.shipping_fee_try),
            total_try: Number(o.total_try),
            order_items: o.order_items.map((i) => ({
              ...i,
              list_price_try: Number(i.list_price_try),
              unit_price_try: Number(i.unit_price_try),
              line_total_try: Number(i.line_total_try),
            })),
          })),
        )
        setError(null)
      })
      .catch(() => setError('Siparişler yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [orders])

  const visible = orders.filter((o) => (filter === 'all' || o.status === filter) && matchesOrder(o, query, date))

  async function setStatus(o: AdminOrder, status: OrderStatus, label: string) {
    if (!window.confirm(`Sipariş #${o.order_no}: "${label}" işlemi yapılsın mı?`)) return
    setBusyId(o.id)
    setError(null)
    const { error } = await supabase!.rpc('admin_set_order_status', { order_id: o.id, new_status: status })
    if (error) setError(errorMessage(error))
    await load()
    setBusyId(null)
  }

  return (
    <>
      <div className="page-head">
        <h1>Siparişler</h1>
        <button type="button" className="secondary" onClick={() => { setLoading(true); load() }}>
          Yenile
        </button>
      </div>
      <p className="muted">
        Yeni sipariş geldiğinde bildirim gönderilmez; bu sayfayı açıp “Yenile” ile kontrol edin. Katalogdaki tüm
        ürünler stokta kabul edilir. Müşteri, durum değişikliğini uygulamayı açtığında görür.
      </p>

      <nav className="row status-filters" aria-label="Durum">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={filter === f.id ? 'chip active' : 'chip'}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label} ({counts[f.id] ?? 0})
          </button>
        ))}
      </nav>

      <div className="filters orders-filters">
        <input
          type="search"
          placeholder="Müşteri adı, telefon veya sipariş no"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Sipariş ara"
        />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Sipariş tarihi" />
        {date ? (
          <button type="button" className="link-button" onClick={() => setDate('')}>
            Tarihi temizle
          </button>
        ) : null}
      </div>

      {loading ? <p className="muted">Yükleniyor…</p> : null}
      {error ? <p className="status status-error" role="alert">{error}</p> : null}
      {!loading && visible.length === 0 ? <p className="muted">Bu filtrede sipariş yok.</p> : null}

      {visible.map((o) => (
        <section key={o.id} className="card order-card" aria-label={`Sipariş ${o.order_no}`}>
          <div className="card-head">
            <h2>
              Sipariş #{o.order_no}{' '}
              <span className={`badge status-${o.status}`}>{STATUS_LABEL[o.status]}</span>
            </h2>
            <span className="muted">{new Date(o.created_at).toLocaleString('tr-TR')}</span>
          </div>
          <dl className="details">
            <dt>Müşteri</dt>
            <dd>
              {o.customer ? `${o.customer.first_name} ${o.customer.last_name} · ${o.customer.phone}` : '—'}
            </dd>
            <dt>Teslimat</dt>
            <dd>
              {DELIVERY_LABEL[o.delivery_type]}
              {o.delivery_type === 'address'
                ? ` — ${o.delivery_date ? dateTr(o.delivery_date) : ''} saat ${o.delivery_time?.slice(0, 5) ?? ''}\n${o.delivery_address ?? ''}`
                : ''}
            </dd>
          </dl>
          <table className="table">
            <thead>
              <tr>
                <th>Ürün</th>
                <th className="num">Adet</th>
                <th className="num">Liste fiyatı</th>
                <th className="num">İndirimli fiyat</th>
                <th className="num">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {o.order_items.map((i) => (
                <tr key={i.id}>
                  <td>
                    {i.brand} · {i.product_name} <span className="muted small">({i.package_grams} g)</span>
                  </td>
                  <td className="num">{i.quantity}</td>
                  <td className="num">{formatPrice(i.list_price_try)}</td>
                  <td className="num">{formatPrice(i.unit_price_try)}</td>
                  <td className="num">{formatPrice(i.line_total_try)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {o.discount_total_try > 0 ? (
                <>
                  <tr>
                    <td colSpan={4}>Liste fiyatıyla</td>
                    <td className="num">{formatPrice(o.items_list_total_try)}</td>
                  </tr>
                  <tr className="discount">
                    <td colSpan={4}>
                      {DISCOUNT_LABEL[o.discount_kind]} (%{String(o.discount_pct).replace('.', ',')})
                    </td>
                    <td className="num">−{formatPrice(o.discount_total_try)}</td>
                  </tr>
                </>
              ) : null}
              <tr>
                <td colSpan={4}>Ürünler</td>
                <td className="num">{formatPrice(o.items_total_try)}</td>
              </tr>
              <tr>
                <td colSpan={4}>Kargo</td>
                <td className="num">{o.shipping_fee_try > 0 ? formatPrice(o.shipping_fee_try) : 'Yok'}</td>
              </tr>
              <tr className="total">
                <td colSpan={4}>Toplam</td>
                <td className="num">{formatPrice(o.total_try)}</td>
              </tr>
            </tfoot>
          </table>
          {o.status === 'delivered' || o.status === 'cancelled' ? (
            <p className="muted small">
              {STATUS_LABEL[o.status]}: {new Date(o.status_changed_at).toLocaleString('tr-TR')} (
              {o.status_changed_by === 'customer' ? 'müşteri' : 'hastane'})
            </p>
          ) : null}
          {ADMIN_ACTIONS[o.status].length > 0 ? (
            <div className="row">
              {ADMIN_ACTIONS[o.status].map((a) => (
                <button
                  key={a.status}
                  type="button"
                  className={a.danger ? 'secondary' : ''}
                  disabled={busyId === o.id}
                  onClick={() => setStatus(o, a.status, a.label)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </>
  )
}
