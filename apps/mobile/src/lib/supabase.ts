import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Değerler apps/mobile/.env dosyasından okunur (örnek: .env.example).
// EXPO_PUBLIC_ ile başlayan değerler uygulamanın içine gömülür ve herkes
// tarafından görülebilir; bu yüzden buraya yalnızca "publishable/anon"
// anahtar girilir, "secret/service_role" anahtar ASLA girilmez.
// Verinin korunması bu anahtara değil, veritabanındaki erişim kurallarına (RLS) dayanır.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && publishableKey);

export const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          // Oturum telefonda saklanır; uygulama kapanıp açılınca devam eder.
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// Uygulama ön plandayken oturum anahtarı otomatik yenilenir,
// arka plandayken yenileme durdurulur (Supabase'in önerdiği kullanım).
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
