import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';

import { KvkkConsentScreen } from '../../components/KvkkConsentScreen';
import { Button, Centered, styles } from '../../components/ui';
import { toTurkishError } from '../../lib/errors';
import { hasAcceptedCurrentKvkk } from '../../lib/kvkk';
import { supabase } from '../../lib/supabase';

export const unstable_settings = { anchor: 'pets/index' };

type KvkkState = 'checking' | 'accepted' | 'required' | 'error';

export default function AppLayout() {
  const [kvkk, setKvkk] = useState<KvkkState>('checking');
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(() => {
    setKvkk('checking');
    hasAcceptedCurrentKvkk()
      .then((ok) => setKvkk(ok ? 'accepted' : 'required'))
      .catch((e) => {
        setError(toTurkishError(e));
        setKvkk('error');
      });
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // Güncel aydınlatma metni onaylanmadan uygulamanın hiçbir ekranı açılmaz.
  if (kvkk === 'checking') {
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    );
  }
  if (kvkk === 'error') {
    return (
      <Centered>
        <Text style={styles.muted}>{error}</Text>
        <Button title="Tekrar dene" onPress={check} />
        <Button title="Çıkış yap" variant="secondary" onPress={() => supabase?.auth.signOut()} />
      </Centered>
    );
  }
  if (kvkk === 'required') {
    return <KvkkConsentScreen onAccepted={() => setKvkk('accepted')} />;
  }

  return (
    <Stack screenOptions={{ headerBackTitle: 'Geri' }}>
      <Stack.Screen name="pets/index" options={{ title: 'Hayvanlarım' }} />
      <Stack.Screen name="pets/new" options={{ title: 'Hayvan ekle' }} />
      <Stack.Screen name="pets/[id]" options={{ title: 'Hayvan profili' }} />
    </Stack>
  );
}
