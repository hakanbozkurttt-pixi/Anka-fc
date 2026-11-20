import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { DeliveryForm, type DeliveryFormErrors, type DeliveryFormValue } from '../../../components/DeliveryForm';
import { OrderStatusBadge } from '../../../components/OrderStatusBadge';
import { Button, colors, ErrorBanner, InfoBanner, styles } from '../../../components/ui';
import { validateDelivery } from '../../../lib/deliveryValidation';
import { toTurkishError } from '../../../lib/errors';
import { formatKg } from '../../../lib/food';
import { DELIVERY_LABEL, DISCOUNT_LABEL, formatTL } from '../../../lib/orderCalc';
import {
  answerNewPackage,
  cancelOrder,
  confirmReceived,
  getOrder,
  getShippingFee,
  trackedProductIds,
  updateOrderDelivery,
  type Order,
} from '../../../lib/orders';
import { syncReminders } from '../../../lib/reminders';
import { formatTurkishDate } from '../../../lib/validation';

function confirm(title: string, message: string, ok: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
      { text: ok, onPress: () => resolve(true) },
    ]),
  );
}

const STATUS_HELP = {
  pending: 'Siparişiniz hastanenin onayını bekliyor. Onaydan önce iptal edebilir veya teslim şeklini değiştirebilirsiniz.',
  approved: 'Siparişiniz onaylandı. İptal veya değişiklik için hastaneyle iletişime geçin.',
  delivered: 'Siparişiniz teslim edildi.',
  cancelled: 'Bu sipariş iptal edildi.',
} as const;

