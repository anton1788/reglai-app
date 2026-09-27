// src/components/Suppliers/Offers/OfferCard.jsx
import {
  Building2, Star, Clock, Banknote, TrendingDown, Trophy,
  CheckCircle2, X, ArrowRight, Percent,
} from 'lucide-react';

const formatPrice = (v) =>
  (Number(v) || 0).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Компактная карточка оффера поставщика.
 *
 * @param {object} props
 * @param {object} props.offer
 * @param {boolean} [props.isBest]
 * @param {boolean} [props.canSelect]
 * @param {boolean} [props.actionLoading]
 * @param {() => void} [props.onSelect]
 * @param {() => void} [props.onOpenDetails]
 */
export default function OfferCard({
  offer,
  isBest,
  canSelect,
  actionLoading,
  onSelect,
  onOpenDetails,
}) {
  const sup = offer.suppliers || {};
  const isSelected = offer.status === 'selected';
  const isRejected = offer.status === 'rejected';
  const hasDiscount = Number(offer.discount) > 0;

  return (
    <div
      className={`group bg-white dark:bg-gray-800 rounded-xl border transition-all duration-200 p-4
        ${
          isSelected
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : isRejected
              ? 'border-gray-200 dark:border-gray-700 opacity-60'
              : isBest
                ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 hover:shadow-lg'
                : 'border-gray-200 dark:border-gray-700 hover:border-[#F9AA33]/50 hover:shadow-lg'
        }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 shrink-0 rounded-lg bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-[#4A6572] dark:text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            {isBest && !isSelected && !isRejected && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-500">
                <Trophy className="w-2.5 h-2.5" />
                ЛУЧШАЯ ЦЕНА
              </span>
            )}
            {isSelected && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-2.5 h-2.5" />
                ВЫБРАНО
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-500/15 text-gray-500">
                <X className="w-2.5 h-2.5" />
                ОТКЛОНЕНО
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
            {sup.name || 'Поставщик'}
          </h3>
          {sup.rating > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              <Star className="w-3 h-3 fill-[#F9AA33] text-[#F9AA33]" />
              <span>{Number(sup.rating).toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Цена */}
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">
          Итого
        </div>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-bold text-[#344955] dark:text-[#F9AA33]">
            {formatPrice(offer.total)} ₽
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(offer.subtotal)} ₽
            </span>
          )}
        </div>
      </div>

      {/* Условия */}
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 mb-3">
        {offer.delivery_days != null && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Доставка {offer.delivery_days} дн.</span>
          </div>
        )}
        {offer.payment_terms && (
          <div className="flex items-center gap-1.5">
            <Banknote className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{offer.payment_terms}</span>
          </div>
        )}
        {hasDiscount && (
          <div className="flex items-center gap-1.5 text-emerald-500">
            <TrendingDown className="w-3.5 h-3.5 shrink-0" />
            <span>Скидка {formatPrice(offer.discount)} ₽</span>
          </div>
        )}
        {Number(offer.delivery_cost) > 0 && (
          <div className="flex items-center gap-1.5">
            <Percent className="w-3.5 h-3.5 shrink-0" />
            <span>Доставка {formatPrice(offer.delivery_cost)} ₽</span>
          </div>
        )}
      </div>

      {/* Действия */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        {onOpenDetails && (
          <button
            onClick={onOpenDetails}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium transition"
          >
            Подробнее
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
        {canSelect && !isSelected && !isRejected && onSelect && (
          <button
            onClick={onSelect}
            disabled={actionLoading}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-xs font-medium disabled:opacity-50 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Выбрать
          </button>
        )}
      </div>
    </div>
  );
}
