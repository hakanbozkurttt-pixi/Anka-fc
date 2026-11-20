import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { getPermission, type PermissionState } from '../lib/reminders';
import { colors, styles } from './ui';

/** Bildirim izni verilmediyse müşteriyi uyarır (yedek kanal yok: SMS/e-posta gönderilmez). */
export function NotificationPermissionBanner() {
  const [state, setState] = useState<PermissionState>('granted');

  useFocusEffect(
    useCallback(() => {
      getPermission().then(setState);
    }, []),
  );

  if (state !== 'denied') return null;
  return (
    <View style={{ backgroundColor: '#fff3c4', borderRadius: 8, padding: 12, marginBottom: 12, gap: 6 }}>
      <Text style={{ color: colors.text }}>
        Bildirimlere izin verilmedi. Mama bitmeden hatırlatma alamazsınız; hatırlatmalar SMS veya e-postayla
        gönderilmez.
      </Text>
      <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()}>
        <Text style={styles.link}>Telefon ayarlarını aç</Text>
      </Pressable>
    </View>
  );
}
