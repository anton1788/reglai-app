// src/components/Suppliers/Orders/PurchaseOrderForm.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Plus, Trash2, Loader2, Save, Package, FileText,
  MapPin, Calendar, Truck, Building2, AlertCircle, X, Info,
} from 'lucide-react';

import { createPurchaseOrder, getSuppliers } from '../../../api/suppliers';

const UNIT_OPTIONS = ['шт', 'м', 'м²', 'м³', 'кг', 'т', 'л', 'уп', 'рул', 'компл', 'лист'];

const EMPTY_ITEM = {
  name: '',
  article: '',
  quantity: 1,
  unit: 'шт',
  price: '',
  total: 0,
};

const formatPrice = (v) =>
  (Number(v) || 0).toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * Форма создания заказа поставщику.
 *
 * @param {object} props
 * @param {string} props.companyId
 * @param {string} props.userId
 * @param {object} [props.fromOffer] — оффер из RFQ (для предзаполнения)
 * @param {object} [props.fromRFQ]
 * @param {string} [props.preselectedSupplierId]
 * @param {Function} props.showNotification
 * @param {(order) => void} props.onCreated
 * @param {() => void} [props.onCancel]
 */
export default function PurchaseOrderForm({
  companyId,
  userId,
  fromOffer = null,
  fromRFQ = null,
  preselectedSupplierId = null,
  showNotification,
  onCreated,
  onCancel,
}) {
  const notify = (msg, type = 'info') => {
    if (typeof showNotification === 'function') showNotification(msg, type);
    else console.log(`[${type}] ${msg}`);
  };

  // ─── Состояние ─────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [supplierId, setSupplierId] = useState(
    fromOffer?.supplier_id || preselectedSupplierId || ''
  );

  const [items, setItems] = useState(() => {
    if (fromOffer && Array.isArray(fromOffer.items) && fromOffer.items.length > 0) {
      return fromOffer.items.map((it) => ({
        name: it.name || '',
        article: it.article || '',
        quantity: Number(it.quantity) || 1,
        unit: it.unit || 'шт',
        price: String(Number(it.price) || 0),
        total: (Number(it.price) || 0) * (Number(it.quantity) || 0),
      }));
    }
    return [{ ...EMPTY_ITEM }];
  });

  const [deliveryAddress, setDeliveryAddress] = useState(
    fromRFQ?.delivery_address || ''
  );
  const [expectedDelivery, setExpectedDelivery] = useState(() => {
    // Если у оффера есть delivery_days — посчитаем дату
    if (fromOffer?.delivery_days) {
      const d = new Date();
      d.setDate(d.getDate() + Number(fromOffer.delivery_days));
      return d.toISOString().slice(0, 10);
    }
    return '';
  });
  const [trackingNumber, setTrackingNumber] = useState('');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ─── Загрузка поставщиков ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (fromOffer) {
        // Если создаём из оффера — список поставщиков не нужен
        setLoadingSuppliers(false);
        return;
      }
      if (!companyId) {
        setLoadingSuppliers(false);
        return;
      }
      setLoadingSuppliers(true);
      try {
        const data = await getSuppliers(companyId, { status: 'active' });
        if (!cancelled) setSuppliers(data || []);
      } catch (err) {
        console.error('[POForm] suppliers load error:', err);
        if (!cancelled) setSuppliers([]);
      } finally {
        if (!cancelled) setLoadingSuppliers(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyId, fromOffer]);

  // ─── Резолв ошибок ─────────────────────────────────────
  const clearError = (key) => {
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // ─── Работа с позициями ────────────────────────────────
  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };
  const updateItem = (idx, key, value) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, [key]: value };
        if (key === 'quantity' || key === 'price') {
          next.total = (Number(next.price) || 0) * (Number(next.quantity) || 0);
        }
        return next;
      })
    );
    if (key === 'name') clearError('items');
  };

  // ─── Итоговая сумма ────────────────────────────────────
  const total = useMemo(() => {
    return items.reduce((sum, it) => {
      const price = Number(it.price) || 0;
      const qty = Number(it.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [items]);

  // ─── Валидация ─────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!supplierId && !fromOffer) e.supplier = 'Выберите поставщика';
    const validItems = items.filter(
      (it) => it.name.trim() && Number(it.quantity) > 0 && Number(it.price) >= 0
    );
    if (validItems.length === 0) e.items = 'Добавьте хотя бы одну валидную позицию';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Создание заказа ───────────────────────────────────
  const buildPayload = () => {
    const validItems = items
      .filter((it) => it.name.trim() && Number(it.quantity) > 0)
      .map((it) => {
        const price = Number(it.price) || 0;
        const qty = Number(it.quantity) || 0;
        return {
          name: it.name.trim(),
          article: it.article?.trim() || null,
          quantity: qty,
          unit: it.unit || 'шт',
          price,
          total: price * qty,
        };
      });

    return {
      company_id: companyId,
      supplier_id: supplierId || fromOffer?.supplier_id || null,
      offer_id: fromOffer?.id || null,
      rfq_id: fromRFQ?.id || fromOffer?.rfq_id || null,
      // order_number — генерируется триггером БД
      items: validItems,
      total,
      status: 'created',
      payment_status: 'unpaid',
      expected_delivery: expectedDelivery || null,
      delivery_address: deliveryAddress.trim() || null,
      tracking_number: trackingNumber.trim() || null,
      created_by: userId,
    };
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!validate()) return;

    setSaving(true);
    try {
      const order = await createPurchaseOrder(buildPayload());
      notify(`✅ Заказ ${order.order_number || ''} создан`, 'success');
      if (typeof onCreated === 'function') onCreated(order);
    } catch (err) {
      console.error('[POForm] create error:', err);
      notify(err.message || 'Ошибка создания заказа', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Рендер ────────────────────────────────────────────
  const isFromOffer = Boolean(fromOffer);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              aria-label="Назад"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Новый заказ поставщику
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isFromOffer
                ? 'Создание из выбранного предложения RFQ'
                : 'Заполните информацию о заказе'}
            </p>
          </div>
        </div>

        {/* Инфо о связи с RFQ */}
        {isFromOffer && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/30">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              Заказ создаётся из предложения поставщика{' '}
              <strong>{fromOffer.suppliers?.name || 'без имени'}</strong>
              {fromRFQ && (
                <>
                  {' '}по запросу <strong>«{fromRFQ.title}»</strong>
                </>
              )}
              . Позиции и цены предзаполнены.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Основное */}
          <Section icon={Info} title="Основное">
            <div className="space-y-3">
              {/* Поставщик */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Поставщик <span className="text-red-500">*</span>
                </label>
                {isFromOffer ? (
                  <div className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-sm text-gray-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {fromOffer.suppliers?.name || '—'}
                  </div>
                ) : loadingSuppliers ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка поставщиков…
                  </div>
                ) : (
                  <select
                    value={supplierId}
                    onChange={(e) => { setSupplierId(e.target.value); clearError('supplier'); }}
                    className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white
                      ${errors.supplier ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                      focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50`}
                  >
                    <option value="">— Выберите поставщика —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.inn ? ` · ИНН ${s.inn}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {errors.supplier && <p className="text-xs text-red-500 mt-1">{errors.supplier}</p>}
              </div>
            </div>
          </Section>

          {/* Условия */}
          <Section icon={Truck} title="Условия доставки">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  <MapPin className="inline w-3 h-3 mr-1" />
                  Адрес доставки
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="г. Москва, ул. Строителей, 5"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  <Calendar className="inline w-3 h-3 mr-1" />
                  Ожидаемая дата поставки
                </label>
                <input
                  type="date"
                  value={expectedDelivery}
                  onChange={(e) => setExpectedDelivery(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Трекинг-номер (опционально)
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Например: TRK-1234567890"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50 font-mono"
                />
              </div>
            </div>
          </Section>

          {/* Позиции */}
          <Section icon={FileText} title={`Позиции (${items.length})`}>
            {errors.items && (
              <div className="mb-3 flex items-start gap-2 p-2 rounded bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400">{errors.items}</p>
              </div>
            )}

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 space-y-2"
                >
                  {/* Первая строка: название + удалить */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        placeholder="Наименование *"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                      />
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="shrink-0 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-30 transition"
                      aria-label="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Вторая строка: артикул / кол-во / ед / цена / сумма */}
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      value={it.article}
                      onChange={(e) => updateItem(idx, 'article', e.target.value)}
                      placeholder="Артикул"
                      className="col-span-6 sm:col-span-3 px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      placeholder="Кол-во"
                      className="col-span-3 sm:col-span-2 px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                    />
                    <select
                      value={it.unit}
                      onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                      className="col-span-3 sm:col-span-1 px-1 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.price}
                      onChange={(e) => updateItem(idx, 'price', e.target.value)}
                      placeholder="Цена"
                      className="col-span-6 sm:col-span-2 px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                    />
                    <div className="col-span-6 sm:col-span-4 flex items-center justify-end px-2 text-xs font-medium text-gray-900 dark:text-white">
                      {it.total > 0 ? `${formatPrice(it.total)} ₽` : <span className="text-gray-400">—</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addItem}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-[#4A6572] hover:text-[#4A6572] text-xs font-medium transition w-full justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить позицию
            </button>
          </Section>

          {/* Итого */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900 dark:text-white">
                Итого по заказу
              </span>
              <span className="text-2xl font-bold text-[#344955] dark:text-[#F9AA33]">
                {formatPrice(total)} ₽
              </span>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
              >
                Отмена
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium disabled:opacity-50 transition"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Создание…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Создать заказ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Секция ──────────────────────────────────────────────
function Section({ icon: IconCmp, title, children }) {
  const Icon = IconCmp;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#4A6572]" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
