import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { PetForm } from '../../../components/PetForm';
import { ErrorBanner, styles } from '../../../components/ui';
import { toTurkishError } from '../../../lib/errors';
import { getPet, updatePet, type Pet } from '../../../lib/pets';

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPet(id)
      .then((p) => (p ? setPet(p) : setError('Hayvan profili bulunamadı.')))
      .catch((e) => setError(toTurkishError(e)));
  }, [id]);

  if (error) {
    return (
      <View style={styles.screen}>
        <ErrorBanner message={error} />
      </View>
    );
  }
  if (!pet) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <PetForm
      initial={pet}
      submitLabel="Değişiklikleri kaydet"
      onSubmit={async (changes) => {
        await updatePet(pet.id, changes);
        router.back();
      }}
    />
  );
}
