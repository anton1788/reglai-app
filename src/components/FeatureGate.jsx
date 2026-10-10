// src/components/FeatureGate.jsx
// ============================================================
// 🚪 ОБЁРТКА: Разграничение доступа к Pro-функциям
// ============================================================
//
// Использование:
//   <FeatureGate
//     feature="price_catalog"
//     currentPlan={currentPlan}
//     context={{ hasExistingData: pricesCount > 0 }}
//     onUpgrade={() => setCurrentView('tariffs')}
//   >
//     <MaterialPriceCatalog ... />
//   </FeatureGate>
//
// Что делает:
//   - FULL      → рендерит children как есть
//   - READ_ONLY → показывает баннер + рендерит children с readOnly={true}
//   - NONE      → показывает заглушку «функция недоступна»
// ============================================================

import React from 'react';
import { Lock, Sparkles, ArrowRight, Eye, Download } from 'lucide-react';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

/**
 * @param {object} props
 * @param {string} props.feature — ключ функции (например, 'price_catalog')
 * @param {object} props.currentPlan — объект тарифа
 * @param {object} [props.context] — { hasExistingData: boolean }
 * @param {() => void} [props.onUpgrade] — callback при клике «Обновить тариф»
 * @param {React.ReactNode} props.children — что рендерить
 * @param {string} [props.featureName] — человекочитаемое название (для заглушки)
 * @param {React.ReactNode} [props.fallback] — кастомная заглушка для NONE
 */
export default function FeatureGate({
  feature,
  currentPlan,
  context = {},
  onUpgrade,
  children,
  featureName,
  fallback,
}) {
  const access = useFeatureAccess(feature, currentPlan, context);

  // ─── FULL: рендерим как есть ──────────────────────
  if (access.isFull) {
    return children;
  }

  // ─── NONE: полностью заблокировано ─────────────────
  if (access.isLocked) {
    if (fallback) return fallback;
    return (
      <LockedView
        featureName={featureName || feature}
        onUpgrade={onUpgrade}
      />
    );
  }

  // ─── READ_ONLY: показываем баннер + children с readOnly ───
  return (
    <div>
      <ReadOnlyBanner
        featureName={featureName || feature}
        onUpgrade={onUpgrade}
      />
      {React.isValidElement(children)
        ? React.cloneElement(children, { readOnly: true })
        : children}
    </div>
  );
}

// ============================================================
// 🧩 READ-ONLY BANNER
// ============================================================
function ReadOnlyBanner({ featureName, onUpgrade }) {
  return (
    <div className="max-w-7xl mx-auto mb-4 px-4">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex-shrink-0">
            <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
              Функция недоступна на текущем тарифе
            </h3>
            <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
              «{featureName}» не входит в ваш тариф. Вы можете просмотреть и{' '}
              <span className="inline-flex items-center gap-1 font-medium">
                <Download className="w-3 h-3" />
                экспортировать
              </span>{' '}
              существующие данные, но не можете создавать или изменять их.
            </p>
            {typeof onUpgrade === 'function' && (
              <button
                onClick={onUpgrade}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white text-xs font-medium rounded-lg hover:shadow-md transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Обновить тариф
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 🧩 LOCKED VIEW (для NONE)
// ============================================================
function LockedView({ featureName, onUpgrade }) {
  return (
    <div className="max-w-2xl mx-auto p-8 text-center page-enter">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 mb-4">
        <Lock className="w-10 h-10 text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
        «{featureName}» недоступно
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Эта функция не входит в ваш тариф. Обновите тариф, чтобы получить доступ.
      </p>
      {typeof onUpgrade === 'function' && (
        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white font-semibold rounded-xl hover:shadow-lg transition"
        >
          <Sparkles className="w-4 h-4" />
          Посмотреть тарифы
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}