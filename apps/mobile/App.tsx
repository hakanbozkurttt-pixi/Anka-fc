import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { isSupabaseConfigured, supabase } from './src/lib/supabase';

type Status = 'not-configured' | 'checking' | 'ok' | 'error';

const messages: Record<Status, string> = {
  'not-configured':
    'Arka plan ayarı yok. apps/mobile/.env.example dosyasını .env olarak kopyalayıp doldurun.',
  checking: 'Arka plana bağlanılıyor…',
  ok: 'Arka plana (Supabase) bağlantı başarılı.',
  error: 'Arka plana ulaşılamadı. Supabase çalışıyor mu ve .env adresi doğru mu?',
};

// Başlangıç ekranı: yalnızca uygulamanın açıldığını ve arka plana
// ulaşılıp ulaşılamadığını gösterir. Henüz hiçbir özellik yok.
export default function App() {
  const [status, setStatus] = useState<Status>(
    isSupabaseConfigured ? 'checking' : 'not-configured',
  );

  useEffect(() => {
    if (!supabase) return;
    supabase.auth
      .getSession()
      .then(({ error }) => setStatus(error ? 'error' : 'ok'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mama Takip</Text>
      <Text style={styles.muted}>
        Proje iskeleti hazır. Özellikler sonraki adımlarda eklenecek.
      </Text>
      <Text style={styles.status}>{messages[status]}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: '600' },
  muted: { color: '#52606d', textAlign: 'center' },
  status: { textAlign: 'center' },
});
