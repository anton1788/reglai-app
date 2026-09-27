// src/components/Suppliers/RFQ/RFQList.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Search, Filter, Loader2, AlertCircle, RefreshCw, X,
  FileText, Clock, Users, MessageSquare, TrendingDown, Building2,
  CheckCircle2, Ban, Send, BarChart3,
} from 'lucide-react';

import { getRFQList } from '../../../api/suppliers';
import { isProcurement } from '../../../utils/permissions';

// ─── Статусы RFQ ─────────────────────────────────────────
const STATUS_META = {
  draft:      { label: 'Черновик',    color: 'bg-gray-500/15 text-gray-400 border-gray-500/30',        icon: FileText },
  sent:       { label: 'Отправлен',   color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',         icon: Send },
  collecting: { label: 'Сбор',        color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',      icon: Clock },
  analyzing:  { label: 'Анализ',      color: 'bg-purple-500/15 text-purple-400 border-purple-500/30',   icon: BarChart3 },
  completed:  { label: 'Завершён',    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  canceled:   { label: 'Отменён',     color: 'bg-red-500/15 text-red-400 border-red-500/30',            icon: Ban },
};

const STATUS_FILTERS = [
  { value: '',           label: 'Все' },
  { value: 'draft',      label: 'Черновики' },
  { value: 'sent',       label: 'Отправленные' },
  { value: 'collecting', label: 'Сбор' },
  { value: 'analyzing',  label: 'Анализ' },
  { value: 'completed',  label: 'Завершённые' },
  { value: 'canceled',   label: 'Отменённые' },
];

const formatMoney = (value) => {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн ₽`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} тыс ₽`;
  return `${n.toLocaleString('ru-RU')} ₽`;
};

/**
 * Список запросов цен (RFQ).
 *
 * @param {object} props
 * @param {string} props.companyId
 * @param {string} [props.role]
 * @param {Function} props.showNotification
 * @param {() => void} [props.onCreate]
 * @param {(rfq) => void} [props.onOpen]
 */
export default function RFQList({
  companyId,
  role,
  showNotification,
  onCreate,
  onOpen,
}) {
  const canCreate = isProcurement(role) || role === 'supply_admin';

  // ─── Состояние ─────────────────────────────────────────
  const [rfqs, setRfqs] = useState([]);
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
  const loadRFQs = useCallback(
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

        const data = await getRFQList(companyId, filters);
        setRfqs(data || []);
      } catch (err) {
  console.error('[RFQList] load error:', err);
  const message = err.message || 'Не удалось загрузить RFQ';
  setError(message);
  setRfqs([]);
  if (typeof showNotification === 'function') {
    showNotification(message, 'error');
  }
} finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, statusFilter, searchTerm]
  );

  useEffect(() => {
    loadRFQs();
  }, [loadRFQs]);

  // ─── Счётчики по статусам ──────────────────────────────
  const counts = useMemo(() => {
    const c = { all: rfqs.length };
    for (const r of rfqs) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rfqs]);

  // ─── Рендер ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-[#4A6572]" />
              Запросы цен (RFQ)
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Запрашивайте цены у нескольких поставщиков и сравнивайте предложения
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadRFQs({ silent: true })}
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
                Создать RFQ
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
                placeholder="Поиск по названию…"
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
              onClick={() => loadRFQs()}
              className="mt-3 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition"
            >
              Повторить
            </button>
          </div>
        ) : rfqs.length === 0 ? (
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {rfqs.map((rfq) => (
              <RFQCard
                key={rfq.id}
                rfq={rfq}
                onOpen={onOpen ? () => onOpen(rfq) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Карточка RFQ ────────────────────────────────────────
function RFQCard({ rfq, onOpen }) {
  const meta = STATUS_META[rfq.status] || STATUS_META.draft;
  const StatusIcon = meta.icon;
  const itemsCount = Array.isArray(rfq.items) ? rfq.items.length : 0;
  const invitationsCount = rfq.invitations_count || 0;
  const offersCount = rfq.offers_count || 0;
  const bestTotal = rfq.best_offer_total;

  const deadline = rfq.deadline ? new Date(rfq.deadline) : null;
  const isExpired = deadline && deadline < new Date();

  return (
    <div
      onClick={onOpen}
      className={`group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
        hover:border-[#F9AA33]/50 hover:shadow-lg transition-all duration-200 p-4
        ${onOpen ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 shrink-0 rounded-lg bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center">
          <StatusIcon className="w-5 h-5 text-[#4A6572] dark:text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {rfq.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {new Date(rfq.created_at).toLocaleString('ru-RU', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })}
          </p>
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${meta.color}`}>
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <StatCard icon={FileText} label="Позиций" value={itemsCount} />
        <StatCard icon={Users} label="Приглашено" value={invitationsCount} />
        <StatCard icon={MessageSquare} label="Офферов" value={offersCount} />
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          {deadline && (
            <span className={isExpired ? 'text-red-500' : ''}>
              ⏰ {deadline.toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
        {bestTotal ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
            <TrendingDown className="w-3.5 h-3.5" />
            Лучшая: {formatMoney(bestTotal)}
          </div>
        ) : offersCount === 0 && invitationsCount > 0 ? (
          <span className="text-xs text-gray-400">Ожидаем ответы</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Мини-стат ───────────────────────────────────────────
function StatCard({ icon: IconCmp, label, value }) {
  const Icon = IconCmp;
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-900/40">
      <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{label}</div>
        <div className="text-xs font-semibold text-gray-900 dark:text-white">{value}</div>
      </div>
    </div>
  );
}

// ─── Пустое состояние ────────────────────────────────────
function EmptyState({ hasFilters, canCreate, onCreate, onReset }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center mx-auto mb-4">
        <MessageSquare className="w-8 h-8 text-[#4A6572]" />
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
            Пока нет запросов цен
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            {canCreate
              ? 'Создайте RFQ, отправьте нескольким поставщикам и сравните предложения в одном месте'
              : 'Запросы цен ещё не созданы'}
          </p>
          {canCreate && onCreate && (
            <button
              onClick={onCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              Создать первый RFQ
            </button>
          )}
        </>
      )}
    </div>
  );
}
