// src/utils/permissions.js

import { TARIFF_PLANS } from './tariffPlans';

// === КОНФИГУРАЦИЯ РОЛЕЙ ===
export const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Супер-администратор' },
  { value: 'manager', label: 'Руководитель' },
  { value: 'client_manager', label: 'Менеджер по работе с клиентами' },
  { value: 'supply_admin', label: 'Снабженец' },
  { value: 'master', label: 'Мастер (Исполнитель)' },
  { value: 'foreman', label: 'Прораб' },
  { value: 'accountant', label: 'Бухгалтер' },
  { value: 'client', label: 'Заказчик' },
  // 🆕 ПРОЕКТИРОВЩИК
  { value: 'designer', label: '📐 Проектировщик' },
  // === НОВЫЕ РОЛИ ДЛЯ МОДУЛЯ ПОСТАВЩИКОВ ===
  { value: 'procurement_manager', label: '🛒 Менеджер по закупкам' },
  { value: 'supplier_admin', label: '🏭 Администратор поставщика' },
  { value: 'supplier_manager', label: '💼 Менеджер поставщика' },
];

// === ПРАВА ДОСТУПА ПО РОЛЯМ ===
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
    canManageClients: true,
    canInviteClients: true,
    canViewBilling: true,
    canManageBilling: true,
    canExportData: true,
    canManageIntegrations: true,
    canManageSuppliers: true,
    canCreateRFQ: true,
    canCompareOffers: true,
    canCreatePurchaseOrders: true,
    canReceiveMaterials: true,
    canManagePrices: true,
    canManagePriceList: true,
    canRespondToRFQ: true,
    canViewOrders: true,
    canManageCompany: true,
    canViewObjects: true,
    canViewChat: true,
    canViewDocuments: true,
    canViewCalendar: true,
    canViewPrices: true,
  },

  // Руководитель (менеджер) - полный доступ к управлению компанией
  manager: {
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
    canManageClients: true,
    canInviteClients: true,
    canViewBilling: true,
    canManageBilling: true,
    canExportData: true,
    canManageIntegrations: true,
    canManageSuppliers: true,
    canCreateRFQ: true,
    canCompareOffers: true,
    canCreatePurchaseOrders: true,
    canReceiveMaterials: true,
    canManagePrices: true,
    canManagePriceList: false,
    canRespondToRFQ: false,
    canViewOrders: true,
    canManageCompany: true,
    canViewObjects: true,
    canViewChat: true,
    canViewDocuments: true,
    canViewCalendar: true,
    canViewPrices: true,
  },

  // Администратор снабжения
  supply_admin: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canViewAll: true,
    canInvite: true,
    canManageTariffs: false,
    canViewAnalytics: true,
    canManageEmployees: false,
    canManageWarehouse: true,
    canViewAudit: false,
    canManageClients: false,
    canInviteClients: false,
    canViewBilling: false,
    canManageBilling: false,
    canExportData: true,
    canManageIntegrations: false,
    canManageSuppliers: true,
    canCreateRFQ: true,
    canCompareOffers: true,
    canCreatePurchaseOrders: true,
    canReceiveMaterials: true,
    canManagePrices: true,
    canManagePriceList: false,
    canRespondToRFQ: false,
    canViewOrders: true,
    canManageCompany: false,
    canViewObjects: true,
    canViewChat: true,
    canViewDocuments: true,
    canViewCalendar: true,
    canViewPrices: true,
  },

  // Прораб (мастер)
  master: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canViewAll: false,
    canInvite: false,
    canManageTariffs: false,
    canViewAnalytics: false,
    canManageEmployees: false,
    canManageWarehouse: false,
    canViewAudit: false,
    canManageClients: false,
    canInviteClients: false,
    canViewBilling: false,
    canManageBilling: false,
    canExportData: false,
    canManageIntegrations: false,
    canManageSuppliers: false,
    canCreateRFQ: false,
    canCompareOffers: false,
    canCreatePurchaseOrders: false,
    canReceiveMaterials: false,
    canManagePrices: false,
    canManagePriceList: false,
    canRespondToRFQ: false,
    canViewOrders: false,
    canManageCompany: false,
    canViewObjects: true,
    canViewChat: true,
    canViewDocuments: true,
    canViewCalendar: false,
    canViewPrices: false,
  },

  // Прораб — те же права, что у мастера
  foreman: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canViewAll: false,
    canInvite: false,
    canManageTariffs: false,
    canViewAnalytics: false,
    canManageEmployees: false,
    canManageWarehouse: false,
    canViewAudit: false,
    canManageClients: false,
    canInviteClients: false,
    canViewBilling: false,
    canManageBilling: false,
    canExportData: false,
    canManageIntegrations: false,
    canManageSuppliers: false,
    canCreateRFQ: false,
    canCompareOffers: false,
    canCreatePurchaseOrders: false,
    canReceiveMaterials: false,
    canManagePrices: false,
    canManagePriceList: false,
    canRespondToRFQ: false,
    canViewOrders: false,
    canManageCompany: false,
    canViewObjects: true,
    canViewChat: true,
    canViewDocuments: true,
    canViewCalendar: false,
    canViewPrices: false,
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
    canManageClients: false,
    canInviteClients: false,
    canViewBilling: true,
    canManageBilling: false,
    canExportData: true,
    canManageIntegrations: false,
    canManageSuppliers: false,
    canCreateRFQ: false,
    canCompareOffers: false,
    canCreatePurchaseOrders: false,
    canReceiveMaterials: false,
    canManagePrices: false,
    canManagePriceList: false,
    canRespondToRFQ: false,
    canViewOrders: true,
    canManageCompany: false,
    canViewObjects: true,
    canViewChat: false,
    canViewDocuments: true,
    canViewCalendar: false,
    canViewPrices: false,
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
    canManageClients: false,
    canInviteClients: false,
    canViewBilling: false,
    canManageBilling: false,
    canExportData: false,
    canManageIntegrations: false,
    canManageSuppliers: false,
    canCreateRFQ: false,
    canCompareOffers: false,
    canCreatePurchaseOrders: false,
    canReceiveMaterials: false,
    canManagePrices: false,
    canManagePriceList: false,
    canRespondToRFQ: false,
    canViewOrders: false,
    canManageCompany: false,
    canViewObjects: false,
    canViewChat: true,
    canViewDocuments: true,
    canViewCalendar: false,
    canViewPrices: false,
  },

  // Менеджер по работе с клиентами
  client_manager: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canViewAll: true,
    canInvite: true,
    canManageTariffs: false,
    canViewAnalytics: true,
    canManageEmployees: false,
    canManageWarehouse: false,
    canViewAudit: false,
    canManageClients: true,
    canInviteClients: true,
    canViewBilling: false,
    canManageBilling: false,
    canExportData: false,
    canManageIntegrations: false,
    canManageSuppliers: false,
    canCreateRFQ: false,
    canCompareOffers: false,
    canCreatePurchaseOrders: false,
    canReceiveMaterials: false,
    canManagePrices: false,
    canManagePriceList: false,
    canRespondToRFQ: false,
    canViewOrders: false,
    canManageCompany: false,
    canViewObjects: true,
    canViewChat: true,
    canViewDocuments: true,
    canViewCalendar: true,
    canViewPrices: false,
  },

  // 🆕 ПРОЕКТИРОВЩИК — минимальные права
  designer: {
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
    canManageClients: false,
    canInviteClients: false,
    canViewBilling: false,
    canManageBilling: false,
    canExportData: true,
    canManageIntegrations: false,
    canManageSuppliers: false,
    canCreateRFQ: false,
    canCompareOffers: false,
    canCreatePurchaseOrders: false,
    canReceiveMaterials: false,
    canManagePrices: false,
    canManagePriceList: false,
    canRespondToRFQ: false,
    canViewOrders: false,
    canManageCompany: false,
    canViewObjects: true,
    canViewChat: true,
    canViewDocuments: true,
    canViewCalendar: true,
    canViewPrices: false,
  },

  // Менеджер по закупкам (со стороны заказчика)
  procurement_manager: {
    canCreate: false,
    canEdit: true,
    canDelete: false,
    canViewAll: true,
    canInvite: false,
    canManageTariffs: false,
    canViewAnalytics: true,
    canManageEmployees: false,
    canManageWarehouse: true,
    canViewAudit: false,
    canManageClients: false,
    canInviteClients: false,
    canViewBilling: false,
    canManageBilling: false,
    canExportData: true,
    canManageIntegrations: false,
    canManageSuppliers: true,
    canCreateRFQ: true,
    canCompareOffers: true,
    canCreatePurchaseOrders: true,
    canReceiveMaterials: true,
    canManagePrices: true,
    canManagePriceList: false,
    canRespondToRFQ: false,
    canViewOrders: true,
    canManageCompany: false,
    canViewObjects: true,
    canViewChat: true,
    canViewDocuments: true,
    canViewCalendar: false,
    canViewPrices: true,
  },

  // Администратор поставщика (со стороны поставщика)
  supplier_admin: {
    canCreate: false,
    canEdit: true,
    canDelete: false,
    canViewAll: false,
    canInvite: true,
    canManageTariffs: false,
    canViewAnalytics: true,
    canManageEmployees: false,
    canManageWarehouse: false,
    canViewAudit: false,
    canManageClients: false,
    canInviteClients: false,
    canViewBilling: false,
    canManageBilling: false,
    canExportData: false,
    canManageIntegrations: false,
    canManageSuppliers: false,
    canCreateRFQ: false,
    canCompareOffers: false,
    canCreatePurchaseOrders: false,
    canReceiveMaterials: false,
    canManagePrices: false,
    canManagePriceList: true,
    canRespondToRFQ: true,
    canViewOrders: true,
    canManageCompany: true,
    canViewObjects: false,
    canViewChat: false,
    canViewDocuments: false,
    canViewCalendar: false,
    canViewPrices: false,
  },

  // Менеджер поставщика
  supplier_manager: {
    canCreate: false,
    canEdit: true,
    canDelete: false,
    canViewAll: false,
    canInvite: false,
    canManageTariffs: false,
    canViewAnalytics: false,
    canManageEmployees: false,
    canManageWarehouse: false,
    canViewAudit: false,
    canManageClients: false,
    canInviteClients: false,
    canViewBilling: false,
    canManageBilling: false,
    canExportData: false,
    canManageIntegrations: false,
    canManageSuppliers: false,
    canCreateRFQ: false,
    canCompareOffers: false,
    canCreatePurchaseOrders: false,
    canReceiveMaterials: false,
    canManagePrices: false,
    canManagePriceList: true,
    canRespondToRFQ: true,
    canViewOrders: true,
    canManageCompany: false,
    canViewObjects: false,
    canViewChat: false,
    canViewDocuments: false,
    canViewCalendar: false,
    canViewPrices: false,
  },
};

