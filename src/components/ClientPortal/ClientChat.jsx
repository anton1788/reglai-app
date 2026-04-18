// src/components/ClientPortal/ClientChat.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, User, Phone } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const ClientChat = ({ user, clientId, companyId, t }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [companyUsers, setCompanyUsers] = useState([]);
  const messagesEndRef = useRef(null);

  const loadCompanyUsers = useCallback(async () => {
    if (!companyId) return;
    try {
      const { data } = await supabase
        .from('company_users')
        .select('user_id, full_name, role, phone')
        .eq('company_id', companyId)
        .in('role', ['manager', 'supply_admin', 'foreman']);
      setCompanyUsers(data || []);
    } catch (err) {
      console.error('Ошибка загрузки сотрудников:', err);
    }
  }, [companyId]);

  const loadMessages = useCallback(async () => {
    if (!clientId) return;
    try {
      const { data, error } = await supabase
        .from('client_messages')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadCompanyUsers();
    loadMessages();
    
    // Подписка на новые сообщения
    const channel = supabase
      .channel('client_chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'client_messages',
        filter: `client_id=eq.${clientId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [clientId, loadCompanyUsers, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      const { error } = await supabase
        .from('client_messages')
        .insert([{
          client_id: clientId,
          company_id: companyId,
          sender_id: user.id,
          sender_role: 'client',
          content: newMessage.trim(),
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error('Ошибка отправки:', err);
      alert(t('clientChat.sendError') || 'Не удалось отправить сообщение');
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      manager: t('clientChat.manager') || 'Руководитель',
      supply_admin: t('clientChat.supplyAdmin') || 'Администратор',
      foreman: t('clientChat.foreman') || 'Прораб'
    };
    return labels[role] || role;
  };

  if (loading) {
    return <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"></div></div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <h2 className="font-semibold">{t('clientChat.title') || 'Чат с прорабом'}</h2>
        <p className="text-sm opacity-90">{t('clientChat.subtitle') || 'Сотрудники компании ответят вам в ближайшее время'}</p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t('clientChat.noMessages') || 'Нет сообщений'}</p>
            <p className="text-sm">{t('clientChat.startChat') || 'Напишите свой вопрос'}</p>
          </div>
        )}
        
        {messages.map((msg) => {
          const isClient = msg.sender_role === 'client';
          const sender = !isClient && companyUsers.find(u => u.user_id === msg.sender_id);
          
          return (
            <div key={msg.id} className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isClient ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700'} rounded-2xl px-4 py-2`}>
                {!isClient && sender && (
                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                    {sender.full_name} ({getRoleLabel(sender.role)})
                  </div>
                )}
                <p className="text-sm">{msg.content}</p>
                <div className={`text-xs mt-1 ${isClient ? 'text-indigo-200' : 'text-gray-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-700/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={t('clientChat.messagePlaceholder') || 'Введите сообщение...'}
            className="flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-400">
          {t('clientChat.emergencyContact') || '📞 При срочных вопросах звоните'}: +7 (999) 123-45-67
        </div>
      </div>
    </div>
  );
};

export default ClientChat;