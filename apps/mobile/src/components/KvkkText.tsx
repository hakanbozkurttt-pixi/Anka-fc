import { Text, View } from 'react-native';

import { KVKK_SECTIONS, KVKK_TITLE } from '../content/kvkk';
import { colors } from './ui';

export function KvkkText() {
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{KVKK_TITLE}</Text>
      {KVKK_SECTIONS.map((section) => (
        <View key={section.heading} style={{ gap: 4 }}>
          <Text style={{ fontWeight: '600', color: colors.text }}>{section.heading}</Text>
          <Text style={{ color: colors.text, lineHeight: 20 }}>{section.body}</Text>
        </View>
      ))}
    </View>
  );
}
