// src/components/QuotaUsage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Package, 
  TrendingUp, 
  Calendar, 
  Users, 
  Key, 
  Database,
  BarChart3,
  Clock,
  Zap,
  Shield,
  Crown,
  ArrowUp,
  Info
} from 'lucide-react';
import { 
  checkQuota, 
  getUsageStats, 
  getCompanyPlan,
  TARIFF_PLANS,
  getTariffUpgradeBenefits
} from '../utils/tariffPlans';

const QuotaUsage = ({ 
  userCompanyId, 
  supabase,
  currentPlan,
  onUpgradeClick,
  showDetailed = false,
  className = '',
  onRefresh = null
}) => {
  const [quota, setQuota] = useState(null);
  const [stats, setStats] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upgradeBenefits, setUpgradeBenefits] = useState(null);

  const loadQuotaData = useCallback(async () => {
    // ✅ ФИКС: Проверяем, что userCompanyId - строка
    if (!userCompanyId || !supabase) return;
    
    // ✅ Преобразуем в строку, если это объект
    const companyId = typeof userCompanyId === 'string' 
      ? userCompanyId 
      : userCompanyId?.toString?.() || null;
    
    if (!companyId || companyId === '[object Object]') {
      console.warn('QuotaUsage: некорректный companyId:', userCompanyId);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const [quotaData, statsData, planData] = await Promise.all([
        checkQuota(supabase, companyId),
        getUsageStats(supabase, companyId),
        getCompanyPlan(supabase, companyId)
      ]);
      
      setQuota(quotaData);
      setStats(statsData);
      setPlan(planData);
      
      if (planData?.id) {
        const benefits = getTariffUpgradeBenefits(planData.id);
        setUpgradeBenefits(benefits);
      }
      
    } catch (err) {
      console.error('Failed to load quota:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, supabase]);

  useEffect(() => {
    loadQuotaData();
  }, [loadQuotaData]);

  const refresh = () => {
    loadQuotaData();
    if (onRefresh) onRefresh();
  };

  const getPlanLevel = (planId) => {
    const levels = ['basic', 'starter', 'pro', 'business', 'enterprise'];
    return levels.indexOf(planId) + 1;
  };

  const getPlanIcon = (planId) => {
    const icons = {
      basic: '🆓',
      starter: '🚀',
      pro: '💼',
      business: '🏢',
      enterprise: '👑'
    };
    return icons[planId] || '📦';
  };

  const getPlanColor = (planId) => {
    const colors = {
      basic: 'gray',
      starter: 'blue',
      pro: 'yellow',
      business: 'indigo',
      enterprise: 'purple'
    };
    return colors[planId] || 'gray';
  };

  const getProgressColor = (percent) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-orange-500';
    if (percent >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 ${className}`}>
        <p className="text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Ошибка загрузки лимитов: {error}
        </p>
        <button 
          onClick={refresh}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  const planId = plan?.id || currentPlan || 'basic';
  const isEnterprisePlan = planId === 'enterprise';
  const planData = TARIFF_PLANS[planId] || TARIFF_PLANS.basic;
  
  const dailyPercent = quota?.dailyLimit ? (quota.dailyUsage / quota.dailyLimit) * 100 : 0;
  const monthlyPercent = quota?.monthlyLimit ? (quota.monthlyUsage / quota.monthlyLimit) * 100 : 0;
  const usersPercent = planData.maxUsers > 0 ? ((stats?.users || 0) / planData.maxUsers) * 100 : 0;

  const planColor = getPlanColor(planId);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-${planColor}-100 dark:bg-${planColor}-900/20`}>
            <Activity className={`w-5 h-5 text-${planColor}-600 dark:text-${planColor}-400`} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Использование лимитов
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                {getPlanIcon(planId)} {planData.name}
              </span>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                Уровень {getPlanLevel(planId)}/5
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Обновить"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Основная статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Пользователи</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.users || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            из {planData.maxUsers}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">API ключи</span>
            <Key className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.apiKeys || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            из {planData.maxApiKeys}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Запросов/мес</span>
            <Database className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {quota?.monthlyUsage?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            из {planData.apiQuotaMonthly.toLocaleString()}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Доступно</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {quota?.allowed ? '✅ Да' : '❌ Нет'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {quota?.dailyRemaining?.toLocaleString() || 0} запросов сегодня
          </p>
        </div>
      </div>

      {/* Прогресс-бары */}
      <div className="space-y-4">
        {/* API дневной лимит */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              API дневной лимит
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {quota?.dailyUsage?.toLocaleString() || 0} / {planData.apiQuotaDaily.toLocaleString()}
            </span>
          </div>
          <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor(dailyPercent)}`}
              style={{ width: `${Math.min(100, dailyPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Осталось: {quota?.dailyRemaining?.toLocaleString() || 0}</span>
            <span>{Math.round(dailyPercent)}%</span>
          </div>
        </div>

        {/* API месячный лимит */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              API месячный лимит
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {quota?.monthlyUsage?.toLocaleString() || 0} / {planData.apiQuotaMonthly.toLocaleString()}
            </span>
          </div>
          <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                monthlyPercent >= 100 ? 'bg-red-500' :
                monthlyPercent >= 80 ? 'bg-orange-500' :
                monthlyPercent >= 60 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, monthlyPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Осталось: {quota?.monthlyRemaining?.toLocaleString() || 0}</span>
            <span>{Math.round(monthlyPercent)}%</span>
          </div>
          {quota?.resetAt && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Сброс: {new Date(quota.resetAt).toLocaleDateString('ru-RU')}
            </p>
          )}
        </div>

        {/* Пользователи */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Users className="w-4 h-4" />
              Использование пользователей
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {stats?.users || 0} / {planData.maxUsers}
            </span>
          </div>
          <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getProgressColor(usersPercent)}`}
              style={{ width: `${Math.min(100, usersPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Свободно: {Math.max(0, planData.maxUsers - (stats?.users || 0))}</span>
            <span>{Math.round(usersPercent)}%</span>
          </div>
        </div>
      </div>

      {/* Преимущества апгрейда */}
      {upgradeBenefits && !isEnterprisePlan && (
        <div className="mt-6 p-4 bg-gradient-to-r from-[#F9AA33]/10 to-[#F57C00]/10 rounded-xl border border-[#F9AA33]/20">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-[#F9AA33]/20 rounded-lg">
              <ArrowUp className="w-4 h-4 text-[#F9AA33]" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                Перейдите на {upgradeBenefits.name}
              </h4>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {upgradeBenefits.benefits.users.increase > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    👥 +{upgradeBenefits.benefits.users.increase} пользователей
                  </div>
                )}
                {upgradeBenefits.benefits.apiQuotaMonthly.increase > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    📊 +{upgradeBenefits.benefits.apiQuotaMonthly.increase.toLocaleString()} запросов/мес
                  </div>
                )}
                {upgradeBenefits.benefits.apiKeys.increase > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    🔑 +{upgradeBenefits.benefits.apiKeys.increase} API ключей
                  </div>
                )}
                {upgradeBenefits.benefits.prioritySupport && (
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    ⚡ Приоритетная поддержка
                  </div>
                )}
                {upgradeBenefits.benefits.hasSla && (
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    🛡️ SLA гарантия
                  </div>
                )}
                {upgradeBenefits.benefits.newFeatures.length > 0 && (
                  <div className="text-xs text-gray-600 dark:text-gray-300 col-span-2">
                    ✨ Новые функции: {upgradeBenefits.benefits.newFeatures.map(f => {
                      const labels = {
                        webhooks: 'Webhooks',
                        customIntegration: 'Кастомная интеграция',
                        analytics: 'Аналитика'
                      };
                      return labels[f] || f;
                    }).join(', ')}
                  </div>
                )}
              </div>
            </div>
            {onUpgradeClick && (
              <button
                onClick={onUpgradeClick}
                className="px-4 py-2 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all whitespace-nowrap"
              >
                Апгрейд →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Детальная информация */}
      {showDetailed && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.applications || 0}
              </p>
              <p className="text-xs text-gray-500">Заявок за месяц</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.materials || 0}
              </p>
              <p className="text-xs text-gray-500">Материалов</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {planData.maxUsers}
              </p>
              <p className="text-xs text-gray-500">Макс. пользователей</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {planData.maxApiKeys}
              </p>
              <p className="text-xs text-gray-500">Макс. API ключей</p>
            </div>
          </div>
        </div>
      )}

      {/* Информация о тарифе */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>📋 Тариф: <span className="font-medium text-gray-700 dark:text-gray-300">{planData.name}</span></span>
          <span>📦 Материалов: до {planData.features.warehouse ? '∞' : '20'} в заявке</span>
          <span>👥 Пользователей: до {planData.maxUsers}</span>
          {planData.features.support && (
            <span>💬 Поддержка: {planData.features.support}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuotaUsage;