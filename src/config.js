// ✅ Единая точка управления версией приложения
export const APP_VERSION = '2.0.0';

export const APP_CONFIG = {
  version: APP_VERSION,
  name: 'Реглай',
  fullName: 'Реглай — система управления заявками на материалы',
  api: {
    // ✅ ИСПРАВЛЕНО: используем переменные окружения
    baseUrl: `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
    realtimeUrl: `${import.meta.env.VITE_SUPABASE_URL?.replace('https', 'wss')}/realtime/v1`
  },
  pwa: {
    swVersion: '1.2.0',
    cachePrefix: 'reglai'
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