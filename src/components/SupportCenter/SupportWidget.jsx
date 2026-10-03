// src/components/SupportCenter/SupportWidget.jsx
// ============================================================
// 🎧 Плавающий виджет поддержки для клиента
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Plus, ChevronLeft } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import {
  createSupportTicket,
  fetchTickets,
  fetchTicketMessages,
  sendTicketMessage,
  getOnlineAgents,
} from '../../utils/supportCenter';

export default function SupportWidget({
  user,
  userCompanyId,
  userRole,
  userName,
  showNotification,
  t = (k) => k,
}) {
  // ✅ Хелпер: если ключа нет в словаре — возвращаем fallback
  const tr = useCallback((key, fallback) => {
    const result = t(key);
    return result === key ? fallback : result;
  }, [t]);

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('list'); // list | new | chat
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newCategory, setNewCategory] = useState('question');
  const [loading, setLoading] = useState(false);
  const [onlineAgents, setOnlineAgents] = useState([]);
  const messagesEndRef = useRef(null);

  // ── Хелперы загрузки ──
  const loadTickets = useCallback(async () => {
    if (!user?.id) return;
    setTicketsLoading(true);
    try {
      const list = await fetchTickets({ userId: user.id, isAgent: false });
      setTickets(list);
    } catch (e) {
      console.error('[SupportWidget] loadTickets', e);
    } finally {
      setTicketsLoading(false);
    }
  }, [user?.id]);

  const loadMessages = useCallback(async (ticketId) => {
    try {
      const msgs = await fetchTicketMessages(ticketId);
      setMessages(msgs.filter(m => !m.is_internal));
    } catch (e) {
      console.error('[SupportWidget] loadMessages', e);
    }
  }, []);

  const loadOnlineAgents = useCallback(async () => {
    try {
      const agents = await getOnlineAgents();
      setOnlineAgents(agents);
    } catch (e) {
      console.error('[SupportWidget] loadOnlineAgents', e);
    }
  }, []);

  // ── Загрузка при открытии панели ──
  useEffect(() => {
    if (!isOpen || !user?.id) return;
    loadTickets();
    loadOnlineAgents();

    const interval = setInterval(loadOnlineAgents, 30_000);
    return () => clearInterval(interval);
  }, [isOpen, user?.id, loadTickets, loadOnlineAgents]);

  // ── Realtime: сообщения активного тикета ──
  useEffect(() => {
    if (!activeTicket?.id) return;

    loadMessages(activeTicket.id);

    const channel = supabase
      .channel(`support_ticket_${activeTicket.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
        filter: `ticket_id=eq.${activeTicket.id}`,
      }, (payload) => {
        if (payload.new.is_internal) return;
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [activeTicket?.id, loadMessages]);

  // ── Автоскролл к последнему сообщению ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Обработчики ──
  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      showNotification?.(tr('support.fillRequired', 'Заполните тему и описание'), 'error');
      return;
    }
    setLoading(true);
    try {
      const ticket = await createSupportTicket({
        userId: user.id,
        userEmail: user.email,
        userName: userName || user.email,
        userRole,
        companyId: userCompanyId,
        subject: newSubject.trim(),
        category: newCategory,
        priority: newCategory === 'bug' ? 'high' : 'normal',
        firstMessage: newMessage.trim(),
        context: {
          url: window.location.href,
          view: window.location.pathname,
          device: navigator.userAgent,
        },
      });
      showNotification?.(tr('support.sent', '✅ Обращение отправлено в поддержку'), 'success');
      setNewSubject('');
      setNewMessage('');
      setActiveTicket(ticket);
      setView('chat');
      loadTickets();
    } catch (e) {
      showNotification?.(tr('support.error', 'Ошибка') + ': ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeTicket?.id) return;
    const text = input.trim();
    setInput('');
    try {
      await sendTicketMessage({
        ticketId: activeTicket.id,
        senderId: user.id,
        senderRole: 'client',
        senderName: userName || user.email,
        content: text,
      });
    } catch (e) {
      showNotification?.(tr('support.sendError', 'Ошибка отправки') + ': ' + e.message, 'error');
      setInput(text);
    }
  };

  const unreadCount = tickets.filter(t => t.status === 'pending').length;
  const hasOnlineAgent = onlineAgents.length > 0;

  return (
    <>
      {/* ── Плавающая кнопка ── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-[9998] w-14 h-14 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] text-white shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
        aria-label={tr('support.title', 'Поддержка')}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
        {!isOpen && hasOnlineAgent && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        )}
      </button>

      {/* ── Панель ── */}
      {isOpen && (
        <div className="fixed bottom-40 right-4 lg:bottom-24 lg:right-6 z-[9998] w-[calc(100vw-2rem)] max-w-sm h-[60vh] max-h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          {/* Хедер */}
          <div className="bg-gradient-to-r from-[#4A6572] to-[#344955] text-white px-4 py-3 flex items-center gap-2">
            {view !== 'list' && (
              <button
                onClick={() => setView('list')}
                className="p-1 hover:bg-white/20 rounded"
                aria-label={tr('support.back', 'Назад')}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1">
              <div className="font-semibold text-sm">
                {view === 'new'
                  ? tr('support.newTicket', 'Новое обращение')
                  : view === 'chat'
                    ? activeTicket?.subject
                    : tr('support.title', 'Поддержка')}
              </div>
              <div className="text-xs opacity-90 flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${hasOnlineAgent ? 'bg-green-400' : 'bg-gray-400'}`} />
                {hasOnlineAgent
                  ? `${tr('support.online', 'Онлайн')}: ${onlineAgents.length}`
                  : tr('support.offline', 'Операторы офлайн')}
              </div>
            </div>
          </div>

          {/* ── Список тикетов ── */}
          {view === 'list' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <button
                onClick={() => setView('new')}
                className="w-full py-2.5 px-3 bg-[#F9AA33] text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[#F57C00]"
              >
                <Plus className="w-4 h-4" /> {tr('support.createTicket', 'Создать обращение')}
              </button>

              {ticketsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  {tr('support.noTickets', 'У вас пока нет обращений')}
                </div>
              ) : (
                tickets.map(ticket => (
                  <button
                    key={ticket.id}
                    onClick={() => { setActiveTicket(ticket); setView('chat'); }}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate">{ticket.subject}</span>
                      <StatusBadge status={ticket.status} tr={tr} />
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(ticket.updated_at).toLocaleString('ru-RU')}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* ── Новый тикет ── */}
          {view === 'new' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  {tr('support.category', 'Категория')}
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="question">{tr('support.cat.question', 'Вопрос')}</option>
                  <option value="bug">{tr('support.cat.bug', 'Ошибка / баг')}</option>
                  <option value="billing">{tr('support.cat.billing', 'Оплата / тариф')}</option>
                  <option value="feature">{tr('support.cat.feature', 'Пожелание')}</option>
                  <option value="other">{tr('support.cat.other', 'Другое')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  {tr('support.subject', 'Тема')} *
                </label>
                <input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder={tr('support.subjectPlaceholder', 'Кратко опишите проблему')}
                  maxLength={120}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  {tr('support.description', 'Описание')} *
                </label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 resize-none"
                  placeholder={tr('support.descriptionPlaceholder', 'Что случилось? Что вы ожидали?')}
                />
              </div>
              <button
                onClick={handleCreateTicket}
                disabled={loading}
                className="w-full py-2.5 bg-[#4A6572] text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {tr('support.send', 'Отправить')}
              </button>
            </div>
          )}

          {/* ── Чат ── */}
          {view === 'chat' && activeTicket && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-gray-900/30">
                {messages.length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    {tr('support.noMessages', 'Сообщений пока нет')}
                  </div>
                )}
                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_id === user.id} />
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="border-t p-2 flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder={tr('support.messagePlaceholder', 'Сообщение...')}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="px-3 py-2 bg-[#4A6572] text-white rounded-lg disabled:opacity-50"
                  aria-label={tr('support.send', 'Отправить')}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ============================================================

function MessageBubble({ msg, isOwn }) {
  if (msg.sender_role === 'system') {
    return <div className="text-center text-xs text-gray-400 py-1">{msg.content}</div>;
  }
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
        isOwn
          ? 'bg-[#4A6572] text-white rounded-br-sm'
          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm shadow-sm'
      }`}>
        {!isOwn && msg.sender_name && (
          <div className="text-xs opacity-70 mb-0.5">{msg.sender_name}</div>
        )}
        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
        <div className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
          {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, tr = (k, fb) => fb }) {
  const map = {
    new: { label: tr('support.status.new', 'Новый'), cls: 'bg-blue-100 text-blue-700' },
    open: { label: tr('support.status.open', 'Открыт'), cls: 'bg-yellow-100 text-yellow-700' },
    pending: { label: tr('support.status.pending', 'Ждёт'), cls: 'bg-orange-100 text-orange-700' },
    resolved: { label: tr('support.status.resolved', 'Решён'), cls: 'bg-green-100 text-green-700' },
    closed: { label: tr('support.status.closed', 'Закрыт'), cls: 'bg-gray-100 text-gray-600' },
  };
  const item = map[status] || map.new;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.cls}`}>{item.label}</span>;
}