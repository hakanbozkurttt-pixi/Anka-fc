// Sipariş durumu ve katalog dışı talep sonucu bildirimleri: uygulama açılınca / öne gelince kontrol edilir.
// Uygulama kapalıyken anında bildirim GÖNDERİLMEZ (karar: sunucudan gönderim yok).

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { orderNotices, type OrderStatusRow, type SeenMap } from './orderNotices';
import { requestNotices, type RequestRow, type RequestSeen } from './requestNotices';
import { getPermission } from './reminders';
import { supabase } from './supabase';

const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

let running = false;

export async function checkOrderUpdates(): Promise<void> {
  if (!supabase || running) return;
  running = true;
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const key = `orders.seen.${auth.user.id}`;

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_no, status, status_changed_at, status_changed_by')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return;

    let seen: SeenMap | null = null;
    try {
      const raw = await AsyncStorage.getItem(key);
      seen = raw ? (JSON.parse(raw) as SeenMap) : null;
    } catch {
      seen = null;
    }

    const result = orderNotices(data as OrderStatusRow[], seen);

    // Katalog dışı ürün talebi sonuçları
    const reqKey = `requests.seen.${auth.user.id}`;
    let reqSeen: RequestSeen | null = null;
    try {
      const raw = await AsyncStorage.getItem(reqKey);
      reqSeen = raw ? (JSON.parse(raw) as RequestSeen) : null;
    } catch {
      reqSeen = null;
    }
    const reqs = await supabase.from('product_requests').select('id, request_no, status, decided_at').limit(200);
    const reqResult = reqs.error ? null : requestNotices(reqs.data as RequestRow[], reqSeen);

    if (SUPPORTED && (await getPermission()) === 'granted') {
      for (const n of result.notices) {
        await Notifications.scheduleNotificationAsync({
          content: { title: n.title, body: n.body, data: { orderId: n.orderId } },
          trigger: null, // hemen göster
        });
      }
      for (const n of reqResult?.notices ?? []) {
        await Notifications.scheduleNotificationAsync({
          content: { title: n.title, body: n.body, data: { requestId: n.requestId } },
          trigger: null,
        });
      }
    }
    try {
      await AsyncStorage.setItem(key, JSON.stringify(result.seen));
      if (reqResult) await AsyncStorage.setItem(reqKey, JSON.stringify(reqResult.seen));
    } catch {
      // önemsiz
    }
  } finally {
    running = false;
  }
}
