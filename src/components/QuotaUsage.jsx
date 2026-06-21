import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, Package, TrendingUp, Calendar } from 'lucide-react';
import { checkQuota, getUsageStats, getCompanyPlan } from '../utils/tariffPlans';

const QuotaUsage = ({ 
  userCompanyId, 
  supabase,
  currentPlan,
  onUpgradeClick,
  showDetailed = false,
  className = ''
}) => {
  const [quota, setQuota] = useState(null);
  const [stats, setStats] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userCompanyId && supabase) {
      loadQuotaData();
    }
  }, [userCompanyId, supabase]);

  const loadQuotaData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [quotaData, statsData, planData] = await Promise.all([
        checkQuota(supabase, userCompanyId),
        getUsageStats(supabase, userCompanyId),
        getCompanyPlan(supabase, userCompanyId)
      ]);
      
      setQuota(quotaData);
      setStats(statsData);
      setPlan(planData);
    } catch (err) {
      console.error('Failed to load quota:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    loadQuotaData();
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

  const isBasicPlan = currentPlan?.id === 'basic' || plan?.id === 'basic';
  
  // Лимиты заявок для бесплатного тарифа
  const appQuota = quota || { used: 0, limit: 5, remaining: 5, allowed: true };
  const appPercent = appQuota.limit > 0 ? Math.round((appQuota.used / appQuota.limit) * 100) : 0;
  const isAppWarning = appPercent > 80 && appPercent < 100;
  const isAppExceeded = appPercent >= 100;

  // API лимиты
  const dailyPercent = quota?.dailyLimit ? (quota.dailyUsage / quota.dailyLimit) * 100 : 0;
  const monthlyPercent = quota?.monthlyLimit ? (quota.monthlyUsage / quota.monthlyLimit) * 100 : 0;
  const isApiWarning = dailyPercent > 80 || monthlyPercent > 80;
  const isApiExceeded = dailyPercent >= 100 || monthlyPercent >= 100;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Использование лимитов
        </h3>
        <div className="flex items-center gap-2">
          {isBasicPlan && (
            appQuota.allowed ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                {appQuota.remaining} заявок
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Лимит исчерпан
              </span>
            )
          )}
          <button
            onClick={refresh}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Обновить"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* БЛОК 1: Лимиты заявок (для бесплатного тарифа) */}
      {isBasicPlan && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm">
                Лимит заявок (бесплатный тариф)
              </span>
            </div>
            {isAppExceeded ? (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                ⚠️ Исчерпан
              </span>
            ) : isAppWarning ? (
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                ⚠️ Почти исчерпан
              </span>
            ) : (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                ✅ Есть место
              </span>
            )}
          </div>
          
          <div className="mb-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Заявки сегодня</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {appQuota.used} / {appQuota.limit}
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full transition-all duration-500 ${
                  isAppExceeded ? 'bg-red-500' : 
                  isAppWarning ? 'bg-orange-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(100, appPercent)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {isAppExceeded 
                ? '⚠️ Лимит исчерпан. Обновите тариф.' 
                : `Осталось ${appQuota.remaining} заявок. Сброс в 00:00`}
            </p>
          </div>

          {isAppExceeded && onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="w-full mt-2 py-2 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white font-medium rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              <TrendingUp className="w-4 h-4" />
              🚀 Увеличить лимиты
            </button>
          )}
        </div>
      )}

      {/* БЛОК 2: API лимиты */}
      {quota && (
        <>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">API дневной лимит</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {quota.dailyUsage.toLocaleString()} / {quota.dailyLimit.toLocaleString()}
              </span>
            </div>
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isApiExceeded ? 'bg-red-500' : isApiWarning ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, dailyPercent)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Осталось: {quota.dailyRemaining.toLocaleString()} запросов
            </p>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">API месячный лимит</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {quota.monthlyUsage.toLocaleString()} / {quota.monthlyLimit.toLocaleString()}
              </span>
            </div>
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  monthlyPercent > 80 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, monthlyPercent)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Сброс: {quota.resetAt ? new Date(quota.resetAt).toLocaleDateString('ru-RU') : '—'}
            </p>
          </div>
        </>
      )}

      {/* БЛОК 3: Статистика использования */}
      {stats && showDetailed && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.applications || 0}
            </p>
            <p className="text-xs text-gray-500">Заявок за месяц</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.users || 0}
            </p>
            <p className="text-xs text-gray-500">Пользователей</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan?.maxUsers || 3}
            </p>
            <p className="text-xs text-gray-500">Макс. пользователей</p>
          </div>
        </div>
      )}

      {/* БЛОК 4: Кнопка апгрейда */}
      {isBasicPlan && !isAppExceeded && isAppWarning && onUpgradeClick && (
        <div className="mt-4 p-3 bg-gradient-to-r from-[#F9AA33]/10 to-[#F57C00]/10 rounded-xl border border-[#F9AA33]/20">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            ⚠️ Вы близки к исчерпанию лимита заявок ({appQuota.used}/{appQuota.limit}).
          </p>
          <button
            onClick={onUpgradeClick}
            className="w-full py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Перейти на Профи тариф
          </button>
        </div>
      )}

      {/* БЛОК 5: Информация о тарифе */}
      {plan && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>📋 Тариф: <span className="font-medium">{plan.name}</span></span>
            {isBasicPlan && (
              <>
                <span>📦 Материалов: до 20 в заявке</span>
                <span>👥 Пользователей: до {plan.maxUsers}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotaUsage;