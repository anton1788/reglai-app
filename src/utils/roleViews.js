// Конфигурация ролей и доступных view

export const ROLE_VIEWS = {
  manager: {
    defaultView: 'managerDashboard',
    allowedViews: [
      'managerDashboard', 'analytics', 'employees', 'tariffs',
      'companyProfile', 'approvals',
      'objects', 'object-hub',
      // === МОДУЛЬ ПОСТАВЩИКОВ ===
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
      // === МОДУЛЬ ПОСТАВЩИКОВ ===
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
      // === МОДУЛЬ ПОСТАВЩИКОВ (только просмотр) ===
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
      // === МОДУЛЬ ПОСТАВЩИКОВ ===
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

  // ============================================================
  // НОВЫЕ РОЛИ ДЛЯ МОДУЛЯ ПОСТАВЩИКОВ
  // ============================================================

  // Менеджер по закупкам (со стороны заказчика)
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

  // Администратор поставщика (со стороны поставщика)
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

  // Менеджер поставщика
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

/**
 * Список всех view модуля поставщиков
 */
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

/**
 * Views, доступные закупщику (заказчику)
 */
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

/**
 * Views, доступные поставщику
 */
export const SUPPLIER_SIDE_VIEWS = [
  'supplierDashboard',
  'supplierPriceList',
  'supplierRFQ',
  'supplierOrders',
  'supplierProfile',
];

/**
 * Проверка: относится ли view к модулю поставщиков
 */
export const isSupplierView = (view) => SUPPLIER_VIEWS.includes(view);

/**
 * Проверка: относится ли view к закупщицкой части
 */
export const isProcurementView = (view) => PROCUREMENT_VIEWS.includes(view);

/**
 * Проверка: относится ли view к стороне поставщика
 */
export const isSupplierSideView = (view) => SUPPLIER_SIDE_VIEWS.includes(view);