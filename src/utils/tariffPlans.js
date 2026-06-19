// src/utils/tariffPlans.js

// ============================================================
// 1. КОНФИГУРАЦИЯ ТАРИФОВ
// ============================================================

export const TARIFF_PLANS = {
  basic: {
    id: 'basic',
    name: 'Базовый',
    monthlyPrice: 0,
    annualPrice: 0,
    maxUsers: 3,
    maxApiKeys: 1,
    maxApplications: 5,        // Лимит заявок в день
    maxMaterialsPerApp: 20,    // Лимит материалов в заявке
    apiQuotaMonthly: 100,
    apiQuotaDaily: 50,
    features: {
      warehouse: true,
      analytics: false,
      api: false,
      webhooks: false,
      support: 'email',
      priority: false,
      sla: false,
      customIntegration: false
    },
    popular: false,
    color: '#4A6572'
  },
  pro: {
    id: 'pro',
    name: 'Профессиональный',
    monthlyPrice: 990,
    annualPrice: 9900,
    maxUsers: 10,
    maxApiKeys: 5,
    maxApplications: -1,       // -1 = безлимит
    maxMaterialsPerApp: -1,
    apiQuotaMonthly: 10000,
    apiQuotaDaily: 1000,
    features: {
      warehouse: true,
      analytics: true,
      api: true,
      webhooks: true,
      support: 'chat',
      priority: true,
      sla: false,
      customIntegration: false
    },
    popular: true,
    color: '#F9AA33'
  },
  enterprise: {
    id: 'enterprise',
    name: 'Корпоративный',
    monthlyPrice: 2990,
    annualPrice: 29900,
    maxUsers: -1,
    maxApiKeys: -1,
    maxApplications: -1,
    maxMaterialsPerApp: -1,
    apiQuotaMonthly: 100000,
    apiQuotaDaily: 10000,
    features: {
      warehouse: true,
      analytics: true,
      api: true,
      webhooks: true,
      support: '24/7',
      priority: true,
      sla: true,
      customIntegration: true
    },
    popular: false,
    color: '#3b82f6'
  }
};

// ============================================================
// 2. ФУНКЦИИ ДЛЯ РАБОТЫ С ЛИМИТАМИ
// ============================================================

/**
 * Получение плана компании из БД
 */
export const getCompanyPlan = async (supabase, companyId) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('plan_tier, application_limit, materials_limit, users_limit, applications_used, monthly_requests, last_reset_date')
      .eq('id', companyId)
      .single();
    
    if (error) throw error;
    
    const planId = data?.plan_tier || 'basic';
    const plan = TARIFF_PLANS[planId];
    
    return {
      ...plan,
      id: planId,
      maxApplications: data.application_limit || plan.maxApplications,
      maxMaterialsPerApp: data.materials_limit || plan.maxMaterialsPerApp,
      maxUsers: data.users_limit || plan.maxUsers,
      applicationsUsed: data.applications_used || 0,
      monthlyRequests: data.monthly_requests || 0,
      lastResetDate: data.last_reset_date,
      isActive: true
    };
  } catch (err) {
    console.warn('Ошибка получения плана:', err);
    return TARIFF_PLANS.basic;
  }
};

/**
 * Проверка квоты заявок через RPC
 * @param {Object} supabase - Supabase клиент
 * @param {string} companyId - ID компании
 */
export const checkQuota = async (supabase, companyId) => {
  try {
    const { data, error } = await supabase
      .rpc('check_application_limit', { p_company_id: companyId });
    
    if (error) throw error;
    
    const result = data?.[0] || {};
    return {
      allowed: result.allowed || false,
      used: result.used || 0,
      limit: result.limit_value || 5,
      remaining: result.remaining || 0,
      isUnlimited: result.limit_value === -1
    };
  } catch (err) {
    console.error('Ошибка проверки квоты:', err);
    return { allowed: true, used: 0, limit: 100, remaining: 100, isUnlimited: true };
  }
};

/**
 * Проверка лимита материалов
 */
export const checkMaterialsLimit = async (supabase, companyId, materialsCount) => {
  try {
    const { data, error } = await supabase
      .rpc('check_materials_limit', {
        p_company_id: companyId,
        p_materials_count: materialsCount
      });
    
    if (error) throw error;
    
    const result = data?.[0] || {};
    return {
      allowed: result.allowed || false,
      limit: result.limit_value || 20,
      isUnlimited: result.limit_value === -1
    };
  } catch (err) {
    console.error('Ошибка проверки лимита материалов:', err);
    return { allowed: true, limit: 20, isUnlimited: true };
  }
};

