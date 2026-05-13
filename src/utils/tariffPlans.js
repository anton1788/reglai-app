// src/utils/tariffPlans.js
import { supabase } from './supabaseClient';

// ============================================
// 1. КОНФИГУРАЦИЯ ТАРИФНЫХ ПЛАНОВ
// ============================================

export const TARIFF_PLANS = {
  basic: {
    id: 'basic',
    name: 'Базовый',
    nameEn: 'Basic',
    monthlyPrice: 990,
    annualPrice: 9990,
    basePrice: 0,
    includedUsers: 3,
    extraUserPrice: 490,
    maxUsers: 10,
    apiQuotaMonthly: 1000,
    apiQuotaDaily: 100,
    maxApiKeys: 1,
    features: {
      warehouse: true,
      applications: true,
      documents: true,
      analytics: false,
      chat: false,
      api: false,
      exportExcel: true,
      mobileApp: true,
      support: 'email',
      priority: false,
      customLogo: false
    },
    popular: false,
    color: '#4A6572',
    description: 'Для небольших строительных бригад',
    descriptionEn: 'For small construction teams'
  },
  pro: {
    id: 'pro',
    name: 'Профессиональный',
    nameEn: 'Professional',
    monthlyPrice: 2490,
    annualPrice: 24990,
    basePrice: 990,
    includedUsers: 10,
    extraUserPrice: 390,
    maxUsers: 50,
    apiQuotaMonthly: 10000,
    apiQuotaDaily: 1000,
    maxApiKeys: 5,
    features: {
      warehouse: true,
      applications: true,
      documents: true,
      analytics: true,
      chat: true,
      api: true,
      exportExcel: true,
      mobileApp: true,
      support: 'chat',
      priority: true,
      customLogo: false
    },
    popular: true,
    color: '#F9AA33',
    description: 'Для активных строительных компаний',
    descriptionEn: 'For active construction companies'
  },
  business: {
    id: 'business',
    name: 'Бизнес',
    nameEn: 'Business',
    monthlyPrice: 4990,
    annualPrice: 49900,
    basePrice: 1990,
    includedUsers: 25,
    extraUserPrice: 290,
    maxUsers: 200,
    apiQuotaMonthly: 50000,
    apiQuotaDaily: 5000,
    maxApiKeys: 20,
    features: {
      warehouse: true,
      applications: true,
      documents: true,
      analytics: true,
      chat: true,
      api: true,
      exportExcel: true,
      mobileApp: true,
      support: '24/7',
      priority: true,
      customLogo: true,
      customFields: true
    },
    popular: false,
    color: '#3b82f6',
    description: 'Для крупных строительных организаций',
    descriptionEn: 'For large construction organizations'
  },
  enterprise: {
    id: 'enterprise',
    name: 'Корпоративный',
    nameEn: 'Enterprise',
    monthlyPrice: 9990,
    annualPrice: 99900,
    basePrice: 2990,
    includedUsers: 100,
    extraUserPrice: 190,
    maxUsers: 1000,
    apiQuotaMonthly: 200000,
    apiQuotaDaily: 20000,
    maxApiKeys: 100,
    features: {
      warehouse: true,
      applications: true,
      documents: true,
      analytics: true,
      chat: true,
      api: true,
      exportExcel: true,
      mobileApp: true,
      support: 'dedicated',
      priority: true,
      customLogo: true,
      customFields: true,
      sla: true,
      customIntegration: true
    },
    popular: false,
    color: '#10b981',
    description: 'Для холдингов и крупных корпораций',
    descriptionEn: 'For holdings and large corporations'
  }
};

// ============================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

export const calculatePrice = (plan, usersCount, isAnnual = false) => {
  const extraUsers = Math.max(0, usersCount - plan.includedUsers);
  const extraCost = extraUsers * plan.extraUserPrice;
  
  let basePrice;
  if (isAnnual) {
    basePrice = plan.annualPrice;
  } else {
    basePrice = plan.monthlyPrice;
  }
  
  return basePrice + extraCost;
};

export const getPricePerUser = (plan, usersCount, isAnnual = false) => {
  const total = calculatePrice(plan, usersCount, isAnnual);
  return Math.round(total / usersCount);
};

export const calculateSavings = (plan, usersCount = plan.includedUsers) => {
  const monthlyTotal = calculatePrice(plan, usersCount, false);
  const annualTotal = calculatePrice(plan, usersCount, true);
  const savings = (monthlyTotal * 12) - annualTotal;
  const savingsPercent = Math.round((savings / (monthlyTotal * 12)) * 100);
  
  return {
    monthlyTotal: monthlyTotal * 12,
    annualTotal,
    savings,
    savingsPercent
  };
};

export const getExtraUsersCost = (plan, usersCount) => {
  const extraUsers = Math.max(0, usersCount - plan.includedUsers);
  return {
    count: extraUsers,
    cost: extraUsers * plan.extraUserPrice,
    pricePerUser: plan.extraUserPrice
  };
};

export const getAllPlans = () => {
  return Object.values(TARIFF_PLANS);
};

// ============================================
// 3. ОСНОВНЫЕ ФУНКЦИИ
// ============================================

export const getCompanyPlan = async (supabaseClient, companyId) => {
  try {
    const { data, error } = await supabaseClient
      .from('companies')
      .select(`
        plan_tier, 
        subscription_active, 
        subscription_expires_at, 
        api_usage_current, 
        quota_reset_date,
        users_count,
        calculated_price,
        billing_period
      `)
      .eq('id', companyId)
      .single();
      
    if (error || !data) {
      return {
        ...TARIFF_PLANS.basic,
        isActive: false,
        expiresAt: null,
        usageCurrent: 0,
        quotaResetDate: null,
        usersCount: 3,
        calculatedPrice: TARIFF_PLANS.basic.monthlyPrice
      };
    }
    
    // 🔍 Загрузка актуального количества пользователей
    const { count: actualUsersCount = 0 } = await supabaseClient
      .from('company_users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true);
      
    const plan = TARIFF_PLANS[data.plan_tier] || TARIFF_PLANS.basic;
    
    return {
      ...plan,
      isActive: data.subscription_active,
      expiresAt: data.subscription_expires_at,
      usageCurrent: data.api_usage_current,
      quotaResetDate: data.quota_reset_date,
      usersCount: data.users_count || actualUsersCount || 3,
      calculatedPrice: data.calculated_price,
      billingPeriod: data.billing_period || 'monthly'
    };
  } catch (err) {
    console.error('getCompanyPlan error:', err);
    return {
      ...TARIFF_PLANS.basic,
      isActive: false,
      usersCount: 3,
      calculatedPrice: TARIFF_PLANS.basic.monthlyPrice
    };
  }
};

export const checkFeatureAccess = (plan, feature) => {
  if (!plan || !plan.features) return false;
  return plan.features[feature] === true || 
         typeof plan.features[feature] === 'string';
};

export const checkQuota = async (supabaseClient, companyId, apiKeyId = null) => {
  // ✅ Принудительная проверка сброса квоты
  try {
    const { data: company } = await supabaseClient
      .from('companies')
      .select('quota_reset_date, api_usage_current')
      .eq('id', companyId)
      .single();
    
    if (company && company.quota_reset_date < new Date().toISOString().split('T')[0]) {
      await supabaseClient.rpc('reset_company_quota', { p_company_id: companyId });
    }
  } catch (err) {
    console.warn('Auto-reset check failed:', err);
  }
  
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  let query = supabaseClient
    .from('api_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', `${today}T00:00:00`);
  
  if (apiKeyId) {
    query = query.eq('api_key_id', apiKeyId);
  }
  
  const { count: dailyCount, error: usageError } = await query;
  
  // ✅ ИСПРАВЛЕНО: явный return с выравниванием
  if (usageError) {
    console.warn('Ошибка загрузки usage:', usageError);
    const fallbackPlan = TARIFF_PLANS.basic;
    return {
      allowed: false,
      dailyUsage: 0,
      dailyLimit: fallbackPlan.apiQuotaDaily,
      monthlyLimit: fallbackPlan.apiQuotaMonthly,
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
    resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
    planId: plan.id
  };
};

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
    
    const { error: incrementError } = await supabaseClient.rpc('increment_api_usage', {
      p_company_id: data.companyId
    });
    
    if (incrementError) {
      console.warn('Failed to increment API usage counter:', incrementError);
    }
    
  } catch (err) {
    console.warn('[API Usage] Failed to log:', err);
  }
};

