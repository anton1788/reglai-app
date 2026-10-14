import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import UpdateModal from './components/UpdateModal.jsx';

// ✅ VitePWA: правильная регистрация Service Worker
import { registerSW } from 'virtual:pwa-register';

// ✅ Офлайн-модуль
import { initOfflineModule, checkOfflineSupport } from './utils/offlineStorage';

// ✅ Версия приложения
const APP_VERSION = '0.0.72-beta';

// ─────────────────────────────────────────────────────────
// 🔹 Глобальные переменные для модального окна обновлений
// ─────────────────────────────────────────────────────────
let updateModalRoot = null;

const showUpdateModal = (updateInfo) => {
  const handleApplyUpdate = async () => {
    try {
      // 1. Говорим SW пропустить ожидание
      if (window.waitingWorker) {
        window.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      } else if (window.swRegistration?.waiting) {
        window.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 2. Записываем в localStorage, чтобы не показать модалку повторно
      if (updateInfo?.to) {
        localStorage.setItem(`update_applied_${updateInfo.to}`, Date.now().toString());
        localStorage.setItem('last_update_shown', updateInfo.to);
      }

      // 3. Чистим Cache Storage
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      // 4. Пытаемся обновить registration
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) await reg.update();
      }

      if (window.appToast) {
        window.appToast.success('🔄 Обновление установлено, перезагружаем...');
      }

      // 5. Форсируем reload с cache-bust
      const forceReload = () => {
        window.location.href =
          window.location.pathname + '?v=' + Date.now();
      };

      // Ждём controllerchange ИЛИ force reload через 1.5 сек
      const timer = setTimeout(forceReload, 1500);
      navigator.serviceWorker?.addEventListener(
        'controllerchange',
        () => {
          clearTimeout(timer);
          forceReload();
        },
        { once: true }
      );
    } catch (err) {
      console.error('[Update] Ошибка применения обновления:', err);
      window.location.href = window.location.pathname + '?v=' + Date.now();
    }
  };

  const handleClose = () => {
    // Запоминаем, что пользователь отклонил обновление на 24 часа
    if (updateInfo?.to) {
      localStorage.setItem(
        `update_declined_${updateInfo.to}`,
        Date.now().toString()
      );
    }
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
// 🔹 Регистрация Service Worker через VitePWA
// ─────────────────────────────────────────────────────────
const setupServiceWorker = () => {
  try {
    const updateSW = registerSW({
      immediate: true,

      onRegisteredSW(swUrl, registration) {
        console.log('[PWA] SW registered:', swUrl);
        window.swRegistration = registration;

        // ✅ КРИТИЧНО: периодически дёргаем reg.update() для проверки свежего SW
        if (registration) {
          setInterval(() => {
            registration.update().catch(() => {});
          }, 60 * 60 * 1000); // каждый час
        }
      },

      onRegisterError(error) {
        console.error('[PWA] SW registration error:', error);
      },

      onNeedRefresh() {
        console.log('[PWA] New content available');

        // ✅ Уведомляем App.jsx о новом контенте
        window.dispatchEvent(
          new CustomEvent('pwa-update-available', {
            detail: { version: APP_VERSION },
          })
        );
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
// 🔹 Слушатель обновлений PWA
// ─────────────────────────────────────────────────────────
const setupPWAUpdateListener = () => {
  let updatePrompted = false;
  const PROMPT_COOLDOWN = 24 * 60 * 60 * 1000;

  const checkVersionManifest = async () => {
    try {
      // ✅ ФИКС: cache: 'no-store' обходит HTTP-кэш и SW-кэш
      const response = await fetch('/version.json?v=' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        console.warn('[PWA] version.json HTTP', response.status);
        return;
      }

      const data = await response.json();

      if (data.version && data.version !== APP_VERSION) {
        const lastDeclined = localStorage.getItem(
          `update_declined_${data.version}`
        );
        const lastShown = localStorage.getItem('last_update_shown');

        // Если отклонено менее 24ч назад — не показываем
        if (
          lastDeclined &&
          Date.now() - parseInt(lastDeclined) < PROMPT_COOLDOWN
        ) {
          console.log('[PWA] Update declined, skipping');
          return;
        }

        if (lastShown !== data.version && !updatePrompted) {
          updatePrompted = true;
          localStorage.setItem('last_update_shown', data.version);

          const versionInfo = data.versions?.find(
            (v) => v.version === data.version
          ) || {
            version: data.version,
            changes: data.changes || ['Улучшена производительность'],
            date: data.date,
            breaking: false,
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
              message: 'После обновления может потребоваться перезагрузка',
            },
          });
        }
      }
    } catch (err) {
      console.warn('[PWA] Version check failed:', err);
    }
  };

  // Проверяем при загрузке
  checkVersionManifest();

  // Проверяем каждые 30 минут (было 6 часов)
  const interval = setInterval(checkVersionManifest, 30 * 60 * 1000);

  // Проверяем при возврате на вкладку (mobile-friendly)
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      checkVersionManifest();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  // Слушаем сообщения от SW
  const handleUpdate = (event) => {
    const { version } = event.detail || {};
    if (version && version !== APP_VERSION && !updatePrompted) {
      updatePrompted = true;
      showUpdateModal({
        from: APP_VERSION,
        to: version,
        changes: ['Новая версия приложения готова к установке'],
        date: new Date().toISOString(),
        breaking: false,
        updateOptions: { showStayOption: true, remindLaterDays: 3 },
      });
    }
  };

  window.addEventListener('pwa-update-available', handleUpdate);

  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('pwa-update-available', handleUpdate);
  };
};

// ─────────────────────────────────────────────────────────
// 🔹 Мониторинг сети
// ─────────────────────────────────────────────────────────
const setupNetworkMonitor = () => {
  const updateNetworkStatus = () => {
    const isOnline = navigator.onLine;
    document.documentElement.setAttribute(
      'data-online',
      isOnline ? 'true' : 'false'
    );

    window.dispatchEvent(
      new CustomEvent('network:change', {
        detail: { online: isOnline, timestamp: Date.now() },
      })
    );

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
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    zIndex: '9999',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    pointerEvents: 'none',
  });
  document.body.appendChild(container);

  const show = (message, type = 'info', duration = 4000) => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      pointer-events: auto;
      padding: 0.75rem 1rem;
      background: ${
        type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'
      };
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
    warn: (msg) => show(msg, 'info'),
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
    console.warn('[App] ⚠️ IndexedDB not supported — offline disabled');
    return;
  }

  try {
    const result = await initOfflineModule({
      enableAutoSync: true,
      onSyncSuccess: (payload) => {
        console.log('✅ Synced:', payload);
        window.appToast?.success('📤 Данные синхронизированы');
        window.dispatchEvent(
          new CustomEvent('offline:synced', { detail: payload })
        );
      },
      onSyncError: (error) => {
        console.warn('⚠️ Sync error:', error);
        window.appToast?.error('⚠️ Ошибка синхронизации');
        window.dispatchEvent(
          new CustomEvent('offline:error', { detail: { error } })
        );
      },
    });

    if (!result.initialized) {
      console.warn('[App] Offline init failed:', result.reason || result.error);
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
    </StrictMode>
  );
};

// ✅ Запуск
const bootstrap = async () => {
  initToastManager();
  setupServiceWorker();
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