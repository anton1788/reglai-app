/* eslint-env serviceworker */
/* eslint-disable no-undef */
// src/sw.js
// ═══════════════════════════════════════════════════════════
// 🔧 Service Worker: precache + runtime cache + Web Push
// ═══════════════════════════════════════════════════════════

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';

// ───────────────────────────────────────────────────────────
// 🚀 Активация: skipWaiting + clientsClaim
// ───────────────────────────────────────────────────────────
self.skipWaiting();
clientsClaim();

// ───────────────────────────────────────────────────────────
// 📨 ОБРАБОТЧИК SKIP_WAITING (вызывается из UI)
//     Без него кнопка "Обновить сейчас" не работает!
// ───────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING получен, активируем новый SW');
    self.skipWaiting();
  }
});

// ───────────────────────────────────────────────────────────
// 📦 Precache (файлы из __WB_MANIFEST)
// ───────────────────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ───────────────────────────────────────────────────────────
// 🌐 HTML: NetworkFirst (быстрое получение свежего index.html)
// ───────────────────────────────────────────────────────────
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'html-cache',
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 3600 }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    }),
    {
      // ✅ Исключаем из HTML-роутинга API, auth, version.json и сам SW
      denylist: [
        /^\/rest\/v1\//,
        /^\/auth\//,
        /^\/functions\//,
        /^\/admin\//,
        /\/version\.json$/,
        /\/sw\.js$/,
        /\/registerSW\.js$/,
      ],
    }
  )
);

// ───────────────────────────────────────────────────────────
// 🖼 Статика: CacheFirst
// ───────────────────────────────────────────────────────────
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/i,
  new CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  /\.mjs$/i,
  new CacheFirst({
    cacheName: 'mjs-resources',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ───────────────────────────────────────────────────────────
// 🔌 Supabase REST и Storage
// ───────────────────────────────────────────────────────────
registerRoute(
  /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*$/i,
  new NetworkFirst({
    cacheName: 'supabase-api',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*$/i,
  new StaleWhileRevalidate({
    cacheName: 'supabase-storage',
    plugins: [new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 })],
  })
);

// ───────────────────────────────────────────────────────────
// 🔤 Google Fonts
// ───────────────────────────────────────────────────────────
registerRoute(
  /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/i,
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// ───────────────────────────────────────────────────────────
// 🔥 КРИТИЧНО: version.json и sw.js — ВСЕГДА из сети
//     Без этого SW отдаёт закэшированную версию → обновления не работают
// ───────────────────────────────────────────────────────────
registerRoute(
  ({ url }) =>
    url.pathname === '/version.json' ||
    url.pathname === '/sw.js' ||
    url.pathname === '/registerSW.js',
  new NetworkOnly()
);

// ═══════════════════════════════════════════════════════════
// 🔔 WEB PUSH
// ═══════════════════════════════════════════════════════════
self.addEventListener('push', (event) => {
  console.log('[SW] 🔔 Push event received');

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: 'Реглай',
      body: event.data?.text() || 'Новое уведомление',
    };
  }

  const title = data.title || 'Реглай';
  const options = {
    body: data.body || data.message || 'У вас новое уведомление',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-96.png',
    tag: data.tag || data.id || 'reglai-notification',
    renotify: true,
    requireInteraction: false,
    data: {
      url: data.url || data.action_url || '/',
      notificationId: data.id || null,
      ...data,
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 👆 Notification click:', event.notification.tag);
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(targetUrl).catch(() => {});
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] ♻️ Push subscription changed');
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription?.options)
      .then((newSub) => {
        console.log('[SW] New subscription:', newSub?.endpoint);
      })
      .catch((err) => {
        console.warn('[SW] Resubscribe failed:', err);
      })
  );
});