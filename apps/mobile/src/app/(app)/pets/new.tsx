import { router } from 'expo-router';

import { PetForm } from '../../../components/PetForm';
import { createPet } from '../../../lib/pets';

export default function NewPetScreen() {
  return (
    <PetForm
      submitLabel="Kaydet"
      onSubmit={async (pet) => {
        await createPet(pet);
        router.back();
      }}
    />
  );
}
