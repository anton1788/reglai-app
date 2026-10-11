// src/components/DowngradeModal.jsx
// ============================================================
// ⬇️ МОДАЛКА DOWNGRADE ТАРИФА
// ============================================================
//
// Два режима:
//   1. Простой (нет превышений) — «Вы уверены?»
//   2. Детальный (есть превышения) — список превышений + объяснение
//
// Вставляется в App.jsx, открывается из handleSelectPlan.
// ============================================================

import React, { useMemo } from 'react';
import {
  AlertTriangle, ArrowRight, X, Shield, Clock, Download,
  Package, Camera, Building2, Users, BookOpen, CheckCircle,
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
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose — отмена
 * @param {() => void} props.onConfirm — подтверждение downgrade
 * @param {object} props.checkResult — результат can_downgrade_to RPC
 *   {
 *     is_downgrade: true,
 *     allowed: true,
 *     has_violations: bool,
 *     from_plan: 'pro',
 *     to_plan: 'micro',
 *     violations: [...]
 *   }
 * @param {object} props.fromPlan — объект TARIFF_PLANS[from_plan]
 * @param {object} props.toPlan   — объект TARIFF_PLANS[to_plan]
 * @param {boolean} [props.loading] — идёт применение
 */
export default function DowngradeModal({
  isOpen,
  onClose,
  onConfirm,
  checkResult,
  fromPlan,
  toPlan,
  loading = false,
}) {
  const violations = useMemo(
    () => checkResult?.violations || [],
    [checkResult]
  );

  const hasViolations = violations.length > 0;

  if (!isOpen || !checkResult || !fromPlan || !toPlan) return null;

  const totalOverflow = violations.reduce(
    (sum, v) => sum + (v.overflow || 0),
    0
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10001] fade-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="downgrade-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">

        {/* ─── Header ─────────────────────────────── */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              hasViolations
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-amber-100 dark:bg-amber-900/30'
            }`}>
              {hasViolations ? (
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <h3
                id="downgrade-modal-title"
                className="text-lg font-bold text-gray-900 dark:text-white"
              >
                {hasViolations
                  ? 'Понижение тарифа с превышениями'
                  : 'Подтвердите понижение тарифа'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {fromPlan.name} → {toPlan.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* ─── Content ───────────────────────────── */}
        <div className="p-4 space-y-4">

          {/* Блок сравнения тарифов */}
          <div className="flex items-center justify-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
            <div className="text-center flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Сейчас</div>
              <div className="font-bold text-gray-900 dark:text-white">
                {fromPlan.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {fromPlan.monthlyPrice.toLocaleString('ru-RU')} ₽/мес
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div className="text-center flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Станет</div>
              <div className="font-bold text-amber-600 dark:text-amber-400">
                {toPlan.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {toPlan.monthlyPrice.toLocaleString('ru-RU')} ₽/мес
              </div>
            </div>
          </div>

          {/* Превышения (если есть) */}
          {hasViolations && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm font-semibold text-red-900 dark:text-red-200">
                  Ваши данные превышают лимиты нового тарифа на {totalOverflow}{' '}
                  {totalOverflow === 1 ? 'единицу' : 'единиц'}
                </div>
              </div>
              <div className="space-y-1.5 ml-6">
                {violations.map((v) => {
                  const Icon = VIOLATION_ICONS[v.key] || AlertTriangle;
                  return (
                    <div
                      key={v.key}
                      className="flex items-center gap-2 text-xs text-red-800 dark:text-red-300"
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="font-medium">{v.label}:</span>
                      <span>
                        <strong>{v.current}</strong> / {v.limit}
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

          {/* Что произойдёт — принцип «данные не удаляем» */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                  Ваши данные не будут удалены
                </div>
                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-0.5">
                  <li>• Существующие данные сохранятся полностью</li>
                  <li>• Доступ к превышающим разделам станет «только просмотр»</li>
                  <li>
                    • <span className="inline-flex items-center gap-1">
                        <Download className="w-3 h-3" />Экспорт
                      </span>{' '}
                    останется доступен
                  </li>
                  <li>• Создание нового в этих разделах будет заблокировано</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Grace period */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                  Grace period: 7 дней
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  В течение 7 дней вы сможете откатить смену тарифа без потери
                  данных. Мы отправим email-уведомление за день до окончания.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Footer ────────────────────────────── */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50 ${
              hasViolations
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white'
                : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Применяем...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {hasViolations ? 'Всё равно перейти' : 'Перейти на ' + toPlan.name}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}