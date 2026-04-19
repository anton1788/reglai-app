// src/components/ClientPortal/ClientWorkAct.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Eye, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const ClientWorkAct = ({ clientId }) => {
  const [acts, setActs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadActs = useCallback(async () => {
    if (!clientId) return;
    
    try {
      const { data, error } = await supabase
        .from('work_acts')
        .select('*, applications(object_name, foreman_name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setActs(data || []);
    } catch (err) {
      console.error('Ошибка загрузки актов:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadActs();
  }, [loadActs]);

  const getStatusBadge = (status) => {
    const config = {
      draft: { label: 'Черновик', color: 'bg-gray-100 text-gray-700' },
      sent: { label: 'Отправлен', color: 'bg-blue-100 text-blue-700' },
      signed: { label: 'Подписан', color: 'bg-green-100 text-green-700' },
      paid: { label: 'Оплачен', color: 'bg-emerald-100 text-emerald-700' }
    };
    const cfg = config[status] || config.draft;
    return <span className={`px-2 py-1 text-xs rounded-full ${cfg.color}`}>{cfg.label}</span>;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
        <h2 className="font-semibold">Акты выполненных работ</h2>
        <p className="text-sm opacity-90">Документы для подписания</p>
      </div>
      
      {acts.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
          <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Актов пока нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {acts.map((act) => (
            <div key={act.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">Акт №{act.act_number || act.id.slice(0, 8)}</h3>
                  <p className="text-sm text-gray-500 mt-1">{act.applications?.object_name}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(act.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{act.total_amount?.toLocaleString()} ₽</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(act.status)}
                  <button className="flex items-center gap-1 text-indigo-600 text-sm">
                    <Download className="w-4 h-4" /> Скачать
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientWorkAct;