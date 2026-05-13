// src/utils/tariffPlans.js


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

/**
 * Рассчитывает итоговую цену тарифа с учётом количества пользователей
 */
export const calculatePrice = (plan, usersCount, isAnnual = false) => {
  if (!plan) return 0;
  const extraUsers = Math.max(0, usersCount - (plan.includedUsers || 0));
  const extraCost = extraUsers * (plan.extraUserPrice || 0);
  const basePrice = isAnnual ? (plan.annualPrice || 0) : (plan.monthlyPrice || 0);
  return basePrice + extraCost;
};

/**
 * Рассчитывает цену за одного пользователя
 */
export const getPricePerUser = (plan, usersCount, isAnnual = false) => {
  if (!plan || !usersCount) return 0;
  const total = calculatePrice(plan, usersCount, isAnnual);
  return Math.round(total / usersCount);
};

/**
 * Рассчитывает экономию при годовой оплате
 */
export const calculateSavings = (plan, usersCount) => {
  if (!plan) return { monthlyTotal: 0, annualTotal: 0, savings: 0, savingsPercent: 0 };
  
  const count = usersCount || plan.includedUsers || 3;
  const monthlyTotal = calculatePrice(plan, count, false);
  const annualTotal = calculatePrice(plan, count, true);
  const savings = (monthlyTotal * 12) - annualTotal;
  const savingsPercent = monthlyTotal > 0 ? Math.round((savings / (monthlyTotal * 12)) * 100) : 0;
  
  return {
    monthlyTotal: monthlyTotal * 12,
    annualTotal,
    savings: Math.max(0, savings),
    savingsPercent
  };
};

/**
 * Рассчитывает стоимость дополнительных пользователей
 */
export const getExtraUsersCost = (plan, usersCount) => {
  if (!plan) return { count: 0, cost: 0, pricePerUser: 0 };
  
  const extraUsers = Math.max(0, usersCount - (plan.includedUsers || 0));
  return {
    count: extraUsers,
    cost: extraUsers * (plan.extraUserPrice || 0),
    pricePerUser: plan.extraUserPrice || 0
  };
};

/**
 * Возвращает все доступные тарифные планы
 */
export const getAllPlans = () => Object.values(TARIFF_PLANS);

/**
 * Форматирует цену для отображения
 */
export const formatPrice = (price, currency = '₽') => {
  if (typeof price !== 'number') return `0 ${currency}`;
  return new Intl.NumberFormat('ru-RU').format(price) + ` ${currency}`;
};

// ============================================
// 3. ОСНОВНЫЕ ФУНКЦИИ SUPABASE
// ============================================

/**
 * Получает тарифный план компании с расширенной информацией
 * @param {Object} supabaseClient - экземпляр Supabase клиента
 * @param {string} companyId - ID компании
 * @returns {Promise<Object>} - объект плана с метаданными
 */
