// src/components/Suppliers/SupplierForm.jsx
import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  inn: '',
  kpp: '',
  ogrn: '',
  address: '',
  phone: '',
  email: '',
  contact_person: '',
  website: '',
  description: '',
  status: 'active',
  is_verified: false,
  payment_terms: '',
  delivery_terms: '',
  min_order_amount: '',
  delivery_days: 3,
  categories: '',
  regions: '',
};

const STATUS_OPTIONS = [
  { value: 'active', label: 'Активен' },
  { value: 'pending', label: 'Ожидает подтверждения' },
  { value: 'blocked', label: 'Заблокирован' },
  { value: 'archived', label: 'В архиве' },
];

/**
 * Форма создания/редактирования поставщика.
 * @param {object} props
 * @param {object|null} props.supplier  — если null → режим создания
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(payload) => Promise<void>} props.onSubmit
 * @param {boolean} [props.saving]
 */
export default function SupplierForm({ supplier, open, onClose, onSubmit, saving = false }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const isEdit = Boolean(supplier?.id);

  // Инициализация при открытии
  useEffect(() => {
    if (!open) return;
    if (supplier) {
      setForm({
        name: supplier.name || '',
        inn: supplier.inn || '',
        kpp: supplier.kpp || '',
        ogrn: supplier.ogrn || '',
        address: supplier.address || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        contact_person: supplier.contact_person || '',
        website: supplier.website || '',
        description: supplier.description || '',
        status: supplier.status || 'active',
        is_verified: Boolean(supplier.is_verified),
        payment_terms: supplier.payment_terms || '',
        delivery_terms: supplier.delivery_terms || '',
        min_order_amount: supplier.min_order_amount ?? '',
        delivery_days: supplier.delivery_days ?? 3,
        categories: Array.isArray(supplier.categories) ? supplier.categories.join(', ') : '',
        regions: Array.isArray(supplier.regions) ? supplier.regions.join(', ') : '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [supplier, open]);

  if (!open) return null;

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Укажите название';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      e.email = 'Неверный email';
    }
    if (form.inn && !/^\d{10}$|^\d{12}$/.test(form.inn.trim())) {
      e.inn = 'ИНН — 10 или 12 цифр';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      inn: form.inn.trim() || null,
      kpp: form.kpp.trim() || null,
      ogrn: form.ogrn.trim() || null,
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      contact_person: form.contact_person.trim() || null,
      website: form.website.trim() || null,
      description: form.description.trim() || null,
      status: form.status,
      is_verified: form.is_verified,
      payment_terms: form.payment_terms.trim() || null,
      delivery_terms: form.delivery_terms.trim() || null,
      min_order_amount: form.min_order_amount === '' ? 0 : Number(form.min_order_amount),
      delivery_days: Number(form.delivery_days) || 3,
      categories: form.categories
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      regions: form.regions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] fade-enter flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-[#4A6572] text-white">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Редактировать поставщика' : 'Новый поставщик'}
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
        <form id="supplier-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Основное */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Название компании <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                  ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50`}
                placeholder="ООО «СтройМатериалы»"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ИНН</label>
              <input
                type="text"
                value={form.inn}
                onChange={(e) => setField('inn', e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                  ${errors.inn ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                  focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50`}
                placeholder="7712345678"
              />
              {errors.inn && <p className="text-xs text-red-500 mt-1">{errors.inn}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">КПП</label>
              <input
                type="text"
                value={form.kpp}
                onChange={(e) => setField('kpp', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                placeholder="771201001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ОГРН</label>
              <input
                type="text"
                value={form.ogrn}
                onChange={(e) => setField('ogrn', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Статус</label>
              <select
                value={form.status}
                onChange={(e) => setField('status', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Контакты */}
          <div className="pt-2">
            <h3 className="text-sm font-semibold text-[#4A6572] dark:text-gray-300 uppercase tracking-wide mb-3">
              Контакты
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Контактное лицо</label>
                <input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) => setField('contact_person', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Телефон</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white
                    ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                    focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50`}
                  placeholder="info@supplier.ru"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Сайт</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setField('website', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                  placeholder="https://supplier.ru"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Адрес</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                />
              </div>
            </div>
          </div>

          {/* Условия работы */}
          <div className="pt-2">
            <h3 className="text-sm font-semibold text-[#4A6572] dark:text-gray-300 uppercase tracking-wide mb-3">
              Условия работы
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Условия оплаты</label>
                <input
                  type="text"
                  value={form.payment_terms}
                  onChange={(e) => setField('payment_terms', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                  placeholder="Например: 50% предоплата"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Условия доставки</label>
                <input
                  type="text"
                  value={form.delivery_terms}
                  onChange={(e) => setField('delivery_terms', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                  placeholder="Например: до объекта за 2 дня"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Мин. сумма заказа, ₽
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={form.min_order_amount}
                  onChange={(e) => setField('min_order_amount', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Срок доставки, дней
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={form.delivery_days}
                  onChange={(e) => setField('delivery_days', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                />
              </div>
            </div>
          </div>

          {/* Категории и регионы */}
          <div className="pt-2">
            <h3 className="text-sm font-semibold text-[#4A6572] dark:text-gray-300 uppercase tracking-wide mb-3">
              Специализация
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Категории <span className="text-gray-400 text-xs">(через запятую)</span>
                </label>
                <input
                  type="text"
                  value={form.categories}
                  onChange={(e) => setField('categories', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                  placeholder="Бетон, Кирпич, Металл"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Регионы <span className="text-gray-400 text-xs">(через запятую)</span>
                </label>
                <input
                  type="text"
                  value={form.regions}
                  onChange={(e) => setField('regions', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                  placeholder="Москва, МО"
                />
              </div>
            </div>
          </div>

          {/* Описание */}
          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50 resize-none"
              placeholder="Кратко о поставщике, специализация, опыт работы…"
            />
          </div>

          {/* Проверенный */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_verified}
              onChange={(e) => setField('is_verified', e.target.checked)}
              className="w-4 h-4 accent-[#F9AA33]"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Проверенный поставщик
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
            form="supplier-form"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium disabled:opacity-50 transition"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Сохранение…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> {isEdit ? 'Сохранить' : 'Создать'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
