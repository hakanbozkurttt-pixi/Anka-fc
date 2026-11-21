import { Switch, Text, View } from 'react-native';

import { MAX_REMINDER_DAYS, MIN_REMINDER_DAYS } from '../lib/foodSchedule';
import { colors, Stepper, styles } from './ui';

type Props = {
  enabled: boolean;
  days: number;
  onEnabledChange: (value: boolean) => void;
  onDaysChange: (value: number) => void;
};

export function ReminderSettings({ enabled, days, onEnabledChange, onDaysChange }: Props) {
  return (
    <View style={styles.field}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.label}>Mama bitmeden hatırlat</Text>
        <Switch
          accessibilityLabel="Mama bitmeden hatırlat"
          value={enabled}
          onValueChange={onEnabledChange}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor="#ffffff"
          ios_backgroundColor={colors.border}
        />
      </View>
      {enabled ? (
        <Stepper
          label={`Bitişten kaç gün önce? (${MIN_REMINDER_DAYS}-${MAX_REMINDER_DAYS})`}
          value={days}
          min={MIN_REMINDER_DAYS}
          max={MAX_REMINDER_DAYS}
          onChange={onDaysChange}
          suffix="gün"
        />
      ) : null}
      <Text style={styles.muted}>
        Hatırlatma yalnızca bilgilendirmedir; sipariş oluşturmaz. Siparişi istediğiniz zaman kendiniz verirsiniz.
      </Text>
    </View>
  );
}
