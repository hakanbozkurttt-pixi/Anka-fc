import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { AdminShell } from './AdminShell'
import { LoginPage } from './LoginPage'
import { isAdminSession } from './lib/auth'
import { isSupabaseConfigured, supabase } from './lib/supabase'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    const client = supabase

    // Yönetici olmayan bir hesapla giriş yapılırsa oturumu hemen kapat.
    function applySession(next: Session | null) {
      if (next && !isAdminSession(next)) {
        setNotice('Bu hesabın yönetim paneline erişim yetkisi yok.')
        setSession(null)
        client.auth.signOut()
        return
      }
      if (next) setNotice(null)
      setSession(next)
    }

    client.auth.getSession().then(({ data }) => {
      applySession(data.session)
      setLoading(false)
    })
    const { data } = client.auth.onAuthStateChange((_event, next) => applySession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) {
    return (
      <main className="shell">
        <h1>Hastane Yönetim Paneli</h1>
        <p className="status status-error">
          Arka plan ayarı yok. apps/admin/.env.example dosyasını .env olarak kopyalayıp doldurun.
        </p>
      </main>
    )
  }

  if (loading) return <main className="shell muted">Yükleniyor…</main>

  if (!session || !isAdminSession(session)) return <LoginPage notice={notice} />

  return <AdminShell email={session.user.email ?? ''} />
}
