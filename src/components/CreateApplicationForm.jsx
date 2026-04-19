// src/components/CreateApplicationForm.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  Plus, Trash2, Save, Package, ShoppingCart, CheckCircle, X, Send, Loader2,
  Copy, Download, Briefcase, FileText, Warehouse, AlertCircle, Sparkles,
  ChevronDown, RotateCcw, Undo2, Info, Minus, Camera
} from 'lucide-react';
import MaterialCart from './MaterialCart';
import ClientSelector from './ClientSelector'; // Добавлен импорт ClientSelector

// ─────────────────────────────────────────────────────────────
// 📦 КОНСТАНТЫ
// ─────────────────────────────────────────────────────────────

const UNIT_OPTIONS = ['шт', 'кг', 'м', 'м²', 'м³', 'л', 'уп', 'комплект', 'набор'];
const PHONE_REGEX = /^[\d\s+()-]{10,20}$/;
const MAX_INPUT_LENGTH = 500;
const DEBOUNCE_MS = 300;
const ANIMATION_DURATION = 200;

// ─────────────────────────────────────────────────────────────
// 🎨 СТИЛИ И АНИМАЦИИ
// ─────────────────────────────────────────────────────────────

const styles = `
@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.form-enter { animation: slideIn ${ANIMATION_DURATION}ms ease-out forwards; }
.fade-enter { animation: fadeIn ${ANIMATION_DURATION}ms ease-out forwards; }
.pulse { animation: pulse 2s ease-in-out infinite; }
.shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.material-row {
  transition: all 0.2s ease;
  will-change: transform, box-shadow;
}
.material-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.08);
}
.quantity-stepper input::-webkit-outer-spin-button,
.quantity-stepper input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.quantity-stepper input[type=number] {
  -moz-appearance: textfield;
}
`;

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ
// ─────────────────────────────────────────────────────────────

const sanitizeInput = (text, maxLength = MAX_INPUT_LENGTH) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[<>]/g, '').slice(0, maxLength).trim();
};

const clamp = (value, min = 1, max = 10000) => {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(num) ? min : Math.max(min, Math.min(num, max));
};

// ─────────────────────────────────────────────────────────────
// 🎣 КАСТОМНЫЕ ХУКИ
// ─────────────────────────────────────────────────────────────

const useClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ (мемоизированные)
// ─────────────────────────────────────────────────────────────

const FormHeader = memo(({ t }) => (
  <header className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-200/60 dark:border-gray-700/60">
    <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg shadow-indigo-500/20">
      <img
        src="/icon-512.png"
        alt=""
        className="w-7 h-7"
        style={{ objectFit: 'contain' }}
        loading="lazy"
      />
    </div>
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('createApplication')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
        {t('createApplicationSubtitle') || 'Заполните данные для отправки заявки'}
      </p>
    </div>
  </header>
));
FormHeader.displayName = 'FormHeader';

