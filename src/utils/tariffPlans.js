// src/utils/tariffPlans.js

import { supabase } from './supabaseClient';

// ============================================================
// 📦 КОНФИГУРАЦИЯ ТАРИФНЫХ ПЛАНОВ (РАСШИРЕННАЯ)
// ============================================================
//
// 💰 Сетка тарифов:
//    basic      - 0 ₽       — знакомство
//    micro      - 490 ₽     — небольшая бригада
//    pro        - 3 990 ₽   — растущая компания ⭐
//    business   - 7 490 ₽   — средний бизнес
//    enterprise - 13 990 ₽  — холдинги
//
// 🎯 Функции разделены на 3 категории:
//    Core       — базовые (создание заявок, склад, поддержка)
//    Advanced   — продвинутые (API, webhooks, аналитика, календарь, чат)
//    Premium    — премиум (SLA, SSO, мультикомпания, BI)
// ============================================================

export const TARIFF_PLANS = {
  // ============================================================
  // 🆓 БАЗОВЫЙ — 0 ₽
  // ============================================================
  basic: {
    id: 'basic',
    name: 'Базовый',
    monthlyPrice: 0,
    annualPrice: 0,
    apiQuotaMonthly: 50,
    apiQuotaDaily: 10,
    maxApiKeys: 0,
    maxUsers: 1,
    maxObjects: 1,
    maxApplicationsPerMonth: 10,
    features: {
      // Core
      create_applications: true,
      warehouse_view: true,
      warehouse_manage: false,
      email_support: true,
      basic_analytics: false,

      // Advanced
      api_access: false,
      webhooks: false,
      advanced_analytics: false,
      calendar: false,
      internal_chat: false,
      client_portal: false,
      partner_portal: false,
      document_generator: false,
      mobile_qr: false,
      kanban_board: false,

      // Premium
      priority_processing: false,
      sla_guarantee: false,
      custom_integration: false,
      multi_company: false,
      sso_ldap: false,
      support_247: false,
      personal_manager: false,
      bi_dashboards: false
    },
    popular: false,
    color: '#4A6572',
    tagline: 'Для знакомства с системой',
    highlights: [
      'До 10 заявок в месяц',
      '1 объект',
      'Только просмотр склада',
      'Email-поддержка'
    ]
  },

  // ============================================================
  // 🚀 МИКРО — 490 ₽
  // ============================================================
  micro: {
    id: 'micro',
    name: 'Микро',
    monthlyPrice: 490,
    annualPrice: 4900,
    apiQuotaMonthly: 1000,
    apiQuotaDaily: 100,
    maxApiKeys: 2,
    maxUsers: 5,
    maxObjects: 5,
    maxApplicationsPerMonth: 100,
    features: {
      // Core
      create_applications: true,
      warehouse_view: true,
      warehouse_manage: true,
      email_support: true,
      basic_analytics: true,

      // Advanced
      api_access: true,
      webhooks: false,
      advanced_analytics: false,
      calendar: false,
      internal_chat: false,
      client_portal: false,
      partner_portal: false,
      document_generator: true,
      mobile_qr: true,
      kanban_board: false,

      // Premium
      priority_processing: false,
      sla_guarantee: false,
      custom_integration: false,
      multi_company: false,
      sso_ldap: false,
      support_247: false,
      personal_manager: false,
      bi_dashboards: false
    },
    popular: false,
    color: '#6B8FA3',
    tagline: 'Для небольшой бригады',
    highlights: [
      'До 100 заявок в месяц',
      '5 объектов',
      'Полное управление складом',
      'Простая аналитика',
      'Документы (акты, сметы)',
      'QR-сканер',
      '2 API-ключа'
    ]
  },

  // ============================================================
  // 💼 ПРОФЕССИОНАЛЬНЫЙ — 3 990 ₽ ⭐
  // ============================================================
  pro: {
    id: 'pro',
    name: 'Профессиональный',
    monthlyPrice: 3990,
    annualPrice: 39900,
    apiQuotaMonthly: 15000,
    apiQuotaDaily: 1000,
    maxApiKeys: 10,
    maxUsers: 50,
    maxObjects: 50,
    maxApplicationsPerMonth: 1000,
    features: {
      // Core
      create_applications: true,
      warehouse_view: true,
      warehouse_manage: true,
      email_support: true,
      basic_analytics: true,

      // Advanced
      api_access: true,
      webhooks: true,
      advanced_analytics: true,
      calendar: true,
      internal_chat: true,
      client_portal: false,
      partner_portal: false,
      document_generator: true,
      mobile_qr: true,
      kanban_board: true,

      // Premium
      priority_processing: true,
      sla_guarantee: false,
      custom_integration: false,
      multi_company: false,
      sso_ldap: false,
      support_247: false,
      personal_manager: false,
      bi_dashboards: false
    },
    popular: true,
    color: '#F9AA33',
    tagline: 'Для растущей компании',
    highlights: [
      'До 1 000 заявок в месяц',
      '50 объектов',
      'Календарь + внутренний чат',
      'Kanban-доска задач',
      'Webhooks',
      'Расширенная аналитика',
      '10 API-ключей',
      'Приоритетная обработка'
    ]
  },

  // ============================================================
  // 🏢 БИЗНЕС — 7 490 ₽
  // ============================================================
  business: {
    id: 'business',
    name: 'Бизнес',
    monthlyPrice: 7490,
    annualPrice: 74900,
    apiQuotaMonthly: 60000,
    apiQuotaDaily: 5000,
    maxApiKeys: 25,
    maxUsers: 200,
    maxObjects: 200,
    maxApplicationsPerMonth: 5000,
    features: {
      // Core
      create_applications: true,
      warehouse_view: true,
      warehouse_manage: true,
      email_support: true,
      basic_analytics: true,

      // Advanced
      api_access: true,
      webhooks: true,
      advanced_analytics: true,
      calendar: true,
      internal_chat: true,
      client_portal: true,
      partner_portal: false,
      document_generator: true,
      mobile_qr: true,
      kanban_board: true,

      // Premium
      priority_processing: true,
      sla_guarantee: true,
      custom_integration: true,
      multi_company: false,
      sso_ldap: false,
      support_247: true,
      personal_manager: false,
      bi_dashboards: false
    },
    popular: false,
    color: '#3b82f6',
    tagline: 'Для среднего бизнеса',
    highlights: [
      'До 5 000 заявок в месяц',
      '200 объектов',
      'Портал для заказчиков',
      'SLA-гарантия 99.9%',
      'Кастомные интеграции',
      'Поддержка 24/7',
      '25 API-ключей'
    ]
  },

  // ============================================================
  // 👑 КОРПОРАТИВНЫЙ — 13 990 ₽
  // ============================================================
  enterprise: {
    id: 'enterprise',
    name: 'Корпоративный',
    monthlyPrice: 13990,
    annualPrice: 139900,
    apiQuotaMonthly: 200000,
    apiQuotaDaily: 20000,
    maxApiKeys: 100,
    maxUsers: 1000,
    maxObjects: -1,
    maxApplicationsPerMonth: -1,
    features: {
      // Core
      create_applications: true,
      warehouse_view: true,
      warehouse_manage: true,
      email_support: true,
      basic_analytics: true,

      // Advanced
      api_access: true,
      webhooks: true,
      advanced_analytics: true,
      calendar: true,
      internal_chat: true,
      client_portal: true,
      partner_portal: true,
      document_generator: true,
      mobile_qr: true,
      kanban_board: true,

      // Premium
      priority_processing: true,
      sla_guarantee: true,
      custom_integration: true,
      multi_company: true,
      sso_ldap: true,
      support_247: true,
      personal_manager: true,
      bi_dashboards: true
    },
    popular: false,
    color: '#7c3aed',
    tagline: 'Для холдингов и крупных компаний',
    highlights: [
      'Безлимит заявок и объектов',
      'Портал для партнёров',
      'Мультикомпания (холдинг)',
      'SSO / LDAP авторизация',
      'BI-дашборды',
      'Персональный менеджер',
      '100 API-ключей',
      'Всё включено'
    ]
  }
};

