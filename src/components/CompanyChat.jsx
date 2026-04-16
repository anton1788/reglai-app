// src/components/CompanyChat.jsx
import React, { 
  useState, useEffect, useRef, useCallback, useMemo, memo 
} from 'react';
import { 
  Send, Smile, Paperclip, Edit2, Trash2, X, Check, 
  AtSign, Loader2, MessageCircle
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
// ✅ ИМПОРТ для Feature Adoption логирования
import { 
  logChatAccess, 
  getUserContext, 
  shouldLogFeature 
} from '../utils/auditLogger';

// === Конфигурация ===
const SUPABASE_URL = 'https://lcfooydickfghjlqpivw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZm9veWRpY2tmZ2hqbHFwaXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjIwMjcsImV4cCI6MjA5MTkzODAyN30.f6TqW2G_nbUeD_wmUc0wJLRiSIw9m95Iwv-BR-FbSb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  global: { headers: { apikey: SUPABASE_ANON_KEY } },
  realtime: { params: { apikey: SUPABASE_ANON_KEY } }
});

// ✅ Константы — определены ПЕРЕД любыми компонентами
const CHANNELS = [
  { id: 'general', label: '# Общий', icon: '💬', description: 'Общие вопросы' },
  { id: 'supply', label: '📦 Снабжение', icon: '📦', description: 'Закупки и материалы' },
  { id: 'foremen', label: '👷 Прорабы', icon: '👷', description: 'Для прорабов' },
  { id: 'announcements', label: '📢 Объявления', icon: '📢', adminOnly: true, description: 'Важные объявления' }
];

