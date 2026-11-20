// Toplu yükleme denetim kuralları için testler.  Çalıştırma: npm run test -w admin
import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Product } from './model.ts'
import { buildPreview, matchHeaders, parseBrand, parseGrams, parsePrice, parseSpecies, rowsToImport, type RawRow } from './rows.ts'

// DEMO / TEST VERİSİ: Aşağıdaki ürünler gerçek değildir.
const valid = {
  brand: 'Proplan',
  name: 'TEST ürünü A',
  species: 'Kedi',
  package_grams: '1500',
  price_try: '1.249,90',
  code: 'TEST-1',
}

const row = (n: number, cells: RawRow['cells']): RawRow => ({ rowNumber: n, cells })

const existingProduct: Product = {
  id: '00000000-0000-0000-0000-000000000001',
  brand: 'Proplan',
  name: 'TEST eski ad',
  species: 'cat',
  series: null,
  flavor: null,
  age_group: null,
  package_grams: 1500,
  price_try: 1000,
  code: 'TEST-1',
  description: null,
  image_path: null,
  is_active: true,
  created_at: '',
  updated_at: '',
}

test('başlıklar harf ve noktalama farklarına rağmen eşleşir', () => {
  const { map, missing } = matchHeaders(['MARKA', 'urun adi', 'Hayvan Türü', 'Paket ağırlığı (gram)', 'Satış Fiyatı (TL)'])
  assert.equal(map.size, 5)
  assert.deepEqual(missing, [])
})

test('zorunlu başlık eksikse bildirilir', () => {
  const { missing } = matchHeaders(['Marka', 'Ürün adı'])
  assert.deepEqual(missing, ['Hayvan türü', 'Paket ağırlığı (gram)', 'Satış fiyatı (TL)'])
})

test('marka yazım farkları tanınır', () => {
  assert.equal(parseBrand('hills'), "Hill's")
  assert.equal(parseBrand('Hill’s'), "Hill's")
  assert.equal(parseBrand('ROYAL CANIN'), 'Royal Canin')
  assert.equal(parseBrand('Pro Plan'), 'Proplan')
  assert.equal(parseBrand('Başka Marka'), null)
})

test('hayvan türü', () => {
  assert.equal(parseSpecies('KEDİ'), 'cat')
  assert.equal(parseSpecies('köpek'), 'dog')
  assert.equal(parseSpecies('Her ikisi'), 'both')
  assert.equal(parseSpecies('kuş'), null)
})

test('gram', () => {
  assert.equal(parseGrams('1500'), 1500)
  assert.equal(parseGrams('1.500'), 1500)
  assert.equal(parseGrams(3000), 3000)
  assert.equal(parseGrams('1500 g'), 1500)
  assert.equal(parseGrams('1,5'), null)
  assert.equal(parseGrams(1.5), null)
})

test('fiyat', () => {
  assert.equal(parsePrice('1.249,90'), 1249.9)
  assert.equal(parsePrice('1249,90'), 1249.9)
  assert.equal(parsePrice('1249'), 1249)
  assert.equal(parsePrice('1.249'), 1249)
  assert.equal(parsePrice('1249.90'), 1249.9)
  assert.equal(parsePrice('1249,90 TL'), 1249.9)
  assert.equal(parsePrice(1249.9), 1249.9)
  assert.equal(parsePrice('bin lira'), null)
  assert.equal(parsePrice('1,2,3'), null)
})

test('geçerli satır yeni ürün olur', () => {
  const p = buildPreview([row(2, valid)], [])
  assert.equal(p.rows[0].status, 'new')
  assert.equal(p.rows[0].product?.price_try, 1249.9)
  assert.equal(p.rows[0].product?.is_active, true)
  assert.equal(rowsToImport(p).length, 1)
})

test('eksik ve hatalı alanlar anlaşılır şekilde bildirilir', () => {
  const p = buildPreview([row(2, { brand: 'X', name: '', species: 'kuş', package_grams: '1,5', price_try: 'abc' })], [])
  const errs = p.rows[0].errors.join(' | ')
  assert.equal(p.rows[0].status, 'error')
  assert.match(errs, /Marka tanınmadı/)
  assert.match(errs, /Ürün adı boş/)
  assert.match(errs, /Hayvan türü tanınmadı/)
  assert.match(errs, /1500/)
  assert.match(errs, /Satış fiyatı okunamadı/)
  assert.equal(p.counts.error, 1)
})

test('şablondaki örnek satır içe aktarılmaz', () => {
  const p = buildPreview([row(2, { ...valid, name: 'ÖRNEK — içe aktarmadan önce silin' })], [])
  assert.equal(p.rows[0].status, 'error')
})

test('boş satırlar yok sayılır', () => {
  const p = buildPreview([row(2, valid), row(3, { brand: '', name: ' ' })], [])
  assert.equal(p.counts.total, 1)
})

test('dosya içinde aynı barkod iki satırda hata verir', () => {
  const p = buildPreview([row(2, valid), row(3, { ...valid, code: ' test-1 ' })], [])
  assert.equal(p.counts.error, 2)
  assert.match(p.rows[0].errors[0], /Mükerrer/)
})

test('katalogda kayıtlı barkod güncelleme olarak işaretlenir ve farklar gösterilir', () => {
  const p = buildPreview([row(2, valid)], [existingProduct])
  assert.equal(p.rows[0].status, 'update')
  assert.equal(p.counts.update, 1)
  const fields = p.rows[0].changes.map((c) => c.field)
  assert.deepEqual(fields, ['Ürün adı', 'Satış fiyatı (TL)'])
  assert.equal(rowsToImport(p)[0].id, existingProduct.id)
})

test('kayıtlı ürünle aynı bilgiler değişiklik sayılmaz', () => {
  const p = buildPreview([row(2, { ...valid, name: 'TEST eski ad', price_try: '1000' })], [existingProduct])
  assert.equal(p.counts.unchanged, 1)
  assert.equal(rowsToImport(p).length, 0)
})

test('barkodsuz benzer ürün için uyarı verilir', () => {
  const p = buildPreview([row(2, { ...valid, code: '', name: 'TEST eski ad' })], [existingProduct])
  assert.equal(p.rows[0].status, 'new')
  assert.equal(p.rows[0].warnings.length, 1)
})