// ============================================================
// 🎯 КАТЕГОРИИ ФУНКЦИЙ (для UI)
// ============================================================

export const FEATURE_CATEGORIES = {
  core: {
    label: 'Базовые',
    description: 'Обязательные функции для работы',
    features: [
      { key: 'create_applications', label: '📋 Создание заявок', icon: '📋' },
      { key: 'warehouse_view', label: '👁 Просмотр склада', icon: '👁' },
      { key: 'warehouse_manage', label: '📦 Управление складом', icon: '📦' },
      { key: 'basic_analytics', label: '📊 Базовая аналитика', icon: '📊' },
      { key: 'email_support', label: '📧 Email-поддержка', icon: '📧' }
    ]
  },
  advanced: {
    label: 'Продвинутые',
    description: 'Для эффективной командной работы',
    features: [
      { key: 'api_access', label: '🔌 API доступ', icon: '🔌' },
      { key: 'webhooks', label: '🔔 Webhooks', icon: '🔔' },
      { key: 'advanced_analytics', label: '📈 Расширенная аналитика', icon: '📈' },
      { key: 'calendar', label: '📅 Календарь', icon: '📅' },
      { key: 'internal_chat', label: '💬 Внутренний чат', icon: '💬' },
      { key: 'client_portal', label: '👥 Портал заказчика', icon: '👥' },
      { key: 'partner_portal', label: '🤝 Портал партнёра', icon: '🤝' },
      { key: 'document_generator', label: '📄 Документы (акты, сметы)', icon: '📄' },
      { key: 'mobile_qr', label: '📱 QR-сканер (мобильный)', icon: '📱' },
      { key: 'kanban_board', label: '🎯 Kanban-доска', icon: '🎯' }
    ]
  },
  premium: {
    label: 'Премиум',
    description: 'Для крупных компаний и холдингов',
    features: [
      { key: 'priority_processing', label: '⚡ Приоритетная обработка', icon: '⚡' },
      { key: 'sla_guarantee', label: '🛡️ SLA-гарантия', icon: '🛡️' },
      { key: 'custom_integration', label: '🔧 Кастомная интеграция', icon: '🔧' },
      { key: 'multi_company', label: '🏢 Мультикомпания (холдинг)', icon: '🏢' },
      { key: 'sso_ldap', label: '🔐 SSO / LDAP', icon: '🔐' },
      { key: 'support_247', label: '📞 Поддержка 24/7', icon: '📞' },
      { key: 'personal_manager', label: '👤 Персональный менеджер', icon: '👤' },
      { key: 'bi_dashboards', label: '📈 BI-дашборды', icon: '📈' }
    ]
  }
};

