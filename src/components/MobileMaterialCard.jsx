// src/components/MobileMaterialCard.jsx
import React, { useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, Package, CheckCircle, AlertCircle, Clock } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// 📦 КОНСТАНТЫ
// ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  received: {
    labelKey: 'statusReceived',
    icon: CheckCircle,
    colorClass: 'text-blue-800 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200',
    progressColor: 'bg-blue-500'
  },
  partial: {
    labelKey: 'statusPartial',
    icon: AlertCircle,
    colorClass: 'text-amber-800 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-200',
    progressColor: 'bg-amber-500'
  },
  pending: {
    labelKey: 'statusPending',
    icon: Clock,
    colorClass: 'text-orange-800 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-200',
    progressColor: 'bg-orange-500'
  }
};

const DEFAULT_STATUS = {
  labelKey: 'statusUnknown',
  icon: AlertCircle,
  colorClass: 'text-gray-800 bg-gray-100 dark:bg-gray-700/40 dark:text-gray-200',
  progressColor: 'bg-gray-500'
};

const MAX_DESCRIPTION_LENGTH = 150;

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ
// ─────────────────────────────────────────────────────────────

const sanitizeText = (text, maxLength = MAX_DESCRIPTION_LENGTH) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[<>]/g, '') // Базовая XSS-защита
    .slice(0, maxLength)
    .trim();
};

const formatQuantity = (value, unit) => {
  const num = parseInt(value, 10);
  return isNaN(num) ? '—' : `${num} ${sanitizeText(unit || '', 10)}`;
};

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ (мемоизированные)
// ─────────────────────────────────────────────────────────────

const StatusBadge = React.memo(({ status, t }) => {
  const config = STATUS_CONFIG[status] || DEFAULT_STATUS;
  const Icon = config.icon;
  
  return (
    <span 
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${config.colorClass}`}
      role="status"
      aria-label={t(config.labelKey) || config.labelKey}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {t(config.labelKey) || config.labelKey}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

const ProgressBar = React.memo(({ received, requested, unit }) => {
  const requestedNum = parseInt(requested, 10) || 0;
  const receivedNum = parseInt(received, 10) || 0;
  const progress = requestedNum > 0 ? Math.min(100, Math.round((receivedNum / requestedNum) * 100)) : 0;
  const isComplete = progress === 100;
  
  return (
    <div className="mt-2" aria-label="Progress">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600 dark:text-gray-400">
          {receivedNum}/{requestedNum} {sanitizeText(unit || '', 10)}
        </span>
        <span className="text-gray-500 dark:text-gray-500">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ease-out ${
            isComplete ? 'bg-green-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
});
ProgressBar.displayName = 'ProgressBar';

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────

// ✅ ИСПРАВЛЕНИЕ 1: Удалили неиспользуемый проп 'language'
const MobileMaterialCard = React.memo(({ 
  material, 
  index, 
  t, 
  isOpen, 
  onToggle 
}) => {
  // ─────────────────────────────────────────────────────────
  // 📋 MEMOIZED VALUES
  // ─────────────────────────────────────────────────────────
  
  const description = useMemo(() => sanitizeText(material.description), [material.description]);
  const quantity = useMemo(() => formatQuantity(material.quantity, material.unit), [material.quantity, material.unit]);
  const received = useMemo(() => formatQuantity(material.received, material.unit), [material.received, material.unit]);
  // ✅ ИСПРАВЛЕНИЕ 2: Удалили неиспользуемый statusConfig — StatusBadge сам обрабатывает конфиг

  // ─────────────────────────────────────────────────────────
  // 🎛️ ОБРАБОТЧИКИ
  // ─────────────────────────────────────────────────────────
  
  const handleToggle = useCallback((e) => {
    // Поддержка клавиатуры
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') {
      return;
    }
    if (e.type === 'keydown') {
      e.preventDefault();
    }
    onToggle?.();
  }, [onToggle]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      onToggle?.();
    }
  }, [isOpen, onToggle]);

  // ─────────────────────────────────────────────────────────
  // 📋 РЕНДЕРИНГ
  // ─────────────────────────────────────────────────────────

  return (
    <article 
      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
      role="listitem"
    >
      {/* Header / Toggle Button */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset"
        aria-expanded={isOpen}
        aria-controls={`material-details-${index}`}
        aria-label={`${t('material')} ${index + 1}: ${description || t('unnamed')}`}
        role="button"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
            {index + 1}
          </span>
          <span 
            className="text-gray-700 dark:text-gray-300 truncate"
            title={description || undefined}
          >
            {description || <span className="text-gray-400 italic">{t('unnamed')}</span>}
          </span>
        </div>
        
        <span className="flex-shrink-0 ml-2" aria-hidden="true">
          {isOpen 
            ? <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform" /> 
            : <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform" />
          }
        </span>
      </button>
      
      {/* Expandable Content */}
      {isOpen && (
        <div 
          id={`material-details-${index}`}
          className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-1 duration-200"
          role="region"
          aria-label={t('materialDetails')}
        >
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {/* Requested */}
            <div>
              <dt className="text-gray-500 dark:text-gray-400 text-xs">{t('requested')}</dt>
              <dd className="font-medium text-gray-900 dark:text-white mt-0.5">{quantity}</dd>
            </div>
            
            {/* Received */}
            <div>
              <dt className="text-gray-500 dark:text-gray-400 text-xs">{t('received')}</dt>
              <dd className="font-medium text-gray-900 dark:text-white mt-0.5">{received}</dd>
            </div>
            
            {/* Status - full width */}
            <div className="col-span-2">
              <dt className="text-gray-500 dark:text-gray-400 text-xs">{t('status')}</dt>
              <dd className="mt-1">
                <StatusBadge status={material.status} t={t} />
              </dd>
            </div>
          </dl>
          
          {/* Progress Bar - show if there's any received quantity */}
          {(material.received > 0 || material.status === 'partial') && (
            <ProgressBar 
              received={material.received} 
              requested={material.quantity} 
              unit={material.unit} 
            />
          )}
        </div>
      )}
    </article>
  );
});

MobileMaterialCard.displayName = 'MobileMaterialCard';

export default MobileMaterialCard;