/* eslint-disable */
// ✅ Service Worker для PWA приложения Reglai
// Версия: 9

// ✅ Защита от циклических обновлений
let isUpdating = false;
let lastUpdateCheck = 0;
const UPDATE_COOLDOWN = 60000; // 60 секунд

const APP_VERSION = '9.15.30-beta';
const CACHE_NAME = `reglai-system-v${APP_VERSION}`;
const DATA_CACHE_NAME = `reglai-data-v${APP_VERSION}`;
const OFFLINE_CACHE_NAME = `reglai-offline-v${APP_VERSION}`;

const checkAndUpdate = async () => {
  const now = Date.now();
  if (isUpdating || (now - lastUpdateCheck) < UPDATE_COOLDOWN) {
    console.log('[SW] Update skipped (cooldown)');
    return false;
  }
  
  isUpdating = true;
  lastUpdateCheck = now;
  
  try {
    const response = await fetch('/version.json?v=' + now);
    const data = await response.json();
    
    if (data.version && data.version !== APP_VERSION) {
      console.log('[SW] New version detected:', data.version);
      return true;
    }
  } catch (err) {
    console.warn('[SW] Version check failed:', err);
  } finally {
    isUpdating = false;
  }
  
  return false;
};

// ✅ Ресурсы для предзагрузки (App Shell)
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icon-48.png',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-256.png',
  '/icon-384.png',
  '/icon-512.png'
];

// ✅ Конфигурация кэширования
const CACHE_CONFIG = {
  MAX_DATA_CACHE_ENTRIES: 50,
  DATA_CACHE_TTL_MINUTES: 30,
  MAX_OFFLINE_CACHE_ENTRIES: 100,
  OFFLINE_REQUEST_MAX_AGE_HOURS: 24
};

// ─────────────────────────────────────────────────────────
// 🎯 Вспомогательные функции
// ─────────────────────────────────────────────────────────

const isSupabaseUrl = (url) => {
  try {
    return new URL(url).hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

const isApiRequest = (url) => {
  return isSupabaseUrl(url) && (
    url.includes('/rest/v1/') || 
    url.includes('/realtime/v1') ||
    url.includes('/auth/v1/') ||
    url.includes('/storage/v1/')
  );
};

const isStaticResource = (url) => {
  const staticExtensions = ['.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.json', '.ico', '.woff', '.woff2'];
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return staticExtensions.some(ext => pathname.endsWith(ext));
  } catch {
    return false;
  }
};

const notifyClients = (type, payload) => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      if (client.visibilityState === 'visible') {
        client.postMessage({ type, payload, timestamp: Date.now() }).catch(() => {});
      }
    });
  });
};

// ─────────────────────────────────────────────────────────
// 📦 INSTALL
// ─────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v' + APP_VERSION);
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(async (cache) => {
        console.log('[SW] Caching app shell...');
        const results = await Promise.allSettled(
          urlsToCache.map(url => 
            fetch(url, { cache: 'reload' })
              .then(res => res.ok ? cache.put(url, res) : Promise.reject(`HTTP ${res.status}`))
              .catch(err => console.warn(`[SW] Failed to cache ${url}:`, err))
          )
        );
        const success = results.filter(r => r.status === 'fulfilled').length;
        console.log(`[SW] Cached ${success}/${urlsToCache.length} resources`);
      }),
      caches.open(DATA_CACHE_NAME),
      caches.open(OFFLINE_CACHE_NAME)
    ])
    .then(() => {
      console.log('[SW] Install completed');
      return self.skipWaiting();
    })
    .catch(err => console.error('[SW] Install failed:', err))
  );
});

// ─────────────────────────────────────────────────────────
// 🔄 ACTIVATE
// ─────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v' + APP_VERSION);
  event.waitUntil(
    caches.keys()
      .then(keys => {
        const keepList = [CACHE_NAME, DATA_CACHE_NAME, OFFLINE_CACHE_NAME];
        const toDelete = keys.filter(key => !keepList.includes(key) && key.includes('reglai'));
        console.log(`[SW] Cleaning ${toDelete.length} old caches`);
        return Promise.all(toDelete.map(key => caches.delete(key)));
      })
      .then(() => {
        console.log('[SW] Activation completed');
        return self.clients.claim();
      })
      .catch(err => console.error('[SW] Activation failed:', err))
  );
});

// ─────────────────────────────────────────────────────────
// 🔄 BACKGROUND SYNC
// ─────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  if (event.tag === 'sync-reglai-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  try {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    const keys = await cache.keys();
    const now = Date.now();
    const maxAge = CACHE_CONFIG.OFFLINE_REQUEST_MAX_AGE_HOURS * 60 * 60 * 1000;
    
    console.log(`[SW] Processing ${keys.length} offline requests`);
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (!response) continue;
      
      try {
        const data = await response.json();
        const savedAtHeader = response.headers.get('x-offline-saved-at');
        const savedAt = savedAtHeader ? new Date(savedAtHeader).getTime() : now;
        
        if (now - savedAt > maxAge) {
          await cache.delete(request);
          continue;
        }
        
        const fetchResponse = await fetch(request.url, {
          method: data.method || 'POST',
          headers: { 'Content-Type': 'application/json', ...data.headers },
          body: JSON.stringify(data.body),
          mode: 'cors',
          credentials: 'include'
        });
        
        if (fetchResponse.ok) {
          await cache.delete(request);
          notifyClients('SYNC_SUCCESS', { url: request.url, timestamp: savedAt });
        }
      } catch (error) {
        console.warn(`[SW] Sync error for ${request.url}:`, error.message);
      }
    }
  } catch (error) {
    console.error('[SW] Sync queue error:', error);
  }
}

