// src/components/AuditView.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  Download, Search, Loader2, History, Wifi, TrendingUp,
  AlertTriangle, CheckCircle, X, Trash2, RefreshCw, Filter
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
// ✅ ИМПОРТ STATUS_I18N_KEYS
import { getRoleLabel, STATUS_I18N_KEYS, isValidUUID, sanitizeText, formatDate } from '../utils/helpers';

// ─────────────────────────────────────────────────────────────
// 📦 КОНСТАНТЫ
// ─────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 50;
const CACHE_DURATION = 3600000;
const SEARCH_DEBOUNCE_MS = 300;

const OPERATION_TYPES = {
  financial: {
    actions: ['application_received_full', 'application_received_partial', 'status_changed', 'material_received', 'material_partial'],
    icon: TrendingUp,
    color: 'amber',
    labelKey: 'financial'
  },
  creation: {
    actions: ['application_created', 'user_invited', 'template_created', 'template_used', 'comment_added'],
    icon: CheckCircle,
    color: 'green',
    labelKey: 'creation'
  },
  destructive: {
    actions: ['application_canceled', 'employee_blocked'],
    icon: AlertTriangle,
    color: 'red',
    labelKey: 'destructive'
  }
};

const ACTION_LABELS = {
  'application_created': 'auditCreatedBy',
  'application_canceled': 'auditCanceledBy',
  'application_received_full': 'auditReceivedBy',
  'application_received_partial': 'auditReceivedPartialBy',
  'status_changed': 'auditStatusChangedBy',
  'user_invited': 'auditInvitationSent',
  'employee_blocked': 'auditEmployeeBlocked',
  'employee_unblocked': 'auditEmployeeUnblocked',
  'template_created': 'auditTemplateCreated',
  'template_used': 'auditTemplateUsed',
  'comment_added': 'auditCommentAdded',
  'material_received': 'auditMaterialReceived',
  'material_partial': 'auditMaterialPartial'
};

const ACCOUNTANT_ALLOWED_ACTIONS = [
  'application_created',
  'application_canceled', 
  'application_received_full',
  'application_received_partial',
  'status_changed'
];

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ
// ─────────────────────────────────────────────────────────────

const getOperationType = (actionType) => {
  for (const [type, config] of Object.entries(OPERATION_TYPES)) {
    if (config.actions.includes(actionType)) return type;
  }
  return 'other';
};

const getActionLabelKey = (actionType) => ACTION_LABELS[actionType] || actionType;

// ─────────────────────────────────────────────────────────────
// 🎣 КАСТОМНЫЙ ХУК ДЛЯ КЭШИРОВАНИЯ
// ─────────────────────────────────────────────────────────────

const useAuditCache = () => {
  const getFromCache = useCallback((key) => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      const { data, expiresAt } = JSON.parse(cached);
      if (Date.now() > expiresAt) {
        localStorage.removeItem(key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const saveToCache = useCallback((key, data) => {
    try {
      const cached = JSON.stringify({ data, expiresAt: Date.now() + CACHE_DURATION });
      localStorage.setItem(key, cached);
    } catch (e) {
      console.warn('Cache save failed:', e);
    }
  }, []);

  const clearCache = useCallback((prefix) => {
    Object.keys(localStorage)
      .filter(key => key.startsWith(prefix))
      .forEach(key => localStorage.removeItem(key));
  }, []);

  return { getFromCache, saveToCache, clearCache };
};

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ
// ─────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <div className="animate-pulse bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
        </div>
      ))}
    </div>
  </div>
);