export default function OrderDetailScreen() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [tracked, setTracked] = useState<Set<string>>(new Set());
  const [fee, setFee] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(created ? 'Siparişiniz alındı. Hastane onayladığında uygulamada göreceksiniz.' : null);
  const [editing, setEditing] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryFormValue>({ type: null, address: '', date: '', time: '' });
  const [deliveryErrors, setDeliveryErrors] = useState<DeliveryFormErrors>({});

  const load = useCallback(async () => {
    try {
      const [o, t, f] = await Promise.all([getOrder(id), trackedProductIds(), getShippingFee()]);
      setOrder(o);
      setTracked(t);
      setFee(f);
      if (!o) setError('Sipariş bulunamadı.');
    } catch (e) {
      setError(toTurkishError(e as Error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function run(action: () => Promise<void>, message: string) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
      await load();
      setInfo(message);
    } catch (e) {
      setError(toTurkishError(e as Error));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(o: Order) {
    setDelivery({
      type: o.delivery_type,
      address: o.delivery_address ?? '',
      date: o.delivery_date ? formatTurkishDate(o.delivery_date) : '',
      time: o.delivery_time ? o.delivery_time.slice(0, 5) : '',
    });
    setDeliveryErrors({});
    setEditing(true);
  }

  async function saveDelivery() {
    const { errors, input } = validateDelivery(delivery);
    setDeliveryErrors(errors);
    if (!input) return;
    await run(() => updateOrderDelivery(id, input), 'Teslimat bilgisi güncellendi.');
    setEditing(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!order) {
    return (
      <View style={styles.screen}>
        <ErrorBanner message={error} />
      </View>
    );
  }

  // Teslimattan sonra, mama kaydı olan ürünler için "yeni paket" sorusu
  const askNewPackage =
    order.status === 'delivered'
      ? order.order_items.filter((i) => tracked.has(i.product_id) && !i.new_package_answer)
      : [];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Stack.Screen options={{ title: `Sipariş #${order.order_no}` }} />
        <InfoBanner message={info} />
        <ErrorBanner message={error} />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <OrderStatusBadge status={order.status} />
          <Text style={styles.muted}>{new Date(order.created_at).toLocaleString('tr-TR')}</Text>
        </View>
        <Text style={[styles.muted, { marginBottom: 8 }]}>{STATUS_HELP[order.status]}</Text>

        {askNewPackage.map((item) => (
          <View key={item.id} style={[styles.card, { borderColor: colors.primary, gap: 8 }]}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              Yeni paketi kullanmaya başladınız mı?
            </Text>
            <Text style={styles.muted}>
              {item.brand} · {item.product_name} ({item.quantity} paket). “Evet” derseniz mama sayacı bugünden başlar.
              Cevap vermezseniz sayaç mevcut mama bitince kendiliğinden yeniden başlar.
            </Text>
            <Button
              title="Evet, bugün başladım"
              loading={busy}
              onPress={() =>
                run(async () => {
                  await answerNewPackage(item.id, 'started');
                  syncReminders();
                }, 'Mama sayacı bugünden başladı.')
              }
            />
            <Button
              title="Henüz başlamadım"
              variant="secondary"
              onPress={() => run(() => answerNewPackage(item.id, 'not_yet'), 'Cevabınız kaydedildi. Yeni pakete başlayınca mama sayfasından belirtebilirsiniz.')}
            />
          </View>
        ))}

        <Text style={styles.sectionTitle}>Ürünler</Text>
        {order.order_items.map((i) => (
          <View key={i.id} style={{ marginBottom: 8 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {i.brand} · {i.product_name}
            </Text>
            <Text style={styles.muted}>
              {formatKg(i.package_grams)} · {i.quantity} ×{' '}
              {i.discount_pct > 0 ? (
                <>
                  <Text style={{ textDecorationLine: 'line-through' }}>{formatTL(i.list_price_try)}</Text>{' '}
                </>
              ) : null}
              {formatTL(i.unit_price_try)} = {formatTL(i.line_total_try)}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Teslimat</Text>
        {editing ? (
          <>
            <DeliveryForm value={delivery} onChange={setDelivery} errors={deliveryErrors} shippingFee={fee} />
            <Button title="Teslimat bilgisini kaydet" onPress={saveDelivery} loading={busy} />
            <Button title="Vazgeç" variant="secondary" onPress={() => setEditing(false)} />
          </>
        ) : (
          <View style={{ gap: 2 }}>
            <Text style={{ color: colors.text }}>{DELIVERY_LABEL[order.delivery_type]}</Text>
            {order.delivery_type === 'address' ? (
              <>
                <Text style={styles.muted}>{order.delivery_address}</Text>
                <Text style={styles.muted}>
                  {order.delivery_date ? formatTurkishDate(order.delivery_date) : ''} · saat {order.delivery_time?.slice(0, 5)}
                </Text>
              </>
            ) : null}
          </View>
        )}

        <Text style={styles.sectionTitle}>Tutar</Text>
        <View style={{ gap: 2 }}>
          {order.discount_total_try > 0 ? (
            <>
              <Text style={{ color: colors.text }}>Liste fiyatıyla: {formatTL(order.items_list_total_try)}</Text>
              <Text style={{ color: '#1f6f3b' }}>
                {DISCOUNT_LABEL[order.discount_kind]} (%{String(order.discount_pct).replace('.', ',')}): −
                {formatTL(order.discount_total_try)}
              </Text>
            </>
          ) : null}
          <Text style={{ color: colors.text }}>Ürünler: {formatTL(order.items_total_try)}</Text>
          <Text style={{ color: colors.text }}>
            Kargo: {order.shipping_fee_try > 0 ? formatTL(order.shipping_fee_try) : 'Yok'}
          </Text>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Toplam: {formatTL(order.total_try)}</Text>
          <Text style={styles.muted}>Ödeme uygulamada alınmaz.</Text>
        </View>

        {order.status === 'pending' && !editing ? (
          <>
            <Button title="Teslim şeklini değiştir" variant="secondary" onPress={() => startEdit(order)} />
            <Button
              title="Siparişi iptal et"
              variant="secondary"
              loading={busy}
              onPress={async () => {
                if (await confirm('Siparişi iptal et', 'Bu sipariş iptal edilecek.', 'İptal et'))
                  run(() => cancelOrder(id), 'Siparişiniz iptal edildi.');
              }}
            />
          </>
        ) : null}
        {order.status === 'approved' ? (
          <Button
            title="Teslim aldım"
            loading={busy}
            onPress={async () => {
              if (await confirm('Teslim aldım', 'Siparişi teslim aldığınızı onaylıyor musunuz?', 'Evet'))
                run(() => confirmReceived(id), 'Sipariş teslim edildi olarak işaretlendi.');
            }}
          />
        ) : null}
        <Button title="Siparişlerime dön" variant="secondary" onPress={() => router.navigate('/orders')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
