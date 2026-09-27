// src/components/Suppliers/SupplierDashboard.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2, AlertCircle, RefreshCw, Building2, MessageSquare, Package,
  Trophy, CheckCircle2, FileText, Layers,
  ArrowRight, Calendar, Star, ChevronRight,
} from 'lucide-react';

import {
  getSupplierById,
  getRFQList,
  getPurchaseOrders,
  getPriceLists,
  getPriceListItems,
} from '../../api/suppliers';

const formatMoney = (v) => {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} млн ₽`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} тыс ₽`;
  return `${n.toLocaleString('ru-RU')} ₽`;
};

const STATUS_META = {
  draft:      { label: 'Черновик',   color: 'bg-gray-500/15 text-gray-400' },
  sent:       { label: 'Отправлен',  color: 'bg-blue-500/15 text-blue-400' },
  collecting: { label: 'Сбор',       color: 'bg-amber-500/15 text-amber-400' },
  analyzing:  { label: 'Анализ',     color: 'bg-purple-500/15 text-purple-400' },
  completed:  { label: 'Завершён',   color: 'bg-emerald-500/15 text-emerald-400' },
  canceled:   { label: 'Отменён',    color: 'bg-red-500/15 text-red-400' },
};

const ORDER_STATUS_META = {
  created:   { label: 'Создан',       color: 'bg-gray-500/15 text-gray-400' },
  confirmed: { label: 'Подтверждён',  color: 'bg-blue-500/15 text-blue-400' },
  paid:      { label: 'Оплачен',      color: 'bg-indigo-500/15 text-indigo-400' },
  shipped:   { label: 'Отправлен',    color: 'bg-purple-500/15 text-purple-400' },
  delivered: { label: 'Доставлен',    color: 'bg-amber-500/15 text-amber-400' },
  received:  { label: 'Получен',      color: 'bg-emerald-500/15 text-emerald-400' },
  canceled:  { label: 'Отменён',      color: 'bg-red-500/15 text-red-400' },
};

/**
 * Дашборд поставщика.
 *
 * @param {object} props
 * @param {string} props.companyId
 * @param {string} props.supplierId
 * @param {(view: string, payload?: object) => void} props.onNavigate
 */
