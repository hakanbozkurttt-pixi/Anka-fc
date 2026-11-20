import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Status = 'not-configured' | 'checking' | 'ok' | 'error'

// Başlangıç ekranı: yalnızca panelin açıldığını ve arka plana
// ulaşılıp ulaşılamadığını gösterir. Henüz hiçbir özellik yok.
export default function App() {
  const [status, setStatus] = useState<Status>(
    isSupabaseConfigured ? 'checking' : 'not-configured',
  )

  useEffect(() => {
    if (!supabase) return
    supabase.auth
      .getSession()
      .then(({ error }) => setStatus(error ? 'error' : 'ok'))
      .catch(() => setStatus('error'))
  }, [])

  const messages: Record<Status, string> = {
    'not-configured':
      'Arka plan ayarı yok. apps/admin/.env.example dosyasını .env olarak kopyalayıp doldurun.',
    checking: 'Arka plana bağlanılıyor…',
    ok: 'Arka plana (Supabase) bağlantı başarılı.',
    error:
      'Arka plana ulaşılamadı. "npm run db:start" çalışıyor mu ve .env değerleri doğru mu?',
  }

  return (
    <main className="shell">
      <h1>Hastane Yönetim Paneli</h1>
      <p className="muted">Proje iskeleti hazır. Özellikler sonraki adımlarda eklenecek.</p>
      <p className={`status status-${status}`}>{messages[status]}</p>
    </main>
  )
}
