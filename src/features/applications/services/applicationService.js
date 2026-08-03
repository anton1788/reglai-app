// src/features/applications/services/applicationService.js

import { APPLICATION_STATUS, ITEM_STATUS } from '../../../utils/applicationStatuses';

/**
 * Проверяет, может ли заявка перейти в целевой статус
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
    // Снабженец взял в работу
    [APPLICATION_STATUS.ADMIN_PROCESSING]: {
      allowed: ['supply_admin', 'manager'],
      next: [
        APPLICATION_STATUS.READY_FOR_ISSUE,
        APPLICATION_STATUS.PENDING_APPROVAL,
        APPLICATION_STATUS.CANCELED,
      ],
    },
    // На согласовании у руководителя
    [APPLICATION_STATUS.PENDING_APPROVAL]: {
      allowed: ['manager', 'director', 'supply_admin'],
      next: [
        APPLICATION_STATUS.ADMIN_PROCESSING,
        APPLICATION_STATUS.READY_FOR_ISSUE,
        APPLICATION_STATUS.CANCELED,
      ],
    },
    // Готово к выдаче (все материалы на складе)
    [APPLICATION_STATUS.READY_FOR_ISSUE]: {
      allowed: ['supply_admin', 'manager'],
      next: [
        APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
        APPLICATION_STATUS.PARTIAL_RECEIVED,
      ],
    },
    // Ожидает подтверждения мастера
    [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: {
      allowed: ['master', 'foreman'],
      next: [
        APPLICATION_STATUS.RECEIVED,
        APPLICATION_STATUS.PARTIAL_RECEIVED,
      ],
    },
    // Частично получено
    [APPLICATION_STATUS.PARTIAL_RECEIVED]: {
      allowed: ['master', 'foreman', 'supply_admin'],
      next: [
        APPLICATION_STATUS.RECEIVED,
        APPLICATION_STATUS.CANCELED,
      ],
    },
    // Получено полностью (терминальный)
    [APPLICATION_STATUS.RECEIVED]: {
      allowed: ['master', 'foreman', 'supply_admin', 'accountant'],
      next: [],
    },
    // Отменено (терминальный)
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
 */
export const calculateStatusFromMaterials = (materials) => {
  if (!materials || materials.length === 0) {
    return APPLICATION_STATUS.PENDING;
  }

  const allConfirmed = materials.every((m) => 
    Number(m.received || 0) >= Number(m.quantity || 0)
  );
  
  const anyConfirmed = materials.some((m) => 
    Number(m.received || 0) > 0
  );
  
  const allOnWarehouse = materials.every((m) => 
    Number(m.supplier_received_quantity || 0) >= Number(m.quantity || 0)
  );
  
  const anyOnWarehouse = materials.some((m) => 
    Number(m.supplier_received_quantity || 0) > 0
  );
  
  const anySentToMaster = materials.some((m) => 
    (Number(m.sent_to_master_quantity) || 0) > 0
  );

  // Все подтверждены мастером → ЗАВЕРШЕНО
  if (allConfirmed) {
    return APPLICATION_STATUS.RECEIVED;
  }

  // Есть подтверждённые → ЧАСТИЧНО ПОЛУЧЕНО
  if (anyConfirmed) {
    return APPLICATION_STATUS.PARTIAL_RECEIVED;
  }

  // Все на складе → ГОТОВЫ К ВЫДАЧЕ
  if (allOnWarehouse) {
    return APPLICATION_STATUS.READY_FOR_ISSUE;
  }

  // Часть на складе → ЧАСТИЧНО НА СКЛАДЕ
  if (anyOnWarehouse) {
    return APPLICATION_STATUS.PARTIAL_RECEIVED;
  }

  // Есть отправленные мастеру → ОЖИДАЕТ ПОДТВЕРЖДЕНИЯ
  if (anySentToMaster) {
    return APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION;
  }

  // Ничего не принято → В ОБРАБОТКЕ
  return APPLICATION_STATUS.ADMIN_PROCESSING;
};

/**
 * Обновляет статус отдельного материала
 */
export const updateMaterialStatus = (material) => {
  const requested = Number(material.quantity) || 0;
  const received = Number(material.received) || 0;
  const supplierReceived = Number(material.supplier_received_quantity) || 0;
  const sentToMaster = Number(material.sent_to_master_quantity) || 0;

  // Получено мастером
  if (received >= requested) {
    return ITEM_STATUS.CONFIRMED;
  }

  // Отправлено мастеру
  if (sentToMaster > 0) {
    return ITEM_STATUS.SENT_TO_MASTER;
  }

  // На складе
  if (supplierReceived >= requested) {
    return ITEM_STATUS.ON_WAREHOUSE;
  }

  // Частично на складе
  if (supplierReceived > 0) {
    return ITEM_STATUS.PARTIAL_RECEIVED;
  }

  // Ожидание
  return ITEM_STATUS.PENDING;
};

/**
 * Проверяет, может ли пользователь выполнить действие с заявкой
 */
export const canPerformAction = (application, userRole, userId) => {
  // Проверка владельца для мастеров
  if (userRole === 'master' || userRole === 'foreman') {
    return application.user_id === userId;
  }

  // Снабженец может всё, кроме создания
  if (userRole === 'supply_admin') {
    return true;
  }

  // Менеджер может управлять согласованиями
  if (userRole === 'manager' || userRole === 'director') {
    return application.status === APPLICATION_STATUS.PENDING_APPROVAL;
  }

  return false;
};

/**
 * Формирует запись для истории статусов
 */
export const createHistoryEntry = (userId, userEmail, action, oldStatus, newStatus, details = '') => {
  return {
    user_id: userId,
    user_email: userEmail,
    action,
    old_status: oldStatus,
    new_status: newStatus,
    timestamp: new Date().toISOString(),
    details: details || `${action} из ${oldStatus} в ${newStatus}`,
  };
};