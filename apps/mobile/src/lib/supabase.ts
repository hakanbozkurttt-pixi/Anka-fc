import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Değerler apps/mobile/.env dosyasından okunur (örnek: .env.example).
// EXPO_PUBLIC_ ile başlayan değerler uygulamanın içine gömülür ve herkes
// tarafından görülebilir; bu yüzden buraya yalnızca "publishable/anon"
// anahtar girilir, "secret/service_role" anahtar ASLA girilmez.
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
