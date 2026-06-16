// src/components/MobileMaterialCard.jsx
import React, { useMemo, useCallback, memo } from 'react';
import { ChevronDown, CheckCircle, Warehouse, Send, Hourglass, Camera, ScanLine } from 'lucide-react';

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

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ
// ─────────────────────────────────────────────────────────────
const StatusBadge = memo(({ material, t }) => {
  const requestedQty = Number(material.quantity) || 0;
  const onWarehouse = Number(material.supplier_received_quantity) || 0;
  const confirmed = Number(material.received) || 0;
  const itemStatus = material.status;

  let config;
  if (confirmed >= requestedQty && requestedQty > 0) {
    config = {
      text: t('statusReceived'),
      icon: CheckCircle,
      colorClass: 'text-green-800 bg-green-100 dark:bg-green-900/40 dark:text-green-200'
    };
  } else if (onWarehouse > 0 && confirmed < requestedQty) {
    config = {
      text: t('itemStatusOnWarehouse') || 'На складе',
      icon: Warehouse,
      colorClass: 'text-blue-800 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-200'
    };
  } else if (itemStatus === 'sent_to_master') {
    config = {
      text: t('itemStatusSent') || 'Отправлено',
      icon: Send,
      colorClass: 'text-purple-800 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-200'
    };
  } else {
    config = {
      text: t('statusPending'),
      icon: Hourglass,
      colorClass: 'text-orange-800 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-200'
    };
  }

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.colorClass}`} role="status">
      <Icon className="w-3 h-3" aria-hidden="true" />
      {config.text}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

const ProgressBar = memo(({ received, requested, unit }) => {
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
const MobileMaterialCard = memo(({ 
  material, 
  index, 
  t, 
  isOpen, 
  onToggle,
  onPhotoClick,
  onQRClick 
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
  // ❌ УДАЛЕНА НЕИСПОЛЬЗУЕМАЯ ПЕРЕМЕННАЯ progress

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
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-all"
      role="listitem"
    >
      {/* ✅ Заголовок — большая область нажатия */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="w-full p-3 flex items-center justify-between min-h-[48px] active:bg-gray-50 dark:active:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset"
        aria-expanded={isOpen}
        aria-controls={`material-details-${index}`}
        aria-label={`${t('material')} ${index + 1}: ${description || t('unnamed')}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
            {index + 1}
          </span>
          
          <span 
            className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1"
            title={description || undefined}
          >
            {description || <span className="text-gray-400 italic">{t('unnamed')}</span>}
          </span>
          
          {/* Компактный статус */}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
            isComplete 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : receivedQty > 0
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {isComplete ? '✅' : receivedQty > 0 ? '⏳' : '📦'}
          </span>
        </div>
        
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 transition-transform ml-2 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
          aria-hidden="true"
        />
      </button>
      
      {/* ✅ Раскрывающиеся детали */}
      {isOpen && (
        <div 
          id={`material-details-${index}`}
          className="p-3 pt-0 border-t border-gray-100 dark:border-gray-700"
          role="region"
          aria-label={t('materialDetails')}
        >
          {/* Статус */}
          <div className="mb-3 mt-2">
            <StatusBadge material={material} t={t} />
          </div>
          
          {/* Количество */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">{t('requested')}</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{quantity}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">{t('received')}</p>
              <p className={`font-medium mt-0.5 ${isComplete ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                {received}
              </p>
            </div>
          </div>
          
          {/* Информация о складе */}
          {showWarehouseInfo && (
            <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Warehouse className="w-3 h-3" aria-hidden="true" />
                {t('onWarehouse')}: {onWarehouseQty} {material.unit}
              </p>
            </div>
          )}
          
          {/* Прогресс */}
          {(receivedQty > 0 || showWarehouseInfo) && (
            <ProgressBar 
              received={material.received} 
              requested={material.quantity} 
              unit={material.unit} 
            />
          )}
          
          {/* Действия с материалами */}
          <div className="flex gap-2 mt-3">
            {onPhotoClick && (
              <button 
                onClick={() => onPhotoClick(index)}
                className="flex-1 touch-target px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <Camera className="w-3.5 h-3.5" />
                {t('photo') || 'Фото'}
              </button>
            )}
            {onQRClick && (
              <button 
                onClick={onQRClick}
                className="flex-1 touch-target px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors hover:bg-purple-100 dark:hover:bg-purple-900/30"
              >
                <ScanLine className="w-3.5 h-3.5" />
                QR
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
});

MobileMaterialCard.displayName = 'MobileMaterialCard';

export default MobileMaterialCard;