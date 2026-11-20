import { supabase } from './supabase';

export type Species = 'cat' | 'dog';
export type Sex = 'female' | 'male';

export type Pet = {
  id: string;
  owner_id: string;
  species: Species;
  name: string;
  birth_date: string | null;
  breed: string | null;
  sex: Sex | null;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
};

export type NewPet = {
  species: Species;
  name: string;
  birth_date?: string | null;
  breed?: string | null;
  sex?: Sex | null;
  weight_kg?: number | null;
  notes?: string | null;
};

export const SPECIES_LABEL: Record<Species, string> = { cat: 'Kedi', dog: 'Köpek' };
export const SEX_LABEL: Record<Sex, string> = { female: 'Dişi', male: 'Erkek' };

function client() {
  if (!supabase) throw new Error('Supabase ayarı eksik.');
  return supabase;
}

// Not: Erişim kuralları (RLS) sayesinde bu sorgular yalnızca giriş yapan
// müşterinin kendi hayvanlarını döndürür; filtre burada değil veritabanında uygulanır.

export async function listPets(): Promise<Pet[]> {
  const { data, error } = await client()
    .from('pets')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Pet[];
}

export async function getPet(id: string): Promise<Pet | null> {
  const { data, error } = await client().from('pets').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Pet | null;
}

export async function createPet(pet: NewPet): Promise<void> {
  const { error } = await client().from('pets').insert(pet);
  if (error) throw error;
}
