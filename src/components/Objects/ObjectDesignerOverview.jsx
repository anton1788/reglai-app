// src/components/Objects/ObjectDesignerOverview.jsx
// ============================================================
// Упрощённый "Обзор" объекта для роли "Проектировщик".
// Показывает только:
//   • Название, адрес, статус
//   • Даты создания / обновления
//   • Площадь / тип (если есть)
// НЕ показывает: заявки, материалы, прогресс, финансы.
// ============================================================

import React, { memo } from 'react';
import {
  Building2, MapPin, Calendar, Clock, User, FileText,
  Layers, Maximize2, Compass,
} from 'lucide-react';
import {
  OBJECT_STATUS_LABELS,
  OBJECT_STATUS_COLORS,
  OBJECT_STATUS_ICONS,
} from '../../utils/objectStatuses';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch { return dateStr; }
};

const ObjectDesignerOverview = memo(({ object, language = 'ru' }) => {
  const isRu = language === 'ru';

  if (!object) return null;

  const statusColor = OBJECT_STATUS_COLORS[object.status] || OBJECT_STATUS_COLORS.planning;
  const statusLabel = OBJECT_STATUS_LABELS[object.status] || object.status;
  const statusIcon = OBJECT_STATUS_ICONS[object.status] || '📋';

  // Собираем поля, которые реально пришли с бэка
  const infoFields = [
    object.address && {
      icon: MapPin,
      label: isRu ? 'Адрес' : 'Address',
      value: object.address,
    },
    object.customer_name && {
      icon: User,
      label: isRu ? 'Заказчик' : 'Customer',
      value: object.customer_name,
    },
    object.object_type && {
      icon: Layers,
      label: isRu ? 'Тип объекта' : 'Object type',
      value: object.object_type,
    },
    (object.area || object.total_area) && {
      icon: Maximize2,
      label: isRu ? 'Площадь' : 'Area',
      value: `${object.area || object.total_area} м²`,
    },
    object.created_at && {
      icon: Calendar,
      label: isRu ? 'Создан' : 'Created',
      value: formatDate(object.created_at),
    },
    object.updated_at && {
      icon: Clock,
      label: isRu ? 'Обновлён' : 'Updated',
      value: formatDate(object.updated_at),
    },
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      {/* ═══ Большая карточка "Информация об объекте" ═══ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2.5 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-xl flex-shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isRu ? 'Информация об объекте' : 'Object information'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {isRu ? 'Основные данные' : 'Basic data'}
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap flex items-center gap-1 ${statusColor}`}>
            <span>{statusIcon}</span>
            <span>{statusLabel}</span>
          </span>
        </div>

        {infoFields.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
            {isRu ? 'Данные об объекте не заполнены' : 'Object data is not filled in'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {infoFields.map((field, idx) => {
              const Icon = field.icon;
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#4A6572] dark:text-[#F9AA33]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                      {field.label}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white font-medium mt-0.5 break-words">
                      {field.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Карточка "Рабочее пространство" ═══ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
            <Compass className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {isRu ? 'Проектная работа' : 'Design work'}
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {isRu
            ? 'Чертежи, схемы и техническая документация — во вкладке «Документы».'
            : 'Drawings, schemes and technical documentation — in the "Documents" tab.'}
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            {isRu ? 'Документы объекта' : 'Object documents'}
          </div>
        </div>
      </div>
    </div>
  );
});

ObjectDesignerOverview.displayName = 'ObjectDesignerOverview';

export default ObjectDesignerOverview;