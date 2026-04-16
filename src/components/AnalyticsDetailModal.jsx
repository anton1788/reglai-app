// src/components/AnalyticsDetailModal.jsx
import React, { useMemo, useEffect, useRef, useCallback, memo, useState } from 'react';
import { 
  Download, X, FileSpreadsheet, FileCode, FileText, Loader2, 
  AlertCircle, CheckCircle, Package, BarChart3, Users, Calendar,
  ChevronDown, Search, TrendingUp, Clock, Target, Building
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar 
} from 'recharts';

// ─────────────────────────────────────────────────────────────
// 🧩 REUSABLE CARD COMPONENTS (Pattern: Consistent Layout)
// ─────────────────────────────────────────────────────────────

const SectionCard = memo(({ children, title, icon: Icon, className = "" }) => (
  <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200/50 dark:border-gray-700/50 shadow-sm ${className}`}>
    {title && (
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
        {Icon && <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
    )}
    {children}
  </div>
));
SectionCard.displayName = 'SectionCard';

const MetricCard = memo(({ label, value, subtext, icon: Icon, color = "indigo" }) => {
  const colorClasses = {
    indigo: "text-indigo-600 dark:text-indigo-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    slate: "text-slate-600 dark:text-slate-400"
  };
  
  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700/50 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        {Icon && <Icon className={`w-4 h-4 ${colorClasses[color]}`} aria-hidden="true" />}
        {subtext && <span className="text-xs text-gray-500 dark:text-gray-400">{subtext}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
    </div>
  );
});
MetricCard.displayName = 'MetricCard';

const ProgressBar = memo(({ value, max = 100, label, color = "indigo" }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colors = {
    indigo: "from-indigo-500 to-blue-500",
    emerald: "from-emerald-500 to-teal-500",
    amber: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-pink-500",
    blue: "from-blue-500 to-cyan-500" 
  };
  
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">{label}</span>
          <span className="font-medium text-gray-900 dark:text-white">{Math.round(pct)}%</span>
        </div>
      )}
      <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r ${colors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
});
ProgressBar.displayName = 'ProgressBar';

// ─────────────────────────────────────────────────────────────
// 📦 КОНСТАНТЫ
// ─────────────────────────────────────────────────────────────

const EXPORT_TYPES = [
  {
    id: 'pdf',
    labelKey: 'exportPDF',
    icon: FileText,
    action: 'exportAnalyticsSectionAsPDF',
    isDirect: true,
    color: 'from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
  },
  {
    id: 'html',
    labelKey: 'exportHTML',
    icon: FileCode,
    action: 'exportAnalyticsSectionData',
    args: ['html'],
    color: 'from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'
  },
  {
    id: 'xlsx',
    labelKey: 'exportExcel',
    icon: FileSpreadsheet,
    action: 'exportAnalyticsSectionData',
    args: ['xlsx'],
    color: 'from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
  },
  {
    id: 'csv',
    labelKey: 'exportCSV',
    icon: FileCode,
    action: 'exportAnalyticsSectionData',
    args: ['csv'],
    color: 'from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700'
  }
];

const CHART_COLORS = {
  light: {
    grid: '#e5e7eb',
    axis: '#6b7280',
    tooltip: { bg: '#ffffff', border: '#e5e7eb', text: '#1f2937' },
    bars: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']
  },
  dark: {
    grid: '#374151',
    axis: '#9ca3af',
    tooltip: { bg: '#1f2937', border: '#374151', text: '#f9fafb' },
    bars: ['#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe']
  }
};

const ANIMATION_DURATION = 200;
const CONFIRMATION_TIMEOUT = 3000;

// ─────────────────────────────────────────────────────────────
// 🎨 СТИЛИ И АНИМАЦИИ
// ─────────────────────────────────────────────────────────────

const styles = `
@keyframes slideIn { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.modal-enter { animation: slideIn ${ANIMATION_DURATION}ms ease-out forwards; }
.fade-enter { animation: fadeIn ${ANIMATION_DURATION}ms ease-out forwards; }
.pulse { animation: pulse 2s ease-in-out infinite; }
.shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.table-row-hover:hover { background: linear-gradient(90deg, rgba(99,102,241,0.08), transparent); }
.dark .table-row-hover:hover { background: linear-gradient(90deg, rgba(99,102,241,0.15), transparent); }
.export-btn-glow { box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3); }
.progress-bar-container { width: 100%; height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden; }
.dark .progress-bar-container { background: #374151; }
.progress-bar-fill { height: 100%; border-radius: 5px; transition: width 0.3s ease; background: linear-gradient(90deg, #3b82f6, #60a5fa); }
.progress-bar-fill.complete { background: linear-gradient(90deg, #22c55e, #4ade80); }
.progress-bar-fill.partial { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.status-badge { display: inline-flex; padding: 4px 12px; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; }
.status-received { background: #22c55e; color: white; }
.status-partial { background: #f59e0b; color: white; }
.status-pending { background: #3b82f6; color: white; }
.status-canceled { background: #ef4444; color: white; }
.dark .status-badge { box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.nps-promoter { color: #22c55e; }
.nps-passive { color: #f59e0b; }
.nps-detractor { color: #ef4444; }
`;

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ
// ─────────────────────────────────────────────────────────────

const formatNumber = (num) => new Intl.NumberFormat('ru-RU').format(num || 0);
const formatDate = (dateString, language) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateString; }
};
const formatChartValue = (value) => typeof value === 'number' ? (value >= 1000 ? `${(value/1000).toFixed(1)}K` : value) : value;

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ
// ─────────────────────────────────────────────────────────────

const AnalyticsChart = memo(({ data, type = 'area', title, isDark }) => {
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;
  if (!data?.length) return null;
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>{entry.name}: {formatNumber(entry.value)}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{title}</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis dataKey="label" stroke={colors.axis} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={colors.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatChartValue} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#chartGradient)" />
            </AreaChart>
          ) : type === 'bar' ? (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis dataKey="label" stroke={colors.axis} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={colors.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatChartValue} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={colors.bars[index % colors.bars.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
});
AnalyticsChart.displayName = 'AnalyticsChart';

const ModalHeader = memo(({ title, onClose, exportButtons, t, isExportingSection }) => (
  <header className="relative mb-6 pb-4 border-b border-gray-200/60 dark:border-gray-700/60">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <BarChart3 className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <h2 id="analytics-modal-title" className="text-xl font-bold text-gray-900 dark:text-white truncate">{title}</h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 ml-14 -mt-1">{t('analyticsDetailSubtitle') || 'Детальная информация по аналитике'}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {exportButtons.map((type) => {
          const Icon = type.icon;
          const loading = isExportingSection?.[type.id];
          return (
            <button key={type.id} type="button" onClick={type.onClick} disabled={loading}
              className={`group relative p-2.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${type.color} text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:scale-105 active:scale-95 export-btn-glow`}
              title={t(type.labelKey)} aria-label={t(type.labelKey)}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" aria-hidden="true" />}
            </button>
          );
        })}
        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" aria-hidden="true" />
        <button type="button" onClick={onClose} className="p-2.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800" aria-label={t('close')} title={t('close')}>
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </div>
    <div className="mt-3 ml-14 flex flex-wrap gap-2 text-xs text-gray-400 dark:text-gray-500">
      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 rounded">Esc — закрыть</span>
      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 rounded">Ctrl+Enter — экспорт</span>
    </div>
  </header>
));
ModalHeader.displayName = 'ModalHeader';

const SearchBar = memo(({ searchTerm, onSearchChange, placeholder, t }) => (
  <div className="relative mb-4">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
    <input type="text" placeholder={placeholder || t('search') || 'Поиск...'} value={searchTerm} onChange={(e) => onSearchChange(e.target.value)}
      className="w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 transition-all" aria-label={t('search')} />
    {searchTerm && <button type="button" onClick={() => onSearchChange('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label={t('clear')}><X className="w-4 h-4" /></button>}
  </div>
));
SearchBar.displayName = 'SearchBar';

const EmptyState = memo(({ t }) => (
  <div className="text-center py-16 fade-enter" role="status" aria-live="polite">
    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 mb-5">
      <Package className="w-10 h-10 text-gray-400 dark:text-gray-500" aria-hidden="true" />
    </div>
    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('noDataAvailable') || 'Нет данных'}</p>
    <p className="text-sm text-gray-500 dark:text-gray-400">{t('noDataHint') || 'Попробуйте изменить фильтры или добавить данные'}</p>
  </div>
));
EmptyState.displayName = 'EmptyState';

const DataTable = memo(({ columns, rows, escapeHtml, t, language }) => (
  <div className="overflow-x-auto px-4 sm:px-0">
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" role="table">
      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700/50 sticky top-0 z-10 shadow-sm">
        <tr>{columns.map((col, idx) => <th key={col.key || idx} scope="col" className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">{col.label}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
        {rows.map((row, rowIdx) => (
          <tr key={rowIdx} className="table-row-hover transition-colors" role="row">
            {columns.map((col, colIdx) => {
              const value = row[col.key];
              if (col.key === 'progress' && typeof value === 'number') {
                const pct = Math.min(100, Math.max(0, value));
                const isComplete = pct === 100, isPartial = pct > 0 && pct < 100;
                return <td key={`${rowIdx}-${colIdx}`} className="px-4 sm:px-6 py-4"><div className="flex items-center gap-3"><div className="progress-bar-container"><div className={`progress-bar-fill ${isComplete ? 'complete' : isPartial ? 'partial' : ''}`} style={{ width: `${pct}%` }} /></div><span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-10 text-right">{pct}%</span></div></td>;
              }
              if (col.key === 'status') return <td key={`${rowIdx}-${colIdx}`} className="px-4 sm:px-6 py-4"><span className={`status-badge status-${value}`}>{col.format ? col.format(value, row, language, t) : escapeHtml(String(value ?? ''))}</span></td>;
              const displayValue = col.format ? col.format(value, row, language, t) : escapeHtml ? escapeHtml(String(value ?? '')) : String(value ?? '');
              return <td key={`${rowIdx}-${col.key || colIdx}`} className="px-4 sm:px-6 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap first:font-medium first:text-gray-900 dark:first:text-white" role="cell">{displayValue}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
));
DataTable.displayName = 'DataTable';

const Toast = memo(({ message, type, onClose, t }) => {
  useEffect(() => { const timer = setTimeout(onClose, CONFIRMATION_TIMEOUT); return () => clearTimeout(timer); }, [onClose]);
  const config = {
    success: { bg: 'bg-green-50 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800', text: 'text-green-800 dark:text-green-200', icon: CheckCircle },
    error: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800', text: 'text-red-800 dark:text-red-200', icon: AlertCircle },
    info: { bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-200', icon: FileText }
  };
  const { bg, border, text, icon: Icon } = config[type] || config.info;
  return (
    <div className={`fixed bottom-4 right-4 z-[80] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${bg} ${border} ${text} modal-enter max-w-sm`}>
      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors" aria-label={t('close')}><X className="w-4 h-4" aria-hidden="true" /></button>
    </div>
  );
});
Toast.displayName = 'Toast';

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────

const AnalyticsDetailModal = ({ isOpen, onClose, analyticsDetailType, allApplications, applications, isAdminMode, isExportingSection, exportAnalyticsSectionAsPDF, exportAnalyticsSectionData, t, language, escapeHtml, getStatusText, activationMetrics, getStatusWithOverdue, timeToFirstValue, featureAdoption, npsMetrics, npsResponses, getRoleLabel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  const [isDark, setIsDark] = useState(false);
  const modalRef = useRef(null);
  const lastActiveElement = useRef(null);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mediaQuery.matches);
    const handler = (e) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => { document.head.removeChild(styleEl); mediaQuery.removeEventListener('change', handler); };
  }, []);

  useEffect(() => {
    if (isOpen) { lastActiveElement.current = document.activeElement; document.body.style.overflow = 'hidden'; setTimeout(() => modalRef.current?.focus(), 100); }
    else { document.body.style.overflow = ''; lastActiveElement.current?.focus?.(); }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); exportAnalyticsSectionAsPDF?.(); setToast({ message: t('exportStarted') || 'Экспорт начат...', type: 'info' }); return; }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, exportAnalyticsSectionAsPDF, t]);

  const { title, columns, rows, chartData, metricContent } = useMemo(() => {
    if (!isOpen || !analyticsDetailType) return { title: '', columns: [], rows: [], chartData: null, metricContent: null };
    const apps = isAdminMode ? allApplications : applications;
    let titleKey = '', cols = [], dataRows = [], chartData = null, metricContent = null;
    const getLabel = (key, fallback) => t(key) || fallback;

    // 📊 Табличные виды
    if (analyticsDetailType === 'applications') {
      titleKey = 'totalApplications';
      cols = [{ key: 'object', label: getLabel('objectName', 'Объект') }, { key: 'foreman', label: getLabel('foremanName', 'Мастер') }, { key: 'status', label: getLabel('status', 'Статус') }, { key: 'date', label: getLabel('date', 'Дата'), format: (val) => formatDate(val, language) }];
      dataRows = apps.map(app => ({ object: app.object_name, foreman: app.foreman_name, status: getStatusText(getStatusWithOverdue(app.status, app.created_at)), date: app.created_at }));
      const statusCounts = {}; apps.forEach(app => { const status = getStatusText(getStatusWithOverdue(app.status, app.created_at)); statusCounts[status] = (statusCounts[status] || 0) + 1; });
      chartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    }
    if (analyticsDetailType === 'objects') {
      titleKey = 'totalObjects';
      cols = [{ key: 'name', label: getLabel('objectName', 'Объект') }, { key: 'requests', label: getLabel('totalApplications', 'Заявки'), format: formatNumber }, { key: 'materials', label: getLabel('totalMaterials', 'Материалы'), format: formatNumber }, { key: 'progress', label: getLabel('progress', 'Прогресс'), format: (val, row) => row.totalRequested > 0 ? Math.round((row.totalReceived / row.totalRequested) * 100) : 0 }];
      const objMap = {};
      apps.forEach(app => { const key = app.object_name; if (!objMap[key]) objMap[key] = { name: key, requests: 0, materials: 0, received: 0, totalRequested: 0 }; objMap[key].requests += 1; const matQty = app.materials?.reduce((sum, m) => sum + (m.quantity || 0), 0) || 0; const matRec = app.materials?.reduce((sum, m) => sum + (m.received || 0), 0) || 0; objMap[key].materials += matQty; objMap[key].received += matRec; objMap[key].totalRequested += matQty; });
      dataRows = Object.values(objMap).map(obj => ({ ...obj, progress: obj.totalRequested > 0 ? (obj.received / obj.totalRequested) * 100 : 0 }));
      chartData = Object.values(objMap).sort((a, b) => b.requests - a.requests).slice(0, 10).map(obj => ({ label: obj.name, value: obj.requests }));
    }
    if (analyticsDetailType === 'materials') {
      titleKey = 'totalMaterials';
      cols = [{ key: 'description', label: getLabel('materialName', 'Материал') }, { key: 'totalRequested', label: getLabel('totalRequested', 'Запрошено'), format: formatNumber }, { key: 'totalReceived', label: getLabel('totalReceived', 'Получено'), format: formatNumber }, { key: 'progress', label: getLabel('progress', 'Прогресс'), format: (val, row) => row.totalRequested > 0 ? Math.round((row.totalReceived / row.totalRequested) * 100) : 0 }];
      const matMap = {};
      apps.forEach(app => { app.materials?.forEach(m => { const key = m.description; if (!matMap[key]) matMap[key] = { description: key, totalRequested: 0, totalReceived: 0 }; matMap[key].totalRequested += m.quantity || 0; matMap[key].totalReceived += m.received || 0; }); });
      dataRows = Object.values(matMap).sort((a, b) => b.totalRequested - a.totalRequested).map(mat => ({ ...mat, progress: mat.totalRequested > 0 ? (mat.totalReceived / mat.totalRequested) * 100 : 0 }));
      chartData = Object.values(matMap).sort((a, b) => b.totalRequested - a.totalRequested).slice(0, 10).map(mat => ({ label: mat.description.length > 20 ? mat.description.slice(0, 20) + '...' : mat.description, value: mat.totalRequested }));
    }
    if (analyticsDetailType === 'receivedMaterials') {
      titleKey = 'receivedMaterials';
      cols = [{ key: 'object', label: getLabel('objectName', 'Объект') }, { key: 'material', label: getLabel('materialName', 'Материал') }, { key: 'received', label: getLabel('received', 'Получено'), format: formatNumber }, { key: 'unit', label: getLabel('unit', 'Ед.') }];
      dataRows = apps.flatMap(app => app.materials?.filter(m => (m.received || 0) > 0).map(m => ({ object: app.object_name, material: m.description, received: m.received, unit: m.unit })) || []);
    }

    // 📈 Метрики с карточками
    if (analyticsDetailType === 'activation' && activationMetrics) {
      titleKey = 'activationRate';
      metricContent = (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard label="Activation Rate" value={`${activationMetrics.rate}%`} subtext={`за ${activationMetrics.periodDays} дн.`} icon={Target} color="indigo" />
            <MetricCard label="Активировано" value={activationMetrics.activated} subtext={`из ${activationMetrics.total}`} icon={Users} color="emerald" />
            <MetricCard label="Всего пользователей" value={activationMetrics.total} icon={Building} color="slate" />
          </div>
          <SectionCard title="Прогресс активации" icon={TrendingUp}>
            <ProgressBar value={activationMetrics.rate} label="Доля пользователей, создавших заявку за 24ч" color="indigo" />
          </SectionCard>
        </div>
      );
    }
    if (analyticsDetailType === 'ttfv' && timeToFirstValue) {
      titleKey = 'timeToFirstValue';
      metricContent = (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard label="Среднее время до первой заявки" value={timeToFirstValue.averageDays !== null ? `${timeToFirstValue.averageDays} дн.` : '—'} icon={Clock} color="emerald" />
            <MetricCard label="Пользователей в выборке" value={timeToFirstValue.sampleSize} icon={Users} color="slate" />
          </div>
          {timeToFirstValue.distribution && (
            <SectionCard title="Распределение по времени" icon={BarChart3}>
              <div className="space-y-3">
                {Object.entries(timeToFirstValue.distribution).map(([key, value]) => {
                  const pct = timeToFirstValue.sampleSize > 0 ? Math.round(value / timeToFirstValue.sampleSize * 100) : 0;
                  return <ProgressBar key={key} value={pct} label={key} color={key === '< 1 ч' ? 'emerald' : key === '1 - 24 ч' ? 'amber' : 'rose'} />;
                })}
              </div>
            </SectionCard>
          )}
        </div>
      );
    }
    if (analyticsDetailType === 'adoption' && featureAdoption) {
      titleKey = 'featureAdoption';
      metricContent = (
        <div className="space-y-5">
          <SectionCard title="Использование функций по ролям" icon={Users}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Роль</th><th className="text-center py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">📦 Склад</th><th className="text-center py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">💬 Чат</th><th className="text-center py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">📊 Аналитика</th></tr></thead>
                <tbody>
                  {['foreman', 'supply_admin', 'manager'].map(role => {
                    const data = featureAdoption.byRole?.[role];
                    if (!data) return null;
                    return (
                      <tr key={role} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-3 px-2 font-medium text-gray-900 dark:text-white">{getRoleLabel?.(role) || role}</td>
                        {['warehouse', 'chat', 'analytics'].map(feature => (
                          <td key={feature} className="text-center py-3 px-2">
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${feature === 'warehouse' ? 'bg-indigo-500' : feature === 'chat' ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${data[feature].percent}%` }} />
                              </div>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{data[feature].percent}%</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
          <SectionCard title="Среднее по компании" icon={TrendingUp}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ProgressBar value={featureAdoption.overall.warehouse} label="📦 Склад" color="indigo" />
              <ProgressBar value={featureAdoption.overall.chat} label="💬 Чат" color="amber" />
              <ProgressBar value={featureAdoption.overall.analytics} label="📊 Аналитика" color="blue" />
            </div>
          </SectionCard>
        </div>
      );
    }
    if (analyticsDetailType === 'nps' && npsMetrics) {
      titleKey = 'npsScore';
      const scoreColor = npsMetrics.score >= 50 ? 'emerald' : npsMetrics.score >= 0 ? 'amber' : 'rose';
      metricContent = (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700/50 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 text-center sm:col-span-2">
              <div className={`text-3xl font-bold text-${scoreColor}-600 dark:text-${scoreColor}-400`}>{npsMetrics.score !== null ? npsMetrics.score : '—'}</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">NPS Score</p>
            </div>
            <MetricCard label="👍 Promoters" value={`${npsMetrics.promotersPercent}%`} color="emerald" />
            <MetricCard label="👎 Detractors" value={`${npsMetrics.detractorsPercent}%`} color="rose" />
          </div>
          {chartData?.length > 0 && <SectionCard title="Распределение оценок" icon={BarChart3}><div className="h-48"><AnalyticsChart data={chartData} type="bar" isDark={isDark} /></div></SectionCard>}
        </div>
      );
    }
    if (analyticsDetailType === 'churn') {
      titleKey = 'churnReasons';
      metricContent = <SectionCard title="Причины оттока" icon={AlertCircle}><div className="text-center py-8 text-gray-500 dark:text-gray-400"><AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" /><p className="font-medium">Аналитика оттока в разработке</p><p className="text-sm mt-1">Данные будут доступны после внедрения метрик</p></div></SectionCard>;
    }

    return { title: t(titleKey) || titleKey, columns: cols, rows: dataRows, chartData, metricContent };
  }, [isOpen, analyticsDetailType, isAdminMode, allApplications, applications, t, language, getStatusText, getStatusWithOverdue, activationMetrics, timeToFirstValue, featureAdoption, npsMetrics, npsResponses, getRoleLabel, isDark]);

  const filteredRows = useMemo(() => { if (!searchTerm.trim()) return rows; const term = searchTerm.toLowerCase().trim(); return rows.filter(row => Object.values(row).some(val => String(val ?? '').toLowerCase().includes(term))); }, [rows, searchTerm]);
  const handleExport = useCallback((type) => { if (type.isDirect) exportAnalyticsSectionAsPDF?.(); else exportAnalyticsSectionData?.(...(type.args || [])); setToast({ message: t('exportStarted') || 'Экспорт начат...', type: 'info' }); }, [exportAnalyticsSectionAsPDF, exportAnalyticsSectionData, t]);
  const exportButtons = useMemo(() => EXPORT_TYPES.map(type => ({ ...type, onClick: () => handleExport(type) })), [handleExport]);

  if (!isOpen || !analyticsDetailType) return null;
  const hasTableData = columns.length > 0 && rows.length > 0, hasMetricContent = !!metricContent;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity fade-enter" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()} aria-hidden="true">
        <div ref={modalRef} tabIndex={-1} className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col outline-none modal-enter border border-gray-200/50 dark:border-gray-700/50" role="dialog" aria-modal="true" aria-labelledby="analytics-modal-title">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <ModalHeader title={title} onClose={onClose} exportButtons={exportButtons} t={t} isExportingSection={isExportingSection} />
            {hasTableData && <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder={t('searchInTable') || 'Поиск в таблице...'} t={t} />}
            {chartData?.length > 0 && hasTableData && analyticsDetailType !== 'receivedMaterials' && <SectionCard title={`${t('distributionBy') || 'Распределение по'} ${title.toLowerCase()}`} icon={PieChart}><div className="h-64"><AnalyticsChart data={chartData} type={analyticsDetailType === 'materials' ? 'bar' : 'pie'} isDark={isDark} /></div></SectionCard>}
            {hasMetricContent && !hasTableData && metricContent && <div className="space-y-5">{metricContent}</div>}
            {hasTableData && (
              <SectionCard title="Детальные данные" icon={FileText}>
                {filteredRows.length === 0 ? <EmptyState t={t} /> : (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>{t('showing') || 'Показано'}: <strong className="text-gray-900 dark:text-white">{filteredRows.length}</strong>{rows.length > filteredRows.length && ` из ${rows.length}`}</span>
                      <span className="flex items-center gap-1"><Users className="w-4 h-4" aria-hidden="true" />{t('totalRecords') || 'Всего записей'}: {formatNumber(rows.length)}</span>
                    </div>
                    <DataTable columns={columns} rows={filteredRows} escapeHtml={escapeHtml} t={t} language={language} />
                  </>
                )}
              </SectionCard>
            )}
            {!hasTableData && !hasMetricContent && <EmptyState t={t} />}
          </div>
          <footer className="p-4 sm:p-6 border-t border-gray-200/60 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-b-3xl">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2"><Calendar className="w-4 h-4" aria-hidden="true" />{formatDate(new Date().toISOString(), language)}</div>
              <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" aria-hidden="true" />{t('close') || 'Закрыть'}</button>
            </div>
          </footer>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} t={t} />}
    </>
  );
};

AnalyticsDetailModal.displayName = 'AnalyticsDetailModal';
export default memo(AnalyticsDetailModal);