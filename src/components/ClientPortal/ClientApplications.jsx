// src/components/ClientPortal/ClientApplications.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const ClientApplications = ({ clientId, t }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const loadApplications = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Ошибка загрузки заявок:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'received': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'canceled': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending_master_confirmation': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusText = (status) => {
    const map = {
      pending: t('clientApplications.statusPending') || 'В обработке',
      admin_processing: t('clientApplications.statusAdminProcessing') || 'Приёмка материалов',
      partial_received: t('clientApplications.statusPartial') || 'Частично выполнено',
      pending_master_confirmation: t('clientApplications.statusPendingConfirm') || 'Ожидает подтверждения',
      received: t('clientApplications.statusCompleted') || 'Выполнено',
      canceled: t('clientApplications.statusCanceled') || 'Отменено'
    };
    return map[status] || status;
  };

  if (loading) {
    return <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div></div>;
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">{t('clientApplications.noApplications') || 'У вас пока нет заявок'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {applications.map((app) => (
        <div key={app.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border overflow-hidden">
          <div 
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(app.status)}
                <div>
                  <h3 className="font-semibold">{app.object_name}</h3>
                  <p className="text-sm text-gray-500">
                    {t('clientApplications.created') || 'Создана'}: {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  app.status === 'received' ? 'bg-green-100 text-green-700' :
                  app.status === 'pending_master_confirmation' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {getStatusText(app.status)}
                </span>
                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === app.id ? 'rotate-90' : ''}`} />
              </div>
            </div>
            
            {/* Прогресс */}
            <div className="mt-3">
              <div className="flex justify-between text-sm mb-1">
                <span>{t('clientApplications.progress') || 'Выполнение работ'}</span>
                <span>{Math.round((app.materials?.reduce((s, m) => s + (m.received || 0), 0) / 
                       app.materials?.reduce((s, m) => s + (m.quantity || 0), 1)) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" 
                     style={{ width: `${(app.materials?.reduce((s, m) => s + (m.received || 0), 0) / 
                       app.materials?.reduce((s, m) => s + (m.quantity || 0), 1)) * 100}%` }} />
              </div>
            </div>
          </div>
          
          {/* Детали */}
          {expandedId === app.id && (
            <div className="border-t p-4 bg-gray-50 dark:bg-gray-700/30">
              <h4 className="font-medium mb-2">{t('clientApplications.materials') || 'Материалы и работы'}:</h4>
              <div className="space-y-2">
                {app.materials?.map((m, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{m.description}</span>
                    <span>{m.received || 0}/{m.quantity} {m.unit}</span>
                  </div>
                ))}
              </div>
              {app.foreman_name && (
                <div className="mt-3 text-sm text-gray-500">
                  {t('clientApplications.foreman') || 'Прораб'}: {app.foreman_name} • {app.foreman_phone}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ClientApplications;