// ============================================================
// 💰 КОНКУРЕНТЫ (для расчёта ROI)
// ============================================================

export const COMPETITORS = {
  bitrix24: {
    name: 'Bitrix24',
    basic: 1990,
    standard: 5990,
    professional: 11990
  },
  oneC: {
    name: '1С:ERP Строительство',
    perUser: 4526
  },
  industry: {
    name: 'Отраслевые решения',
    perOfficeUser: 1490
  }
};

// ============================================================
// 🏢 ПОЛУЧИТЬ ПЛАН КОМПАНИИ (С ДАТАМИ)
// ============================================================

export const getCompanyPlan = async (supabaseClient, companyId) => {
  const { data, error } = await supabaseClient
    .from('companies')
    .select('plan_tier, subscription_active, subscription_expires_at, plan_activated_at, api_usage_current, quota_reset_date')
    .eq('id', companyId)
    .single();

  if (error || !data) {
    return {
      ...TARIFF_PLANS.basic,
      isActive: false,
      expiresAt: null,
      activatedAt: null,
      usageCurrent: 0,
      quotaResetDate: null
    };
  }

  const plan = TARIFF_PLANS[data.plan_tier] || TARIFF_PLANS.basic;

  return {
    ...plan,
    isActive: data.subscription_active,
    expiresAt: data.subscription_expires_at,
    activatedAt: data.plan_activated_at,
    usageCurrent: data.api_usage_current,
    quotaResetDate: data.quota_reset_date
  };
};

