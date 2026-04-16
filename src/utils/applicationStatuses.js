/**
 * 🔄 Новая система статусов заявок
 * Workflow: Мастер → Админ (склад) → Мастер (подтверждение) → Завершено
 */

// === Основные статусы заявки ===
// ✅ Правильный формат - строковые значения совпадают с БД
export const APPLICATION_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  RECEIVED: 'received',
  CANCELED: 'canceled',
  PENDING_EMPLOYEE_CONFIRMATION: 'pending_employee_confirmation',
  PENDING_MASTER_CONFIRMATION: 'pending_master_confirmation',
  ADMIN_PROCESSING: 'admin_processing',
  IN_PROGRESS: 'in_progress',
  SENT_TO_MASTER: 'sent_to_master',
  AWAITING_CONFIRMATION: 'awaiting_confirmation'
};

// === Статусы отдельных позиций в заявке ===
export const ITEM_STATUS = {
  PENDING: 'pending',                    // Ожидает обработки
  ON_WAREHOUSE: 'on_warehouse',          // Принято админом на склад
  SENT_TO_MASTER: 'sent_to_master',      // Отправлено мастеру
  CONFIRMED: 'confirmed',                // Подтверждено мастером (списано)
  REJECTED: 'rejected',                  // Отклонено мастером (возврат на склад)
  CANCELED: 'canceled'                   // Отменено
};

// === Типы транзакций склада ===
export const WAREHOUSE_TRANSACTION_TYPE = {
  INCOME: 'income',          // Приход (приёмка от поставщика)
  EXPENSE: 'expense',        // Расход (выдача мастеру после подтверждения)
  WRITE_OFF: 'write_off',    // Списание (брак, потеря)
  RETURN: 'return'           // Возврат (отклонено мастером)
};

// === Карта переходов статусов (валидация) ===
export const STATUS_TRANSITIONS = {
  [APPLICATION_STATUS.DRAFT]: [APPLICATION_STATUS.PENDING],
  [APPLICATION_STATUS.PENDING]: [
    APPLICATION_STATUS.ADMIN_PROCESSING,
    APPLICATION_STATUS.CANCELED
  ],
  [APPLICATION_STATUS.ADMIN_PROCESSING]: [
    APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
    APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE,
    APPLICATION_STATUS.CANCELED
  ],
  [APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE]: [
    APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION
  ],
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: [
    APPLICATION_STATUS.RECEIVED,
    APPLICATION_STATUS.PARTIAL_RECEIVED,
    APPLICATION_STATUS.REJECTED
  ],
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: [
    APPLICATION_STATUS.RECEIVED,
    APPLICATION_STATUS.REJECTED
  ],
  // Терминальные статусы — переходов нет
  [APPLICATION_STATUS.RECEIVED]: [],
  [APPLICATION_STATUS.REJECTED]: [],
  [APPLICATION_STATUS.CANCELED]: []
};

// === Проверка допустимого перехода ===
export const canTransitionTo = (fromStatus, toStatus) => {
  const allowed = STATUS_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
};

// === Локализация статусов ===
export const STATUS_I18N = {
  // Заявки
  [APPLICATION_STATUS.DRAFT]: { ru: 'Черновик', en: 'Draft' },
  [APPLICATION_STATUS.PENDING]: { ru: 'В работе', en: 'In Work' },
  [APPLICATION_STATUS.ADMIN_PROCESSING]: { ru: 'Приёмка на склад', en: 'Warehouse Processing' },
  [APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE]: { ru: 'Частично на складе', en: 'Partial on Warehouse' },
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: { ru: 'Готово к получению', en: 'Awaiting Confirmation' },
  [APPLICATION_STATUS.RECEIVED]: { ru: 'Получено', en: 'Received' },
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: { ru: 'Частично получено', en: 'Partially Received' },
  [APPLICATION_STATUS.REJECTED]: { ru: 'Отклонено', en: 'Rejected' },
  [APPLICATION_STATUS.CANCELED]: { ru: 'Отменено', en: 'Canceled' },
  
  // Позиции
  [ITEM_STATUS.PENDING]: { ru: 'Ожидает', en: 'Pending' },
  [ITEM_STATUS.ON_WAREHOUSE]: { ru: 'На складе', en: 'On Warehouse' },
  [ITEM_STATUS.SENT_TO_MASTER]: { ru: 'Отправлено', en: 'Sent' },
  [ITEM_STATUS.CONFIRMED]: { ru: 'Подтверждено', en: 'Confirmed' },
  [ITEM_STATUS.REJECTED]: { ru: 'Отклонено', en: 'Rejected' },
  
  // Транзакции
  [WAREHOUSE_TRANSACTION_TYPE.INCOME]: { ru: 'Приход', en: 'Income' },
  [WAREHOUSE_TRANSACTION_TYPE.EXPENSE]: { ru: 'Расход', en: 'Expense' },
  [WAREHOUSE_TRANSACTION_TYPE.WRITE_OFF]: { ru: 'Списание', en: 'Write-off' },
  [WAREHOUSE_TRANSACTION_TYPE.RETURN]: { ru: 'Возврат', en: 'Return' }
};

