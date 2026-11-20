import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { OrderStatusBadge } from '../../../components/OrderStatusBadge';
import { Button, colors, ErrorBanner, styles } from '../../../components/ui';
import { toTurkishError } from '../../../lib/errors';
import { checkOrderUpdates } from '../../../lib/orderNotifications';
import { DELIVERY_LABEL, formatTL } from '../../../lib/orderCalc';
import { listOrders, type Order } from '../../../lib/orders';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      listOrders()
        .then((o) => {
          setOrders(o);
          setError(null);
        })
        .catch((e) => setError(toTurkishError(e)))
        .finally(() => setLoading(false));
      checkOrderUpdates();
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
      data={orders}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={
        <>
          <ErrorBanner message={error} />
          <Button title="Yeni sipariş ver" onPress={() => router.push('/orders/new')} />
          <View style={{ height: 12 }} />
        </>
      }
      ListEmptyComponent={<Text style={[styles.muted, { textAlign: 'center', marginTop: 24 }]}>Henüz siparişiniz yok.</Text>}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          style={styles.card}
          onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>Sipariş #{item.order_no}</Text>
            <OrderStatusBadge status={item.status} />
          </View>
          <Text style={styles.muted}>
            {new Date(item.created_at).toLocaleDateString('tr-TR')} · {item.order_items.length} ürün ·{' '}
            {DELIVERY_LABEL[item.delivery_type]}
          </Text>
          <Text style={{ fontWeight: '600', color: colors.text, marginTop: 4 }}>{formatTL(item.total_try)}</Text>
        </Pressable>
      )}
    />
  );
}
