// src/components/ClientPortal/ClientDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Home, FileText, CheckCircle, Clock, MessageCircle, X } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const ClientDashboard = ({ clientId, t }) => {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    pendingConfirmation: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const loadData = useCallback(async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      // Загружаем заявки заказчика
      const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setApplications(apps || []);
      
      // Статистика
      const completed = apps?.filter(a => a.status === 'received').length || 0;
      const inProgress = apps?.filter(a => ['pending', 'admin_processing', 'partial_received'].includes(a.status)).length || 0;
      const pendingConfirmation = apps?.filter(a => a.status === 'pending_master_confirmation').length || 0;
      
      setStats({ total: apps?.length || 0, completed, inProgress, pendingConfirmation });
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusBadge = (status) => {
    const config = {
      pending: { label: t('clientDashboard.statusPending') || 'В обработке', color: 'bg-yellow-100 text-yellow-800' },
      admin_processing: { label: t('clientDashboard.statusAdminProcessing') || 'Приёмка материалов', color: 'bg-blue-100 text-blue-800' },
      partial_received: { label: t('clientDashboard.statusPartial') || 'Частично выполнено', color: 'bg-orange-100 text-orange-800' },
      pending_master_confirmation: { label: t('clientDashboard.statusPendingConfirm') || 'Ожидает подтверждения', color: 'bg-purple-100 text-purple-800' },
      received: { label: t('clientDashboard.statusCompleted') || 'Выполнено', color: 'bg-green-100 text-green-800' },
      canceled: { label: t('clientDashboard.statusCanceled') || 'Отменено', color: 'bg-red-100 text-red-800' }
    };
    const cfg = config[status] || config.pending;
    return <span className={`px-2 py-1 text-xs rounded-full ${cfg.color}`}>{cfg.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Заголовок */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">{t('clientDashboard.title') || 'Личный кабинет заказчика'}</h1>
        <p className="opacity-90 mt-1">{t('clientDashboard.subtitle') || 'Отслеживайте ход работ по вашему объекту'}</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <FileText className="w-6 h-6 text-indigo-600 mb-2" />
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-500">{t('clientDashboard.totalApplications') || 'Всего заявок'}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <Clock className="w-6 h-6 text-yellow-600 mb-2" />
          <div className="text-2xl font-bold">{stats.inProgress}</div>
          <div className="text-sm text-gray-500">{t('clientDashboard.inProgress') || 'В работе'}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
          <div className="text-2xl font-bold">{stats.completed}</div>
          <div className="text-sm text-gray-500">{t('clientDashboard.completed') || 'Выполнено'}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <MessageCircle className="w-6 h-6 text-blue-600 mb-2" />
          <div className="text-2xl font-bold">{t('clientDashboard.chat') || 'Чат'}</div>
          <div className="text-sm text-gray-500">{t('clientDashboard.withForeman') || 'С прорабом'}</div>
        </div>
      </div>

      {/* Список заявок */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">{t('clientDashboard.history') || 'История работ'}</h2>
        </div>
        <div className="divide-y">
          {applications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Home className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('clientDashboard.noApplications') || 'Нет заявок по вашему объекту'}</p>
            </div>
          ) : (
            applications.map(app => (
              <div 
                key={app.id} 
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                onClick={() => setSelectedApplication(app)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{app.object_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('clientDashboard.created') || 'Создана'}: {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(app.status)}
                </div>
                
                {/* Прогресс */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{t('clientDashboard.progress') || 'Выполнение работ'}</span>
                    <span>
                      {Math.round(
                        (app.materials?.reduce((s, m) => s + (m.received || 0), 0) / 
                         app.materials?.reduce((s, m) => s + (m.quantity || 0), 0)) * 100 || 0
                      )}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ 
                        width: `${(app.materials?.reduce((s, m) => s + (m.received || 0), 0) / 
                          app.materials?.reduce((s, m) => s + (m.quantity || 0), 0)) * 100 || 0}%` 
                      }} 
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Модалка деталей заявки */}
      {selectedApplication && (
        <ClientApplicationModal
          isOpen={!!selectedApplication}
          onClose={() => setSelectedApplication(null)}
          application={selectedApplication}
          clientId={clientId}
          t={t}
        />
      )}
    </div>
  );
};

// Модалка деталей заявки для заказчика
const ClientApplicationModal = ({ isOpen, onClose, application, clientId, t }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async (materialIndex, quantity) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('client_confirmations')
        .insert([{
          application_id: application.id,
          client_id: clientId,
          material_index: materialIndex,
          confirmed_quantity: quantity,
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      // Обновляем статус материала
      const newMaterials = [...application.materials];
      newMaterials[materialIndex].received = (newMaterials[materialIndex].received || 0) + quantity;
      
      await supabase
        .from('applications')
        .update({ materials: newMaterials })
        .eq('id', application.id);
      
      alert(t('clientDashboard.confirmationSuccess') || 'Работы подтверждены!');
      onClose();
    } catch (err) {
      console.error('Ошибка подтверждения:', err);
      alert((t('clientDashboard.confirmationError') || 'Ошибка: ') + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold">{application.object_name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t('clientDashboard.foreman') || 'Прораб'}:</span> {application.foreman_name}
            </div>
            <div>
              <span className="text-gray-500">{t('clientDashboard.phone') || 'Телефон'}:</span> {application.foreman_phone}
            </div>
            <div>
              <span className="text-gray-500">{t('clientDashboard.startDate') || 'Дата начала'}:</span> {new Date(application.created_at).toLocaleDateString()}
            </div>
            <div>
              <span className="text-gray-500">{t('clientDashboard.status') || 'Статус'}:</span> {application.status}
            </div>
          </div>
          
          <h4 className="font-semibold mt-4">{t('clientDashboard.materials') || 'Материалы и работы'}</h4>
          <div className="space-y-3">
            {application.materials?.map((material, idx) => {
              const requested = material.quantity;
              const received = material.received || 0;
              const remaining = requested - received;
              
              return (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="flex justify-between">
                    <span className="font-medium">{material.description}</span>
                    <span className="text-sm text-gray-500">{requested} {material.unit}</span>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <div className="flex-1 mr-4">
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-full bg-green-500 rounded-full" 
                          style={{ width: `${(received / requested) * 100}%` }} 
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('clientDashboard.completedAmount') || 'Выполнено'}: {received} {t('clientDashboard.of') || 'из'} {requested}
                      </div>
                    </div>
                    {remaining > 0 && application.status !== 'received' && (
                      <button
                        onClick={() => handleConfirm(idx, remaining)}
                        disabled={isSubmitting}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {t('clientDashboard.confirm') || 'Подтвердить'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;