import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';

import { Button, ErrorBanner, Field, styles } from '../../components/ui';
import { toTurkishError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import { isValidEmail } from '../../lib/validation';

export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setFormError(null);
    if (!isValidEmail(email)) {
      setEmailError('Geçerli bir e-posta adresi girin.');
      return;
    }
    setEmailError(undefined);
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    // Güvenlik: bu e-postayla kayıtlı hesap olup olmadığı kullanıcıya söylenmez.
    if (error) {
      setFormError(toTurkishError(error));
      return;
    }
    router.replace({ pathname: '/reset-password', params: { email: email.trim() } });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Text style={[styles.muted, { marginBottom: 16 }]}>
          Hesabınızın e-posta adresini girin. Şifrenizi yenilemeniz için 6 haneli bir kod göndereceğiz.
        </Text>
        <ErrorBanner message={formError} />
        <Field
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          error={emailError}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Button title="Kod gönder" onPress={sendCode} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