const QuickActions = memo(({ onCloneLast, onDownloadTemplate, onImportExcel, onSaveTemplate, t }) => {
  // 🔹 Tailwind не поддерживает динамические классы — используем мапу стилей
  const actionStyles = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500',
    gray: 'from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 focus:ring-gray-500',
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:ring-green-500',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 focus:ring-purple-500'
  };

  const actions = [
    { icon: Copy, action: onCloneLast, label: t('cloneLastApplication'), color: 'blue' },
    { icon: Download, action: onDownloadTemplate, label: t('downloadTemplate'), color: 'gray' },
    { icon: FileText, action: onImportExcel, label: t('importFromExcel'), color: 'green' },
    { icon: Briefcase, action: onSaveTemplate, label: t('saveTemplate'), color: 'purple' }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label={t('quickActions')}>
      {actions.map((action, idx) => {
        // 🔹 Выносим иконку в отдельную переменную — ESLint видит использование
        const Icon = action.icon;
        return (
          <button
            key={idx}
            type="button"
            onClick={action.action}
            className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r ${actionStyles[action.color]} text-white rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
            aria-label={action.label}
          >
            <Icon className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
});
QuickActions.displayName = 'QuickActions';

const ObjectInput = memo(({
  value,
  onChange,
  onFocus,
  onKeyDown,
  suggestions,
  showSuggestions,
  activeIndex,
  onSelect,
  error,
  t,
  inputRef,
  listRef
}) => {
  const listboxId = 'object-suggestions';
  
  return (
    <fieldset className="relative">
      <legend className="sr-only">{t('objectName')}</legend>
      <label htmlFor="objectName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('objectName')} <span className="text-red-500" aria-hidden="true">*</span>
      </label>
      
      <div className="relative">
        <input
          id="objectName"
          ref={inputRef}
          type="text"
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white transition-all ${
            error ? 'border-red-400 focus:ring-red-500' : 'border-gray-200/60 dark:border-gray-600/60 hover:border-indigo-300/60'
          }`}
          placeholder={t('objectNamePlaceholder')}
          required
          aria-invalid={!!error}
          aria-describedby={error ? 'objectName-error' : undefined}
          aria-autocomplete="list"
          aria-controls={showSuggestions ? listboxId : undefined}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-item-${activeIndex}` : undefined}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange({ target: { value: '' } })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label={t('clear')}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {error && (
        <p id="objectName-error" className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-2 w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/60 dark:border-gray-600/60 rounded-xl shadow-xl max-h-60 overflow-auto form-enter"
        >
          {suggestions.map((obj, idx) => (
            <li
              key={idx}
              id={`${listboxId}-item-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              className={`px-4 py-3 cursor-pointer text-gray-900 dark:text-white transition-all ${
                idx === activeIndex
                  ? 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 text-indigo-900 dark:text-indigo-100 border-l-4 border-indigo-500'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(obj);
              }}
              onMouseEnter={() => {}}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <span className="font-medium">{obj}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
});
ObjectInput.displayName = 'ObjectInput';

// 🔹 ИСПРАВЛЕНИЕ: Удалили неиспользуемый проп 't' из ForemanField
const ForemanField = memo(({ id, label, value, onChange, type = 'text', placeholder, error, pattern }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      {label} <span className="text-red-500" aria-hidden="true">*</span>
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white transition-all ${
        error ? 'border-red-400 focus:ring-red-500' : 'border-gray-200/60 dark:border-gray-600/60 hover:border-indigo-300/60'
      }`}
      placeholder={placeholder}
      required
      pattern={pattern}
      aria-invalid={!!error}
    />
    {error && (
      <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5" role="alert">
        <AlertCircle className="w-4 h-4" aria-hidden="true" />
        {error}
      </p>
    )}
  </div>
));
ForemanField.displayName = 'ForemanField';

const WarehouseInfo = memo(({ t }) => (
  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/50 dark:border-blue-700/50" role="note">
    <div className="flex items-start gap-3">
      <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
        <Warehouse className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
          {t('materialTrackingTitle')}
        </h4>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {t('materialTrackingDescription')}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-blue-700 dark:text-blue-300">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {t('receiptEqualsIncome')}
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {t('issueEqualsExpense')}
          </span>
        </div>
      </div>
    </div>
  </div>
));
WarehouseInfo.displayName = 'WarehouseInfo';

const MaterialRow = memo(({
  material,
  index,
  onUpdate,
  onRemove,
  onAddPhoto,
  capturedPhotos,
  selectedApplicationId,
  suggestions,
  showSuggestions,
  onSuggestionSelect,
  unitOptions,
  t
}) => {
  const [localSuggestions, setLocalSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const listboxId = `material-suggestions-${index}`;
  
  const debouncedValue = useDebounce(material.description, DEBOUNCE_MS);
  
  useEffect(() => {
    if (debouncedValue && suggestions.length > 0) {
      const filtered = suggestions
        .filter(s => s.toLowerCase().includes(debouncedValue.toLowerCase()))
        .slice(0, 5);
      setLocalSuggestions(filtered);
    } else {
      setLocalSuggestions([]);
    }
    setActiveIndex(-1);
  }, [debouncedValue, suggestions]);

  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions || localSuggestions.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, localSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      onSuggestionSelect(index, localSuggestions[activeIndex]);
      setLocalSuggestions([]);
      setActiveIndex(-1);
    } else if (e.key === 'Escape') {
      setLocalSuggestions([]);
      setActiveIndex(-1);
    }
  }, [showSuggestions, localSuggestions, activeIndex, index, onSuggestionSelect]);

  const handleQuantityChange = useCallback((e) => {
    const value = clamp(e.target.value, 1, 10000);
    onUpdate(index, 'quantity', value);
  }, [index, onUpdate]);

  const handleIncrement = useCallback(() => {
    onUpdate(index, 'quantity', clamp((material.quantity || 1) + 1, 1, 10000));
  }, [index, material.quantity, onUpdate]);

  const handleDecrement = useCallback(() => {
    onUpdate(index, 'quantity', clamp((material.quantity || 1) - 1, 1, 10000));
  }, [index, material.quantity, onUpdate]);

  const photoKey = selectedApplicationId ? `${selectedApplicationId}-${index}` : `temp-${index}`;
  const photos = capturedPhotos?.[photoKey] || [];

  return (
    <article
      className="material-row bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60 hover:border-indigo-300/60 dark:hover:border-indigo-600/60 transition-all"
      role="listitem"
      aria-labelledby={`material-label-${index}`}
    >
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Description with autocomplete */}
        <div className="flex-1 relative">
          <label htmlFor={`material-${index}`} className="sr-only">{t('materialDescription')}</label>
          <input
            id={`material-${index}`}
            ref={inputRef}
            type="text"
            value={material.description}
            onChange={(e) => onUpdate(index, 'description', sanitizeInput(e.target.value))}
            onFocus={() => setLocalSuggestions(localSuggestions.length > 0 ? localSuggestions : [])}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-600/60 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            placeholder={t('materialDescriptionPlaceholder')}
            required
            aria-autocomplete="list"
            aria-controls={localSuggestions.length > 0 ? listboxId : undefined}
            aria-activedescendant={activeIndex >= 0 ? `${listboxId}-item-${activeIndex}` : undefined}
          />
          
          {showSuggestions && localSuggestions.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              className="absolute z-20 mt-2 w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200/60 dark:border-gray-600/60 rounded-xl shadow-xl max-h-40 overflow-auto form-enter"
            >
              {localSuggestions.map((suggestion, idx) => (
                <li
                  key={idx}
                  id={`${listboxId}-item-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={`px-4 py-2.5 cursor-pointer text-gray-900 dark:text-white transition-all ${
                    idx === activeIndex 
                      ? 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 text-indigo-900 dark:text-indigo-100 border-l-4 border-indigo-500' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSuggestionSelect(index, suggestion);
                    setLocalSuggestions([]);
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Quantity + Unit + Actions */}
        <div className="flex items-center gap-3">
          {/* Quantity Stepper */}
          <div className="quantity-stepper flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-1">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={material.quantity <= 1}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('decreaseQuantity')}
            >
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>
            <input
              type="number"
              min="1"
              max="10000"
              value={material.quantity}
              onChange={handleQuantityChange}
              className="w-14 text-center px-2 py-1.5 bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white font-medium"
              aria-label={t('quantity')}
            />
            <button
              type="button"
              onClick={handleIncrement}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 transition-colors"
              aria-label={t('increaseQuantity')}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          
          {/* Unit Select */}
          <select
            value={material.unit}
            onChange={(e) => onUpdate(index, 'unit', e.target.value)}
            className="px-3 py-2.5 border border-gray-200/60 dark:border-gray-600/60 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            aria-label={t('unit')}
          >
            {unitOptions.map(unit => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
          
          {/* Photo Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAddPhoto?.(index)}
              className="p-2.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
              title={t('addPhoto') || 'Добавить фото'}
              aria-label={t('addPhoto') || 'Добавить фото'}
            >
              <Camera className="w-4.5 h-4.5" aria-hidden="true" />
            </button>
            
            {/* Remove Button */}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="p-2.5 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              aria-label={t('removeMaterial')}
              title={t('removeMaterial')}
            >
              <Trash2 className="w-4.5 h-4.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Display captured photos */}
      {photos.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {photos.map((url, i) => (
            <div key={i} className="relative group">
              <img 
                src={url} 
                alt={`${t('materialPhoto') || 'Фото материала'} ${i + 1}`}
                className="w-12 h-12 object-cover rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm"
              />
              <button
                type="button"
                onClick={() => {
                  // Optional: handle photo removal
                  const newPhotos = photos.filter((_, idx) => idx !== i);
                  // You would need to pass this up to parent
                  if (onUpdate) {
                    onUpdate(index, 'photos', newPhotos);
                  }
                }}
                className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t('removePhoto') || 'Удалить фото'}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
});
MaterialRow.displayName = 'MaterialRow';

const TemplateSelector = memo(({ templates, onLoad, t }) => {
  if (!templates?.length) return null;
  
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('selectTemplate')}
        </label>
        <div className="relative">
          <select
            id="template-select"
            onChange={(e) => {
              const template = templates.find(tpl => tpl.id === parseInt(e.target.value));
              if (template) onLoad(template.materials, template.template_name);
              e.target.value = '';
            }}
            className="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-600/60 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
            defaultValue=""
          >
            <option value="" disabled>{t('selectTemplate')}</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                {sanitizeInput(template.template_name)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
});
TemplateSelector.displayName = 'TemplateSelector';

const SubmitButton = memo(({ canSubmit, isLoading, t }) => (
  <button
    type="submit"
    disabled={!canSubmit}
    className={`w-full py-4 px-6 rounded-2xl font-semibold shadow-lg transition-all duration-300 flex items-center justify-center gap-3 focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
      canSubmit
        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white hover:shadow-xl hover:scale-[1.02] focus:ring-indigo-500'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none'
    }`}
    aria-busy={isLoading}
  >
    {isLoading ? (
      <>
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        <span className="text-lg">{t('sending')}</span>
      </>
    ) : (
      <>
        <Send className="w-5 h-5" aria-hidden="true" />
        <span className="text-lg">{t('sendApplication')}</span>
      </>
    )}
  </button>
));
SubmitButton.displayName = 'SubmitButton';

// ─────────────────────────────────────────────────────────────
// 🎨 MODAL COMPONENT
// ─────────────────────────────────────────────────────────────

const TemplateModal = memo(({ templateName, setTemplateName, onSave, onClose, t }) => {
  const inputRef = useRef(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && templateName.trim()) onSave();
  }, [templateName, onSave, onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 fade-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
      onKeyDown={handleKeyDown}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md p-6 outline-none form-enter border border-gray-200/50 dark:border-gray-700/50">
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <Briefcase className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <h3 id="template-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
              {t('saveAsTemplate')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>
        
        <div className="space-y-5">
          <div>
            <label htmlFor="template-name-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('templateName')}
            </label>
            <input
              id="template-name-input"
              ref={inputRef}
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(sanitizeInput(e.target.value, 100))}
              onKeyDown={handleKeyDown}
              className="w-full px-4 py-3 border border-gray-200/60 dark:border-gray-600/60 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder={t('templateNamePlaceholder')}
              maxLength={100}
              required
            />
          </div>
          
          <footer className="flex justify-end gap-3 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-700 hover:text-gray-900 font-medium dark:text-gray-300 dark:hover:text-gray-100 transition-colors rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              {t('cancel')}
            </button>
            <button
              onClick={onSave}
              disabled={!templateName.trim()}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                templateName.trim()
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              {t('save')}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
});
TemplateModal.displayName = 'TemplateModal';

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────

const CreateApplicationForm = memo(({
  formData,
  setFormData,
  templates,
  showTemplateModal,
  setShowTemplateModal,
  templateName,
  setTemplateName,
  t,
  handleSubmit,
  handlePhoneChange,
  addMaterial,
  removeMaterial,
  updateMaterial,
  restoreFromCart,
  removeFromCartPermanently,
  selectObject,
  handleObjectInput,
  saveTemplate,
  selectMaterial,
  loadTemplate,
  filteredObjects,
  showObjectSuggestions,
  setShowObjectSuggestions,
  objectInputRef,
  materialHistory,
  showMaterialSuggestions,
  unitOptions = UNIT_OPTIONS,
  onExcelImport,
  onCloneLast,
  onDownloadTemplate,
  isLoading,
  fileInputRef,
  capturedPhotos,
  selectedApplication,
  onAddPhoto,
  // Добавленные пропсы
  selectedClientId,
  onClientSelect,
  companyId
}) => {
  // ─────────────────────────────────────────────────────────
  // 📊 STATE & REFS
  // ─────────────────────────────────────────────────────────
  
  const [objectSearch, setObjectSearch] = useState('');
  const [activeObjectIndex, setActiveObjectIndex] = useState(-1);
  const [formErrors, setFormErrors] = useState({});
  
  const objectListRef = useRef(null);
  const formRef = useRef(null);
  
  const debouncedObjectSearch = useDebounce(objectSearch, DEBOUNCE_MS);

  // ─────────────────────────────────────────────────────────
  // 🎨 INJECT STYLES
  // ─────────────────────────────────────────────────────────
  
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  // ─────────────────────────────────────────────────────────
  // 🔁 MEMOIZED VALUES
  // ─────────────────────────────────────────────────────────
  
  const filteredObjectsMemo = useMemo(() => {
    if (!debouncedObjectSearch) return filteredObjects.slice(0, 10);
    return filteredObjects
      .filter(obj => obj.toLowerCase().includes(debouncedObjectSearch.toLowerCase()))
      .slice(0, 10);
  }, [debouncedObjectSearch, filteredObjects]);

  const canSubmit = useMemo(() => {
    return (
      formData.objectName.trim() &&
      formData.foremanName.trim() &&
      PHONE_REGEX.test(formData.foremanPhone) &&
      formData.materials.length > 0 &&
      formData.materials.every(m => m.description.trim() && m.quantity >= 1) &&
      !isLoading
    );
  }, [formData, isLoading]);

  // ─────────────────────────────────────────────────────────
  // ⌨️ KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────────────
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Enter / Cmd+Enter — отправить форму
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && canSubmit && !isLoading) {
        e.preventDefault();
        formRef.current?.requestSubmit();
        return;
      }
      // Escape — закрыть модалки/списки
      if (e.key === 'Escape') {
        setShowObjectSuggestions(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [canSubmit, isLoading, setShowObjectSuggestions]);

  // ─────────────────────────────────────────────────────────
  // 🎛️ ОБРАБОТЧИКИ
  // ─────────────────────────────────────────────────────────
  
  const handleObjectKeyDown = useCallback((e) => {
    if (!showObjectSuggestions || filteredObjectsMemo.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveObjectIndex(prev => Math.min(prev + 1, filteredObjectsMemo.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveObjectIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && activeObjectIndex >= 0) {
      e.preventDefault();
      selectObject(filteredObjectsMemo[activeObjectIndex]);
      setShowObjectSuggestions(false);
      setActiveObjectIndex(-1);
    } else if (e.key === 'Escape') {
      setShowObjectSuggestions(false);
      setActiveObjectIndex(-1);
    }
  }, [showObjectSuggestions, filteredObjectsMemo, activeObjectIndex, selectObject, setShowObjectSuggestions]);

  const handleMaterialSuggestionSelect = useCallback((index, suggestion) => {
    selectMaterial(index, suggestion);
  }, [selectMaterial]);

  const validateForm = useCallback(() => {
    const errors = {};
    if (!formData.objectName.trim()) errors.objectName = t('requiredField');
    if (!formData.foremanName.trim()) errors.foremanName = t('requiredField');
    if (!PHONE_REGEX.test(formData.foremanPhone)) errors.foremanPhone = t('invalidPhone');
    if (formData.materials.some(m => !m.description.trim() || m.quantity < 1)) {
      errors.materials = t('invalidMaterials');
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, t]);

  const onSubmit = useCallback((e) => {
    e.preventDefault();
    if (validateForm()) {
      handleSubmit(e);
    }
  }, [validateForm, handleSubmit]);

  // Закрытие dropdown при клике вне
  useClickOutside(objectListRef, () => setShowObjectSuggestions(false));

  // ─────────────────────────────────────────────────────────
  // 📋 РЕНДЕРИНГ
  // ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 border border-gray-200/50 dark:border-gray-700/50 form-enter">
        
        {/* Header */}
        <FormHeader t={t} />
        
        {/* Quick Actions */}
        <QuickActions
          onCloneLast={onCloneLast}
          onDownloadTemplate={onDownloadTemplate}
          onImportExcel={() => fileInputRef?.current?.click()}
          onSaveTemplate={() => setShowTemplateModal(true)}
          t={t}
        />
        
        <form ref={formRef} onSubmit={onSubmit} className="space-y-6" noValidate>
          
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onExcelImport}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
          
          {/* Object Name with Autocomplete */}
          <ObjectInput
            value={formData.objectName}
            onChange={(e) => {
              setObjectSearch(e.target.value);
              handleObjectInput?.(e);
            }}
            onFocus={() => setShowObjectSuggestions(true)}
            onKeyDown={handleObjectKeyDown}
            suggestions={filteredObjectsMemo}
            showSuggestions={showObjectSuggestions}
            activeIndex={activeObjectIndex}
            onSelect={(obj) => {
              selectObject(obj);
              setShowObjectSuggestions(false);
            }}
            error={formErrors.objectName}
            t={t}
            inputRef={objectInputRef}
            listRef={objectListRef}
          />

          {/* Выбор заказчика */}
          {companyId && onClientSelect && (
            <ClientSelector
              companyId={companyId}
              selectedClientId={selectedClientId}
              onSelect={onClientSelect}
              t={t}
            />
          )}

          {/* Foreman Name */}
          <ForemanField
            id="foremanName"
            label={t('foremanName')}
            value={formData.foremanName}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, foremanName: sanitizeInput(e.target.value) }));
              if (formErrors.foremanName) setFormErrors(prev => ({ ...prev, foremanName: null }));
            }}
            placeholder={t('foremanNamePlaceholder')}
            error={formErrors.foremanName}
          />

          {/* Foreman Phone */}
          <ForemanField
            id="foremanPhone"
            label={t('foremanPhone')}
            value={formData.foremanPhone}
            onChange={handlePhoneChange}
            type="tel"
            placeholder={t('phonePlaceholder')}
            error={formErrors.foremanPhone}
            pattern="^[\d\s+()-]{10,20}$"
          />

          {/* Warehouse Info */}
          <WarehouseInfo t={t} />

          {/* Templates Section */}
          <TemplateSelector
            templates={templates}
            onLoad={loadTemplate}
            t={t}
          />

          {/* Material Cart */}
          {formData.cart?.length > 0 && (
            <MaterialCart
              cart={formData.cart}
              restoreMaterial={restoreFromCart}
              removeMaterialPermanently={removeFromCartPermanently}
              t={t}
              isStandaloneView={false}
            />
          )}

          {/* Materials List */}
          <section aria-labelledby="materials-heading">
            <div className="flex justify-between items-center mb-4">
              <h3 id="materials-heading" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Package className="w-4 h-4" aria-hidden="true" />
                {t('materials')} <span className="text-red-500" aria-hidden="true">*</span>
              </h3>
              <button
                type="button"
                onClick={addMaterial}
                className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors focus:ring-2 focus:ring-indigo-500"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm font-medium">{t('addMaterial')}</span>
              </button>
            </div>
            
            {formErrors.materials && (
              <p className="mb-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5" role="alert">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                {formErrors.materials}
              </p>
            )}
            
            <div className="space-y-3" role="list" aria-label={t('materialsList')}>
              {formData.materials.map((material, index) => (
                <MaterialRow
                  key={index}
                  material={material}
                  index={index}
                  onUpdate={updateMaterial}
                  onRemove={removeMaterial}
                  onAddPhoto={onAddPhoto}
                  capturedPhotos={capturedPhotos}
                  selectedApplicationId={selectedApplication?.id}
                  suggestions={materialHistory}
                  showSuggestions={!!showMaterialSuggestions[index]}
                  onSuggestionSelect={handleMaterialSuggestionSelect}
                  unitOptions={unitOptions}
                  t={t}
                />
              ))}
            </div>
          </section>

          {/* Submit Button */}
          <SubmitButton canSubmit={canSubmit} isLoading={isLoading} t={t} />
          
          {/* Keyboard hints */}
          <div className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded mr-2">Ctrl+Enter — отправить</span>
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded">Esc — закрыть список</span>
          </div>
        </form>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          templateName={templateName}
          setTemplateName={setTemplateName}
          onSave={saveTemplate}
          onClose={() => setShowTemplateModal(false)}
          t={t}
        />
      )}
    </div>
  );
});

CreateApplicationForm.displayName = 'CreateApplicationForm';

export default CreateApplicationForm;