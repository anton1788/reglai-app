// src/components/WarehouseView.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
Package, Download, Search, Filter, Truck, Loader2, CheckCircle, XCircle,
Users, MapPin, AlertCircle, Plus, Minus, Edit2, ArrowRight, FileText,
History, TrendingUp, Eye, Calendar, Info, ChevronDown, ChevronUp,
Sparkles, Undo2, CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  logWarehouseAccess,
  getUserContext,
  shouldLogFeature
} from '../utils/auditLogger'; 

// === Константы ===
const LOW_STOCK_THRESHOLD = 10;
const MEDIUM_STOCK_THRESHOLD = 50;
const SEARCH_DEBOUNCE_MS = 300;
const ANIMATION_DURATION = 200;

// ✅ ЛОКАЛЬНАЯ МАПА ТРАНЗАКЦИЙ
const TRANSACTION_TYPE_LABELS = {
income: 'Приход',
expense: 'Расход',
write_off: 'Списание',
return: 'Возврат'
};

// === Анимации и стили ===
const styles = `
@keyframes slideIn { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.warehouse-card { transition: all 0.2s ease; will-change: transform, box-shadow; }
.warehouse-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.12); }
.warehouse-card:active { transform: translateY(0); }
.stat-card { transition: all 0.2s ease; }
.stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(0,0,0,0.15); }
.modal-enter { animation: slideIn ${ANIMATION_DURATION}ms ease-out forwards; }
.fade-enter { animation: fadeIn ${ANIMATION_DURATION}ms ease-out forwards; }
.pulse { animation: pulse 2s ease-in-out infinite; }
.shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.status-low { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
.status-medium { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.status-ok { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
.status-pending { background: rgba(156, 163, 175, 0.1); color: #6b7280; }
.status-partial { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.status-received { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
.dark .status-low { background: rgba(239, 68, 68, 0.2); }
.dark .status-medium { background: rgba(245, 158, 11, 0.2); }
.dark .status-ok { background: rgba(34, 197, 94, 0.2); }
.dark .status-pending { background: rgba(156, 163, 175, 0.2); }
.dark .status-partial { background: rgba(59, 130, 246, 0.2); }
.dark .status-received { background: rgba(34, 197, 94, 0.2); }
.transaction-income { color: #16a34a; }
.transaction-expense { color: #ea580c; }
.transaction-writeoff { color: #dc2626; }
.mode-toggle { display: inline-flex; background: rgba(0,0,0,0.05); border-radius: 12px; padding: 4px; }
.dark .mode-toggle { background: rgba(255,255,255,0.1); }
.mode-btn { padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 500; transition: all 0.2s; border: none; background: transparent; cursor: pointer; color: #6b7280; }
.dark .mode-btn { color: #9ca3af; }
.mode-btn.active { background: white; color: #4f46e5; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.dark .mode-btn.active { background: #1f2937; color: #818cf8; }
.mode-btn:hover:not(.active) { color: #374151; }
.dark .mode-btn:hover:not(.active) { color: #f3f4f6; }
/* Табличные стили */
.warehouse-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.warehouse-table th { background: #f9fafb; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; }
.dark .warehouse-table th { background: #1f2937; }
.warehouse-table th, .warehouse-table td { padding: 0.875rem 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
.dark .warehouse-table th, .dark .warehouse-table td { border-bottom-color: #374151; }
.warehouse-table tbody tr:hover { background: #f9fafb; }
.dark .warehouse-table tbody tr:hover { background: #1f2937; }
.warehouse-table tbody tr:last-child td { border-bottom: none; }
.table-action-btn { padding: 0.375rem 0.75rem; font-size: 0.75rem; border-radius: 0.375rem; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.25rem; }
`;

// === Утилиты ===
const formatNumber = (num) => new Intl.NumberFormat('ru-RU').format(num || 0);
const formatDate = (dateStr, lang) => {
if (!dateStr) return '—';
return new Date(dateStr).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
day: '2-digit',
month: '2-digit',
year: 'numeric',
hour: '2-digit',
minute: '2-digit'
});
};

