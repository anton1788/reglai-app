// src/components/Suppliers/Offers/OfferComparison.jsx
import { useState, useMemo } from 'react';
import {
  ArrowLeft, Loader2, AlertCircle, Trophy, TrendingDown, CheckCircle2,
  Table2, LayoutGrid, ArrowUpDown, Building2, Clock, Banknote, X,
} from 'lucide-react';

import OfferCard from './OfferCard';
import OfferDetails from './OfferDetails';

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
 * Сравнение офферов по RFQ.
 *
 * @param {object} props
 * @param {object} props.rfq
 * @param {Array} props.offers — массив офферов из getOffersForRFQ
 * @param {boolean} [props.canSelect] — может ли текущий пользователь выбрать оффер
 * @param {boolean} [props.loading]
 * @param {boolean} [props.actionLoading]
 * @param {(offer) => void} [props.onSelect] — колбэк выбора оффера
 * @param {() => void} [props.onBack]
 * @param {() => void} [props.onRefresh]
 */
export default function OfferComparison({
  rfq,
  offers = [],
  canSelect = false,
  loading = false,
  actionLoading = false,
  onSelect,
  onBack,
  onRefresh,
}) {
  const [view, setView] = useState('matrix'); // matrix | cards
  const [sortBy, setSortBy] = useState('price_asc'); // price_asc | price_desc | rating_desc | delivery_asc
  const [detailsOffer, setDetailsOffer] = useState(null);

  // ─── Сортировка офферов ────────────────────────────────
  const sortedOffers = useMemo(() => {
    const arr = [...offers];
    switch (sortBy) {
      case 'price_desc':
        return arr.sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
      case 'rating_desc':
        return arr.sort((a, b) => {
          const ra = Number(a.suppliers?.rating || 0);
          const rb = Number(b.suppliers?.rating || 0);
          return rb - ra;
        });
      case 'delivery_asc':
        return arr.sort((a, b) => {
          const da = a.delivery_days == null ? Infinity : Number(a.delivery_days);
          const db = b.delivery_days == null ? Infinity : Number(b.delivery_days);
          return da - db;
        });
      case 'price_asc':
      default:
        return arr.sort((a, b) => Number(a.total || 0) - Number(b.total || 0));
    }
  }, [offers, sortBy]);

  // ─── Лучший оффер ──────────────────────────────────────
  const bestOfferId = useMemo(() => {
    if (offers.length === 0) return null;
    let best = offers[0];
    for (const o of offers) {
      if (Number(o.total) < Number(best.total)) best = o;
    }
    return best.id;
  }, [offers]);

  // ─── Строки матрицы (позиции RFQ) ──────────────────────
  const itemRows = useMemo(() => {
    if (!rfq || !Array.isArray(rfq.items)) return [];
    // Собираем по индексам: [{name, article, unit, quantity, prices: {offerId: price}}]
    return rfq.items.map((it, idx) => {
      const prices = {};
      let minPrice = null;
      for (const offer of offers) {
        const offerItem = Array.isArray(offer.items) ? offer.items[idx] : null;
        const p = offerItem ? Number(offerItem.price) || 0 : null;
        prices[offer.id] = p;
        if (p != null && p > 0 && (minPrice == null || p < minPrice)) {
          minPrice = p;
        }
      }
      return {
        idx,
        name: it.name,
        article: it.article || null,
        unit: it.unit || 'шт',
        quantity: Number(it.quantity) || 0,
        prices,
        minPrice,
      };
    });
  }, [rfq, offers]);

  // ─── Рендер ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700 dark:text-red-400 font-medium">
              RFQ не найден
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-[#F9AA33]" />
                Сравнение предложений
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {rfq.title} · {offers.length} предложен
                {offers.length % 10 === 1 && offers.length % 100 !== 11 ? 'ие' : 'ий'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title="Обновить"
              >
                <Loader2 className="w-4 h-4 hidden" />
                <span className="text-sm">Обновить</span>
              </button>
            )}

            {/* Переключатель view */}
            <div className="flex items-center rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setView('matrix')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition
                  ${
                    view === 'matrix'
                      ? 'bg-[#4A6572] text-white'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                Матрица
              </button>
              <button
                onClick={() => setView('cards')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition
                  ${
                    view === 'cards'
                      ? 'bg-[#4A6572] text-white'
                      : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Карточки
              </button>
            </div>
          </div>
        </div>

        {/* Пусто */}
        {offers.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Сортировка (для карточек) */}
            {view === 'cards' && (
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Сортировка:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                >
                  <option value="price_asc">Цена ↑</option>
                  <option value="price_desc">Цена ↓</option>
                  <option value="rating_desc">Рейтинг поставщика</option>
                  <option value="delivery_asc">Срок доставки</option>
                </select>
              </div>
            )}

            {view === 'matrix' ? (
              <MatrixView
                itemRows={itemRows}
                offers={sortedOffers}
                bestOfferId={bestOfferId}
                canSelect={canSelect}
                actionLoading={actionLoading}
                onSelect={onSelect}
                onOpenDetails={setDetailsOffer}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    isBest={offer.id === bestOfferId}
                    canSelect={canSelect}
                    actionLoading={actionLoading}
                    onSelect={onSelect ? () => onSelect(offer) : undefined}
                    onOpenDetails={() => setDetailsOffer(offer)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Модалка деталей */}
      <OfferDetails
        open={!!detailsOffer}
        offer={detailsOffer}
        rfq={rfq}
        canSelect={canSelect}
        actionLoading={actionLoading}
        onClose={() => setDetailsOffer(null)}
        onSelect={
          onSelect
            ? () => {
                const off = detailsOffer;
                setDetailsOffer(null);
                onSelect(off);
              }
            : undefined
        }
      />
    </div>
  );
}

// ─── Матрица ─────────────────────────────────────────────
function MatrixView({
  itemRows,
  offers,
  bestOfferId,
  canSelect,
  actionLoading,
  onSelect,
  onOpenDetails,
}) {
  if (offers.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          {/* Header */}
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/50 text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-3 min-w-[220px]">
                Позиция
              </th>
              {offers.map((offer) => {
                const sup = offer.suppliers || {};
                const isBest = offer.id === bestOfferId;
                const isSelected = offer.status === 'selected';
                return (
                  <th
                    key={offer.id}
                    className={`px-3 py-3 text-center font-medium min-w-[170px] align-top
                      ${isBest ? 'bg-emerald-500/5' : ''}`}
                  >
                    <button
                      onClick={() => onOpenDetails(offer)}
                      className="w-full text-center hover:opacity-80 transition"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 flex-wrap justify-center">
                          {isBest && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                              <Trophy className="w-2.5 h-2.5" />
                              ЛУЧШАЯ
                            </span>
                          )}
                          {isSelected && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              ВЫБРАНО
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2">
                          {sup.name || 'Поставщик'}
                        </span>
                        {sup.rating > 0 && (
                          <span className="text-[10px] text-[#F9AA33]">
                            ★ {Number(sup.rating).toFixed(1)}
                          </span>
                        )}
                        <div className="flex flex-col gap-0.5 text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                          {offer.delivery_days != null && (
                            <span className="flex items-center gap-0.5 justify-center">
                              <Clock className="w-2.5 h-2.5" />
                              {offer.delivery_days} дн.
                            </span>
                          )}
                          {offer.payment_terms && (
                            <span className="truncate max-w-[150px]">
                              {offer.payment_terms}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Items */}
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {itemRows.map((row) => (
              <tr
                key={row.idx}
                className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30"
              >
                <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-2 align-top">
                  <div className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2">
                    {row.idx + 1}. {row.name}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {row.article && (
                      <span className="font-mono mr-1">{row.article}</span>
                    )}
                    <span>
                      {formatQty(row.quantity)} {row.unit}
                    </span>
                  </div>
                </td>
                {offers.map((offer) => {
                  const p = row.prices[offer.id];
                  const isBestPrice = p != null && row.minPrice != null && p === row.minPrice;
                  const isMissing = p == null || p <= 0;
                  return (
                    <td
                      key={offer.id}
                      className={`px-3 py-2 text-center align-top
                        ${isBestPrice ? 'bg-emerald-500/5' : ''}`}
                    >
                      {isMissing ? (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      ) : (
                        <div
                          className={`text-sm font-medium
                            ${
                              isBestPrice
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-gray-900 dark:text-white'
                            }`}
                        >
                          {formatPrice(p)} ₽
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>

          {/* Summary */}
          <tfoot className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-gray-200 dark:border-gray-700">
            <SummaryRow label="Подытог по позициям" offers={offers} getValue={(o) => o.subtotal} bestOfferId={bestOfferId} />
            <SummaryRow label="Скидка" offers={offers} getValue={(o) => (Number(o.discount) || 0) > 0 ? -o.discount : null} bestOfferId={bestOfferId} muted />
            <SummaryRow label="Доставка" offers={offers} getValue={(o) => (Number(o.delivery_cost) || 0) > 0 ? o.delivery_cost : null} bestOfferId={bestOfferId} muted />
            <SummaryRow label="НДС" offers={offers} getValue={(o) => (Number(o.vat) || 0) > 0 ? o.vat : null} bestOfferId={bestOfferId} muted />
            <tr className="border-t border-gray-200 dark:border-gray-700">
              <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/50 px-3 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                Итого
              </td>
              {offers.map((offer) => {
                const isBest = offer.id === bestOfferId;
                const isSelected = offer.status === 'selected';
                return (
                  <td
                    key={offer.id}
                    className={`px-3 py-3 text-center ${isBest ? 'bg-emerald-500/5' : ''}`}
                  >
                    <div
                      className={`text-base font-bold
                        ${
                          isBest
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[#344955] dark:text-[#F9AA33]'
                        }`}
                    >
                      {formatPrice(offer.total)} ₽
                    </div>
                    {canSelect && !isSelected && offer.status !== 'rejected' && onSelect && (
                      <button
                        onClick={() => onSelect(offer)}
                        disabled={actionLoading}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-[11px] font-medium disabled:opacity-50 transition"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Выбрать
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function SummaryRow({ label, offers, getValue, bestOfferId, muted = false }) {
  const values = offers.map(getValue);
  const allEmpty = values.every((v) => v == null || v === 0);
  if (allEmpty) return null;

  return (
    <tr>
      <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900/50 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
        {label}
      </td>
      {offers.map((offer, i) => {
        const v = values[i];
        const isBest = offer.id === bestOfferId;
        return (
          <td
            key={offer.id}
            className={`px-3 py-2 text-center text-xs ${isBest ? 'bg-emerald-500/5' : ''} ${
              muted ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'
            }`}
          >
            {v == null || v === 0 ? (
              <span className="text-gray-300 dark:text-gray-600">—</span>
            ) : v < 0 ? (
              `− ${formatPrice(Math.abs(v))} ₽`
            ) : (
              `${formatPrice(v)} ₽`
            )}
          </td>
        );
      })}
    </tr>
  );
}

// ─── Пустое состояние ────────────────────────────────────
function EmptyState() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center mx-auto mb-4">
        <TrendingDown className="w-8 h-8 text-[#4A6572]" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        Пока нет предложений
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
        Дождитесь ответов от поставщиков или отправьте приглашения на странице RFQ
      </p>
    </div>
  );
}
