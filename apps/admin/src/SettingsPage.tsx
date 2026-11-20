import { useEffect, useState, type FormEvent } from 'react'
import { formatPrice } from './catalog/model'
import { parsePrice } from './catalog/rows'
import { supabase } from './lib/supabase'

export function SettingsPage() {
  const [current, setCurrent] = useState<number | null>(null)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      ?.from('app_settings')
      .select('shipping_fee_try')
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setError('Ayarlar yüklenemedi.')
          return
        }
        const fee = Number(data.shipping_fee_try)
        setValue(fee.toFixed(2).replace('.', ','))
        setCurrent(fee)
      })
  }, [])

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setInfo(null)
    const fee = value.trim() === '0' ? 0 : parsePrice(value)
    if (fee === null || fee < 0 || fee >= 100000) {
      setError('Geçerli bir tutar girin (ör. 200 veya 200,00).')
      return
    }
    setSaving(true)
    const { error } = await supabase!.from('app_settings').update({ shipping_fee_try: fee }).eq('id', true)
    setSaving(false)
    if (error) {
      setError('Kaydedilemedi. Lütfen tekrar deneyin.')
      return
    }
    setCurrent(fee)
    setInfo('Kargo ücreti kaydedildi. Yeni ücret yalnızca bundan sonra verilen siparişlere uygulanır.')
  }

  // Kayıtlı ücret yüklenmeden alan gösterilmez; böylece yazılan değer yüklenen değerle karışmaz.
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
        <h2>Adrese teslimat kargo ücreti</h2>
        <p className="muted">
          Adrese teslimatta siparişe eklenir; hastaneden teslim almada kargo ücreti yoktur.
          {` Şu anki ücret: ${formatPrice(current)}.`}
        </p>
        {error ? <p className="status status-error" role="alert">{error}</p> : null}
        {info ? <p className="status status-ok">{info}</p> : null}
        <label>
          Kargo ücreti (TL)
          <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" />
        </label>
        <p className="muted small">Ücret değişirse daha önce verilmiş siparişlerin tutarı değişmez.</p>
        <button type="submit" disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </form>
    </>
  )
}
