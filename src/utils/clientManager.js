import { supabase } from './supabaseClient';

/**
 * Загружает список всех клиентов компании
 */
export async function loadClients(companyId) {
  console.log('🔍 loadClients вызван, companyId:', companyId);
  
  const { data, error } = await supabase
    .from('company_users')
    .select(`
      id,
      user_id,
      full_name,
      phone,
      email,
      object_name,
      notes,
      is_active,
      created_at,
      updated_at
    `)
    .eq('company_id', companyId)
    .eq('role', 'client');

  if (error) {
    console.error('❌ Ошибка Supabase:', error);
    return [];
  }
  
  console.log('✅ Загружено клиентов:', data?.length);
  return data;
}

/**
 * Загружает статистику по клиенту
 */
export async function loadClientStats(companyId, clientId) {
  const { data: applications, error } = await supabase
    .from('applications')
    .select('id, status, created_at, total_amount, object_name')
    .eq('company_id', companyId)
    .eq('client_id', clientId);

  if (error) {
    console.error('Ошибка загрузки статистики:', error);
    return {
      totalApplications: 0,
      activeApplications: 0,
      completedApplications: 0,
      totalAmount: 0,
      uniqueObjects: 0,
      lastActivity: null
    };
  }

  const stats = {
    totalApplications: applications?.length || 0,
    activeApplications: applications?.filter(a => 
      ['pending', 'partial', 'admin_processing', 'pending_approval'].includes(a.status)
    ).length || 0,
    completedApplications: applications?.filter(a => a.status === 'received').length || 0,
    totalAmount: applications?.reduce((sum, a) => sum + (a.total_amount || 0), 0) || 0,
    uniqueObjects: new Set(applications?.map(a => a.object_name)).size || 0,
    lastActivity: applications?.[0]?.created_at || null
  };

  return stats;
}

/**
 * Обновляет статус клиента
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
 * Удаляет клиента из компании
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