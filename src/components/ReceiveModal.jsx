// src/components/ReceiveModal.jsx

import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
  X, CheckCircle, XCircle, Package, Warehouse, Send, AlertCircle,
  Loader2, Info, ChevronDown, ChevronUp, CheckCircle2, FileText,
  Camera, QrCode, Shield, Mail, Printer, Download, User, Calendar,
  Building, Phone, MapPin, Truck, Clock, Eye, Edit3, Trash2,
  Plus, Minus, Save, RefreshCw, AlertTriangle
} from 'lucide-react';
import { useApplicationFlow } from '../features/applications/hooks/useApplicationFlow';
import {
  APPLICATION_STATUS,
  ITEM_STATUS,
  getStatusText,
  STATUS_COLORS,
} from '../utils/applicationStatuses';
import { usePriceVisibility } from '../hooks/usePriceVisibility';
import { sanitizeMaterialForMaster } from '../utils/materialSanitizer';
import QRScanner from './Mobile/QRScanner';
import PhotoCapture from './Mobile/PhotoCapture';

// ─────────────────────────────────────────────────────────────
// 🎨 СТИЛИ И АНИМАЦИИ
// ─────────────────────────────────────────────────────────────
const ANIMATION_DURATION = 200;

const styles = `
@keyframes slideIn {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
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
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.modal-enter { animation: slideIn ${ANIMATION_DURATION}ms ease-out forwards; }
.fade-enter { animation: fadeIn ${ANIMATION_DURATION}ms ease-out forwards; }
.pulse { animation: pulse 2s ease-in-out infinite; }
.shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.slide-down { animation: slideDown 200ms ease-out forwards; }
.quantity-stepper input::-webkit-outer-spin-button,
.quantity-stepper input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.quantity-stepper input[type=number] {
  -moz-appearance: textfield;
}
.material-row {
  transition: all 0.2s ease;
  will-change: transform, box-shadow;
}
.material-row:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.08);
}
.material-row.confirmed {
  border-left: 4px solid #22c55e;
}
.material-row.rejected {
  border-left: 4px solid #ef4444;
}
.material-row.partial {
  border-left: 4px solid #f59e0b;
}
.progress-bar {
  transition: width 0.5s ease;
}
`;

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ
// ─────────────────────────────────────────────────────────────
const formatNumber = (num) => new Intl.NumberFormat('ru-RU').format(num || 0);
const formatDate = (date) => date ? new Date(date).toLocaleString('ru-RU') : '—';

const clamp = (value, min = 0, max = 10000) => {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(num) ? min : Math.max(min, Math.min(num, max));
};

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ
// ─────────────────────────────────────────────────────────────

// ✅ Статус материала
const MaterialStatusBadge = memo(function({ status, t }) {
  const config = {
    [ITEM_STATUS.PENDING]: { 
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', 
      icon: Clock,
      label: 'statusPending' 
    },
    [ITEM_STATUS.ON_WAREHOUSE]: { 
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', 
      icon: Warehouse,
      label: 'itemStatusOnWarehouse' 
    },
    [ITEM_STATUS.SENT_TO_MASTER]: { 
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', 
      icon: Truck,
      label: 'itemStatusSent' 
    },
    [ITEM_STATUS.CONFIRMED]: { 
      color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', 
      icon: CheckCircle,
      label: 'itemStatusConfirmed' 
    },
    [ITEM_STATUS.REJECTED]: { 
      color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', 
      icon: XCircle,
      label: 'itemStatusRejected' 
    },
    [ITEM_STATUS.PARTIAL_RECEIVED]: { 
      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', 
      icon: AlertCircle,
      label: 'itemStatusPartial' 
    },
  };
  
  const itemConfig = config[status] || config[ITEM_STATUS.PENDING];
  const Icon = itemConfig.icon;
  const colorClass = itemConfig.color;
  const labelKey = itemConfig.label;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      {t(labelKey) || status}
    </span>
  );
});
MaterialStatusBadge.displayName = 'MaterialStatusBadge';

// ✅ Прогресс-бар для материала
const MaterialProgress = memo(function({ requested, onWarehouse, confirmed, sentToMaster = 0 }) {
  const warehousePercent = requested > 0 ? Math.round((onWarehouse / requested) * 100) : 0;
  const confirmedPercent = requested > 0 ? Math.round((confirmed / requested) * 100) : 0;
  const sentPercent = requested > 0 ? Math.round((sentToMaster / requested) * 100) : 0;
  
  return (
    <div className="space-y-2">
      {/* На складе */}
      <div className="flex items-center gap-2 text-xs">
        <Warehouse className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full progress-bar"
            style={{ width: Math.min(warehousePercent, 100) + '%' }}
          />
        </div>
        <span className="text-blue-600 dark:text-blue-400 font-medium w-14 text-right text-xs">
          {formatNumber(onWarehouse)}/{formatNumber(requested)}
        </span>
      </div>
      
      {/* Отправлено мастеру */}
      {sentToMaster > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <Truck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full progress-bar"
              style={{ width: Math.min(sentPercent, 100) + '%' }}
            />
          </div>
          <span className="text-purple-600 dark:text-purple-400 font-medium w-14 text-right text-xs">
            {formatNumber(sentToMaster)}/{formatNumber(requested)}
          </span>
        </div>
      )}
      
      {/* Подтверждено мастером */}
      {confirmed > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full progress-bar"
              style={{ width: Math.min(confirmedPercent, 100) + '%' }}
            />
          </div>
          <span className="text-green-600 dark:text-green-400 font-medium w-14 text-right text-xs">
            {formatNumber(confirmed)}/{formatNumber(requested)}
          </span>
        </div>
      )}
    </div>
  );
});
MaterialProgress.displayName = 'MaterialProgress';

