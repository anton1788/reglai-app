// src/components/TariffSelector.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Gift, Zap, CheckCircle, Check, X, Sparkles, Shield, Headphones } from 'lucide-react';
import { TARIFF_PLANS, calculateSavings, calculatePrice } from '../utils/tariffPlans';

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
  currentUsersCount = 0,
  onUsersCountChange
}) => {
  // Внутреннее состояние для периода, если не передан внешний контроллер
  const [internalBillingPeriod, setInternalBillingPeriod] = useState('monthly');
  const billingPeriod = externalBillingPeriod !== undefined ? externalBillingPeriod : internalBillingPeriod;
  
  // 🆕 Состояние для выбранного количества пользователей по каждому тарифу
  const [selectedUsersByPlan, setSelectedUsersByPlan] = useState({});
  
  const setBillingPeriod = (period) => {
    if (onBillingPeriodChange) {
      onBillingPeriodChange(period);
    } else {
      setInternalBillingPeriod(period);
    }
  };

  const featureIcons = {
    warehouse: Zap,
    analytics: Sparkles,
    webhooks: Shield,
    support: Headphones
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  // 🔹 Хелпер для безопасного перевода с фоллбэком
  const translate = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const result = t(key);
    return result === key ? fallback : result;
  };

  // 🆕 Обработчик изменения количества пользователей
  const handleUsersChange = useCallback((planId, usersCount) => {
    setSelectedUsersByPlan(prev => ({
      ...prev,
      [planId]: usersCount
    }));
    if (onUsersCountChange) {
      onUsersCountChange(planId, usersCount);
    }
  }, [onUsersCountChange]);

  // 🆕 Получить отображаемое количество пользователей для тарифа
  const getDisplayUsersCount = useCallback((plan) => {
    if (isCurrentPlan(plan.id)) {
      return currentPlanDetails?.users_count || currentUsersCount || plan.includedUsers;
    }
    return selectedUsersByPlan[plan.id] || plan.includedUsers;
  }, [currentPlanDetails, currentUsersCount, selectedUsersByPlan, isCurrentPlan]);

  // 🆕 Проверка, является ли план текущим
  const isCurrentPlan = useCallback((planId) => currentPlan === planId, [currentPlan]);

  // 💰 Хелпер для расчета цены с учётом промокода
  const getDisplayPrice = useCallback((plan, period, promoInfo) => {
    const basePrice = period === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
    
    if (promoInfo?.discount_percent && promoInfo.discount_percent > 0) {
      const discount = Math.round(basePrice * (promoInfo.discount_percent / 100));
      return {
        original: basePrice,
        discounted: basePrice - discount,
        showDiscount: true,
        discountPercent: promoInfo.discount_percent
      };
    }
    
    return {
      original: basePrice,
      discounted: basePrice,
      showDiscount: false
    };
  }, []);

  // 🔹 Эффект инициализации слайдера
  useEffect(() => {
    if (currentPlanDetails?.users_count) {
      setSelectedUsersByPlan(prev => ({
        ...prev,
        [currentPlan]: currentPlanDetails.users_count
      }));
    }
  }, [currentPlan, currentPlanDetails]);

  // 🆕 Обработчик кнопки выбора тарифа с валидацией
  const handleSelectClick = useCallback((plan, usersCount) => {
    // Валидация количества пользователей
    if (usersCount < plan.includedUsers || usersCount > plan.maxUsers) {
      console.warn(`Invalid users count: ${usersCount} for plan ${plan.id}`);
      return;
    }
    
    onSelectPlan(plan.id, usersCount);
  }, [onSelectPlan]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* БЛОК ИНФОРМАЦИИ О ТЕКУЩЕМ ТАРИФЕ */}
      {currentPlanDetails && (
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
          
          {promoCodeInfo && (
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
            onClick={() => onSelectPlan(currentPlan, currentPlanDetails?.users_count || currentUsersCount)}
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
        {Object.values(TARIFF_PLANS).map((plan) => {
          const usersCount = getDisplayUsersCount(plan);
          
          // 💰 Расчет цены с поддержкой промокода (ВНУТРИ map для правильного scope)
          const displayPrice = getDisplayPrice(plan, billingPeriod, promoCodeInfo);
          const price = calculatePrice(plan, usersCount, billingPeriod === 'annual');
          const savings = calculateSavings(plan);
          const isCurrent = isCurrentPlan(plan.id);
          const isPopular = plan.popular;
          const showSlider = plan.maxUsers > plan.includedUsers;

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
                    {translate(`tariff.plans.${plan.id}.name`, plan.name)}
                  </h3>
                  
                  {/* 💰 Цена с поддержкой промокода */}
                  <div className="flex items-baseline justify-center gap-1 flex-wrap">
                    {displayPrice.showDiscount ? (
                      <>
                        <span className="text-4xl font-bold text-[#4A6572] dark:text-[#F9AA33]">
                          {displayPrice.discounted.toLocaleString('ru-RU')} ₽
                        </span>
                        <span className="text-lg text-gray-400 line-through">
                          {displayPrice.original.toLocaleString('ru-RU')} ₽
                        </span>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs rounded-full whitespace-nowrap">
                          -{displayPrice.discountPercent}%
                        </span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {price.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                    <span className="text-gray-500 dark:text-gray-400">
                      /{billingPeriod === 'monthly' 
                        ? translate('tariffSelector.perMonth', 'мес') 
                        : translate('tariffSelector.perYear', 'год')}
                    </span>
                  </div>
                  {billingPeriod === 'annual' && !displayPrice.showDiscount && (
                    <p className="text-sm text-green-600 mt-2">
                      {translate('tariffSelector.savings', 'Экономия')} {savings.savingsPercent}% ({savings.savings.toLocaleString()} ₽)
                    </p>
                  )}
                </div>

                {/* Квоты */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {translate('tariffSelector.quotaMonthly', 'API запросов/мес')}
                    </span>
                    <span className="font-semibold">{plan.apiQuotaMonthly.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {translate('tariffSelector.quotaDaily', 'API запросов/день')}
                    </span>
                    <span className="font-semibold">{plan.apiQuotaDaily.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {translate('tariffSelector.maxKeys', 'API ключей')}
                    </span>
                    <span className="font-semibold">{plan.maxApiKeys}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {translate('tariffSelector.maxUsers', 'Пользователей')}
                    </span>
                    <span className="font-semibold">{plan.maxUsers}</span>
                  </div>
                  
                  {/* 🆕 СЛАЙДЕР ВЫБОРА ПОЛЬЗОВАТЕЛЕЙ */}
                  {showSlider && (
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {translate('tariffSelector.usersCount', 'Количество пользователей')}: {usersCount}
                      </label>
                      <input
                        type="range"
                        min={plan.includedUsers}
                        max={plan.maxUsers}
                        step={1}
                        value={usersCount}
                        onChange={(e) => handleUsersChange(plan.id, parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        disabled={isCurrent}
                        aria-label={translate('tariffSelector.usersSlider', 'Выбор количества пользователей')}
                      />
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>{translate('tariffSelector.included', 'В тарифе')}: {plan.includedUsers}</span>
                        <span>{translate('tariffSelector.max', 'Максимум')}: {plan.maxUsers}</span>
                      </div>
                      {usersCount > plan.includedUsers && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                          +{(usersCount - plan.includedUsers) * (plan.extraUserPrice || 500)} ₽/мес за доп. пользователей
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Функции */}
                <div className="space-y-3 mb-6">
                  {Object.entries(plan.features).map(([feature, value]) => {
                    const Icon = featureIcons[feature];
                    const enabled = value === true || typeof value === 'string';
                    
                    const featureLabels = {
                      warehouse: translate('tariffSelector.features.warehouse', '📦 Склад'),
                      analytics: translate('tariffSelector.features.analytics', '📊 Аналитика'),
                      api: translate('tariffSelector.features.api', '🔌 API доступ'),
                      webhooks: translate('tariffSelector.features.webhooks', '🔔 Webhooks'),
                      support: (() => {
                        const supportType = value === true ? 'email' : value;
                        const label = `💬 Поддержка (${supportType})`;
                        return translate('tariffSelector.features.support', label);
                      })(),
                      priority: translate('tariffSelector.features.priority', '⚡ Приоритетная обработка'),
                      sla: translate('tariffSelector.features.sla', '🛡️ SLA гарантия'),
                      customIntegration: translate('tariffSelector.features.customIntegration', '🔧 Кастомная интеграция')
                    };
                    
                    return (
                      <div key={`${plan.id}-${feature}`} className="flex items-center gap-3 text-sm">
                        {enabled ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" aria-hidden="true" />
                        ) : (
                          <X className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
                        )}
                        <span className={enabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                          {featureLabels[feature] || feature}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Кнопка выбора тарифа */}
                <button
                  onClick={() => handleSelectClick(plan, usersCount)}
                  disabled={isCurrent || isLoading}
                  className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-lg'
                  }`}
                  aria-label={translate('tariffSelector.selectPlanAria', `Выбрать тариф ${plan.name}`)}
                >
                  {isCurrent ? (
                    <>
                      <Check className="w-4 h-4" aria-hidden="true" />
                      {translate('tariffSelector.currentPlan', 'Текущий тариф')}
                    </>
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
          aria-label={translate('tariffSelector.promoAria', 'Ввести промокод')}
        >
          <Gift className="w-4 h-4" />
          {translate('havePromoCode', 'Есть промокод?')}
        </button>
      </div>
    </div>
  );
};

export default React.memo(TariffSelector);