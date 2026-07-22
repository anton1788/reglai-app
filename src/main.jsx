import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import UpdateModal from './components/UpdateModal.jsx'

// ✅ Офлайн-модуль
import { initOfflineModule, checkOfflineSupport } from './utils/offlineStorage'

// ✅ Версия приложения
const APP_VERSION = '9.17.30-beta';

// ─────────────────────────────────────────────────────────
// 🔹 Глобальные переменные для модального окна обновлений
// ─────────────────────────────────────────────────────────
let updateModalRoot = null;

const showUpdateModal = (updateInfo) => {
  const handleApplyUpdate = () => {
    if (window.waitingWorker) {
      window.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    if (updateInfo?.to) {
      localStorage.setItem(`update_applied_${updateInfo.to}`, Date.now().toString());
      localStorage.setItem('last_update_shown', updateInfo.to);
    }
    if (window.appToast) {
      window.appToast.success('🔄 Обновление установлено, страница будет перезагружена...');
    }
    setTimeout(() => {
      window.location.reload(true);
    }, 1500);
  };

  const handleClose = () => {
    if (updateModalRoot) {
      updateModalRoot.render(null);
    }
  };

  if (updateModalRoot) {
    updateModalRoot.render(
      <UpdateModal
        isOpen={true}
        updateInfo={updateInfo}
        onClose={handleClose}
        onApplyUpdate={handleApplyUpdate}
        isLoading={false}
      />
    );
  } else {
    const modalDiv = document.createElement('div');
    modalDiv.id = 'update-modal-root';
    document.body.appendChild(modalDiv);
    updateModalRoot = createRoot(modalDiv);
    showUpdateModal(updateInfo);
  }
};

// ─────────────────────────────────────────────────────────
// 🔹 Регистрация Service Worker
// ─────────────────────────────────────────────────────────
// Добавьте проверку после регистрации
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });
      
      console.log('[SW] Registered:', registration.scope);
      
      // Сохраняем registration в window для доступа из App
      window.swRegistration = registration;
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version installed, showing update prompt');
              window.dispatchEvent(new CustomEvent('pwa-update-available', {
                detail: { version: APP_VERSION, registration }
              }));
            }
          });
        }
      });
      
      // Проверяем обновления при регистрации
      registration.update();
      
      return registration;
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  }
  return null;
};

// ─────────────────────────────────────────────────────────
// 🔹 Слушатель обновлений PWA (ЕДИНАЯ ВЕРСИЯ)
// ─────────────────────────────────────────────────────────
const setupPWAUpdateListener = () => {
  let updatePrompted = false;
  const PROMPT_COOLDOWN = 24 * 60 * 60 * 1000; // 24 часа
  
  // Загружаем информацию о версиях
  const checkVersionManifest = async () => {
    try {
      const response = await fetch('/version.json?v=' + Date.now());
      const data = await response.json();
      
      if (data.version && data.version !== APP_VERSION) {
        const lastShown = localStorage.getItem('last_update_shown');
        const lastDeclined = localStorage.getItem(`update_declined_${data.version}`);
        
        if (lastDeclined && (Date.now() - parseInt(lastDeclined)) < PROMPT_COOLDOWN) {
          console.log('[PWA] Update declined, not showing');
          return;
        }
        
        if (lastShown !== data.version && !updatePrompted) {
          updatePrompted = true;
          localStorage.setItem('last_update_shown', data.version);
          
          const versionInfo = data.versions?.find(v => v.version === data.version) || {
            version: data.version,
            changes: data.changes || ['Улучшена производительность'],
            date: data.date,
            breaking: false
          };
          
          showUpdateModal({
            from: APP_VERSION,
            to: data.version,
            changes: versionInfo.changes,
            date: versionInfo.date,
            breaking: versionInfo.breaking || false,
            updateOptions: data.updateOptions || {
              showStayOption: true,
              remindLaterDays: 3,
              message: 'После обновления может потребоваться перезагрузка'
            }
          });
        }
      }
    } catch (err) {
      console.warn('[PWA] Version check failed:', err);
    }
  };
  
  // Проверяем при загрузке
  checkVersionManifest();
  
  // Проверяем каждые 6 часов
  const interval = setInterval(checkVersionManifest, 6 * 60 * 60 * 1000);
  
  // Слушаем обновления от Service Worker (исправлено: убрана неиспользуемая registration)
  const handleUpdate = (event) => {
    const { version } = event.detail;
    if (version && version !== APP_VERSION && !updatePrompted) {
      updatePrompted = true;
      showUpdateModal({
        from: APP_VERSION,
        to: version,
        changes: ['Новая версия приложения готова к установке'],
        date: new Date().toISOString(),
        breaking: false,
        updateOptions: { showStayOption: true, remindLaterDays: 3 }
      });
    }
  };

  window.addEventListener('pwa-update-available', handleUpdate);
  
  return () => {
    clearInterval(interval);
    window.removeEventListener('pwa-update-available', handleUpdate);
  };
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

// ✅ Запуск
const bootstrap = async () => {
  // 0. Инициализируем toast-менеджер (для уведомлений)
  initToastManager();
  
  // 1. Регистрируем Service Worker
  await registerServiceWorker();
  
  // 2. Инициализируем оффлайн-модуль
  await initOfflineFeatures();
  
  // 3. Настраиваем мониторинг сети
  const cleanupNetwork = setupNetworkMonitor();
  
  // 4. Настраиваем слушатель обновлений PWA
  const cleanupPWA = setupPWAUpdateListener();
  
  // Сохраняем функции очистки для HMR (если используете Vite)
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      cleanupNetwork?.();
      cleanupPWA?.();
    });
  }
  
  // 5. Рендерим приложение
  renderApp();
};

// Запускаем после загрузки страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}