// === ПРАВА ПО ТАРИФАМ ===
export const TARIFF_PERMISSIONS = {
  basic: {
    maxUsers: 2,
    maxApiKeys: 1,
    maxProjects: 1,
    maxStorageGb: 1,
    features: ['warehouse'],
    canExport: false,
    canIntegrate: false,
    supportLevel: 'email',
    prioritySupport: false,
    analyticsEnabled: false,
    webhooksEnabled: false,
  },
  starter: {
    maxUsers: 10,
    maxApiKeys: 3,
    maxProjects: 3,
    maxStorageGb: 5,
    features: ['warehouse', 'analytics'],
    canExport: true,
    canIntegrate: false,
    supportLevel: 'email',
    prioritySupport: false,
    analyticsEnabled: true,
    webhooksEnabled: false,
  },
  pro: {
    maxUsers: 50,
    maxApiKeys: 10,
    maxProjects: 10,
    maxStorageGb: 20,
    features: ['warehouse', 'analytics', 'webhooks'],
    canExport: true,
    canIntegrate: true,
    supportLevel: 'chat',
    prioritySupport: true,
    analyticsEnabled: true,
    webhooksEnabled: true,
  },
  business: {
    maxUsers: 200,
    maxApiKeys: 25,
    maxProjects: 50,
    maxStorageGb: 100,
    features: ['warehouse', 'analytics', 'webhooks', 'customIntegration'],
    canExport: true,
    canIntegrate: true,
    supportLevel: '24/7',
    prioritySupport: true,
    analyticsEnabled: true,
    webhooksEnabled: true,
  },
  enterprise: {
    maxUsers: 1000,
    maxApiKeys: 100,
    maxProjects: 200,
    maxStorageGb: 500,
    features: ['warehouse', 'analytics', 'webhooks', 'customIntegration'],
    canExport: true,
    canIntegrate: true,
    supportLevel: '24/7',
    prioritySupport: true,
    analyticsEnabled: true,
    webhooksEnabled: true,
  },
};