// ============================================================
// 🔐 ПРОВЕРКА ДОСТУПА К ФУНКЦИИ
// ============================================================

export const checkFeatureAccess = (plan, feature) => {
  if (!plan || !plan.features) return false;
  return plan.features[feature] === true ||
         typeof plan.features[feature] === 'string';
};

// ============================================================
// 💰 РАСЧЁТ ЭКОНОМИИ
// ============================================================

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

// ============================================================
// 📊 СРАВНЕНИЕ ТАРИФОВ
// ============================================================

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
          objects: plan.maxObjects,
          applicationsPerMonth: plan.maxApplicationsPerMonth,
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

// ============================================================
// 🎯 РЕКОМЕНДАЦИЯ ТАРИФА
// ============================================================

export const recommendPlan = (stats) => {
  const { users = 0, applications = 0, objects = 0 } = stats || {};

  // Проверяем, что тариф подходит по всем трём параметрам
  // Если хотя бы один параметр превышает лимит — берём более высокий тариф

  if (users <= 1 && applications <= 10 && objects <= 1) return 'basic';
  if (users <= 5 && applications <= 100 && objects <= 5) return 'micro';
  if (users <= 50 && applications <= 1000 && objects <= 50) return 'pro';
  if (users <= 200 && applications <= 5000 && objects <= 200) return 'business';
  return 'enterprise';
};

// ============================================================
// 📊 ПРОВЕРКА КВОТЫ
// ============================================================

export const checkQuota = async (supabaseClient, companyId, apiKeyId = null) => {
  const now = new Date();

  let query = supabaseClient
    .from('api_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', now.toISOString().split('T')[0]);

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

// ============================================================
// 📝 ЛОГИРОВАНИЕ ИСПОЛЬЗОВАНИЯ API
// ============================================================

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

// ============================================================
// 📈 СТАТИСТИКА ПО КЛЮЧУ
// ============================================================

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

// ============================================================
// 📊 ПРОВЕРКА ЛИМИТА МАТЕРИАЛОВ
// ============================================================

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

// ============================================================
// 📈 УВЕЛИЧЕНИЕ СЧЁТЧИКА ЗАЯВОК
// ============================================================

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

// ============================================================
// 🔍 ПРОВЕРКА КВОТ ЧЕРЕЗ RPC
// ============================================================

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

// ============================================================
// 📝 ЛОГИРОВАНИЕ API ЧЕРЕЗ RPC
// ============================================================

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

// ============================================================
// 📊 ПОЛУЧИТЬ ВСЕ ТАРИФЫ
// ============================================================

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

// ============================================================
// 🔍 НАЙТИ ТАРИФ ПО ID
// ============================================================

export const findPlanById = (planId) => {
  return TARIFF_PLANS[planId] || null;
};

// ============================================================
// 📈 ПОЛУЧИТЬ СЛЕДУЮЩИЙ УРОВЕНЬ
// ============================================================

export const getNextTier = (currentPlanId) => {
  const tiers = ['basic', 'micro', 'pro', 'business', 'enterprise'];
  const currentIndex = tiers.indexOf(currentPlanId);

  if (currentIndex === -1 || currentIndex === tiers.length - 1) {
    return null;
  }

  return {
    id: tiers[currentIndex + 1],
    plan: TARIFF_PLANS[tiers[currentIndex + 1]]
  };
};

// ============================================================
// 📉 ПОЛУЧИТЬ ПРЕДЫДУЩИЙ УРОВЕНЬ
// ============================================================

export const getPreviousTier = (currentPlanId) => {
  const tiers = ['basic', 'micro', 'pro', 'business', 'enterprise'];
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
// 📈 ПРЕИМУЩЕСТВА АПГРЕЙДА
// ============================================================

export const getTariffUpgradeBenefits = (currentPlanId) => {
  const tiers = ['basic', 'micro', 'pro', 'business', 'enterprise'];
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

  const safePercent = (from, to) => {
    if (from === 0) return 0;
    return Math.round(((to - from) / from) * 100);
  };

  // Новые функции (которых не было в текущем тарифе)
  const newFeatures = [];
  Object.keys(nextPlan.features).forEach(key => {
    const currentVal = currentPlan.features[key];
    const nextVal = nextPlan.features[key];
    if (nextVal === true && currentVal !== true) {
      newFeatures.push(key);
    }
  });

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
      objects: {
        from: currentPlan.maxObjects,
        to: nextPlan.maxObjects,
        increase: nextPlan.maxObjects - currentPlan.maxObjects,
        percent: safePercent(currentPlan.maxObjects, nextPlan.maxObjects)
      },
      applicationsPerMonth: {
        from: currentPlan.maxApplicationsPerMonth,
        to: nextPlan.maxApplicationsPerMonth,
        increase: nextPlan.maxApplicationsPerMonth - currentPlan.maxApplicationsPerMonth,
        percent: safePercent(currentPlan.maxApplicationsPerMonth, nextPlan.maxApplicationsPerMonth)
      },
      newFeatures
    }
  };
};

