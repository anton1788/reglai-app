// src/components/ReceiveModal.jsx
import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import {
  X, CheckCircle, XCircle, Package, Warehouse, Send, AlertCircle,
  Loader2, Info, ChevronDown, ChevronUp, CheckCircle2, Camera, QrCode,
  FileText, Mail, Shield, Clock, User, Phone, Building, Calendar
} from 'lucide-react';
import {
  APPLICATION_STATUS,
  ITEM_STATUS,
  getStatusText,
} from '../utils/applicationStatuses';
import {
  getItemsToSend,
  // updateMaterialStatus - используется в родительском компоненте (App.jsx), здесь не нужен
  // getMaterialStatusText - используется в MaterialStatusBadge
  // calculateStatusFromMaterials - используется в родительском компоненте (App.jsx)
} from '../features/applications/services/applicationService';
import QRScanner from './Mobile/QRScanner';
import PhotoCapture from './Mobile/PhotoCapture';
import { usePriceVisibility } from '../hooks/usePriceVisibility';
import { sanitizeMaterialForMaster } from '../utils/materialSanitizer';

// ─────────────────────────────────────────────────────────────
// 📦 UI КОМПОНЕНТЫ
// ─────────────────────────────────────────────────────────────

// Прогресс-бар для материала
const MaterialProgress = memo(({ requested, onWarehouse, confirmed, sentToMaster }) => {
  const warehousePercent = requested > 0 ? Math.min(100, Math.round((onWarehouse / requested) * 100)) : 0;
  const confirmPercent = requested > 0 ? Math.min(100, Math.round((confirmed / requested) * 100)) : 0;
  const sentPercent = requested > 0 ? Math.min(100, Math.round((sentToMaster / requested) * 100)) : 0;

  return (
    <div className="space-y-1.5">
      {/* На складе */}
      <div className="flex items-center gap-2 text-xs">
        <Warehouse className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
          <div 
            className="h-1.5 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500" 
            style={{ width: `${warehousePercent}%` }} 
          />
        </div>
        <span className="text-blue-600 dark:text-blue-400 font-medium w-16 text-right">
          {onWarehouse}/{requested}
        </span>
      </div>
      
      {/* Отправлено мастеру */}
      {sentToMaster > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <Send className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-1.5 bg-gradient-to-r from-purple-400 to-purple-500 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(sentPercent, 100)}%` }} 
            />
          </div>
          <span className="text-purple-600 dark:text-purple-400 font-medium w-16 text-right">
            {sentToMaster}/{requested}
          </span>
        </div>
      )}
      
      {/* Подтверждено мастером */}
      {confirmed > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-1.5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(confirmPercent, 100)}%` }} 
            />
          </div>
          <span className="text-green-600 dark:text-green-400 font-medium w-16 text-right">
            {confirmed}/{requested}
          </span>
        </div>
      )}
    </div>
  );
});

