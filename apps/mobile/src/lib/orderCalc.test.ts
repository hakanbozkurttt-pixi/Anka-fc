// Sipariş özeti ve durum bildirimi testleri.
process.env.TZ = 'Europe/Istanbul';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cartTotals, deliveryTimeError, discountedPrice, parseTime } from './orderCalc.ts';
import { orderNotices, type OrderStatusRow } from './orderNotices.ts';

test('hastaneden teslim almada kargo ücreti eklenmez', () => {
  assert.deepEqual(cartTotals([{ listPrice: 120.75, quantity: 2 }, { listPrice: 100, quantity: 1 }], 'pickup', 200), {
    list: 341.5,
    discount: 0,
    items: 341.5,
    shipping: 0,
    total: 341.5,
  });
});

test('adrese teslimatta ayarlardaki kargo ücreti eklenir (200 TL veya yöneticinin belirlediği)', () => {
  assert.equal(cartTotals([{ listPrice: 100, quantity: 1 }], 'address', 200).total, 300);
  assert.equal(cartTotals([{ listPrice: 100, quantity: 1 }], 'address', 250).total, 350);
});

test('indirimli birim fiyat kuruşa yuvarlanır (veritabanıyla aynı)', () => {
  assert.equal(discountedPrice(250.5, 20), 200.4);
  assert.equal(discountedPrice(250.5, 10), 225.45);
  assert.equal(discountedPrice(99.99, 10), 89.99); // 89,991 → 89,99
  assert.equal(discountedPrice(0.05, 10), 0.05); // 0,045 → 0,05 (yarım yukarı)
});

test('ilk sipariş %20: indirim yalnızca ürünlere, kargoya uygulanmaz', () => {
  const t = cartTotals([{ listPrice: 250.5, quantity: 2 }, { listPrice: 1000, quantity: 1 }], 'address', 200, 20);
  assert.deepEqual(t, { list: 1501, discount: 300.2, items: 1200.8, shipping: 200, total: 1400.8 });
});

test('sonraki siparişler %10', () => {
  const t = cartTotals([{ listPrice: 250.5, quantity: 2 }, { listPrice: 1000, quantity: 1 }], 'pickup', 200, 10);
  assert.deepEqual(t, { list: 1501, discount: 150.1, items: 1350.9, shipping: 0, total: 1350.9 });
});

test('saat okuma', () => {
  assert.equal(parseTime('14:30'), '14:30');
  assert.equal(parseTime('9.05'), '09:05');
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('abc'), null);
});

test('teslimat zamanı ileri bir zaman olmalı, en fazla 90 gün sonra', () => {
  const now = '2026-11-20T15:00';
  assert.match(deliveryTimeError('2026-11-20', '14:00', now)!, /ileri/);
  assert.equal(deliveryTimeError('2026-11-20', '18:00', now), null);
  assert.equal(deliveryTimeError('2027-02-18', '10:00', now), null);
  assert.match(deliveryTimeError('2027-02-19', '10:00', now)!, /90 gün/);
});

const row = (o: Partial<OrderStatusRow>): OrderStatusRow => ({
  id: 'o1',
  order_no: 1001,
  status: 'pending',
  status_changed_at: '2026-11-20T10:00:00Z',
  status_changed_by: 'customer',
  ...o,
});

test('cihazdaki ilk kontrolde eski değişiklikler için bildirim gösterilmez', () => {
  const r = orderNotices([row({ status: 'approved', status_changed_by: 'admin' })], null);
  assert.equal(r.notices.length, 0);
  assert.equal(r.seen.o1, '2026-11-20T10:00:00Z');
});

test('hastane onaylayınca uygulama açıldığında bildirim gösterilir, bir kez', () => {
  const seen = { o1: '2026-11-20T10:00:00Z' };
  const approved = row({ status: 'approved', status_changed_by: 'admin', status_changed_at: '2026-11-20T11:00:00Z' });
  const first = orderNotices([approved], seen);
  assert.equal(first.notices.length, 1);
  assert.equal(first.notices[0].title, 'Sipariş #1001: Onaylandı');
  assert.equal(orderNotices([approved], first.seen).notices.length, 0);
});

test('müşterinin kendi iptali veya "Teslim aldım" işlemi için bildirim gösterilmez', () => {
  const seen = { o1: '2026-11-20T10:00:00Z' };
  const own = row({ status: 'cancelled', status_changed_by: 'customer', status_changed_at: '2026-11-20T11:00:00Z' });
  assert.equal(orderNotices([own], seen).notices.length, 0);
});

test('hastane iptal veya teslim edildi yaparsa bildirim gösterilir', () => {
  const seen = { o1: '2026-11-20T10:00:00Z', o2: '2026-11-20T10:00:00Z' };
  const r = orderNotices(
    [
      row({ status: 'cancelled', status_changed_by: 'admin', status_changed_at: '2026-11-20T12:00:00Z' }),
      row({ id: 'o2', order_no: 1002, status: 'delivered', status_changed_by: 'admin', status_changed_at: '2026-11-20T12:00:00Z' }),
    ],
    seen,
  );
  assert.deepEqual(r.notices.map((n) => n.title), ['Sipariş #1001: İptal edildi', 'Sipariş #1002: Teslim edildi']);
});
