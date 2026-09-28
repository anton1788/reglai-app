// src/components/MaterialPriceCatalog/MaterialPriceCatalog.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Plus, Edit3, Trash2, Loader2, X, Save,
  BookOpen, Phone, Building, RefreshCw, AlertCircle, CheckCircle,
  Upload,
} from 'lucide-react';
import {
  getAllMaterialPrices,
  upsertMaterialPrice,
  deleteMaterialPrice,
} from '../../utils/priceManager';
import { canEditPrices as canEditPricesUtil } from '../../utils/priceManager';
import ImportPriceListModal from './ImportPriceListModal';

const UNIT_OPTIONS = ['шт', 'м', 'м²', 'м³', 'кг', 'т', 'л', 'упак', 'комплект', 'партия'];

const emptyForm = {
  id: null,
  description: '',
  unit: 'шт',
  price: '',
  supplier_name: '',
  supplier_phone: '',
  is_active: true,
};

const MaterialPriceCatalog = ({
  companyId,
  user,
  userRole,
  showNotification,
}) => {
  const canEdit = canEditPricesUtil(userRole);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);

  // Debounce поиска
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadItems = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const { data } = await getAllMaterialPrices(companyId, {
        search: debouncedSearch,
        onlyActive: true,
        limit: 500,
      });
      setItems(data);
    } catch (err) {
      console.error('Ошибка загрузки справочника:', err);
      showNotification('❌ Ошибка загрузки справочника', 'error');
    } finally {
      setLoading(false);
    }
  }, [companyId, debouncedSearch, showNotification]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const stats = useMemo(() => {
    const withPrice = items.filter((i) => Number(i.price) > 0).length;
    const withSupplier = items.filter((i) => i.supplier_name).length;
    return { total: items.length, withPrice, withSupplier };
  }, [items]);

  // ─── Открытие модалки ─────────────────────────────
  const openCreate = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setForm({
      id: item.id,
      description: item.description || '',
      unit: item.unit || 'шт',
      price: item.price ?? '',
      supplier_name: item.supplier_name || '',
      supplier_phone: item.supplier_phone || '',
      is_active: item.is_active !== false,
    });
    setShowModal(true);
  };

  // ─── Сохранение ──────────────────────────────────
  const handleSave = async () => {
    if (!form.description.trim()) {
      showNotification('⚠️ Укажите название материала', 'warning');
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      showNotification('⚠️ Укажите цену больше 0', 'warning');
      return;
    }

    setSaving(true);
    const result = await upsertMaterialPrice(
      companyId,
      form,
      user?.id,
      user?.email
    );

    if (result.success) {
      showNotification('✅ Запись сохранена в справочник', 'success');
      setShowModal(false);
      setForm(emptyForm);
      loadItems();
    } else {
      showNotification(`❌ Ошибка: ${result.error}`, 'error');
    }
    setSaving(false);
  };

  // ─── Удаление ────────────────────────────────────
  const handleDelete = async (id) => {
    const result = await deleteMaterialPrice(id);
    if (result.success) {
      showNotification('🗑️ Запись удалена из справочника', 'success');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      showNotification('❌ Ошибка удаления', 'error');
    }
    setDeleteConfirmId(null);
  };

  // ─── Импорт прайса ───────────────────────────────
  const handleImport = async (rowsToImport) => {
    setImporting(true);
    let success = 0;
    let failed = 0;

    for (const row of rowsToImport) {
      const result = await upsertMaterialPrice(
        companyId,
        row,
        user?.id,
        user?.email
      );
      if (result.success) success++;
      else failed++;
    }

    setImporting(false);
    setShowImport(false);

    if (failed === 0) {
      showNotification(`✅ Импортировано ${success} записей`, 'success');
    } else {
      showNotification(
        `⚠️ Импортировано ${success}, ошибок ${failed}`,
        'warning'
      );
    }

    loadItems();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#4A6572]" />
            Справочник цен
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Единый каталог материалов, цен и поставщиков компании
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={loadItems}
            disabled={loading}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => setShowImport(true)}
                disabled={importing}
                className="px-4 py-2 bg-white dark:bg-gray-800 text-[#4A6572] dark:text-[#F9AA33] border border-[#4A6572]/30 text-sm font-medium rounded-lg hover:bg-[#4A6572]/5 transition flex items-center gap-2 disabled:opacity-50"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Импорт прайса
              </button>
              <button
                onClick={openCreate}
                className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white text-sm font-medium rounded-lg hover:shadow-lg transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить материал
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Всего записей"
          value={stats.total}
          color="blue"
          icon={<BookOpen className="w-5 h-5" />}
        />
        <StatCard
          label="С ценой"
          value={stats.withPrice}
          color="green"
          icon={<CheckCircle className="w-5 h-5" />}
        />
        <StatCard
          label="С поставщиком"
          value={stats.withSupplier}
          color="purple"
          icon={<Building className="w-5 h-5" />}
        />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию материала..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-transparent"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-[#4A6572] mx-auto" />
          <p className="mt-3 text-gray-500">Загрузка справочника...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {search ? 'Ничего не найдено' : 'Справочник пуст'}
          </p>
          {canEdit && !search && (
            <button
              onClick={openCreate}
              className="mt-4 text-[#4A6572] dark:text-[#F9AA33] hover:underline text-sm font-medium"
            >
              + Добавить первую запись
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/30 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Материал</th>
                  <th className="px-4 py-3 text-left">Ед.</th>
                  <th className="px-4 py-3 text-right">Цена ₽</th>
                  <th className="px-4 py-3 text-left">Поставщик</th>
                  <th className="px-4 py-3 text-left">Обновлено</th>
                  {canEdit && <th className="px-4 py-3 text-right">Действия</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.unit}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#4A6572] dark:text-[#F9AA33]">
                      {Number(item.price).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {item.supplier_name ? (
                        <div>
                          <div className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {item.supplier_name}
                          </div>
                          {item.supplier_phone && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Phone className="w-3 h-3" />
                              {item.supplier_phone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {item.updated_at
                        ? new Date(item.updated_at).toLocaleDateString('ru-RU')
                        : '—'}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-2 text-[#4A6572] hover:bg-[#4A6572]/10 rounded-lg transition"
                            title="Редактировать"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.unit} • {Number(item.price).toLocaleString('ru-RU')} ₽
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-2 text-[#4A6572]"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-2 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                {item.supplier_name && (
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {item.supplier_name}
                    {item.supplier_phone && ` • ${item.supplier_phone}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: create / edit */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter"
          onClick={(e) => e.target === e.currentTarget && !saving && setShowModal(false)}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#4A6572]" />
                {form.id ? 'Редактировать запись' : 'Новая запись в справочнике'}
              </h3>
              <button
                onClick={() => !saving && setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <Field label="Название материала *">
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input"
                  placeholder="Например: Воздуховод 250x100"
                  autoFocus
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Ед. изм. *">
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="input"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Цена, ₽ *">
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="input"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </Field>
              </div>

              <Field label="Поставщик">
                <input
                  type="text"
                  value={form.supplier_name}
                  onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                  className="input"
                  placeholder="ООО Вент-Сервис"
                />
              </Field>

              <Field label="Телефон поставщика">
                <input
                  type="tel"
                  value={form.supplier_phone}
                  onChange={(e) => setForm({ ...form, supplier_phone: e.target.value })}
                  className="input"
                  placeholder="+7 (___) ___-__-__"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => !saving && setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white text-sm font-medium rounded-lg hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Сохранить
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: delete confirm */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Удалить запись?
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Запись будет скрыта из справочника. Существующие заявки не изменятся.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm text-gray-600"
              >
                Отмена
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📥 Modal: import price list */}
      <ImportPriceListModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImport={handleImport}
      />

      {/* Inline CSS for inputs (если у вас нет Tailwind-класса .input) */}
      <style>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border: 1px solid rgb(209 213 219);
          border-radius: 0.5rem;
          background: white;
          color: rgb(17 24 39);
          outline: none;
        }
        .dark .input {
          background: rgb(55 65 81);
          border-color: rgb(75 85 99);
          color: white;
        }
        .input:focus {
          border-color: #4A6572;
          box-shadow: 0 0 0 2px rgba(74, 101, 114, 0.2);
        }
      `}</style>
    </div>
  );
};

// ─── Small helpers ────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </label>
    {children}
  </div>
);

const StatCard = ({ label, value, color, icon }) => {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
        </div>
      </div>
    </div>
  );
};

export default MaterialPriceCatalog;