// src/components/IssueModal.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Package, Send, User, Phone, MapPin, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// 📦 КОНСТАНТЫ
// ─────────────────────────────────────────────────────────────

// ✅ ИСПРАВЛЕНИЕ 1: Дефис в конце character class не требует экранирования
const PHONE_REGEX = /^[\d\s+()-]{10,20}$/;
const MAX_INPUT_LENGTH = 500;
const INITIAL_FORM_DATA = {
  objectName: '',
  recipientName: '',
  recipientPhone: '',
  quantity: 1,
  comment: ''
};

const ERROR_MESSAGES = {
  ru: {
    objectName: 'Введите название объекта',
    recipientName: 'Введите ФИО получателя',
    recipientPhone: 'Введите корректный телефон',
    quantity: (max) => `Введите количество от 1 до ${max}`,
    submit: 'Подтвердите выдачу материалов',
    success: '✅ Материалы выданы на объект',
    error: (msg) => `❌ Ошибка: ${msg}`,
    fillMyData: 'Заполнить моими данными'
  },
  en: {
    objectName: 'Enter object name',
    recipientName: 'Enter recipient name',
    recipientPhone: 'Enter valid phone',
    quantity: (max) => `Enter quantity from 1 to ${max}`,
    submit: 'Confirm material issue',
    success: '✅ Materials issued to object',
    error: (msg) => `❌ Error: ${msg}`,
    fillMyData: 'Fill with my data'
  }
};

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ (чистые функции)
// ─────────────────────────────────────────────────────────────

const sanitizeInput = (text, maxLength = MAX_INPUT_LENGTH) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[<>]/g, '') // Базовая XSS-защита
    .slice(0, maxLength)
    .trim();
};

const formatPhone = (value) => {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (digits.length > 0 && !digits.startsWith('7')) digits = '7' + digits;
  digits = digits.substring(0, 11);
  
  if (digits.length === 0) return '';
  let formatted = '+7';
  if (digits.length > 1) formatted += ` (${digits.slice(1, 4)}`;
  if (digits.length > 4) formatted += `) ${digits.slice(4, 7)}`;
  if (digits.length > 7) formatted += `-${digits.slice(7, 9)}`;
  if (digits.length > 9) formatted += `-${digits.slice(9, 11)}`;
  return formatted;
};

const validateForm = (formData, availableBalance, language) => {
  const errors = {};
  const t = ERROR_MESSAGES[language] || ERROR_MESSAGES.en;
  
  if (!formData.objectName.trim()) {
    errors.objectName = t.objectName;
  }
  if (!formData.recipientName.trim()) {
    errors.recipientName = t.recipientName;
  }
  if (!formData.recipientPhone.trim() || !PHONE_REGEX.test(formData.recipientPhone)) {
    errors.recipientPhone = t.recipientPhone;
  }
  const qty = parseInt(formData.quantity, 10);
  if (isNaN(qty) || qty <= 0 || qty > availableBalance) {
    errors.quantity = t.quantity(availableBalance);
  }
  
  return errors;
};

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ (мемоизированные)
// ─────────────────────────────────────────────────────────────

// ✅ ИСПРАВЛЕНИЕ 2: Удалили неиспользуемый prop 'language' из FormField
const FormField = React.memo(({ 
  id, 
  label, 
  icon: Icon, 
  type = 'text', 
  value, 
  onChange, 
  error, 
  placeholder, 
  min, 
  max, 
  rows,
  helper,
  action,
  inputRef
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      <span className="flex items-center gap-1">
        {Icon && <Icon className="w-4 h-4 text-indigo-600" aria-hidden="true" />}
        {label}
      </span>
    </label>
    <div className="relative">
      {type === 'textarea' ? (
        <textarea
          id={id}
          ref={inputRef}
          value={value}
          onChange={onChange}
          rows={rows || 2}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none transition-colors ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      ) : (
        <input
          id={id}
          ref={inputRef}
          type={type}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
            error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 disabled:opacity-50"
        >
          {action.label}
        </button>
      )}
    </div>
    {helper && !error && (
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helper}</p>
    )}
    {error && (
      <p id={`${id}-error`} className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1" role="alert">
        <AlertCircle className="w-3 h-3" aria-hidden="true" /> {error}
      </p>
    )}
  </div>
));
FormField.displayName = 'FormField';

