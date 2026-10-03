// src/utils/roleViews.js
// Конфигурация ролей и доступных view

export const ROLE_VIEWS = {
  manager: {
    defaultView: 'managerDashboard',
    allowedViews: [
      'managerDashboard', 'analytics', 'employees', 'tariffs',
      'companyProfile', 'approvals',
      'objects', 'object-hub',
      'suppliers', 'supplierCatalog',
      'rfqList', 'rfqDetails', 'rfqCreate',
      'purchaseOrders', 'purchaseOrderDetails', 'purchaseOrderCreate',
      'procurementDashboard',
      'support', // 🎧 КОЛ-ЦЕНТР
    ],
    hiddenFromNav: ['create', 'received', 'confirmation'],
    dashboardComponent: 'ManagerMainDashboard',
  },

  director: {
    defaultView: 'managerDashboard',
    allowedViews: [
      'managerDashboard', 'analytics', 'employees', 'tariffs',
      'companyProfile', 'approvals',
      'objects', 'object-hub',
      'suppliers', 'supplierCatalog',
      'rfqList', 'rfqDetails', 'rfqCreate',
      'purchaseOrders', 'purchaseOrderDetails', 'purchaseOrderCreate',
      'procurementDashboard',
      'support', // 🎧 КОЛ-ЦЕНТР
    ],
    hiddenFromNav: ['create', 'received', 'confirmation'],
    dashboardComponent: 'ManagerMainDashboard',
  },

  accountant: {
    defaultView: 'accountantDashboard',
    allowedViews: [
      'accountantDashboard', 'analytics', 'history', 'documents',
      'objects', 'object-hub',
      'purchaseOrders', 'purchaseOrderDetails',
    ],
    hiddenFromNav: ['create', 'received', 'warehouse', 'inwork'],
    dashboardComponent: 'AccountantFinanceDashboard',
  },

  supply_admin: {
    defaultView: 'received',
    allowedViews: [
      'received', 'warehouse', 'create', 'chat', 'inwork',
      'objects', 'object-hub',
      'suppliers', 'supplierCatalog',
      'rfqList', 'rfqDetails', 'rfqCreate',
      'purchaseOrders', 'purchaseOrderDetails', 'purchaseOrderCreate',
      'procurementDashboard',
    ],
    hiddenFromNav: [],
    dashboardComponent: null,
  },

  master: {
    defaultView: 'create',
    allowedViews: [
      'create', 'inwork', 'history', 'confirmation',
      'objects', 'object-hub',
    ],
    hiddenFromNav: [],
    dashboardComponent: null,
  },

  foreman: {
    defaultView: 'create',
    allowedViews: [
      'create', 'inwork', 'history', 'confirmation',
      'objects', 'object-hub',
    ],
    hiddenFromNav: [],
    dashboardComponent: null,
  },

  client: {
    defaultView: 'clientDashboard',
    allowedViews: [
      'clientDashboard', 'clientChat', 'clientDocuments', 'clientApplications',
    ],
    hiddenFromNav: [],
    dashboardComponent: null,
  },

  // 🆕 ПРОЕКТИРОВЩИК
  designer: {
    defaultView: 'designerDashboard',
    allowedViews: [
      'designerDashboard',
      'objects',
      'object-hub',
      'documents',
      'chat',
      'calendar',
      'profile',
      'help',
      'settings',
    ],
    hiddenFromNav: [
      'create', 'inwork', 'history', 'received', 'warehouse',
      'analytics', 'employees', 'clients', 'tariffs',
      'crm-sales', 'merge', 'estimates', 'reports', 'integration',
      'tasks', 'approvals', 'api', 'audit', 'readyToIssue',
      'suppliers', 'supplierCatalog', 'supplierPriceList',
      'rfqList', 'rfqCreate', 'rfqDetails',
      'purchaseOrders', 'purchaseOrderCreate', 'purchaseOrderDetails',
      'supplierDashboard', 'procurementDashboard', 'priceCatalog',
    ],
    dashboardComponent: 'DesignerDashboard',
  },

  // ============================================================
  // 🎧 КОЛ-ЦЕНТР / ПОДДЕРЖКА
  // ============================================================
  support_agent: {
    defaultView: 'support',
    allowedViews: [
      'support',
      'profile',
      'settings',
      'help',
    ],
    hiddenFromNav: [
      'create', 'inwork', 'history', 'received', 'warehouse',
      'analytics', 'employees', 'clients', 'tariffs', 'approvals',
      'objects', 'object-hub', 'chat', 'calendar', 'documents',
      'tasks', 'audit', 'api', 'merge', 'crm-sales',
      'estimates', 'reports', 'integration', 'readyToIssue',
      'suppliers', 'supplierCatalog', 'priceCatalog',
      'procurementDashboard', 'supplierDashboard', 'supplierPriceList',
      'clientDashboard', 'clientChat', 'clientDocuments',
      'designerDashboard', 'dashboard', 'managerDashboard',
      'accountantDashboard',
      'rfqList', 'rfqCreate', 'rfqDetails',
      'purchaseOrders', 'purchaseOrderCreate', 'purchaseOrderDetails',
    ],
    dashboardComponent: 'SupportDashboard',
  },

  // ============================================================
  // МОДУЛЬ ПОСТАВЩИКОВ
  // ============================================================
  procurement_manager: {
    defaultView: 'procurementDashboard',
    allowedViews: [
      'procurementDashboard',
      'suppliers', 'supplierCatalog',
      'rfqList', 'rfqDetails', 'rfqCreate',
      'purchaseOrders', 'purchaseOrderDetails', 'purchaseOrderCreate',
      'objects', 'object-hub',
    ],
    hiddenFromNav: ['create', 'confirmation', 'employees', 'tariffs', 'inwork', 'received'],
    dashboardComponent: 'ProcurementDashboard',
  },

  supplier_admin: {
    defaultView: 'supplierDashboard',
    allowedViews: [
      'supplierDashboard',
      'supplierPriceList',
      'rfqList', 'rfqDetails',
      'purchaseOrders', 'purchaseOrderDetails',
      'profile', 'settings', 'help',
    ],
    hiddenFromNav: [
      'create', 'inwork', 'history', 'received', 'warehouse',
      'analytics', 'employees', 'clients', 'tariffs', 'approvals',
      'objects', 'object-hub', 'chat', 'calendar', 'documents',
      'tasks', 'audit', 'api', 'merge', 'crm-sales',
      'estimates', 'reports', 'integration', 'readyToIssue',
      'suppliers', 'supplierCatalog', 'priceCatalog',
      'procurementDashboard', 'clientDashboard', 'clientChat',
      'clientDocuments', 'designerDashboard', 'dashboard',
      'managerDashboard', 'accountantDashboard',
    ],
    dashboardComponent: 'SupplierDashboard',
  },

  supplier_manager: {
    defaultView: 'supplierDashboard',
    allowedViews: [
      'supplierDashboard',
      'supplierPriceList',
      'rfqList', 'rfqDetails',
      'purchaseOrders', 'purchaseOrderDetails',
      'profile', 'settings', 'help',
    ],
    hiddenFromNav: [
      'create', 'inwork', 'history', 'received', 'warehouse',
      'analytics', 'employees', 'clients', 'tariffs', 'approvals',
      'objects', 'object-hub', 'chat', 'calendar', 'documents',
      'tasks', 'audit', 'api', 'merge', 'crm-sales',
      'estimates', 'reports', 'integration', 'readyToIssue',
      'suppliers', 'supplierCatalog', 'priceCatalog',
      'procurementDashboard', 'clientDashboard', 'clientChat',
      'clientDocuments', 'designerDashboard', 'dashboard',
      'managerDashboard', 'accountantDashboard',
    ],
    dashboardComponent: 'SupplierDashboard',
  },
};

