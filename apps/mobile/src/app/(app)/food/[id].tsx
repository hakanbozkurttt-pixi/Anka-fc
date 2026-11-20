import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { daysLeftText, FoodSummary } from '../../../components/FoodSummary';
import { ReminderSettings } from '../../../components/ReminderSettings';
import { SchedulePreview } from '../../../components/SchedulePreview';
import { Button, ErrorBanner, Field, InfoBanner, Stepper, styles } from '../../../components/ui';
import { toTurkishError } from '../../../lib/errors';
import { deleteFoodRecord, getFoodRecord, updateFoodRecord, type FoodRecord } from '../../../lib/food';
import { syncReminders } from '../../../lib/reminders';
import { formatTurkishDate, todayLocalIso } from '../../../lib/validation';

function confirm(title: string, message: string, ok: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
      { text: ok, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = todayLocalIso();
  const [record, setRecord] = useState<FoodRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [packageCount, setPackageCount] = useState(1);
  const [daily, setDaily] = useState('');
  const [dailyError, setDailyError] = useState<string | undefined>();
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(5);

  const apply = useCallback((r: FoodRecord | null) => {
    setRecord(r);
    if (!r) {
      setError('Mama kaydı bulunamadı.');
      return;
    }
    setPackageCount(r.package_count);
    setDaily(String(r.daily_grams));
    setReminderEnabled(r.reminder_enabled);
    setReminderDays(r.reminder_days_before);
  }, []);

  useEffect(() => {
    getFoodRecord(id)
      .then(apply)
      .catch((e) => setError(toTurkishError(e)))
      .finally(() => setLoading(false));
  }, [id, apply]);

  const dailyGrams = /^\d+$/.test(daily.trim()) ? Number(daily.trim()) : null;

  async function save(changes: Parameters<typeof updateFoodRecord>[1], message: string) {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      await updateFoodRecord(id, changes);
      syncReminders();
      apply(await getFoodRecord(id));
      setInfo(message);
    } catch (e) {
      setError(toTurkishError(e as Error));
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!record) return;
    if (dailyGrams === null || dailyGrams < 1 || dailyGrams > 5000) {
      setDailyError('Günlük tüketimi gram olarak tam sayı girin (ör. 60).');
      return;
    }
    if (dailyGrams > record.package_grams * packageCount) {
      setDailyError('Günlük tüketim, toplam mama miktarından fazla olamaz.');
      return;
    }
    setDailyError(undefined);
    await save(
      {
        package_count: packageCount,
        daily_grams: dailyGrams,
        reminder_enabled: reminderEnabled,
        reminder_days_before: reminderDays,
      },
      'Değişiklikler kaydedildi.',
    );
  }

  async function handleNewPackage() {
    const ok = await confirm(
      'Yeni paket',
      `Yeni paketi bugün (${formatTurkishDate(today)}) kullanmaya başladınız mı? Sayaç bugünden yeniden başlar.`,
      'Evet, başladım',
    );
    if (ok) await save({ start_date: today }, 'Sayaç bugünden yeniden başladı.');
  }

  async function handleDelete() {
    const ok = await confirm('Mama kaydını sil', 'Bu mama kaydı ve hatırlatmaları silinecek.', 'Sil');
    if (!ok) return;
    try {
      await deleteFoodRecord(id);
      syncReminders();
      router.back();
    } catch (e) {
      setError(toTurkishError(e as Error));
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />
        <InfoBanner message={info} />
        {record ? (
          <>
            <View style={styles.card}>
              <FoodSummary record={record} />
              <Text style={[styles.muted, { marginTop: 6 }]}>
                Bu paketin başlangıcı: {formatTurkishDate(record.cycle_start)}
                {record.cycle_number > 1 ? ' (mama bitince sayaç aynı paketle yeniden başladı)' : ''}
              </Text>
            </View>

            <Button
              title="Bu mamadan sipariş ver"
              onPress={() => router.push({ pathname: '/orders/new', params: { productId: record.product_id } })}
            />
            <Button title="Yeni paketi kullanmaya başladım" variant="secondary" onPress={handleNewPackage} />

            <Text style={styles.sectionTitle}>Ayarlar</Text>
            <Stepper label="Paket sayısı" value={packageCount} min={1} max={50} onChange={setPackageCount} suffix="paket" />
            <Field
              label="Günlük tüketim (gram)"
              value={daily}
              onChangeText={setDaily}
              error={dailyError}
              keyboardType="number-pad"
              maxLength={4}
            />
            <ReminderSettings
              enabled={reminderEnabled}
              days={reminderDays}
              onEnabledChange={setReminderEnabled}
              onDaysChange={setReminderDays}
            />
            <SchedulePreview
              packageGrams={record.package_grams}
              packageCount={packageCount}
              dailyGrams={dailyGrams}
              startDate={record.start_date}
              reminderEnabled={reminderEnabled}
              reminderDays={reminderDays}
              today={today}
            />
            <Button title="Kaydet" onPress={handleSave} loading={saving} />
            <Button title="Mama kaydını sil" variant="secondary" onPress={handleDelete} />
            <Text style={[styles.muted, { marginTop: 8 }]}>{daysLeftText(record.days_left)}.</Text>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
