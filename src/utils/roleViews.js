// Конфигурация ролей и доступных view
export const ROLE_VIEWS = {
  manager: {
    defaultView: 'managerDashboard',
    allowedViews: ['managerDashboard', 'analytics', 'employees', 'tariffs', 'companyProfile', 'approvals'],
    hiddenFromNav: ['create', 'received', 'confirmation'],
    dashboardComponent: 'ManagerMainDashboard'
  },
  director: {
    defaultView: 'managerDashboard',
    allowedViews: ['managerDashboard', 'analytics', 'employees', 'tariffs', 'companyProfile', 'approvals'],
    hiddenFromNav: ['create', 'received', 'confirmation'],
    dashboardComponent: 'ManagerMainDashboard'
  },
  accountant: {
    defaultView: 'accountantDashboard',
    allowedViews: ['accountantDashboard', 'analytics', 'history', 'documents'],
    hiddenFromNav: ['create', 'received', 'warehouse', 'inwork'],
    dashboardComponent: 'AccountantFinanceDashboard'
  },
  supply_admin: {
    defaultView: 'received',
    allowedViews: ['received', 'warehouse', 'create', 'chat', 'inwork'],
    hiddenFromNav: [],
    dashboardComponent: null
  },
  master: {
    defaultView: 'create',
    allowedViews: ['create', 'inwork', 'history', 'confirmation'],
    hiddenFromNav: [],
    dashboardComponent: null
  },
  foreman: {
    defaultView: 'create',
    allowedViews: ['create', 'inwork', 'history', 'confirmation'],
    hiddenFromNav: [],
    dashboardComponent: null
  },
  client: {
    defaultView: 'clientDashboard',
    allowedViews: ['clientDashboard', 'clientChat', 'clientDocuments', 'clientApplications'],
    hiddenFromNav: [],
    dashboardComponent: null
  }
};

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