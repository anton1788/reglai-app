// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ✅ Версия приложения
const APP_VERSION = '1.1.10-beta';

// ─────────────────────────────────────────────────────────
// 🔹 Менеджер уведомлений (Toast) — упрощённая версия
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
      color: white; 
      border-radius: 0.5rem;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 0.875rem;
      animation: slideIn 0.2s ease;
      max-width: 400px;
      word-wrap: break-word;
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
      @keyframes slideIn { 
        from { transform: translateX(100%); opacity: 0; } 
        to { transform: translateX(0); opacity: 1; } 
      }
      @keyframes slideOut { 
        from { transform: translateX(0); opacity: 1; } 
        to { transform: translateX(100%); opacity: 0; } 
      }
    `;
    document.head.appendChild(style);
  }
};

// ─────────────────────────────────────────────────────────
// 🔹 Мониторинг сети (упрощённый)
// ─────────────────────────────────────────────────────────
const setupNetworkMonitor = () => {
  const updateNetworkStatus = () => {
    const isOnline = navigator.onLine;
    document.documentElement.setAttribute('data-online', isOnline ? 'true' : 'false');
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
// 🔹 Точка входа — максимально простая и надёжная
// ─────────────────────────────────────────────────────────
const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('[App] Root element not found!');
    return;
  }
  
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('[App] ✅ Application rendered successfully');
  } catch (error) {
    console.error('[App] ❌ Failed to render application:', error);
    rootElement.innerHTML = `
      <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px;background:#f9fafb;font-family:system-ui,sans-serif;text-align:center;">
        <div style="max-width:400px;">
          <h2 style="color:#dc2626;font-size:24px;margin-bottom:16px;">⚠️ Ошибка загрузки приложения</h2>
          <p style="color:#6b7280;margin-bottom:24px;">Пожалуйста, обновите страницу или попробуйте позже.</p>
          <button onclick="window.location.reload()" style="background:#3b82f6;color:white;padding:12px 24px;border:none;border-radius:8px;cursor:pointer;font-size:16px;font-weight:500;">
            🔄 Обновить страницу
          </button>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px;">Ошибка: ${error.message}</p>
        </div>
      </div>
    `;
  }
};

// ─────────────────────────────────────────────────────────
// 🚀 ЗАПУСК — максимально простой и надёжный
// ─────────────────────────────────────────────────────────
const bootstrap = () => {
  console.log('[App] 🚀 Starting application v' + APP_VERSION);
  
  try {
    // 1. Инициализируем toast-менеджер
    try {
      initToastManager();
      console.log('[App] ✅ Toast manager initialized');
    } catch (toastError) {
      console.warn('[App] ⚠️ Toast manager init failed:', toastError);
    }
    
    // 2. Настраиваем мониторинг сети
    try {
      setupNetworkMonitor();
      console.log('[App] ✅ Network monitor initialized');
    } catch (networkError) {
      console.warn('[App] ⚠️ Network monitor init failed:', networkError);
    }
    
    // 3. Рендерим приложение
    renderApp();
    
  } catch (error) {
    console.error('[App] ❌ Bootstrap failed:', error);
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px;background:#f9fafb;font-family:system-ui,sans-serif;text-align:center;">
          <div style="max-width:400px;">
            <h2 style="color:#dc2626;font-size:24px;margin-bottom:16px;">⚠️ Ошибка загрузки</h2>
            <p style="color:#6b7280;margin-bottom:24px;">Не удалось запустить приложение. Попробуйте обновить страницу.</p>
            <button onclick="window.location.reload()" style="background:#3b82f6;color:white;padding:12px 24px;border:none;border-radius:8px;cursor:pointer;font-size:16px;font-weight:500;">
              🔄 Обновить страницу
            </button>
          </div>
        </div>
      `;
    }
  }
};

// ✅ Запускаем после загрузки страницы
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}