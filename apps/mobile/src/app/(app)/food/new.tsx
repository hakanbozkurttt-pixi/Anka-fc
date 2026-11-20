import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { ReminderSettings } from '../../../components/ReminderSettings';
import { SchedulePreview } from '../../../components/SchedulePreview';
import { Button, colors, ErrorBanner, Field, Stepper, styles } from '../../../components/ui';
import { toTurkishError } from '../../../lib/errors';
import { createFoodRecord, formatKg, listCatalogFor, type CatalogProduct } from '../../../lib/food';
import { DEFAULT_REMINDER_DAYS } from '../../../lib/foodSchedule';
import { formatTurkishDate, parseTurkishDate, todayLocalIso } from '../../../lib/validation';

type Errors = Partial<Record<'product' | 'daily' | 'start', string>>;

function productLine(p: CatalogProduct) {
  return [p.series, p.flavor, p.age_group].filter(Boolean).join(' · ');
}

export default function NewFoodScreen() {
  const { petId, species } = useLocalSearchParams<{ petId: string; species: 'cat' | 'dog' }>();
  const today = todayLocalIso();
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [query, setQuery] = useState('');
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [packageCount, setPackageCount] = useState(1);
  const [daily, setDaily] = useState('');
  const [start, setStart] = useState(formatTurkishDate(today));
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(DEFAULT_REMINDER_DAYS);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCatalogFor(species)
      .then(setCatalog)
      .catch((e) => setFormError(toTurkishError(e)))
      .finally(() => setLoadingCatalog(false));
  }, [species]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return catalog;
    return catalog.filter((p) =>
      [p.brand, p.name, p.series, p.flavor, p.age_group].some((v) => v?.toLocaleLowerCase('tr-TR').includes(q)),
    );
  }, [catalog, query]);

  const dailyGrams = /^\d+$/.test(daily.trim()) ? Number(daily.trim()) : null;
  const startIso = parseTurkishDate(start);

  async function handleSave() {
    const next: Errors = {};
    if (!product) next.product = 'Listeden bir mama seçin.';
    if (dailyGrams === null || dailyGrams < 1 || dailyGrams > 5000)
      next.daily = 'Günlük tüketimi gram olarak tam sayı girin (ör. 60).';
    else if (product && dailyGrams > product.package_grams * packageCount)
      next.daily = 'Günlük tüketim, toplam mama miktarından fazla olamaz.';
    if (!startIso) next.start = 'Tarihi GG.AA.YYYY biçiminde girin.';
    else if (startIso > today) next.start = 'Başlangıç tarihi bugünden sonra olamaz.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0 || !product || dailyGrams === null || !startIso) return;

    setSaving(true);
    try {
      await createFoodRecord({
        pet_id: petId,
        product_id: product.id,
        package_count: packageCount,
        daily_grams: dailyGrams,
        start_date: startIso,
        reminder_enabled: reminderEnabled,
        reminder_days_before: reminderDays,
      });
      router.back();
    } catch (e) {
      setFormError(toTurkishError(e as Error));
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={formError} />

        <Text style={styles.label}>Mama</Text>
        {product ? (
          <View style={[styles.card, { borderColor: colors.primary }]}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              {product.brand} · {product.name}
            </Text>
            <Text style={styles.muted}>
              {formatKg(product.package_grams)} paket{productLine(product) ? ` · ${productLine(product)}` : ''}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setProduct(null)} style={{ marginTop: 8 }}>
              <Text style={styles.link}>Başka mama seç</Text>
            </Pressable>
          </View>
        ) : loadingCatalog ? (
          <ActivityIndicator />
        ) : catalog.length === 0 ? (
          <Text style={[styles.muted, { marginBottom: 12 }]}>
            Katalogda bu hayvan türüne uygun mama henüz yok. Hastane ürünleri ekledikten sonra seçebilirsiniz.
          </Text>
        ) : (
          <>
            <Field label="Mama ara" value={query} onChangeText={setQuery} placeholder="Marka veya ürün adı" error={errors.product} />
            {filtered.slice(0, 50).map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.brand} ${p.name} ${formatKg(p.package_grams)}`}
                style={styles.card}
                onPress={() => {
                  setProduct(p);
                  setErrors((e) => ({ ...e, product: undefined }));
                }}
              >
                <Text style={{ fontWeight: '600', color: colors.text }}>
                  {p.brand} · {p.name}
                </Text>
                <Text style={styles.muted}>
                  {formatKg(p.package_grams)} paket{productLine(p) ? ` · ${productLine(p)}` : ''}
                </Text>
              </Pressable>
            ))}
            {filtered.length > 50 ? (
              <Text style={styles.muted}>Daha fazla sonuç var; aramayı daraltın.</Text>
            ) : null}
            {filtered.length === 0 ? <Text style={styles.muted}>Aramanıza uygun mama bulunamadı.</Text> : null}
          </>
        )}

        {product ? (
          <>
            <Stepper label="Paket sayısı" value={packageCount} min={1} max={50} onChange={setPackageCount} suffix="paket" />
            <Field
              label="Günlük tüketim (gram)"
              value={daily}
              onChangeText={setDaily}
              error={errors.daily}
              keyboardType="number-pad"
              placeholder="ör. 60"
              maxLength={4}
            />
            <Field
              label="Başlangıç tarihi"
              value={start}
              onChangeText={setStart}
              error={errors.start}
              placeholder="GG.AA.YYYY"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <ReminderSettings
              enabled={reminderEnabled}
              days={reminderDays}
              onEnabledChange={setReminderEnabled}
              onDaysChange={setReminderDays}
            />
            <SchedulePreview
              packageGrams={product.package_grams}
              packageCount={packageCount}
              dailyGrams={dailyGrams}
              startDate={startIso && startIso <= today ? startIso : null}
              reminderEnabled={reminderEnabled}
              reminderDays={reminderDays}
              today={today}
            />
            <Button title="Kaydet" onPress={handleSave} loading={saving} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
