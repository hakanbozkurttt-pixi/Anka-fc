import { supabase } from './supabase';

export type FoodRecord = {
  id: string;
  pet_id: string;
  product_id: string;
  brand: string;
  product_name: string;
  package_grams: number;
  package_count: number;
  daily_grams: number;
  start_date: string;
  reminder_enabled: boolean;
  reminder_days_before: number;
  total_grams: number;
  supply_days: number;
  cycle_number: number;
  cycle_start: string;
  end_date: string;
  reminder_date: string;
  days_left: number;
};

export type CatalogProduct = {
  id: string;
  brand: string;
  name: string;
  species: 'cat' | 'dog' | 'both';
  series: string | null;
  flavor: string | null;
  age_group: string | null;
  package_grams: number;
};

export type NewFoodRecord = {
  pet_id: string;
  product_id: string;
  package_count: number;
  daily_grams: number;
  start_date: string;
  reminder_enabled: boolean;
  reminder_days_before: number;
};

function client() {
  if (!supabase) throw new Error('Supabase ayarı eksik.');
  return supabase;
}

// Erişim kuralları (RLS) sayesinde müşteri yalnızca kendi kayıtlarını görür.

export async function listFoodRecords(petId: string): Promise<FoodRecord[]> {
  const { data, error } = await client()
    .from('food_records_with_schedule')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as FoodRecord[];
}

export async function getFoodRecord(id: string): Promise<FoodRecord | null> {
  const { data, error } = await client()
    .from('food_records_with_schedule')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as FoodRecord | null;
}

/** Hayvanın türüne uygun, satıştaki ürünler (müşteri yalnızca aktif ürünleri görür). */
export async function listCatalogFor(species: 'cat' | 'dog'): Promise<CatalogProduct[]> {
  const { data, error } = await client()
    .from('products')
    .select('id, brand, name, species, series, flavor, age_group, package_grams')
    .in('species', [species, 'both'])
    .order('brand')
    .order('name')
    .order('package_grams')
    .limit(1000);
  if (error) throw error;
  return data as CatalogProduct[];
}

export async function createFoodRecord(record: NewFoodRecord): Promise<void> {
  const { error } = await client().from('food_records').insert(record);
  if (error) throw error;
}

export async function updateFoodRecord(
  id: string,
  changes: Partial<Pick<NewFoodRecord, 'package_count' | 'daily_grams' | 'start_date' | 'reminder_enabled' | 'reminder_days_before'>>,
): Promise<void> {
  const { error } = await client().from('food_records').update(changes).eq('id', id);
  if (error) throw error;
}

export async function deleteFoodRecord(id: string): Promise<void> {
  const { error } = await client().from('food_records').delete().eq('id', id);
  if (error) throw error;
}

export function formatKg(grams: number) {
  return grams >= 1000 ? `${String(grams / 1000).replace('.', ',')} kg` : `${grams} g`;
}
