// Mama hatırlatma bildirimi planı testleri. Testler Türkiye saat diliminde çalışır.
process.env.TZ = 'Europe/Istanbul';

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CYCLES_AHEAD, MAX_SCHEDULED, planReminders, REMINDER_HOUR, type ReminderSource } from './reminderPlan.ts';

// DEMO VERİSİ
const record: ReminderSource = {
  id: 'demo-1',
  pet_name: 'Demo Pamuk',
  brand: 'Carni',
  product_name: 'TEST mama',
  start_date: '2026-12-01',
  total_grams: 1500,
  daily_grams: 60,
  reminder_enabled: true,
  reminder_days_before: 5,
};
const at = (iso: string, h = 9) => new Date(`${iso}T${String(h).padStart(2, '0')}:00:00`);

test('ilk hatırlatma 20. günde (21.12.2026) saat 10:00, bitişten 5 gün önce', () => {
  const [first] = planReminders([record], at('2026-12-01'));
  assert.equal(first.date.getTime(), new Date(2026, 11, 21, REMINDER_HOUR).getTime());
  assert.equal(first.late, false);
  assert.match(first.body, /Demo Pamuk için Carni TEST mama tahminen 26\.12\.2026 tarihinde bitecek \(5 gün sonra\)/);
});

test('bildirim metni sipariş oluşturulduğunu söylemez; yalnızca hatırlatır', () => {
  const [first] = planReminders([record], at('2026-12-01'));
  assert.match(first.body, /Sipariş vermek isterseniz uygulamayı açabilirsiniz/);
  assert.doesNotMatch(first.body, /sipariş(iniz)? (oluşturuldu|verildi)/i);
});

test('mama bitince sayaç yeniden başladığı için sonraki döngülerin hatırlatmaları da planlanır', () => {
  const plan = planReminders([record], at('2026-12-01'));
  assert.equal(plan.length, CYCLES_AHEAD);
  assert.deepEqual(
    plan.map((p) => p.key),
    ['demo-1:2026-12-21', 'demo-1:2027-01-15', 'demo-1:2027-02-09'],
  );
});

test('müşterinin seçtiği gün sayısı kullanılır (20 gün önce → 06.12.2026)', () => {
  const [first] = planReminders([{ ...record, reminder_days_before: 20 }], at('2026-12-01'));
  assert.equal(first.key, 'demo-1:2026-12-06');
});

test('hatırlatması kapalı kayıt için bildirim planlanmaz', () => {
  assert.equal(planReminders([{ ...record, reminder_enabled: false }], at('2026-12-01')).length, 0);
});

test('hatırlatma günü bugün ve saat 10:00 geçtiyse hemen, yalnızca bir kez gösterilir', () => {
  const now = at('2026-12-21', 15);
  const [late] = planReminders([record], now);
  assert.equal(late.late, true);
  assert.equal(late.key, 'demo-1:2026-12-21');
  const again = planReminders([record], now, new Set([late.key]));
  assert.ok(again.every((p) => !p.late));
});

test('saati geçmiş eski hatırlatmalar tekrar gösterilmez', () => {
  const plan = planReminders([record], at('2026-12-23'));
  assert.ok(plan.every((p) => p.date > at('2026-12-23')));
  assert.equal(plan[0].key, 'demo-1:2027-01-15');
});

test('planlı bildirim sayısı telefon sınırının altında kalır', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ ...record, id: `demo-${i}` }));
  assert.equal(planReminders(many, at('2026-12-01')).length, MAX_SCHEDULED);
});
