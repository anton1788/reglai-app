// src/hooks/useFeatureAccess.js
// ============================================================
// 🎣 ХУК: Уровень доступа к функции на текущем тарифе
// ============================================================
//
// Использование:
//   const access = useFeatureAccess('price_catalog', currentPlan, {
//     hasExistingData: pricesCount > 0
//   });
//
//   access.isFull      — можно всё
//   access.isReadOnly  — только чтение и экспорт
//   access.isLocked    — полностью заблокировано
//   access.canCreate   — можно создавать/изменять
//   access.canRead     — можно читать
//   access.canExport   — можно экспортировать (если есть данные)
//   access.level       — 'full' | 'read_only' | 'none'
// ============================================================

import { useMemo } from 'react';
import { getFeatureAccessLevel, ACCESS_LEVEL } from '../utils/tariffPlans';

/**
 * @param {string} feature — ключ функции (например, 'price_catalog')
 * @param {object} currentPlan — объект тарифа (TARIFF_PLANS[id])
 * @param {object} [context] — { hasExistingData: boolean }
 * @returns {object} — объект с уровнем доступа и удобными флагами
 */
export function useFeatureAccess(feature, currentPlan, context = {}) {
  return useMemo(() => {
    const level = getFeatureAccessLevel(currentPlan, feature, context);

    return {
      level,

      // Основные флаги
      isFull:     level === ACCESS_LEVEL.FULL,
      isReadOnly: level === ACCESS_LEVEL.READ_ONLY,
      isLocked:   level === ACCESS_LEVEL.NONE,

      // Разрешения
      canCreate: level === ACCESS_LEVEL.FULL,
      canRead:   level !== ACCESS_LEVEL.NONE,
      canExport: level !== ACCESS_LEVEL.NONE,

      // Мета
      feature,
      planId: currentPlan?.id || 'basic',
      hasExistingData: Boolean(context.hasExistingData),
    };
  }, [feature, currentPlan, context]);
}

export default useFeatureAccess;