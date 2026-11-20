// Yerel veritabanında kayıt, giriş ve erişim kurallarını (RLS) uçtan uca dener.
//
// Kullanım:  npm run db:test     (yerel Supabase çalışıyor olmalı)
//
// DEMO / TEST VERİSİ: Betik "@example.com" uzantılı, açıkça uydurma test
// kullanıcıları oluşturur ve iş bitince hepsini siler. Gerçek kişi verisi kullanılmaz.
// Yalnızca YEREL veritabanında çalıştırın.
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { getConfig } from './lib/local-supabase.mjs'

const { url, secretKey, publishableKey } = getConfig()
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error('Bu test yalnızca yerel Supabase üzerinde çalıştırılabilir.')
  process.exit(1)
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const service = createClient(url, secretKey, opts)
const newClient = () => createClient(url, publishableKey, opts)

const run = randomBytes(4).toString('hex')
const demoEmail = (name) => `demo-${name}-${run}@example.com`
const password = `Demo-${randomBytes(8).toString('hex')}`
const createdUserIds = []

const demoCustomer = (first) => ({
  first_name: first,
  last_name: 'Demo',
  phone: '0500 000 00 00',
  address: 'Demo Mahallesi, Test Sokak No:1',
  kvkk_version: 'test-surum',
})

// Yerel e-posta kutusu (Mailpit). Supabase'in gönderdiği kodları buradan okuruz.
const MAILPIT = process.env.MAILPIT_URL || 'http://127.0.0.1:54324'
const seenMessages = new Set()

async function latestCode(email) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)
    if (!res.ok) throw new Error('Yerel e-posta kutusuna (Mailpit) ulaşılamadı.')
    const { messages } = await res.json()
    const fresh = messages.find((m) => !seenMessages.has(m.ID))
    if (fresh) {
      seenMessages.add(fresh.ID)
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json()
      const match = /\b(\d{6})\b/.exec(msg.Text || msg.HTML)
      if (match) return match[1]
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`${email} için e-posta gelmedi.`)
}

async function signUp(name, data) {
  const client = newClient()
  const res = await client.auth.signUp({ email: demoEmail(name), password, options: { data } })
  if (res.data.user) {
    const { data: found } = await service.auth.admin.getUserById(res.data.user.id)
    if (found.user) createdUserIds.push(res.data.user.id)
  }
  return { client, ...res }
}

// Kayıt + e-postadaki kodla doğrulama (müşterinin uygulamada yaptığı akış).
async function signUpAndVerify(name, data) {
  const res = await signUp(name, data)
  if (res.error) return res
  const token = await latestCode(demoEmail(name))
  const verified = await res.client.auth.verifyOtp({ email: demoEmail(name), token, type: 'email' })
  return { ...res, verified }
}

