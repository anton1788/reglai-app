// src/components/Suppliers/RFQ/RFQCreate.jsx
import { useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Loader2, Save, Send, Users, FileText,
  MapPin, Banknote, Info, AlertCircle, X,
} from 'lucide-react';

import RFQSupplierSelector from './RFQSupplierSelector';
import {
  createRFQ,
  sendRFQToSuppliers,
  logSupplierInteraction,
} from '../../../api/suppliers';
import { supabase } from '../../../utils/supabaseClient';
import { checkTariffLimit } from '../../../utils/tariffPlans';

const UNIT_OPTIONS = ['шт', 'м', 'м²', 'м³', 'кг', 'т', 'л', 'уп', 'рул', 'компл', 'лист'];

const EMPTY_ITEM = { name: '', quantity: 1, unit: 'шт', article: '', description: '' };

/**
 * Создание RFQ.
 *
 * @param {object} props
 * @param {string} props.companyId
 * @param {string} props.userId
 * @param {Array} [props.initialItems]
 * @param {object} [props.currentPlan] — 🆕 текущий тариф
 * @param {() => void} [props.onUpgrade] — 🆕 callback на тарифы
 * @param {Function} props.showNotification
 * @param {(rfq) => void} props.onCreated
 * @param {() => void} [props.onCancel]
 */
