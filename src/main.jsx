import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ✅ VitePWA: правильная регистрация Service Worker
import { registerSW } from 'virtual:pwa-register'

// ✅ Офлайн-модуль
import { initOfflineModule, checkOfflineSupport } from './utils/offlineStorage'

// ─────────────────────────────────────────────────────────
// 🔹 Регистрация Service Worker через VitePWA
//    (только регистрация! Модалку показывает App.jsx)
// ─────────────────────────────────────────────────────────
const setupServiceWorker = () => {
  try {
    const updateSW = registerSW({
      immediate: true,

      onRegisteredSW(swUrl, registration) {
        console.log('[PWA] SW registered:', swUrl);
        window.swRegistration = registration;
      },

      onRegisterError(error) {
        console.error('[PWA] SW registration error:', error);
      },

      onNeedRefresh() {
        // ❗ НЕ показываем модалку здесь — просто уведомляем App.jsx
        console.log('[PWA] New content available');
        window.dispatchEvent(new CustomEvent('pwa-update-available', {
          detail: { source: 'sw' }
        }));
      },

      onOfflineReady() {
        console.log('[PWA] App ready for offline use');
      },
    });

    window.updateSW = updateSW;
    return updateSW;
  } catch (error) {
    console.warn('[PWA] SW setup skipped:', error?.message || error);
    return null;
  }
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
    console.log(`[Network] ${isOnline ? '🟢 Online' : '🔴 Offline'}`);
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
    display: 'flex', flexDirection: 'column', gap: '0.5rem',
    pointerEvents: 'none'
  });
  document.body.appendChild(container);

  const show = (message, type = 'info', duration = 4000) => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      pointer-events: auto;
      padding: 0.75rem 1rem;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white; border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 0.875rem;
      animation: slideIn 0.2s ease;
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
  console.log('[App] Offline support:', support);

  if (!support.indexedDB) {
    console.warn('[App] ⚠️ IndexedDB not supported — offline features disabled');
    return;
  }

  try {
    const result = await initOfflineModule({
      enableAutoSync: true,
      onSyncSuccess: (payload) => {
        console.log('✅ Synced:', payload);
        window.appToast?.success('📤 Данные синхронизированы');
        window.dispatchEvent(new CustomEvent('offline:synced', { detail: payload }));
      },
      onSyncError: (error) => {
        console.warn('⚠️ Sync error:', error);
        window.appToast?.error('⚠️ Ошибка синхронизации');
        window.dispatchEvent(new CustomEvent('offline:error', { detail: { error } }));
      }
    });

    if (!result.initialized) {
      console.warn('[App] Offline module init failed:', result.reason || result.error);
    } else {
      console.log('[App] ✅ Offline module initialized');
    }
  } catch (error) {
    console.error('[App] Offline init error:', error);
  }
};

// ─────────────────────────────────────────────────────────
// 🔹 Точка входа
// ─────────────────────────────────────────────────────────
const renderApp = () => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

const bootstrap = async () => {
  initToastManager();
  setupServiceWorker();

  try {
    await initOfflineFeatures();
  } catch (e) {
    console.warn('[App] Offline init failed, continuing:', e);
  }

  const cleanupNetwork = setupNetworkMonitor();

  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      cleanupNetwork?.();
    });
  }

  renderApp();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}