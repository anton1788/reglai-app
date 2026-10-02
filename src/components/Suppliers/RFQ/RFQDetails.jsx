// src/components/Suppliers/RFQ/RFQDetails.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, Loader2, AlertCircle, RefreshCw, Users, FileText,
  MessageSquare, Calendar, MapPin, Banknote, CheckCircle2,
  Ban, Plus, Clock, Trophy, TrendingDown, X, BarChart3,
} from 'lucide-react';

import RFQSupplierSelector from './RFQSupplierSelector';
import OfferComparison from '../Offers/OfferComparison';
import {
  getRFQById,
  getRFQInvitations,
  getOffersForRFQ,
  sendRFQToSuppliers,
  updateRFQStatus,
  selectOffer,
} from '../../../api/suppliers';
import { isProcurement } from '../../../utils/permissions';

const STATUS_META = {
  draft:      { label: 'Черновик',   color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
  sent:       { label: 'Отправлен',  color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  collecting: { label: 'Сбор',       color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  analyzing:  { label: 'Анализ',     color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  completed:  { label: 'Завершён',   color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  canceled:   { label: 'Отменён',    color: 'bg-red-500/15 text-red-400 border-red-500/30' },
};

const INVITATION_META = {
  pending:   { label: 'Ожидает',       color: 'bg-gray-500/15 text-gray-400' },
  viewed:    { label: 'Просмотрено',   color: 'bg-blue-500/15 text-blue-400' },
  responded: { label: 'Ответил',       color: 'bg-emerald-500/15 text-emerald-400' },
  declined:  { label: 'Отклонил',      color: 'bg-red-500/15 text-red-400' },
};

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
 * Детали RFQ + приглашения + офферы + выбор победителя.
 *
 * @param {object} props
 * @param {string} props.rfqId
 * @param {string} props.companyId
 * @param {string} [props.role]
 * @param {Function} props.showNotification
 * @param {() => void} [props.onBack]
 * @param {(offer, rfq) => void} [props.onCreatePO]
 */
export default function RFQDetails({
  rfqId,
  companyId,
  role,
  showNotification,
  onBack,
  onCreatePO,
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
  const [rfq, setRfq] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 🆕 Модалка сравнения офферов
  const [comparisonOpen, setComparisonOpen] = useState(false);

    // 🆕 АВТОФОКУС НА СРАВНЕНИЕ ИЗ AI-АССИСТЕНТА
  useEffect(() => {
    const focusRfqId = localStorage.getItem('rfq_focus_compare');
    if (focusRfqId === rfqId && offers.length > 1) {
      setComparisonOpen(true);
      localStorage.removeItem('rfq_focus_compare');
    }
  }, [rfqId, offers.length]);

  // ─── Загрузка ──────────────────────────────────────────
  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!rfqId) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const [rfqData, invitationsData, offersData] = await Promise.all([
          getRFQById(rfqId),
          getRFQInvitations(rfqId).catch(() => []),
          getOffersForRFQ(rfqId).catch(() => []),
        ]);
        setRfq(rfqData);
        setInvitations(invitationsData || []);
        setOffers(offersData || []);
      } catch (err) {
        console.error('[RFQDetails] load error:', err);
        setError(err.message || 'Не удалось загрузить RFQ');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [rfqId]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ─── Статистика ────────────────────────────────────────
  const bestOffer = useMemo(() => {
    if (offers.length === 0) return null;
    return offers.reduce((best, o) => {
      if (!best) return o;
      return Number(o.total) < Number(best.total) ? o : best;
    }, null);
  }, [offers]);

  const status = rfq?.status || 'draft';
  const meta = STATUS_META[status] || STATUS_META.draft;
  const invitationsCount = invitations.length;
  const respondedCount = invitations.filter((i) => i.status === 'responded').length;

  // ─── Действия ──────────────────────────────────────────
  const handleAddSuppliers = async (picked) => {
    setSelectorOpen(false);
    if (!picked || picked.length === 0) return;

    setActionLoading(true);
    try {
      const supplierIds = picked.map((p) => p.id);
      await sendRFQToSuppliers(rfqId, supplierIds);
      notify(`✅ Приглашено ${picked.length} поставщиков`, 'success');
      await loadAll({ silent: true });
    } catch (err) {
      console.error('[RFQDetails] add suppliers error:', err);
      notify(err.message || 'Ошибка приглашения', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Отменить RFQ? Поставщики больше не смогут отправить предложения.')) return;
    setActionLoading(true);
    try {
      await updateRFQStatus(rfqId, 'canceled');
      notify('RFQ отменён', 'success');
      await loadAll({ silent: true });
    } catch (err) {
      console.error('[RFQDetails] cancel error:', err);
      notify(err.message || 'Ошибка отмены', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectOffer = async (offer) => {
    if (!window.confirm(
      `Выбрать предложение «${offer.suppliers?.name || 'поставщика'}» за ${formatPrice(offer.total)} ₽?\n\n` +
      'Остальные предложения будут отклонены, RFQ закроется.'
    )) return;

    setActionLoading(true);
    try {
      await selectOffer(rfqId, offer.id);
      notify('✅ Предложение выбрано', 'success');
      await loadAll({ silent: true });

      if (typeof onCreatePO === 'function') {
        onCreatePO(offer, rfq);
      }
    } catch (err) {
      console.error('[RFQDetails] select offer error:', err);
      notify(err.message || 'Ошибка выбора предложения', 'error');
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

  if (error || !rfq) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700 dark:text-red-400 font-medium">
              {error || 'RFQ не найден'}
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

  const items = Array.isArray(rfq.items) ? rfq.items : [];
  const canSelectNow = canEdit && status !== 'completed' && status !== 'canceled';

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
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {rfq.title}
                </h1>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${meta.color}`}>
                  {meta.label}
                </span>
              </div>
              {rfq.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {rfq.description}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Создан: {new Date(rfq.created_at).toLocaleString('ru-RU')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => loadAll({ silent: true })}
              disabled={refreshing}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
              title="Обновить"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {canEdit && status !== 'completed' && status !== 'canceled' && (
              <>
                <button
                  onClick={() => setSelectorOpen(true)}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#4A6572] text-[#4A6572] hover:bg-[#4A6572]/10 text-sm font-medium disabled:opacity-50 transition"
                >
                  <Plus className="w-4 h-4" />
                  Пригласить
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-sm font-medium disabled:opacity-50 transition"
                >
                  <Ban className="w-4 h-4" />
                  Отменить
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatBox icon={FileText} label="Позиций" value={items.length} color="text-blue-500" />
          <StatBox icon={Users} label="Приглашено" value={invitationsCount} color="text-purple-500" />
          <StatBox icon={MessageSquare} label="Ответили" value={`${respondedCount} / ${invitationsCount}`} color="text-amber-500" />
          <StatBox icon={Trophy} label="Лучшая цена" value={bestOffer ? formatPrice(bestOffer.total) + ' ₽' : '—'} color="text-emerald-500" />
        </div>

        {/* Основной контент */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* Условия */}
            <Card icon={Calendar} title="Условия">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <Field label="Адрес доставки" value={rfq.delivery_address} icon={MapPin} />
                <Field
                  label="Требуемая дата"
                  value={rfq.required_date ? new Date(rfq.required_date).toLocaleDateString('ru-RU') : null}
                  icon={Calendar}
                />
                <Field label="Оплата" value={rfq.payment_terms} icon={Banknote} />
                <Field
                  label="Срок приёма"
                  value={rfq.deadline ? new Date(rfq.deadline).toLocaleString('ru-RU') : null}
                  icon={Clock}
                />
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
                        <th className="py-2 px-2 font-medium w-[100px]">Артикул</th>
                        <th className="py-2 px-2 font-medium w-[100px] text-right">Кол-во</th>
                        <th className="py-2 px-2 font-medium w-[60px]">Ед.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {items.map((it, i) => (
                        <tr key={i} className="text-gray-900 dark:text-white">
                          <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                          <td className="py-2 px-2">{it.name}</td>
                          <td className="py-2 px-2">
                            {it.article ? (
                              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                {it.article}
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right">{formatQty(it.quantity)}</td>
                          <td className="py-2 px-2 text-gray-500 dark:text-gray-400">
                            {it.unit || 'шт'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Предложения */}
            <Card
              icon={Trophy}
              title={`Предложения (${offers.length})`}
              subtitle={offers.length > 1 ? undefined : 'Сортировка по возрастанию цены'}
              headerAction={
                offers.length > 1 ? (
                  <button
                    onClick={() => setComparisonOpen(true)}
                    className="flex items-center gap-1 text-[11px] font-medium text-[#4A6572] hover:text-[#344955] transition"
                  >
                    <BarChart3 className="w-3 h-3" />
                    Сравнить все
                  </button>
                ) : null
              }
            >
              {offers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  {invitationsCount === 0
                    ? 'Сначала пригласите поставщиков'
                    : 'Ожидаем ответы поставщиков'}
                </p>
              ) : (
                <div className="space-y-2">
                  {offers.map((offer, idx) => (
                    <OfferRow
                      key={offer.id}
                      offer={offer}
                      isBest={idx === 0}
                      canSelect={canSelectNow}
                      onSelect={() => handleSelectOffer(offer)}
                      loading={actionLoading}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Правая колонка */}
          <div className="space-y-4">
            <Card icon={Users} title={`Приглашения (${invitations.length})`}>
              {invitations.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Поставщики ещё не приглашены
                </p>
              ) : (
                <ul className="space-y-2">
                  {invitations.map((inv) => {
                    const sup = inv.suppliers;
                    const invMeta = INVITATION_META[inv.status] || INVITATION_META.pending;
                    return (
                      <li
                        key={inv.id}
                        className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                            {sup?.name || 'Поставщик'}
                          </span>
                          <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${invMeta.color}`}>
                            {invMeta.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {sup?.email || sup?.phone || '—'}
                          {inv.responded_at && (
                            <span className="ml-1">
                              · {new Date(inv.responded_at).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Селектор поставщиков */}
      <RFQSupplierSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        companyId={companyId}
        excludeSupplierIds={invitations.map((i) => i.supplier_id)}
        onConfirm={handleAddSuppliers}
      />

      {/* 🆕 Модалка сравнения офферов */}
      {comparisonOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] fade-enter overflow-y-auto">
          <div className="min-h-full p-4 md:p-6">
            <OfferComparison
              rfq={rfq}
              offers={offers}
              canSelect={canSelectNow}
              actionLoading={actionLoading}
              onSelect={(offer) => {
                setComparisonOpen(false);
                handleSelectOffer(offer);
              }}
              onBack={() => setComparisonOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── UI helpers ──────────────────────────────────────────
function StatBox({ icon: IconCmp, label, value, color = 'text-[#4A6572]' }) {
  const Icon = IconCmp;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="mt-1.5 text-lg font-bold text-gray-900 dark:text-white">
        {value}
      </div>
    </div>
  );
}

function Card({ icon: IconCmp, title, subtitle, headerAction, children }) {
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
        {(headerAction || subtitle) && (
          <div className="ml-auto flex items-center gap-2">
            {headerAction}
            {subtitle && (
              <span className="text-[11px] text-gray-400">{subtitle}</span>
            )}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, icon: IconCmp }) {
  const Icon = IconCmp;
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
        <div className="text-sm text-gray-900 dark:text-white truncate">
          {value || <span className="text-gray-400">—</span>}
        </div>
      </div>
    </div>
  );
}

function OfferRow({ offer, isBest, canSelect, onSelect, loading }) {
  const sup = offer.suppliers;
  const isSelected = offer.status === 'selected';
  const isRejected = offer.status === 'rejected';

  return (
    <div
      className={`p-3 rounded-lg border transition
        ${isSelected
          ? 'bg-emerald-500/5 border-emerald-500/40'
          : isRejected
            ? 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700 opacity-60'
            : isBest
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : 'bg-white dark:bg-gray-900/40 border-gray-200 dark:border-gray-700'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isBest && !isSelected && !isRejected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                <Trophy className="w-3 h-3" />
                ЛУЧШАЯ ЦЕНА
              </span>
            )}
            {isSelected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                ВЫБРАНО
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-500/15 text-gray-500">
                <X className="w-3 h-3" />
                ОТКЛОНЕНО
              </span>
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {sup?.name || 'Поставщик'}
            </span>
            {sup?.rating > 0 && (
              <span className="text-[10px] text-[#F9AA33]">
                ★ {Number(sup.rating).toFixed(1)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            {offer.delivery_days != null && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {offer.delivery_days} дн.
              </span>
            )}
            {offer.payment_terms && (
              <span className="flex items-center gap-1">
                <Banknote className="w-3 h-3" />
                {offer.payment_terms}
              </span>
            )}
            {offer.discount > 0 && (
              <span className="flex items-center gap-1 text-emerald-500">
                <TrendingDown className="w-3 h-3" />
                Скидка {formatPrice(offer.discount)} ₽
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-[#344955] dark:text-[#F9AA33]">
            {formatPrice(offer.total)} ₽
          </div>
          {offer.subtotal > 0 && offer.total !== offer.subtotal && (
            <div className="text-[11px] text-gray-400 line-through">
              {formatPrice(offer.subtotal)} ₽
            </div>
          )}
        </div>
      </div>

      {canSelect && !isSelected && !isRejected && (
        <button
          onClick={onSelect}
          disabled={loading}
          className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-xs font-medium disabled:opacity-50 transition"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Выбрать это предложение
        </button>
      )}
    </div>
  );
}