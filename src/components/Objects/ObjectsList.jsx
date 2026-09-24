// src/components/Objects/ObjectsList.jsx
// ============================================================
// Список объектов компании
// ============================================================

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  Plus, Search, X, RefreshCw, Building2,
  FolderOpen, LayoutGrid, List,
  TrendingUp, CheckCircle2, Clock
} from 'lucide-react';
import ObjectCard from './ObjectCard';
import ObjectForm from './ObjectForm';
import {
  listObjects,
  getObjectsStats,
  archiveObject,
} from '../../api/objects';
import {
  getAllObjectStatuses,
} from '../../utils/objectStatuses';

const DEBOUNCE_MS = 300;

// ────────────────────────────────────────────────────────────
// Мини-карточка статистики
// ────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
const StatTile = memo(({ icon: Icon, label, value, accent = 'gray' }) => {
  const accents = {
    gray:    'bg-gray-50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300',
    blue:    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300',
    green:   'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300',
    amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300',
  };
  return (
    <div className={`rounded-xl p-3 flex items-center gap-2 ${accents[accent]}`}>
      <Icon className="w-4 h-4 flex-shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide opacity-80 truncate">{label}</div>
        <div className="text-lg font-bold leading-tight">{value}</div>
      </div>
    </div>
  );
});
StatTile.displayName = 'StatTile';

// ────────────────────────────────────────────────────────────
// Скелетон карточки
// ────────────────────────────────────────────────────────────
const CardSkeleton = memo(() => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
    <div className="flex gap-3 mb-3">
      <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    </div>
    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-3" />
    <div className="grid grid-cols-3 gap-2">
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
    </div>
  </div>
));
CardSkeleton.displayName = 'CardSkeleton';