export default function RFQCreate({
  companyId,
  userId,
  initialItems = [],
  currentPlan,
  onUpgrade,
  showNotification,
  onCreated,
  onCancel,
}) {
  const notify = (msg, type = 'info', isUpdate = false, undoFn = null) => {
    if (typeof showNotification === 'function') {
      showNotification(msg, type, isUpdate, undoFn);
    } else {
      console.log(`[${type}] ${msg}`);
    }
  };

  // ─── Состояние ─────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deadline, setDeadline] = useState('');

  const [items, setItems] = useState(() =>
    initialItems.length > 0
      ? initialItems.map((it) => ({
          name: it.name || '',
          article: it.article || '',
          quantity: it.quantity || 1,
          unit: it.unit || 'шт',
          description: it.description || '',
        }))
      : [{ ...EMPTY_ITEM }]
  );

  const [invitedSuppliers, setInvitedSuppliers] = useState([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // ─── 🆕 Проверка лимита RFQ ────────────────────────────
  const checkRFQLimit = async () => {
    if (!companyId || !currentPlan?.id) return true;

    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('rfq_requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', monthStart.toISOString());

      if (error) {
        console.warn('[RFQCreate] count error:', error);
        return true; // Не блокируем при ошибке подсчёта
      }

      const limitCheck = checkTariffLimit(currentPlan.id, 'rfqPerMonth', count || 0);

      if (!limitCheck.allowed && !limitCheck.isUnlimited) {
        const msg = `⚠️ Лимит RFQ исчерпан (${count}/${limitCheck.limit} за месяц). Обновите тариф.`;
        if (typeof onUpgrade === 'function') {
          notify(msg, 'warning', false, () => onUpgrade());
        } else {
          notify(msg, 'warning');
        }
        return false;
      }

      // 🆕 Предупреждение при близком лимите
      if (!limitCheck.isUnlimited && limitCheck.remaining <= 2) {
        notify(
          `⚠️ Осталось ${limitCheck.remaining} RFQ на этот месяц.`,
          'warning'
        );
      }

      return true;
    } catch (err) {
      console.error('[RFQCreate] checkRFQLimit error:', err);
      return true;
    }
  };

  // ─── Резолв ошибок при вводе ───────────────────────────
  const clearError = (key) => {
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // ─── Работа с позициями ────────────────────────────────
  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };
  const updateItem = (idx, key, value) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  };

  // ─── Валидация ─────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = 'Введите название RFQ';
    const validItems = items.filter((it) => it.name.trim() && Number(it.quantity) > 0);
    if (validItems.length === 0) e.items = 'Добавьте хотя бы одну позицию';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Создание RFQ ──────────────────────────────────────
  const buildPayload = () => {
    const validItems = items
      .filter((it) => it.name.trim() && Number(it.quantity) > 0)
      .map((it) => ({
        name: it.name.trim(),
        article: it.article?.trim() || null,
        quantity: Number(it.quantity),
        unit: it.unit || 'шт',
        description: it.description?.trim() || null,
      }));

    return {
      company_id: companyId,
      created_by: userId,
      title: title.trim(),
      description: description.trim() || null,
      items: validItems,
      delivery_address: deliveryAddress.trim() || null,
      required_date: requiredDate || null,
      payment_terms: paymentTerms.trim() || null,
      deadline: deadline || null,
      status: 'draft',
    };
  };

  // 🆕 handleSaveDraft с проверкой лимита
  const handleSaveDraft = async () => {
    if (!validate()) return;

    const limitOk = await checkRFQLimit();
    if (!limitOk) return;

    setSaving(true);
    try {
      const rfq = await createRFQ(buildPayload());
      notify('✅ Черновик RFQ сохранён', 'success');
      if (typeof onCreated === 'function') onCreated(rfq);
    } catch (err) {
      console.error('[RFQCreate] save draft error:', err);
      notify(err.message || 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 🆕 handleSend с проверкой лимита
  const handleSend = async () => {
    if (!validate()) return;
    if (invitedSuppliers.length === 0) {
      notify('Выберите хотя бы одного поставщика', 'error');
      return;
    }

    const limitOk = await checkRFQLimit();
    if (!limitOk) return;

    setSaving(true);
    try {
      const rfq = await createRFQ(buildPayload());
      const supplierIds = invitedSuppliers.map((s) => s.id);
      await sendRFQToSuppliers(rfq.id, supplierIds);

      for (const sup of invitedSuppliers) {
        try {
          await logSupplierInteraction({
            supplierId: sup.id,
            companyId,
            userId,
            type: 'rfq_sent',
            description: `Приглашение в RFQ «${rfq.title}»`,
            metadata: { rfq_id: rfq.id },
          });
        } catch (logErr) {
          console.warn('[RFQCreate] log interaction failed:', logErr);
        }
      }

      notify(`✅ RFQ отправлен ${invitedSuppliers.length} поставщикам`, 'success');
      if (typeof onCreated === 'function') onCreated(rfq);
    } catch (err) {
      console.error('[RFQCreate] send error:', err);
      notify(err.message || 'Ошибка отправки RFQ', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Рендер ────────────────────────────────────────────
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Новый запрос цен
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Заполните информацию и выберите поставщиков для приглашения
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Основное */}
          <Section icon={Info} title="Основная информация">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); clearError('title'); }}
                  className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm
                    ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                    focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50`}
                  placeholder="Запрос цен на металлопрокат, март 2025"
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Описание
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50 resize-none"
                  placeholder="Дополнительные условия, требования к качеству и т.п."
                />
              </div>
            </div>
          </Section>

          {/* Условия */}
          <Section icon={MapPin} title="Условия поставки">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Адрес доставки
                </label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                  placeholder="г. Москва, ул. Строителей, 5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Требуемая дата поставки
                </label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Условия оплаты
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                  placeholder="Например: 50% предоплата"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Приём предложений до
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
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
                  className="grid grid-cols-12 gap-2 items-start p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700"
                >
                  <div className="col-span-12 sm:col-span-1 flex items-center justify-center h-9 text-xs font-medium text-gray-400">
                    #{idx + 1}
                  </div>

                  <input
                    type="text"
                    value={it.name}
                    onChange={(e) => { updateItem(idx, 'name', e.target.value); clearError('items'); }}
                    placeholder="Наименование *"
                    className="col-span-12 sm:col-span-5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                  />

                  <input
                    type="text"
                    value={it.article}
                    onChange={(e) => updateItem(idx, 'article', e.target.value)}
                    placeholder="Артикул"
                    className="col-span-6 sm:col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    placeholder="Кол-во"
                    className="col-span-3 sm:col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                  />

                  <select
                    value={it.unit}
                    onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                    className="col-span-3 sm:col-span-1 px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
                  >
                    {UNIT_OPTIONS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="col-span-12 sm:col-span-1 flex items-center justify-center h-9 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-30 transition"
                    aria-label="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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

          {/* Поставщики */}
          <Section icon={Users} title={`Приглашённые поставщики (${invitedSuppliers.length})`}>
            {invitedSuppliers.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                Поставщики ещё не выбраны
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {invitedSuppliers.map((s) => (
                  <div
                    key={s.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#4A6572]/10 text-[#344955] dark:text-gray-200 text-xs font-medium"
                  >
                    {s.name}
                    <button
                      onClick={() =>
                        setInvitedSuppliers((prev) => prev.filter((x) => x.id !== s.id))
                      }
                      className="hover:text-red-500"
                      aria-label="Убрать"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setSelectorOpen(true)}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg border border-[#4A6572] text-[#4A6572] hover:bg-[#4A6572]/10 text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              {invitedSuppliers.length === 0 ? 'Выбрать поставщиков' : 'Добавить ещё'}
            </button>
          </Section>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 -mx-4 md:mx-0 mt-6 py-4 px-4 md:px-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 md:bg-transparent md:border-0">
          <div className="flex items-center justify-end gap-3">
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
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium disabled:opacity-50 transition"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Сохранение…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Черновик
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={saving || invitedSuppliers.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium disabled:opacity-50 transition"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Отправка…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Отправить {invitedSuppliers.length > 0 && `(${invitedSuppliers.length})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Селектор поставщиков */}
      <RFQSupplierSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        companyId={companyId}
        excludeSupplierIds={invitedSuppliers.map((s) => s.id)}
        onConfirm={(picked) => {
          setInvitedSuppliers((prev) => {
            const existing = new Set(prev.map((s) => s.id));
            const next = [...prev];
            for (const p of picked) if (!existing.has(p.id)) next.push(p);
            return next;
          });
          setSelectorOpen(false);
        }}
      />
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