// === Подкомпоненты ===
const SectionHeader = memo(({ title, actions, subtitle, icon: Icon }) => (
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
<div className="flex items-center gap-3">
<div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/20">
{Icon && <Icon className="w-5 h-5 text-white" aria-hidden="true" />}
</div>
<div>
<h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
{subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
</div>
</div>
{actions && <div className="flex gap-2">{actions}</div>}
</div>
));
SectionHeader.displayName = 'SectionHeader';

const StatCard = memo(({ label, value, color, onClick, tooltip, icon: Icon }) => (
<button
onClick={onClick}
className="stat-card bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 hover:border-indigo-300/60 dark:hover:border-indigo-600/60 text-left w-full"
title={tooltip}
>
<div className="flex items-center justify-between mb-2">
<span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
{Icon && <Icon className={`w-5 h-5 ${color} opacity-60`} aria-hidden="true" />}
</div>
<div className={`text-2xl font-bold ${color}`}>{formatNumber(value)}</div>
<div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
{tooltip || 'Нажмите для деталей'}
</div>
</button>
));
StatCard.displayName = 'StatCard';

// ✅ НОВЫЙ КОМПОНЕНТ: Таблица материалов
const WarehouseTable = memo(({
items,
onAdjust,
onTransfer,
onViewHistory,
onEditUnit,
isLoading,
userRole,
t,
// eslint-disable-next-line no-unused-vars
language,
isFromApplications = false,
}) => {
if (!items || items.length === 0) {
return (
<div className="text-center py-12 bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/60 dark:border-gray-700/60">
{isFromApplications ? <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" /> : <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />}
<p className="text-gray-500 dark:text-gray-400">
{t(isFromApplications ? 'noMaterialsFromApplications' : 'noItems')}
</p>
</div>
);
}

return (
<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
<div className="overflow-x-auto">
<table className="warehouse-table">
<thead className="sticky top-0 z-10">
<tr>
<th className="w-8"></th>
<th className="min-w-[250px]">{t('name') || 'Наименование'}</th>
<th className="w-24 text-center">{t('unit') || 'Ед.'}</th>
<th className="w-32 text-center">{t('balance') || 'Остаток'}</th>
<th className="w-32 text-center">{t('income') || 'Приход'}</th>
{isFromApplications && <th className="w-32 text-center">{t('requested') || 'Запрошено'}</th>}
<th className="w-32 text-center">{t('status') || 'Статус'}</th>
<th className="w-40 text-right">{t('actions') || 'Действия'}</th>
</tr>
</thead>
<tbody>
{items.map((item, index) => {
const balance = Number(item.balance) || 0;
const requested = Number(item.requested) || 0;
const isLow = balance < LOW_STOCK_THRESHOLD;
const isMedium = balance < MEDIUM_STOCK_THRESHOLD && !isLow;

const getStatusConfig = () => {
if (isFromApplications) {
const confirmed = Number(item.confirmed || item.received) || 0;
if (confirmed >= requested && requested > 0) {
return { label: t('received') || 'Принято', class: 'status-received', icon: CheckCircle2 };
}
if (confirmed > 0 && confirmed < requested) {
return { label: t('partial') || 'Частично', class: 'status-partial', icon: Package };
}
return { label: t('pending') || 'Ожидает', class: 'status-pending', icon: AlertCircle };
}
return isLow
? { label: t('lowStock') || 'Мало', class: 'status-low', icon: AlertCircle }
: isMedium
? { label: t('mediumStock') || 'Средне', class: 'status-medium', icon: Info }
: { label: t('inStock') || 'В наличии', class: 'status-ok', icon: CheckCircle2 };
};

const statusConfig = getStatusConfig();
const itemLoading = isLoading?.adjust === item.id || isLoading?.transfer === item.id;

return (
<tr key={item.id || index} className="group">
<td className="text-center">
{isFromApplications ? <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <Package className="w-4 h-4 text-gray-400" />}
</td>
<td>
<div className="flex items-center gap-2">
<button
onClick={() => !isFromApplications && onViewHistory?.(item)}
disabled={itemLoading || isFromApplications}
className={`font-semibold text-gray-900 dark:text-white text-left hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-50`}
title={item.name}
>
{item.name || '—'}
</button>
{isFromApplications && item.object_name && (
<span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
<MapPin className="w-3 h-3" />
{item.object_name}
</span>
)}
</div>
</td>
<td className="text-center text-sm text-gray-600 dark:text-gray-300">
{!isFromApplications && (
<button
onClick={() => onEditUnit?.(item)}
className="hover:text-indigo-600 dark:hover:text-indigo-400"
title={t('editUnit')}
>
{item.unit || 'шт'}
</button>
)}
{isFromApplications && (item.unit || 'шт')}
</td>
<td className="text-center">
<span className={`font-bold text-lg ${
isFromApplications 
? (balance >= requested ? 'text-green-600' : balance > 0 ? 'text-blue-600' : 'text-gray-600')
: (isLow ? 'text-red-600' : isMedium ? 'text-yellow-600' : 'text-green-600')
}`}>
{formatNumber(balance)}
</span>
</td>
<td className="text-center text-blue-600 font-medium">
{formatNumber(item.totalIncome || 0)}
</td>
{isFromApplications && (
<td className="text-center text-sm text-gray-600 dark:text-gray-300">
{formatNumber(requested)}
</td>
)}
<td className="text-center">
<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.class}`}>
<statusConfig.icon className="w-3 h-3" />
{statusConfig.label}
</span>
</td>
<td className="text-right">
<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
{!isFromApplications && onAdjust && (
<button
onClick={() => onAdjust(item)}
disabled={itemLoading}
className="table-action-btn text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
title={t('adjustBalance')}
>
<Edit2 className="w-3.5 h-3.5" />
{t('adjust') || 'Корр.'}
</button>
)}
{balance > 0 && (userRole === 'manager' || userRole === 'supply_admin') && (
<button
onClick={() => onTransfer?.(item)}
disabled={itemLoading}
className="table-action-btn text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
title={t('transfer')}
>
<Truck className="w-3.5 h-3.5" />
{t('transfer') || 'Выдать'}
</button>
)}
{!isFromApplications && onViewHistory && (
<button
onClick={() => onViewHistory(item)}
disabled={itemLoading}
className="table-action-btn text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
title={t('history')}
>
<History className="w-3.5 h-3.5" />
</button>
)}
</div>
</td>
</tr>
);
})}
</tbody>
</table>
</div>
</div>
);
});
WarehouseTable.displayName = 'WarehouseTable';

const TransactionRow = memo(({
trans,
// eslint-disable-next-line no-unused-vars
t,
language
}) => {
const isIncome = trans.transaction_type === 'income';
const typeConfig = isIncome
? { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', sign: '+', icon: ArrowDownLeft }
: trans.transaction_type === 'expense'
? { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', sign: '-', icon: ArrowUpRight }
: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', sign: '-', icon: XCircle };

return (
<tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
<td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{formatDate(trans.created_at, language)}</td>
<td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-[150px] truncate">{trans.item_name || '—'}</td>
<td className="px-4 py-3 text-sm">
<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.text}`}>
<typeConfig.icon className="w-3 h-3" aria-hidden="true" />
{TRANSACTION_TYPE_LABELS[trans.transaction_type] || trans.transaction_type}
</span>
</td>
<td className={`px-4 py-3 text-sm font-bold ${isIncome ? 'transaction-income' : 'transaction-expense'}`}>
{typeConfig.sign}{formatNumber(Number(trans.quantity) || 0)}
</td>
<td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
{(trans.transaction_type === 'expense' || trans.transaction_type === 'write_off')
? trans.target_object_name
: trans.applications?.object_name || '—'}
</td>
<td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 max-w-[100px] truncate">
{(trans.transaction_type === 'expense' || trans.transaction_type === 'write_off')
? trans.recipient_name
: trans.user_email?.split('@')[0] || '—'}
</td>
<td className="px-4 py-3 text-sm text-gray-500">{trans.recipient_phone || '—'}</td>
<td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[150px] truncate" title={trans.comment}>
{trans.comment || '—'}
</td>
</tr>
);
});
TransactionRow.displayName = 'TransactionRow';

const ItemDetailsModal = memo(({ isOpen, onClose, item, history, isLoading, t, language, userRole, onTransfer }) => {
if (!isOpen || !item) return null;
const balance = Number(item.balance) || 0;
const isLow = balance < LOW_STOCK_THRESHOLD;

return (
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 modal-enter" role="dialog" aria-modal="true">
<div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
<div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/60 dark:border-gray-700/60">
<div className="flex items-center gap-3">
<div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl">
<Package className="w-5 h-5 text-white" aria-hidden="true" />
</div>
<h3 className="text-lg font-bold text-gray-900 dark:text-white">{item.name || '—'}</h3>
</div>
<button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors" aria-label={t('close')}>
<XCircle className="w-5 h-5" aria-hidden="true" />
</button>
</div>
<div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
<div className="grid grid-cols-2 gap-4">
{[
{ label: t('warehouseUnit') || 'Ед. изм.', value: item.unit || 'шт', icon: Info },
{ label: t('warehouseBalance') || 'Остаток', value: formatNumber(balance), color: isLow ? 'text-red-600' : 'text-green-600', icon: Package },
{ label: t('warehouseIncome') || 'Приход', value: formatNumber(item.totalIncome || 0), color: 'text-blue-600', icon: TrendingUp },
{ label: t('warehouseUpdated') || 'Обновлено', value: formatDate(item.last_updated, language), icon: Calendar }
].map((stat, idx) => (
<div key={idx} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl">
<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
<stat.icon className="w-3.5 h-3.5" aria-hidden="true" />
{stat.label}
</div>
<div className={`text-lg font-semibold ${stat.color || 'text-gray-900 dark:text-white'}`}>{stat.value}</div>
</div>
))}
</div>
<div>
<h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
<History className="w-4 h-4" aria-hidden="true" />
{t('transactionHistory') || 'История движений'}
</h4>
{isLoading ? (
<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
) : history?.length > 0 ? (
<div className="overflow-x-auto -mx-4 sm:mx-0">
<table className="min-w-full text-sm">
<thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
<tr>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('date')}</th>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('type')}</th>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('quantity')}</th>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('comment')}</th>
</tr>
</thead>
<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
{history.map((tx, idx) => {
const isInc = tx.transaction_type === 'income';
return (
<tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
<td className="px-4 py-2 text-gray-500">{formatDate(tx.created_at, language)}</td>
<td className="px-4 py-2">
<span className={`px-2 py-1 rounded-full text-xs font-medium ${
isInc ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
tx.transaction_type === 'expense' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
}`}>
{TRANSACTION_TYPE_LABELS[tx.transaction_type] || tx.transaction_type}
</span>
</td>
<td className={`px-4 py-2 font-medium ${isInc ? 'text-green-600' : 'text-red-600'}`}>
{isInc ? '+' : '-'}{formatNumber(Number(tx.quantity) || 0)}
</td>
<td className="px-4 py-2 text-gray-600 dark:text-gray-400 truncate max-w-[150px]" title={tx.comment}>{tx.comment || '—'}</td>
</tr>
);
})}
</tbody>
</table>
</div>
) : (
<p className="text-gray-500 dark:text-gray-400 text-center py-6">{t('noTransactions') || 'Нет транзакций'}</p>
)}
</div>
</div>
<div className="p-4 sm:p-6 border-t border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-b-3xl flex justify-end gap-3">
<button onClick={onClose} className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium dark:text-gray-300 dark:hover:text-gray-100 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
{t('close')}
</button>
{(userRole === 'manager' || userRole === 'supply_admin') && balance > 0 && (
<button
onClick={() => { onClose(); onTransfer?.(item); }}
className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium flex items-center gap-2 transition-all shadow-lg shadow-green-500/25"
>
<Truck className="w-4 h-4" aria-hidden="true" />
{t('transfer') || 'Выдать'}
</button>
)}
</div>
</div>
</div>
);
});
ItemDetailsModal.displayName = 'ItemDetailsModal';

