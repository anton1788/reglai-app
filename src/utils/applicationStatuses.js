// src/utils/applicationStatuses.js

// ============ КОНСТАНТЫ СТАТУСОВ ============

export const APPLICATION_STATUS = {
  PENDING: 'pending', // Ожидает обработки
  ADMIN_PROCESSING: 'admin_processing', // В обработке у снабженца
  PENDING_APPROVAL: 'pending_approval', // На согласовании у руководителя
  APPROVED: 'approved', // Согласовано руководителем
  PARTIAL_RECEIVED: 'partial_received', // Частично принято на склад
  READY_FOR_ISSUE: 'ready_for_issue', // Готово к выдаче мастеру (ВСЁ НА СКЛАДЕ)
  PENDING_MASTER_CONFIRMATION: 'pending_master_confirmation', // Ожидает подтверждения мастера
  RECEIVED: 'received', // Полностью получено мастером
  REJECTED: 'rejected', // Отклонено руководителем
  CANCELED: 'canceled' // Отменено
};

export const ITEM_STATUS = {
  PENDING: 'pending', // Ожидает поставки
  ON_WAREHOUSE: 'on_warehouse', // На складе (принято от поставщика)
  SENT_TO_MASTER: 'sent_to_master', // Отправлено мастеру
  CONFIRMED: 'confirmed', // Подтверждено мастером
  REJECTED: 'rejected' // Отклонено мастером
};

// ============ I18N КЛЮЧИ ============

export const STATUS_I18N = {
  [APPLICATION_STATUS.PENDING]: 'statusPending',
  [APPLICATION_STATUS.ADMIN_PROCESSING]: 'statusProcessing',
  [APPLICATION_STATUS.PENDING_APPROVAL]: 'statusPendingApproval',
  [APPLICATION_STATUS.APPROVED]: 'statusApproved',
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: 'statusPartial',
  [APPLICATION_STATUS.READY_FOR_ISSUE]: 'statusReadyForIssue',
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: 'statusAwaitingConfirmation',
  [APPLICATION_STATUS.RECEIVED]: 'statusReceived',
  [APPLICATION_STATUS.REJECTED]: 'statusRejected',
  [APPLICATION_STATUS.CANCELED]: 'statusCanceled',

  [ITEM_STATUS.PENDING]: 'itemStatusPending',
  [ITEM_STATUS.ON_WAREHOUSE]: 'itemStatusOnWarehouse',
  [ITEM_STATUS.SENT_TO_MASTER]: 'itemStatusSentToMaster',
  [ITEM_STATUS.CONFIRMED]: 'itemStatusConfirmed',
  [ITEM_STATUS.REJECTED]: 'itemStatusRejected'
};

// ============ СТИЛИ И ЦВЕТА ============

