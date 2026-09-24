// src/utils/objectStatuses.js
// ============================================================
// Статусы объекта, цвета, иконки, i18n-ключи
// ============================================================

export const OBJECT_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

// I18n-ключи (используются через t() из translations.js)
export const OBJECT_STATUS_I18N = {
  [OBJECT_STATUS.PLANNING]: 'objectStatusPlanning',
  [OBJECT_STATUS.ACTIVE]: 'objectStatusActive',
  [OBJECT_STATUS.COMPLETED]: 'objectStatusCompleted',
  [OBJECT_STATUS.ARCHIVED]: 'objectStatusArchived',
};

// Стили бейджа статуса объекта
export const OBJECT_STATUS_COLORS = {
  [OBJECT_STATUS.PLANNING]:  'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  [OBJECT_STATUS.ACTIVE]:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  [OBJECT_STATUS.COMPLETED]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200',
  [OBJECT_STATUS.ARCHIVED]:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

// Русские подписи (fallback, если t() не отдаст перевод)
export const OBJECT_STATUS_LABELS = {
  [OBJECT_STATUS.PLANNING]:  'Планирование',
  [OBJECT_STATUS.ACTIVE]:    'В работе',
  [OBJECT_STATUS.COMPLETED]: 'Завершён',
  [OBJECT_STATUS.ARCHIVED]:  'В архиве',
};

// Эмодзи для наглядности
export const OBJECT_STATUS_ICONS = {
  [OBJECT_STATUS.PLANNING]:  '📋',
  [OBJECT_STATUS.ACTIVE]:    '🔨',
  [OBJECT_STATUS.COMPLETED]: '✅',
  [OBJECT_STATUS.ARCHIVED]:  '📦',
};

// Цвета прогресс-бара
export const getProgressColor = (percent) => {
  if (percent >= 100) return 'bg-green-500';
  if (percent >= 70) return 'bg-blue-500';
  if (percent >= 30) return 'bg-amber-500';
  if (percent > 0) return 'bg-orange-500';
  return 'bg-gray-300 dark:bg-gray-600';
};

// Порядок статусов (для сортировки / фильтров)
export const OBJECT_STATUS_ORDER = {
  [OBJECT_STATUS.PLANNING]:  1,
  [OBJECT_STATUS.ACTIVE]:    2,
  [OBJECT_STATUS.COMPLETED]: 3,
  [OBJECT_STATUS.ARCHIVED]:  4,
};

// Утилита: получить все статусы для dropdown
export const getAllObjectStatuses = () => [
  { value: OBJECT_STATUS.PLANNING,  label: OBJECT_STATUS_LABELS[OBJECT_STATUS.PLANNING],  icon: OBJECT_STATUS_ICONS[OBJECT_STATUS.PLANNING] },
  { value: OBJECT_STATUS.ACTIVE,    label: OBJECT_STATUS_LABELS[OBJECT_STATUS.ACTIVE],    icon: OBJECT_STATUS_ICONS[OBJECT_STATUS.ACTIVE] },
  { value: OBJECT_STATUS.COMPLETED, label: OBJECT_STATUS_LABELS[OBJECT_STATUS.COMPLETED], icon: OBJECT_STATUS_ICONS[OBJECT_STATUS.COMPLETED] },
  { value: OBJECT_STATUS.ARCHIVED,  label: OBJECT_STATUS_LABELS[OBJECT_STATUS.ARCHIVED],  icon: OBJECT_STATUS_ICONS[OBJECT_STATUS.ARCHIVED] },
];