const TransferModal = memo(({ isOpen, onClose, item, employees, onCreate, isLoading, t }) => {
const [formData, setFormData] = useState({ recipientId: '', objectName: '', quantity: 1, comment: '' });

useEffect(() => {
if (isOpen) setFormData({ recipientId: '', objectName: '', quantity: 1, comment: '' });
}, [isOpen]);

if (!isOpen || !item) return null;
const balance = Number(item.balance) || 0;

const handleSubmit = async (e) => {
e.preventDefault();
await onCreate(item, formData.recipientId, formData.objectName, formData.quantity, formData.comment);
};

return (
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 modal-enter" role="dialog" aria-modal="true">
<div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full border border-gray-200/50 dark:border-gray-700/50">
<div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/60 dark:border-gray-700/60">
<div className="flex items-center gap-3">
<div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
<Truck className="w-5 h-5 text-white" aria-hidden="true" />
</div>
<h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('transferTo') || 'Выдача'}</h3>
</div>
<button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors" aria-label={t('close')}>
<XCircle className="w-5 h-5" aria-hidden="true" />
</button>
</div>
<form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
<div className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-indigo-900/20 dark:to-blue-900/20 p-4 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50">
<p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">{t('material')}</p>
<p className="font-semibold text-gray-900 dark:text-white">{item.name || '—'}</p>
<p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
{t('available')}: <span className={`font-bold ${balance < LOW_STOCK_THRESHOLD ? 'text-red-600' : 'text-green-600'}`}>{formatNumber(balance)} {item.unit || t('unit')}</span>
</p>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employee')} *</label>
<select
value={formData.recipientId}
  onChange={(e) => setFormData(prev => ({ ...prev, recipientId: e.target.value }))}
  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl"
  required
  disabled={isLoading}
>
  <option value="">{t('selectEmployee')}</option>
  {employees?.map(emp => (
    <option key={emp.id} value={emp.id}>
      {emp.full_name} {emp.phone && `(${emp.phone})`} - {emp.role === 'master' ? 'Мастер' : 'Прораб'}
    </option>
  ))}
</select>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('destination')} *</label>
<input
type="text"
value={formData.objectName}
onChange={(e) => setFormData(prev => ({ ...prev, objectName: e.target.value }))}
className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
placeholder={t('objectPlaceholder')}
required
disabled={isLoading}
/>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quantity')} *</label>
<div className="flex items-center gap-2">
<button
type="button"
onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
disabled={isLoading || formData.quantity <= 1}
>
<Minus className="w-4 h-4" aria-hidden="true" />
</button>
<input
type="number"
value={formData.quantity}
onChange={(e) => setFormData(prev => ({ ...prev, quantity: Math.max(0, Math.min(Number(e.target.value) || 0, balance)) }))}
className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
min="1"
max={balance}
required
disabled={isLoading}
/>
<button
type="button"
onClick={() => setFormData(prev => ({ ...prev, quantity: Math.min(balance, prev.quantity + 1) }))}
className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
disabled={isLoading || formData.quantity >= balance}
>
<Plus className="w-4 h-4" aria-hidden="true" />
</button>
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('comment')}</label>
<textarea
value={formData.comment}
onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
rows="2"
disabled={isLoading}
/>
</div>
<div className="flex gap-3 pt-4">
<button
type="button"
onClick={onClose}
disabled={isLoading}
className="flex-1 px-4 py-2.5 text-gray-700 hover:text-gray-900 font-medium dark:text-gray-300 dark:hover:text-gray-100 disabled:opacity-50 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
>
{t('cancel')}
</button>
<button
type="submit"
disabled={isLoading}
className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-green-500/25"
>
{isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
{t('confirmTransfer')}
</button>
</div>
</form>
</div>
</div>
);
});
TransferModal.displayName = 'TransferModal';

