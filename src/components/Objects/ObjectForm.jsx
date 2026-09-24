// src/components/Objects/ObjectForm.jsx
// ============================================================
// Модальная форма создания/редактирования объекта
// ============================================================

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  X, Save, Loader2, Building2, MapPin, User, Calendar,
  DollarSign, Tag, FileText, AlertCircle, Check
} from 'lucide-react';
import {
  createObject,
  updateObject,
  normalizeObjectName,
} from '../../api/objects';
import {
  OBJECT_STATUS,
  getAllObjectStatuses,
} from '../../utils/objectStatuses';

// ────────────────────────────────────────────────────────────
// Хелпер: массив строк → строка для input
// ────────────────────────────────────────────────────────────
const tagsToString = (tags) => Array.isArray(tags) ? tags.join(', ') : '';
const stringToTags = (str) =>
  String(str || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

// ────────────────────────────────────────────────────────────
// Компонент
// ────────────────────────────────────────────────────────────
const ObjectForm = memo(({
  isOpen,
  onClose,
  onSuccess,             // (createdObject) => void
  companyId,
  userId,                // auth.users.id, уйдёт в created_by
  editingObject = null,  // если передан — режим редактирования
  language = 'ru',
  clients = [],          // массив company_users с ролью client (опционально)
  foremen = [],          // массив company_users с ролью master/foreman (опционально)
  showNotification,
}) => {
  const isEditMode = !!editingObject;
  const isRu = language === 'ru';

  // ─── State ───────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    client_id: '',
    foreman_user_id: '',
    status: OBJECT_STATUS.PLANNING,
    start_date: '',
    planned_end_date: '',
    budget: '',
    tags: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstInputRef = useRef(null);

  // ─── Заполняем форму при открытии ────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (editingObject) {
      setFormData({
        name: editingObject.name || '',
        address: editingObject.address || '',
        description: editingObject.description || '',
        client_id: editingObject.client_id || '',
        foreman_user_id: editingObject.foreman_user_id || '',
        status: editingObject.status || OBJECT_STATUS.PLANNING,
        start_date: editingObject.start_date || '',
        planned_end_date: editingObject.planned_end_date || '',
        budget: editingObject.budget != null ? String(editingObject.budget) : '',
        tags: tagsToString(editingObject.tags),
        notes: editingObject.notes || '',
      });
    } else {
      setFormData({
        name: '',
        address: '',
        description: '',
        client_id: '',
        foreman_user_id: '',
        status: OBJECT_STATUS.PLANNING,
        start_date: '',
        planned_end_date: '',
        budget: '',
        tags: '',
        notes: '',
      });
    }
    setErrors({});

    // Фокус на первое поле
    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [isOpen, editingObject]);

  // ─── Закрытие по Escape ──────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  // ─── Изменение поля ──────────────────────────────────────
  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Сбрасываем ошибку при вводе
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  // ─── Валидация ───────────────────────────────────────────
  const validate = useCallback(() => {
    const errs = {};

    if (!formData.name.trim()) {
      errs.name = isRu ? 'Введите название объекта' : 'Enter object name';
    } else if (formData.name.trim().length < 2) {
      errs.name = isRu ? 'Минимум 2 символа' : 'At least 2 characters';
    }

    if (formData.start_date && formData.planned_end_date) {
      if (formData.planned_end_date < formData.start_date) {
        errs.planned_end_date = isRu
          ? 'Дата окончания раньше даты начала'
          : 'End date is earlier than start date';
      }
    }

    if (formData.budget !== '' && (isNaN(Number(formData.budget)) || Number(formData.budget) < 0)) {
      errs.budget = isRu ? 'Введите корректную сумму' : 'Enter valid amount';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData, isRu]);

  // ─── Submit ──────────────────────────────────────────────
  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault?.();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        description: formData.description.trim() || null,
        client_id: formData.client_id || null,
        foreman_user_id: formData.foreman_user_id || null,
        status: formData.status,
        start_date: formData.start_date || null,
        planned_end_date: formData.planned_end_date || null,
        budget: formData.budget !== '' ? Number(formData.budget) : 0,
        tags: stringToTags(formData.tags),
        notes: formData.notes.trim() || null,
      };

      let result;
      if (isEditMode) {
        result = await updateObject(editingObject.id, payload);
      } else {
        result = await createObject({
          company_id: companyId,
          created_by: userId || null,
          ...payload,
        });
      }

      if (result.error) {
        showNotification?.(`❌ ${result.error}`, 'error');
        setErrors({ name: result.error });
        return;
      }

      showNotification?.(
        isEditMode
          ? (isRu ? '✅ Объект обновлён' : '✅ Object updated')
          : (isRu ? '✅ Объект создан' : '✅ Object created'),
        'success'
      );

      onSuccess?.(result.data);
      onClose?.();
    } catch (err) {
      console.error('[ObjectForm.submit] error:', err);
      showNotification?.(`❌ ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    formData, validate, isEditMode, editingObject,
    companyId, userId, showNotification, onSuccess, onClose, isRu
  ]);

  // ─── Список статусов ─────────────────────────────────────
  const statusOptions = useMemo(() => getAllObjectStatuses(), []);

  // ─── Если закрыто — ничего не рендерим ──────────────────
  if (!isOpen) return null;

  // ─── Рендер ──────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[9999] fade-enter"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose?.();
      }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ─────────────────────────────────────── */}
        <header className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-xl">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isEditMode
                  ? (isRu ? 'Редактировать объект' : 'Edit object')
                  : (isRu ? 'Новый объект' : 'New object')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isRu
                  ? 'Заполните основные данные. Остальное можно позже.'
                  : 'Fill in basic info. Rest can be added later.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => !isSubmitting && onClose?.()}
            disabled={isSubmitting}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
            aria-label={isRu ? 'Закрыть' : 'Close'}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </header>

        {/* ─── Body ───────────────────────────────────────── */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
          noValidate
        >
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {isRu ? 'Название объекта' : 'Object name'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstInputRef}
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={isRu ? 'ЖК Береговой кв.774' : 'Building "Central" #774'}
              className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] ${
                errors.name
                  ? 'border-red-400 focus:ring-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={isSubmitting}
              autoComplete="off"
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.name}
              </p>
            )}
            {!isEditMode && formData.name && (
              <p className="mt-1.5 text-xs text-gray-400">
                {isRu ? 'Будет сохранено как: ' : 'Will be saved as: '}
                <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                  {normalizeObjectName(formData.name)}
                </code>
              </p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <MapPin className="w-3.5 h-3.5 inline mr-1" />
              {isRu ? 'Адрес' : 'Address'}
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder={isRu ? 'г. Москва, ул. Ленина, 1' : 'Moscow, Lenina st., 1'}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572]"
              disabled={isSubmitting}
            />
          </div>

          {/* Status + Budget (row) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Check className="w-3.5 h-3.5 inline mr-1" />
                {isRu ? 'Статус' : 'Status'}
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] cursor-pointer"
                disabled={isSubmitting}
              >
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                {isRu ? 'Бюджет (₽)' : 'Budget (₽)'}
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={formData.budget}
                onChange={(e) => handleChange('budget', e.target.value)}
                placeholder="0"
                className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] ${
                  errors.budget
                    ? 'border-red-400 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isSubmitting}
              />
              {errors.budget && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {errors.budget}
                </p>
              )}
            </div>
          </div>

          {/* Dates (row) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                {isRu ? 'Дата начала' : 'Start date'}
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => handleChange('start_date', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572]"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                {isRu ? 'Планируемое окончание' : 'Planned end'}
              </label>
              <input
                type="date"
                value={formData.planned_end_date}
                onChange={(e) => handleChange('planned_end_date', e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] ${
                  errors.planned_end_date
                    ? 'border-red-400 focus:ring-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                disabled={isSubmitting}
              />
              {errors.planned_end_date && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {errors.planned_end_date}
                </p>
              )}
            </div>
          </div>

          {/* Client + Foreman (row, если переданы) */}
          {(clients.length > 0 || foremen.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {clients.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <User className="w-3.5 h-3.5 inline mr-1" />
                    {isRu ? 'Заказчик' : 'Client'}
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => handleChange('client_id', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] cursor-pointer"
                    disabled={isSubmitting}
                  >
                    <option value="">— {isRu ? 'не выбран' : 'not selected'} —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.full_name || c.user_email || c.email || 'Клиент'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {foremen.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <User className="w-3.5 h-3.5 inline mr-1" />
                    {isRu ? 'Ответственный прораб' : 'Responsible foreman'}
                  </label>
                  <select
                    value={formData.foreman_user_id}
                    onChange={(e) => handleChange('foreman_user_id', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] cursor-pointer"
                    disabled={isSubmitting}
                  >
                    <option value="">— {isRu ? 'не выбран' : 'not selected'} —</option>
                    {foremen.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.full_name || f.user_email || f.email || 'Прораб'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Tag className="w-3.5 h-3.5 inline mr-1" />
              {isRu ? 'Теги (через запятую)' : 'Tags (comma separated)'}
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder={isRu ? 'ремонт, вентиляция, срочно' : 'repair, ventilation, urgent'}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572]"
              disabled={isSubmitting}
            />
            {stringToTags(formData.tags).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {stringToTags(formData.tags).map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              {isRu ? 'Описание' : 'Description'}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              placeholder={isRu ? 'Кратко опишите объект...' : 'Short description...'}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <FileText className="w-3.5 h-3.5 inline mr-1" />
              {isRu ? 'Заметки' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              placeholder={isRu ? 'Любые заметки по объекту...' : 'Any notes...'}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] resize-none"
              disabled={isSubmitting}
            />
          </div>
        </form>

        {/* ─── Footer ─────────────────────────────────────── */}
        <footer className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl flex-shrink-0">
          <button
            type="button"
            onClick={() => !isSubmitting && onClose?.()}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors disabled:opacity-40"
          >
            {isRu ? 'Отмена' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim()}
            className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isRu ? 'Сохранение...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode
                  ? (isRu ? 'Сохранить' : 'Save')
                  : (isRu ? 'Создать' : 'Create')}
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
});

ObjectForm.displayName = 'ObjectForm';

export default ObjectForm;