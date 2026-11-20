import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Text } from 'react-native';

import { KvkkConsentScreen } from '../../components/KvkkConsentScreen';
import { Button, Centered, styles } from '../../components/ui';
import { toTurkishError } from '../../lib/errors';
import { hasAcceptedCurrentKvkk } from '../../lib/kvkk';
import { ensurePermission, syncReminders } from '../../lib/reminders';
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

  // KVKK onayından sonra: bildirim izni iste ve mama hatırlatmalarını telefona işle.
  // Uygulama her öne geldiğinde plan yenilenir.
  useEffect(() => {
    if (kvkk !== 'accepted') return;
    ensurePermission().then(() => syncReminders());
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') syncReminders();
    });
    return () => sub.remove();
  }, [kvkk]);

  // Hatırlatmaya dokununca ilgili mama kaydını aç.
  useEffect(() => {
    if (kvkk !== 'accepted' || Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const id = response?.notification.request.content.data?.foodRecordId;
      if (typeof id === 'string') router.push({ pathname: '/food/[id]', params: { id } });
    };
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      open(last);
      Notifications.clearLastNotificationResponse();
    }
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [kvkk]);

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
      <Stack.Screen name="food/new" options={{ title: 'Mama ekle' }} />
      <Stack.Screen name="food/[id]" options={{ title: 'Mama takibi' }} />
    </Stack>
  );
}
