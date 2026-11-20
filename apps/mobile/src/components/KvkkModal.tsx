import { Modal, SafeAreaView, ScrollView } from 'react-native';

import { KvkkText } from './KvkkText';
import { Button, styles } from './ui';

export function KvkkModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.screen}>
          <KvkkText />
          <Button title="Kapat" variant="secondary" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