// ============================================================
// ХЕЛПЕРЫ
// ============================================================
export const getDefaultView = (role) => {
  return ROLE_VIEWS[role]?.defaultView || 'create';
};

export const isViewAllowed = (view, role) => {
  const config = ROLE_VIEWS[role];
  if (!config) return true;
  return config.allowedViews.includes(view);
};

export const shouldHideFromNav = (view, role) => {
  const config = ROLE_VIEWS[role];
  if (!config) return false;
  return config.hiddenFromNav?.includes(view) || false;
};

// ============================================================
// 🎧 ХЕЛПЕРЫ ДЛЯ КОЛ-ЦЕНТРА
// ============================================================
export const SUPPORT_VIEWS = ['support'];
export const SUPPORT_AGENT_ROLES = ['support_agent'];
export const isSupportView = (view) => SUPPORT_VIEWS.includes(view);
export const isSupportAgent = (role) => SUPPORT_AGENT_ROLES.includes(role);

// ============================================================
// ХЕЛПЕРЫ ДЛЯ МОДУЛЯ ПОСТАВЩИКОВ
// ============================================================
export const SUPPLIER_VIEWS = [
  'suppliers', 'supplierCatalog',
  'rfqList', 'rfqCreate', 'rfqDetails',
  'purchaseOrders', 'purchaseOrderCreate', 'purchaseOrderDetails',
  'procurementDashboard', 'supplierDashboard', 'supplierPriceList',
];

export const PROCUREMENT_VIEWS = [
  'procurementDashboard',
  'suppliers', 'supplierCatalog',
  'rfqList', 'rfqCreate', 'rfqDetails',
  'purchaseOrders', 'purchaseOrderCreate', 'purchaseOrderDetails',
];

export const SUPPLIER_SIDE_VIEWS = [
  'supplierDashboard',
  'supplierPriceList',
  'rfqList', 'rfqDetails',
  'purchaseOrders', 'purchaseOrderDetails',
];

export const isSupplierView = (view) => SUPPLIER_VIEWS.includes(view);
export const isProcurementView = (view) => PROCUREMENT_VIEWS.includes(view);
export const isSupplierSideView = (view) => SUPPLIER_SIDE_VIEWS.includes(view);