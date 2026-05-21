import { supabase } from './supabaseClient';

/**
 * Загружает список всех клиентов компании
 */
export async function loadClients(companyId) {
  // Убираем связь с users, так как её нет
  const { data, error } = await supabase
    .from('company_users')
    .select(`
      id,
      user_id,
      full_name,
      phone,
      is_active,
      created_at,
      updated_at
    `)
    .eq('company_id', companyId)
    .eq('role', 'client')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Возвращаем данные без email (или можно попробовать получить email другим способом)
  return data.map(client => ({
    ...client,
    email: null // email пока не доступен
  }));
}

/**
 * Загружает статистику по клиенту (заявки, активные объекты и т.д.)
 */
export async function loadClientStats(companyId, clientId) {
  // Получаем все заявки клиента
  const { data: applications, error: appsError } = await supabase
    .from('applications')
    .select('id, status, created_at, total_amount, object_name')
    .eq('company_id', companyId)
    .eq('client_id', clientId);

  if (appsError) throw appsError;

  const stats = {
    totalApplications: applications.length,
    activeApplications: applications.filter(a => 
      ['pending', 'partial', 'admin_processing', 'pending_approval'].includes(a.status)
    ).length,
    completedApplications: applications.filter(a => a.status === 'received').length,
    totalAmount: applications.reduce((sum, a) => sum + (a.total_amount || 0), 0),
    uniqueObjects: new Set(applications.map(a => a.object_name)).size,
    lastActivity: applications[0]?.created_at || null
  };

  return stats;
}

/**
 * Обновляет статус клиента (активен/заблокирован)
 */
export async function updateClientStatus(clientId, isActive) {
  const { error } = await supabase
    .from('company_users')
    .update({ 
      is_active: isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', clientId);

  if (error) throw error;
  return true;
}

/**
 * Удаляет клиента из компании (помечает как удалённого)
 */
export async function removeClient(clientId) {
  const { error } = await supabase
    .from('company_users')
    .update({ 
      is_active: false,
      deleted_at: new Date().toISOString()
    })
    .eq('id', clientId);

  if (error) throw error;
  return true;
}

/**
 * Форматирует дату последней активности
 */
export function formatLastActivity(date) {
  if (!date) return 'Нет активности';
  const days = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  if (days < 7) return `${days} дня(ей) назад`;
  return new Date(date).toLocaleDateString('ru-RU');
}