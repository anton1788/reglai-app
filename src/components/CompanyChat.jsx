// CompanyChat.jsx - ПОЛНАЯ ВЕРСИЯ (ВСЕ ФУНКЦИИ + УЛУЧШЕНИЯ)
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { 
  Send, Smile, Paperclip, Edit2, Trash2, X, Check, 
  Loader2, MessageCircle, Plus, Settings, Search, CornerUpLeft, 
  Bookmark, BookmarkCheck, Menu, FileText, Pin, Download
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

// ========== КОНСТАНТЫ ==========
const SYSTEM_CHANNELS = [
  { 
    id: 'general', 
    label: '# Общий', 
    icon: '💬', 
    description: 'Общие вопросы компании',
    canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'],
    canWrite: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client']
  },
  { 
    id: 'supply', 
    label: '📦 Снабжение', 
    icon: '📦', 
    description: 'Закупки, материалы, логистика',
    canView: ['manager', 'supply_admin'],
    canWrite: ['manager', 'supply_admin']
  },
  { 
    id: 'foremen', 
    label: '👷 Прорабы', 
    icon: '👷', 
    description: 'Оперативные вопросы на объектах',
    canView: ['manager', 'master', 'foreman'],
    canWrite: ['manager', 'master', 'foreman']
  },
  { 
    id: 'announcements', 
    label: '📢 Объявления', 
    icon: '📢', 
    description: 'Важные новости и приказы',
    canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'],
    canWrite: ['manager', 'supply_admin']
  }
];

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀'];

// ========== ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ ==========

const ArrowDown = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const TimeDisplay = ({ date, className = "text-xs text-gray-400" }) => {
  const formatted = useMemo(() => {
    if (!date) return '';
    
    const d = new Date(date);
    // Проверка на валидность даты
    if (isNaN(d.getTime())) {
      console.warn('⚠️ Невалидная дата:', date);
      return '';
    }
    
    const now = new Date();
    
    // ИСПРАВЛЕНИЕ: Сравниваем по локальным компонентам даты, а не по toDateString()
    const isToday = d.getFullYear() === now.getFullYear() &&
                    d.getMonth() === now.getMonth() &&
                    d.getDate() === now.getDate();
    
    if (isToday) {
      return d.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    return d.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, [date]);

  return <time className={className}>{formatted}</time>;
};

// ========== КОМПОНЕНТ СООБЩЕНИЯ ==========
const MessageItem = memo(function({ 
  msg, user, userRole, isOwn, isEditing, editText, 
  onStartEdit, onSaveEdit, onCancelEdit, onDelete, 
  onToggleReaction, onReply, onToggleSave, isSaved,
  showReactionsPicker, setShowReactionsPicker, 
  formatMessage, textareaRef, companyUsers,
  onPinMessage, isPinned, onCopyMessage
}) {
  const reactionCounts = useMemo(() => {
    if (!msg.reactions?.length) return {};
    return msg.reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});
  }, [msg.reactions]);

  const canEdit = msg.user_id === user?.id || userRole === 'manager' || userRole === 'supply_admin';
  const canDelete = msg.user_id === user?.id || userRole === 'manager' || userRole === 'supply_admin';

  const mentions = useMemo(() => {
    if (!msg.content) return [];
    const mentionRegex = /@([^\s]+)/g;
    return [...msg.content.matchAll(mentionRegex)].map(m => m[1]);
  }, [msg.content]);

  const handleDoubleClick = () => {
    if (!msg.deleted_at && !isEditing) {
      onToggleReaction?.(msg.id, '❤️');
    }
  };

  // Если сообщение удалено
  if (msg.deleted_at) {
    return (
      <article className={`group flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0 ${isOwn ? 'order-2' : ''}`}>
          <span className="text-white text-xs font-medium">
            {msg.user?.user_metadata?.full_name?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
        <div className={`max-w-[85%] md:max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
          {!isOwn && (
            <div className="flex items-center gap-2 mb-1 pl-1">
              <span className="text-xs font-bold text-[#4A6572] dark:text-[#F9AA33]">
                {msg.user?.user_metadata?.full_name || 'Пользователь'}
              </span>
            </div>
          )}
          <div className={`relative rounded-2xl px-4 py-2.5 shadow-sm ${
            isOwn 
              ? 'bg-gray-400 text-white rounded-br-md' 
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-bl-md border border-gray-200 dark:border-gray-600'
          }`}>
            <em className="text-sm italic">Сообщение удалено</em>
          </div>
          <div className={`flex items-center gap-2 mt-1 text-xs ${isOwn ? 'justify-end' : ''}`}>
            <TimeDisplay date={msg.created_at} className="text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article 
      className={`group flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} animate-in fade-in`}
      onDoubleClick={handleDoubleClick}
    >
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0 ${isOwn ? 'order-2' : ''}`}>
        <span className="text-white text-xs font-medium">
          {msg.user?.user_metadata?.full_name?.[0]?.toUpperCase() || '?'}
        </span>
      </div>
      
      <div className={`max-w-[85%] md:max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1 pl-1">
            <span className="text-xs font-bold text-[#4A6572] dark:text-[#F9AA33]">
              {msg.user?.user_metadata?.full_name || 'Пользователь'}
            </span>
            {userRole && (
              <span className="text-[10px] text-gray-400">• {userRole}</span>
            )}
          </div>
        )}
        
        <div className={`relative rounded-2xl px-4 py-2.5 shadow-sm ${
          isOwn 
            ? 'bg-[#4A6572] text-white rounded-br-md' 
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-gray-100 dark:border-gray-600'
        } ${isPinned ? 'border-l-4 border-l-yellow-400' : ''}`}>
          {isEditing ? (
            <div className="flex gap-2 items-start">
              <textarea 
                ref={textareaRef} 
                value={editText}
                onChange={(e) => onStartEdit({ ...msg, content: e.target.value })} 
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
                <button onClick={() => onSaveEdit(msg.id)} className="p-1 hover:bg-green-500/20 text-green-600 rounded-lg">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={onCancelEdit} className="p-1 hover:bg-red-500/20 text-red-600 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {msg.replied_message && (
                <div className="mb-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg border-l-4 border-[#4A6572]">
                  <p className="text-xs font-bold text-[#4A6572] dark:text-[#F9AA33]">
                    {msg.replied_message.user?.user_metadata?.full_name}
                  </p>
                  <p className="text-xs opacity-75 truncate">{msg.replied_message.content}</p>
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                {formatMessage?.(msg.content)}
                {mentions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {mentions.map((mention, idx) => {
                      const mentionedUser = companyUsers?.find(u => u.full_name === mention);
                      return mentionedUser ? (
                        <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          @{mention}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className={`flex items-center gap-2 mt-1 text-xs ${isOwn ? 'justify-end' : ''}`}>
          <TimeDisplay date={msg.created_at} className="text-gray-400 dark:text-gray-500" />
          {msg.edited_at && <span className="text-gray-400 dark:text-gray-500 opacity-70">(изм.)</span>}
          
          {!isEditing && !msg.deleted_at && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setShowReactionsPicker?.(showReactionsPicker === msg.id ? null : msg.id)}
                className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded-full"
              >
                <Smile className="w-3.5 h-3.5 text-gray-500" />
              </button>
              
              <button onClick={() => onReply?.(msg)} className="p-1 hover:bg-gray-200/50 rounded-full">
                <CornerUpLeft className="w-3.5 h-3.5 text-gray-500" />
              </button>
              
              <button onClick={() => onToggleSave?.(msg.id)} className="p-1 hover:bg-gray-200/50 rounded-full">
                {isSaved ? (
                  <BookmarkCheck className="w-3.5 h-3.5 text-[#4A6572]" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 text-gray-500" />
                )}
              </button>

              <button onClick={() => onCopyMessage?.(msg.id)} className="p-1 hover:bg-gray-200/50 rounded-full">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
              </button>
              
              {canEdit && (
                <button onClick={() => onStartEdit?.(msg)} className="p-1 hover:bg-blue-100/50 rounded text-blue-500">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete?.(msg.id)} className="p-1 hover:bg-red-100/50 rounded text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {onPinMessage && (
                <button onClick={() => onPinMessage?.(msg.id)} className="p-1 hover:bg-yellow-100/50 rounded text-yellow-500">
                  <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
          )}
        </div>
        
        {showReactionsPicker === msg.id && (
          <div className="absolute bottom-full mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 flex gap-1 z-50">
            {REACTION_EMOJIS.map(emoji => {
              const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
              return (
                <button
                  key={emoji}
                  onClick={() => {
                    onToggleReaction?.(msg.id, emoji);
                    setShowReactionsPicker?.(null);
                  }}
                  className={`p-2 rounded-lg transition-all text-lg ${
                    hasReacted ? 'bg-[#4A6572]/10 scale-110' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
        
        {Object.keys(reactionCounts).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-2 ${isOwn ? 'justify-end' : ''}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => {
              const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
              return (
                <button
                  key={`${msg.id}-${emoji}`}
                  onClick={() => onToggleReaction?.(msg.id, emoji)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                    hasReacted 
                      ? 'bg-[#4A6572]/10 text-[#4A6572] dark:bg-[#F9AA33]/10 dark:text-[#F9AA33]' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  {emoji} <span>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
});

// ========== КОМПОНЕНТ БОКОВОЙ ПАНЕЛИ ==========
const ChatSidebar = memo(function({ 
  channels, activeChannel, onChannelSelect, canCreateChannel, onCreateChannel,
  connectionStatus, isMobile, showSidebar, onCloseSidebar, onChannelSettings,
  onDeleteChannel, currentUserRole, companyUsers, currentUser, onStartDirectChat,
  unreadCounts, lastReadTimes
}) {
  if (!showSidebar) return null;

  const userInitial = currentUser?.user_metadata?.full_name?.[0]?.toUpperCase() || '?';
  const userName = currentUser?.user_metadata?.full_name || 'Пользователь';

  const handleStartDirectChat = (targetUser) => {
    if (onStartDirectChat) {
      onStartDirectChat(targetUser);
    }
  };

  const handleDeleteChannel = (channelId, channelName) => {
    if (onDeleteChannel && window.confirm(`Удалить канал "${channelName}"?`)) {
      onDeleteChannel(channelId);
    }
  };

  const canManageChannels = currentUserRole === 'manager' || currentUserRole === 'supply_admin';

  return (
    <aside className={`${isMobile ? 'absolute z-40 w-64 h-full' : 'w-64'} border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col`}>
      <div className="p-3 sm:p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2 mb-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center">
            <span className="text-white text-xs font-medium">{userInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{userName}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{currentUserRole}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Каналы</h3>
          {isMobile && (
            <button onClick={onCloseSidebar} className="p-1 hover:bg-gray-200 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {canCreateChannel && (
          <button
            onClick={onCreateChannel}
            className="w-full px-3 py-2 bg-[#4A6572] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 hover:bg-[#344955] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Создать канал
          </button>
        )}
      </div>
      
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {channels.map(channel => {
          const isActive = activeChannel === channel.id;
          const unread = unreadCounts[channel.id] || 0;
          const lastRead = lastReadTimes?.[channel.id];
          
          const formatLastRead = (date) => {
            if (!date) return null;
            const now = new Date();
            const readDate = new Date(date);
            const diffMs = now - readDate;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            
            if (diffMins < 1) return 'только что';
            if (diffMins < 60) return `${diffMins} мин назад`;
            if (diffHours < 24) return `${diffHours} ч назад`;
            if (diffDays < 7) return `${diffDays} дн назад`;
            return readDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
          };
          
          const lastReadText = formatLastRead(lastRead);
          
          return (
            <div key={channel.id} className="relative group">
              <button
                onClick={() => onChannelSelect(channel.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex flex-col gap-1 transition-all ${
                  isActive 
                    ? 'bg-[#4A6572] text-white shadow-md' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <span className="text-lg">{channel.icon}</span>
                  <span className="truncate flex-1">{channel.label || channel.name}</span>
                  {unread > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {unread}
                    </span>
                  )}
                </div>
                {lastReadText && (
                  <div className="text-[10px] opacity-60 pl-8">
                    Прочитано: {lastReadText}
                  </div>
                )}
              </button>
              
              {channel.type !== 'system' && canManageChannels && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChannelSettings?.(channel);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChannel(channel.id, channel.name);
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </nav>
      
      {companyUsers && companyUsers.length > 0 && (
        <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Пользователи ({companyUsers.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {companyUsers.slice(0, 5).map(u => (
              <button
                key={u.user_id}
                onClick={() => handleStartDirectChat(u)}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center">
                  <span className="text-white text-[10px] font-medium">
                    {u.full_name?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <span className="truncate text-gray-700 dark:text-gray-300">{u.full_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-gray-500 dark:text-gray-400">
            {connectionStatus === 'connected' ? 'Онлайн' : 'Оффлайн'}
          </span>
        </div>
      </div>
    </aside>
  );
});

// ========== ОСНОВНОЙ КОМПОНЕНТ ==========
const CompanyChat = ({ user, userCompanyId, userRole, t, showNotification }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState('general');
  const [customChannels, setCustomChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showReactionsPicker, setShowReactionsPicker] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelMembers, setChannelMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [replyTo, setReplyTo] = useState(null);
  const [savedMessages, setSavedMessages] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastReadTimes, setLastReadTimes] = useState({});
  
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  
  const [pinnedMessages, setPinnedMessages] = useState([]);
  
  // Поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  // Drag & Drop
  const [isDragging, setIsDragging] = useState(false);
  
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const subscriptionRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const animationFrameRef = useRef(null);
  const bottomRef = useRef(null);

  // Обновляем ref при изменении состояния
  useEffect(() => {
    isUserScrollingRef.current = isUserScrolling;
  }, [isUserScrolling]);

  // Определение мобильного устройства
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Показываем сайдбар на десктопе
  useEffect(() => {
    if (!isMobile) {
      setShowSidebar(true);
    }
  }, [isMobile]);

  // Проверка соединения
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('companies').select('id').limit(1);
        if (error || !data) {
          setConnectionStatus('error');
        } else {
          setConnectionStatus('connected');
        }
      } catch (err) {
        console.error('Connection check error:', err);
        setConnectionStatus('error');
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Обработчик скролла
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    const isScrollingUp = scrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (isScrollingUp && !isNearBottom) {
        setShouldAutoScroll(false);
        setIsUserScrolling(true);
        
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          setIsUserScrolling(false);
        }, 3000);
      } else if (isNearBottom && !isScrollingUp) {
        setShouldAutoScroll(true);
        setIsUserScrolling(false);
      }
    });
  }, []);

  // Плавная прокрутка вниз
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (!shouldAutoScroll || isUserScrollingRef.current) return;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (container && (!isUserScrollingRef.current || behavior === 'auto')) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: behavior
        });
      }
    });
  }, [shouldAutoScroll]);

  // Принудительная прокрутка вниз
  const forceScrollToBottom = useCallback((behavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    isUserScrollingRef.current = false;
    
    setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: behavior
      });
    }, 50);
  }, []);

  // Форматирование сообщения
  const formatMessage = useCallback((text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part?.match?.(urlRegex)) {
        return <a key={`url-${i}`} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{part}</a>;
      }
      if (part?.startsWith?.('@')) {
        return <span key={`mention-${i}`} className="font-bold text-blue-500 bg-blue-50 px-0.5 rounded">{part}</span>;
      }
      return <span key={`text-${i}`}>{part}</span>;
    });
  }, []);

  // Все каналы
  const allChannels = useMemo(() => {
    const system = SYSTEM_CHANNELS.filter(ch => {
      if (!ch.canView) return true;
      return ch.canView.includes(userRole);
    }).map(ch => ({ ...ch, type: 'system' }));
    
    const custom = customChannels.filter(ch => {
      if (ch.type === 'direct') {
        return ch.participants?.includes(user?.id);
      }
      return true;
    }).map(ch => ({ ...ch, type: ch.type || 'custom' }));
    
    return [...system, ...custom];
  }, [customChannels, userRole, user?.id]);

  // Фильтрация сообщений по поиску
  const displayedMessages = useMemo(() => {
    if (!searchQuery) return messages;
    return messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [messages, searchQuery]);

  // Проверка прав на запись в канал
  const canWriteToChannel = useCallback((channelId) => {
    const channel = SYSTEM_CHANNELS.find(c => c.id === channelId);
    if (!channel) return true;
    return channel.canWrite?.includes(userRole) || false;
  }, [userRole]);

  // Текущий канал
  const currentChannel = allChannels.find(c => c.id === activeChannel);

  // Личный чат
  const startDirectChat = useCallback((targetUser) => {
    if (!targetUser || !user?.id) return;
    
    const dmId = `dm_${[user.id, targetUser.user_id].sort().join('_')}`;
    const existingDM = customChannels.find(c => c.id === dmId);
    
    if (!existingDM) {
      const newDM = {
        id: dmId,
        name: targetUser.full_name,
        label: targetUser.full_name,
        icon: '💬',
        description: `Личный чат с ${targetUser.full_name}`,
        type: 'direct',
        is_private: true,
        participants: [user.id, targetUser.user_id],
        created_by: user.id,
        created_at: new Date().toISOString()
      };
      setCustomChannels(prev => [...prev, newDM]);
    }
    
    setActiveChannel(dmId);
    if (isMobile) {
      setShowSidebar(false);
    }
  }, [user?.id, customChannels, isMobile]);

  // Загрузка непрочитанных сообщений
  const loadUnreadCounts = useCallback(async () => {
    if (!user?.id || !userCompanyId) return;
    
    try {
      const { data: readData } = await supabase
        .from('channel_read_status')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id);
      
      const readMap = {};
      readData?.forEach(item => {
        readMap[item.channel_id] = new Date(item.last_read_at);
      });
      setLastReadTimes(readMap);
      
      const channels = allChannels.map(ch => ch.id);
      const counts = {};
      
      for (const channelId of channels) {
        const lastRead = readMap[channelId] || new Date(0);
        
        try {
          let query = supabase
            .from('company_messages')
            .select('id')
            .eq('company_id', userCompanyId)
            .is('deleted_at', null)
            .gt('created_at', lastRead.toISOString())
            .neq('user_id', user.id);
          
          const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === channelId);
          const isDirectChat = channelId?.startsWith('dm_');
          
          if (isSystemChannel) {
            query = query.eq('channel', channelId).eq('channel_type', 'system');
          } else if (isDirectChat) {
            query = query.eq('channel_id', channelId).eq('channel_type', 'direct');
          } else {
            query = query.eq('channel_id', channelId).eq('channel_type', 'custom');
          }
          
          const { data, error } = await query;
          
          if (!error && data && data.length > 0) {
            counts[channelId] = data.length;
          }
        } catch (err) {
          console.warn(`Ошибка для канала ${channelId}:`, err);
        }
      }
      
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Ошибка загрузки непрочитанных:', err);
    }
  }, [user?.id, userCompanyId, allChannels]);

  // Отметка канала как прочитанного
  const markChannelAsRead = useCallback(async (channelId) => {
    if (!user?.id || !channelId) return;
    
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('channel_read_status')
        .upsert({
          user_id: user.id,
          channel_id: channelId,
          last_read_at: now,
          updated_at: now
        }, { onConflict: 'user_id,channel_id' });
      
      if (!error) {
        setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
        setLastReadTimes(prev => ({ ...prev, [channelId]: new Date(now) }));
      }
    } catch (err) {
      console.error('Ошибка отметки прочитанного:', err);
    }
  }, [user?.id]);

  // Загрузка пользователей компании
  useEffect(() => {
    const loadUsers = async () => {
      if (!userCompanyId) return;
      try {
        const { data, error } = await supabase
          .from('company_users')
          .select('user_id, full_name, role, phone')
          .eq('company_id', userCompanyId)
          .eq('is_active', true);
        
        if (error) throw error;
        setCompanyUsers(data || []);
      } catch (err) {
        console.error('Ошибка загрузки пользователей:', err);
      }
    };
    loadUsers();
  }, [userCompanyId]);

  // Загрузка пользовательских каналов
  useEffect(() => {
    const loadCustomChannels = async () => {
      if (!userCompanyId) return;
      try {
        const { data, error } = await supabase
          .from('company_channels')
          .select('*')
          .eq('company_id', userCompanyId)
          .eq('is_archived', false);
        
        if (error) throw error;
        setCustomChannels(data || []);
        
        setTimeout(() => {
          loadUnreadCounts();
        }, 100);
      } catch (err) {
        console.error('Ошибка загрузки каналов:', err);
      }
    };
    loadCustomChannels();
  }, [userCompanyId, loadUnreadCounts]);

  // Загрузка сообщений
  const loadMessages = useCallback(async () => {
    if (!userCompanyId || !activeChannel) return;
    
    setLoading(true);
    try {
      const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
      const isDirectChat = activeChannel?.startsWith('dm_');
      
      let query = supabase
        .from('company_messages')
        .select('*')
        .eq('company_id', userCompanyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (isSystemChannel) {
        query = query.eq('channel', activeChannel).eq('channel_type', 'system');
      } else if (isDirectChat) {
        query = query.eq('channel_id', activeChannel).eq('channel_type', 'direct');
      } else {
        query = query.eq('channel_id', activeChannel).eq('channel_type', 'custom');
      }
      
      const { data: messagesData, error } = await query;
      if (error) {
        console.error('Ошибка загрузки:', error);
        throw error;
      }
      
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
          .select('user_id, full_name, role')
          .in('user_id', userIds);
        usersMap = (usersData || []).reduce((acc, u) => {
          acc[u.user_id] = { full_name: u.full_name, role: u.role };
          return acc;
        }, {});
      }
      
      let replyMap = {};
      const messagesWithReply = messagesData?.filter(m => m.reply_to_message_id) || [];
      if (messagesWithReply.length > 0) {
        const replyIds = messagesWithReply.map(m => m.reply_to_message_id);
        const { data: replyMessages } = await supabase
          .from('company_messages')
          .select('id, content, user_id')
          .in('id', replyIds);
        
        if (replyMessages) {
          const replyUserIds = [...new Set(replyMessages.map(r => r.user_id))];
          let replyUsersMap = {};
          if (replyUserIds.length > 0) {
            const { data: replyUsers } = await supabase
              .from('company_users')
              .select('user_id, full_name')
              .in('user_id', replyUserIds);
            replyUsersMap = (replyUsers || []).reduce((acc, u) => {
              acc[u.user_id] = { full_name: u.full_name };
              return acc;
            }, {});
          }
          
          replyMessages.forEach(reply => {
            replyMap[reply.id] = {
              ...reply,
              user: { user_metadata: { full_name: replyUsersMap[reply.user_id]?.full_name || 'Пользователь' } }
            };
          });
        }
      }
      
      const { data: pinnedData } = await supabase
        .from('company_messages')
        .select('id')
        .eq('company_id', userCompanyId)
        .eq('is_pinned', true);
      
      if (pinnedData) {
        setPinnedMessages(pinnedData.map(p => p.id));
      }
      
      const enrichedMessages = (messagesData || []).map(msg => ({
        ...msg,
        user: { user_metadata: usersMap[msg.user_id] || { full_name: 'Пользователь', role: 'user' } },
        reactions: reactionsMap[msg.id] || [],
        replied_message: replyMap[msg.reply_to_message_id] || null
      }));
      
      setMessages(enrichedMessages);
      
      setTimeout(() => {
        forceScrollToBottom('auto');
      }, 150);
      
      markChannelAsRead(activeChannel);
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
      showNotification?.('Ошибка загрузки чата', 'error');
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, activeChannel, showNotification, markChannelAsRead, forceScrollToBottom]);

  // Загрузка сообщений при смене канала
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Подписка на новые сообщения
  useEffect(() => {
    if (!userCompanyId || !activeChannel) return;
    
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    
    const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
    const filter = isSystemChannel 
      ? `company_id=eq.${userCompanyId} AND channel=eq.${activeChannel} AND channel_type=eq.system`
      : `channel_id=eq.${activeChannel}`;
    
    subscriptionRef.current = supabase
      .channel(`messages:${activeChannel}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'company_messages',
        filter: filter
      }, async (payload) => {
        const newMsg = payload.new;
        if (newMsg.deleted_at) return;
        
        const msgChannelId = newMsg.channel_id || newMsg.channel;
        if (activeChannel !== msgChannelId && newMsg.user_id !== user?.id) {
          setUnreadCounts(prev => ({
            ...prev,
            [msgChannelId]: (prev[msgChannelId] || 0) + 1
          }));
        }
        
        const { data: userData } = await supabase
          .from('company_users')
          .select('full_name, role')
          .eq('user_id', newMsg.user_id)
          .single();
        
        const { data: reactionsData } = await supabase
          .from('message_reactions')
          .select('emoji, user_id')
          .eq('message_id', newMsg.id);
        
        const enrichedMessage = {
          ...newMsg,
          user: { user_metadata: userData || { full_name: 'Пользователь', role: 'user' } },
          reactions: reactionsData || [],
          replied_message: null
        };
        
        setMessages(prev => [...prev, enrichedMessage]);
        
        setTimeout(() => {
          scrollToBottom('smooth');
        }, 50);
      })
      .on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'company_messages',
  filter: filter
}, (payload) => {
  const updatedMsg = payload.new;
  if (updatedMsg.deleted_at) {
    // ИСПРАВЛЕНИЕ: Удаляем из массива, а не обновляем
    setMessages(prev => prev.filter(m => m.id !== updatedMsg.id));
  } else {
    // Если сообщение просто отредактировано (не удалено) - обновляем его
    setMessages(prev => prev.map(m => 
      m.id === updatedMsg.id 
        ? { ...m, ...updatedMsg }
        : m
    ));
  }
})
      .subscribe();
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [userCompanyId, activeChannel, user?.id, scrollToBottom]);

  // Загрузка сохранённых сообщений
  useEffect(() => {
    const loadSavedMessages = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('saved_messages')
        .select('message_id')
        .eq('user_id', user.id);
      if (data) {
        setSavedMessages(new Set(data.map(s => s.message_id)));
      }
    };
    loadSavedMessages();
  }, [user?.id]);

  // Сохранение/удаление сообщения
  const toggleSaveMessage = useCallback(async (messageId) => {
    if (!user?.id) return;
    
    if (savedMessages.has(messageId)) {
      await supabase.from('saved_messages').delete().eq('message_id', messageId).eq('user_id', user.id);
      setSavedMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      showNotification?.('Сообщение удалено из сохранённых', 'info');
    } else {
      await supabase.from('saved_messages').insert({ message_id: messageId, user_id: user.id, saved_at: new Date() });
      setSavedMessages(prev => new Set([...prev, messageId]));
      showNotification?.('Сообщение сохранено', 'success');
    }
  }, [user?.id, savedMessages, showNotification]);

  // Ответ на сообщение
  const handleReply = useCallback((message) => {
    setReplyTo(message);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  // Индикатор печати
  const handleTyping = useCallback(() => {
    if (!user?.id || !activeChannel) return;
    
    const typingChannel = supabase.channel(`typing:${activeChannel}`);
    typingChannel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id, user_name: user.user_metadata?.full_name || 'Пользователь' }
    });
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      typingChannel.send({
        type: 'broadcast',
        event: 'typing_stop',
        payload: { user_id: user.id }
      });
    }, 1000);
  }, [user?.id, activeChannel, user?.user_metadata?.full_name]);

  // Подписка на события печати
  useEffect(() => {
    if (!activeChannel) return;
    
    const typingChannel = supabase.channel(`typing:${activeChannel}`);
    typingChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== user?.id) {
          setTypingUsers(prev => new Set([...prev, payload.user_id]));
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(payload.user_id);
              return newSet;
            });
          }, 2000);
        }
      })
      .subscribe();
    
    return () => { typingChannel.unsubscribe(); };
  }, [activeChannel, user?.id]);

  // Отправка сообщения
  const sendMessage = useCallback(async () => {
    const content = newMessage.trim();
    if (!content || !user?.id || sending) return;
    
    if (!canWriteToChannel(activeChannel)) {
      showNotification?.('У вас нет прав на отправку сообщений в этот канал', 'error');
      return;
    }
    
    const safeCompanyId = userCompanyId;
    if (!safeCompanyId) {
      showNotification?.('Ошибка: компания не указана', 'error');
      return;
    }
    
    setSending(true);
    try {
      const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
      const isDirectChat = activeChannel?.startsWith('dm_');
      
      const messageData = {
        company_id: safeCompanyId,
        user_id: user.id,
        content: content,
        created_at: new Date().toISOString(),
        reply_to_message_id: replyTo?.id || null
      };
      
      if (isSystemChannel) {
        messageData.channel = activeChannel;
        messageData.channel_type = 'system';
        messageData.channel_id = null;
      } else if (isDirectChat) {
        messageData.channel_id = activeChannel;
        messageData.channel_type = 'direct';
        messageData.channel = null;
      } else {
        messageData.channel_id = activeChannel;
        messageData.channel_type = 'custom';
        messageData.channel = null;
      }
      
      const { error } = await supabase.from('company_messages').insert([messageData]);
      if (error) {
        console.error('Ошибка Supabase:', error);
        throw error;
      }
      
      setNewMessage('');
      setReplyTo(null);
      
      forceScrollToBottom('smooth');
    } catch (err) {
      console.error('Ошибка отправки:', err);
      showNotification?.('Не удалось отправить сообщение: ' + (err.message || 'неизвестная ошибка'), 'error');
    } finally {
      setSending(false);
    }
  }, [newMessage, user?.id, sending, activeChannel, canWriteToChannel, userCompanyId, replyTo, showNotification, forceScrollToBottom]);

  // Загрузка участников канала
  const loadChannelMembers = useCallback(async (channelId) => {
    if (!channelId) return;
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('channel_members')
        .select('user_id, role, joined_at')
        .eq('channel_id', channelId);
      
      if (error) throw error;
      
      const userIds = data?.map(m => m.user_id) || [];
      let usersMap = {};
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('company_users')
          .select('user_id, full_name, role')
          .in('user_id', userIds);
        usersMap = (usersData || []).reduce((acc, u) => {
          acc[u.user_id] = { full_name: u.full_name, role: u.role };
          return acc;
        }, {});
      }
      
      const membersWithUsers = (data || []).map(m => ({
        ...m,
        user: usersMap[m.user_id] || { full_name: 'Пользователь', role: 'user' }
      }));
      
      setChannelMembers(membersWithUsers);
    } catch (err) {
      console.error('Ошибка загрузки участников:', err);
      showNotification?.('Не удалось загрузить участников', 'error');
    } finally {
      setLoadingMembers(false);
    }
  }, [showNotification]);

  // Добавление участника в канал
  const addChannelMember = useCallback(async (channelId, userId) => {
    if (!channelId || !userId) return;
    
    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({ channel_id: channelId, user_id: userId, role: 'member' });
      
      if (error) throw error;
      
      await loadChannelMembers(channelId);
      showNotification?.('Участник добавлен', 'success');
    } catch (err) {
      console.error('Ошибка добавления участника:', err);
      showNotification?.('Не удалось добавить участника', 'error');
    }
  }, [loadChannelMembers, showNotification]);

  // Удаление участника из канала
  const removeChannelMember = useCallback(async (channelId, userId) => {
    if (!channelId || !userId) return;
    
    try {
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      await loadChannelMembers(channelId);
      showNotification?.('Участник удалён', 'info');
    } catch (err) {
      console.error('Ошибка удаления участника:', err);
      showNotification?.('Не удалось удалить участника', 'error');
    }
  }, [loadChannelMembers, showNotification]);

  // Удаление канала
  const deleteChannel = useCallback(async (channelId) => {
    if (!channelId) return;
    
    const channel = customChannels.find(c => c.id === channelId);
    if (!channel) return;
    
    if (!window.confirm(`Удалить канал "${channel.name}"? Все сообщения в канале будут удалены.`)) return;
    
    try {
      await supabase.from('company_messages').delete().eq('channel_id', channelId);
      await supabase.from('channel_members').delete().eq('channel_id', channelId);
      
      const { error } = await supabase.from('company_channels').delete().eq('id', channelId);
      if (error) throw error;
      
      setCustomChannels(prev => prev.filter(c => c.id !== channelId));
      if (activeChannel === channelId) {
        setActiveChannel('general');
      }
      showNotification?.('Канал удалён', 'success');
    } catch (err) {
      console.error('Ошибка удаления канала:', err);
      showNotification?.('Не удалось удалить канал', 'error');
    }
  }, [customChannels, activeChannel, showNotification]);

  // Создание канала
  const handleCreateChannel = useCallback(async (channelData) => {
    if (!userCompanyId || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('company_channels')
        .insert([{
          company_id: userCompanyId,
          name: channelData.name,
          description: channelData.description,
          icon: channelData.icon,
          is_private: channelData.is_private || false,
          created_by: user.id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      await supabase.from('channel_members').insert({
        channel_id: data.id,
        user_id: user.id,
        role: 'admin'
      });
      
      if (channelData.is_private && channelData.memberIds?.length) {
        await supabase.from('channel_members').insert(
          channelData.memberIds.map(userId => ({
            channel_id: data.id,
            user_id: userId,
            role: 'member'
          }))
        );
      }
      
      setCustomChannels(prev => [...prev, data]);
      setActiveChannel(data.id);
      showNotification?.('Канал создан', 'success');
    } catch (err) {
      console.error('Ошибка создания канала:', err);
      showNotification?.('Не удалось создать канал', 'error');
      throw err;
    }
  }, [userCompanyId, user?.id, showNotification]);

  // Редактирование сообщения
  const startEdit = useCallback((message) => {
    setEditingMessageId(message.id);
    setEditText(message.content);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);
  
  const saveEdit = useCallback(async (messageId) => {
    const content = editText.trim();
    if (!content) return;
    
    try {
      await supabase
        .from('company_messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', user?.id);
      
      setEditingMessageId(null);
      setEditText('');
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m
      ));
      showNotification?.('Сообщение обновлено', 'success');
    } catch (err) {
      console.error('Ошибка редактирования:', err);
      showNotification?.('Не удалось обновить сообщение', 'error');
    }
  }, [editText, user?.id, showNotification]);
  
  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditText('');
  }, []);

  // Удаление сообщения
const deleteMessage = useCallback(async (messageId) => {
  if (!window.confirm('Удалить сообщение?')) return;
  
  try {
    const message = messages.find(m => m.id === messageId);
    if (!message) {
      console.warn('Сообщение не найдено в массиве:', messageId);
      return;
    }
    
    const canDelete = message.user_id === user?.id || 
                      userRole === 'manager' || 
                      userRole === 'supply_admin';
    
    if (!canDelete) {
      showNotification?.('У вас нет прав на удаление этого сообщения', 'error');
      return;
    }
    
    console.log('🗑️ Удаляем сообщение:', messageId);
    
    const { error } = await supabase
      .from('company_messages')
      .update({ 
        deleted_at: new Date().toISOString(),
        content: '[Сообщение удалено]' 
      })
      .eq('id', messageId);
    
    if (error) {
      console.error('❌ Ошибка Supabase при удалении:', error);
      throw error;
    }
    
    console.log('✅ Сообщение удалено из базы');
    
    // ГЛАВНОЕ ИСПРАВЛЕНИЕ: Удаляем сообщение из локального массива
    setMessages(prev => prev.filter(m => m.id !== messageId));
    
    showNotification?.('Сообщение удалено', 'info');
  } catch (err) {
    console.error('Ошибка удаления:', err);
    showNotification?.('Не удалось удалить сообщение: ' + (err.message || 'неизвестная ошибка'), 'error');
  }
}, [user?.id, userRole, messages, showNotification]);

  // Реакция на сообщение
  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!user?.id) return;
    
    const message = messages.find(m => m.id === messageId);
    const hasReacted = message?.reactions?.some(r => r.emoji === emoji && r.user_id === user.id);
    
    try {
      if (hasReacted) {
        await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
        
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, reactions: m.reactions.filter(r => !(r.emoji === emoji && r.user_id === user.id)) }
            : m
        ));
      } else {
        await supabase
          .from('message_reactions')
          .insert({ message_id: messageId, user_id: user.id, emoji, created_at: new Date().toISOString() });
        
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, reactions: [...m.reactions, { emoji, user_id: user.id }] }
            : m
        ));
      }
      setShowReactionsPicker(null);
    } catch (err) {
      console.error('Ошибка реакции:', err);
    }
  }, [user?.id, messages]);

  // Закрепить сообщение
  const handlePinMessage = useCallback(async (messageId) => {
    try {
      if (pinnedMessages.includes(messageId)) {
        setPinnedMessages(prev => prev.filter(id => id !== messageId));
        await supabase
          .from('company_messages')
          .update({ is_pinned: false, pinned_at: null })
          .eq('id', messageId);
        showNotification?.('Сообщение откреплено', 'info');
      } else {
        if (pinnedMessages.length >= 5) {
          showNotification?.('Нельзя закрепить более 5 сообщений', 'warning');
          return;
        }
        setPinnedMessages(prev => [...prev, messageId]);
        await supabase
          .from('company_messages')
          .update({ is_pinned: true, pinned_at: new Date().toISOString() })
          .eq('id', messageId);
        showNotification?.('Сообщение закреплено', 'success');
      }
    } catch (err) {
      console.error('Ошибка при закреплении:', err);
      showNotification?.('Не удалось закрепить сообщение', 'error');
    }
  }, [pinnedMessages, showNotification]);

  // Копировать сообщение
  const handleCopyMessage = useCallback((messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.content && !message.deleted_at) {
      navigator.clipboard.writeText(message.content);
      showNotification?.('Текст скопирован в буфер обмена', 'success');
    }
  }, [messages, showNotification]);

  // Загрузка файла (Drag & Drop + кнопка)
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files[0];
    if (!file || !userCompanyId) return;
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotification?.('Файл слишком большой (макс. 10MB)', 'error');
      return;
    }
    
    try {
      const fileName = `${userCompanyId}/${Date.now()}_${file.name.replace(/[^a-z0-9.-]/gi, '_')}`;
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
      setNewMessage(prev => prev + `\n📎 ${file.name}: ${publicUrl}`);
      showNotification?.('Файл прикреплён', 'success');
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      showNotification?.('Не удалось загрузить файл', 'error');
    }
    if (e.target) e.target.value = '';
  }, [userCompanyId, showNotification]);

  // Обработка текстового поля
  const handleTextareaChange = useCallback((e) => {
    const value = e.target.value;
    setNewMessage(value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    
    if (value.trim()) {
      handleTyping();
    }
  }, [handleTyping]);
  
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        saveEdit(editingMessageId);
      } else {
        sendMessage();
      }
    }
    if (e.key === 'Escape') {
      if (editingMessageId) cancelEdit();
      setShowReactionsPicker(null);
      setReplyTo(null);
    }
  }, [editingMessageId, saveEdit, sendMessage, cancelEdit]);

  // Переключение сайдбара
  const toggleSidebar = useCallback(() => {
    setShowSidebar(prev => !prev);
  }, []);

  // Выбор канала
  const handleChannelSelect = useCallback((channelId) => {
    setActiveChannel(channelId);
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    isUserScrollingRef.current = false;
    if (isMobile) {
      setShowSidebar(false);
    }
  }, [isMobile]);

  // Очистка таймеров при размонтировании
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <ChatSidebar
          channels={allChannels}
          activeChannel={activeChannel}
          onChannelSelect={handleChannelSelect}
          canCreateChannel={userRole === 'manager' || userRole === 'supply_admin'}
          onCreateChannel={() => setShowCreateModal(true)}
          connectionStatus={connectionStatus}
          isMobile={isMobile}
          showSidebar={showSidebar}
          onCloseSidebar={toggleSidebar}
          onChannelSettings={(channel) => {
            setSelectedChannel(channel);
            setShowChannelSettings(true);
            loadChannelMembers(channel.id);
          }}
          onDeleteChannel={deleteChannel}
          currentUserRole={userRole}
          companyUsers={companyUsers}
          currentUser={user}
          onStartDirectChat={startDirectChat}
          unreadCounts={unreadCounts}
          lastReadTimes={lastReadTimes}
        />

        {(!isMobile || !showSidebar) && (
          <div className="flex-1 flex flex-col min-w-0 h-full">
            <header className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 sm:gap-3">
                {isMobile && !showSidebar && (
                  <button 
                    onClick={toggleSidebar}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}
                
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl bg-gray-100 dark:bg-gray-700 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center">
                    {currentChannel?.icon || '💬'}
                  </span>
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                      {currentChannel?.label || currentChannel?.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                      {currentChannel?.description}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowSearch(!showSearch)}
                  className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                  <Search className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                  <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{messages.filter(m => !m.deleted_at).length}</span>
                </div>
              </div>
            </header>

            {/* Поиск */}
            {showSearch && (
              <div className="p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-20 shadow-md">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Поиск по сообщениям..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    autoFocus
                  />
                  <button onClick={() => {setShowSearch(false); setSearchQuery('')}} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    <X size={16}/>
                  </button>
                </div>
                {searchQuery && (
                  <div className="text-xs text-gray-500 mt-1 px-2">Найдено сообщений: {displayedMessages.length}</div>
                )}
              </div>
            )}

            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 relative"
              onScroll={handleScroll}
              style={{ WebkitOverflowScrolling: 'touch' }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e);
              }}
            >
              {isDragging && (
                <div className="absolute inset-0 z-30 bg-blue-500/10 border-4 border-blue-500 border-dashed m-4 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center">
                    <Download size={48} className="text-blue-500 mb-2"/>
                    <p className="font-bold text-lg">Отпустите файл для отправки</p>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
                  <span className="text-sm text-gray-500">Загрузка...</span>
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="font-medium text-base sm:text-lg">
                    {searchQuery ? 'Ничего не найдено' : 'Нет сообщений'}
                  </p>
                  <p className="text-xs sm:text-sm mt-1 opacity-70">
                    {searchQuery ? 'Попробуйте изменить запрос' : 'Начните обсуждение!'}
                  </p>
                </div>
              ) : (
                <>
                  {displayedMessages.map(msg => (
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
                      onReply={handleReply}
                      onToggleSave={toggleSaveMessage}
                      isSaved={savedMessages.has(msg.id)}
                      showReactionsPicker={showReactionsPicker}
                      setShowReactionsPicker={setShowReactionsPicker}
                      formatMessage={formatMessage}
                      textareaRef={textareaRef}
                      companyUsers={companyUsers}
                      onPinMessage={handlePinMessage}
                      isPinned={pinnedMessages.includes(msg.id)}
                      onCopyMessage={handleCopyMessage}
                    />
                  ))}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {isUserScrolling && !shouldAutoScroll && messages.length > 10 && (
              <button
                onClick={() => forceScrollToBottom('smooth')}
                className="absolute bottom-24 right-4 bg-[#4A6572] text-white rounded-full p-2 shadow-lg hover:bg-[#344955] transition-all z-10"
                style={{ bottom: '100px' }}
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            )}

            <div className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
              {typingUsers.size > 0 && (
                <div className="mb-2 flex items-center gap-2">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="text-xs text-gray-500 animate-pulse">
                    {Array.from(typingUsers).map(id => {
                      const userData = companyUsers.find(u => u.user_id === id);
                      return userData?.full_name?.split(' ')[0];
                    }).join(', ')} печатает...
                  </span>
                </div>
              )}
              
              {replyTo && (
                <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-start border-l-4 border-[#4A6572]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <CornerUpLeft className="w-3 h-3 text-[#4A6572]" />
                      <span className="font-bold text-[#4A6572] dark:text-[#F9AA33]">
                        Ответ {replyTo.user?.user_metadata?.full_name || 'пользователю'}:
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                      {replyTo.content?.slice(0, 80)}
                    </p>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-200 rounded-lg">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}
              
              <div className="flex items-end gap-2">
                <label className="p-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                  <Paperclip className="w-5 h-5" />
                  <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx" />
                </label>

                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder={replyTo ? `Ответ ${replyTo.user?.user_metadata?.full_name}...` : (t?.('chat.placeholder') || 'Введите сообщение...')}
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-[#4A6572] resize-none text-sm"
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className={`p-2.5 rounded-xl transition-all ${
                    !newMessage.trim() || sending
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-lg active:scale-95'
                  }`}
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
              
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 dark:text-gray-500">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> — отправить
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded ml-2">Shift+Enter</kbd> — новая строка
              </div>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Создать канал</h3>
            <input type="text" placeholder="Название" className="w-full p-2 border rounded-lg mb-3" id="channelName" />
            <textarea placeholder="Описание" className="w-full p-2 border rounded-lg mb-3" rows={2} id="channelDesc" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600">Отмена</button>
              <button onClick={() => {
                const name = document.getElementById('channelName')?.value;
                const description = document.getElementById('channelDesc')?.value;
                if (name) {
                  handleCreateChannel({ name, description, icon: '💬', is_private: false });
                  setShowCreateModal(false);
                }
              }} className="px-4 py-2 bg-[#4A6572] text-white rounded-lg">Создать</button>
            </div>
          </div>
        </div>
      )}

      {showChannelSettings && selectedChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Управление каналом: {selectedChannel.name}</h3>
              <button onClick={() => setShowChannelSettings(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">Участники ({channelMembers.length})</h4>
              {loadingMembers ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : channelMembers.length === 0 ? (
                <p className="text-sm text-gray-500">Нет участников</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {channelMembers.map(member => {
                    const isCreator = selectedChannel.created_by === member.user_id;
                    const canRemove = !isCreator && (userRole === 'manager' || userRole === 'supply_admin');
                    return (
                      <div key={member.user_id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{member.user?.full_name || 'Пользователь'}</p>
                          <p className="text-xs text-gray-500">{member.role}{isCreator && ' (создатель)'}</p>
                        </div>
                        {canRemove && (
                          <button
                            onClick={() => removeChannelMember(selectedChannel.id, member.user_id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Добавить участника</h4>
              <select className="w-full p-2 border rounded-lg mb-3" id="newMemberSelect">
                <option value="">-- Выберите пользователя --</option>
                {companyUsers
                  .filter(u => !channelMembers.some(m => m.user_id === u.user_id))
                  .map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>
                  ))
                }
              </select>
              <button
                onClick={() => {
                  const select = document.getElementById('newMemberSelect');
                  const userId = select?.value;
                  if (userId) {
                    addChannelMember(selectedChannel.id, userId);
                    select.value = '';
                  }
                }}
                className="w-full py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955]"
              >
                Добавить
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  if (confirm(`Удалить канал "${selectedChannel.name}"?`)) {
                    deleteChannel(selectedChannel.id);
                    setShowChannelSettings(false);
                  }
                }}
                className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Удалить канал
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CompanyChat);