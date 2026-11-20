import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { DeliveryForm, type DeliveryFormErrors, type DeliveryFormValue } from '../../../components/DeliveryForm';
import { Button, colors, ErrorBanner, Field, Stepper, styles } from '../../../components/ui';
import { validateDelivery } from '../../../lib/deliveryValidation';
import { toTurkishError } from '../../../lib/errors';
import { formatKg } from '../../../lib/food';
import { cartTotals, discountedPrice, DISCOUNT_LABEL, formatTL, type DiscountKind } from '../../../lib/orderCalc';
import { getMyDiscount, getShippingFee, listShopProducts, placeOrder, type ShopProduct } from '../../../lib/orders';
import { getMyProfile } from '../../../lib/profile';

const SPECIES: Record<ShopProduct['species'], string> = { cat: 'Kedi', dog: 'Köpek', both: 'Kedi ve köpek' };

export default function NewOrderScreen() {
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [fee, setFee] = useState(0);
  const [discount, setDiscount] = useState<{ kind: DiscountKind; pct: number }>({ kind: 'none', pct: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [delivery, setDelivery] = useState<DeliveryFormValue>({ type: null, address: '', date: '', time: '' });
  const [deliveryErrors, setDeliveryErrors] = useState<DeliveryFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listShopProducts(), getShippingFee(), getMyProfile(), getMyDiscount()])
      .then(([list, f, profile, d]) => {
        setProducts(list);
        setFee(f);
        setDiscount(d);
        // Kayıtlı adres hazır gelir; müşteri bu sipariş için değiştirebilir.
        if (profile) setDelivery((d) => ({ ...d, address: profile.address }));
        if (productId && list.some((p) => p.id === productId)) setCart({ [productId]: 1 });
      })
      .catch((e) => setFormError(toTurkishError(e)))
      .finally(() => setLoading(false));
  }, [productId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q) return products;
    return products.filter((p) =>
      [p.brand, p.name, p.series, p.flavor, p.age_group].some((v) => v?.toLocaleLowerCase('tr-TR').includes(q)),
    );
  }, [products, query]);

  const lines = products.filter((p) => cart[p.id]).map((p) => ({ product: p, quantity: cart[p.id] }));
  const totals = cartTotals(
    lines.map((l) => ({ listPrice: l.product.price_try, quantity: l.quantity })),
    delivery.type ?? 'pickup',
    fee,
    discount.pct,
  );
  const discountText = `${DISCOUNT_LABEL[discount.kind]} (%${String(discount.pct).replace('.', ',')})`;

  const setQty = (id: string, q: number) =>
    setCart((c) => {
      const next = { ...c };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });

  async function submit() {
    setFormError(null);
    if (lines.length === 0) {
      setFormError('Sepetiniz boş. Listeden ürün ekleyin.');
      return;
    }
    const { errors, input } = validateDelivery(delivery);
    setDeliveryErrors(errors);
    if (!input) return;
    setSaving(true);
    try {
      const created = await placeOrder(
        lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
        input,
      );
      router.replace({ pathname: '/orders/[id]', params: { id: created.id, created: '1' } });
    } catch (e) {
      setFormError(toTurkishError(e as Error));
      setSaving(false);
    }
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
        <ErrorBanner message={formError} />
        {discount.pct > 0 ? (
          <View style={{ backgroundColor: '#e3f1ea', borderRadius: 8, padding: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {discount.kind === 'first_order'
                ? `İlk siparişinize %${String(discount.pct).replace('.', ',')} indirim!`
                : `Bu siparişte ürünlere %${String(discount.pct).replace('.', ',')} indirim uygulanır.`}
            </Text>
            <Text style={styles.muted}>İndirim ürünlere uygulanır; kargo ücretine uygulanmaz.</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Sepet</Text>
        {lines.length === 0 ? <Text style={[styles.muted, { marginBottom: 8 }]}>Sepetiniz boş.</Text> : null}
        {lines.map(({ product: p, quantity }) => (
          <View key={p.id} style={styles.card}>
            <Text style={{ fontWeight: '600', color: colors.text }}>
              {p.brand} · {p.name}
            </Text>
            <Text style={styles.muted}>
              {formatKg(p.package_grams)} ·{' '}
              {discount.pct > 0 ? (
                <>
                  <Text style={{ textDecorationLine: 'line-through' }}>{formatTL(p.price_try)}</Text>{' '}
                  {formatTL(discountedPrice(p.price_try, discount.pct))}
                </>
              ) : (
                formatTL(p.price_try)
              )}{' '}
              / paket
            </Text>
            <Stepper label="Adet" a11yName={`${p.name} adet`} value={quantity} min={0} max={9999} onChange={(q) => setQty(p.id, q)} suffix="adet" />
            <Text style={{ color: colors.text }}>
              Ara toplam: {formatTL(discountedPrice(p.price_try, discount.pct) * quantity)}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Ürün ekle</Text>
        {products.length === 0 ? (
          <Text style={styles.muted}>Katalogda henüz ürün yok.</Text>
        ) : (
          <>
            <Field label="Ürün ara" value={query} onChangeText={setQuery} placeholder="Marka veya ürün adı" />
            {filtered.slice(0, 30).map((p) => (
              <View key={p.id} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600', color: colors.text }}>
                    {p.brand} · {p.name}
                  </Text>
                  <Text style={styles.muted}>
                    {SPECIES[p.species]} · {formatKg(p.package_grams)}
                    {[p.series, p.flavor, p.age_group].filter(Boolean).length
                      ? ` · ${[p.series, p.flavor, p.age_group].filter(Boolean).join(' · ')}`
                      : ''}
                  </Text>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{formatTL(p.price_try)}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${p.name} sepete ekle`}
                  onPress={() => setQty(p.id, (cart[p.id] ?? 0) + 1)}
                  style={{ borderWidth: 1, borderColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
                >
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>{cart[p.id] ? `+1 (${cart[p.id]})` : 'Ekle'}</Text>
                </Pressable>
              </View>
            ))}
            {filtered.length > 30 ? <Text style={styles.muted}>Daha fazla sonuç var; aramayı daraltın.</Text> : null}
          </>
        )}

        <Text style={styles.sectionTitle}>Teslimat</Text>
        <DeliveryForm value={delivery} onChange={setDelivery} errors={deliveryErrors} shippingFee={fee} />

        <Text style={styles.sectionTitle}>Özet</Text>
        <View style={[styles.card, { gap: 4 }]}>
          {discount.pct > 0 ? (
            <>
              <Text style={{ color: colors.text }}>Liste fiyatıyla: {formatTL(totals.list)}</Text>
              <Text style={{ color: '#1f6f3b' }}>
                {discountText}: −{formatTL(totals.discount)}
              </Text>
            </>
          ) : null}
          <Text style={{ color: colors.text }}>Ürünler: {formatTL(totals.items)}</Text>
          <Text style={{ color: colors.text }}>
            Kargo: {delivery.type === 'address' ? formatTL(totals.shipping) : 'Yok'}
          </Text>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Toplam: {formatTL(totals.total)}</Text>
          <Text style={styles.muted}>Ödeme uygulamada alınmaz; teslim alırken veya teslimatta ödenir.</Text>
        </View>
        <Button title="Siparişi gönder" onPress={submit} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
