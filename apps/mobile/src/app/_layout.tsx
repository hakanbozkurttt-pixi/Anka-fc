import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text } from 'react-native';

import { Centered, styles } from '../components/ui';
import { AuthProvider, useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';

function RootNavigator() {
  const { session, loading, recovering } = useAuth();
  const signedIn = !!session && !recovering;

  if (!isSupabaseConfigured) {
    return (
      <Centered>
        <Text style={styles.title}>Ayar eksik</Text>
        <Text style={[styles.muted, { textAlign: 'center' }]}>
          apps/mobile/.env.example dosyasını .env olarak kopyalayıp Supabase bilgilerini girin,
          ardından uygulamayı yeniden başlatın.
        </Text>
      </Centered>
    );
  }

  if (loading) {
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    );
  }

  // Oturum yoksa yalnızca giriş/kayıt ekranları, oturum varsa yalnızca
  // uygulama ekranları açılabilir.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
