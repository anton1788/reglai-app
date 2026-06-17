// src/config.js
// ✅ Единая точка управления версией приложения

export const APP_VERSION = '1.1.9-beta';

export const APP_CONFIG = {
  version: APP_VERSION,
  name: 'Реглай',
  fullName: 'Реглай — система управления заявками на материалы',
  description: 'Профессиональная система управления заявками на материалы для вентиляции и кондиционирования.',
  api: {
    // ✅ ИСПРАВЛЕНО: используем переменные окружения
    baseUrl: `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
    realtimeUrl: `${import.meta.env.VITE_SUPABASE_URL?.replace('https', 'wss')}/realtime/v1`
  },
  pwa: {
    swVersion: APP_VERSION,
    cachePrefix: 'reglai',
    offlineSupport: true,
    backgroundSync: true,
    autoUpdate: false
  },
  // 🔹 Конфигурация офлайн-режима
  offline: {
    enabled: true,
    syncInterval: 5 * 60 * 1000, // 5 минут
    maxQueueSize: 100,
    draftTTL: 7 * 24 * 60 * 60 * 1000, // 7 дней
    cacheTTL: 30 * 24 * 60 * 60 * 1000 // 30 дней
  },
  // 🔹 Конфигурация обновлений
  update: {
    checkInterval: 6 * 60 * 60 * 1000, // 6 часов
    remindLaterDays: 3,
    autoInstall: false,
    promptCooldown: 24 * 60 * 60 * 1000 // 24 часа
  },
  // 🔹 Тема оформления
  theme: {
    defaultTheme: 'system',
    colors: {
      primary: '#4A6572',
      secondary: '#F9AA33',
      dark: '#1e293b',
      light: '#f9fafb'
    }
  }
};

// ✅ Хелпер для сравнения версий (семантическое версионирование)
export const compareVersions = (v1, v2) => {
  const a = v1.split('.').map(Number);
  const b = v2.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
};

// ✅ Проверка, есть ли обновление
export const isUpdateAvailable = (current, latest) => {
  return compareVersions(latest, current) > 0;
};

// ✅ Форматирование версии для отображения
export const formatVersion = (version = APP_VERSION) => {
  return `v${version}`;
};

// ✅ Проверка, является ли версия стабильной
export const isStableVersion = (version = APP_VERSION) => {
  return !version.includes('beta') && !version.includes('alpha') && !version.includes('rc');
};

// ✅ Получение информации о релизе
export const getReleaseInfo = () => {
  return {
    version: APP_VERSION,
    date: '2026-06-17',
    stable: isStableVersion(APP_VERSION),
    changelog: [
      '✅ Полноценный офлайн-режим',
      '✅ Кэширование сессии для офлайн-входа',
      '✅ Синхронизация данных при восстановлении интернета',
      '✅ Автосохранение черновиков комментариев',
      '✅ Улучшенная мобильная навигация'
    ]
  };
};

// ✅ Создание имени кэша для Service Worker
export const getCacheName = (suffix = 'system') => {
  return `reglai-${suffix}-${APP_VERSION}`;
};