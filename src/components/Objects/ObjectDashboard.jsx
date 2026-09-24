// src/components/Objects/ObjectDashboard.jsx
// ============================================================
// Вкладка "Обзор" в папке объекта — дашборд со сводкой
// ============================================================

import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  MapPin, Calendar, DollarSign, Package,
  FileText, User, TrendingUp, CheckCircle2, Clock,
  ChevronRight, Loader2, ArrowRight
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import {
  OBJECT_STATUS_LABELS,
  OBJECT_STATUS_COLORS,
  OBJECT_STATUS_ICONS,
  getProgressColor,
} from '../../utils/objectStatuses';

// ────────────────────────────────────────────────────────────
// Хелперы
// ────────────────────────────────────────────────────────────
const formatNumber = (num) => new Intl.NumberFormat('ru-RU').format(num || 0);

const formatMoney = (num) => {
  if (num == null || num === 0) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit'
    });
  } catch { return dateStr; }
};

// ────────────────────────────────────────────────────────────
// Круговая диаграмма прогресса (SVG)
// ────────────────────────────────────────────────────────────
const ProgressRing = memo(({ percent, size = 140, strokeWidth = 12 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  // Цвет в зависимости от прогресса
  let color = '#94a3b8'; // gray
  if (percent >= 100) color = '#22c55e'; // green
  else if (percent >= 70) color = '#3b82f6'; // blue
  else if (percent >= 30) color = '#f59e0b'; // amber
  else if (percent > 0) color = '#f97316'; // orange

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Фон */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Прогресс */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {percent}%
        </span>
        <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 mt-0.5">
          прогресс
        </span>
      </div>
    </div>
  );
});
ProgressRing.displayName = 'ProgressRing';

