// Doğrulama kuralları testleri.  Çalıştırma: npm run test -w mobile
// Testler Türkiye saat diliminde çalışır (telefonların saat dilimi).
process.env.TZ = 'Europe/Istanbul';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isValidOtp,
  isValidPhone,
  parseDecimal,
  parseTurkishDate,
  todayLocalIso,
  validateSignUp,
  type SignUpInput,
} from './validation.ts';

// DEMO VERİSİ
const demo: SignUpInput = {
  firstName: 'Demo',
  lastName: 'Müşteri',
  phone: '0500 000 00 00',
  address: 'Demo Mahallesi No:1',
  email: 'demo@example.com',
  password: 'DemoSifre123',
  passwordRepeat: 'DemoSifre123',
  kvkkAccepted: true,
};

test('kayıt: tüm zorunlu alanlar doluysa hata yok', () => {
  assert.deepEqual(validateSignUp(demo), {});
});

test('kayıt: ad, soyad, telefon, adres, e-posta zorunlu', () => {
  const errors = validateSignUp({ ...demo, firstName: ' ', lastName: '', phone: '', address: '', email: '' });
  assert.deepEqual(Object.keys(errors).sort(), ['address', 'email', 'firstName', 'lastName', 'phone']);
});

test('kayıt: KVKK onayı zorunlu', () => {
  assert.ok(validateSignUp({ ...demo, kvkkAccepted: false }).kvkkAccepted);
});

test('kayıt: şifre en az 8 karakter ve tekrarı eşleşmeli', () => {
  assert.ok(validateSignUp({ ...demo, password: 'kisa', passwordRepeat: 'kisa' }).password);
  assert.ok(validateSignUp({ ...demo, passwordRepeat: 'farkli123' }).passwordRepeat);
});

test('telefon', () => {
  assert.ok(isValidPhone('0500 000 00 00'));
  assert.ok(isValidPhone('+90 (500) 000-00-00'));
  assert.ok(!isValidPhone('12345'));
  assert.ok(!isValidPhone('0500abc0000'));
});

test('doğrulama kodu 6 rakam', () => {
  assert.ok(isValidOtp('123456'));
  assert.ok(!isValidOtp('12345'));
  assert.ok(!isValidOtp('12a456'));
});

test('tarih ve kilo okuma', () => {
  assert.equal(parseTurkishDate('01.05.2022'), '2022-05-01');
  assert.equal(parseTurkishDate('31.02.2022'), null);
  assert.equal(parseDecimal('18,5'), 18.5);
  assert.equal(parseDecimal('abc'), null);
});

test('bugünün tarihi Türkiye saatine göre (gece 00:00-03:00 arası dahil)', () => {
  // Türkiye saatiyle 21.11.2026 01:30 = 20.11.2026 22:30 UTC
  const now = new Date('2026-11-20T22:30:00Z');
  assert.equal(todayLocalIso(now), '2026-11-21');
  assert.equal(todayLocalIso(new Date(2026, 10, 21, 1, 30)), '2026-11-21');
});
