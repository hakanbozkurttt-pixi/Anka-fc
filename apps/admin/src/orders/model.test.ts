// Panel sipariş araması testleri. DEMO VERİSİ.
process.env.TZ = 'Europe/Istanbul'

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { ADMIN_ACTIONS, matchesOrder, type AdminOrder } from './model.ts'

const o = {
  id: 'x',
  order_no: 1001,
  status: 'pending',
  created_at: '2026-11-20T21:30:00Z', // Türkiye saatiyle 21.11.2026 00:30
  customer: { first_name: 'Demo', last_name: 'Müşteri', phone: '0500 000 00 07', email: 'demo@example.com' },
} as unknown as AdminOrder

test('müşteri adı, telefon ve sipariş numarasıyla arama', () => {
  assert.ok(matchesOrder(o, 'demo müş', ''))
  assert.ok(matchesOrder(o, '0000007', ''))
  assert.ok(matchesOrder(o, '#1001', ''))
  assert.ok(!matchesOrder(o, '1002', ''))
})

test('sipariş tarihi Türkiye saatine göre', () => {
  assert.ok(matchesOrder(o, '', '2026-11-21'))
  assert.ok(!matchesOrder(o, '', '2026-11-20'))
})

test('yönetici durum işlemleri: onay bekleyen → onayla/iptal, onaylı → teslim/iptal, diğerleri yok', () => {
  assert.deepEqual(ADMIN_ACTIONS.pending.map((a) => a.status), ['approved', 'cancelled'])
  assert.deepEqual(ADMIN_ACTIONS.approved.map((a) => a.status), ['delivered', 'cancelled'])
  assert.equal(ADMIN_ACTIONS.delivered.length + ADMIN_ACTIONS.cancelled.length, 0)
})
