// src/config.js
export const APP_VERSION = '0.0.87-beta'; // Текущая версия билда

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
  push: {
    vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || '',
    enabled: true,
  },
};

// ✅ ИСПРАВЛЕННАЯ функция сравнения (игнорирует -beta, -alpha и т.д.)
export const compareVersions = (v1, v2) => {
  const cleanV1 = String(v1).split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
  const cleanV2 = String(v2).split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
  
  for (let i = 0; i < Math.max(cleanV1.length, cleanV2.length); i++) {
    const num1 = cleanV1[i] || 0;
    const num2 = cleanV2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
};

export const isUpdateAvailable = (current, latest) => {
  return compareVersions(latest, current) > 0;
};