// ============================================================
// 📊 ПРОВЕРКА ЛИМИТА ПО ТАРИФУ
// ============================================================

export const checkTariffLimit = (planId, limitType, currentValue) => {
  const plan = TARIFF_PLANS[planId];
  if (!plan) return { allowed: false, limit: 0 };

  const limits = {
    users: plan.maxUsers,
    apiKeys: plan.maxApiKeys,
    objects: plan.maxObjects,
    applicationsPerMonth: plan.maxApplicationsPerMonth,
    apiQuotaMonthly: plan.apiQuotaMonthly,
    apiQuotaDaily: plan.apiQuotaDaily,
  };

  const limit = limits[limitType];
  if (limit === undefined) return { allowed: true, limit: Infinity };
  if (limit === -1) return { allowed: true, limit: -1, remaining: -1, usagePercent: 0, isUnlimited: true };

  return {
    allowed: currentValue <= limit,
    limit: limit,
    remaining: Math.max(0, limit - currentValue),
    usagePercent: limit > 0 ? Math.round((currentValue / limit) * 100) : 0,
    isUnlimited: false
  };
};

// ============================================================
// 📊 ПОЛУЧИТЬ СТАТИСТИКУ ИСПОЛЬЗОВАНИЯ
// ============================================================

export const getUsageStats = async (companyId) => {
  try {
    const { count: applicationsCount } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString());

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

// ============================================================
// 💰 РАСЧЁТ ВЫГОДЫ ДЛЯ КЛИЕНТА (ROI-калькулятор)
// ============================================================

export const calculateClientSavings = (planId, usersCount = 10) => {
  const plan = TARIFF_PLANS[planId];
  if (!plan) return null;

  const bitrixPrice = usersCount <= 5 ? COMPETITORS.bitrix24.basic
    : usersCount <= 50 ? COMPETITORS.bitrix24.standard
    : COMPETITORS.bitrix24.professional;

  const oneCPrice = COMPETITORS.oneC.perUser * usersCount;

  const officeUsers = Math.ceil(usersCount * 0.3);
  const industryPrice = COMPETITORS.industry.perOfficeUser * officeUsers;

  const ourPrice = plan.monthlyPrice;

  return {
    plan: plan.name,
    ourPrice,
    usersCount,
    competitors: {
      bitrix24: {
        price: bitrixPrice,
        savings: bitrixPrice - ourPrice,
        savingsPercent: Math.round(((bitrixPrice - ourPrice) / bitrixPrice) * 100)
      },
      oneC: {
        price: oneCPrice,
        savings: oneCPrice - ourPrice,
        savingsPercent: Math.round(((oneCPrice - ourPrice) / oneCPrice) * 100)
      },
      industry: {
        price: industryPrice,
        savings: industryPrice - ourPrice,
        savingsPercent: Math.round(((industryPrice - ourPrice) / industryPrice) * 100)
      }
    }
  };
};

// ============================================================
// 💰 СРЕДНЯЯ ЦЕНА ПО РЫНКУ
// ============================================================

export const getMarketAverage = (usersCount = 10) => {
  const bitrix = usersCount <= 5 ? COMPETITORS.bitrix24.basic
    : usersCount <= 50 ? COMPETITORS.bitrix24.standard
    : COMPETITORS.bitrix24.professional;
  const oneC = COMPETITORS.oneC.perUser * usersCount;
  const industry = COMPETITORS.industry.perOfficeUser * Math.ceil(usersCount * 0.3);

  return {
    average: Math.round((bitrix + oneC + industry) / 3),
    min: Math.min(bitrix, oneC, industry),
    max: Math.max(bitrix, oneC, industry),
    breakdown: { bitrix, oneC, industry }
  };
};

// ============================================================
// 📈 ПОЗИЦИОНИРОВАНИЕ НАШЕГО ТАРИФА
// ============================================================

export const getOurPosition = (planId, usersCount = 10) => {
  const plan = TARIFF_PLANS[planId];
  const market = getMarketAverage(usersCount);
  if (!plan) return null;

  const ourPrice = plan.monthlyPrice;
  const position = ourPrice / market.average;

  return {
    ourPrice,
    marketAverage: market.average,
    ratio: Math.round(position * 100),
    label: position < 0.5 ? '🔥 Значительно ниже рынка'
      : position < 0.8 ? '✅ Ниже рынка'
      : position < 1.1 ? '⚖️ На уровне рынка'
      : '💎 Премиум',
    savings: market.average - ourPrice,
    savingsPercent: Math.round(((market.average - ourPrice) / market.average) * 100)
  };
};

// ============================================================
// 🎁 АДДОНЫ (дополнительные опции к любому тарифу)
// ============================================================

export const ADDONS = {
  extraUsers5: {
    id: 'extraUsers5',
    name: '+5 пользователей',
    monthlyPrice: 990,
    description: 'Дополнительные 5 пользователей к вашему тарифу'
  },
  extraUsers20: {
    id: 'extraUsers20',
    name: '+20 пользователей',
    monthlyPrice: 2990,
    description: 'Дополнительные 20 пользователей к вашему тарифу'
  },
  extraApi10k: {
    id: 'extraApi10k',
    name: '+10 000 API-запросов',
    monthlyPrice: 490,
    description: 'Дополнительные 10 000 запросов в месяц'
  },
  extraApi50k: {
    id: 'extraApi50k',
    name: '+50 000 API-запросов',
    monthlyPrice: 1990,
    description: 'Дополнительные 50 000 запросов в месяц'
  },
  customIntegration: {
    id: 'customIntegration',
    name: 'Кастомная интеграция',
    monthlyPrice: 0,
    oneTimePrice: 15000,
    description: 'Разработка индивидуальной интеграции под ваши задачи'
  },
  prioritySupport: {
    id: 'prioritySupport',
    name: 'Приоритетная поддержка 24/7',
    monthlyPrice: 2000,
    description: 'SLA 1 час, персональный менеджер'
  }
};

export const getAllAddons = () => Object.values(ADDONS);

export const findAddonById = (addonId) => ADDONS[addonId] || null;

export default TARIFF_PLANS;