// ✅ Автоматически импортируем версию из package.json
import pkg from '../package.json';

// ✅ Единая точка управления версией приложения (берется из package.json)
export const APP_VERSION = pkg.version;

export const APP_CONFIG = {
  version: APP_VERSION,
  name: 'Реглай',
  fullName: 'Реглай — система управления заявками на материалы',
  api: {
    baseUrl: `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
    realtimeUrl: `${import.meta.env.VITE_SUPABASE_URL?.replace('https', 'wss')}/realtime/v1`,
  },
  pwa: {
    swVersion: '1.2.0',
    cachePrefix: 'reglai',
  },
  // 🆕 PUSH-УВЕДОМЛЕНИЯ
  push: {
    vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || '',
    enabled: true,
  },
};

// ✅ Хелпер для сравнения версий (семантическое версионирование)
export const compareVersions = (v1, v2) => {
  // Очищаем от префиксов вроде 'v' или '-beta' для корректного сравнения чисел
  const cleanV1 = String(v1).replace(/[^\d.]/g, '');
  const cleanV2 = String(v2).replace(/[^\d.]/g, '');
  
  const a = cleanV1.split('.').map(Number);
  const b = cleanV2.split('.').map(Number);
  
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