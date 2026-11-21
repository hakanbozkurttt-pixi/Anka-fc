import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button, colors, ErrorBanner, Field, styles } from '../../components/ui';
import { toTurkishError } from '../../lib/errors';
import { getMyProfile, type Profile } from '../../lib/profile';
import { cancelAllReminders } from '../../lib/reminders';
import { supabase } from '../../lib/supabase';

function confirm(title: string, message: string, ok: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
      { text: ok, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ paddingVertical: 8 }}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 16 }}>{value}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getMyProfile()
        .then(setProfile)
        .catch((e) => setError(toTurkishError(e)))
        .finally(() => setLoading(false));
    }, []),
  );

  async function deleteAccount() {
    setError(null);
    if (!password) {
      setPasswordError('Hesabınızı silmek için şifrenizi girin.');
      return;
    }
    setPasswordError(undefined);
    if (!supabase || !profile) return;
    const ok = await confirm(
      'Hesabımı sil',
      'Hesabınız, hayvan profilleriniz, mama kayıtlarınız ve hatırlatmalarınız kalıcı olarak silinecek. Bu işlem geri alınamaz.',
      'Hesabımı sil',
    );
    if (!ok) return;
    setDeleting(true);
    // Yanlışlıkla silmeye karşı şifre yeniden doğrulanır.
    const check = await supabase.auth.signInWithPassword({ email: profile.email, password });
    if (check.error) {
      setDeleting(false);
      setPasswordError('Şifre hatalı.');
      return;
    }
    const { error: delError } = await supabase.rpc('delete_my_account');
    if (delError) {
      setDeleting(false);
      setError(toTurkishError(delError));
      return;
    }
    await cancelAllReminders();
    // Hesap silindi; oturum kapanınca uygulama giriş ekranına döner.
    await supabase.auth.signOut({ scope: 'local' });
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />
        {profile ? (
          <>
            <Row label="Ad soyad" value={`${profile.first_name} ${profile.last_name}`} />
            <Row label="Telefon" value={profile.phone} />
            <Row label="Adres" value={profile.address} />
            <Row label="E-posta" value={profile.email} />
          </>
        ) : null}
        <Button title="Çıkış yap" variant="secondary" onPress={() => supabase?.auth.signOut()} />

        <Text style={styles.sectionTitle}>Hesabımı sil</Text>
        <Text style={[styles.muted, { marginBottom: 8 }]}>
          Hesabınızı silerseniz hesabınız, hayvan profilleriniz, mama kayıtlarınız, hatırlatmalarınız ve katalog dışı
          talepleriniz silinir. Geçmiş siparişleriniz hastane kayıtlarında kalır; uygulamadan sipariş geçmişinize
          erişiminiz sona erer. Onay bekleyen veya onaylanmış siparişiniz varken hesabınızı silemezsiniz.
        </Text>
        <Field
          label="Şifreniz"
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />
        <Button title="Hesabımı kalıcı olarak sil" onPress={deleteAccount} loading={deleting} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
