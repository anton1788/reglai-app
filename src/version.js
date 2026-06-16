// src/version.js
// ⚠️ ВАЖНО: Версия должна быть фиксированной для production

export const VERSION = '1.1.11-beta';
export const ASSET_SUFFIX = `v${VERSION}`;
export const CACHE_NAME = `reglai-system-${VERSION}`;

// 🔹 Дополнительные конфигурации для офлайн-режима
export const OFFLINE_CACHE_NAME = `reglai-offline-${VERSION}`;

// 🔹 Список критических ресурсов для кэширования
export const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/offline.html'
];

// 🔹 Конфигурация обновлений
export const UPDATE_CONFIG = {
  checkInterval: 6 * 60 * 60 * 1000, // 6 часов
  remindLaterDays: 3,
  autoInstall: false,
  promptCooldown: 24 * 60 * 60 * 1000 // 24 часа
};

// 🔹 Конфигурация офлайн-режима
export const OFFLINE_CONFIG = {
  enabled: true,
  syncInterval: 5 * 60 * 1000, // 5 минут
  maxQueueSize: 100,
  draftTTL: 7 * 24 * 60 * 60 * 1000 // 7 дней
};

// 🔹 Информация о релизе
export const RELEASE_INFO = {
  version: VERSION,
  date: '2026-06-16',
  changes: [
    '✅ Полноценный офлайн-режим',
    '✅ Кэширование сессии для офлайн-входа',
    '✅ Синхронизация данных при восстановлении интернета',
    '✅ Улучшенная мобильная навигация',
    '✅ Исправлены ошибки при работе без интернета',
    '✅ Оптимизирована загрузка приложения'
  ],
  breaking: false
};