// src/components/Suppliers/Orders/PurchaseOrderDetails.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Loader2, AlertCircle, RefreshCw, FileText,
  Calendar, MapPin, Truck, Building2, Banknote, CheckCircle2, Clock,
  Ban, ChevronRight, Edit3,
} from 'lucide-react';

import {
  getPurchaseOrderById,
  updatePurchaseOrderStatus,
  updatePaymentStatus,
} from '../../../api/suppliers';
import { isProcurement } from '../../../utils/permissions';

// ─── Статусы ─────────────────────────────────────────────
const STATUS_META = {
  created:   { label: 'Создан',       color: 'bg-gray-500/15 text-gray-400 border-gray-500/30',        icon: FileText },
  confirmed: { label: 'Подтверждён',  color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',         icon: CheckCircle2 },
  paid:      { label: 'Оплачен',      color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',   icon: Banknote },
  shipped:   { label: 'Отправлен',    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',   icon: Truck },
  delivered: { label: 'Доставлен',    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',      icon: Truck },
  received:  { label: 'Получен',      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  canceled:  { label: 'Отменён',      color: 'bg-red-500/15 text-red-400 border-red-500/30',            icon: Ban },
};

const PAYMENT_META = {
  unpaid:  { label: 'Не оплачен', color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  partial: { label: 'Частично',   color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  paid:    { label: 'Оплачен',    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

const STATUS_ORDER = ['created', 'confirmed', 'paid', 'shipped', 'delivered', 'received'];
const ALL_STATUSES = ['created', 'confirmed', 'paid', 'shipped', 'delivered', 'received', 'canceled'];
const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'];

const formatPrice = (v) =>
  (Number(v) || 0).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatQty = (v) => {
  const n = Number(v) || 0;
  return Number.isInteger(n)
    ? n.toLocaleString('ru-RU')
    : n.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
};

/**
 * Детали заказа поставщику.
 *
 * @param {object} props
 * @param {string} props.orderId
 * @param {string} [props.role]
 * @param {Function} props.showNotification
 * @param {() => void} [props.onBack]
 */
export default function PurchaseOrderDetails({
  orderId,
  role,
  showNotification,
  onBack,
}) {
  const canEdit = isProcurement(role) || role === 'supply_admin';

  const notify = useCallback(
    (msg, type = 'info') => {
      if (typeof showNotification === 'function') showNotification(msg, type);
      else console.log(`[${type}] ${msg}`);
    },
    [showNotification]
  );

  // ─── Состояние ─────────────────────────────────────────
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Загрузка ──────────────────────────────────────────
  const loadOrder = useCallback(
    async ({ silent = false } = {}) => {
      if (!orderId) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const data = await getPurchaseOrderById(orderId);
        setOrder(data);
      } catch (err) {
        console.error('[PODetails] load error:', err);
        setError(err.message || 'Не удалось загрузить заказ');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId]
  );

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // ─── Действия ──────────────────────────────────────────
  const handleChangeStatus = async (newStatus) => {
    if (newStatus === order?.status) return;
    setActionLoading(true);
    try {
      await updatePurchaseOrderStatus(orderId, newStatus);
      notify(`✅ Статус изменён на «${STATUS_META[newStatus].label}»`, 'success');
      await loadOrder({ silent: true });
    } catch (err) {
      console.error('[PODetails] status error:', err);
      notify(err.message || 'Ошибка обновления статуса', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePayment = async (newStatus) => {
    if (newStatus === order?.payment_status) return;
    setActionLoading(true);
    try {
      await updatePaymentStatus(orderId, newStatus);
      notify(`✅ Оплата: «${PAYMENT_META[newStatus].label}»`, 'success');
      await loadOrder({ silent: true });
    } catch (err) {
      console.error('[PODetails] payment error:', err);
      notify(err.message || 'Ошибка обновления оплаты', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Рендер ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700 dark:text-red-400 font-medium">
              {error || 'Заказ не найден'}
            </p>
            {onBack && (
              <button
                onClick={onBack}
                className="mt-3 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition"
              >
                ← Назад
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[order.status] || STATUS_META.created;
  const payMeta = PAYMENT_META[order.payment_status] || PAYMENT_META.unpaid;
  const StatusIcon = meta.icon;
  const sup = order.suppliers || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const currentIdx = STATUS_ORDER.indexOf(order.status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="mt-0.5 p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition shrink-0"
                aria-label="Назад"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-sm font-bold text-[#344955] dark:text-[#F9AA33] bg-[#4A6572]/10 dark:bg-[#4A6572]/30 px-2.5 py-1 rounded">
                  {order.order_number || '—'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${meta.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {meta.label}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${payMeta.color}`}>
                  <Banknote className="w-3 h-3" />
                  {payMeta.label}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Создан: {new Date(order.created_at).toLocaleString('ru-RU')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadOrder({ silent: true })}
              disabled={refreshing}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
              title="Обновить"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Pipeline */}
        <Pipeline currentIdx={currentIdx} status={order.status} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Левая колонка */}
          <div className="lg:col-span-2 space-y-4">
            {/* Поставщик */}
            <Card icon={Building2} title="Поставщик">
              {sup.id ? (
                <div className="space-y-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {sup.name || '—'}
                  </div>
                  {sup.inn && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ИНН {sup.inn}
                    </div>
                  )}
                  {sup.contact_person && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {sup.contact_person}
                    </div>
                  )}
                  {sup.phone && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {sup.phone}
                    </div>
                  )}
                  {sup.email && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {sup.email}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Не указан</p>
              )}
            </Card>

            {/* Условия */}
            <Card icon={Truck} title="Доставка">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Field label="Адрес доставки" value={order.delivery_address} icon={MapPin} />
                <Field
                  label="Ожидаемая дата"
                  value={order.expected_delivery ? new Date(order.expected_delivery).toLocaleDateString('ru-RU') : null}
                  icon={Calendar}
                />
                <Field
                  label="Фактическая дата"
                  value={order.actual_delivery ? new Date(order.actual_delivery).toLocaleDateString('ru-RU') : null}
                  icon={Calendar}
                />
                <Field label="Трекинг-номер" value={order.tracking_number} icon={Truck} mono />
              </div>
            </Card>

            {/* Позиции */}
            <Card icon={FileText} title={`Позиции (${items.length})`}>
              {items.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Нет позиций
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <th className="py-2 px-2 font-medium w-[40px]">#</th>
                        <th className="py-2 px-2 font-medium">Наименование</th>
                        <th className="py-2 px-2 font-medium w-[100px] text-right">Кол-во</th>
                        <th className="py-2 px-2 font-medium w-[110px] text-right">Цена</th>
                        <th className="py-2 px-2 font-medium w-[120px] text-right">Итого</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {items.map((it, i) => {
                        const lineTotal =
                          Number(it.total) ||
                          (Number(it.price) || 0) * (Number(it.quantity) || 0);
                        return (
                          <tr key={i} className="text-gray-900 dark:text-white">
                            <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                            <td className="py-2 px-2">
                              <div className="truncate max-w-[280px]">{it.name}</div>
                              {it.article && (
                                <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                                  {it.article}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-2 text-right text-xs text-gray-600 dark:text-gray-400">
                              {formatQty(it.quantity)} {it.unit || 'шт'}
                            </td>
                            <td className="py-2 px-2 text-right text-sm">
                              {formatPrice(it.price)} ₽
                            </td>
                            <td className="py-2 px-2 text-right text-sm font-medium">
                              {formatPrice(lineTotal)} ₽
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Итого по заказу
                </span>
                <span className="text-xl font-bold text-[#344955] dark:text-[#F9AA33]">
                  {formatPrice(order.total)} ₽
                </span>
              </div>
            </Card>
          </div>

          {/* Правая колонка */}
          <div className="space-y-4">
            {/* Управление */}
            {canEdit && (
              <Card icon={Edit3} title="Управление">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Статус заказа
                    </label>
                    <select
                      value={order.status}
                      onChange={(e) => handleChangeStatus(e.target.value)}
                      disabled={actionLoading}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50 disabled:opacity-50"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_META[s].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                      Оплата
                    </label>
                    <select
                      value={order.payment_status}
                      onChange={(e) => handleChangePayment(e.target.value)}
                      disabled={actionLoading}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50 disabled:opacity-50"
                    >
                      {PAYMENT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {PAYMENT_META[s].label}
                        </option>
                      ))}
                    </select>
                    {order.paid_at && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        Оплачено {new Date(order.paid_at).toLocaleString('ru-RU')}
                      </p>
                    )}
                  </div>

                  {actionLoading && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Сохранение…
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Связи */}
            {(order.rfq_id || order.offer_id || order.application_id) && (
              <Card icon={ChevronRight} title="Связи">
                <ul className="space-y-2 text-sm">
                  {order.rfq_id && (
                    <li className="flex items-center justify-between gap-2">
                      <span className="text-gray-500 dark:text-gray-400">RFQ</span>
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                        {order.rfq_requests?.title || order.rfq_id.slice(0, 8) + '…'}
                      </span>
                    </li>
                  )}
                  {order.offer_id && (
                    <li className="flex items-center justify-between gap-2">
                      <span className="text-gray-500 dark:text-gray-400">Оффер</span>
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                        {order.supplier_offers?.total
                          ? `${formatPrice(order.supplier_offers.total)} ₽`
                          : order.offer_id.slice(0, 8) + '…'}
                      </span>
                    </li>
                  )}
                  {order.application_id && (
                    <li className="flex items-center justify-between gap-2">
                      <span className="text-gray-500 dark:text-gray-400">Заявка</span>
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                        {order.application_id.slice(0, 8)}…
                      </span>
                    </li>
                  )}
                </ul>
              </Card>
            )}

            {/* История */}
            <Card icon={Clock} title="История">
              <ul className="space-y-2 text-xs">
                <MetaRow
                  label="Создан"
                  value={new Date(order.created_at).toLocaleString('ru-RU')}
                />
                {order.updated_at && order.updated_at !== order.created_at && (
                  <MetaRow
                    label="Обновлён"
                    value={new Date(order.updated_at).toLocaleString('ru-RU')}
                  />
                )}
                {order.paid_at && (
                  <MetaRow
                    label="Оплачен"
                    value={new Date(order.paid_at).toLocaleString('ru-RU')}
                  />
                )}
                {order.actual_delivery && (
                  <MetaRow
                    label="Доставлен"
                    value={new Date(order.actual_delivery).toLocaleDateString('ru-RU')}
                  />
                )}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pipeline ────────────────────────────────────────────
function Pipeline({ currentIdx, status }) {
  const isCanceled = status === 'canceled';
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-4 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-[600px]">
        {STATUS_ORDER.map((s, i) => {
          const meta = STATUS_META[s];
          const Icon = meta.icon;
          const isDone = !isCanceled && i <= currentIdx;
          const isCurrent = !isCanceled && i === currentIdx;
          const isNext = !isCanceled && i === currentIdx + 1;
          return (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition
                    ${
                      isDone
                        ? 'bg-[#4A6572] text-white'
                        : isNext
                          ? 'bg-[#F9AA33]/20 text-[#F9AA33] border-2 border-dashed border-[#F9AA33]'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${
                    isCurrent
                      ? 'text-[#4A6572] dark:text-[#F9AA33] font-semibold'
                      : isDone
                        ? 'text-gray-700 dark:text-gray-300'
                        : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {meta.label}
                </span>
              </div>
              {i < STATUS_ORDER.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 rounded ${
                    isDone && i < currentIdx
                      ? 'bg-[#4A6572]'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      {isCanceled && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-500">
          <Ban className="w-4 h-4" />
          Заказ отменён
        </div>
      )}
    </div>
  );
}

// ─── UI helpers ──────────────────────────────────────────
function Card({ icon: IconCmp, title, children }) {
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
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, icon: IconCmp, mono = false }) {
  const Icon = IconCmp;
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
        <div className={`text-sm text-gray-900 dark:text-white truncate ${mono ? 'font-mono' : ''}`}>
          {value || <span className="text-gray-400">—</span>}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-gray-700 dark:text-gray-300 font-mono">{value}</span>
    </li>
  );
}
