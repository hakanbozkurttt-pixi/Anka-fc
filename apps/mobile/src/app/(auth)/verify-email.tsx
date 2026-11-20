import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';

import { Button, ErrorBanner, Field, InfoBanner, LinkText, styles } from '../../components/ui';
import { toTurkishError } from '../../lib/errors';
import { supabase } from '../../lib/supabase';
import { isValidOtp } from '../../lib/validation';

// Kayıttan sonra e-postaya gönderilen 6 haneli kodla adres doğrulanır.
// Doğrulama başarılı olunca oturum açılır ve müşteri uygulamaya alınır.
export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string; resend?: string }>();
  const email = params.email ?? '';
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    `${email} adresine 6 haneli bir doğrulama kodu gönderdik.`,
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const autoResent = useRef(false);

  async function resend() {
    if (!supabase || !email) return;
    setResending(true);
    setFormError(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) setFormError(toTurkishError(error));
    else setInfo(`${email} adresine yeni bir doğrulama kodu gönderdik.`);
  }

  // Giriş ekranından "doğrulanmamış hesap" nedeniyle gelindiyse yeni kod gönder.
  useEffect(() => {
    if (params.resend === '1' && !autoResent.current) {
      autoResent.current = true;
      resend();
    }
  }, [params.resend]);

  async function verify() {
    setFormError(null);
    if (!isValidOtp(code)) {
      setCodeError('E-postadaki 6 haneli kodu girin.');
      return;
    }
    setCodeError(undefined);
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    setLoading(false);
    // Başarılıysa oturum açılır; kök düzen müşteriyi uygulamaya yönlendirir.
    if (error) setFormError(toTurkishError(error));
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <InfoBanner message={info} />
        <ErrorBanner message={formError} />
        <Field
          label="Doğrulama kodu"
          value={code}
          onChangeText={setCode}
          error={codeError}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
        />
        <Button title="Doğrula" onPress={verify} loading={loading} />
        <Text style={[styles.muted, { textAlign: 'center', marginTop: 16 }]}>Kod gelmedi mi? Gereksiz (spam) klasörünü de kontrol edin.</Text>
        <LinkText title={resending ? 'Gönderiliyor…' : 'Kodu tekrar gönder'} onPress={resend} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