export const getCompanyPlan = async (supabaseClient, companyId) => {
  if (!companyId) return { ...TARIFF_PLANS.basic, isActive: false };
  
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
        billing_period,
        promo_code_used,
        promo_applied_at,
        promo_discount_percent
      `)
      .eq('id', companyId)
      .single();
    
    if (error || !data?.plan_tier) {
      const fallback = TARIFF_PLANS.basic;
      return {
        ...fallback,
        isActive: false,
        expiresAt: null,
        usageCurrent: 0,
        quotaResetDate: null,
        usersCount: fallback.includedUsers,
        calculatedPrice: fallback.monthlyPrice,
        billingPeriod: 'monthly',
        promoInfo: null
      };
    }
    
    // Получаем актуальное количество активных пользователей
    const { count: actualUsersCount = 0, error: usersError } = await supabaseClient
      .from('company_users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true);
    
    if (usersError) {
      console.warn('Ошибка получения количества пользователей:', usersError);
    }
    
    const plan = TARIFF_PLANS[data.plan_tier] || TARIFF_PLANS.basic;
    
    const promoInfo = data.promo_code_used ? {
      code: data.promo_code_used,
      appliedAt: data.promo_applied_at,
      discountPercent: data.promo_discount_percent
    } : null;
    
    return {
      ...plan,
      isActive: data.subscription_active,
      expiresAt: data.subscription_expires_at,
      usageCurrent: data.api_usage_current || 0,
      quotaResetDate: data.quota_reset_date,
      usersCount: data.users_count || actualUsersCount || plan.includedUsers,
      calculatedPrice: data.calculated_price,
      billingPeriod: data.billing_period || 'monthly',
      promoInfo
    };
  } catch (err) {
    console.warn('Ошибка получения тарифа:', err);
    const fallback = TARIFF_PLANS.basic;
    return {
      ...fallback,
      isActive: false,
      usersCount: fallback.includedUsers,
      calculatedPrice: fallback.monthlyPrice
    };
  }
};

/**
 * Проверяет доступ к функции по тарифному плану
 */
export const checkFeatureAccess = (plan, feature) => {
  if (!plan || !plan.features) return false;
  const featureValue = plan.features[feature];
  return featureValue === true || typeof featureValue === 'string';
};

/**
 * Проверка квоты API для компании
 * @param {Object} supabaseClient - экземпляр Supabase клиента
 * @param {string} companyId - ID компании
 * @param {string|null} apiKeyId - опциональный ID API ключа
 * @returns {Promise<Object>} - статус квоты
 */
export const checkQuota = async (supabaseClient, companyId, apiKeyId = null) => {
  // ✅ Принудительная проверка сброса квоты
  try {
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('quota_reset_date, api_usage_current')
      .eq('id', companyId)
      .single();
    
    if (!companyError && company?.quota_reset_date) {
      const today = new Date().toISOString().split('T')[0];
      if (company.quota_reset_date < today) {
        await supabaseClient.rpc('reset_company_quota', { p_company_id: companyId });
      }
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
  
  if (usageError) {
    console.warn('Ошибка загрузки usage:', usageError);
    const fallbackPlan = TARIFF_PLANS.basic;
    return {
      allowed: true, // Fail-open для стабильности
      dailyUsage: 0,
      dailyLimit: fallbackPlan.apiQuotaDaily,
      monthlyLimit: fallbackPlan.apiQuotaMonthly,
      resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
      warning: 'Не удалось проверить квоту, доступ разрешён'
    };
  }
  
  const { data: companyData } = await supabaseClient
    .from('companies')
    .select('plan_tier, api_usage_current')
    .eq('id', companyId)
    .single()
    .catch(() => ({ data: null }));
  
  const plan = TARIFF_PLANS[companyData?.plan_tier || 'basic'];
  const dailyUsage = dailyCount || 0;
  const monthlyUsage = companyData?.api_usage_current || 0;
  
  const dailyLimit = plan.apiQuotaDaily || 100;
  const monthlyLimit = plan.apiQuotaMonthly || 1000;
  
  return {
    allowed: dailyUsage < dailyLimit,
    dailyUsage,
    dailyLimit,
    dailyRemaining: Math.max(0, dailyLimit - dailyUsage),
    monthlyUsage,
    monthlyLimit,
    monthlyRemaining: Math.max(0, monthlyLimit - monthlyUsage),
    resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
    planId: plan.id,
    isNearLimit: dailyUsage >= dailyLimit * 0.8
  };
};

/**
 * Логирование использования API
 * @param {Object} supabaseClient - экземпляр Supabase клиента
 * @param {Object} data - данные для логирования
 */
export const logApiUsage = async (supabaseClient, data) => {
  try {
    // Логируем запрос (без await для производительности)
    supabaseClient.from('api_usage_logs').insert([{
      api_key_id: data.apiKeyId,
      company_id: data.companyId,
      endpoint: data.endpoint,
      method: data.method,
      status_code: data.statusCode,
      response_time_ms: data.responseTimeMs,
      request_size_bytes: data.requestSizeBytes,
      response_size_bytes: data.responseSizeBytes,
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent || null,
      created_at: new Date().toISOString()
    }]).then(({ error }) => {
      if (error) console.warn('Failed to log API usage:', error);
    });
    
    // Инкремент счётчика (важно дождаться)
    const { error: incrementError } = await supabaseClient
      .rpc('increment_api_usage', { p_company_id: data.companyId });
    
    if (incrementError) {
      console.warn('Failed to increment API usage counter:', incrementError);
    }
    
  } catch (err) {
    console.warn('[API Usage] Failed to log:', err);
  }
};

/**
 * Получение статистики использования для компании
 */
export const getUsageStats = async (supabaseClient, companyId) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const [monthlyApps, monthlyUsers, dailyApi] = await Promise.all([
      supabaseClient
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', monthStart.toISOString()),
      
      supabaseClient
        .from('company_users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId),
      
      supabaseClient
        .from('api_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', dayStart.toISOString())
    ]);
    
    return {
      applications: monthlyApps?.count || 0,
      users: monthlyUsers?.count || 0,
      dailyApiCalls: dailyApi?.count || 0,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    return { applications: 0, users: 0, dailyApiCalls: 0, lastUpdated: null };
  }
};

/**
 * Проверка квоты через RPC функцию (альтернативный метод)
 */
export const checkQuotaViaRPC = async (supabaseClient, companyId, apiKeyId = null) => {
  try {
    const { data, error } = await supabaseClient.rpc('check_quota', {
      p_company_id: companyId,
      p_api_key_id: apiKeyId
    });
    
    if (error) throw error;
    return {
      allowed: data?.allowed ?? false,
      dailyUsage: data?.daily_usage ?? 0,
      dailyLimit: data?.daily_limit ?? 0,
      monthlyUsage: data?.monthly_usage ?? 0,
      monthlyLimit: data?.monthly_limit ?? 0,
      remaining: data?.remaining ?? 0
    };
  } catch (err) {
    console.error('checkQuotaViaRPC error:', err);
    return { allowed: true, error: err.message }; // Fail-open
  }
};

/**
 * Получение статистики использования для конкретного API ключа
 */
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
    totalRequests: data?.length || 0,
    successRequests: data?.filter(d => d.status_code >= 200 && d.status_code < 300).length || 0,
    errorRequests: data?.filter(d => d.status_code >= 400).length || 0,
    avgResponseTime: data?.length 
      ? Math.round(data.reduce((sum, d) => sum + (d.response_time_ms || 0), 0) / data.length)
      : 0,
    byEndpoint: {},
    byStatusCode: {}
  };
  
  (data || []).forEach(log => {
    stats.byEndpoint[log.endpoint] = (stats.byEndpoint[log.endpoint] || 0) + 1;
    stats.byStatusCode[log.status_code] = (stats.byStatusCode[log.status_code] || 0) + 1;
  });
  
  return stats;
};

/**
 * Обновление тарифного плана компании
 * @param {Object} supabaseClient - экземпляр Supabase клиента
 * @param {string} companyId - ID компании
 * @param {string} planId - ID нового плана
 * @param {number} usersCount - количество пользователей
 * @param {boolean} isAnnual - годовая оплата
 * @returns {Promise<Object>} - обновлённые данные компании
 */
export const updateCompanyPlan = async (
  supabaseClient, 
  companyId, 
  planId, 
  usersCount,
  isAnnual = false
) => {
  const plan = TARIFF_PLANS[planId];
  if (!plan) throw new Error(`Invalid plan ID: ${planId}`);
  
  // 🔐 Валидация входных данных
  if (!usersCount || usersCount < 1) {
    throw new Error('Количество пользователей должно быть не менее 1');
  }
  
  if (usersCount > (plan.maxUsers || 10)) {
    throw new Error(`Превышен лимит пользователей для тарифа "${plan.name}": макс. ${plan.maxUsers}`);
  }
  
  // 💰 Расчёт итоговой цены
  const extraUsers = Math.max(0, usersCount - (plan.includedUsers || 0));
  const extraCost = extraUsers * (plan.extraUserPrice || 0);
  const basePrice = isAnnual ? (plan.annualPrice || 0) : (plan.monthlyPrice || 0);
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
    
  if (error) {
    console.error('Ошибка обновления тарифа:', error);
    throw new Error(`Не удалось обновить тариф: ${error.message}`);
  }
  
  // 📝 Логируем изменение в audit_logs
  try {
    await supabaseClient.from('audit_logs').insert({
      company_id: companyId,
      action_type: 'plan_changed',
      entity_type: 'company',
      entity_id: companyId,
      old_value: { plan: data?.plan_tier, users: data?.users_count },
      new_value: { plan: planId, users: usersCount, price: calculatedPrice },
      user_id: null,
      created_at: new Date().toISOString()
    });
  } catch (logErr) {
    console.warn('Не удалось записать аудит изменения тарифа:', logErr);
  }
  
  return { ...data, calculatedPrice, usersCount };
};

export default TARIFF_PLANS;