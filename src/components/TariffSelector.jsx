// src/components/TariffSelector.jsx
import React, { useState, useCallback } from 'react';
import { 
  Calendar, Clock, Gift, Zap, CheckCircle, Check, X, 
  Sparkles, Shield, Headphones, TrendingUp, Package 
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
  // 🔥 УНИВЕРСАЛЬНАЯ ЗАЩИТА ОТ ОШИБОК
  // ============================================================

  // 1. БЕЗОПАСНАЯ ФУНКЦИЯ ПЕРЕВОДА
  const translate = useCallback((key, fallback) => {
    // Если t не функция — возвращаем fallback
    if (typeof t !== 'function') {
      return fallback || key;
    }
    try {
      const result = t(key);
      // Если результат равен ключу или пустой — возвращаем fallback
      return (result === key || !result) ? (fallback || key) : result;
    } catch (error) {
      console.warn('[TariffSelector] Translation error:', error);
      return fallback || key;
    }
  }, [t]);

  // 2. БЕЗОПАСНОЕ ФОРМАТИРОВАНИЕ ДАТЫ
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
    } catch (error) {
      console.warn('[TariffSelector] Date formatting error:', error);
      return '—';
    }
  }, []);

  // 3. БЕЗОПАСНЫЙ РАСЧЁТ ДНЕЙ
  const getDaysLeft = useCallback((expiresAt) => {
    if (!expiresAt) return null;
    try {
      const diff = new Date(expiresAt) - new Date();
      if (isNaN(diff)) return null;
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days;
    } catch (error) {
      console.warn('[TariffSelector] Days calculation error:', error);
      return null;
    }
  }, []);

  // 4. ЗАЩИТА ОТ ПУСТЫХ ПЛАНОВ
  const plans = TARIFF_PLANS || {};
  const hasPlans = Object.keys(plans).length > 0;

  // 5. БЕЗОПАСНАЯ ПРОВЕРКА quotaStatus
  const isBasicPlan = currentPlan === 'basic';
  const safeQuota = quotaStatus || { allowed: true, used: 0, limit: 5, remaining: 5 };
  const quotaPercent = safeQuota.limit > 0 
    ? Math.round((safeQuota.used / safeQuota.limit) * 100) 
    : 0;

  // 6. ВНУТРЕННИЙ СОСТОЯНИЕ ДЛЯ ПЕРИОДА
  const [internalBillingPeriod, setInternalBillingPeriod] = useState('monthly');
  const billingPeriod = externalBillingPeriod !== undefined ? externalBillingPeriod : internalBillingPeriod;
  
  const setBillingPeriod = useCallback((period) => {
    if (onBillingPeriodChange) {
      onBillingPeriodChange(period);
    } else {
      setInternalBillingPeriod(period);
    }
  }, [onBillingPeriodChange]);

  // 7. ЗАЩИТА: если нет планов — показываем загрузку
  if (!hasPlans) {
    return (
      <div className="max-w-7xl mx-auto p-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A6572] mx-auto"></div>
        <p className="mt-4 text-gray-500 dark:text-gray-400">
          {translate('tariffSelector.loading', 'Загрузка тарифов...')}
        </p>
      </div>
    );
  }

  // 8. ОСНОВНОЙ РЕНДЕР
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Блок статуса лимитов для бесплатного тарифа */}
      {isBasicPlan && safeQuota && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-yellow-600" />
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                📋 {translate('tariffSelector.limits', 'Использование лимитов')}
              </h4>
            </div>
            {safeQuota.allowed ? (
              <span className="text-xs text-green-600 dark:text-green-400">
                ✅ {translate('tariffSelector.hasSpace', 'Есть место')}
              </span>
            ) : (
              <span className="text-xs text-red-600 dark:text-red-400">
                ⚠️ {translate('tariffSelector.exhausted', 'Лимит исчерпан')}
              </span>
            )}
          </div>
          
          <div className="mb-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {translate('tariffSelector.applications', 'Заявки')}
              </span>
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
                ? translate('tariffSelector.limitExhausted', '⚠️ Лимит исчерпан. Обновите тариф.')
                : translate('tariffSelector.remaining', `Осталось ${safeQuota.remaining} заявок`)}
            </p>
          </div>
          
          {!safeQuota.allowed && onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="w-full mt-2 py-2 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white font-medium rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              <TrendingUp className="w-4 h-4" />
              🚀 {translate('tariffSelector.upgrade', 'Увеличить лимиты')}
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
                      ({translate('tariffSelector.daysLeft', 'осталось')} {getDaysLeft(currentPlanDetails.expires_at)} {translate('tariffSelector.days', 'дн.')})
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
                      ({translate('tariffSelector.discount', 'скидка')} {promoCodeInfo.discount_percent}%)
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
      
      {/* Заголовок и переключатель периода оплаты */}
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
          // Безопасная проверка плана
          if (!plan || !plan.id) return null;
          
          const price = billingPeriod === 'monthly' ? plan.monthlyPrice || 0 : plan.annualPrice || 0;
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
                {/* Заголовок */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {translate(`tariff.plans.${plan.id}.name`, plan.name || 'Тариф')}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      {price === 0 ? translate('tariffSelector.free', 'Бесплатно') : price.toLocaleString('ru-RU') + ' ₽'}
                    </span>
                    {price > 0 && (
                      <span className="text-gray-500 dark:text-gray-400">
                        /{billingPeriod === 'monthly' 
                          ? translate('tariffSelector.perMonth', 'мес') 
                          : translate('tariffSelector.perYear', 'год')}
                      </span>
                    )}
                  </div>
                  {billingPeriod === 'annual' && price > 0 && savings.savingsPercent > 0 && (
                    <p className="text-sm text-green-600 mt-2">
                      {translate('tariffSelector.savings', 'Экономия')} {savings.savingsPercent}% ({savings.savings.toLocaleString()} ₽)
                    </p>
                  )}
                </div>

                {/* Квоты и лимиты */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      📋 {translate('tariffSelector.applications', 'Заявки')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {isUnlimited ? '∞ ' + translate('tariffSelector.unlimited', 'Безлимит') : `${plan.maxApplications || 0} ${translate('tariffSelector.perDay', 'в день')}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      📦 {translate('tariffSelector.materials', 'Материалов в заявке')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {isUnlimited ? '∞ ' + translate('tariffSelector.unlimited', 'Безлимит') : `${translate('tariffSelector.upTo', 'до')} ${plan.maxMaterialsPerApp || 20}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      👥 {translate('tariffSelector.users', 'Пользователей')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {plan.maxUsers === -1 ? '∞ ' + translate('tariffSelector.unlimited', 'Безлимит') : plan.maxUsers || 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      🔑 {translate('tariffSelector.apiKeys', 'API ключей')}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {plan.maxApiKeys === -1 ? '∞ ' + translate('tariffSelector.unlimited', 'Безлимит') : plan.maxApiKeys || 0}
                    </span>
                  </div>
                </div>

                {/* Функции */}
                <div className="space-y-2 mb-6">
                  {plan.features && Object.entries(plan.features).map(([feature, value]) => {
                    const enabled = value === true || typeof value === 'string';
                    
                    const featureLabels = {
                      warehouse: '📦 ' + translate('tariffSelector.warehouse', 'Склад'),
                      analytics: '📊 ' + translate('tariffSelector.analytics', 'Аналитика'),
                      api: '🔌 ' + translate('tariffSelector.apiAccess', 'API доступ'),
                      webhooks: '🔔 ' + translate('tariffSelector.webhooks', 'Webhooks'),
                      support: `💬 ${translate('tariffSelector.support', 'Поддержка')} (${value === true ? 'email' : value || 'email'})`,
                      priority: '⚡ ' + translate('tariffSelector.priority', 'Приоритетная обработка'),
                      sla: '🛡️ ' + translate('tariffSelector.sla', 'SLA гарантия'),
                      customIntegration: '🔧 ' + translate('tariffSelector.customIntegration', 'Кастомная интеграция')
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

                {/* Кнопка */}
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
                      {translate('tariffSelector.currentPlan', 'Текущий тариф')}
                    </>
                  ) : plan.id === 'basic' && isBasicPlan ? (
                    translate('tariffSelector.currentPlan', 'Текущий тариф')
                  ) : plan.id === 'basic' ? (
                    translate('tariffSelector.downgrade', 'Переключиться')
                  ) : (
                    translate('tariffSelector.selectPlan', 'Выбрать тариф')
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Кнопка промокода */}
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