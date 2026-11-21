import { router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text } from 'react-native';

import { Button, ErrorBanner, Field, LinkText, styles } from '../../components/ui';
import { toTurkishError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import { isValidEmail } from '../../lib/validation';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);

  async function handleSignIn() {
    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = 'E-posta zorunludur.';
    else if (!isValidEmail(email)) nextErrors.email = 'Geçerli bir e-posta adresi girin.';
    if (!password) nextErrors.password = 'Şifre zorunludur.';
    setErrors(nextErrors);
    setFormError(null);
    setUnconfirmed(false);
    if (Object.keys(nextErrors).length > 0 || !supabase) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    // Başarılı girişte yönlendirmeyi kök düzen (oturum değişimi) yapar.
    if (error) {
      setFormError(toTurkishError(error));
      setUnconfirmed(error.code === 'email_not_confirmed');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Image
          source={require('../../../assets/logo.png')}
          accessibilityLabel="Anka Hayvan Hastanesi"
          resizeMode="contain"
          style={{ width: '100%', height: 140, marginBottom: 12 }}
        />
        <Text style={styles.title}>Anka Friends Club</Text>
        <Text style={[styles.muted, { marginBottom: 16 }]}>Hesabınıza e-posta ve şifrenizle giriş yapın.</Text>

        <ErrorBanner message={formError} />

        <Field
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Field
          label="Şifre"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />

        {unconfirmed ? (
          <Button
            title="Doğrulama kodunu gir"
            variant="secondary"
            onPress={() => router.push({ pathname: '/verify-email', params: { email: email.trim(), resend: '1' } })}
          />
        ) : null}

        <Button title="Giriş yap" onPress={handleSignIn} loading={loading} />

        <LinkText
          title="Şifremi unuttum"
          onPress={() => router.push({ pathname: '/forgot-password', params: { email: email.trim() } })}
        />

        <Pressable accessibilityRole="link" onPress={() => router.push('/sign-up')} style={{ marginTop: 20 }}>
          <Text style={[styles.muted, { textAlign: 'center' }]}>
            Hesabınız yok mu? <Text style={{ fontWeight: '600' }}>Kayıt olun</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