const StatsDetailsModal = memo(({ isOpen, onClose, type, data, isLoading, t, language }) => {
if (!isOpen) return null;
const titles = {
totalItems: t('allItems') || 'Все позиции',
income: t('incomeHistory') || 'История приходов',
lowStock: t('lowStockItems') || 'Заканчивается',
totalBalance: t('totalBalance') || 'Общий остаток'
};

return (
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 modal-enter" role="dialog" aria-modal="true">
<div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
<div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200/60 dark:border-gray-700/60">
<h3 className="text-lg font-bold text-gray-900 dark:text-white">{titles[type] || 'Детали'}</h3>
<button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors" aria-label={t('close')}>
<XCircle className="w-5 h-5" aria-hidden="true" />
</button>
</div>
<div className="flex-1 overflow-y-auto p-4 sm:p-6">
{isLoading ? (
<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
) : data?.length === 0 ? (
<p className="text-gray-500 dark:text-gray-400 text-center py-12">{t('noData')}</p>
) : type === 'income' ? (
<div className="overflow-x-auto -mx-4 sm:mx-0">
<table className="min-w-full text-sm">
<thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
<tr>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('date')}</th>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('item')}</th>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('quantity')}</th>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('comment')}</th>
</tr>
</thead>
<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
{data.map((tx, idx) => (
<tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
<td className="px-4 py-2 text-gray-500">{formatDate(tx.created_at, language)}</td>
<td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{tx.item_name || '—'}</td>
<td className="px-4 py-2 text-green-600 font-bold">+{formatNumber(Number(tx.quantity) || 0)}</td>
<td className="px-4 py-2 text-gray-600 dark:text-gray-400 truncate max-w-[200px]" title={tx.comment}>{tx.comment || '—'}</td>
</tr>
))}
</tbody>
</table>
</div>
) : (
<div className="overflow-x-auto -mx-4 sm:mx-0">
<table className="min-w-full text-sm">
<thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
<tr>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('name')}</th>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('unit')}</th>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('balance')}</th>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('income')}</th>
<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{t('status')}</th>
</tr>
</thead>
<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
{data.map((item, idx) => {
const bal = Number(item.balance) || 0;
const requested = Number(item.requested) || 0;
const isLow = item.isFromApplications 
? (requested > 0 && bal < requested)
: bal < LOW_STOCK_THRESHOLD;
const isMed = item.isFromApplications
? (requested > 0 && bal >= requested)
: bal < MEDIUM_STOCK_THRESHOLD && !isLow;
return (
<tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
<td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{item.name || '—'}</td>
<td className="px-4 py-2 text-gray-700 dark:text-gray-300">{item.unit || 'шт'}</td>
<td className={`px-4 py-2 font-bold ${isLow ? 'text-red-600' : isMed ? 'text-yellow-600' : 'text-green-600'}`}>{formatNumber(bal)}</td>
<td className="px-4 py-2 text-blue-600">{formatNumber(item.totalIncome || 0)}</td>
<td className="px-4 py-2">
<span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
isLow ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
isMed ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
}`}>
{isLow ? t('low') : isMed ? t('medium') : t('ok')}
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
<div className="p-4 sm:p-6 border-t border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-b-3xl flex justify-end">
<button onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
{t('close')}
</button>
</div>
</div>
</div>
);
});
StatsDetailsModal.displayName = 'StatsDetailsModal';

// === Основной компонент ===
const WarehouseView = ({
  supabase,
  userCompanyId,
  user,
  userRole,
  profileData = null, 
  t,
  language,
  showNotification,
  applications = [],  // ← ДОБАВИТЬ ЗАПЯТУЮ
  // ✅ НОВЫЕ ПРОПСЫ:
  autoReorderEnabled = true,
  onToggleAutoReorder
}) => {
const [warehouseItems, setWarehouseItems] = useState([]);
const [transactions, setTransactions] = useState([]);
const [showAllMaterials, setShowAllMaterials] = useState(false);
const [isLoading, setIsLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');
const [filterType, setFilterType] = useState('all');
const [showTransactions, setShowTransactions] = useState(false);
const [viewMode, setViewMode] = useState('warehouse');
const [transferModal, setTransferModal] = useState({ isOpen: false, item: null });
const [itemDetailsModal, setItemDetailsModal] = useState({ isOpen: false, item: null });
const [itemHistory, setItemHistory] = useState([]);
const [employees, setEmployees] = useState([]);
const [actionLoading, setActionLoading] = useState({ adjust: null, transfer: null, details: null });
const [statsModal, setStatsModal] = useState({ isOpen: false, type: null, data: [] });
const lastLoggedRef = useRef({});
const searchTimerRef = useRef(null);

useEffect(() => {
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
  return () => document.head.removeChild(styleEl);
}, []);

useEffect(() => {
  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  searchTimerRef.current = setTimeout(() => {
    setDebouncedSearch(searchTerm.toLowerCase().trim());
  }, SEARCH_DEBOUNCE_MS);
  return () => clearTimeout(searchTimerRef.current);
}, [searchTerm]);

const warehouseMaterials = useMemo(() => {
const materialsMap = new Map();

applications.forEach(app => {
app.materials?.forEach(m => {
const received = Number(m.supplier_received_quantity) || 0;
const confirmed = Number(m.received) || 0;
const requested = Number(m.quantity) || 0;

if (received <= 0) return;
if (!showAllMaterials && confirmed >= requested && requested > 0) return;

const key = `${(m.description || m.material_name || '').trim().toLowerCase()}__${(m.unit || 'шт').toLowerCase()}`;

if (materialsMap.has(key)) {
const existing = materialsMap.get(key);
materialsMap.set(key, {
...existing,
balance: existing.balance + received,
totalIncome: existing.totalIncome + received,
requested: existing.requested + requested,
confirmed: (existing.confirmed || 0) + confirmed,
received_at: m.supplier_received_at || existing.received_at,
applications: [...(existing.applications || []), { 
id: app.id, 
object_name: app.object_name,
foreman_name: app.foreman_name
}]
});
} else {
materialsMap.set(key, {
...m,
id: `app_${app.id}_mat_${m.id || m.name || Math.random().toString(36).substr(2, 9)}`,
application_id: app.id,
object_name: app.object_name,
foreman_name: app.foreman_name,
received_at: m.supplier_received_at,
name: m.description || m.material_name,
balance: received,
unit: m.unit || 'шт',
totalIncome: received,
requested: requested,
confirmed: confirmed,
status: m.status || 'pending',
applications: [{ 
id: app.id, 
object_name: app.object_name,
foreman_name: app.foreman_name
}]
});
}
});
});

return Array.from(materialsMap.values());
}, [applications, showAllMaterials]);

const loadWarehouseData = useCallback(async () => {
if (!userCompanyId) {
console.error('❌ [WAREHOUSE] userCompanyId отсутствует!');
return;
}
setIsLoading(true);
try {
const { data: items, error: itemsError } = await supabase
.from('warehouse_balance')
.select('id, company_id, item_name, quantity, unit, last_updated')
.eq('company_id', userCompanyId)
.order('item_name', { ascending: true });
if (itemsError) throw itemsError;

const { data: trans, error: transError } = await supabase
.from('warehouse_transactions')
.select('*, applications ( object_name )')
.eq('company_id', userCompanyId)
.order('created_at', { ascending: false });
if (transError) console.warn('⚠️ Ошибка транзакций:', transError);

const incomeMap = {};
(trans || []).forEach(tx => {
if (tx.transaction_type === 'income' && tx.item_name) {
const name = tx.item_name.trim();
incomeMap[name] = (incomeMap[name] || 0) + (Number(tx.quantity) || 0);
}
});

const itemsWithIncome = (items || []).map(item => ({
...item,
name: item.item_name,
balance: Number(item.quantity) || 0,
totalIncome: incomeMap[item.item_name?.trim()] || 0
}));

setWarehouseItems(itemsWithIncome);
setTransactions(trans || []);

if (userRole === 'manager' || userRole === 'supply_admin') {
const { data: staff } = await supabase
  .from('company_users')
  .select('id, full_name, phone, role')
  .eq('company_id', userCompanyId)
  .eq('is_active', true)
  .in('role', ['master', 'foreman']);  // ✅ МАСТЕРА И ПРОРАБЫ
setEmployees(staff || []);
}
} catch (error) {
console.error('❌ [WAREHOUSE] Критическая ошибка:', error);
showNotification(t('loadError') || 'Ошибка загрузки', 'error');
} finally {
setIsLoading(false);
}
}, [userCompanyId, userRole, supabase, t, showNotification]);

useEffect(() => {
  if (userCompanyId && user?.id) {
    const userCtx = getUserContext(user, null, userRole, userCompanyId);
    
    if (shouldLogFeature('warehouse', userCompanyId, lastLoggedRef.current)) {
      logWarehouseAccess(supabase, userCtx, 'view');
    }
  }
}, [userCompanyId, user, userRole, profileData, supabase]); 

useEffect(() => {
loadWarehouseData();
}, [loadWarehouseData]);

const displayItems = useMemo(() => {
const baseItems = viewMode === 'warehouse' ? warehouseItems : warehouseMaterials;
if (!debouncedSearch) return baseItems;
return baseItems.filter(item => item.name?.toLowerCase().includes(debouncedSearch));
}, [viewMode, warehouseItems, warehouseMaterials, debouncedSearch]);

const filteredTransactions = useMemo(() => {
return (transactions || []).filter(tx => {
const matchesType = filterType === 'all' || tx.transaction_type === filterType;
const matchesSearch = !debouncedSearch || tx.item_name?.toLowerCase().includes(debouncedSearch);
return matchesType && matchesSearch;
});
}, [transactions, filterType, debouncedSearch]);

const stats = useMemo(() => {
const sum = (arr, key) => arr.reduce((s, i) => s + (Number(i[key]) || 0), 0);
const source = viewMode === 'warehouse' ? warehouseItems : warehouseMaterials;
return {
totalItems: source.length,
lowStock: source.filter(i => (i.balance || 0) < LOW_STOCK_THRESHOLD).length,
totalValue: sum(source, 'balance'),
totalIncome: sum(source, 'totalIncome')
};
}, [viewMode, warehouseItems, warehouseMaterials]);

const loadStatsDetails = useCallback(async (type) => {
setActionLoading(prev => ({ ...prev, details: type }));
try {
let data = viewMode === 'warehouse' ? warehouseItems : warehouseMaterials;
if (type === 'lowStock') data = data.filter(i => (i.balance || 0) < LOW_STOCK_THRESHOLD);
if (type === 'income') {
const { data: income } = await supabase
.from('warehouse_transactions')
.select('*')
.eq('company_id', userCompanyId)
.eq('transaction_type', 'income')
.order('created_at', { ascending: false })
.limit(500);
data = income || [];
}
setStatsModal({ isOpen: true, type, data });
} catch (err) {
console.error('Stats load error:', err);
showNotification('Ошибка', 'error');
} finally {
setActionLoading(prev => ({ ...prev, details: null }));
}
}, [userCompanyId, supabase, warehouseItems, warehouseMaterials, viewMode, showNotification]);

const exportToExcel = useCallback(() => {
const dataToExport = viewMode === 'warehouse' ? warehouseItems : warehouseMaterials;
if (!dataToExport.length) return showNotification(t('noData'), 'warning');
const ws = XLSX.utils.json_to_sheet(dataToExport.map(i => ({
[t('name')]: i.name,
[t('unit')]: i.unit,
[t('income')]: i.totalIncome,
[t('balance')]: i.balance,
[t('updated')]: formatDate(viewMode === 'warehouse' ? i.last_updated : i.received_at, language),
...(viewMode === 'fromApplications' && {
[t('application')]: i.object_name,
[t('foreman')]: i.foreman_name,
[t('requested')]: i.requested
})
})));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, viewMode === 'warehouse' ? t('warehouse') : t('fromApplications'));
XLSX.writeFile(wb, `Warehouse_${viewMode}_${new Date().toISOString().split('T')[0]}.xlsx`);
showNotification(t('exported'), 'success');
}, [viewMode, warehouseItems, warehouseMaterials, t, language, showNotification]);

const adjustBalance = useCallback(async (item) => {
const qty = window.prompt(`${t('enterQty')}:`, '1');
if (!qty || isNaN(qty) || Number(qty) <= 0) return;
setActionLoading(prev => ({ ...prev, adjust: item.id }));
try {
const type = Number(qty) > 0 ? 'income' : 'write_off';
await supabase.rpc('update_warehouse_balance', {
p_company_id: userCompanyId,
p_item_name: item.name,
p_quantity: Math.abs(Number(qty)),
p_transaction_type: type,
p_user_id: user?.id,
p_user_email: user?.email,
p_comment: t('manualAdjust'),
p_unit: item.unit
});
showNotification(t('updated'), 'success');
await loadWarehouseData();
} catch (err) {
console.error('Adjust error:', err);
showNotification(t('error'), 'error');
} finally {
setActionLoading(prev => ({ ...prev, adjust: null }));
}
}, [userCompanyId, user, supabase, t, showNotification, loadWarehouseData]);

const createTransfer = useCallback(async (item, recipientId, objectName, quantity, comment) => {
  setActionLoading(prev => ({ ...prev, transfer: item.id }));
  try {
    // Находим получателя
    const recipient = employees.find(e => e.id === recipientId);
    if (!recipient) throw new Error('Сотрудник не найден');
    
    // ✅ 1. Проверяем остаток
    if (Number(item.balance) < Number(quantity)) {
      showNotification('Недостаточно материала на складе', 'error');
      throw new Error('Недостаточно материала');
    }
    
    // ✅ 2. Списание со склада через update_warehouse_balance (одна операция)
    const { error: rpcError } = await supabase.rpc('update_warehouse_balance', {
      p_company_id: userCompanyId,
      p_item_name: item.name,
      p_quantity: Number(quantity),
      p_transaction_type: 'expense',
      p_user_id: user?.id,
      p_user_email: user?.email,
      p_comment: comment || `Выдача: ${objectName}`,
      p_unit: item.unit || 'шт',
      p_target_object_name: objectName,
      p_recipient_name: recipient.full_name,
      p_recipient_phone: recipient.phone || null
    });
    
    if (rpcError) throw rpcError;
    
    // ✅ 3. Логируем выдачу в отдельную таблицу (опционально)
    await supabase
      .from('material_issues')
      .insert([{
        company_id: userCompanyId,
        material_name: item.name,
        quantity: Number(quantity),
        unit: item.unit || 'шт',
        employee_id: recipientId,
        employee_name: recipient.full_name,
        target_object: objectName,
        issued_by: user?.id,
        issued_by_name: profileData?.full_name || user?.email,
        issued_at: new Date().toISOString()
      }]);
    
    showNotification(t('transferred') || `✅ Выдано ${quantity} ${item.unit} сотруднику ${recipient.full_name}`, 'success');
    await loadWarehouseData();
    setTransferModal({ isOpen: false, item: null });
  } catch (err) {
    console.error('Transfer error:', err);
    showNotification(err.message || t('transferError'), 'error');
    throw err;
  } finally {
    setActionLoading(prev => ({ ...prev, transfer: null }));
  }
}, [userCompanyId, user, profileData, supabase, t, showNotification, loadWarehouseData, employees]);

const loadItemHistory = useCallback(async (item) => {
setActionLoading(prev => ({ ...prev, details: item.id }));
try {
const { data } = await supabase
.from('warehouse_transactions')
.select('*')
.eq('item_name', item.name)
.eq('company_id', userCompanyId)
.order('created_at', { ascending: false })
.limit(50);
setItemHistory(data || []);
setItemDetailsModal({ isOpen: true, item });
} catch (err) {
console.error('Ошибка загрузки истории:', err);
showNotification('Ошибка', 'error');
} finally {
setActionLoading(prev => ({ ...prev, details: null }));
}
}, [userCompanyId, supabase, showNotification]);

const editUnit = useCallback(async (item) => {
const newUnit = window.prompt(`${t('newUnit')}:`, item.unit || 'шт');
if (!newUnit?.trim()) return;
try {
await supabase.from('warehouse_items').update({ unit: newUnit.trim() }).eq('id', item.id);
showNotification(t('unitUpdated'), 'success');
await loadWarehouseData();
} catch {
showNotification(t('error'), 'error');
}
}, [supabase, t, showNotification, loadWarehouseData]);

useEffect(() => {
const handler = (e) => {
if (e.key === 'Escape') {
setTransferModal({ isOpen: false, item: null });
setItemDetailsModal({ isOpen: false, item: null });
setStatsModal({ isOpen: false, type: null, data: [] });
}
};
document.addEventListener('keydown', handler);
return () => document.removeEventListener('keydown', handler);
}, []);

if (isLoading) {
return (
<div className="max-w-7xl mx-auto p-4 space-y-6">
<div className="animate-pulse space-y-4">
<div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>)}
</div>
<div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
</div>
</div>
);
}

return (
<div className="max-w-7xl mx-auto p-4 space-y-6">
<SectionHeader
title={t('warehouse') || 'Склад'}
icon={Package}
subtitle={viewMode === 'warehouse' ? t('warehouseSubtitle') : (t('materialsFromApplications') || 'Материалы из заявок')}
actions={
<>
<div className="mode-toggle">
<button
onClick={() => setViewMode('warehouse')}
className={`mode-btn ${viewMode === 'warehouse' ? 'active' : ''}`}
>
<Package className="w-4 h-4 inline mr-1" aria-hidden="true" />
{t('warehouse') || 'Склад'}
</button>
<button
onClick={() => setViewMode('fromApplications')}
className={`mode-btn ${viewMode === 'fromApplications' ? 'active' : ''}`}
>
<FileText className="w-4 h-4 inline mr-1" aria-hidden="true" />
{t('fromApplications') || 'Из заявок'} ({warehouseMaterials.length})
</button>
</div>

{viewMode === 'fromApplications' && (
<button
onClick={() => setShowAllMaterials(!showAllMaterials)}
className={`px-4 py-2 rounded-xl border text-sm font-medium flex items-center gap-2 transition-colors ${
showAllMaterials
? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
: 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
}`}
title={showAllMaterials ? 'Показывать только принятые' : 'Показывать все материалы'}
>
{showAllMaterials ? (
<>
<Eye className="w-4 h-4" aria-hidden="true" />
{t('showAll') || 'Все материалы'}
</>
) : (
<>
<CheckCircle className="w-4 h-4" aria-hidden="true" />
{t('showReceived') || 'Только принятые'}
</>
)}
</button>
)}

<button
onClick={() => setShowTransactions(!showTransactions)}
className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-medium flex items-center gap-2 transition-colors"
>
<Filter className="w-4 h-4" aria-hidden="true" />
{showTransactions ? t('balances') : t('transactions')}
</button>
<button
onClick={exportToExcel}
disabled={!displayItems.length}
className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-green-500/25"
>
<Download className="w-4 h-4" aria-hidden="true" /> Excel
</button>
</>
}
/>

{/* Toggle Auto-Reorder */}
{(userRole === 'manager' || userRole === 'supply_admin') && (
  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200/60 dark:border-gray-700/60 mb-4">
    <div className="flex items-center gap-2">
      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {t('autoReorder') || 'Автозаказ при минимуме'}
      </span>
    </div>
    <button
      onClick={onToggleAutoReorder}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        autoReorderEnabled ? 'bg-[#4A6572]' : 'bg-gray-300 dark:bg-gray-600'
      }`}
      role="switch"
      aria-checked={autoReorderEnabled}
      aria-label={t('toggleAutoReorder') || 'Переключить автозаказ'}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        autoReorderEnabled ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  </div>
)}

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
<StatCard label={t('totalItems')} value={stats.totalItems} icon={Package} color="text-gray-900 dark:text-white" onClick={() => loadStatsDetails('totalItems')} />
<StatCard label={t('totalIncome')} value={stats.totalIncome} icon={TrendingUp} color="text-blue-600" onClick={() => loadStatsDetails('income')} />
<StatCard label={t('lowStock')} value={stats.lowStock} icon={AlertCircle} color="text-red-600" onClick={() => loadStatsDetails('lowStock')} />
<StatCard label={t('totalBalance')} value={stats.totalValue} icon={Package} color="text-green-600" onClick={() => loadStatsDetails('totalBalance')} />
</div>

