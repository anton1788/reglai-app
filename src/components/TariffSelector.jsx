import React, { useState } from 'react';
import { Calendar, Clock, Gift, Zap, CheckCircle, Check, X, Sparkles, Shield, Headphones, Users, Key, Database, BarChart3, Webhook, Mail, MessageSquare, Phone, Star, Crown, Rocket, AlertCircle } from 'lucide-react';
import { TARIFF_PLANS, calculateSavings, getNextTier, getPreviousTier } from '../utils/tariffPlans';

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
  onExtendPlan,
  showUpgradePrompt = true
}) => {
  const [internalBillingPeriod, setInternalBillingPeriod] = useState('monthly');
  const billingPeriod = externalBillingPeriod !== undefined ? externalBillingPeriod : internalBillingPeriod;
  
  const setBillingPeriod = (period) => {
    if (onBillingPeriodChange) {
      onBillingPeriodChange(period);
    } else {
      setInternalBillingPeriod(period);
    }
  };

  // ============================================================
  // 🆕 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ДАТ
  // ============================================================
  
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

  const getTrialDaysLeft = (activatedAt) => {
    if (!activatedAt) return null;
    const daysSinceActivation = Math.ceil((new Date() - new Date(activatedAt)) / (1000 * 60 * 60 * 24));
    return Math.max(0, 14 - daysSinceActivation);
  };

  const getPlanStatus = (planId, expiresAt, activatedAt) => {
    if (planId === 'basic') {
      const daysLeft = getTrialDaysLeft(activatedAt);
      if (daysLeft === null) return { label: 'Активен', color: 'text-green-600', bg: 'bg-green-100' };
      if (daysLeft <= 0) return { label: 'Пробный период истёк', color: 'text-red-600', bg: 'bg-red-100' };
      if (daysLeft <= 3) return { label: `Пробный период заканчивается (${daysLeft} дн.)`, color: 'text-orange-600', bg: 'bg-orange-100' };
      return { label: `Пробный период (${daysLeft} дн.)`, color: 'text-green-600', bg: 'bg-green-100' };
    }
    
    const daysLeft = getDaysLeft(expiresAt);
    if (daysLeft === null) return { label: 'Активен', color: 'text-green-600', bg: 'bg-green-100' };
    if (daysLeft <= 0) return { label: 'Истёк', color: 'text-red-600', bg: 'bg-red-100' };
    if (daysLeft <= 7) return { label: `Истекает скоро (${daysLeft} дн.)`, color: 'text-orange-600', bg: 'bg-orange-100' };
    return { label: 'Активен', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const translate = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const result = t(key);
    return result === key ? fallback : result;
  };

  const getPlanDisplayName = (planId) => {
    const names = {
      basic: 'Базовый',
      starter: 'Старт',
      pro: 'Профессиональный',
      business: 'Бизнес',
      enterprise: 'Корпоративный'
    };
    return names[planId] || planId;
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

  const getPlanLevel = (planId) => {
    const levels = ['basic', 'starter', 'pro', 'business', 'enterprise'];
    return levels.indexOf(planId) + 1;
  };

  const renderSupportLabel = (supportType) => {
    const labels = {
      email: '📧 Email',
      chat: '💬 Чат',
      '24/7': '📞 24/7'
    };
    return labels[supportType] || supportType;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      
      {/* ============================================================
          🆕 БЛОК С ДАТАМИ ТЕКУЩЕГО ТАРИФА (ПОЛНОСТЬЮ ОБНОВЛЁН)
          ============================================================ */}
      {currentPlanDetails && (
        <div className="mb-8 bg-gradient-to-r from-[#4A6572]/10 to-[#344955]/10 rounded-xl p-5 border border-[#4A6572]/20">
          
          {/* Заголовок */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {translate('currentPlanInfo', 'Текущий тариф')}: {getPlanIcon(currentPlan)} {getPlanDisplayName(currentPlan)}
              </h3>
              {(() => {
                const status = getPlanStatus(currentPlan, currentPlanDetails.expires_at, currentPlanDetails.activated_at);
                return (
                  <span className={`px-2 py-0.5 ${status.bg} ${status.color} text-xs rounded-full`}>
                    {status.label}
                  </span>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Уровень {getPlanLevel(currentPlan)} из 5</span>
            </div>
          </div>
          
          {/* 🆕 ДАТЫ: АКТИВАЦИЯ, ОКОНЧАНИЕ, БЕСПЛАТНЫЙ ПЕРИОД */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
            
            {/* Дата активации */}
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  {translate('activationDate', '📅 Дата активации')}:
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(currentPlanDetails.activated_at)}
                </p>
              </div>
            </div>
            
            {/* Дата окончания */}
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  {translate('expirationDate', '⏰ Дата окончания')}:
                </p>
                <p className={`font-medium ${
                  currentPlan === 'basic' 
                    ? 'text-gray-400' 
                    : currentPlanDetails.expires_at && getDaysLeft(currentPlanDetails.expires_at) <= 7 && getDaysLeft(currentPlanDetails.expires_at) > 0
                      ? 'text-orange-600 dark:text-orange-400'
                      : currentPlanDetails.expires_at && getDaysLeft(currentPlanDetails.expires_at) <= 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-white'
                }`}>
                  {currentPlan === 'basic' 
                    ? '— (бесплатный тариф)' 
                    : formatDate(currentPlanDetails.expires_at)}
                  {currentPlan !== 'basic' && currentPlanDetails.expires_at && getDaysLeft(currentPlanDetails.expires_at) !== null && (
                    <span className={`text-xs ml-2 ${
                      getDaysLeft(currentPlanDetails.expires_at) <= 7 && getDaysLeft(currentPlanDetails.expires_at) > 0
                        ? 'text-orange-500' 
                        : getDaysLeft(currentPlanDetails.expires_at) <= 0
                          ? 'text-red-500'
                          : 'text-gray-500'
                    }`}>
                      {getDaysLeft(currentPlanDetails.expires_at) <= 0 
                        ? '(истёк)' 
                        : `(${getDaysLeft(currentPlanDetails.expires_at)} дн.)`}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* 🆕 БЕСПЛАТНЫЙ ПЕРИОД (14 дней) */}
           {/* 🆕 БЕСПЛАТНЫЙ ПЕРИОД (14 дней) — ТОЛЬКО ДЛЯ ПЛАТНЫХ ТАРИФОВ */}
<div className="flex items-start gap-2">
  <Gift className="w-4 h-4 text-[#F9AA33] mt-0.5" />
  <div>
    <p className="text-gray-500 dark:text-gray-400">
      {translate('trialPeriod', '🎁 Бесплатный период')}:
    </p>
    {currentPlan !== 'basic' && currentPlanDetails?.activated_at ? (
      (() => {
        const daysLeft = getTrialDaysLeft(currentPlanDetails.activated_at);
        if (daysLeft === null) return <p className="font-medium text-gray-400">—</p>;
        if (daysLeft <= 0) {
          return <p className="font-medium text-red-600 dark:text-red-400">Период истёк</p>;
        }
        const daysText = daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней';
        return (
          <p className={`font-medium ${daysLeft <= 3 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
            {daysLeft} {daysText} из 14
            {daysLeft <= 3 && (
              <span className="text-xs ml-2 text-orange-500">⚠️ скоро закончится</span>
            )}
          </p>
        );
      })()
    ) : currentPlan === 'basic' ? (
      <p className="font-medium text-gray-400">— (бесплатный тариф)</p>
    ) : (
      <p className="font-medium text-gray-400">—</p>
    )}
  </div>
</div>
          </div>

          {/* Статистика использования */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 pt-3 border-t border-[#4A6572]/20">
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  {translate('currentUsage', 'Использовано')}:
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {currentPlanDetails.usageCurrent || 0} / {TARIFF_PLANS[currentPlan]?.apiQuotaMonthly || 0}
                </p>
              </div>
            </div>
          </div>
          
          {/* Промокод */}
          {promoCodeInfo && (
            <div className="mt-3 pt-3 border-t border-[#4A6572]/20 flex items-start gap-2">
              <Gift className="w-4 h-4 text-[#F9AA33] mt-0.5" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  {translate('promoCodeApplied', 'Промокод')}:
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {promoCodeInfo.code}
                  {promoCodeInfo.discount_percent && (
                    <span className="text-green-600 text-sm ml-2">
                      (-{promoCodeInfo.discount_percent}%)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
          
          {/* Кнопка продления */}
          {onExtendPlan && currentPlan !== 'basic' && (
            <button
              onClick={onExtendPlan}
              className="mt-4 w-full py-2 bg-[#4A6572]/20 text-[#4A6572] dark:text-[#F9AA33] rounded-lg text-sm font-medium hover:bg-[#4A6572]/30 transition-colors"
            >
              {translate('extendPlan', '🔄 Продлить тариф')}
            </button>
          )}
        </div>
      )}

      {/* ============================================================
          ЗАГОЛОВОК И ПЕРЕКЛЮЧАТЕЛЬ ПЕРИОДА
          ============================================================ */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {translate('tariffSelector.title', 'Выберите подходящий тариф')}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {translate('tariffSelector.subtitle', 'От старта до корпоративного уровня — найдите идеальный план для вашего бизнеса')}
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

      {/* ============================================================
          КАРТОЧКИ ТАРИФОВ
          ============================================================ */}
      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(TARIFF_PLANS).map(([planId, plan]) => {
          const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
          const savings = calculateSavings(plan);
          const isCurrent = currentPlan === planId;
          const isPopular = plan.popular;
          const isFree = plan.monthlyPrice === 0;
          const isNext = getNextTier(currentPlan)?.id === planId;

          const nextPlan = getNextTier(planId);
          const prevPlan = getPreviousTier(planId);

          return (
            <div
              key={planId}
              className={`relative rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${
                isCurrent
                  ? 'border-[#4A6572] bg-[#4A6572]/5 ring-2 ring-[#4A6572]/20'
                  : isPopular
                  ? 'border-[#F9AA33] bg-[#F9AA33]/5'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              } ${isNext ? 'scale-105 shadow-lg' : ''}`}
            >
              {/* Badge популярного */}
              {isPopular && !isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#F9AA33] to-[#f59e0b] text-white text-sm font-bold rounded-full shadow-lg">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    {translate('tariffSelector.popular', 'Популярный')}
                  </span>
                </div>
              )}

              {/* Badge текущего тарифа */}
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#4A6572] text-white text-sm font-bold rounded-full shadow-lg">
                  {translate('tariffSelector.current', 'Текущий')}
                </div>
              )}

              {/* Badge бесплатного */}
              {isFree && !isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-green-500 text-white text-sm font-bold rounded-full shadow-lg">
                  🆓 Бесплатно
                </div>
              )}

              <div className="p-6">
                {/* Заголовок */}
                <div className="text-center mb-6">
                  <div className="text-3xl mb-2">{getPlanIcon(planId)}</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {translate(`tariff.plans.${planId}.name`, plan.name)}
                  </h3>
                  
                  {!isFree ? (
                    <div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          {price.toLocaleString('ru-RU')} ₽
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          /{billingPeriod === 'monthly' 
                            ? translate('tariffSelector.perMonth', 'мес') 
                            : translate('tariffSelector.perYear', 'год')}
                        </span>
                      </div>
                      {billingPeriod === 'annual' && savings.savings > 0 && (
                        <p className="text-sm text-green-600 mt-2">
                          {translate('tariffSelector.savings', 'Экономия')} {savings.savingsPercent}% ({savings.savings.toLocaleString()} ₽)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-green-600">
                      {translate('tariffSelector.free', 'Бесплатно')}
                    </div>
                  )}
                </div>

                {/* Квоты */}
                <div className="space-y-3 mb-6 bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Database className="w-4 h-4" />
                      {translate('tariffSelector.quotaMonthly', 'Запросов/мес')}
                    </span>
                    <span className="font-semibold">{plan.apiQuotaMonthly.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {translate('tariffSelector.quotaDaily', 'Запросов/день')}
                    </span>
                    <span className="font-semibold">{plan.apiQuotaDaily.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Key className="w-4 h-4" />
                      {translate('tariffSelector.maxKeys', 'API ключей')}
                    </span>
                    <span className="font-semibold">{plan.maxApiKeys}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {translate('tariffSelector.maxUsers', 'Пользователей')}
                    </span>
                    <span className="font-semibold">{plan.maxUsers}</span>
                  </div>
                </div>

                {/* Функции */}
                <div className="space-y-2.5 mb-6">
                  {Object.entries(plan.features).map(([feature, value]) => {
                    const enabled = value === true || typeof value === 'string';
                    
                    const featureLabels = {
                      warehouse: '📦 Управление складом',
                      analytics: '📊 Аналитика и отчёты',
                      api: '🔌 API доступ',
                      webhooks: '🔔 Webhooks',
                      support: `💬 ${renderSupportLabel(value)}`,
                      priority: '⚡ Приоритетная обработка',
                      sla: '🛡️ SLA гарантия',
                      customIntegration: '🔧 Кастомная интеграция'
                    };
                    
                    return (
                      <div key={`${planId}-${feature}`} className="flex items-center gap-3 text-sm">
                        {enabled ? (
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={enabled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                          {translate(`tariffSelector.features.${feature}`, featureLabels[feature] || feature)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Кнопка действия */}
                <button
                  onClick={() => onSelectPlan(planId)}
                  disabled={isCurrent || isLoading}
                  className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : isFree
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : isPopular
                      ? 'bg-gradient-to-r from-[#F9AA33] to-[#f59e0b] text-white hover:shadow-lg'
                      : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-lg'
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {translate('tariffSelector.currentPlan', 'Текущий тариф')}
                    </>
                  ) : isFree ? (
                    translate('tariffSelector.startFree', 'Начать бесплатно')
                  ) : (
                    <>
                      {isPopular && <Sparkles className="w-4 h-4" />}
                      {translate('tariffSelector.selectPlan', 'Выбрать тариф')}
                    </>
                  )}
                </button>

                {/* Сравнение с соседними тарифами */}
                {showUpgradePrompt && !isCurrent && (
                  <div className="mt-3 text-center">
                    {nextPlan && planId !== 'enterprise' && (
                      <p className="text-xs text-gray-400">
                        Следующий уровень: {getPlanIcon(nextPlan.id)} {getPlanDisplayName(nextPlan.id)}
                      </p>
                    )}
                    {prevPlan && planId !== 'basic' && (
                      <p className="text-xs text-gray-400 mt-1">
                        От {getPlanIcon(prevPlan.id)} {getPlanDisplayName(prevPlan.id)}: +{((plan.apiQuotaMonthly - prevPlan.plan.apiQuotaMonthly) / prevPlan.plan.apiQuotaMonthly * 100).toFixed(0)}% запросов
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ============================================================
          ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ
          ============================================================ */}
      <div className="mt-10 text-center">
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Shield className="w-4 h-4" />
            {translate('tariffSelector.secure', 'Безопасная оплата')}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {translate('tariffSelector.trial', '14 дней бесплатно')}
          </span>
          <span className="flex items-center gap-1">
            <Headphones className="w-4 h-4" />
            {translate('tariffSelector.support', 'Поддержка 24/7')}
          </span>
        </div>

        <button
          onClick={() => {
            if (typeof onPromoClick === 'function') {
              onPromoClick();
            }
          }}
          className="mt-6 text-sm text-[#4A6572] hover:text-[#F9AA33] transition-colors flex items-center gap-2 mx-auto"
        >
          <Gift className="w-4 h-4" />
          {translate('havePromoCode', 'Есть промокод?')}
        </button>
      </div>

      {/* Градация тарифов */}
      <div className="mt-6 flex justify-center">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {['🆓', '🚀', '💼', '🏢', '👑'].map((icon, index) => (
            <React.Fragment key={index}>
              <span className={`px-2 py-1 rounded ${
                index <= getPlanLevel(currentPlan) - 1 ? 'bg-[#4A6572]/10 text-[#4A6572]' : ''
              }`}>
                {icon}
              </span>
              {index < 4 && <span className="text-gray-300">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TariffSelector;