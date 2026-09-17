// src/utils/applicationStatuses.js

// ============ КОНСТАНТЫ СТАТУСОВ ============

export const APPLICATION_STATUS = {
  PENDING: 'pending',
  ADMIN_PROCESSING: 'admin_processing',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  PARTIAL_ON_WAREHOUSE: 'partial_on_warehouse',
  SUPPLIER_RECEIVED: 'supplier_received',
  PARTIAL_RECEIVED: 'partial_received',
  READY_FOR_ISSUE: 'ready_for_issue',
  PENDING_MASTER_CONFIRMATION: 'pending_master_confirmation',
  RECEIVED: 'received',
  REJECTED: 'rejected',
  CANCELED: 'canceled',
  CONSOLIDATED: 'consolidated'
};

export const ITEM_STATUS = {
  PENDING: 'pending',
  ON_WAREHOUSE: 'on_warehouse',
  SENT_TO_MASTER: 'sent_to_master',
  PARTIAL_SENT: 'partial_sent',         // 🆕 для частичной отправки
  PARTIAL_CONFIRMED: 'partial_confirmed',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected'
};

// ============ I18N КЛЮЧИ ============

export const STATUS_I18N = {
  [APPLICATION_STATUS.PENDING]: 'statusPending',
  [APPLICATION_STATUS.ADMIN_PROCESSING]: 'statusProcessing',
  [APPLICATION_STATUS.PENDING_APPROVAL]: 'statusPendingApproval',
  [APPLICATION_STATUS.APPROVED]: 'statusApproved',
  [APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE]: 'statusPartialOnWarehouse',
  [APPLICATION_STATUS.SUPPLIER_RECEIVED]: 'statusSupplierReceived',
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: 'statusPartial',
  [APPLICATION_STATUS.READY_FOR_ISSUE]: 'statusReadyForIssue',
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: 'statusAwaitingConfirmation',
  [APPLICATION_STATUS.RECEIVED]: 'statusReceived',
  [APPLICATION_STATUS.REJECTED]: 'statusRejected',
  [APPLICATION_STATUS.CANCELED]: 'statusCanceled',
  [APPLICATION_STATUS.CONSOLIDATED]: 'statusConsolidated',

  [ITEM_STATUS.PENDING]: 'itemStatusPending',
  [ITEM_STATUS.ON_WAREHOUSE]: 'itemStatusOnWarehouse',
  [ITEM_STATUS.SENT_TO_MASTER]: 'itemStatusSentToMaster',
  [ITEM_STATUS.PARTIAL_SENT]: 'itemStatusPartialSent',
  [ITEM_STATUS.CONFIRMED]: 'itemStatusConfirmed',
  [ITEM_STATUS.REJECTED]: 'itemStatusRejected'
};

// ============ СТИЛИ И ЦВЕТА ============