<div className="relative">
<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
<input
type="text"
placeholder={viewMode === 'warehouse' ? (t('searchPlaceholder') || 'Поиск по складу...') : (t('searchApplications') || 'Поиск в заявках...')}
value={searchTerm}
onChange={(e) => setSearchTerm(e.target.value)}
className="w-full pl-11 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
aria-label={t('search')}
/>
{searchTerm && (
<button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label={t('clear')}>
<XCircle className="w-4 h-4" aria-hidden="true" />
</button>
)}
</div>

{!showTransactions ? (
<WarehouseTable
items={displayItems}
onAdjust={viewMode === 'warehouse' ? adjustBalance : undefined}
onTransfer={(item) => setTransferModal({ isOpen: true, item })}
onViewHistory={viewMode === 'warehouse' ? loadItemHistory : undefined}
onEditUnit={viewMode === 'warehouse' ? editUnit : undefined}
isLoading={actionLoading}
userRole={userRole}
t={t}
language={language}
isFromApplications={viewMode === 'fromApplications'}
/>
) : (
<div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
  <div className="p-4 border-b border-gray-200/60 dark:border-gray-700/60 flex flex-wrap gap-3">
    <select
      value={filterType}
      onChange={(e) => setFilterType(e.target.value)}
      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500"
    >
      <option value="all">{t('all') || 'Все'}</option>
      <option value="income">{t('income') || 'Приход'}</option>
      <option value="expense">{t('expense') || 'Расход'}</option>
      <option value="write_off">{t('writeOff') || 'Списание'}</option>
    </select>
  </div>
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('date') || 'Дата'}</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('item') || 'Товар'}</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('type') || 'Тип'}</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('quantity') || 'Кол-во'}</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('destination') || 'Объект'}</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('recipient') || 'Получатель'}</th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('comment') || 'Комментарий'}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
        {filteredTransactions.length === 0 ? (
          <tr>
            <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              {t('noTransactions') || 'Нет транзакций'}
            </td>
          </tr>
        ) : (
          filteredTransactions.map(tx => <TransactionRow key={tx.id} trans={tx} t={t} language={language} />)
        )}
      </tbody>
    </table>
  </div>
