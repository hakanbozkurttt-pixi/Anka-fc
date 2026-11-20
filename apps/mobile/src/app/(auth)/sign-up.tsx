import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';

import { KvkkModal } from '../../components/KvkkModal';
import { Button, Checkbox, ErrorBanner, Field, styles } from '../../components/ui';
import { KVKK_VERSION } from '../../content/kvkk';
import { toTurkishError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import { MIN_PASSWORD_LENGTH, validateSignUp, type FieldErrors, type SignUpInput } from '../../lib/validation';

const empty: SignUpInput = {
  firstName: '',
  lastName: '',
  phone: '',
  address: '',
  email: '',
  password: '',
  passwordRepeat: '',
  kvkkAccepted: false,
};

export default function SignUpScreen() {
  const [form, setForm] = useState<SignUpInput>(empty);
  const [errors, setErrors] = useState<FieldErrors<keyof SignUpInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [kvkkOpen, setKvkkOpen] = useState(false);

  const set = (key: keyof SignUpInput) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSignUp() {
    const nextErrors = validateSignUp(form);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0 || !supabase) return;

    setLoading(true);
    // Ad, soyad, telefon ve adres kayıt isteğiyle birlikte gönderilir;
    // veritabanı bunları aynı işlemde müşteri profiline yazar ve tekrar denetler.
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          // Onaylanan aydınlatma metni sürümü; veritabanı onay kaydını bununla oluşturur.
          kvkk_version: KVKK_VERSION,
        },
      },
    });
    setLoading(false);

    if (error) {
      setFormError(toTurkishError(error));
      return;
    }
    // E-posta doğrulaması açık olduğu için oturum hemen açılmaz;
    // müşteri e-postasına gelen 6 haneli kodu girerek kaydını tamamlar.
    if (!data.session) {
      router.replace({ pathname: '/verify-email', params: { email: form.email.trim() } });
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Text style={[styles.muted, { marginBottom: 16 }]}>Tüm alanlar zorunludur.</Text>

        <ErrorBanner message={formError} />

        <Field label="Ad" value={form.firstName} onChangeText={set('firstName')} error={errors.firstName} autoComplete="given-name" textContentType="givenName" />
        <Field label="Soyad" value={form.lastName} onChangeText={set('lastName')} error={errors.lastName} autoComplete="family-name" textContentType="familyName" />
        <Field
          label="Telefon"
          value={form.phone}
          onChangeText={set('phone')}
          error={errors.phone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="05xx xxx xx xx"
        />
        <Field
          label="Adres"
          value={form.address}
          onChangeText={set('address')}
          error={errors.address}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          autoComplete="street-address"
          textContentType="fullStreetAddress"
        />
        <Field
          label="E-posta"
          value={form.email}
          onChangeText={set('email')}
          error={errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label="Şifre"
          value={form.password}
          onChangeText={set('password')}
          error={errors.password}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder={`En az ${MIN_PASSWORD_LENGTH} karakter`}
        />
        <Field
          label="Şifre (tekrar)"
          value={form.passwordRepeat}
          onChangeText={set('passwordRepeat')}
          error={errors.passwordRepeat}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <Checkbox
          checked={form.kvkkAccepted}
          onChange={(value) => setForm((f) => ({ ...f, kvkkAccepted: value }))}
          error={errors.kvkkAccepted}
        >
          <Text style={{ lineHeight: 20 }}>
            <Text style={styles.link} onPress={() => setKvkkOpen(true)}>
              KVKK Aydınlatma Metni
            </Text>
            'ni okudum ve onaylıyorum.
          </Text>
        </Checkbox>

        <Button title="Kayıt ol" onPress={handleSignUp} loading={loading} />
        <KvkkModal visible={kvkkOpen} onClose={() => setKvkkOpen(false)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