// ✅ ИСПРАВЛЕНИЕ 3: Добавили itemName как проп вместо использования item из внешней области
const BalanceIndicator = React.memo(({ available, unit, language, itemName }) => {
  const isLow = available <= 5;
  const isCritical = available === 0;
  
  return (
    <div className={`p-4 rounded-lg ${
      isCritical 
        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
        : isLow 
          ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          : 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20'
    }`}>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <Package className="w-4 h-4" aria-hidden="true" />
        {language === 'ru' ? 'Материал:' : 'Material:'}
      </p>
      <p className="text-base font-semibold text-gray-900 dark:text-white mt-1">
        {sanitizeInput(itemName || '')}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        <span className="font-medium">{language === 'ru' ? 'Доступно:' : 'Available:'}</span>{' '}
        <span className={`font-bold ${
          isCritical ? 'text-red-600 dark:text-red-400' : 
          isLow ? 'text-amber-600 dark:text-amber-400' : 
          'text-green-600 dark:text-green-400'
        }`}>
          {available} {unit || (language === 'ru' ? 'шт' : 'pcs')}
        </span>
        {isCritical && (
          <span className="ml-2 text-xs text-red-500 dark:text-red-400">
            ({language === 'ru' ? 'нет в наличии' : 'out of stock'})
          </span>
        )}
      </p>
    </div>
  );
});
BalanceIndicator.displayName = 'BalanceIndicator';

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────