const ActionBadge = ({ actionType, t }) => {
  const type = getOperationType(actionType);
  const config = OPERATION_TYPES[type] || {};
  const Icon = config.icon;
  const colorClasses = {
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${colorClasses[config.color] || colorClasses.blue}`}>
      {Icon && <Icon className="w-3 h-3" aria-hidden="true" />}
      {t(getActionLabelKey(actionType)) || actionType}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────

const AuditView = ({
  supabase,
  userCompanyId,
  userCompany,
  t,
  showNotification,
  language,
  userRole
}) => {
  // ─────────────────────────────────────────────────────────
  // 📊 STATE
  // ─────────────────────────────────────────────────────────
  
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    actionType: 'all',
    userId: 'all',
    search: ''
  });
  
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [applicationObjects, setApplicationObjects] = useState({});
  const [usersMap, setUsersMap] = useState({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isExporting, setIsExporting] = useState({ pdf: false, xlsx: false });
  
  const { getFromCache, saveToCache, clearCache } = useAuditCache();
  const abortControllerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const loadMoreRef = useRef(null);

  // ─────────────────────────────────────────────────────────
  // 🔍 ЗАГРУЗКА МАППИНГОВ
  // ─────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (!userCompanyId || !supabase) return;

    const loadMappings = async () => {
      const objCacheKey = `app_objects_${userCompanyId}`;
      const cachedObjects = getFromCache(objCacheKey);
      
      if (cachedObjects) {
        setApplicationObjects(cachedObjects);
      } else {
        try {
          const { data, error } = await supabase
            .from('applications')
            .select('id, object_name')
            .eq('company_id', userCompanyId);
          
          if (!error && Array.isArray(data)) {
            const map = Object.fromEntries(data.map(app => [app.id, app.object_name]));
            setApplicationObjects(map);
            saveToCache(objCacheKey, map);
          }
        } catch (e) {
          console.error('Failed to load objects:', e);
        }
      }

      const usersCacheKey = `users_${userCompanyId}`;
      const cachedUsers = getFromCache(usersCacheKey);
      
      if (cachedUsers) {
        setUsersMap(cachedUsers);
      } else {
        try {
          const { data, error } = await supabase
            .from('company_users')
            .select('user_id, full_name, phone, role')
            .eq('company_id', userCompanyId);
          
          if (!error && Array.isArray(data)) {
            const map = Object.fromEntries(
              data.map(u => [u.user_id, { full_name: u.full_name, phone: u.phone, role: u.role }])
            );
            setUsersMap(map);
            saveToCache(usersCacheKey, map);
          }
        } catch (e) {
          console.error('Failed to load users:', e);
        }
      }
    };

    loadMappings();
  }, [userCompanyId, supabase, getFromCache, saveToCache]);

  // ─────────────────────────────────────────────────────────
  // 🔄 ЗАГРУЗКА АУДИТ ЛОГОВ
  // ─────────────────────────────────────────────────────────
  
  const loadAuditLogs = useCallback(async (pageNumber = 1, append = false) => {
    if (!userCompanyId || !supabase) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setIsLoadingAudit(true);
    
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('company_id', userCompanyId)
        .order('created_at', { ascending: false })
        .range((pageNumber - 1) * ITEMS_PER_PAGE, pageNumber * ITEMS_PER_PAGE - 1);

      if (userRole === 'accountant') {
        query = query.in('action_type', ACCOUNTANT_ALLOWED_ACTIONS);
      }

      if (filters.dateFrom) query = query.gte('created_at', `${filters.dateFrom}T00:00:00.000Z`);
      if (filters.dateTo) query = query.lte('created_at', `${filters.dateTo}T23:59:59.999Z`);
      if (filters.actionType !== 'all') query = query.eq('action_type', filters.actionType);
      if (filters.userId !== 'all') query = query.eq('user_id', filters.userId);

      const { data = [], error } = await query;
      
      if (error) throw error;

      let filteredData = data;
      if (debouncedSearch.trim()) {
        const searchLower = debouncedSearch.toLowerCase().trim();
        filteredData = data.filter(log => {
          const targetId = log.target_id?.trim();
          const objectName = (targetId && isValidUUID(targetId)) 
            ? (applicationObjects[targetId] || '') 
            : '';
          const userName = usersMap[log.user_id]?.full_name || log.user_full_name || '';
          const userEmail = log.user_email || '';
          const ip = log.metadata?.ip_address || '';
          const action = log.action_type || '';
          const actionLabel = t(getActionLabelKey(action)).toLowerCase();
          
          return [userName, userEmail, objectName, action, actionLabel, ip, 
            JSON.stringify(log.old_value), JSON.stringify(log.new_value)
          ].some(field => field?.toLowerCase().includes(searchLower));
        });
      }

      setAuditLogs(prev => append ? [...prev, ...filteredData] : filteredData);
      setHasMore(filteredData.length === ITEMS_PER_PAGE);
      
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Audit load error:', err);
        showNotification(t('auditLoadError') || 'Ошибка загрузки аудита', 'error');
      }
    } finally {
      setIsLoadingAudit(false);
    }
  }, [userCompanyId, userRole, filters, debouncedSearch, applicationObjects, usersMap, supabase, t, showNotification]);

  // ─────────────────────────────────────────────────────────
  // 🌐 ONLINE/OFFLINE STATUS
  // ─────────────────────────────────────────────────────────
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (auditLogs.length === 0) loadAuditLogs(1, false);
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [auditLogs.length, loadAuditLogs]);

  // ─────────────────────────────────────────────────────────
  // 🔍 DEBOUNCED SEARCH
  // ─────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [filters.search]);

  // ─────────────────────────────────────────────────────────
  // ♾️ INFINITE SCROLL
  // ─────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (debouncedSearch) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingAudit) {
          setPage(prev => prev + 1);
        }
      },
      { rootMargin: '100px' }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingAudit, debouncedSearch]);

  // ─────────────────────────────────────────────────────────
  // 📥 ЗАГРУЗКА ПРИ ИЗМЕНЕНИИ СТРАНИЦЫ / ФИЛЬТРОВ
  // ─────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (page > 1) loadAuditLogs(page, true);
  }, [page, loadAuditLogs]);

  useEffect(() => {
    setPage(1);
    loadAuditLogs(1, false);
  }, [filters, userCompanyId, userRole, loadAuditLogs]);

  // ─────────────────────────────────────────────────────────
  // 🎛️ ОБРАБОТЧИКИ
  // ─────────────────────────────────────────────────────────
  
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ dateFrom: '', dateTo: '', actionType: 'all', userId: 'all', search: '' });
    setDebouncedSearch('');
  }, []);

  const refreshData = useCallback(() => {
    clearCache('app_objects_');
    clearCache('users_');
    setApplicationObjects({});
    setUsersMap({});
    setPage(1);
    loadAuditLogs(1, false);
    showNotification(t('dataRefreshed') || 'Данные обновлены', 'success');
  }, [clearCache, loadAuditLogs, showNotification, t]);

  // ─────────────────────────────────────────────────────────
  // 📤 ЭКСПОРТ
  // ─────────────────────────────────────────────────────────
  
  const exportAuditAsPDF = useCallback(async () => {
    if (isExporting.pdf || auditLogs.length === 0) return;
    setIsExporting(prev => ({ ...prev, pdf: true }));
    
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`${t('audit')} — ${sanitizeText(userCompany)}`, 14, 20);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`${t('exportDate')}: ${formatDate(new Date().toISOString(), language)}`, 14, 30);
      doc.text(`${t('totalRecords')}: ${auditLogs.length}`, pageWidth - 14, 30, { align: 'right' });

      const headers = [t('auditDate'), t('auditUser'), t('auditAction'), t('auditObject'), t('auditDetails')];
      const rows = auditLogs.slice(0, 100).map(log => {
        const targetId = log.target_id?.trim();
        const objectDisplay = (log.target_type === 'application' && targetId && isValidUUID(targetId) && applicationObjects[targetId])
          ? `${applicationObjects[targetId]} (#${targetId.slice(0, 6)}...)`
          : log.target_id || '—';
        
        return [
          formatDate(log.created_at, language),
          sanitizeText(log.user_full_name || log.user_email || '—'),
          t(getActionLabelKey(log.action_type)),
          sanitizeText(objectDisplay),
          log.metadata?.ip_address || ''
        ];
      });

      doc.autoTable({
        head: [headers],
        body: rows,
        startY: 40,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [249, 250, 251] }
      });

      doc.save(`audit_${new Date().toISOString().split('T')[0]}.pdf`);
      showNotification(`${t('exportSuccess') || 'Экспорт успешен'} (PDF)`, 'success');
      
    } catch (error) {
      console.error('PDF export error:', error);
      showNotification(t('exportError') || 'Ошибка экспорта', 'error');
    } finally {
      setIsExporting(prev => ({ ...prev, pdf: false }));
    }
  }, [auditLogs, applicationObjects, userCompany, t, language, showNotification, isExporting.pdf]);

  const exportAuditAsXLSX = useCallback(async () => {
    if (isExporting.xlsx || auditLogs.length === 0) return;
    setIsExporting(prev => ({ ...prev, xlsx: true }));
    
    try {
      const data = auditLogs.map(log => {
        const targetId = log.target_id?.trim();
        const objectName = (log.target_type === 'application' && targetId && isValidUUID(targetId))
          ? applicationObjects[targetId] || ''
          : '';
        
        return {
          [t('auditDate')]: formatDate(log.created_at, language),
          [t('auditUser')]: sanitizeText(log.user_full_name || log.user_email),
          [t('auditRole')]: getRoleLabel(log.user_role),
          [t('auditAction')]: t(getActionLabelKey(log.action_type)),
          [t('auditType')]: log.target_type,
          [t('auditObject')]: sanitizeText(objectName),
          [t('auditObjectId')]: targetId || '—',
          [t('auditIP')]: log.metadata?.ip_address || '—'
        };
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('audit') || 'Audit');
      XLSX.writeFile(wb, `audit_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      showNotification(`${t('exportSuccess') || 'Экспорт успешен'} (Excel)`, 'success');
      
    } catch (error) {
      console.error('XLSX export error:', error);
      showNotification(t('exportError') || 'Ошибка экспорта', 'error');
    } finally {
      setIsExporting(prev => ({ ...prev, xlsx: false }));
    }
  }, [auditLogs, applicationObjects, t, language, showNotification, isExporting.xlsx]);

  // ─────────────────────────────────────────────────────────
  // 📋 GROUPED LOGS
  // ─────────────────────────────────────────────────────────
  
  const groupedLogs = useMemo(() => {
    return auditLogs.reduce((groups, log) => {
      const date = new Date(log.created_at).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US');
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
      return groups;
    }, {});
  }, [auditLogs, language]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => v && v !== 'all');
  }, [filters]);

  // ─────────────────────────────────────────────────────────
  // 📋 РЕНДЕРИНГ
  // ─────────────────────────────────────────────────────────

  return (
    <section className="max-w-7xl mx-auto p-4" aria-labelledby="audit-heading">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h2 id="audit-heading" className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {t('audit')}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
              <span>{t('totalRecords')}: {auditLogs.length}</span>
              {debouncedSearch && (
                <span className="text-amber-600 dark:text-amber-400">
                  • {t('searchResults')}: "{sanitizeText(debouncedSearch)}"
                </span>
              )}
              {isLoadingAudit && (
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                  {t('loading')}
                </span>
              )}
              {!isOnline && (
                <span className="flex items-center gap-1 text-red-600">
                  <Wifi className="w-3 h-3" aria-hidden="true" />
                  {t('offline')}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={refreshData}
              disabled={isLoadingAudit}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              aria-label={t('refreshData')}
              title={t('refreshData')}
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingAudit ? 'animate-spin' : ''}`} aria-hidden="true" />
              {t('refresh')}
            </button>
            
            <button
              onClick={exportAuditAsPDF}
              disabled={isExporting.pdf || auditLogs.length === 0}
              className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300/50 dark:border-gray-600/50 hover:bg-gray-50 dark:hover:bg-gray-600 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
              aria-label={t('exportPDF')}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              PDF
            </button>
            
            <button
              onClick={exportAuditAsXLSX}
              disabled={isExporting.xlsx || auditLogs.length === 0}
              className="px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300/50 dark:border-gray-600/50 hover:bg-gray-50 dark:hover:bg-gray-600 text-xs font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
              aria-label={t('exportExcel')}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Excel
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('auditDateFrom')}
            </label>
            <input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('auditDateTo')}
            </label>
            <input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="action-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('auditActions')}
            </label>
            <select
              id="action-type"
              value={filters.actionType}
              onChange={(e) => handleFilterChange('actionType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">{t('allActions')}</option>
              {(userRole === 'accountant' ? ACCOUNTANT_ALLOWED_ACTIONS : Object.keys(ACTION_LABELS)).map(action => (
                <option key={action} value={action}>{t(getActionLabelKey(action))}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('auditUser')}
            </label>
            <select
              id="user-filter"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">{t('allUsers')}</option>
              {Object.entries(usersMap).map(([userId, userData]) => (
                <option key={userId} value={userId}>
                  {sanitizeText(userData.full_name)} ({getRoleLabel(userData.role)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="w-full px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors"
              aria-label={t('clearFilters')}
            >
              <X className="w-4 h-4" aria-hidden="true" />
              {t('clearFilters')}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <label htmlFor="audit-search" className="sr-only">{t('search')}</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
            <input
              id="audit-search"
              type="search"
              placeholder={t('auditSearchPlaceholder')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') handleFilterChange('search', ''); }}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            {filters.search && (
              <button
                onClick={() => handleFilterChange('search', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label={t('clearSearch')}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {auditLogs.length === 0 ? (
          <div className="text-center py-12" role="status">
            {isLoadingAudit ? (
              <>
                <Loader2 className="w-16 h-16 text-indigo-600 mx-auto mb-4 animate-spin" aria-hidden="true" />
                <p className="text-gray-600 dark:text-gray-400">{t('loadingAudit')}</p>
              </>
            ) : (
              <>
                <History className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" aria-hidden="true" />
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  {debouncedSearch ? t('auditNoResults') : t('auditNoData')}
                </p>
                {debouncedSearch && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                  >
                    {t('clearSearchAndRetry')}
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6 max-h-[calc(100vh-400px)] overflow-y-auto pr-2" role="list">
            {Object.entries(groupedLogs).map(([date, logs]) => (
              <article key={date} className="mb-6" aria-labelledby={`date-${date}`}>
                <div className="sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur py-2 z-10 border-b border-gray-200 dark:border-gray-700 mb-3">
                  <h3 id={`date-${date}`} className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span aria-hidden="true">📅</span>
                    <time dateTime={date}>{date}</time>
                    <span className="text-xs font-normal text-gray-500">({logs.length})</span>
                  </h3>
                </div>

                <div className="space-y-2">
                  {logs.map((log) => {
                    const type = getOperationType(log.action_type);
                    const config = OPERATION_TYPES[type] || {};
                    
                    const borderClasses = {
                      financial: 'border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-900/20',
                      destructive: 'border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-900/20',
                      creation: 'border-l-4 border-l-green-500 bg-green-50/30 dark:bg-green-900/20'
                    };

                    return (
                      <div
                        key={log.id}
                        className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all ${borderClasses[type] || ''}`}
                        role="listitem"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('auditDate')}</div>
                            <time dateTime={log.created_at} className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatDate(log.created_at, language)}
                            </time>
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('auditUser')}</div>
                            <div className="flex items-center gap-2">
                              {config.icon && <config.icon className={`w-4 h-4 text-${config.color}-600`} aria-hidden="true" />}
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {sanitizeText(usersMap[log.user_id]?.full_name || log.user_full_name || log.user_email)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {getRoleLabel(usersMap[log.user_id]?.role || log.user_role)}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('auditAction')}</div>
                            <ActionBadge actionType={log.action_type} t={t} />
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('auditObject')}</div>
                            {log.target_type === 'application' && log.target_id && isValidUUID(log.target_id) ? (
                              <div className="text-sm text-gray-900 dark:text-white">
                                {applicationObjects[log.target_id] || <span className="text-gray-400">{t('loading')}...</span>}
                                <div className="text-xs text-gray-500 font-mono">
                                  #{log.target_id.slice(0, 8)}...
                                </div>
                              </div>
                            ) : log.target_type === 'user' ? (
                              <div className="text-sm text-gray-900 dark:text-white">
                                {sanitizeText(usersMap[log.target_id]?.full_name || '—')}
                                <div className="text-xs text-gray-500">
                                  {getRoleLabel(usersMap[log.target_id]?.role || '—')}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-900 dark:text-white">
                                {log.target_type}: {sanitizeText(log.target_id || '—')}
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('auditDetails')}</div>
                            <div className="text-xs space-y-1">
                              {/* ✅ ИСПОЛЬЗУЕМ STATUS_I18N_KEYS + t() */}
                              {log.new_value?.status && (
                                <div>
                                  <span className="text-gray-500">{t('status')}:</span>{' '}
                                  <span className="font-medium">
                                    {t(STATUS_I18N_KEYS[log.new_value.status] || log.new_value.status)}
                                  </span>
                                </div>
                              )}
                              {log.new_value?.received_count !== undefined && (
                                <div>
                                  <span className="text-gray-500">{t('received')}:</span>{' '}
                                  <span className="font-medium">
                                    {log.new_value.received_count}/{log.new_value.total_count}
                                  </span>
                                </div>
                              )}
                              {log.metadata?.ip_address && (
                                <div className="text-gray-500 flex items-center gap-1">
                                  <Wifi className="w-3 h-3" aria-hidden="true" />
                                  <code className="text-xs">{log.metadata.ip_address}</code>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
            
            <div ref={loadMoreRef} className="h-10" aria-hidden="true" />
            
            {isLoadingAudit && hasMore && !debouncedSearch && (
              <div className="py-4 space-y-2">
                {[...Array(2)].map((_, i) => <SkeletonRow key={i} />)}
              </div>
            )}
            
            {!hasMore && auditLogs.length > 0 && !debouncedSearch && (
              <p className="text-center text-sm text-gray-500 py-4" role="status">
                {t('endOfList')}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default memo(AuditView);