const REACTION_EMOJIS = Object.freeze(['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '🤔']);
const MESSAGES_LIMIT = 50;

// ─────────────────────────────────────────────────────────────
// 🧩 MessageItem — БЕЗ кастомной функции сравнения
// ─────────────────────────────────────────────────────────────
const MessageItem = memo(function MessageItem({ 
  msg, 
  user, 
  isOwn, 
  isEditing, 
  editText, 
  onStartEdit, 
  onSaveEdit, 
  onCancelEdit, 
  onDelete, 
  onToggleReaction, 
  showReactionsPicker, 
  setShowReactionsPicker, 
  formatMessage, 
  formatTime, 
  t, 
  language,
  textareaRef 
}) {
  const isDeleted = msg.deleted_at;
  const isEdited = msg.edited_at;
  const messageTime = new Date(msg.created_at);
  
  const reactionCounts = useMemo(() => {
    if (!msg.reactions?.length) return {};
    return msg.reactions.reduce((acc, r) => { 
      acc[r.emoji] = (acc[r.emoji] || 0) + 1; 
      return acc; 
    }, {});
  }, [msg.reactions]);

  return (
    <article className={`group flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0 ${isOwn ? 'order-2' : ''}`}>
        <span className="text-white text-xs font-medium">
          {msg.user?.user_metadata?.full_name?.[0]?.toUpperCase() || '?'}
        </span>
      </div>
      <div className={`max-w-[85%] md:max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
        {!isOwn && !isDeleted && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-[#4A6572] dark:text-[#F9AA33]">
              {msg.user?.user_metadata?.full_name || (t?.('chat.user') || 'Пользователь')}
            </span>
            {msg.user?.user_metadata?.role && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                • {msg.user.user_metadata.role}
              </span>
            )}
          </div>
        )}
        <div className={`rounded-2xl px-4 py-2.5 ${
          isOwn 
            ? 'bg-[#4A6572] text-white rounded-br-md' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
        }`}>
          {isDeleted ? (
            <span className="text-gray-400 dark:text-gray-500 italic text-sm">[Удалено]</span>
          ) : isEditing ? (
            <div className="flex gap-2 items-start">
              <textarea 
                ref={textareaRef} 
                value={editText}
                onChange={(e) => onStartEdit({ ...msg, message: e.target.value })} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSaveEdit(msg.id);
                  }
                  if (e.key === 'Escape') onCancelEdit();
                }}
                className="flex-1 bg-white/20 dark:bg-gray-600/50 rounded-lg px-2 py-1 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#F9AA33] min-h-[60px]"
                rows={2} 
                autoFocus 
              />
              <div className="flex gap-1">
                <button 
                  onClick={() => onSaveEdit(msg.id)} 
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" 
                  title={t?.('chat.save') || 'Сохранить'}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button 
                  onClick={onCancelEdit} 
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" 
                  title={t?.('chat.cancel') || 'Отмена'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {formatMessage?.(msg.content, msg.id)}
            </p>
          )}
        </div>
        <div className={`flex items-center gap-2 mt-1 text-xs ${isOwn ? 'justify-end' : ''}`}>
          <time 
            className="text-gray-400 dark:text-gray-500" 
            dateTime={msg.created_at} 
            title={messageTime.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}
          >
            {formatTime?.(msg.created_at)}
            {isEdited && !isDeleted && <span className="ml-1 italic">{t?.('chat.edited') || '(изм.)'}</span>}
          </time>
          {!isDeleted && !isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative">
                <button 
                  onClick={() => setShowReactionsPicker?.(showReactionsPicker === msg.id ? null : msg.id)}
                  className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded transition-colors"
                  title={t?.('chat.react') || 'Реакция'}
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>
                {showReactionsPicker === msg.id && (
                  <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 flex flex-wrap gap-1 z-20 min-w-[200px]">
                    {REACTION_EMOJIS.map(emoji => {
                      const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
                      return (
                        <button 
                          key={emoji} 
                          onClick={() => onToggleReaction?.(msg.id, emoji)}
                          className={`p-1.5 rounded-lg transition-colors text-lg ${
                            hasReacted 
                              ? 'bg-[#4A6572]/10 dark:bg-[#F9AA33]/10 scale-110' 
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {isOwn && (
                <>
                  <button 
                    onClick={() => onStartEdit?.(msg)} 
                    className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded transition-colors" 
                    title={t?.('chat.edit') || 'Редактировать'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => onDelete?.(msg.id)} 
                    className="p-1 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded transition-colors text-red-500" 
                    title={t?.('chat.delete') || 'Удалить'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {/* Реакции */}
        {Object.keys(reactionCounts).length > 0 && !isEditing && !isDeleted && (
          <div className={`flex flex-wrap gap-1 mt-2 ${isOwn ? 'justify-end' : ''}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => {
              const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
              return (
                <button 
                  key={`${msg.id}-${emoji}`}
                  onClick={() => onToggleReaction?.(msg.id, emoji)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors ${
                    hasReacted 
                      ? 'bg-[#4A6572]/20 dark:bg-[#F9AA33]/20 text-[#4A6572] dark:text-[#F9AA33] border border-[#4A6572]/30' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {emoji} <span className="opacity-75">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
});

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────
const CompanyChat = ({ user, userCompanyId, userRole, t, language, showNotification }) => {
  // ───────── STATE ─────────
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState('general');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showReactionsPicker, setShowReactionsPicker] = useState(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [companyUsers, setCompanyUsers] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');

  // ───────── REFS ─────────
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const channelRef = useRef(activeChannel);
  const subscriptionRef = useRef(null);
  const mentionTimerRef = useRef(null);
  const formatCacheRef = useRef(new Map());

  // ───────── HELPERS ─────────
  const formatTime = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { 
      hour: '2-digit', minute: '2-digit' 
    });
  }, [language]);

  const isChannelAvailable = useCallback((channel) => {
    if (!channel.adminOnly) return true;
    return userRole === 'manager' || userRole === 'supply_admin' || userRole === 'super_admin';
  }, [userRole]);

  const availableChannels = useMemo(() => 
    CHANNELS.filter(isChannelAvailable), 
    [isChannelAvailable]
  );

  const formatMessage = useCallback((text, messageId) => {
    if (!text) return null;
    
    const cacheKey = `${messageId}_${text.length}`;
    const cached = formatCacheRef.current.get(cacheKey);
    if (cached) return cached;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    const result = parts.map((part, i) => {
      if (part?.match?.(urlRegex)) {
        return (
          <a 
            key={`url-${i}-${messageId}`} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#4A6572] dark:text-[#F9AA33] underline hover:no-underline"
          >
            {part}
          </a>
        );
      }
      if (part?.startsWith?.('@')) {
        return (
          <span 
            key={`mention-${i}-${messageId}`} 
            className="font-medium text-[#4A6572] dark:text-[#F9AA33]"
          >
            {part}
          </span>
        );
      }
      return <span key={`text-${i}-${messageId}`}>{part}</span>;
    });
    
    if (formatCacheRef.current.size > 100) {
      const firstKey = formatCacheRef.current.keys().next().value;
      formatCacheRef.current.delete(firstKey);
    }
    formatCacheRef.current.set(cacheKey, result);
    
    return result;
  }, []);

  // ───────── EFFECTS ─────────
  useEffect(() => {
    channelRef.current = activeChannel;
  }, [activeChannel]);

  // Загрузка пользователей
  useEffect(() => {
    if (!userCompanyId) return;
    let mounted = true;
    
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('company_users')
          .select('user_id, full_name, role, phone')
          .eq('company_id', userCompanyId)
          .eq('is_active', true)
          .order('full_name', { ascending: true });
        
        if (error) throw error;
        if (mounted) setCompanyUsers(data || []);
      } catch (err) {
        console.error('❌ Error loading users:', err);
      }
    };
    
    loadUsers();
    return () => { mounted = false; };
  }, [userCompanyId]);

  // Загрузка сообщений
  const loadMessages = useCallback(async () => {
    if (!userCompanyId) return;
    setLoading(true);
    try {
      const { data: messagesData, error: msgError } = await supabase
        .from('company_messages')
        .select('*')
        .eq('company_id', userCompanyId)
        .eq('channel', channelRef.current)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (msgError) throw msgError;
      
      const messageIds = messagesData?.map(m => m.id) || [];
      let reactionsMap = {};
      
      if (messageIds.length > 0) {
        const { data: reactionsData } = await supabase
          .from('message_reactions')
          .select('message_id, emoji, user_id')
          .in('message_id', messageIds);
        
        if (reactionsData) {
          reactionsMap = reactionsData.reduce((acc, r) => {
            if (!acc[r.message_id]) acc[r.message_id] = [];
            acc[r.message_id].push({ emoji: r.emoji, user_id: r.user_id });
            return acc;
          }, {});
        }
      }
      
      const userIds = [...new Set(messagesData?.map(m => m.user_id).filter(Boolean))];
      let usersMap = {};
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('company_users')
          .select('user_id, full_name, role, phone')
          .in('user_id', userIds)
          .eq('company_id', userCompanyId);
        
        usersMap = (usersData || []).reduce((acc, u) => {
          acc[u.user_id] = { 
            email: null, 
            user_metadata: { full_name: u.full_name, role: u.role, phone: u.phone } 
          };
          return acc;
        }, {});
      }
      
      const enrichedMessages = (messagesData || []).map(msg => ({
        ...msg,
        user: usersMap[msg.user_id] || { email: null, user_metadata: { full_name: 'Пользователь' } },
        reactions: reactionsMap[msg.id] || []
      }));
      
      setMessages(enrichedMessages);
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
      showNotification?.(t?.('chat.sendMessageError') || 'Ошибка загрузки чата', 'error');
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, showNotification, t]);

  useEffect(() => {
    loadMessages();
  }, [activeChannel, loadMessages]);

  // Realtime подписка
  useEffect(() => {
    if (!userCompanyId || !activeChannel) return;
    
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    const channelName = `chat:${userCompanyId}:${activeChannel}`;
    
    const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'company_messages',
        filter: `company_id=eq.${userCompanyId} AND channel=eq.${activeChannel}`
      }, async (payload) => {
        if (payload.new?.deleted_at) return;
        try {
          const [reactionsRes, userRes] = await Promise.all([
            supabase.from('message_reactions').select('emoji, user_id').eq('message_id', payload.new.id),
            supabase.from('company_users').select('full_name, role, phone').eq('user_id', payload.new.user_id).maybeSingle()
          ]);
          const enrichedMessage = {
            ...payload.new,
            user: userRes.data || { full_name: 'Пользователь', role: 'unknown' },
            reactions: reactionsRes.data || []
          };
          setMessages(prev => {
            if (prev.some(m => m.id === enrichedMessage.id)) return prev;
            return [...prev, enrichedMessage];
          });
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
          console.error('❌ Error processing new message:', err);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'company_messages',
        filter: `company_id=eq.${userCompanyId}`
      }, (payload) => {
        setMessages(prev => prev.map(m => 
          m.id === payload.new.id ? { ...m, ...payload.new } : m
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'message_reactions'
      }, (payload) => {
        setMessages(prev => prev.map(m => ({
          ...m,
          reactions: m.reactions?.filter(r => 
            !(r.message_id === payload.old?.message_id && r.user_id === payload.old?.user_id)
          ) || []
        })));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected');
        else if (status === 'CHANNEL_ERROR') setConnectionStatus('error');
      });

    subscriptionRef.current = subscription;
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [userCompanyId, activeChannel]);

  // Автоскролл
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ✅ FEATURE ADOPTION: логируем использование чата с дебаунсом
useEffect(() => {
  if (userCompanyId && user?.id) {
    const userCtx = getUserContext(user, null, userRole, userCompanyId);
    
    if (shouldLogFeature('chat', userCompanyId, {})) {
      logChatAccess(supabase, userCtx, 'open')
        .catch(err => console.warn('[CHAT] Аудит не записан:', err));
    }
  }
}, [userCompanyId, user, userRole, supabase]);

  const sendMessage = useCallback(async () => {
  const content = newMessage.trim();
  if (!content || !user?.id || sending) return;

  // ✅ Получаем company_id из сессии
  const { data: { session } } = await supabase.auth.getSession();
  const safeCompanyId = session?.user?.user_metadata?.company_id || userCompanyId;
  
  if (!safeCompanyId) {
    showNotification?.('Ошибка: компания не указана', 'error');
    return;
  }

  setSending(true);
  try {
    const mentionRegex = /@([^\s,;!?.]+)/g;
    const mentions = [...content.matchAll(mentionRegex)].map(m => m[1].toLowerCase());
    const mentionedUsers = companyUsers.filter(u => 
      mentions.includes(u.full_name?.toLowerCase().replace(/\s+/g, ''))
    );

    // ✅ ИСПРАВЛЕНО: используем 'content' вместо 'message'
    const { data, error } = await supabase
      .from('company_messages')
      .insert([{
        company_id: safeCompanyId,
        channel: activeChannel,
        user_id: user.id,
        content: content,  // ← ИСПРАВЛЕНО!
        attachments: [],
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Упоминания
    if (mentionedUsers.length > 0 && data?.id) {
      await supabase.from('message_mentions').insert(
        mentionedUsers.map(u => ({
          message_id: data.id,
          mentioned_user_id: u.user_id,
          created_at: new Date().toISOString()
        }))
      );
    }

    // ✅ Аудит
    try {
      const { logChatAccess } = await import('../utils/auditLogger');
      const { getUserContext } = await import('../utils/auditLogger');
      const userCtx = getUserContext(user, null, userRole, safeCompanyId);
      await logChatAccess(supabase, userCtx, 'send_message');
    } catch (auditErr) {
      console.warn('[CHAT] Аудит не записан:', auditErr);
    }

    setNewMessage('');
    setShowMentions(false);
    textareaRef.current?.focus();
    
  } catch (err) {
    console.error('❌ Send error:', err);
    
    // 🔍 Детальная отладка
    if (err?.code === '23502') {
      showNotification?.('Ошибка: поле content не может быть пустым', 'error');
    } else if (err?.code === '23503') {
      showNotification?.('Ошибка: компания не найдена', 'error');
    } else {
      showNotification?.(t?.('chat.sendError') || 'Не удалось отправить', 'error');
    }
  } finally {
    setSending(false);
  }
}, [newMessage, user, userCompanyId, activeChannel, companyUsers, sending, showNotification, t, userRole]);
  const handleTextareaChange = useCallback((e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (value.includes('@')) {
      if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
      mentionTimerRef.current = setTimeout(() => {
        const match = value.match(/@([^\s,;!?.]+)$/);
        if (match) {
          setShowMentions(true);
          setMentionQuery(match[0]);
        } else {
          setShowMentions(false);
        }
      }, 100);
    } else {
      setShowMentions(false);
    }
    
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        saveEdit(editingMessageId);
      } else {
        sendMessage();
      }
      return;
    }
    if (e.key === '@' && !showMentions) {
      setShowMentions(true);
      setMentionQuery('@');
    }
    if (e.key === 'Escape') {
      setShowMentions(false);
      setShowReactionsPicker(null);
      if (editingMessageId) cancelEdit();
    }
  }, [editingMessageId, showMentions, sendMessage]);

  const startEdit = useCallback((message) => {
    if (message.user_id !== user?.id) return;
    setEditingMessageId(message.id);
    setEditText(message.content);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [user?.id]);

  const saveEdit = useCallback(async (messageId) => {
    const content = editText.trim();
    if (!content) return;
    try {
      const { error } = await supabase
        .from('company_messages')
        .update({ content: content, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', user?.id);
      
      if (error) throw error;
      setEditingMessageId(null);
      setEditText('');
      showNotification?.(t?.('chat.messageUpdated') || 'Сообщение обновлено', 'success');
    } catch (err) {
      console.error('❌ Edit error:', err);
      showNotification?.(t?.('chat.editError') || 'Ошибка редактирования', 'error');
    }
  }, [editText, user?.id, showNotification, t]);

  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditText('');
  }, []);

  const deleteMessage = useCallback(async (messageId) => {
    if (!window.confirm(t?.('chat.confirmDelete') || 'Удалить сообщение?')) return;
    try {
      const { error } = await supabase
        .from('company_messages')
        .update({ content: '[Удалено]', deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', user?.id);
      
      if (error) throw error;
      showNotification?.(t?.('chat.deleted') || 'Сообщение удалено', 'info');
    } catch (err) {
      console.error('❌ Delete error:', err);
      showNotification?.(t?.('chat.deleteError') || 'Ошибка удаления', 'error');
    }
  }, [user?.id, showNotification, t]);

  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!user?.id) return;
    const message = messages.find(m => m.id === messageId);
    const hasReaction = message?.reactions?.some(r => r.emoji === emoji && r.user_id === user.id);

    try {
      if (hasReaction) {
        await supabase.from('message_reactions').delete()
          .eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji);
      } else {
        await supabase.from('message_reactions').insert([{ 
          message_id: messageId, user_id: user.id, emoji,
          created_at: new Date().toISOString()
        }]);
      }
    } catch (err) {
      console.error('❌ Reaction error:', err);
      showNotification?.(t?.('chat.reactionError') || 'Ошибка реакции', 'error');
    }
    setShowReactionsPicker(null);
  }, [user?.id, messages, showNotification, t]);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userCompanyId) return;

    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 
                          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (file.size > maxSize) {
      showNotification?.(t?.('chat.fileTooLarge') || 'Файл слишком большой (макс. 10MB)', 'error');
      e.target.value = '';
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      showNotification?.(t?.('chat.fileTypeNotAllowed') || 'Недопустимый тип файла', 'error');
      e.target.value = '';
      return;
    }

    setUploadingFile(true);
    try {
      const fileName = `${userCompanyId}/${Date.now()}_${file.name.replace(/[^a-z0-9.-]/gi, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, { upsert: false });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);
      
      const fileLink = `\n📎 [${file.name}](${publicUrl})`;
      setNewMessage(prev => prev + fileLink);
      showNotification?.(t?.('chat.fileAttached') || 'Файл прикреплён', 'success');
    } catch (err) {
      console.error('❌ Upload error:', err);
      showNotification?.(t?.('chat.uploadError') || 'Не удалось загрузить файл', 'error');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  }, [userCompanyId, showNotification, t]);

  const filteredMentions = useMemo(() => {
    if (!mentionQuery.trim() || mentionQuery === '@') return companyUsers.slice(0, 5);
    const query = mentionQuery.toLowerCase().replace('@', '').trim();
    return companyUsers.filter(u => u.full_name?.toLowerCase().includes(query)).slice(0, 5);
  }, [mentionQuery, companyUsers]);

  const insertMention = useCallback((userName) => {
    setNewMessage(prev => {
      const regex = /@([^\s]*)$/;
      return prev.replace(regex, `@${userName} `);
    });
    setShowMentions(false);
    setMentionQuery('');
    textareaRef.current?.focus();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
      formatCacheRef.current.clear();
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  // ───────── RENDER ─────────
  const currentChannel = CHANNELS.find(c => c.id === activeChannel);

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-48 border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 p-3 hidden md:block">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
          {t?.('chat.channels') || 'Каналы'}
        </h3>
        <nav className="space-y-1">
          {availableChannels.map(channel => {
            const isActive = activeChannel === channel.id;
            return (
              <button 
                key={channel.id} 
                onClick={() => setActiveChannel(channel.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${
                  isActive 
                    ? 'bg-[#4A6572]/10 dark:bg-[#F9AA33]/10 text-[#4A6572] dark:text-[#F9AA33] shadow-sm' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className="text-base">{channel.icon}</span>
                <span className="truncate flex-1">{channel.label}</span>
                {channel.adminOnly && (
                  <span className="text-[10px] bg-[#F9AA33]/20 text-[#F9AA33] px-1.5 py-0.5 rounded">ADM</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50 px-2">
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'loading' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-gray-500 dark:text-gray-400">
              {connectionStatus === 'connected' 
                ? (t?.('chat.online') || 'Онлайн') 
                : connectionStatus === 'loading' 
                  ? (t?.('chat.connecting') || 'Подключение...') 
                  : (t?.('chat.offline') || 'Оффлайн')}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between bg-white/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 md:hidden">
            <select 
              value={activeChannel} 
              onChange={(e) => setActiveChannel(e.target.value)}
              className="text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1"
            >
              {availableChannels.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xl">{currentChannel?.icon}</span>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">{currentChannel?.label}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                {currentChannel?.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <MessageCircle className="w-4 h-4" />
            <span>{messages.length} {t?.('chat.messages') || 'сообщений'}</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-chat-messages>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#4A6572]" />
              <span className="text-sm text-gray-500">{t?.('chat.loading') || 'Загрузка...'}</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">{t?.('chat.noMessages') || 'Нет сообщений'}</p>
              <p className="text-sm mt-1">{t?.('chat.startDiscussion') || 'Начните обсуждение!'}</p>
            </div>
          ) : (
            messages.map(msg => (
              <MessageItem
                key={msg.id}
                msg={msg}
                user={user}
                isOwn={msg.user_id === user?.id}
                isEditing={editingMessageId === msg.id}
                editText={editText}
                onStartEdit={startEdit}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onDelete={deleteMessage}
                onToggleReaction={toggleReaction}
                showReactionsPicker={showReactionsPicker}
                setShowReactionsPicker={setShowReactionsPicker}
                formatMessage={formatMessage}
                formatTime={formatTime}
                t={t}
                language={language}
                textareaRef={textareaRef}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Mentions Dropdown */}
        {showMentions && filteredMentions.length > 0 && (
          <div className="absolute bottom-28 left-4 right-4 md:left-auto md:right-8 md:w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 z-30 overflow-hidden">
            <div className="p-2 border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <AtSign className="w-4 h-4" />
                <span>{t?.('chat.selectUser') || 'Выберите пользователя'}</span>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {filteredMentions.map(u => (
                <button 
                  key={u.user_id} 
                  onClick={() => insertMention(u.full_name)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center gap-3 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-[#4A6572]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-[#4A6572] dark:text-[#F9AA33]">
                      {u.full_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {u.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {u.role} {u.phone && `• ${u.phone}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
          <div className="flex items-end gap-2">
            <label 
              className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                uploadingFile 
                  ? 'bg-gray-200 dark:bg-gray-700 cursor-wait' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300'
              }`} 
              title={t?.('chat.attachFile') || 'Прикрепить файл'}
            >
              {uploadingFile ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
              <input 
                type="file" 
                onChange={handleFileUpload} 
                disabled={uploadingFile} 
                className="hidden" 
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" 
              />
            </label>
            <div className="flex-1 relative">
              <textarea 
                ref={textareaRef} 
                value={newMessage} 
                onChange={handleTextareaChange} 
                onKeyDown={handleKeyDown}
                placeholder={t?.('chat.placeholder') || 'Введите сообщение... (Shift+Enter — новая строка)'}
                className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent resize-none text-sm transition-all placeholder-gray-400 dark:placeholder-gray-500"
                rows={1} 
                style={{ minHeight: '44px', maxHeight: '120px' }} 
              />
              {newMessage.length > 0 && (
                <span className="absolute bottom-1 right-2 text-[10px] text-gray-400">
                  {newMessage.length}/1000
                </span>
              )}
            </div>
            <button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || sending || uploadingFile}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                !newMessage.trim() || sending || uploadingFile
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-lg active:scale-95'
              }`}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400 dark:text-gray-500">
            <span>
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> — отправить
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Shift+Enter</kbd> — новая строка
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">@</kbd> — упомянуть
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(CompanyChat);