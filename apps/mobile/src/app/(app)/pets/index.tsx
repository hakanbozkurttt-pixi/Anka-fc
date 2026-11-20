import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { NotificationPermissionBanner } from '../../../components/NotificationPermissionBanner';
import { Button, colors, ErrorBanner, styles as ui } from '../../../components/ui';
import { toTurkishError } from '../../../lib/errors';
import { listPets, SPECIES_LABEL, type Pet } from '../../../lib/pets';
import { getMyProfile, type Profile } from '../../../lib/profile';
import { supabase } from '../../../lib/supabase';

export default function PetsScreen() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, list] = await Promise.all([getMyProfile(), listPets()]);
      setProfile(p);
      setPets(list);
      setError(null);
    } catch (e) {
      setError(toTurkishError(e as Error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Ekran her açıldığında (ör. hayvan eklendikten sonra geri dönünce) listeyi yenile.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={ui.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={[ui.screen, { flexGrow: 1 }]}
      data={pets}
      keyExtractor={(pet) => pet.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: 12 }}>
          <Text style={ui.muted}>
            {profile ? `Merhaba ${profile.first_name}` : 'Müşteri profili bulunamadı.'}
          </Text>
          <ErrorBanner message={error} />
          <NotificationPermissionBanner />
        </View>
      }
      ListEmptyComponent={
        <Text style={[ui.muted, { textAlign: 'center', marginVertical: 24 }]}>
          Henüz hayvan profili eklemediniz.
        </Text>
      }
      renderItem={({ item }) => (
          <Pressable
            style={local.card}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/pets/[id]', params: { id: item.id } })}
          >
            <Text style={local.cardTitle}>{item.name}</Text>
            <Text style={ui.muted}>
              {SPECIES_LABEL[item.species]}
              {item.breed ? ` · ${item.breed}` : ''}
            </Text>
          </Pressable>
      )}
      ListFooterComponent={
        <View style={{ marginTop: 8 }}>
          {profile ? (
            <>
              <Button title="Kedi veya köpek ekle" onPress={() => router.push('/pets/new')} />
              <Button title="Siparişlerim" variant="secondary" onPress={() => router.push('/orders')} />
            </>
          ) : null}
          <Button title="Çıkış yap" variant="secondary" onPress={() => supabase?.auth.signOut()} />
        </View>
      }
    />
  );
}

const local = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
});
