import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FoodSummary } from '../../../components/FoodSummary';
import { Button, colors, ErrorBanner, styles as ui } from '../../../components/ui';
import { toTurkishError } from '../../../lib/errors';
import { listFoodRecords, type FoodRecord } from '../../../lib/food';
import { deletePet, getPet, SEX_LABEL, SPECIES_LABEL, type Pet } from '../../../lib/pets';
import { syncReminders } from '../../../lib/reminders';
import { formatTurkishDate } from '../../../lib/validation';

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={local.row}>
      <Text style={local.rowLabel}>{label}</Text>
      <Text style={local.rowValue}>{value ?? '—'}</Text>
    </View>
  );
}

function confirm(title: string, message: string, ok: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
      { text: ok, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [foods, setFoods] = useState<FoodRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ekran her açıldığında (ör. mama eklendikten sonra) yenile.
  useFocusEffect(
    useCallback(() => {
      Promise.all([getPet(id), listFoodRecords(id)])
        .then(([p, f]) => {
          setPet(p);
          setFoods(f);
          setError(p ? null : 'Hayvan profili bulunamadı.');
        })
        .catch((e) => setError(toTurkishError(e)))
        .finally(() => setLoading(false));
    }, [id]),
  );

  if (loading) {
    return (
      <View style={ui.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      {pet ? <Stack.Screen options={{ title: pet.name }} /> : null}
      <ErrorBanner message={error} />
      {pet ? (
        <>
          <Text style={ui.sectionTitle}>Mamalar</Text>
          {foods.length === 0 ? (
            <Text style={[ui.muted, { marginBottom: 8 }]}>
              Henüz mama eklemediniz. Mama ekleyince bitiş tarihini ve hatırlatma gününü hesaplarız.
            </Text>
          ) : (
            foods.map((f) => (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                style={ui.card}
                onPress={() => router.push({ pathname: '/food/[id]', params: { id: f.id } })}
              >
                <FoodSummary record={f} />
              </Pressable>
            ))
          )}
          <Button
            title="Mama ekle"
            onPress={() => router.push({ pathname: '/food/new', params: { petId: pet.id, species: pet.species } })}
          />

          <Text style={ui.sectionTitle}>Bilgiler</Text>
          <Row label="Tür" value={SPECIES_LABEL[pet.species]} />
          <Row label="Ad" value={pet.name} />
          <Row label="Doğum tarihi" value={pet.birth_date ? formatTurkishDate(pet.birth_date) : null} />
          <Row label="Irk" value={pet.breed} />
          <Row label="Cinsiyet" value={pet.sex ? SEX_LABEL[pet.sex] : null} />
          <Row label="Kilo" value={pet.weight_kg != null ? `${String(pet.weight_kg).replace('.', ',')} kg` : null} />
          <Row label="Not" value={pet.notes} />

          <Button
            title="Bilgileri düzenle"
            variant="secondary"
            onPress={() => router.push({ pathname: '/pets/edit', params: { id: pet.id } })}
          />
          <Button
            title="Hayvan profilini sil"
            variant="secondary"
            onPress={async () => {
              const ok = await confirm(
                'Hayvan profilini sil',
                `${pet.name} profili ve ona ait tüm mama kayıtları ile hatırlatmalar silinecek. Bu işlem geri alınamaz.`,
                'Sil',
              );
              if (!ok) return;
              try {
                await deletePet(pet.id);
                syncReminders();
                router.back();
              } catch (e) {
                setError(toTurkishError(e as Error));
              }
            }}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const local = StyleSheet.create({
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 13, color: colors.muted, marginBottom: 2 },
  rowValue: { fontSize: 16, color: colors.text },
});
