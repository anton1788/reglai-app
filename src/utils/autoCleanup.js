// src/utils/autoCleanup.js
import { supabase } from './supabaseClient';

// Запускать раз в месяц (или вручную из админки)
export const runCleanup = async (showNotification) => {
  const results = {
    oldApps: 0,
    oldComments: 0,
    oldLogs: 0
  };
  
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  // 1. Удаляем старые отменённые заявки (старше 6 месяцев)
  const { data: oldApps } = await supabase
    .from('applications')
    .select('id')
    .eq('status', 'canceled')
    .lt('created_at', sixMonthsAgo.toISOString())
    .limit(500);
  
  if (oldApps?.length) {
    const ids = oldApps.map(a => a.id);
    const { error } = await supabase
      .from('applications')
      .delete()
      .in('id', ids);
    if (!error) results.oldApps = ids.length;
  }
  
  // 2. Удаляем старые комментарии (старше 6 месяцев)
  const { data: oldComments } = await supabase
    .from('comments')
    .select('id')
    .lt('created_at', sixMonthsAgo.toISOString())
    .limit(1000);
  
  if (oldComments?.length) {
    const ids = oldComments.map(c => c.id);
    const { error } = await supabase
      .from('comments')
      .delete()
      .in('id', ids);
    if (!error) results.oldComments = ids.length;
  }
  
  // 3. Удаляем старые логи аудита (старше 3 месяцев)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const { data: oldLogs } = await supabase
    .from('audit_logs')
    .select('id')
    .lt('created_at', threeMonthsAgo.toISOString())
    .limit(5000);
  
  if (oldLogs?.length) {
    const ids = oldLogs.map(l => l.id);
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .in('id', ids);
    if (!error) results.oldLogs = ids.length;
  }
  
  if (showNotification) {
    showNotification(
      `🧹 Очищено: ${results.oldApps} заявок, ${results.oldComments} комментариев, ${results.oldLogs} логов`,
      'success'
    );
  }
  
  return results;
};

// Автоматический запуск при загрузке приложения (раз в месяц)
let lastCleanup = localStorage.getItem('last_cleanup');

export const initAutoCleanup = () => {
  const now = Date.now();
  const oneMonth = 30 * 24 * 60 * 60 * 1000;
  
  if (!lastCleanup || (now - parseInt(lastCleanup)) > oneMonth) {
    // Запускаем очистку в фоне
    setTimeout(() => {
      runCleanup();
      localStorage.setItem('last_cleanup', now.toString());
    }, 5000); // через 5 секунд после загрузки
  }
};