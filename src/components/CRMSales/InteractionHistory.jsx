import React, { useState, useEffect } from 'react';
import { History, PhoneCall, Mail, Calendar, MessageSquare, UserPlus, Edit2, Trash2, Loader2 } from 'lucide-react';

const InteractionHistory = ({ supabase, companyId, clientId, showNotification }) => {
  const [interactions, setInteractions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    type: 'call',
    content: '',
    created_at: new Date().toISOString()
  });

  const INTERACTION_TYPES = {
    call: { label: '📞 Звонок', icon: PhoneCall, color: 'bg-blue-100 text-blue-700' },
    email: { label: '✉️ Email', icon: Mail, color: 'bg-green-100 text-green-700' },
    meeting: { label: '🤝 Встреча', icon: Calendar, color: 'bg-purple-100 text-purple-700' },
    message: { label: '💬 Сообщение', icon: MessageSquare, color: 'bg-yellow-100 text-yellow-700' },
    status_change: { label: '🔄 Смена статуса', icon: Edit2, color: 'bg-gray-100 text-gray-700' }
  };

  // Загрузка истории
  const loadInteractions = async () => {
    if (!clientId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInteractions(data || []);
    } catch (err) {
      console.error('Ошибка загрузки истории:', err);
      showNotification('Ошибка загрузки истории', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInteractions();
  }, [clientId]);

  // Добавление взаимодействия
  const addInteraction = async () => {
    if (!newInteraction.content.trim()) {
      showNotification('Введите текст взаимодействия', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('crm_interactions')
        .insert([{
          client_id: clientId,
          company_id: companyId,
          type: newInteraction.type,
          content: newInteraction.content.trim(),
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      showNotification('Взаимодействие добавлено', 'success');
      setShowAddForm(false);
      setNewInteraction({ type: 'call', content: '', created_at: new Date().toISOString() });
      await loadInteractions();
      
    } catch (err) {
      console.error('Ошибка добавления:', err);
      showNotification('Ошибка добавления', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Удаление взаимодействия
  const deleteInteraction = async (id) => {
    if (!window.confirm('Удалить запись?')) return;
    
    try {
      const { error } = await supabase
        .from('crm_interactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      showNotification('Запись удалена', 'success');
      await loadInteractions();
      
    } catch (err) {
      console.error('Ошибка удаления:', err);
      showNotification('Ошибка удаления', 'error');
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-gray-500" />
          <h4 className="font-medium text-gray-900 dark:text-white">История взаимодействий</h4>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Добавить
        </button>
      </div>
      
      {/* Форма добавления */}
      {showAddForm && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
          <div className="flex gap-2 mb-2">
            <select
              value={newInteraction.type}
              onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value })}
              className="px-3 py-1.5 border rounded-lg text-sm dark:bg-gray-700"
            >
              {Object.entries(INTERACTION_TYPES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          <textarea
            value={newInteraction.content}
            onChange={(e) => setNewInteraction({ ...newInteraction, content: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-gray-700 resize-none"
            rows="2"
            placeholder="Опишите результат взаимодействия..."
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
            >
              Отмена
            </button>
            <button
              onClick={addInteraction}
              disabled={isLoading}
              className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}
      
      {/* Список взаимодействий */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        </div>
      ) : interactions.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          Нет записей о взаимодействиях
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {interactions.map(interaction => {
            const typeConfig = INTERACTION_TYPES[interaction.type] || INTERACTION_TYPES.message;
            const Icon = typeConfig.icon;
            
            return (
              <div key={interaction.id} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-2 flex-1">
                    <div className={`p-1 rounded ${typeConfig.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {interaction.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(interaction.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteInteraction(interaction.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InteractionHistory;