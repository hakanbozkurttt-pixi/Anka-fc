import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import { Button, colors, ErrorBanner, InfoBanner, styles } from '../../../components/ui';
import { toTurkishError } from '../../../lib/errors';
import { formatKg } from '../../../lib/food';
import { formatTL } from '../../../lib/orderCalc';
import { listMyRequests, REQUEST_STATUS_LABEL, type ProductRequest } from '../../../lib/requests';

const COLORS = { pending: '#8a5a00', approved: '#1f6f3b', rejected: '#b42318' } as const;

export default function RequestsScreen() {
  const { sent } = useLocalSearchParams<{ sent?: string }>();
  const [items, setItems] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      listMyRequests()
        .then((r) => {
          setItems(r);
          setError(null);
        })
        .catch((e) => setError(toTurkishError(e)))
        .finally(() => setLoading(false));
    }, []),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={[styles.screen, { flexGrow: 1 }]}
      data={items}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <>
          <InfoBanner message={sent ? 'Talebiniz hastaneye iletildi. Sonucu bu sayfada ve uygulamayı açtığınızda göreceksiniz.' : null} />
          <ErrorBanner message={error} />
          <Button title="Katalog dışı ürün talebi" onPress={() => router.push('/requests/new')} />
          <View style={{ height: 12 }} />
        </>
      }
      ListEmptyComponent={<Text style={[styles.muted, { textAlign: 'center', marginTop: 24 }]}>Henüz talebiniz yok.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '600', color: colors.text }}>Talep #{item.request_no}</Text>
            <Text style={{ fontWeight: '600', color: COLORS[item.status] }}>{REQUEST_STATUS_LABEL[item.status]}</Text>
          </View>
          <Text style={styles.muted}>{new Date(item.created_at).toLocaleDateString('tr-TR')}</Text>
          <Text style={{ color: colors.text, marginTop: 4 }}>“{item.message}”</Text>
          {item.status === 'approved' && item.product ? (
            <View style={{ marginTop: 8, gap: 2 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {item.product.brand} · {item.product.name} · {formatKg(item.product.package_grams)}
              </Text>
              <Text style={{ color: colors.text }}>Size özel fiyat: {formatTL(item.product.price_try)} (indirim uygulanmaz)</Text>
              {item.product.is_active ? (
                <Button
                  title="Bu üründen sipariş ver"
                  variant="secondary"
                  onPress={() => router.push({ pathname: '/orders/new', params: { productId: item.product!.id } })}
                />
              ) : (
                <Text style={styles.muted}>Bu ürün şu anda satışta değil.</Text>
              )}
            </View>
          ) : null}
          {item.status === 'rejected' ? (
            <Text style={[styles.muted, { marginTop: 4 }]}>Bilgi için hastaneyle iletişime geçebilirsiniz.</Text>
          ) : null}
        </View>
      )}
    />
  );
}
