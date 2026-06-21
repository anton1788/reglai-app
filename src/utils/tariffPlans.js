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

// 📦 КОНФИГУРАЦИЯ ТАРИФНЫХ ПЛАНОВ (ОБНОВЛЕННАЯ)
export const TARIFF_PLANS = {
  // БЕСПЛАТНЫЙ - для знакомства с продуктом
  basic: {
    id: 'basic',
    name: 'Базовый',
    monthlyPrice: 0,
    annualPrice: 0,
    apiQuotaMonthly: 200,
    apiQuotaDaily: 20,
    maxApiKeys: 1,
    maxUsers: 2,
    features: {
      warehouse: true,
      analytics: false,
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

  // СТАРТ - для малого бизнеса
  starter: {
    id: 'starter',
    name: 'Старт',
    monthlyPrice: 790,
    annualPrice: 7900,
    apiQuotaMonthly: 2500,
    apiQuotaDaily: 250,
    maxApiKeys: 3,
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
    color: '#6B8FA3'
  },

  // ПРО - самый популярный
  pro: {
    id: 'pro',
    name: 'Профессиональный',
    monthlyPrice: 1990,
    annualPrice: 19900,
    apiQuotaMonthly: 10000,
    apiQuotaDaily: 1000,
    maxApiKeys: 10,
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

  // БИЗНЕС - для растущих компаний
  business: {
    id: 'business',
    name: 'Бизнес',
    monthlyPrice: 4990,
    annualPrice: 49900,
    apiQuotaMonthly: 50000,
    apiQuotaDaily: 5000,
    maxApiKeys: 25,
    maxUsers: 200,
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
  },

  // КОРПОРАТИВНЫЙ - для крупных клиентов
  enterprise: {
    id: 'enterprise',
    name: 'Корпоративный',
    monthlyPrice: 9990,
    annualPrice: 99900,
    apiQuotaMonthly: 200000,
    apiQuotaDaily: 20000,
    maxApiKeys: 100,
    maxUsers: 1000,
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
    color: '#7c3aed'
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
  const savingsPercent = monthlyTotal > 0 ? Math.round((savings / monthlyTotal) * 100) : 0;
  
  return {
    monthlyTotal,
    savings,
    savingsPercent
  };
};

// 📊 Сравнение тарифов
export const comparePlans = (planIds) => {
  const result = {};
  planIds.forEach(id => {
    const plan = TARIFF_PLANS[id];
    if (plan) {
      const savings = calculateSavings(plan);
      result[id] = {
        name: plan.name,
        price: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        savings: savings.savings,
        savingsPercent: savings.savingsPercent,
        features: plan.features,
        limits: {
          users: plan.maxUsers,
          apiKeys: plan.maxApiKeys,
          monthlyQuota: plan.apiQuotaMonthly,
          dailyQuota: plan.apiQuotaDaily
        },
        popular: plan.popular,
        color: plan.color
      };
    }
  });
  return result;
};

// 🎯 Рекомендация тарифа на основе использования
export const recommendPlan = (stats) => {
  const { users, applications } = stats;
  
  if (users <= 2 && applications <= 200) return 'basic';
  if (users <= 10 && applications <= 2500) return 'starter';
  if (users <= 50 && applications <= 10000) return 'pro';
  if (users <= 200 && applications <= 50000) return 'business';
  return 'enterprise';
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

// 📊 Проверка лимита материалов
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

// 📈 Увеличение счётчика заявок
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

// 🔍 Функция для проверки квот через RPC
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

// 📝 Функция для логирования API использования через RPC
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

// 📊 Получить все доступные тарифы с дополнительной информацией
export const getAllPlans = () => {
  const planIds = Object.keys(TARIFF_PLANS);
  return planIds.map(id => {
    const plan = TARIFF_PLANS[id];
    const savings = calculateSavings(plan);
    return {
      ...plan,
      savings: savings.savings,
      savingsPercent: savings.savingsPercent,
      id: id
    };
  });
};

// 🔍 Найти тариф по ID
export const findPlanById = (planId) => {
  return TARIFF_PLANS[planId] || null;
};

// 📈 Получить следующий уровень тарифа
export const getNextTier = (currentPlanId) => {
  const tiers = ['basic', 'starter', 'pro', 'business', 'enterprise'];
  const currentIndex = tiers.indexOf(currentPlanId);
  
  if (currentIndex === -1 || currentIndex === tiers.length - 1) {
    return null;
  }
  
  return {
    id: tiers[currentIndex + 1],
    plan: TARIFF_PLANS[tiers[currentIndex + 1]]
  };
};

// 📉 Получить предыдущий уровень тарифа
export const getPreviousTier = (currentPlanId) => {
  const tiers = ['basic', 'starter', 'pro', 'business', 'enterprise'];
  const currentIndex = tiers.indexOf(currentPlanId);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  return {
    id: tiers[currentIndex - 1],
    plan: TARIFF_PLANS[tiers[currentIndex - 1]]
  };
};

// ============================================================
// 🔽 НОВАЯ ФУНКЦИЯ: getTariffUpgradeBenefits
// ============================================================

// 📈 Получение преимуществ апгрейда тарифа
export const getTariffUpgradeBenefits = (currentPlanId) => {
  const tiers = ['basic', 'starter', 'pro', 'business', 'enterprise'];
  const currentIndex = tiers.indexOf(currentPlanId);
  
  if (currentIndex === -1 || currentIndex === tiers.length - 1) {
    return null;
  }
  
  const nextPlanId = tiers[currentIndex + 1];
  const currentPlan = TARIFF_PLANS[currentPlanId];
  const nextPlan = TARIFF_PLANS[nextPlanId];
  
  if (!currentPlan || !nextPlan) {
    return null;
  }
  
  // Безопасное вычисление процентов (избегаем деления на 0)
  const safePercent = (from, to) => {
    if (from === 0) return 0;
    return Math.round(((to - from) / from) * 100);
  };
  
  return {
    planId: nextPlanId,
    name: nextPlan.name,
    benefits: {
      users: {
        from: currentPlan.maxUsers,
        to: nextPlan.maxUsers,
        increase: nextPlan.maxUsers - currentPlan.maxUsers,
        percent: safePercent(currentPlan.maxUsers, nextPlan.maxUsers)
      },
      apiQuotaMonthly: {
        from: currentPlan.apiQuotaMonthly,
        to: nextPlan.apiQuotaMonthly,
        increase: nextPlan.apiQuotaMonthly - currentPlan.apiQuotaMonthly,
        percent: safePercent(currentPlan.apiQuotaMonthly, nextPlan.apiQuotaMonthly)
      },
      apiKeys: {
        from: currentPlan.maxApiKeys,
        to: nextPlan.maxApiKeys,
        increase: nextPlan.maxApiKeys - currentPlan.maxApiKeys,
        percent: safePercent(currentPlan.maxApiKeys, nextPlan.maxApiKeys)
      },
      newFeatures: Object.keys(nextPlan.features).filter(
        feature => nextPlan.features[feature] === true && 
                   (currentPlan.features[feature] === false || currentPlan.features[feature] === undefined)
      ),
      supportUpgrade: nextPlan.features.support !== currentPlan.features.support,
      prioritySupport: nextPlan.features.priority === true && currentPlan.features.priority !== true,
      hasSla: nextPlan.features.sla === true && currentPlan.features.sla !== true,
    }
  };
};

// ============================================================
// 🔽 НОВАЯ ФУНКЦИЯ: checkTariffLimit
// ============================================================

// 📊 Проверка лимитов по тарифу
export const checkTariffLimit = (planId, limitType, currentValue) => {
  const plan = TARIFF_PLANS[planId];
  if (!plan) return { allowed: false, limit: 0 };
  
  const limits = {
    users: plan.maxUsers,
    apiKeys: plan.maxApiKeys,
    apiQuotaMonthly: plan.apiQuotaMonthly,
    apiQuotaDaily: plan.apiQuotaDaily,
  };
  
  const limit = limits[limitType];
  if (limit === undefined) return { allowed: true, limit: Infinity };
  
  return {
    allowed: currentValue <= limit,
    limit: limit,
    remaining: Math.max(0, limit - currentValue),
    usagePercent: limit > 0 ? Math.round((currentValue / limit) * 100) : 0
  };
};

// ============================================================
// 🔽 ЭКСПОРТ ПО УМОЛЧАНИЮ
// ============================================================

export default TARIFF_PLANS;