import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Shield, Users, Ban, CheckCircle, BarChart3, Search, ChevronDown, 
  Filter, RefreshCw, Edit3, Trash2, AlertTriangle, X, ArrowLeft, Building2,
  DollarSign, TrendingUp, Gift
} from 'lucide-react';

// ============================================================================
// NEW IMPORTS
// ============================================================================
import SuperAdminCompanyTariffs from './SuperAdminCompanyTariffs';
import GlobalSearch from './GlobalSearch';
import PromoModal from './PromoModal';
import PromoManager from './PromoManager';

// ============================================================================
// UTILS & CONSTANTS
// ============================================================================

const ROLES = ['foreman', 'supply_admin', 'manager', 'accountant'];
const DEBOUNCE_DELAY = 300;

const sanitizeInput = (str) => {
  if (!str) return '';
  return String(str).replace(/[<>]/g, '');
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useSuperAdminData = (supabase, currentUser, showNotification, t) => {
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [_error] = useState(null);

  const loadData = useCallback(async () => {
    if (!supabase) return;
    
    setIsLoading(true);
    
    try {
      const [empResult, compResult] = await Promise.all([
        supabase.from('company_users').select('*').order('id', { ascending: false }),
        supabase.from('companies').select('*').order('id', { ascending: false })
      ]);

      if (empResult.error) throw empResult.error;
      if (compResult.error) throw compResult.error;

      const companyMap = new Map(compResult.data?.map(c => [c.id, c.name]) || []);

      // Parallel enrichment of user data
      const enrichedEmps = await Promise.all(
        (empResult.data || [])
        .filter(emp => emp.role !== 'super_admin') 
        .map(async (emp) => {
          let userEmail = '—';
          
          if (emp.user_id) {
            // Try to get email from profiles/users table
            const { data: userData } = await supabase
              .from('users')
              .select('email')
              .eq('id', emp.user_id)
              .maybeSingle();
            
            if (userData?.email) {
              userEmail = userData.email;
            } else {
              // Fallback via RPC if exists
              try {
                const { data: rpcData } = await supabase.rpc('get_user_email', { user_uuid: emp.user_id });
                if (rpcData) userEmail = rpcData;
              } catch (e) {
                console.debug('RPC get_user_email not available:', e.message);
              }
            }
          }
          
          return {
            ...emp,
            email: userEmail,
            full_name: emp.full_name || '—',
            company_name: companyMap.get(emp.company_id) || t('deleted')
          };
        })
      );

      setEmployees(enrichedEmps);
      setCompanies(compResult.data || []);
      
    } catch (err) {
      console.error('SuperAdmin load error:', err);
      if (showNotification) {
        showNotification(t('failedToLoadData'), 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [supabase, t, showNotification]);

  // Access check
  useEffect(() => {
    const checkAccess = async () => {
      if (!currentUser || !supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.user_metadata?.role !== 'super_admin') {
        if (showNotification) {
          showNotification(t('accessDenied'), 'error');
        }
      }
    };
    checkAccess();
  }, [currentUser, supabase, showNotification, t]);

  // Auto-load on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return { employees, companies, isLoading, loadData };
};

const useFilteredData = (items, config) => {
  const { searchTerm, filters, viewMode } = config;
  
  return useMemo(() => {
    if (!items?.length) return [];
    
    let filtered = [...items];
    
    if (viewMode === 'active-users') {
      filtered = filtered.filter(item => item.is_active);
    } else if (viewMode === 'blocked-users') {
      filtered = filtered.filter(item => !item.is_active);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const searchable = [
          item.full_name, item.email, item.company_name, item.name
        ].filter(Boolean).join(' ').toLowerCase();
        return searchable.includes(term);
      });
    }
    
    if (filters?.role && filters.role !== 'all') {
      filtered = filtered.filter(item => item.role === filters.role);
    }
    if (filters?.status && filters.status !== 'all') {
      const isActive = filters.status === 'active';
      filtered = filtered.filter(item => item.is_active === isActive);
    }
    
    return filtered;
  }, [items, searchTerm, filters, viewMode]);
};

const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debounced;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const AnalyticsCard = React.memo(({ title, value, Icon, color, onClick, t }) => (
  <button
    onClick={onClick}
    className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 
               transition-all duration-200 text-left w-full group focus:outline-none focus:ring-2 
               focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
    aria-label={`${t(title)}: ${value}`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t(title)}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 transition-transform group-hover:scale-105">
          {value}
        </p>
      </div>
      <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 transition-transform group-hover:scale-110`}>
        {Icon && <Icon className={`w-6 h-6 text-${color}-500`} aria-hidden="true" />}
      </div>
    </div>
    <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
      <span>{t('viewDetails')}</span>
      <ChevronDown className="w-3 h-3 ml-1 -rotate-90" aria-hidden="true" />
    </div>
  </button>
));
AnalyticsCard.displayName = 'AnalyticsCard';

const StatusBadge = React.memo(({ isActive, t }) => (
  <span className={`px-2.5 py-0.5 inline-flex text-xs font-semibold rounded-full ${
    isActive 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
  }`} role="status">
    {isActive ? t('active') : t('blocked')}
  </span>
));
StatusBadge.displayName = 'StatusBadge';

const LoadingSpinner = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-12" role="status">
    <div className="animate-spin rounded-full h-10 w-10 border-3 border-amber-500 border-t-transparent mb-3" />
    {label && <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>}
  </div>
);

const EmptyState = ({ icon: Icon, message }) => (
  <div className="text-center py-12 text-gray-500 dark:text-gray-400 flex flex-col items-center">
    {Icon && <Icon className="w-12 h-12 mb-3 opacity-40" aria-hidden="true" />}
    <p className="text-base">{message}</p>
  </div>
);

// ============================================================================
// TABLE COMPONENTS
// ============================================================================

const UserTable = React.memo(({ 
  users, isLoading, t, onToggleStatus, showCompanyColumn = true 
}) => {
  if (isLoading) return <LoadingSpinner label={t('loading')} />;
  if (!users?.length) return <EmptyState icon={Users} message={t('noUsersFound')} />;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" role="table">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            {['fullName', 'email', showCompanyColumn && 'company', 'role', 'status', 'actions']
              .filter(Boolean)
              .map((key) => (
                <th 
                  key={key}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {t(key)}
                </th>
              ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((emp) => (
            <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                {sanitizeInput(emp.full_name)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                {sanitizeInput(emp.email)}
              </td>
              {showCompanyColumn && (
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {sanitizeInput(emp.company_name)}
                </td>
              )}
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                {t(emp.role) || emp.role}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <StatusBadge isActive={emp.is_active} t={t} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <button
                  onClick={() => onToggleStatus(emp.id, emp.is_active)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    emp.is_active
                      ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 focus:ring-red-500'
                      : 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 focus:ring-green-500'
                  }`}
                  aria-label={emp.is_active ? t('blockEmployee') : t('unblockEmployee')}
                >
                  {emp.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  <span className="hidden sm:inline">
                    {emp.is_active ? t('block') : t('unblock')}
                  </span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
UserTable.displayName = 'UserTable';

const CompaniesTable = React.memo(({ 
  companies, isLoading, t, onEdit, onSave, onCancel, onDelete, onToggleBlock, showNotification 
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (comp) => {
    setEditingId(comp.id);
    setEditValue(comp.name);
    onEdit?.(comp);
  };

  const handleSave = async (comp) => {
    if (!editValue.trim()) {
      if (showNotification) {
        showNotification(t('companyNameCannotBeEmpty'), 'error');
      }
      return;
    }
    await onSave?.(comp.id, editValue.trim());
    setEditingId(null);
  };

  if (isLoading) return <LoadingSpinner label={t('loading')} />;
  if (!companies?.length) return <EmptyState icon={Building2} message={t('noCompanies')} />;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" role="table">
        <thead className="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              {t('name')}
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              {t('actions')}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {companies.map((comp) => (
            <tr key={comp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3">
                {editingId === comp.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave(comp);
                        if (e.key === 'Escape') {
                          setEditingId(null);
                          onCancel?.();
                        }
                      }}
                      aria-label={t('editCompanyName')}
                    />
                    <button
                      onClick={() => handleSave(comp)}
                      className="p-1.5 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 rounded-lg"
                      aria-label={t('save')}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setEditingId(null); onCancel?.(); }}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg"
                      aria-label={t('cancel')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {sanitizeInput(comp.name)}
                    </span>
                    <button
                      onClick={() => handleStartEdit(comp)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                      aria-label={`${t('edit')}: ${comp.name}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onToggleBlock?.(comp.id, comp.is_blocked, comp.name)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      comp.is_blocked
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
                    }`}
                    aria-label={comp.is_blocked ? t('unblockCompany', { name: comp.name }) : t('blockCompany', { name: comp.name })}
                  >
                    {comp.is_blocked ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{comp.is_blocked ? t('unblock') : t('block')}</span>
                  </button>
                  
                  <button
                    onClick={() => onDelete?.(comp.id, comp.name)}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label={`${t('delete')}: ${comp.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
CompaniesTable.displayName = 'CompaniesTable';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SuperAdminPanel = ({ supabase, currentUser, t, showNotification }) => {
  const [activeView, setActiveView] = useState('overview');
  const [viewTitle, setViewTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ role: 'all', status: 'all' });
  const [showFilters, setShowFilters] = useState(false);
  const [userCompanyId, setUserCompanyId] = useState(null);
  
  // Промокод состояния
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [showPromoManager, setShowPromoManager] = useState(false);
  const [activatingPromo, setActivatingPromo] = useState(false);
  
  const mainRef = useRef(null);
  
  // Get current user's company ID
  useEffect(() => {
    const getUserCompany = async () => {
      if (!currentUser || !supabase) return;
      const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();
      if (data) setUserCompanyId(data.company_id);
    };
    getUserCompany();
  }, [currentUser, supabase]);
  
  const { employees, companies, isLoading, loadData } = useSuperAdminData(
    supabase, currentUser, showNotification, t
  );
  
  const debouncedSearch = useDebounce(searchTerm, DEBOUNCE_DELAY);
  
  const filteredEmployees = useFilteredData(employees, {
    searchTerm: debouncedSearch,
    filters,
    viewMode: activeView
  });
  
  const filteredCompanies = useFilteredData(companies, {
    searchTerm: debouncedSearch,
    viewMode: activeView === 'companies' ? 'companies' : null
  });

  const analytics = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.is_active).length;
    const roles = employees.reduce((acc, e) => {
      acc[e.role] = (acc[e.role] || 0) + 1;
      return acc;
    }, {});
    
    return { total, active, blocked: total - active, roles, companiesCount: companies.length };
  }, [employees, companies]);

  // Handle promo activation
  const handleActivatePromo = useCallback(async (promoCode) => {
  console.log('🔍 1. Введённый промокод (оригинал):', promoCode);
  console.log('🔍 2. Длина промокода:', promoCode?.length);
  console.log('🔍 3. Код символов:', [...(promoCode || '')].map(c => c.charCodeAt(0)));
  
  if (!promoCode || !promoCode.trim()) {
    showNotification('Введите код промокода', 'error');
    return;
  }
  
  setActivatingPromo(true);
  try {
    // Проверяем ВСЕ промокоды в БД (без фильтрации)
    const { data: allPromoCodes, error: allError } = await supabase
      .from('promo_codes')
      .select('*');
    
    console.log('📋 ВСЕ промокоды в БД:', allPromoCodes);
    
    if (allError) {
      console.error('Ошибка загрузки промокодов:', allError);
      showNotification('Ошибка загрузки промокодов', 'error');
      setActivatingPromo(false);
      return;
    }
    
    // Ищем промокод (точное совпадение, БЕЗ toUpperCase!)
    const promoData = allPromoCodes?.find(p => p.code === promoCode.trim());
    
    console.log('📦 Результат поиска (find):', promoData);
    
    if (!promoData) {
      showNotification(`Промокод "${promoCode}" не найден`, 'error');
      setActivatingPromo(false);
      return;
    }
    
    console.log('✅ Промокод найден:', promoData);
    
    // Проверяем активность
    if (!promoData.is_active) {
      showNotification('Промокод деактивирован', 'error');
      setActivatingPromo(false);
      return;
    }
    
    // Проверяем срок действия
    if (promoData.expires_at && new Date(promoData.expires_at) < new Date()) {
      showNotification('Срок действия промокода истёк', 'error');
      setActivatingPromo(false);
      return;
    }
    
    // Проверяем лимит использований
    if (promoData.max_uses && promoData.used_count >= promoData.max_uses) {
      showNotification('Промокод уже использован максимальное количество раз', 'error');
      setActivatingPromo(false);
      return;
    }
    
    // Получаем company_id текущего пользователя
    const { data: companyUser, error: companyError } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', currentUser?.id)
      .maybeSingle();
    
    console.log('🏢 Компания пользователя:', companyUser);
    
    if (companyError || !companyUser) {
      showNotification('Компания не найдена', 'error');
      setActivatingPromo(false);
      return;
    }
    
    // Проверяем, не использовал ли пользователь уже этот промокод
    if (promoData.used_by?.includes(companyUser.company_id)) {
      showNotification('Ваша компания уже использовала этот промокод', 'error');
      setActivatingPromo(false);
      return;
    }
    
    // Определяем ID тарифа
    const tariffPlanId = promoData.tariff_plan_id || promoData.plan_id || 'pro';
    console.log('📊 Тариф для активации:', tariffPlanId);
    
    // Обновляем компанию
    const { error: updateCompanyError } = await supabase
      .from('companies')
      .update({
        plan_tier: tariffPlanId,
        plan_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        promo_code_used: promoData.code,
        promo_activated_at: new Date().toISOString(),
        promo_activated_by: currentUser?.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyUser.company_id);
    
    if (updateCompanyError) {
      console.error('❌ Ошибка обновления компании:', updateCompanyError);
      showNotification('Ошибка обновления компании: ' + updateCompanyError.message, 'error');
      setActivatingPromo(false);
      return;
    }
    
    // Обновляем счётчик использований промокода
    const { error: updatePromoError } = await supabase
      .from('promo_codes')
      .update({
        used_count: (promoData.used_count || 0) + 1,
        used_by: [...(promoData.used_by || []), companyUser.company_id],
        updated_at: new Date().toISOString()
      })
      .eq('id', promoData.id);
    
    if (updatePromoError) {
      console.error('❌ Ошибка обновления промокода:', updatePromoError);
    }
    
    showNotification(`✅ Промокод "${promoData.code}" успешно активирован! Тариф обновлён.`, 'success');
    setShowPromoModal(false);
    
    // Перезагружаем данные
    loadData();
    
  } catch (err) {
    console.error('❌ Критическая ошибка активации промокода:', err);
    showNotification('Ошибка активации промокода: ' + err.message, 'error');
  } finally {
    setActivatingPromo(false);
  }
}, [supabase, currentUser, showNotification, loadData]);

  // Navigation with tariff support
  const navigateTo = useCallback((view, title) => {
    setActiveView(view);
    setViewTitle(title);
    setSearchTerm('');
    setFilters({ role: 'all', status: 'all' });
    setShowFilters(false);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goToOverview = useCallback(() => {
    setActiveView('overview');
    setViewTitle('');
    setSearchTerm('');
  }, []);

  // UPDATED: Navigation items with Tariffs and Promo Manager
  const renderNavigation = () => {
    const navItems = [
      { id: 'overview', label: t('overview'), icon: BarChart3 },
      { id: 'users', label: t('users'), icon: Users },
      { id: 'companies', label: t('companies'), icon: Building2 },
      { id: 'tariffs', label: t('tariffs') || 'Тарифы', icon: DollarSign },
      { id: 'analytics', label: t('analytics'), icon: TrendingUp }
    ];

    return (
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = 
            (item.id === 'users' && (activeView === 'all-users' || activeView === 'active-users' || activeView === 'blocked-users')) ||
            (item.id === activeView);
          
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'overview') goToOverview();
                else if (item.id === 'users') navigateTo('all-users', t('allUsers'));
                else if (item.id === 'companies') navigateTo('companies', t('companies'));
                else if (item.id === 'tariffs') navigateTo('tariffs', t('tariffs') || 'Тарифы');
                else if (item.id === 'analytics') navigateTo('analytics', t('analytics'));
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
        
        {/* Кнопка управления промокодами (только для супер-админа) */}
        <button
          onClick={() => setShowPromoManager(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                   text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Gift className="w-4 h-4" />
          Управление промокодами
        </button>
      </div>
    );
  };

  // Actions
  const handleToggleUserStatus = useCallback(async (id, currentStatus) => {
    try {
      await supabase.from('company_users')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (showNotification) {
        showNotification(
          !currentStatus ? t('employeeUnblocked') : t('employeeBlocked'),
          'success'
        );
      }
      loadData();
    } catch (err) {
      console.error('Toggle user error:', err);
      if (showNotification) {
        showNotification(t('failedToChangeUserStatus'), 'error');
      }
    }
  }, [supabase, loadData, showNotification, t]);

  const handleSaveCompany = useCallback(async (id, newName) => {
    try {
      await supabase.from('companies')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (showNotification) {
        showNotification(t('companyNameUpdated'), 'success');
      }
      loadData();
    } catch (err) {
      console.error('Update company error:', err);
      if (showNotification) {
        showNotification(t('failedToUpdateCompany'), 'error');
      }
    }
  }, [supabase, loadData, showNotification, t]);

  const handleDeleteCompany = useCallback(async (id, name) => {
    if (!window.confirm(t('confirmDeleteCompany', { name }))) return;
    
    try {
      await supabase.from('applications').delete().eq('company_id', id);
      await supabase.from('company_users').delete().eq('company_id', id);
      await supabase.from('companies').delete().eq('id', id);
      
      if (showNotification) {
        showNotification(t('companyDeleted', { name }), 'success');
      }
      loadData();
    } catch (err) {
      console.error('Delete company error:', err);
      if (showNotification) {
        showNotification(t('failedToDeleteCompany'), 'error');
      }
    }
  }, [supabase, loadData, showNotification, t]);

  const handleToggleCompanyBlock = useCallback(async (id, isBlocked, name) => {
    try {
      await supabase.from('companies')
        .update({ is_blocked: !isBlocked, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (!isBlocked) {
        await supabase.from('company_users')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('company_id', id);
      }
      
      if (showNotification) {
        showNotification(
          !isBlocked ? t('companyBlocked', { name }) : t('companyUnblocked', { name }),
          'success'
        );
      }
      loadData();
    } catch (err) {
      console.error('Block company error:', err);
      if (showNotification) {
        showNotification(t('failedToChangeCompanyStatus'), 'error');
      }
    }
  }, [supabase, loadData, showNotification, t]);

  // 🔒 ЖЁСТКАЯ ЗАЩИТА: Блокируем рендер для не-супер-админов
  if (currentUser?.user_metadata?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 rounded-2xl p-6">
        <Shield className="w-12 h-12 text-red-500 mb-3" />
        <h3 className="text-lg font-bold text-red-700 dark:text-red-400">🔒 Доступ запрещён</h3>
        <p className="text-sm text-red-600 dark:text-red-300 mt-1 text-center">
          Управление тарифами компаний доступно только супер-администратору
        </p>
        <button 
          onClick={() => window.history.back()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors"
        >
          Вернуться назад
        </button>
      </div>
    );
  }

  // ============================================================================
  // RENDER: OVERVIEW DASHBOARD (with Global Search in header)
  // ============================================================================
  
  if (activeView === 'overview') {
    return (
      <>
        <div ref={mainRef} className="max-w-7xl mx-auto p-4 space-y-6" aria-live="polite">
          <header className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <Shield className="w-7 h-7 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('superAdminPanelTitle')}
                </h1>
              </div>
              
              {/* GLOBAL SEARCH in Header */}
              <div className="w-64 lg:w-96">
                <GlobalSearch
                  supabase={supabase}
                  userCompanyId={userCompanyId}
                  onResultSelect={(result) => {
                    if (result.type === 'user') {
                      navigateTo('all-users', t('allUsers'));
                    } else if (result.type === 'company') {
                      navigateTo('companies', t('companies'));
                    }
                    // Для applications в super_admin — просто переход к списку
                    if (result.type === 'application') {
                      navigateTo('overview', t('overview'));
                    }
                  }}
                  t={t}
                  showNotification={showNotification}
                />
              </div>
            </div>

            {/* Navigation */}
            {renderNavigation()}

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <AnalyticsCard 
                title="totalUsers" value={analytics.total} Icon={Users} color="amber"
                onClick={() => navigateTo('all-users', t('allUsers'))} t={t}
              />
              <AnalyticsCard 
                title="activeUsers" value={analytics.active} Icon={CheckCircle} color="green"
                onClick={() => navigateTo('active-users', t('activeUsers'))} t={t}
              />
              <AnalyticsCard 
                title="blockedUsers" value={analytics.blocked} Icon={Ban} color="red"
                onClick={() => navigateTo('blocked-users', t('blockedUsers'))} t={t}
              />
              <AnalyticsCard 
                title="companiesCount" value={analytics.companiesCount} Icon={Building2} color="blue"
                onClick={() => navigateTo('companies', t('companies'))} t={t}
              />
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('quickOverview')}</h2>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('searchAll')}
                    className="w-48 sm:w-64 pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 
                             rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    aria-label={t('searchAll')}
                  />
                </div>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                           rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  aria-expanded={showFilters}
                >
                  <Filter className="w-4 h-4" aria-hidden="true" />
                  {t('filters')}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                
                <button
                  onClick={loadData}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                           rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500
                           disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={t('refreshData')}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                  {t('refresh')}
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('role')}
                  </label>
                  <select
                    value={filters.role}
                    onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="all">{t('allRoles')}</option>
                    {ROLES.map(role => (
                      <option key={role} value={role}>{t(role)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('status')}
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="all">{t('allStatuses')}</option>
                    <option value="active">{t('active')}</option>
                    <option value="blocked">{t('blocked')}</option>
                  </select>
                </div>
              </div>
            )}

            {/* Preview Table */}
            <UserTable 
              users={filteredEmployees.slice(0, 5)} 
              isLoading={isLoading} 
              t={t} 
              onToggleStatus={handleToggleUserStatus}
            />
            
            {employees.length > 5 && (
              <div className="text-center mt-4">
                <button
                  onClick={() => navigateTo('all-users', t('allUsers'))}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-700 font-medium inline-flex items-center gap-1"
                >
                  {t('viewAllUsers')} <ChevronDown className="w-4 h-4 -rotate-90" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Role Distribution */}
            <div className="mt-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-500" aria-hidden="true" />
                {t('roleDistribution')}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                  {Object.entries(analytics.roles).map(([role, count]) => (
                    <div key={role} className="mb-3 last:mb-0">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{t(role) || role}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${analytics.total > 0 ? (count / analytics.total) * 100 : 0}%`,
                            backgroundColor: {
                              manager: '#3b82f6',
                              supply_admin: '#10b981',
                              foreman: '#f59e0b',
                              accountant: '#8b5cf6'
                            }[role] || '#6b7280'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('companiesCount')} ({companies.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {companies.slice(0, 8).map(comp => (
                      <div key={comp.id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300 truncate">• {comp.name}</span>
                        <button
                          onClick={() => navigateTo('companies', t('companies'))}
                          className="text-xs text-amber-600 dark:text-amber-400 hover:underline ml-2 flex-shrink-0"
                        >
                          {t('manage')}
                        </button>
                      </div>
                    ))}
                    {companies.length > 8 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        +{companies.length - 8} {t('more')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>
        </div>
        
        {/* Модалка ввода промокода */}
        <PromoModal
          isOpen={showPromoModal}
          onClose={() => setShowPromoModal(false)}
          onActivate={handleActivatePromo}
          isLoading={activatingPromo}
        />
        
        {/* Панель управления промокодами (только для супер-админа) */}
        {showPromoManager && (
  <PromoManager
    isOpen={showPromoManager}
    onClose={() => setShowPromoManager(false)}
    supabase={supabase}
    showNotification={showNotification}
  />
)}
      </>
    );
  }

  // ============================================================================
  // RENDER: TARIFFS VIEW
  // ============================================================================

  if (activeView === 'tariffs') {
    return (
      <>
        <div ref={mainRef} className="max-w-7xl mx-auto p-4" aria-live="polite">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            {/* Header with Back Button and Global Search */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={goToOverview}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 
                           hover:text-amber-600 dark:hover:text-amber-400 transition-colors 
                           focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg px-2 py-1"
                  aria-label={t('backToOverview')}
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  {t('back')}
                </button>
                
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                </div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{viewTitle}</h1>
              </div>
              
              {/* Global Search in Tariffs View Header */}
              <div className="w-64 lg:w-96">
                <GlobalSearch
                  supabase={supabase}
                  userCompanyId={userCompanyId}
                  onResultSelect={(result) => {
                    if (result.type === 'user') {
                      navigateTo('all-users', t('allUsers'));
                    } else if (result.type === 'company') {
                      navigateTo('companies', t('companies'));
                    }
                    if (result.type === 'application') {
                      navigateTo('overview', t('overview'));
                    }
                  }}
                  t={t}
                  showNotification={showNotification}
                />
              </div>
            </div>

            {/* Navigation */}
            {renderNavigation()}
            
            {/* Tariffs Component */}
            <SuperAdminCompanyTariffs
              supabase={supabase}
              showNotification={showNotification}
              t={t}
            />
          </div>
        </div>
        
        {/* Модалка ввода промокода */}
        <PromoModal
          isOpen={showPromoModal}
          onClose={() => setShowPromoModal(false)}
          onActivate={handleActivatePromo}
          isLoading={activatingPromo}
          t={t}
        />
        
        {/* Панель управления промокодами */}
        {showPromoManager && (
  <PromoManager
    isOpen={showPromoManager}
    onClose={() => setShowPromoManager(false)}
    supabase={supabase}
    showNotification={showNotification}
  />
)}
      </>
    );
  }

  // ============================================================================
  // RENDER: DETAILED VIEWS (Users & Companies)
  // ============================================================================

  return (
    <>
      <div ref={mainRef} className="max-w-7xl mx-auto p-4" aria-live="polite">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          {/* Header with Back Button and Global Search */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={goToOverview}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 
                         hover:text-amber-600 dark:hover:text-amber-400 transition-colors 
                         focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg px-2 py-1"
                aria-label={t('backToOverview')}
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                {t('back')}
              </button>
              
              <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                {activeView === 'companies' ? (
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                ) : activeView === 'blocked-users' ? (
                  <Ban className="w-5 h-5 text-red-600 dark:text-red-400" aria-hidden="true" />
                ) : (
                  <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                )}
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{viewTitle}</h1>
            </div>
            
            {/* Global Search in Detailed Views Header */}
            <div className="w-64 lg:w-96">
              <GlobalSearch
                supabase={supabase}
                userCompanyId={userCompanyId}
                onResultSelect={(result) => {
                  if (result.type === 'user') {
                    navigateTo('all-users', t('allUsers'));
                  } else if (result.type === 'company') {
                    navigateTo('companies', t('companies'));
                  }
                  if (result.type === 'application') {
                    navigateTo('overview', t('overview'));
                  }
                }}
                t={t}
                showNotification={showNotification}
              />
            </div>
          </div>

          {/* Navigation */}
          {renderNavigation()}

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeView === 'companies' ? t('searchCompanies') : t('searchUsers')}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 
                         rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                aria-label={activeView === 'companies' ? t('searchCompanies') : t('searchUsers')}
              />
            </div>
            
            {activeView !== 'companies' && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 
                         rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300
                         hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                aria-expanded={showFilters}
              >
                <Filter className="w-4 h-4" aria-hidden="true" />
                {t('filters')}
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            )}
          </div>
          
          {showFilters && activeView !== 'companies' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('role')}
                </label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">{t('allRoles')}</option>
                  {ROLES.map(role => (
                    <option key={role} value={role}>{t(role)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('status')}
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">{t('allStatuses')}</option>
                  <option value="active">{t('active')}</option>
                  <option value="blocked">{t('blocked')}</option>
                </select>
              </div>
            </div>
          )}

          {/* Content */}
          {activeView === 'companies' ? (
            <CompaniesTable
              companies={filteredCompanies}
              isLoading={isLoading}
              t={t}
              onEdit={() => {}}
              onSave={handleSaveCompany}
              onCancel={() => {}}
              onDelete={handleDeleteCompany}
              onToggleBlock={handleToggleCompanyBlock}
              showNotification={showNotification}
            />
          ) : (
            <UserTable
              users={filteredEmployees}
              isLoading={isLoading}
              t={t}
              onToggleStatus={handleToggleUserStatus}
              showCompanyColumn={activeView === 'all-users'}
            />
          )}

          {/* Results count */}
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {activeView === 'companies'
              ? t('showingCompanies', { count: filteredCompanies.length, total: companies.length })
              : t('showingUsers', { count: filteredEmployees.length, total: employees.length })
            }
          </div>
        </div>
      </div>
      
      {/* Модалка ввода промокода */}
      <PromoModal
        isOpen={showPromoModal}
        onClose={() => setShowPromoModal(false)}
        onActivate={handleActivatePromo}
        isLoading={activatingPromo}
        t={t}
      />
      
      {/* Панель управления промокодами */}
      {showPromoManager && (
  <PromoManager
    isOpen={showPromoManager}
    onClose={() => setShowPromoManager(false)}
    supabase={supabase}
    showNotification={showNotification}
  />
)}
    </>
  );
};

export default SuperAdminPanel;