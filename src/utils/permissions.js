// src/utils/permissions.js

// === Конфигурация ролей ===
export const ROLE_OPTIONS = [
  { value: 'master', label: 'Мастер (Исполнитель)' }, // ← Старый foreman переименован для чистоты
  { value: 'foreman', label: 'Прораб' },              // ← НОВАЯ ОТДЕЛЬНАЯ РОЛЬ
  { value: 'supply_admin', label: 'Снабженец' },
  { value: 'manager', label: 'Менеджер/Администратор' },
  { value: 'accountant', label: 'Бухгалтер' },
  { value: 'client', label: 'Заказчик' },
  { value: 'super_admin', label: 'Супер-администратор' }
];

// === Права доступа для каждой роли ===
export const ROLE_PERMISSIONS = {
  master: {
    canCreate: true,
    canViewAnalytics: false,
    canManageUsers: false,
    canReceiveMaterials: false,
    canManageWarehouse: false,
    canViewAudit: false
  },
  foreman: { // ← ОТДЕЛЬНЫЙ ПРОРАБ (права назначаются отдельно)
    canCreate: true,
    canViewAnalytics: true,
    canManageUsers: false,
    canReceiveMaterials: true,
    canManageWarehouse: true,
    canViewAudit: false
  },
  supply_admin: {
    canCreate: false,
    canViewAnalytics: true,
    canManageUsers: false,
    canReceiveMaterials: true,
    canManageWarehouse: true,
    canViewAudit: false
  },
  manager: {
    canCreate: true,
    canViewAnalytics: true,
    canManageUsers: true,
    canReceiveMaterials: true,
    canManageWarehouse: true,
    canViewAudit: true
  },
  accountant: {
    canCreate: false,
    canViewAnalytics: true,
    canManageUsers: false,
    canReceiveMaterials: false,
    canManageWarehouse: false,
    canViewAudit: true
  },
  // 🔥 ПОЛНОСТЬЮ ПЕРЕПИСАННАЯ РОЛЬ super_admin
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
  // Возвращаем минимальные права для неизвестных ролей
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
  // Возвращаем минимальные права для неизвестных ролей
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
  // Супер-админ не приглашает через обычный интерфейс
  if (inviterRole === 'super_admin') return false;
  
  // Менеджер может приглашать заказчиков
  if (inviterRole === 'manager' && targetRole === 'client') {
    return true;
  }
  
  if (targetRole === 'super_admin') return false;
  if (targetRole === 'manager' && !isCompanyOwner) return false;
  
  // Прораба могут приглашать менеджеры и снабженцы
  if (targetRole === 'foreman') {
    return inviterRole === 'manager' || inviterRole === 'supply_admin' || isCompanyOwner;
  }
  
  // Мастера могут приглашать менеджеры и прорабы
  if (targetRole === 'master') {
    return inviterRole === 'manager' || inviterRole === 'foreman' || isCompanyOwner;
  }
  
  // Остальные роли
  const allowedInviters = ['manager'];
  if (targetRole === 'supply_admin' || targetRole === 'accountant') {
    return allowedInviters.includes(inviterRole) || isCompanyOwner;
  }
  
  return allowedInviters.includes(inviterRole) || isCompanyOwner;
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
  isClient,
  canInviteRole,
  getAvailableRolesForInvite,
  isSuperAdminStrict
};