// src/components/Suppliers/Orders/PurchaseOrderList.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Search, Filter, Loader2, AlertCircle, RefreshCw, X,
  Package, Clock, Truck, CheckCircle2, Ban, Banknote, Calendar,
  Building2, TrendingUp, FileText, ChevronRight,
} from 'lucide-react';

import { getPurchaseOrders } from '../../../api/suppliers';
import { isProcurement } from '../../../utils/permissions';

// ─── Статусы заказа ─────────────────────────────────────
const STATUS_META = {
  created:   { label: 'Создан',    color: 'bg-gray-500/15 text-gray-400 border-gray-500/30',       icon: FileText },
  confirmed: { label: 'Подтверждён', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',      icon: CheckCircle2 },
  paid:      { label: 'Оплачен',   color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', icon: Banknote },
  shipped:   { label: 'Отправлен', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: Truck },
  delivered: { label: 'Доставлен', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',    icon: Truck },
  received:  { label: 'Получен',   color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  canceled:  { label: 'Отменён',   color: 'bg-red-500/15 text-red-400 border-red-500/30',          icon: Ban },
};

const PAYMENT_META = {
  unpaid:  { label: 'Не оплачен',    color: 'bg-gray-500/15 text-gray-400' },
  partial: { label: 'Частично',      color: 'bg-amber-500/15 text-amber-400' },
  paid:    { label: 'Оплачен',       color: 'bg-emerald-500/15 text-emerald-400' },
};

const STATUS_FILTERS = [
  { value: '',           label: 'Все' },
  { value: 'created',    label: 'Создан' },
  { value: 'confirmed',  label: 'Подтверждён' },
  { value: 'paid',       label: 'Оплачен' },
  { value: 'shipped',    label: 'Отправлен' },
  { value: 'delivered',  label: 'Доставлен' },
  { value: 'received',   label: 'Получен' },
  { value: 'canceled',   label: 'Отменён' },
];

const formatMoney = (value) => {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} млн ₽`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} тыс ₽`;
  return `${n.toLocaleString('ru-RU')} ₽`;
};

/**
 * Список заказов поставщикам.
 *
 * @param {object} props
 * @param {string} props.companyId
 * @param {string} [props.role]
 * @param {() => void} [props.onCreate]
 * @param {(po) => void} [props.onOpen]
 */
export default function PurchaseOrderList({
  companyId,
  role,
  onCreate,
  onOpen,
}) {
  const canCreate = isProcurement(role) || role === 'supply_admin';

  // ─── Состояние ─────────────────────────────────────────
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ─── Дебаунс поиска ────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─── Загрузка ──────────────────────────────────────────
  const loadOrders = useCallback(
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

        const data = await getPurchaseOrders(companyId, filters);
        setOrders(data || []);
      } catch (err) {
        console.error('[PurchaseOrderList] load error:', err);
        setError(err.message || 'Не удалось загрузить заказы');
        setOrders([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, statusFilter, searchTerm]
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // ─── Счётчики ──────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { all: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  // ─── Суммы ─────────────────────────────────────────────
  const totals = useMemo(() => {
    let sum = 0;
    let unpaid = 0;
    for (const o of orders) {
      const t = Number(o.total) || 0;
      sum += t;
      if (o.payment_status !== 'paid' && o.status !== 'canceled') unpaid += t;
    }
    return { sum, unpaid };
  }, [orders]);

  // ─── Рендер ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-[#4A6572]" />
              Заказы поставщикам
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Управление закупками: статусы, оплата, доставка
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadOrders({ silent: true })}
              disabled={refreshing}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
              title="Обновить"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {canCreate && onCreate && (
              <button
                onClick={onCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" />
                Новый заказ
              </button>
            )}
          </div>
        </div>

        {/* Сводка */}
        {orders.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <SummaryBox
              icon={Package}
              label="Всего заказов"
              value={orders.length}
              color="text-blue-500"
            />
            <SummaryBox
              icon={TrendingUp}
              label="Сумма"
              value={formatMoney(totals.sum)}
              color="text-emerald-500"
            />
            <SummaryBox
              icon={Banknote}
              label="К оплате"
              value={formatMoney(totals.unpaid)}
              color={totals.unpaid > 0 ? 'text-amber-500' : 'text-gray-400'}
            />
          </div>
        )}

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
                placeholder="Номер заказа или трекинг…"
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
              onClick={() => loadOrders()}
              className="mt-3 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
            >
              Повторить
            </button>
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            hasFilters={Boolean(statusFilter || searchTerm)}
            canCreate={canCreate}
            onCreate={onCreate}
            onReset={() => {
              setStatusFilter('');
              setSearchInput('');
            }}
          />
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <POCard
                key={order.id}
                order={order}
                onOpen={onOpen ? () => onOpen(order) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Карточка PO ─────────────────────────────────────────
function POCard({ order, onOpen }) {
  const meta = STATUS_META[order.status] || STATUS_META.created;
  const payMeta = PAYMENT_META[order.payment_status] || PAYMENT_META.unpaid;
  const StatusIcon = meta.icon;
  const sup = order.suppliers || {};
  const itemsCount = Array.isArray(order.items) ? order.items.length : 0;

  const expected = order.expected_delivery ? new Date(order.expected_delivery) : null;
  const isOverdue =
    expected && !['received', 'delivered', 'canceled'].includes(order.status) &&
    expected < new Date();

  return (
    <div
      onClick={onOpen}
      className={`group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
        hover:border-[#F9AA33]/50 hover:shadow-lg transition-all duration-200 p-4
        ${onOpen ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 rounded-lg bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center">
          <StatusIcon className="w-5 h-5 text-[#4A6572] dark:text-gray-400" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Верхняя строка */}
          <div className="flex items-start gap-2 flex-wrap mb-1">
            <span className="font-mono text-xs font-semibold text-[#344955] dark:text-[#F9AA33] bg-[#4A6572]/10 dark:bg-[#4A6572]/30 px-2 py-0.5 rounded">
              {order.order_number || '—'}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${meta.color}`}>
              {meta.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${payMeta.color}`}>
              {payMeta.label}
            </span>
          </div>

          {/* Поставщик */}
          <div className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-white font-medium">
            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{sup.name || 'Поставщик не указан'}</span>
          </div>

          {/* Мета */}
          <div className="flex items-center gap-3 flex-wrap mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {itemsCount} позиц{itemsCount % 10 === 1 && itemsCount % 100 !== 11 ? 'ия' : 'ий'}
            </span>
            {order.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(order.created_at).toLocaleDateString('ru-RU')}
              </span>
            )}
            {expected && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                <Clock className="w-3 h-3" />
                {isOverdue ? 'просрочено ' : 'до '}
                {expected.toLocaleDateString('ru-RU')}
              </span>
            )}
          </div>
        </div>

        {/* Сумма + стрелка */}
        <div className="text-right shrink-0 flex items-center gap-2">
          <div>
            <div className="text-lg font-bold text-[#344955] dark:text-[#F9AA33]">
              {formatMoney(order.total)}
            </div>
            <div className="text-[10px] text-gray-400">
              {order.payment_status === 'paid' ? 'оплачен' : 'к оплате'}
            </div>
          </div>
          {onOpen && (
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-[#F9AA33] transition" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Сводка ──────────────────────────────────────────────
function SummaryBox({ icon: IconCmp, label, value, color = 'text-[#4A6572]' }) {
  const Icon = IconCmp;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-900/40 flex items-center justify-center">
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

// ─── Пусто ───────────────────────────────────────────────
function EmptyState({ hasFilters, canCreate, onCreate, onReset }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center mx-auto mb-4">
        <Package className="w-8 h-8 text-[#4A6572]" />
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
            Пока нет заказов
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            {canCreate
              ? 'Создайте первый заказ — вручную или из выбранного предложения RFQ'
              : 'Заказы ещё не созданы'}
          </p>
          {canCreate && onCreate && (
            <button
              onClick={onCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              Создать первый заказ
            </button>
          )}
        </>
      )}
    </div>
  );
}
