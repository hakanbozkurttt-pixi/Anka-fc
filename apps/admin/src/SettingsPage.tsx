import { useEffect, useState, type FormEvent } from 'react'
import { formatPrice } from './catalog/model'
import { parsePrice } from './catalog/rows'
import { supabase } from './lib/supabase'

type Settings = { shipping_fee_try: number; first_order_discount_pct: number; standard_discount_pct: number }

const tr = (n: number) => n.toFixed(2).replace('.', ',').replace(/,00$/, '')

/** "%20", "20", "12,5" → sayı; geçersizse null */
function parsePct(value: string): number | null {
  const v = value.trim().replace('%', '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null
  const n = Number(v)
  return n >= 0 && n <= 90 ? n : null
}

export function SettingsPage() {
  const [current, setCurrent] = useState<Settings | null>(null)
  const [fee, setFee] = useState('')
  const [firstPct, setFirstPct] = useState('')
  const [standardPct, setStandardPct] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      ?.from('app_settings')
      .select('shipping_fee_try, first_order_discount_pct, standard_discount_pct')
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError('Ayarlar yüklenemedi.')
          return
        }
        const s: Settings = {
          shipping_fee_try: Number(data.shipping_fee_try),
          first_order_discount_pct: Number(data.first_order_discount_pct),
          standard_discount_pct: Number(data.standard_discount_pct),
        }
        setFee(s.shipping_fee_try.toFixed(2).replace('.', ','))
        setFirstPct(tr(s.first_order_discount_pct))
        setStandardPct(tr(s.standard_discount_pct))
        setCurrent(s)
      })
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setInfo(null)
    const f = fee.trim() === '0' ? 0 : parsePrice(fee)
    if (f === null || f < 0 || f >= 100000) {
      setError('Kargo ücreti için geçerli bir tutar girin (ör. 200 veya 200,00).')
      return
    }
    const p1 = parsePct(firstPct)
    const p2 = parsePct(standardPct)
    if (p1 === null || p2 === null) {
      setError('İndirim oranları 0 ile 90 arasında bir sayı olmalı (ör. 20 veya 12,5).')
      return
    }
    setSaving(true)
    const { error } = await supabase!
      .from('app_settings')
      .update({ shipping_fee_try: f, first_order_discount_pct: p1, standard_discount_pct: p2 })
      .eq('id', true)
    setSaving(false)
    if (error) {
      setError('Kaydedilemedi. Lütfen tekrar deneyin.')
      return
    }
    setCurrent({ shipping_fee_try: f, first_order_discount_pct: p1, standard_discount_pct: p2 })
    setInfo('Ayarlar kaydedildi. Yeni değerler yalnızca bundan sonra verilen siparişlere uygulanır.')
  }

  // Kayıtlı değerler yüklenmeden alanlar gösterilmez; böylece yazılan değer yüklenen değerle karışmaz.
  if (current === null) {
    return (
      <>
        <h1>Ayarlar</h1>
        {error ? <p className="status status-error" role="alert">{error}</p> : <p className="muted">Yükleniyor…</p>}
      </>
    )
  }

  return (
    <>
      <h1>Ayarlar</h1>
      <form className="card form narrow" onSubmit={save}>
        {error ? <p className="status status-error" role="alert">{error}</p> : null}
        {info ? <p className="status status-ok">{info}</p> : null}

        <h2>Adrese teslimat kargo ücreti</h2>
        <p className="muted">
          Adrese teslimatta siparişe eklenir; hastaneden teslim almada kargo ücreti yoktur. Şu anki ücret:{' '}
          {formatPrice(current.shipping_fee_try)}.
        </p>
        <label>
          Kargo ücreti (TL)
          <input value={fee} onChange={(e) => setFee(e.target.value)} inputMode="decimal" />
        </label>

        <h2>İndirim oranları</h2>
        <p className="muted">
          İndirim yalnızca ürünlere uygulanır, kargo ücretine uygulanmaz. Müşterinin iptal edilmemiş başka siparişi
          yoksa sipariş “ilk sipariş” sayılır.
        </p>
        <label>
          Yeni müşterinin ilk siparişi (%)
          <input value={firstPct} onChange={(e) => setFirstPct(e.target.value)} inputMode="decimal" />
        </label>
        <label>
          Sonraki tüm siparişler (%)
          <input value={standardPct} onChange={(e) => setStandardPct(e.target.value)} inputMode="decimal" />
        </label>

        <p className="muted small">Değişiklikler daha önce verilmiş siparişlerin tutarını değiştirmez.</p>
        <button type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </form>
    </>
  )
}
