// src/components/DataLimitsBanner.jsx
// ============================================================
// 📊 БАННЕР: Превышение лимитов текущего тарифа
// ============================================================
//
// Показывает пользователю, что его данные превышают лимиты
// текущего тарифа (например, после downgrade с Pro на Basic).
//
// Использование:
//   <DataLimitsBanner
//     currentPlan={currentPlan}
//     stats={{ objects: 50, photos: 500, suppliers: 20 }}
//     onUpgrade={() => setCurrentView('tariffs')}
//   />
// ============================================================

import React, { useMemo } from 'react';
import { AlertTriangle, TrendingUp, ArrowRight, Package, Camera, Building2, Users } from 'lucide-react';

const LIMIT_CONFIG = {
  objects: {
    icon: Package,
    label: 'Объекты',
    action: 'Удалите лишние объекты или обновите тариф',
    planKey: 'maxObjects',
  },
  photos: {
    icon: Camera,
    label: 'Фото',
    action: 'Удалите лишние фото или обновите тариф',
    planKey: 'maxPhotos',
  },
  suppliers: {
    icon: Building2,
    label: 'Поставщики',
    action: 'Архивируйте лишних поставщиков или обновите тариф',
    planKey: 'maxSuppliers',
  },
  users: {
    icon: Users,
    label: 'Сотрудники',
    action: 'Заблокируйте лишних сотрудников или обновите тариф',
    planKey: 'maxUsers',
  },
};

/**
 * @param {object} props
 * @param {object} props.currentPlan — объект тарифа
 * @param {object} props.stats — { objects, photos, suppliers, users }
 * @param {() => void} [props.onUpgrade] — callback
 */
export default function DataLimitsBanner({ currentPlan, stats = {}, onUpgrade }) {
  const violations = useMemo(() => {
    if (!currentPlan) return [];

    const result = [];

    Object.entries(LIMIT_CONFIG).forEach(([key, config]) => {
      const limit = currentPlan[config.planKey];
      const current = stats[key] || 0;

      // Пропускаем: лимит не задан, лимит безлимитный, лимит не превышен
      if (limit === undefined || limit === -1) return;
      if (current <= limit) return;

      result.push({
        key,
        icon: config.icon,
        label: config.label,
        current,
        limit,
        overflow: current - limit,
        action: config.action,
      });
    });

    return result;
  }, [currentPlan, stats]);

  if (violations.length === 0) return null;

  const totalOverflow = violations.reduce((sum, v) => sum + v.overflow, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 mb-4">
      <div className="bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-900/20 dark:to-amber-900/20 border-l-4 border-red-500 rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">
              Превышены лимиты тарифа «{currentPlan.name}»
            </h3>
            <p className="text-sm text-red-800 dark:text-red-300 mb-3">
              Ваши данные превышают лимиты текущего тарифа на{' '}
              <strong>{totalOverflow}</strong>{' '}
              {totalOverflow === 1 ? 'единицу' : 'единиц'}. Существующие данные
              сохранятся, но вы не сможете создавать новое, пока не устраните
              превышение.
            </p>

            <div className="space-y-1.5 mb-3">
              {violations.map((v) => {
                const Icon = v.icon;
                return (
                  <div
                    key={v.key}
                    className="flex items-center gap-2 text-sm text-red-800 dark:text-red-300"
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="font-medium">{v.label}:</span>
                    <span>
                      <strong>{v.current}</strong> / {v.limit}
                    </span>
                    <span className="text-xs text-red-600 dark:text-red-400">
                      (+{v.overflow})
                    </span>
                    <span className="text-xs text-red-600 dark:text-red-400 ml-1">
                      — {v.action}
                    </span>
                  </div>
                );
              })}
            </div>

            {typeof onUpgrade === 'function' && (
              <button
                onClick={onUpgrade}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-medium rounded-lg hover:shadow-md transition"
              >
                <TrendingUp className="w-4 h-4" />
                Обновить тариф
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}