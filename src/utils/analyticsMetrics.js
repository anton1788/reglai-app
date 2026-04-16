// ============================================
// utils/analyticsMetrics.js
// ============================================

// Получение статистики API через RPC
export const getApiUsageStats = async (supabase, companyId, days = 30) => {
  try {
    const { data, error } = await supabase.rpc('get_api_usage_stats', {
      p_company_id: companyId,
      p_days: days
    });
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('getApiUsageStats error:', err);
    return null;
  }
};

// Получение статистики компании
export const getCompanyStats = async (supabase, companyId) => {
  try {
    const { data, error } = await supabase.rpc('get_company_stats', {
      p_company_id: companyId
    });
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('getCompanyStats error:', err);
    return null;
  }
};

// Получение аналитики доходов
export const getRevenueAnalytics = async (supabase, companyId, months = 12) => {
  try {
    const { data, error } = await supabase.rpc('get_revenue_analytics', {
      p_company_id: companyId,
      p_months: months
    });
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('getRevenueAnalytics error:', err);
    return null;
  }
};

// ============================================
// 📊 Метрики аналитики: Activation, TTFV, Feature Adoption, NPS, Churn
// ============================================

// ─────────────────────────────────────────────────────────────
// ⚙️ CONSTANTS: CHURN REASONS
// ─────────────────────────────────────────────────────────────
export const REASON_OPTIONS = [
  { value: 'price', label: '💰 Дорого / не оправдало цену', color: 'red' },
  { value: 'features', label: '🔧 Не хватает функционала', color: 'orange' },
  { value: 'support', label: '🎧 Плохая поддержка', color: 'yellow' },
  { value: 'competitor', label: '🏆 Нашли лучшее решение', color: 'blue' },
  { value: 'usability', label: '🧭 Сложно использовать', color: 'purple' },
  { value: 'performance', label: '⚡ Технические проблемы', color: 'gray' },
  { value: 'other', label: '📝 Другое', color: 'slate' }
];

export const SEVERITY_LEVELS = {
  low: { min: 1, max: 2, label: 'Низкая' },
  medium: { min: 3, max: 4, label: 'Средняя' },
  high: { min: 5, max: 5, label: 'Критичная' }
};

// ─────────────────────────────────────────────────────────────
// 🚀 ACTIVATION RATE
// ─────────────────────────────────────────────────────────────
/**
 * 📈 Рассчитывает процент пользователей, создавших первую заявку в течение 24 часов
 * @param {Array} users - массив пользователей компании
 * @param {Array} applications - массив заявок
 * @returns {Object} { rate, activated, total, periodDays }
 */
export const calculateActivationRate = (users, applications) => {
  if (!users?.length) return { rate: 0, activated: 0, total: 0, periodDays: 7 };

  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  
  const recentUsers = users.filter(u => {
    const registeredAt = new Date(u.created_at || u.inserted_at);
    const daysAgo = (Date.now() - registeredAt) / (1000 * 60 * 60 * 24);
    return daysAgo <= 7;
  });

  if (!recentUsers.length) return { rate: 0, activated: 0, total: 0, periodDays: 7 };

  let activatedCount = 0;

  recentUsers.forEach(user => {
    const registeredAt = new Date(user.created_at || user.inserted_at);
    const firstApp = applications
      .filter(app => app.user_id === user.user_id || app.user_id === user.id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];

    if (firstApp) {
      const firstAppAt = new Date(firstApp.created_at);
      const timeDiff = firstAppAt - registeredAt;
      if (timeDiff >= 0 && timeDiff <= TWENTY_FOUR_HOURS_MS) {
        activatedCount++;
      }
    }
  });

  return {
    rate: Math.round((activatedCount / recentUsers.length) * 100),
    activated: activatedCount,
    total: recentUsers.length,
    periodDays: 7
  };
};

// ─────────────────────────────────────────────────────────────
// ⏱️ TIME TO FIRST VALUE
// ─────────────────────────────────────────────────────────────
/**
 * ⏱️ Рассчитывает среднее время от регистрации до первой заявки
 * @param {Array} companyUsers - пользователи компании
 * @param {Array} applications - заявки
 * @returns {Object} { averageHours, averageDays, sampleSize, distribution }
 */
