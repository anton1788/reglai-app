// src/utils/offlineStorage.js
// ✅ Офлайн-хранилище черновиков и очередь запросов на основе IndexedDB
// Версия: 2.5.5

// ============================================================================
// ⚙️ КОНСТАНТЫ И НАСТРОЙКИ
// ============================================================================
const DB_NAME = 'ReglaiDB';
const STORE_NAME = 'offlineDrafts';
const QUEUE_STORE_NAME = 'offlineQueue';
const DB_VERSION = 2;

const DB_CONFIG = {
  DRAFT_TTL_MS: 7 * 24 * 60 * 60 * 1000,    // 7 дней хранения черновиков
  QUEUE_TTL_MS: 24 * 60 * 60 * 1000,        // 24 часа для очереди запросов
  MAX_QUEUE_SIZE: 100,
  AUTO_SYNC_INTERVAL_MS: 5 * 60 * 1000      // Авто-синхронизация каждые 5 минут
};

// ============================================================================
// 🗄️ УПРАВЛЕНИЕ БАЗОЙ ДАННЫХ
// ============================================================================
let dbInstance = null;

/**
 * Открытие/получение экземпляра IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
export const openDB = () => {
  if (dbInstance) return Promise.resolve(dbInstance);
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('[IndexedDB] Open error:', request.error);
      reject(request.error);
    };
    
    request.onsuccess = () => {
      dbInstance = request.result;
      
      window.addEventListener('beforeunload', () => {
        if (dbInstance) dbInstance.close();
      });
      
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      
      // Хранилище черновиков (версия 1+)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const draftStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        draftStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        draftStore.createIndex('type', 'type', { unique: false });
        console.log('[IndexedDB] Created store:', STORE_NAME);
      }
      
      // Хранилище очереди (версия 2+)
      if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        const queueStore = db.createObjectStore(QUEUE_STORE_NAME, { 
          keyPath: 'id',
          autoIncrement: true 
        });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('url', 'url', { unique: false });
        console.log('[IndexedDB] Created store:', QUEUE_STORE_NAME);
      }
      
      // Миграция данных
      if (oldVersion < 2) {
        console.log('[IndexedDB] Migrating to version 2...');
      }
    };
  });
};

export const closeDB = () => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('[IndexedDB] Connection closed');
  }
};

// ============================================================================
// ✏️ УПРАВЛЕНИЕ ЧЕРНОВИКАМИ
// ============================================================================

/**
 * Сохранение черновика с авто-обновлением и дедупликацией
 * @param {Object} draft - Данные черновика
 * @returns {Promise<string|null>} ID сохранённого черновика или null
 */
export const saveDraftToDB = async (draft) => {
  try {
    const db = await openDB();
    const draftWithMeta = {
      ...draft,
      id: draft.id || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      updatedAt: new Date().toISOString(),
      createdAt: draft.createdAt || new Date().toISOString(),
      version: draft.version || 1
    };
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const checkRequest = store.get(draftWithMeta.id);
      checkRequest.onsuccess = () => {
        const existing = checkRequest.result;
        
        // Пропускаем сохранение, если данные не изменились
        if (existing?.data && draftWithMeta.data &&
            JSON.stringify(existing.data) === JSON.stringify(draftWithMeta.data)) {
          console.log('[IndexedDB] Draft unchanged, skipping save:', draftWithMeta.id);
          resolve(draftWithMeta.id);
          return;
        }
        
        if (existing) {
          draftWithMeta.version = (existing.version || 0) + 1;
        }
        
        const saveRequest = store.put(draftWithMeta);
        saveRequest.onsuccess = () => {
          console.log('[IndexedDB] Draft saved:', draftWithMeta.id, `v${draftWithMeta.version}`);
          resolve(draftWithMeta.id);
        };
        saveRequest.onerror = () => reject(saveRequest.error);
      };
      checkRequest.onerror = () => reject(checkRequest.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Save draft error:', error);
    return null;
  }
};

/**
 * Загрузка черновиков с фильтрацией и очисткой просроченных
 * @param {Object} options - Опции: type, cleanExpired
 * @returns {Promise<Array>} Массив черновиков
 */
export const loadDraftsFromDB = async (options = {}) => {
  try {
    const db = await openDB();
    const { type, cleanExpired = true } = options;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = type ? store.index('type').getAll(type) : store.getAll();
      
      request.onsuccess = async () => {
        let drafts = request.result || [];
        
        if (cleanExpired) {
          const now = Date.now();
          const validDrafts = drafts.filter(draft => {
            const draftTime = new Date(draft.updatedAt || draft.createdAt).getTime();
            return (now - draftTime) < DB_CONFIG.DRAFT_TTL_MS;
          });
          
          const expiredCount = drafts.length - validDrafts.length;
          if (expiredCount > 0) {
            console.log(`[IndexedDB] Cleaning ${expiredCount} expired drafts`);
            await _deleteExpiredDrafts(drafts, validDrafts);
          }
          drafts = validDrafts;
        }
        
        drafts.sort((a, b) => 
          new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
        );
        
        resolve(drafts);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Load drafts error:', error);
    return [];
  }
};

const _deleteExpiredDrafts = async (allDrafts, validDrafts) => {
  try {
    const db = await openDB();
    const expiredIds = allDrafts
      .filter(d => !validDrafts.find(v => v.id === d.id))
      .map(d => d.id);
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    expiredIds.forEach(id => store.delete(id));
    
    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  } catch (error) {
    console.warn('[IndexedDB] Error deleting expired drafts:', error);
  }
};

export const getDraftFromDB = async (id) => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Get draft error:', error);
    return null;
  }
};

export const deleteDraftFromDB = async (id) => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('[IndexedDB] Draft deleted:', id);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[IndexedDB] Delete draft error:', error);
    return false;
  }
};

export const clearAllDraftsFromDB = async (type = null) => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      if (type) {
        const index = store.index('type');
        const request = index.getAllKeys(type);
        
        request.onsuccess = () => {
          const keys = request.result || [];
          keys.forEach(key => store.delete(key));
          console.log(`[IndexedDB] Cleared ${keys.length} drafts of type:`, type);
          resolve(true);
        };
        request.onerror = () => reject(request.error);
      } else {
        const request = store.clear();
        request.onsuccess = () => {
          console.log('[IndexedDB] All drafts cleared');
          resolve(true);
        };
        request.onerror = () => reject(request.error);
      }
    });
  } catch (error) {
    console.error('[IndexedDB] Clear drafts error:', error);
    return false;
  }
};

export const countDraftsInDB = async (type = null) => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      if (type) {
        const index = store.index('type');
        const request = index.count(type);
        request.onsuccess = () => resolve(request.result || 0);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.count();
        request.onsuccess = () => resolve(request.result || 0);
        request.onerror = () => reject(request.error);
      }
    });
  } catch (error) {
    console.error('[IndexedDB] Count drafts error:', error);
    return 0;
  }
};

// ============================================================================
// 📤 ОЧЕРЕДЬ ОФФЛАЙН-ЗАПРОСОВ
// ============================================================================

/**
 * Добавление запроса в очередь оффлайн-отправки
 * @param {Object} requestData - { url, method, headers, body, meta }
 * @returns {Promise<Object>} Результат: { success, queued, via, id? }
 */
export const enqueueOfflineRequest = async (requestData) => {
  try {
    const queueItem = {
      url: requestData.url,
      method: requestData.method || 'POST',
      headers: requestData.headers || {},
      body: requestData.body,
      meta: requestData.meta || {},
      status: 'pending',
      attempts: 0,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    // Приоритет: Service Worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const swResult = await _sendToServiceWorker('QUEUE_REQUEST', queueItem);
      if (swResult?.success) {
        console.log('[OfflineQueue] Queued via Service Worker:', queueItem.url);
        return { success: true, queued: true, via: 'service-worker', id: swResult.id };
      }
    }
    
    // Fallback: IndexedDB
    const db = await openDB();
    const id = await _addToQueueStore(db, queueItem);
    
    console.log('[OfflineQueue] Queued via IndexedDB:', queueItem.url);
    return { success: true, queued: true, via: 'indexeddb', id };
    
  } catch (error) {
    console.error('[OfflineQueue] Enqueue error:', error);
    return { success: false, error: error.message };
  }
};

const _sendToServiceWorker = (type, payload) => {
  return new Promise((resolve) => {
    if (!navigator.serviceWorker.controller) {
      resolve({ success: false, error: 'no_controller' });
      return;
    }
    
    const messageChannel = new MessageChannel();
    const timeout = setTimeout(() => {
      messageChannel.port1.onmessage = null;
      resolve({ success: false, timeout: true });
    }, 3000);
    
    messageChannel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      resolve(event.data);
    };
    
    try {
      navigator.serviceWorker.controller.postMessage(
        { type, payload },
        [messageChannel.port2]
      );
    } catch (err) {
      clearTimeout(timeout);
      resolve({ success: false, error: err.message });
    }
  });
};

const _addToQueueStore = async (db, item) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(QUEUE_STORE_NAME);
    
    _pruneQueueIfNeeded(store).then(() => {
      const request = store.add(item);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
};

const _pruneQueueIfNeeded = async (store) => {
  return new Promise((resolve) => {
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      if (countRequest.result <= DB_CONFIG.MAX_QUEUE_SIZE) {
        resolve();
        return;
      }
      
      const index = store.index('timestamp');
      const getRequest = index.getAllKeys();
      
      getRequest.onsuccess = () => {
        const keys = getRequest.result || [];
        const toDelete = keys.slice(0, keys.length - DB_CONFIG.MAX_QUEUE_SIZE);
        
        toDelete.forEach(key => store.delete(key));
        console.log(`[OfflineQueue] Pruned ${toDelete.length} old items`);
        resolve();
      };
      getRequest.onerror = () => resolve();
    };
    countRequest.onerror = () => resolve();
  });
};

/**
 * Получение элементов очереди с фильтрацией
 * @param {Object} options - { limit, status }
 * @returns {Promise<Array>}
 */
export const getOfflineQueue = async (options = {}) => {
  try {
    const db = await openDB();
    const { limit = DB_CONFIG.MAX_QUEUE_SIZE, status = 'pending' } = options;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE_NAME);
      
      let request;
      if (status && store.indexNames.contains('status')) {
        request = store.index('status').getAll(status, limit);
      } else {
        request = store.getAll(null, limit);
      }
      
      request.onsuccess = () => {
        const now = Date.now();
        const validItems = (request.result || []).filter(item => 
          (now - item.timestamp) < DB_CONFIG.QUEUE_TTL_MS
        );
        resolve(validItems);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineQueue] Get queue error:', error);
    return [];
  }
};

export const updateQueueItem = async (id, updates) => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE_NAME);
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (!item) {
          reject(new Error('Queue item not found'));
          return;
        }
        
        const updatedItem = {
          ...item,
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        const putRequest = store.put(updatedItem);
        putRequest.onsuccess = () => resolve(true);
        putRequest.onerror = () => reject(putRequest.error);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('[OfflineQueue] Update item error:', error);
    return false;
  }
};

export const removeQueueItem = async (id) => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineQueue] Remove item error:', error);
    return false;
  }
};

export const clearOfflineQueue = async (status = null) => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE_NAME);
      
      if (status) {
        const index = store.index('status');
        const request = index.getAllKeys(status);
        
        request.onsuccess = () => {
          const keys = request.result || [];
          keys.forEach(key => store.delete(key));
          console.log(`[OfflineQueue] Cleared ${keys.length} items with status:`, status);
          resolve(keys.length);
        };
        request.onerror = () => reject(request.error);
      } else {
        const request = store.clear();
        request.onsuccess = () => {
          console.log('[OfflineQueue] Queue fully cleared');
          resolve(true);
        };
        request.onerror = () => reject(request.error);
      }
    });
  } catch (error) {
    console.error('[OfflineQueue] Clear error:', error);
    return 0;
  }
};

// ============================================================================
// 🔄 СИНХРОНИЗАЦИЯ
// ============================================================================

/**
 * Запрос фоновой синхронизации через Background Sync API
 * @returns {Promise<boolean>}
 */
export const requestBackgroundSync = async () => {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('[Sync] Background Sync API not supported');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-reglai-queue');
    console.log('[Sync] Background sync registered');
    return true;
  } catch (error) {
    console.warn('[Sync] Background sync registration failed:', error);
    return false;
  }
};

/**
 * Ручной запуск синхронизации через Service Worker
 * @returns {Promise<Object>}
 */
export const triggerManualSync = async () => {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    console.warn('[Sync] Service Worker not available');
    return { success: false, error: 'sw_unavailable' };
  }
  
  return _sendToServiceWorker('REQUEST_SYNC', {});
};

/**
 * Настройка слушателя событий синхронизации от Service Worker
 * @param {Function} onSuccess - Callback при успехе
 * @param {Function} onError - Callback при ошибке
 * @param {Function} onProgress - Callback для прогресса
 * @returns {Function} Функция отписки
 */
export const setupSyncListener = (onSuccess, onError, onProgress) => {
  if (!('serviceWorker' in navigator)) {
    return () => {};
  }
  
  const messageHandler = (event) => {
    const { type, payload } = event.data || {};
    
    switch (type) {
      case 'SYNC_COMPLETE':
      case 'SYNC_SUCCESS':
        console.log('[Sync] Item synced:', payload?.id || payload?.url);
        onSuccess?.(payload);
        break;
      case 'OFFLINE_REQUEST_SUCCESS':
        console.log('[Sync] Offline request synced:', payload?.id);
        onSuccess?.(payload);
        break;
      case 'SYNC_ERROR':
      case 'OFFLINE_REQUEST_FAILED':
        console.warn('[Sync] Sync error:', payload?.error);
        onError?.(payload?.error);
        break;
      case 'SYNC_PROGRESS':
        onProgress?.(payload);
        break;
      case 'QUEUE_UPDATED':
        console.log('[Sync] Queue updated');
        break;
    }
  };
  
  navigator.serviceWorker.addEventListener('message', messageHandler);
  
  return () => {
    navigator.serviceWorker.removeEventListener('message', messageHandler);
  };
};

/**
 * Авто-синхронизация при восстановлении соединения
 * @returns {Function} Функция отписки
 */
export const setupAutoSync = () => {
  if (typeof window === 'undefined') return () => {};
  
  const handleOnline = async () => {
    console.log('[Sync] Network restored, triggering sync...');
    const pendingItems = await getOfflineQueue({ status: 'pending' });
    if (pendingItems.length > 0) {
      console.log(`[Sync] Found ${pendingItems.length} pending items`);
      await triggerManualSync();
    }
  };
  
  window.addEventListener('online', handleOnline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
  };
};

// ============================================================================
// 📊 УТИЛИТЫ И МОНИТОРИНГ
// ============================================================================

export const getStorageStats = async () => {
  try {
    await openDB();
    
    const [draftCount, queueCount, queuePending] = await Promise.all([
      countDraftsInDB(),
      countQueueItems(),
      countQueueItems('pending')
    ]);
    
    const quota = await navigator.storage?.estimate?.();
    
    return {
      drafts: {
        count: draftCount,
        ttlDays: DB_CONFIG.DRAFT_TTL_MS / (24 * 60 * 60 * 1000)
      },
      queue: {
        total: queueCount,
        pending: queuePending,
        maxSize: DB_CONFIG.MAX_QUEUE_SIZE,
        ttlHours: DB_CONFIG.QUEUE_TTL_MS / (60 * 60 * 1000)
      },
      storage: quota ? {
        usage: (quota.usage / 1024 / 1024).toFixed(2) + ' MB',
        quota: (quota.quota / 1024 / 1024).toFixed(2) + ' MB',
        usagePercent: ((quota.usage / quota.quota) * 100).toFixed(1) + '%'
      } : null,
      supported: {
        indexedDB: !!window.indexedDB,
        serviceWorker: !!navigator.serviceWorker,
        backgroundSync: 'SyncManager' in window,
        persistentStorage: !!navigator.storage?.persist
      }
    };
  } catch (error) {
    console.error('[StorageStats] Error:', error);
    return null;
  }
};

