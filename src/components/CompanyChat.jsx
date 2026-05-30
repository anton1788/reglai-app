// src/components/CompanyChat.jsx
import React, { 
  useState, useEffect, useRef, useCallback, useMemo, memo 
} from 'react';
import { 
  Send, Smile, Paperclip, Edit2, Trash2, X, Check, Clock,
  AtSign, Loader2, MessageCircle, File, CheckCheck, Volume2, VolumeX,
  Search, PlusCircle, Users, Image, Camera, Link, Pin, Flag,
  Reply, Copy, Share2, MoreVertical, Bookmark, Bell, BellOff
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
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

// Расширенные каналы с ролевым доступом
const CHANNELS = [
  { id: 'general', label: '# Общий', icon: '💬', description: 'Общие вопросы для всех', allowedRoles: null },
  { id: 'supply', label: '📦 Снабжение', icon: '📦', description: 'Закупки, поставки, склад', allowedRoles: ['supply_admin', 'manager', 'director', 'super_admin'] },
  { id: 'foremen', label: '👷 Прорабы', icon: '👷', description: 'Оперативная связь с прорабами', allowedRoles: ['master', 'foreman', 'supply_admin', 'manager', 'director'] },
  { id: 'announcements', label: '📢 Объявления', icon: '📢', description: 'Важные объявления руководства', allowedRoles: ['manager', 'supply_admin', 'director', 'super_admin'] },
  { id: 'finance', label: '💰 Финансы', icon: '💰', description: 'Бюджет, сметы, оплаты', allowedRoles: ['accountant', 'manager', 'director', 'super_admin'] }
];

const REACTION_EMOJIS = Object.freeze(['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '🤔']);
const MESSAGES_PER_PAGE = 50;

// ─────────────────────────────────────────────────────────────
// 🧩 Компонент предпросмотра изображений
// ─────────────────────────────────────────────────────────────
const ImagePreview = ({ url, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100000] fade-enter" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh]">
        <img src={url} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70">
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🧩 MessageItem — полная версия
// ─────────────────────────────────────────────────────────────
const MessageItem = memo(function MessageItem({ 
  msg, user, isOwn, isEditing, editText, onStartEdit, onSaveEdit, onCancelEdit,
  onDelete, onToggleReaction, showReactionsPicker, setShowReactionsPicker,
  formatMessage, formatTime, t, language, textareaRef, readStatusMap,
  onMarkAsRead, canModerate, onCreateTask, onReply, onCopy, onPin,
  isPinned, replyingTo, replyingToMessage
}) {
  const isDeleted = msg.deleted_at;
  const isEdited = msg.edited_at;
  const messageTime = new Date(msg.created_at);
  const messageRef = useRef(null);
  const [showImagePreview, setShowImagePreview] = useState(null);
  
  // Отметка прочтения
  useEffect(() => {
    if (!messageRef.current || isOwn || isDeleted) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !msg.read_by_user) {
            onMarkAsRead?.(msg.id);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(messageRef.current);
    return () => observer.disconnect();
  }, [msg.id, isOwn, isDeleted, msg.read_by_user, onMarkAsRead]);

  const reactionCounts = useMemo(() => {
    if (!msg.reactions?.length) return {};
    return msg.reactions.reduce((acc, r) => { 
      acc[r.emoji] = (acc[r.emoji] || 0) + 1; 
      return acc; 
    }, {});
  }, [msg.reactions]);

  const readCount = readStatusMap?.[msg.id] || 0;
  const images = msg.attachments?.filter(a => a.type?.startsWith('image/')) || [];

  return (
    <>
      <article ref={messageRef} className={`group flex gap-3 animate-fade-in ${isOwn ? 'flex-row-reverse' : ''}`}>
        {/* Аватар */}
        <div className={`relative flex-shrink-0 ${isOwn ? 'order-2 ml-2' : 'mr-2'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-transform group-hover:scale-105 ${
            isOwn ? 'bg-gradient-to-br from-[#F9AA33] to-[#F57C00] text-gray-900' : 'bg-gradient-to-br from-[#4A6572] to-[#344955] text-white'
          }`}>
            {msg.user?.user_metadata?.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          {msg.user?.user_metadata?.role === 'manager' && (
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800" title="Менеджер" />
          )}
        </div>

        <div className={`max-w-[85%] md:max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
          {/* Информация об ответе на сообщение */}
          {replyingTo && (
            <div className="mb-1 text-xs text-gray-400 flex items-center gap-1">
              <Reply className="w-3 h-3" />
              <span>Ответ на сообщение от {replyingToMessage?.user?.user_metadata?.full_name}</span>
            </div>
          )}

          {/* Имя пользователя */}
          {!isOwn && !isDeleted && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-[#4A6572] dark:text-[#F9AA33]">
                {msg.user?.user_metadata?.full_name || (t?.('chat.user') || 'Пользователь')}
              </span>
              {msg.user?.user_metadata?.role && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">• {msg.user.user_metadata.role}</span>
              )}
            </div>
          )}

          {/* Закреплённое сообщение */}
          {isPinned && (
            <div className="mb-1 text-[10px] text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
              <Pin className="w-3 h-3" /> Закреплено
            </div>
          )}

          {/* Основной контент */}
          <div className={`rounded-2xl px-4 py-2.5 transition-all duration-200 ${
            isOwn ? 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-br-md shadow-md' : 
            'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-600'
          }`}>
            {isDeleted ? (
              <span className="text-gray-400 dark:text-gray-500 italic text-sm flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> {t?.('chat.deleted') || 'Удалено'}
              </span>
            ) : isEditing ? (
              <div className="flex gap-2 items-start">
                <textarea ref={textareaRef} value={editText}
                  onChange={(e) => onStartEdit({ ...msg, message: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit(msg.id); }
                    if (e.key === 'Escape') onCancelEdit();
                  }}
                  className="flex-1 bg-white/20 dark:bg-gray-600/50 rounded-lg px-2 py-1 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#F9AA33] min-h-[60px]" rows={2} autoFocus />
                <div className="flex gap-1">
                  <button onClick={() => onSaveEdit(msg.id)} className="p-1.5 hover:bg-white/20 rounded-lg" title="Сохранить"><Check className="w-4 h-4" /></button>
                  <button onClick={onCancelEdit} className="p-1.5 hover:bg-white/20 rounded-lg" title="Отмена"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {formatMessage?.(msg.content, msg.id)}
                </div>
                {/* Изображения */}
                {images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {images.map((img, idx) => (
                      <button key={idx} onClick={() => setShowImagePreview(img.url)} className="relative group/img">
                        <img src={img.url} alt="attachment" className="max-w-[200px] max-h-[150px] rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-90 transition" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center rounded-lg">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {/* Другие вложения */}
                {msg.attachments?.filter(a => !a.type?.startsWith('image/')).map((att, idx) => (
                  <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded hover:bg-gray-300 transition">
                    <File className="w-3 h-3" /> {att.name}
                  </a>
                ))}
              </>
            )}
          </div>

          {/* Время и действия */}
          <div className={`flex items-center gap-2 mt-1 text-xs ${isOwn ? 'justify-end' : ''}`}>
            <time className="text-gray-400 dark:text-gray-500" dateTime={msg.created_at} title={messageTime.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}>
              {formatTime?.(msg.created_at)}
              {isEdited && !isDeleted && <span className="ml-1 italic">{t?.('chat.edited') || '(изм.)'}</span>}
            </time>
            
            {/* Статус прочтения */}
            {isOwn && !isDeleted && (
              <span className="inline-flex items-center gap-0.5">
                {readCount > 0 ? <CheckCheck className="w-3 h-3 text-blue-500" title={`Прочитано ${readCount} пользователями`} /> : <Clock className="w-3 h-3 text-gray-400" title="Отправлено" />}
              </span>
            )}

            {/* Кнопки действий */}
            {!isDeleted && !isEditing && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Реакции */}
                <div className="relative">
                  <button onClick={() => setShowReactionsPicker?.(showReactionsPicker === msg.id ? null : msg.id)} className="p-1 hover:bg-gray-200/50 rounded transition" title="Реакция">
                    <Smile className="w-3.5 h-3.5" />
                  </button>
                  {showReactionsPicker === msg.id && (
                    <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border flex flex-wrap gap-1 z-20 min-w-[200px]">
                      {REACTION_EMOJIS.map(emoji => {
                        const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
                        return (
                          <button key={emoji} onClick={() => onToggleReaction?.(msg.id, emoji)} className={`p-1.5 rounded-lg transition-colors text-lg ${hasReacted ? 'bg-[#4A6572]/10 dark:bg-[#F9AA33]/10 scale-110' : 'hover:bg-gray-100'}`}>
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Ответить */}
                <button onClick={() => onReply?.(msg)} className="p-1 hover:bg-gray-200/50 rounded transition" title="Ответить">
                  <Reply className="w-3.5 h-3.5" />
                </button>

                {/* Копировать */}
                <button onClick={() => onCopy?.(msg.content)} className="p-1 hover:bg-gray-200/50 rounded transition" title="Копировать">
                  <Copy className="w-3.5 h-3.5" />
                </button>

                {/* Закрепить (только модераторы) */}
                {canModerate && (
                  <button onClick={() => onPin?.(msg.id)} className={`p-1 hover:bg-yellow-100/50 rounded transition ${isPinned ? 'text-yellow-500' : ''}`} title={isPinned ? 'Открепить' : 'Закрепить'}>
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Редактирование (только свои) */}
                {isOwn && (
                  <button onClick={() => onStartEdit?.(msg)} className="p-1 hover:bg-gray-200/50 rounded transition" title="Редактировать">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Удаление (свои или модератор) */}
                {(isOwn || canModerate) && (
                  <button onClick={() => onDelete?.(msg.id)} className="p-1 hover:bg-red-100/50 rounded transition text-red-500" title="Удалить">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Создать задачу (только модераторы) */}
                {canModerate && (
                  <button onClick={() => onCreateTask?.(msg)} className="p-1 hover:bg-green-100/50 rounded transition text-green-600" title="Создать задачу">
                    <PlusCircle className="w-3.5 h-3.5" />
                  </button>
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
                  <button key={`${msg.id}-${emoji}`} onClick={() => onToggleReaction?.(msg.id, emoji)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 transition-colors ${hasReacted ? 'bg-[#4A6572]/20 dark:bg-[#F9AA33]/20 text-[#4A6572] dark:text-[#F9AA33] border border-[#4A6572]/30' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'}`}>
                    {emoji} <span className="opacity-75">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </article>

      {/* Модалка просмотра изображения */}
      {showImagePreview && <ImagePreview url={showImagePreview} onClose={() => setShowImagePreview(null)} />}
    </>
  );
});

// ─────────────────────────────────────────────────────────────
// 🧩 Компонент поиска
// ─────────────────────────────────────────────────────────────
const SearchModal = ({ isOpen, onClose, onSearch, t }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!isOpen) { setQuery(''); setResults([]); } }, [isOpen]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const resultsData = await onSearch(query);
    setResults(resultsData);
    setLoading(false);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-bold">{t?.('chat.search') || 'Поиск сообщений'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 border-b flex gap-2">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t?.('chat.searchPlaceholder') || 'Введите текст...'} className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-gray-700" />
          <button onClick={handleSearch} disabled={loading} className="px-4 py-2 bg-[#4A6572] text-white rounded-lg flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Найти
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {results.length === 0 && !loading && query && <div className="text-center text-gray-500">Ничего не найдено</div>}
          {results.map(msg => (
            <div key={msg.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex justify-between text-xs text-gray-500 mb-1"><span className="font-medium">{msg.user_name}</span><span>{new Date(msg.created_at).toLocaleString()}</span></div>
              <p className="text-sm">{msg.content.substring(0, 200)}</p>
              <div className="mt-1 text-xs text-gray-400">Канал: {msg.channel}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────
const CompanyChat = ({ user, userCompanyId, userRole, t, language, showNotification, onCreateTask }) => {
  // Состояния
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
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [readStatusMap, setReadStatusMap] = useState({});
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestCreatedAt, setOldestCreatedAt] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const channelRef = useRef(activeChannel);
  const subscriptionRef = useRef(null);
  const mentionTimerRef = useRef(null);
  const formatCacheRef = useRef(new Map());
  const audioRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingChannelRef = useRef(null);
  const oldestCreatedAtRef = useRef(oldestCreatedAt);

  useEffect(() => { oldestCreatedAtRef.current = oldestCreatedAt; }, [oldestCreatedAt]);

  // Хелперы
  const formatTime = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }, [language]);

  const isChannelAvailable = useCallback((channel) => {
    if (!channel.allowedRoles) return true;
    return channel.allowedRoles.includes(userRole);
  }, [userRole]);

  const availableChannels = useMemo(() => CHANNELS.filter(isChannelAvailable), [isChannelAvailable]);
  const canModerate = useMemo(() => ['manager', 'supply_admin', 'director', 'super_admin'].includes(userRole), [userRole]);

  const formatMessage = useCallback((text, messageId) => {
    if (!text) return null;
    const cacheKey = `${messageId}_${text.length}`;
    const cached = formatCacheRef.current.get(cacheKey);
    if (cached) return cached;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    const result = parts.map((part, i) => {
      if (part?.match?.(urlRegex)) {
        return <a key={`url-${i}-${messageId}`} href={part} target="_blank" rel="noopener noreferrer" className="text-[#4A6572] dark:text-[#F9AA33] underline hover:no-underline">{part}</a>;
      }
      if (part?.startsWith?.('@')) {
        return <span key={`mention-${i}-${messageId}`} className="font-medium text-[#4A6572] dark:text-[#F9AA33]">{part}</span>;
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

  const loadReadCounts = useCallback(async (messageIds) => {
    if (!messageIds.length) return;
    const { data, error } = await supabase.from('message_reads').select('message_id').in('message_id', messageIds);
    if (!error && data) {
      const counts = data.reduce((acc, row) => { acc[row.message_id] = (acc[row.message_id] || 0) + 1; return acc; }, {});
      setReadStatusMap(prev => ({ ...prev, ...counts }));
    }
  }, []);

  const markMessageAsRead = useCallback(async (messageId) => {
    if (!user?.id) return;
    try {
      await supabase.from('message_reads').upsert({ message_id: messageId, user_id: user.id, read_at: new Date().toISOString() }, { onConflict: 'message_id, user_id' });
      setReadStatusMap(prev => ({ ...prev, [messageId]: (prev[messageId] || 0) + 1 }));
    } catch (err) { console.warn('Ошибка отметки прочтения:', err); }
  }, [user?.id]);

  const loadMessages = useCallback(async (loadMore = false) => {
    if (!userCompanyId) return;
    if (loadMore && !hasMore) return;
    if (loadMore) setLoadingMore(true);
    else setLoading(true);
    try {
      let query = supabase.from('company_messages').select('*').eq('company_id', userCompanyId).eq('channel', channelRef.current).is('deleted_at', null).order('created_at', { ascending: false }).limit(MESSAGES_PER_PAGE);
      if (loadMore && oldestCreatedAtRef.current) query = query.lt('created_at', oldestCreatedAtRef.current);
      const { data: messagesData, error: msgError } = await query;
      if (msgError) throw msgError;
      if (!messagesData.length) { setHasMore(false); if (loadMore) setLoadingMore(false); else setLoading(false); return; }
      const oldestDate = messagesData[messagesData.length - 1]?.created_at;
      if (oldestDate) setOldestCreatedAt(oldestDate);
      const messageIds = messagesData.map(m => m.id);
      let reactionsMap = {};
      if (messageIds.length) {
        const { data: reactionsData } = await supabase.from('message_reactions').select('message_id, emoji, user_id').in('message_id', messageIds);
        if (reactionsData) reactionsMap = reactionsData.reduce((acc, r) => { if (!acc[r.message_id]) acc[r.message_id] = []; acc[r.message_id].push({ emoji: r.emoji, user_id: r.user_id }); return acc; }, {});
        await loadReadCounts(messageIds);
      }
      const userIds = [...new Set(messagesData.map(m => m.user_id).filter(Boolean))];
      let usersMap = {};
      if (userIds.length) {
        const { data: usersData } = await supabase.from('company_users').select('user_id, full_name, role, phone, email').in('user_id', userIds).eq('company_id', userCompanyId);
        usersMap = (usersData || []).reduce((acc, u) => { acc[u.user_id] = { email: u.email, user_metadata: { full_name: u.full_name, role: u.role, phone: u.phone } }; return acc; }, {});
      }
      const enriched = messagesData.map(msg => ({ ...msg, user: usersMap[msg.user_id] || { email: null, user_metadata: { full_name: 'Пользователь' } }, reactions: reactionsMap[msg.id] || [] }));
      if (loadMore) setMessages(prev => [...enriched.reverse(), ...prev]);
      else setMessages(enriched.reverse());
      setHasMore(messagesData.length === MESSAGES_PER_PAGE);
    } catch (err) { console.error('Ошибка загрузки сообщений:', err); showNotification?.(t?.('chat.sendMessageError') || 'Ошибка загрузки чата', 'error');
    } finally { setLoading(false); setLoadingMore(false); }
  }, [userCompanyId, showNotification, t, loadReadCounts, hasMore]);

  // Загрузка пользователей
  useEffect(() => {
    if (!userCompanyId) return;
    let mounted = true;
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase.from('company_users').select('user_id, full_name, role, phone, email').eq('company_id', userCompanyId).eq('is_active', true).order('full_name', { ascending: true });
        if (error) throw error;
        if (mounted) setCompanyUsers(data || []);
      } catch (err) { console.error('❌ Error loading users:', err); }
    };
    loadUsers();
    return () => { mounted = false; };
  }, [userCompanyId]);

  // Загрузка сообщений при смене канала
  useEffect(() => {
    channelRef.current = activeChannel;
    setMessages([]);
    setHasMore(true);
    setOldestCreatedAt(null);
    loadMessages(false);
  }, [activeChannel, loadMessages]);

  // Realtime подписка
  useEffect(() => {
    if (!userCompanyId || !activeChannel) return;
    if (subscriptionRef.current) { subscriptionRef.current.unsubscribe(); subscriptionRef.current = null; }
    const channelName = `chat:${userCompanyId}:${activeChannel}`;
    const subscription = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'company_messages', filter: `company_id=eq.${userCompanyId} AND channel=eq.${activeChannel}` }, async (payload) => {
        if (payload.new?.deleted_at) return;
        try {
          const [reactionsRes, userRes] = await Promise.all([
            supabase.from('message_reactions').select('emoji, user_id').eq('message_id', payload.new.id),
            supabase.from('company_users').select('full_name, role, phone, email').eq('user_id', payload.new.user_id).maybeSingle()
          ]);
          const enrichedMessage = { ...payload.new, user: userRes.data || { full_name: 'Пользователь', role: 'unknown' }, reactions: reactionsRes.data || [] };
          setMessages(prev => prev.some(m => m.id === enrichedMessage.id) ? prev : [...prev, enrichedMessage]);
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          if (payload.new.user_id !== user?.id) {
            if (notificationSoundEnabled && audioRef.current) audioRef.current.play().catch(e => console.debug('audio play blocked', e));
            const userName = userRes.data?.full_name || 'Пользователь';
            showNotification?.(`💬 Новое сообщение от ${userName} в ${CHANNELS.find(c => c.id === activeChannel)?.label}`, 'info');
            if (Notification.permission === 'granted') new Notification(`Новое сообщение в ${CHANNELS.find(c => c.id === activeChannel)?.label}`, { body: `${userName}: ${payload.new.content.substring(0, 100)}`, icon: '/icon-192.png', tag: `chat_${userCompanyId}_${activeChannel}` });
          }
        } catch (err) { console.error('❌ Error processing new message:', err); }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'company_messages', filter: `company_id=eq.${userCompanyId}` }, (payload) => {
        setMessages(prev => payload.new.deleted_at ? prev.filter(m => m.id !== payload.new.id) : prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, (payload) => {
        setMessages(prev => prev.map(m => ({ ...m, reactions: m.reactions?.filter(r => !(r.message_id === payload.old?.message_id && r.user_id === payload.old?.user_id)) || [] })));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('connected');
        else if (status === 'CHANNEL_ERROR') { setConnectionStatus('error'); setTimeout(() => subscriptionRef.current?.subscribe(), 3000); }
      });
    subscriptionRef.current = subscription;
    return () => { if (subscriptionRef.current) { subscriptionRef.current.unsubscribe(); subscriptionRef.current = null; } };
  }, [userCompanyId, activeChannel, user?.id, showNotification, notificationSoundEnabled]);

  // Typing индикатор
  useEffect(() => {
    if (!userCompanyId || !activeChannel) return;
    const typingChannel = supabase.channel(`typing:${userCompanyId}:${activeChannel}`);
    typingChannel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId !== user?.id) {
        setTypingUsers(prev => prev.some(u => u.userId === payload.userId) ? prev : [...prev, { userId: payload.userId, name: payload.name, timestamp: Date.now() }]);
        setTimeout(() => setTypingUsers(prev => prev.filter(u => u.userId !== payload.userId)), 2000);
      }
    }).on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== payload.userId));
    }).subscribe();
    typingChannelRef.current = typingChannel;
    return () => { if (typingChannelRef.current) typingChannelRef.current.unsubscribe(); };
  }, [userCompanyId, activeChannel, user?.id]);

  const sendTyping = useCallback(() => {
    if (!typingChannelRef.current) return;
    typingChannelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id, name: user?.user_metadata?.full_name || 'Пользователь' } });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { typingChannelRef.current?.send({ type: 'broadcast', event: 'stop_typing', payload: { userId: user?.id } }); }, 1500);
  }, [user?.id, user?.user_metadata?.full_name]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    fetch('/notification.mp3', { method: 'HEAD' }).then(res => { if (res.ok) { audioRef.current = new Audio('/notification.mp3'); audioRef.current.volume = 0.5; } else setNotificationSoundEnabled(false); }).catch(() => setNotificationSoundEnabled(false));
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  useEffect(() => {
    if (userCompanyId && user?.id) {
      const userCtx = getUserContext(user, null, userRole, userCompanyId);
      if (shouldLogFeature('chat', userCompanyId, {})) logChatAccess(supabase, userCtx, 'open').catch(err => console.warn('[CHAT] Аудит не записан:', err));
    }
  }, [userCompanyId, user, userRole]);

  // Обработчики
  const startEdit = useCallback((message) => { if (message.user_id !== user?.id) return; setEditingMessageId(message.id); setEditText(message.content); setTimeout(() => textareaRef.current?.focus(), 50); }, [user?.id]);
  const saveEdit = useCallback(async (messageId) => { const content = editText.trim(); if (!content) return; try { const { error } = await supabase.from('company_messages').update({ content, edited_at: new Date().toISOString() }).eq('id', messageId).eq('user_id', user?.id); if (error) throw error; setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m)); setEditingMessageId(null); setEditText(''); showNotification?.(t?.('chat.messageUpdated') || 'Сообщение обновлено', 'success'); } catch (err) { console.error('❌ Edit error:', err); showNotification?.(t?.('chat.editError') || 'Ошибка редактирования', 'error'); } }, [editText, user?.id, showNotification, t]);
  const cancelEdit = useCallback(() => { setEditingMessageId(null); setEditText(''); }, []);
  const deleteMessage = useCallback(async (messageId) => { if (!window.confirm(t?.('chat.confirmDelete') || 'Удалить сообщение?')) return; try { const { error } = await supabase.from('company_messages').update({ content: '[Удалено]', deleted_at: new Date().toISOString() }).eq('id', messageId); if (error) throw error; showNotification?.(t?.('chat.deleted') || 'Сообщение удалено', 'info'); } catch (err) { console.error('❌ Delete error:', err); showNotification?.(t?.('chat.deleteError') || 'Ошибка удаления', 'error'); } }, [showNotification, t]);
  const toggleReaction = useCallback(async (messageId, emoji) => { if (!user?.id) return; const message = messages.find(m => m.id === messageId); const hasReaction = message?.reactions?.some(r => r.emoji === emoji && r.user_id === user.id); try { if (hasReaction) await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji); else await supabase.from('message_reactions').insert([{ message_id: messageId, user_id: user.id, emoji, created_at: new Date().toISOString() }]); } catch (err) { console.error('❌ Reaction error:', err); showNotification?.(t?.('chat.reactionError') || 'Ошибка реакции', 'error'); } setShowReactionsPicker(null); }, [user?.id, messages, showNotification, t]);
  const copyMessage = useCallback((content) => { navigator.clipboard.writeText(content); showNotification?.('Скопировано в буфер обмена', 'success'); }, [showNotification]);
  const pinMessage = useCallback(async (messageId) => { const isPinned = pinnedMessages.includes(messageId); if (isPinned) setPinnedMessages(prev => prev.filter(id => id !== messageId)); else setPinnedMessages(prev => [...prev, messageId]); showNotification?.(isPinned ? 'Сообщение откреплено' : 'Сообщение закреплено', 'success'); }, [pinnedMessages, showNotification]);

  const sendMessage = useCallback(async () => {
    const content = newMessage.trim();
    if (!content || !user?.id || sending) return;
    const { data: { session } } = await supabase.auth.getSession();
    const safeCompanyId = session?.user?.user_metadata?.company_id || userCompanyId;
    if (!safeCompanyId) { showNotification?.('Ошибка: компания не указана', 'error'); return; }
    setSending(true);
    try {
      const mentionRegex = /@([^\s,;!?.]+)/g;
      const mentions = [...content.matchAll(mentionRegex)].map(m => m[1].toLowerCase());
      const mentionedUsers = companyUsers.filter(u => mentions.includes(u.full_name?.toLowerCase().replace(/\s+/g, '')));
      const attachments = attachedFiles.filter(f => f.uploadedUrl).map(f => ({ name: f.file.name, url: f.uploadedUrl, type: f.file.type, size: f.file.size }));
      const replyToId = replyingTo?.id || null;
      const { data, error } = await supabase.from('company_messages').insert([{ company_id: safeCompanyId, channel: activeChannel, user_id: user.id, content, attachments, reply_to_id: replyToId, created_at: new Date().toISOString() }]).select().single();
      if (error) throw error;
      if (mentionedUsers.length > 0 && data?.id) await supabase.from('message_mentions').insert(mentionedUsers.map(u => ({ message_id: data.id, mentioned_user_id: u.user_id, created_at: new Date().toISOString() })));
      setNewMessage(''); setShowMentions(false); setAttachedFiles([]); setReplyingTo(null); textareaRef.current?.focus();
    } catch (err) { console.error('❌ Send error:', err); showNotification?.(t?.('chat.sendError') || 'Не удалось отправить', 'error'); } finally { setSending(false); }
  }, [newMessage, user, userCompanyId, activeChannel, companyUsers, sending, showNotification, t, attachedFiles, replyingTo]);

  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newAttachments = [];
    for (const file of files) {
      const maxSize = 10 * 1024 * 1024;
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (file.size > maxSize) { showNotification?.('Файл слишком большой (макс. 10MB)', 'error'); continue; }
      if (!allowedTypes.includes(file.type)) { showNotification?.('Недопустимый тип файла', 'error'); continue; }
      let preview = null;
      if (file.type.startsWith('image/')) preview = URL.createObjectURL(file);
      newAttachments.push({ file, preview, uploading: true });
    }
    setAttachedFiles(prev => [...prev, ...newAttachments]);
    for (const attach of newAttachments) {
      try {
        const fileName = `${userCompanyId}/${Date.now()}_${attach.file.name.replace(/[^a-z0-9.-]/gi, '_')}`;
        const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(fileName, attach.file, { upsert: false });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
        setAttachedFiles(prev => prev.map(a => a.file === attach.file ? { ...a, uploadedUrl: publicUrl, uploading: false } : a));
        setNewMessage(prev => prev + `\n📎 [${attach.file.name}](${publicUrl})`);
      } catch (err) { console.error('Upload error:', err); showNotification?.(`Ошибка загрузки ${attach.file.name}`, 'error'); setAttachedFiles(prev => prev.filter(a => a.file !== attach.file)); } finally { if (attach.preview) URL.revokeObjectURL(attach.preview); }
    }
    e.target.value = '';
  }, [userCompanyId, showNotification]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }, []);
  const handleDrop = useCallback((e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length) handleFileUpload({ target: { files } }); }, [handleFileUpload]);
  const insertMention = useCallback((userName) => { setNewMessage(prev => prev.replace(/@([^\s]*)$/, `@${userName} `)); setShowMentions(false); setMentionQuery(''); textareaRef.current?.focus(); }, []);
  const handleTextareaChange = useCallback((e) => { const value = e.target.value; setNewMessage(value); sendTyping(); if (value.includes('@')) { if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current); mentionTimerRef.current = setTimeout(() => { const match = value.match(/@([^\s,;!?.]+)$/); if (match) { setShowMentions(true); setMentionQuery(match[0]); } else setShowMentions(false); }, 100); } else setShowMentions(false); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }, [sendTyping]);
  const handleKeyDown = useCallback((e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (editingMessageId) saveEdit(editingMessageId); else sendMessage(); return; } if (e.key === '@' && !showMentions) { setShowMentions(true); setMentionQuery('@'); } if (e.key === 'Escape') { setShowMentions(false); setShowReactionsPicker(null); if (editingMessageId) cancelEdit(); } }, [editingMessageId, showMentions, saveEdit, sendMessage, cancelEdit]);
  const filteredMentions = useMemo(() => { if (!mentionQuery.trim() || mentionQuery === '@') return companyUsers.slice(0, 5); const query = mentionQuery.toLowerCase().replace('@', '').trim(); return companyUsers.filter(u => u.full_name?.toLowerCase().includes(query)).slice(0, 5); }, [mentionQuery, companyUsers]);
  const handleSearch = useCallback(async (query) => { if (!query.trim()) return []; const { data, error } = await supabase.from('company_messages').select('id, content, created_at, channel, user_id').eq('company_id', userCompanyId).ilike('content', `%${query}%`).is('deleted_at', null).order('created_at', { ascending: false }).limit(50); if (error) { showNotification?.('Ошибка поиска', 'error'); return []; } const userIds = [...new Set(data.map(m => m.user_id))]; const { data: users } = await supabase.from('company_users').select('user_id, full_name').in('user_id', userIds); const userMap = (users || []).reduce((acc, u) => { acc[u.user_id] = u.full_name; return acc; }, {}); return data.map(m => ({ ...m, user_name: userMap[m.user_id] || 'Пользователь' })); }, [userCompanyId, showNotification]);
  const handleCreateTask = useCallback((msg) => { if (!onCreateTask) { showNotification?.('Функция создания задачи временно недоступна', 'info'); return; } onCreateTask({ title: `Задача из чата: ${msg.content.substring(0, 50)}`, description: msg.content, channel: activeChannel, messageId: msg.id }); }, [onCreateTask, activeChannel, showNotification]);
  const setReplyTo = useCallback((msg) => { setReplyingTo(msg); textareaRef.current?.focus(); }, []);
  const cancelReply = useCallback(() => { setReplyingTo(null); }, []);

  useEffect(() => { const cache = formatCacheRef.current; return () => { if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current); cache.clear(); if (subscriptionRef.current) subscriptionRef.current.unsubscribe(); if (typingChannelRef.current) typingChannelRef.current.unsubscribe(); }; }, []);

  const currentChannel = CHANNELS.find(c => c.id === activeChannel);

  if (userRole === 'client') {
    return (<div className="flex items-center justify-center h-[calc(100vh-140px)]"><div className="text-center text-gray-500"><MessageCircle className="w-16 h-16 mx-auto mb-3 opacity-50" /><p>Чат недоступен для заказчиков</p></div></div>);
  }

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-48 border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 p-3 hidden md:block">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">{t?.('chat.channels') || 'Каналы'}</h3>
        <nav className="space-y-1">
          {availableChannels.map(channel => {
            const isActive = activeChannel === channel.id;
            return (<button key={channel.id} onClick={() => setActiveChannel(channel.id)} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all duration-200 ${isActive ? 'bg-[#4A6572]/10 dark:bg-[#F9AA33]/10 text-[#4A6572] dark:text-[#F9AA33] shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'}`}>
              <span className="text-base">{channel.icon}</span><span className="truncate flex-1">{channel.label}</span>
              {channel.allowedRoles && channel.allowedRoles.length > 0 && <span className="text-[10px] bg-[#F9AA33]/20 text-[#F9AA33] px-1.5 py-0.5 rounded">огранич.</span>}
            </button>);
          })}
        </nav>
        <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-gray-700/50 px-2 space-y-2">
          <div className="flex items-center gap-2 text-xs"><span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'loading' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`} /><span className="text-gray-500 dark:text-gray-400">{connectionStatus === 'connected' ? (t?.('chat.online') || 'Онлайн') : connectionStatus === 'loading' ? (t?.('chat.connecting') || 'Подключение...') : (t?.('chat.offline') || 'Оффлайн')}</span></div>
          <button onClick={() => setNotificationSoundEnabled(prev => !prev)} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700">{notificationSoundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}{notificationSoundEnabled ? 'Звук вкл' : 'Звук выкл'}</button>
          <button onClick={() => setShowSearchModal(true)} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 w-full"><Search className="w-3 h-3" /> Поиск</button>
        </div>
      </aside>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between bg-white/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 md:hidden">
            <select value={activeChannel} onChange={(e) => setActiveChannel(e.target.value)} className="text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1">
              {availableChannels.map(ch => <option key={ch.id} value={ch.id}>{ch.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3"><span className="text-xl">{currentChannel?.icon}</span><div><h2 className="font-semibold text-gray-900 dark:text-white">{currentChannel?.label}</h2><p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{currentChannel?.description}</p></div></div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><MessageCircle className="w-4 h-4" /><span>{messages.length} {t?.('chat.messages') || 'сообщений'}</span></div>
        </header>

        {/* Индикатор ответа */}
        {replyingTo && (
          <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700/50 border-b border-gray-200 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2"><Reply className="w-4 h-4 text-gray-500" /><span className="text-gray-600 dark:text-gray-300">Ответ на сообщение от <strong>{replyingTo.user?.user_metadata?.full_name}</strong></span></div>
            <button onClick={cancelReply} className="p-1 hover:bg-gray-200 rounded"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" onDragOver={handleDragOver} onDrop={handleDrop}>
          {loading ? (<div className="flex flex-col items-center justify-center h-32 gap-2"><Loader2 className="w-6 h-6 animate-spin text-[#4A6572]" /><span className="text-sm text-gray-500">{t?.('chat.loading') || 'Загрузка...'}</span></div>) : (<>
            {hasMore && messages.length >= MESSAGES_PER_PAGE && (<div className="flex justify-center"><button onClick={() => loadMessages(true)} disabled={loadingMore} className="px-4 py-2 text-xs bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300">{loadingMore ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Загрузить ещё'}</button></div>)}
            {messages.map(msg => (<MessageItem key={msg.id} msg={msg} user={user} isOwn={msg.user_id === user?.id} isEditing={editingMessageId === msg.id} editText={editText} onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={cancelEdit} onDelete={deleteMessage} onToggleReaction={toggleReaction} showReactionsPicker={showReactionsPicker} setShowReactionsPicker={setShowReactionsPicker} formatMessage={formatMessage} formatTime={formatTime} t={t} language={language} textareaRef={textareaRef} readStatusMap={readStatusMap} onMarkAsRead={markMessageAsRead} canModerate={canModerate} onCreateTask={handleCreateTask} onReply={setReplyTo} onCopy={copyMessage} onPin={pinMessage} isPinned={pinnedMessages.includes(msg.id)} replyingTo={replyingTo?.id === msg.id} replyingToMessage={messages.find(m => m.id === msg.reply_to_id)} />))}
            <div ref={messagesEndRef} />
          </>)}
        </div>

        {typingUsers.length > 0 && (<div className="px-4 py-1 text-xs text-gray-500 italic flex items-center gap-1"><Users className="w-3 h-3" />{typingUsers.map(u => u.name).join(', ')} печатает...</div>)}

        {/* Attachments Preview */}
        {attachedFiles.length > 0 && (<div className="px-4 pt-2 pb-1 flex flex-wrap gap-2 border-t bg-gray-50/50">{attachedFiles.map((file, idx) => (<div key={idx} className="relative w-16 h-16 rounded border overflow-hidden bg-white"><img src={file.preview} className="w-full h-full object-cover" alt="preview" />{file.uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-white" /></div>}<button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white"><X className="w-3 h-3" /></button></div>))}</div>)}

        {/* Mentions Dropdown */}
        {showMentions && filteredMentions.length > 0 && (<div className="absolute bottom-28 left-4 right-4 md:left-auto md:right-8 md:w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border z-30 overflow-hidden"><div className="p-2 border-b bg-gray-50/50"><div className="flex items-center gap-2 text-sm"><AtSign className="w-4 h-4" /><span>{t?.('chat.selectUser') || 'Выберите пользователя'}</span></div></div><div className="max-h-48 overflow-y-auto">{filteredMentions.map(u => (<button key={u.user_id} onClick={() => insertMention(u.full_name)} className="w-full text-left px-3 py-2.5 hover:bg-gray-100 flex items-center gap-3"><div className="w-7 h-7 rounded-full bg-[#4A6572]/20 flex items-center justify-center"><span className="text-xs font-medium text-[#4A6572]">{u.full_name?.[0]?.toUpperCase() || '?'}</span></div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{u.full_name}</p><p className="text-xs text-gray-500">{u.role} {u.phone && `• ${u.phone}`}</p></div></button>))}</div></div>)}

        {/* Input Area */}
        <div className="p-4 border-t bg-white/50 dark:bg-gray-800/50">
          <div className="flex items-end gap-2">
            <label className="p-2.5 rounded-xl cursor-pointer hover:bg-gray-100 text-gray-600" title="Прикрепить файл">
              <Paperclip className="w-5 h-5" /><input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" multiple />
            </label>
            <div className="flex-1 relative"><textarea ref={textareaRef} value={newMessage} onChange={handleTextareaChange} onKeyDown={handleKeyDown} placeholder={t?.('chat.placeholder') || 'Введите сообщение... (Shift+Enter — новая строка)'} className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700/50 border border-gray-200/50 rounded-xl focus:ring-2 focus:ring-[#4A6572] resize-none text-sm" rows={1} style={{ minHeight: '44px', maxHeight: '120px' }} />{newMessage.length > 0 && <span className="absolute bottom-1 right-2 text-[10px] text-gray-400">{newMessage.length}/1000</span>}</div>
            <button onClick={sendMessage} disabled={!newMessage.trim() || sending} className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${!newMessage.trim() || sending ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-lg active:scale-95'}`}>{sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-400"><span><kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> — отправить</span><span><kbd className="px-1 py-0.5 bg-gray-100 rounded">Shift+Enter</kbd> — новая строка</span><span><kbd className="px-1 py-0.5 bg-gray-100 rounded">@</kbd> — упомянуть</span></div>
        </div>
      </div>

      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} onSearch={handleSearch} t={t} />
    </div>
  );
};

export default memo(CompanyChat);