export const calculateTimeToFirstValue = (companyUsers, applications) => {
  if (!companyUsers || !applications) return { averageHours: null, sampleSize: 0, distribution: {} };

  const ttfvValues = [];

  companyUsers.forEach(user => {
    const userApps = applications
      .filter(app => app.user_id === user.user_id)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    if (userApps.length > 0 && user.created_at) {
      const regDate = new Date(user.created_at);
      const firstAppDate = new Date(userApps[0].created_at);
      const hoursDiff = (firstAppDate - regDate) / (1000 * 60 * 60);

      if (hoursDiff >= 0 && hoursDiff < 8760) {
        ttfvValues.push(hoursDiff);
      }
    }
  });

  if (ttfvValues.length === 0) {
    return { averageHours: null, sampleSize: 0, distribution: {} };
  }

  const sum = ttfvValues.reduce((acc, val) => acc + val, 0);
  const avg = sum / ttfvValues.length;

  const distribution = {
    '< 1 ч': ttfvValues.filter(v => v < 1).length,
    '1 - 24 ч': ttfvValues.filter(v => v >= 1 && v <= 24).length,
    '> 24 ч': ttfvValues.filter(v => v > 24).length
  };

  return {
    averageHours: Math.round(avg * 10) / 10,
    averageDays: Math.round((avg / 24) * 10) / 10,
    sampleSize: ttfvValues.length,
    distribution
  };
};

// ─────────────────────────────────────────────────────────────
// 🎯 FEATURE ADOPTION BY ROLE
// ─────────────────────────────────────────────────────────────
/**
 * 📊 Рассчитывает использование функций по ролям (Склад, Чат, Аналитика)
 * @param {Array} companyUsers - пользователи компании
 * @param {Array} applications - заявки
 * @param {Array} auditLogs - логи аудита
 * @returns {Object} { byRole, overall }
 */
export const calculateFeatureAdoption = (companyUsers, applications, auditLogs = []) => {
  if (!companyUsers || companyUsers.length === 0) {
    return {
      byRole: {},
      overall: { warehouse: 0, chat: 0, analytics: 0 }
    };
  }

  const usersByRole = companyUsers.reduce((acc, user) => {
    const role = user.role || 'foreman';
    if (!acc[role]) acc[role] = [];
    acc[role].push(user.user_id);
    return acc;
  }, {});

  const warehouseUsers = new Set(
    applications
      .filter(app => 
        app.user_id && 
        app.materials?.some(m => (m.supplier_received_quantity || 0) > 0)
      )
      .map(app => app.user_id)
  );

  const chatUsers = new Set(
    (auditLogs || [])
      .filter(log => 
        log.action_type === 'feature_used' && 
        log.entity_id === 'chat' && 
        log.user_id
      )
      .map(log => log.user_id)
  );

  const analyticsUsers = new Set(
    (auditLogs || [])
      .filter(log => 
        log.action_type === 'feature_used' && 
        log.entity_id === 'analytics' && 
        log.user_id
      )
      .map(log => log.user_id)
  );

  const calcPercent = (featureSet, userIds) => {
    if (!userIds?.length) return 0;
    const used = userIds.filter(id => featureSet.has(id)).length;
    return Math.round((used / userIds.length) * 100);
  };

  const byRole = {};
  const overall = { warehouse: 0, chat: 0, analytics: 0 };
  let roleCount = 0;

  Object.entries(usersByRole).forEach(([role, userIds]) => {
    if (!userIds.length) return;
    roleCount++;

    byRole[role] = {
      warehouse: {
        percent: calcPercent(warehouseUsers, userIds),
        users: userIds.filter(id => warehouseUsers.has(id)).length,
        total: userIds.length
      },
      chat: {
        percent: calcPercent(chatUsers, userIds),
        users: userIds.filter(id => chatUsers.has(id)).length,
        total: userIds.length
      },
      analytics: {
        percent: calcPercent(analyticsUsers, userIds),
        users: userIds.filter(id => analyticsUsers.has(id)).length,
        total: userIds.length
      }
    };

    overall.warehouse += byRole[role].warehouse.percent;
    overall.chat += byRole[role].chat.percent;
    overall.analytics += byRole[role].analytics.percent;
  });

  if (roleCount > 0) {
    overall.warehouse = Math.round(overall.warehouse / roleCount);
    overall.chat = Math.round(overall.chat / roleCount);
    overall.analytics = Math.round(overall.analytics / roleCount);
  }

  return { byRole, overall };
};

