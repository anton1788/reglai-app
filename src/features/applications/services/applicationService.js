// src/features/applications/services/applicationService.js

import { APPLICATION_STATUS, ITEM_STATUS } from '../../../utils/applicationStatuses';

/**
 * Проверяет, может ли заявка перейти в целевой статус
 * @param {string} currentStatus - Текущий статус
 * @param {string} targetStatus - Целевой статус
 * @param {string} userRole - Роль пользователя
 * @returns {boolean}
 */
export const canTransition = (currentStatus, targetStatus, userRole) => {
  const transitions = {
    // Мастер/Прораб создаёт заявку
    [APPLICATION_STATUS.PENDING]: {
      allowed: ['master', 'foreman', 'supply_admin'],
      next: [
        APPLICATION_STATUS.ADMIN_PROCESSING,
        APPLICATION_STATUS.CANCELED,
      ],
    },
    // Снабженец обрабатывает
    [APPLICATION_STATUS.ADMIN_PROCESSING]: {
      allowed: ['supply_admin', 'manager'],
      next: [
        APPLICATION_STATUS.READY_FOR_ISSUE,   // Принял на склад
        APPLICATION_STATUS.PENDING_APPROVAL,   // Отправил на согласование
        APPLICATION_STATUS.CANCELED,           // Отменил
      ],
    },
    // Готово к выдаче мастеру
    [APPLICATION_STATUS.READY_FOR_ISSUE]: {
      allowed: ['supply_admin', 'manager'],
      next: [
        APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION, // Отправил мастеру
        APPLICATION_STATUS.PARTIAL_RECEIVED,            // Частично отправил
        APPLICATION_STATUS.CANCELED,                    // Отменил
      ],
    },
    // Мастер подтверждает получение
    [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: {
      allowed: ['master', 'foreman'],
      next: [
        APPLICATION_STATUS.RECEIVED,           // Всё получил
        APPLICATION_STATUS.PARTIAL_RECEIVED,   // Частично получил
        APPLICATION_STATUS.CANCELED,           // Отклонил
      ],
    },
    // Частично получено (можно добрать или закрыть)
    [APPLICATION_STATUS.PARTIAL_RECEIVED]: {
      allowed: ['master', 'foreman', 'supply_admin'],
      next: [
        APPLICATION_STATUS.RECEIVED,    // Добрал всё
        APPLICATION_STATUS.CANCELED,    // Закрыл с остатком
      ],
    },
    // Терминальные статусы
    [APPLICATION_STATUS.RECEIVED]: {
      allowed: ['master', 'foreman', 'supply_admin', 'accountant'],
      next: [],
    },
    [APPLICATION_STATUS.CANCELED]: {
      allowed: ['master', 'foreman', 'supply_admin', 'manager'],
      next: [],
    },
  };

  const rule = transitions[currentStatus];
  if (!rule) return false;
  if (!rule.allowed.includes(userRole)) return false;
  return rule.next.includes(targetStatus);
};

/**
 * Рассчитывает новый статус заявки на основе материалов
 * @param {Array} materials - Массив материалов
 * @returns {string} - Новый статус
 */
export const calculateStatusFromMaterials = (materials) => {
  if (!materials || materials.length === 0) return APPLICATION_STATUS.PENDING;

  const allReceived = materials.every((m) => 
    Number(m.received || 0) >= Number(m.quantity || 0)
  );
  const anyReceived = materials.some((m) => 
    (Number(m.received || 0) || Number(m.supplier_received_quantity || 0)) > 0
  );
  const allOnWarehouse = materials.every((m) => 
    Number(m.supplier_received_quantity || 0) >= Number(m.quantity || 0)
  );
  const anyOnWarehouse = materials.some((m) => 
    Number(m.supplier_received_quantity || 0) > 0
  );
  const anySent = materials.some((m) => 
    Number(m.sent_to_master_quantity || 0) > 0
  );

  // Приоритет: всё получено > всё на складе > частично получено > что-то на складе > что-то отправлено
  if (allReceived) return APPLICATION_STATUS.RECEIVED;
  if (allOnWarehouse && !anySent) return APPLICATION_STATUS.READY_FOR_ISSUE;
  if (anySent && !allReceived) return APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION;
  if (anyOnWarehouse) return APPLICATION_STATUS.PARTIAL_RECEIVED;
  if (anyReceived) return APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION;
  
  return APPLICATION_STATUS.PENDING;
};

/**
 * Обновляет статус отдельного материала на основе полученных количеств
 * @param {Object} material - Объект материала
 * @returns {string} - Новый статус материала
 */
export const updateMaterialStatus = (material) => {
  const requested = Number(material.quantity) || 0;
  const received = Number(material.received) || 0;
  const supplierReceived = Number(material.supplier_received_quantity) || 0;
  const sentToMaster = Number(material.sent_to_master_quantity) || 0;

  if (received >= requested) return ITEM_STATUS.CONFIRMED;
  if (sentToMaster > 0) return ITEM_STATUS.SENT_TO_MASTER;
  if (supplierReceived >= requested) return ITEM_STATUS.ON_WAREHOUSE;
  if (supplierReceived > 0) return ITEM_STATUS.PARTIAL_RECEIVED;
  return ITEM_STATUS.PENDING;
};

/**
 * Получает статус для отображения в UI
 * @param {string} status - Статус материала
 * @param {Object} t - Функция перевода
 * @returns {string} - Текст статуса
 */
export const getMaterialStatusText = (status, t) => {
  const map = {
    [ITEM_STATUS.PENDING]: t('statusPending') || 'Ожидает',
    [ITEM_STATUS.ON_WAREHOUSE]: t('itemStatusOnWarehouse') || 'На складе',
    [ITEM_STATUS.SENT_TO_MASTER]: t('itemStatusSent') || 'Отправлено',
    [ITEM_STATUS.CONFIRMED]: t('itemStatusConfirmed') || 'Получено',
    [ITEM_STATUS.REJECTED]: t('itemStatusRejected') || 'Отклонено',
    [ITEM_STATUS.PARTIAL_RECEIVED]: t('itemStatusPartial') || 'Частично',
  };
  return map[status] || status;
};

/**
 * Проверяет, можно ли отправить материалы мастеру
 * @param {Array} materials - Материалы заявки
 * @returns {Object} - { canSend, itemsToSend }
 */
export const getItemsToSend = (materials) => {
  if (!materials) return { canSend: false, itemsToSend: [] };
  
  const itemsToSend = materials
    .filter((m) => {
      const onWarehouse = Number(m.supplier_received_quantity) || 0;
      const alreadySent = Number(m.sent_to_master_quantity) || 0;
      const isAlreadySent = m.status === ITEM_STATUS.SENT_TO_MASTER || 
                           m.status === ITEM_STATUS.CONFIRMED;
      return onWarehouse > 0 && !isAlreadySent && alreadySent < onWarehouse;
    })
    .map((m) => ({
      ...m,
      quantityToSend: Math.min(
        Number(m.supplier_received_quantity) || 0,
        (Number(m.supplier_received_quantity) || 0) - (Number(m.sent_to_master_quantity) || 0)
      ),
    }));

  return {
    canSend: itemsToSend.length > 0 && itemsToSend.some(i => i.quantityToSend > 0),
    itemsToSend,
  };
};

/**
 * Проверяет, нужно ли обновлять статус заявки
 * @param {Array} oldMaterials - Старые материалы
 * @param {Array} newMaterials - Новые материалы
 * @param {string} currentStatus - Текущий статус заявки
 * @returns {string|null} - Новый статус или null, если не изменился
 */
export const getUpdatedStatus = (oldMaterials, newMaterials, currentStatus) => {
  const hasChanges = oldMaterials.some((old, idx) => {
    const newMat = newMaterials[idx];
    return (Number(newMat.supplier_received_quantity) || 0) !== (Number(old.supplier_received_quantity) || 0) ||
           (Number(newMat.received) || 0) !== (Number(old.received) || 0) ||
           (Number(newMat.sent_to_master_quantity) || 0) !== (Number(old.sent_to_master_quantity) || 0);
  });

  if (!hasChanges) return null;

  const newStatus = calculateStatusFromMaterials(newMaterials);
  return newStatus !== currentStatus ? newStatus : null;
};