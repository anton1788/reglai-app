// src/hooks/useSupportAgent.js
// ============================================================
// 🎧 ХУК: профиль оператора поддержки + heartbeat онлайн-статуса
// ============================================================

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { updateAgentHeartbeat } from '../utils/supportCenter';

export function useSupportAgent(user) {
  const [agent, setAgent] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef(null);
  const mountedRef = useRef(true);

  // ── Загрузка профиля оператора ──
  useEffect(() => {
    mountedRef.current = true;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase
          .from('support_agents')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.warn('[useSupportAgent] Ошибка загрузки:', error.message);
        }
        if (mountedRef.current) setAgent(data || null);
      } catch (e) {
        console.error('[useSupportAgent]', e);
        if (mountedRef.current) setAgent(null);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [user?.id]);

  // ── Heartbeat: пока isOnline=true, каждые 30 сек отмечаемся онлайн ──
  useEffect(() => {
    if (!agent?.id || !isOnline) {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      return;
    }

    // Первый удар сразу
    updateAgentHeartbeat(agent.id, true);

    heartbeatRef.current = setInterval(() => {
      updateAgentHeartbeat(agent.id, true);
    }, 30_000);

    // Перед закрытием вкладки — офлайн
    const handleUnload = () => {
      updateAgentHeartbeat(agent.id, false);
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      window.removeEventListener('beforeunload', handleUnload);
      // Помечаем офлайн при выходе с дашборда
      updateAgentHeartbeat(agent.id, false);
    };
  }, [agent?.id, isOnline]);

  const goOnline = () => setIsOnline(true);
  const goOffline = () => setIsOnline(false);

  return { agent, isOnline, loading, goOnline, goOffline };
}