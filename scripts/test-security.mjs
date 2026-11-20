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
const createdProductIds = []
const createdImagePaths = []

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

  // Türkiye saatine göre bugün / yarın (veritabanı saati UTC olsa bile)
  const trDate = (offsetDays = 0) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date(Date.now() + offsetDays * 86400000))

  await test('doğum tarihi: Türkiye saatine göre bugün kabul, yarın reddediliyor', async () => {
    const ok = await a.client.from('pets').insert({ species: 'cat', name: 'Demo Bugün', birth_date: trDate(0) })
    const bad = await a.client.from('pets').insert({ species: 'cat', name: 'Demo Yarın', birth_date: trDate(1) })
    await service.from('pets').delete().eq('name', 'Demo Bugün')
    assert.equal(ok.error, null)
    assert.ok(bad.error)
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

  console.log('Ürün kataloğu')
  // TEST VERİSİ: Aşağıdaki ürünler gerçek değildir ve test sonunda silinir.
  const testProduct = (suffix, extra = {}) => ({
    brand: 'Carni',
    name: `TEST ürünü ${suffix} ${run}`,
    species: 'cat',
    package_grams: 1500,
    price_try: 100,
    code: `TEST-${run}-${suffix}`,
    ...extra,
  })
  const remember = (rows) => rows?.forEach((r) => createdProductIds.push(r.id))

  await test('yönetici ürün ekleyebiliyor (her paket boyutu ayrı kayıt)', async () => {
    const { data, error } = await adminClient
      .from('products')
      .insert([testProduct('1500'), testProduct('3000', { package_grams: 3000, price_try: 180.5 })])
      .select('id')
    remember(data)
    assert.equal(error, null)
    assert.equal(data.length, 2)
  })

  await test('aynı barkod / ürün kodu ikinci kez kaydedilemiyor (büyük/küçük harf fark etmez)', async () => {
    const { data, error } = await adminClient
      .from('products')
      .insert(testProduct('kopya', { code: `test-${run}-1500` }))
      .select('id')
    remember(data)
    assert.equal(error?.code, '23505')
  })

  await test('listede olmayan marka ve geçersiz fiyat reddediliyor', async () => {
    const r1 = await adminClient.from('products').insert(testProduct('m', { brand: 'Başka', code: null })).select('id')
    const r2 = await adminClient.from('products').insert(testProduct('f', { price_try: 0, code: null })).select('id')
    remember(r1.data)
    remember(r2.data)
    assert.ok(r1.error)
    assert.ok(r2.error)
  })

  await test('müşteri ürün ekleyemiyor ve değiştiremiyor', async () => {
    const ins = await a.client.from('products').insert(testProduct('musteri')).select('id')
    remember(ins.data)
    assert.ok(ins.error)
    await a.client.from('products').update({ price_try: 1 }).eq('code', `TEST-${run}-1500`)
    const { data } = await service.from('products').select('price_try').eq('code', `TEST-${run}-1500`).single()
    assert.equal(Number(data.price_try), 100)
  })

  await test('müşteri yalnızca aktif ürünleri görüyor; giriş yapmamış kişi hiç göremiyor', async () => {
    await adminClient.from('products').update({ is_active: false }).eq('code', `TEST-${run}-3000`)
    const { data } = await a.client.from('products').select('code').like('code', `TEST-${run}-%`)
    assert.deepEqual(data.map((p) => p.code), [`TEST-${run}-1500`])
    const anon = await newClient().from('products').select('id')
    assert.ok(anon.error || anon.data.length === 0)
  })

  await test('toplu yükleme: bir satır hatalıysa hiçbir satır kaydedilmiyor', async () => {
    const { error } = await adminClient.rpc('import_products', {
      rows: [testProduct('t1', { code: `TEST-${run}-T1` }), testProduct('t2', { code: `TEST-${run}-T2`, price_try: 0 })],
    })
    assert.ok(error)
    const { data } = await service.from('products').select('id').like('code', `TEST-${run}-T%`)
    assert.equal(data.length, 0)
  })

  await test('toplu yükleme: yeni ürünler eklenip onaylanan ürün güncelleniyor', async () => {
    const { data: existing } = await service.from('products').select('id').eq('code', `TEST-${run}-1500`).single()
    const { data, error } = await adminClient.rpc('import_products', {
      rows: [
        testProduct('t1', { code: `TEST-${run}-T1`, species: 'both' }),
        { ...testProduct('1500', { price_try: 120.75 }), id: existing.id },
      ],
    })
    assert.equal(error, null)
    assert.deepEqual(data, { inserted: 1, updated: 1 })
    const { data: rows } = await service.from('products').select('id, code, price_try').like('code', `TEST-${run}-%`)
    remember(rows.filter((r) => r.code === `TEST-${run}-T1`))
    assert.equal(Number(rows.find((r) => r.code === `TEST-${run}-1500`).price_try), 120.75)
  })

  await test('müşteri toplu yükleme yapamıyor', async () => {
    const { error } = await a.client.rpc('import_products', { rows: [testProduct('x', { code: `TEST-${run}-X` })] })
    assert.ok(error)
    const { data } = await service.from('products').select('id').eq('code', `TEST-${run}-X`)
    assert.equal(data.length, 0)
  })

  // 1x1 piksel PNG (test görseli)
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  )

  await test('yönetici ürün görseli yükleyebiliyor ve görsel herkese açık okunuyor', async () => {
    const path = `products/test-${run}.png`
    const { error } = await adminClient.storage.from('product-images').upload(path, png, { contentType: 'image/png' })
    assert.equal(error, null)
    createdImagePaths.push(path)
    const url = adminClient.storage.from('product-images').getPublicUrl(path).data.publicUrl
    const res = await fetch(url)
    assert.equal(res.status, 200)
  })

  await test('yönetici değiştirilen görseli depodan silebiliyor', async () => {
    const path = `products/test-sil-${run}.png`
    await adminClient.storage.from('product-images').upload(path, png, { contentType: 'image/png' })
    const { data } = await adminClient.storage.from('product-images').remove([path])
    if (!data?.length) createdImagePaths.push(path)
    assert.equal(data?.length, 1)
  })

  await test('müşteri ürün görselini silemiyor', async () => {
    const { data } = await a.client.storage.from('product-images').remove([createdImagePaths[0]])
    assert.equal(data?.length ?? 0, 0)
    const res = await fetch(adminClient.storage.from('product-images').getPublicUrl(createdImagePaths[0]).data.publicUrl)
    assert.equal(res.status, 200)
  })

  await test('müşteri ürün görseli yükleyemiyor', async () => {
    const path = `products/test-musteri-${run}.png`
    const { error } = await a.client.storage.from('product-images').upload(path, png, { contentType: 'image/png' })
    if (!error) createdImagePaths.push(path)
    assert.ok(error)
  })

  await test('görsel olmayan dosya yüklenemiyor', async () => {
    const path = `products/test-${run}.txt`
    const { error } = await adminClient.storage.from('product-images').upload(path, Buffer.from('test'), { contentType: 'text/plain' })
    if (!error) createdImagePaths.push(path)
    assert.ok(error)
  })

  console.log('Mama takibi')
  const addDaysIso = (iso, n) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
  }
  const today = trDate(0)
  const { data: catProduct } = await service.from('products').select('id').eq('code', `TEST-${run}-1500`).single()
  const { data: passiveProduct } = await service.from('products').select('id').eq('code', `TEST-${run}-3000`).single()
  const { data: pamuk } = await a.client.from('pets').select('id').eq('name', 'Pamuk').single()
  const { data: karabas } = await b.client.from('pets').select('id').eq('name', 'Karabaş').single()
  const view = (client, id) => client.from('food_records_with_schedule').select('*').eq('id', id).single()
  let recordId

  await test('veritabanı hesabı kararlarla aynı (25 gün, 20. gün hatırlatma, 2 paket = 50 gün, bitince yeniden)', async () => {
    const calc = async (total, today) =>
      (await a.client.rpc('food_schedule', { p_start: '2026-12-01', p_total_grams: total, p_daily_grams: 60, p_reminder_days: 5, p_today: today })).data[0]
    const one = await calc(1500, '2026-12-01')
    assert.deepEqual([one.supply_days, one.end_date, one.reminder_date], [25, '2026-12-26', '2026-12-21'])
    const two = await calc(3000, '2026-12-01')
    assert.deepEqual([two.supply_days, two.end_date, two.reminder_date], [50, '2027-01-20', '2027-01-15'])
    const again = await calc(1500, '2026-12-26')
    assert.deepEqual([again.cycle_number, again.cycle_start, again.end_date, again.reminder_date], [2, '2026-12-26', '2027-01-20', '2027-01-15'])
  })

  await test('müşteri hayvanına katalogdan mama ekleyebiliyor; hatırlatma varsayılan 5 gün', async () => {
    const { data, error } = await a.client
      .from('food_records')
      .insert({ pet_id: pamuk.id, product_id: catProduct.id, daily_grams: 60, start_date: today })
      .select('id')
      .single()
    assert.equal(error, null)
    recordId = data.id
    const { data: r } = await view(a.client, recordId)
    assert.equal(r.package_grams, 1500) // katalogdan kopyalandı
    assert.equal(r.product_name, `TEST ürünü 1500 ${run}`)
    assert.equal(r.reminder_enabled, true)
    assert.equal(r.reminder_days_before, 5)
    assert.equal(r.supply_days, 25)
    assert.equal(r.end_date, addDaysIso(today, 25))
    assert.equal(r.reminder_date, addDaysIso(today, 20))
    assert.equal(r.days_left, 25)
  })

  await test('2 paket alınınca toplam gram ÷ günlük gram (50 gün)', async () => {
    await a.client.from('food_records').update({ package_count: 2 }).eq('id', recordId)
    const { data: r } = await view(a.client, recordId)
    assert.deepEqual([r.total_grams, r.supply_days, r.end_date], [3000, 50, addDaysIso(today, 50)])
    await a.client.from('food_records').update({ package_count: 1 }).eq('id', recordId)
  })

  await test('mama bitince sayaç aynı paketle kendiliğinden yeniden başlıyor', async () => {
    await a.client.from('food_records').update({ start_date: addDaysIso(today, -25) }).eq('id', recordId)
    const { data: r } = await view(a.client, recordId)
    assert.deepEqual([r.cycle_number, r.cycle_start, r.end_date, r.reminder_date], [2, today, addDaysIso(today, 25), addDaysIso(today, 20)])
  })

  await test('"yeni paketi başlattım": sayaç bugünden başlıyor', async () => {
    await a.client.from('food_records').update({ start_date: today }).eq('id', recordId)
    const { data: r } = await view(a.client, recordId)
    assert.deepEqual([r.cycle_number, r.cycle_start], [1, today])
  })

  await test('hatırlatma günü 1-20 arasında; kapatılabiliyor', async () => {
    const r0 = await a.client.from('food_records').update({ reminder_days_before: 0 }).eq('id', recordId)
    const r21 = await a.client.from('food_records').update({ reminder_days_before: 21 }).eq('id', recordId)
    const r20 = await a.client.from('food_records').update({ reminder_days_before: 20 }).eq('id', recordId)
    const off = await a.client.from('food_records').update({ reminder_enabled: false }).eq('id', recordId)
    assert.ok(r0.error)
    assert.ok(r21.error)
    assert.equal(r20.error, null)
    assert.equal(off.error, null)
    const { data: r } = await view(a.client, recordId)
    assert.deepEqual([r.reminder_days_before, r.reminder_enabled, r.reminder_date], [20, false, addDaysIso(today, 5)])
  })

  await test('geçersiz kayıtlar reddediliyor (pasif ürün, gelecek tarih, günlük > toplam)', async () => {
    const base = { pet_id: pamuk.id, product_id: catProduct.id, daily_grams: 60, start_date: today }
    const passive = await a.client.from('food_records').insert({ ...base, product_id: passiveProduct.id })
    const future = await a.client.from('food_records').insert({ ...base, start_date: trDate(1) })
    const tooMuch = await a.client.from('food_records').insert({ ...base, daily_grams: 1501 })
    assert.ok(passive.error)
    assert.ok(future.error)
    assert.ok(tooMuch.error)
  })

  await test('müşteri ürün bilgisini (paket gramı) değiştiremiyor', async () => {
    const { error } = await a.client.from('food_records').update({ package_grams: 99999 }).eq('id', recordId)
    assert.ok(error)
  })

  await test('müşteri başkasının hayvanına mama ekleyemiyor, kayıtlarını göremiyor ve silemiyor', async () => {
    const ins = await a.client.from('food_records').insert({ pet_id: karabas.id, product_id: catProduct.id, daily_grams: 60, start_date: today })
    assert.ok(ins.error)
    const seen = await b.client.from('food_records_with_schedule').select('id').eq('id', recordId)
    assert.equal(seen.data.length, 0)
    await b.client.from('food_records').delete().eq('id', recordId)
    await b.client.from('food_records').update({ daily_grams: 1 }).eq('id', recordId)
    const { data: r } = await view(a.client, recordId)
    assert.equal(r.daily_grams, 60)
  })

  await test('yönetici mama kayıtlarını görüyor ama değiştiremiyor', async () => {
    const { data } = await view(adminClient, recordId)
    assert.equal(data.id, recordId)
    await adminClient.from('food_records').update({ daily_grams: 1 }).eq('id', recordId)
    const { data: r } = await view(a.client, recordId)
    assert.equal(r.daily_grams, 60)
  })

  await test('hatırlatma bildirimi için mama kaydıyla birlikte hayvan adı okunabiliyor', async () => {
    const { data, error } = await a.client
      .from('food_records_with_schedule')
      .select('id, brand, product_name, start_date, total_grams, daily_grams, reminder_enabled, reminder_days_before, pets(name)')
      .eq('id', recordId)
      .single()
    assert.equal(error, null)
    assert.equal(data.pets.name, 'Pamuk')
  })

  await test('müşteri mama kaydını silebiliyor', async () => {
    await a.client.from('food_records').delete().eq('id', recordId)
    const { data } = await service.from('food_records').select('id').eq('id', recordId)
    assert.equal(data.length, 0)
  })

  console.log('Sipariş ve teslimat')
  const { data: pT1 } = await service.from('products').select('id, price_try').eq('code', `TEST-${run}-T1`).single()
  const p1500price = Number((await service.from('products').select('price_try').eq('id', catProduct.id).single()).data.price_try)
  const tomorrow = trDate(1)
  const order = (client, id) => client.from('orders').select('*, order_items(*)').eq('id', id).single()
  const cart = [{ product_id: catProduct.id, quantity: 2 }, { product_id: pT1.id, quantity: 1 }]
  const expectedItems = Math.round((p1500price * 2 + Number(pT1.price_try)) * 100) / 100
  let pickupId, addressId

  await test('hastaneden teslim alma: kargo ücreti eklenmiyor, fiyatlar sunucuda hesaplanıyor', async () => {
    const { data, error } = await a.client.rpc('place_order', { items: cart, delivery_type: 'pickup' })
    assert.equal(error, null)
    assert.ok(data.order_no >= 1001)
    pickupId = data.id
    const { data: o } = await order(a.client, pickupId)
    assert.equal(o.status, 'pending')
    assert.equal(Number(o.shipping_fee_try), 0)
    assert.equal(Number(o.items_total_try), expectedItems)
    assert.equal(Number(o.total_try), expectedItems)
    assert.equal(o.delivery_date, null)
    assert.equal(o.order_items.length, 2)
  })

  await test('adrese teslimat: 200 TL kargo ekleniyor; adres, tarih ve saat müşteriden alınıyor', async () => {
    const { data, error } = await a.client.rpc('place_order', {
      items: cart, delivery_type: 'address', delivery_address: 'Demo Mahallesi, Farklı Sokak No:5',
      delivery_date: tomorrow, delivery_time: '14:30',
    })
    assert.equal(error, null)
    addressId = data.id
    const { data: o } = await order(a.client, addressId)
    assert.equal(Number(o.shipping_fee_try), 200)
    assert.equal(Number(o.total_try), expectedItems + 200)
    assert.deepEqual([o.delivery_address, o.delivery_date, o.delivery_time], ['Demo Mahallesi, Farklı Sokak No:5', tomorrow, '14:30:00'])
  })

  await test('adrese teslimatta adres, tarih/saat eksik veya geçmiş zaman reddediliyor', async () => {
    const base = { items: cart, delivery_type: 'address', delivery_address: 'Demo adres No:1', delivery_date: tomorrow, delivery_time: '10:00' }
    const noAddr = await a.client.rpc('place_order', { ...base, delivery_address: '' })
    const noDate = await a.client.rpc('place_order', { ...base, delivery_date: null })
    const past = await a.client.rpc('place_order', { ...base, delivery_date: trDate(-1) })
    assert.match(noAddr.error?.message ?? '', /adres girin/)
    assert.match(noDate.error?.message ?? '', /tarihi ve saati girin/)
    assert.match(past.error?.message ?? '', /ileri bir zaman/)
  })

  await test('geçersiz sepetler reddediliyor (boş, pasif ürün, adet 0, aynı ürün iki kez)', async () => {
    const r = await Promise.all([
      a.client.rpc('place_order', { items: [], delivery_type: 'pickup' }),
      a.client.rpc('place_order', { items: [{ product_id: passiveProduct.id, quantity: 1 }], delivery_type: 'pickup' }),
      a.client.rpc('place_order', { items: [{ product_id: catProduct.id, quantity: 0 }], delivery_type: 'pickup' }),
      a.client.rpc('place_order', { items: [{ product_id: catProduct.id, quantity: 1 }, { product_id: catProduct.id, quantity: 1 }], delivery_type: 'pickup' }),
    ])
    r.forEach((x) => assert.ok(x.error))
  })

  await test('yönetici kargo ücretini değiştirebiliyor; yeni ücret yalnızca yeni siparişlere uygulanıyor', async () => {
    const upd = await adminClient.from('app_settings').update({ shipping_fee_try: 250 }).eq('id', true).select()
    assert.equal(upd.error, null)
    const { data } = await a.client.rpc('place_order', {
      items: cart, delivery_type: 'address', delivery_address: 'Demo adres No:2', delivery_date: tomorrow, delivery_time: '11:00',
    })
    const { data: fresh } = await order(a.client, data.id)
    const { data: old } = await order(a.client, addressId)
    await adminClient.from('app_settings').update({ shipping_fee_try: 200 }).eq('id', true)
    assert.equal(Number(fresh.shipping_fee_try), 250)
    assert.equal(Number(old.shipping_fee_try), 200)
    await a.client.rpc('cancel_order', { order_id: data.id })
  })

  await test('müşteri kargo ücretini okuyabiliyor ama değiştiremiyor', async () => {
    const { data } = await a.client.from('app_settings').select('shipping_fee_try').single()
    assert.equal(Number(data.shipping_fee_try), 200)
    await a.client.from('app_settings').update({ shipping_fee_try: 0 }).eq('id', true)
    const { data: after } = await service.from('app_settings').select('shipping_fee_try').single()
    assert.equal(Number(after.shipping_fee_try), 200)
  })

  await test('katalog fiyatı sonradan değişse de verilmiş siparişin fiyatı değişmiyor', async () => {
    await adminClient.from('products').update({ price_try: 999 }).eq('id', pT1.id)
    const { data: o } = await order(a.client, pickupId)
    await adminClient.from('products').update({ price_try: pT1.price_try }).eq('id', pT1.id)
    assert.equal(Number(o.items_total_try), expectedItems)
  })

  await test('onaydan önce teslim şekli değişince kargo ücreti eklenip kalkıyor', async () => {
    await a.client.rpc('update_order_delivery', { order_id: addressId, delivery_type: 'pickup' })
    let { data: o } = await order(a.client, addressId)
    assert.deepEqual([Number(o.shipping_fee_try), o.delivery_address], [0, null])
    await a.client.rpc('update_order_delivery', {
      order_id: addressId, delivery_type: 'address', delivery_address: 'Demo adres No:3', delivery_date: tomorrow, delivery_time: '16:00',
    })
    ;({ data: o } = await order(a.client, addressId))
    assert.deepEqual([Number(o.shipping_fee_try), Number(o.total_try)], [200, expectedItems + 200])
  })

  await test('müşteri siparişlere doğrudan yazamıyor (durum, fiyat)', async () => {
    const ins = await a.client.from('orders').insert({ customer_id: a.data.user.id, delivery_type: 'pickup', items_total_try: 0, shipping_fee_try: 0, total_try: 0 })
    assert.ok(ins.error)
    await a.client.from('orders').update({ status: 'approved', total_try: 1 }).eq('id', pickupId)
    const { data: o } = await order(a.client, pickupId)
    assert.equal(o.status, 'pending')
  })

  await test('başka müşteri siparişi göremiyor ve iptal edemiyor', async () => {
    const seen = await b.client.from('orders').select('id').eq('id', pickupId)
    const items = await b.client.from('order_items').select('id').eq('order_id', pickupId)
    assert.equal(seen.data.length, 0)
    assert.equal(items.data.length, 0)
    const c = await b.client.rpc('cancel_order', { order_id: pickupId })
    assert.ok(c.error)
  })

  await test('müşteri onay veremiyor; yönetici onaylayabiliyor', async () => {
    const r = await a.client.rpc('admin_set_order_status', { order_id: pickupId, new_status: 'approved' })
    assert.ok(r.error)
    const ok = await adminClient.rpc('admin_set_order_status', { order_id: pickupId, new_status: 'approved' })
    assert.equal(ok.error, null)
    const { data: o } = await order(a.client, pickupId)
    assert.deepEqual([o.status, o.status_changed_by], ['approved', 'admin'])
  })

  await test('onaydan sonra müşteri iptal edemiyor ve teslim şeklini değiştiremiyor', async () => {
    const c = await a.client.rpc('cancel_order', { order_id: pickupId })
    const u = await a.client.rpc('update_order_delivery', { order_id: pickupId, delivery_type: 'pickup' })
    assert.match(c.error?.message ?? '', /hastaneyle iletişime/)
    assert.match(u.error?.message ?? '', /hastaneyle iletişime/)
  })

  await test('"Teslim aldım" yalnızca onaylanmış siparişte; durum panelle aynı', async () => {
    const early = await a.client.rpc('confirm_received', { order_id: addressId })
    assert.ok(early.error)
    const ok = await a.client.rpc('confirm_received', { order_id: pickupId })
    assert.equal(ok.error, null)
    const { data: forCustomer } = await order(a.client, pickupId)
    const { data: forAdmin } = await order(adminClient, pickupId)
    assert.deepEqual([forCustomer.status, forAdmin.status, forAdmin.status_changed_by], ['delivered', 'delivered', 'customer'])
  })

  await test('geçersiz durum geçişleri reddediliyor', async () => {
    const back = await adminClient.rpc('admin_set_order_status', { order_id: pickupId, new_status: 'approved' })
    const jump = await adminClient.rpc('admin_set_order_status', { order_id: addressId, new_status: 'delivered' })
    assert.ok(back.error)
    assert.ok(jump.error)
  })

  await test('müşteri onay bekleyen siparişi iptal edebiliyor; yönetici onaylı siparişi iptal edebiliyor', async () => {
    const c = await a.client.rpc('cancel_order', { order_id: addressId })
    assert.equal(c.error, null)
    const { data } = await a.client.rpc('place_order', { items: cart, delivery_type: 'pickup' })
    await adminClient.rpc('admin_set_order_status', { order_id: data.id, new_status: 'approved' })
    const x = await adminClient.rpc('admin_set_order_status', { order_id: data.id, new_status: 'cancelled' })
    assert.equal(x.error, null)
  })

  await test('teslimattan sonra "yeni paketi başlattım": mama sayacı bugünden, siparişteki adetle başlıyor', async () => {
    const { data: rec } = await a.client
      .from('food_records')
      .insert({ pet_id: pamuk.id, product_id: catProduct.id, daily_grams: 60, start_date: trDate(-10) })
      .select('id')
      .single()
    const { data: o } = await order(a.client, pickupId)
    const item = o.order_items.find((i) => i.product_id === catProduct.id)
    const { data: n, error } = await a.client.rpc('answer_new_package', { order_item_id: item.id, answer: 'started' })
    assert.equal(error, null)
    assert.equal(n, 1)
    const { data: r } = await view(a.client, rec.id)
    assert.deepEqual([r.start_date, r.package_count, r.supply_days], [trDate(0), 2, 50])
    await a.client.from('food_records').delete().eq('id', rec.id)
  })

  await test('teslim edilmemiş siparişte "yeni paket" sorusu cevaplanamıyor', async () => {
    const { data } = await a.client.rpc('place_order', { items: cart, delivery_type: 'pickup' })
    const { data: o } = await order(a.client, data.id)
    const r = await a.client.rpc('answer_new_package', { order_item_id: o.order_items[0].id, answer: 'started' })
    assert.ok(r.error)
  })

  await test('yönetici tüm siparişleri görüyor', async () => {
    const { data } = await adminClient.from('orders').select('id').eq('customer_id', a.data.user.id)
    assert.ok(data.length >= 4)
  })
} finally {
  // Test siparişlerini, ürünlerini ve görsellerini temizle
  await service.from('orders').delete().in('customer_id', createdUserIds)
  if (createdProductIds.length) await service.from('products').delete().in('id', createdProductIds)
  if (createdImagePaths.length) await service.storage.from('product-images').remove(createdImagePaths)
  // Demo kullanıcılarını temizle (profiller ve hayvanlar zincirleme silinir).
  for (const id of createdUserIds) await service.auth.admin.deleteUser(id)
}

console.log(`\n${passed} test geçti${process.exitCode ? ', bazı testler BAŞARISIZ' : ''}.`)
