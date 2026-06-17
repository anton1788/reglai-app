// src/utils/offlineWrapper.js
// ✅ ПОЛНАЯ РЕАЛИЗАЦИЯ (ИСПРАВЛЕНА)

import { 
  cacheApplications as cacheApps,
  loadOfflineApplications as loadApps,
  cacheComments as cacheComm,
  loadOfflineComments as loadComm,
  getOfflineQueue,
  enqueueOfflineRequest,
  triggerManualSync,
  requestBackgroundSync,
  setupSyncListener,
  getStorageStats,
  checkOfflineSupport,
  initOfflineModule
} from './offlineStorage';

import {
  cacheAuthData as cacheAuth,
  getCachedAuth as getAuth,
  clearAuthCache as clearAuth,
  isSessionValid as isValidSession  // ✅ Переименовано
} from './authCache';

// ─── AUTH ────────────────────────────────────────────────
export const cacheAuthData = cacheAuth;
export const getCachedAuth = getAuth;
export const clearAuthCache = clearAuth;
export const isSessionValid = isValidSession;  // ✅ Экспорт с правильным именем

// ─── APPLICATIONS ────────────────────────────────────────
export const cacheApplications = cacheApps;
export const loadOfflineApplications = loadApps;

// ─── COMMENTS ───────────────────────────────────────────
export const cacheComments = cacheComm;
export const loadOfflineComments = loadComm;

// ─── QUEUE ──────────────────────────────────────────────
export { 
  getOfflineQueue,
  enqueueOfflineRequest,
  triggerManualSync,
  requestBackgroundSync,
  setupSyncListener,
  getStorageStats,
  checkOfflineSupport,
  initOfflineModule
};

// ─── OFFLINE DATA (комбинированная загрузка) ──────────
export const loadOfflineData = async (companyId) => {
  try {
    const [applications, comments] = await Promise.all([
      loadApps(companyId),
      loadComm(companyId)
    ]);
    
    return { applications, comments };
  } catch (err) {
    console.warn('[offlineWrapper] Failed to load offline data:', err);
    return { applications: [], comments: {} };
  }
};

// ─── OFFLINE MODE ───────────────────────────────────────
export const isOfflineMode = () => !navigator.onLine;

export const getOfflineStatus = () => ({
  isOffline: !navigator.onLine,
  hasCachedSession: isSessionValid()  // ✅ Используем экспортированную функцию
});

// ─── HOOK ───────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';

export const useOfflineAuth = () => {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const cached = await getAuth();
        setAuth(cached);
      } catch (e) {
        console.warn('[useOfflineAuth] Failed to load auth:', e);
        setAuth(null);
      } finally {
        setLoading(false);
      }
    };
    loadAuth();
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine) {
      console.warn('[useOfflineAuth] Cannot sync offline');
      return false;
    }
    
    try {
      await triggerManualSync();
      return true;
    } catch (e) {
      console.warn('[useOfflineAuth] Sync failed:', e);
      return false;
    }
  }, []);
  
  return { 
    auth, 
    loading, 
    isOffline, 
    syncOfflineData,
    hasCachedSession: !!auth && !auth?.expired 
  };
};