// Цвета для статусов (Tailwind CSS классы)
export const STATUS_COLORS = {
  [APPLICATION_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  [APPLICATION_STATUS.ADMIN_PROCESSING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  [APPLICATION_STATUS.PENDING_APPROVAL]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  [APPLICATION_STATUS.APPROVED]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  [APPLICATION_STATUS.READY_FOR_ISSUE]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  [APPLICATION_STATUS.RECEIVED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  [APPLICATION_STATUS.REJECTED]: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
  [APPLICATION_STATUS.CANCELED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',

  [ITEM_STATUS.PENDING]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  [ITEM_STATUS.ON_WAREHOUSE]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  [ITEM_STATUS.SENT_TO_MASTER]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  [ITEM_STATUS.CONFIRMED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  [ITEM_STATUS.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
};

// Иконки для статусов (названия компонентов lucide-react)
export const STATUS_ICONS = {
  [APPLICATION_STATUS.PENDING]: 'Clock',
  [APPLICATION_STATUS.ADMIN_PROCESSING]: 'Loader2',
  [APPLICATION_STATUS.PENDING_APPROVAL]: 'FileSearch',
  [APPLICATION_STATUS.APPROVED]: 'ShieldCheck',
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: 'Package',
  [APPLICATION_STATUS.READY_FOR_ISSUE]: 'PackageCheck',
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: 'UserCheck',
  [APPLICATION_STATUS.RECEIVED]: 'CheckCircle',
  [APPLICATION_STATUS.REJECTED]: 'ShieldX',
  [APPLICATION_STATUS.CANCELED]: 'XCircle',

  [ITEM_STATUS.PENDING]: 'Circle',
  [ITEM_STATUS.ON_WAREHOUSE]: 'Package',
  [ITEM_STATUS.SENT_TO_MASTER]: 'Truck',
  [ITEM_STATUS.CONFIRMED]: 'Check',
  [ITEM_STATUS.REJECTED]: 'X'
};

// Приоритет для сортировки статусов
export const STATUS_PRIORITY = {
  [APPLICATION_STATUS.PENDING]: 1,
  [APPLICATION_STATUS.PENDING_APPROVAL]: 2,
  [APPLICATION_STATUS.ADMIN_PROCESSING]: 3,
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: 4,
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: 5,
  [APPLICATION_STATUS.READY_FOR_ISSUE]: 6,
  [APPLICATION_STATUS.APPROVED]: 7,
  [APPLICATION_STATUS.RECEIVED]: 8,
  [APPLICATION_STATUS.REJECTED]: 9,
  [APPLICATION_STATUS.CANCELED]: 10
};

// ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

// Проверка, активна ли заявка (требует действий)
export const isApplicationActive = (status) => {
  const activeStatuses = [
    APPLICATION_STATUS.PENDING,
    APPLICATION_STATUS.ADMIN_PROCESSING,
    APPLICATION_STATUS.PENDING_APPROVAL,
    APPLICATION_STATUS.APPROVED,
    APPLICATION_STATUS.PARTIAL_RECEIVED,
    APPLICATION_STATUS.READY_FOR_ISSUE,
    APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION
  ];
  return activeStatuses.includes(status);
};

// Проверка, завершена ли заявка (финальные статусы)
export const isApplicationCompleted = (status) => {
  const completedStatuses = [
    APPLICATION_STATUS.RECEIVED,
    APPLICATION_STATUS.REJECTED,
    APPLICATION_STATUS.CANCELED
  ];
  return completedStatuses.includes(status);
};

// Проверка, требует ли заявка подтверждения мастером
export const requiresMasterConfirmation = (status) => {
  return status === APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION;
};

// Проверка, готова ли заявка к выдаче
export const isReadyForIssue = (status) => {
  return status === APPLICATION_STATUS.READY_FOR_ISSUE;
};

// Проверка, требует ли заявка согласования руководителя
export const requiresApproval = (materials) => {
  if (!Array.isArray(materials) || materials.length === 0) return false;

  // Логика: если общая сумма > 100000 или есть дорогие позиции
  const totalAmount = materials.reduce((sum, m) => {
    const qty = Number(m.quantity) || 0;
    const price = Number(m.price) || 1000;
    return sum + qty * price;
  }, 0);

  return totalAmount > 100000;
};

// Проверка возможности перехода между статусами
export const canTransitionTo = (fromStatus, toStatus) => {
  const validTransitions = {
    [APPLICATION_STATUS.PENDING]: [
      APPLICATION_STATUS.ADMIN_PROCESSING,
      APPLICATION_STATUS.PENDING_APPROVAL,
      APPLICATION_STATUS.CANCELED
    ],
    [APPLICATION_STATUS.ADMIN_PROCESSING]: [
      APPLICATION_STATUS.PARTIAL_RECEIVED,
      APPLICATION_STATUS.RECEIVED,
      APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
      APPLICATION_STATUS.READY_FOR_ISSUE,
      APPLICATION_STATUS.CANCELED
    ],
    [APPLICATION_STATUS.PENDING_APPROVAL]: [
      APPLICATION_STATUS.APPROVED,
      APPLICATION_STATUS.REJECTED,
      APPLICATION_STATUS.PENDING
    ],
    [APPLICATION_STATUS.APPROVED]: [
      APPLICATION_STATUS.ADMIN_PROCESSING,
      APPLICATION_STATUS.CANCELED
    ],
    [APPLICATION_STATUS.PARTIAL_RECEIVED]: [
      APPLICATION_STATUS.RECEIVED,
      APPLICATION_STATUS.READY_FOR_ISSUE,
      APPLICATION_STATUS.CANCELED
    ],
    [APPLICATION_STATUS.READY_FOR_ISSUE]: [
      APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
      APPLICATION_STATUS.CANCELED
    ],
    [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: [
      APPLICATION_STATUS.RECEIVED,
      APPLICATION_STATUS.ADMIN_PROCESSING,
      APPLICATION_STATUS.CANCELED
    ],
    [APPLICATION_STATUS.REJECTED]: [
      APPLICATION_STATUS.PENDING
    ]
  };

  return validTransitions[fromStatus]?.includes(toStatus) || false;
};

// Получение доступных статусов для перехода
export const getNextAvailableStatuses = (currentStatus) => {
  const transitions = {
    [APPLICATION_STATUS.PENDING]: [
      { status: APPLICATION_STATUS.ADMIN_PROCESSING, label: 'Начать обработку' },
      { status: APPLICATION_STATUS.PENDING_APPROVAL, label: 'Отправить на согласование' },
      { status: APPLICATION_STATUS.CANCELED, label: 'Отменить' }
    ],
    [APPLICATION_STATUS.ADMIN_PROCESSING]: [
      { status: APPLICATION_STATUS.PARTIAL_RECEIVED, label: 'Частичная приёмка' },
      { status: APPLICATION_STATUS.RECEIVED, label: 'Полная приёмка' },
      { status: APPLICATION_STATUS.READY_FOR_ISSUE, label: 'Готово к выдаче' },
      { status: APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION, label: 'Отправить мастеру' },
      { status: APPLICATION_STATUS.CANCELED, label: 'Отменить' }
    ],
    [APPLICATION_STATUS.PENDING_APPROVAL]: [
      { status: APPLICATION_STATUS.APPROVED, label: 'Согласовать' },
      { status: APPLICATION_STATUS.REJECTED, label: 'Отклонить' },
      { status: APPLICATION_STATUS.PENDING, label: 'Вернуть в обработку' }
    ],
    [APPLICATION_STATUS.APPROVED]: [
      { status: APPLICATION_STATUS.ADMIN_PROCESSING, label: 'Начать обработку' },
      { status: APPLICATION_STATUS.CANCELED, label: 'Отменить' }
    ],
    [APPLICATION_STATUS.PARTIAL_RECEIVED]: [
      { status: APPLICATION_STATUS.RECEIVED, label: 'Завершить приёмку' },
      { status: APPLICATION_STATUS.READY_FOR_ISSUE, label: 'Готово к выдаче' },
      { status: APPLICATION_STATUS.CANCELED, label: 'Отменить' }
    ],
    [APPLICATION_STATUS.READY_FOR_ISSUE]: [
      { status: APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION, label: 'Отправить мастеру' },
      { status: APPLICATION_STATUS.CANCELED, label: 'Отменить' }
    ],
    [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: [
      { status: APPLICATION_STATUS.RECEIVED, label: 'Завершить' },
      { status: APPLICATION_STATUS.ADMIN_PROCESSING, label: 'Вернуть в обработку' },
      { status: APPLICATION_STATUS.CANCELED, label: 'Отменить' }
    ]
  };

  return transitions[currentStatus] || [];
};

// ============ ПОЛУЧЕНИЕ ТЕКСТОВ СТАТУСОВ ============

// Получить текст статуса с поддержкой i18n
export const getStatusText = (status, language = 'ru') => {
  const translations = {
    ru: {
      // Application statuses
      statusPending: 'Ожидает обработки',
      statusProcessing: 'В обработке у снабженца',
      statusPendingApproval: 'На согласовании',
      statusApproved: 'Согласовано',
      statusPartial: 'Частично принято',
      statusReadyForIssue: 'Готово к выдаче',
      statusAwaitingConfirmation: 'Ожидает подтверждения мастера',
      statusReceived: 'Получено',
      statusRejected: 'Отклонено',
      statusCanceled: 'Отменено',
      // Item statuses
      itemStatusPending: 'Ожидает',
      itemStatusOnWarehouse: 'На складе',
      itemStatusSentToMaster: 'Отправлено мастеру',
      itemStatusConfirmed: 'Подтверждено',
      itemStatusRejected: 'Отклонено'
    },
    en: {
      // Application statuses
      statusPending: 'Pending',
      statusProcessing: 'Processing',
      statusPendingApproval: 'Pending Approval',
      statusApproved: 'Approved',
      statusPartial: 'Partially Received',
      statusReadyForIssue: 'Ready for Issue',
      statusAwaitingConfirmation: 'Awaiting Master Confirmation',
      statusReceived: 'Received',
      statusRejected: 'Rejected',
      statusCanceled: 'Canceled',
      // Item statuses
      itemStatusPending: 'Pending',
      itemStatusOnWarehouse: 'On Warehouse',
      itemStatusSentToMaster: 'Sent to Master',
      itemStatusConfirmed: 'Confirmed',
      itemStatusRejected: 'Rejected'
    }
  };

  const i18nKey = STATUS_I18N[status];
  if (!i18nKey) return status;

  return translations[language]?.[i18nKey] || translations.ru[i18nKey] || status;
};

// Получение цвета статуса (Tailwind классы)
export const getStatusColor = (status) => {
  return STATUS_COLORS[status] || STATUS_COLORS[APPLICATION_STATUS.PENDING];
};

// Получение иконки статуса
export const getStatusIcon = (status) => {
  return STATUS_ICONS[status] || STATUS_ICONS[APPLICATION_STATUS.PENDING];
};

// Получение приоритета статуса
export const getStatusPriority = (status) => {
  return STATUS_PRIORITY[status] || 999;
};