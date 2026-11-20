// Yönetim paneli için tek yönetici hesabını oluşturur.
//
// Kullanım:  npm run admin:create -- yonetici@ornek-hastane.com
//
// * Güçlü bir şifre rastgele üretilir ve YALNIZCA BİR KEZ ekrana yazılır.
//   Şifreyi güvenli bir yere (ör. şifre yöneticisi) kaydedin; dosyaya yazılmaz.
// * Hesaba "admin" rolü sunucu tarafında (app_metadata) atanır. Bu alanı
//   müşteriler kendileri değiştiremez.
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { getConfig } from './lib/local-supabase.mjs'

const email = process.argv[2]?.trim()
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Kullanım: npm run admin:create -- <yonetici-e-posta-adresi>')
  process.exit(1)
}

const { url, secretKey } = getConfig()
const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })

// Tek yönetici kuralı: zaten bir yönetici varsa yenisini oluşturma.
const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 })
if (listError) {
  console.error('Kullanıcı listesi okunamadı:', listError.message)
  process.exit(1)
}
const existing = list.users.find((u) => u.app_metadata?.role === 'admin')
if (existing) {
  console.error(`Zaten bir yönetici hesabı var: ${existing.email}. Gereksinimlere göre tek yönetici hesabı olmalı.`)
  process.exit(1)
}

const password = randomBytes(18).toString('base64url')

const { error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: 'admin' },
})

if (error) {
  console.error('Yönetici oluşturulamadı:', error.message)
  process.exit(1)
}

console.log('Yönetici hesabı oluşturuldu.')
console.log(`  E-posta: ${email}`)
console.log(`  Şifre:   ${password}`)
console.log('Bu şifre bir daha gösterilmeyecek; güvenli bir yere kaydedin.')
