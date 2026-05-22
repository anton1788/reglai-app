// public/sw.js
// ✅ Service Worker для PWA приложения Reglai
// Версия: 9

const APP_VERSION = '6.0.0'; // ✅ Синхронизировано с index.html и manifest.json
const CACHE_NAME = `reglai-system-v${APP_VERSION}`;
const DATA_CACHE_NAME = `reglai-data-v${APP_VERSION}`;
const OFFLINE_CACHE_NAME = `reglai-offline-v${APP_VERSION}`;

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
  '/icon-512.png',
  '/static/js/main.js',
  '/static/css/main.css'
];

// ✅ Конфигурация кэширования
const CACHE_CONFIG = {
  MAX_DATA_CACHE_ENTRIES: 50,
  DATA_CACHE_TTL_MINUTES: 30,
  MAX_OFFLINE_CACHE_ENTRIES: 100,
  OFFLINE_REQUEST_MAX_AGE_HOURS: 24
};

// ─────────────────────────────────────────────────────────
// 🎯 Вспомогательные функции (ПЕРЕД install)
// ─────────────────────────────────────────────────────────

// ✅ НОВАЯ: Проверка домена Supabase (вместо жёсткого списка)
const isSupabaseUrl = (url) => {
  try {
    return new URL(url).hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

// ✅ ОБНОВЛЁННАЯ: Проверка API-запросов (динамическая)
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
// 📦 INSTALL: Предзагрузка критических ресурсов
// ─────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v' + APP_VERSION);
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(async (cache) => {
        console.log('[SW] Caching app shell...');
        // Кэшируем с обработкой ошибок для каждого ресурса
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
// 🔄 ACTIVATE: Очистка старых кэшей
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
// 🔄 BACKGROUND SYNC: Синхронизация офлайн-очереди
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
        
        // ✅ Безопасное получение даты
        const savedAt = savedAtHeader ? new Date(savedAtHeader).getTime() : now;
        
        // Удаляем слишком старые запросы
        if (now - savedAt > maxAge) {
          await cache.delete(request);
          console.log(`[SW] Deleted expired request: ${request.url}`);
          continue;
        }
        
        // Повторная отправка
        const fetchResponse = await fetch(request.url, {
          method: data.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...data.headers
          },
          body: JSON.stringify(data.body),
          mode: 'cors',
          credentials: 'include'
        });
        
        if (fetchResponse.ok) {
          await cache.delete(request);
          notifyClients('SYNC_SUCCESS', { url: request.url, timestamp: savedAt });
          console.log(`[SW] Synced: ${request.url}`);
        } else {
          console.warn(`[SW] Sync failed HTTP ${fetchResponse.status}: ${request.url}`);
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
// 🧹 Очистка кэша данных (по количеству и времени)
// ─────────────────────────────────────────────────────────
const pruneDataCache = async (cache) => {
  try {
    const keys = await cache.keys();
    const now = Date.now();
    const ttlMs = CACHE_CONFIG.DATA_CACHE_TTL_MINUTES * 60 * 1000;
    
    // Удаляем просроченные
    for (const key of keys) {
      const response = await cache.match(key);
      if (!response) continue;
      
      const cachedTime = response.headers.get('x-cached-at') || response.headers.get('date');
      if (cachedTime) {
        const timestamp = new Date(cachedTime).getTime();
        if (now - timestamp > ttlMs) {
          await cache.delete(key);
          console.log(`[SW] Pruned expired: ${key.url}`);
        }
      }
    }
    
    // Удаляем лишние по количеству (самые старые)
    const remaining = await cache.keys();
    if (remaining.length > CACHE_CONFIG.MAX_DATA_CACHE_ENTRIES) {
      const toDelete = remaining.slice(0, remaining.length - CACHE_CONFIG.MAX_DATA_CACHE_ENTRIES);
      await Promise.all(toDelete.map(key => cache.delete(key)));
      console.log(`[SW] Pruned ${toDelete.length} old entries (limit: ${CACHE_CONFIG.MAX_DATA_CACHE_ENTRIES})`);
    }
  } catch (error) {
    console.warn('[SW] Prune data cache error:', error);
  }
};

const pruneOfflineCache = async (cache) => {
  try {
    const keys = await cache.keys();
    if (keys.length > CACHE_CONFIG.MAX_OFFLINE_CACHE_ENTRIES) {
      const toDelete = keys.slice(0, keys.length - CACHE_CONFIG.MAX_OFFLINE_CACHE_ENTRIES);
      await Promise.all(toDelete.map(key => cache.delete(key)));
      console.log(`[SW] Pruned ${toDelete.length} offline entries`);
    }
  } catch (error) {
    console.warn('[SW] Prune offline cache error:', error);
  }
};

// ─────────────────────────────────────────────────────────
// 🌐 FETCH: Умная стратегия кэширования
// ─────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Игнорируем не-GET запросы для статики и некорректные URL
  if (request.method !== 'GET') return;
  
  try {
    const url = new URL(request.url);
    
    // 🔹 Статические ресурсы: Cache First + Background Update
    if (isStaticResource(url.href) && !isApiRequest(url.href)) {
      event.respondWith(
        caches.match(request).then(async (cached) => {
          if (cached) {
            // Обновляем в фоне
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
    
    // 🔹 API-запросы: Network First + Cache Fallback
    if (isApiRequest(url.href)) {
      event.respondWith(
        (async () => {
          try {
            const networkResponse = await fetch(request);
            
            if (networkResponse.ok) {
              // Кэшируем успешные ответы с метаданными
              const clone = networkResponse.clone();
              const headers = new Headers(clone.headers);
              headers.set('x-cached-at', new Date().toUTCString());
              headers.set('Cache-Control', 'public, max-age=300'); // 5 минут
              
              const responseWithHeaders = new Response(clone.body, {
                status: clone.status,
                statusText: clone.statusText,
                headers
              });
              
              const cache = await caches.open(DATA_CACHE_NAME);
              await cache.put(request, responseWithHeaders);
              await pruneDataCache(cache);
            }
            return networkResponse;
          } catch (error) {
            console.warn(`[SW] Network failed for ${request.url}:`, error.message);
            // Fallback на кэш при офлайне
            const cache = await caches.open(DATA_CACHE_NAME);
            const cached = await cache.match(request);
            
            if (cached) {
              console.log(`[SW] Offline: serving cached API: ${request.url}`);
              return cached;
            }
            
            // Возвращаем понятную ошибку офлайна
            return new Response(JSON.stringify({ 
              error: 'offline', 
              message: 'Нет соединения. Данные будут отправлены при восстановлении связи.'
            }), {
              headers: { 'Content-Type': 'application/json' },
              status: 503,
              statusText: 'Service Unavailable'
            });
          }
        })()
      );
      return;
    }
    
    // 🔹 HTML-навигация: Stale-While-Revalidate
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
  
  // 🔹 Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ─────────────────────────────────────────────────────────
// 💬 MESSAGE HANDLER: Управление из приложения
// ─────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  if (!type) return;

  switch (type) {
    
    // 📤 Сохранение запроса в офлайн-очередь
    case 'SAVE_OFFLINE_DATA':
      event.waitUntil(
        (async () => {
          try {
            const { url, method = 'POST', headers = {}, body } = payload || {};
            if (!url) throw new Error('URL required');
            
            const cache = await caches.open(OFFLINE_CACHE_NAME);
            await pruneOfflineCache(cache);
            
            const request = new Request(url, { method, headers: { 'Content-Type': 'application/json' } });
            const response = new Response(JSON.stringify({ method, headers, body }), {
              headers: { 
                'Content-Type': 'application/json',
                'x-offline-saved-at': new Date().toUTCString()
              }
            });
            
            await cache.put(request, response);
            console.log(`[SW] Queued offline: ${url}`);
            
            if (event.source) {
              event.source.postMessage({
                type: 'OFFLINE_DATA_SAVED',
                url,
                success: true,
                timestamp: Date.now()
              });
            }
            
            // Запрашиваем фоновую синхронизацию
            if ('sync' in self.registration) {
              await self.registration.sync.register('sync-reglai-queue');
            }
          } catch (error) {
            console.error('[SW] Failed to queue offline data:', error);
            if (event.source) {
              event.source.postMessage({
                type: 'OFFLINE_DATA_SAVED',
                url: payload?.url,
                success: false,
                error: error.message
              });
            }
          }
        })()
      );
      break;

    // 🔄 Пропустить ожидание (для обновления SW)
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    // 📥 Получение офлайн-очереди
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
                offlineData.push({
                  url: key.url,
                  method: data.method,
                  body: data.body,
                  savedAt: response.headers.get('x-offline-saved-at'),
                  attempts: data.attempts || 0
                });
              }
            }
            
            if (event.source) {
              event.source.postMessage({
                type: 'OFFLINE_DATA_RETRIEVED',
                offlineData: offlineData.sort((a, b) => 
                  new Date(a.savedAt || 0) - new Date(b.savedAt || 0)
                ),
                count: offlineData.length
              });
            }
          } catch (error) {
            console.error('[SW] Failed to retrieve offline data:', error);
            if (event.source) {
              event.source.postMessage({
                type: 'OFFLINE_DATA_RETRIEVED',
                offlineData: [],
                error: error.message
              });
            }
          }
        })()
      );
      break;

    // 🗑️ Очистка кэша
    case 'CLEAR_CACHE':
      event.waitUntil(
        (async () => {
          const target = payload?.type || 'all';
          console.log(`[SW] Clearing cache: ${target}`);
          
          if (target === 'all' || target === 'static') {
            await caches.delete(CACHE_NAME);
            await caches.open(CACHE_NAME); // Пересоздаём
          }
          if (target === 'all' || target === 'data') {
            await caches.delete(DATA_CACHE_NAME);
            await caches.open(DATA_CACHE_NAME);
          }
          if (target === 'all' || target === 'offline') {
            await caches.delete(OFFLINE_CACHE_NAME);
            await caches.open(OFFLINE_CACHE_NAME);
          }
          
          if (event.source) {
            event.source.postMessage({ type: 'CACHE_CLEARED', target });
          }
        })()
      );
      break;

    // 🔄 Перезагрузка всех вкладок приложения
    case 'RELOAD_PAGE':
      event.waitUntil(
        (async () => {
          const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          const origin = self.location.origin;
          
          for (const client of clients) {
            // Перезагружаем только вкладки нашего приложения
            if (client.url.startsWith(origin)) {
              await client.navigate(client.url).catch(err => {
                console.warn(`[SW] Failed to reload ${client.url}:`, err);
              });
            }
          }
          console.log(`[SW] Reloaded ${clients.length} client(s)`);
        })()
      );
      break;

    // 📡 Health check от приложения
    case 'HEALTH_CHECK':
      event.ports?.[0]?.postMessage({
        status: 'ok',
        version: APP_VERSION,
        caches: [CACHE_NAME, DATA_CACHE_NAME, OFFLINE_CACHE_NAME],
        timestamp: Date.now()
      });
      break;

    default:
      console.warn(`[SW] Unknown message type: ${type}`);
  }
});

// ─────────────────────────────────────────────────────────
// 🔔 Push Notifications (опционально)
// ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const { title, body, icon, tag, url, actions = [] } = data;
    
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body || '',
        icon: icon || '/icon-192.png',
        badge: '/icon-48.png',
        tag: tag || 'reglai-default',
        renotify: true,
        data: { url },
        actions: actions.map(a => ({ 
          action: a.action || 'open', 
          title: a.title || 'Открыть' 
        }))
      })
    );
  } catch (error) {
    console.warn('[SW] Push parse error:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  
  if (event.action === 'dismiss') return;
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Фокусируем существующую вкладку или открываем новую
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ✅ Глобальный обработчик ошибок для отладки
self.addEventListener('error', (event) => {
  console.error('[SW] Unhandled error:', event.message, event.filename, event.lineno);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});