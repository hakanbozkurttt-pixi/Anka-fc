import { KVKK_VERSION } from '../content/kvkk';
import { supabase } from './supabase';

function client() {
  if (!supabase) throw new Error('Supabase ayarı eksik.');
  return supabase;
}

/** Giriş yapan müşteri güncel aydınlatma metni sürümünü onaylamış mı? */
export async function hasAcceptedCurrentKvkk(): Promise<boolean> {
  const { data, error } = await client()
    .from('kvkk_acceptances')
    .select('id')
    .eq('version', KVKK_VERSION)
    .limit(1);
  if (error) throw error;
  return data.length > 0;
}

/** Güncel sürümün onayını kaydeder (kim ve ne zaman bilgisi sunucuda yazılır). */
export async function acceptCurrentKvkk(): Promise<void> {
  const { error } = await client().from('kvkk_acceptances').insert({ version: KVKK_VERSION });
  // Aynı sürüm zaten onaylıysa (ör. iki kez dokunma) hata sayma.
  if (error && error.code !== '23505') throw error;
}
