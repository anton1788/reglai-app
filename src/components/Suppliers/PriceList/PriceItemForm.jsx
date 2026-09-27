// src/components/Suppliers/PriceList/PriceItemForm.jsx
import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  article: '',
  brand: '',
  category: '',
  subcategory: '',
  description: '',
  unit: 'шт',
  price: '',
  min_quantity: 1,
  max_quantity: '',
  discount_percent: 0,
  stock_quantity: '',
  warehouse_location: '',
  is_available: true,
};

const UNIT_OPTIONS = ['шт', 'м', 'м²', 'м³', 'кг', 'т', 'л', 'уп', 'рул', 'компл', 'лист'];

/**
 * Форма создания/редактирования позиции прайса.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object|null} props.item — если null, режим создания
 * @param {string} props.supplierId
 * @param {() => void} props.onClose
 * @param {(payload) => Promise<void>} props.onSubmit
 * @param {boolean} [props.saving]
 * @param {Function} [props.showNotification]
 */
export default function PriceItemForm({
  open,
  item,
  supplierId,
  onClose,
  onSubmit,
  saving = false,
  showNotification,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const isEdit = Boolean(item?.id);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        name: item.name || '',
        article: item.article || '',
        brand: item.brand || '',
        category: item.category || '',
        subcategory: item.subcategory || '',
        description: item.description || '',
        unit: item.unit || 'шт',
        price: item.price ?? '',
        min_quantity: item.min_quantity ?? 1,
        max_quantity: item.max_quantity ?? '',
        discount_percent: item.discount_percent ?? 0,
        stock_quantity: item.stock_quantity ?? '',
        warehouse_location: item.warehouse_location || '',
        is_available: item.is_available !== false,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [open, item]);

  if (!open) return null;

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Укажите название';
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) e.price = 'Цена должна быть неотрицательным числом';
    if (form.stock_quantity !== '' && Number(form.stock_quantity) < 0) {
      e.stock_quantity = 'Остаток не может быть отрицательным';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const payload = {
      supplier_id: supplierId,
      name: form.name.trim(),
      article: form.article.trim() || null,
      brand: form.brand.trim() || null,
      category: form.category.trim() || null,
      subcategory: form.subcategory.trim() || null,
      description: form.description.trim() || null,
      unit: form.unit || 'шт',
      price: Number(form.price),
      min_quantity: form.min_quantity === '' ? 1 : Number(form.min_quantity),
      max_quantity: form.max_quantity === '' ? null : Number(form.max_quantity),
      discount_percent: form.discount_percent === '' ? 0 : Number(form.discount_percent),
      stock_quantity: form.stock_quantity === '' ? null : Number(form.stock_quantity),
      warehouse_location: form.warehouse_location.trim() || null,
      is_available: form.is_available,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      if (typeof showNotification === 'function') {
        showNotification(err.message || 'Ошибка сохранения', 'error');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] fade-enter flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-[#4A6572] text-white">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Редактировать позицию' : 'Новая позиция'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form
          id="price-item-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Наименование <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50`}
              placeholder="Например: Кабель ВВГ 3х2.5"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Артикул + Бренд */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Артикул
              </label>
              <input
                type="text"
                value={form.article}
                onChange={(e) => setField('article', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50 font-mono text-sm"
                placeholder="CBL-VVG-3x2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Бренд
              </label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setField('brand', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                placeholder="Например: Schneider"
              />
            </div>
          </div>

          {/* Категория + подкатегория */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Категория
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setField('category', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                placeholder="Электрика"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Подкатегория
              </label>
              <input
                type="text"
                value={form.subcategory}
                onChange={(e) => setField('subcategory', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                placeholder="Кабель"
              />
            </div>
          </div>

          {/* Цена + единица */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Цена, ₽ <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setField('price', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                  ${errors.price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50`}
                placeholder="1250.50"
              />
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ед. изм.
              </label>
              <select
                value={form.unit}
                onChange={(e) => setField('unit', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
              >
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Мин/макс кол-во + скидка */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Мин. кол-во
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.min_quantity}
                onChange={(e) => setField('min_quantity', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Макс. кол-во
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.max_quantity}
                onChange={(e) => setField('max_quantity', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                placeholder="—"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Скидка, %
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={form.discount_percent}
                onChange={(e) => setField('discount_percent', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
              />
            </div>
          </div>

          {/* Остаток + место */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Остаток на складе
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.stock_quantity}
                onChange={(e) => setField('stock_quantity', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                  ${errors.stock_quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50`}
                placeholder="—"
              />
              {errors.stock_quantity && (
                <p className="text-xs text-red-500 mt-1">{errors.stock_quantity}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Место на складе
              </label>
              <input
                type="text"
                value={form.warehouse_location}
                onChange={(e) => setField('warehouse_location', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                placeholder="Стеллаж A-12"
              />
            </div>
          </div>

          {/* Описание */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Описание
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50 resize-none"
              placeholder="Технические характеристики, комментарий…"
            />
          </div>

          {/* Доступность */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(e) => setField('is_available', e.target.checked)}
              className="w-4 h-4 accent-[#F9AA33]"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Доступно для заказа
            </span>
          </label>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
          >
            Отмена
          </button>
          <button
            type="submit"
            form="price-item-form"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium disabled:opacity-50 transition"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Сохранение…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> {isEdit ? 'Сохранить' : 'Добавить'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
