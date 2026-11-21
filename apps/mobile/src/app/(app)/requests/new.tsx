import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput } from 'react-native';

import { Button, colors, ErrorBanner, styles } from '../../../components/ui';
import { toTurkishError } from '../../../lib/errors';
import { createRequest, REQUEST_MAX_LENGTH } from '../../../lib/requests';

// Katalogda olmayan ürün için hastaneye 160 karakterlik mesaj gönderilir.
export default function NewRequestScreen() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const left = REQUEST_MAX_LENGTH - message.length;

  async function send() {
    setError(null);
    if (!message.trim()) {
      setError('Mesajınızı yazın.');
      return;
    }
    setSaving(true);
    try {
      await createRequest(message);
      router.replace({ pathname: '/requests', params: { sent: '1' } });
    } catch (e) {
      setError(toTurkishError(e as Error));
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Text style={[styles.muted, { marginBottom: 12 }]}>
          Kullandığınız mama katalogda yoksa hastaneye yazın: marka, ürün adı ve paket ağırlığını belirtmeniz yeterli.
          Hastane uygun görürse ürünü fiyatıyla birlikte size özel olarak ekler; siz de sipariş verebilir ve mama
          takibine ekleyebilirsiniz.
        </Text>
        <ErrorBanner message={error} />
        <Text style={styles.label}>Mesajınız</Text>
        <TextInput
          accessibilityLabel="Mesajınız"
          value={message}
          onChangeText={(t) => setMessage(t.slice(0, REQUEST_MAX_LENGTH))}
          maxLength={REQUEST_MAX_LENGTH}
          multiline
          numberOfLines={4}
          placeholder="ör. X marka yetişkin kedi maması, 2 kg paket"
          placeholderTextColor={colors.muted}
          style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
        />
        <Text style={[styles.muted, { textAlign: 'right', marginTop: 4 }]} accessibilityLiveRegion="polite">
          {left} karakter kaldı
        </Text>
        <Text style={[styles.muted, { marginTop: 8 }]}>
          Bu bir sipariş değildir. Talep ürünlerinde indirim ve kampanya uygulanmaz; hastanenin belirlediği fiyat geçerlidir.
        </Text>
        <Button title="Talebi gönder" onPress={send} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
