import { useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import { toTurkishError } from '../lib/errors';
import { acceptCurrentKvkk } from '../lib/kvkk';
import { supabase } from '../lib/supabase';
import { KvkkText } from './KvkkText';
import { Button, Checkbox, ErrorBanner, styles } from './ui';

// Giriş sonrası onay ekranı: güncel aydınlatma metni sürümünü onaylamamış
// müşteriye gösterilir. Onaylamadan devam edilemez; istenirse çıkış yapılabilir.
export function KvkkConsentScreen({ onAccepted }: { onAccepted: () => void }) {
  const [checked, setChecked] = useState(false);
  const [checkError, setCheckError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function accept() {
    if (!checked) {
      setCheckError('Devam etmek için aydınlatma metnini onaylamanız gerekir.');
      return;
    }
    setCheckError(undefined);
    setError(null);
    setSaving(true);
    try {
      await acceptCurrentKvkk();
      onAccepted();
    } catch (e) {
      setError(toTurkishError(e as Error));
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={[styles.muted, { marginBottom: 12 }]}>
          Devam etmeden önce lütfen aydınlatma metnini okuyup onaylayın.
        </Text>
        <KvkkText />
        <View style={{ height: 16 }} />
        <ErrorBanner message={error} />
        <Checkbox checked={checked} onChange={setChecked} error={checkError}>
          <Text style={{ lineHeight: 20 }}>Aydınlatma metnini okudum ve onaylıyorum.</Text>
        </Checkbox>
        <Button title="Onayla ve devam et" onPress={accept} loading={saving} />
        <Button title="Çıkış yap" variant="secondary" onPress={() => supabase?.auth.signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}