// === ОСНОВНЫЕ ФУНКЦИИ ===

// Получение метки роли
export const getRoleLabel = (role) => {
  const option = ROLE_OPTIONS.find(r => r.value === role);
  return option ? option.label : role;
};

// Проверка наличия права доступа
export const hasPermission = (userRole, permission) => {
  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.master;
  return permissions[permission] === true;
};

// Проверка нескольких прав (все должны быть true)
export const hasAllPermissions = (userRole, permissions) => {
  return permissions.every(permission => hasPermission(userRole, permission));
};

// Проверка хотя бы одного права
export const hasAnyPermission = (userRole, permissions) => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

// Получение всех доступных прав для роли
export const getRolePermissions = (userRole) => {
  return ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.master;
};

// Проверка, является ли роль супер-админом
export const isSuperAdmin = (userRole, userMetadata) => {
  return userRole === 'super_admin' || userMetadata?.role === 'super_admin';
};

// Проверка, является ли пользователь заказчиком
export const isClient = (userRole) => userRole === 'client';

// 🆕 Проверка, является ли пользователь проектировщиком
export const isDesigner = (userRole) => userRole === 'designer';

// Проверка, может ли пользователь управлять клиентами
export const canManageClients = (userRole) => {
  return hasPermission(userRole, 'canManageClients');
};

