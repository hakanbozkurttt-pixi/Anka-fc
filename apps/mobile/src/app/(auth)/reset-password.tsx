import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { Button, ErrorBanner, Field, InfoBanner, styles } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { toTurkishError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import { isValidOtp, MIN_PASSWORD_LENGTH, validateNewPassword } from '../../lib/validation';

type Errors = { code?: string; password?: string; passwordRepeat?: string };

export default function ResetPasswordScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const { setRecovering } = useAuth();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Kod doğrulandıktan sonra yalnızca şifre kaydı tekrar denenir.
  const [codeVerified, setCodeVerified] = useState(false);
  const finished = useRef(false);
  const verifiedRef = useRef(false);

  // Kod doğrulandıktan sonra şifre kaydedilmeden ekrandan çıkılırsa
  // geçici oturumu kapat; müşteri yeni şifre belirlemeden içeri giremez.
  useEffect(() => {
    return () => {
      if (verifiedRef.current && !finished.current) {
        supabase?.auth.signOut();
        setRecovering(false);
      }
    };
  }, [setRecovering]);

  async function handleReset() {
    const next: Errors = validateNewPassword(password, passwordRepeat);
    if (!codeVerified && !isValidOtp(code)) next.code = 'E-postadaki 6 haneli kodu girin.';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0 || !supabase) return;

    setLoading(true);
    // Kod doğrulanınca geçici bir oturum açılır; yeni şifre kaydedilene kadar
    // müşteri uygulamaya alınmaz.
    setRecovering(true);

    if (!codeVerified) {
      const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'recovery' });
      if (error) {
        setRecovering(false);
        setLoading(false);
        setFormError(toTurkishError(error));
        return;
      }
      verifiedRef.current = true;
      setCodeVerified(true);
    }

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setFormError(toTurkishError(error));
      return;
    }
    // Şifre güncellendi; müşteri yeni şifresiyle oturum açmış olarak uygulamaya geçer.
    finished.current = true;
    setRecovering(false);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <InfoBanner
          message={
            codeVerified
              ? 'Kod doğrulandı. Yeni şifrenizi kaydedin.'
              : `Bu e-posta adresiyle bir hesap varsa (${email}) 6 haneli bir kod gönderdik.`
          }
        />
        <ErrorBanner message={formError} />
        {!codeVerified ? (
          <Field
            label="Kod"
            value={code}
            onChangeText={setCode}
            error={errors.code}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
          />
        ) : null}
        <Field
          label="Yeni şifre"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          placeholder={`En az ${MIN_PASSWORD_LENGTH} karakter`}
        />
        <Field
          label="Yeni şifre (tekrar)"
          value={passwordRepeat}
          onChangeText={setPasswordRepeat}
          error={errors.passwordRepeat}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Button title="Şifreyi kaydet" onPress={handleReset} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
