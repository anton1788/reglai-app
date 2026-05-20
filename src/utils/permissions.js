// src/utils/permissions.js

// === Конфигурация ролей ===
export const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Супер-администратор' },
  { value: 'manager', label: 'Руководитель' },
  { value: 'client_manager', label: 'Менеджер по работе с клиентами' }, // 👈 ДОБАВЛЕНО
  { value: 'supply_admin', label: 'Снабженец' },
  { value: 'master', label: 'Мастер (Исполнитель)' },
  { value: 'foreman', label: 'Прораб' },
  { value: 'accountant', label: 'Бухгалтер' },
  { value: 'client', label: 'Заказчик' }
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
    canManageClients: false,       // Не управляет клиентами напрямую
  },
  manager: {
    canCreate: false,              // ❌ Руководитель не создает заявки
    canViewAnalytics: true,
    canViewAudit: true,
    canManageUsers: true,          // Может управлять пользователями
    canManageTariffs: true,        // Может управлять тарифами
    canManageCompany: false,
    canReceiveMaterials: true,
    canManageWarehouse: true,
    canManageClients: true,        // 👈 Может управлять клиентами
  },
  client_manager: {                // 👈 НОВАЯ РОЛЬ
    canCreate: false,              // Не создаёт заявки
    canViewAnalytics: true,        // Может смотреть аналитику по клиентам
    canViewAudit: false,           // Не видит аудит
    canManageUsers: false,         // Не управляет пользователями компании
    canManageTariffs: false,       // Не управляет тарифами
    canManageCompany: false,       // Не управляет компанией
    canReceiveMaterials: false,    // Не принимает материалы
    canManageWarehouse: false,     // Не управляет складом
    canManageClients: true,        // ✅ Может управлять клиентами
    canInviteClients: true,        // ✅ Может приглашать клиентов
    canViewClientStats: true,      // ✅ Может смотреть статистику клиентов
    canCommunicateWithClients: true, // ✅ Может общаться с клиентами
    canViewClientApplications: true,  // ✅ Может смотреть заявки клиентов
  },
  master: {
    canCreate: true,               // ✅ Прораб создает заявки
    canViewAnalytics: false,
    canViewAudit: false,
    canManageUsers: false,
    canManageTariffs: false,       // ❌ Не видит тарифы
    canManageCompany: false,
    canReceiveMaterials: false,
    canManageWarehouse: false,
    canManageClients: false,       // Не управляет клиентами
  },
  foreman: {
    canCreate: true,
    canViewAnalytics: true,
    canManageUsers: false,
    canReceiveMaterials: true,
    canManageWarehouse: true,
    canViewAudit: false,
    canManageTariffs: false,
    canManageCompany: false,
    canManageClients: false,       // Не управляет клиентами
  },
  supply_admin: {
    canCreate: true,               // ✅ Снабженец создает заявки
    canViewAnalytics: false,
    canViewAudit: false,
    canManageUsers: false,
    canManageTariffs: false,       // ❌ Не видит тарифы
    canManageCompany: false,
    canReceiveMaterials: true,
    canManageWarehouse: true,
    canManageClients: false,       // Не управляет клиентами
  },
  accountant: {
    canCreate: false,              // ❌ Бухгалтер не создает заявки
    canViewAnalytics: true,
    canViewAudit: true,
    canManageUsers: false,
    canManageTariffs: false,
    canManageCompany: false,
    canReceiveMaterials: false,
    canManageWarehouse: false,
    canManageClients: false,       // Не управляет клиентами
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
    canManageCompany: false,
    canManageClients: false,
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

// === Проверка, может ли пользователь управлять клиентами ===
export const canManageClients = (userRole) => {
  return hasPermission(userRole, 'canManageClients');
};

// === Проверка, может ли пользователь приглашать клиентов ===
export const canInviteClients = (userRole) => {
  return hasPermission(userRole, 'canInviteClients');
};

// === Проверка, может ли пользователь приглашать другие роли ===
export const canInviteRole = (inviterRole, targetRole, isCompanyOwner) => {
  if (inviterRole === 'super_admin') return false;
  
  // 👈 НОВЫЕ ПРАВИЛА ДЛЯ CLIENT_MANAGER
  if (inviterRole === 'client_manager') {
    // Менеджер по работе с клиентами может приглашать только клиентов
    return targetRole === 'client';
  }
  
  if (inviterRole === 'manager' && targetRole === 'client') {
    return true;
  }
  
  if (targetRole === 'super_admin') return false;
  if (targetRole === 'manager' && !isCompanyOwner) return false;
  
  // 👈 Client manager может приглашать только клиентов
  if (targetRole === 'client_manager' && inviterRole !== 'manager' && !isCompanyOwner) {
    return false;
  }
  
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
  
  // 👈 Client manager может приглашать только клиентов
  if (userRole === 'client_manager') {
    return ROLE_OPTIONS.filter(role => 
      role.value === 'client' && canInviteRole(userRole, role.value, isCompanyOwner)
    );
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
  canManageClients,
  canInviteClients,
  canInviteRole,
  getAvailableRolesForInvite,
  isSuperAdminStrict
};