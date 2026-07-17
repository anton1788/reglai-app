// src/utils/clientManager.js
import { supabase } from './supabaseClient';

// ============ ОСНОВНЫЕ ФУНКЦИИ ДЛЯ КЛИЕНТОВ ============

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

// ============ ФУНКЦИИ ДЛЯ РАБОТЫ С ЛИДАМИ ============

export const clientManager = {
  /**
   * Добавить лида
   */
  addLead: async (data) => {
    const { data: result, error } = await supabase
      .from('leads')
      .insert([data])
      .select();
    return { success: !error, data: result?.[0], error };
  },

  /**
   * Получить список лидов
   */
  getLeads: async (status = null, limit = 100) => {
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    return { data, error };
  },

  /**
   * Обновить статус лида
   */
  updateStatus: async (id, status, notes = '') => {
    const { error } = await supabase
      .from('leads')
      .update({
        status,
        notes: notes || null,
        updated_at: new Date().toISOString(),
        contacted_at: status === 'contacted' ? new Date().toISOString() : null
      })
      .eq('id', id);
    return { success: !error, error };
  },

  /**
   * Конвертировать лида в пользователя
   */
  convertToUser: async (id, userId) => {
    const { error } = await supabase
      .from('leads')
      .update({
        converted_to_user: true,
        user_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    return { success: !error, error };
  },

  /**
   * Получить статистику по лидам
   */
  getStats: async () => {
    const { data, error } = await supabase
      .from('leads')
      .select('status, source, created_at')
      .order('created_at', { ascending: false });

    if (error) return { error };

    const stats = {
      total: data.length,
      byStatus: {},
      bySource: {},
      today: 0,
      week: 0,
      month: 0
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    data.forEach(lead => {
      // По статусу
      stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;
      
      // По источнику
      stats.bySource[lead.source || 'unknown'] = (stats.bySource[lead.source || 'unknown'] || 0) + 1;
      
      // По дате
      const created = new Date(lead.created_at);
      if (created >= today) stats.today++;
      if (created >= weekAgo) stats.week++;
      if (created >= monthAgo) stats.month++;
    });

    return { data: stats, error: null };
  },

  /**
   * Экспорт лидов в CSV
   */
  exportToCSV: async (leads) => {
    if (!leads || leads.length === 0) return null;
    
    const headers = ['Компания', 'Контакт', 'Телефон', 'Email', 'Статус', 'Создан', 'Примечания'];
    const rows = leads.map(l => [
      l.company_name,
      l.name,
      l.phone,
      l.email,
      l.status,
      new Date(l.created_at).toLocaleDateString('ru-RU'),
      l.notes || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    return csv;
  }
};

// ============ ЭКСПОРТ ВСЕХ ФУНКЦИЙ ============

export default {
  // Функции для клиентов
  loadClients,
  loadClientStats,
  updateClientStatus,
  removeClient,
  formatLastActivity,
  
  // Функции для лидов (через clientManager)
  addLead: clientManager.addLead,
  getLeads: clientManager.getLeads,
  updateLeadStatus: clientManager.updateStatus,
  convertLeadToUser: clientManager.convertToUser,
  getLeadStats: clientManager.getStats,
  exportLeadsToCSV: clientManager.exportToCSV
};