const IssueModal = React.memo(({
  isOpen,
  onClose,
  item,
  userCompanyId,
  user,
  supabase,
  language = 'ru',
  showNotification,
  onIssueComplete
}) => {
  // ─────────────────────────────────────────────────────────
  // 📊 STATE & REFS
  // ─────────────────────────────────────────────────────────
  
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  const t = useMemo(() => ERROR_MESSAGES[language] || ERROR_MESSAGES.en, [language]);
  const availableBalance = useMemo(() => item?.balance || item?.quantity || 0, [item]);
  const isFormValid = useMemo(() => Object.keys(validateForm(formData, availableBalance, language)).length === 0, [formData, availableBalance, language]);

  // ─────────────────────────────────────────────────────────
  // ♿ FOCUS MANAGEMENT & KEYBOARD
  // ─────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement;
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      previouslyFocusedElement.current?.focus?.();
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showConfirm) setShowConfirm(false);
        else onClose();
      } else if (e.key === 'Enter' && !e.shiftKey && isFormValid && !showConfirm) {
        e.preventDefault();
        setShowConfirm(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFormValid, showConfirm, onClose]);

  // ─────────────────────────────────────────────────────────
  // 🎛️ ОБРАБОТЧИКИ
  // ─────────────────────────────────────────────────────────
  
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  }, [errors]);

  const handlePhoneChange = useCallback((e) => {
    handleFieldChange('recipientPhone', formatPhone(e.target.value));
  }, [handleFieldChange]);

  const handleQuantityChange = useCallback((e) => {
    const val = parseInt(e.target.value, 10);
    const safeVal = isNaN(val) ? 1 : Math.max(1, Math.min(val, availableBalance));
    handleFieldChange('quantity', safeVal);
  }, [handleFieldChange, availableBalance]);

  const handleFillMyData = useCallback(() => {
    if (user?.user_metadata) {
      setFormData(prev => ({
        ...prev,
        recipientName: sanitizeInput(user.user_metadata.full_name || ''),
        recipientPhone: formatPhone(user.user_metadata.phone || '')
      }));
    }
  }, [user]);

  const validateAndPrepare = useCallback(() => {
    const validationErrors = validateForm(formData, availableBalance, language);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstErrorField = Object.keys(validationErrors)[0];
      document.getElementById(firstErrorField)?.focus();
      return null;
    }
    return {
      objectName: sanitizeInput(formData.objectName),
      recipientName: sanitizeInput(formData.recipientName),
      recipientPhone: sanitizeInput(formData.recipientPhone),
      quantity: parseInt(formData.quantity, 10),
      comment: sanitizeInput(formData.comment)
    };
  }, [formData, availableBalance, language]);

  const executeIssue = useCallback(async (sanitizedData) => {
    setIsLoading(true);
    try {
      const {  balanceResult, error: balanceError } = await supabase.rpc('update_warehouse_balance', {
        p_company_id: userCompanyId,
        p_item_name: item.name,
        p_quantity: sanitizedData.quantity,
        p_transaction_type: 'expense',
        p_user_id: user?.id || null,
        p_user_email: user?.email || null,
        p_comment: sanitizedData.comment || `${language === 'ru' ? 'Выдача на объект' : 'Issue to object'}: ${sanitizedData.objectName}`,
        p_application_id: null,
        p_unit: item.unit || 'шт'
      });

      if (balanceError) throw balanceError;
      if (balanceResult && !balanceResult.success) {
        throw new Error(balanceResult.error || 'Ошибка обновления склада');
      }

      const { error: transError } = await supabase
        .from('warehouse_transactions')
        .insert({
          company_id: userCompanyId,
          item_name: item.name,
          quantity: sanitizedData.quantity,
          transaction_type: 'expense',
          user_id: user?.id || null,
          user_email: user?.email || null,
          comment: sanitizedData.comment || `${language === 'ru' ? 'Выдача на объект' : 'Issue to object'}: ${sanitizedData.objectName}`,
          application_id: null,
          target_object_name: sanitizedData.objectName,
          recipient_name: sanitizedData.recipientName,
          recipient_phone: sanitizedData.recipientPhone,
          issue_type: 'internal',
          created_at: new Date().toISOString()
        });

      if (transError) throw transError;

      showNotification(t.success, 'success');
      onIssueComplete?.();
      onClose();
    } catch (err) {
      console.error('Issue failed:', err);
      showNotification(t.error(err.message || 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
      setShowConfirm(false);
    }
  }, [supabase, userCompanyId, item, user, language, showNotification, onIssueComplete, onClose, t]);

  const handleSubmit = useCallback(() => {
    const sanitizedData = validateAndPrepare();
    if (!sanitizedData) return;
    setShowConfirm(true);
  }, [validateAndPrepare]);

  const handleConfirm = useCallback(() => {
    const sanitizedData = validateAndPrepare();
    if (sanitizedData) executeIssue(sanitizedData);
  }, [validateAndPrepare, executeIssue]);

  const handleClose = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setShowConfirm(false);
    onClose();
  }, [onClose]);

  // ─────────────────────────────────────────────────────────
  // 📋 КОНФИГУРАЦИЯ ПОЛЕЙ ФОРМЫ
  // ─────────────────────────────────────────────────────────
  
  const formFields = useMemo(() => [
    {
      id: 'objectName',
      label: language === 'ru' ? 'Объект назначения *' : 'Destination Object *',
      icon: MapPin,
      value: formData.objectName,
      onChange: (e) => handleFieldChange('objectName', e.target.value),
      error: errors.objectName,
      placeholder: language === 'ru' ? 'ЖК "Солнечный", корпус 3' : 'Object name',
      inputRef: firstInputRef
    },
    {
      id: 'recipientName',
      label: language === 'ru' ? 'Получатель (ФИО) *' : 'Recipient (Full Name) *',
      icon: User,
      value: formData.recipientName,
      onChange: (e) => handleFieldChange('recipientName', sanitizeInput(e.target.value)),
      error: errors.recipientName,
      placeholder: language === 'ru' ? 'Иванов Иван Иванович' : 'John Doe',
      action: { label: t.fillMyData, onClick: handleFillMyData, disabled: isLoading || !user }
    },
    {
      id: 'recipientPhone',
      label: language === 'ru' ? 'Телефон получателя *' : 'Recipient Phone *',
      icon: Phone,
      type: 'tel',
      value: formData.recipientPhone,
      onChange: handlePhoneChange,
      error: errors.recipientPhone,
      placeholder: '+7 (999) 000-00-00'
    },
    {
      id: 'quantity',
      label: language === 'ru' ? 'Количество *' : 'Quantity *',
      type: 'number',
      value: formData.quantity,
      onChange: handleQuantityChange,
      error: errors.quantity,
      min: 1,
      max: availableBalance,
      helper: language === 'ru' ? `Максимум: ${availableBalance} ${item?.unit || 'шт'}` : `Max: ${availableBalance} ${item?.unit || 'pcs'}`
    },
    {
      id: 'comment',
      label: language === 'ru' ? 'Комментарий' : 'Comment',
      type: 'textarea',
      value: formData.comment,
      onChange: (e) => handleFieldChange('comment', sanitizeInput(e.target.value, 1000)),
      placeholder: language === 'ru' ? 'Необязательно' : 'Optional',
      rows: 2
    }
  ], [formData, errors, language, availableBalance, item, handleFieldChange, handlePhoneChange, handleQuantityChange, handleFillMyData, isLoading, user, t]);

  // ─────────────────────────────────────────────────────────
  // 📋 РЕНДЕРИНГ
  // ─────────────────────────────────────────────────────────

  if (!isOpen || !item) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity"
        role="presentation"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        {/* Modal Content */}
        <div 
          ref={modalRef}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="issue-modal-title"
          tabIndex={-1}
        >
          {/* Header */}
          <header className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <h2 id="issue-modal-title" className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" aria-hidden="true" />
              {language === 'ru' ? 'Выдача на объект' : 'Issue to Object'}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={language === 'ru' ? 'Закрыть' : 'Close'}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </header>

          {/* Balance Indicator — ✅ передаём itemName */}
          <BalanceIndicator 
            available={availableBalance} 
            unit={item.unit} 
            language={language} 
            itemName={item.name}
          />

          {/* Form */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="space-y-4 mt-4"
            noValidate
          >
            {formFields.map((field) => (
              <FormField key={field.id} {...field} />
            ))}
          </form>

          {/* Footer */}
          <footer className="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium dark:text-gray-300 dark:hover:text-gray-100 disabled:opacity-50 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 rounded-lg"
            >
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid || availableBalance === 0}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              aria-label={t.submit}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>{language === 'ru' ? 'Обработка...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>{language === 'ru' ? 'Выдать' : 'Issue'}</span>
                </>
              )}
            </button>
          </footer>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] transition-opacity"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm p-6 outline-none" tabIndex={-1}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              </div>
              <div>
                <h3 id="confirm-title" className="text-lg font-bold text-gray-900 dark:text-white">
                  {language === 'ru' ? 'Подтверждение' : 'Confirm'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {language === 'ru' 
                    ? `Выдать ${formData.quantity} ${item.unit || 'шт'} "${item.name}" на объект "${formData.objectName}"?`
                    : `Issue ${formData.quantity} ${item.unit || 'pcs'} of "${item.name}" to object "${formData.objectName}"?`}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium dark:text-gray-300 dark:hover:text-gray-100 disabled:opacity-50 transition-colors rounded-lg"
              >
                {language === 'ru' ? 'Нет, отмена' : 'No, cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{language === 'ru' ? 'Да, выдать' : 'Yes, issue'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

IssueModal.displayName = 'IssueModal';

export default IssueModal;