export default function SupplierDashboard({
  companyId,
  supplierId,
  onNavigate,
}) {
  // ─── Состояние ─────────────────────────────────────────
  const [supplier, setSupplier] = useState(null);
  const [rfqs, setRfqs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [itemsCount, setItemsCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ─── Загрузка ──────────────────────────────────────────
  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!supplierId) {
        setError('supplierId не передан');
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const [
          supplierData,
          rfqsData,
          ordersData,
          priceListsData,
          itemsData,
        ] = await Promise.all([
          getSupplierById(supplierId).catch(() => null),
          getRFQList(companyId, {}).catch(() => []),
          getPurchaseOrders(companyId, { supplierId }).catch(() => []),
          getPriceLists(supplierId).catch(() => []),
          getPriceListItems(supplierId, { limit: 1 }).catch(() => []),
        ]);

        setSupplier(supplierData);
        setRfqs(rfqsData || []);
        setOrders(ordersData || []);
        setPriceLists(priceListsData || []);
        setItemsCount(Array.isArray(itemsData) ? itemsData.length : 0);
      } catch (err) {
        console.error('[SupplierDashboard] load error:', err);
        setError(err.message || 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, supplierId]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ─── Метрики ───────────────────────────────────────────
  const stats = useMemo(() => {
    const activeRfqStatuses = ['sent', 'collecting', 'analyzing'];
    const activeOrderStatuses = ['created', 'confirmed', 'paid', 'shipped'];
    const completedOrderStatuses = ['delivered', 'received'];

    const activeRfqs = rfqs.filter((r) => activeRfqStatuses.includes(r.status));
    const activeOrders = orders.filter((o) => activeOrderStatuses.includes(o.status));
    const completedOrders = orders.filter((o) => completedOrderStatuses.includes(o.status));

    const totalOrdersSum = completedOrders.reduce(
      (sum, o) => sum + (Number(o.total) || 0),
      0
    );

    const completedRfqs = rfqs.filter((r) => r.status === 'completed').length;
    const winRate = completedRfqs > 0
      ? Math.min(100, Math.round((completedOrders.length / completedRfqs) * 100))
      : 0;

    return {
      activeRfqs: activeRfqs.length,
      activeOrders: activeOrders.length,
      completedOrders: completedOrders.length,
      totalOrdersSum,
      winRate,
      totalRfqs: rfqs.length,
    };
  }, [rfqs, orders]);

  // ─── RFQ требующие ответа ──────────────────────────────
  const rfqsToRespond = useMemo(() => {
    return rfqs
      .filter((r) => ['sent', 'collecting'].includes(r.status))
      .slice(0, 5);
  }, [rfqs]);

  // ─── Активные заказы ───────────────────────────────────
  const activeOrders = useMemo(() => {
    const activeStatuses = ['created', 'confirmed', 'paid', 'shipped'];
    return orders
      .filter((o) => activeStatuses.includes(o.status))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  }, [orders]);

  // ─── Рендер ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
            <button
              onClick={() => loadAll()}
              className="mt-3 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
            >
              Повторить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center text-white">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {supplier?.name || 'Дашборд поставщика'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                {supplier?.inn && <span>ИНН {supplier.inn}</span>}
                {supplier?.rating > 0 && (
                  <span className="flex items-center gap-1 text-[#F9AA33]">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {Number(supplier.rating).toFixed(1)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => loadAll({ silent: true })}
            disabled={refreshing}
            className="self-start p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KPICard
            icon={MessageSquare}
            label="Активные RFQ"
            value={stats.activeRfqs}
            color="blue"
            onClick={() => onNavigate?.('rfqList')}
          />
          <KPICard
            icon={Package}
            label="Заказов в работе"
            value={stats.activeOrders}
            color="amber"
            onClick={() => onNavigate?.('purchaseOrders')}
          />
          <KPICard
            icon={CheckCircle2}
            label="Завершено"
            value={stats.completedOrders}
            color="emerald"
          />
          <KPICard
            icon={Trophy}
            label="Win rate"
            value={`${stats.winRate}%`}
            color="purple"
          />
        </div>

        {/* Сумма заказов */}
        <div className="bg-gradient-to-r from-[#4A6572] to-[#344955] rounded-2xl p-5 mb-6 text-white">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="text-sm text-white/70">Всего закупок (получено)</div>
              <div className="text-3xl font-bold mt-1">
                {formatMoney(stats.totalOrdersSum)}
              </div>
              <div className="text-xs text-white/60 mt-1">
                по {stats.completedOrders} завершённым заказам
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('purchaseOrders')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur transition text-sm font-medium"
            >
              Все заказы
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* RFQ требующие ответа */}
          <SectionCard
            icon={MessageSquare}
            title="Ожидают ответа"
            count={rfqsToRespond.length}
            action={
              rfqsToRespond.length > 0 && (
                <button
                  onClick={() => onNavigate?.('rfqList', { filter: 'sent' })}
                  className="text-xs text-[#4A6572] hover:text-[#344955] font-medium transition flex items-center gap-1"
                >
                  Все RFQ
                  <ChevronRight className="w-3 h-3" />
                </button>
              )
            }
          >
            {rfqsToRespond.length === 0 ? (
              <EmptyRow text="Нет активных запросов цен" />
            ) : (
              <div className="space-y-2">
                {rfqsToRespond.map((rfq) => (
                  <RFQRow
                    key={rfq.id}
                    rfq={rfq}
                    onClick={() =>
                      onNavigate?.('rfqDetails', { rfqId: rfq.id })
                    }
                  />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Активные заказы */}
          <SectionCard
            icon={Package}
            title="Заказы в работе"
            count={activeOrders.length}
            action={
              activeOrders.length > 0 && (
                <button
                  onClick={() => onNavigate?.('purchaseOrders')}
                  className="text-xs text-[#4A6572] hover:text-[#344955] font-medium transition flex items-center gap-1"
                >
                  Все заказы
                  <ChevronRight className="w-3 h-3" />
                </button>
              )
            }
          >
            {activeOrders.length === 0 ? (
              <EmptyRow text="Нет активных заказов" />
            ) : (
              <div className="space-y-2">
                {activeOrders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    onClick={() =>
                      onNavigate?.('purchaseOrderDetails', { orderId: order.id })
                    }
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Прайс-лист */}
        <div className="mt-4">
          <SectionCard
            icon={Layers}
            title="Прайс-лист"
            action={
              <button
                onClick={() => onNavigate?.('supplierPriceList', { supplierId })}
                className="text-xs text-[#4A6572] hover:text-[#344955] font-medium transition flex items-center gap-1"
              >
                Открыть
                <ChevronRight className="w-3 h-3" />
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MiniStat label="Прайс-листов" value={priceLists.length} />
              <MiniStat
                label="Активных"
                value={priceLists.filter((p) => p.is_active).length}
              />
              <MiniStat
                label="Позиций загружено"
                value={itemsCount}
                hint={itemsCount >= 1 ? 'по первой странице' : null}
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────────
function KPICard({ icon: IconCmp, label, value, color = 'blue', onClick }) {
  const Icon = IconCmp;
  const colors = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
    gray: { bg: 'bg-gray-500/10', text: 'text-gray-500' },
  };
  const palette = colors[color] || colors.blue;
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 transition
        ${onClick ? 'cursor-pointer hover:border-[#F9AA33]/50 hover:shadow-md' : ''}`}
    >
      <div className={`w-9 h-9 rounded-lg ${palette.bg} flex items-center justify-center mb-2`}>
        <Icon className={`w-4 h-4 ${palette.text}`} />
      </div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
        {value}
      </div>
    </div>
  );
}

// ─── Section Card ───────────────────────────────────────
function SectionCard({ icon: IconCmp, title, count, action, children }) {
  const Icon = IconCmp;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[#4A6572]" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          {title}
        </h3>
        {typeof count === 'number' && (
          <span className="ml-1 text-[10px] font-medium text-gray-400">
            {count}
          </span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── RFQ Row ────────────────────────────────────────────
function RFQRow({ rfq, onClick }) {
  const meta = STATUS_META[rfq.status] || STATUS_META.sent;
  const itemsCount = Array.isArray(rfq.items) ? rfq.items.length : 0;
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 transition
        ${onClick ? 'cursor-pointer hover:border-[#F9AA33]/50 hover:bg-white dark:hover:bg-gray-800' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
          {rfq.title}
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {itemsCount} позиций
          </span>
          {rfq.deadline && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              до {new Date(rfq.deadline).toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
      </div>
      <span className={`shrink-0 text-[10px] font-medium px-2 py-1 rounded ${meta.color}`}>
        {meta.label}
      </span>
    </div>
  );
}

// ─── Order Row ──────────────────────────────────────────
function OrderRow({ order, onClick }) {
  const meta = ORDER_STATUS_META[order.status] || ORDER_STATUS_META.created;
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 transition
        ${onClick ? 'cursor-pointer hover:border-[#F9AA33]/50 hover:bg-white dark:hover:bg-gray-800' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs font-semibold text-[#344955] dark:text-[#F9AA33]">
          {order.order_number || '—'}
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {order.expected_delivery && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              до {new Date(order.expected_delivery).toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-gray-900 dark:text-white">
          {formatMoney(order.total)}
        </div>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.color} inline-block mt-0.5`}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}

// ─── EmptyRow ───────────────────────────────────────────
function EmptyRow({ text }) {
  return (
    <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
      {text}
    </div>
  );
}

// ─── MiniStat ───────────────────────────────────────────
function MiniStat({ label, value, hint }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
      <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
        {value}
      </div>
      {hint && (
        <div className="text-[10px] text-gray-400 mt-0.5">{hint}</div>
      )}
    </div>
  );
}