import { useEffect, useMemo, useState } from 'react'
import { fetchAll } from './lib/fetchAll'
import { supabase } from './lib/supabase'
import { SEX_LABEL, SPECIES_LABEL, type CustomerWithPets, type Pet } from './lib/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR')
}

// "YYYY-AA-GG" (yalnızca tarih) → "GG.AA.YYYY"; saat dilimi kaymasını önler.
function formatDateOnly(value: string) {
  const [y, m, d] = value.split('-')
  return `${d}.${m}.${y}`
}

function petSummary(pet: Pet) {
  const parts: string[] = [SPECIES_LABEL[pet.species]]
  if (pet.breed) parts.push(pet.breed)
  if (pet.sex) parts.push(SEX_LABEL[pet.sex])
  if (pet.birth_date) parts.push(`Doğum: ${formatDateOnly(pet.birth_date)}`)
  if (pet.weight_kg != null) parts.push(`${String(pet.weight_kg).replace('.', ',')} kg`)
  return parts.join(' · ')
}

const CUSTOMER_COLUMNS: string = [
  'id, first_name, last_name, phone, address, email, created_at',
  'kvkk_acceptances(version, accepted_at)',
  'pets(*, food_records_with_schedule(id, brand, product_name, package_grams, package_count, daily_grams, end_date, days_left, reminder_enabled, reminder_date))',
].join(', ')

// Salt okunur müşteri ve hayvan listesi. Bu ekrandan kayıt değiştirilemez.
export function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithPets[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const client = supabase
    if (!client) return
    fetchAll<CustomerWithPets>((from, to) =>
      client
        .from('profiles')
        .select(CUSTOMER_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to)
        .overrideTypes<CustomerWithPets[], { merge: false }>(),
    )
      .then((list) => setCustomers(list))
      .catch(() => setError('Kayıtlar yüklenemedi.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR')
    if (!q) return customers
    const qDigits = q.replace(/[^0-9]/g, '')
    return customers.filter((c) => {
      const name = `${c.first_name} ${c.last_name}`.toLocaleLowerCase('tr-TR')
      const phoneDigits = c.phone.replace(/[^0-9]/g, '')
      return (
        name.includes(q) ||
        c.email.toLocaleLowerCase('tr-TR').includes(q) ||
        (qDigits.length > 0 && phoneDigits.includes(qDigits))
      )
    })
  }, [customers, query])

  return (
    <>
      <h1>Müşteriler ve hayvanlar</h1>

      <input
        type="search"
        className="search"
        placeholder="Ad, soyad, telefon veya e-posta ile ara"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Müşteri ara"
      />

      {loading ? <p className="muted">Yükleniyor…</p> : null}
      {error ? <p className="status status-error">{error}</p> : null}
      {!loading && !error ? (
        <p className="muted">
          {filtered.length} müşteri, {filtered.reduce((n, c) => n + c.pets.length, 0)} hayvan
        </p>
      ) : null}

      {filtered.map((c) => (
        <section key={c.id} className="card">
          <div className="card-head">
            <h2>
              {c.first_name} {c.last_name}
            </h2>
            <span className="muted">Kayıt: {formatDate(c.created_at)}</span>
          </div>
          <dl className="details">
            <dt>Telefon</dt>
            <dd>{c.phone}</dd>
            <dt>E-posta</dt>
            <dd>{c.email}</dd>
            <dt>Adres</dt>
            <dd>{c.address}</dd>
            <dt>KVKK onayı</dt>
            <dd>
              {c.kvkk_acceptances.length === 0
                ? 'Yok'
                : [...c.kvkk_acceptances]
                    .sort((x, y) => y.accepted_at.localeCompare(x.accepted_at))
                    .map((k) => `${k.version} (${new Date(k.accepted_at).toLocaleString('tr-TR')})`)
                    .join(', ')}
            </dd>
          </dl>
          {c.pets.length === 0 ? (
            <p className="muted">Kayıtlı hayvan yok.</p>
          ) : (
            <ul className="pets">
              {c.pets.map((pet) => (
                <li key={pet.id}>
                  <strong>{pet.name}</strong> <span className="muted">{petSummary(pet)}</span>
                  {pet.notes ? <div className="muted note">Not: {pet.notes}</div> : null}
                  {pet.food_records_with_schedule?.map((f) => (
                    <div key={f.id} className="food-line small">
                      Mama: {f.brand} · {f.product_name} ({f.package_count > 1 ? `${f.package_count} × ` : ''}
                      {f.package_grams} g, günde {f.daily_grams} g) — tahmini bitiş {formatDateOnly(f.end_date)} ({f.days_left} gün)
                      {f.reminder_enabled ? `, hatırlatma ${formatDateOnly(f.reminder_date)}` : ', hatırlatma kapalı'}
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </>
  )
}
