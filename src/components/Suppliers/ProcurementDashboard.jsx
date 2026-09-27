// src/components/Suppliers/ProcurementDashboard.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2, AlertCircle, RefreshCw, MessageSquare, Package, Users,
  TrendingUp, Banknote, ChevronRight,
  ArrowRight, AlertTriangle, Trophy, BarChart3, Plus, Layers,
} from 'lucide-react';

import {
  getProcurementStats,
  getRFQList,
  getPurchaseOrders,
  getSuppliers,
} from '../../api/suppliers';

const formatMoney = (v) => {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} млн ₽`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} тыс ₽`;
  return `${n.toLocaleString('ru-RU')} ₽`;
};

const RFQ_STATUS_META = {
  draft:      { label: 'Черновик',   color: 'bg-gray-500/15 text-gray-400' },
  sent:       { label: 'Отправлен',  color: 'bg-blue-500/15 text-blue-400' },
  collecting: { label: 'Сбор',       color: 'bg-amber-500/15 text-amber-400' },
  analyzing:  { label: 'Анализ',     color: 'bg-purple-500/15 text-purple-400' },
  completed:  { label: 'Завершён',   color: 'bg-emerald-500/15 text-emerald-400' },
  canceled:   { label: 'Отменён',    color: 'bg-red-500/15 text-red-400' },
};

const ORDER_STATUS_META = {
  created:   { label: 'Создан',      color: 'bg-gray-500/15 text-gray-400' },
  confirmed: { label: 'Подтверждён', color: 'bg-blue-500/15 text-blue-400' },
  paid:      { label: 'Оплачен',     color: 'bg-indigo-500/15 text-indigo-400' },
  shipped:   { label: 'Отправлен',   color: 'bg-purple-500/15 text-purple-400' },
  delivered: { label: 'Доставлен',   color: 'bg-amber-500/15 text-amber-400' },
  received:  { label: 'Получен',     color: 'bg-emerald-500/15 text-emerald-400' },
  canceled:  { label: 'Отменён',     color: 'bg-red-500/15 text-red-400' },
};

/**
 * Дашборд закупщика.
 *
 * @param {object} props
 * @param {string} props.companyId
 * @param {(view: string, payload?: object) => void} props.onNavigate
 */