export const STATUS_COLORS = {
  [APPLICATION_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  [APPLICATION_STATUS.ADMIN_PROCESSING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  [APPLICATION_STATUS.PENDING_APPROVAL]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  [APPLICATION_STATUS.APPROVED]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  [APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  [APPLICATION_STATUS.SUPPLIER_RECEIVED]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  [APPLICATION_STATUS.READY_FOR_ISSUE]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200',
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  [APPLICATION_STATUS.RECEIVED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  [APPLICATION_STATUS.REJECTED]: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
  [APPLICATION_STATUS.CANCELED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  [APPLICATION_STATUS.CONSOLIDATED]: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',

  [ITEM_STATUS.PENDING]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  [ITEM_STATUS.ON_WAREHOUSE]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  [ITEM_STATUS.SENT_TO_MASTER]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  [ITEM_STATUS.PARTIAL_SENT]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  [ITEM_STATUS.CONFIRMED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  [ITEM_STATUS.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
};

export const STATUS_ICONS = {
  [APPLICATION_STATUS.PENDING]: 'Clock',
  [APPLICATION_STATUS.ADMIN_PROCESSING]: 'Loader2',
  [APPLICATION_STATUS.PENDING_APPROVAL]: 'FileSearch',
  [APPLICATION_STATUS.APPROVED]: 'ShieldCheck',
  [APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE]: 'Boxes',
  [APPLICATION_STATUS.SUPPLIER_RECEIVED]: 'Warehouse',
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: 'Package',
  [APPLICATION_STATUS.READY_FOR_ISSUE]: 'PackageCheck',
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: 'UserCheck',
  [APPLICATION_STATUS.RECEIVED]: 'CheckCircle',
  [APPLICATION_STATUS.REJECTED]: 'ShieldX',
  [APPLICATION_STATUS.CANCELED]: 'XCircle',
  [APPLICATION_STATUS.CONSOLIDATED]: 'Layers',

  [ITEM_STATUS.PENDING]: 'Circle',
  [ITEM_STATUS.ON_WAREHOUSE]: 'Package',
  [ITEM_STATUS.SENT_TO_MASTER]: 'Truck',
  [ITEM_STATUS.PARTIAL_SENT]: 'Truck',
  [ITEM_STATUS.CONFIRMED]: 'Check',
  [ITEM_STATUS.REJECTED]: 'X'
};

export const STATUS_PRIORITY = {
  [APPLICATION_STATUS.PENDING]: 1,
  [APPLICATION_STATUS.PENDING_APPROVAL]: 2,
  [APPLICATION_STATUS.ADMIN_PROCESSING]: 3,
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: 4,
  [APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE]: 5,
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: 6,
  [APPLICATION_STATUS.SUPPLIER_RECEIVED]: 7,
  [APPLICATION_STATUS.READY_FOR_ISSUE]: 8,
  [APPLICATION_STATUS.APPROVED]: 9,
  [APPLICATION_STATUS.RECEIVED]: 10,
  [APPLICATION_STATUS.REJECTED]: 11,
  [APPLICATION_STATUS.CANCELED]: 12,
  [APPLICATION_STATUS.CONSOLIDATED]: 13
};

// ============ ПРОВЕРКИ СТАТУСОВ ============

export const isApplicationActive = (status) => {
  const activeStatuses = [
    APPLICATION_STATUS.PENDING,
    APPLICATION_STATUS.ADMIN_PROCESSING,
    APPLICATION_STATUS.PENDING_APPROVAL,
    APPLICATION_STATUS.APPROVED,
    APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE,
    APPLICATION_STATUS.SUPPLIER_RECEIVED,
    APPLICATION_STATUS.PARTIAL_RECEIVED,
    APPLICATION_STATUS.READY_FOR_ISSUE,
    APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
    'sent_to_master'
  ];
  return activeStatuses.includes(status);
};

export const isApplicationCompleted = (status) => {
  const completedStatuses = [
    APPLICATION_STATUS.RECEIVED,
    APPLICATION_STATUS.REJECTED,
    APPLICATION_STATUS.CANCELED,
    APPLICATION_STATUS.CONSOLIDATED
  ];
  return completedStatuses.includes(status);
};

/**
 * Требует ли заявка подтверждения мастером?
 * ✅ ТЕПЕРЬ включаем PARTIAL_RECEIVED — чтобы мастер мог вернуться
 *    и подтвердить остатки, если снабженец что-то довезёт.
 */
export const requiresMasterConfirmation = (status) => {
  return status === APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION ||
         status === 'pending_master_confirmation' ||
         status === 'sent_to_master' ||
         status === APPLICATION_STATUS.PARTIAL_RECEIVED;
};

export const isReadyForIssue = (status) => {
  return status === APPLICATION_STATUS.READY_FOR_ISSUE ||
         status === APPLICATION_STATUS.SUPPLIER_RECEIVED;
};

export const requiresApproval = (materials) => {
  if (!Array.isArray(materials) || materials.length === 0) return false;

  const totalAmount = materials.reduce((sum, m) => {
    const qty = Number(m.quantity) || 0;
    const price = Number(m.price) || 1000;
    return sum + qty * price;
  }, 0);

  return totalAmount > 100000;
};

// ============ ПЕРЕХОДЫ ============

export const canTransitionTo = (fromStatus, toStatus) => {
  const validTransitions = {
    [APPLICATION_STATUS.PENDING]: [
      APPLICATION_STATUS.ADMIN_PROCESSING,
      APPLICATION_STATUS.PENDING_APPROVAL,
      APPLICATION_STATUS.CANCELED
    ],
    [APPLICATION_STATUS.ADMIN_PROCESSING]: [
      APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE,
      APPLICATION_STATUS.SUPPLIER_RECEIVED,
      APPLICATION_STATUS.PARTIAL_RECEIVED,
      APPLICATION_STATUS.READY_FOR_ISSUE,
      APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
      APPLICATION_STATUS.RECEIVED,
      APPLICATION_STATUS.CANCELED
    ],
    [APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE]: [
      APPLICATION_STATUS.SUPPLIER_RECEIVED,
      APPLICATION_STATUS.READY_FOR_ISSUE,
      APPLICATION_STATUS.PARTIAL_RECEIVED,
      APPLICATION_STATUS.CANCELED
    ],
    [APPLICATION_STATUS.SUPPLIER_RECEIVED]: [
      APPLICATION_STATUS.READY_FOR_ISSUE,
      APPLICATION_STATUS.PARTIAL_RECEIVED,
      APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
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
      APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
      APPLICATION_STATUS.CANCELED
    ],
    [APPLICATION_STATUS.READY_FOR_ISSUE]: [
      APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
      APPLICATION_STATUS.CANCELED
    ],
    [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: [
      APPLICATION_STATUS.RECEIVED,
      APPLICATION_STATUS.PARTIAL_RECEIVED,
      APPLICATION_STATUS.ADMIN_PROCESSING,
      APPLICATION_STATUS.CANCELED
    ],
    [APPLICATION_STATUS.REJECTED]: [
      APPLICATION_STATUS.PENDING
    ]
  };

  return validTransitions[fromStatus]?.includes(toStatus) || false;
};

export const getNextAvailableStatuses = (currentStatus) => {
  const transitions = {
    [APPLICATION_STATUS.PENDING]: [
      { status: APPLICATION_STATUS.ADMIN_PROCESSING, label: 'Начать обработку' },
      { status: APPLICATION_STATUS.PENDING_APPROVAL, label: 'Отправить на согласование' },
      { status: APPLICATION_STATUS.CANCELED, label: 'Отменить' }
    ],
    [APPLICATION_STATUS.ADMIN_PROCESSING]: [
      { status: APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE, label: 'Частичная приёмка' },
      { status: APPLICATION_STATUS.SUPPLIER_RECEIVED, label: 'Полная приёмка' },
      { status: APPLICATION_STATUS.READY_FOR_ISSUE, label: 'Готово к выдаче' },
      { status: APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION, label: 'Отправить мастеру' },
      { status: APPLICATION_STATUS.CANCELED, label: 'Отменить' }
    ],
    [APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE]: [
      { status: APPLICATION_STATUS.SUPPLIER_RECEIVED, label: 'Завершить приёмку' },
      { status: APPLICATION_STATUS.READY_FOR_ISSUE, label: 'Готово к выдаче' },
      { status: APPLICATION_STATUS.CANCELED, label: 'Отменить' }
    ],
    [APPLICATION_STATUS.SUPPLIER_RECEIVED]: [
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
      { status: APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION, label: 'Отправить мастеру' },
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

export const getStatusText = (status, language = 'ru') => {
  const translations = {
    ru: {
      statusPending: 'Ожидает обработки',
      statusProcessing: 'В обработке у снабженца',
      statusPendingApproval: 'На согласовании',
      statusApproved: 'Согласовано',
      statusPartialOnWarehouse: 'Частично на складе',
      statusSupplierReceived: 'На складе',
      statusPartial: 'Частично принято',
      statusReadyForIssue: 'Готово к выдаче',
      statusAwaitingConfirmation: 'Ожидает подтверждения мастера',
      statusReceived: 'Получено',
      statusRejected: 'Отклонено',
      statusCanceled: 'Отменено',
      statusConsolidated: 'Объединено',
      itemStatusPending: 'Ожидает',
      itemStatusOnWarehouse: 'На складе',
      itemStatusSentToMaster: 'Отправлено мастеру',
      itemStatusPartialSent: 'Частично отправлено',
      itemStatusConfirmed: 'Подтверждено',
      itemStatusRejected: 'Отклонено'
    },
    en: {
      statusPending: 'Pending',
      statusProcessing: 'Processing',
      statusPendingApproval: 'Pending Approval',
      statusApproved: 'Approved',
      statusPartialOnWarehouse: 'Partially On Warehouse',
      statusSupplierReceived: 'On Warehouse',
      statusPartial: 'Partially Received',
      statusReadyForIssue: 'Ready for Issue',
      statusAwaitingConfirmation: 'Awaiting Master Confirmation',
      statusReceived: 'Received',
      statusRejected: 'Rejected',
      statusCanceled: 'Canceled',
      statusConsolidated: 'Consolidated',
      itemStatusPending: 'Pending',
      itemStatusOnWarehouse: 'On Warehouse',
      itemStatusSentToMaster: 'Sent to Master',
      itemStatusPartialSent: 'Partially Sent',
      itemStatusConfirmed: 'Confirmed',
      itemStatusRejected: 'Rejected'
    }
  };

  const i18nKey = STATUS_I18N[status];
  if (!i18nKey) return status;

  return translations[language]?.[i18nKey] || translations.ru[i18nKey] || status;
};

export const getStatusColor = (status) => {
  return STATUS_COLORS[status] || STATUS_COLORS[APPLICATION_STATUS.PENDING];
};

export const getStatusIcon = (status) => {
  return STATUS_ICONS[status] || STATUS_ICONS[APPLICATION_STATUS.PENDING];
};

export const getStatusPriority = (status) => {
  return STATUS_PRIORITY[status] || 999;
};

// ============================================================
// 🔧 ФУНКЦИИ ДЛЯ РАБОТЫ С ВЫДАЧЕЙ МАТЕРИАЛОВ
// ============================================================

/**
 * ✅ ИСПРАВЛЕНО: проверяем только фактическое наличие на складе,
 *    НЕ сравниваем с quantity — иначе недопоставка вечно висит в "готовых к выдаче".
 *
 * Логика:
 *  - материал есть на складе (supplier_received_quantity > 0)
 *  - и ещё не всё отдано мастеру (sent_to_master_quantity < supplier_received_quantity)
 *  - и мастер ещё не подтвердил полностью (received < sent_to_master_quantity)
 */
export const hasMaterialsReadyToIssue = (application) => {
  if (!application?.materials) return false;

  return application.materials.some(m => {
    const onWarehouse = Number(m.supplier_received_quantity) || 0;
    const alreadySent = Number(m.sent_to_master_quantity) || 0;
    const received = Number(m.received) || 0;

    // Есть что выдать?
    if (onWarehouse <= 0) return false;
    // Уже всё выдали мастеру?
    if (alreadySent >= onWarehouse) return false;
    // Мастер уже получил всё, что ему отправили?
    if (received >= alreadySent && alreadySent > 0) return false;

    return true;
  });
};

/**
 * ✅ ИСПРАВЛЕНО: убрана проверка received >= quantity
 */
export const getTotalAvailableForIssue = (application) => {
  if (!application?.materials) return 0;

  return application.materials.reduce((total, m) => {
    const onWarehouse = Number(m.supplier_received_quantity) || 0;
    const alreadySent = Number(m.sent_to_master_quantity) || 0;
    const received = Number(m.received) || 0;

    // Если мастер уже всё получил, что ему отправили — не считаем
    if (alreadySent > 0 && received >= alreadySent) return total;

    return total + Math.max(0, onWarehouse - alreadySent);
  }, 0);
};

/**
 * ✅ ИСПРАВЛЕНО: убрана проверка received >= quantity
 */
export const getMaterialsReadyToIssue = (application) => {
  if (!application?.materials) return [];

  return application.materials
    .filter(m => {
      const onWarehouse = Number(m.supplier_received_quantity) || 0;
      const alreadySent = Number(m.sent_to_master_quantity) || 0;
      const received = Number(m.received) || 0;

      if (onWarehouse <= 0) return false;
      if (alreadySent >= onWarehouse) return false;
      if (alreadySent > 0 && received >= alreadySent) return false;

      return true;
    })
    .map(m => ({
      ...m,
      availableToIssue: Math.max(0,
        (Number(m.supplier_received_quantity) || 0) -
        (Number(m.sent_to_master_quantity) || 0)
      )
    }));
};

/**
 * ✅ ИСПРАВЛЕНО: заявка считается полностью подтверждённой, если
 *    мастер получил ВСЁ, что ему выдали (не всё, что заказано!)
 */
export const isFullyConfirmed = (application) => {
  if (!application?.materials) return false;

  return application.materials.every(m => {
    const sentToMaster = Number(m.sent_to_master_quantity) || 0;
    const received = Number(m.received) || 0;

    // Мастеру ничего не отправляли — пропускаем
    if (sentToMaster === 0) return true;

    // Мастер получил всё, что было отправлено
    return received >= sentToMaster;
  });
};

export const hasPartialConfirmation = (application) => {
  if (!application?.materials) return false;

  return application.materials.some(m => {
    const sentToMaster = Number(m.sent_to_master_quantity) || 0;
    const received = Number(m.received) || 0;
    // Частично — если что-то отправили, но мастер получил меньше
    return sentToMaster > 0 && received > 0 && received < sentToMaster;
  });
};

/**
 * ✅ ИСПРАВЛЕНО: логика определения статуса учитывает "недопоставку"
 */
export const getNextStatusForApplication = (application) => {
  if (!application?.materials) return application.status;

  // Всё, что мастеру выдали — он подтвердил?
  const masterReceivedAll = application.materials.every(m => {
    const sent = Number(m.sent_to_master_quantity) || 0;
    const received = Number(m.received) || 0;
    if (sent === 0) return true;
    return received >= sent;
  });

  const anySent = application.materials.some(m => {
    return (Number(m.sent_to_master_quantity) || 0) > 0;
  });

  const anyOnWarehouse = application.materials.some(m => {
    return (Number(m.supplier_received_quantity) || 0) > 0;
  });

  // Всё, что было отправлено мастеру — подтверждено
  if (masterReceivedAll && anySent) {
    return APPLICATION_STATUS.RECEIVED;
  }

  // Мастер что-то получил, но не всё выданное
  if (anySent) {
    return APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION;
  }

  // Ничего не отправляли — но что-то есть на складе
  if (anyOnWarehouse) {
    return APPLICATION_STATUS.SUPPLIER_RECEIVED;
  }

  return application.status;
};

// ============================================================
// АЛИАСЫ И НОРМАЛИЗАЦИЯ
// ============================================================

export const STATUS_ALIASES = {
  'ready_to_issue': APPLICATION_STATUS.READY_FOR_ISSUE,
  'ready_for_issue': APPLICATION_STATUS.READY_FOR_ISSUE,
  'supplier_received': APPLICATION_STATUS.SUPPLIER_RECEIVED,
  'partial_on_warehouse': APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE,
  'on_warehouse': APPLICATION_STATUS.SUPPLIER_RECEIVED,
  'sent': APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
  'confirmed': APPLICATION_STATUS.RECEIVED,
  'consolidated': APPLICATION_STATUS.CONSOLIDATED,
  'merged': APPLICATION_STATUS.CONSOLIDATED,
};

export const normalizeStatus = (status) => {
  if (!status) return APPLICATION_STATUS.PENDING;
  return STATUS_ALIASES[status] || status;
};