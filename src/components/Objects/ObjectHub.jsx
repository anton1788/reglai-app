// src/components/Objects/ObjectHub.jsx
// ============================================================
// "Папка объекта" — все данные по проекту в одном месте
// ============================================================

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  ArrowLeft, Building2, MapPin, Edit3, RefreshCw, Loader2,
  BarChart3, FileText, DollarSign, Users, History, FolderOpen,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import ObjectDashboard from './ObjectDashboard';
import ObjectForm from './ObjectForm';
import { getObject } from '../../api/objects';
import {
  OBJECT_STATUS_LABELS,
  OBJECT_STATUS_COLORS,
  OBJECT_STATUS_ICONS,
} from '../../utils/objectStatuses';

// ────────────────────────────────────────────────────────────
// Хелперы
// ────────────────────────────────────────────────────────────
const formatDateShort = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch { return dateStr; }
};

const formatNumber = (num) => new Intl.NumberFormat('ru-RU').format(num || 0);

// ────────────────────────────────────────────────────────────
// Определение вкладок
// ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',     icon: BarChart3,  labelRu: 'Обзор',       labelEn: 'Overview' },
  { id: 'applications', icon: FileText,   labelRu: 'Заявки',      labelEn: 'Applications' },
  { id: 'finance',      icon: DollarSign, labelRu: 'Финансы',     labelEn: 'Finance' },
  { id: 'documents',    icon: FolderOpen, labelRu: 'Документы',   labelEn: 'Documents' },
  { id: 'participants', icon: Users,      labelRu: 'Участники',   labelEn: 'Participants' },
  { id: 'history',      icon: History,    labelRu: 'История',     labelEn: 'History' },
];

// ────────────────────────────────────────────────────────────
// Заглушка для вкладок "в разработке"
// ────────────────────────────────────────────────────────────
const ComingSoonTab = memo(({ title, description, icon, isRu }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 mb-4">
      {React.createElement(icon, { className: 'w-8 h-8 text-gray-400 dark:text-gray-500' })}
    </div>
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
      {description || (isRu ? 'Раздел в разработке. Скоро здесь появятся данные.' : 'Section under development. Data will appear here soon.')}
    </p>
  </div>
));
ComingSoonTab.displayName = 'ComingSoonTab';