export default function ProcurementDashboard({
  companyId,
  onNavigate,
}) {
  // ─── Состояние ─────────────────────────────────────────
  const [rfqs, setRfqs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ─── Загрузка ──────────────────────────────────────────
  const loadAll = useCallback(
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
        const [, rfqsData, ordersData, suppliersData] = await Promise.all([
          getProcurementStats(companyId, '90d').catch(() => null),
          getRFQList(companyId, {}).catch(() => []),
          getPurchaseOrders(companyId, {}).catch(() => []),
          getSuppliers(companyId, { status: 'active' }).catch(() => []),
        ]);

        setRfqs(rfqsData || []);
        setOrders(ordersData || []);
        setSuppliers(suppliersData || []);
      } catch (err) {
        console.error('[ProcurementDashboard] load error:', err);
        setError(err.message || 'Не удалось загрузить данные');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ─── Метрики ───────────────────────────────────────────
  const metrics = useMemo(() => {
    const activeRfqStatuses = ['sent', 'collecting', 'analyzing'];
    const activeOrderStatuses = ['created', 'confirmed', 'paid', 'shipped'];

    const activeRfqs = rfqs.filter((r) => activeRfqStatuses.includes(r.status));
    const rfqsWithOffers = rfqs.filter(
      (r) => (r.offers_count || 0) >= 2 && r.status !== 'completed' && r.status !== 'canceled'
    );
    const activeOrders = orders.filter((o) => activeOrderStatuses.includes(o.status));
    const unpaidOrders = orders.filter(
      (o) => o.payment_status !== 'paid' && o.status !== 'canceled'
    );

    const activeOrdersSum = activeOrders.reduce(
      (sum, o) => sum + (Number(o.total) || 0),
      0
    );
    const unpaidSum = unpaidOrders.reduce(
      (sum, o) => sum + (Number(o.total) || 0),
      0
    );

    return {
      activeRfqs: activeRfqs.length,
      rfqsWithOffers: rfqsWithOffers.length,
      activeOrders: activeOrders.length,
      activeOrdersSum,
      unpaidOrders: unpaidOrders.length,
      unpaidSum,
      totalSuppliers: suppliers.length,
    };
  }, [rfqs, orders, suppliers]);

  // ─── Требуют внимания ──────────────────────────────────
  const attention = useMemo(() => {
    const items = [];

    rfqs
      .filter(
        (r) =>
          (r.offers_count || 0) >= 2 &&
          r.status !== 'completed' &&
          r.status !== 'canceled' &&
          r.status !== 'draft'
      )
      .slice(0, 3)
      .forEach((rfq) => {
        items.push({
          id: `rfq-${rfq.id}`,
          type: 'rfq_select',
          icon: Trophy,
          color: 'amber',
          title: 'Готово к выбору победителя',
          subtitle: `${rfq.title} · ${rfq.offers_count} предложений`,
          action: () => onNavigate?.('rfqDetails', { rfqId: rfq.id }),
        });
      });

    const now = new Date();
    orders
      .filter(
        (o) =>
          o.expected_delivery &&
          !['delivered', 'received', 'canceled'].includes(o.status) &&
          new Date(o.expected_delivery) < now
      )
      .slice(0, 3)
      .forEach((order) => {
        items.push({
          id: `po-${order.id}`,
          type: 'overdue',
          icon: AlertTriangle,
          color: 'red',
          title: 'Просрочена доставка',
          subtitle: `${order.order_number} · ${order.suppliers?.name || 'поставщик'}`,
          action: () => onNavigate?.('purchaseOrderDetails', { orderId: order.id }),
        });
      });

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    orders
      .filter(
        (o) =>
          o.payment_status !== 'paid' &&
          o.status !== 'canceled' &&
          new Date(o.created_at) < fourteenDaysAgo
      )
      .slice(0, 2)
      .forEach((order) => {
        items.push({
          id: `pay-${order.id}`,
          type: 'unpaid',
          icon: Banknote,
          color: 'purple',
          title: 'Счёт не оплачен > 14 дней',
          subtitle: `${order.order_number} · ${formatMoney(order.total)}`,
          action: () => onNavigate?.('purchaseOrderDetails', { orderId: order.id }),
        });
      });

    return items.slice(0, 5);
  }, [rfqs, orders, onNavigate]);

  // ─── Последние заказы ──────────────────────────────────
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  }, [orders]);

  // ─── Топ поставщиков ───────────────────────────────────
  const topSuppliers = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      if (!o.supplier_id) continue;
      if (o.status === 'canceled') continue;
      const sup = o.suppliers || {};
      const cur = map.get(o.supplier_id) || {
        id: o.supplier_id,
        name: sup.name || 'Поставщик',
        orders: 0,
        total: 0,
      };
      cur.orders += 1;
      cur.total += Number(o.total) || 0;
      map.set(o.supplier_id, cur);
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[#4A6572]" />
              Закупки
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Сводка по RFQ, заказам и поставщикам за последние 90 дней
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadAll({ silent: true })}
              disabled={refreshing}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
              title="Обновить"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => onNavigate?.('rfqCreate')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              Создать RFQ
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KPICard
            icon={MessageSquare}
            label="Активные RFQ"
            value={metrics.activeRfqs}
            color="blue"
            onClick={() => onNavigate?.('rfqList')}
          />
          <KPICard
            icon={Trophy}
            label="Ждут выбора"
            value={metrics.rfqsWithOffers}
            color="amber"
            onClick={() => onNavigate?.('rfqList', { filter: 'collecting' })}
          />
          <KPICard
            icon={Package}
            label="Активные заказы"
            value={metrics.activeOrders}
            color="emerald"
            onClick={() => onNavigate?.('purchaseOrders')}
          />
          <KPICard
            icon={Users}
            label="Поставщиков"
            value={metrics.totalSuppliers}
            color="purple"
            onClick={() => onNavigate?.('suppliers')}
          />
        </div>

        {/* Финансовая сводка */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-2xl p-5 text-white">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <TrendingUp className="w-4 h-4" />
              В работе
            </div>
            <div className="text-3xl font-bold mt-2">
              {formatMoney(metrics.activeOrdersSum)}
            </div>
            <div className="text-xs text-white/60 mt-1">
              {metrics.activeOrders} активных заказов
            </div>
            <button
              onClick={() => onNavigate?.('purchaseOrders')}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white/90 hover:text-white transition"
            >
              Все заказы
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className={`rounded-2xl p-5 text-white ${
            metrics.unpaidSum > 0
              ? 'bg-gradient-to-br from-amber-500 to-orange-600'
              : 'bg-gradient-to-br from-emerald-500 to-emerald-700'
          }`}>
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Banknote className="w-4 h-4" />
              К оплате
            </div>
            <div className="text-3xl font-bold mt-2">
              {formatMoney(metrics.unpaidSum)}
            </div>
            <div className="text-xs text-white/70 mt-1">
              {metrics.unpaidOrders === 0
                ? 'Все заказы оплачены ✅'
                : `${metrics.unpaidOrders} неоплаченных заказов`}
            </div>
          </div>
        </div>

        {/* Требуют внимания */}
        {attention.length > 0 && (
          <SectionCard
            icon={AlertTriangle}
            title="Требуют внимания"
            count={attention.length}
            className="mb-6"
          >
            <div className="space-y-2">
              {attention.map((item) => {
                const Icon = item.icon;
                const colors = {
                  amber: 'bg-amber-500/10 text-amber-500',
                  red: 'bg-red-500/10 text-red-500',
                  purple: 'bg-purple-500/10 text-purple-500',
                };
                const palette = colors[item.color] || colors.amber;
                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 cursor-pointer hover:border-[#F9AA33]/50 hover:bg-white dark:hover:bg-gray-800 transition"
                  >
                    <div className={`w-8 h-8 rounded-lg ${palette.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${palette.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Последние заказы */}
          <SectionCard
            icon={Package}
            title="Последние заказы"
            action={
              recentOrders.length > 0 && (
                <button
                  onClick={() => onNavigate?.('purchaseOrders')}
                  className="text-xs text-[#4A6572] hover:text-[#344955] font-medium transition flex items-center gap-1"
                >
                  Все
                  <ChevronRight className="w-3 h-3" />
                </button>
              )
            }
          >
            {recentOrders.length === 0 ? (
              <EmptyRow text="Заказов пока нет" />
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
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

          {/* Топ поставщиков */}
          <SectionCard
            icon={Trophy}
            title="Топ поставщиков"
            subtitle="по сумме заказов"
          >
            {topSuppliers.length === 0 ? (
              <EmptyRow text="Нет данных для отображения" />
            ) : (
              <div className="space-y-2">
                {topSuppliers.map((sup, i) => (
                  <div
                    key={sup.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                      ${i === 0
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : i === 1
                          ? 'bg-gray-400/20 text-gray-600 dark:text-gray-300'
                          : i === 2
                            ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
                            : 'bg-[#4A6572]/10 text-[#4A6572] dark:text-gray-400'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {sup.name}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {sup.orders} заказ{sup.orders % 10 === 1 && sup.orders % 100 !== 11 ? '' : sup.orders % 10 >= 2 && sup.orders % 10 <= 4 && (sup.orders % 100 < 10 || sup.orders % 100 >= 20) ? 'а' : 'ов'}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-[#344955] dark:text-[#F9AA33] shrink-0">
                      {formatMoney(sup.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction
            icon={Plus}
            label="Создать RFQ"
            onClick={() => onNavigate?.('rfqCreate')}
          />
          <QuickAction
            icon={Layers}
            label="Каталог"
            onClick={() => onNavigate?.('supplierCatalog')}
          />
          <QuickAction
            icon={Users}
            label="Поставщики"
            onClick={() => onNavigate?.('suppliers')}
          />
          <QuickAction
            icon={Package}
            label="Все заказы"
            onClick={() => onNavigate?.('purchaseOrders')}
          />
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
function SectionCard({ icon: IconCmp, title, subtitle, count, action, className = '', children }) {
  const Icon = IconCmp;
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5 ${className}`}>
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
        {subtitle && (
          <span className="text-[11px] text-gray-400">{subtitle}</span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      {children}
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
        <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
          {order.suppliers?.name || 'Поставщик не указан'}
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

// ─── QuickAction ────────────────────────────────────────
function QuickAction({ icon: IconCmp, label, onClick }) {
  const Icon = IconCmp;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#F9AA33]/50 hover:shadow-md transition"
    >
      <div className="w-10 h-10 rounded-lg bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#4A6572]" />
      </div>
      <span className="text-xs font-medium text-gray-900 dark:text-white">
        {label}
      </span>
    </button>
  );
}