// Mama süresi ve hatırlatma hesabı.
// Asıl hesap veritabanında (food_schedule) yapılır; bu dosya, müşteri formu
// doldururken anında önizleme göstermek için AYNI kuralları uygular.
// İki tarafın aynı sonucu verdiği testlerle denetlenir.

export const DEFAULT_REMINDER_DAYS = 5;
export const MIN_REMINDER_DAYS = 1;
export const MAX_REMINDER_DAYS = 20;

/** Mamanın yettiği tam gün sayısı (aşağı yuvarlanır, en az 1). */
export function supplyDays(totalGrams: number, dailyGrams: number): number {
  return Math.max(1, Math.floor(totalGrams / dailyGrams));
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(a) - toUtc(b)) / 86400000);
}

export type Schedule = {
  supplyDays: number;
  cycleNumber: number;
  cycleStart: string;
  endDate: string;
  reminderDate: string;
  daysLeft: number;
};

/**
 * @param start       Başlangıç tarihi (YYYY-AA-GG)
 * @param totalGrams  Paket gramı × paket sayısı
 * @param dailyGrams  Günlük tüketim (gram)
 * @param reminderDays Bitişten kaç gün önce hatırlatılacak (1-20)
 * @param today       Bugün (YYYY-AA-GG)
 */
export function foodSchedule(
  start: string,
  totalGrams: number,
  dailyGrams: number,
  reminderDays: number,
  today: string,
): Schedule {
  const sd = supplyDays(totalGrams, dailyGrams);
  const elapsed = diffDays(today, start);
  // Mama bitince sayaç aynı paketle yeniden başlar.
  const k = elapsed < 0 ? 0 : Math.floor(elapsed / sd);
  const cycleStart = addDays(start, k * sd);
  const endDate = addDays(start, (k + 1) * sd);
  const reminder = addDays(endDate, -reminderDays);
  return {
    supplyDays: sd,
    cycleNumber: k + 1,
    cycleStart,
    endDate,
    reminderDate: reminder < cycleStart ? cycleStart : reminder,
    daysLeft: diffDays(endDate, today),
  };
}