export const getUsageStats = async (companyId) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const [monthlyApps, monthlyUsers, dailyApi] = await Promise.all([
      supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', monthStart.toISOString()),
      
      supabase
        .from('company_users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId),
      
      supabase
        .from('api_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', dayStart.toISOString())
    ]);
    
    return {
      applications: monthlyApps.count || 0,
      users: monthlyUsers.count || 0,
      dailyApiCalls: dailyApi.count || 0,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    return { applications: 0, users: 0, dailyApiCalls: 0, lastUpdated: null };
  }
};

export const checkQuotaViaRPC = async (supabaseClient, companyId, apiKeyId = null) => {
  try {
    const { data, error } = await supabaseClient.rpc('check_quota', {
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
  
  data.forEach(log => {
    stats.byEndpoint[log.endpoint] = (stats.byEndpoint[log.endpoint] || 0) + 1;
    stats.byStatusCode[log.status_code] = (stats.byStatusCode[log.status_code] || 0) + 1;
  });
  
  return stats;
};

export const formatPrice = (price, currency = '₽') => {
  return new Intl.NumberFormat('ru-RU').format(price) + ` ${currency}`;
};

// 🔄 Обновить план компании (ИСПРАВЛЕНО)
export const updateCompanyPlan = async (
  supabaseClient, 
  companyId, 
  planId, 
  usersCount,
  isAnnual = false
) => {
  const plan = TARIFF_PLANS[planId];
  if (!plan) throw new Error('Invalid plan');
  
  // 🔐 Валидация минимума
  if (usersCount < 1) {
    throw new Error('Количество пользователей должно быть не менее 1');
  }
  
  // 🔐 Валидация максимума
  if (usersCount > plan.maxUsers) {
    throw new Error(`Превышен лимит пользователей для тарифа ${plan.name}: макс. ${plan.maxUsers}`);
  }
  
  // 💰 Расчёт итоговой цены
  const extraUsers = Math.max(0, usersCount - plan.includedUsers);
  const extraCost = extraUsers * plan.extraUserPrice;
  const basePrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
  const calculatedPrice = basePrice + extraCost;
  
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + (isAnnual ? 12 : 1));
  
  const { data, error } = await supabaseClient
    .from('companies')
    .update({
      plan_tier: planId,
      users_count: usersCount,
      calculated_price: calculatedPrice,
      billing_period: isAnnual ? 'annual' : 'monthly',
      subscription_active: true,
      subscription_expires_at: expiresAt.toISOString(),
      last_plan_change_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', companyId)
    .select()
    .single();
    
  if (error) throw error;
  
  // 📝 Логируем изменение в audit_logs (опционально)
  try {
    await supabaseClient.from('audit_logs').insert({
      company_id: companyId,
      action_type: 'plan_changed',
      entity_type: 'company',
      entity_id: companyId,
      old_value: { plan: data.plan_tier, users: data.users_count },
      new_value: { plan: planId, users: usersCount, price: calculatedPrice },
      user_id: null,
      created_at: new Date().toISOString()
    });
  } catch (logErr) {
    console.warn('Не удалось записать аудит:', logErr);
  }
  
  return { ...data, calculatedPrice, usersCount };
};

export default TARIFF_PLANS;