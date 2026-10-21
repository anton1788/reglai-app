// src/config.js
export const APP_VERSION = '0.0.92-beta';

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