// Статус материала
const MaterialStatusBadge = memo(({ status, t }) => {
  const getStatusLabel = (statusKey) => {
    const map = {
      [ITEM_STATUS.PENDING]: 'statusPending',
      [ITEM_STATUS.ON_WAREHOUSE]: 'itemStatusOnWarehouse',
      [ITEM_STATUS.SENT_TO_MASTER]: 'itemStatusSent',
      [ITEM_STATUS.CONFIRMED]: 'itemStatusConfirmed',
      [ITEM_STATUS.REJECTED]: 'itemStatusRejected',
      [ITEM_STATUS.PARTIAL_RECEIVED]: 'itemStatusPartial',
    };
    return t(map[statusKey] || 'statusPending');
  };

  const config = {
    [ITEM_STATUS.PENDING]: { 
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', 
      icon: '⏳'
    },
    [ITEM_STATUS.ON_WAREHOUSE]: { 
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', 
      icon: '📦'
    },
    [ITEM_STATUS.SENT_TO_MASTER]: { 
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', 
      icon: '🚀'
    },
    [ITEM_STATUS.CONFIRMED]: { 
      color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', 
      icon: '✅'
    },
    [ITEM_STATUS.REJECTED]: { 
      color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', 
      icon: '❌'
    },
    [ITEM_STATUS.PARTIAL_RECEIVED]: { 
      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300', 
      icon: '🟡'
    },
  };

  const itemConfig = config[status] || config[ITEM_STATUS.PENDING];
  const label = getStatusLabel(status);
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${itemConfig.color}`}>
      {itemConfig.icon} {label}
    </span>
  );
});

// Строка для приёмки (админ)
const AdminReceiveRow = memo(({ material, index, onUpdate, onPhotoClick, t, hidePrices }) => {
  const requestedQty = Number(material.quantity) || 0;
  const onWarehouse = Number(material.supplier_received_quantity) || 0;
  const remaining = requestedQty - onWarehouse;
  const isFullyReceived = remaining === 0 && requestedQty > 0;

  const handleQuantityChange = useCallback((e) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
      onUpdate(index, 'supplier_received_quantity', 0);
      return;
    }
    const value = parseInt(rawValue, 10);
    const clamped = isNaN(value) ? 0 : Math.max(0, Math.min(value, requestedQty));
    onUpdate(index, 'supplier_received_quantity', clamped);
  }, [index, requestedQty, onUpdate]);

  const handleIncrement = useCallback(() => {
    onUpdate(index, 'supplier_received_quantity', Math.min(requestedQty, onWarehouse + 1));
  }, [index, onWarehouse, requestedQty, onUpdate]);

  const handleDecrement = useCallback(() => {
    onUpdate(index, 'supplier_received_quantity', Math.max(0, onWarehouse - 1));
  }, [index, onWarehouse, onUpdate]);

  return (
    <article className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border transition-all duration-200 ${
      isFullyReceived 
        ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10' 
        : 'border-gray-200/60 dark:border-gray-700/60'
    }`}>
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
              {material.description || '—'}
            </h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              <MaterialStatusBadge status={material.status} t={t} />
              <button
                onClick={() => onPhotoClick?.(index)}
                className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                title="Добавить фото"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <MaterialProgress 
            requested={requestedQty} 
            onWarehouse={onWarehouse} 
            confirmed={Number(material.received) || 0}
            sentToMaster={Number(material.sent_to_master_quantity) || 0}
          />
          
          {!hidePrices && material.supplier_price !== undefined && material.supplier_price !== null && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-3">
              <span>💰 {Number(material.supplier_price).toLocaleString()} ₽</span>
              {material.supplier_name && (
                <span className="text-gray-500 dark:text-gray-400 text-xs">({material.supplier_name})</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="quantity-stepper flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-1">
            <button
              onClick={handleDecrement}
              disabled={onWarehouse <= 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Уменьшить"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="0"
              max={requestedQty}
              value={onWarehouse || ''}
              onChange={handleQuantityChange}
              className="w-14 text-center bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white font-medium text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Количество на складе"
            />
            <button
              onClick={handleIncrement}
              disabled={onWarehouse >= requestedQty}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-blue-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Увеличить"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 w-12">{material.unit || 'шт'}</span>
        </div>
      </div>
      
      {remaining > 0 && !isFullyReceived && (
        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <Info className="w-3 h-3" /> Осталось принять: {remaining} {material.unit || 'шт'}
        </div>
      )}
      
      {isFullyReceived && (
        <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Все материалы приняты
        </div>
      )}
    </article>
  );
});

// Строка для отправки мастеру
const SendRow = memo(({ item, index, onUpdate, t }) => {
  const available = Number(item.supplier_received_quantity) || 0;
  const alreadySent = Number(item.sent_to_master_quantity) || 0;
  const value = Number(item.quantityToSend) || 0;
  const maxAvailable = available - alreadySent;

  const handleQuantityChange = useCallback((e) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
      onUpdate(index, 0);
      return;
    }
    const val = parseInt(rawValue, 10);
    const clamped = isNaN(val) ? 0 : Math.max(0, Math.min(val, maxAvailable));
    onUpdate(index, clamped);
  }, [index, maxAvailable, onUpdate]);

  return (
    <article className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
              {item.description || '—'}
            </h4>
            <MaterialStatusBadge status={item.status} t={t} />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            На складе: {available} {item.unit || 'шт'} 
            {alreadySent > 0 && ` (уже отправлено: ${alreadySent})`}
          </div>
          <MaterialProgress 
            requested={Number(item.quantity) || 0} 
            onWarehouse={available} 
            confirmed={Number(item.received) || 0}
            sentToMaster={alreadySent}
          />
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="quantity-stepper flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-1">
            <button
              onClick={() => onUpdate(index, Math.max(0, value - 1))}
              disabled={value <= 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-purple-600 dark:text-purple-400 hover:bg-white dark:hover:bg-purple-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Уменьшить"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="0"
              max={maxAvailable}
              value={value || ''}
              onChange={handleQuantityChange}
              className="w-14 text-center bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white font-medium text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Количество к отправке"
            />
            <button
              onClick={() => onUpdate(index, Math.min(maxAvailable, value + 1))}
              disabled={value >= maxAvailable}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-purple-600 dark:text-purple-400 hover:bg-white dark:hover:bg-purple-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Увеличить"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 w-12">{item.unit || 'шт'}</span>
        </div>
      </div>
    </article>
  );
});

// Строка для подтверждения мастером
const MasterConfirmRow = memo(({ material, index, onUpdate, onReject, t, showNotification }) => {
  const requestedQty = Number(material.quantity) || 0;
  const onWarehouse = Number(material.supplier_received_quantity) || 0;
  const confirmed = Number(material.received) || 0;
  const available = onWarehouse - confirmed;
  const isRejected = material.status === ITEM_STATUS.REJECTED;
  const [rejectReason, setRejectReason] = useState(material.reject_reason || '');
  const [showReject, setShowReject] = useState(isRejected);

  const handleConfirmChange = useCallback((e) => {
    const rawValue = e.target.value;
    if (rawValue === '') {
      onUpdate(index, 'received', 0);
      return;
    }
    const val = parseInt(rawValue, 10);
    const clamped = isNaN(val) ? 0 : Math.max(0, Math.min(val, onWarehouse));
    onUpdate(index, 'received', clamped);
  }, [index, onWarehouse, onUpdate]);

  const handleIncrement = useCallback(() => {
    onUpdate(index, 'received', Math.min(onWarehouse, confirmed + 1));
  }, [index, onWarehouse, confirmed, onUpdate]);

  const handleDecrement = useCallback(() => {
    onUpdate(index, 'received', Math.max(0, confirmed - 1));
  }, [index, confirmed, onUpdate]);

  const handleRejectSubmit = useCallback(() => {
    if (rejectReason.trim()) {
      onReject(index, available, rejectReason.trim());
      setShowReject(false);
      showNotification?.('Материал отклонён', 'info');
    }
  }, [index, available, rejectReason, onReject, showNotification]);

  const handleCancelReject = useCallback(() => {
    onUpdate(index, 'received', 0);
    onUpdate(index, 'status', ITEM_STATUS.PENDING);
    onUpdate(index, 'reject_reason', null);
    setShowReject(false);
    setRejectReason('');
  }, [index, onUpdate]);

  return (
    <article className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border transition-all duration-200 ${
      isRejected 
        ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' 
        : confirmed > 0 
          ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
          : 'border-gray-200/60 dark:border-gray-700/60'
    }`}>
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
              {material.description || '—'}
            </h4>
            <MaterialStatusBadge status={material.status} t={t} />
          </div>
          <MaterialProgress 
            requested={requestedQty} 
            onWarehouse={onWarehouse} 
            confirmed={confirmed}
            sentToMaster={Number(material.sent_to_master_quantity) || 0}
          />
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {!isRejected ? (
              <>
                <div className="quantity-stepper flex items-center gap-1 bg-green-50 dark:bg-green-900/20 rounded-xl p-1">
                  <button
                    onClick={handleDecrement}
                    disabled={confirmed <= 0}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-green-600 dark:text-green-400 hover:bg-white dark:hover:bg-green-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Уменьшить"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max={onWarehouse}
                    value={confirmed || ''}
                    onChange={handleConfirmChange}
                    className="w-14 text-center bg-transparent border-0 focus:ring-0 text-gray-900 dark:text-white font-medium text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    aria-label="Количество подтверждённых"
                  />
                  <button
                    onClick={handleIncrement}
                    disabled={confirmed >= onWarehouse}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-green-600 dark:text-green-400 hover:bg-white dark:hover:bg-green-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Увеличить"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setShowReject(!showReject)}
                  className="px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Отклонить
                </button>
              </>
            ) : (
              <button
                onClick={handleCancelReject}
                className="px-3 py-2 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Undo2 className="w-4 h-4" /> Отменить отклонение
              </button>
            )}
          </div>

          {showReject && !isRejected && (
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Причина отклонения..."
                className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                aria-label="Причина отклонения"
              />
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectReason.trim()}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Отклонить
              </button>
            </div>
          )}
          
          {isRejected && material.reject_reason && (
            <div className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Причина: {material.reject_reason}
            </div>
          )}
        </div>
      </div>

      {available > 0 && !isRejected && !showReject && (
        <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Доступно для подтверждения: {available} {material.unit || 'шт'}
        </div>
      )}
    </article>
  );
});

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────

const ReceiveModal = memo(({
  isOpen,
  onClose,
  selectedApplication,
  onAdminReceive,
  onSendToMaster,
  onMasterConfirm,
  onTakeToWork,
  onSendForApproval,
  language,
  t,
  modalMode = 'admin_receive',
  showNotification,
  userCompanyId,
  userId,
  userRole,
  // onPhotoClick - используется для передачи в дочерние компоненты
  onPhotoClick: externalPhotoClick,
  onQRClick,
}) => {
  const { shouldHidePrices, isMaster } = usePriceVisibility(userRole);

  // ─── Состояния ───
  const [localMaterials, setLocalMaterials] = useState([]);
  const [itemsToSend, setItemsToSend] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [transferComment, setTransferComment] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(null);
  const [activeTab, setActiveTab] = useState('materials');
  const modalRef = useRef(null);
  
  // ─── Инициализация ───
  useEffect(() => {
    if (selectedApplication?.materials) {
      const materials = selectedApplication.materials
        .filter(m => m.description?.trim())
        .map((m, idx) => ({
          ...m,
          _index: idx,
          unit: m.unit || 'шт',
          received: Number(m.received) || 0,
          supplier_received_quantity: Number(m.supplier_received_quantity) || 0,
          sent_to_master_quantity: Number(m.sent_to_master_quantity) || 0,
          supplier_price: m.supplier_price || null,
          supplier_name: m.supplier_name || null,
        }));
      setLocalMaterials(materials);

      // Для режимов отправки
      if (modalMode === 'admin_send_to_master' || modalMode === 'admin_ready_to_issue') {
        const { itemsToSend: sendItems } = getItemsToSend(materials);
        setItemsToSend(sendItems);
      }
    }
  }, [selectedApplication, modalMode]);

  // ─── Фокус и клавиши ───
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => modalRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ─── Обработчики ───
  const handleMaterialUpdate = useCallback((index, field, value) => {
    setLocalMaterials(prev => prev.map((m, i) => 
      i === index ? { ...m, [field]: value } : m
    ));
  }, []);

  const handleSendUpdate = useCallback((index, value) => {
    setItemsToSend(prev => prev.map((item, i) =>
      i === index ? { 
        ...item, 
        quantityToSend: Math.max(0, Math.min(value, 
          (Number(item.supplier_received_quantity) || 0) - (Number(item.sent_to_master_quantity) || 0)
        )) 
      } : item
    ));
  }, []);

  const handleMasterConfirmUpdate = useCallback((index, field, value) => {
    setLocalMaterials(prev => prev.map((m, i) =>
      i === index ? { ...m, [field]: value } : m
    ));
  }, []);

  const handleMasterReject = useCallback((index, available, reason) => {
    setLocalMaterials(prev => prev.map((m, i) =>
      i === index ? {
        ...m,
        received: 0,
        status: ITEM_STATUS.REJECTED,
        reject_reason: reason,
        confirmed_by_employee_at: new Date().toISOString(),
        confirmed_by_employee_id: userId,
      } : m
    ));
  }, [userId]);

  // ─── Сохранение ───
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      let result = { success: false };
      
      if (modalMode === 'admin_receive' && onAdminReceive) {
        // Передаём только те материалы, которые изменились
        const itemsToAccept = localMaterials
          .filter(m => Number(m.supplier_received_quantity) > 0)
          .map(m => ({
            item_name: m.description,
            description: m.description,
            quantity: Number(m.supplier_received_quantity),
            unit: m.unit || 'шт',
            invoice_url: m.invoice_url || null,
            supplier_price: m.supplier_price || null,
            supplier_name: m.supplier_name || null,
          }));
        
        if (itemsToAccept.length === 0) {
          showNotification?.('Нет материалов для приёмки', 'warning');
          setIsSaving(false);
          return;
        }
        result = await onAdminReceive(itemsToAccept, selectedApplication);
      } 
      else if ((modalMode === 'admin_send_to_master' || modalMode === 'admin_ready_to_issue') && onSendToMaster) {
        const items = itemsToSend.filter(i => Number(i.quantityToSend) > 0);
        if (items.length === 0) {
          showNotification?.('Выберите материалы для отправки', 'warning');
          setIsSaving(false);
          return;
        }
        result = await onSendToMaster(items, selectedApplication);
      } 
      else if (modalMode === 'master_confirm' && onMasterConfirm) {
        const confirmations = localMaterials.map((m, idx) => ({
          materialIndex: idx,
          action: m.status === ITEM_STATUS.REJECTED ? 'reject' : 'confirm',
          quantity: Number(m.received) || 0,
          feedback: m.reject_reason || '',
        }));
        result = await onMasterConfirm(confirmations, localMaterials, selectedApplication);
      }

      if (result?.success) {
        showNotification?.('✅ Успешно сохранено', 'success');
        onClose?.();
      } else {
        showNotification?.('❌ Ошибка: ' + (result?.error || 'Неизвестная ошибка'), 'error');
      }
    } catch (err) {
      console.error('❌ Ошибка сохранения:', err);
      showNotification?.('Ошибка: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [modalMode, localMaterials, itemsToSend, selectedApplication, onAdminReceive, onSendToMaster, onMasterConfirm, onClose, showNotification]);

  // ─── Обработка QR ───
  const handleQRScan = useCallback((qrData) => {
    try {
      const parts = qrData.split('|');
      const materialName = parts[0]?.trim();
      const quantity = parseInt(parts[1], 10) || 0;
      // unit - используется в будущем, пока оставляем
      const _unit = parts[2]?.trim() || 'шт';
      
      if (!materialName) {
        showNotification?.('❌ Неверный формат QR-кода', 'error');
        return;
      }
      
      const idx = localMaterials.findIndex(m => m.description === materialName);
      if (idx !== -1) {
        const currentQty = Number(localMaterials[idx].supplier_received_quantity) || 0;
        const maxQty = Number(localMaterials[idx].quantity) || 0;
        const newQty = Math.min(maxQty, currentQty + quantity);
        handleMaterialUpdate(idx, 'supplier_received_quantity', newQty);
        showNotification?.('✅ Материал обновлён по QR', 'success');
      } else {
        showNotification?.('⚠️ Материал не найден в заявке', 'warning');
      }
    } catch (err) {
      console.error('QR parse error:', err);
      showNotification?.('❌ Ошибка чтения QR-кода', 'error');
    }
    setShowQRScanner(false);
  }, [localMaterials, handleMaterialUpdate, showNotification]);

  // ─── Обработка фото ───
  const handlePhotoCapture = useCallback((urls) => {
    const url = Array.isArray(urls) ? urls[0] : urls;
    if (currentMaterialIndex !== null && url) {
      handleMaterialUpdate(currentMaterialIndex, 'photo_url', url);
      showNotification?.('📸 Фото добавлено', 'success');
    }
    setShowPhotoCapture(false);
    setCurrentMaterialIndex(null);
  }, [currentMaterialIndex, handleMaterialUpdate, showNotification]);

  // ─── Проверка изменений ───
  const hasChanges = useMemo(() => {
    if (!selectedApplication?.materials) return false;
    
    if (modalMode === 'admin_receive') {
      return localMaterials.some((m, idx) => {
        const orig = selectedApplication.materials[idx];
        return (Number(m.supplier_received_quantity) || 0) !== (Number(orig?.supplier_received_quantity) || 0);
      });
    }
    if (modalMode === 'admin_send_to_master' || modalMode === 'admin_ready_to_issue') {
      return itemsToSend.some(i => Number(i.quantityToSend) > 0);
    }
    if (modalMode === 'master_confirm') {
      return localMaterials.some((m, idx) => {
        const orig = selectedApplication.materials[idx];
        return (Number(m.received) || 0) !== (Number(orig?.received) || 0) ||
               m.status === ITEM_STATUS.REJECTED;
      });
    }
    return false;
  }, [modalMode, localMaterials, itemsToSend, selectedApplication]);

  // ─── Подсчёт итогов ───
  const totalToAccept = localMaterials.reduce((sum, m) => sum + (Number(m.supplier_received_quantity) || 0), 0);
  const totalToSend = itemsToSend.reduce((sum, i) => sum + (Number(i.quantityToSend) || 0), 0);
  const totalToConfirm = localMaterials.reduce((sum, m) => sum + (Number(m.received) || 0), 0);
  const totalRejected = localMaterials.filter(m => m.status === ITEM_STATUS.REJECTED).length;

  // ─── Внутренний обработчик фото ───
  const handlePhotoClick = useCallback((index) => {
    setCurrentMaterialIndex(index);
    setShowPhotoCapture(true);
    if (externalPhotoClick) {
      externalPhotoClick(index);
    }
  }, [externalPhotoClick]);

  // ─── Рендер ───
  if (!isOpen || !selectedApplication) return null;

  const modalTitles = {
    admin_receive: t('acceptToWarehouse') || 'Приёмка на склад',
    admin_send_to_master: t('sendToMaster') || 'Отправка мастеру',
    master_confirm: t('confirmReceipt') || 'Подтверждение получения',
    admin_ready_to_issue: t('readyToIssue') || 'Выдача материалов',
  };

  const modalIcons = {
    admin_receive: Warehouse,
    admin_send_to_master: Send,
    master_confirm: CheckCircle2,
    admin_ready_to_issue: Package,
  };
  const Icon = modalIcons[modalMode] || Warehouse;
  const title = modalTitles[modalMode] || 'Операция';

  const statusHistory = selectedApplication.status_history || [];
  const isPendingApproval = selectedApplication.status === APPLICATION_STATUS.PENDING_APPROVAL;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 modal-enter"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={modalRef}
        className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50 outline-none"
        tabIndex={-1}
      >
        {/* ─── HEADER ─── */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/60 dark:border-gray-700/60 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{selectedApplication.object_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 flex-shrink-0"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── CONTENT ─── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Инфо о заявке */}
          <div className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-indigo-900/20 dark:to-blue-900/20 p-4 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <User className="w-3 h-3" /> Прораб
                </div>
                <div className="font-medium text-gray-900 dark:text-white truncate">{selectedApplication.foreman_name}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Телефон
                </div>
                <div className="font-medium text-gray-900 dark:text-white">{selectedApplication.foreman_phone || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Статус
                </div>
                <div className="font-medium text-gray-900 dark:text-white">{getStatusText(selectedApplication.status, language)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Package className="w-3 h-3" /> Позиций
                </div>
                <div className="font-medium text-gray-900 dark:text-white">{selectedApplication.materials?.length || 0}</div>
              </div>
            </div>
            
            {/* Дата создания */}
            {selectedApplication.created_at && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Создана: {new Date(selectedApplication.created_at).toLocaleString('ru-RU')}
              </div>
            )}
          </div>

          {/* История статусов */}
          {statusHistory.length > 0 && (
            <details className="bg-gray-50/80 dark:bg-gray-800/50 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
              <summary className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-2">
                <Clock className="w-4 h-4" /> История изменений ({statusHistory.length})
              </summary>
              <div className="px-4 pb-3 space-y-1.5 max-h-40 overflow-y-auto">
                {statusHistory.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2 py-1 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                    <span className="font-medium text-gray-900 dark:text-white shrink-0">
                      {entry.action || 'Изменение'}
                    </span>
                    <span className="text-gray-400">→</span>
                    <span className="shrink-0">
                      {getStatusText(entry.new_status, language) || entry.new_status}
                    </span>
                    <span className="text-gray-400 ml-auto whitespace-nowrap text-[10px]">
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString('ru-RU') : ''}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Предупреждение о согласовании */}
          {isPendingApproval && (
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-700 dark:text-orange-300 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Заявка ожидает одобрения руководителя
              </p>
            </div>
          )}

          {/* ─── Кнопки QR и Фото ─── */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setCurrentMaterialIndex(null);
                setShowPhotoCapture(true);
              }}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm text-sm"
            >
              <Camera className="w-4 h-4" /> Добавить фото
            </button>
            <button
              onClick={() => {
                if (onQRClick) {
                  onQRClick();
                } else {
                  setShowQRScanner(true);
                }
              }}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors shadow-sm text-sm"
            >
              <QrCode className="w-4 h-4" /> Сканировать QR
            </button>
          </div>

          {/* ─── Вкладки для материалов ─── */}
          {modalMode === 'admin_receive' && localMaterials.length > 5 && (
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('materials')}
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  activeTab === 'materials' 
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                📦 Материалы
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  activeTab === 'summary' 
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                📊 Итоги
              </button>
            </div>
          )}

          {/* ─── РЕЖИМ: ПРИЁМКА ─── */}
          {modalMode === 'admin_receive' && (
            <>
              <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Info className="w-4 h-4" /> Укажите количество принятых материалов для каждой позиции
              </p>
              
              {activeTab === 'materials' || localMaterials.length <= 5 ? (
                <div className="space-y-3">
                  {localMaterials.map((material, index) => {
                    const display = isMaster ? sanitizeMaterialForMaster(material) : material;
                    return (
                      <AdminReceiveRow
                        key={index}
                        material={display}
                        index={index}
                        onUpdate={handleMaterialUpdate}
                        onPhotoClick={handlePhotoClick}
                        t={t}
                        hidePrices={shouldHidePrices}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {localMaterials.map((material, index) => {
                    const display = isMaster ? sanitizeMaterialForMaster(material) : material;
                    return (
                      <AdminReceiveRow
                        key={index}
                        material={display}
                        index={index}
                        onUpdate={handleMaterialUpdate}
                        onPhotoClick={handlePhotoClick}
                        t={t}
                        hidePrices={shouldHidePrices}
                      />
                    );
                  })}
                </div>
              )}
              
              {totalToAccept > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300">
                  <CheckCircle className="w-5 h-5" /> Всего к приёмке: {totalToAccept}
                </div>
              )}

              {/* ─── ПАНЕЛЬ РЕШЕНИЙ ДЛЯ СНАБЖЕНЦА ─── */}
              {userRole === 'supply_admin' && selectedApplication.status === APPLICATION_STATUS.PENDING && (
                <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                    Как обработать заявку?
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => onTakeToWork?.(selectedApplication)}
                      className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25"
                    >
                      <Package className="w-4 h-4" />
                      📦 Взять в работу
                    </button>
                    <button
                      onClick={() => onSendForApproval?.(selectedApplication)}
                      className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/25"
                    >
                      <Shield className="w-4 h-4" />
                      📋 На согласование
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    💡 "В работу" — начать поиск поставщика. "На согласование" — отправить руководителю после получения счёта/суммы.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ─── РЕЖИМ: ОТПРАВКА МАСТЕРУ ─── */}
          {(modalMode === 'admin_send_to_master' || modalMode === 'admin_ready_to_issue') && (
            <>
              <p className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <Send className="w-4 h-4" /> Выберите материалы и количество для отправки мастеру
              </p>
              
              {itemsToSend.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Нет материалов для отправки</p>
                  <p className="text-sm">Все материалы уже отправлены мастеру</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {itemsToSend.map((item, index) => (
                      <SendRow key={index} item={item} index={index} onUpdate={handleSendUpdate} t={t} />
                    ))}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Комментарий к передаче
                    </label>
                    <textarea
                      value={transferComment}
                      onChange={(e) => setTransferComment(e.target.value)}
                      placeholder="Введите комментарий..."
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      rows="2"
                    />
                  </div>
                  
                  {totalToSend > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                      <Send className="w-5 h-5" /> Всего к отправке: {totalToSend}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ─── РЕЖИМ: ПОДТВЕРЖДЕНИЕ МАСТЕРОМ ─── */}
          {modalMode === 'master_confirm' && (
            <>
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Подтвердите получение или укажите причину отклонения
              </p>
              
              <div className="space-y-3">
                {localMaterials.map((material, index) => (
                  <MasterConfirmRow
                    key={index}
                    material={material}
                    index={index}
                    onUpdate={handleMasterConfirmUpdate}
                    onReject={handleMasterReject}
                    t={t}
                    showNotification={showNotification}
                  />
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {totalToConfirm > 0 && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Подтверждено: {totalToConfirm}
                  </div>
                )}
                {totalRejected > 0 && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-center gap-2">
                    <XCircle className="w-5 h-5" /> Отклонено: {totalRejected}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ─── FOOTER ─── */}
        <div className="p-4 sm:p-6 border-t border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-b-3xl flex justify-between items-center gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 text-gray-700 hover:text-gray-900 font-medium dark:text-gray-300 dark:hover:text-gray-100 disabled:opacity-50 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            Отмена
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700/50 rounded mr-1">Ctrl+Enter</span> сохранить
            </span>
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
                <><Loader2 className="w-4 h-4 animate-spin" /> Сохранение...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Сохранить</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── МОДАЛКИ QR И ФОТО ─── */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
          language={language}
          applicationId={selectedApplication?.id}
          companyId={userCompanyId}
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