let passed = 0
async function test(title, fn) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${title}`)
  } catch (e) {
    console.error(`  ✗ ${title}\n    ${e.message}`)
    process.exitCode = 1
  }
}

try {
  console.log('Kayıt ve e-posta doğrulama')

  const pending = await signUp('bekleyen', demoCustomer('Bekleyen'))

  await test('kayıt sonrası e-posta doğrulanmadan oturum açılmıyor', () => {
    assert.equal(pending.error, null)
    assert.equal(pending.data.session, null)
  })

  await test('doğrulanmamış hesapla giriş reddediliyor', async () => {
    const { error } = await newClient().auth.signInWithPassword({ email: demoEmail('bekleyen'), password })
    assert.equal(error?.code, 'email_not_confirmed')
  })

  await test('yanlış doğrulama kodu reddediliyor', async () => {
    await latestCode(demoEmail('bekleyen')) // gönderilen gerçek kodu "okunmuş" say
    const { error } = await newClient().auth.verifyOtp({ email: demoEmail('bekleyen'), token: '000000', type: 'email' })
    assert.ok(error)
  })

  const a = await signUpAndVerify('ayse', demoCustomer('Ayşe'))
  const b = await signUpAndVerify('mehmet', demoCustomer('Mehmet'))

  await test('e-postadaki kodla doğrulama yapılınca oturum açılıyor', () => {
    assert.equal(a.error, null)
    assert.equal(a.verified.error, null)
    assert.ok(a.verified.data.session)
    assert.equal(b.verified.error, null)
  })

  await test('kayıt anında müşteri profili oluşuyor', async () => {
    const { data, error } = await a.client.from('profiles').select('*').single()
    assert.equal(error, null)
    assert.equal(data.first_name, 'Ayşe')
    assert.equal(data.email, demoEmail('ayse'))
  })

  await test('eksik alanla (adres yok) kayıt reddediliyor ve hesap oluşmuyor', async () => {
    const { phone, first_name, last_name, kvkk_version } = demoCustomer('Eksik')
    const res = await signUp('eksik', { first_name, last_name, phone, kvkk_version })
    assert.ok(res.error, 'hata bekleniyordu')
    const { data } = await service.auth.admin.listUsers({ perPage: 1000 })
    assert.ok(!data.users.some((u) => u.email === demoEmail('eksik')))
  })

  await test('geçersiz telefonla kayıt reddediliyor', async () => {
    const res = await signUp('telefon', { ...demoCustomer('Tel'), phone: '123' })
    assert.ok(res.error)
  })

  await test('8 karakterden kısa şifre reddediliyor', async () => {
    const res = await newClient().auth.signUp({
      email: demoEmail('kisa'),
      password: 'Ab1',
      options: { data: demoCustomer('Kısa') },
    })
    assert.ok(res.error)
  })

  await test('yanlış şifreyle giriş reddediliyor', async () => {
    const { error } = await newClient().auth.signInWithPassword({ email: demoEmail('ayse'), password: 'yanlis-sifre' })
    assert.equal(error?.code, 'invalid_credentials')
  })

  console.log('KVKK aydınlatma metni onayı')

  await test('KVKK onayı olmadan kayıt reddediliyor ve hesap oluşmuyor', async () => {
    const { kvkk_version: _omit, ...rest } = demoCustomer('Onaysız')
    const res = await signUp('onaysiz', rest)
    assert.ok(res.error, 'hata bekleniyordu')
    const { data } = await service.auth.admin.listUsers({ perPage: 1000 })
    assert.ok(!data.users.some((u) => u.email === demoEmail('onaysiz')))
  })

  await test('kayıtta onaylanan sürüm ve zaman kaydediliyor', async () => {
    const { data } = await a.client.from('kvkk_acceptances').select('version, accepted_at')
    assert.equal(data.length, 1)
    assert.equal(data[0].version, 'test-surum')
    assert.ok(Date.now() - new Date(data[0].accepted_at).getTime() < 5 * 60_000)
  })

  await test('müşteri yeni sürümü onaylayabiliyor', async () => {
    const { error } = await a.client.from('kvkk_acceptances').insert({ version: 'test-surum-2' })
    assert.equal(error, null)
  })

  await test('müşteri onay zamanını kendisi belirleyemiyor', async () => {
    const { error } = await a.client
      .from('kvkk_acceptances')
      .insert({ version: 'test-surum-3', accepted_at: '2000-01-01T00:00:00Z' })
    assert.ok(error)
  })

  await test('müşteri başka biri adına onay ekleyemiyor', async () => {
    const { error } = await a.client
      .from('kvkk_acceptances')
      .insert({ version: 'test-surum-4', user_id: b.data.user.id })
    assert.ok(error)
  })

  await test('müşteri onay kaydını silemiyor', async () => {
    await a.client.from('kvkk_acceptances').delete().eq('version', 'test-surum')
    const { data } = await service.from('kvkk_acceptances').select('id').eq('user_id', a.data.user.id)
    assert.equal(data.length, 2)
  })

  await test('müşteri yalnızca kendi onaylarını görüyor', async () => {
    const { data } = await a.client.from('kvkk_acceptances').select('user_id')
    assert.ok(data.every((r) => r.user_id === a.data.user.id))
  })

  console.log('Şifre yenileme')

  await test('yanlış kodla şifre yenilenemiyor', async () => {
    const c = newClient()
    await c.auth.resetPasswordForEmail(demoEmail('ayse'))
    await latestCode(demoEmail('ayse'))
    const { error } = await c.auth.verifyOtp({ email: demoEmail('ayse'), token: '000000', type: 'recovery' })
    assert.ok(error)
  })

  await test('e-postadaki kodla şifre yenileniyor; eski şifre artık geçmiyor', async () => {
    const c = newClient()
    await new Promise((r) => setTimeout(r, 1100)) // yerel gönderim sıklığı sınırı (1 sn)
    const sent = await c.auth.resetPasswordForEmail(demoEmail('ayse'))
    assert.equal(sent.error, null)
    const token = await latestCode(demoEmail('ayse'))
    const v = await c.auth.verifyOtp({ email: demoEmail('ayse'), token, type: 'recovery' })
    assert.equal(v.error, null)
    const newPassword = `${password}-yeni`
    const u = await c.auth.updateUser({ password: newPassword })
    assert.equal(u.error, null)
    const oldLogin = await newClient().auth.signInWithPassword({ email: demoEmail('ayse'), password })
    assert.ok(oldLogin.error)
    const newLogin = await newClient().auth.signInWithPassword({ email: demoEmail('ayse'), password: newPassword })
    assert.equal(newLogin.error, null)
  })

  await test('kayıtlı olmayan e-postaya şifre yenileme isteği hesap varlığını açığa çıkarmıyor', async () => {
    const { error } = await newClient().auth.resetPasswordForEmail(demoEmail('olmayan'))
    assert.equal(error, null)
  })

  console.log('Hayvan profilleri')

  await test('müşteri kedi ekleyebiliyor (yalnızca tür + ad)', async () => {
    const { error } = await a.client.from('pets').insert({ species: 'cat', name: 'Pamuk' })
    assert.equal(error, null)
  })

  await test('müşteri isteğe bağlı alanlarla köpek ekleyebiliyor', async () => {
    const { error } = await b.client.from('pets').insert({
      species: 'dog',
      name: 'Karabaş',
      breed: 'Demo ırk',
      sex: 'male',
      birth_date: '2022-05-01',
      weight_kg: 18.5,
    })
    assert.equal(error, null)
  })

  await test('kedi/köpek dışında tür reddediliyor', async () => {
    const { error } = await a.client.from('pets').insert({ species: 'bird', name: 'Maviş' })
    assert.ok(error)
  })

  await test('adsız hayvan reddediliyor', async () => {
    const { error } = await a.client.from('pets').insert({ species: 'cat', name: '  ' })
    assert.ok(error)
  })

  console.log('Erişim kuralları (RLS)')

  await test('müşteri yalnızca kendi hayvanlarını görüyor', async () => {
    const { data } = await a.client.from('pets').select('name')
    assert.deepEqual(data.map((p) => p.name), ['Pamuk'])
  })

  await test('müşteri yalnızca kendi profilini görüyor', async () => {
    const { data } = await a.client.from('profiles').select('id')
    assert.equal(data.length, 1)
  })

  await test('müşteri başka müşteri adına hayvan ekleyemiyor', async () => {
    const owner = b.data.user.id
    const { error } = await a.client.from('pets').insert({ species: 'cat', name: 'Sahte', owner_id: owner })
    assert.ok(error)
  })

  await test('müşteri profil bilgisini (ör. başkasının) değiştiremiyor', async () => {
    await a.client.from('profiles').update({ first_name: 'Değişti' }).eq('id', b.data.user.id)
    const { data } = await service.from('profiles').select('first_name').eq('id', b.data.user.id).single()
    assert.equal(data.first_name, 'Mehmet')
  })

  await test('giriş yapmamış kullanıcı hiçbir kaydı göremiyor', async () => {
    const anon = newClient()
    const pets = await anon.from('pets').select('*')
    const profiles = await anon.from('profiles').select('*')
    assert.ok(pets.error || pets.data.length === 0)
    assert.ok(profiles.error || profiles.data.length === 0)
  })

  await test('kayıtta "role: admin" göndermek yönetici yetkisi vermiyor', async () => {
    const res = await signUpAndVerify('sahte-admin', { ...demoCustomer('Sahte'), role: 'admin' })
    assert.equal(res.verified.error, null)
    const { data } = await res.client.from('profiles').select('id')
    assert.equal(data.length, 1)
  })

  console.log('Yönetici')

  const adminEmail = demoEmail('yonetici')
  const { data: created } = await service.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
  })
  createdUserIds.push(created.user.id)
  const adminClient = newClient()
  await adminClient.auth.signInWithPassword({ email: adminEmail, password })

  await test('yönetici tüm müşterileri ve hayvanları görüyor', async () => {
    const { data, error } = await adminClient
      .from('profiles')
      .select('id, pets(name)')
      .in('id', [a.data.user.id, b.data.user.id])
    assert.equal(error, null)
    assert.equal(data.length, 2)
    assert.equal(data.flatMap((p) => p.pets).length, 2)
  })

  await test('yönetici panelden kayıt ekleyemiyor (salt okunur)', async () => {
    const { error } = await adminClient.from('pets').insert({ species: 'cat', name: 'X', owner_id: a.data.user.id })
    assert.ok(error)
  })

  await test('yönetici hesabı için müşteri profili oluşmuyor', async () => {
    const { data } = await service.from('profiles').select('id').eq('id', created.user.id)
    assert.equal(data.length, 0)
  })
} finally {
  // Demo kullanıcılarını temizle (profiller ve hayvanlar zincirleme silinir).
  for (const id of createdUserIds) await service.auth.admin.deleteUser(id)
}

console.log(`\n${passed} test geçti${process.exitCode ? ', bazı testler BAŞARISIZ' : ''}.`)
