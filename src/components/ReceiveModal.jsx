// src/components/ReceiveModal.jsx
import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
  X, CheckCircle, XCircle, Package, Warehouse, Send, AlertCircle,
  Loader2, Info, ChevronDown, ChevronUp, Undo2, ShoppingCart,
  ArrowRight, FileText, Download, Mail, CheckCircle2, AlertTriangle,
  Camera, QrCode,Shield 
} from 'lucide-react';
import {
  APPLICATION_STATUS,
  ITEM_STATUS,
  STATUS_I18N,
  getStatusText,
  STATUS_COLORS,
  WAREHOUSE_TRANSACTION_TYPE
} from '../utils/applicationStatuses';

// Импорты компонентов
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
.modal-enter { animation: slideIn ${ANIMATION_DURATION}ms ease-out forwards; }
.fade-enter { animation: fadeIn ${ANIMATION_DURATION}ms ease-out forwards; }
.pulse { animation: pulse 2s ease-in-out infinite; }
.shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
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
`;

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ
// ─────────────────────────────────────────────────────────────
const formatNumber = function(num) {
  return new Intl.NumberFormat('ru-RU').format(num || 0);
};

const clamp = function(value, min = 0, max = 10000) {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return isNaN(num) ? min : Math.max(min, Math.min(num, max));
};

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ
// ─────────────────────────────────────────────────────────────

// ✅ Статус материала
const MaterialStatusBadge = memo(function({ status, t }) {
  const config = {
    [ITEM_STATUS.PENDING]: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', label: 'statusPending' },
    [ITEM_STATUS.ON_WAREHOUSE]: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'itemStatusOnWarehouse' },
    [ITEM_STATUS.SENT_TO_MASTER]: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', label: 'itemStatusSent' },
    [ITEM_STATUS.CONFIRMED]: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'itemStatusConfirmed' },
    [ITEM_STATUS.REJECTED]: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'itemStatusRejected' }
  };
  
  const itemConfig = config[status] || config[ITEM_STATUS.PENDING];
  const colorClass = itemConfig.color;
  const labelKey = itemConfig.label;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {t(labelKey) || status}
    </span>
  );
});
MaterialStatusBadge.displayName = 'MaterialStatusBadge';

/// ✅ Прогресс-бар для материала
const MaterialProgress = memo(function({ requested, onWarehouse, confirmed }) {
  const warehouseProgress = requested > 0 ? Math.round((onWarehouse / requested) * 100) : 0;
  const confirmationProgress = requested > 0 ? Math.round((confirmed / requested) * 100) : 0;
  
  return (
    <div className="space-y-2">
      {/* На складе */}
      <div className="flex items-center gap-2 text-xs">
        <Warehouse className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-1.5 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all"
            style={{ width: Math.min(warehouseProgress, 100) + '%' }}
          />
        </div>
        <span className="text-blue-600 dark:text-blue-400 font-medium w-12 text-right">
          {formatNumber(onWarehouse)}/{formatNumber(requested)}
        </span>
      </div>
      
      {/* Подтверждено */}
      {confirmed > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" aria-hidden="true" />
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
              style={{ width: Math.min(confirmationProgress, 100) + '%' }}
            />
          </div>
          <span className="text-green-600 dark:text-green-400 font-medium w-12 text-right">
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
}) {
  const requestedQty = Number(material.quantity) || 0;
  const onWarehouse = Number(material.supplier_received_quantity) || 0;
  const remaining = requestedQty - onWarehouse;
  
  const unitOptions = ['шт', 'м', 'кг', 'л', 'упак', 'комплект', 'партия', 'м²', 'м³'];
  
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
  
  const handleUnitChange = useCallback(function(e) {
    onUpdate(index, 'unit', e.target.value);
  }, [index, onUpdate]);
  
  return (
    <article className="material-row bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {material.description || '—'}
            </h4>
            <button
              onClick={() => onPhotoClick?.(index)}
              className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Добавить фото материала"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <MaterialProgress
            requested={requestedQty}
            onWarehouse={onWarehouse}
            confirmed={Number(material.received) || 0}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="quantity-stepper flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-1">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={onWarehouse <= 0}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('decreaseQuantity')}
            >
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              max={requestedQty}
              value={onWarehouse === 0 ? '' : onWarehouse}
              onChange={handleQuantityChange}
              className="w-16 text-center px-2 py-1.5 bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label={t('quantityOnWarehouse')}
            />
            <button
              type="button"
              onClick={handleIncrement}
              disabled={onWarehouse >= requestedQty}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('increaseQuantity')}
            >
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          
          <div className="flex flex-col gap-1">
            <select
              value={material.unit || 'шт'}
              onChange={handleUnitChange}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label={t('unit')}
            >
              {unitOptions.map(function(unit) {
                return <option key={unit} value={unit}>{unit}</option>;
              })}
            </select>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">{t('unit')}</div>
          </div>
        </div>
      </div>
      
      {remaining > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
          {t('remainingToAccept')?.replace('{{remaining}}', formatNumber(remaining)) || `Осталось принять: ${remaining}`}
        </div>
      )}
    </article>
  );
});
AdminReceiveRow.displayName = 'AdminReceiveRow';

// ✅ Строка материала для мастера (подтверждение/отклонение)
const MasterConfirmRow = memo(function({
  material,
  index,
  onUpdate,
  onReject,
  t,
}) {
  const requestedQty = Number(material.quantity) || 0;
  const onWarehouse = Number(material.supplier_received_quantity) || 0;
  const confirmed = Number(material.received) || 0;
  const available = onWarehouse - confirmed;
  
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const handleConfirmChange = useCallback(function(e) {
    const value = clamp(e.target.value, 0, available);
    onUpdate(index, 'received', value);
  }, [index, available, onUpdate]);
  
  const handleIncrement = useCallback(function() {
    const newValue = clamp(confirmed + 1, 0, onWarehouse);
    onUpdate(index, 'received', newValue);
  }, [index, confirmed, onWarehouse, onUpdate]);
  
  const handleDecrement = useCallback(function() {
    const newValue = clamp(confirmed - 1, 0, onWarehouse);
    onUpdate(index, 'received', newValue);
  }, [index, confirmed, onWarehouse, onUpdate]);
  
  const handleReject = useCallback(function() {
    if (rejectReason.trim()) {
      onReject(index, available, rejectReason.trim());
      setShowRejectInput(false);
      setRejectReason('');
    }
  }, [index, available, rejectReason, onReject]);
  
  return (
    <article className="material-row bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {material.description || '—'}
            </h4>
            <MaterialStatusBadge status={material.status} t={t} />
          </div>
          <MaterialProgress
            requested={requestedQty}
            onWarehouse={onWarehouse}
            confirmed={confirmed}
          />
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="quantity-stepper flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 rounded-xl p-1">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={confirmed <= 0}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-green-600 dark:text-green-400 hover:bg-white dark:hover:bg-green-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('decreaseQuantity')}
              >
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              </button>
              <input
                type="number"
                min="0"
                max={onWarehouse}
                value={confirmed}
                onChange={handleConfirmChange}
                className="w-16 text-center px-2 py-1.5 bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white font-medium"
                aria-label={t('confirmQuantity')}
              />
              <button
                type="button"
                onClick={handleIncrement}
                disabled={confirmed >= onWarehouse}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-green-600 dark:text-green-400 hover:bg-white dark:hover:bg-green-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label={t('increaseQuantity')}
              >
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            
            <button
              onClick={function() { setShowRejectInput(!showRejectInput); }}
              className="px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              aria-label={t('rejectMaterial')}
            >
              <XCircle className="w-4 h-4" aria-hidden="true" />
              {t('reject')}
            </button>
          </div>
          
          {showRejectInput && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <input
                type="text"
                value={rejectReason}
                onChange={function(e) { setRejectReason(e.target.value); }}
                placeholder={t('rejectReasonPlaceholder') || 'Причина отклонения...'}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                aria-label={t('rejectReason')}
              />
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('confirmReject')}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {available > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
          {t('availableToConfirm')?.replace('{{available}}', formatNumber(available)) || `Доступно для подтверждения: ${available}`}
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
  onAdminReceive,
  onSendToMaster,
  onMasterConfirm,
  saveReceiveStatus,
  language,
  escapeHtml,
  onTakeToWork,        // ← ДОБАВИТЬ
  onSendForApproval,
  t,
  modalMode = 'admin_receive',
  showNotification,
  userCompanyId,
  userId,
  userRole,
  // eslint-disable-next-line no-unused-vars
  onPhotoClick,
  // eslint-disable-next-line no-unused-vars
  onQRClick,
}) {
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
  const [_photos, _setPhotos] = useState([]);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(null);
  
  // ─────────────────────────────────────────────────────────
  // 📞 INJECT STYLES
  // ─────────────────────────────────────────────────────────
  useEffect(function() {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    return function() { document.head.removeChild(styleEl); };
  }, []);
  
  // ─────────────────────────────────────────────────────────
  // 🎯 FOCUS MANAGEMENT
  // ─────────────────────────────────────────────────────────
  useEffect(function() {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(function() { if (modalContentRef.current) modalContentRef.current.focus(); }, 100);
    } else {
      document.body.style.overflow = '';
    }
    return function() { document.body.style.overflow = ''; };
  }, [isOpen]);
  
  // ─────────────────────────────────────────────────────────
  // 🔁 INIT LOCAL MATERIALS
  // ─────────────────────────────────────────────────────────
  useEffect(function() {
    if (selectedApplication && selectedApplication.materials) {
      const validMaterials = selectedApplication.materials
        .filter(function(m) { return m.description && m.description.trim(); })
        .map(function(m, idx) {
          return {
            ...m,
            _index: m._index || idx,
            unit: m.unit || 'шт',
            received: Number(m.received) || 0,
            supplier_received_quantity: Number(m.supplier_received_quantity) || 0
          };
        });
      
      setLocalMaterials(validMaterials);
      
      if (modalMode === 'admin_send_to_master') {
        setItemsToSend(selectedApplication.materials
          .filter(function(m) {
            const onWarehouseQty = Number(m.supplier_received_quantity) || 0;
            const alreadySent = Number(m.sent_to_master_quantity) || 0;
            const isAlreadySent = m.status === ITEM_STATUS.SENT_TO_MASTER || 
                                 m.status === ITEM_STATUS.CONFIRMED;
            return onWarehouseQty > 0 && !isAlreadySent && alreadySent < onWarehouseQty;
          })
          .map(function(m) {
            return {
              ...m,
              quantityToSend: Number(m.supplier_received_quantity) || 0,
              unit: m.unit || 'шт'
            };
          })
        );
      }
      
      if (modalMode === 'master_confirm') {
        setConfirmations(selectedApplication.materials.map(function(m, idx) {
          return {
            materialIndex: idx,
            action: 'confirm',
            quantity: Number(m.received) || 0,
            feedback: ''
          };
        }));
      }
    }
  }, [selectedApplication, modalMode]);
  
  // ─────────────────────────────────────────────────────────
  // ⌨️ KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────────────
  const handleSave = useCallback(async function() {
    setIsSaving(true);
    try {
      let result;
      
      if (modalMode === 'admin_receive' && typeof onAdminReceive === 'function') {
        result = await onAdminReceive(localMaterials, selectedApplication);
      }
      else if (modalMode === 'admin_send_to_master' && typeof onSendToMaster === 'function') {
        const items = itemsToSend.filter(function(i) { return (Number(i.quantityToSend) || 0) > 0; });
        result = await onSendToMaster(items, selectedApplication);
      }
      else if (modalMode === 'master_confirm' && typeof onMasterConfirm === 'function') {
        const confirmationsToSend = localMaterials.map(function(m, idx) {
          const conf = confirmations.find(function(c) { return c.materialIndex === idx; });
          return {
            materialIndex: idx,
            action: conf && conf.action ? conf.action : 'confirm',
            quantity: conf && conf.action === 'confirm' ? (Number(conf.quantity) || 0) : 0,
            feedback: conf && conf.feedback ? conf.feedback : ''
          };
        });
        
        const materialsToSend = localMaterials.map(function(m) {
          return {
            ...m,
            unit: m.unit || 'шт',
            received: Number(m.received) || 0
          };
        });
        
        result = await onMasterConfirm(confirmationsToSend, materialsToSend, selectedApplication);
      }
      else if (typeof saveReceiveStatus === 'function') {
        result = await saveReceiveStatus(localMaterials);
      }
      
      if (result && result.success) {
        if (showNotification) showNotification(t('materialsAcceptedToWarehouse') || '✅ Успешно сохранено', 'success');
        if (onClose) onClose();
      }
    } catch (err) {
      console.error('❌ Ошибка сохранения:', err);
      if (showNotification) showNotification(err.message || t('saveError'), 'error');
    } finally {
      setIsSaving(false);
    }
  }, [modalMode, onAdminReceive, onSendToMaster, onMasterConfirm, saveReceiveStatus, localMaterials, itemsToSend, confirmations, selectedApplication, onClose, t, showNotification]);
  
  useEffect(function() {
    const handleKeyDown = function(e) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (onClose) onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSaving) {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return function() { document.removeEventListener('keydown', handleKeyDown); };
  }, [isOpen, isSaving, onClose, handleSave]);
  
  // ─────────────────────────────────────────────────────────
  // 🎛️ HANDLERS
  // ─────────────────────────────────────────────────────────
  const handleMaterialUpdate = useCallback(function(index, field, value) {
    setLocalMaterials(function(prev) {
      return prev.map(function(m, idx) {
        return idx === index ? { ...m, [field]: value } : m;
      });
    });
  }, []);
  
  const handleItemToSendUpdate = useCallback(function(index, quantity) {
    setItemsToSend(function(prev) {
      return prev.map(function(item, idx) {
        return idx === index ? { ...item, quantityToSend: clamp(quantity, 0, item.supplier_received_quantity) } : item;
      });
    });
  }, []);
  
  const handleConfirmationUpdate = useCallback(function(index, action, quantity, feedback = '') {
    setConfirmations(function(prev) {
      return prev.map(function(conf, idx) {
        return idx === index ? { ...conf, action: action, quantity: quantity, feedback: feedback } : conf;
      });
    });
  }, []);
  
  // Обработка QR
  const handleQRScan = useCallback(function(qrData) {
    try {
      const parts = qrData.split('|');
      const materialName = parts[0];
      const quantity = parts[1];
      const unit = parts[2];
      
      let materialIndex = -1;
      if (selectedApplication && selectedApplication.materials) {
        materialIndex = selectedApplication.materials.findIndex(function(m) {
          return m.description === materialName;
        });
      }
      
      if (materialIndex !== -1 && localMaterials) {
        const newMaterials = [...localMaterials];
        const currentMaterial = newMaterials[materialIndex];
        newMaterials[materialIndex] = {
          ...currentMaterial,
          supplier_received_quantity: Number(quantity) || currentMaterial.supplier_received_quantity,
          unit: unit || currentMaterial.unit || 'шт'
        };
        setLocalMaterials(newMaterials);
        if (showNotification) showNotification('Материал "' + materialName + '" отсканирован', 'success');
      } else {
        if (showNotification) showNotification('Материал не найден в заявке', 'warning');
      }
    } catch (err) {
      console.error('QR parse error:', err);
      if (showNotification) showNotification('Неверный формат QR-кода', 'error');
    }
  }, [selectedApplication, localMaterials, showNotification]);
  
  // Обработка фото
  const handlePhotoCapture = useCallback(function(capturedPhotos) {
    const photosArray = Array.isArray(capturedPhotos) ? capturedPhotos : [capturedPhotos];
    const photosWithMeta = photosArray.map(function(photo) {
      return {
        url: photo,
        materialIndex: currentMaterialIndex,
        materialName: currentMaterialIndex !== null && localMaterials[currentMaterialIndex] ? localMaterials[currentMaterialIndex].description : null,
        takenAt: new Date().toISOString()
      };
    });
    _setPhotos(function(prev) {
      return [...prev, ...photosWithMeta];
    });
    if (showNotification) showNotification('Добавлено ' + photosArray.length + ' фото для материала', 'success');
    setCurrentMaterialIndex(null);
  }, [currentMaterialIndex, localMaterials, showNotification]);
  
  // Открыть фото для конкретного материала
  const handleOpenPhotoForMaterial = useCallback(function(materialIndex) {
    setCurrentMaterialIndex(materialIndex);
    setShowPhotoCapture(true);
  }, []);
  
  // ─────────────────────────────────────────────────────────
  // 🔁 MEMOIZED VALUES
  // ─────────────────────────────────────────────────────────
  const hasChanges = useMemo(function() {
    if (!selectedApplication || !selectedApplication.materials) return false;
    
    if (modalMode === 'admin_receive') {
      return localMaterials.some(function(m, idx) {
        const originalMaterial = selectedApplication.materials[idx];
        return (Number(m.supplier_received_quantity) || 0) !== (Number(originalMaterial ? originalMaterial.supplier_received_quantity : 0) || 0);
      });
    }
    
    if (modalMode === 'admin_send_to_master') {
      return itemsToSend.some(function(i) { return i.quantityToSend > 0; });
    }
    
    if (modalMode === 'master_confirm') {
      return confirmations.some(function(c) { return c.quantity > 0 || c.action === 'reject'; });
    }
    
    return false;
  }, [modalMode, localMaterials, itemsToSend, confirmations, selectedApplication]);
  
  const totalToAccept = useMemo(function() {
    return localMaterials.reduce(function(sum, m) {
      return sum + (Number(m.supplier_received_quantity) || 0);
    }, 0);
  }, [localMaterials]);
  
  const totalToSend = useMemo(function() {
    return itemsToSend.reduce(function(sum, i) {
      return sum + (Number(i.quantityToSend) || 0);
    }, 0);
  }, [itemsToSend]);
  
  const totalToConfirm = useMemo(function() {
    return confirmations.filter(function(c) { return c.action === 'confirm'; }).reduce(function(sum, c) {
      return sum + c.quantity;
    }, 0);
  }, [confirmations]);
  
  const totalToReject = useMemo(function() {
    return confirmations.filter(function(c) { return c.action === 'reject'; }).reduce(function(sum, c) {
      return sum + c.quantity;
    }, 0);
  }, [confirmations]);
  
  // ─────────────────────────────────────────────────────────
  // 📋 RENDERING
  // ─────────────────────────────────────────────────────────
  if (!isOpen || !selectedApplication) return null;
  
  const modalTitles = {
    admin_receive: t('acceptToWarehouse') || 'Приёмка на склад',
    admin_send_to_master: t('sendToMaster') || 'Отправка мастеру',
    master_confirm: t('confirmReceipt') || 'Подтверждение получения'
  };
  
  const modalIcons = {
    admin_receive: Warehouse,
    admin_send_to_master: Send,
    master_confirm: CheckCircle2
  };
  
  const ModalIcon = modalIcons[modalMode] || Warehouse;
  
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 modal-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receive-modal-title"
      onClick={function(e) { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <div
        ref={modalContentRef}
        className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50 outline-none"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/60 dark:border-gray-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl">
              <ModalIcon className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 id="receive-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {modalTitles[modalMode]}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedApplication.object_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Инфо о заявке */}
          <div className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-indigo-900/20 dark:to-blue-900/20 p-4 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('foremanName')}</div>
                <div className="font-medium text-gray-900 dark:text-white">{escapeHtml ? escapeHtml(selectedApplication.foreman_name) : selectedApplication.foreman_name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('foremanPhone')}</div>
                <div className="font-medium text-gray-900 dark:text-white">{selectedApplication.foreman_phone || '—'}</div>
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
                  {selectedApplication.materials ? selectedApplication.materials.length : 0}
                </div>
              </div>
            </div>
          </div>

          {/* История статусов заявки */}
          {selectedApplication.status_history && selectedApplication.status_history.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" aria-hidden="true" />
                {t('history') || 'История изменений'}
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedApplication.status_history.slice(-5).reverse().map(function(entry, idx) {
                  return (
                    <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="font-medium text-gray-900 dark:text-white shrink-0">
                        {entry.action || 'Изменение'}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="shrink-0">
                        {getStatusText(entry.new_status, language) || entry.new_status}
                      </span>
                      <span className="text-gray-400 ml-auto whitespace-nowrap">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString('ru-RU') : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* 🔹 АДМИН: Приёмка на склад */}
          {modalMode === 'admin_receive' && (
            <>
              {/* Кнопки фото и QR */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    setCurrentMaterialIndex(null);
                    setShowPhotoCapture(true);
                  }}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  Фото материалов
                </button>
                
                <button
                  onClick={() => setShowQRScanner(true)}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors shadow-sm"
                >
                  <QrCode className="w-4 h-4" />
                  Сканировать QR
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Info className="w-4 h-4" aria-hidden="true" />
                {t('acceptToWarehouseHint') || 'Укажите количество принятого материала для каждой позиции'}
              </div>
              
              <div className="space-y-3">
                {localMaterials.map(function(material, index) {
                  return (
                    <AdminReceiveRow
                      key={index}
                      material={material}
                      index={index}
                      onUpdate={handleMaterialUpdate}
                      onPhotoClick={handleOpenPhotoForMaterial}
                      t={t}
                    />
                  );
                })}
              </div>
              
              {totalToAccept > 0 && (
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-5 h-5" aria-hidden="true" />
                    <span className="font-medium">
                      {t('totalToAccept') || 'Всего к приёмке'}: {formatNumber(totalToAccept)} {t('units')}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
          {/* 🔹 ПАНЕЛЬ РЕШЕНИЙ ДЛЯ СНАБЖЕНЦА */}
{modalMode === 'admin_receive' && userRole === 'supply_admin' && (
  <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50">
    <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
      {t('supplyDecision') || 'Как обработать заявку?'}
    </h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* 🔹 В работу */}
      <button
        onClick={() => onTakeToWork?.(selectedApplication)}
        className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25"
      >
        <Package className="w-4 h-4" />
        {t('takeToWork') || '📦 Взять в работу'}
      </button>
      
      {/* 🔹 На согласование */}
      <button
        onClick={() => onSendForApproval?.(selectedApplication)}
        className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/25"
      >
        <Shield className="w-4 h-4" />
        {t('sendForApproval') || '📋 На согласование'}
      </button>
    </div>
    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
      💡 "В работу" — начать поиск поставщика. "На согласование" — отправить руководителю после получения счета/суммы.
    </p>
  </div>
)}
          
          {/* 🔹 АДМИН: Отправка мастеру */}
          {modalMode === 'admin_send_to_master' && (
            <>
              <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                <Mail className="w-4 h-4" aria-hidden="true" />
                {t('sendToMasterHint') || 'Выберите материалы и количество для отправки мастеру'}
              </div>
              
              <div className="space-y-3">
                {itemsToSend.map(function(item, index) {
                  return (
                    <article key={index} className="material-row bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            {item.description || '—'}
                          </h4>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {t('onWarehouse')}: {formatNumber(item.supplier_received_quantity)} {item.unit}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="quantity-stepper flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-1">
                            <button
                              type="button"
                              onClick={function() { handleItemToSendUpdate(index, item.quantityToSend - 1); }}
                              disabled={item.quantityToSend <= 0}
                              className="w-9 h-9 flex items-center justify-center rounded-lg text-purple-600 dark:text-purple-400 hover:bg-white dark:hover:bg-purple-900/30 disabled:opacity-40 transition-colors"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={item.supplier_received_quantity}
                              value={item.quantityToSend}
                              onChange={function(e) { handleItemToSendUpdate(index, e.target.value); }}
                              className="w-16 text-center px-2 py-1.5 bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white font-medium"
                            />
                            <button
                              type="button"
                              onClick={function() { handleItemToSendUpdate(index, item.quantityToSend + 1); }}
                              disabled={item.quantityToSend >= item.supplier_received_quantity}
                              className="w-9 h-9 flex items-center justify-center rounded-lg text-purple-600 dark:text-purple-400 hover:bg-white dark:hover:bg-purple-900/30 disabled:opacity-40 transition-colors"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">{t('unit')}</div>
                            <div className="font-medium text-gray-900 dark:text-white">{item.unit || 'шт'}</div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              
              <div>
                <label htmlFor="transfer-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('transferComment')}
                </label>
                <textarea
                  id="transfer-comment"
                  value={transferComment}
                  onChange={function(e) { setTransferComment(e.target.value); }}
                  placeholder={t('transferCommentPlaceholder') || 'Комментарий к передаче...'}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows="3"
                />
              </div>
              
              {totalToSend > 0 && (
                <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <Send className="w-5 h-5" aria-hidden="true" />
                    <span className="font-medium">
                      {t('totalToSend') || 'Всего к отправке'}: {formatNumber(totalToSend)} {t('units')}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* 🔹 МАСТЕР: Подтверждение получения */}
          {modalMode === 'master_confirm' && (
            <>
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                {t('confirmReceiptHint') || 'Подтвердите получение материалов или укажите причину отклонения'}
              </div>
              
              <div className="space-y-3">
                {localMaterials.map(function(material, index) {
                  const confirmation = confirmations.find(function(c) { return c.materialIndex === index; }) || {
                    materialIndex: index,
                    action: 'confirm',
                    quantity: 0,
                    feedback: ''
                  };
                  
                  const requestedQty = Number(material.quantity) || 0;
                  const onWarehouse = Number(material.supplier_received_quantity) || 0;
                  const confirmed = confirmation.quantity || 0;
                  const available = onWarehouse - confirmed;
                  
                  return (
                    <article 
                      key={index} 
                      className="material-row bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60"
                    >
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {material.description || '—'}
                            </h4>
                            <MaterialStatusBadge status={material.status} t={t} />
                          </div>
                          <MaterialProgress
                            requested={requestedQty}
                            onWarehouse={onWarehouse}
                            confirmed={confirmed}
                          />
                        </div>
                        
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className="quantity-stepper flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 rounded-xl p-1">
                              <button
                                type="button"
                                onClick={function() {
                                  const newValue = clamp(confirmed - 1, 0, onWarehouse);
                                  handleConfirmationUpdate(index, 'confirm', newValue);
                                }}
                                disabled={confirmed <= 0}
                                className="w-9 h-9 flex items-center justify-center rounded-lg text-green-600 dark:text-green-400 hover:bg-white dark:hover:bg-green-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                aria-label={t('decreaseQuantity')}
                              >
                                <ChevronDown className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={onWarehouse}
                                value={confirmed}
                                onChange={function(e) {
                                  const value = clamp(e.target.value, 0, onWarehouse);
                                  handleConfirmationUpdate(index, 'confirm', value);
                                }}
                                className="w-16 text-center px-2 py-1.5 bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white font-medium"
                                aria-label={t('confirmQuantity')}
                              />
                              <button
                                type="button"
                                onClick={function() {
                                  const newValue = clamp(confirmed + 1, 0, onWarehouse);
                                  handleConfirmationUpdate(index, 'confirm', newValue);
                                }}
                                disabled={confirmed >= onWarehouse}
                                className="w-9 h-9 flex items-center justify-center rounded-lg text-green-600 dark:text-green-400 hover:bg-white dark:hover:bg-green-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                aria-label={t('increaseQuantity')}
                              >
                                <ChevronUp className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                            
                            <button
                              onClick={function() {
                                const existingReject = confirmations.find(function(c) { return c.materialIndex === index; });
                                if (existingReject && existingReject.action === 'reject') {
                                  handleConfirmationUpdate(index, 'confirm', 0);
                                } else {
                                  handleConfirmationUpdate(index, 'reject', confirmed, '');
                                }
                              }}
                              className={'px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors ' + (confirmation.action === 'reject'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : 'text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20')}
                              aria-label={t('rejectMaterial')}
                            >
                              <XCircle className="w-4 h-4" aria-hidden="true" />
                              {confirmation.action === 'reject' ? (t('cancelReject') || 'Отменить') : t('reject')}
                            </button>
                          </div>
                          
                          {confirmation.action === 'reject' && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                              <input
                                type="text"
                                value={confirmation.feedback || ''}
                                onChange={function(e) { handleConfirmationUpdate(index, 'reject', confirmed, e.target.value); }}
                                placeholder={t('rejectReasonPlaceholder') || 'Причина отклонения...'}
                                className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                                aria-label={t('rejectReason')}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {available > 0 && confirmation.action !== 'reject' && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          {t('availableToConfirm')?.replace('{{available}}', formatNumber(available)) || `Доступно для подтверждения: ${available}`}
                        </div>
                      )}
                    </article>
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
                          {t('toReject') || 'К отклонению'}: {formatNumber(totalToReject)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* 🔽 ВСТАВИТЬ ПОДСКАЗКУ ЗДЕСЬ — ПЕРЕД FOOTER */}
{selectedApplication?.status === 'pending_approval' && (
  <div className="px-4 sm:px-6 pb-2">
    <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg border border-orange-200 dark:border-orange-800">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      <span>{t('applicationPendingApproval') || 'Заявка ожидает одобрения руководителя'}</span>
    </p>
  </div>
)}
        
        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-b-3xl flex justify-between items-center gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 text-gray-700 hover:text-gray-900 font-medium dark:text-gray-300 dark:hover:text-gray-100 disabled:opacity-50 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            {t('cancel')}
          </button>
          
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded mr-2">Ctrl+Enter — сохранить</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded">Esc — закрыть</span>
            </div>
            
          {/* Кнопка сохранения - видна для всех, кто может изменять */}
{modalMode === 'admin_receive' && (
  <button
    onClick={handleSave}
    disabled={!hasChanges || isSaving}
    className={`px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg ${
      hasChanges && !isSaving
        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white hover:shadow-xl'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none'
    }`}
  >
    {isSaving ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        <span>{t('saving') || 'Сохранение...'}</span>
      </>
    ) : (
      <>
        <CheckCircle className="w-4 h-4" aria-hidden="true" />
        <span>{t('save') || 'Сохранить'}</span>
      </>
    )}
  </button>
)}
          </div>
        </div>
      </div>
      
      {/* Модальные окна для QR и фото */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={function() { setShowQRScanner(false); }}
          language={language}
          applicationId={selectedApplication ? selectedApplication.id : null}
          companyId={userCompanyId}
        />
      )}
      
      {showPhotoCapture && (
        <PhotoCapture
          onCapture={handlePhotoCapture}
          onClose={function() {
            setShowPhotoCapture(false);
            setCurrentMaterialIndex(null);
          }}
          multiple={true}
          maxPhotos={10}
          applicationId={selectedApplication ? selectedApplication.id : null}
          materialIndex={currentMaterialIndex}
          companyId={userCompanyId}
          userId={userId}
          showNotification={showNotification}
        />
      )}
    </div>
  );
});

ReceiveModal.displayName = 'ReceiveModal';
export default ReceiveModal;