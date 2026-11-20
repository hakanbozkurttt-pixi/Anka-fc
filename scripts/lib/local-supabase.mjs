// Betiklerin Supabase bağlantı bilgilerini bulması:
// 1) Kök klasördeki .env dosyasında SUPABASE_URL ve SUPABASE_SECRET_KEY varsa onlar kullanılır.
// 2) Yoksa, yerel Supabase çalışıyorsa bilgiler "supabase status" komutundan okunur.
// Gizli anahtar yalnızca bu betiklerde (bilgisayarınızda) kullanılır;
// hiçbir zaman telefon uygulamasına veya panele konmaz.
import { execSync } from 'node:child_process'

function readLocalStatus() {
  try {
    const out = execSync('npx supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const env = {}
    for (const line of out.split('\n')) {
      const match = /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim())
      if (match) env[match[1]] = match[2]
    }
    return env
  } catch {
    return {}
  }
}

export function getConfig() {
  let url = process.env.SUPABASE_URL
  let secretKey = process.env.SUPABASE_SECRET_KEY
  let publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY

  if (!url || !secretKey || !publishableKey) {
    const status = readLocalStatus()
    url ||= status.API_URL
    secretKey ||= status.SECRET_KEY || status.SERVICE_ROLE_KEY
    publishableKey ||= status.PUBLISHABLE_KEY || status.ANON_KEY
  }

  if (!url || !secretKey || !publishableKey) {
    console.error(
      'Supabase bilgileri bulunamadı. Önce "npm run db:start" ile yerel Supabase\'i başlatın\n' +
        'veya kök klasördeki .env dosyasına SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY ve SUPABASE_SECRET_KEY yazın.',
    )
    process.exit(1)
  }
  return { url, secretKey, publishableKey }
}
