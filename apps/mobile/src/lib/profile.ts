import { supabase } from './supabase';

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  email: string;
};

export async function getMyProfile(): Promise<Profile | null> {
  if (!supabase) throw new Error('Supabase ayarı eksik.');
  const { data, error } = await supabase.from('profiles').select('*').maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}
