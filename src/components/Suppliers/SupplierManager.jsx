// src/components/Suppliers/SupplierManager.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Search, Filter, Loader2, Building2, AlertCircle, RefreshCw, X,
  UserPlus,
} from 'lucide-react';

import SupplierCard from './SupplierCard';
import SupplierForm from './SupplierForm';
import SupplierInviteModal from './SupplierInviteModal';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  archiveSupplier,
  deleteSupplier,
  logSupplierInteraction,
} from '../../api/suppliers';

import { isProcurement } from '../../utils/permissions';

const STATUS_FILTERS = [
  { value: '', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'pending', label: 'Ожидают' },
  { value: 'blocked', label: 'Заблокированные' },
  { value: 'archived', label: 'Архив' },
];

/**
 * Менеджер поставщиков: список + фильтры + CRUD через модалку.
 *
 * @param {object} props
 * @param {string} props.companyId
 * @param {string} props.userId
 * @param {string} [props.role]
 * @param {(msg: string, type?: 'success'|'error'|'info') => void} props.showNotification
 * @param {(supplier) => void} [props.onSelectSupplier]
 */
export default function SupplierManager({
  companyId,
  userId,
  role,
  showNotification,
  onSelectSupplier,
}) {
  const canEdit = isProcurement(role);

  const notify = useCallback(
    (msg, type = 'info') => {
      if (typeof showNotification === 'function') showNotification(msg, type);
      else console.log(`[${type}] ${msg}`);
    },
    [showNotification]
  );

  // ─── Состояние ─────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [saving, setSaving] = useState(false);

  // 🆕 Состояние для модалки приглашения
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSupplierId, setInviteSupplierId] = useState(null);

  // ─── Дебаунс поиска ────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─── Загрузка ──────────────────────────────────────────
  const loadSuppliers = useCallback(
    async ({ silent = false } = {}) => {
      if (!companyId) {
        setError('companyId не передан');
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const filters = {};
        if (statusFilter) filters.status = statusFilter;
        if (searchTerm) filters.search = searchTerm;

        const data = await getSuppliers(companyId, filters);
        setSuppliers(data || []);
      } catch (err) {
        console.error('[SupplierManager] load error:', err);
        setError(err.message || 'Не удалось загрузить поставщиков');
        setSuppliers([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, statusFilter, searchTerm]
  );

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // ─── Обработчики CRUD ──────────────────────────────────
  const handleOpenCreate = () => {
    if (!canEdit) {
      notify('Недостаточно прав для добавления поставщика', 'error');
      return;
    }
    setEditingSupplier(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (supplier) => {
    if (!canEdit) {
      notify('Недостаточно прав для редактирования', 'error');
      return;
    }
    setEditingSupplier(supplier);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingSupplier(null);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editingSupplier?.id) {
        await updateSupplier(editingSupplier.id, payload);
        notify('Поставщик обновлён', 'success');
      } else {
        const created = await createSupplier({ ...payload, company_id: companyId });

        if (created?.id) {
          try {
            await logSupplierInteraction({
              supplierId: created.id,
              companyId,
              userId,
              type: 'created',
              description: `Поставщик «${created.name}» добавлен в базу`,
              metadata: { source: 'SupplierManager' },
            });
          } catch (logErr) {
            console.warn('[SupplierManager] log interaction failed:', logErr);
          }
        }

        notify('Поставщик создан', 'success');
      }
      setFormOpen(false);
      setEditingSupplier(null);
      await loadSuppliers({ silent: true });
    } catch (err) {
      console.error('[SupplierManager] submit error:', err);
      notify(err.message || 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (supplier) => {
    if (!canEdit) return notify('Недостаточно прав', 'error');
    if (!window.confirm(`Переместить «${supplier.name}» в архив?`)) return;
    try {
      await archiveSupplier(supplier.id);
      notify('Поставщик перемещён в архив', 'success');
      await loadSuppliers({ silent: true });
    } catch (err) {
      console.error('[SupplierManager] archive error:', err);
      notify(err.message || 'Не удалось архивировать', 'error');
    }
  };

  const handleDelete = async (supplier) => {
    if (!canEdit) return notify('Недостаточно прав', 'error');
    const confirmed = window.confirm(
      `Удалить «${supplier.name}» безвозвратно?\n\n` +
        'Все прайсы, приглашения в RFQ и предложения будут удалены (CASCADE).'
    );
    if (!confirmed) return;
    try {
      await deleteSupplier(supplier.id);
      notify('Поставщик удалён', 'success');
      await loadSuppliers({ silent: true });
    } catch (err) {
      console.error('[SupplierManager] delete error:', err);
      notify(err.message || 'Не удалось удалить', 'error');
    }
  };

  // 🆕 Открытие модалки приглашения
  const handleOpenInvite = (supplier = null) => {
    if (!canEdit) return notify('Недостаточно прав', 'error');
    setInviteSupplierId(supplier?.id || null);
    setInviteOpen(true);
  };

  const handleCloseInvite = () => {
    setInviteOpen(false);
    setInviteSupplierId(null);
    // Обновим историю (на случай, если логирование добавило запись)
    loadSuppliers({ silent: true });
  };

  // ─── Счётчики по фильтрам ──────────────────────────────
  const counts = useMemo(() => {
    const c = { all: suppliers.length };
    for (const s of suppliers) {
      c[s.status] = (c[s.status] || 0) + 1;
    }
    return c;
  }, [suppliers]);

  // ─── Рендер ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#4A6572]" />
              Поставщики
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Управление базой B2B-поставщиков, прайсами и заказами
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadSuppliers({ silent: true })}
              disabled={refreshing}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
              title="Обновить"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* 🆕 Кнопка приглашения */}
            {canEdit && (
              <button
                onClick={() => handleOpenInvite(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#4A6572] text-[#4A6572] hover:bg-[#4A6572]/10 text-sm font-medium transition"
              >
                <UserPlus className="w-4 h-4" />
                Пригласить поставщика
              </button>
            )}

            {canEdit && (
              <button
                onClick={handleOpenCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" />
                Добавить поставщика
              </button>
            )}
          </div>
        </div>

        {/* Фильтры */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.value;
                const count = f.value ? counts[f.value] || 0 : counts.all || 0;
                return (
                  <button
                    key={f.value}
                    onClick={() => setStatusFilter(f.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
                      ${active
                        ? 'bg-[#4A6572] text-white border-[#4A6572]'
                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-[#4A6572]/50'
                      }`}
                  >
                    {f.label}
                    <span className={`ml-1.5 ${active ? 'text-white/70' : 'text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Поиск по названию, ИНН, email, контакту…"
                className="w-full pl-10 pr-9 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  aria-label="Очистить"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Контент */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
            <button
              onClick={() => loadSuppliers()}
              className="mt-3 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
            >
              Повторить
            </button>
          </div>
        ) : suppliers.length === 0 ? (
          <EmptyState
            hasFilters={Boolean(statusFilter || searchTerm)}
            onCreate={handleOpenCreate}
            canCreate={canEdit}
            onReset={() => {
              setStatusFilter('');
              setSearchInput('');
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {suppliers.map((s) => (
              <SupplierCard
                key={s.id}
                supplier={s}
                onSelect={onSelectSupplier}
                onInvite={canEdit ? (sup) => handleOpenInvite(sup) : undefined}
                onEdit={canEdit ? handleOpenEdit : undefined}
                onArchive={canEdit ? handleArchive : undefined}
                onDelete={canEdit ? handleDelete : undefined}
              />
            ))}
          </div>
        )}

        {/* Модалка формы */}
        <SupplierForm
          open={formOpen}
          supplier={editingSupplier}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          saving={saving}
        />

        {/* 🆕 Модалка приглашения */}
        <SupplierInviteModal
          open={inviteOpen}
          onClose={handleCloseInvite}
          companyId={companyId}
          userId={userId}
          preselectedSupplierId={inviteSupplierId}
          showNotification={notify}
        />
      </div>
    </div>
  );
}

// ─── Пустое состояние ────────────────────────────────────
function EmptyState({ hasFilters, onCreate, canCreate, onReset }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center mx-auto mb-4">
        <Building2 className="w-8 h-8 text-[#4A6572]" />
      </div>
      {hasFilters ? (
        <>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Ничего не найдено
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Попробуйте изменить фильтры или поисковый запрос
          </p>
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition"
          >
            Сбросить фильтры
          </button>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Пока нет поставщиков
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {canCreate
              ? 'Добавьте первого поставщика, чтобы начать работу с прайсами и RFQ'
              : 'Поставщики ещё не добавлены'}
          </p>
          {canCreate && (
            <button
              onClick={onCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              Добавить первого поставщика
            </button>
          )}
        </>
      )}
    </div>
  );
}