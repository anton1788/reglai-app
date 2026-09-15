// src/components/TariffComparison.jsx

import React, { useState, useMemo } from 'react';
import {
  X, Check, ArrowRight, Sparkles, Crown, Building,
  TrendingUp, Users, Key, Database, FileText, Zap,
  ChevronDown, ChevronUp
} from 'lucide-react';
import {
  TARIFF_PLANS,
  FEATURE_CATEGORIES,
  getTariffUpgradeBenefits
} from '../utils/tariffUtilsHelpers';

// ============================================================
// 🎯 Компонент сравнения двух тарифов "X vs Y"
// ============================================================

const TariffComparison = ({
  isOpen,
  onClose,
  currentPlan = 'basic',
  onSelectPlan,
  t
}) => {
  const planIds = ['basic', 'micro', 'pro', 'business', 'enterprise'];
  const [leftPlanId, setLeftPlanId] = useState(currentPlan || 'basic');
  const [rightPlanId, setRightPlanId] = useState(() => {
    // По умолчанию — следующий тариф после текущего
    const idx = planIds.indexOf(currentPlan || 'basic');
    return planIds[Math.min(idx + 1, planIds.length - 1)];
  });
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const leftPlan = TARIFF_PLANS[leftPlanId];
  const rightPlan = TARIFF_PLANS[rightPlanId];

  // 🆕 Что даёт апгрейд
  const upgradeBenefits = useMemo(() => {
    const leftIdx = planIds.indexOf(leftPlanId);
    const rightIdx = planIds.indexOf(rightPlanId);
    // Считаем апгрейд только если справа тариф выше
    if (rightIdx > leftIdx) {
      return getTariffUpgradeBenefits(leftPlanId);
    }
    return null;
  }, [leftPlanId, rightPlanId]);

  if (!isOpen) return null;

  const formatLimit = (value) => {
    if (value === -1) return '∞';
    return value.toLocaleString('ru-RU');
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

  const translate = (key, fallback) => {
    if (typeof t !== 'function') return fallback;
    const result = t(key);
    return result === key ? fallback : result;
  };

  // Считаем разницу в цене
  const priceDiff = rightPlan.monthlyPrice - leftPlan.monthlyPrice;
  const priceDiffPercent = leftPlan.monthlyPrice > 0
    ? Math.round((priceDiff / leftPlan.monthlyPrice) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[10000] fade-enter"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">

        {/* Заголовок */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#4A6572] to-[#F9AA33] rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                Сравнение тарифов
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Выберите два тарифа для детального сравнения
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Селекторы тарифов */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <div className="grid grid-cols-2 gap-4">

            {/* LEFT */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                {translate('compare.leftPlan', 'Тариф A')}
              </label>
              <select
                value={leftPlanId}
                onChange={(e) => setLeftPlanId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-[#4A6572]"
              >
                {planIds.map(id => (
                  <option key={id} value={id}>
                    {getPlanIcon(id)} {TARIFF_PLANS[id].name}
                  </option>
                ))}
              </select>
            </div>

            {/* RIGHT */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                {translate('compare.rightPlan', 'Тариф B')}
              </label>
              <select
                value={rightPlanId}
                onChange={(e) => setRightPlanId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-[#4A6572]"
              >
                {planIds.map(id => (
                  <option key={id} value={id}>
                    {getPlanIcon(id)} {TARIFF_PLANS[id].name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 🆕 Блок с разницей цены */}
          {priceDiff !== 0 && (
            <div className="mt-3 p-3 bg-gradient-to-r from-[#4A6572]/10 to-[#F9AA33]/10 rounded-lg border border-[#4A6572]/20">
              <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                <span className="text-gray-700 dark:text-gray-300">
                  Разница в цене:
                </span>
                <span className={`font-bold ${priceDiff > 0 ? 'text-[#F9AA33]' : 'text-green-600'}`}>
                  {priceDiff > 0 ? '+' : ''}{priceDiff.toLocaleString('ru-RU')} ₽/мес
                  {priceDiffPercent !== 0 && (
                    <span className="ml-1 text-xs opacity-75">
                      ({priceDiff > 0 ? '+' : ''}{priceDiffPercent}%)
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Контент — таблица сравнения */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">

            {/* Две колонки с заголовками */}
            <div className="grid grid-cols-3 gap-3 mb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 pb-2">
              <div></div>
              <PlanHeader planId={leftPlanId} plan={leftPlan} currentPlan={currentPlan} />
              <PlanHeader planId={rightPlanId} plan={rightPlan} currentPlan={currentPlan} />
            </div>

            {/* Секция 1: Лимиты */}
            <Section title="📊 Лимиты и возможности">
              <CompareRow
                icon={<Database className="w-4 h-4" />}
                label="Запросов/мес"
                left={formatLimit(leftPlan.apiQuotaMonthly)}
                right={formatLimit(rightPlan.apiQuotaMonthly)}
                highlight={leftPlan.apiQuotaMonthly !== rightPlan.apiQuotaMonthly}
              />
              <CompareRow
                icon={<Key className="w-4 h-4" />}
                label="API-ключей"
                left={leftPlan.maxApiKeys === 0 ? '—' : leftPlan.maxApiKeys}
                right={rightPlan.maxApiKeys === 0 ? '—' : rightPlan.maxApiKeys}
                highlight={leftPlan.maxApiKeys !== rightPlan.maxApiKeys}
              />
              <CompareRow
                icon={<Users className="w-4 h-4" />}
                label="Пользователей"
                left={formatLimit(leftPlan.maxUsers)}
                right={formatLimit(rightPlan.maxUsers)}
                highlight={leftPlan.maxUsers !== rightPlan.maxUsers}
              />
              <CompareRow
                icon={<Building className="w-4 h-4" />}
                label="Объектов"
                left={formatLimit(leftPlan.maxObjects)}
                right={formatLimit(rightPlan.maxObjects)}
                highlight={leftPlan.maxObjects !== rightPlan.maxObjects}
              />
              <CompareRow
                icon={<FileText className="w-4 h-4" />}
                label="Заявок/мес"
                left={formatLimit(leftPlan.maxApplicationsPerMonth)}
                right={formatLimit(rightPlan.maxApplicationsPerMonth)}
                highlight={leftPlan.maxApplicationsPerMonth !== rightPlan.maxApplicationsPerMonth}
              />
            </Section>

            {/* Секция 2: Функции по категориям */}
            {Object.entries(FEATURE_CATEGORIES).map(([catKey, category]) => {
              const features = showAllFeatures
                ? category.features
                : category.features.filter(f =>
                    leftPlan.features[f.key] || rightPlan.features[f.key]
                  );

              if (features.length === 0) return null;

              return (
                <Section key={catKey} title={`${getCategoryIcon(catKey)} ${category.label}`}>
                  {features.map(({ key, label }) => (
                    <FeatureCompareRow
                      key={key}
                      label={label}
                      left={leftPlan.features[key]}
                      right={rightPlan.features[key]}
                    />
                  ))}
                </Section>
              );
            })}

            {/* Toggle "показать все функции" */}
            <button
              onClick={() => setShowAllFeatures(prev => !prev)}
              className="w-full py-2 text-sm text-[#4A6572] dark:text-[#F9AA33] hover:underline flex items-center justify-center gap-1"
            >
              {showAllFeatures ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Скрыть функции без разницы
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Показать все функции
                </>
              )}
            </button>

            {/* 🆕 Секция: Что даёт апгрейд */}
            {upgradeBenefits && (
              <div className="mt-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
                <h4 className="font-bold text-green-800 dark:text-green-300 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Что вы получите при переходе на {upgradeBenefits.name}:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {/* Лимиты */}
                  {upgradeBenefits.benefits.users.increase > 0 && (
                    <BenefitItem
                      label="Пользователей"
                      from={upgradeBenefits.benefits.users.from}
                      to={upgradeBenefits.benefits.users.to}
                      increase={upgradeBenefits.benefits.users.increase}
                      percent={upgradeBenefits.benefits.users.percent}
                    />
                  )}
                  {upgradeBenefits.benefits.apiQuotaMonthly.increase > 0 && (
                    <BenefitItem
                      label="Запросов/мес"
                      from={upgradeBenefits.benefits.apiQuotaMonthly.from}
                      to={upgradeBenefits.benefits.apiQuotaMonthly.to}
                      increase={upgradeBenefits.benefits.apiQuotaMonthly.increase}
                      percent={upgradeBenefits.benefits.apiQuotaMonthly.percent}
                    />
                  )}
                  {upgradeBenefits.benefits.apiKeys.increase > 0 && (
                    <BenefitItem
                      label="API-ключей"
                      from={upgradeBenefits.benefits.apiKeys.from}
                      to={upgradeBenefits.benefits.apiKeys.to}
                      increase={upgradeBenefits.benefits.apiKeys.increase}
                      percent={upgradeBenefits.benefits.apiKeys.percent}
                    />
                  )}
                  {upgradeBenefits.benefits.objects.increase > 0 && (
                    <BenefitItem
                      label="Объектов"
                      from={upgradeBenefits.benefits.objects.from}
                      to={upgradeBenefits.benefits.objects.to}
                      increase={upgradeBenefits.benefits.objects.increase}
                      percent={upgradeBenefits.benefits.objects.percent}
                    />
                  )}
                </div>

                {/* Новые функции */}
                {upgradeBenefits.benefits.newFeatures.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-green-200 dark:border-green-800">
                    <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-2">
                      🎁 Новые функции:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {upgradeBenefits.benefits.newFeatures.map(key => {
                        const feature = findFeatureLabel(key);
                        return feature ? (
                          <span
                            key={key}
                            className="px-2 py-1 bg-white dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs rounded-full border border-green-300 dark:border-green-700"
                          >
                            {feature.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer с кнопкой выбора */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Выбранный тариф:
              <span className="font-semibold text-gray-900 dark:text-white ml-1">
                {getPlanIcon(rightPlanId)} {getPlanDisplayName(rightPlanId)} — {rightPlan.monthlyPrice.toLocaleString('ru-RU')} ₽/мес
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium"
              >
                Отмена
              </button>
              {currentPlan !== rightPlanId && (
                <button
                  onClick={() => {
                    onSelectPlan(rightPlanId);
                    onClose();
                  }}
                  className="px-5 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white text-sm font-medium rounded-lg hover:shadow-md transition-all flex items-center gap-2"
                >
                  Перейти на {getPlanDisplayName(rightPlanId)}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// 🧩 Вспомогательные компоненты
// ============================================================

// ✅ ИСПРАВЛЕНО: убран неиспользуемый параметр isRight
const PlanHeader = ({ planId, plan, currentPlan }) => {
  const isCurrent = planId === currentPlan;
  const isPopular = plan.popular;

  return (
    <div className={`text-center p-3 rounded-xl border-2 ${
      isPopular
        ? 'border-[#F9AA33] bg-[#F9AA33]/5'
        : isCurrent
        ? 'border-[#4A6572] bg-[#4A6572]/5'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`}>
      <div className="text-2xl mb-1">
        {planId === 'basic' && '🆓'}
        {planId === 'micro' && '🚀'}
        {planId === 'pro' && '💼'}
        {planId === 'business' && '🏢'}
        {planId === 'enterprise' && '👑'}
      </div>
      <h4 className="font-bold text-gray-900 dark:text-white text-sm">
        {plan.name}
      </h4>
      <p className="text-lg font-bold text-[#4A6572] dark:text-[#F9AA33] mt-1">
        {plan.monthlyPrice === 0 ? 'Бесплатно' : `${plan.monthlyPrice.toLocaleString('ru-RU')} ₽`}
      </p>
      {plan.monthlyPrice > 0 && (
        <p className="text-xs text-gray-500">/мес</p>
      )}
      <div className="flex flex-wrap gap-1 justify-center mt-2">
        {isCurrent && (
          <span className="px-2 py-0.5 bg-[#4A6572] text-white text-[10px] rounded-full">
            Текущий
          </span>
        )}
        {isPopular && (
          <span className="px-2 py-0.5 bg-[#F9AA33] text-white text-[10px] rounded-full">
            Популярный
          </span>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="mb-5">
    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 pb-1 border-b border-gray-200 dark:border-gray-700">
      {title}
    </h4>
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

const CompareRow = ({ icon, label, left, right, highlight }) => (
  <div className={`grid grid-cols-3 gap-3 py-2 px-2 rounded-lg items-center ${
    highlight ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
  }`}>
    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-center text-sm font-medium text-gray-900 dark:text-white">
      {left}
    </div>
    <div className={`text-center text-sm font-medium ${highlight ? 'text-[#4A6572] dark:text-[#F9AA33] font-bold' : 'text-gray-900 dark:text-white'}`}>
      {right}
    </div>
  </div>
);

const FeatureCompareRow = ({ label, left, right }) => (
  <div className="grid grid-cols-3 gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 items-center">
    <div className="text-xs text-gray-600 dark:text-gray-400">
      {label}
    </div>
    <div className="flex justify-center">
      {left ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <X className="w-4 h-4 text-gray-300 dark:text-gray-600" />
      )}
    </div>
    <div className="flex justify-center">
      {right ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <X className="w-4 h-4 text-gray-300 dark:text-gray-600" />
      )}
    </div>
  </div>
);

const BenefitItem = ({ label, from, to, increase, percent }) => (
  <div className="flex items-center gap-2 text-sm">
    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
    <span className="text-gray-700 dark:text-gray-300">
      {label}: <span className="font-medium">{from}</span> → <span className="font-bold text-green-700 dark:text-green-400">{to}</span>
      <span className="text-xs text-green-600 dark:text-green-400 ml-1">
        (+{increase}, +{percent}%)
      </span>
    </span>
  </div>
);

// ============================================================
// 🧩 Утилиты
// ============================================================

const getCategoryIcon = (catKey) => {
  const icons = {
    core: '🎯',
    advanced: '⚡',
    premium: '👑'
  };
  return icons[catKey] || '📦';
};

const findFeatureLabel = (featureKey) => {
  for (const cat of Object.values(FEATURE_CATEGORIES)) {
    const found = cat.features.find(f => f.key === featureKey);
    if (found) return found;
  }
  return null;
};

export default TariffComparison;