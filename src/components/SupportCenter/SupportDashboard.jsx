// src/components/SupportCenter/SupportDashboard.jsx
// ============================================================
// 🎧 Дашборд оператора поддержки
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import { useSupportAgent } from '../../hooks/useSupportAgent';
import {
  fetchTickets, fetchTicketMessages, sendTicketMessage,
  assignTicketToMe, updateTicketStatus, getSupportMetrics,
} from '../../utils/supportCenter';

export default function SupportDashboard({ user, showNotification }) {
  const { agent, isOnline, loading: agentLoading, goOnline, goOffline } = useSupportAgent(user);

  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('new');
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [internalNote, setInternalNote] = useState(false);
  const messagesEndRef = useRef(null);

  // ── Загрузка тикетов и метрик ──
  const loadAll = useCallback(async () => {
    try {
      const list = await fetchTickets({
        userId: user.id,
        isAgent: true,
        status: filter === 'all' || filter === 'mine' ? 'all' : filter,
      });

      const filtered = filter === 'mine'
        ? list.filter(t => t.assigned_agent_id === user.id)
        : list;

      setTickets(filtered);

      const m = await getSupportMetrics();
      setMetrics(m);
    } catch (e) {
      console.error('[SupportDashboard] loadAll', e);
    }
  }, [user.id, filter]);

  const loadMessages = useCallback(async (ticketId) => {
    try {
      setMessages(await fetchTicketMessages(ticketId));
    } catch (e) {
      console.error('[SupportDashboard] loadMessages', e);
    }
  }, []);

  // ── Периодическая загрузка ──
  useEffect(() => {
    if (!agent || !isOnline) return;
    loadAll();
    const t1 = setInterval(loadAll, 20_000);
    return () => clearInterval(t1);
  }, [agent?.id, isOnline, loadAll]);

  // ── Realtime: новые тикеты ──
  useEffect(() => {
    if (!agent || !isOnline) return;

    const ch = supabase
      .channel('support_agent_inbox')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'support_tickets',
      }, (payload) => {
        setTickets(prev => [payload.new, ...prev]);
        showNotification?.('🎧 Новое обращение: ' + payload.new.subject, 'info');
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'support_tickets',
      }, (payload) => {
        setTickets(prev => prev.map(t =>
          t.id === payload.new.id ? { ...t, ...payload.new } : t
        ));
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [agent?.id, isOnline, showNotification]);

  // ── Realtime: сообщения активного тикета ──
  useEffect(() => {
    if (!activeTicket?.id) return;

    loadMessages(activeTicket.id);

    const ch = supabase
      .channel(`agent_ticket_${activeTicket.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'support_messages',
        filter: `ticket_id=eq.${activeTicket.id}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [activeTicket?.id, loadMessages]);

  // ── Автоскролл ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Действия ──
  const handleAssign = async (ticket) => {
    try {
      await assignTicketToMe(ticket.id, user.id);
      showNotification?.('✅ Тикет взят в работу', 'success');
      setActiveTicket({ ...ticket, assigned_agent_id: user.id, status: 'open' });
      loadAll();
    } catch (e) {
      showNotification?.(e.message, 'error');
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
        senderRole: 'agent',
        senderName: agent.display_name,
        content: text,
        isInternal: internalNote,
      });
    } catch (e) {
      showNotification?.('Ошибка: ' + e.message, 'error');
      setInput(text);
    }
  };

  const handleResolve = async () => {
    if (!activeTicket) return;
    await updateTicketStatus(activeTicket.id, 'resolved');
    showNotification?.('✅ Тикет решён', 'success');
    setActiveTicket(null);
    loadAll();
  };

  const handleClose = async () => {
    if (!activeTicket) return;
    await updateTicketStatus(activeTicket.id, 'closed');
    setActiveTicket(null);
    loadAll();
  };

  // ── Загрузка / нет доступа ──
  if (agentLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-amber-500 mb-3" />
        <h2 className="text-xl font-bold mb-2">Вы не оператор поддержки</h2>
        <p className="text-gray-500">Обратитесь к администратору.</p>
      </div>
    );
  }

  return (
    <div
      className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4"
      style={{ height: 'calc(100vh - 140px)' }}
    >
      {/* ═════════ ЛЕВАЯ ПАНЕЛЬ ═════════ */}
      <aside className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        {/* Шапка: имя + статус + метрики */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm truncate">{agent.display_name}</div>
            <button
              onClick={() => (isOnline ? goOffline() : goOnline())}
              className={`px-3 py-1 text-xs rounded-full font-medium whitespace-nowrap ${
                isOnline
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {isOnline ? '● Онлайн' : '○ Офлайн'}
            </button>
          </div>

          {!isOnline && (
            <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-[11px] text-amber-700 dark:text-amber-300">
              ⚠️ Нажмите «Онлайн», чтобы принимать тикеты
            </div>
          )}

          {metrics && (
            <div className="grid grid-cols-3 gap-1 text-center">
              <Metric label="Новых" value={metrics.newToday} />
              <Metric label="Открыто" value={metrics.open} />
              <Metric label="Отв.мин" value={metrics.avgResponseMin} />
            </div>
          )}
        </div>

        {/* Фильтры */}
        <div className="flex gap-1 p-2 border-b overflow-x-auto">
          {['new', 'mine', 'open', 'resolved', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap ${
                filter === f
                  ? 'bg-[#4A6572] text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {{ new: 'Новые', mine: 'Мои', open: 'Открытые', resolved: 'Решённые', all: 'Все' }[f]}
            </button>
          ))}
        </div>

        {/* Список тикетов */}
        <div className="flex-1 overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Нет тикетов</div>
          ) : (
            tickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => setActiveTicket(ticket)}
                className={`w-full text-left p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                  activeTicket?.id === ticket.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="font-medium text-sm truncate">{ticket.subject}</span>
                  {['high', 'critical'].includes(ticket.priority) && (
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {ticket.user_name || ticket.user_email}
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-400">
                    {new Date(ticket.created_at).toLocaleString('ru-RU')}
                  </span>
                  <StatusBadge status={ticket.status} />
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* ═════════ ПРАВАЯ ПАНЕЛЬ ═════════ */}
      <main className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        {!activeTicket ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Выберите тикет из списка
          </div>
        ) : (
          <>
            {/* Шапка тикета */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="font-semibold truncate">{activeTicket.subject}</div>
                <div className="text-xs text-gray-500 truncate">
                  {activeTicket.user_name} · {activeTicket.user_email} · {activeTicket.category}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {!activeTicket.assigned_agent_id && (
                  <button
                    onClick={() => handleAssign(activeTicket)}
                    className="px-3 py-1.5 bg-[#F9AA33] text-white text-xs rounded-lg font-medium"
                  >
                    Взять в работу
                  </button>
                )}
                {!['resolved', 'closed'].includes(activeTicket.status) && (
                  <>
                    <button
                      onClick={handleResolve}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Решён
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg dark:bg-gray-700 dark:text-gray-300"
                    >
                      Закрыть
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Сообщения */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-gray-900/30">
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} isOwn={msg.sender_id === user.id} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Поле ввода */}
            <div className="border-t p-2">
              <label className="flex items-center gap-2 text-xs text-gray-500 mb-1.5 px-1">
                <input
                  type="checkbox"
                  checked={internalNote}
                  onChange={(e) => setInternalNote(e.target.checked)}
                  className="w-3.5 h-3.5"
                />
                Внутренняя заметка (клиент не увидит)
              </label>
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  className="flex-1 px-3 py-2 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 resize-none"
                  placeholder="Ответ клиенту..."
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="px-3 bg-[#4A6572] text-white rounded-lg disabled:opacity-50"
                  aria-label="Отправить"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ============================================================

function Metric({ label, value }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-700/30 rounded p-1">
      <div className="text-sm font-bold">{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

function MessageBubble({ msg, isOwn }) {
  if (msg.sender_role === 'system') {
    return <div className="text-center text-xs text-gray-400 py-1">{msg.content}</div>;
  }
  if (msg.is_internal) {
    return (
      <div className="border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded text-xs">
        <div className="font-medium text-amber-700 dark:text-amber-300 mb-0.5">
          🔒 Внутренняя заметка
        </div>
        <div className="text-gray-700 dark:text-gray-300">{msg.content}</div>
      </div>
    );
  }
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
        isOwn
          ? 'bg-[#4A6572] text-white rounded-br-sm'
          : 'bg-white dark:bg-gray-700 rounded-bl-sm shadow-sm'
      }`}>
        {!isOwn && (
          <div className="text-xs font-medium opacity-80 mb-0.5">{msg.sender_name}</div>
        )}
        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
        <div className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-gray-400'}`}>
          {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    new: { label: 'Новый', cls: 'bg-blue-100 text-blue-700' },
    open: { label: 'Открыт', cls: 'bg-yellow-100 text-yellow-700' },
    pending: { label: 'Ждёт', cls: 'bg-orange-100 text-orange-700' },
    resolved: { label: 'Решён', cls: 'bg-green-100 text-green-700' },
    closed: { label: 'Закрыт', cls: 'bg-gray-100 text-gray-600' },
  };
  const item = map[status] || map.new;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.cls}`}>{item.label}</span>;
}