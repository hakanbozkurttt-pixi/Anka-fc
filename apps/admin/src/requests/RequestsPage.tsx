import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { formatGrams, formatPrice, PRODUCT_SPECIES_LABEL, type ProductSpecies } from '../catalog/model'
import { parseGrams, parsePrice } from '../catalog/rows'
import { fetchAll } from '../lib/fetchAll'
import { supabase } from '../lib/supabase'

type Status = 'pending' | 'approved' | 'rejected'

type RequestRow = {
  id: string
  request_no: number
  message: string
  status: Status
  created_at: string
  decided_at: string | null
  customer: { first_name: string; last_name: string; phone: string } | null
  product: { id: string; brand: string; name: string; species: ProductSpecies; package_grams: number; price_try: number } | null
}

const COLUMNS: string = [
  'id, request_no, message, status, created_at, decided_at',
  'customer:profiles(first_name, last_name, phone)',
  'product:products(id, brand, name, species, package_grams, price_try)',
].join(', ')

const FILTERS: { id: Status; label: string }[] = [
  { id: 'pending', label: 'Değerlendirilecek' },
  { id: 'approved', label: 'Onaylanan' },
  { id: 'rejected', label: 'Reddedilen' },
]

function errorText(e: unknown) {
  const m = (e as { message?: string })?.message ?? ''
  return /Fiyat|sonuçlandırılmış|bulunamadı|yetki/.test(m) ? m : 'İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.'
}

export function RequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([])
  const [filter, setFilter] = useState<Status>('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const client = supabase
    if (!client) return Promise.resolve()
    return fetchAll<RequestRow>((from, to) =>
      client
        .from('product_requests')
        .select(COLUMNS)
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to)
        .overrideTypes<RequestRow[], { merge: false }>(),
    )
      .then((list) => {
        setRows(list.map((r) => ({ ...r, product: r.product ? { ...r.product, price_try: Number(r.product.price_try) } : null })))
        setError(null)
      })
      .catch(() => setError('Talepler yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const count = (s: Status) => rows.filter((r) => r.status === s).length
  const visible = rows.filter((r) => r.status === filter)

  return (
    <>
      <div className="page-head">
        <h1>Katalog dışı ürün talepleri</h1>
        <button type="button" className="secondary" onClick={() => { setLoading(true); load() }}>
          Yenile
        </button>
      </div>
      <p className="muted">
        Müşterinin mesajındaki ürünü uygun görürseniz ürün bilgisini ve <strong>fiyatı</strong> girerek onaylayın.
        Onaylanan ürün kataloğa eklenmez; yalnızca talebi giren müşteri görür, sipariş verebilir ve mama takibine
        ekleyebilir. Bu ürünlerde indirim ve kampanya uygulanmaz. Müşteri sonucu uygulamayı açınca görür.
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
            {f.label} ({count(f.id)})
          </button>
        ))}
      </nav>
      {loading ? <p className="muted">Yükleniyor…</p> : null}
      {error ? <p className="status status-error" role="alert">{error}</p> : null}
      {!loading && visible.length === 0 ? <p className="muted">Bu bölümde talep yok.</p> : null}
      {visible.map((r) => (
        <RequestCard key={r.id} row={r} onChanged={load} />
      ))}
    </>
  )
}

