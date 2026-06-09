// src/utils/permissions.js

export const ROLE_PERMISSIONS = {
  // Супер-админ - всё может
  super_admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canViewAll: true,
    canInvite: true,
    canManageTariffs: true,
    canViewAnalytics: true,
    canManageEmployees: true,
    canManageWarehouse: true,
    canViewAudit: true,
  },
  
  // Руководитель (менеджер) - полный доступ к управлению компанией
  manager: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canViewAll: true,
    canInvite: true,        // ✅ Может приглашать
    canManageTariffs: true,  // ✅ Может управлять тарифами
    canViewAnalytics: true,
    canManageEmployees: true,
    canManageWarehouse: true,
    canViewAudit: true,
  },
  
  // Администратор снабжения
  supply_admin: {
    canCreate: true,         // ✅ Может создавать заявки
    canEdit: true,           // ✅ Может редактировать
    canDelete: false,        // ❌ Не может удалять
    canViewAll: true,        // ✅ Видит все заявки
    canInvite: true,         // ✅ МОЖЕТ ПРИГЛАШАТЬ сотрудников!
    canManageTariffs: false, // ❌ Не может управлять тарифами
    canViewAnalytics: true,  // ✅ Видит аналитику
    canManageEmployees: false, // ❌ Не может блокировать сотрудников
    canManageWarehouse: true,   // ✅ Управляет складом
    canViewAudit: false,
  },
  
  // Прораб (мастер)
  master: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canViewAll: false,       // Видит только свои заявки
    canInvite: false,
    canManageTariffs: false,
    canViewAnalytics: false,
    canManageEmployees: false,
    canManageWarehouse: false,
    canViewAudit: false,
  },
  
  // Бухгалтер
  accountant: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canViewAll: true,
    canInvite: false,
    canManageTariffs: false,
    canViewAnalytics: true,
    canManageEmployees: false,
    canManageWarehouse: false,
    canViewAudit: false,
  },
  
  // Заказчик
  client: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canViewAll: false,
    canInvite: false,
    canManageTariffs: false,
    canViewAnalytics: false,
    canManageEmployees: false,
    canManageWarehouse: false,
    canViewAudit: false,
  },
  
  // Менеджер по работе с клиентами
  client_manager: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canViewAll: true,
    canInvite: true,         // ✅ Может приглашать клиентов
    canManageTariffs: false,
    canViewAnalytics: true,
    canManageEmployees: false,
    canManageWarehouse: false,
    canViewAudit: false,
  },
};

// Функция проверки, может ли пользователь приглашать определённую роль
export const canInviteRole = (inviterRole, targetRole, isCompanyOwner = false) => {
  // Владелец (manager) может приглашать любые роли
  if (inviterRole === 'manager' || isCompanyOwner) {
    return targetRole !== 'super_admin'; // Супер-админа нельзя пригласить
  }
  
  // Администратор снабжения может приглашать только мастеров и бухгалтеров
  if (inviterRole === 'supply_admin') {
    return targetRole === 'master' || targetRole === 'accountant' || targetRole === 'foreman';
  }
  
  // Менеджер по клиентам может приглашать только клиентов
  if (inviterRole === 'client_manager') {
    return targetRole === 'client';
  }
  
  return false;
};

// Получить доступные роли для приглашения
export const getAvailableRolesForInvite = (inviterRole, isCompanyOwner = false) => {
  const allRoles = [
    { value: 'manager', label: 'Руководитель' },
    { value: 'supply_admin', label: 'Администратор снабжения' },
    { value: 'master', label: 'Прораб' },
    { value: 'foreman', label: 'Мастер' },
    { value: 'accountant', label: 'Бухгалтер' },
    { value: 'client', label: 'Заказчик' },
    { value: 'client_manager', label: 'Менеджер по работе с клиентами' },
  ];
  
  // Владелец может приглашать все роли
  if (inviterRole === 'manager' || isCompanyOwner) {
    return allRoles.filter(role => role.value !== 'super_admin');
  }
  
  // Администратор снабжения может приглашать только мастеров и бухгалтеров
  if (inviterRole === 'supply_admin') {
    return allRoles.filter(role => 
      role.value === 'master' || role.value === 'foreman' || role.value === 'accountant'
    );
  }
  
  // Менеджер по клиентам может приглашать только клиентов
  if (inviterRole === 'client_manager') {
    return allRoles.filter(role => role.value === 'client');
  }
  
  return [];
};

// === Конфигурация ролей ===
export const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Супер-администратор' },
  { value: 'manager', label: 'Руководитель' },
  { value: 'client_manager', label: 'Менеджер по работе с клиентами' },
  { value: 'supply_admin', label: 'Снабженец' },
  { value: 'master', label: 'Мастер (Исполнитель)' },
  { value: 'foreman', label: 'Прораб' },
  { value: 'accountant', label: 'Бухгалтер' },
  { value: 'client', label: 'Заказчик' }
];

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