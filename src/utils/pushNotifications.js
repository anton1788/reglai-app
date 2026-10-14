// src/utils/pushNotifications.js
import { supabase } from './supabaseClient';

// ─────────────────────────────────────────────────────────
// 🔧 Утилита: base64url → Uint8Array (нужно для VAPID)
// ─────────────────────────────────────────────────────────
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// ─────────────────────────────────────────────────────────
// 🔍 Проверка поддержки
// ─────────────────────────────────────────────────────────
export const isPushSupported = () => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

// ─────────────────────────────────────────────────────────
// 📊 Текущий статус разрешения
// ─────────────────────────────────────────────────────────
export const getPushPermission = () => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
};

// ─────────────────────────────────────────────────────────
// 🔔 Подписаться на push
//    ВАЖНО: вызывать ТОЛЬКО по клику пользователя!
// ─────────────────────────────────────────────────────────
export const subscribeToPush = async (userId, companyId) => {
  if (!isPushSupported()) {
    throw new Error('Push-уведомления не поддерживаются этим браузером');
  }
  if (!userId) throw new Error('userId не передан');
  if (!companyId) throw new Error('companyId не передан');

  // 1. Запрос разрешения
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Пользователь запретил уведомления');
  }

  // 2. Получаем регистрацию SW
  const registration = await navigator.serviceWorker.ready;

  // 3. Проверяем, нет ли уже активной подписки
  let subscription = await registration.pushManager.getSubscription();

  // 4. Если нет — создаём
  if (!subscription) {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) throw new Error('VAPID_PUBLIC_KEY не задан в .env');

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true, // обязательно true
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
  }

  // 5. Извлекаем ключи подписки
  const subJson = subscription.toJSON();
  const p256dh = subJson.keys?.p256dh;
  const auth = subJson.keys?.auth;

  if (!p256dh || !auth) {
    throw new Error('Не удалось получить ключи подписки');
  }

  // 6. Сохраняем в Supabase (upsert по endpoint)
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        company_id: companyId,
        endpoint: subscription.endpoint,
        p256dh: p256dh,
        auth: auth,
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );

  if (error) throw error;

  return subscription;
};

// ─────────────────────────────────────────────────────────
// 🔕 Отписаться от push
// ─────────────────────────────────────────────────────────
export const unsubscribeFromPush = async () => {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  // Удаляем из БД
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);
};

// ─────────────────────────────────────────────────────────
// 📋 Проверка: подписан ли текущий пользователь
// ─────────────────────────────────────────────────────────
export const isSubscribed = async () => {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
};