function RequestCard({ row, onChanged }: { row: RequestRow; onChanged: () => Promise<void> | void }) {
  const [approving, setApproving] = useState(false)
  const [brand, setBrand] = useState('')
  const [name, setName] = useState('')
  const [species, setSpecies] = useState<ProductSpecies | ''>('')
  const [grams, setGrams] = useState('')
  const [price, setPrice] = useState('')
  const [newPrice, setNewPrice] = useState(row.product ? row.product.price_try.toFixed(2).replace('.', ',') : '')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function approve(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const g = parseGrams(grams)
    const p = parsePrice(price)
    if (!brand.trim() || !name.trim() || !species) return setError('Marka, ürün adı ve hayvan türünü girin.')
    if (g === null || g < 1 || g > 100000) return setError('Paket ağırlığını gram olarak girin (ör. 2000).')
    if (p === null || p <= 0) return setError('Fiyat girilmeden talep onaylanamaz (ör. 349,90).')
    setBusy(true)
    const { error } = await supabase!.rpc('admin_approve_request', {
      request_id: row.id, brand: brand.trim(), name: name.trim(), species, package_grams: g, price_try: p,
    })
    setBusy(false)
    if (error) return setError(errorText(error))
    await onChanged()
  }

  async function reject() {
    if (!window.confirm(`Talep #${row.request_no} reddedilsin mi?`)) return
    setBusy(true)
    const { error } = await supabase!.rpc('admin_reject_request', { request_id: row.id })
    setBusy(false)
    if (error) return setError(errorText(error))
    await onChanged()
  }

  async function updatePrice() {
    setError(null)
    setInfo(null)
    const p = parsePrice(newPrice)
    if (!row.product || p === null || p <= 0) return setError('Geçerli bir fiyat girin.')
    setBusy(true)
    const { error } = await supabase!.from('products').update({ price_try: p }).eq('id', row.product.id)
    setBusy(false)
    if (error) return setError('Fiyat kaydedilemedi.')
    setInfo('Fiyat güncellendi. Yeni fiyat yalnızca bundan sonraki siparişlere uygulanır.')
    await onChanged()
  }

  return (
    <section className="card" aria-label={`Talep ${row.request_no}`}>
      <div className="card-head">
        <h2>Talep #{row.request_no}</h2>
        <span className="muted">{new Date(row.created_at).toLocaleString('tr-TR')}</span>
      </div>
      <dl className="details">
        <dt>Müşteri</dt>
        <dd>{row.customer ? `${row.customer.first_name} ${row.customer.last_name} · ${row.customer.phone}` : '—'}</dd>
        <dt>Mesaj</dt>
        <dd className="request-message">{row.message}</dd>
        {row.decided_at ? (
          <>
            <dt>Sonuç</dt>
            <dd>
              {row.status === 'approved' ? 'Onaylandı' : 'Reddedildi'} · {new Date(row.decided_at).toLocaleString('tr-TR')}
            </dd>
          </>
        ) : null}
      </dl>
      {error ? <p className="status status-error" role="alert">{error}</p> : null}
      {info ? <p className="status status-ok">{info}</p> : null}

      {row.status === 'pending' && !approving ? (
        <div className="row">
          <button type="button" onClick={() => setApproving(true)} disabled={busy}>Fiyat girerek onayla</button>
          <button type="button" className="secondary" onClick={reject} disabled={busy}>Reddet</button>
        </div>
      ) : null}

      {row.status === 'pending' && approving ? (
        <form className="form" onSubmit={approve} noValidate>
          <div className="grid-3">
            <label>
              Marka
              <input value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={100} />
            </label>
            <label>
              Ürün adı
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
            </label>
            <label>
              Hayvan türü
              <select value={species} onChange={(e) => setSpecies(e.target.value as ProductSpecies)}>
                <option value="">Seçin</option>
                {(Object.keys(PRODUCT_SPECIES_LABEL) as ProductSpecies[]).map((s) => (
                  <option key={s} value={s}>{PRODUCT_SPECIES_LABEL[s]}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid-2">
            <label>
              Paket ağırlığı (gram)
              <input value={grams} onChange={(e) => setGrams(e.target.value)} inputMode="numeric" placeholder="ör. 2000" />
            </label>
            <label>
              Müşteriye özel fiyat (TL)
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="ör. 349,90" />
            </label>
          </div>
          <div className="row">
            <button type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Onayla'}</button>
            <button type="button" className="secondary" onClick={() => setApproving(false)} disabled={busy}>Vazgeç</button>
          </div>
        </form>
      ) : null}

      {row.status === 'approved' && row.product ? (
        <div className="form">
          <p>
            <strong>{row.product.brand} · {row.product.name}</strong> ({PRODUCT_SPECIES_LABEL[row.product.species]},{' '}
            {formatGrams(row.product.package_grams)}) — {formatPrice(row.product.price_try)}
          </p>
          <div className="row">
            <label>
              Fiyatı değiştir (TL)
              <input className="price-input" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} inputMode="decimal" />
            </label>
            <button type="button" className="secondary" onClick={updatePrice} disabled={busy}>Fiyatı kaydet</button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
