import { useEffect, useMemo, useState } from 'react'
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

// Salt okunur müşteri ve hayvan listesi. Bu ekrandan kayıt değiştirilemez.
export function CustomersPage({ email }: { email: string }) {
  const [customers, setCustomers] = useState<CustomerWithPets[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, address, email, created_at, pets(*)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError('Kayıtlar yüklenemedi.')
        else setCustomers((data ?? []) as CustomerWithPets[])
        setLoading(false)
      })
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
    <main className="shell">
      <header className="topbar">
        <h1>Müşteriler ve hayvanlar</h1>
        <div className="topbar-right">
          <span className="muted">{email}</span>
          <button type="button" className="secondary" onClick={() => supabase?.auth.signOut()}>
            Çıkış yap
          </button>
        </div>
      </header>

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
          </dl>
          {c.pets.length === 0 ? (
            <p className="muted">Kayıtlı hayvan yok.</p>
          ) : (
            <ul className="pets">
              {c.pets.map((pet) => (
                <li key={pet.id}>
                  <strong>{pet.name}</strong> <span className="muted">{petSummary(pet)}</span>
                  {pet.notes ? <div className="muted note">Not: {pet.notes}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  )
}
