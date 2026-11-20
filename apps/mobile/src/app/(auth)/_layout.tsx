import { Stack } from 'expo-router';

export const unstable_settings = { anchor: 'sign-in' };

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Geri' }}>
      <Stack.Screen name="sign-in" options={{ title: 'Giriş yap' }} />
      <Stack.Screen name="sign-up" options={{ title: 'Kayıt ol' }} />
      <Stack.Screen name="verify-email" options={{ title: 'E-posta doğrulama' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Şifremi unuttum' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Yeni şifre' }} />
    </Stack>
  );
}
