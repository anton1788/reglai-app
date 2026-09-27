// src/components/Suppliers/PriceList/PriceListManager.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Upload, Search, RefreshCw, Loader2, AlertCircle, X,
  Filter, Layers, ArrowLeft, Package2, Boxes, ArrowUpDown,
  Pencil, Trash2, MoreVertical, Building2,
} from 'lucide-react';

import PriceListTable from './PriceListTable';
import PriceItemForm from './PriceItemForm';
import PriceListUpload from './PriceListUpload';
import PriceSearch from './PriceSearch';

import {
  getSupplierById,
  getPriceListItems,
  createPriceListItem,
  updatePriceListItem,
  deletePriceListItem,
  logSupplierInteraction,
} from '../../../api/suppliers';

import { isProcurement } from '../../../utils/permissions';

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Название ↑' },
  { value: 'name_desc', label: 'Название ↓' },
  { value: 'price_asc', label: 'Цена ↑' },
  { value: 'price_desc', label: 'Цена ↓' },
  { value: 'category_asc', label: 'Категория' },
  { value: 'updated_desc', label: 'Обновлённые' },
];

/**
 * Менеджер прайс-листов поставщика.
 *
 * @param {object} props
 * @param {string} props.supplierId
 * @param {string} props.companyId
 * @param {string} [props.role]
 * @param {(msg: string, type?: 'success'|'error'|'info'|'warning') => void} props.showNotification
 * @param {() => void} [props.onBack]
 */
export default function PriceListManager({
  supplierId,
  companyId,
  role,
  showNotification,
  onBack,
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
  const [supplier, setSupplier] = useState(null);
  const [loadingSupplier, setLoadingSupplier] = useState(true);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name_asc');
  const [searchTerm, setSearchTerm] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [uploadOpen, setUploadOpen] = useState(false);

  // ─── Загрузка поставщика ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!supplierId) {
        setSupplier(null);
        setLoadingSupplier(false);
        return;
      }
      setLoadingSupplier(true);
      try {
        const data = await getSupplierById(supplierId);
        if (!cancelled) setSupplier(data || null);
      } catch (err) {
        console.error('[PriceListManager] supplier load error:', err);
        if (!cancelled) setSupplier(null);
      } finally {
        if (!cancelled) setLoadingSupplier(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [supplierId]);

  // ─── Загрузка позиций ──────────────────────────────────
  const loadItems = useCallback(
    async ({ silent = false } = {}) => {
      if (!supplierId) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const filters = {};
        if (categoryFilter) filters.category = categoryFilter;
        if (availableOnly) filters.availableOnly = true;
        if (searchTerm) filters.search = searchTerm;

        const data = await getPriceListItems(supplierId, filters);
        setItems(data || []);
      } catch (err) {
        console.error('[PriceListManager] items load error:', err);
        setError(err.message || 'Не удалось загрузить позиции');
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supplierId, categoryFilter, availableOnly, searchTerm]
  );

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // ─── Клиентская сортировка ─────────────────────────────
  const sortedItems = useMemo(() => {
    const arr = [...items];
    switch (sortBy) {
      case 'name_asc':
        return arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
      case 'name_desc':
        return arr.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'ru'));
      case 'price_asc':
        return arr.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      case 'price_desc':
        return arr.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
      case 'category_asc':
        return arr.sort((a, b) => (a.category || '').localeCompare(b.category || '', 'ru'));
      case 'updated_desc':
        return arr.sort(
          (a, b) => new Date(b.last_updated || 0) - new Date(a.last_updated || 0)
        );
      default:
        return arr;
    }
  }, [items, sortBy]);

  // ─── Уникальные категории ──────────────────────────────
  const categories = useMemo(() => {
    const s = new Set();
    for (const it of items) if (it.category) s.add(it.category);
    return Array.from(s).sort();
  }, [items]);

  // ─── CRUD обработчики ──────────────────────────────────
  const handleOpenCreate = () => {
    if (!canEdit) return notify('Недостаточно прав', 'error');
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    if (!canEdit) return notify('Недостаточно прав', 'error');
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editingItem?.id) {
        await updatePriceListItem(editingItem.id, payload);
        notify('Позиция обновлена', 'success');
      } else {
        await createPriceListItem({ ...payload, supplier_id: supplierId });
        notify('Позиция добавлена', 'success');
      }
      setFormOpen(false);
      setEditingItem(null);
      await loadItems({ silent: true });
    } catch (err) {
      console.error('[PriceListManager] submit error:', err);
      notify(err.message || 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!canEdit) return notify('Недостаточно прав', 'error');
    if (!window.confirm(`Удалить позицию «${item.name}»?`)) return;
    try {
      await deletePriceListItem(item.id);
      notify('Позиция удалена', 'success');
      await loadItems({ silent: true });
    } catch (err) {
      console.error('[PriceListManager] delete error:', err);
      notify(err.message || 'Не удалось удалить', 'error');
    }
  };

  // ─── Успешная загрузка прайса ──────────────────────────
  const handleUploadSuccess = async (result) => {
    notify(`✅ Загружено ${result.inserted} позиций`, 'success');
    setUploadOpen(false);

    // Логируем
    try {
      await logSupplierInteraction({
        supplierId,
        companyId,
        userId: null,
        type: 'price_list_uploaded',
        description: `Импортировано ${result.inserted} позиций`,
        metadata: {
          inserted: result.inserted,
          chunks: result.chunks,
        },
      });
    } catch (logErr) {
      console.warn('[PriceListManager] log upload failed:', logErr);
    }

    await loadItems({ silent: true });
  };

  const handleResetFilters = () => {
    setCategoryFilter('');
    setAvailableOnly(false);
    setSearchTerm('');
  };

  const hasFilters = Boolean(categoryFilter || availableOnly || searchTerm);

  // ─── Рендер ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div className="flex items-start gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="mt-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                aria-label="Назад"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Layers className="w-6 h-6 text-[#4A6572]" />
                Прайс-лист
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {loadingSupplier ? (
                  <span className="opacity-60">Загрузка поставщика…</span>
                ) : supplier ? (
                  <>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{supplier.name}</span>
                    {supplier.inn && <span className="text-xs">· ИНН {supplier.inn}</span>}
                  </>
                ) : (
                  <span className="text-red-500">Поставщик не найден</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadItems({ silent: true })}
              disabled={refreshing}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
              title="Обновить"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {canEdit && (
              <>
                <button
                  onClick={() => setUploadOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#4A6572] text-[#4A6572] hover:bg-[#4A6572]/10 text-sm font-medium transition"
                >
                  <Upload className="w-4 h-4" />
                  Загрузить прайс
                </button>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium transition"
                >
                  <Plus className="w-4 h-4" />
                  Позиция
                </button>
              </>
            )}
          </div>
        </div>

        {/* Фильтры */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 space-y-3">
          {/* Поиск */}
          <PriceSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Поиск по названию, артикулу, бренду…"
          />

          {/* Фильтры в ряд */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />

            {/* Категория */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
            >
              <option value="">Все категории</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* В наличии */}
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 select-none">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#F9AA33]"
              />
              <Boxes className="w-3.5 h-3.5" />
              Только в наличии
            </label>

            {/* Сортировка */}
            <div className="ml-auto flex items-center gap-1">
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-3.5 h-3.5" />
                Сбросить
              </button>
            )}
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
              onClick={() => loadItems()}
              className="mt-3 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
            >
              Повторить
            </button>
          </div>
        ) : sortedItems.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            canEdit={canEdit}
            onCreate={handleOpenCreate}
            onUpload={() => setUploadOpen(true)}
            onReset={handleResetFilters}
          />
        ) : (
          <>
            <PriceListTable
              items={sortedItems}
              canEdit={canEdit}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
              Всего: {sortedItems.length} позиц
              {sortedItems.length % 10 === 1 && sortedItems.length % 100 !== 11 ? 'ия' : 'ий'}
            </p>
          </>
        )}

        {/* Модалка позиции */}
        <PriceItemForm
          open={formOpen}
          item={editingItem}
          supplierId={supplierId}
          onClose={handleCloseForm}
          onSubmit={handleSubmit}
          saving={saving}
          showNotification={notify}
        />

        {/* Модалка загрузки */}
        <PriceListUpload
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          supplierId={supplierId}
          onSuccess={handleUploadSuccess}
          showNotification={notify}
        />
      </div>
    </div>
  );
}

// ─── Пустое состояние ────────────────────────────────────
function EmptyState({ hasFilters, canEdit, onCreate, onUpload, onReset }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center mx-auto mb-4">
        <Package2 className="w-8 h-8 text-[#4A6572]" />
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
            Прайс-лист пуст
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            {canEdit
              ? 'Загрузите Excel/CSV с прайсом или добавьте позиции вручную'
              : 'Позиции ещё не добавлены'}
          </p>
          {canEdit && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={onUpload}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium transition"
              >
                <Upload className="w-4 h-4" />
                Загрузить прайс
              </button>
              <button
                onClick={onCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" />
                Добавить позицию
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