// ────────────────────────────────────────────────────────────
// Вкладка "Заявки" (упрощённая версия)
// ────────────────────────────────────────────────────────────
const ApplicationsTab = memo(({
  applications,
  isLoading,
  isRu,
  onOpenApplication,
  onRefresh,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {isRu ? 'Нет заявок' : 'No applications'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isRu ? 'По этому объекту ещё не создано заявок' : 'No applications created for this object yet'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          {isRu ? 'Все заявки объекта' : 'All applications'}
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({applications.length})
          </span>
        </h3>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg text-gray-400 hover:text-[#4A6572] dark:hover:text-[#F9AA33] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={isRu ? 'Обновить' : 'Refresh'}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {applications.map(app => {
          const mats = Array.isArray(app.materials) ? app.materials : [];
          const totalQty = mats.reduce((s, m) => s + (Number(m.quantity) || 0), 0);
          const receivedQty = mats.reduce((s, m) => s + (Number(m.received) || 0), 0);
          const percent = totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;

          return (
            <button
              key={app.id}
              onClick={() => onOpenApplication?.(app)}
              className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {app.foreman_name || '—'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatDateShort(app.created_at)} • {formatNumber(mats.length)} поз.
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 whitespace-nowrap flex-shrink-0">
                  {app.status || '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all bg-blue-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0">
                  {receivedQty}/{totalQty}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
ApplicationsTab.displayName = 'ApplicationsTab';

// ────────────────────────────────────────────────────────────
// Основной компонент
// ────────────────────────────────────────────────────────────
const ObjectHub = memo(({
  objectId,
  companyId,
  userId,
  userRole,
  language = 'ru',
  showNotification,
  onBack,              // () => void — вернуться к списку объектов
  onOpenApplication,   // (app) => void — открыть заявку
  companyUsers = [],
}) => {
  const isRu = language === 'ru';

  // ─── State ───────────────────────────────────────────────
  const [object, setObject] = useState(null);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showForm, setShowForm] = useState(false);

  const canManage = ['manager', 'director', 'supply_admin', 'super_admin'].includes(userRole);

  // ─── Загрузка объекта ────────────────────────────────────
  const loadObject = useCallback(async (silent = false) => {
    if (!objectId) return;
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data, error: err } = await getObject(objectId);
      if (err) throw new Error(err);
      setObject(data);
      setError(null);
    } catch (err) {
      console.error('[ObjectHub.loadObject] error:', err);
      setError(err.message);
      showNotification?.(`❌ ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [objectId, showNotification]);

  // ─── Загрузка заявок ─────────────────────────────────────
  const loadApplications = useCallback(async (silent = false) => {
    if (!objectId) return;
    if (!silent) setIsLoadingApps(true);

    try {
      const { data, error: err } = await supabase
        .from('applications')
        .select('id, object_name, foreman_name, foreman_phone, status, materials, created_at, updated_at, total_amount, user_id')
        .eq('object_id', objectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (err) throw err;
      setApplications(data || []);
    } catch (err) {
      console.error('[ObjectHub.loadApps] error:', err);
      setApplications([]);
    } finally {
      setIsLoadingApps(false);
    }
  }, [objectId]);

  // ─── Первичная загрузка ──────────────────────────────────
  useEffect(() => {
    if (!objectId) return;
    loadObject();
    loadApplications();
  }, [objectId, loadObject, loadApplications]);

  // ─── Обновить всё ────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadObject(true), loadApplications(true)]);
    setIsRefreshing(false);
    showNotification?.(isRu ? '🔄 Данные обновлены' : '🔄 Data refreshed', 'success');
  }, [loadObject, loadApplications, showNotification, isRu]);

  // ─── Обработка успешного сохранения объекта ──────────────
  const handleFormSuccess = useCallback((updated) => {
    if (updated) setObject(updated);
    setShowForm(false);
  }, []);

  // ─── Рендер вкладки ──────────────────────────────────────
  const renderTabContent = () => {
    if (!object) return null;

    switch (activeTab) {
      case 'overview':
        return (
          <ObjectDashboard
            object={object}
            companyUsers={companyUsers}
            language={language}
            onOpenApplication={onOpenApplication}
            onGoToTab={(tab) => setActiveTab(tab)}
          />
        );

      case 'applications':
        return (
          <ApplicationsTab
            applications={applications}
            isLoading={isLoadingApps}
            isRu={isRu}
            onOpenApplication={onOpenApplication}
            onRefresh={() => loadApplications(true)}
          />
        );

      case 'finance':
        return (
          <ComingSoonTab
            title={isRu ? 'Финансы' : 'Finance'}
            description={isRu
              ? 'Здесь будет смета объекта, план vs факт, оплаты и задолженности.'
              : 'Budget plan vs actual, payments and debts will appear here.'}
            icon={DollarSign}
            isRu={isRu}
          />
        );

      case 'documents':
        return (
          <ComingSoonTab
            title={isRu ? 'Документы' : 'Documents'}
            description={isRu
              ? 'Акты, договоры, счета и накладные по объекту.'
              : 'Acts, contracts, invoices and waybills for the object.'}
            icon={FolderOpen}
            isRu={isRu}
          />
        );

      case 'participants':
        return (
          <ComingSoonTab
            title={isRu ? 'Участники' : 'Participants'}
            description={isRu
              ? 'Клиент, прорабы, мастера и другие участники проекта.'
              : 'Client, foremen, masters and other project participants.'}
            icon={Users}
            isRu={isRu}
          />
        );

      case 'history':
        return (
          <ComingSoonTab
            title={isRu ? 'История' : 'History'}
            description={isRu
              ? 'Timeline всех событий по объекту: заявки, приёмки, выдачи, комментарии.'
              : 'Timeline of all events: applications, receipts, issues, comments.'}
            icon={History}
            isRu={isRu}
          />
        );

      default:
        return null;
    }
  };

  // ─── Загрузка ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A6572] mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isRu ? 'Загрузка объекта...' : 'Loading object...'}
          </p>
        </div>
      </div>
    );
  }

  // ─── Ошибка ──────────────────────────────────────────────
  if (error || !object) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-800 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {isRu ? 'Объект не найден' : 'Object not found'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            {error || (isRu ? 'Не удалось загрузить данные объекта' : 'Failed to load object data')}
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {isRu ? 'Вернуться к списку' : 'Back to list'}
          </button>
        </div>
      </div>
    );
  }

  const statusColor = OBJECT_STATUS_COLORS[object.status] || OBJECT_STATUS_COLORS.planning;
  const statusLabel = OBJECT_STATUS_LABELS[object.status] || object.status;
  const statusIcon = OBJECT_STATUS_ICONS[object.status] || '📋';

  // ─── Основной рендер ─────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 page-enter">
      {/* ═══ Header: название, статус, действия ═══ */}
      <header className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 mb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              onClick={onBack}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
              title={isRu ? 'Назад к списку' : 'Back to list'}
              aria-label={isRu ? 'Назад' : 'Back'}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="p-2.5 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-xl flex-shrink-0">
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {object.name}
                </h1>
                <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap flex items-center gap-1 ${statusColor}`}>
                  <span>{statusIcon}</span>
                  <span>{statusLabel}</span>
                </span>
              </div>
              {object.address && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span className="truncate">{object.address}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors disabled:opacity-50"
              title={isRu ? 'Обновить' : 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {canManage && (
              <button
                onClick={() => setShowForm(true)}
                className="px-3 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold"
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden sm:inline">{isRu ? 'Редактировать' : 'Edit'}</span>
              </button>
            )}
          </div>
        </div>

        {/* ═══ Вкладки ═══ */}
        <div className="border-t border-gray-100 dark:border-gray-700 -mb-4 sm:-mb-5 pt-3">
          <div className="flex overflow-x-auto gap-1 -mx-1 px-1 pb-1 scrollbar-thin">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const label = isRu ? tab.labelRu : tab.labelEn;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#4A6572]/10 to-[#344955]/10 text-[#344955] dark:text-[#F9AA33] border border-[#4A6572]/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                  {tab.id === 'applications' && applications.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-[#4A6572] text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                      {applications.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ═══ Контент вкладки ═══ */}
      {renderTabContent()}

      {/* ═══ Модалка редактирования ═══ */}
      <ObjectForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleFormSuccess}
        companyId={companyId}
        userId={userId}
        editingObject={object}
        language={language}
        showNotification={showNotification}
      />
    </div>
  );
});

ObjectHub.displayName = 'ObjectHub';

export default ObjectHub;