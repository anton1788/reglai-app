import React, { useEffect, useState, useCallback } from 'react';
import { X, Mail, Phone, Calendar, Package } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

export const ClientDetailsModal = ({ isOpen, onClose, client, companyId }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Оборачиваем функцию в useCallback, чтобы избежать лишних перерендеров
  const loadClientApplications = useCallback(async () => {
    if (!companyId || !client?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('company_id', companyId)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, client?.id]); // ✅ Добавляем зависимости

  useEffect(() => {
    if (isOpen && client && companyId) {
      loadClientApplications();
    }
  }, [isOpen, client, companyId, loadClientApplications]); // ✅ Добавляем loadClientApplications в зависимости

  if (!isOpen || !client) return null;

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: 'Ожидает', color: 'bg-yellow-100 text-yellow-700' },
      partial: { text: 'Частично', color: 'bg-orange-100 text-orange-700' },
      received: { text: 'Выполнена', color: 'bg-green-100 text-green-700' },
      canceled: { text: 'Отменена', color: 'bg-red-100 text-red-700' }
    };
    const s = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-0.5 text-xs rounded-full ${s.color}`}>{s.text}</span>;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {client.full_name || 'Клиент'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Заказчик • {client.role || 'client'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Контактная информация */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Контактная информация
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4 mr-2" />
                <span>{client.email || '—'}</span>
              </div>
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Phone className="w-4 h-4 mr-2" />
                <span>{client.phone || '—'}</span>
              </div>
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-2" />
                <span>В компании с {new Date(client.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
          </div>

          {/* Заявки клиента */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Заявки ({applications.length})
            </h4>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6572] mx-auto"></div>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Нет заявок
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map(app => (
                  <div key={app.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{app.object_name}</p>
                        <p className="text-xs text-gray-500">{new Date(app.created_at).toLocaleString('ru-RU')}</p>
                      </div>
                      {getStatusBadge(app.status)}
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        {app.materials?.length || 0} позиций
                      </span>
                      {app.total_amount > 0 && (
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {app.total_amount.toLocaleString('ru-RU')} ₽
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};