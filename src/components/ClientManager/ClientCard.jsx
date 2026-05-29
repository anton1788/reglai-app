import React from 'react';
import { User, Mail, Phone, Calendar, Activity, MoreVertical, Eye, Power, Trash2, Building, FileText, DollarSign } from 'lucide-react';
import { formatLastActivity } from '../../utils/clientManager';

export const ClientCard = ({ client, stats, onView, onToggleStatus, onDelete }) => {
  const isActive = client.is_active;
  const lastActivity = stats?.lastActivity;
  const fullName = client.full_name || client.fullName || '—';
  
  // Форматируем дату регистрации
  const registeredDate = client.created_at 
    ? new Date(client.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border transition-all hover:shadow-lg ${
      isActive 
        ? 'border-gray-200/50 dark:border-gray-700/50' 
        : 'border-red-200/50 dark:border-red-900/30 bg-gray-50/50 dark:bg-gray-800/50'
    }`}>
      <div className="p-5">
        {/* Шапка карточки */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isActive 
                ? 'bg-gradient-to-br from-[#4A6572] to-[#344955]' 
                : 'bg-gray-400 dark:bg-gray-600'
            }`}>
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                {fullName}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Заказчик • Регистрация: {registeredDate}
              </p>
            </div>
          </div>
          
          {/* Меню действий */}
          <div className="relative group">
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-500" />
            </button>
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => onView(client)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Подробнее
              </button>
              <button
                onClick={() => onToggleStatus(client.id, !isActive)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                  isActive 
                    ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20' 
                    : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}
              >
                <Power className="w-4 h-4" />
                {isActive ? 'Заблокировать' : 'Активировать'}
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Удалить клиента "${fullName}" из компании?`)) {
                    onDelete(client.id);
                  }
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Удалить
              </button>
            </div>
          </div>
        </div>

        {/* Контактная информация */}
        <div className="mt-4 space-y-2">
          {client.email && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{client.phone || '—'}</span>
          </div>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <FileText className="w-4 h-4 mr-1 flex-shrink-0" />
                <span>{stats.totalApplications} заявок</span>
              </div>
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Activity className="w-4 h-4 mr-1 flex-shrink-0" />
                <span>{stats.activeApplications} в работе</span>
              </div>
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Building className="w-4 h-4 mr-1 flex-shrink-0" />
                <span>{stats.uniqueObjects} объектов</span>
              </div>
              {stats.totalAmount > 0 && (
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <DollarSign className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span>{stats.totalAmount.toLocaleString('ru-RU')} ₽</span>
                </div>
              )}
            </div>
            <div className="flex items-center text-xs text-gray-500 mt-2">
              <Calendar className="w-3 h-3 mr-1" />
              <span>Активность: {formatLastActivity(lastActivity)}</span>
            </div>
          </div>
        )}

        {/* Статус и кнопка подробнее */}
        <div className="mt-3 pt-2 flex justify-between items-center">
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            isActive 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {isActive ? '🟢 Активен' : '🔴 Заблокирован'}
          </span>
          <button
            onClick={() => onView(client)}
            className="text-sm text-[#4A6572] dark:text-[#F9AA33] hover:underline flex items-center gap-1"
          >
            Подробнее
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};