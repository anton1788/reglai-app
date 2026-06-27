// src/components/ApplicationList.jsx (ИСПРАВЛЕННАЯ ВЕРСИЯ - БЕЗ ОШИБОК ESLINT)

import React, { useMemo, useCallback, useEffect, memo, useState, useRef } from 'react';
import {
  Package, Search, Shield, FileText, Download, Ban,
  CheckCircle, AlertCircle, AlertTriangle, Clock, Archive,
  X, ArrowLeft, Loader2, ShoppingCart, ChevronDown, ChevronUp,
  Sparkles, Undo2, Info, RefreshCw, Mail, XCircle, Warehouse,
  Send, CheckCircle2, Hourglass, Boxes, Save, Camera, ScanLine
} from 'lucide-react';
import CommentsSection from './CommentsSection';
import MobileMaterialCard from './MobileMaterialCard';
import { useInView } from 'react-intersection-observer';
import { saveCommentDraft, getCommentDraft, clearCommentDraft } from '../utils/autoSaveUtils';

// ─────────────────────────────────────────────────────────────
// 📦 ИМПОРТ СТАТУСОВ ИЗ ЦЕНТРАЛИЗОВАННОГО ФАЙЛА
// ─────────────────────────────────────────────────────────────
import {
  APPLICATION_STATUS,
  ITEM_STATUS,
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_I18N,
  isApplicationActive,
  requiresMasterConfirmation
} from '../utils/applicationStatuses';

// ─────────────────────────────────────────────────────────────
// 📦 КОНФИГУРАЦИЯ СТАТУСОВ
// ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  [APPLICATION_STATUS.DRAFT]: {
    labelKey: STATUS_I18N[APPLICATION_STATUS.DRAFT]?.ru || 'statusDraft',
    icon: STATUS_ICONS[APPLICATION_STATUS.DRAFT] || Hourglass,
    colorClass: STATUS_COLORS[APPLICATION_STATUS.DRAFT] || 'text-gray-800 bg-gray-200'
  },
  [APPLICATION_STATUS.PENDING]: {
    labelKey: STATUS_I18N[APPLICATION_STATUS.PENDING]?.ru || 'statusPending',
    icon: STATUS_ICONS[APPLICATION_STATUS.PENDING] || AlertCircle,
    colorClass: STATUS_COLORS[APPLICATION_STATUS.PENDING] || 'text-orange-800 bg-orange-200',
    overdueColorClass: 'text-red-800 bg-red-200 dark:bg-red-900/70 dark:text-red-200 border-2 border-red-500'
  },
  [APPLICATION_STATUS.ADMIN_PROCESSING]: {
    labelKey: STATUS_I18N[APPLICATION_STATUS.ADMIN_PROCESSING]?.ru || 'statusAdminProcessing',
    icon: STATUS_ICONS[APPLICATION_STATUS.ADMIN_PROCESSING] || Package,
    colorClass: STATUS_COLORS[APPLICATION_STATUS.ADMIN_PROCESSING] || 'text-blue-800 bg-blue-200'
  },
  [APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE]: {
    labelKey: STATUS_I18N[APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE]?.ru || 'statusPartialWarehouse',
    icon: STATUS_ICONS[APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE] || Boxes,
    colorClass: STATUS_COLORS[APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE] || 'text-indigo-800 bg-indigo-200'
  },
  [APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]: {
    labelKey: STATUS_I18N[APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION]?.ru || 'statusPendingConfirmation',
    icon: STATUS_ICONS[APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION] || Mail,
    colorClass: STATUS_COLORS[APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION] || 'text-purple-800 bg-purple-200'
  },
  [APPLICATION_STATUS.RECEIVED]: {
    labelKey: STATUS_I18N[APPLICATION_STATUS.RECEIVED]?.ru || 'statusReceived',
    icon: STATUS_ICONS[APPLICATION_STATUS.RECEIVED] || CheckCircle2,
    colorClass: STATUS_COLORS[APPLICATION_STATUS.RECEIVED] || 'text-green-800 bg-green-200'
  },
  [APPLICATION_STATUS.PARTIAL_RECEIVED]: {
    labelKey: STATUS_I18N[APPLICATION_STATUS.PARTIAL_RECEIVED]?.ru || 'statusPartialReceived',
    icon: STATUS_ICONS[APPLICATION_STATUS.PARTIAL_RECEIVED] || AlertCircle,
    colorClass: STATUS_COLORS[APPLICATION_STATUS.PARTIAL_RECEIVED] || 'text-amber-800 bg-amber-200'
  },
  [APPLICATION_STATUS.REJECTED]: {
    labelKey: STATUS_I18N[APPLICATION_STATUS.REJECTED]?.ru || 'statusRejected',
    icon: STATUS_ICONS[APPLICATION_STATUS.REJECTED] || XCircle,
    colorClass: STATUS_COLORS[APPLICATION_STATUS.REJECTED] || 'text-red-800 bg-red-200'
  },
  [APPLICATION_STATUS.CANCELED]: {
    labelKey: STATUS_I18N[APPLICATION_STATUS.CANCELED]?.ru || 'statusCanceled',
    icon: STATUS_ICONS[APPLICATION_STATUS.CANCELED] || Ban,
    colorClass: STATUS_COLORS[APPLICATION_STATUS.CANCELED] || 'text-gray-800 bg-gray-200'
  },
  overdue: {
    labelKey: 'overdue',
    icon: AlertTriangle,
    colorClass: 'text-red-800 bg-red-200 dark:bg-red-900/70 dark:text-red-200 border-2 border-red-500',
    isOverdue: true
  },
  [ITEM_STATUS.PENDING]: {
    labelKey: STATUS_I18N[ITEM_STATUS.PENDING]?.ru || 'itemStatusPending',
    icon: Hourglass,
    colorClass: STATUS_COLORS[ITEM_STATUS.PENDING] || 'text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
  },
  [ITEM_STATUS.ON_WAREHOUSE]: {
    labelKey: STATUS_I18N[ITEM_STATUS.ON_WAREHOUSE]?.ru || 'itemStatusOnWarehouse',
    icon: Warehouse,
    colorClass: STATUS_COLORS[ITEM_STATUS.ON_WAREHOUSE] || 'text-blue-700 bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300'
  },
  [ITEM_STATUS.SENT_TO_MASTER]: {
    labelKey: STATUS_I18N[ITEM_STATUS.SENT_TO_MASTER]?.ru || 'itemStatusSent',
    icon: Send,
    colorClass: STATUS_COLORS[ITEM_STATUS.SENT_TO_MASTER] || 'text-purple-700 bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300'
  },
  [ITEM_STATUS.CONFIRMED]: {
    labelKey: STATUS_I18N[ITEM_STATUS.CONFIRMED]?.ru || 'itemStatusConfirmed',
    icon: CheckCircle2,
    colorClass: STATUS_COLORS[ITEM_STATUS.CONFIRMED] || 'text-green-700 bg-green-200 dark:bg-green-900/40 dark:text-green-300'
  },
  [ITEM_STATUS.REJECTED]: {
    labelKey: STATUS_I18N[ITEM_STATUS.REJECTED]?.ru || 'itemStatusRejected',
    icon: XCircle,
    colorClass: STATUS_COLORS[ITEM_STATUS.REJECTED] || 'text-red-700 bg-red-200 dark:bg-red-900/40 dark:text-red-300'
  }
};

