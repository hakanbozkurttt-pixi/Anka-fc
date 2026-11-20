import { Text, View } from 'react-native';

import type { FoodRecord } from '../lib/food';
import { formatKg } from '../lib/food';
import { formatTurkishDate } from '../lib/validation';
import { colors, styles } from './ui';

export function daysLeftText(daysLeft: number) {
  if (daysLeft <= 0) return 'Bugün bitiyor';
  if (daysLeft === 1) return 'Yarın bitiyor';
  return `${daysLeft} gün kaldı`;
}

/** Bir mama kaydının özeti: paket, günlük tüketim, bitiş ve hatırlatma. */
export function FoodSummary({ record }: { record: FoodRecord }) {
  const packageText =
    record.package_count > 1
      ? `${record.package_count} × ${formatKg(record.package_grams)} = ${formatKg(record.total_grams)}`
      : formatKg(record.package_grams);
  const soon = record.days_left <= record.reminder_days_before;
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
        {record.brand} · {record.product_name}
      </Text>
      <Text style={styles.muted}>
        {packageText} · günde {record.daily_grams} g · {record.supply_days} gün yeter
      </Text>
      <Text style={{ color: soon ? '#b54708' : colors.text, fontWeight: '600', marginTop: 4 }}>
        Tahmini bitiş: {formatTurkishDate(record.end_date)} ({daysLeftText(record.days_left)})
      </Text>
      <Text style={styles.muted}>
        {record.reminder_enabled
          ? `Hatırlatma: ${formatTurkishDate(record.reminder_date)} (bitişten ${record.reminder_days_before} gün önce)`
          : 'Hatırlatma kapalı'}
      </Text>
    </View>
  );
}
