// Mama süresi ve hatırlatma hesabı testleri (kararlar: 20.11.2026).
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_REMINDER_DAYS, foodSchedule, supplyDays } from './foodSchedule.ts';

const start = '2026-12-01';

test('1.500 g paket, günde 60 g → 25 gün', () => {
  const s = foodSchedule(start, 1500, 60, DEFAULT_REMINDER_DAYS, start);
  assert.equal(s.supplyDays, 25);
  assert.equal(s.endDate, '2026-12-26');
  assert.equal(s.daysLeft, 25);
});

test('hatırlatma varsayılan olarak bitişten 5 gün önce, yaklaşık 20. gün', () => {
  const s = foodSchedule(start, 1500, 60, DEFAULT_REMINDER_DAYS, start);
  assert.equal(s.reminderDate, '2026-12-21'); // 01.12 + 20 gün
});

test('müşteri hatırlatmayı 1 veya 20 gün önceye ayarlayabilir', () => {
  assert.equal(foodSchedule(start, 1500, 60, 1, start).reminderDate, '2026-12-25');
  assert.equal(foodSchedule(start, 1500, 60, 20, start).reminderDate, '2026-12-06');
});

test('birden fazla paket: toplam gram ÷ günlük gram (2 × 1.500 g → 50 gün)', () => {
  const s = foodSchedule(start, 2 * 1500, 60, 5, start);
  assert.equal(s.supplyDays, 50);
  assert.equal(s.endDate, '2027-01-20');
  assert.equal(s.reminderDate, '2027-01-15');
});

test('mama bitince sayaç aynı paketle yeniden başlar', () => {
  const lastDay = foodSchedule(start, 1500, 60, 5, '2026-12-25');
  assert.equal(lastDay.cycleNumber, 1);
  assert.equal(lastDay.daysLeft, 1);
  const next = foodSchedule(start, 1500, 60, 5, '2026-12-26');
  assert.equal(next.cycleNumber, 2);
  assert.equal(next.cycleStart, '2026-12-26');
  assert.equal(next.endDate, '2027-01-20');
  assert.equal(next.reminderDate, '2027-01-15');
  assert.equal(foodSchedule(start, 1500, 60, 5, '2027-01-20').cycleNumber, 3);
});

test('tam bölünmeyen süre aşağı yuvarlanır (1.500 g ÷ 70 g = 21 gün)', () => {
  assert.equal(supplyDays(1500, 70), 21);
});

test('hatırlatma süresi mamadan uzunsa hatırlatma döngü başına çekilir', () => {
  const s = foodSchedule(start, 400, 100, 20, start); // 4 günlük mama
  assert.equal(s.reminderDate, start);
});
