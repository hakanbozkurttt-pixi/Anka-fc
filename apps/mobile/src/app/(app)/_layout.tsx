import { Stack } from 'expo-router';

export const unstable_settings = { anchor: 'pets/index' };

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Geri' }}>
      <Stack.Screen name="pets/index" options={{ title: 'Hayvanlarım' }} />
      <Stack.Screen name="pets/new" options={{ title: 'Hayvan ekle' }} />
      <Stack.Screen name="pets/[id]" options={{ title: 'Hayvan profili' }} />
    </Stack>
  );
}
