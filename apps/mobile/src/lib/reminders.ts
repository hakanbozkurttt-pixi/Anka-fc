// Mama hatırlatma bildirimlerini telefona işler.
// Bildirimleri telefon kendisi, zamanı gelince gösterir (yerel bildirim):
// sunucudan gönderim, Firebase veya Apple bildirim hesabı gerekmez.
// Uygulama her açıldığında, mama kaydı değiştiğinde ve öne geldiğinde plan
// yeniden kurulur; böylece telefondaki plan her zaman güncel kayıtlarla aynıdır.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { planReminders, type ReminderSource } from './reminderPlan';
import { supabase } from './supabase';

const CHANNEL_ID = 'mama-hatirlatma';
const SHOWN_LATE_KEY = 'reminders.shownLate';
const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

let configured = false;

function configure() {
  if (configured || !SUPPORTED) return;
  configured = true;
  // Uygulama açıkken gelen hatırlatma da ekranda gösterilsin.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Mama hatırlatmaları',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function getPermission(): Promise<PermissionState> {
  if (!SUPPORTED) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status as PermissionState;
}

/** İzin henüz sorulmadıysa sorar. */
export async function ensurePermission(): Promise<PermissionState> {
  if (!SUPPORTED) return 'unsupported';
  configure();
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== 'undetermined') return current.status as PermissionState;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status as PermissionState;
}

async function loadShownLate(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SHOWN_LATE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

async function saveShownLate(keys: Set<string>) {
  try {
    // Yalnızca son kayıtları tut
    await AsyncStorage.setItem(SHOWN_LATE_KEY, JSON.stringify([...keys].slice(-200)));
  } catch {
    // önemsiz
  }
}

/** Telefondaki tüm mama hatırlatmalarını kaldırır (ör. çıkış yapılınca). */
export async function cancelAllReminders() {
  if (!SUPPORTED) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  try {
    await AsyncStorage.removeItem(SHOWN_LATE_KEY);
  } catch {
    // önemsiz
  }
}

let running: Promise<void> | null = null;

/**
 * Müşterinin mama kayıtlarına göre telefondaki hatırlatma planını yeniden kurar.
 * Aynı anda birden fazla çağrı gelirse tek seferde çalışır.
 */
export function syncReminders(): Promise<void> {
  if (!SUPPORTED || !supabase) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    try {
      configure();
      if ((await getPermission()) !== 'granted') return;

      const { data, error } = await supabase!
        .from('food_records_with_schedule')
        .select('id, brand, product_name, start_date, total_grams, daily_grams, reminder_enabled, reminder_days_before, pets(name)');
      if (error) return; // Bağlantı yoksa mevcut plan korunur; sonraki açılışta yeniden denenir.

      const records: ReminderSource[] = (data ?? []).map((r: Record<string, unknown>) => ({
        ...(r as Omit<ReminderSource, 'pet_name'>),
        pet_name: ((r.pets as { name?: string } | null)?.name ?? 'Hayvanınız'),
      }));

      const shownLate = await loadShownLate();
      const plan = planReminders(records, new Date(), shownLate);

      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const p of plan) {
        await Notifications.scheduleNotificationAsync({
          content: { title: p.title, body: p.body, data: { foodRecordId: p.recordId } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.date, channelId: CHANNEL_ID },
        });
        if (p.late) shownLate.add(p.key);
      }
      await saveShownLate(shownLate);
    } finally {
      running = null;
    }
  })();
  return running;
}
