import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'

export function LoginPage({ notice }: { notice?: string | null }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!supabase) return
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) {
      setError(
        error.code === 'invalid_credentials'
          ? 'E-posta veya şifre hatalı.'
          : 'Giriş yapılamadı. Lütfen tekrar deneyin.',
      )
    }
  }

  return (
    <main className="shell narrow">
      <h1>Hastane Yönetim Paneli</h1>
      <p className="muted">Yönetici hesabıyla giriş yapın.</p>
      {notice ? <p className="status status-error">{notice}</p> : null}
      {error ? (
        <p className="status status-error" role="alert">
          {error}
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="form">
        <label>
          E-posta
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Şifre
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
      </form>
    </main>
  )
}
