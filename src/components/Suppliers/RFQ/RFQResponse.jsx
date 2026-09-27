// src/components/Suppliers/RFQ/RFQResponse.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  Loader2, AlertCircle, Send, Calendar, MapPin,
  Banknote, Clock, FileText, Info, ArrowLeft, Percent,
} from 'lucide-react';

import { getRFQById, submitOffer } from '../../../api/suppliers';

const formatQty = (v) => {
  const n = Number(v) || 0;
  return Number.isInteger(n) ? n.toLocaleString('ru-RU') : n.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
};

const formatPrice = (v) =>
  (Number(v) || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Сторона поставщика: просмотр RFQ + форма отправки оффера.
 *
 * @param {object} props
 * @param {string} props.rfqId
 * @param {string} props.supplierId
 * @param {string} [props.supplierUserId]
 * @param {Function} props.showNotification
 * @param {(offer) => void} props.onSubmitted
 * @param {() => void} [props.onBack]
 */
export default function RFQResponse({
  rfqId,
  supplierId,
  supplierUserId,
  showNotification,
  onSubmitted,
  onBack,
}) {
  const notify = (msg, type = 'info') => {
    if (typeof showNotification === 'function') showNotification(msg, type);
    else console.log(`[${type}] ${msg}`);
  };

  // ─── Состояние ─────────────────────────────────────────
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [prices, setPrices] = useState([]);

  const [deliveryCost, setDeliveryCost] = useState('');
  const [discount, setDiscount] = useState('');
  const [vat, setVat] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [comment, setComment] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // ─── Загрузка RFQ ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!rfqId) {
        setError('Не передан rfqId');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getRFQById(rfqId);
        if (cancelled) return;
        setRfq(data);
        const items = Array.isArray(data?.items) ? data.items : [];
        setPrices(
          items.map((it) => ({
            name: it.name,
            article: it.article || null,
            quantity: Number(it.quantity) || 0,
            unit: it.unit || 'шт',
            price: '',
          }))
        );
      } catch (err) {
        console.error('[RFQResponse] load error:', err);
        if (!cancelled) setError(err.message || 'Не удалось загрузить RFQ');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [rfqId]);

  // ─── Авторасчёт итогов ─────────────────────────────────
  const subtotal = useMemo(() => {
    return prices.reduce((sum, p) => {
      const price = Number(p.price) || 0;
      const qty = Number(p.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [prices]);

  const discountNum = Number(discount) || 0;
  const deliveryNum = Number(deliveryCost) || 0;
  const vatNum = Number(vat) || 0;

  const total = useMemo(() => {
    return Math.max(0, subtotal - discountNum + deliveryNum + vatNum);
  }, [subtotal, discountNum, deliveryNum, vatNum]);

  // ─── Работа с ценами ───────────────────────────────────
  const updatePrice = (idx, value) => {
    setPrices((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, price: value } : p))
    );
  };

  const fillAllPrices = (value) => {
    setPrices((prev) => prev.map((p) => ({ ...p, price: String(value) })));
  };

  // ─── Валидация ─────────────────────────────────────────
  const validate = () => {
    const missing = prices.filter((p) => !p.price || Number(p.price) <= 0);
    if (missing.length > 0) {
      notify(`Заполните цену для всех позиций (не хватает ${missing.length})`, 'error');
      return false;
    }
    return true;
  };

  // ─── Отправка оффера ───────────────────────────────────
  const buildOfferItems = () => {
    return prices.map((p) => ({
      name: p.name,
      article: p.article,
      quantity: Number(p.quantity) || 0,
      unit: p.unit,
      price: Number(p.price) || 0,
      total: (Number(p.price) || 0) * (Number(p.quantity) || 0),
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const offer = await submitOffer({
        rfq_id: rfqId,
        supplier_id: supplierId,
        supplier_user_id: supplierUserId || null,
        items: buildOfferItems(),
        subtotal,
        discount: discountNum,
        delivery_cost: deliveryNum,
        vat: vatNum,
        total,
        delivery_days: deliveryDays === '' ? null : Number(deliveryDays),
        payment_terms: paymentTerms.trim() || null,
        comment: comment.trim() || null,
      });

      notify('✅ Предложение отправлено', 'success');
      if (typeof onSubmitted === 'function') onSubmitted(offer);
    } catch (err) {
      console.error('[RFQResponse] submit error:', err);
      notify(err.message || 'Ошибка отправки', 'error');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Ответ на запрос цен
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {rfq.title}
            </p>
          </div>
        </div>

        {/* Условия RFQ */}
        <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
              Условия запроса
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <InfoRow icon={MapPin} label="Адрес доставки" value={rfq.delivery_address} />
            <InfoRow
              icon={Calendar}
              label="Требуемая дата"
              value={rfq.required_date ? new Date(rfq.required_date).toLocaleDateString('ru-RU') : null}
            />
            <InfoRow icon={Banknote} label="Оплата" value={rfq.payment_terms} />
            <InfoRow
              icon={Clock}
              label="Срок приёма"
              value={rfq.deadline ? new Date(rfq.deadline).toLocaleString('ru-RU') : null}
            />
          </div>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Позиции */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[#4A6572]" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                  Ваши цены ({prices.length})
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Заполнить все"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      fillAllPrices(e.target.value);
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value && Number(e.target.value) > 0) {
                      fillAllPrices(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-[110px] px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                />
              </div>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                В запросе нет позиций
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                      <th className="py-2 px-2 font-medium w-[40px]">#</th>
                      <th className="py-2 px-2 font-medium">Наименование</th>
                      <th className="py-2 px-2 font-medium w-[100px] text-right">Кол-во</th>
                      <th className="py-2 px-2 font-medium w-[60px]">Ед.</th>
                      <th className="py-2 px-2 font-medium w-[120px] text-right">Цена за ед., ₽</th>
                      <th className="py-2 px-2 font-medium w-[120px] text-right">Итого</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {prices.map((p, i) => {
                      const lineTotal =
                        (Number(p.price) || 0) * (Number(p.quantity) || 0);
                      return (
                        <tr key={i}>
                          <td className="py-2 px-2 text-gray-400">{i + 1}</td>
                          <td className="py-2 px-2">
                            <div className="text-gray-900 dark:text-white truncate max-w-[260px]">
                              {p.name}
                            </div>
                            {p.article && (
                              <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                                {p.article}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-300">
                            {formatQty(p.quantity)}
                          </td>
                          <td className="py-2 px-2 text-gray-500 dark:text-gray-400">
                            {p.unit}
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={p.price}
                              onChange={(e) => updatePrice(i, e.target.value)}
                              placeholder="0.00"
                              className="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-right text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                            />
                          </td>
                          <td className="py-2 px-2 text-right font-medium text-gray-900 dark:text-white">
                            {lineTotal > 0 ? formatPrice(lineTotal) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Итоги */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center">
                <Percent className="w-4 h-4 text-[#4A6572]" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                Условия предложения
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <NumberField label="Стоимость доставки, ₽" value={deliveryCost} onChange={setDeliveryCost} />
              <NumberField label="Скидка, ₽" value={discount} onChange={setDiscount} />
              <NumberField label="НДС, ₽" value={vat} onChange={setVat} />
              <NumberField label="Срок поставки, дней" value={deliveryDays} onChange={setDeliveryDays} integer />
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Условия оплаты
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Например: 50% предоплата, остальное при получении"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Комментарий
                </label>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Примечания к предложению, гарантии, сроки…"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50 resize-none"
                />
              </div>
            </div>

            {/* Сводка */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
              <SummaryRow label="Подытог по позициям" value={subtotal} />
              {discountNum > 0 && (
                <SummaryRow label="Скидка" value={-discountNum} muted />
              )}
              {deliveryNum > 0 && (
                <SummaryRow label="Доставка" value={deliveryNum} muted />
              )}
              {vatNum > 0 && (
                <SummaryRow label="НДС" value={vatNum} muted />
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Итого
                </span>
                <span className="text-xl font-bold text-[#344955] dark:text-[#F9AA33]">
                  {formatPrice(total)} ₽
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-gray-50 dark:bg-gray-900 py-4 -mx-4 md:-mx-0 px-4 md:px-0 md:static md:bg-transparent md:py-0 md:border-0 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Отправка…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Отправить предложение
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── UI helpers ──────────────────────────────────────────
function InfoRow({ icon: IconCmp, label, value }) {
  const Icon = IconCmp;
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[11px] text-blue-900/70 dark:text-blue-200/70">{label}</div>
        <div className="text-sm text-blue-900 dark:text-blue-100 truncate">
          {value || <span className="opacity-50">—</span>}
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, integer = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </label>
      <input
        type="number"
        min="0"
        step={integer ? '1' : '0.01'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
      />
    </div>
  );
}

function SummaryRow({ label, value, muted = false }) {
  const n = Number(value) || 0;
  const display = n < 0 ? `− ${formatPrice(Math.abs(n))} ₽` : `${formatPrice(n)} ₽`;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}>
        {label}
      </span>
      <span className={muted ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}>
        {display}
      </span>
    </div>
  );
}