// src/components/Suppliers/RFQ/RFQSupplierSelector.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Search, Loader2, Check, Building2, Star, CheckCircle2,
  Plus, Minus, AlertCircle,
} from 'lucide-react';

import { getSuppliers } from '../../../api/suppliers';

/**
 * Модалка выбора поставщиков для приглашения на RFQ.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.companyId
 * @param {string[]} [props.excludeSupplierIds] — уже приглашённые
 * @param {(selected: Array<{id, name}>) => void} props.onConfirm
 */
export default function RFQSupplierSelector({
  open,
  onClose,
  companyId,
  excludeSupplierIds = [],
  onConfirm,
}) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [categoryFilter, setCategoryFilter] = useState('');

  // ─── Загрузка ──────────────────────────────────────────
  useEffect(() => {
    if (!open || !companyId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSuppliers(companyId, { status: 'active' });
        if (cancelled) return;
        const excluded = new Set(excludeSupplierIds);
        setSuppliers((data || []).filter((s) => !excluded.has(s.id)));
      } catch (err) {
        console.error('[RFQSupplierSelector] load error:', err);
        if (!cancelled) setError(err.message || 'Не удалось загрузить поставщиков');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [open, companyId, excludeSupplierIds]);

  // ─── Сброс при открытии ────────────────────────────────
  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSearch('');
      setCategoryFilter('');
    }
  }, [open]);

  // ─── Фильтрация ────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = suppliers;
    if (categoryFilter) {
      list = list.filter((s) =>
        Array.isArray(s.categories) && s.categories.includes(categoryFilter)
      );
    }
    if (search.trim()) {
      const t = search.trim().toLowerCase();
      list = list.filter((s) =>
        (s.name || '').toLowerCase().includes(t) ||
        (s.inn || '').includes(t) ||
        (s.email || '').toLowerCase().includes(t)
      );
    }
    return list;
  }, [suppliers, search, categoryFilter]);

  // ─── Уникальные категории ──────────────────────────────
  const categories = useMemo(() => {
    const set = new Set();
    for (const s of suppliers) {
      if (Array.isArray(s.categories)) {
        s.categories.forEach((c) => c && set.add(c));
      }
    }
    return Array.from(set).sort();
  }, [suppliers]);

  // ─── Действия ──────────────────────────────────────────
  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleConfirm = () => {
    const picked = suppliers.filter((s) => selected.has(s.id));
    onConfirm(picked.map((s) => ({ id: s.id, name: s.name })));
  };

  if (!open) return null;

  // ─── Рендер ────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] fade-enter flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-[#4A6572] text-white">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Выбор поставщиков</h2>
            {selected.size > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs font-medium">
                {selected.size}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Название, ИНН, email…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
              />
            </div>
            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
              >
                <option value="">Все категории</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={selectAllVisible}
              disabled={filtered.length === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
            >
              Выбрать все ({filtered.length})
            </button>
            {selected.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Очистить
              </button>
            )}
            <span className="ml-auto text-gray-500 dark:text-gray-400">
              Выбрано: <span className="font-medium text-gray-700 dark:text-gray-200">{selected.size}</span>
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                {suppliers.length === 0
                  ? 'Нет активных поставщиков'
                  : 'Ничего не найдено по фильтрам'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map((s) => {
                const isSelected = selected.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left transition
                      ${isSelected
                        ? 'bg-[#4A6572]/10 border-[#4A6572]'
                        : 'bg-white dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 hover:border-[#4A6572]/50'
                      }`}
                  >
                    <div
                      className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
                        ${isSelected
                          ? 'bg-[#4A6572] text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-[#4A6572] dark:text-gray-400'
                        }`}
                    >
                      {isSelected ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Building2 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {s.name}
                        </span>
                        {s.is_verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        {s.inn && <span>ИНН {s.inn}</span>}
                        {s.rating > 0 && (
                          <span className="flex items-center gap-0.5 text-[#F9AA33]">
                            <Star className="w-3 h-3 fill-current" />
                            {Number(s.rating).toFixed(1)}
                          </span>
                        )}
                      </div>
                      {Array.isArray(s.categories) && s.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.categories.slice(0, 3).map((c, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium disabled:opacity-50 transition"
          >
            <Plus className="w-4 h-4" />
            Добавить{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