// Проверка, может ли пользователь приглашать клиентов
export const canInviteClients = (userRole) => {
  return hasPermission(userRole, 'canInviteClients');
};

// === ФУНКЦИИ ДЛЯ РАБОТЫ С ПРИГЛАШЕНИЯМИ ===

// Проверка, может ли пользователь приглашать определённую роль
export const canInviteRole = (inviterRole, targetRole, isCompanyOwner = false) => {
  if (inviterRole === 'manager' || inviterRole === 'director' || isCompanyOwner) {
    return targetRole !== 'super_admin';
  }

  if (inviterRole === 'supply_admin') {
    return targetRole === 'master' || targetRole === 'foreman' || targetRole === 'accountant';
  }

  if (inviterRole === 'client_manager') {
    return targetRole === 'client';
  }

  // 🆕 Менеджер по закупкам может приглашать поставщиков
  if (inviterRole === 'procurement_manager') {
    return targetRole === 'supplier_admin' || targetRole === 'supplier_manager';
  }

  if (inviterRole === 'supplier_admin') {
    return targetRole === 'supplier_manager' || targetRole === 'supplier_admin';
  }

  return false;
};

// Получить доступные роли для приглашения
export const getAvailableRolesForInvite = (inviterRole, isCompanyOwner = false) => {
  const allRoles = [
    { value: 'manager', label: 'Руководитель' },
    { value: 'supply_admin', label: 'Администратор снабжения' },
    { value: 'master', label: 'Мастер (Исполнитель)' },
    { value: 'foreman', label: 'Прораб' },
    { value: 'accountant', label: 'Бухгалтер' },
    { value: 'client', label: 'Заказчик' },
    { value: 'client_manager', label: 'Менеджер по работе с клиентами' },
    { value: 'designer', label: '📐 Проектировщик' }, // 🆕
    { value: 'procurement_manager', label: '🛒 Менеджер по закупкам' },
  ];

  if (inviterRole === 'manager' || inviterRole === 'director' || isCompanyOwner) {
    return allRoles.filter(role => role.value !== 'super_admin');
  }

  if (inviterRole === 'supply_admin') {
    return allRoles.filter(role =>
      role.value === 'master' || role.value === 'foreman' || role.value === 'accountant'
    );
  }

  if (inviterRole === 'client_manager') {
    return allRoles.filter(role => role.value === 'client');
  }

  // 🆕 Менеджер по закупкам — только поставщики
  if (inviterRole === 'procurement_manager') {
    return [
      { value: 'supplier_admin', label: '🏭 Администратор поставщика' },
      { value: 'supplier_manager', label: '💼 Менеджер поставщика' },
    ];
  }

  if (inviterRole === 'supplier_admin') {
    return getAvailableRolesForSupplierInvite();
  }

  return [];
};