// ✅ Строка материала для админа (приёмка на склад)
const AdminReceiveRow = memo(function({
  material,
  index,
  onUpdate,
  onPhotoClick,
  t,
  hidePrices = false,
  isProcessing = false,
}) {
  const requestedQty = Number(material.quantity) || 0;
  const onWarehouse = Number(material.supplier_received_quantity) || 0;
  const remaining = requestedQty - onWarehouse;
  const isComplete = remaining <= 0;
  
  const unitOptions = ['шт', 'м', 'кг', 'л', 'упак', 'комплект', 'партия', 'м²', 'м³', 'т', 'шт/уп'];
  
  const handleQuantityChange = useCallback(function(e) {
    const rawValue = e.target.value;
    const value = rawValue === '' ? 0 : clamp(parseInt(rawValue, 10), 0, requestedQty);
    onUpdate(index, 'supplier_received_quantity', value);
  }, [index, requestedQty, onUpdate]);
  
  const handleIncrement = useCallback(function() {
    const newValue = clamp(onWarehouse + 1, 0, requestedQty);
    onUpdate(index, 'supplier_received_quantity', newValue);
  }, [index, onWarehouse, requestedQty, onUpdate]);
  
  const handleDecrement = useCallback(function() {
    const newValue = clamp(onWarehouse - 1, 0, requestedQty);
    onUpdate(index, 'supplier_received_quantity', newValue);
  }, [index, onWarehouse, requestedQty, onUpdate]);
  
  const handleMax = useCallback(function() {
    onUpdate(index, 'supplier_received_quantity', requestedQty);
  }, [index, requestedQty, onUpdate]);
  
  return (
    <article className={`material-row bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border ${isComplete ? 'border-green-200 dark:border-green-800' : 'border-gray-200/60 dark:border-gray-700/60'} ${isProcessing ? 'opacity-60' : ''}`}>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                {material.description || '—'}
              </h4>
              {isComplete && (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" aria-hidden="true" />
              )}
            </div>
            <button
              onClick={() => onPhotoClick?.(index)}
              disabled={isProcessing}
              className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 flex-shrink-0"
              title="Добавить фото материала"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          
          <MaterialProgress
            requested={requestedQty}
            onWarehouse={onWarehouse}
            confirmed={Number(material.received) || 0}
            sentToMaster={Number(material.sent_to_master_quantity) || 0}
          />
          
          {/* ЦЕНА - ТОЛЬКО ЕСЛИ НЕ СКРЫТА */}
          {!hidePrices && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
              {material.supplier_price !== undefined && material.supplier_price !== null && (
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  💰 {formatNumber(material.supplier_price)} ₽
                </span>
              )}
              {material.supplier_name && (
                <span className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {material.supplier_name}
                </span>
              )}
              {material.expected_delivery && (
                <span className="text-gray-500 dark:text-gray-400 text-xs flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(material.expected_delivery)}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="quantity-stepper flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-1">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={onWarehouse <= 0 || isProcessing}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('decreaseQuantity')}
            >
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max={requestedQty}
              value={onWarehouse === 0 ? '' : onWarehouse}
              onChange={handleQuantityChange}
              disabled={isProcessing}
              className="w-14 text-center px-1 py-1.5 bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white font-medium text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label={t('quantityOnWarehouse')}
            />
            <button
              type="button"
              onClick={handleIncrement}
              disabled={onWarehouse >= requestedQty || isProcessing}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('increaseQuantity')}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          
          <div className="flex flex-col gap-1">
            <select
              value={material.unit || 'шт'}
              onChange={(e) => onUpdate(index, 'unit', e.target.value)}
              disabled={isProcessing}
              className="px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label={t('unit')}
            >
              {unitOptions.map(function(unit) {
                return <option key={unit} value={unit}>{unit}</option>;
              })}
            </select>
            <button
              onClick={handleMax}
              disabled={isComplete || isProcessing}
              className="text-[10px] text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-40"
            >
              {t('all') || 'все'}
            </button>
          </div>
        </div>
      </div>
      
      {remaining > 0 && !isComplete && (
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
          {t('remainingToAccept')?.replace('{{remaining}}', formatNumber(remaining)) || `Осталось принять: ${formatNumber(remaining)}`}
        </div>
      )}
      
      {isComplete && (
        <div className="mt-3 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
          {t('fullyAccepted') || 'Полностью принят на склад'}
        </div>
      )}
    </article>
  );
});
AdminReceiveRow.displayName = 'AdminReceiveRow';

// ✅ Строка материала для отправки мастеру
const SendToMasterRow = memo(function({
  item,
  index,
  onUpdate,
  t,
  isProcessing = false,
}) {
  const available = (Number(item.supplier_received_quantity) || 0) - (Number(item.sent_to_master_quantity) || 0);
  const qtyToSend = Number(item.quantityToSend) || 0;
  const isFullySent = qtyToSend >= available;
  
  const handleQuantityChange = useCallback(function(e) {
    const rawValue = e.target.value;
    const value = rawValue === '' ? 0 : clamp(parseInt(rawValue, 10), 0, available);
    onUpdate(index, value);
  }, [index, available, onUpdate]);
  
  const handleIncrement = useCallback(function() {
    const newValue = clamp(qtyToSend + 1, 0, available);
    onUpdate(index, newValue);
  }, [index, qtyToSend, available, onUpdate]);
  
  const handleDecrement = useCallback(function() {
    const newValue = clamp(qtyToSend - 1, 0, available);
    onUpdate(index, newValue);
  }, [index, qtyToSend, available, onUpdate]);
  
  const handleMax = useCallback(function() {
    onUpdate(index, available);
  }, [index, available, onUpdate]);
  
  return (
    <article className={`material-row bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border ${isFullySent ? 'border-green-200 dark:border-green-800' : 'border-gray-200/60 dark:border-gray-700/60'} ${isProcessing ? 'opacity-60' : ''}`}>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
              {item.description || '—'}
            </h4>
            {isFullySent && (
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" aria-hidden="true" />
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Warehouse className="w-3.5 h-3.5" />
              {t('onWarehouse')}: {formatNumber(available)} {item.unit}
            </span>
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" />
              {t('alreadySent')}: {formatNumber(item.sent_to_master_quantity || 0)} {item.unit}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="quantity-stepper flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-1">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={qtyToSend <= 0 || isProcessing}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-purple-600 dark:text-purple-400 hover:bg-white dark:hover:bg-purple-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('decreaseQuantity')}
            >
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>
            <input
              type="number"
              min="0"
              max={available}
              value={qtyToSend === 0 ? '' : qtyToSend}
              onChange={handleQuantityChange}
              disabled={isProcessing}
              className="w-14 text-center px-1 py-1.5 bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white font-medium text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label={t('quantityToSend')}
            />
            <button
              type="button"
              onClick={handleIncrement}
              disabled={qtyToSend >= available || isProcessing}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-purple-600 dark:text-purple-400 hover:bg-white dark:hover:bg-purple-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('increaseQuantity')}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <button
            onClick={handleMax}
            disabled={isFullySent || isProcessing}
            className="text-[10px] text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 disabled:opacity-40"
          >
            {t('all') || 'все'}
          </button>
        </div>
      </div>
      
      {!isFullySent && available > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
          {t('availableToSend')?.replace('{{available}}', formatNumber(available)) || `Доступно для отправки: ${formatNumber(available)}`}
        </div>
      )}
    </article>
  );
});
SendToMasterRow.displayName = 'SendToMasterRow';

// ✅ Строка материала для мастера (подтверждение)
const MasterConfirmRow = memo(function({
  material,
  index,
  onUpdate,
  t,
  isProcessing = false,
}) {
  const requestedQty = Number(material.quantity) || 0;
  const onWarehouse = Number(material.supplier_received_quantity) || 0;
  const confirmed = Number(material.received) || 0;
  const available = onWarehouse - confirmed;
  
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [action, setAction] = useState(confirmed > 0 ? 'confirm' : 'pending');
  
  const handleConfirmChange = useCallback(function(e) {
    const value = clamp(e.target.value, 0, available);
    onUpdate(index, 'confirm', value);
    setAction('confirm');
  }, [index, available, onUpdate]);
  
  const handleIncrement = useCallback(function() {
    const newValue = clamp(confirmed + 1, 0, onWarehouse);
    onUpdate(index, 'confirm', newValue);
    setAction('confirm');
  }, [index, confirmed, onWarehouse, onUpdate]);
  
  const handleDecrement = useCallback(function() {
    const newValue = clamp(confirmed - 1, 0, onWarehouse);
    onUpdate(index, 'confirm', newValue);
    if (newValue === 0) setAction('pending');
  }, [index, confirmed, onWarehouse, onUpdate]);
  
  const handleReject = useCallback(function() {
    if (rejectReason.trim()) {
      onUpdate(index, 'reject', 0, rejectReason.trim());
      setAction('reject');
      setShowRejectInput(false);
      setRejectReason('');
    }
  }, [index, rejectReason, onUpdate]);
  
  const handleCancelReject = useCallback(function() {
    onUpdate(index, 'confirm', 0, '');
    setAction('pending');
    setShowRejectInput(false);
    setRejectReason('');
  }, [index, onUpdate]);
  
  const getStatusColor = () => {
    if (action === 'reject') return 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10';
    if (confirmed > 0) return 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10';
    return 'border-gray-200/60 dark:border-gray-700/60';
  };
  
  return (
    <article className={`material-row bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border ${getStatusColor()} ${isProcessing ? 'opacity-60' : ''}`}>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
              {material.description || '—'}
            </h4>
            <MaterialStatusBadge status={material.status} t={t} />
            {action === 'reject' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs">
                <XCircle className="w-3 h-3" />
                {t('rejected') || 'Отклонён'}
              </span>
            )}
          </div>
          <MaterialProgress
            requested={requestedQty}
            onWarehouse={onWarehouse}
            confirmed={confirmed}
            sentToMaster={Number(material.sent_to_master_quantity) || 0}
          />
        </div>
        
        <div className="flex flex-col gap-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="quantity-stepper flex items-center gap-1 bg-green-50 dark:bg-green-900/20 rounded-xl p-1">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={confirmed <= 0 || isProcessing || action === 'reject'}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-green-600 dark:text-green-400 hover:bg-white dark:hover:bg-green-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('decreaseQuantity')}
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <input
                type="number"
                min="0"
                max={onWarehouse}
                value={confirmed === 0 ? '' : confirmed}
                onChange={handleConfirmChange}
                disabled={isProcessing || action === 'reject'}
                className="w-14 text-center px-1 py-1.5 bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white font-medium text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={t('confirmQuantity')}
              />
              <button
                type="button"
                onClick={handleIncrement}
                disabled={confirmed >= onWarehouse || isProcessing || action === 'reject'}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-green-600 dark:text-green-400 hover:bg-white dark:hover:bg-green-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('increaseQuantity')}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            
            {action === 'reject' ? (
              <button
                onClick={handleCancelReject}
                disabled={isProcessing}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                {t('cancelReject') || 'Отменить'}
              </button>
            ) : (
              <button
                onClick={() => { setShowRejectInput(!showRejectInput); }}
                disabled={isProcessing}
                className="px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                aria-label={t('rejectMaterial')}
              >
                <XCircle className="w-4 h-4" aria-hidden="true" />
                {t('reject')}
              </button>
            )}
          </div>
          
          {showRejectInput && action !== 'reject' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 slide-down">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('rejectReasonPlaceholder') || 'Причина отклонения...'}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                aria-label={t('rejectReason')}
              />
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || isProcessing}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('confirmReject') || 'Отклонить'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {available > 0 && action !== 'reject' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
          {t('availableToConfirm')?.replace('{{available}}', formatNumber(available)) || `Доступно для подтверждения: ${formatNumber(available)}`}
        </div>
      )}
      
      {action === 'reject' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
          {t('rejectedWithReason') || `Отклонён: ${rejectReason || 'причина не указана'}`}
        </div>
      )}
    </article>
  );
});
MasterConfirmRow.displayName = 'MasterConfirmRow';

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────
const ReceiveModal = memo(function({
  isOpen,
  onClose,
  selectedApplication,
  language,
  escapeHtml,
  t,
  modalMode = 'admin_receive',
  showNotification,
  userCompanyId,
  userId,
  userRole,
  onApplicationUpdated,
}) {
  // ============================================================
  // 🎯 ИСПОЛЬЗУЕМ НОВЫЙ ХУК
  // ============================================================
  const {
    receiveMaterials,
    sendToMaster,
    confirmByMaster,
    loading: flowLoading,
    error: flowError,
    progress,
    abort,
  } = useApplicationFlow(
    userCompanyId,
    userId,
    selectedApplication?.user_email || '',
    userRole
  );

  // Безопасное получение ID компании
  const safeCompanyId = useMemo(() => {
    if (!userCompanyId) return null;
    if (typeof userCompanyId === 'object' && userCompanyId !== null) {
      return userCompanyId.id || userCompanyId.company_id || null;
    }
    return String(userCompanyId);
  }, [userCompanyId]);

  const { shouldHidePrices, isMaster } = usePriceVisibility(userRole);

  // ─────────────────────────────────────────────────────────
  // 📊 STATE
  // ─────────────────────────────────────────────────────────
  const [localMaterials, setLocalMaterials] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [transferComment, setTransferComment] = useState('');
  const [itemsToSend, setItemsToSend] = useState([]);
  const [confirmations, setConfirmations] = useState([]);
  const modalContentRef = useRef(null);

  // Состояния для фото и QR
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(null);

  // ─────────────────────────────────────────────────────────
  // 📞 INJECT STYLES
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  // ─────────────────────────────────────────────────────────
  // 🎯 FOCUS MANAGEMENT
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => modalContentRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ─────────────────────────────────────────────────────────
  // 🔁 INIT LOCAL MATERIALS
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedApplication?.materials) {
      setLocalMaterials([]);
      return;
    }

    const validMaterials = selectedApplication.materials
      .filter((m) => m.description?.trim())
      .map((m, idx) => ({
        ...m,
        _index: m._index || idx,
        unit: m.unit || 'шт',
        received: Number(m.received) || 0,
        supplier_received_quantity: Number(m.supplier_received_quantity) || 0,
        sent_to_master_quantity: Number(m.sent_to_master_quantity) || 0,
        supplier_price: m.supplier_price || null,
        supplier_name: m.supplier_name || null,
        expected_delivery: m.expected_delivery || null,
      }));

    setLocalMaterials(validMaterials);

    // Инициализация для отправки мастеру
    if (modalMode === 'admin_send_to_master' || modalMode === 'admin_ready_to_issue') {
      const available = validMaterials
        .filter((m) => {
          const onWarehouse = Number(m.supplier_received_quantity) || 0;
          const alreadySent = Number(m.sent_to_master_quantity) || 0;
          const isFullySent = m.status === ITEM_STATUS.SENT_TO_MASTER ||
                             m.status === ITEM_STATUS.CONFIRMED ||
                             alreadySent >= onWarehouse;
          return onWarehouse > 0 && !isFullySent;
        })
        .map((m) => ({
          ...m,
          quantityToSend: Math.min(
            Number(m.supplier_received_quantity) || 0,
            (Number(m.supplier_received_quantity) || 0) - (Number(m.sent_to_master_quantity) || 0)
          ),
        }));
      setItemsToSend(available);
    }

    // Инициализация для мастера
    if (modalMode === 'master_confirm') {
      setConfirmations(validMaterials.map((m, idx) => ({
        materialIndex: idx,
        action: Number(m.received) > 0 ? 'confirm' : 'pending',
        quantity: Number(m.received) || 0,
        feedback: '',
      })));
    }
  }, [selectedApplication, modalMode]);

  // ─────────────────────────────────────────────────────────
  // ⌨️ KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (isSaving || flowLoading) return;

    setIsSaving(true);
    try {
      let result;

      if (modalMode === 'admin_receive') {
        // 🔹 Приёмка на склад
        const items = localMaterials
          .filter((m) => Number(m.supplier_received_quantity) > 0)
          .map((m) => ({
            item_name: m.description,
            quantity: Number(m.supplier_received_quantity) || 0,
            unit: m.unit || 'шт',
            invoice_url: m.invoice_url || null,
          }));

        if (items.length === 0) {
          showNotification(t('noMaterialsToAccept') || 'Нет материалов для приёмки', 'warning');
          setIsSaving(false);
          return;
        }

        result = await receiveMaterials(
          selectedApplication.id,
          items,
          null // invoiceUrl
        );
      } 
      else if (modalMode === 'admin_send_to_master' || modalMode === 'admin_ready_to_issue') {
        // 🔹 Отправка мастеру
        const items = itemsToSend
          .filter((i) => Number(i.quantityToSend) > 0)
          .map((i) => ({
            description: i.description,
            quantityToSend: Number(i.quantityToSend) || 0,
            unit: i.unit || 'шт',
          }));

        if (items.length === 0) {
          showNotification(t('noMaterialsToSend') || 'Нет материалов для отправки', 'warning');
          setIsSaving(false);
          return;
        }

        result = await sendToMaster(
          selectedApplication.id,
          items,
          selectedApplication.object_name,
          selectedApplication.foreman_name,
          selectedApplication.foreman_phone
        );
      } 
      else if (modalMode === 'master_confirm') {
        // 🔹 Подтверждение мастером
        const confirmationsToSend = confirmations.map((c) => ({
          materialIndex: c.materialIndex,
          action: c.action === 'reject' ? 'reject' : (c.action === 'confirm' ? 'confirm' : 'pending'),
          quantity: c.action === 'confirm' ? (Number(c.quantity) || 0) : 0,
          feedback: c.feedback || '',
        }));

        const hasConfirmations = confirmationsToSend.some(c => c.action !== 'pending');
        if (!hasConfirmations) {
          showNotification(t('noConfirmations') || 'Нет подтверждений для обработки', 'warning');
          setIsSaving(false);
          return;
        }

        result = await confirmByMaster(
          selectedApplication.id,
          confirmationsToSend
        );
      }

      // Обработка результата
      if (result?.success) {
        const successMessage = modalMode === 'admin_receive' 
          ? t('materialsAcceptedToWarehouse') || '✅ Материалы приняты на склад'
          : modalMode === 'master_confirm'
            ? t('materialsConfirmed') || '✅ Получение подтверждено'
            : t('materialsSentToMaster') || '✅ Материалы отправлены мастеру';
        
        showNotification(successMessage, 'success');
        onApplicationUpdated?.(result.data);
        onClose?.();
      } else if (result?.aborted) {
        showNotification(t('operationCancelled') || 'Операция отменена', 'info');
      } else {
        showNotification(result?.error || t('operationError') || 'Ошибка выполнения операции', 'error');
      }
    } catch (err) {
      console.error('❌ Ошибка:', err);
      showNotification(err.message || t('unexpectedError') || 'Неожиданная ошибка', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [
    modalMode,
    localMaterials,
    itemsToSend,
    confirmations,
    selectedApplication,
    receiveMaterials,
    sendToMaster,
    confirmByMaster,
    onClose,
    t,
    showNotification,
    onApplicationUpdated,
    isSaving,
    flowLoading,
  ]);

  // Отмена операции (при длительных запросах)
  const handleAbort = useCallback(() => {
    if (flowLoading) {
      abort();
      showNotification(t('cancelling') || 'Отмена операции...', 'info');
    }
  }, [flowLoading, abort, showNotification, t]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (flowLoading) {
          handleAbort();
        } else {
          onClose?.();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSaving && !flowLoading) {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, flowLoading, onClose, handleSave, handleAbort]);

  // ─────────────────────────────────────────────────────────
  // 🎛️ HANDLERS
  // ─────────────────────────────────────────────────────────
  const handleMaterialUpdate = useCallback((index, field, value) => {
    setLocalMaterials((prev) => {
      const updated = prev.map((m, idx) =>
        idx === index ? { ...m, [field]: value } : m
      );
      return updated;
    });
  }, []);

  const handleItemToSendUpdate = useCallback((index, quantity) => {
    setItemsToSend((prev) => {
      const updated = prev.map((item, idx) => {
        if (idx === index) {
          const maxQty = Number(item.supplier_received_quantity) || 0;
          const val = clamp(quantity, 0, maxQty);
          return { ...item, quantityToSend: val };
        }
        return item;
      });
      return updated;
    });
  }, []);

  const handleConfirmationUpdate = useCallback((index, action, quantity, feedback = '') => {
    setConfirmations((prev) => {
      const updated = prev.map((conf, idx) => {
        if (idx === index) {
          return { 
            ...conf, 
            action, 
            quantity: action === 'confirm' ? quantity : 0,
            feedback: action === 'reject' ? feedback : '',
          };
        }
        return conf;
      });
      return updated;
    });
  }, []);

  // Открыть фото для конкретного материала
  const handleOpenPhotoForMaterial = useCallback((materialIndex) => {
    setCurrentMaterialIndex(materialIndex);
    setShowPhotoCapture(true);
  }, []);

  // Обработка фото
  const handlePhotoCapture = useCallback((capturedPhotos) => {
    const photosArray = Array.isArray(capturedPhotos) ? capturedPhotos : [capturedPhotos];
    showNotification(t('photosAdded')?.replace('{{count}}', photosArray.length) || `Добавлено ${photosArray.length} фото`, 'success');
    setCurrentMaterialIndex(null);
  }, [showNotification, t]);

  // Обработка QR
  const handleQRScan = useCallback((qrData) => {
    try {
      // Парсим QR данные
      const parts = qrData.split('|');
      const materialName = parts[0]?.trim();
      const quantity = parseInt(parts[1], 10) || 1;
      // const unit = parts[2]?.trim() || 'шт'; // пока не используется
      
      // Ищем материал в заявке
      let materialIndex = -1;
      if (selectedApplication?.materials) {
        materialIndex = selectedApplication.materials.findIndex((m) => 
          m.description?.toLowerCase() === materialName?.toLowerCase()
        );
      }
      
      if (materialIndex !== -1 && localMaterials[materialIndex]) {
        const currentQty = Number(localMaterials[materialIndex].supplier_received_quantity) || 0;
        const requestedQty = Number(localMaterials[materialIndex].quantity) || 0;
        const newQty = Math.min(currentQty + quantity, requestedQty);
        
        handleMaterialUpdate(materialIndex, 'supplier_received_quantity', newQty);
        showNotification(t('materialScanned')?.replace('{{name}}', materialName) || `Материал "${materialName}" отсканирован`, 'success');
      } else {
        showNotification(t('materialNotFound') || 'Материал не найден в заявке', 'warning');
      }
    } catch (err) {
      console.error('QR parse error:', err);
      showNotification(t('invalidQR') || 'Неверный формат QR-кода', 'error');
    }
    setShowQRScanner(false);
  }, [selectedApplication, localMaterials, handleMaterialUpdate, showNotification, t]);

  // ─────────────────────────────────────────────────────────
  // 🔁 MEMOIZED VALUES
  // ─────────────────────────────────────────────────────────
  const hasChanges = useMemo(() => {
    if (!selectedApplication?.materials) return false;
    
    if (modalMode === 'admin_receive') {
      return localMaterials.some((m, idx) => {
        const original = selectedApplication.materials[idx];
        return Number(m.supplier_received_quantity) !== Number(original?.supplier_received_quantity || 0);
      });
    }
    
    if (modalMode === 'admin_send_to_master' || modalMode === 'admin_ready_to_issue') {
      return itemsToSend.some((i) => Number(i.quantityToSend) > 0);
    }
    
    if (modalMode === 'master_confirm') {
      return confirmations.some((c) => c.action === 'confirm' || c.action === 'reject');
    }
    
    return false;
  }, [modalMode, localMaterials, itemsToSend, confirmations, selectedApplication]);

  // ─────────────────────────────────────────────────────────
  // 📋 RENDER FUNCTIONS
  // ─────────────────────────────────────────────────────────
  const renderAdminReceive = () => {
    const totalToAccept = localMaterials.reduce((sum, m) => 
      sum + (Number(m.supplier_received_quantity) || 0), 0
    );
    
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <Info className="w-4 h-4" aria-hidden="true" />
            {t('acceptToWarehouseHint') || 'Укажите количество принятого материала для каждой позиции'}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCurrentMaterialIndex(null);
                setShowPhotoCapture(true);
              }}
              disabled={flowLoading || isSaving}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              {t('addPhotos') || 'Фото'}
            </button>
            
            <button
              onClick={() => setShowQRScanner(true)}
              disabled={flowLoading || isSaving}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <QrCode className="w-3.5 h-3.5" />
              {t('scanQR') || 'QR'}
            </button>
          </div>
        </div>
        
        <div className="space-y-3">
          {localMaterials.map((material, index) => {
            const displayMaterial = isMaster 
              ? sanitizeMaterialForMaster(material)
              : material;
            
            return (
              <AdminReceiveRow
                key={index}
                material={displayMaterial}
                index={index}
                onUpdate={handleMaterialUpdate}
                onPhotoClick={handleOpenPhotoForMaterial}
                t={t}
                hidePrices={shouldHidePrices}
                isProcessing={flowLoading}
              />
            );
          })}
        </div>
        
        {totalToAccept > 0 && (
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">
                {t('totalToAccept') || 'Всего к приёмке'}: {formatNumber(totalToAccept)}
              </span>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderSendToMaster = () => {
    const totalToSend = itemsToSend.reduce((sum, i) => 
      sum + (Number(i.quantityToSend) || 0), 0
    );
    const isReadyToIssue = modalMode === 'admin_ready_to_issue';
    
    // Показываем только материалы, доступные для отправки
    const availableItems = itemsToSend.filter(i => 
      (Number(i.supplier_received_quantity) || 0) > 0 &&
      (Number(i.sent_to_master_quantity) || 0) < (Number(i.supplier_received_quantity) || 0)
    );
    
    if (availableItems.length === 0 && !flowLoading) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" aria-hidden="true" />
          <p>{isReadyToIssue ? t('noMaterialsToIssue') || 'Нет материалов для выдачи' : t('noMaterialsToSend') || 'Нет материалов для отправки'}</p>
          <p className="text-sm text-gray-400">{t('allMaterialsProcessed') || 'Все материалы уже обработаны'}</p>
        </div>
      );
    }
    
    return (
      <>
        <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
          {isReadyToIssue ? (
            <>
              <Package className="w-4 h-4" aria-hidden="true" />
              {t('readyToIssueHint') || 'Выберите материалы для выдачи мастеру'}
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" aria-hidden="true" />
              {t('sendToMasterHint') || 'Выберите материалы и количество для отправки мастеру'}
            </>
          )}
        </div>
        
        <div className="space-y-3">
          {availableItems.map((item, index) => (
            <SendToMasterRow
              key={index}
              item={item}
              index={index}
              onUpdate={handleItemToSendUpdate}
              t={t}
              isProcessing={flowLoading}
            />
          ))}
        </div>
        
        <div>
          <label htmlFor="transfer-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('transferComment')}
          </label>
          <textarea
            id="transfer-comment"
            value={transferComment}
            onChange={(e) => setTransferComment(e.target.value)}
            placeholder={t('transferCommentPlaceholder') || 'Комментарий к передаче...'}
            disabled={flowLoading || isSaving}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 resize-none"
            rows="2"
          />
        </div>
        
        {totalToSend > 0 && (
          <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <Send className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">
                {isReadyToIssue ? (t('totalToIssue') || 'Всего к выдаче') : (t('totalToSend') || 'Всего к отправке')}: {formatNumber(totalToSend)}
              </span>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderMasterConfirm = () => {
    const totalToConfirm = confirmations
      .filter((c) => c.action === 'confirm')
      .reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
    
    const totalToReject = confirmations
      .filter((c) => c.action === 'reject')
      .length;
    
    return (
      <>
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          {t('confirmReceiptHint') || 'Подтвердите получение материалов или укажите причину отклонения'}
        </div>
        
        <div className="space-y-3">
          {localMaterials.map((material, index) => {
            const confirmation = confirmations.find((c) => c.materialIndex === index) || {
              materialIndex: index,
              action: 'pending',
              quantity: 0,
              feedback: '',
            };
            
            // Передаём confirmation данные в компонент
            const materialWithConfirmation = {
              ...material,
              _confirmation: confirmation,
            };
            
            return (
              <MasterConfirmRow
                key={index}
                material={materialWithConfirmation}
                index={index}
                onUpdate={handleConfirmationUpdate}
                t={t}
                isProcessing={flowLoading}
              />
            );
          })}
        </div>
        
        {(totalToConfirm > 0 || totalToReject > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {totalToConfirm > 0 && (
              <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium">
                    {t('toConfirm') || 'К подтверждению'}: {formatNumber(totalToConfirm)}
                  </span>
                </div>
              </div>
            )}
            {totalToReject > 0 && (
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <XCircle className="w-5 h-5" aria-hidden="true" />
                  <span className="font-medium">
                    {t('toReject') || 'К отклонению'}: {totalToReject}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  // ─────────────────────────────────────────────────────────
  // 📋 MAIN RENDER
  // ─────────────────────────────────────────────────────────
  if (!isOpen || !selectedApplication) return null;

  const modalTitles = {
    admin_receive: t('acceptToWarehouse') || 'Приёмка на склад',
    admin_send_to_master: t('sendToMaster') || 'Отправка мастеру',
    master_confirm: t('confirmReceipt') || 'Подтверждение получения',
    admin_ready_to_issue: t('readyToIssue') || 'Готовы к выдаче',
  };

  const modalIcons = {
    admin_receive: Warehouse,
    admin_send_to_master: Send,
    master_confirm: CheckCircle2,
    admin_ready_to_issue: Package,
  };

  const ModalIcon = modalIcons[modalMode] || Warehouse;

  const renderContent = () => {
    switch (modalMode) {
      case 'admin_receive':
        return renderAdminReceive();
      case 'admin_send_to_master':
      case 'admin_ready_to_issue':
        return renderSendToMaster();
      case 'master_confirm':
        return renderMasterConfirm();
      default:
        return <div className="text-center py-8 text-gray-500">{t('unknownMode') || 'Неизвестный режим'}</div>;
    }
  };

  const isActionDisabled = isSaving || flowLoading;
  const canSave = hasChanges && !isActionDisabled;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 modal-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receive-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isActionDisabled) {
          if (flowLoading) {
            handleAbort();
          } else {
            onClose?.();
          }
        }
      }}
    >
      <div
        ref={modalContentRef}
        className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50 outline-none"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/60 dark:border-gray-700/60 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex-shrink-0">
              <ModalIcon className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 id="receive-modal-title" className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {modalTitles[modalMode]}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {selectedApplication.object_name}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {flowLoading && (
              <button
                onClick={handleAbort}
                className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                aria-label={t('cancelOperation') || 'Отменить операцию'}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isActionDisabled}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50"
              aria-label={t('close')}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Индикатор загрузки */}
          {flowLoading && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" aria-hidden="true" />
              <span className="text-blue-700 dark:text-blue-300">
                {t('processing') || 'Обработка...'} 
                {progress.total > 0 && ` (${progress.current}/${progress.total})`}
              </span>
              <button
                onClick={handleAbort}
                className="ml-auto text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                {t('cancel') || 'Отмена'}
              </button>
            </div>
          )}

          {/* Инфо о заявке */}
          <div className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-indigo-900/20 dark:to-blue-900/20 p-4 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('foremanName')}</div>
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {escapeHtml ? escapeHtml(selectedApplication.foreman_name) : selectedApplication.foreman_name}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('foremanPhone')}</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {selectedApplication.foreman_phone || '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('status')}</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {getStatusText(selectedApplication.status, language)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('materials')}</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {selectedApplication.materials?.length || 0}
                </div>
              </div>
            </div>
          </div>

          {/* История статусов */}
          {selectedApplication.status_history && selectedApplication.status_history.length > 0 && (
            <div className="p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" aria-hidden="true" />
                {t('history') || 'История изменений'}
              </h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {selectedApplication.status_history.slice(-5).reverse().map((entry, idx) => (
                  <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {entry.action || 'Изменение'}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span>
                      {getStatusText(entry.new_status, language) || entry.new_status}
                    </span>
                    <span className="text-gray-400 ml-auto whitespace-nowrap">
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString('ru-RU') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Основной контент */}
          {renderContent()}

          {/* Ошибка */}
          {flowError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{flowError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-b-3xl flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isActionDisabled}
              className="px-5 py-2.5 text-gray-700 hover:text-gray-900 font-medium dark:text-gray-300 dark:hover:text-gray-100 disabled:opacity-50 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {flowLoading ? t('cancel') || 'Отмена' : t('close') || 'Закрыть'}
            </button>
            
            {flowLoading && (
              <button
                onClick={handleAbort}
                className="px-4 py-2.5 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium rounded-xl border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                {t('stop') || 'Остановить'}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded mr-2">Ctrl+Enter — сохранить</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded">Esc — закрыть</span>
            </div>

            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
                canSave
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white hover:shadow-xl'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSaving || flowLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>{t('saving') || 'Сохранение...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" aria-hidden="true" />
                  <span>{t('save') || 'Сохранить'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Модальные окна для QR и фото */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
          language={language}
          applicationId={selectedApplication?.id}
          companyId={safeCompanyId}
        />
      )}

      {showPhotoCapture && (
        <PhotoCapture
          onCapture={handlePhotoCapture}
          onClose={() => {
            setShowPhotoCapture(false);
            setCurrentMaterialIndex(null);
          }}
          multiple={true}
          maxPhotos={10}
          applicationId={selectedApplication?.id}
          materialIndex={currentMaterialIndex}
          companyId={safeCompanyId}
          userId={userId}
          showNotification={showNotification}
        />
      )}
    </div>
  );
});

ReceiveModal.displayName = 'ReceiveModal';
export default ReceiveModal;