// === Хелпер для получения текста статуса ===
export const getStatusText = (status, language = 'ru') => {
  const i18n = STATUS_I18N[status];
  return i18n?.[language] || i18n?.ru || status;
};

// === Цветовая схема для UI ===
export const STATUS_COLORS = {
  // Заявки
  [APPLICATION_STATUS.DRAFT]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  [APPLICATION_STATUS.PENDING]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  [APPLICATION_STATUS.ADMIN_PROCESSING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  [APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  [APPLICATION_STATUS.RECEIVED]: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  [APPLICATION_STATUS.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  [APPLICATION_STATUS.CANCELED]: 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300',
  
  // Позиции
  [ITEM_STATUS.PENDING]: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  [ITEM_STATUS.ON_WAREHOUSE]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  [ITEM_STATUS.SENT_TO_MASTER]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  [ITEM_STATUS.CONFIRMED]: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  [ITEM_STATUS.REJECTED]: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
};

// === Иконки для статусов (Lucide React) ===
export const STATUS_ICONS = {
  [APPLICATION_STATUS.DRAFT]: 'FileText',
  [APPLICATION_STATUS.PENDING]: 'Clock',
  [APPLICATION_STATUS.ADMIN_PROCESSING]: 'Package',
  [APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE]: 'Boxes',
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: 'Mail',
  [APPLICATION_STATUS.RECEIVED]: 'CheckCircle',
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: 'AlertCircle',
  [APPLICATION_STATUS.REJECTED]: 'XCircle',
  [APPLICATION_STATUS.CANCELED]: 'Ban',
  
  [ITEM_STATUS.PENDING]: 'Hourglass',
  [ITEM_STATUS.ON_WAREHOUSE]: 'Warehouse',
  [ITEM_STATUS.SENT_TO_MASTER]: 'Send',
  [ITEM_STATUS.CONFIRMED]: 'CheckCircle2',
  [ITEM_STATUS.REJECTED]: 'XCircle'
};

// === Утилиты для фильтрации ===
export const isApplicationActive = (status) => {
  return [
    APPLICATION_STATUS.PENDING,
    APPLICATION_STATUS.ADMIN_PROCESSING,
    APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE,
    APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
    APPLICATION_STATUS.PARTIAL_RECEIVED
  ].includes(status);
};

export const isApplicationCompleted = (status) => {
  return [
    APPLICATION_STATUS.RECEIVED,
    APPLICATION_STATUS.REJECTED,
    APPLICATION_STATUS.CANCELED
  ].includes(status);
};

// utils/applicationStatuses.js
export const requiresMasterConfirmation = (status) => {
    return [
        APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
        APPLICATION_STATUS.PARTIAL_RECEIVED  // ✅ Важно: частичное получение тоже требует подтверждения
    ].includes(status);
};

export const isItemPendingConfirmation = (itemStatus, masterConfirmed, supplierReceived, requestedQty) => {
  return (
    itemStatus === ITEM_STATUS.SENT_TO_MASTER &&
    supplierReceived > 0 &&
    (masterConfirmed || 0) < requestedQty
  );
};