// ─────────────────────────────────────────────────────────────
// 🎯 NPS: NET PROMOTER SCORE
// ─────────────────────────────────────────────────────────────
/**
 * 💬 Рассчитывает Net Promoter Score (лояльность пользователей)
 * @param {Array} responses - ответы из таблицы nps_responses
 * @returns {Object} { score, total, promoters, passives, detractors, trend }
 */
export const calculateNps = (responses) => {
  if (!responses || responses.length === 0) {
    return {
      score: null,
      total: 0,
      promoters: 0,
      passives: 0,
      detractors: 0,
      promotersPercent: 0,
      passivesPercent: 0,
      detractorsPercent: 0,
      trend: []
    };
  }

  const promoters = responses.filter(r => r.score >= 9).length;
  const passives = responses.filter(r => r.score >= 7 && r.score <= 8).length;
  const detractors = responses.filter(r => r.score <= 6).length;
  const total = responses.length;

  const promotersPercent = (promoters / total) * 100;
  const detractorsPercent = (detractors / total) * 100;
  const npsScore = Math.round(promotersPercent - detractorsPercent);

  // Тренд по месяцам
  const trend = {};
  responses.forEach(r => {
    const month = new Date(r.created_at).toISOString().slice(0, 7);
    if (!trend[month]) trend[month] = { promoters: 0, passives: 0, detractors: 0, total: 0 };
    trend[month].total++;
    if (r.score >= 9) trend[month].promoters++;
    else if (r.score >= 7) trend[month].passives++;
    else trend[month].detractors++;
  });

  const trendArray = Object.entries(trend)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({
      month,
      score: data.total > 0 
        ? Math.round((data.promoters / data.total * 100) - (data.detractors / data.total * 100))
        : 0,
      responses: data.total
    }));

  return {
    score: npsScore,
    total,
    promoters,
    passives,
    detractors,
    promotersPercent: Math.round(promotersPercent),
    passivesPercent: Math.round((passives / total) * 100),
    detractorsPercent: Math.round(detractorsPercent),
    trend: trendArray
  };
};

/**
 * 🔔 Определяет, показывать ли опрос NPS пользователю
 * @param {string} userCompanyId - ID компании
 * @param {Array} applications - заявки пользователя
 * @param {string|null} lastNpsDate - дата последнего ответа
 * @returns {boolean}
 */