// ────────────────────────────────────────────────────────────
// Мини-карточка метрики
// ────────────────────────────────────────────────────────────
const MetricCard = memo(({ icon, label, value, subValue, accent = 'gray' }) => {
  const accents = {
    gray:    'bg-gray-50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300',
    blue:    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300',
    green:   'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300',
    amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300',
    purple:  'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300',
  };
  return (
    <div className={`rounded-xl p-3 ${accents[accent]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {React.createElement(icon, { className: 'w-3.5 h-3.5 flex-shrink-0' })}
        <span className="text-[10px] uppercase tracking-wide opacity-80 truncate">{label}</span>
      </div>
      <div className="text-lg font-bold leading-tight truncate">{value}</div>
      {subValue && (
        <div className="text-[10px] opacity-70 mt-0.5 truncate">{subValue}</div>
      )}
    </div>
  );
});
MetricCard.displayName = 'MetricCard';

// ────────────────────────────────────────────────────────────
// Основной компонент
// ────────────────────────────────────────────────────────────
const ObjectDashboard = memo(({
  object,          // объект из БД (обязательно)
  companyUsers = [],
  language = 'ru',
  onOpenApplication,
  onGoToTab,
}) => {
  const isRu = language === 'ru';

  // ─── State ───────────────────────────────────────────────
  const [applications, setApplications] = useState([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [usersMap, setUsersMap] = useState({});

  // ─── Загрузка заявок объекта ─────────────────────────────
  useEffect(() => {
    if (!object?.id) return;

    let cancelled = false;

    const load = async () => {
      setIsLoadingApps(true);
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('id, object_name, foreman_name, status, materials, created_at, updated_at, total_amount, user_id')
          .eq('object_id', object.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (cancelled) return;
        if (error) {
          console.warn('[ObjectDashboard.applications] error:', error);
          setApplications([]);
        } else {
          setApplications(data || []);
        }
      } catch (err) {
        console.error('[ObjectDashboard.loadApps] error:', err);
        if (!cancelled) setApplications([]);
      } finally {
        if (!cancelled) setIsLoadingApps(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [object?.id]);

  // ─── Карта пользователей (клиент, прораб) ────────────────
  useEffect(() => {
    if (!companyUsers || companyUsers.length === 0) return;
    const map = {};
    companyUsers.forEach(u => {
      map[u.user_id] = u;
      if (u.id) map[u.id] = u;
    });
    setUsersMap(map);
  }, [companyUsers]);

  // ─── Вычисляем метрики ───────────────────────────────────
  const metrics = useMemo(() => {
    const totalApps = applications.length;
    let totalMaterials = 0;
    let receivedMaterials = 0;

    applications.forEach(app => {
      const mats = Array.isArray(app.materials) ? app.materials : [];
      mats.forEach(m => {
        totalMaterials += Number(m.quantity) || 0;
        receivedMaterials += Number(m.received) || 0;
      });
    });

    return {
      totalApps,
      totalMaterials,
      receivedMaterials,
      percent: object.progress_percent || 0,
    };
  }, [applications, object.progress_percent]);

  // ─── Участники ───────────────────────────────────────────
  const client = object.client_id ? usersMap[object.client_id] : null;
  const foreman = object.foreman_user_id ? usersMap[object.foreman_user_id] : null;

  // ─── Статус ──────────────────────────────────────────────
  const statusColor = OBJECT_STATUS_COLORS[object.status] || OBJECT_STATUS_COLORS.planning;
  const statusLabel = OBJECT_STATUS_LABELS[object.status] || object.status;
  const statusIcon = OBJECT_STATUS_ICONS[object.status] || '📋';

  // ─── Рендер ──────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ═══ Верхняя часть: прогресс + основная инфа ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Прогресс-кольцо */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center justify-center">
          <ProgressRing percent={metrics.percent} size={140} strokeWidth={12} />
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {isRu ? 'Получено материалов' : 'Materials received'}
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
              {formatNumber(metrics.receivedMaterials)} / {formatNumber(metrics.totalMaterials)}
            </div>
          </div>
        </div>

        {/* Основная информация */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isRu ? 'Информация об объекте' : 'Object information'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isRu ? 'Основные данные' : 'Main data'}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap flex items-center gap-1 ${statusColor}`}>
              <span>{statusIcon}</span>
              <span>{statusLabel}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {object.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">
                    {isRu ? 'Адрес' : 'Address'}
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white break-words">
                    {object.address}
                  </div>
                </div>
              </div>
            )}

            {object.start_date && (
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">
                    {isRu ? 'Дата начала' : 'Start date'}
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {formatDate(object.start_date)}
                  </div>
                </div>
              </div>
            )}

            {object.planned_end_date && (
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">
                    {isRu ? 'Планируемое окончание' : 'Planned end'}
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {formatDate(object.planned_end_date)}
                  </div>
                </div>
              </div>
            )}

            {object.budget > 0 && (
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">
                    {isRu ? 'Бюджет' : 'Budget'}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatMoney(object.budget)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {object.description && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                {isRu ? 'Описание' : 'Description'}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {object.description}
              </p>
            </div>
          )}

          {object.tags && object.tags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex flex-wrap gap-1.5">
                {object.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Метрики ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={FileText}
          label={isRu ? 'Заявок' : 'Applications'}
          value={formatNumber(metrics.totalApps)}
          accent="blue"
        />
        <MetricCard
          icon={Package}
          label={isRu ? 'Материалов' : 'Materials'}
          value={formatNumber(metrics.totalMaterials)}
          accent="amber"
        />
        <MetricCard
          icon={CheckCircle2}
          label={isRu ? 'Получено' : 'Received'}
          value={formatNumber(metrics.receivedMaterials)}
          accent="green"
        />
        <MetricCard
          icon={TrendingUp}
          label={isRu ? 'Прогресс' : 'Progress'}
          value={`${metrics.percent}%`}
          accent="purple"
        />
      </div>

      {/* ═══ Участники ═══ */}
      {(client || foreman) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-[#4A6572]" />
            {isRu ? 'Участники' : 'Participants'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {client && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(client.full_name || client.user_email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">
                    {isRu ? 'Заказчик' : 'Client'}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {client.full_name || client.user_email || '—'}
                  </div>
                  {client.phone && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {client.phone}
                    </div>
                  )}
                </div>
              </div>
            )}

            {foreman && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {(foreman.full_name || foreman.user_email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">
                    {isRu ? 'Ответственный' : 'Responsible'}
                  </div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {foreman.full_name || foreman.user_email || '—'}
                  </div>
                  {foreman.phone && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {foreman.phone}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Последние заявки ═══ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#4A6572]" />
            {isRu ? 'Последние заявки' : 'Recent applications'}
          </h3>
          {onGoToTab && (
            <button
              onClick={() => onGoToTab('applications')}
              className="text-xs text-[#4A6572] dark:text-[#F9AA33] hover:underline flex items-center gap-1 font-medium"
            >
              {isRu ? 'Все заявки' : 'All applications'}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {isLoadingApps ? (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : applications.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isRu ? 'По этому объекту пока нет заявок' : 'No applications for this object yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {applications.slice(0, 5).map(app => {
              const mats = Array.isArray(app.materials) ? app.materials : [];
              const totalQty = mats.reduce((s, m) => s + (Number(m.quantity) || 0), 0);
              const receivedQty = mats.reduce((s, m) => s + (Number(m.received) || 0), 0);
              const percent = totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;

              return (
                <button
                  key={app.id}
                  onClick={() => onOpenApplication?.(app)}
                  className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors flex items-center gap-3"
                >
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {app.foreman_name || '—'}
                      </span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">
                        {formatDateShort(app.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getProgressColor(percent)}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {receivedQty}/{totalQty}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

ObjectDashboard.displayName = 'ObjectDashboard';

export default ObjectDashboard;