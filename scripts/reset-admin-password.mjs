// Yönetici şifresini unutulduğunda yeniler.
//
// Kullanım:  npm run admin:reset-password
//
// Yeni, güçlü bir şifre rastgele üretilir ve YALNIZCA BİR KEZ ekrana yazılır.
// Bu komut gizli anahtar gerektirdiği için yalnızca yetkili kişinin
// bilgisayarında çalıştırılmalıdır.
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { getConfig } from './lib/local-supabase.mjs'

const { url, secretKey } = getConfig()
const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

const { data, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
if (listError) {
  console.error('Kullanıcı listesi okunamadı:', listError.message)
  process.exit(1)
}
const user = data.users.find((u) => u.app_metadata?.role === 'admin')
if (!user) {
  console.error('Yönetici hesabı bulunamadı. Önce "npm run admin:create -- <e-posta>" ile oluşturun.')
  process.exit(1)
}

const password = randomBytes(18).toString('base64url')
const { error } = await admin.auth.admin.updateUserById(user.id, { password })
if (error) {
  console.error('Şifre yenilenemedi:', error.message)
  process.exit(1)
}

console.log('Yönetici şifresi yenilendi.')
console.log(`  E-posta: ${user.email}`)
console.log(`  Yeni şifre: ${password}`)
console.log('Bu şifre bir daha gösterilmeyecek; güvenli bir yere kaydedin.')
