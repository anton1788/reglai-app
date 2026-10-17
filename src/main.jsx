import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ✅ Офлайн-модуль
import { initOfflineModule, checkOfflineSupport } from './utils/offlineStorage'

// ✅ Версия приложения
const APP_VERSION = '0.0.86-beta';

// ─────────────────────────────────────────────────────────
// 🔹 Регистрация Service Worker (нативная)
// ─────────────────────────────────────────────────────────
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // 🔥 Важно! Запрещает браузеру кэшировать sw.js
      });
      
      console.log('[SW] Registered:', registration.scope);
      window.swRegistration = registration;
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version installed');
              window.dispatchEvent(new CustomEvent('pwa-update-available', {
                detail: { version: APP_VERSION, registration }
              }));
            }
          });
        }
      });
      
      registration.update();
      return registration;
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  }
  return null;
};

// ─────────────────────────────────────────────────────────
// 🔹 Слушатель обновлений PWA (только уведомление, модалка — в App.jsx)
// ─────────────────────────────────────────────────────────
const setupPWAUpdateListener = () => {
  const checkVersionManifest = async () => {
    try {
      const response = await fetch('/version.json?v=' + Date.now(), {
        cache: 'no-store',
      });
      const data = await response.json();

      if (data.version && data.version !== APP_VERSION) {
        console.log('[PWA] Обнаружена версия на сервере:', data.version);
        window.dispatchEvent(
          new CustomEvent('pwa-update-available', {
            detail: { version: data.version },
          })
        );
      }
    } catch (err) {
      console.warn('[PWA] Version check failed:', err);
    }
  };

  checkVersionManifest();
  const interval = setInterval(checkVersionManifest, 6 * 60 * 60 * 1000);

  return () => clearInterval(interval);
};

// ─────────────────────────────────────────────────────────
// 🔹 Мониторинг сети
// ─────────────────────────────────────────────────────────
const setupNetworkMonitor = () => {
  const updateNetworkStatus = () => {
    const isOnline = navigator.onLine;
    document.documentElement.setAttribute('data-online', isOnline ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('network:change', {
      detail: { online: isOnline, timestamp: Date.now() }
    }));
  };
  updateNetworkStatus();
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  return () => {
    window.removeEventListener('online', updateNetworkStatus);
    window.removeEventListener('offline', updateNetworkStatus);
  };
};

// ─────────────────────────────────────────────────────────
// 🔹 Менеджер уведомлений (Toast)
// ─────────────────────────────────────────────────────────
const initToastManager = () => {
  if (window.appToast) return;
  const container = document.createElement('div');
  container.className = 'toast-container';
  Object.assign(container.style, {
    position: 'fixed', top: '1rem', right: '1rem', zIndex: '9999',
    display: 'flex', flexDirection: 'column', gap: '0.5rem', pointerEvents: 'none'
  });
  document.body.appendChild(container);

  const show = (message, type = 'info', duration = 4000) => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      pointer-events: auto; padding: 0.75rem 1rem;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white; border-radius: 0.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 0.875rem; animation: slideIn 0.2s ease;
    `;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, duration);
  };

  window.appToast = {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
    warn: (msg) => show(msg, 'info')
  };

  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    `;
    document.head.appendChild(style);
  }
};

// ─────────────────────────────────────────────────────────
// 🔹 Инициализация оффлайн-функций
// ─────────────────────────────────────────────────────────
const initOfflineFeatures = async () => {
  const support = checkOfflineSupport();
  if (!support.indexedDB) return;
  try {
        await initOfflineModule({
      enableAutoSync: true,
      onSyncSuccess: () => window.appToast?.success('📤 Данные синхронизированы'),
      onSyncError: () => window.appToast?.error('⚠️ Ошибка синхронизации')
    });
  } catch (error) {
    console.error('[App] Offline init error:', error);
  }
};

// ─────────────────────────────────────────────────────────
// 🔹 Точка входа
// ─────────────────────────────────────────────────────────
const renderApp = () => {
  createRoot(document.getElementById('root')).render(
    <StrictMode><App /></StrictMode>
  );
};

const bootstrap = async () => {
  initToastManager();
  await registerServiceWorker();
  await initOfflineFeatures();
  const cleanupNetwork = setupNetworkMonitor();
  const cleanupPWA = setupPWAUpdateListener();

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      cleanupNetwork?.();
      cleanupPWA?.();
    });
  }
  renderApp();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}