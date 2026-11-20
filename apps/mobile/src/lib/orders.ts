import type { DeliveryType, OrderStatus } from './orderCalc';
import { supabase } from './supabase';

export type OrderItem = {
  id: string;
  product_id: string;
  brand: string;
  product_name: string;
  package_grams: number;
  unit_price_try: number;
  quantity: number;
  line_total_try: number;
  new_package_answer: 'started' | 'not_yet' | null;
};

export type Order = {
  id: string;
  order_no: number;
  status: OrderStatus;
  delivery_type: DeliveryType;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  items_total_try: number;
  shipping_fee_try: number;
  total_try: number;
  status_changed_at: string;
  status_changed_by: 'customer' | 'admin';
  created_at: string;
  order_items: OrderItem[];
};

export type ShopProduct = {
  id: string;
  brand: string;
  name: string;
  species: 'cat' | 'dog' | 'both';
  series: string | null;
  flavor: string | null;
  age_group: string | null;
  package_grams: number;
  price_try: number;
  description: string | null;
};

export type DeliveryInput = {
  delivery_type: DeliveryType;
  delivery_address?: string | null;
  delivery_date?: string | null;
  delivery_time?: string | null;
};

function client() {
  if (!supabase) throw new Error('Supabase ayarı eksik.');
  return supabase;
}

const num = (v: unknown) => Number(v);

function normalize(o: Order): Order {
  return {
    ...o,
    items_total_try: num(o.items_total_try),
    shipping_fee_try: num(o.shipping_fee_try),
    total_try: num(o.total_try),
    order_items: (o.order_items ?? []).map((i) => ({
      ...i,
      unit_price_try: num(i.unit_price_try),
      line_total_try: num(i.line_total_try),
    })),
  };
}

export async function listOrders(): Promise<Order[]> {
  const { data, error } = await client()
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data as Order[]).map(normalize);
}

export async function getOrder(id: string): Promise<Order | null> {
  const { data, error } = await client().from('orders').select('*, order_items(*)').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? normalize(data as Order) : null;
}

/** Satıştaki tüm ürünler (müşteri yalnızca aktif ürünleri görür). */
export async function listShopProducts(): Promise<ShopProduct[]> {
  const { data, error } = await client()
    .from('products')
    .select('id, brand, name, species, series, flavor, age_group, package_grams, price_try, description')
    .order('brand')
    .order('name')
    .order('package_grams')
    .limit(1000);
  if (error) throw error;
  return (data as ShopProduct[]).map((p) => ({ ...p, price_try: num(p.price_try) }));
}

export async function getShippingFee(): Promise<number> {
  const { data, error } = await client().from('app_settings').select('shipping_fee_try').single();
  if (error) throw error;
  return num(data.shipping_fee_try);
}

export async function placeOrder(items: { product_id: string; quantity: number }[], delivery: DeliveryInput) {
  const { data, error } = await client().rpc('place_order', { items, ...delivery });
  if (error) throw error;
  return data as { id: string; order_no: number };
}

export async function updateOrderDelivery(orderId: string, delivery: DeliveryInput) {
  const { error } = await client().rpc('update_order_delivery', { order_id: orderId, ...delivery });
  if (error) throw error;
}

export async function cancelOrder(orderId: string) {
  const { error } = await client().rpc('cancel_order', { order_id: orderId });
  if (error) throw error;
}

export async function confirmReceived(orderId: string) {
  const { error } = await client().rpc('confirm_received', { order_id: orderId });
  if (error) throw error;
}

export async function answerNewPackage(orderItemId: string, answer: 'started' | 'not_yet') {
  const { error } = await client().rpc('answer_new_package', { order_item_id: orderItemId, answer });
  if (error) throw error;
}

/** Müşterinin mama kaydı olan ürünler (teslimattan sonra "yeni paket" sorusu için). */
export async function trackedProductIds(): Promise<Set<string>> {
  const { data, error } = await client().from('food_records').select('product_id');
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.product_id as string));
}
