// src/components/TariffSelector.jsx
import React, { useState, useCallback } from 'react';
import { 
  Calendar, Clock, Gift, CheckCircle, Check, X, 
  TrendingUp, Package 
} from 'lucide-react';
import { TARIFF_PLANS, calculateSavings } from '../utils/tariffPlans';

const TariffSelector = ({ 
  currentPlan = 'basic', 
  billingPeriod: externalBillingPeriod,
  onBillingPeriodChange,
  onSelectPlan, 
  isLoading = false,
  t,
  onPromoClick,
  currentPlanDetails,
  promoCodeInfo,
  quotaStatus,
  onUpgradeClick
}) => {
  // ============================================================
  // 🔥 ЗАЩИТА ОТ ОШИБОК
  // ============================================================

  // БЕЗОПАСНАЯ ФУНКЦИЯ ПЕРЕВОДА — ЕСЛИ t НЕ ФУНКЦИЯ, ВОЗВРАЩАЕМ FALLBACK
  const translate = useCallback((key, fallback) => {
    if (typeof t !== 'function') {
      return fallback || key;
    }
    try {
      const result = t(key);
      return (result === key || !result) ? (fallback || key) : result;
    } catch {
      // Игнорируем ошибку перевода
      return fallback || key;
    }
  }, [t]);

  // БЕЗОПАСНОЕ ФОРМАТИРОВАНИЕ ДАТЫ
  const formatDate = useCallback((dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  }, []);

  // БЕЗОПАСНЫЙ РАСЧЁТ ДНЕЙ
  const getDaysLeft = useCallback((expiresAt) => {
    if (!expiresAt) return null;
    try {
      const diff = new Date(expiresAt) - new Date();
      if (isNaN(diff)) return null;
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }, []);

  const plans = TARIFF_PLANS || {};
  const hasPlans = Object.keys(plans).length > 0;

  const isBasicPlan = currentPlan === 'basic';
  const safeQuota = quotaStatus || { allowed: true, used: 0, limit: 5, remaining: 5 };
  const quotaPercent = safeQuota.limit > 0 
    ? Math.round((safeQuota.used / safeQuota.limit) * 100) 
    : 0;

  const [internalBillingPeriod, setInternalBillingPeriod] = useState('monthly');
  const billingPeriod = externalBillingPeriod !== undefined ? externalBillingPeriod : internalBillingPeriod;
  
  const setBillingPeriod = useCallback((period) => {
    if (onBillingPeriodChange) {
      onBillingPeriodChange(period);
    } else {
      setInternalBillingPeriod(period);
    }
  }, [onBillingPeriodChange]);

  // ЕСЛИ НЕТ ПЛАНОВ — ПОКАЗЫВАЕМ ЗАГРУЗКУ
  if (!hasPlans) {
    return (
      <div className="max-w-7xl mx-auto p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A6572] mx-auto"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Загрузка тарифов...</p>
      </div>
    );
  }

  // ============================================================
  // ОСНОВНОЙ РЕНДЕР
  // ============================================================
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Блок статуса лимитов */}
      {isBasicPlan && safeQuota && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-yellow-600" />
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                📋 Использование лимитов
              </h4>
            </div>
            {safeQuota.allowed ? (
              <span className="text-xs text-green-600 dark:text-green-400">✅ Есть место</span>
            ) : (
              <span className="text-xs text-red-600 dark:text-red-400">⚠️ Лимит исчерпан</span>
            )}
          </div>
          
          <div className="mb-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Заявки</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {safeQuota.used} / {safeQuota.limit}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full transition-all duration-500 ${
                  !safeQuota.allowed ? 'bg-red-500' : 
                  quotaPercent >= 80 ? 'bg-orange-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(100, quotaPercent)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {!safeQuota.allowed 
                ? '⚠️ Лимит исчерпан. Обновите тариф.'
                : `Осталось ${safeQuota.remaining} заявок`}
            </p>
          </div>
          
          {!safeQuota.allowed && onUpgradeClick && (
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
      
      {/* Блок информации о текущем тарифе */}
      {currentPlanDetails && currentPlanDetails.activated_at && (
        <div className="mb-8 bg-gradient-to-r from-[#4A6572]/10 to-[#344955]/10 rounded-xl p-5 border border-[#4A6572]/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {translate('currentPlanInfo', 'Информация о текущем тарифе')}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  {translate('activationDate', 'Дата активации')}:
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(currentPlanDetails.activated_at)}
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  {translate('expirationDate', 'Дата окончания')}:
                </p>
                <p className={`font-medium ${
                  getDaysLeft(currentPlanDetails.expires_at) !== null &&
                  getDaysLeft(currentPlanDetails.expires_at) <= 7 
                    ? 'text-orange-600 dark:text-orange-400' 
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {formatDate(currentPlanDetails.expires_at)}
                  {getDaysLeft(currentPlanDetails.expires_at) !== null && (
                    <span className="text-xs ml-2 text-gray-500">
                      (осталось {getDaysLeft(currentPlanDetails.expires_at)} дн.)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          {promoCodeInfo && promoCodeInfo.code && (
            <div className="mt-3 pt-3 border-t border-[#4A6572]/20 flex items-start gap-2">
              <Gift className="w-4 h-4 text-[#F9AA33] mt-0.5" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  {translate('promoCodeApplied', 'Активирован промокод')}:
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {promoCodeInfo.code}
                  {promoCodeInfo.discount_percent && (
                    <span className="text-green-600 text-sm ml-2">
                      (скидка {promoCodeInfo.discount_percent}%)
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {translate('appliedAt', 'Активирован')}: {formatDate(promoCodeInfo.applied_at)}
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={() => onSelectPlan && onSelectPlan(currentPlan)}
            className="mt-4 w-full py-2 bg-[#4A6572]/20 text-[#4A6572] dark:text-[#F9AA33] rounded-lg text-sm font-medium hover:bg-[#4A6572]/30 transition-colors"
          >
            {translate('extendPlan', 'Продлить тариф')}
          </button>
        </div>
      )}
      
      {/* Заголовок */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {translate('tariffSelector.title', 'Выберите подходящий тариф')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {translate('tariffSelector.trial', 'Все тарифы включают 14 дней бесплатного пробного периода')}
        </p>
        
        <div className="inline-flex items-center gap-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-2">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {translate('tariffSelector.monthly', 'Ежемесячно')}
          </button>
          <button
            onClick={() => setBillingPeriod('annual')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              billingPeriod === 'annual'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {translate('tariffSelector.annual', 'Ежегодно')}
            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              -17%
            </span>
          </button>
        </div>
      </div>

      {/* Карточки тарифов */}
      <div className="grid md:grid-cols-3 gap-6">
        {Object.values(plans).map((plan) => {
          if (!plan || !plan.id) return null;
          
          const price = billingPeriod === 'monthly' ? (plan.monthlyPrice || 0) : (plan.annualPrice || 0);
          const savings = calculateSavings(plan) || { monthlyTotal: 0, savings: 0, savingsPercent: 0 };
          const isCurrent = currentPlan === plan.id;
          const isPopular = plan.popular || false;
          const isUnlimited = plan.maxApplications === -1;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 transition-all ${
                isCurrent
                  ? 'border-[#4A6572] bg-[#4A6572]/5'
                  : isPopular
                  ? 'border-[#F9AA33] bg-[#F9AA33]/5'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              {isPopular && !isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#F9AA33] text-white text-sm font-bold rounded-full">
                  {translate('tariffSelector.popular', 'Популярный')}
                </div>
              )}

              <div className="p-6">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {translate(`tariff.plans.${plan.id}.name`, plan.name || 'Тариф')}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {price === 0 ? 'Бесплатно' : price.toLocaleString('ru-RU') + ' ₽'}
                    </span>
                    {price > 0 && (
                      <span className="text-gray-500 dark:text-gray-400">
                        /{billingPeriod === 'monthly' ? 'мес' : 'год'}
                      </span>
                    )}
                  </div>
                  {billingPeriod === 'annual' && price > 0 && savings.savingsPercent > 0 && (
                    <p className="text-sm text-green-600 mt-2">
                      Экономия {savings.savingsPercent}% ({savings.savings.toLocaleString()} ₽)
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">📋 Заявки</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {isUnlimited ? '∞ Безлимит' : `${plan.maxApplications || 0} в день`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">📦 Материалов в заявке</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {isUnlimited ? '∞ Безлимит' : `до ${plan.maxMaterialsPerApp || 20}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">👥 Пользователей</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {plan.maxUsers === -1 ? '∞ Безлимит' : plan.maxUsers || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">🔑 API ключей</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {plan.maxApiKeys === -1 ? '∞ Безлимит' : plan.maxApiKeys || 0}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  {plan.features && Object.entries(plan.features).map(([feature, value]) => {
                    const enabled = value === true || typeof value === 'string';
                    const featureLabels = {
                      warehouse: '📦 Склад',
                      analytics: '📊 Аналитика',
                      api: '🔌 API доступ',
                      webhooks: '🔔 Webhooks',
                      support: `💬 Поддержка (${value === true ? 'email' : value || 'email'})`,
                      priority: '⚡ Приоритетная обработка',
                      sla: '🛡️ SLA гарантия',
                      customIntegration: '🔧 Кастомная интеграция'
                    };
                    return (
                      <div key={`${plan.id}-${feature}`} className="flex items-center gap-3 text-sm">
                        {enabled ? (
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={enabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                          {featureLabels[feature] || feature}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => onSelectPlan && onSelectPlan(plan.id)}
                  disabled={isCurrent || isLoading}
                  className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                      : plan.id === 'basic'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                      : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-lg'
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <Check className="w-4 h-4" />
                      Текущий тариф
                    </>
                  ) : plan.id === 'basic' && isBasicPlan ? (
                    'Текущий тариф'
                  ) : plan.id === 'basic' ? (
                    'Переключиться'
                  ) : (
                    'Выбрать тариф'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => {
            if (typeof onPromoClick === 'function') {
              onPromoClick();
            }
          }}
          className="text-sm text-[#4A6572] hover:text-[#F9AA33] transition-colors flex items-center gap-2 mx-auto"
        >
          <Gift className="w-4 h-4" />
          {translate('havePromoCode', 'Есть промокод?')}
        </button>
      </div>
    </div>
  );
};

export default TariffSelector;