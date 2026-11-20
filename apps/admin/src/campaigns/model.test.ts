// Kampanya kuralları (panel) testleri. DEMO VERİSİ.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { campaignStatus, todayTr, validateCampaign, type CampaignForm } from './model.ts'

const base: CampaignForm = {
  name: 'Demo kampanya',
  type: 'percent',
  percent: 15,
  start: '2026-12-01',
  end: '2026-12-31',
  items: [{ productId: 'p1', listPrice: 250.5, fixedPrice: null }],
}

test('kampanya durumu: başlangıç ve bitiş günleri dahil', () => {
  assert.equal(campaignStatus('2026-12-01', '2026-12-31', '2026-11-30'), 'upcoming')
  assert.equal(campaignStatus('2026-12-01', '2026-12-31', '2026-12-01'), 'active')
  assert.equal(campaignStatus('2026-12-01', '2026-12-31', '2026-12-31'), 'active')
  assert.equal(campaignStatus('2026-12-01', '2026-12-31', '2027-01-01'), 'ended')
})

test('bugün Türkiye saatine göre', () => {
  assert.equal(todayTr(new Date('2026-11-30T22:30:00Z')), '2026-12-01')
})

test('geçerli kampanya', () => {
  assert.deepEqual(validateCampaign(base, 10), { errors: [], warnings: [] })
})

test('eksik bilgiler', () => {
  const r = validateCampaign({ ...base, name: ' ', end: '2026-11-01', items: [], percent: 0 }, 10)
  assert.equal(r.errors.length, 4)
})

test('sabit indirimden düşük oranlı kampanya için uyarı (kayıt engellenmez)', () => {
  const r = validateCampaign({ ...base, percent: 10 }, 10)
  assert.equal(r.errors.length, 0)
  assert.equal(r.warnings.length, 1)
})

test('sabit fiyatlı kampanya: fiyat zorunlu; sabit indirimden pahalıysa uyarı', () => {
  const fixed = { ...base, type: 'fixed_price' as const, percent: null }
  assert.equal(validateCampaign(fixed, 10).errors.length, 1)
  const pricey = { ...fixed, items: [{ productId: 'p1', listPrice: 250.5, fixedPrice: 240 }] }
  assert.deepEqual([validateCampaign(pricey, 10).errors.length, validateCampaign(pricey, 10).warnings.length], [0, 1])
  const good = { ...fixed, items: [{ productId: 'p1', listPrice: 250.5, fixedPrice: 199 }] }
  assert.deepEqual(validateCampaign(good, 10), { errors: [], warnings: [] })
})
