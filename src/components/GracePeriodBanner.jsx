// src/components/GracePeriodBanner.jsx
// ============================================================
// ⏳ БАННЕР: Активный grace period после downgrade
// ============================================================
//
// Показывает:
//   - Сколько дней осталось на откат
//   - Кнопку «Откатить назад»
//   - Список превышений (если были при downgrade)
//
// Используется в:
//   - UniversalDashboard
//   - RoleDashboard
//   - TariffSelector (компактный вид)
// ============================================================

import React from 'react';
import {
  Clock, RotateCcw, AlertTriangle, TrendingUp, ArrowRight,
  Package, Camera, Building2, Users, BookOpen, X,
} from 'lucide-react';

const VIOLATION_ICONS = {
  objects:   Package,
  photos:    Camera,
  suppliers: Building2,
  users:     Users,
  prices:    BookOpen,
};

/**
 * @param {object} props
 * @param {object} props.graceData — результат get_active_grace_period
 *   { has_grace, from_plan, to_plan, grace_until, days_left, violations }
 * @param {object} props.fromPlan — объект TARIFF_PLANS[from_plan]
 * @param {object} props.toPlan   — объект TARIFF_PLANS[to_plan]
 * @param {() => void} props.onRevert — callback «Откатить назад»
 * @param {boolean} [props.compact] — компактный вид (для TariffSelector)
 * @param {boolean} [props.loading] — идёт откат
 */
export default function GracePeriodBanner({
  graceData,
  fromPlan,
  toPlan,
  onRevert,
  compact = false,
  loading = false,
}) {
  if (!graceData?.has_grace || !fromPlan || !toPlan) return null;

  const daysLeft = graceData.days_left || 0;
  const isUrgent = daysLeft <= 2;
  const violations = graceData.violations || [];

  // Формат «5 дней», «1 день»
  const daysText = daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней';

  const untilDate = new Date(graceData.grace_until).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  // ─── Компактный вид (для TariffSelector) ────────────────
  if (compact) {
    return (
      <div className={`rounded-xl border p-3 flex items-center gap-3 ${
        isUrgent
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      }`}>
        <Clock className={`w-4 h-4 flex-shrink-0 ${
          isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
        }`} />
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-medium text-gray-900 dark:text-white">
            {daysLeft} {daysText}
          </span>
          <span className="text-gray-600 dark:text-gray-400 ml-1">
            на откат до {toPlan.name === fromPlan.name ? 'прежнего тарифа' : fromPlan.name}
          </span>
        </div>
        <button
          onClick={onRevert}
          disabled={loading}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
            isUrgent
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          } disabled:opacity-50`}
        >
          <RotateCcw className="w-3 h-3" />
          Откатить
        </button>
      </div>
    );
  }

  // ─── Полный вид (для дашборда) ──────────────────────────
  return (
    <div className={`rounded-xl border-l-4 p-4 shadow-sm ${
      isUrgent
        ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-500'
        : 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-500'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg flex-shrink-0 ${
          isUrgent
            ? 'bg-red-100 dark:bg-red-900/40'
            : 'bg-amber-100 dark:bg-amber-900/40'
        }`}>
          <Clock className={`w-5 h-5 ${
            isUrgent
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400'
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            ⬇️ Вы на тарифе «{toPlan.name}» — {daysLeft} {daysText} на откат
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            До <strong>{untilDate}</strong> включительно вы можете вернуться на{' '}
            <strong>{fromPlan.name}</strong> без потери данных. После этого
            тариф закрепится окончательно.
          </p>

          {/* Список превышений (если были при downgrade) */}
          {violations.length > 0 && (
            <div className="mb-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Данные, которые превысили лимиты:
              </p>
              <div className="space-y-1">
                {violations.map((v) => {
                  const Icon = VIOLATION_ICONS[v.key] || AlertTriangle;
                  return (
                    <div
                      key={v.key}
                      className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
                    >
                      <Icon className="w-3 h-3 flex-shrink-0" />
                      <span>{v.label}:</span>
                      <span className="font-medium">
                        {v.current} / {v.limit}
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        (+{v.overflow})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={onRevert}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition disabled:opacity-50 ${
              isUrgent
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white'
                : 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Откатываем...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                Вернуться на {fromPlan.name}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}