/**
 * Увеличение счётчика заявок
 */
export const incrementApplicationUsage = async (supabase, companyId) => {
  try {
    const { error } = await supabase
      .rpc('increment_application_usage', { p_company_id: companyId });
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Ошибка увеличения счётчика:', err);
    return { success: false, error: err };
  }
};

/**
 * Сброс лимитов (ежедневный) - глобальный для всех компаний
 * @param {Object} supabase - Supabase клиент
 */
export const resetCompanyLimits = async (supabase) => {
  try {
    const { error } = await supabase
      .rpc('reset_company_limits');
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Ошибка сброса лимитов:', err);
    return { success: false, error: err };
  }
};

/**
 * Проверка доступа к функции по тарифу
 */
export const checkFeatureAccess = (plan, feature) => {
  if (!plan) return false;
  
  const features = {
    unlimited_applications: plan.maxApplications === -1 || plan.maxApplications > 0,
    unlimited_materials: plan.maxMaterialsPerApp === -1 || plan.maxMaterialsPerApp > 0,
    analytics: plan.id !== 'basic',
    api_access: plan.id !== 'basic',
    priority_support: plan.id === 'pro' || plan.id === 'enterprise',
    warehouse: plan.features?.warehouse || false,
    webhooks: plan.features?.webhooks || false
  };
  
  return features[feature] || false;
};

/**
 * Расчёт экономии при годовой оплате
 */
export const calculateSavings = (plan) => {
  if (!plan || plan.monthlyPrice === 0) {
    return { monthlyTotal: 0, savings: 0, savingsPercent: 0 };
  }
  
  const monthlyTotal = plan.monthlyPrice * 12;
  const savings = monthlyTotal - plan.annualPrice;
  const savingsPercent = Math.round((savings / monthlyTotal) * 100);
  
  return {
    monthlyTotal,
    savings,
    savingsPercent
  };
};

/**
 * Получение статуса лимитов для отображения
 */
export const getQuotaStatus = (quota) => {
  if (!quota) return 'unknown';
  if (quota.isUnlimited || quota.limit === -1) return 'unlimited';
  if (quota.used >= quota.limit) return 'exhausted';
  if (quota.used >= quota.limit * 0.8) return 'near_limit';
  return 'ok';
};

/**
 * Логирование использования API
 */
export const logApiUsage = async (supabase, params) => {
  try {
    const { error } = await supabase
      .from('api_usage_logs')
      .insert([{
        api_key_id: params.apiKeyId,
        company_id: params.companyId,
        endpoint: params.endpoint,
        method: params.method,
        status_code: params.statusCode,
        response_time_ms: params.responseTimeMs,
        request_size_bytes: params.requestSizeBytes,
        response_size_bytes: params.responseSizeBytes,
        ip_address: params.ipAddress,
        user_agent: params.userAgent
      }]);
    
    if (error) throw error;
  } catch (err) {
    console.warn('Ошибка логирования API:', err);
  }
};

/**
 * Получение статистики использования компании
 */
export const getUsageStats = async (supabase, companyId) => {
  try {
    const { count: applicationsCount } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    const { count: usersCount } = await supabase
      .from('company_users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);
    
    return {
      applications: applicationsCount || 0,
      users: usersCount || 0,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    return { applications: 0, users: 0, lastUpdated: null };
  }
};

/**
 * Получение статистики использования по API ключу
 */
export const getKeyUsageStats = async (supabase, apiKeyId, period = 'day') => {
  const now = new Date();
  let startDate;
  
  if (period === 'day') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  const { data, error } = await supabase
    .from('api_usage_logs')
    .select('endpoint, method, status_code, response_time_ms, created_at')
    .eq('api_key_id', apiKeyId)
    .gte('created_at', startDate.toISOString());
  
  if (error) throw error;
  
  const stats = {
    totalRequests: data.length,
    successRequests: data.filter(d => d.status_code >= 200 && d.status_code < 300).length,
    errorRequests: data.filter(d => d.status_code >= 400).length,
    avgResponseTime: data.reduce((sum, d) => sum + (d.response_time_ms || 0), 0) / (data.length || 1),
    byEndpoint: {},
    byStatusCode: {}
  };
  
  data.forEach(log => {
    stats.byEndpoint[log.endpoint] = (stats.byEndpoint[log.endpoint] || 0) + 1;
    stats.byStatusCode[log.status_code] = (stats.byStatusCode[log.status_code] || 0) + 1;
  });
  
  return stats;
};

export default TARIFF_PLANS;