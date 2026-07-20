// src/utils/kpiConfig.js

// KPI конфигурация для отслеживания метрик бизнеса
// Финансовые метрики (скрыты для мастера и прораба):
// - trial_conversion, churn_rate, ltv, cac, payback_period
// Базовые метрики (видны всем):
// - active_users, avg_response_time

export const KPI_TARGETS = {
  // === ФИНАНСОВЫЕ МЕТРИКИ (скрыты для мастера) ===
  trial_conversion: { 
    min: 15, 
    target: 25, 
    unit: '%', 
    label: 'Конверсия из триала', 
    priority: 'high',
    category: 'financial'
  },
  churn_rate: { 
    min: 0, 
    target: 5, 
    unit: '%', 
    label: 'Отток клиентов', 
    priority: 'high', 
    inverse: true,
    category: 'financial'
  },
  ltv: { 
    min: 25000, 
    target: 50000, 
    unit: '₽', 
    label: 'LTV (жизненная ценность)', 
    priority: 'high',
    category: 'financial'
  },
  cac: { 
    min: 5000, 
    target: 10000, 
    unit: '₽', 
    label: 'CAC (стоимость привлечения)', 
    priority: 'high', 
    inverse: true,
    category: 'financial'
  },
  payback_period: { 
    min: 3, 
    target: 6, 
    unit: 'мес', 
    label: 'Окупаемость', 
    priority: 'medium', 
    inverse: true,
    category: 'financial'
  },
  
  // === БАЗОВЫЕ МЕТРИКИ (видны всем) ===
  active_users: { 
    min: 10, 
    target: 50, 
    unit: '', 
    label: 'Активные пользователи', 
    priority: 'medium',
    category: 'basic'
  },
  avg_response_time: { 
    min: 24, 
    target: 6, 
    unit: 'ч', 
    label: 'Среднее время ответа', 
    priority: 'medium', 
    inverse: true,
    category: 'basic'
  }
};

// Расчет метрик
export const calculateKPIs = (data) => {
  const {
    companies = [],
    applications = [],
    payments = [],
    comments = []
  } = data;

  // 1. Trial conversion (конверсия из триала в платных пользователей)
  const trialUsers = companies.filter(c => c.plan_tier === 'trial' && !c.is_blocked).length;
  const payingUsers = companies.filter(c => c.plan_tier !== 'trial' && c.plan_tier !== 'basic' && !c.is_blocked).length;
  const trial_conversion = trialUsers ? Math.round((payingUsers / trialUsers) * 100) : 0;

  // 2. Churn rate (отток клиентов за месяц)
  const now = new Date();
  const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
  const usersStartMonth = companies.filter(c => new Date(c.created_at) < monthAgo).length;
  const usersEndMonth = companies.filter(c => !c.is_blocked && new Date(c.created_at) < monthAgo).length;
  const lostUsers = usersStartMonth - usersEndMonth;
  const churn_rate = usersStartMonth ? Math.round((lostUsers / usersStartMonth) * 100) : 0;

  // 3. LTV (Lifetime Value)
  const avgMonthlyPayment = payments.length ? payments.reduce((sum, p) => sum + p.amount, 0) / payments.length / 12 : 10000;
  const avgCustomerLifetime = 6; // среднее время жизни клиента в месяцах
  const ltv = Math.round(avgMonthlyPayment * avgCustomerLifetime);

  // 4. CAC (Customer Acquisition Cost)
  const totalMarketingCosts = 50000; // TODO: брать из реальных данных
  const newCustomersLastMonth = companies.filter(c => {
    const createdAt = new Date(c.created_at);
    const monthAgoCAC = new Date();
    monthAgoCAC.setMonth(monthAgoCAC.getMonth() - 1);
    return createdAt > monthAgoCAC;
  }).length;
  const cac = newCustomersLastMonth ? Math.round(totalMarketingCosts / newCustomersLastMonth) : KPI_TARGETS.cac.target;

  // 5. Payback period
  const payback_period = Number((cac / (avgMonthlyPayment || 10000)).toFixed(1));

  // 6. Active users (пользователи, создавшие заявку за последние 7 дней)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const activeUserIds = new Set(applications.filter(a => new Date(a.created_at) > weekAgo).map(a => a.user_id));
  const active_users = activeUserIds.size;

  // 7. Avg response time (среднее время от заявки до первого комментария)
  let totalResponseTime = 0;
  let responseCount = 0;
  applications.forEach(app => {
    const appComments = comments.filter(c => c.application_id === app.id) || [];
    if (appComments.length > 0 && appComments[0].created_at) {
      const responseTime = (new Date(appComments[0].created_at) - new Date(app.created_at)) / (1000 * 60 * 60);
      if (responseTime > 0 && responseTime < 168) { // меньше недели
        totalResponseTime += responseTime;
        responseCount++;
      }
    }
  });
  const avg_response_time = responseCount ? Number((totalResponseTime / responseCount).toFixed(1)) : 24;

  return {
    trial_conversion,
    churn_rate,
    ltv,
    cac,
    payback_period,
    active_users,
    avg_response_time,
    timestamp: new Date().toISOString()
  };
};

// Получение статуса метрики (отлично/норма/плохо)
export const getMetricStatus = (metricName, value) => {
  const config = KPI_TARGETS[metricName];
  if (!config) return 'unknown';
  
  const { min, target, inverse } = config;
  
  if (inverse) {
    if (value <= target) return 'excellent';
    if (value <= min) return 'good';
    return 'bad';
  } else {
    if (value >= target) return 'excellent';
    if (value >= min) return 'good';
    return 'bad';
  }
};

// Получение цвета для метрики
export const getMetricColor = (metricName, value) => {
  const status = getMetricStatus(metricName, value);
  switch (status) {
    case 'excellent': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    case 'good': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    case 'bad': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
  }
};