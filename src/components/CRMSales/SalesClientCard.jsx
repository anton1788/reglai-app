// src/components/CRMSales/SalesClientCard.jsx
import React from 'react';
import { Phone, Mail, Users, Calendar, PhoneCall, Eye, Edit2, Trash2, UserPlus, Building } from 'lucide-react';

const SalesClientCard = ({ client, statuses, onEdit, onDelete, onStatusChange, onConvert, onView }) => {
  const statusConfig = statuses[client.status];
  const hasCallToday = client.next_call_date === new Date().toISOString().split('T')[0];
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-4 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-white">{client.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
            {hasCallToday && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs flex items-center gap-1">
                <PhoneCall className="w-3 h-3" />
                Звонок сегодня!
              </span>
            )}
          </div>
          
          <div className="space-y-1 text-sm">
            {client.phone && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Phone className="w-3.5 h-3.5" />
                <a href={`tel:${client.phone}`} className="hover:text-indigo-600">{client.phone}</a>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Mail className="w-3.5 h-3.5" />
                <a href={`mailto:${client.email}`} className="hover:text-indigo-600">{client.email}</a>
              </div>
            )}
            {client.company && (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 text-xs">
                <Building className="w-3 h-3" />
                {client.company} {client.position && `• ${client.position}`}
              </div>
            )}
            {client.next_call_date && (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-500 text-xs">
                <Calendar className="w-3 h-3" />
                Следующий звонок: {new Date(client.next_call_date).toLocaleDateString('ru-RU')}
                {client.next_call_time && ` в ${client.next_call_time}`}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-1">
          <button
            onClick={() => onView(client)}
            className="p-1.5 text-gray-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
            title="Подробнее"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(client)}
            className="p-1.5 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="Редактировать"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(client)}
            className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {client.status !== 'client' && client.status !== 'lost' && (
            <button
              onClick={() => onConvert(client)}
              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
              title="Превратить в клиента"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Быстрая смена статуса */}
      <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 flex flex-wrap gap-1">
        {Object.entries(statuses).map(([key, config]) => (
          <button
            key={key}
            onClick={() => onStatusChange(client.id, key)}
            className={`px-2 py-1 rounded-lg text-xs transition-all ${
              client.status === key
                ? config.color + ' font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SalesClientCard;