// ─────────────────────────────────────────────────────────
// 🌐 FETCH
// ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  
  try {
    const url = new URL(request.url);
    
    // Статические ресурсы
    if (isStaticResource(url.href) && !isApiRequest(url.href)) {
      event.respondWith(
        caches.match(request).then(async (cached) => {
          if (cached) {
            fetch(request).then(async (response) => {
              if (response.ok) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(request, response);
              }
            }).catch(() => {});
            return cached;
          }
          return fetch(request).then(async (response) => {
            if (response.ok) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(request, response.clone());
            }
            return response;
          }).catch(() => caches.match('/offline.html') || new Response('Offline', { status: 503 }));
        })
      );
      return;
    }
    
    // API-запросы
    if (isApiRequest(url.href)) {
      event.respondWith(
        (async () => {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              const clone = networkResponse.clone();
              const headers = new Headers(clone.headers);
              headers.set('x-cached-at', new Date().toUTCString());
              const responseWithHeaders = new Response(clone.body, {
                status: clone.status,
                statusText: clone.statusText,
                headers
              });
              const cache = await caches.open(DATA_CACHE_NAME);
              await cache.put(request, responseWithHeaders);
            }
            return networkResponse;
          } catch (error) {
            const cache = await caches.open(DATA_CACHE_NAME);
            const cached = await cache.match(request);
            if (cached) return cached;
            return new Response(JSON.stringify({ error: 'offline', message: 'Нет соединения' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 503
            });
          }
        })()
      );
      return;
    }
    
    // HTML-навигация
    if (request.mode === 'navigate') {
      event.respondWith(
        (async () => {
          const cached = await caches.match(request);
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          } catch {
            return cached || caches.match('/offline.html') || new Response('Offline', { status: 503 });
          }
        })()
      );
      return;
    }
  } catch (error) {
    console.warn('[SW] Fetch handler error:', error);
  }
  
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// ─────────────────────────────────────────────────────────
// 💬 MESSAGE HANDLER (ЕДИНЫЙ)
// ─────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  if (!type) return;

  switch (type) {
    case 'SAVE_OFFLINE_DATA':
      event.waitUntil(
        (async () => {
          try {
            const { url, method = 'POST', headers = {}, body } = payload || {};
            if (!url) throw new Error('URL required');
            
            const cache = await caches.open(OFFLINE_CACHE_NAME);
            const request = new Request(url, { method, headers: { 'Content-Type': 'application/json' } });
            const response = new Response(JSON.stringify({ method, headers, body }), {
              headers: { 'Content-Type': 'application/json', 'x-offline-saved-at': new Date().toUTCString() }
            });
            await cache.put(request, response);
            
            if (event.source) {
              event.source.postMessage({ type: 'OFFLINE_DATA_SAVED', url, success: true });
            }
            if ('sync' in self.registration) {
              await self.registration.sync.register('sync-reglai-queue');
            }
          } catch (error) {
            console.error('[SW] Failed to queue:', error);
            if (event.source) {
              event.source.postMessage({ type: 'OFFLINE_DATA_SAVED', url: payload?.url, success: false });
            }
          }
        })()
      );
      break;

    case 'SKIP_WAITING':
      event.waitUntil(
        (async () => {
          const hasUpdate = await checkAndUpdate();
          if (hasUpdate) {
            self.skipWaiting();
            notifyClients('UPDATE_APPLIED', { version: APP_VERSION });
          }
        })()
      );
      break;

    case 'GET_OFFLINE_DATA':
      event.waitUntil(
        (async () => {
          try {
            const cache = await caches.open(OFFLINE_CACHE_NAME);
            const keys = await cache.keys();
            const offlineData = [];
            for (const key of keys) {
              const response = await cache.match(key);
              if (response) {
                const data = await response.json();
                offlineData.push({ url: key.url, method: data.method, savedAt: response.headers.get('x-offline-saved-at') });
              }
            }
            if (event.source) {
              event.source.postMessage({ type: 'OFFLINE_DATA_RETRIEVED', offlineData, count: offlineData.length });
            }
          } catch (error) {
            event.source?.postMessage({ type: 'OFFLINE_DATA_RETRIEVED', offlineData: [] });
          }
        })()
      );
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        (async () => {
          const target = payload?.type || 'all';
          if (target === 'all' || target === 'static') await caches.delete(CACHE_NAME);
          if (target === 'all' || target === 'data') await caches.delete(DATA_CACHE_NAME);
          if (target === 'all' || target === 'offline') await caches.delete(OFFLINE_CACHE_NAME);
          event.source?.postMessage({ type: 'CACHE_CLEARED', target });
        })()
      );
      break;

    case 'RELOAD_PAGE':
      event.waitUntil(
        (async () => {
          const clients = await self.clients.matchAll({ type: 'window' });
          for (const client of clients) {
            if (client.url.startsWith(self.location.origin)) {
              await client.navigate(client.url).catch(() => {});
            }
          }
        })()
      );
      break;

    case 'HEALTH_CHECK':
      event.ports?.[0]?.postMessage({ status: 'ok', version: APP_VERSION, timestamp: Date.now() });
      break;

    default:
      console.warn(`[SW] Unknown message: ${type}`);
  }
});

// Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Реглай', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-48.png'
      })
    );
  } catch (error) {
    console.warn('[SW] Push error:', error);
  }
});