export const shouldShowNpsSurvey = (userCompanyId, applications, lastNpsDate) => {
  if (!userCompanyId || !applications?.length) return false;
  
  const firstApp = applications[applications.length - 1];
  if (!firstApp?.created_at) return false;
  
  const daysSinceFirstApp = Math.ceil(
    (Date.now() - new Date(firstApp.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Показывать не раньше чем через 30 дней после первой заявки
  if (daysSinceFirstApp < 30) return false;
  
  // Не показывать чаще чем раз в 90 дней
  if (lastNpsDate) {
    const daysSinceLastNps = Math.ceil(
      (Date.now() - new Date(lastNpsDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastNps < 90) return false;
  }
  
  return true;
};

// ─────────────────────────────────────────────────────────────
// 📉 CHURN REASONS: ПРИЧИНЫ ОТТОКА
// ─────────────────────────────────────────────────────────────
/**
 * 📊 Рассчитывает метрики причин оттока
 * @param {Array} reasons - записи из таблицы churn_reasons
 * @param {number} periodDays - период анализа в днях (по умолчанию 90)
 * @returns {Object} метрики оттока
 */
export const calculateChurnReasons = (reasons, periodDays = 90) => {
  if (!reasons || reasons.length === 0) {
    return {
      total: 0,
      byCategory: {},
      bySeverity: { low: 0, medium: 0, high: 0 },
      topReason: null,
      trend: [],
      avgSeverity: 0
    };
  }

  // Фильтр по периоду
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);
  
  const filtered = reasons.filter(r => new Date(r.created_at) >= cutoffDate);
  
  // Группировка по категориям
  const byCategory = {};
  REASON_OPTIONS.forEach(opt => {
    byCategory[opt.value] = {
      label: opt.label,
      count: 0,
      percent: 0,
      color: opt.color
    };
  });
  
  filtered.forEach(r => {
    if (byCategory[r.reason_category]) {
      byCategory[r.reason_category].count++;
    }
  });
  
  // Проценты
  const total = filtered.length;
  Object.values(byCategory).forEach(cat => {
    cat.percent = total > 0 ? Math.round((cat.count / total) * 100) : 0;
  });
  
  // Группировка по серьезности
  const bySeverity = {
    low: filtered.filter(r => (r.severity || 3) <= 2).length,
    medium: filtered.filter(r => (r.severity || 3) >= 3 && (r.severity || 3) <= 4).length,
    high: filtered.filter(r => (r.severity || 3) === 5).length
  };
  
  // Топ причина
  const topReason = Object.entries(byCategory)
    .sort(([,a], [,b]) => b.count - a.count)[0]?.[0] || null;
  
  // Тренд по неделям
  const trend = {};
  filtered.forEach(r => {
    const week = new Date(r.created_at);
    week.setDate(week.getDate() - week.getDay()); // начало недели
    const weekKey = week.toISOString().slice(0, 10);
    if (!trend[weekKey]) trend[weekKey] = 0;
    trend[weekKey]++;
  });
  
  const trendArray = Object.entries(trend)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, count]) => ({ week, count }));
  
  // Средняя серьезность
  const avgSeverity = total > 0 
    ? parseFloat((filtered.reduce((sum, r) => sum + (r.severity || 3), 0) / total).toFixed(1))
    : 0;
  
  return {
    total,
    byCategory,
    bySeverity,
    topReason,
    trend: trendArray,
    avgSeverity
  };
};

/**
 * 🔔 Определяет, показывать ли модалку причины оттока
 * @param {string} action - 'deactivate_user' | 'deactivate_company'
 * @param {string} userRole - роль текущего пользователя
 * @param {boolean} isCompanyOwner - является ли владелец компании
 * @returns {boolean}
 */
export const shouldShowChurnModal = (action, userRole, isCompanyOwner) => {
  if (action === 'deactivate_user' && (userRole === 'manager' || isCompanyOwner)) {
    return true;
  }
  if (action === 'deactivate_company' && isCompanyOwner) {
    return true;
  }
  return false;
};

// ─────────────────────────────────────────────────────────────
// 🧰 UTILS
// ─────────────────────────────────────────────────────────────
/**
 * 🔤 Форматирует число с разделителями тысяч
 */
export const formatNumber = (num) => 
  new Intl.NumberFormat('ru-RU').format(num || 0);

/**
 * 📅 Форматирует дату
 */
export const formatDate = (dateString, language = 'ru') => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

/**
 * 🎨 Возвращает цвет для категории причины оттока
 */
export const getReasonColorClass = (color, isDark = false) => {
  const colors = {
    red: isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800',
    orange: isDark ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-800',
    yellow: isDark ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800',
    blue: isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800',
    purple: isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800',
    gray: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800',
    slate: isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-800'
  };
  return colors[color] || colors.slate;
};

// ─────────────────────────────────────────────────────────────
// 📊 ДОПОЛНИТЕЛЬНЫЕ МЕТРИКИ
// ─────────────────────────────────────────────────────────────

/**
 * 📈 Рассчитывает retention пользователей
 * @param {Array} users - пользователи
 * @param {Array} applications - заявки
 * @param {number} months - количество месяцев для анализа
 * @returns {Object} retention по месяцам
 */
export const calculateRetention = (users, applications, months = 6) => {
  if (!users?.length || !applications?.length) {
    return { cohorts: [], overallRetention: 0 };
  }

  const cohorts = {};
  
  users.forEach(user => {
    const regDate = new Date(user.created_at || user.inserted_at);
    const monthKey = `${regDate.getFullYear()}-${regDate.getMonth() + 1}`;
    if (!cohorts[monthKey]) {
      cohorts[monthKey] = { users: [], totalUsers: 0, retention: {} };
    }
    cohorts[monthKey].users.push(user.user_id || user.id);
    cohorts[monthKey].totalUsers++;
  });

  Object.keys(cohorts).forEach(cohortMonth => {
    for (let m = 0; m <= months; m++) {
      const targetMonth = new Date(cohortMonth + '-01');
      targetMonth.setMonth(targetMonth.getMonth() + m);
      const monthStr = `${targetMonth.getFullYear()}-${targetMonth.getMonth() + 1}`;
      
      const activeUsers = cohorts[cohortMonth].users.filter(userId => {
        return applications.some(app => {
          const appDate = new Date(app.created_at);
          const appMonth = `${appDate.getFullYear()}-${appDate.getMonth() + 1}`;
          return app.user_id === userId && appMonth === monthStr;
        });
      });
      
      cohorts[cohortMonth].retention[m] = cohorts[cohortMonth].totalUsers > 0
        ? Math.round((activeUsers.length / cohorts[cohortMonth].totalUsers) * 100)
        : 0;
    }
  });

  const retentionArray = Object.entries(cohorts).map(([month, data]) => ({
    month,
    totalUsers: data.totalUsers,
    retention: data.retention
  }));

  const overallRetention = retentionArray.length > 0
    ? Math.round(retentionArray.reduce((sum, c) => sum + (c.retention[1] || 0), 0) / retentionArray.length)
    : 0;

  return { cohorts: retentionArray, overallRetention };
};

/**
 * 📊 Рассчитывает engagement пользователей
 * @param {Array} applications - заявки
 * @param {number} days - количество дней для анализа
 * @returns {Object} метрики вовлеченности
 */
export const calculateEngagement = (applications, days = 30) => {
  if (!applications?.length) {
    return { activeUsers: 0, avgApplicationsPerUser: 0, topUsers: [] };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentApps = applications.filter(app => new Date(app.created_at) >= cutoffDate);
  
  const userAppCount = {};
  recentApps.forEach(app => {
    if (app.user_id) {
      userAppCount[app.user_id] = (userAppCount[app.user_id] || 0) + 1;
    }
  });
  
  const activeUsers = Object.keys(userAppCount).length;
  const totalApps = recentApps.length;
  const avgApplicationsPerUser = activeUsers > 0 ? Math.round(totalApps / activeUsers) : 0;
  
  const topUsers = Object.entries(userAppCount)
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    activeUsers,
    totalApplications: totalApps,
    avgApplicationsPerUser,
    topUsers,
    periodDays: days
  };
};

// ─────────────────────────────────────────────────────────────
// 📦 EXPORTS SUMMARY
// ─────────────────────────────────────────────────────────────
/**
 * Все экспортируемые функции:
 * 
 * 🔌 RPC Функции:
 * - getApiUsageStats(supabase, companyId, days)
 * - getCompanyStats(supabase, companyId)
 * - getRevenueAnalytics(supabase, companyId, months)
 * 
 * 📈 Метрики:
 * - calculateActivationRate(users, applications)
 * - calculateTimeToFirstValue(companyUsers, applications)
 * - calculateFeatureAdoption(companyUsers, applications, auditLogs)
 * - calculateNps(responses)
 * - calculateChurnReasons(reasons, periodDays)
 * - calculateRetention(users, applications, months)
 * - calculateEngagement(applications, days)
 * 
 * 🔔 Условия показа:
 * - shouldShowNpsSurvey(userCompanyId, applications, lastNpsDate)
 * - shouldShowChurnModal(action, userRole, isCompanyOwner)
 * 
 * ⚙️ Константы:
 * - REASON_OPTIONS
 * - SEVERITY_LEVELS
 * 
 * 🧰 Утилиты:
 * - formatNumber(num)
 * - formatDate(dateString, language)
 * - getReasonColorClass(color, isDark)
 */

export default {
  // RPC функции
  getApiUsageStats,
  getCompanyStats,
  getRevenueAnalytics,
  // Метрики
  calculateActivationRate,
  calculateTimeToFirstValue,
  calculateFeatureAdoption,
  calculateNps,
  calculateChurnReasons,
  calculateRetention,
  calculateEngagement,
  // Условия показа
  shouldShowNpsSurvey,
  shouldShowChurnModal,
  // Константы
  REASON_OPTIONS,
  SEVERITY_LEVELS,
  // Утилиты
  formatNumber,
  formatDate,
  getReasonColorClass
};