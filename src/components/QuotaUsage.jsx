// src/components/QuotaUsage.jsx
import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { checkQuota, getUsageStats } from '../utils/tariffPlans';

const QuotaUsage = ({ userCompanyId, supabase }) => {
  const [quota, setQuota] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotaData();
  }, [userCompanyId]);

  const loadQuotaData = async () => {
    try {
      const [quotaData, statsData] = await Promise.all([
        checkQuota(supabase, userCompanyId),
        getUsageStats(userCompanyId, 'month')
      ]);
      setQuota(quotaData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load quota:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      </div>
    );
  }

  const dailyPercent = (quota.dailyUsage / quota.dailyLimit) * 100;
  const monthlyPercent = (quota.monthlyUsage / quota.monthlyLimit) * 100;
  const isWarning = dailyPercent > 80 || monthlyPercent > 80;
  const isExceeded = dailyPercent >= 100 || monthlyPercent >= 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Использование API
        </h3>
        {isExceeded ? (
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Лимит превышен
          </span>
        ) : isWarning ? (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Близко к лимиту
          </span>
        ) : (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            В норме
          </span>
        )}
      </div>

      {/* Дневной лимит */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Дневной лимит</span>
          <span className="font-medium">
            {quota.dailyUsage.toLocaleString()} / {quota.dailyLimit.toLocaleString()}
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              isExceeded ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, dailyPercent)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Осталось: {quota.dailyRemaining.toLocaleString()} запросов
        </p>
      </div>

      {/* Месячный лимит */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Месячный лимит</span>
          <span className="font-medium">
            {quota.monthlyUsage.toLocaleString()} / {quota.monthlyLimit.toLocaleString()}
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              monthlyPercent > 80 ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, monthlyPercent)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Сброс: {new Date(quota.resetAt).toLocaleDateString('ru-RU')}
        </p>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalRequests}
            </p>
            <p className="text-xs text-gray-500">Всего запросов</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {stats.successRequests}
            </p>
            <p className="text-xs text-gray-500">Успешных</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(stats.avgResponseTime)}ms
            </p>
            <p className="text-xs text-gray-500">Ср. время</p>
          </div>
        </div>
      )}

      {/* Кнопка апгрейда */}
      {isWarning && (
        <div className="mt-6 p-4 bg-gradient-to-r from-[#F9AA33]/10 to-[#F57C00]/10 rounded-xl border border-[#F9AA33]/20">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            ⚠️ Вы близки к исчерпанию лимита. Рассмотрите переход на тариф Профи.
          </p>
          <button className="px-4 py-2 bg-[#F9AA33] text-white rounded-lg text-sm font-medium hover:bg-[#F57C00] transition-colors">
            Увеличить лимит
          </button>
        </div>
      )}
    </div>
  );
};

export default QuotaUsage;