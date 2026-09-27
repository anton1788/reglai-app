// src/components/Suppliers/SupplierCatalog.jsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, Package, Loader2, AlertCircle, X, Filter, ShoppingCart,
  BadgeCheck, Building2, ArrowUpDown, Layers, Tag, Boxes,
  Plus, Check, TrendingDown,
} from 'lucide-react';

import { searchMaterialsAcrossSuppliers } from '../../api/suppliers';

// ────────────────────────────────────────────────────────────
// 🎨 УТИЛИТЫ
// ────────────────────────────────────────────────────────────

const formatPrice = (value) => {
  const n = Number(value) || 0;
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatQuantity = (value) => {
  const n = Number(value) || 0;
  if (Number.isInteger(n)) return n.toLocaleString('ru-RU');
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
};

const SORT_OPTIONS = [
  { value: 'relevance', label: 'По релевантности' },
  { value: 'price_asc', label: 'Цена: по возрастанию' },
  { value: 'price_desc', label: 'Цена: по убыванию' },
  { value: 'rating_desc', label: 'Рейтинг поставщика' },
  { value: 'stock_desc', label: 'Остаток' },
];

// ────────────────────────────────────────────────────────────
// 🧩 КОМПОНЕНТ
// ────────────────────────────────────────────────────────────

export default function SupplierCatalog({
  companyId,
  showNotification,
  onAddToRFQ,
  onRemoveFromRFQ,
  onClearRFQ,
  onOpenRFQCreate,
  rfqCart: externalRfqCart = [],
  initialSearchTerm = '',
  initialCategory = '',
}) {
  const notify = useCallback(
    (msg, type = 'info') => {
      if (typeof showNotification === 'function') showNotification(msg, type);
      else console.log(`[${type}] ${msg}`);
    },
    [showNotification]
  );

  // ─── Состояние ─────────────────────────────────────────
  const [query, setQuery] = useState(initialSearchTerm);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearchTerm.trim());
  const [category, setCategory] = useState(initialCategory);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [groupBySupplier, setGroupBySupplier] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  // RFQ-корзина — единый источник правды из App.jsx
  const [localCartFallback, setLocalCartFallback] = useState([]);
  const rfqCart = Array.isArray(externalRfqCart) && externalRfqCart.length >= 0
    ? externalRfqCart
    : localCartFallback;

  const updateCart = useCallback(
    (updater) => {
      if (Array.isArray(externalRfqCart)) {
        const next = typeof updater === 'function' ? updater(externalRfqCart) : updater;
        const added = next.find((n) => !externalRfqCart.some((e) => e.id === n.id));
        const removed = externalRfqCart.find((e) => !next.some((n) => n.id === e.id));

        if (added) onAddToRFQ?.(added);
        if (removed) onRemoveFromRFQ?.(removed.id);
        if (next.length === 0 && externalRfqCart.length > 0) onClearRFQ?.();
      } else {
        setLocalCartFallback(updater);
      }
    },
    [externalRfqCart, onAddToRFQ, onRemoveFromRFQ, onClearRFQ]
  );

  const inputRef = useRef(null);

  // ─── Дебаунс ввода ─────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  // ─── Загрузка через RPC ────────────────────────────────
  const search = useCallback(async () => {
    if (!companyId) {
      setError('companyId не передан');
      return;
    }
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setItems([]);
      setSearched(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const data = await searchMaterialsAcrossSuppliers(companyId, debouncedQuery, {
        category: category || undefined,
        availableOnly,
        limit: 200,
      });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[SupplierCatalog] search error:', err);
      setError(err.message || 'Не удалось выполнить поиск');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, debouncedQuery, category, availableOnly]);

  useEffect(() => {
    search();
  }, [search]);

  // ─── Сортировка ────────────────────────────────────────
  const sortedItems = useMemo(() => {
    const arr = [...items];
    switch (sortBy) {
      case 'price_asc':
        return arr.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
      case 'price_desc':
        return arr.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
      case 'rating_desc':
        return arr.sort((a, b) => Number(b.supplier_rating || 0) - Number(a.supplier_rating || 0));
      case 'stock_desc':
        return arr.sort((a, b) => Number(b.stock_quantity || 0) - Number(a.stock_quantity || 0));
      case 'relevance':
      default:
        return arr;
    }
  }, [items, sortBy]);

  // ─── Группировка ───────────────────────────────────────
  const groupedByName = useMemo(() => {
    const map = new Map();
    for (const it of sortedItems) {
      const key = it.normalized_name || it.name?.toLowerCase() || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }
    return Array.from(map.entries()).map(([key, variants]) => ({
      key,
      name: variants[0]?.name || key,
      variants: variants.sort((a, b) => Number(a.price || 0) - Number(b.price || 0)),
      minPrice: Math.min(...variants.map((v) => Number(v.price) || Infinity)),
      maxPrice: Math.max(...variants.map((v) => Number(v.price) || 0)),
    }));
  }, [sortedItems]);

  // ─── Категории ─────────────────────────────────────────
  const categories = useMemo(() => {
    const s = new Set();
    for (const it of items) if (it.category) s.add(it.category);
    return Array.from(s).sort();
  }, [items]);

  // ─── RFQ-корзина ───────────────────────────────────────
  const isInRfqCart = useCallback(
    (item) => rfqCart.some((c) => c.id === item.id),
    [rfqCart]
  );

  const addToRfqCart = useCallback(
    (item) => {
      if (rfqCart.some((p) => p.id === item.id)) {
        notify(`«${item.name}» уже в корзине`, 'info');
        return;
      }

      const cartItem = {
        id: item.id,
        name: item.name,
        article: item.article,
        unit: item.unit,
        quantity: item.min_quantity || 1,
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name,
        price_hint: item.price,
      };

      updateCart((prev) => [...prev, cartItem]);
    },
    [rfqCart, updateCart, notify]
  );

  const removeFromRfqCart = useCallback(
    (id) => {
      updateCart((prev) => prev.filter((p) => p.id !== id));
    },
    [updateCart]
  );

  const clearRfqCart = useCallback(() => {
    if (typeof onClearRFQ === 'function') onClearRFQ();
    else updateCart([]);
  }, [onClearRFQ, updateCart]);

  // 🆕 Кнопка «В RFQ →» — открывает форму создания RFQ в App.jsx
  const handleOpenRFQCreate = useCallback(() => {
    // 🔍 Отладка — смотрим, что видят колбэки
    console.log('🔍 [SupplierCatalog] handleOpenRFQCreate:', {
      rfqCartLength: rfqCart.length,
      hasOnOpenRFQCreate: typeof onOpenRFQCreate === 'function',
    });

    if (rfqCart.length === 0) {
      notify('Сначала добавьте материалы в корзину', 'warning');
      return;
    }
    if (typeof onOpenRFQCreate === 'function') {
      console.log('✅ [SupplierCatalog] вызываем onOpenRFQCreate()');
      onOpenRFQCreate();
    } else {
      console.warn('❌ [SupplierCatalog] onOpenRFQCreate не передан!');
      notify('Откройте раздел RFQ для создания запроса', 'info');
    }
  }, [rfqCart.length, onOpenRFQCreate, notify]);

  // ─── Рендер ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#4A6572]" />
              Каталог материалов
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Сквозной поиск по прайс-листам всех поставщиков
            </p>
          </div>

          {rfqCart.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4A6572]/10 text-[#4A6572] text-sm font-medium">
                <ShoppingCart className="w-4 h-4" />
                {rfqCart.length} в запросе
              </span>
              <button
                onClick={clearRfqCart}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Очистить
              </button>
              <button
                onClick={handleOpenRFQCreate}
                className="px-3 py-1.5 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-xs font-medium"
              >
                В RFQ → ({rfqCart.length})
              </button>
            </div>
          )}
        </div>

        {/* Поиск + фильтры */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Название, артикул, бренд… (мин. 2 символа)"
              className="w-full pl-11 pr-10 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50 text-sm"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Очистить"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
            >
              <option value="">Все категории</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

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

            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 select-none">
              <input
                type="checkbox"
                checked={groupBySupplier}
                onChange={(e) => setGroupBySupplier(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#F9AA33]"
              />
              <Tag className="w-3.5 h-3.5" />
              Сравнить цены
            </label>

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
          </div>
        </div>

        {/* Контент */}
        {!searched && !loading ? (
          <EmptyHint />
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
            <button
              onClick={search}
              className="mt-3 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
            >
              Повторить
            </button>
          </div>
        ) : sortedItems.length === 0 ? (
          <NoResults query={debouncedQuery} />
        ) : groupBySupplier ? (
          <div className="space-y-3">
            {groupedByName.map((g) => (
              <GroupCard
                key={g.key}
                group={g}
                isInRfqCart={isInRfqCart}
                onAddToRfq={addToRfqCart}
                onRemoveFromRfq={removeFromRfqCart}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedItems.map((item) => (
              <MaterialCard
                key={item.id}
                item={item}
                inCart={isInRfqCart(item)}
                onAdd={() => addToRfqCart(item)}
                onRemove={() => removeFromRfqCart(item.id)}
              />
            ))}
          </div>
        )}

        {searched && !loading && sortedItems.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 text-center">
            Найдено {sortedItems.length} позиц
            {sortedItems.length % 10 === 1 && sortedItems.length % 100 !== 11 ? 'ия' : 'ий'}
            {groupBySupplier && ` · ${groupedByName.length} уникальных товаров`}
          </p>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ПОДКОМПОНЕНТЫ
// ────────────────────────────────────────────────────────────

function EmptyHint() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center mx-auto mb-4">
        <Package className="w-8 h-8 text-[#4A6572]" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        Начните с поиска
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        Введите название материала, артикул или бренд. Мы найдём его во всех прайс-листах
        подключённых поставщиков и покажем лучшие цены.
      </p>
    </div>
  );
}

function NoResults({ query }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
        <Search className="w-8 h-8 text-amber-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        Ничего не найдено
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        По запросу «{query}» в прайс-листах поставщиков нет совпадений.
      </p>
    </div>
  );
}

function MaterialCard({ item, inCart, onAdd, onRemove }) {
  const hasStock = item.stock_quantity === null || item.stock_quantity === undefined
    ? null
    : Number(item.stock_quantity) > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-[#F9AA33]/50 hover:shadow-lg transition-all">
      <div className="mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
          {item.name}
        </h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {item.article && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {item.article}
            </span>
          )}
          {item.brand && (
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
              {item.brand}
            </span>
          )}
          {item.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4A6572]/10 text-[#344955] dark:text-gray-300">
              {item.category}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
        <Building2 className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{item.supplier_name || 'Поставщик'}</span>
        {item.supplier_rating > 0 && (
          <span className="ml-auto flex items-center gap-0.5 text-[#F9AA33] font-medium">
            <BadgeCheck className="w-3 h-3" />
            {Number(item.supplier_rating).toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <div>
          <span className="text-xl font-bold text-[#344955] dark:text-[#F9AA33]">
            {formatPrice(item.price)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            ₽ / {item.unit || 'шт'}
          </span>
        </div>
        {hasStock !== null && (
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              hasStock
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-red-500/10 text-red-500'
            }`}
          >
            {hasStock
              ? `${formatQuantity(item.stock_quantity)} ${item.unit || 'шт'}`
              : 'Нет'}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          {item.min_quantity > 1
            ? `от ${formatQuantity(item.min_quantity)} ${item.unit || 'шт'}`
            : 'Любое количество'}
        </span>
        {inCart ? (
          <button
            onClick={onRemove}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition"
          >
            <Check className="w-3.5 h-3.5" />
            В запросе
          </button>
        ) : (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#4A6572] text-[#4A6572] hover:bg-[#4A6572] hover:text-white text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            В RFQ
          </button>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group, isInRfqCart, onAddToRfq, onRemoveFromRfq }) {
  const { name, variants, minPrice, maxPrice } = group;
  const spread = maxPrice > 0 && minPrice < maxPrice
    ? Math.round(((maxPrice - minPrice) / maxPrice) * 100)
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
            {name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
            <span>Найдено {variants.length} предложен{getDeclension(variants.length, 'ие', 'ия', 'ий')}</span>
            {spread > 0 && (
              <>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <TrendingDown className="w-3 h-3" />
                  Экономия до {spread}%
                </span>
              </>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase text-gray-400">от</div>
          <div className="text-lg font-bold text-[#344955] dark:text-[#F9AA33]">
            {formatPrice(minPrice)} ₽
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {variants.map((v, i) => {
          const isBest = i === 0;
          const inCart = isInRfqCart(v);
          const diff = v.price > minPrice
            ? Math.round(((v.price - minPrice) / minPrice) * 100)
            : 0;
          return (
            <div
              key={v.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition"
            >
              {isBest && (
                <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                  ЛУЧШАЯ
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">{v.supplier_name || 'Поставщик'}</span>
                  {v.supplier_rating > 0 && (
                    <span className="text-[#F9AA33] shrink-0">★ {Number(v.supplier_rating).toFixed(1)}</span>
                  )}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {v.article && <span className="font-mono">{v.article} · </span>}
                  {v.stock_quantity !== null && v.stock_quantity !== undefined ? (
                    Number(v.stock_quantity) > 0 ? (
                      <span>в наличии {formatQuantity(v.stock_quantity)} {v.unit || 'шт'}</span>
                    ) : (
                      <span className="text-red-400">нет в наличии</span>
                    )
                  ) : (
                    <span>остаток не указан</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-sm font-semibold ${isBest ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                  {formatPrice(v.price)} ₽
                </div>
                <div className="text-[10px] text-gray-400">
                  {v.unit || 'шт'}
                  {diff > 0 && (
                    <span className="ml-1.5 text-red-500">+{diff}%</span>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {inCart ? (
                  <button
                    onClick={() => onRemoveFromRfq(v.id)}
                    className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition"
                    title="Убрать из RFQ"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => onAddToRfq(v)}
                    className="p-1.5 rounded-lg border border-[#4A6572] text-[#4A6572] hover:bg-[#4A6572] hover:text-white transition"
                    title="Добавить в RFQ"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getDeclension(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}