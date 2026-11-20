export type Species = 'cat' | 'dog'
export type Sex = 'female' | 'male'

export type Pet = {
  id: string
  species: Species
  name: string
  birth_date: string | null
  breed: string | null
  sex: Sex | null
  weight_kg: number | null
  notes: string | null
  created_at: string
}

export type CustomerWithPets = {
  id: string
  first_name: string
  last_name: string
  phone: string
  address: string
  email: string
  created_at: string
  pets: Pet[]
  kvkk_acceptances: { version: string; accepted_at: string }[]
}

export const SPECIES_LABEL: Record<Species, string> = { cat: 'Kedi', dog: 'Köpek' }
export const SEX_LABEL: Record<Sex, string> = { female: 'Dişi', male: 'Erkek' }