// === ФУНКЦИИ ДЛЯ РАБОТЫ С ТАРИФАМИ ===

export const hasTariffFeature = (planId, feature) => {
  const plan = TARIFF_PLANS[planId];
  if (!plan) return false;
  return plan.features[feature] === true || typeof plan.features[feature] === 'string';
};

export const checkTariffLimit = (planId, limitType, currentValue) => {
  const plan = TARIFF_PLANS[planId];
  if (!plan) return { allowed: false, limit: 0 };

  const limits = {
    users: plan.maxUsers,
    apiKeys: plan.maxApiKeys,
    apiQuotaMonthly: plan.apiQuotaMonthly,
    apiQuotaDaily: plan.apiQuotaDaily,
  };

  const limit = limits[limitType];
  if (limit === undefined) return { allowed: true, limit: Infinity };

  return {
    allowed: currentValue <= limit,
    limit: limit,
    remaining: Math.max(0, limit - currentValue),
    usagePercent: Math.round((currentValue / limit) * 100)
  };
};

export const getTariffUpgradeBenefits = (currentPlanId) => {
  const tiers = ['basic', 'starter', 'pro', 'business', 'enterprise'];
  const currentIndex = tiers.indexOf(currentPlanId);

  if (currentIndex === -1 || currentIndex === tiers.length - 1) {
    return null;
  }

  const nextPlanId = tiers[currentIndex + 1];
  const currentPlan = TARIFF_PLANS[currentPlanId];
  const nextPlan = TARIFF_PLANS[nextPlanId];

  return {
    planId: nextPlanId,
    name: nextPlan.name,
    benefits: {
      users: {
        from: currentPlan.maxUsers,
        to: nextPlan.maxUsers,
        increase: nextPlan.maxUsers - currentPlan.maxUsers,
        percent: Math.round(((nextPlan.maxUsers - currentPlan.maxUsers) / currentPlan.maxUsers) * 100)
      },
      apiQuotaMonthly: {
        from: currentPlan.apiQuotaMonthly,
        to: nextPlan.apiQuotaMonthly,
        increase: nextPlan.apiQuotaMonthly - currentPlan.apiQuotaMonthly,
        percent: Math.round(((nextPlan.apiQuotaMonthly - currentPlan.apiQuotaMonthly) / currentPlan.apiQuotaMonthly) * 100)
      },
      apiKeys: {
        from: currentPlan.maxApiKeys,
        to: nextPlan.maxApiKeys,
        increase: nextPlan.maxApiKeys - currentPlan.maxApiKeys,
        percent: Math.round(((nextPlan.maxApiKeys - currentPlan.maxApiKeys) / currentPlan.maxApiKeys) * 100)
      },
      newFeatures: Object.keys(nextPlan.features).filter(
        feature => nextPlan.features[feature] === true &&
                   (currentPlan.features[feature] === false || currentPlan.features[feature] === undefined)
      ),
      supportUpgrade: nextPlan.features.support !== currentPlan.features.support,
      prioritySupport: nextPlan.features.priority === true && currentPlan.features.priority !== true,
      hasSla: nextPlan.features.sla === true && currentPlan.features.sla !== true,
    }
  };
};

