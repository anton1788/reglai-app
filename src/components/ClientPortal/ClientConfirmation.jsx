// src/components/ClientPortal/ClientConfirmation.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const ClientConfirmation = ({ clientId }) => {
  const [confirmations, setConfirmations] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadConfirmations = useCallback(async () => {
    if (!clientId) return;
    
    try {
      const { data, error } = await supabase
        .from('client_confirmations')
        .select('*, applications(object_name, foreman_name)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setConfirmations(data || []);
    } catch (err) {
      console.error('Ошибка загрузки подтверждений:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadConfirmations();
  }, [loadConfirmations]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-4 text-white">
        <h2 className="font-semibold">Подтверждение работ</h2>
        <p className="text-sm opacity-90">История ваших подтверждений</p>
      </div>
      
      {confirmations.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
          <CheckCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Нет подтверждённых работ</p>
        </div>
      ) : (
        <div className="space-y-3">
          {confirmations.map((conf) => (
            <div key={conf.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{conf.applications?.object_name}</h3>
                  <p className="text-sm text-gray-500 mt-1">Прораб: {conf.applications?.foreman_name}</p>
                  <p className="text-xs text-gray-400 mt-1">Подтверждено: {new Date(conf.confirmed_at).toLocaleString()}</p>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                  Подтверждено
                </span>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-gray-600">Количество: {conf.confirmed_quantity} ед.</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientConfirmation;