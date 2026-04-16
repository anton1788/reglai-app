// src/utils/cacheManager.js

const CACHE_TTL = {
  applications: 5 * 60 * 1000,  // 5 минут
  analytics: 15 * 60 * 1000,    // 15 минут
  users: 60 * 60 * 1000,        // 1 час
  settings: 30 * 60 * 1000,     // 30 минут
  templates: 10 * 60 * 1000,    // 10 минут
  comments: 2 * 60 * 1000       // 2 минуты
};

const CACHE_PREFIX = 'reglai_cache_';

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.init();
  }

  // Инициализация: загружаем из localStorage при старте
  init() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          const item = JSON.parse(localStorage.getItem(key));
          if (item && item.expiry > Date.now()) {
            this.memoryCache.set(key, item);
          } else {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (e) {
      console.warn('[Cache] Init error:', e);
    }
  }

  // Получить ключ кэша
  getCacheKey(entityType, identifier) {
    return `${CACHE_PREFIX}${entityType}_${identifier}`;
  }

  // Сохранить данные в кэш
  set(entityType, identifier, data, customTTL = null) {
    const key = this.getCacheKey(entityType, identifier);
    const ttl = customTTL || CACHE_TTL[entityType] || 5 * 60 * 1000;
    const cacheItem = {
      data: data,
      expiry: Date.now() + ttl,
      createdAt: new Date().toISOString(),
      entityType,
      identifier
    };
    
    try {
      this.memoryCache.set(key, cacheItem);
      localStorage.setItem(key, JSON.stringify(cacheItem));
      return true;
    } catch (e) {
      console.warn('[Cache] Set error:', e);
      return false;
    }
  }

  // Получить данные из кэша
  get(entityType, identifier) {
    const key = this.getCacheKey(entityType, identifier);
    const cached = this.memoryCache.get(key);
    
    if (!cached) {
      return null;
    }
    
    if (cached.expiry < Date.now()) {
      this.delete(entityType, identifier);
      return null;
    }
    
    return cached.data;
  }

  // Проверить наличие в кэше
  has(entityType, identifier) {
    const key = this.getCacheKey(entityType, identifier);
    const cached = this.memoryCache.get(key);
    return cached && cached.expiry > Date.now();
  }

  // Удалить конкретный кэш
  delete(entityType, identifier) {
    const key = this.getCacheKey(entityType, identifier);
    this.memoryCache.delete(key);
    localStorage.removeItem(key);
  }

  // Очистить все кэши
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      this.memoryCache.clear();
      console.log('[Cache] All caches cleared');
    } catch (e) {
      console.warn('[Cache] Clear error:', e);
    }
  }

  // Очистить просроченные кэши
  clearExpired() {
    try {
      const keys = Object.keys(localStorage);
      let cleared = 0;
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          const item = JSON.parse(localStorage.getItem(key));
          if (item && item.expiry < Date.now()) {
            localStorage.removeItem(key);
            this.memoryCache.delete(key);
            cleared++;
          }
        }
      });
      if (cleared > 0) {
        console.log(`[Cache] Cleared ${cleared} expired items`);
      }
    } catch (e) {
      console.warn('[Cache] Clear expired error:', e);
    }
  }

  // Получить информацию о кэше
  getInfo() {
    const info = {};
    for (const [key, value] of this.memoryCache.entries()) {
      const entityType = key.split('_')[2];
      if (!info[entityType]) {
        info[entityType] = { count: 0, items: [] };
      }
      info[entityType].count++;
      info[entityType].items.push({
        identifier: value.identifier,
        expiresIn: Math.round((value.expiry - Date.now()) / 1000),
        expiresAt: new Date(value.expiry).toLocaleString()
      });
    }
    return info;
  }

  // Обновить TTL для существующего кэша
  touch(entityType, identifier) {
    const key = this.getCacheKey(entityType, identifier);
    const cached = this.memoryCache.get(key);
    if (cached) {
      const ttl = CACHE_TTL[entityType] || 5 * 60 * 1000;
      cached.expiry = Date.now() + ttl;
      this.memoryCache.set(key, cached);
      localStorage.setItem(key, JSON.stringify(cached));
      return true;
    }
    return false;
  }
}

// Singleton
const cacheManager = new CacheManager();

// Автоматическая очистка просроченных кэшей каждые 5 минут
setInterval(() => {
  cacheManager.clearExpired();
}, 5 * 60 * 1000);

// Экспорт
export default cacheManager;
export { CACHE_TTL };