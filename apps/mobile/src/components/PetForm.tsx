import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';

import { toTurkishError } from '../lib/errors';
import { SEX_LABEL, SPECIES_LABEL, type NewPet, type Pet, type Sex, type Species } from '../lib/pets';
import { formatTurkishDate, parseDecimal, parseTurkishDate, todayLocalIso } from '../lib/validation';
import { Button, Choice, ErrorBanner, Field, styles } from './ui';

type Errors = Partial<Record<'species' | 'name' | 'birthDate' | 'weight' | 'notes', string>>;

type Props = {
  initial?: Pet;
  submitLabel: string;
  onSubmit: (pet: NewPet) => Promise<void>;
};

/** Hayvan profili formu (ekleme ve düzenleme). Zorunlu: tür ve ad; diğerleri isteğe bağlı. */
export function PetForm({ initial, submitLabel, onSubmit }: Props) {
  const [species, setSpecies] = useState<Species | null>(initial?.species ?? null);
  const [name, setName] = useState(initial?.name ?? '');
  const [birthDate, setBirthDate] = useState(initial?.birth_date ? formatTurkishDate(initial.birth_date) : '');
  const [breed, setBreed] = useState(initial?.breed ?? '');
  const [sex, setSex] = useState<Sex | null>(initial?.sex ?? null);
  const [weight, setWeight] = useState(initial?.weight_kg != null ? String(initial.weight_kg).replace('.', ',') : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const next: Errors = {};
    if (!species) next.species = 'Tür seçimi zorunludur.';
    if (!name.trim()) next.name = 'Ad zorunludur.';

    let isoBirthDate: string | null = null;
    if (birthDate.trim()) {
      isoBirthDate = parseTurkishDate(birthDate);
      if (!isoBirthDate) next.birthDate = 'Tarihi GG.AA.YYYY biçiminde girin.';
      else if (isoBirthDate > todayLocalIso()) next.birthDate = 'Doğum tarihi bugünden sonra olamaz.';
    }

    let weightKg: number | null = null;
    if (weight.trim()) {
      weightKg = parseDecimal(weight);
      if (weightKg === null || weightKg <= 0 || weightKg >= 200) next.weight = 'Geçerli bir kilo girin (ör. 4,5).';
    }

    if (notes.length > 500) next.notes = 'Not en fazla 500 karakter olabilir.';

    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0 || !species) return;

    setSaving(true);
    try {
      await onSubmit({
        species,
        name: name.trim(),
        birth_date: isoBirthDate,
        breed: breed.trim() || null,
        sex,
        weight_kg: weightKg,
        notes: notes.trim() || null,
      });
    } catch (e) {
      setFormError(toTurkishError(e as Error));
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={formError} />

        <Choice
          label="Tür"
          options={[
            { value: 'cat', label: SPECIES_LABEL.cat },
            { value: 'dog', label: SPECIES_LABEL.dog },
          ]}
          value={species}
          onChange={setSpecies}
          error={errors.species}
        />
        <Field label="Ad" value={name} onChangeText={setName} error={errors.name} maxLength={50} />

        <Text style={[styles.muted, { marginVertical: 8 }]}>Aşağıdaki bilgiler isteğe bağlıdır.</Text>

        <Field
          label="Doğum tarihi"
          optional
          value={birthDate}
          onChangeText={setBirthDate}
          error={errors.birthDate}
          placeholder="GG.AA.YYYY"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        <Field label="Irk" optional value={breed} onChangeText={setBreed} maxLength={100} />
        <Choice
          label="Cinsiyet"
          optional
          options={[
            { value: 'female', label: SEX_LABEL.female },
            { value: 'male', label: SEX_LABEL.male },
          ]}
          value={sex}
          onChange={setSex}
        />
        <Field
          label="Kilo (kg)"
          optional
          value={weight}
          onChangeText={setWeight}
          error={errors.weight}
          keyboardType="decimal-pad"
          placeholder="ör. 4,5"
        />
        <Field
          label="Not"
          optional
          value={notes}
          onChangeText={setNotes}
          error={errors.notes}
          multiline
          numberOfLines={3}
          maxLength={500}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Button title={submitLabel} onPress={handleSave} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
