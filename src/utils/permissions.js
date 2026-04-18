// src/utils/permissions.js

// === Конфигурация ролей ===
export const ROLE_OPTIONS = [
  { value: 'foreman', label: 'Сотрудник' },
  { value: 'supply_admin', label: 'Администратор снабжения' },
  { value: 'manager', label: 'Руководитель' },
  { value: 'accountant', label: 'Бухгалтер' },
  { value: 'super_admin', label: 'Супер-администратор' },
  { value: 'client', label: 'Заказчик' },  // ← НОВАЯ РОЛЬ
];

// === Права доступа для каждой роли ===
export const ROLE_PERMISSIONS = {
  foreman: {
    canCreate: true,
    canEditStatus: false,
    canViewAnalytics: false,
    canViewAll: false,
    canViewOnlyCompleted: false,
    canViewAudit: false
  },
  supply_admin: {
    canCreate: false,
    canEditStatus: true,
    canViewAnalytics: true,
    canViewAll: true,
    canViewOnlyCompleted: false,
    canViewAudit: false
  },
  manager: {
    canCreate: false,
    canEditStatus: false,
    canViewAnalytics: true,
    canViewAll: true,
    canViewOnlyCompleted: false,
    canViewAudit: true
  },
  accountant: {
    canCreate: false,
    canEditStatus: false,
    canViewAnalytics: true,
    canViewAll: true,
    canViewOnlyCompleted: true,
    canViewAudit: true
  },
  // 🔥 ПОЛНОСТЬЮ ПЕРЕПИСАНАЯ РОЛЬ super_admin
  super_admin: {
    // ✅ ТОЛЬКО админские права
    canViewAllCompanies: true,    // Просмотр всех компаний
    canManageAllUsers: true,       // Управление пользователями всех компаний
    canManageTariffs: true,        // Управление тарифами
    canViewSystemSettings: true,   // Просмотр системных настроек
    
    // ❌ НЕТ прав обычных пользователей
    canCreate: false,              // Не создаёт заявки как прораб
    canEditStatus: false,          // Не меняет статусы заявок
    canViewAnalytics: false,       // Не смотрит аналитику конкретной компании
    canViewAll: false,             // Не видит все заявки своей компании
    canViewOnlyCompleted: false,   // Не видит только завершённые
    canViewAudit: false,           // Аудит — в админке отдельно
  },
  // 🆕 НОВАЯ РОЛЬ: ЗАКАЗЧИК
  client: {
    canViewOwnObjects: true,        // Только свои объекты
    canViewApplications: true,      // Просмотр заявок
    canConfirmWork: true,           // Подтверждение работ
    canViewActs: true,              // Просмотр актов
    canChat: true,                  // Чат с прорабом/менеджером
    canViewPhotos: true,            // Просмотр фото
    canCreate: false,               // Не создаёт заявки
    canEditStatus: false,           // Не меняет статусы
    canViewAnalytics: false,        // Не видит аналитику компании
    canViewAll: false,              // Только свои объекты
    canViewAudit: false,            // Не видит аудит
  }
};

// === Получение метки роли ===
export const getRoleLabel = (role) => {
  const option = ROLE_OPTIONS.find(r => r.value === role);
  return option ? option.label : role;
};

// === Проверка наличия права доступа ===
export const hasPermission = (userRole, permission) => {
  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.foreman;
  return permissions[permission] === true;
};

// === Проверка нескольких прав (все должны быть true) ===
export const hasAllPermissions = (userRole, permissions) => {
  return permissions.every(permission => hasPermission(userRole, permission));
};

// === Проверка хотя бы одного права ===
export const hasAnyPermission = (userRole, permissions) => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

// === Получение всех доступных прав для роли ===
export const getRolePermissions = (userRole) => {
  return ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.foreman;
};

// === Проверка, является ли роль супер-админом ===
export const isSuperAdmin = (userRole, userMetadata) => {
  return userRole === 'super_admin' || userMetadata?.role === 'super_admin';
};

// === Проверка, является ли пользователь заказчиком ===
export const isClient = (userRole) => userRole === 'client';

// === Проверка, может ли пользователь приглашать другие роли ===
export const canInviteRole = (userRole, targetRole, isCompanyOwner) => {
  // Супер-админ не приглашает через обычный интерфейс
  if (isSuperAdmin(userRole, { role: userRole })) {
    return false;
  }
  
  // Менеджер может приглашать заказчиков
  if (userRole === 'manager' && targetRole === 'client') {
    return true;
  }
  
  if (!['manager', 'supply_admin'].includes(userRole)) {
    return false;
  }
  if (targetRole === 'super_admin') {
    return false;
  }
  if (targetRole === 'manager' && !isCompanyOwner) {
    return false;
  }
  return true;
};

// === Фильтрация ролей для приглашения ===
export const getAvailableRolesForInvite = (userRole, isCompanyOwner) => {
  // Супер-админу не показываем модалку приглашения
  if (isSuperAdmin(userRole, { role: userRole })) {
    return [];
  }
  return ROLE_OPTIONS.filter(role => 
    canInviteRole(userRole, role.value, isCompanyOwner)
  );
};

// === Дополнительная проверка для супер-админа (чтобы случайно не дать обычные права) ===
export const isSuperAdminStrict = (userRole, userMetadata) => {
  return userRole === 'super_admin' || userMetadata?.role === 'super_admin';
};

// === Экспорт для совместимости ===
export default {
  ROLE_OPTIONS,
  ROLE_PERMISSIONS,
  getRoleLabel,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
  isSuperAdmin,
  isClient,                    // ← ЭКСПОРТ НОВОЙ ФУНКЦИИ
  canInviteRole,
  getAvailableRolesForInvite,
  isSuperAdminStrict
};