// src/components/CompanyChat.jsx
import React, { 
  useState, useEffect, useRef, useCallback, useMemo, memo 
} from 'react';
import { 
  Send, Smile, Paperclip, Edit2, Trash2, X, Check, 
  AtSign, Loader2, MessageCircle, Shield, User, AlertCircle
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { 
  logChatAccess, 
  getUserContext, 
  shouldLogFeature 
} from '../utils/auditLogger';

// === Конфигурация ===
// В реальном проекте используйте import.meta.env.VITE_SUPABASE_URL и т.д.
const SUPABASE_URL = 'https://lcfooydickfghjlqpivw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZm9veWRpY2tmZ2hqbHFwaXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjIwMjcsImV4cCI6MjA5MTkzODAyN30.f6TqW2G_nbUeD_wmUc0wJLRiSIw9m95Iwv-BR-FbSb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  global: { headers: { apikey: SUPABASE_ANON_KEY } },
  realtime: { params: { apikey: SUPABASE_ANON_KEY } }
});

// === Константы и Роли ===
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  SUPPLY_ADMIN: 'supply_admin',
  MASTER: 'master',
  USER: 'user' // Default role if not specified
};

const CHANNELS = [
  { id: 'general', label: '# Общий', icon: '💬', description: 'Общие вопросы', roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SUPPLY_ADMIN, ROLES.MASTER, ROLES.USER] },
  { id: 'supply', label: '📦 Снабжение', icon: '📦', description: 'Закупки и материалы', roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SUPPLY_ADMIN, ROLES.MASTER] },
  { id: 'foremen', label: '👷 Прорабы', icon: '👷', description: 'Для прорабов', roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.MASTER] },
  { id: 'announcements', label: '📢 Объявления', icon: '📢', description: 'Важные объявления', adminOnly: true, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SUPPLY_ADMIN] }
];

