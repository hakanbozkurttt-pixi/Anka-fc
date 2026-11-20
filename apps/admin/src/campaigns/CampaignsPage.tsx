import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { listProducts } from '../catalog/api'
import { formatGrams, formatPrice, type Product } from '../catalog/model'
import { parsePrice } from '../catalog/rows'
import { supabase } from '../lib/supabase'
import {
  campaignStatus,
  discountedPrice,
  STATUS_LABEL,
  todayTr,
  validateCampaign,
  type Campaign,
  type DiscountType,
} from './model'

function dateTr(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

type Editing = { campaign: Campaign | null }

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [standardPct, setStandardPct] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing | null>(null)
  const today = todayTr()

  const load = useCallback(() => {
    const client = supabase
    if (!client) return Promise.resolve()
    return Promise.all([
      client
        .from('campaigns')
        .select('id, name, discount_type, percent, start_date, end_date, products:campaign_products(product_id, fixed_price_try)')
        .order('start_date', { ascending: false }),
      listProducts(),
      client.from('app_settings').select('standard_discount_pct').single(),
    ])
      .then(([c, p, s]) => {
        if (c.error) throw c.error
        setCampaigns(
          (c.data ?? []).map((x) => ({
            ...(x as unknown as Campaign),
            percent: x.percent == null ? null : Number(x.percent),
            products: ((x.products ?? []) as { product_id: string; fixed_price_try: unknown }[]).map((i) => ({
              product_id: i.product_id,
              fixed_price_try: i.fixed_price_try == null ? null : Number(i.fixed_price_try),
            })),
          })),
        )
        setProducts(p)
        if (s.data) setStandardPct(Number(s.data.standard_discount_pct))
        setError(null)
      })
      .catch(() => setError('Kampanyalar yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  async function remove(c: Campaign) {
    if (!window.confirm(`"${c.name}" kampanyası silinsin mi? Verilmiş siparişlerin fiyatı değişmez.`)) return
    const { error } = await supabase!.from('campaigns').delete().eq('id', c.id)
    if (error) setError('Kampanya silinemedi.')
    await load()
  }

  if (editing) {
    return (
      <CampaignForm
        campaign={editing.campaign}
        products={products}
        standardPct={standardPct}
        onCancel={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null)
          await load()
        }}
      />
    )
  }

  return (
    <>
      <div className="page-head">
        <h1>Kampanyalar</h1>
        <button type="button" onClick={() => setEditing({ campaign: null })}>
          Yeni kampanya
        </button>
      </div>
      <p className="muted">
        Kampanya, başlangıç ve bitiş günleri dahil geçerlidir. Aynı üründe sabit indirim (ilk sipariş / sonraki
        siparişler) ile kampanya birlikte geçerliyse müşteriye <strong>daha avantajlı olan tek indirim</strong>{' '}
        uygulanır; indirimler birleşmez. Verilmiş siparişlerin fiyatı kampanya değişse de değişmez.
      </p>
      {loading ? <p className="muted">Yükleniyor…</p> : null}
      {error ? <p className="status status-error" role="alert">{error}</p> : null}
      {!loading && campaigns.length === 0 ? <p className="muted">Henüz kampanya yok.</p> : null}

      {campaigns.map((c) => {
        const status = campaignStatus(c.start_date, c.end_date, today)
        return (
          <section key={c.id} className="card" aria-label={c.name}>
            <div className="card-head">
              <h2>
                {c.name} <span className={`badge campaign-${status}`}>{STATUS_LABEL[status]}</span>
              </h2>
              <span className="muted">
                {dateTr(c.start_date)} – {dateTr(c.end_date)}
              </span>
            </div>
            <p>
              {c.discount_type === 'percent' ? `%${String(c.percent).replace('.', ',')} indirim` : 'Sabit fiyat'} ·{' '}
              {c.products.length} ürün
            </p>
            <ul className="pets">
              {c.products.map((cp) => {
                const p = productById.get(cp.product_id)
                if (!p) return null
                const price =
                  c.discount_type === 'percent' ? discountedPrice(p.price_try, c.percent ?? 0) : (cp.fixed_price_try ?? p.price_try)
                return (
                  <li key={cp.product_id}>
                    {p.brand} · {p.name} ({formatGrams(p.package_grams)}) —{' '}
                    <s className="muted">{formatPrice(p.price_try)}</s> {formatPrice(price)}
                    {!p.is_active ? <span className="muted"> (ürün pasif)</span> : null}
                  </li>
                )
              })}
            </ul>
            <div className="row">
              <button type="button" className="secondary" onClick={() => setEditing({ campaign: c })}>
                Düzenle
              </button>
              <button type="button" className="link-button" onClick={() => remove(c)}>
                Sil
              </button>
            </div>
          </section>
        )
      })}
    </>
  )
}

type FormProps = {
  campaign: Campaign | null
  products: Product[]
  standardPct: number
  onCancel: () => void
  onSaved: () => void
}

function CampaignForm({ campaign, products, standardPct, onCancel, onSaved }: FormProps) {
  const [name, setName] = useState(campaign?.name ?? '')
  const [type, setType] = useState<DiscountType>(campaign?.discount_type ?? 'percent')
  const [percent, setPercent] = useState(campaign?.percent != null ? String(campaign.percent).replace('.', ',') : '')
  const [start, setStart] = useState(campaign?.start_date ?? '')
  const [end, setEnd] = useState(campaign?.end_date ?? '')
  const [selected, setSelected] = useState<Map<string, string>>(
    () =>
      new Map(
        (campaign?.products ?? []).map((p) => [
          p.product_id,
          p.fixed_price_try != null ? p.fixed_price_try.toFixed(2).replace('.', ',') : '',
        ]),
      ),
  )
  const [query, setQuery] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR')
    return products.filter(
      (p) =>
        (p.is_active || selected.has(p.id)) &&
        (!q || [p.brand, p.name, p.code, p.series].some((v) => v?.toLocaleLowerCase('tr-TR').includes(q))),
    )
  }, [products, query, selected])

  const toggle = (id: string) =>
    setSelected((m) => {
      const next = new Map(m)
      if (next.has(id)) next.delete(id)
      else next.set(id, '')
      return next
    })

  const pct = percent.trim() ? Number(percent.trim().replace(',', '.')) : null
  const formValue = () => ({
    name,
    type,
    percent: pct !== null && Number.isFinite(pct) ? pct : null,
    start,
    end,
    items: [...selected.entries()].map(([id, price]) => ({
      productId: id,
      listPrice: products.find((p) => p.id === id)?.price_try ?? 0,
      fixedPrice: price.trim() ? parsePrice(price) : null,
    })),
  })

  async function save(event: FormEvent) {
    event.preventDefault()
    const f = formValue()
    const v = validateCampaign(f, standardPct)
    setErrors(v.errors)
    setWarnings(v.warnings)
    if (v.errors.length > 0) return
    if (v.warnings.length > 0 && !window.confirm(`${v.warnings.join('\n\n')}\n\nYine de kaydedilsin mi?`)) return
    setSaving(true)
    const { error } = await supabase!.rpc('admin_save_campaign', {
      campaign_id: campaign?.id ?? null,
      name: f.name,
      discount_type: f.type,
      percent: f.type === 'percent' ? f.percent : null,
      start_date: f.start,
      end_date: f.end,
      products: f.items.map((i) => ({ product_id: i.productId, fixed_price_try: f.type === 'fixed_price' ? i.fixedPrice : null })),
    })
    setSaving(false)
    if (error) {
      setErrors([/kampanya|ürün|yüzde|fiyat/i.test(error.message) ? error.message : 'Kampanya kaydedilemedi. Bilgileri kontrol edin.'])
      return
    }
    onSaved()
  }

  return (
    <form className="card form campaign-form" onSubmit={save} noValidate>
      <h2>{campaign ? 'Kampanyayı düzenle' : 'Yeni kampanya'}</h2>
      {errors.map((e) => (
        <p key={e} className="status status-error" role="alert">{e}</p>
      ))}
      {warnings.map((w) => (
        <p key={w} className="status">{w}</p>
      ))}
      <label>
        Kampanya adı
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="ör. Aralık kampanyası" />
      </label>
      <div className="grid-3">
        <label>
          İndirim türü
          <select value={type} onChange={(e) => setType(e.target.value as DiscountType)}>
            <option value="percent">Yüzde indirim</option>
            <option value="fixed_price">Sabit fiyat (ürün bazında)</option>
          </select>
        </label>
        <label>
          Başlangıç tarihi
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          Bitiş tarihi
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      {type === 'percent' ? (
        <label>
          İndirim yüzdesi (%)
          <input value={percent} onChange={(e) => setPercent(e.target.value)} inputMode="decimal" placeholder="ör. 15" />
          <span className="muted small">Şu anki sabit indirim: %{String(standardPct).replace('.', ',')} (ilk siparişte daha yüksek olabilir).</span>
        </label>
      ) : null}

      <h3>Ürünler ({selected.size} seçili)</h3>
      <input type="search" placeholder="Ürün ara" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Ürün ara" />
      <div className="table-wrap campaign-products">
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Ürün</th>
              <th className="num">Liste fiyatı</th>
              <th className="num">{type === 'percent' ? 'Kampanya fiyatı' : 'Kampanya fiyatı (TL)'}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const checked = selected.has(p.id)
              return (
                <tr key={p.id}>
                  <td>
                    <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} aria-label={`${p.name} ${formatGrams(p.package_grams)}`} />
                  </td>
                  <td>
                    {p.brand} · {p.name} <span className="muted small">({formatGrams(p.package_grams)})</span>
                  </td>
                  <td className="num">{formatPrice(p.price_try)}</td>
                  <td className="num">
                    {!checked ? null : type === 'percent' ? (
                      pct && pct > 0 && pct <= 90 ? formatPrice(discountedPrice(p.price_try, pct)) : '—'
                    ) : (
                      <input
                        className="price-input"
                        value={selected.get(p.id) ?? ''}
                        onChange={(e) => setSelected((m) => new Map(m).set(p.id, e.target.value))}
                        inputMode="decimal"
                        placeholder="ör. 199,90"
                        aria-label={`${p.name} kampanya fiyatı`}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {products.length === 0 ? <p className="muted">Katalogda ürün yok.</p> : null}

      <div className="row">
        <button type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" className="secondary" onClick={onCancel} disabled={saving}>Vazgeç</button>
      </div>
    </form>
  )
}
