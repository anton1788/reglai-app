// src/utils/roleViews.js
// Конфигурация ролей и доступных view

export const ROLE_VIEWS = {
  manager: {
    defaultView: 'managerDashboard',
    allowedViews: [
      'managerDashboard', 'analytics', 'employees', 'tariffs',
      'companyProfile', 'approvals',
      'objects', 'object-hub',
      'suppliers', 'supplierDetails', 'supplierCatalog',
      'rfqList', 'rfqDetails', 'purchaseOrders', 'purchaseOrderDetails',
      'procurementDashboard',
    ],
    hiddenFromNav: ['create', 'received', 'confirmation'],
    dashboardComponent: 'ManagerMainDashboard'
  },

  director: {
    defaultView: 'managerDashboard',
    allowedViews: [
      'managerDashboard', 'analytics', 'employees', 'tariffs',
      'companyProfile', 'approvals',
      'objects', 'object-hub',
      'suppliers', 'supplierDetails', 'supplierCatalog',
      'rfqList', 'rfqDetails', 'purchaseOrders', 'purchaseOrderDetails',
      'procurementDashboard',
    ],
    hiddenFromNav: ['create', 'received', 'confirmation'],
    dashboardComponent: 'ManagerMainDashboard'
  },

  accountant: {
    defaultView: 'accountantDashboard',
    allowedViews: [
      'accountantDashboard', 'analytics', 'history', 'documents',
      'objects', 'object-hub',
      'purchaseOrders', 'purchaseOrderDetails',
    ],
    hiddenFromNav: ['create', 'received', 'warehouse', 'inwork'],
    dashboardComponent: 'AccountantFinanceDashboard'
  },

  supply_admin: {
    defaultView: 'received',
    allowedViews: [
      'received', 'warehouse', 'create', 'chat', 'inwork',
      'objects', 'object-hub',
      'suppliers', 'supplierDetails', 'supplierCatalog',
      'rfqList', 'rfqDetails', 'purchaseOrders', 'purchaseOrderDetails',
      'procurementDashboard',
    ],
    hiddenFromNav: [],
    dashboardComponent: null
  },

  master: {
    defaultView: 'create',
    allowedViews: [
      'create', 'inwork', 'history', 'confirmation',
      'objects', 'object-hub',
    ],
    hiddenFromNav: [],
    dashboardComponent: null
  },

  foreman: {
    defaultView: 'create',
    allowedViews: [
      'create', 'inwork', 'history', 'confirmation',
      'objects', 'object-hub',
    ],
    hiddenFromNav: [],
    dashboardComponent: null
  },

  client: {
    defaultView: 'clientDashboard',
    allowedViews: [
      'clientDashboard', 'clientChat', 'clientDocuments', 'clientApplications',
    ],
    hiddenFromNav: [],
    dashboardComponent: null
  },

  // 🆕 ПРОЕКТИРОВЩИК — минимальный набор разделов
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
    dashboardComponent: 'DesignerDashboard'
  },

  // ============================================================
  // НОВЫЕ РОЛИ ДЛЯ МОДУЛЯ ПОСТАВЩИКОВ
  // ============================================================

  procurement_manager: {
    defaultView: 'procurementDashboard',
    allowedViews: [
      'procurementDashboard',
      'suppliers', 'supplierDetails', 'supplierCatalog',
      'rfqList', 'rfqDetails', 'rfqCreate',
      'purchaseOrders', 'purchaseOrderDetails',
      'warehouse', 'inwork', 'received',
      'objects', 'object-hub',
    ],
    hiddenFromNav: ['create', 'confirmation', 'employees', 'tariffs'],
    dashboardComponent: 'ProcurementDashboard'
  },

  supplier_admin: {
    defaultView: 'supplierDashboard',
    allowedViews: [
      'supplierDashboard',
      'supplierPriceList',
      'supplierRFQ',
      'supplierOrders',
      'supplierProfile',
    ],
    hiddenFromNav: [],
    dashboardComponent: 'SupplierDashboard'
  },

  supplier_manager: {
    defaultView: 'supplierDashboard',
    allowedViews: [
      'supplierDashboard',
      'supplierPriceList',
      'supplierRFQ',
      'supplierOrders',
      'supplierProfile',
    ],
    hiddenFromNav: [],
    dashboardComponent: 'SupplierDashboard'
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
// ХЕЛПЕРЫ ДЛЯ МОДУЛЯ ПОСТАВЩИКОВ
// ============================================================

export const SUPPLIER_VIEWS = [
  'suppliers',
  'supplierDetails',
  'supplierCatalog',
  'rfqList',
  'rfqCreate',
  'rfqDetails',
  'purchaseOrders',
  'purchaseOrderDetails',
  'procurementDashboard',
  'supplierDashboard',
  'supplierPriceList',
  'supplierRFQ',
  'supplierOrders',
  'supplierProfile',
];

export const PROCUREMENT_VIEWS = [
  'procurementDashboard',
  'suppliers',
  'supplierDetails',
  'supplierCatalog',
  'rfqList',
  'rfqCreate',
  'rfqDetails',
  'purchaseOrders',
  'purchaseOrderDetails',
];

export const SUPPLIER_SIDE_VIEWS = [
  'supplierDashboard',
  'supplierPriceList',
  'supplierRFQ',
  'supplierOrders',
  'supplierProfile',
];

export const isSupplierView = (view) => SUPPLIER_VIEWS.includes(view);
export const isProcurementView = (view) => PROCUREMENT_VIEWS.includes(view);
export const isSupplierSideView = (view) => SUPPLIER_SIDE_VIEWS.includes(view);