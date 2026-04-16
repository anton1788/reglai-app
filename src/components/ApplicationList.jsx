// src/components/ApplicationList.jsx
import React, { useMemo, useCallback, useEffect, memo, useState, useRef } from 'react';
import {
Package, Search, Shield, FileText, Download, Ban,
CheckCircle, AlertCircle, AlertTriangle, Clock, Archive,
X, ArrowLeft, Loader2, ShoppingCart, ChevronDown, ChevronUp,
Sparkles, Undo2, Info, RefreshCw, Mail, XCircle, Warehouse,
Send, CheckCircle2, Hourglass, Boxes
} from 'lucide-react';
import CommentsSection from './CommentsSection';
import MobileMaterialCard from './MobileMaterialCard';
// ─────────────────────────────────────────────────────────────
// 📦 ИМПОРТ СТАТУСОВ ИЗ ЦЕНТРАЛИЗОВАННОГО ФАЙЛА
// ─────────────────────────────────────────────────────────────
import {
APPLICATION_STATUS,
ITEM_STATUS,
STATUS_COLORS,
STATUS_ICONS,
STATUS_I18N,
getStatusText,
isApplicationActive,
isApplicationCompleted,
requiresMasterConfirmation
} from '../utils/applicationStatuses';
// ─────────────────────────────────────────────────────────────
// 📦 КОНФИГУРАЦИЯ СТАТУСОВ
// ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
// Заявки
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
// ✅ 'overdue' для просроченных заявок
overdue: {
labelKey: 'overdue',
icon: AlertTriangle,
colorClass: 'text-red-800 bg-red-200 dark:bg-red-900/70 dark:text-red-200 border-2 border-red-500',
isOverdue: true
},
// Позиции — ✅ с дефолтными значениями
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
const UNDO_TIMEOUT_MS = 3000;
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
.quantity-stepper input::-webkit-outer-spin-button,
.quantity-stepper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.quantity-stepper input[type=number] { -moz-appearance: textfield; }
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
const formatDate = (dateString, language) => {
if (!dateString) return '';
try {
return new Date(dateString).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', {
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
const StatusBadge = memo(({ status, createdAt, statusText, t }) => {
const isOverdue = status === APPLICATION_STATUS.PENDING && getDaysSince(createdAt) > 2;
const config = STATUS_CONFIG[isOverdue ? 'overdue' : status] || DEFAULT_STATUS;
const StatusIcon = config.icon;
const displayText = statusText || t(config.labelKey) || config.labelKey;
return (
<span
className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
isOverdue ? config.overdueColorClass : config.colorClass
} ${isOverdue ? 'pulse' : ''}`}
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
const ExportButton = memo(({ label, onClick, disabled, loading, ariaLabel, icon: IconComponent }) => {
const Icon = IconComponent;
return (
<button
onClick={onClick}
disabled={disabled || loading}
className="group relative px-3 py-1.5 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-xl border border-gray-300/50 dark:border-gray-600/50 hover:bg-gray-50/80 dark:hover:bg-gray-600/80 hover:border-indigo-300/60 dark:hover:border-indigo-500/60 text-xs font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md"
aria-label={ariaLabel || label}
title={label}
>
{loading ? (
<Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-indigo-600" aria-hidden="true" />
) : (
<Icon className="w-3.5 h-3.5 mr-1 flex-shrink-0 group-hover:scale-110 transition-transform" aria-hidden="true" />
)}
<span className="hidden sm:inline">{label}</span>
</button>
);
});
ExportButton.displayName = 'ExportButton';
const ProgressBar = memo(({ onWarehouse, confirmed, total, t }) => {
const warehouseProgress = total > 0 ? Math.round((onWarehouse / total) * 100) : 0;
const confirmationProgress = total > 0 ? Math.round((confirmed / total) * 100) : 0;
const isComplete = confirmationProgress === 100 && total > 0;
return (
<div className="mb-3" aria-label={t('progressLabel')}>
<div className="flex justify-between text-xs mb-1.5">
<span className="font-medium text-gray-700 dark:text-gray-300">
{t('warehouse')}: {formatNumber(onWarehouse)}/{formatNumber(total)}
{confirmed > 0 && ` • ${t('confirmed')}: ${formatNumber(confirmed)}`}
</span>
<span className={`font-semibold ${isComplete ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
{confirmationProgress}%
</span>
</div>
<div className="w-full bg-gray-200/60 dark:bg-gray-700/60 rounded-full h-2 overflow-hidden">
<div
className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500"
style={{ width: `${Math.min(warehouseProgress, 100)}%` }}
role="progressbar"
aria-valuenow={warehouseProgress}
aria-valuemin={0}
aria-valuemax={100}
title={t('onWarehouse')}
/>
{confirmed > 0 && (
<div
className={`h-2 rounded-full transition-all duration-500 -mt-2 ${
isComplete
? 'bg-gradient-to-r from-green-400 to-emerald-500 progress-glow'
: 'bg-gradient-to-r from-green-400 to-green-500'
}`}
style={{ width: `${Math.min(confirmationProgress, 100)}%` }}
role="progressbar"
aria-valuenow={confirmationProgress}
aria-valuemin={0}
aria-valuemax={100}
title={t('confirmed')}
/>
)}
</div>
</div>
);
});
ProgressBar.displayName = 'ProgressBar';
const Toast = memo(({ message, type, onClose, onUndo, canUndo, t }) => {
useEffect(() => {
if (!canUndo) {
const timer = setTimeout(onClose, UNDO_TIMEOUT_MS);
return () => clearTimeout(timer);
}
}, [onClose, canUndo]);
const config = {
success: { bg: 'bg-green-50 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-200', icon: CheckCircle },
error: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-200', icon: AlertCircle },
info: { bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-200', icon: Info }
};
const { bg, border, text, icon: Icon } = config[type] || config.info;
return (
<div className={`fixed bottom-4 right-4 z-[80] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${bg} ${border} ${text} modal-enter max-w-sm`}>
<Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
<p className="text-sm font-medium flex-1">{message}</p>
{canUndo && onUndo && (
<button
onClick={onUndo}
className="px-3 py-1 text-xs font-medium bg-white/50 dark:bg-gray-700/50 rounded-lg hover:bg-white/70 dark:hover:bg-gray-600/50 transition-colors flex items-center gap-1"
>
<Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
{t('undo') || 'Отменить'}
</button>
)}
<button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors" aria-label={t('close')}>
<X className="w-4 h-4" aria-hidden="true" />
</button>
</div>
);
});
Toast.displayName = 'Toast';
const ApplicationCardSkeleton = memo(() => (
<article className="app-card-enter bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 animate-pulse">
<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
<div className="flex-1 min-w-0">
<div className="flex items-start justify-between gap-2 mb-2">
<div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
<div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20" />
</div>
<div className="space-y-2 mb-3">
<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
</div>
<div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full mb-1" />
<div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-3/4" />
</div>
<div className="flex flex-wrap sm:flex-col gap-2">
{[...Array(3)].map((_, i) => (
<div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded-xl w-20" />
))}
</div>
</div>
</article>
));
ApplicationCardSkeleton.displayName = 'ApplicationCardSkeleton';
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
language,
uniqueDates,
page,
totalPages,
onAdminLogout,
onDownloadHTML,
onDownloadPDF,
onDownloadXLSX,
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
expandedMaterials,
onToggleMaterial,
comments = {},
showComments = {},
isLoading = false,
isExportingPDF = false,
isExportingXLSX = false
}) => {
const [toast, setToast] = useState(null);
const toastTimerRef = useRef(null);
useEffect(() => {
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);
return () => document.head.removeChild(styleEl);
}, []);
const showToast = useCallback((message, type = 'info', canUndo = false, undoFn = null) => {
if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
setToast({ message, type, canUndo, undoFn, id: Date.now() });
if (!canUndo) {
toastTimerRef.current = setTimeout(() => {
setToast(null);
toastTimerRef.current = null;
}, UNDO_TIMEOUT_MS);
}
}, []);
useEffect(() => {
const handleKeyDown = (e) => {
if (e.key === 'Escape') {
if (searchTerm) onSearchChange('');
if (statusFilter !== 'all') onStatusFilterChange('all');
if (toast) setToast(null);
}
if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && applications.length > 0) {
e.preventDefault();
showToast(t('exportStarted') || 'Экспорт начат', 'info');
}
};
document.addEventListener('keydown', handleKeyDown);
return () => document.removeEventListener('keydown', handleKeyDown);
}, [searchTerm, statusFilter, applications.length, onSearchChange, onStatusFilterChange, t, toast, showToast]);
useEffect(() => {
return () => {
if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
};
}, []);
const getRoleLabel = useCallback((role) => {
const ROLE_OPTIONS = [
{ value: 'foreman', label: t('foremanName') },
{ value: 'supply_admin', label: t('roleSupplyAdmin') || 'Администратор снабжения' },
{ value: 'manager', label: t('roleManager') || 'Руководитель' },
{ value: 'accountant', label: t('roleAccountant') || 'Бухгалтер' }
];
return ROLE_OPTIONS.find(r => r.value === role)?.label || role;
}, [t]);
// ✅ НОВЫЙ: Статус материала с учётом всех полей — ✅ с дефолтными значениями
const getMaterialStatus = useCallback((material, translate) => {
const requestedQty = Number(material.quantity) || 0;
const onWarehouse = Number(material.supplier_received_quantity) || 0;
const confirmed = Number(material.received) || 0;
const itemStatus = material.status || ITEM_STATUS.PENDING;
if (confirmed >= requestedQty && requestedQty > 0) {
return {
text: translate('statusReceived'),
class: STATUS_CONFIG[ITEM_STATUS.CONFIRMED]?.colorClass || DEFAULT_STATUS.colorClass,
icon: STATUS_CONFIG[ITEM_STATUS.CONFIRMED]?.icon || CheckCircle2
};
}
if (onWarehouse > 0 && confirmed < requestedQty) {
return {
text: translate('itemStatusOnWarehouse') || 'На складе',
class: STATUS_CONFIG[ITEM_STATUS.ON_WAREHOUSE]?.colorClass || DEFAULT_STATUS.colorClass,
icon: STATUS_CONFIG[ITEM_STATUS.ON_WAREHOUSE]?.icon || Warehouse
};
}
if (itemStatus === ITEM_STATUS.SENT_TO_MASTER) {
return {
text: translate('itemStatusSent') || 'Отправлено',
class: STATUS_CONFIG[ITEM_STATUS.SENT_TO_MASTER]?.colorClass || DEFAULT_STATUS.colorClass,
icon: STATUS_CONFIG[ITEM_STATUS.SENT_TO_MASTER]?.icon || Send
};
}
return {
text: translate('statusPending'),
class: STATUS_CONFIG[ITEM_STATUS.PENDING]?.colorClass || DEFAULT_STATUS.colorClass,
icon: STATUS_CONFIG[ITEM_STATUS.PENDING]?.icon || Hourglass
};
}, []);
// ✅ ХЕЛПЕР: Можно ли показать кнопку «Приёмка на склад»
const canShowReceiveButton = useCallback((app, role) => {
if (role !== 'supply_admin' && role !== 'manager') return false;
// ✅ Добавили PARTIAL_RECEIVED — можно принимать остатки
const isActiveStatus = [
APPLICATION_STATUS.PENDING,
APPLICATION_STATUS.ADMIN_PROCESSING,
APPLICATION_STATUS.PARTIAL_RECEIVED
].includes(app.status);
const hasUnreceivedMaterials = app.materials?.some(m =>
(Number(m.supplier_received_quantity) || 0) < (Number(m.quantity) || 0)
);
return isActiveStatus && hasUnreceivedMaterials;
}, []);
// ✅ ХЕЛПЕР: Можно ли показать кнопку «Отправить мастеру»
const canShowSendToMasterButton = useCallback((app, role) => {
if (role !== 'supply_admin' && role !== 'manager') return false;
// ✅ Разрешаем отправку для ADMIN_PROCESSING, PARTIAL_RECEIVED и PENDING_MASTER_CONFIRMATION
if (![APPLICATION_STATUS.ADMIN_PROCESSING, APPLICATION_STATUS.PARTIAL_RECEIVED, APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION].includes(app.status)) return false;
const hasReceivedUnsentMaterials = app.materials?.some(m =>
(Number(m.supplier_received_quantity) || 0) > 0 &&
m.status !== ITEM_STATUS.SENT_TO_MASTER &&
(Number(m.received) || 0) < (Number(m.quantity) || 0)  // ещё не подтверждено мастером
);
return hasReceivedUnsentMaterials;
}, []);
// ✅ ФИЛЬТР: показывать только непринятые материалы для активных заявок
// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ
const getVisibleMaterials = useCallback((materials, viewMode) => {
if (!materials || !Array.isArray(materials)) return [];
// ✅ Сначала фильтруем пустые
const validMaterials = materials.filter(m =>
m?.description?.trim() &&
(Number(m.quantity) || 0) > 0
);
if (viewMode === 'received') {
return validMaterials.filter(m => {
const confirmed = Number(m.received) || 0;
const requested = Number(m.quantity) || 0;
return confirmed >= requested && requested > 0;
});
}
if (viewMode === 'inwork' || viewMode === 'confirmation') {
return validMaterials.filter(m => {
const confirmed = Number(m.received) || 0;
const requested = Number(m.quantity) || 0;
return confirmed < requested;
});
}
return validMaterials;
}, []);
const processedApplications = useMemo(() => {
return applications.map(app => {
const totalMaterials = app.materials?.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0) || 0;
const onWarehouse = app.materials?.reduce((sum, m) => sum + (Number(m.supplier_received_quantity) || 0), 0) || 0;
const confirmed = app.materials?.reduce((sum, m) => sum + (Number(m.received) || 0), 0) || 0;
const isActive = isApplicationActive(app.status);
const isCompleted = isApplicationCompleted(app.status);
return {
...app,
_calculated: {
totalMaterials,
onWarehouse,
confirmed,
isActive,
isCompleted,
warehouseProgress: totalMaterials > 0 ? Math.round((onWarehouse / totalMaterials) * 100) : 0,
confirmationProgress: totalMaterials > 0 ? Math.round((confirmed / totalMaterials) * 100) : 0
}
};
});
}, [applications]);
const handleDownloadPDF = useCallback((app) => {
if (!isExportingPDF) onDownloadPDF(app);
}, [isExportingPDF, onDownloadPDF]);
const handleDownloadXLSX = useCallback((app) => {
if (!isExportingXLSX) onDownloadXLSX(app);
}, [isExportingXLSX, onDownloadXLSX]);
const handlePageChange = useCallback((newPage) => {
if (newPage >= 1 && newPage <= totalPages) {
onPageChange(newPage);
}
}, [totalPages, onPageChange]);
const handleCancel = useCallback((app) => {
if (window.confirm(t('confirmCancel') || 'Отменить заявку?')) {
onCancelApplication(app.id);
showToast(t('applicationCanceled') || 'Заявка отменена', 'success', true, () => {
// Undo logic placeholder
});
}
}, [onCancelApplication, t, showToast]);
const hasActiveFilters = searchTerm || statusFilter !== 'all' || dateFilter || viewedFilter !== 'all';
return (
<div className="max-w-7xl mx-auto p-4 app-card-enter">
<div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
{/* Header */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
<div className="flex items-center gap-3">
<div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/20">
<Package className="w-5 h-5 text-white" aria-hidden="true" />
</div>
<div>
<h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
{formatNumber(applications.length)} {applications.length === 1 ? 'заявка' : applications.length < 5 ? 'заявки' : 'заявок'}
</p>
</div>
</div>
{isAdminMode && (
<button
onClick={onAdminLogout}
className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-lg shadow-red-500/25"
aria-label={t('exitAdminMode')}
>
<Shield className="w-4 h-4" aria-hidden="true" />
<span>{t('adminMode')}</span>
</button>
)}
</div>
{/* Filters */}
<div className="mb-6">
<div className="flex flex-wrap gap-3 items-end">
{/* Search */}
<div className="flex-1 min-w-[200px]">
<label htmlFor="search-input" className="sr-only">{t('search')}</label>
<div className="relative">
<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" aria-hidden="true" />
<input
id="search-input"
type="search"
value={searchTerm}
onChange={(e) => onSearchChange(e.target.value)}
className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all"
placeholder={t('searchByObjectOrForeman')}
aria-label={t('search')}
/>
{searchTerm && (
<button
onClick={() => onSearchChange('')}
className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
aria-label={t('clear')}
>
<X className="w-4 h-4" aria-hidden="true" />
</button>
)}
</div>
</div>
{/* Status Filter - ✅ ВСЕ СТАТУСЫ через константы */}
<div>
<label htmlFor="status-filter" className="sr-only">{t('filterByStatus')}</label>
<select
id="status-filter"
value={statusFilter}
onChange={(e) => onStatusFilterChange(e.target.value)}
className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
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
{/* Date Filter */}
<div>
<label htmlFor="date-filter" className="sr-only">{t('filterByDate')}</label>
<select
id="date-filter"
value={dateFilter}
onChange={(e) => onDateFilterChange(e.target.value)}
className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
aria-label={t('filterByDate')}
>
<option value="">{t('allDates')}</option>
{uniqueDates?.map(date => (
<option key={date} value={date}>{date}</option>
))}
</select>
</div>
{/* Viewed Filter */}
{permissions?.canViewAll && (
<div>
<label htmlFor="viewed-filter" className="sr-only">{t('filterByViewed')}</label>
<select
id="viewed-filter"
value={viewedFilter}
onChange={(e) => onViewedFilterChange(e.target.value)}
className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
aria-label={t('filterByViewed')}
>
<option value="all">{t('allRequests')}</option>
<option value="new">{t('onlyNew')}</option>
</select>
</div>
)}
{/* Clear Filters */}
{hasActiveFilters && (
<button
onClick={onClearFilters}
className="px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 text-gray-800 dark:text-gray-200 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5"
aria-label={t('clearFilters')}
>
<RefreshCw className="w-4 h-4" aria-hidden="true" />
{t('clearFilters')}
</button>
)}
</div>
<div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400 dark:text-gray-500">
<span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 rounded">Esc — сбросить фильтры</span>
<span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 rounded">Ctrl+Enter — экспорт</span>
</div>
</div>
{/* Loading / Empty States */}
{isLoading && (
<div className="space-y-4">
{[...Array(3)].map((_, i) => <ApplicationCardSkeleton key={i} />)}
</div>
)}
{!isLoading && applications.length === 0 && (
<div className="text-center py-16" role="status" aria-live="polite">
<div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
<Package className="w-10 h-10 text-gray-400 dark:text-gray-500" aria-hidden="true" />
</div>
<p className="text-lg font-medium text-gray-900 dark:text-white mb-1">{emptyMessage || t('noApplications')}</p>
<p className="text-sm text-gray-500 dark:text-gray-400">
{hasActiveFilters ? t('tryClearFilters') || 'Попробуйте сбросить фильтры' : t('createFirstApplication') || 'Создайте первую заявку'}
</p>
</div>
)}
{/* Applications List */}
{!isLoading && processedApplications.length > 0 && (
<div className="space-y-4" role="list" aria-label={t('applicationsList')}>
{processedApplications.map((application) => {
const { _calculated: calc } = application;

// ✅✅✅ КНОПКИ ЭКСПОРТА ВНУТРИ .map() — application теперь в области видимости ✅✅✅
const exportButtons = [
{
key: 'html',
icon: FileText,
label: t('downloadHTML'),
action: () => {
const filteredMaterials = getVisibleMaterials(application.materials, viewMode);
onDownloadHTML({ ...application, materials: filteredMaterials });
},
loading: false
},
{
key: 'pdf',
icon: Download,
label: t('downloadPDF'),
action: () => {
const filteredMaterials = getVisibleMaterials(application.materials, viewMode);
handleDownloadPDF({ ...application, materials: filteredMaterials });
},
loading: isExportingPDF
},
{
key: 'xlsx',
icon: Download,
label: t('downloadXLSX'),
action: () => {
const filteredMaterials = getVisibleMaterials(application.materials, viewMode);
handleDownloadXLSX({ ...application, materials: filteredMaterials });
},
loading: isExportingXLSX
}
];

return (
<article
key={application.id}
className="app-card-enter application-card bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:border-indigo-300/60 dark:hover:border-indigo-600/60 focus-within:ring-2 focus-within:ring-indigo-500"
aria-labelledby={`app-title-${application.id}`}
role="listitem"
>
<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
{/* Main Content */}
<div className="flex-1 min-w-0">
<div className="flex items-start justify-between gap-2 mb-2">
<h3
id={`app-title-${application.id}`}
className="text-lg font-semibold text-gray-900 dark:text-white truncate"
title={application.object_name}
>
{application.object_name}
</h3>
<StatusBadge
status={application.status}
createdAt={application.created_at}
statusText={getStatusText(application.status, language)}
t={t}
/>
</div>
<dl className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-3">
<div>
<dt className="font-medium text-gray-700 dark:text-gray-300 inline">{t('foremanName')}:</dt>
<dd className="inline ml-1">{application.foreman_name}</dd>
</div>
<div>
<dt className="font-medium text-gray-700 dark:text-gray-300 inline">{t('foremanPhone')}:</dt>
<dd className="inline ml-1">{application.foreman_phone || t('notSpecified')}</dd>
</div>
<div>
<dt className="font-medium text-gray-700 dark:text-gray-300 inline">{t('created')}:</dt>
<dd className="inline ml-1">{formatDate(application.created_at, language)}</dd>
</div>
</dl>
{/* ✅ Только один ProgressBar для активных */}
{calc.isActive && calc.totalMaterials > 0 && (
<ProgressBar
onWarehouse={calc.onWarehouse}
confirmed={calc.confirmed}
total={calc.totalMaterials}
t={t}
/>
)}
{calc.isCompleted && (
<div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
<CheckCircle className="w-3 h-3" />
{t('completed')}
</div>
)}
{/* Materials */}
{isMobile ? (
<div className="space-y-2" role="list" aria-label={t('materialsList')}>
{getVisibleMaterials(application.materials, viewMode)?.map((material, idx) => (
<MobileMaterialCard
key={`${application.id}-mat-${idx}`}
material={material}
index={idx}
language={language}
t={t}
isOpen={expandedMaterials?.[`${application.id}-${idx}`] || false}
onToggle={() => onToggleMaterial(application.id, idx)}
getMaterialStatus={getMaterialStatus}
escapeHtml={escapeHtml}
/>
))}
</div>
) : (
<div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" role="table" aria-label={t('materialsTable')}>
<thead className="bg-gray-50 dark:bg-gray-700/50">
<tr>
{['#', 'description', 'requested', 'received', 'unit', 'status'].map((key) => (
<th
key={key}
scope="col"
className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
>
{key === '#' ? '#' : t(`material${key.charAt(0).toUpperCase() + key.slice(1)}`) || key}
</th>
))}
</tr>
</thead>
<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
{getVisibleMaterials(application.materials, viewMode, userRole)?.map((material, idx) => {
const matStatus = getMaterialStatus(material, t);
const requestedQty = Number(material.quantity) || 0;
const onWarehouse = Number(material.supplier_received_quantity) || 0;
const confirmed = Number(material.received) || 0;
return (
<tr key={`${application.id}-mat-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
<td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{formatNumber(idx + 1)}</td>
<td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" title={material.description}>
{material.description}
</td>
<td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatNumber(requestedQty)}</td>
<td className="px-4 py-2 whitespace-nowrap text-sm">
<div className="flex flex-col gap-1">
<span className="text-gray-700 dark:text-gray-300">
{t('confirmed')}: {formatNumber(confirmed)}
</span>
{onWarehouse > 0 && confirmed < requestedQty && (
<span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
<Warehouse className="w-3 h-3" />
{t('onWarehouse')}: {formatNumber(onWarehouse)}
</span>
)}
</div>
</td>
<td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{material.unit}</td>
<td className="px-4 py-2 whitespace-nowrap">
<span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${matStatus.class}`}>
{matStatus.icon && <matStatus.icon className="w-3 h-3" aria-hidden="true" />}
{matStatus.text}
</span>
</td>
</tr>
);
})}
</tbody>
</table>
</div>
)}
</div>
{/* Action Buttons - ✅ РАЗДЕЛЕНИЕ ПО РОЛЯМ И СТАТУСАМ С ХЕЛПЕРАМИ */}
<div className="flex flex-wrap sm:flex-col gap-2 sm:ml-6 sm:justify-start">
{/* ✅ Кнопки экспорта с отфильтрованными материалами */}
{exportButtons.map((btn) => (
<ExportButton
key={btn.key}
icon={btn.icon}
label={btn.label}
onClick={() => btn.action()}
disabled={application.status === APPLICATION_STATUS.CANCELED}
loading={btn.loading}
ariaLabel={`${btn.label} — ${application.object_name}`}
/>
))}
{application.status !== APPLICATION_STATUS.CANCELED && (
<>
{/* 🔸 АДМИН/МЕНЕДЖЕР: Приёмка на склад — ✅ с проверкой непринятых материалов */}
{canShowReceiveButton(application, userRole) && (
<button
onClick={() => onOpenReceiveModal(application, 'admin_receive')}
className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/25"
aria-label={t('acceptToWarehouse')}
>
<Package className="w-3.5 h-3.5" aria-hidden="true" />
{t('acceptToWarehouse') || 'Приёмка'}
</button>
)}
{/* 🔸 АДМИН/МЕНЕДЖЕР: Отправка мастеру — ✅ с проверкой неотправленных материалов */}
{canShowSendToMasterButton(application, userRole) && (
<button
onClick={() => onOpenReceiveModal(application, 'admin_send_to_master')}
className="px-3 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-lg shadow-purple-500/25"
aria-label={t('sendToMaster')}
>
<Send className="w-3.5 h-3.5" aria-hidden="true" />
{t('sendToMaster') || 'Отправить'}
</button>
)}
{/* 🔸 МАСТЕР: Подтверждение получения */}
{userRole === 'foreman' &&
requiresMasterConfirmation(application.status) &&
application.user_id === user?.id && (
<button
onClick={() => onOpenReceiveModal(application, 'master_confirm')}
className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-lg shadow-green-500/25"
aria-label={t('confirmReceipt')}
>
<CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
{t('confirmReceipt') || 'Подтвердить'}
</button>
)}
{/* 🔸 МАСТЕР: Отмена своей заявки */}
{userRole === 'foreman' &&
isApplicationActive(application.status) &&
application.status === APPLICATION_STATUS.PENDING &&
application.user_id === user?.id && (
<button
onClick={() => handleCancel(application)}
className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all shadow-lg shadow-red-500/25"
aria-label={t('cancelApplication')}
>
<Ban className="w-3.5 h-3.5" aria-hidden="true" />
{t('cancelApplication')}
</button>
)}
</>
)}
</div>
</div>
{/* Comments Section */}
<CommentsSection
application={application}
comments={comments}
showComments={showComments}
onToggleComments={() => onToggleComments(application.id)}
onAddComment={(content) => onAddComment(application.id, content)}
language={language}
t={t}
getRoleLabel={getRoleLabel}
escapeHtml={escapeHtml}
isLoading={isLoading}
user={user}
/>
{/* Change History */}
{application.status_history?.length > 0 && (
<details className="mt-4 pt-4 border-t border-gray-200/30 dark:border-gray-700/30 group">
<summary className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer list-none flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
{t('changeHistory') || 'История изменений'}
<ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" aria-hidden="true" />
</summary>
<div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
{application.status_history.slice().reverse().map((entry, idx) => (
<div key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
<span className="font-medium text-gray-900 dark:text-white shrink-0">
{formatDate(entry.timestamp, language)}
</span>
<span className="text-gray-400">→</span>
<span className="shrink-0">
{getStatusText(entry.new_status, language) || entry.new_status}
</span>
{entry.details && (
<span className="text-gray-500 dark:text-gray-500 ml-2">({entry.details})</span>
)}
</div>
))}
</div>
</details>
)}
</article>
);
})}
</div>
)}
{/* Pagination */}
{totalPages > 1 && (
<nav className="flex justify-center mt-6 gap-2" aria-label={t('pagination')} role="navigation">
<button
onClick={() => handlePageChange(page - 1)}
disabled={page === 1}
className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
aria-label={t('previousPage')}
>
<ArrowLeft className="w-4 h-4" aria-hidden="true" />
{t('prev')}
</button>
<span className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium bg-gray-100 dark:bg-gray-700 rounded-xl" aria-current="page">
{formatNumber(page)} / {formatNumber(totalPages)}
</span>
<button
onClick={() => handlePageChange(page + 1)}
disabled={page === totalPages}
className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
aria-label={t('nextPage')}
>
{t('next')}
<ArrowLeft className="w-4 h-4 rotate-180" aria-hidden="true" />
</button>
</nav>
)}
</div>
{/* Toast Notification */}
{toast && (
<Toast
message={toast.message}
type={toast.type}
canUndo={toast.canUndo}
onClose={() => setToast(null)}
onUndo={toast.undoFn}
t={t}
/>
)}
<div className="sr-only" aria-live="polite" aria-atomic="true">
{toast ? toast.message : ''}
</div>
</div>
);
});
ApplicationList.displayName = 'ApplicationList';
export default ApplicationList;