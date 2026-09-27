// src/components/Suppliers/Offers/OfferDetails.jsx
import {
  X, Building2, Star, Clock, Banknote, TrendingDown, Trophy,
  CheckCircle2, FileText, Percent, Mail, Phone,
} from 'lucide-react';

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
 * Модалка с деталями оффера.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object|null} props.offer
 * @param {object|null} props.rfq
 * @param {boolean} [props.canSelect]
 * @param {boolean} [props.actionLoading]
 * @param {() => void} props.onClose
 * @param {() => void} [props.onSelect]
 */
export default function OfferDetails({
  open,
  offer,
  rfq,
  canSelect,
  actionLoading,
  onClose,
  onSelect,
}) {
  if (!open || !offer) return null;

  const sup = offer.suppliers || {};
  const items = Array.isArray(offer.items) ? offer.items : [];
  const isSelected = offer.status === 'selected';
  const isRejected = offer.status === 'rejected';
  const hasDiscount = Number(offer.discount) > 0;
  const hasDelivery = Number(offer.delivery_cost) > 0;
  const hasVat = Number(offer.vat) > 0;

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
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-5 h-5 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold truncate">
                {sup.name || 'Поставщик'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-white/80 flex-wrap">
                {sup.rating > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-current" />
                    {Number(sup.rating).toFixed(1)}
                  </span>
                )}
                {sup.email && (
                  <span className="flex items-center gap-0.5">
                    <Mail className="w-3 h-3" />
                    <span className="truncate max-w-[180px]">{sup.email}</span>
                  </span>
                )}
                {sup.phone && (
                  <span className="flex items-center gap-0.5">
                    <Phone className="w-3 h-3" />
                    {sup.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition shrink-0"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Бейджи */}
          {(isSelected || isRejected) && (
            <div className="flex items-center gap-2">
              {isSelected && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ЭТО ПРЕДЛОЖЕНИЕ ВЫБРАНО
                </span>
              )}
              {isRejected && (
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-gray-500/15 text-gray-500">
                  <X className="w-3.5 h-3.5" />
                  ОТКЛОНЕНО
                </span>
              )}
            </div>
          )}

          {/* Условия */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {offer.delivery_days != null && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
                <Clock className="w-4 h-4 text-[#4A6572] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Срок поставки</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {offer.delivery_days} дн.
                  </div>
                </div>
              </div>
            )}
            {offer.payment_terms && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
                <Banknote className="w-4 h-4 text-[#4A6572] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Оплата</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {offer.payment_terms}
                  </div>
                </div>
              </div>
            )}
            {offer.valid_until && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700">
                <FileText className="w-4 h-4 text-[#4A6572] shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Действует до</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(offer.valid_until).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Позиции */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-[#4A6572]" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Позиции ({items.length})
              </h3>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                Нет позиций
              </p>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-2 w-[40px]">
                        #
                      </th>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-2">
                        Наименование
                      </th>
                      <th className="text-right font-medium text-gray-500 dark:text-gray-400 px-3 py-2 w-[90px]">
                        Кол-во
                      </th>
                      <th className="text-right font-medium text-gray-500 dark:text-gray-400 px-3 py-2 w-[100px]">
                        Цена
                      </th>
                      <th className="text-right font-medium text-gray-500 dark:text-gray-400 px-3 py-2 w-[110px]">
                        Итого
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {items.map((it, i) => {
                      const lineTotal = Number(it.total) ||
                        (Number(it.price) || 0) * (Number(it.quantity) || 0);
                      return (
                        <tr key={i} className="text-gray-900 dark:text-white">
                          <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                          <td className="px-3 py-2">
                            <div className="text-sm truncate max-w-[280px]">
                              {it.name}
                            </div>
                            {it.article && (
                              <div className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                                {it.article}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-xs text-gray-600 dark:text-gray-400">
                            {formatQty(it.quantity)} {it.unit || 'шт'}
                          </td>
                          <td className="px-3 py-2 text-right text-sm">
                            {formatPrice(it.price)} ₽
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-medium">
                            {formatPrice(lineTotal)} ₽
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Комментарий */}
          {offer.comment && (
            <div>
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                Комментарий поставщика
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {offer.comment}
              </div>
            </div>
          )}

          {/* Сводка */}
          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Подытог по позициям</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {formatPrice(offer.subtotal)} ₽
              </span>
            </div>
            {hasDiscount && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                  Скидка
                </span>
                <span className="text-emerald-500 font-medium">
                  − {formatPrice(offer.discount)} ₽
                </span>
              </div>
            )}
            {hasDelivery && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Percent className="w-3.5 h-3.5" />
                  Доставка
                </span>
                <span className="text-gray-900 dark:text-white font-medium">
                  + {formatPrice(offer.delivery_cost)} ₽
                </span>
              </div>
            )}
            {hasVat && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">НДС</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  + {formatPrice(offer.vat)} ₽
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                Итого
              </span>
              <span className="text-xl font-bold text-[#344955] dark:text-[#F9AA33]">
                {formatPrice(offer.total)} ₽
              </span>
            </div>
          </div>

          {/* Сравнение с RFQ */}
          {rfq && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Позиций в RFQ: {Array.isArray(rfq.items) ? rfq.items.length : 0}
              {items.length < (rfq.items?.length || 0) && (
                <span className="text-amber-500 ml-1">
                  (поставщик не ответил на {rfq.items.length - items.length} поз.)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
          >
            Закрыть
          </button>
          {canSelect && !isSelected && !isRejected && onSelect && (
            <button
              type="button"
              onClick={onSelect}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium disabled:opacity-50 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              Выбрать это предложение
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
