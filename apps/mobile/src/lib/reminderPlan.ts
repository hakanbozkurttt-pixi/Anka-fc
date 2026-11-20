// Mama hatırlatma bildirimlerinin planı (hangi gün, hangi saatte, hangi metinle).
// Bildirimi telefon kendisi gösterir; sunucu veya ek hesap gerekmez.
// Bu dosya yalnızca hesap yapar, testlerle denetlenir. Planı telefona işleyen kod: reminders.ts

import { foodSchedule } from './foodSchedule.ts';

/** Hatırlatmanın gösterileceği saat (yerel saat). */
export const REMINDER_HOUR = 10;
/** Uygulama uzun süre açılmasa da hatırlatma kesilmesin diye ileriye dönük planlanan döngü sayısı. */
export const CYCLES_AHEAD = 3;
/** Telefonların planlı bildirim sınırının (iOS: 64) altında kalmak için üst sınır. */
export const MAX_SCHEDULED = 60;

export type ReminderSource = {
  id: string;
  pet_name: string;
  brand: string;
  product_name: string;
  start_date: string;
  total_grams: number;
  daily_grams: number;
  reminder_enabled: boolean;
  reminder_days_before: number;
};

export type PlannedReminder = {
  /** Aynı hatırlatmanın iki kez gösterilmemesi için: kayıt + hatırlatma günü */
  key: string;
  recordId: string;
  date: Date;
  /** Hatırlatma günü geldi ama saat geçtiyse hemen gösterilir. */
  late: boolean;
  title: string;
  body: string;
};

function localIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function atHour(iso: string, hour: number) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, hour, 0, 0, 0);
}

function trDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function daysBetween(a: string, b: string) {
  return Math.round((atHour(a, 12).getTime() - atHour(b, 12).getTime()) / 86400000);
}

/**
 * @param records   Müşterinin mama kayıtları
 * @param now       Şu an
 * @param shownLate Bugün "geç" olarak zaten gösterilmiş hatırlatmaların anahtarları
 */
export function planReminders(records: ReminderSource[], now: Date, shownLate: Set<string> = new Set()): PlannedReminder[] {
  const today = localIso(now);
  const planned: PlannedReminder[] = [];

  for (const r of records) {
    if (!r.reminder_enabled) continue;
    let s = foodSchedule(r.start_date, r.total_grams, r.daily_grams, r.reminder_days_before, today);
    for (let i = 0; i < CYCLES_AHEAD; i++) {
      const key = `${r.id}:${s.reminderDate}`;
      const when = atHour(s.reminderDate, REMINDER_HOUR);
      const daysToEnd = daysBetween(s.endDate, s.reminderDate);
      const reminder = {
        key,
        recordId: r.id,
        title: 'Mama hatırlatması',
        body:
          `${r.pet_name} için ${r.brand} ${r.product_name} tahminen ${trDate(s.endDate)} tarihinde bitecek` +
          (daysToEnd > 0 ? ` (${daysToEnd} gün sonra). ` : '. ') +
          'Sipariş vermek isterseniz uygulamayı açabilirsiniz.',
      };
      if (when > now) {
        planned.push({ ...reminder, date: when, late: false });
      } else if (s.reminderDate === today && s.endDate > today && !shownLate.has(key)) {
        // Hatırlatma günü bugün ama saat geçmiş (ör. kayıt bugün eklendi): hemen göster, bir kez.
        planned.push({ ...reminder, date: new Date(now.getTime() + 5000), late: true });
      }
      // Mama bitince sayaç aynı paketle yeniden başlar: sonraki döngü
      s = foodSchedule(r.start_date, r.total_grams, r.daily_grams, r.reminder_days_before, s.endDate);
    }
  }

  return planned.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_SCHEDULED);
}
