// src/utils/permissions.js

// === Конфигурация ролей ===
export const ROLE_OPTIONS = [
  { value: 'master', label: 'Мастер (Исполнитель)' },
  { value: 'foreman', label: 'Прораб' },
  { value: 'supply_admin', label: 'Снабженец' },
  { value: 'manager', label: 'Руководитель' },        // ← ИСПРАВЛЕНО: был director, стал manager
  { value: 'accountant', label: 'Бухгалтер' },
  { value: 'client', label: 'Заказчик' },
  { value: 'super_admin', label: 'Супер-администратор' }
];

// === Права доступа для каждой роли ===
export const ROLE_PERMISSIONS = {
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
  manager: {                       // ← ИСПРАВЛЕНО: был director, стал manager (Руководитель)
    canCreate: false,              // ❌ Руководитель не создает заявки
    canViewAnalytics: true,
    canViewAudit: true,
    canManageUsers: true,          // Может управлять пользователями
    canManageTariffs: true,        // Может управлять тарифами
    canManageCompany: false,
    canReceiveMaterials: true,
    canManageWarehouse: true
  },
  master: {
    canCreate: true,               // ✅ Прораб создает заявки
    canViewAnalytics: false,
    canViewAudit: false,
    canManageUsers: false,
    canManageTariffs: false,       // ❌ Не видит тарифы
    canManageCompany: false,
    canReceiveMaterials: false,
    canManageWarehouse: false
  },
  foreman: {                       // ОТДЕЛЬНЫЙ ПРОРАБ (расширенные права)
    canCreate: true,
    canViewAnalytics: true,
    canManageUsers: false,
    canReceiveMaterials: true,
    canManageWarehouse: true,
    canViewAudit: false,
    canManageTariffs: false,
    canManageCompany: false
  },
  supply_admin: {
    canCreate: true,               // ✅ Снабженец создает заявки
    canViewAnalytics: false,
    canViewAudit: false,
    canManageUsers: false,
    canManageTariffs: false,       // ❌ Не видит тарифы
    canManageCompany: false,
    canReceiveMaterials: true,
    canManageWarehouse: true
  },
  accountant: {
    canCreate: false,              // ❌ Бухгалтер не создает заявки
    canViewAnalytics: true,
    canViewAudit: true,
    canManageUsers: false,
    canManageTariffs: false,
    canManageCompany: false,
    canReceiveMaterials: false,
    canManageWarehouse: false
  },
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
    canManageUsers: false,
    canManageTariffs: false,
    canManageCompany: false
  }
};

// === Получение метки роли ===
export const getRoleLabel = (role) => {
  const option = ROLE_OPTIONS.find(r => r.value === role);
  return option ? option.label : role;
};

// === Проверка наличия права доступа ===
export const hasPermission = (userRole, permission) => {
  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.master;
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
  return ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.master;
};

// === Проверка, является ли роль супер-админом ===
export const isSuperAdmin = (userRole, userMetadata) => {
  return userRole === 'super_admin' || userMetadata?.role === 'super_admin';
};

// === Проверка, является ли пользователь заказчиком ===
export const isClient = (userRole) => userRole === 'client';

// === Проверка, может ли пользователь приглашать другие роли ===
export const canInviteRole = (inviterRole, targetRole, isCompanyOwner) => {
  if (inviterRole === 'super_admin') return false;
  
  if (inviterRole === 'manager' && targetRole === 'client') {
    return true;
  }
  
  if (targetRole === 'super_admin') return false;
  if (targetRole === 'manager' && !isCompanyOwner) return false;
  
  if (targetRole === 'foreman') {
    return inviterRole === 'manager' || inviterRole === 'supply_admin' || isCompanyOwner;
  }
  
  if (targetRole === 'master') {
    return inviterRole === 'manager' || inviterRole === 'foreman' || isCompanyOwner;
  }
  
  const allowedInviters = ['manager'];
  if (targetRole === 'supply_admin' || targetRole === 'accountant') {
    return allowedInviters.includes(inviterRole) || isCompanyOwner;
  }
  
  return allowedInviters.includes(inviterRole) || isCompanyOwner;
};

// === Фильтрация ролей для приглашения ===
export const getAvailableRolesForInvite = (userRole, isCompanyOwner) => {
  if (isSuperAdmin(userRole, { role: userRole })) {
    return [];
  }
  return ROLE_OPTIONS.filter(role => 
    canInviteRole(userRole, role.value, isCompanyOwner)
  );
};

// === Дополнительная проверка для супер-админа ===
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
  isClient,
  canInviteRole,
  getAvailableRolesForInvite,
  isSuperAdminStrict
};