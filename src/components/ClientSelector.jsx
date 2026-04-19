import React, { useState, useEffect, useCallback } from 'react';
import { Users, ChevronDown } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const ClientSelector = ({ companyId, selectedClientId, onSelect, t }) => {
  const [clients, setClients] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadClients = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, phone, email')
        .eq('company_id', companyId);
      
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Ошибка загрузки заказчиков:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {t?.('clientSelectorLabel') || 'Заказчик (для кого работа)'}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
      >
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <span className={selectedClient ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
            {selectedClient 
              ? selectedClient.full_name 
              : (t?.('selectClient') || 'Выберите заказчика')}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-gray-500">
              {t?.('loading') || 'Загрузка...'}
            </div>
          ) : clients.length === 0 ? (
            <div className="p-3 text-center text-gray-500">
              {t?.('noClients') || 'Нет заказчиков. Пригласите заказчика через меню "Пригласить заказчика"'}
            </div>
          ) : (
            clients.map(client => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  onSelect(client.id);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">{client.full_name}</div>
                <div className="text-xs text-gray-500">{client.phone}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ClientSelector;