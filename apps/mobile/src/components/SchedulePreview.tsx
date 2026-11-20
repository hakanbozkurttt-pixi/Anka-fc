import { Text, View } from 'react-native';

import { formatKg } from '../lib/food';
import { foodSchedule } from '../lib/foodSchedule';
import { formatTurkishDate } from '../lib/validation';
import { colors } from './ui';

type Props = {
  packageGrams: number;
  packageCount: number;
  dailyGrams: number | null;
  startDate: string | null;
  reminderEnabled: boolean;
  reminderDays: number;
  today: string;
};

/** Form doldurulurken hesap önizlemesi. */
export function SchedulePreview(p: Props) {
  if (!p.dailyGrams || !p.startDate || p.dailyGrams > p.packageGrams * p.packageCount) return null;
  const total = p.packageGrams * p.packageCount;
  const s = foodSchedule(p.startDate, total, p.dailyGrams, p.reminderDays, p.today);
  return (
    <View style={{ backgroundColor: '#e3f1ea', borderRadius: 8, padding: 12, marginBottom: 12, gap: 4 }}>
      <Text style={{ color: colors.text }}>
        {formatKg(total)} ÷ günde {p.dailyGrams} g = <Text style={{ fontWeight: '700' }}>{s.supplyDays} gün</Text>
      </Text>
      <Text style={{ color: colors.text }}>Tahmini bitiş: {formatTurkishDate(s.endDate)}</Text>
      <Text style={{ color: colors.text }}>
        {p.reminderEnabled ? `Hatırlatma: ${formatTurkishDate(s.reminderDate)}` : 'Hatırlatma kapalı'}
      </Text>
      {s.cycleNumber > 1 ? (
        <Text style={{ color: colors.muted }}>
          Başlangıçtan bu yana mama {s.cycleNumber - 1} kez bitti; sayaç aynı paketle yeniden başladı.
        </Text>
      ) : null}
    </View>
  );
}