const DEFAULT_STATUS = {
  labelKey: 'statusUnknown',
  icon: AlertCircle,
  colorClass: 'text-gray-800 bg-gray-200 dark:bg-gray-700/60 dark:text-gray-200'
};

// ─────────────────────────────────────────────────────────────
// 🎨 СТИЛИ И АНИМАЦИИ
// ─────────────────────────────────────────────────────────────
const ANIMATION_DURATION = 200;

const styles = `
@keyframes slideIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
.app-card-enter { animation: slideIn ${ANIMATION_DURATION}ms ease-out forwards; }
.fade-enter { animation: fadeIn ${ANIMATION_DURATION}ms ease-out forwards; }
.pulse { animation: pulse 2s ease-in-out infinite; }
.shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.progress-glow { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
.application-card { transition: all 0.2s ease; will-change: transform, box-shadow; }
.application-card:hover { transform: translateY(-2px); box-shadow: 0 12px 35px rgba(0,0,0,0.12); }
.application-card:active { transform: translateY(0); }

/* МОБИЛЬНЫЕ СТИЛИ */
@media (max-width: 640px) {
  .touch-target { min-height: 44px; min-width: 44px; }
  .scrollable-content { -webkit-overflow-scrolling: touch; max-height: 200px; overflow-y: auto; }
  .application-card { padding: 12px !important; margin-bottom: 8px !important; border-radius: 12px !important; }
  .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .action-grid button { font-size: 12px; padding: 10px 8px; min-height: 44px; }
  .mobile-status-tabs { display: flex; overflow-x: auto; gap: 6px; padding: 4px 0; -webkit-overflow-scrolling: touch; }
  .mobile-status-tabs::-webkit-scrollbar { display: none; }
  .mobile-status-tab { flex-shrink: 0; padding: 8px 14px; font-size: 12px; border-radius: 20px; white-space: nowrap; }
  .mobile-material-item { padding: 10px 12px; }
}

/* ПЛАНШЕТЫ */
@media (min-width: 641px) and (max-width: 1024px) {
  .application-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
}

/* ДЕСКТОПНАЯ ТАБЛИЦА */
@media (min-width: 1025px) {
  .desktop-table-header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(8px);
  }
  .dark .desktop-table-header {
    background: rgba(31,41,55,0.9);
  }
  .desktop-row-expanded {
    background: rgba(59,130,246,0.03);
  }
  .dark .desktop-row-expanded {
    background: rgba(59,130,246,0.06);
  }
}
`;

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ
// ─────────────────────────────────────────────────────────────
const getDaysSince = (dateString) => {
  if (!dateString) return 0;
  const now = new Date();
  const created = new Date(dateString);
  const diffTime = Math.abs(now - created);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

const formatNumber = (num) => new Intl.NumberFormat('ru-RU').format(num);

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ
// ─────────────────────────────────────────────────────────────
const StatusBadge = memo(({ status, createdAt, statusText, t, className = '' }) => {
  const isOverdue = status === APPLICATION_STATUS.PENDING && getDaysSince(createdAt) > 2;
  const config = STATUS_CONFIG[isOverdue ? 'overdue' : status] || DEFAULT_STATUS;
  const StatusIcon = config.icon;
  const displayText = statusText || t(config.labelKey) || config.labelKey;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
        isOverdue ? config.overdueColorClass : config.colorClass
      } ${isOverdue ? 'pulse' : ''} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`${displayText}${isOverdue ? ` • ${t('overdue')}` : ''}`}
    >
      <StatusIcon className="w-4 h-4 mr-1 flex-shrink-0" aria-hidden="true" />
      {displayText}
      {isOverdue && <AlertTriangle className="w-3 h-3 ml-1" aria-hidden="true" />}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

// ─────────────────────────────────────────────────────────────
// 🧩 МОБИЛЬНАЯ КАРТОЧКА ЗАЯВКИ
// ─────────────────────────────────────────────────────────────
const MobileApplicationCard = memo(({ 
  application, 
  t, 
  onOpenReceiveModal, 
  onToggleComments,
  comments,
  showComments,
  onAddComment,
  getRoleLabel,
  isLoading,
  user,
  onCancelApplication,
  onDownloadHTML,
  onDownloadPDF,
  userRole,
  viewMode,
  commentDrafts,
  handleCommentChange,
  clearCommentDraftHandler,
  loadCommentDraft
}) => {
  const [expanded, setExpanded] = useState(false);
  const [materialsExpanded, setMaterialsExpanded] = useState(false);
  
  const totalMaterials = application.materials?.length || 0;
  const completedMaterials = application.materials?.filter(m => 
    (Number(m.received) || 0) >= (Number(m.quantity) || 0)
  ).length || 0;
  
  const isCompleted = application.status === APPLICATION_STATUS.RECEIVED;
  
  const canShowReceiveButton = (app, role) => {
    if (role !== 'supply_admin' && role !== 'manager') return false;
    const isActiveStatus = [
      APPLICATION_STATUS.PENDING,
      APPLICATION_STATUS.ADMIN_PROCESSING,
      APPLICATION_STATUS.PARTIAL_RECEIVED
    ].includes(app.status);
    const hasUnreceivedMaterials = app.materials?.some(m =>
      (Number(m.supplier_received_quantity) || 0) < (Number(m.quantity) || 0)
    );
    return isActiveStatus && hasUnreceivedMaterials;
  };
  
  const canShowSendToMasterButton = (app, role) => {
    if (role !== 'supply_admin' && role !== 'manager') return false;
    if (![APPLICATION_STATUS.ADMIN_PROCESSING, APPLICATION_STATUS.PARTIAL_RECEIVED, APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION].includes(app.status)) return false;
    const hasReceivedUnsentMaterials = app.materials?.some(m =>
      (Number(m.supplier_received_quantity) || 0) > 0 &&
      m.status !== ITEM_STATUS.SENT_TO_MASTER &&
      (Number(m.received) || 0) < (Number(m.quantity) || 0)
    );
    return hasReceivedUnsentMaterials;
  };

  const visibleMaterials = useMemo(() => {
    if (!application.materials) return [];
    let filtered = application.materials.filter(m => m?.description?.trim() && (Number(m.quantity) || 0) > 0);
    
    if (viewMode === 'received') {
      filtered = filtered.filter(m => (Number(m.received) || 0) >= (Number(m.quantity) || 0));
    } else if (viewMode === 'inwork' || viewMode === 'confirmation') {
      filtered = filtered.filter(m => (Number(m.received) || 0) < (Number(m.quantity) || 0));
    }
    return filtered;
  }, [application.materials, viewMode]);

  return (
    <article className="app-card-enter application-card bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
      <div 
        className="p-3 sm:p-4 cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white truncate">
              {application.object_name}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                {application.foreman_name}
              </span>
              <StatusBadge 
                status={application.status} 
                createdAt={application.created_at}
                t={t}
                className="text-[10px] px-1.5 py-0.5"
              />
              {isCompleted && (
                <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                  ✅ {t('completed')}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {totalMaterials}
            </span>
            <ChevronDown 
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>
        
        {totalMaterials > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0">
              {completedMaterials}/{totalMaterials}
            </span>
          </div>
        )}
      </div>
      
      {expanded && (
        <div className="p-3 pt-0 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-1 text-xs py-2">
            <div>
              <span className="text-gray-400">{t('foremanPhone')}:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300">{application.foreman_phone || '—'}</span>
            </div>
            <div>
              <span className="text-gray-400">{t('created')}:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300">
                {formatDate(application.created_at)}
              </span>
            </div>
          </div>
          
          {visibleMaterials.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setMaterialsExpanded(!materialsExpanded)}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2"
              >
                <Package className="w-3.5 h-3.5" />
                {t('materials')} ({visibleMaterials.length})
                <ChevronDown className={`w-3 h-3 transition-transform ${materialsExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              {materialsExpanded && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto scrollable-content">
                  {visibleMaterials.slice(0, 10).map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
                        {m.description || '—'}
                      </span>
                      <span className="text-gray-500 flex-shrink-0">
                        {m.quantity} {m.unit}
                      </span>
                    </div>
                  ))}
                  {visibleMaterials.length > 10 && (
                    <p className="text-center text-xs text-gray-400 py-1">
                      + ещё {visibleMaterials.length - 10} {t('materials')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="action-grid mt-3">
            {canShowReceiveButton(application, userRole) && (
              <button
                onClick={() => onOpenReceiveModal(application, 'admin_receive')}
                className="touch-target px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Package className="w-4 h-4" />
                {t('acceptToWarehouse') || 'Приёмка'}
              </button>
            )}
            
            {canShowSendToMasterButton(application, userRole) && (
              <button
                onClick={() => onOpenReceiveModal(application, 'admin_send_to_master')}
                className="touch-target px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Send className="w-4 h-4" />
                {t('sendToMaster') || 'Отправить'}
              </button>
            )}
            
            {userRole === 'foreman' && 
             requiresMasterConfirmation(application.status) && 
             application.user_id === user?.id && (
              <button
                onClick={() => onOpenReceiveModal(application, 'master_confirm')}
                className="touch-target px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {t('confirmReceipt') || 'Подтвердить'}
              </button>
            )}
            
            {userRole === 'foreman' && 
             isApplicationActive(application.status) && 
             application.status === APPLICATION_STATUS.PENDING && 
             application.user_id === user?.id && (
              <button
                onClick={() => onCancelApplication(application.id)}
                className="touch-target px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                <Ban className="w-4 h-4" />
                {t('cancelApplication')}
              </button>
            )}
            
            <button
              onClick={() => onToggleComments(application.id)}
              className="touch-target px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              💬 {comments[application.id]?.length || 0}
            </button>
            
            <button
              onClick={() => onDownloadHTML(application)}
              className="touch-target px-3 py-2 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileText className="w-4 h-4" />
              HTML
            </button>
            
            <button
              onClick={() => onDownloadPDF(application)}
              className="touch-target px-3 py-2 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
          
          <CommentsSection
            application={application}
            comments={comments}
            showComments={showComments}
            onToggleComments={() => onToggleComments(application.id)}
            onAddComment={(content) => onAddComment(application.id, content)}
            language="ru"
            t={t}
            getRoleLabel={getRoleLabel}
            escapeHtml={escapeHtml}
            isLoading={isLoading}
            user={user}
            draftValue={commentDrafts[application.id] || ''}
            onDraftChange={(value) => handleCommentChange(application.id, value)}
            onClearDraft={() => clearCommentDraftHandler(application.id)}
            onOpen={() => loadCommentDraft(application.id)}
          />
        </div>
      )}
    </article>
  );
});
MobileApplicationCard.displayName = 'MobileApplicationCard';

// ─────────────────────────────────────────────────────────────
// 🧩 ДЕСКТОПНАЯ СТРОКА ЗАЯВКИ
// ─────────────────────────────────────────────────────────────
const DesktopApplicationRow = memo(({ 
  application, 
  t, 
  onOpenReceiveModal, 
  onToggleComments,
  comments,
  showComments,
  onAddComment,
  getRoleLabel,
  isLoading,
  user,
  onCancelApplication,
  onDownloadHTML,
  onDownloadPDF,
  userRole,
  viewMode,
  commentDrafts,
  handleCommentChange,
  clearCommentDraftHandler,
  loadCommentDraft
}) => {
  const [expanded, setExpanded] = useState(false);
  const [materialsExpanded, setMaterialsExpanded] = useState(true);
  
  const totalMaterials = application.materials?.length || 0;
  const completedMaterials = application.materials?.filter(m => 
    (Number(m.received) || 0) >= (Number(m.quantity) || 0)
  ).length || 0;
  
  const completionPercent = totalMaterials > 0 ? Math.round((completedMaterials / totalMaterials) * 100) : 0;
  
  const isOverdue = application.status === APPLICATION_STATUS.PENDING && getDaysSince(application.created_at) > 2;
  
  const canShowReceiveButton = (app, role) => {
    if (role !== 'supply_admin' && role !== 'manager') return false;
    const isActiveStatus = [
      APPLICATION_STATUS.PENDING,
      APPLICATION_STATUS.ADMIN_PROCESSING,
      APPLICATION_STATUS.PARTIAL_RECEIVED
    ].includes(app.status);
    const hasUnreceivedMaterials = app.materials?.some(m =>
      (Number(m.supplier_received_quantity) || 0) < (Number(m.quantity) || 0)
    );
    return isActiveStatus && hasUnreceivedMaterials;
  };
  
  const canShowSendToMasterButton = (app, role) => {
    if (role !== 'supply_admin' && role !== 'manager') return false;
    if (![APPLICATION_STATUS.ADMIN_PROCESSING, APPLICATION_STATUS.PARTIAL_RECEIVED, APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION].includes(app.status)) return false;
    const hasReceivedUnsentMaterials = app.materials?.some(m =>
      (Number(m.supplier_received_quantity) || 0) > 0 &&
      m.status !== ITEM_STATUS.SENT_TO_MASTER &&
      (Number(m.received) || 0) < (Number(m.quantity) || 0)
    );
    return hasReceivedUnsentMaterials;
  };

  const visibleMaterials = useMemo(() => {
    if (!application.materials) return [];
    let filtered = application.materials.filter(m => m?.description?.trim() && (Number(m.quantity) || 0) > 0);
    
    if (viewMode === 'received') {
      filtered = filtered.filter(m => (Number(m.received) || 0) >= (Number(m.quantity) || 0));
    } else if (viewMode === 'inwork' || viewMode === 'confirmation') {
      filtered = filtered.filter(m => (Number(m.received) || 0) < (Number(m.quantity) || 0));
    }
    return filtered;
  }, [application.materials, viewMode]);

  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 transition-all ${isOverdue ? 'bg-red-50/30 dark:bg-red-900/10' : ''} ${expanded ? 'desktop-row-expanded' : ''}`}>
      {/* Основная строка */}
      <div className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
        {/* Объект + Прораб */}
        <div className="col-span-3 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
              aria-label={expanded ? t('collapse') : t('expand')}
            >
              {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            <div className="min-w-0">
              <div className="font-medium text-gray-900 dark:text-white truncate text-sm">
                {application.object_name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {application.foreman_name}
              </div>
            </div>
          </div>
        </div>

        {/* Статус */}
        <div className="col-span-2">
          <StatusBadge 
            status={application.status} 
            createdAt={application.created_at}
            t={t}
          />
        </div>

        {/* Прогресс */}
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${completionPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {completedMaterials}/{totalMaterials}
            </span>
          </div>
        </div>

        {/* Дата */}
        <div className="col-span-2 text-xs text-gray-500 dark:text-gray-400">
          {formatDate(application.created_at)}
          {isOverdue && (
            <span className="ml-2 text-red-500 flex items-center gap-0.5">
              <AlertTriangle className="w-3 h-3" />
              {t('overdue')}
            </span>
          )}
        </div>

        {/* Действия */}
        <div className="col-span-3 flex items-center justify-end gap-1.5 flex-wrap">
          {canShowReceiveButton(application, userRole) && (
            <button
              onClick={() => onOpenReceiveModal(application, 'admin_receive')}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              title={t('acceptToWarehouse') || 'Приёмка на склад'}
            >
              <Package className="w-3.5 h-3.5" />
              {t('accept') || 'Принять'}
            </button>
          )}
          
          {canShowSendToMasterButton(application, userRole) && (
            <button
              onClick={() => onOpenReceiveModal(application, 'admin_send_to_master')}
              className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              title={t('sendToMaster') || 'Отправить мастеру'}
            >
              <Send className="w-3.5 h-3.5" />
              {t('send') || 'Отправить'}
            </button>
          )}
          
          {userRole === 'foreman' && 
           requiresMasterConfirmation(application.status) && 
           application.user_id === user?.id && (
            <button
              onClick={() => onOpenReceiveModal(application, 'master_confirm')}
              className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {t('confirm') || 'Подтвердить'}
            </button>
          )}
          
          {userRole === 'foreman' && 
           isApplicationActive(application.status) && 
           application.status === APPLICATION_STATUS.PENDING && 
           application.user_id === user?.id && (
            <button
              onClick={() => onCancelApplication(application.id)}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              {t('cancel') || 'Отменить'}
            </button>
          )}
          
          <button
            onClick={() => onToggleComments(application.id)}
            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            title={`${t('comments')} (${comments[application.id]?.length || 0})`}
          >
            💬 {comments[application.id]?.length || 0}
          </button>
          
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onDownloadHTML(application)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title={t('exportHTML') || 'Экспорт HTML'}
            >
              <FileText className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <button
              onClick={() => onDownloadPDF(application)}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              title={t('exportPDF') || 'Экспорт PDF'}
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Раскрывающаяся часть */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700/50">
          {/* Детали */}
          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
            <div>
              <span className="text-gray-400">{t('foremanPhone')}:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300">{application.foreman_phone || '—'}</span>
            </div>
            <div>
              <span className="text-gray-400">{t('created')}:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300">{formatDate(application.created_at)}</span>
            </div>
            <div>
              <span className="text-gray-400">{t('materialsCount') || 'Кол-во материалов'}:</span>
              <span className="ml-1 text-gray-700 dark:text-gray-300">{totalMaterials}</span>
            </div>
          </div>

          {/* Материалы — таблица */}
          {visibleMaterials.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('materials')} ({visibleMaterials.length})
                </h4>
                <button
                  onClick={() => setMaterialsExpanded(!materialsExpanded)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
                >
                  {materialsExpanded ? t('collapse') : t('expand')}
                  {materialsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
              
              {materialsExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/30">
                      <tr>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">№</th>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('description') || 'Описание'}</th>
                        <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('quantity') || 'Кол-во'}</th>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('unit') || 'Ед.'}</th>
                        <th className="px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('status') || 'Статус'}</th>
                        <th className="px-3 py-1.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{t('received') || 'Получено'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/30">
                      {visibleMaterials.map((m, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                          <td className="px-3 py-1.5 text-xs text-gray-400">{idx + 1}</td>
                          <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{m.description || '—'}</td>
                          <td className="px-3 py-1.5 text-right font-medium">{m.quantity}</td>
                          <td className="px-3 py-1.5 text-gray-500">{m.unit || 'шт'}</td>
                          <td className="px-3 py-1.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              (Number(m.received) || 0) >= (Number(m.quantity) || 0) 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : (Number(m.supplier_received_quantity) || 0) > 0
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {(Number(m.received) || 0) >= (Number(m.quantity) || 0) 
                                ? '✅ ' + (t('received') || 'Получено')
                                : (Number(m.supplier_received_quantity) || 0) > 0
                                  ? '📦 ' + (t('onWarehouse') || 'На складе')
                                  : '⏳ ' + (t('pending') || 'Ожидается')}
                            </span>
                          </td>
                          <td className="px-3 py-1.5 text-right text-sm font-medium">
                            {Number(m.received) || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Комментарии */}
          <CommentsSection
            application={application}
            comments={comments}
            showComments={showComments}
            onToggleComments={() => onToggleComments(application.id)}
            onAddComment={(content) => onAddComment(application.id, content)}
            language="ru"
            t={t}
            getRoleLabel={getRoleLabel}
            escapeHtml={escapeHtml}
            isLoading={isLoading}
            user={user}
            draftValue={commentDrafts[application.id] || ''}
            onDraftChange={(value) => handleCommentChange(application.id, value)}
            onClearDraft={() => clearCommentDraftHandler(application.id)}
            onOpen={() => loadCommentDraft(application.id)}
          />
        </div>
      )}
    </div>
  );
});
DesktopApplicationRow.displayName = 'DesktopApplicationRow';

// ─────────────────────────────────────────────────────────────
// 🧩 СКЕЛЕТОН КАРТОЧКИ
// ─────────────────────────────────────────────────────────────
const ApplicationCardSkeleton = memo(() => (
  <article className="app-card-enter bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-xl border border-gray-200/60 dark:border-gray-700/60 animate-pulse">
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="flex gap-2 mt-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
          </div>
        </div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8" />
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full w-full" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  </article>
));
ApplicationCardSkeleton.displayName = 'ApplicationCardSkeleton';

// ─────────────────────────────────────────────────────────────
// 📊 ВКЛАДКИ ДЛЯ МОБИЛЬНЫХ
// ─────────────────────────────────────────────────────────────
const MobileStatusTabs = memo(({ active, onChange, counts, t }) => {
  const tabs = [
    { key: 'all', label: t('all'), icon: '📋' },
    { key: APPLICATION_STATUS.PENDING, label: t('statusPending'), icon: '⏳', count: counts?.pending || 0 },
    { key: APPLICATION_STATUS.ADMIN_PROCESSING, label: t('statusAdminProcessing') || 'Приёмка', icon: '📦', count: counts?.admin_processing || 0 },
    { key: APPLICATION_STATUS.RECEIVED, label: t('statusReceived'), icon: '✅', count: counts?.received || 0 },
    { key: APPLICATION_STATUS.CANCELED, label: t('statusCanceled'), icon: '❌', count: counts?.canceled || 0 },
  ];

  return (
    <div className="mobile-status-tabs -mx-1 px-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`mobile-status-tab touch-target ${
            active === tab.key
              ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg shadow-indigo-500/25'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <span className="flex items-center gap-1.5">
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                active === tab.key 
                  ? 'bg-white/20 text-white' 
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
              }`}>
                {tab.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
});
MobileStatusTabs.displayName = 'MobileStatusTabs';

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────
const ApplicationList = memo(({
  applications,
  title,
  emptyMessage,
  isMobile,
  user,
  isAdminMode,
  permissions,
  userRole,
  t,
  viewMode,
  uniqueDates,
  page,
  totalPages,
  onAdminLogout,
  onDownloadHTML,
  onDownloadPDF,
  onOpenReceiveModal,
  onCancelApplication,
  onAddComment,
  onToggleComments,
  onPageChange,
  searchTerm,
  statusFilter,
  dateFilter,
  viewedFilter,
  onSearchChange,
  onStatusFilterChange,
  onDateFilterChange,
  onViewedFilterChange,
  onClearFilters,
  comments = {},
  showComments = {},
  isLoading = false,
}) => {
  // ✅ Infinite Scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // ✅ Состояния для автосохранения комментариев
  const [commentDrafts, setCommentDrafts] = useState({});
  const commentTimerRef = useRef({});

  // ✅ Инжект стилей
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  // ✅ Загрузка следующей страницы при прокрутке
  useEffect(() => {
    if (inView && !isLoading && page < totalPages) {
      onPageChange(page + 1);
    }
  }, [inView, isLoading, page, totalPages, onPageChange]);

  // ✅ Автосохранение комментариев
  const loadCommentDraft = useCallback((applicationId) => {
    const savedDraft = getCommentDraft(applicationId);
    if (savedDraft) {
      setCommentDrafts(prev => ({ ...prev, [applicationId]: savedDraft }));
    } else {
      setCommentDrafts(prev => ({ ...prev, [applicationId]: '' }));
    }
    return savedDraft || '';
  }, []);

  const handleCommentChange = useCallback((applicationId, value) => {
    setCommentDrafts(prev => ({ ...prev, [applicationId]: value }));
    if (commentTimerRef.current[applicationId]) {
      clearTimeout(commentTimerRef.current[applicationId]);
    }
    commentTimerRef.current[applicationId] = setTimeout(() => {
      if (value && value.trim()) {
        saveCommentDraft(applicationId, value);
      } else {
        clearCommentDraft(applicationId);
      }
    }, 1000);
  }, []);

  const clearCommentDraftHandler = useCallback((applicationId) => {
    clearCommentDraft(applicationId);
    setCommentDrafts(prev => ({ ...prev, [applicationId]: '' }));
    if (commentTimerRef.current[applicationId]) {
      clearTimeout(commentTimerRef.current[applicationId]);
    }
  }, []);

  // ✅ Очистка таймеров
  useEffect(() => {
    const timers = commentTimerRef.current;
    return () => {
      Object.values(timers).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  // ✅ Получение роли
  const getRoleLabel = useCallback((role) => {
    const ROLE_OPTIONS = [
      { value: 'foreman', label: t('foremanName') },
      { value: 'supply_admin', label: t('roleSupplyAdmin') || 'Администратор снабжения' },
      { value: 'manager', label: t('roleManager') || 'Руководитель' },
      { value: 'accountant', label: t('roleAccountant') || 'Бухгалтер' }
    ];
    return ROLE_OPTIONS.find(r => r.value === role)?.label || role;
  }, [t]);

  // ✅ Подсчет статусов для вкладок
  const statusCounts = useMemo(() => {
    const counts = { pending: 0, admin_processing: 0, received: 0, canceled: 0 };
    applications.forEach(app => {
      if (app.status === APPLICATION_STATUS.PENDING) counts.pending++;
      else if (app.status === APPLICATION_STATUS.ADMIN_PROCESSING) counts.admin_processing++;
      else if (app.status === APPLICATION_STATUS.RECEIVED) counts.received++;
      else if (app.status === APPLICATION_STATUS.CANCELED) counts.canceled++;
    });
    return counts;
  }, [applications]);

  // ✅ Фильтр для мобильных вкладок
  const handleTabChange = useCallback((tabKey) => {
    onStatusFilterChange(tabKey);
  }, [onStatusFilterChange]);

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || dateFilter || viewedFilter !== 'all';

  // ─────────────────────────────────────────────────────────────
  // 📱 МОБИЛЬНЫЙ РЕНДЕРИНГ
  // ─────────────────────────────────────────────────────────────
  const renderMobileView = () => (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 app-card-enter">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-3 sm:p-6 border border-gray-200/50 dark:border-gray-700/50">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {formatNumber(applications.length)} {applications.length === 1 ? 'заявка' : applications.length < 5 ? 'заявки' : 'заявок'}
              </p>
            </div>
          </div>
          {isAdminMode && (
            <button
              onClick={onAdminLogout}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-all shadow-lg shadow-red-500/25"
            >
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span>{t('adminMode')}</span>
            </button>
          )}
        </div>

        {/* Мобильные вкладки */}
        <div className="mb-4">
          <MobileStatusTabs
            active={statusFilter}
            onChange={handleTabChange}
            counts={statusCounts}
            t={t}
          />
        </div>

        {/* Filters */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2 sm:gap-3 items-end">
            <div className="flex-1 min-w-[150px] sm:min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  placeholder={t('searchByObjectOrForeman')}
                  aria-label={t('search')}
                />
                {searchTerm && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    aria-label={t('clear')}
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-800 dark:text-gray-200 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                {t('clearFilters')}
              </button>
            )}
          </div>
          
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 rounded">Esc — сбросить</span>
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 rounded">Ctrl+Enter — экспорт</span>
          </div>
        </div>

        {/* Loading / Empty States */}
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <ApplicationCardSkeleton key={i} />)}
          </div>
        )}

        {!isLoading && applications.length === 0 && page > 1 && totalPages > 0 && (
          <div className="text-center py-8">
            <button
              onClick={() => onPageChange(1)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              ← Вернуться на первую страницу
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              На странице {page} нет заявок. Попробуйте перейти на первую страницу.
            </p>
          </div>
        )}

        {!isLoading && applications.length === 0 && (
          <div className="text-center py-12" role="status" aria-live="polite">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-3">
              <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            </div>
            <p className="text-base font-medium text-gray-900 dark:text-white mb-1">{emptyMessage || t('noApplications')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {hasActiveFilters ? t('tryClearFilters') || 'Попробуйте сбросить фильтры' : t('createFirstApplication') || 'Создайте первую заявку'}
            </p>
          </div>
        )}

        {/* Список карточек */}
        {!isLoading && applications.length > 0 && (
          <div className="space-y-3" role="list">
            {applications.map((application) => (
              <MobileApplicationCard
                key={application.id}
                application={application}
                t={t}
                onOpenReceiveModal={onOpenReceiveModal}
                onToggleComments={onToggleComments}
                comments={comments}
                showComments={showComments}
                onAddComment={onAddComment}
                getRoleLabel={getRoleLabel}
                isLoading={isLoading}
                user={user}
                onCancelApplication={onCancelApplication}
                onDownloadHTML={onDownloadHTML}
                onDownloadPDF={onDownloadPDF}
                userRole={userRole}
                viewMode={viewMode}
                commentDrafts={commentDrafts}
                handleCommentChange={handleCommentChange}
                clearCommentDraftHandler={clearCommentDraftHandler}
                loadCommentDraft={loadCommentDraft}
              />
            ))}
          </div>
        )}

        {/* Infinite Scroll Trigger */}
        {!isLoading && applications.length > 0 && page < totalPages && (
          <div ref={loadMoreRef} className="h-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {!isLoading && applications.length > 0 && page === totalPages && (
          <div className="h-10 flex items-center justify-center">
            <p className="text-xs text-gray-400">{t('allLoaded') || 'Все заявки загружены'}</p>
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // 🖥️ ДЕСКТОПНЫЙ РЕНДЕРИНГ
  // ─────────────────────────────────────────────────────────────
  const renderDesktopView = () => (
    <div className="max-w-7xl mx-auto p-4 app-card-enter">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Package className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatNumber(applications.length)} {applications.length === 1 ? 'заявка' : applications.length < 5 ? 'заявки' : 'заявок'}
              </p>
            </div>
          </div>
          {isAdminMode && (
            <button
              onClick={onAdminLogout}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl text-sm font-medium flex items-center gap-1.5 transition-all shadow-lg shadow-red-500/25"
            >
              <Shield className="w-4 h-4" aria-hidden="true" />
              <span>{t('adminMode')}</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
                  placeholder={t('searchByObjectOrForeman')}
                  aria-label={t('search')}
                />
                {searchTerm && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                    aria-label={t('clear')}
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                aria-label={t('filterByStatus')}
              >
                <option value="all">{t('allStatuses')}</option>
                <option value={APPLICATION_STATUS.DRAFT}>{t('statusDraft') || 'Черновик'}</option>
                <option value={APPLICATION_STATUS.PENDING}>{t('statusPending')}</option>
                <option value={APPLICATION_STATUS.ADMIN_PROCESSING}>{t('statusAdminProcessing') || 'Приёмка'}</option>
                <option value={APPLICATION_STATUS.PARTIAL_ON_WAREHOUSE}>{t('statusPartialWarehouse') || 'Частично на складе'}</option>
                <option value={APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION}>{t('statusPendingConfirmation') || 'Ожидает подтверждения'}</option>
                <option value={APPLICATION_STATUS.RECEIVED}>{t('statusReceived')}</option>
                <option value={APPLICATION_STATUS.PARTIAL_RECEIVED}>{t('statusPartialReceived') || 'Частично получено'}</option>
                <option value={APPLICATION_STATUS.REJECTED}>{t('statusRejected') || 'Отклонено'}</option>
                <option value={APPLICATION_STATUS.CANCELED}>{t('statusCanceled')}</option>
              </select>
            </div>

            <div>
              <select
                value={dateFilter}
                onChange={(e) => onDateFilterChange(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                aria-label={t('filterByDate')}
              >
                <option value="">{t('allDates')}</option>
                {uniqueDates?.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
            </div>

            {permissions?.canViewAll && (
              <div>
                <select
                  value={viewedFilter}
                  onChange={(e) => onViewedFilterChange(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                  aria-label={t('filterByViewed')}
                >
                  <option value="all">{t('allRequests')}</option>
                  <option value="new">{t('onlyNew')}</option>
                </select>
              </div>
            )}

            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-800 dark:text-gray-200 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                {t('clearFilters')}
              </button>
            )}
          </div>
          
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 rounded">Esc — сбросить</span>
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 rounded">Ctrl+Enter — экспорт</span>
            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 rounded">↕ — сортировка</span>
          </div>
        </div>

        {/* Loading / Empty States */}
        {isLoading && (
          <div className="p-4 space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && applications.length === 0 && page > 1 && totalPages > 0 && (
          <div className="text-center py-12">
            <button
              onClick={() => onPageChange(1)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              ← Вернуться на первую страницу
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              На странице {page} нет заявок. Попробуйте перейти на первую страницу.
            </p>
          </div>
        )}

        {!isLoading && applications.length === 0 && (
          <div className="text-center py-16" role="status" aria-live="polite">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 mb-4">
              <Package className="w-10 h-10 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">{emptyMessage || t('noApplications')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {hasActiveFilters ? t('tryClearFilters') || 'Попробуйте сбросить фильтры' : t('createFirstApplication') || 'Создайте первую заявку'}
            </p>
          </div>
        )}

        {/* Десктопная таблица */}
        {!isLoading && applications.length > 0 && (
          <div className="overflow-x-auto">
            {/* Заголовок таблицы */}
            <div className="desktop-table-header grid grid-cols-12 gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="col-span-3 flex items-center gap-2">
                <span>{t('objectAndForeman') || 'Объект / Прораб'}</span>
              </div>
              <div className="col-span-2">{t('status') || 'Статус'}</div>
              <div className="col-span-2">{t('progress') || 'Прогресс'}</div>
              <div className="col-span-2">{t('created') || 'Создана'}</div>
              <div className="col-span-3 text-right">{t('actions') || 'Действия'}</div>
            </div>

            {/* Строки заявок */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {applications.map((application) => (
                <DesktopApplicationRow
                  key={application.id}
                  application={application}
                  t={t}
                  onOpenReceiveModal={onOpenReceiveModal}
                  onToggleComments={onToggleComments}
                  comments={comments}
                  showComments={showComments}
                  onAddComment={onAddComment}
                  getRoleLabel={getRoleLabel}
                  isLoading={isLoading}
                  user={user}
                  onCancelApplication={onCancelApplication}
                  onDownloadHTML={onDownloadHTML}
                  onDownloadPDF={onDownloadPDF}
                  userRole={userRole}
                  viewMode={viewMode}
                  commentDrafts={commentDrafts}
                  handleCommentChange={handleCommentChange}
                  clearCommentDraftHandler={clearCommentDraftHandler}
                  loadCommentDraft={loadCommentDraft}
                />
              ))}
            </div>
          </div>
        )}

        {/* Пагинация и статус загрузки */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 flex flex-col sm:flex-row justify-between items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {t('showing') || 'Показано'} {applications.length} {t('applications') || 'заявок'}
            {totalPages > 1 && ` • ${t('page') || 'Страница'} ${page} ${t('of') || 'из'} ${totalPages}`}
          </span>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                aria-label={t('previousPage')}
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                {t('prev')}
              </button>
              
              <span className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg">
                {page} / {totalPages}
              </span>
              
              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                aria-label={t('nextPage')}
              >
                {t('next')}
                <ArrowLeft className="w-4 h-4 rotate-180" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {/* Infinite Scroll Trigger для десктопа (если есть еще страницы) */}
        {!isLoading && applications.length > 0 && page < totalPages && (
          <div ref={loadMoreRef} className="h-6 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {!isLoading && applications.length > 0 && page === totalPages && (
          <div className="h-6 flex items-center justify-center">
            <p className="text-xs text-gray-400">{t('allLoaded') || 'Все заявки загружены'}</p>
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // 📋 ОСНОВНОЙ РЕНДЕРИНГ - ВЫБОР ВЕРСИИ
  // ─────────────────────────────────────────────────────────────
  if (!user) {
    return null;
  }

  if (isMobile) {
    return renderMobileView();
  }

  return renderDesktopView();
});

ApplicationList.displayName = 'ApplicationList';

export default ApplicationList;