const countQueueItems = async (status = null) => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE_NAME], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE_NAME);
      
      if (status && store.indexNames.contains('status')) {
        const request = store.index('status').count(status);
        request.onsuccess = () => resolve(request.result || 0);
        request.onerror = () => reject(request.error);
      } else {
        const request = store.count();
        request.onsuccess = () => resolve(request.result || 0);
        request.onerror = () => reject(request.error);
      }
    });
  } catch (_error) {
    console.warn('[OfflineQueue] Count error:', _error?.message || _error);
    return 0;
  }
};

export const checkOfflineSupport = () => ({
  indexedDB: !!window.indexedDB,
  serviceWorker: 'serviceWorker' in navigator,
  backgroundSync: 'SyncManager' in window,
  cacheAPI: 'caches' in window,
  online: navigator.onLine,
  storageEstimate: !!navigator.storage?.estimate,
  persistentStorage: !!navigator.storage?.persist
});

/**
 * Инициализация оффлайн-модуля
 * @param {Object} options - { enableAutoSync, onSyncSuccess, onSyncError, onQueueUpdate }
 * @returns {Promise<Object>}
 */
export const initOfflineModule = async (options = {}) => {
  const {
    enableAutoSync = true,
    onSyncSuccess = null,
    onSyncError = null,
    onQueueUpdate = null
  } = options;
  
  const support = checkOfflineSupport();
  console.log('[OfflineModule] Support check:', support);
  
  if (!support.indexedDB) {
    console.warn('[OfflineModule] IndexedDB not supported, offline features disabled');
    return { initialized: false, reason: 'no_indexeddb' };
  }
  
  try {
    await openDB();
    console.log('[OfflineModule] Database initialized');
    
    let unsubscribeSync = null;
    if (support.serviceWorker) {
      unsubscribeSync = setupSyncListener(onSyncSuccess, onSyncError, onQueueUpdate);
    }
    
    let unsubscribeOnline = null;
    if (enableAutoSync) {
      unsubscribeOnline = setupAutoSync();
    }
    
    if (support.persistentStorage) {
      navigator.storage.persist?.().then((persisted) => {
        console.log('[OfflineModule] Persistent storage:', persisted ? 'granted' : 'denied');
      });
    }
    
    return {
      initialized: true,
      support,
      cleanup: () => {
        unsubscribeSync?.();
        unsubscribeOnline?.();
        closeDB();
      }
    };
    
  } catch (error) {
    console.error('[OfflineModule] Initialization failed:', error);
    return { initialized: false, error: error.message };
  }
};

// ============================================================================
// 📦 DEFAULT EXPORT
// ============================================================================
export default {
  // DB
  openDB,
  closeDB,
  
  // Drafts
  saveDraftToDB,
  loadDraftsFromDB,
  getDraftFromDB,
  deleteDraftFromDB,
  clearAllDraftsFromDB,
  countDraftsInDB,
  
  // Queue
  enqueueOfflineRequest,
  getOfflineQueue,
  updateQueueItem,
  removeQueueItem,
  clearOfflineQueue,
  
  // Sync
  requestBackgroundSync,
  triggerManualSync,
  setupSyncListener,
  setupAutoSync,
  
  // Utils
  getStorageStats,
  checkOfflineSupport,
  initOfflineModule,
  
  // Config (read-only)
  CONFIG: { ...DB_CONFIG }
};