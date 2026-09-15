// src/components/TariffSelector.jsx

import React, { useState } from 'react';
import {
  Calendar, Clock, Gift, Zap, CheckCircle, Check, X, Sparkles,
  Shield, Headphones, Users, Key, Database, BarChart3,
  Webhook, Mail, MessageSquare, Phone, Star, Crown, Rocket,
  AlertCircle, DollarSign, Percent, Building, FileText,
  GitCompareArrows
} from 'lucide-react';
import {
  TARIFF_PLANS,
  FEATURE_CATEGORIES,
  calculateSavings,
  getNextTier,
  getPreviousTier,
  COMPETITORS,
  getMarketAverage
} from '../utils/tariffPlans';
import TariffComparison from './TariffComparison';

// ============================================================
// 🎨 Компонент строки функции
// ============================================================
const FeatureLine = ({ enabled, label, compact = false }) => (
  <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
    {enabled ? (
      <Check className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-green-500 flex-shrink-0`} />
    ) : (
      <X className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-gray-300 flex-shrink-0`} />
    )}
    <span className={
      enabled
        ? 'text-gray-700 dark:text-gray-300'
        : 'text-gray-400 dark:text-gray-500 line-through'
    }>
      {label}
    </span>
  </div>
);

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
  const [showComparison, setShowComparison] = useState(false);
  const [expandedFeatures, setExpandedFeatures] = useState({});

  const billingPeriod = externalBillingPeriod !== undefined ? externalBillingPeriod : internalBillingPeriod;

  const setBillingPeriod = (period) => {
    if (onBillingPeriodChange) {
      onBillingPeriodChange(period);
    } else {
      setInternalBillingPeriod(period);
    }
  };

  const toggleFeatures = (planId) => {
    setExpandedFeatures(prev => ({ ...prev, [planId]: !prev[planId] }));
  };

  // ============================================================
  // 🆕 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ДАТ
  // ============================================================

  const formatDate = (dateString) => {
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
  };

  const getDaysLeft = (expiresAt) => {
    if (!expiresAt) return null;
    try {
      const diff = new Date(expiresAt) - new Date();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return days;
    } catch {
      return null;
    }
  };

  const getTrialDaysLeft = (activatedAt) => {
    if (!activatedAt) return null;
    try {
      const daysSinceActivation = Math.ceil((new Date() - new Date(activatedAt)) / (1000 * 60 * 60 * 24));
      return Math.max(0, 14 - daysSinceActivation);
    } catch {
      return null;
    }
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
      micro: 'Микро',
      pro: 'Профессиональный',
      business: 'Бизнес',
      enterprise: 'Корпоративный'
    };
    return names[planId] || planId;
  };

  const getPlanIcon = (planId) => {
    const icons = {
      basic: '🆓',
      micro: '🚀',
      pro: '💼',
      business: '🏢',
      enterprise: '👑'
    };
    return icons[planId] || '📦';
  };

  const getPlanLevel = (planId) => {
    const levels = ['basic', 'micro', 'pro', 'business', 'enterprise'];
    return levels.indexOf(planId) + 1;
  };

  const formatLimit = (value) => {
    if (value === -1) return '∞';
    return value.toLocaleString('ru-RU');
  };

  // 🆕 Средняя цена рынка для сравнения
  const marketAverage = getMarketAverage(10);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">

      {/* ============================================================
          🆕 БЛОК С ДАТАМИ ТЕКУЩЕГО ТАРИФА
          ============================================================ */}
      {currentPlanDetails && (
        <div className="mb-8 bg-gradient-to-r from-[#4A6572]/10 to-[#344955]/10 rounded-xl p-5 border border-[#4A6572]/20">

          {/* Заголовок */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2 flex-wrap">
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
              {promoCodeInfo && promoCodeInfo.discount_percent > 0 && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white text-xs font-bold rounded-full">
                  🎁 -{promoCodeInfo.discount_percent}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Уровень {getPlanLevel(currentPlan)} из 5</span>
            </div>
          </div>

          {/* ДАТЫ: АКТИВАЦИЯ, ОКОНЧАНИЕ, БЕСПЛАТНЫЙ ПЕРИОД */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">

            {/* Дата активации */}
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">
                  {translate('activationDate', '📅 Дата активации')}:
                </p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {currentPlan === 'basic' && !currentPlanDetails?.activated_at
                    ? '— (бесплатный тариф)'
                    : formatDate(currentPlanDetails.activated_at)}
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
                {(() => {
                  const daysLeft = getDaysLeft(currentPlanDetails?.expires_at);
                  const isExpired = daysLeft !== null && daysLeft <= 0;
                  const isSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;

                  return (
                    <p className={`font-medium ${
                      currentPlan === 'basic'
                        ? 'text-gray-400'
                        : isExpired
                          ? 'text-red-600 dark:text-red-400'
                          : isSoon
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-900 dark:text-white'
                    }`}>
                      {currentPlan === 'basic' || !currentPlanDetails?.expires_at
                        ? '— (бесплатный тариф)'
                        : formatDate(currentPlanDetails.expires_at)}
                      {currentPlan !== 'basic' && currentPlanDetails?.expires_at && daysLeft !== null && (
                        <span className={`text-xs ml-2 ${
                          isExpired
                            ? 'text-red-500'
                            : isSoon
                              ? 'text-orange-500'
                              : 'text-gray-500'
                        }`}>
                          {isExpired
                            ? '(истёк)'
                            : `(${daysLeft} дн.)`}
                        </span>
                      )}
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* БЕСПЛАТНЫЙ ПЕРИОД */}
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
                      return (
                        <div>
                          <p className="font-medium text-red-600 dark:text-red-400">Период истёк</p>
                          <p className="text-xs text-red-500 mt-0.5">
                            ⚠️ Вы будете переведены на бесплатный тариф
                          </p>
                        </div>
                      );
                    }
                    const daysText = daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней';
                    return (
                      <div>
                        <p className={`font-medium ${daysLeft <= 3 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                          {daysLeft} {daysText} из 14
                          {daysLeft <= 3 && (
                            <span className="text-xs ml-2 text-orange-500">⚠️ скоро закончится</span>
                          )}
                        </p>
                      </div>
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
                  {currentPlanDetails.usageCurrent || 0} / {formatLimit(TARIFF_PLANS[currentPlan]?.apiQuotaMonthly || 0)}
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
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <code className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono text-sm">
                    {promoCodeInfo.code}
                  </code>
                  {promoCodeInfo.discount_percent > 0 && (
                    <span className="text-green-600 text-sm font-bold">
                      скидка {promoCodeInfo.discount_percent}%
                    </span>
                  )}
                  {promoCodeInfo.plan && (
                    <span className="text-xs text-gray-500">
                      → {getPlanDisplayName(promoCodeInfo.plan)}
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

        <div className="flex items-center justify-center gap-4 flex-wrap">
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

          {/* 🆕 Кнопка "Сравнить тарифы" */}
          <button
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4A6572]/10 to-[#F9AA33]/10 text-[#4A6572] dark:text-[#F9AA33] rounded-xl font-medium hover:from-[#4A6572]/20 hover:to-[#F9AA33]/20 transition-all border border-[#4A6572]/20"
          >
            <GitCompareArrows className="w-4 h-4" />
            Сравнить тарифы
          </button>
        </div>
      </div>

      {/* ============================================================
          КАРТОЧКИ ТАРИФОВ
          ============================================================ */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(TARIFF_PLANS).map(([planId, plan]) => {
          const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
          const savings = calculateSavings(plan);
          const isCurrent = currentPlan === planId;
          const isPopular = plan.popular;
          const isFree = plan.monthlyPrice === 0;
          const isNext = getNextTier(currentPlan)?.id === planId;
          const isExpanded = expandedFeatures[planId];

          const hasDiscount = promoCodeInfo &&
                             promoCodeInfo.plan === planId &&
                             promoCodeInfo.discount_percent > 0;

          const discountedPrice = hasDiscount
            ? Math.round(price * (1 - promoCodeInfo.discount_percent / 100))
            : price;

          const nextPlan = getNextTier(planId);
          const prevPlan = getPreviousTier(planId);

          return (
            <div
              key={planId}
              className={`relative rounded-2xl border-2 transition-all duration-300 hover:shadow-xl flex flex-col ${
                isCurrent
                  ? 'border-[#4A6572] bg-[#4A6572]/5 ring-2 ring-[#4A6572]/20'
                  : isPopular
                  ? 'border-[#F9AA33] bg-[#F9AA33]/5'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              } ${isNext ? 'lg:scale-105 shadow-lg' : ''}`}
            >
              {/* Badge популярного */}
              {isPopular && !isCurrent && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-[#F9AA33] to-[#f59e0b] text-white text-sm font-bold rounded-full shadow-lg whitespace-nowrap">
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

              {/* Badge скидки от промокода */}
              {hasDiscount && !isCurrent && (
                <div className="absolute -top-4 right-4 px-3 py-1 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white text-xs font-bold rounded-full shadow-lg">
                  🎁 -{promoCodeInfo.discount_percent}%
                </div>
              )}

              <div className="p-6 flex flex-col flex-1">
                {/* Заголовок */}
                <div className="text-center mb-5">
                  <div className="text-3xl mb-2">{getPlanIcon(planId)}</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                    {plan.name}
                  </h3>

                  {/* Tagline */}
                  {plan.tagline && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {plan.tagline}
                    </p>
                  )}

                  {!isFree ? (
                    <div>
                      <div className="flex items-baseline justify-center gap-1">
                        {hasDiscount ? (
                          <>
                            <span className="text-xl text-gray-400 line-through">
                              {price.toLocaleString('ru-RU')} ₽
                            </span>
                            <span className="text-3xl font-bold text-[#F9AA33]">
                              {discountedPrice.toLocaleString('ru-RU')} ₽
                            </span>
                          </>
                        ) : (
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            {price.toLocaleString('ru-RU')} ₽
                          </span>
                        )}
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          /{billingPeriod === 'monthly' ? 'мес' : 'год'}
                        </span>
                      </div>
                      {billingPeriod === 'annual' && savings.savings > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Экономия {savings.savingsPercent}%
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-green-600">
                      Бесплатно
                    </div>
                  )}
                </div>

                {/* 🆕 HIGHLIGHTS — что входит */}
                {plan.highlights && plan.highlights.length > 0 && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-[#4A6572]/5 to-[#F9AA33]/5 rounded-lg border border-[#4A6572]/10">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase">
                      ✨ Что входит:
                    </p>
                    <ul className="space-y-1">
                      {plan.highlights.slice(0, isExpanded ? plan.highlights.length : 4).map((item, i) => (
                        <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                          <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Лимиты */}
                <div className="space-y-2 mb-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Database className="w-3.5 h-3.5" />
                      Запросов/мес
                    </span>
                    <span className="font-semibold">{formatLimit(plan.apiQuotaMonthly)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5" />
                      API-ключей
                    </span>
                    <span className="font-semibold">{plan.maxApiKeys === 0 ? '—' : plan.maxApiKeys}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      Пользователей
                    </span>
                    <span className="font-semibold">{formatLimit(plan.maxUsers)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5" />
                      Объектов
                    </span>
                    <span className="font-semibold">{formatLimit(plan.maxObjects)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      Заявок/мес
                    </span>
                    <span className="font-semibold">{formatLimit(plan.maxApplicationsPerMonth)}</span>
                  </div>
                </div>

                {/* 🆕 ФУНКЦИИ ПО КАТЕГОРИЯМ */}
                <div className="space-y-3 mb-4 flex-1">
                  {Object.entries(FEATURE_CATEGORIES).map(([catKey, category]) => {
                    const visibleFeatures = isExpanded
                      ? category.features
                      : category.features.filter(f => plan.features[f.key]);

                    // Если не развёрнуто и нет включённых — пропускаем категорию
                    if (!isExpanded && visibleFeatures.length === 0) return null;

                    return (
                      <div key={catKey}>
                        <p className={`text-[10px] font-bold uppercase mb-1.5 ${
                          catKey === 'core'
                            ? 'text-gray-500'
                            : catKey === 'advanced'
                            ? 'text-blue-500'
                            : 'text-purple-500'
                        }`}>
                          {category.label}
                        </p>
                        <div className="space-y-1">
                          {visibleFeatures.map(({ key, label }) => (
                            <FeatureLine
                              key={key}
                              enabled={plan.features[key]}
                              label={label}
                              compact
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Кнопка "Показать все / Скрыть" */}
                  <button
                    onClick={() => toggleFeatures(planId)}
                    className="text-xs text-[#4A6572] dark:text-[#F9AA33] hover:underline mt-1"
                  >
                    {isExpanded ? '− Скрыть функции' : '+ Показать все функции'}
                  </button>
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
                      : hasDiscount
                      ? 'bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white hover:shadow-lg'
                      : isPopular
                      ? 'bg-gradient-to-r from-[#F9AA33] to-[#f59e0b] text-white hover:shadow-lg'
                      : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-lg'
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Текущий тариф
                    </>
                  ) : isFree ? (
                    'Начать бесплатно'
                  ) : (
                    <>
                      {hasDiscount && <Gift className="w-4 h-4" />}
                      {isPopular && <Sparkles className="w-4 h-4" />}
                      Выбрать тариф
                    </>
                  )}
                </button>

                {/* Сравнение с соседними */}
{showUpgradePrompt && !isCurrent && !isExpanded && (
  <div className="mt-3 text-center space-y-1">
    {nextPlan && planId !== 'enterprise' && (
      <p className="text-[11px] text-gray-400">
        ⬆ Следующий: {getPlanIcon(nextPlan.id)} {getPlanDisplayName(nextPlan.id)}
      </p>
    )}
    {prevPlan && planId !== 'basic' && (
      <p className="text-[11px] text-gray-400">
        ⬇ Предыдущий: {getPlanIcon(prevPlan.id)} {getPlanDisplayName(prevPlan.id)}
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
          📊 СРАВНЕНИЕ С КОНКУРЕНТАМИ
          ============================================================ */}
      <div className="mt-10 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
          💰 Почему мы дешевле?
        </h3>
        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
          Сравнение для компании с 10 пользователями
        </p>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">Bitrix24</p>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-bold">5 990 ₽/мес</p>
            <p className="text-xs text-gray-500 mt-1">за 50 пользователей</p>
            <p className="text-xs text-gray-500 mt-1">Без специализации на стройке</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">1С:ERP Строительство</p>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-bold">45 260 ₽/мес</p>
            <p className="text-xs text-gray-500 mt-1">4 526 ₽ × 10 польз.</p>
            <p className="text-xs text-gray-500 mt-1">Требует внедрения и обучения</p>
          </div>
          <div className="p-4 bg-gradient-to-br from-[#F9AA33]/20 to-[#F57C00]/10 rounded-xl border-2 border-[#F9AA33]">
            <p className="font-semibold text-gray-900 dark:text-white mb-2">🚀 Реглай PRO</p>
            <p className="text-[#F9AA33] text-lg font-bold">3 990 ₽/мес</p>
            <p className="text-xs text-gray-500 mt-1">за 50 пользователей</p>
            <p className="text-xs text-green-600 font-semibold mt-1">✅ Специализация на стройке</p>
          </div>
        </div>
        <div className="text-center mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Средняя цена на рынке: <span className="font-bold">{marketAverage.average.toLocaleString('ru-RU')} ₽/мес</span>
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-semibold">
            Мы на 30-40% ниже рынка, при этом специализированы на строительной отрасли
          </p>
        </div>
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

      {/* 🆕 МОДАЛЬНОЕ ОКНО СРАВНЕНИЯ */}
      {showComparison && (
        <TariffComparison
          isOpen={showComparison}
          onClose={() => setShowComparison(false)}
          currentPlan={currentPlan}
          onSelectPlan={(planId) => {
            setShowComparison(false);
            onSelectPlan(planId);
          }}
          t={t}
        />
      )}
    </div>
  );
};

export default TariffSelector;