// src/components/Objects/ObjectCard.jsx
// ============================================================
// Карточка объекта для списка "Объекты"
// ============================================================

import React, { memo, useCallback } from 'react';
import {
  Building2, MapPin, Package, FileText, Edit3,
  Archive, ChevronRight, Calendar, DollarSign, User
} from 'lucide-react';
import {
  OBJECT_STATUS,
  OBJECT_STATUS_COLORS,
  OBJECT_STATUS_LABELS,
  OBJECT_STATUS_ICONS,
  getProgressColor,
} from '../../utils/objectStatuses';

// ────────────────────────────────────────────────────────────
// Хелперы форматирования
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
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

// ────────────────────────────────────────────────────────────
// Компонент
// ────────────────────────────────────────────────────────────
const ObjectCard = memo(({
  object,
  onClick,           // (object) => void — открыть папку объекта
  onEdit,            // (object) => void — редактировать
  onArchive,         // (object) => void — архивировать
  canManage = false, // может ли пользователь редактировать/архивировать
  language = 'ru',
}) => {
  const isRu = language === 'ru';
  const status = object.status || OBJECT_STATUS.PLANNING;
  const progress = Math.max(0, Math.min(100, object.progress_percent || 0));

  const handleClick = useCallback(() => onClick?.(object), [onClick, object]);
  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    onEdit?.(object);
  }, [onEdit, object]);
  const handleArchive = useCallback((e) => {
    e.stopPropagation();
    onArchive?.(object);
  }, [onArchive, object]);

  const statusColor = OBJECT_STATUS_COLORS[status] || OBJECT_STATUS_COLORS[OBJECT_STATUS.PLANNING];
  const statusLabel = OBJECT_STATUS_LABELS[status] || status;
  const statusIcon = OBJECT_STATUS_ICONS[status] || '📋';

  return (
    <article
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-[#4A6572]/40 dark:hover:border-[#F9AA33]/40 transition-all cursor-pointer overflow-hidden"
    >
      {/* ─── Header с именем и статусом ─────────────────── */}
      <header className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-gradient-to-br from-[#4A6572]/10 to-[#344955]/10 dark:from-[#4A6572]/20 dark:to-[#344955]/20 rounded-xl flex-shrink-0">
              <Building2 className="w-5 h-5 text-[#4A6572] dark:text-[#F9AA33]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight line-clamp-2">
                {object.name}
              </h3>
              {object.address && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-start gap-1 line-clamp-1">
                  <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span className="truncate">{object.address}</span>
                </p>
              )}
            </div>
          </div>

          <span
            className={`text-[10px] px-2 py-1 rounded-full font-medium whitespace-nowrap flex items-center gap-1 ${statusColor}`}
            title={statusLabel}
          >
            <span>{statusIcon}</span>
            <span className="hidden sm:inline">{statusLabel}</span>
          </span>
        </div>

        {/* Заказчик / Прораб */}
        {(object.client_id || object.foreman_user_id) && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            {object.client_name && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 rounded-full">
                <User className="w-3 h-3" />
                {object.client_name}
              </span>
            )}
            {object.foreman_name && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-700/50 rounded-full">
                👷 {object.foreman_name}
              </span>
            )}
          </div>
        )}
      </header>

      {/* ─── Прогресс ───────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-500 dark:text-gray-400">
            {isRu ? 'Прогресс' : 'Progress'}
          </span>
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {progress}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {object.total_materials > 0 && (
          <p className="text-[11px] text-gray-400 mt-1">
            {formatNumber(object.received_materials)} / {formatNumber(object.total_materials)}
            {' '}
            {isRu ? 'материалов получено' : 'materials received'}
          </p>
        )}
      </div>

      {/* ─── Метрики: заявки, материалы, бюджет ─────────── */}
      <div className="px-4 pb-3 grid grid-cols-3 gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">
            <FileText className="w-3 h-3" />
            <span>{isRu ? 'Заявки' : 'Apps'}</span>
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-white">
            {formatNumber(object.total_applications || 0)}
          </div>
        </div>

        <div className="text-center border-x border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">
            <Package className="w-3 h-3" />
            <span>{isRu ? 'Материалы' : 'Items'}</span>
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-white">
            {formatNumber(object.total_materials || 0)}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">
            <DollarSign className="w-3 h-3" />
            <span>{isRu ? 'Бюджет' : 'Budget'}</span>
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
            {formatMoney(object.budget)}
          </div>
        </div>
      </div>

      {/* ─── Footer: даты + действия ─────────────────────── */}
      <footer className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 min-w-0">
          {object.planned_end_date && (
            <span className="flex items-center gap-1 truncate">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              {formatDate(object.planned_end_date)}
            </span>
          )}
          {!object.planned_end_date && object.created_at && (
            <span className="flex items-center gap-1 truncate">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              {formatDate(object.created_at)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {canManage && (
            <>
              <button
                type="button"
                onClick={handleEdit}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
                title={isRu ? 'Редактировать' : 'Edit'}
                aria-label={isRu ? 'Редактировать' : 'Edit'}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleArchive}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title={isRu ? 'В архив' : 'Archive'}
                aria-label={isRu ? 'В архив' : 'Archive'}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 group-hover:text-[#4A6572] dark:group-hover:text-[#F9AA33] transition-all" />
        </div>
      </footer>
    </article>
  );
});

ObjectCard.displayName = 'ObjectCard';

export default ObjectCard;