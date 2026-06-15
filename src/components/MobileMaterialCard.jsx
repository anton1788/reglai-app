import React, { useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, Package, CheckCircle, AlertCircle, Clock, Warehouse, Send, XCircle, Hourglass } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// 📦 КОНСТАНТЫ
// ─────────────────────────────────────────────────────────────

const MAX_DESCRIPTION_LENGTH = 150;

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ
// ─────────────────────────────────────────────────────────────

const sanitizeText = (text, maxLength = MAX_DESCRIPTION_LENGTH) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[<>]/g, '')
    .slice(0, maxLength)
    .trim();
};

const formatQuantity = (value, unit) => {
  const num = parseInt(value, 10);
  return isNaN(num) ? '—' : `${num.toLocaleString()} ${sanitizeText(unit || '', 10)}`;
};

// Получение конфигурации статуса материала
const getMaterialStatusConfig = (material, t) => {
  const requestedQty = Number(material.quantity) || 0;
  const onWarehouse = Number(material.supplier_received_quantity) || 0;
  const confirmed = Number(material.received) || 0;
  const itemStatus = material.status;

  if (confirmed >= requestedQty && requestedQty > 0) {
    return {
      text: t('statusReceived'),
      icon: CheckCircle,
      colorClass: 'text-green-800 bg-green-100 dark:bg-green-900/40 dark:text-green-200'
    };
  }
  if (onWarehouse > 0 && confirmed < requestedQty) {
    return {
      text: t('itemStatusOnWarehouse') || 'На складе',
      icon: Warehouse,
      colorClass: 'text-blue-800 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200'
    };
  }
  if (itemStatus === 'sent_to_master') {
    return {
      text: t('itemStatusSent') || 'Отправлено',
      icon: Send,
      colorClass: 'text-purple-800 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-200'
    };
  }
  return {
    text: t('statusPending'),
    icon: Hourglass,
    colorClass: 'text-orange-800 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-200'
  };
};

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ
// ─────────────────────────────────────────────────────────────

const StatusBadge = React.memo(({ material, t }) => {
  const config = getMaterialStatusConfig(material, t);
  const Icon = config.icon;
  
  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.colorClass}`}
      role="status"
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {config.text}
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
    <div className="mt-2">
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
  
  const requestedQty = Number(material.quantity) || 0;
  const receivedQty = Number(material.received) || 0;
  const onWarehouseQty = Number(material.supplier_received_quantity) || 0;
  
  const showWarehouseInfo = onWarehouseQty > 0 && receivedQty < requestedQty;
  const isComplete = receivedQty >= requestedQty && requestedQty > 0;

  // ─────────────────────────────────────────────────────────
  // 🎛️ ОБРАБОТЧИКИ
  // ─────────────────────────────────────────────────────────
  
  const handleToggle = useCallback((e) => {
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
      className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 transition-all"
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
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
            {index + 1}
          </span>
          <span 
            className="text-gray-700 dark:text-gray-300 truncate text-sm"
            title={description || undefined}
          >
            {description || <span className="text-gray-400 italic">{t('unnamed')}</span>}
          </span>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {/* Краткая информация о количестве */}
          <div className="text-right hidden xs:block">
            <p className="text-xs font-medium text-gray-900 dark:text-white">
              {requestedQty} {material.unit}
            </p>
            {receivedQty > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400">
                {receivedQty}
              </p>
            )}
          </div>
          
          <span aria-hidden="true">
            {isOpen 
              ? <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform" /> 
              : <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform" />
            }
          </span>
        </div>
      </button>
      
      {/* Expandable Content */}
      {isOpen && (
        <div 
          id={`material-details-${index}`}
          className="px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700"
          role="region"
          aria-label={t('materialDetails')}
        >
          {/* Статус */}
          <div className="mb-3">
            <StatusBadge material={material} t={t} />
          </div>
          
          {/* Детали в виде сетки */}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400 text-xs">{t('requested')}</dt>
              <dd className="font-medium text-gray-900 dark:text-white mt-0.5">{quantity}</dd>
            </div>
            
            <div>
              <dt className="text-gray-500 dark:text-gray-400 text-xs">{t('received')}</dt>
              <dd className={`font-medium mt-0.5 ${isComplete ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                {received}
              </dd>
            </div>
          </dl>
          
          {/* Информация о наличии на складе */}
          {showWarehouseInfo && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Warehouse className="w-3 h-3" />
                {t('onWarehouse')}: {onWarehouseQty} {material.unit}
              </p>
            </div>
          )}
          
          {/* Progress Bar */}
          {(receivedQty > 0 || showWarehouseInfo) && (
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