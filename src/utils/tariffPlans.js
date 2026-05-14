// ============================================
// 1. ДОБАВИТЬ В utils/tariffPlans.js
// ============================================

// Функция для проверки квот через RPC
export const checkQuotaViaRPC = async (supabase, companyId, apiKeyId = null) => {
  try {
    const { data, error } = await supabase.rpc('check_quota', {
      p_company_id: companyId,
      p_api_key_id: apiKeyId
    });
    
    if (error) throw error;
    return {
      allowed: data.allowed,
      dailyUsage: data.daily_usage,
      dailyLimit: data.daily_limit,
      monthlyUsage: data.monthly_usage,
      monthlyLimit: data.monthly_limit,
      remaining: data.remaining
    };
  } catch (err) {
    console.error('checkQuotaViaRPC error:', err);
    return { allowed: false, error: err.message };
  }
};

// Функция для логирования API использования через RPC
export const logApiUsageViaRPC = async (supabase, params) => {
  try {
    const { data, error } = await supabase.rpc('log_api_usage', {
      p_api_key_id: params.apiKeyId,
      p_company_id: params.companyId,
      p_endpoint: params.endpoint,
      p_method: params.method,
      p_status_code: params.statusCode,
      p_response_time_ms: params.responseTimeMs,
      p_request_size_bytes: params.requestSizeBytes,
      p_response_size_bytes: params.responseSizeBytes,
      p_ip_address: params.ipAddress,
      p_user_agent: params.userAgent
    });
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('logApiUsageViaRPC error:', err);
    return null;
  }
};

// src/utils/tariffPlans.js

// 🔧 ИМПОРТЫ
import { supabase } from './supabaseClient';

// ✅ Функция получения статистики использования компании
export const getUsageStats = async (companyId) => {
  try {
    // Подсчёт заявок за текущий месяц (30 дней)
    const { count: applicationsCount } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString());
    
    // Подсчёт пользователей компании
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

// 📦 Конфигурация тарифных планов
export const TARIFF_PLANS = {
  basic: {
    id: 'basic',
    name: 'Базовый',
    monthlyPrice: 990,
    annualPrice: 9900,
    apiQuotaMonthly: 1000,
    apiQuotaDaily: 100,
    maxApiKeys: 1,
    maxUsers: 10,
    features: {
      warehouse: true,
      analytics: true,
      api: true,
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
    monthlyPrice: 4990,
    annualPrice: 49900,
    apiQuotaMonthly: 10000,
    apiQuotaDaily: 1000,
    maxApiKeys: 5,
    maxUsers: 50,
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
    monthlyPrice: 19990,
    annualPrice: 199900,
    apiQuotaMonthly: 100000,
    apiQuotaDaily: 10000,
    maxApiKeys: 50,
    maxUsers: 500,
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

// 🏢 Получить план компании из Supabase
export const getCompanyPlan = async (supabaseClient, companyId) => {
  const { data, error } = await supabaseClient
    .from('companies')
    .select('plan_tier, subscription_active, subscription_expires_at, api_usage_current, quota_reset_date')
    .eq('id', companyId)
    .single();
  
  if (error || !data) {
    return {
      ...TARIFF_PLANS.basic,
      isActive: false,
      expiresAt: null,
      usageCurrent: 0,
      quotaResetDate: null
    };
  }
  
  const plan = TARIFF_PLANS[data.plan_tier] || TARIFF_PLANS.basic;
  
  return {
    ...plan,
    isActive: data.subscription_active,
    expiresAt: data.subscription_expires_at,
    usageCurrent: data.api_usage_current,
    quotaResetDate: data.quota_reset_date
  };
};

// 🔐 Проверка доступа к функции тарифа
export const checkFeatureAccess = (plan, feature) => {
  return plan.features[feature] === true || 
         typeof plan.features[feature] === 'string';
};

// 💰 Расчёт экономии при годовой оплате
export const calculateSavings = (plan) => {
  const monthlyTotal = plan.monthlyPrice * 12;
  const savings = monthlyTotal - plan.annualPrice;
  const savingsPercent = Math.round((savings / monthlyTotal) * 100);
  
  return {
    monthlyTotal,
    savings,
    savingsPercent
  };
};

// 📊 Проверка квоты API (с поддержкой фильтрации по apiKeyId)
export const checkQuota = async (supabaseClient, companyId, apiKeyId = null) => {
  const now = new Date();
  
  // Формируем базовый запрос
  let query = supabaseClient
    .from('api_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', now.toISOString().split('T')[0]);
  
  // Если передан apiKeyId — фильтруем по конкретному ключу
  if (apiKeyId) {
    query = query.eq('api_key_id', apiKeyId);
  }
  
  const { count: dailyCount, error: usageError } = await query;
  
  if (usageError) {
    console.warn('Ошибка загрузки usage:', usageError);
    return {
      allowed: false,
      dailyUsage: 0,
      dailyLimit: 100,
      dailyRemaining: 0,
      monthlyUsage: 0,
      monthlyLimit: 1000,
      monthlyRemaining: 0,
      resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    };
  }
  
  const { data: companyData, error: companyError } = await supabaseClient
    .from('companies')
    .select('plan_tier, api_usage_current')
    .eq('id', companyId)
    .single();
  
  if (companyError) {
    console.warn('Ошибка загрузки компании:', companyError);
  }
  
  const plan = TARIFF_PLANS[companyData?.plan_tier || 'basic'];
  const dailyUsage = dailyCount || 0;
  const monthlyUsage = companyData?.api_usage_current || 0;
  
  return {
    allowed: dailyUsage < plan.apiQuotaDaily,
    dailyUsage,
    dailyLimit: plan.apiQuotaDaily,
    dailyRemaining: Math.max(0, plan.apiQuotaDaily - dailyUsage),
    monthlyUsage,
    monthlyLimit: plan.apiQuotaMonthly,
    monthlyRemaining: Math.max(0, plan.apiQuotaMonthly - monthlyUsage),
    resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
  };
};

// 📝 Логирование использования API
export const logApiUsage = async (supabaseClient, data) => {
  try {
    const { error } = await supabaseClient.from('api_usage_logs').insert([{
      api_key_id: data.apiKeyId,
      company_id: data.companyId,
      endpoint: data.endpoint,
      method: data.method,
      status_code: data.statusCode,
      response_time_ms: data.responseTimeMs,
      request_size_bytes: data.requestSizeBytes,
      response_size_bytes: data.responseSizeBytes,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      created_at: new Date().toISOString()
    }]);
    
    if (error) throw error;
    
    // Инкрементируем счётчик использования в компании
    const { error: incrementError } = await supabaseClient
      .from('companies')
      .update({ 
        api_usage_current: supabaseClient.sql`api_usage_current + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.companyId);
    
    if (incrementError) {
      console.warn('Failed to increment API usage counter:', incrementError);
    }
    
  } catch (err) {
    console.warn('[API Usage] Failed to log:', err);
  }
};

// 📈 Получить статистику использования по ключу
export const getKeyUsageStats = async (supabaseClient, apiKeyId, period = 'day') => {
  const now = new Date();
  let startDate;
  
  if (period === 'day') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  const { data, error } = await supabaseClient
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
  
  // Группировка по эндпоинтам
  data.forEach(log => {
    stats.byEndpoint[log.endpoint] = (stats.byEndpoint[log.endpoint] || 0) + 1;
    stats.byStatusCode[log.status_code] = (stats.byStatusCode[log.status_code] || 0) + 1;
  });
  
  return stats;
};

export default TARIFF_PLANS;