// === ФУНКЦИИ ДЛЯ АУДИТА И ЛОГИРОВАНИЯ ===

export const canViewAudit = (userRole) => {
  return hasPermission(userRole, 'canViewAudit');
};

export const canExportData = (userRole) => {
  return hasPermission(userRole, 'canExportData');
};

export const canManageBilling = (userRole) => {
  return hasPermission(userRole, 'canManageBilling');
};

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

export const isAdminRole = (role) => {
  return ['super_admin', 'manager', 'supply_admin', 'client_manager'].includes(role);
};

export const isExecutionRole = (role) => {
  return ['master', 'foreman'].includes(role);
};

export const getRolesByGroup = () => {
  return {
    admin: ['super_admin', 'manager'],
    management: ['supply_admin', 'client_manager', 'procurement_manager', 'designer'],
    execution: ['master', 'foreman'],
    support: ['accountant'],
    client: ['client'],
    supplier: ['supplier_admin', 'supplier_manager'],
  };
};

export const canManageUsers = (userRole) => {
  return hasPermission(userRole, 'canManageEmployees') ||
         hasPermission(userRole, 'canInvite');
};

export const canViewAllData = (userRole) => {
  return hasPermission(userRole, 'canViewAll');
};

// ============================================================
// ХЕЛПЕРЫ ДЛЯ МОДУЛЯ ПОСТАВЩИКОВ
// ============================================================

export const isSupplier = (role) =>
  ['supplier_admin', 'supplier_manager'].includes(role);

export const isProcurement = (role) =>
  ['procurement_manager', 'supply_admin', 'manager', 'director'].includes(role);

export const getAvailableRolesForSupplierInvite = () => [
  { value: 'supplier_admin', label: '🏭 Администратор поставщика' },
  { value: 'supplier_manager', label: '💼 Менеджер поставщика' },
];

export const canManageSuppliers = (userRole) =>
  hasPermission(userRole, 'canManageSuppliers');

export const canCreateRFQ = (userRole) =>
  hasPermission(userRole, 'canCreateRFQ');

export const canManagePriceList = (userRole) =>
  hasPermission(userRole, 'canManagePriceList');

export const canRespondToRFQ = (userRole) =>
  hasPermission(userRole, 'canRespondToRFQ');

// === ЭКСПОРТ ДЛЯ СОВМЕСТИМОСТИ ===
export default {
  ROLE_OPTIONS,
  ROLE_PERMISSIONS,
  TARIFF_PERMISSIONS,
  getRoleLabel,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
  isSuperAdmin,
  isClient,
  isDesigner,
  canManageClients,
  canInviteClients,
  canInviteRole,
  getAvailableRolesForInvite,
  hasTariffFeature,
  checkTariffLimit,
  getTariffUpgradeBenefits,
  canViewAudit,
  canExportData,
  canManageBilling,
  isAdminRole,
  isExecutionRole,
  getRolesByGroup,
  canManageUsers,
  canViewAllData,
  isSupplier,
  isProcurement,
  getAvailableRolesForSupplierInvite,
  canManageSuppliers,
  canCreateRFQ,
  canManagePriceList,
  canRespondToRFQ,
};