</div>
)}

<TransferModal
isOpen={transferModal.isOpen}
onClose={() => setTransferModal({ isOpen: false, item: null })}
item={transferModal.item}
employees={employees}
onCreate={createTransfer}
isLoading={!!actionLoading.transfer}
t={t}
language={language}
/>

<ItemDetailsModal
isOpen={itemDetailsModal.isOpen}
onClose={() => setItemDetailsModal({ isOpen: false, item: null })}
item={itemDetailsModal.item}
history={itemHistory}
isLoading={actionLoading.details === itemDetailsModal.item?.id}
t={t}
language={language}
userRole={userRole}
onTransfer={(i) => setTransferModal({ isOpen: true, item: i })}
/>

<StatsDetailsModal
isOpen={statsModal.isOpen}
onClose={() => setStatsModal({ isOpen: false, type: null, data: [] })}
type={statsModal.type}
data={statsModal.data}
isLoading={actionLoading.details === statsModal.type}
t={t}
language={language}
/>
</div>
);
};

// ============================================
// 📦 КОМПОНЕНТ WAREHOUSE BALANCE (Остатки на складе)
// ============================================
export const WarehouseBalance = ({ 
  supabase,
  companyId, 
  onItemClick, 
  t,
  showNotification 
}) => {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  useEffect(() => {
    const loadBalances = async () => {
      if (!companyId) {
        console.warn('[WarehouseBalance] companyId отсутствует');
        return;
      }
      
      setLoading(true);
      try {
        let query = supabase
          .from('warehouse_balance')
          .select('*')
          .eq('company_id', companyId)
          .order('item_name', { ascending: true });
        
        const { data, error } = await query;
        
        if (error) throw error;
        setBalances(data || []);
      } catch (err) {
        console.error('[WarehouseBalance] Ошибка загрузки:', err);
        showNotification?.(t('loadError') || 'Ошибка загрузки остатков', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadBalances();
  }, [companyId, supabase, t, showNotification]);

  // Фильтрация
  const filteredBalances = useMemo(() => {
    let result = balances;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(b => 
        b.item_name?.toLowerCase().includes(term)
      );
    }
    
    if (filterLowStock) {
      result = result.filter(b => (b.quantity || 0) < 10);
    }
    
    return result;
  }, [balances, searchTerm, filterLowStock]);

  const lowStockCount = useMemo(() => 
    balances.filter(b => (b.quantity || 0) < 10).length,
  [balances]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Заголовок и фильтры */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchPlaceholder') || 'Поиск материалов...'}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        
        <button
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            filterLowStock
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
          } border`}
        >
          <AlertCircle className="w-4 h-4" />
          {t('lowStockOnly') || 'Только остатки'} ({lowStockCount})
        </button>
      </div>
      
      {/* Список остатков */}
      {filteredBalances.length === 0 ? (
        <div className="text-center py-12 bg-white/80 dark:bg-gray-800/80 rounded-2xl border border-gray-200/60 dark:border-gray-700/60">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || filterLowStock 
              ? t('noMatchingItems') || 'Ничего не найдено'
              : t('noItems') || 'Нет материалов на складе'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBalances.map((item) => {
            const quantity = Number(item.quantity) || 0;
            const isLowStock = quantity < 10;
            const isMediumStock = quantity >= 10 && quantity < 50;
            
            return (
              <div
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className={`warehouse-card bg-white dark:bg-gray-800 p-4 rounded-xl border cursor-pointer transition-all ${
                  isLowStock 
                    ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' 
                    : isMediumStock
                      ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 flex-1">
                    {item.item_name || '—'}
                  </h4>
                  {isLowStock && (
                    <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {t('low') || 'Мало'}
                    </span>
                  )}
                </div>
                
                <div className="flex items-baseline justify-between mt-2">
                  <div>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(quantity)}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">
                      {item.unit || 'шт'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {t('lastUpdated') || 'Обновлено'}: {formatDate(item.last_updated, 'ru')}
                  </div>
                </div>
                
                {/* Прогресс-бар для визуализации */}
                <div className="mt-3 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      isLowStock ? 'bg-red-500' : isMediumStock ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, (quantity / 100) * 100)}%` }}
                  />
                </div>
                
                {/* Кнопка действия */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onItemClick?.(item);
                  }}
                  className="mt-3 w-full py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                >
                  {t('details') || 'Подробнее'} →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================
// 📦 ЭКСПОРТ (ТОЛЬКО В КОНЦЕ ФАЙЛА!)
// ============================================
WarehouseView.displayName = 'WarehouseView';
export default memo(WarehouseView);