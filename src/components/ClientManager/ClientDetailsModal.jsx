import React, { useEffect, useState } from 'react';
import { X, Mail, Phone, Calendar, Package, CheckCircle, Clock, DollarSign, Building, User, Activity, FileText, ExternalLink } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { formatLastActivity } from '../../utils/clientManager';

export const ClientDetailsModal = ({ isOpen, onClose, client, companyId }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isOpen && client && companyId) {
      loadClientApplications();
      loadClientStats();
    }
  }, [isOpen, client, companyId]);

  const loadClientApplications = async () => {
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
  };

  const loadClientStats = async () => {
    try {
      const { data: applications, error } = await supabase
        .from('applications')
        .select('id, status, created_at, total_amount, object_name')
        .eq('company_id', companyId)
        .eq('client_id', client.id);

      if (error) throw error;

      const totalAmount = applications?.reduce((sum, a) => sum + (a.total_amount || 0), 0) || 0;
      const activeApps = applications?.filter(a => 
        ['pending', 'partial', 'admin_processing', 'pending_approval'].includes(a.status)
      ).length || 0;
      const completedApps = applications?.filter(a => a.status === 'received').length || 0;
      const uniqueObjects = new Set(applications?.map(a => a.object_name)).size || 0;

      setStats({
        totalApplications: applications?.length || 0,
        activeApplications: activeApps,
        completedApplications: completedApps,
        totalAmount,
        uniqueObjects,
        lastActivity: applications?.[0]?.created_at || null
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: 'Ожидает', color: 'bg-yellow-100 text-yellow-700' },
      partial: { text: 'Частично', color: 'bg-orange-100 text-orange-700' },
      received: { text: 'Выполнена', color: 'bg-green-100 text-green-700' },
      canceled: { text: 'Отменена', color: 'bg-red-100 text-red-700' },
      admin_processing: { text: 'В обработке', color: 'bg-blue-100 text-blue-700' },
      pending_approval: { text: 'На согласовании', color: 'bg-purple-100 text-purple-700' }
    };
    const s = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-700' };
    return <span className={`px-2 py-0.5 text-xs rounded-full ${s.color}`}>{s.text}</span>;
  };

  if (!isOpen || !client) return null;

  const registeredDate = client.created_at 
    ? new Date(client.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {client.full_name || 'Клиент'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
                Заказчик
              </span>
              <span>• В компании с {registeredDate}</span>
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
              <User className="w-4 h-4" />
              Контактная информация
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Mail className="w-4 h-4 mr-2" />
                <span>{client.email || '—'}</span>
              </div>
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Phone className="w-4 h-4 mr-2" />
                <span>{client.phone || '—'}</span>
              </div>
              {/* 👇 ДОБАВЛЕН ОБЪЕКТ */}
              {client.object_name && (
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Building className="w-4 h-4 mr-2" />
                  <span>Объект: {client.object_name}</span>
                </div>
              )}
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Зарегистрирован: {registeredDate}</span>
              </div>
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <Activity className="w-4 h-4 mr-2" />
                <span>Последняя активность: {formatLastActivity(stats?.lastActivity)}</span>
              </div>
            </div>
            {/* 👇 ДОБАВЛЕНЫ ПРИМЕЧАНИЯ */}
            {client.notes && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <span className="text-xs text-gray-500">Примечания:</span>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">{client.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Статистика */}
          {stats && (
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Статистика
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalApplications}</div>
                  <div className="text-xs text-gray-500">Всего заявок</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.activeApplications}</div>
                  <div className="text-xs text-gray-500">В работе</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.completedApplications}</div>
                  <div className="text-xs text-gray-500">Выполнено</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.uniqueObjects}</div>
                  <div className="text-xs text-gray-500">Объектов</div>
                </div>
              </div>
              {stats.totalAmount > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-center">
                  <span className="text-sm text-gray-500">Общая сумма заявок:</span>
                  <span className="ml-2 text-lg font-bold text-gray-900 dark:text-white">
                    {stats.totalAmount.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              )}
            </div>
          )}

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
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                Нет заявок
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {applications.map(app => (
                  <div key={app.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          {app.object_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(app.created_at).toLocaleString('ru-RU')}
                        </p>
                      </div>
                      {getStatusBadge(app.status)}
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        📦 {app.materials?.length || 0} позиций
                      </span>
                      {app.total_amount > 0 && (
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          💰 {app.total_amount.toLocaleString('ru-RU')} ₽
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