const REACTION_EMOJIS = Object.freeze(['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '🤔']);

// ─────────────────────────────────────────────────────────────
// 🧩 Helper: Проверка прав доступа
// ─────────────────────────────────────────────────────────────
const canAccessChannel = (channel, userRole) => {
  if (!userRole) return false;
  // Супер-админ имеет доступ ко всему
  if (userRole === ROLES.SUPER_ADMIN) return true;
  
  if (channel.adminOnly) {
    return [ROLES.MANAGER, ROLES.SUPPLY_ADMIN].includes(userRole);
  }
  
  return channel.roles.includes(userRole) || channel.roles.includes(ROLES.USER);
};

const canEditMessage = (msg, userId, userRole) => {
  if (!userId) return false;
  if (msg.user_id === userId) return true; // Автор может редактировать
  if (userRole === ROLES.SUPER_ADMIN) return true; // Супер-админ может редактировать все
  return false;
};

const canDeleteMessage = (msg, userId, userRole) => {
  if (!userId) return false;
  if (msg.user_id === userId) return true;
  if (userRole === ROLES.SUPER_ADMIN) return true;
  if ([ROLES.MANAGER, ROLES.SUPPLY_ADMIN].includes(userRole)) return true; // Менеджеры могут удалять
  return false;
};

// ─────────────────────────────────────────────────────────────
// 🧩 MessageItem Component
// ─────────────────────────────────────────────────────────────
const MessageItem = memo(function MessageItem({ 
  msg, 
  user, 
  userRole,
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
  
  // Права на действия
  const canEdit = canEditMessage(msg, user?.id, userRole);
  const canDelete = canDeleteMessage(msg, user?.id, userRole);

  const reactionCounts = useMemo(() => {
    if (!msg.reactions?.length) return {};
    return msg.reactions.reduce((acc, r) => { 
      acc[r.emoji] = (acc[r.emoji] || 0) + 1; 
      return acc; 
    }, {});
  }, [msg.reactions]);

  return (
    <article className={`group flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0 shadow-sm ${isOwn ? 'order-2' : ''}`}>
        <span className="text-white text-xs font-medium">
          {msg.user?.user_metadata?.full_name?.[0]?.toUpperCase() || '?'}
        </span>
      </div>

      <div className={`max-w-[85%] md:max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
        {/* Header: Name & Role */}
        {!isOwn && !isDeleted && (
          <div className="flex items-center gap-2 mb-1 pl-1">
            <span className="text-xs font-bold text-[#4A6572] dark:text-[#F9AA33]">
              {msg.user?.user_metadata?.full_name || (t?.('chat.user') || 'Пользователь')}
            </span>
            {msg.user?.user_metadata?.role && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                {msg.user.user_metadata.role === 'super_admin' ? 'Admin' : msg.user.user_metadata.role}
              </span>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div className={`relative rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
          isOwn 
            ? 'bg-[#4A6572] text-white rounded-br-md' 
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-gray-100 dark:border-gray-600'
        }`}>
          {isDeleted ? (
            <span className="text-gray-400 dark:text-gray-500 italic text-sm flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> [Удалено]
            </span>
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
                className="flex-1 bg-black/10 dark:bg-white/10 rounded-lg px-2 py-1 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#F9AA33] min-h-[60px]"
                rows={2} 
                autoFocus 
              />
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => onSaveEdit(msg.id)} 
                  className="p-1 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg transition-colors" 
                  title={t?.('chat.save') || 'Сохранить'}
                >
                  <Check className="w-4 h-4" />
                </button>
                <button 
                  onClick={onCancelEdit} 
                  className="p-1 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors" 
                  title={t?.('chat.cancel') || 'Отмена'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {formatMessage?.(msg.content, msg.id)}
            </div>
          )}
        </div>

        {/* Footer: Time & Actions */}
        <div className={`flex items-center gap-2 mt-1 text-xs ${isOwn ? 'justify-end' : ''}`}>
          <time 
            className="text-gray-400 dark:text-gray-500 select-none" 
            dateTime={msg.created_at} 
            title={messageTime.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}
          >
            {formatTime?.(msg.created_at)}
            {isEdited && !isDeleted && <span className="ml-1 opacity-70">{t?.('chat.edited') || '(изм.)'}</span>}
          </time>
          
          {!isDeleted && !isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {/* Reactions Picker Trigger */}
              <div className="relative">
                <button 
                  onClick={() => setShowReactionsPicker?.(showReactionsPicker === msg.id ? null : msg.id)}
                  className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded-full transition-colors"
                  title={t?.('chat.react') || 'Реакция'}
                >
                  <Smile className="w-3.5 h-3.5 text-gray-500" />
                </button>
                
                {/* Reactions Dropdown */}
                {showReactionsPicker === msg.id && (
                  <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-wrap gap-1 z-50 min-w-[220px] animate-in zoom-in-95 duration-200">
                    {REACTION_EMOJIS.map(emoji => {
                      const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
                      return (
                        <button 
                          key={emoji} 
                          onClick={() => onToggleReaction?.(msg.id, emoji)}
                          className={`p-2 rounded-lg transition-all duration-200 text-lg ${
                            hasReacted 
                              ? 'bg-[#4A6572]/10 dark:bg-[#F9AA33]/10 scale-110 ring-2 ring-[#4A6572]/20 dark:ring-[#F9AA33]/20' 
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-110'
                          }`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Edit/Delete Actions (Role Based) */}
              {(canEdit || canDelete) && (
                <div className="flex items-center pl-1 border-l border-gray-300 dark:border-gray-600 ml-1">
                  {canEdit && (
                    <button 
                      onClick={() => onStartEdit?.(msg)} 
                      className="p-1 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded text-blue-500 transition-colors" 
                      title={t?.('chat.edit') || 'Редактировать'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      onClick={() => onDelete?.(msg.id)} 
                      className="p-1 hover:bg-red-100/50 dark:hover:bg-red-900/30 rounded text-red-500 transition-colors" 
                      title={t?.('chat.delete') || 'Удалить'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Active Reactions Display */}
        {Object.keys(reactionCounts).length > 0 && !isEditing && !isDeleted && (
          <div className={`flex flex-wrap gap-1.5 mt-2 ${isOwn ? 'justify-end' : ''}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => {
              const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
              return (
                <button 
                  key={`${msg.id}-${emoji}`}
                  onClick={() => onToggleReaction?.(msg.id, emoji)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all duration-200 border ${
                    hasReacted 
                      ? 'bg-[#4A6572]/10 dark:bg-[#F9AA33]/10 text-[#4A6572] dark:text-[#F9AA33] border-[#4A6572]/30 dark:border-[#F9AA33]/30 shadow-sm' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {emoji} <span className={`opacity-80 ${hasReacted ? 'font-bold' : ''}`}>{count}</span>
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
// 🧩 MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const CompanyChat = ({ user, userCompanyId, userRole, t, language, showNotification }) => {
  // --- State ---
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
  const [connectionStatus, setConnectionStatus] = useState('connected'); // connected, disconnected, error

  // --- Refs ---
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const channelRef = useRef(activeChannel);
  const subscriptionRef = useRef(null);
  const mentionTimerRef = useRef(null);
  const formatCacheRef = useRef(new Map());

  // --- Helpers ---
  const formatTime = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { 
      hour: '2-digit', minute: '2-digit' 
    });
  }, [language]);

  const availableChannels = useMemo(() => 
    CHANNELS.filter(ch => canAccessChannel(ch, userRole)), 
    [userRole]
  );

  // Ensure active channel is valid for role
  useEffect(() => {
    if (!availableChannels.find(ch => ch.id === activeChannel)) {
      setActiveChannel(availableChannels[0]?.id || 'general');
    }
  }, [availableChannels, activeChannel]);

  const formatMessage = useCallback((text, messageId) => {
    if (!text) return null;
    
    // Simple cache to avoid re-parsing same message
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
            className="text-[#4A6572] dark:text-[#F9AA33] underline hover:no-underline font-medium"
          >
            {part}
          </a>
        );
      }
      if (part?.startsWith?.('@')) {
        return (
          <span 
            key={`mention-${i}-${messageId}`} 
            className="font-bold text-[#4A6572] dark:text-[#F9AA33] bg-[#4A6572]/5 dark:bg-[#F9AA33]/5 px-0.5 rounded"
          >
            {part}
          </span>
        );
      }
      return <span key={`text-${i}-${messageId}`}>{part}</span>;
    });
    
    if (formatCacheRef.current.size > 100) formatCacheRef.current.clear();
    formatCacheRef.current.set(cacheKey, result);
    
    return result;
  }, []);

  // --- Effects ---

  // Sync channel ref
  useEffect(() => {
    channelRef.current = activeChannel;
  }, [activeChannel]);

  // Load Users
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

  // Load Messages
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
        user: usersMap[msg.user_id] || { email: null, user_metadata: { full_name: 'Пользователь', role: 'unknown' } },
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

  // Realtime Subscription
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
            user: userRes.data ? { 
              email: null, 
              user_metadata: { full_name: userRes.data.full_name, role: userRes.data.role, phone: userRes.data.phone } 
            } : { email: null, user_metadata: { full_name: 'Пользователь', role: 'unknown' } },
            reactions: reactionsRes.data || []
          };
          setMessages(prev => {
            if (prev.some(m => m.id === enrichedMessage.id)) return prev;
            return [...prev, enrichedMessage];
          });
          // Auto-scroll only if near bottom
          if (messagesEndRef.current) {
             const container = messagesEndRef.current.parentElement;
             if (container && container.scrollHeight - container.scrollTop - container.clientHeight < 100) {
               messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
             }
          }
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
        else setConnectionStatus('disconnected');
      });

    subscriptionRef.current = subscription;
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [userCompanyId, activeChannel]);

  // Audit Log
  useEffect(() => {
    if (userCompanyId && user?.id) {
      const userCtx = getUserContext(user, null, userRole, userCompanyId);
      if (shouldLogFeature('chat', userCompanyId, {})) {
        logChatAccess(supabase, userCtx, 'open')
          .catch(err => console.warn('[CHAT] Аудит не записан:', err));
      }
    }
  }, [userCompanyId, user, userRole]);

  // --- Actions ---

  const sendMessage = useCallback(async () => {
    const content = newMessage.trim();
    if (!content || !user?.id || sending) return;

    const { data: { session } } = await supabase.auth.getSession();
    const safeCompanyId = session?.user?.user_metadata?.company_id || userCompanyId;
    
    if (!safeCompanyId) {
      showNotification?.('Ошибка: компания не указана', 'error');
      return;
    }

    setSending(true);
    try {
      // Detect mentions
      const mentionRegex = /@([^\s,;!?.]+)/g;
      const mentions = [...content.matchAll(mentionRegex)].map(m => m[1].toLowerCase());
      const mentionedUsers = companyUsers.filter(u => 
        mentions.includes(u.full_name?.toLowerCase().replace(/\s+/g, ''))
      );

      const { data, error } = await supabase
        .from('company_messages')
        .insert([{
          company_id: safeCompanyId,
          channel: activeChannel,
          user_id: user.id,
          content: content,
          attachments: [],
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // Save mentions
      if (mentionedUsers.length > 0 && data?.id) {
        await supabase.from('message_mentions').insert(
          mentionedUsers.map(u => ({
            message_id: data.id,
            mentioned_user_id: u.user_id,
            created_at: new Date().toISOString()
          }))
        ).throwOnError();
      }

      // Audit
      try {
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
    
    // Auto-resize
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
    if (e.key === 'Escape') {
      setShowMentions(false);
      setShowReactionsPicker(null);
      if (editingMessageId) cancelEdit();
    }
  }, [editingMessageId, sendMessage]);

  const startEdit = useCallback((message) => {
    if (!canEditMessage(message, user?.id, userRole)) return;
    setEditingMessageId(message.id);
    setEditText(message.content);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, [user?.id, userRole]);

  const saveEdit = useCallback(async (messageId) => {
    const content = editText.trim();
    if (!content) return;
    try {
      const { error } = await supabase
        .from('company_messages')
        .update({ content: content, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', user?.id); // Security check
      
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
      // Soft delete
      const { error } = await supabase
        .from('company_messages')
        .update({ content: '[Удалено]', deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        // Note: Admins might need to bypass user_id check in RLS or via RPC, 
        // but for now we rely on RLS policy allowing admins to update any row
        // If RLS is strict, you might need a separate RPC function for admin deletes
        
      if (error) throw error;
      showNotification?.(t?.('chat.deleted') || 'Сообщение удалено', 'info');
    } catch (err) {
      console.error('❌ Delete error:', err);
      showNotification?.(t?.('chat.deleteError') || 'Ошибка удаления', 'error');
    }
  }, [showNotification, t]);

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

    const maxSize = 10 * 1024 * 1024; // 10MB
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

  // --- Render ---
  const currentChannel = CHANNELS.find(c => c.id === activeChannel);

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden font-sans">
      
      {/* Sidebar (Desktop) */}
      <aside className="w-64 border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 p-4 hidden md:flex flex-col">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 px-2 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          {t?.('chat.channels') || 'Каналы'}
        </h3>
        <nav className="space-y-1 flex-1 overflow-y-auto">
          {availableChannels.map(channel => {
            const isActive = activeChannel === channel.id;
            return (
              <button 
                key={channel.id} 
                onClick={() => setActiveChannel(channel.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-all duration-200 ${
                  isActive 
                    ? 'bg-[#4A6572] text-white shadow-md shadow-[#4A6572]/20' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className="text-lg">{channel.icon}</span>
                <span className="truncate flex-1">{channel.label}</span>
                {channel.adminOnly && (
                  <Shield className="w-3 h-3 opacity-70" />
                )}
              </button>
            );
          })}
        </nav>
        
        {/* Connection Status */}
        <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 px-2">
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
              connectionStatus === 'loading' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              {connectionStatus === 'connected' 
                ? (t?.('chat.online') || 'Онлайн') 
                : connectionStatus === 'loading' 
                  ? (t?.('chat.connecting') || 'Подключение...') 
                  : (t?.('chat.offline') || 'Оффлайн')}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white/50 dark:bg-gray-800/50">
        
        {/* Header */}
        <header className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between bg-white/80 dark:bg-gray-800/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Channel Selector */}
            <div className="md:hidden">
              <select 
                value={activeChannel} 
                onChange={(e) => setActiveChannel(e.target.value)}
                className="text-sm bg-gray-100 dark:bg-gray-700 border-none rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-[#4A6572]"
              >
                {availableChannels.map(ch => (
                  <option key={ch.id} value={ch.id}>{ch.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-2xl bg-gray-100 dark:bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center shadow-inner">
                {currentChannel?.icon}
              </span>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white leading-tight">
                  {currentChannel?.label}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  {currentChannel?.description}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{messages.length}</span>
          </div>
        </header>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth" data-chat-messages>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#4A6572] dark:text-[#F9AA33]" />
              <span className="text-sm text-gray-500 font-medium">{t?.('chat.loading') || 'Загрузка...'}</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-medium text-lg">{t?.('chat.noMessages') || 'Нет сообщений'}</p>
              <p className="text-sm mt-1 opacity-70">{t?.('chat.startDiscussion') || 'Начните обсуждение!'}</p>
            </div>
          ) : (
            messages.map(msg => (
              <MessageItem
                key={msg.id}
                msg={msg}
                user={user}
                userRole={userRole}
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
          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* Mentions Dropdown */}
        {showMentions && filteredMentions.length > 0 && (
          <div className="absolute bottom-24 left-4 right-4 md:left-auto md:right-8 md:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
            <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <AtSign className="w-3.5 h-3.5" />
                <span>{t?.('chat.selectUser') || 'Выберите пользователя'}</span>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filteredMentions.map(u => (
                <button 
                  key={u.user_id} 
                  onClick={() => insertMention(u.full_name)}
                  className="w-full text-left px-3 py-2.5 hover:bg-[#4A6572]/5 dark:hover:bg-[#F9AA33]/5 rounded-lg flex items-center gap-3 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm">
                    {u.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-[#4A6572] dark:group-hover:text-[#F9AA33] transition-colors">
                      {u.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {u.role} {u.phone && <span className="opacity-50">• {u.phone}</span>}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            {/* Attach File Button */}
            <label 
              className={`p-3 rounded-xl cursor-pointer transition-all duration-200 flex-shrink-0 ${
                uploadingFile 
                  ? 'bg-gray-100 dark:bg-gray-700 cursor-wait text-gray-400' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-[#4A6572] dark:hover:text-[#F9AA33]'
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

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea 
                ref={textareaRef} 
                value={newMessage} 
                onChange={handleTextareaChange} 
                onKeyDown={handleKeyDown}
                placeholder={t?.('chat.placeholder') || 'Введите сообщение...'}
                className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700/50 border border-transparent focus:border-[#4A6572] dark:focus:border-[#F9AA33] rounded-xl focus:ring-0 resize-none text-sm transition-all placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white shadow-inner"
                rows={1} 
                style={{ minHeight: '48px', maxHeight: '120px' }} 
              />
              {newMessage.length > 0 && (
                <span className="absolute bottom-2 right-3 text-[10px] text-gray-400 font-mono">
                  {newMessage.length}/1000
                </span>
              )}
            </div>

            {/* Send Button */}
            <button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || sending || uploadingFile}
              className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0 shadow-lg ${
                !newMessage.trim() || sending || uploadingFile
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-[#4A6572]/30 hover:scale-105 active:scale-95'
              }`}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* Hints */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium justify-center md:justify-start">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-sans">Enter</kbd> 
              <span>отправить</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-sans">Shift+Enter</kbd> 
              <span>новая строка</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 font-sans">@</kbd> 
              <span>упомянуть</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(CompanyChat);