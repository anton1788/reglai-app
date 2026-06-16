// src/hooks/useOfflineAuth.js
import { useState, useEffect, useCallback } from 'react';
import { getCachedAuth, cacheAuthData } from '../utils/authCache';

export const useOfflineAuth = (supabase) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasCachedSession, setHasCachedSession] = useState(false);
  
  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine) return;
    
    try {
      const cached = getCachedAuth();
      if (!cached) return;
      
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: cached.refresh_token
      });
      
      if (error) throw error;
      
      if (data.session) {
        cacheAuthData(data.session, data.session.user, cached.company);
        console.log('✅ Сессия обновлена после восстановления интернета');
      }
    } catch (e) {
      console.warn('Не удалось обновить сессию:', e);
    }
  }, [supabase]);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineData();
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const cached = getCachedAuth();
    setHasCachedSession(!!cached && !cached.expired);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineData]);
  
  return {
    isOffline,
    hasCachedSession,
    syncOfflineData
  };
};