// ────────────────────────────────────────────────────────────
// Основной компонент
// ────────────────────────────────────────────────────────────
const ObjectsList = memo(({
  companyId,
  userId,
  userRole,
  language = 'ru',
  showNotification,
  onOpenObject,       // (object) => void — открыть "папку" объекта
  initialFilter = null,
}) => {
  const isRu = language === 'ru';
  const canManage = ['manager', 'director', 'supply_admin', 'super_admin'].includes(userRole);

  // ─── State ───────────────────────────────────────────────
  const [objects, setObjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter || 'all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const [showForm, setShowForm] = useState(false);
  const [editingObject, setEditingObject] = useState(null);

  // ─── Debounce поиска ─────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ─── Загрузка объектов ───────────────────────────────────
  const loadObjects = useCallback(async (silent = false) => {
    if (!companyId) return;

    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const options = {
        limit: 200,
      };
      if (statusFilter === 'all') {
        options.onlyActive = false;
      } else {
        options.status = statusFilter;
      }
      if (debouncedSearch.trim()) {
        options.search = debouncedSearch.trim();
      }

      const [listResult, statsResult] = await Promise.all([
        listObjects(companyId, options),
        getObjectsStats(companyId),
      ]);

      if (listResult.error) {
        showNotification?.(`❌ ${listResult.error}`, 'error');
        setObjects([]);
      } else {
        setObjects(listResult.data || []);
      }

      if (!statsResult.error) {
        setStats(statsResult.data);
      }
    } catch (err) {
      console.error('[ObjectsList.load] error:', err);
      showNotification?.(`❌ ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [companyId, statusFilter, debouncedSearch, showNotification]);

  useEffect(() => {
    loadObjects();
  }, [loadObjects]);

  // ─── Действия ────────────────────────────────────────────
  const handleCreateClick = useCallback(() => {
    setEditingObject(null);
    setShowForm(true);
  }, []);

  const handleEditClick = useCallback((obj) => {
    setEditingObject(obj);
    setShowForm(true);
  }, []);

  const handleArchive = useCallback(async (obj) => {
    if (!window.confirm(
      isRu
        ? `Убрать объект "${obj.name}" в архив? Заявки останутся, но объект пропадёт из активного списка.`
        : `Archive object "${obj.name}"? Applications will remain, but the object will be hidden.`
    )) return;

    const { error } = await archiveObject(obj.id);
    if (error) {
      showNotification?.(`❌ ${error}`, 'error');
      return;
    }
    showNotification?.(
      isRu ? '📦 Объект перемещён в архив' : '📦 Object archived',
      'success'
    );
    loadObjects(true);
  }, [isRu, showNotification, loadObjects]);

  const handleFormSuccess = useCallback(() => {
    loadObjects(true);
  }, [loadObjects]);

  // ─── Фильтр по статусу для селекта ───────────────────────
  const statusOptions = useMemo(() => [
    { value: 'all', label: isRu ? 'Все объекты' : 'All objects' },
    ...getAllObjectStatuses().map(o => ({
      value: o.value,
      label: `${o.icon} ${o.label}`,
    })),
  ], [isRu]);

  const hasFilters = searchTerm || statusFilter !== 'all';

  // ─── Рендер ──────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 page-enter">
      {/* ─── Header ─────────────────────────────────────── */}
      <header className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-xl shadow-lg shadow-[#4A6572]/20">
              <FolderOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {isRu ? 'Объекты' : 'Objects'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {isRu
                  ? 'Все проекты компании в одном месте'
                  : 'All company projects in one place'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadObjects(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors disabled:opacity-50"
              title={isRu ? 'Обновить' : 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {canManage && (
              <button
                onClick={handleCreateClick}
                className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2 text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                {isRu ? 'Создать объект' : 'New object'}
              </button>
            )}
          </div>
        </div>

        {/* ─── Статистика ──────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
            <StatTile
              icon={Building2}
              label={isRu ? 'Всего' : 'Total'}
              value={stats.total}
              accent="blue"
            />
            <StatTile
              icon={TrendingUp}
              label={isRu ? 'В работе' : 'Active'}
              value={stats.active}
              accent="amber"
            />
            <StatTile
              icon={CheckCircle2}
              label={isRu ? 'Завершено' : 'Done'}
              value={stats.completed}
              accent="green"
            />
            <StatTile
              icon={Clock}
              label={isRu ? 'Ср. прогресс' : 'Avg progress'}
              value={`${stats.avgProgress}%`}
              accent="gray"
            />
          </div>
        )}

        {/* ─── Фильтры ─────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRu ? 'Поиск по названию или адресу...' : 'Search by name or address...'}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                aria-label={isRu ? 'Очистить' : 'Clear'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] text-sm cursor-pointer min-w-[160px]"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-600 shadow'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              aria-label={isRu ? 'Сетка' : 'Grid'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 shadow'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              aria-label={isRu ? 'Список' : 'List'}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[#4A6572] dark:hover:text-[#F9AA33] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              {isRu ? 'Сбросить' : 'Clear'}
            </button>
          )}
        </div>
      </header>

      {/* ─── Контент ────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : objects.length === 0 ? (
        <EmptyState
          isRu={isRu}
          hasFilters={hasFilters}
          canManage={canManage}
          onCreate={handleCreateClick}
          onClearFilters={() => { setSearchTerm(''); setStatusFilter('all'); }}
        />
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {objects.map(obj => (
                <ObjectCard
                  key={obj.id}
                  object={obj}
                  onClick={onOpenObject}
                  onEdit={handleEditClick}
                  onArchive={handleArchive}
                  canManage={canManage}
                  language={language}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {objects.map(obj => (
                <ObjectCard
                  key={obj.id}
                  object={obj}
                  onClick={onOpenObject}
                  onEdit={handleEditClick}
                  onArchive={handleArchive}
                  canManage={canManage}
                  language={language}
                />
              ))}
            </div>
          )}

          <div className="mt-6 text-center text-xs text-gray-400">
            {isRu
              ? `Показано ${objects.length} ${objects.length === 1 ? 'объект' : objects.length < 5 ? 'объекта' : 'объектов'}`
              : `Showing ${objects.length} objects`}
          </div>
        </>
      )}

      {/* ─── Модалка создания/редактирования ────────────── */}
      <ObjectForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingObject(null);
        }}
        onSuccess={handleFormSuccess}
        companyId={companyId}
        userId={userId}
        editingObject={editingObject}
        language={language}
        showNotification={showNotification}
      />
    </div>
  );
});

// ────────────────────────────────────────────────────────────
// Пустой state
// ────────────────────────────────────────────────────────────
const EmptyState = memo(({ isRu, hasFilters, canManage, onCreate, onClearFilters }) => (
  <div className="text-center py-12 sm:py-20 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
      <FolderOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
      {hasFilters
        ? (isRu ? 'Ничего не найдено' : 'Nothing found')
        : (isRu ? 'Объектов пока нет' : 'No objects yet')}
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto">
      {hasFilters
        ? (isRu ? 'Попробуйте изменить фильтры или очистить поиск' : 'Try changing filters or clearing search')
        : (isRu
            ? 'Создайте первый объект, чтобы все заявки и материалы по нему собирались в одном месте'
            : 'Create your first object to group all applications and materials in one place')}
    </p>
    {hasFilters ? (
      <button
        onClick={onClearFilters}
        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors inline-flex items-center gap-2"
      >
        <X className="w-4 h-4" />
        {isRu ? 'Очистить фильтры' : 'Clear filters'}
      </button>
    ) : canManage ? (
      <button
        onClick={onCreate}
        className="px-5 py-2.5 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-lg transition-all inline-flex items-center gap-2 font-semibold text-sm"
      >
        <Plus className="w-4 h-4" />
        {isRu ? 'Создать первый объект' : 'Create first object'}
      </button>
    ) : null}
  </div>
));
EmptyState.displayName = 'EmptyState';

ObjectsList.displayName = 'ObjectsList';

export default ObjectsList;