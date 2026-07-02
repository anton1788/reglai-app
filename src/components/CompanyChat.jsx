// src/components/CompanyChat.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  Send, Smile, Paperclip, Edit2, Trash2, X, Check,
  Loader2, MessageCircle, User, AlertCircle,
  Plus, Users, Settings, Search, CornerUpLeft, Bookmark, BookmarkCheck,
  Menu, ChevronDown, Pin, Copy, Reply,
  Mic, MicOff, Image, File, MoreVertical, Zap,
  UserPlus, UserMinus, Bell, Crown, AtSign
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

// ============================================================
// 📐 КОНСТАНТЫ И НАСТРОЙКИ
// ============================================================

const SYSTEM_CHANNELS = [
  { 
    id: 'general', 
    label: 'Общий', 
    icon: '💬', 
    color: '#4A6572', 
    description: 'Общие вопросы и обсуждения',
    category: 'Основные'
  },
  { 
    id: 'supply', 
    label: 'Снабжение', 
    icon: '📦', 
    color: '#F9AA33', 
    description: 'Закупки и поставки материалов',
    category: 'Рабочие'
  },
  { 
    id: 'foremen', 
    label: 'Прорабы', 
    icon: '👷', 
    color: '#2E7D32', 
    description: 'Обсуждение объектов',
    category: 'Рабочие'
  },
  { 
    id: 'announcements', 
    label: 'Объявления', 
    icon: '📢', 
    color: '#D32F2F', 
    description: 'Важные объявления',
    category: 'Административные'
  },
];

const REACTION_EMOJIS = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Laugh' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '🔥', label: 'Fire' },
];

const EMOJI_CATEGORIES = [
  { name: 'Смайлы', emojis: ['😊', '😂', '🤣', '😅', '😍', '🥰', '😘', '😗', '😙', '😚'] },
  { name: 'Реакции', emojis: ['👍', '👎', '👏', '🙌', '🤝', '✊', '💪', '🤗', '🤔', '🙄'] },
  { name: 'Работа', emojis: ['💼', '📊', '📈', '📉', '📋', '📝', '📎', '📌', '🔗', '📅'] },
  { name: 'Стройка', emojis: ['🏗️', '🪚', '🔨', '⚒️', '🛠️', '📐', '🔧', '🧱', '🏠', '🪜'] },
];

const QUICK_REPLIES = [
  '✅ Принято',
  '📦 Отправлено',
  '⏳ В обработке',
  '📞 Свяжусь позже',
  '📄 Документы готовы',
  '✅ Готово',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PINNED = 5;
const MESSAGES_PER_PAGE = 50;

// ============================================================
// 🎨 СТИЛИ
// ============================================================

const styles = `
  @keyframes messageSlideIn {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes typingDot {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-6px); }
  }
  
  .message-enter {
    animation: messageSlideIn 250ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  
  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: 8px 12px;
    background: rgba(74, 101, 114, 0.08);
    border-radius: 16px;
  }
  .typing-indicator span {
    width: 8px;
    height: 8px;
    background: #4A6572;
    border-radius: 50%;
    animation: typingDot 1.2s ease-in-out infinite;
  }
  .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
  .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
  
  .glass-effect {
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  .dark .glass-effect {
    background: rgba(30, 30, 30, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  
  .channel-active {
    background: linear-gradient(135deg, rgba(74, 101, 114, 0.12), rgba(74, 101, 114, 0.05));
    border-left: 3px solid #4A6572;
  }
  .dark .channel-active {
    background: linear-gradient(135deg, rgba(74, 101, 114, 0.2), rgba(74, 101, 114, 0.05));
    border-left: 3px solid #F9AA33;
  }
  
  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: rgba(74, 101, 114, 0.3);
    border-radius: 4px;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: rgba(74, 101, 114, 0.5);
  }
  
  .sidebar-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 40;
  }
  
  @media (max-width: 768px) {
    .chat-container {
      height: calc(100vh - 80px) !important;
      border-radius: 0 !important;
    }
    .message-text {
      font-size: 14px !important;
      line-height: 1.5 !important;
    }
    .message-actions {
      opacity: 1 !important;
    }
  }
`;

// ============================================================
// 🔧 ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ============================================================

const Avatar = memo(({ name, size = 'md', className = '' }) => {
  const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };
  const initial = name?.[0]?.toUpperCase() || '?';
  const colors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-green-500 to-green-600',
    'from-red-500 to-red-600',
    'from-yellow-500 to-yellow-600',
    'from-pink-500 to-pink-600',
    'from-indigo-500 to-indigo-600',
    'from-teal-500 to-teal-600',
  ];
  const colorIndex = (name?.length || 0) % colors.length;
  
  return (
    <div className={`rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-semibold ${sizeMap[size]} ${className}`}>
      {initial}
    </div>
  );
});

const TimeDisplay = memo(({ date, language = 'ru' }) => {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Вчера ${d.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  }
  
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (d > weekAgo) {
    return d.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return d.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

// ============================================================
// 📱 КОМПОНЕНТ ПРЕВЬЮ ФАЙЛА
// ============================================================

const FilePreview = memo(({ file, onRemove }) => {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (file.type?.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  }, [file]);

  return (
    <div className="relative inline-flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
      {preview ? (
        <img src={preview} alt={file.name} className="w-12 h-12 object-cover rounded" />
      ) : (
        <File className="w-8 h-8 text-gray-400" />
      )}
      <div className="flex flex-col">
        <span className="text-xs truncate max-w-[100px]">{file.name}</span>
        <span className="text-[10px] text-gray-400">{formatFileSize(file.size)}</span>
      </div>
      <button 
        onClick={onRemove} 
        className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
      >
        <X className="w-3.5 h-3.5 text-gray-500" />
      </button>
    </div>
  );
});

// ============================================================
// 📱 КОМПОНЕНТ СООБЩЕНИЯ
// ============================================================

const MessageItem = memo(({
  msg, user, userRole, isOwn, isEditing, editText,
  onStartEdit, onSaveEdit, onCancelEdit, onDelete,
  onToggleReaction, onReply, onToggleSave, isSaved,
  formatMessage, language, textareaRef,
  onPinMessage, isPinned, onCopyMessage,
  isHighlighted, isFirstUnread,
}) => {
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const menuRef = useRef(null);
  const reactionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowFullMenu(false);
      }
      if (reactionsRef.current && !reactionsRef.current.contains(e.target)) {
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const reactionCounts = useMemo(() => {
    if (!msg.reactions?.length) return {};
    return msg.reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});
  }, [msg.reactions]);

  const hasReacted = useCallback((emoji) => {
    return msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
  }, [msg.reactions, user?.id]);

  const canEdit = msg.user_id === user?.id || userRole === 'manager' || userRole === 'supply_admin';
  const canDelete = msg.user_id === user?.id || userRole === 'manager' || userRole === 'supply_admin';

  const renderContent = () => {
    if (isEditing) {
      return (
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
            className="flex-1 bg-black/5 dark:bg-white/5 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#F9AA33] min-h-[60px] text-gray-900 dark:text-white"
            rows={3}
            autoFocus
          />
          <div className="flex flex-col gap-1">
            <button onClick={() => onSaveEdit(msg.id)} className="p-1.5 hover:bg-green-500/20 text-green-600 rounded-lg transition-colors">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={onCancelEdit} className="p-1.5 hover:bg-red-500/20 text-red-600 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        {msg.replied_message && (
          <div className="mb-2 p-2 bg-black/5 dark:bg-white/5 rounded-lg border-l-4 border-[#4A6572] cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
            <p className="text-xs font-bold text-[#4A6572] dark:text-[#F9AA33]">
              {msg.replied_message.user?.user_metadata?.full_name || 'Пользователь'}
            </p>
            <p className="text-xs opacity-75 truncate">{msg.replied_message.content}</p>
          </div>
        )}
        
        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed message-text">
          {formatMessage?.(msg.content)}
        </div>
        
        {msg.attachments?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {msg.attachments.map((att, idx) => (
              <a
                key={idx}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-lg text-xs hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                {att.type === 'image' ? <Image className="w-3.5 h-3.5" /> : <File className="w-3.5 h-3.5" />}
                {att.name}
                <span className="text-gray-400 text-[10px]">{formatFileSize(att.size)}</span>
              </a>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <article
      className={`group flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} message-enter ${isHighlighted ? 'bg-yellow-50/50 dark:bg-yellow-900/10 -mx-2 px-2 py-1 rounded-lg' : ''}`}
      onDoubleClick={() => !isEditing && onToggleReaction?.(msg.id, '❤️')}
    >
      <div className={`flex-shrink-0 ${isOwn ? 'order-2' : ''}`}>
        <Avatar name={msg.user?.user_metadata?.full_name} size="md" />
        {msg.user?.user_metadata?.role === 'manager' && (
          <div className="relative -top-2 -right-2">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
          </div>
        )}
      </div>

      <div className={`max-w-[85%] md:max-w-[70%] ${isOwn ? 'order-1' : ''}`}>
        <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? 'justify-end' : ''}`}>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
            {msg.user?.user_metadata?.full_name || 'Пользователь'}
          </span>
          {!isOwn && msg.user?.user_metadata?.role && (
            <span className="text-[10px] text-gray-400 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
              {msg.user.user_metadata.role}
            </span>
          )}
          <TimeDisplay date={msg.created_at} language={language} />
          {msg.edited_at && <span className="text-[10px] text-gray-400">(изм.)</span>}
        </div>

        <div className={`relative rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
          isOwn
            ? 'bg-gradient-to-br from-[#4A6572] to-[#344955] text-white rounded-br-md'
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-gray-100 dark:border-gray-600'
        } ${isPinned ? 'border-l-4 border-l-yellow-400' : ''} ${isHighlighted ? 'ring-2 ring-yellow-400/50' : ''}`}>
          {renderContent()}

          {!isEditing && Object.keys(reactionCounts).length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-2 ${isOwn ? 'justify-end' : ''}`}>
              {Object.entries(reactionCounts).map(([emoji, count]) => {
                const reacted = hasReacted(emoji);
                return (
                  <button
                    key={`${msg.id}-${emoji}`}
                    onClick={() => onToggleReaction?.(msg.id, emoji)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
                      reacted
                        ? 'bg-[#4A6572]/10 text-[#4A6572] dark:bg-[#F9AA33]/10 dark:text-[#F9AA33] scale-105'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {emoji} <span className="text-[10px]">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!isEditing && !msg.deleted_at && (
          <div className={`flex items-center gap-0.5 mt-1 text-xs message-actions ${isOwn ? 'justify-end' : ''}`}>
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              title="Реакции"
            >
              <Smile className="w-3.5 h-3.5 text-gray-500" />
            </button>

            <button onClick={() => onReply?.(msg)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Ответить">
              <Reply className="w-3.5 h-3.5 text-gray-500" />
            </button>

            <button onClick={() => onToggleSave?.(msg.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Сохранить">
              {isSaved ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#F9AA33]" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-gray-500" />
              )}
            </button>

            <button onClick={() => onCopyMessage?.(msg.id)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Копировать">
              <Copy className="w-3.5 h-3.5 text-gray-500" />
            </button>

            {canEdit && (
              <button onClick={() => onStartEdit?.(msg)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors" title="Редактировать">
                <Edit2 className="w-3.5 h-3.5 text-blue-500" />
              </button>
            )}

            {canDelete && (
              <button onClick={() => onDelete?.(msg.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors" title="Удалить">
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            )}

            {onPinMessage && (
              <button onClick={() => onPinMessage?.(msg.id)} className="p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-full transition-colors" title={isPinned ? 'Открепить' : 'Закрепить'}>
                {isPinned ? <Pin className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> : <Pin className="w-3.5 h-3.5 text-gray-500" />}
              </button>
            )}

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowFullMenu(!showFullMenu)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
              </button>
              {showFullMenu && (
                <div className="absolute bottom-full mb-1 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[180px] z-50">
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Уведомить
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                    <Copy className="w-4 h-4" /> Скопировать ссылку
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {showReactions && (
          <div
            ref={reactionsRef}
            className={`flex gap-1 mt-1 p-1.5 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 ${isOwn ? 'justify-end' : ''}`}
          >
            {REACTION_EMOJIS.map(({ emoji }) => (
              <button
                key={emoji}
                onClick={() => {
                  onToggleReaction?.(msg.id, emoji);
                  setShowReactions(false);
                }}
                className={`p-1.5 rounded-lg text-lg transition-all hover:scale-125 ${
                  hasReacted(emoji) ? 'bg-[#4A6572]/10 scale-110' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {isFirstUnread && (
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#4A6572]/30 dark:to-[#F9AA33]/30" />
            <span className="text-xs font-medium text-[#4A6572] dark:text-[#F9AA33] px-2 py-0.5 bg-[#4A6572]/10 dark:bg-[#F9AA33]/10 rounded-full">
              Новые сообщения
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#4A6572]/30 dark:to-[#F9AA33]/30" />
          </div>
        )}
      </div>
    </article>
  );
});

// ============================================================
// 📋 КОМПОНЕНТ БОКОВОЙ ПАНЕЛИ (ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ)
// ============================================================

const ChatSidebar = memo(({
  channels,
  activeChannel,
  onChannelSelect,
  canCreateChannel,
  onCreateChannel,
  connectionStatus,
  isMobile,
  showSidebar,
  onCloseSidebar,
  currentUserRole,
  companyUsers,
  currentUser,
  onStartDirectChat,
  unreadCounts,
  lastReadTimes,
  searchQuery,
  onSearchChange,
}) => {
  const [filteredChannels, setFilteredChannels] = useState(channels);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredChannels(
        channels.filter(ch =>
          ch.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ch.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ch.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredChannels(channels);
    }
  }, [searchQuery, channels]);

  const groupedChannels = useMemo(() => {
    const groups = {};
    filteredChannels.forEach(ch => {
      const category = ch.category || 'Другие';
      if (!groups[category]) groups[category] = [];
      groups[category].push(ch);
    });
    return groups;
  }, [filteredChannels]);

  if (!showSidebar) return null;

  const sidebarContent = (
    <aside className={`
      ${isMobile 
        ? 'fixed inset-0 w-full h-full z-50 bg-white dark:bg-gray-800' 
        : 'relative w-72 flex-shrink-0 bg-white dark:bg-gray-800'
      } flex flex-col h-full border-r border-gray-200 dark:border-gray-700
    `}>
      
      {/* Шапка с профилем */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
        <div className="flex items-center gap-3">
          <Avatar name={currentUser?.user_metadata?.full_name} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">
              {currentUser?.user_metadata?.full_name || 'Пользователь'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentUserRole || 'Гость'}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
          </div>
          {isMobile && (
            <button 
              onClick={onCloseSidebar} 
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          )}
        </div>

        {/* Поиск каналов */}
        <div className="mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Поиск каналов..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6572] placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Кнопка создания канала */}
      <div className="flex-shrink-0 p-2">
        {canCreateChannel && (
          <button
            onClick={onCreateChannel}
            className="w-full px-3 py-2.5 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Создать канал
          </button>
        )}
      </div>

      {/* Список каналов */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 scrollbar-thin">
        {Object.entries(groupedChannels).map(([category, chs]) => (
          <div key={category}>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-2">
              {category}
            </div>
            {chs.map((channel) => {
              const isActive = activeChannel === channel.id;
              const unread = unreadCounts[channel.id] || 0;

              return (
                <button
                  key={channel.id}
                  onClick={() => {
                    onChannelSelect(channel.id);
                    if (isMobile) onCloseSidebar();
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#4A6572] text-white shadow-md'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{channel.icon}</span>
                    <span className="truncate flex-1 text-left">{channel.label || channel.name}</span>
                    {unread > 0 && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                  {lastReadTimes[channel.id] && (
                    <div className={`text-[10px] pl-9 mt-0.5 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                      Прочитано: <TimeDisplay date={lastReadTimes[channel.id]} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {filteredChannels.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Каналы не найдены
          </div>
        )}
      </div>

      {/* Пользователи */}
      <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Пользователи ({companyUsers?.length || 0})
          </h4>
          <button className="text-xs text-[#4A6572] hover:underline font-medium">Все</button>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
          {companyUsers?.slice(0, 12).map((u) => (
            <button
              key={u.user_id}
              onClick={() => {
                onStartDirectChat?.(u);
                if (isMobile) onCloseSidebar();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-white dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
              title={u.full_name}
            >
              <Avatar name={u.full_name} size="xs" />
              <span className="truncate max-w-[70px] font-medium">{u.full_name}</span>
            </button>
          ))}
          {(companyUsers?.length || 0) > 12 && (
            <span className="text-xs text-gray-400 px-2 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
              +{companyUsers.length - 12}
            </span>
          )}
        </div>
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <>
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
            onClick={onCloseSidebar} 
          />
        )}
        {sidebarContent}
      </>
    );
  }

  return sidebarContent;
});

// ============================================================
// 🆕 КОМПОНЕНТ НАБОРА ТЕКСТА
// ============================================================

const MessageInput = memo(({
  value,
  onChange,
  onSend,
  onKeyDown,
  onFileUpload,
  replyTo,
  onCancelReply,
  isSending,
  placeholder,
  textareaRef,
  onQuickReply,
  onMicToggle,
  isRecording,
  attachedFiles,
  onRemoveFile,
  mentionSuggestions,
  onMentionSelect,
  mentionIndex,
}) => {
  const [showQuick, setShowQuick] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState(0);

  const handleEmojiClick = (emoji) => {
    onChange({ target: { value: value + emoji } });
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex-shrink-0 p-3 border-t border-gray-200/50 dark:border-gray-700/50 glass-effect">
      {replyTo && (
        <div className="mb-2 p-2.5 bg-gray-100 dark:bg-gray-700/50 rounded-xl flex justify-between items-start border-l-4 border-[#4A6572]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <Reply className="w-3.5 h-3.5 text-[#4A6572]" />
              <span className="font-bold text-[#4A6572] dark:text-[#F9AA33]">
                Ответ {replyTo.user?.user_metadata?.full_name || 'пользователю'}:
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
              {replyTo.content?.slice(0, 100)}
            </p>
          </div>
          <button onClick={onCancelReply} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {attachedFiles?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachedFiles.map((file, idx) => (
            <FilePreview 
              key={idx} 
              file={file} 
              onRemove={() => onRemoveFile?.(idx)}
            />
          ))}
        </div>
      )}

      {showQuick && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              onClick={() => onQuickReply?.(reply)}
              className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700/50 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-300"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 relative">
        <div className="flex items-center gap-1">
          <label className="p-2 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400">
            <Paperclip className="w-5 h-5" />
            <input type="file" onChange={onFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" multiple />
          </label>
          
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded-xl transition-colors ${
              showEmojiPicker
                ? 'bg-[#4A6572]/10 text-[#4A6572]'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500'
            }`}
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <button
            onClick={onMicToggle}
            className={`p-2 rounded-xl transition-colors ${
              isRecording
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500 hover:text-gray-700'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <button
            onClick={() => setShowQuick(!showQuick)}
            className={`p-2 rounded-xl transition-colors ${
              showQuick
                ? 'bg-[#4A6572]/10 text-[#4A6572]'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-500'
            }`}
          >
            <Zap className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder || 'Введите сообщение...'}
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent resize-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          {isRecording && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            </div>
          )}

          {mentionSuggestions?.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 min-w-[200px]">
              {mentionSuggestions.map((user, idx) => (
                <button
                  key={user.user_id}
                  onClick={() => onMentionSelect?.(user)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 ${
                    idx === mentionIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <Avatar name={user.full_name} size="xs" />
                  <span>{user.full_name}</span>
                  <span className="text-xs text-gray-400">({user.role})</span>
                </button>
              ))}
            </div>
          )}

          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50 w-64">
              <div className="flex gap-1 mb-2 overflow-x-auto">
                {EMOJI_CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat.name}
                    onClick={() => setEmojiCategory(idx)}
                    className={`px-2 py-0.5 text-xs rounded whitespace-nowrap ${
                      idx === emojiCategory 
                        ? 'bg-[#4A6572] text-white' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-1">
                {EMOJI_CATEGORIES[emojiCategory]?.emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    className="p-1.5 text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onSend}
          disabled={!value.trim() || isSending}
          className={`p-2.5 rounded-2xl transition-all ${
            !value.trim() || isSending
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-lg hover:scale-105 active:scale-95'
          }`}
        >
          {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 dark:text-gray-500">
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> — отправить
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Shift+Enter</kbd> — новая строка
        <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> — отменить
        <span className="ml-auto">🔒 Защищённое соединение</span>
      </div>
    </div>
  );
});

// ============================================================
// 🏠 ОСНОВНОЙ КОМПОНЕНТ
// ============================================================

const CompanyChat = ({ user, userCompanyId, userRole, language, showNotification }) => {
  // ========== STATE ==========
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState('general');
  const [customChannels, setCustomChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [companyUsers, setCompanyUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelMembers, setChannelMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [savedMessages, setSavedMessages] = useState(new Set());
  const [typingUsers] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastReadTimes, setLastReadTimes] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [firstUnreadId, setFirstUnreadId] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const [searchMessagesQuery, setSearchMessagesQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  const [attachedFiles, setAttachedFiles] = useState([]);
  
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(-1);

  // ========== REFS ==========
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const subscriptionRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const animationFrameRef = useRef(null);
  const readTimeoutRef = useRef(null);
  const loadMessagesRef = useRef(null);

  // ============================================================
  // 📱 МОБИЛЬНОЕ УСТРОЙСТВО
  // ============================================================

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setShowSidebar(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============================================================
  // 📡 ПРОВЕРКА СОЕДИНЕНИЯ
  // ============================================================

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('companies').select('id').limit(1);
        setConnectionStatus(!error && data ? 'connected' : 'error');
      } catch {
        setConnectionStatus('error');
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // ============================================================
  // 🎯 СКРОЛЛ
  // ============================================================

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (!messagesContainerRef.current || !shouldAutoScroll || isUserScrollingRef.current) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      if (messagesContainerRef.current && !isUserScrollingRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior,
        });
      }
    });
  }, [shouldAutoScroll]);

  const forceScrollToBottom = useCallback((behavior = 'smooth') => {
    if (!messagesContainerRef.current) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior,
        });
      }
    });
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    isUserScrollingRef.current = false;
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    const isScrollingUp = scrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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

  // ============================================================
  // ⏱ ФОРМАТИРОВАНИЕ
  // ============================================================

  const formatMessage = useCallback((text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part?.match?.(urlRegex)) {
        return <a key={`url-${i}`} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-600">{part}</a>;
      }
      if (part?.startsWith?.('@')) {
        return <span key={`mention-${i}`} className="font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-0.5 rounded">{part}</span>;
      }
      return <span key={`text-${i}`}>{part}</span>;
    });
  }, []);

  // ============================================================
  // 🔍 ПОИСК ПО СООБЩЕНИЯМ
  // ============================================================

  const handleSearchMessages = useCallback((query) => {
    setSearchMessagesQuery(query);
    if (query.trim()) {
      const filtered = messages.filter(msg => 
        msg.content?.toLowerCase().includes(query.toLowerCase()) ||
        msg.user?.user_metadata?.full_name?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredMessages(filtered);
      setIsSearchMode(true);
    } else {
      setIsSearchMode(false);
      setFilteredMessages([]);
    }
  }, [messages]);

  // ============================================================
  // 💬 УПОМИНАНИЯ
  // ============================================================

  const handleMention = useCallback((value, cursorPos) => {
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtSign = textBeforeCursor.lastIndexOf('@');
    if (lastAtSign !== -1) {
      const query = textBeforeCursor.slice(lastAtSign + 1);
      if (query.length >= 1) {
        const suggestions = companyUsers
          .filter(u => 
            u.full_name?.toLowerCase().includes(query.toLowerCase()) ||
            u.user_id?.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 5);
        setMentionSuggestions(suggestions);
        setMentionIndex(suggestions.length > 0 ? 0 : -1);
        return;
      }
    }
    setMentionSuggestions([]);
    setMentionIndex(-1);
  }, [companyUsers]);

  const handleMentionSelect = useCallback((user) => {
    const text = newMessage;
    const cursorPos = textareaRef.current?.selectionStart || text.length;
    const lastAtSign = text.slice(0, cursorPos).lastIndexOf('@');
    const textBefore = text.slice(0, lastAtSign);
    const textAfter = text.slice(cursorPos);
    const newText = `${textBefore}@${user.full_name} ${textAfter}`;
    setNewMessage(newText);
    setMentionSuggestions([]);
    setMentionIndex(-1);
    textareaRef.current?.focus();
  }, [newMessage]);

  // ============================================================
  // 📎 ЗАГРУЗКА ФАЙЛОВ
  // ============================================================

  const handleFileUpload = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= MAX_FILE_SIZE);
    if (validFiles.length !== files.length) {
      showNotification?.('Некоторые файлы превышают 10MB', 'warning');
    }
    setAttachedFiles(prev => [...prev, ...validFiles]);
    e.target.value = '';
  }, [showNotification]);

  const handleRemoveFile = useCallback((index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ============================================================
  // 📊 КАНАЛЫ
  // ============================================================

  const allChannels = useMemo(() => {
    const system = SYSTEM_CHANNELS.map(ch => ({ ...ch, type: 'system' }));
    const custom = customChannels
      .filter(ch => !ch.is_archived)
      .map(ch => ({ ...ch, type: ch.type || 'custom' }));
    return [...system, ...custom];
  }, [customChannels]);

  const currentChannel = allChannels.find(c => c.id === activeChannel);

  const canWriteToChannel = useCallback((channelId) => {
    const channel = SYSTEM_CHANNELS.find(c => c.id === channelId);
    if (!channel) return true;
    const allowedRoles = ['manager', 'supply_admin'];
    return allowedRoles.includes(userRole);
  }, [userRole]);

  // ============================================================
  // 👥 ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ
  // ============================================================

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

  // ============================================================
  // 📂 ЗАГРУЗКА КАНАЛОВ
  // ============================================================

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
      } catch (err) {
        console.error('Ошибка загрузки каналов:', err);
      }
    };
    loadCustomChannels();
  }, [userCompanyId]);

  // ============================================================
  // 🔔 НЕПРОЧИТАННЫЕ
  // ============================================================

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
        let query = supabase
          .from('company_messages')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', userCompanyId)
          .is('deleted_at', null)
          .gt('created_at', lastRead.toISOString())
          .neq('user_id', user.id);

        const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === channelId);
        if (isSystemChannel) {
          query = query.eq('channel', channelId).eq('channel_type', 'system');
        } else {
          query = query.eq('channel_id', channelId);
        }

        const { count, error } = await query;
        if (!error && count > 0) counts[channelId] = count;
      }
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Ошибка загрузки непрочитанных:', err);
    }
  }, [user?.id, userCompanyId, allChannels]);

  useEffect(() => {
    if (customChannels.length > 0 || allChannels.length > 0) {
      loadUnreadCounts();
    }
  }, [customChannels, allChannels, loadUnreadCounts]);

  // ============================================================
  // ✅ ОТМЕТКА ПРОЧИТАННОГО
  // ============================================================

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
          updated_at: now,
        }, { onConflict: 'user_id,channel_id' });
      if (!error) {
        setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
        setLastReadTimes(prev => ({ ...prev, [channelId]: new Date(now) }));
      }
    } catch (err) {
      console.error('Ошибка отметки прочитанного:', err);
    }
  }, [user?.id]);

  // ============================================================
  // 📨 ЗАГРУЗКА СООБЩЕНИЙ
  // ============================================================

  const loadMessages = useCallback(async () => {
    if (loadMessagesRef.current) return;
    loadMessagesRef.current = true;

    if (!userCompanyId || !activeChannel) {
      loadMessagesRef.current = false;
      return;
    }

    if (isInitialLoad) {
      setLoading(true);
    }

    try {
      const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
      const isDirectChat = activeChannel?.startsWith('dm_');

      let query = supabase
        .from('company_messages')
        .select('*')
        .eq('company_id', userCompanyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (isSystemChannel) {
        query = query.eq('channel', activeChannel).eq('channel_type', 'system');
      } else if (isDirectChat) {
        query = query.eq('channel_id', activeChannel).eq('channel_type', 'direct');
      } else {
        query = query.eq('channel_id', activeChannel).eq('channel_type', 'custom');
      }

      const { data: messagesData, error } = await query;
      if (error) {
        console.warn('Ошибка загрузки сообщений:', error);
        if (error.code === '42P01') {
          setMessages([]);
          setLoading(false);
          loadMessagesRef.current = false;
          setIsInitialLoad(false);
          return;
        }
        throw error;
      }

      const sortedMessages = messagesData?.reverse() || [];
      const messageIds = sortedMessages.map(m => m.id);

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

      const userIds = [...new Set(sortedMessages.map(m => m.user_id).filter(Boolean))];
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
      const messagesWithReply = sortedMessages.filter(m => m.reply_to_message_id);
      if (messagesWithReply.length > 0) {
        const replyIds = messagesWithReply.map(m => m.reply_to_message_id);
        const { data: replyMessages } = await supabase
          .from('company_messages')
          .select('id, content, user_id')
          .in('id', replyIds)
          .is('deleted_at', null);
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

      const enrichedMessages = sortedMessages.map(msg => ({
        ...msg,
        user: { user_metadata: usersMap[msg.user_id] || { full_name: 'Пользователь', role: 'user' } },
        reactions: reactionsMap[msg.id] || [],
        replied_message: replyMap[msg.reply_to_message_id] || null,
        is_pinned: pinnedMessages.includes(msg.id),
      }));

      setMessages(enrichedMessages);

      if (enrichedMessages.length > 0) {
        const lastRead = lastReadTimes[activeChannel] || new Date(0);
        const firstUnreadIdx = enrichedMessages.findIndex(m =>
          new Date(m.created_at) > lastRead && m.user_id !== user?.id
        );
        setFirstUnreadId(firstUnreadIdx >= 0 ? enrichedMessages[firstUnreadIdx].id : null);
      }

      setTimeout(() => forceScrollToBottom('auto'), 150);
      markChannelAsRead(activeChannel);
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
      loadMessagesRef.current = false;
    }
  }, [userCompanyId, activeChannel, lastReadTimes, user?.id, forceScrollToBottom, markChannelAsRead, isInitialLoad, pinnedMessages]);

  useEffect(() => {
    loadMessagesRef.current = false;
    setIsInitialLoad(true);
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel]);

  // ============================================================
  // 📡 ПОДПИСКА НА НОВЫЕ СООБЩЕНИЯ
  // ============================================================

  useEffect(() => {
    if (!userCompanyId || !activeChannel) return;
    if (subscriptionRef.current) subscriptionRef.current.unsubscribe();

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
        filter,
      }, async (payload) => {
        const newMsg = payload.new;
        if (newMsg.deleted_at) return;

        const msgChannelId = newMsg.channel_id || newMsg.channel;
        if (activeChannel !== msgChannelId && newMsg.user_id !== user?.id) {
          setUnreadCounts(prev => ({
            ...prev,
            [msgChannelId]: (prev[msgChannelId] || 0) + 1,
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
          replied_message: null,
          is_pinned: pinnedMessages.includes(newMsg.id),
        };

        setMessages(prev => [...prev, enrichedMessage]);
        setTimeout(() => scrollToBottom('smooth'), 50);

        if (shouldAutoScroll && !isUserScrollingRef.current) {
          markChannelAsRead(activeChannel);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'company_messages',
        filter,
      }, async (payload) => {
        const updatedMsg = payload.new;
        
        if (updatedMsg.deleted_at) {
          setMessages(prev => prev.filter(m => m.id !== updatedMsg.id));
          if (pinnedMessages.includes(updatedMsg.id)) {
            setPinnedMessages(prev => prev.filter(id => id !== updatedMsg.id));
          }
          return;
        }
        
        setMessages(prev => prev.map(m => 
          m.id === updatedMsg.id ? { 
            ...m, 
            content: updatedMsg.content,
            edited_at: updatedMsg.edited_at
          } : m
        ));
      })
      .subscribe();

    return () => {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    };
  }, [userCompanyId, activeChannel, user?.id, scrollToBottom, markChannelAsRead, shouldAutoScroll, pinnedMessages]);

  // ============================================================
  // 💾 СОХРАНЁННЫЕ СООБЩЕНИЯ
  // ============================================================

  useEffect(() => {
    const loadSavedMessages = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('saved_messages')
        .select('message_id')
        .eq('user_id', user.id);
      if (data) setSavedMessages(new Set(data.map(s => s.message_id)));
    };
    loadSavedMessages();
  }, [user?.id]);

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

  // ============================================================
  // 🔄 ОСТАЛЬНЫЕ ДЕЙСТВИЯ
  // ============================================================

  const handleReply = useCallback((message) => {
    setReplyTo(message);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

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

  const deleteMessage = useCallback(async (messageId) => {
    if (!window.confirm('Удалить сообщение?')) return;
    
    try {
      const { error } = await supabase
        .from('company_messages')
        .update({ 
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('user_id', user?.id);
      
      if (error) {
        console.error('Ошибка удаления:', error);
        showNotification?.('Не удалось удалить сообщение: ' + error.message, 'error');
        return;
      }
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      if (pinnedMessages.includes(messageId)) {
        setPinnedMessages(prev => prev.filter(id => id !== messageId));
      }
      
      showNotification?.('Сообщение удалено', 'info');
    } catch (err) {
      console.error('Ошибка удаления:', err);
      showNotification?.('Не удалось удалить сообщение', 'error');
    }
  }, [user?.id, pinnedMessages, showNotification]);

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
    } catch (err) {
      console.error('Ошибка реакции:', err);
    }
  }, [user?.id, messages]);

  const handlePinMessage = useCallback(async (messageId) => {
    try {
      const isPinned = pinnedMessages.includes(messageId);
      if (isPinned) {
        setPinnedMessages(prev => prev.filter(id => id !== messageId));
        showNotification?.('Сообщение откреплено', 'info');
      } else {
        if (pinnedMessages.length >= MAX_PINNED) {
          showNotification?.(`Нельзя закрепить более ${MAX_PINNED} сообщений`, 'warning');
          return;
        }
        setPinnedMessages(prev => [...prev, messageId]);
        showNotification?.('Сообщение закреплено (локально)', 'success');
      }
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, is_pinned: !isPinned }
          : m
      ));
    } catch (err) {
      console.error('Ошибка при закреплении:', err);
      showNotification?.('Не удалось закрепить сообщение', 'error');
    }
  }, [pinnedMessages, showNotification]);

  const handleCopyMessage = useCallback((messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.content) {
      navigator.clipboard.writeText(message.content);
      showNotification?.('Текст скопирован в буфер обмена', 'success');
    }
  }, [messages, showNotification]);

  // ============================================================
  // ⌨️ ОТПРАВКА СООБЩЕНИЯ
  // ============================================================

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
        reply_to_message_id: replyTo?.id || null,
        attachments: attachedFiles.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
        }))
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

      const { data, error } = await supabase
        .from('company_messages')
        .insert([messageData])
        .select();

      if (error) {
        console.error('Ошибка отправки:', error);
        showNotification?.('Ошибка отправки: ' + error.message, 'error');
        return;
      }

      if (data && data[0]) {
        const newMsg = {
          ...data[0],
          user: { 
            user_metadata: { 
              full_name: user?.user_metadata?.full_name || 'Пользователь',
              role: userRole
            } 
          },
          reactions: [],
          replied_message: null,
          is_pinned: false,
        };
        setMessages(prev => [...prev, newMsg]);
        setAttachedFiles([]);
      }

      setNewMessage('');
      setReplyTo(null);
      forceScrollToBottom('smooth');
    } catch (err) {
      console.error('Критическая ошибка отправки:', err);
      showNotification?.('Не удалось отправить сообщение: ' + (err.message || 'неизвестная ошибка'), 'error');
    } finally {
      setSending(false);
    }
  }, [newMessage, user?.id, userRole, sending, activeChannel, canWriteToChannel, userCompanyId, replyTo, showNotification, forceScrollToBottom, attachedFiles]);

  // ============================================================
  // 🖊️ ОБРАБОТКА ТЕКСТОВОГО ПОЛЯ
  // ============================================================

  const handleTextareaChange = useCallback((e) => {
    const value = e.target.value;
    setNewMessage(value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

    const cursorPos = e.target.selectionStart;
    handleMention(value, cursorPos);

    if (value.trim()) {
      const channel = supabase.channel(`typing:${activeChannel}`);
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: user?.id, user_name: user?.user_metadata?.full_name || 'Пользователь' }
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        channel.send({
          type: 'broadcast',
          event: 'typing_stop',
          payload: { user_id: user?.id }
        });
      }, 1000);
    }
  }, [activeChannel, user?.id, user?.user_metadata?.full_name, handleMention]);

  const handleKeyDown = useCallback((e) => {
    if (mentionSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % mentionSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => prev <= 0 ? mentionSuggestions.length - 1 : prev - 1);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (mentionIndex >= 0 && mentionIndex < mentionSuggestions.length) {
          e.preventDefault();
          handleMentionSelect(mentionSuggestions[mentionIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        setMentionSuggestions([]);
        setMentionIndex(-1);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) saveEdit(editingMessageId);
      else sendMessage();
    }
    if (e.key === 'Escape') {
      if (editingMessageId) cancelEdit();
      if (replyTo) setReplyTo(null);
    }
  }, [mentionSuggestions, mentionIndex, handleMentionSelect, editingMessageId, saveEdit, sendMessage, cancelEdit, replyTo]);

  const handleQuickReply = useCallback((text) => {
    setNewMessage(text);
    setTimeout(() => sendMessage(), 100);
  }, [sendMessage]);

  // ============================================================
  // 🎙️ ГОЛОСОВОЙ ВВОД
  // ============================================================

  const toggleRecording = useCallback(() => {
    if (!isRecording) {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showNotification?.('Голосовой ввод не поддерживается в этом браузере', 'error');
        return;
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'ru' ? 'ru-RU' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setNewMessage(prev => prev + (prev ? ' ' : '') + transcript);
      };

      recognition.onerror = () => {
        showNotification?.('Ошибка распознавания речи', 'error');
        setIsRecording(false);
      };

      recognition.onend = () => setIsRecording(false);
      recognition.start();
      setIsRecording(true);
    } else {
      setIsRecording(false);
    }
  }, [isRecording, language, showNotification]);

  // ============================================================
  // 📋 СОЗДАНИЕ КАНАЛА
  // ============================================================

  const handleCreateChannel = useCallback(async (channelData) => {
    if (!userCompanyId || !user?.id) return;
    try {
      const { data, error } = await supabase
        .from('company_channels')
        .insert([{
          company_id: userCompanyId,
          name: channelData.name,
          description: channelData.description,
          icon: channelData.icon || '💬',
          is_private: channelData.is_private || false,
          created_by: user.id,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (error) throw error;
      await supabase.from('channel_members').insert({
        channel_id: data.id,
        user_id: user.id,
        role: 'admin',
      });
      setCustomChannels(prev => [...prev, data]);
      setActiveChannel(data.id);
      showNotification?.('Канал создан', 'success');
    } catch (err) {
      console.error('Ошибка создания канала:', err);
      showNotification?.('Не удалось создать канал', 'error');
    }
  }, [userCompanyId, user?.id, showNotification]);

  // ============================================================
  // 🗑️ УДАЛЕНИЕ КАНАЛА
  // ============================================================

  const deleteChannel = useCallback(async (channelId) => {
    if (!channelId) return;
    const channel = customChannels.find(c => c.id === channelId);
    if (!channel) return;
    if (!window.confirm(`Удалить канал "${channel.name}"?`)) return;

    try {
      await supabase.from('company_messages').delete().eq('channel_id', channelId);
      await supabase.from('channel_members').delete().eq('channel_id', channelId);
      const { error } = await supabase.from('company_channels').delete().eq('id', channelId);
      if (error) throw error;
      setCustomChannels(prev => prev.filter(c => c.id !== channelId));
      if (activeChannel === channelId) setActiveChannel('general');
      showNotification?.('Канал удалён', 'success');
    } catch (err) {
      console.error('Ошибка удаления канала:', err);
      showNotification?.('Не удалось удалить канал', 'error');
    }
  }, [customChannels, activeChannel, showNotification]);

  // ============================================================
  // 👥 УПРАВЛЕНИЕ УЧАСТНИКАМИ КАНАЛА
  // ============================================================

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
        user: usersMap[m.user_id] || { full_name: 'Пользователь', role: 'user' },
      }));
      setChannelMembers(membersWithUsers);
    } catch (err) {
      console.error('Ошибка загрузки участников:', err);
      showNotification?.('Не удалось загрузить участников', 'error');
    } finally {
      setLoadingMembers(false);
    }
  }, [showNotification]);

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

  // ============================================================
  // 🌐 ПЕРЕКЛЮЧЕНИЕ КАНАЛА
  // ============================================================

  const handleChannelSelect = useCallback((channelId) => {
    setActiveChannel(channelId);
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    isUserScrollingRef.current = false;
    setSearchMessagesQuery('');
    setIsSearchMode(false);
    setFilteredMessages([]);
    if (isMobile) setShowSidebar(false);
  }, [isMobile]);

  // ============================================================
  // 📊 ГРУППИРОВКА СООБЩЕНИЙ ПО ДНЯМ
  // ============================================================

  const groupMessagesByDate = useCallback((msgs) => {
    const groups = {};
    msgs.forEach(msg => {
      const date = new Date(msg.created_at).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  }, []);

  const groupedMessages = useMemo(() => {
    const msgs = isSearchMode ? filteredMessages : messages;
    return groupMessagesByDate(msgs);
  }, [messages, filteredMessages, isSearchMode, groupMessagesByDate]);

  // ============================================================
  // 🧹 ОЧИСТКА
  // ============================================================

  useEffect(() => {
    const cleanup = () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (readTimeoutRef.current) clearTimeout(readTimeoutRef.current);
      if (loadMessagesRef.current) loadMessagesRef.current = false;
    };
    return cleanup;
  }, []);

  // ============================================================
  // 🎨 ОТРИСОВКА
  // ============================================================

  return (
    <div className="flex h-[calc(100vh-80px)] bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden chat-container">
      <style>{styles}</style>

      <ChatSidebar
        channels={allChannels}
        activeChannel={activeChannel}
        onChannelSelect={handleChannelSelect}
        canCreateChannel={userRole === 'manager' || userRole === 'supply_admin'}
        onCreateChannel={() => setShowCreateModal(true)}
        connectionStatus={connectionStatus}
        isMobile={isMobile}
        showSidebar={showSidebar}
        onCloseSidebar={() => setShowSidebar(false)}
        currentUserRole={userRole}
        companyUsers={companyUsers}
        currentUser={user}
        onStartDirectChat={(targetUser) => {
          const dmId = `dm_${[user?.id, targetUser.user_id].sort().join('_')}`;
          const existingDM = customChannels.find(c => c.id === dmId);
          if (!existingDM) {
            setCustomChannels(prev => [...prev, {
              id: dmId,
              name: targetUser.full_name,
              label: targetUser.full_name,
              icon: '💬',
              type: 'direct',
              participants: [user?.id, targetUser.user_id],
              created_by: user?.id,
              created_at: new Date().toISOString(),
            }]);
          }
          setActiveChannel(dmId);
          if (isMobile) setShowSidebar(false);
        }}
        unreadCounts={unreadCounts}
        lastReadTimes={lastReadTimes}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900/20">
        <header className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && !showSidebar && (
              <button 
                onClick={() => setShowSidebar(true)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <span className="text-2xl bg-gray-100 dark:bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center">
                {currentChannel?.icon || '💬'}
              </span>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                  {currentChannel?.label || currentChannel?.name}
                  {currentChannel?.type === 'direct' && (
                    <span className="text-xs font-normal text-gray-400">(личный)</span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  {currentChannel?.description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={searchMessagesQuery}
                onChange={(e) => handleSearchMessages(e.target.value)}
                placeholder="Поиск..."
                className="pl-7 pr-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-1 focus:ring-[#4A6572] w-32 sm:w-40 focus:outline-none"
              />
              {isSearchMode && (
                <button 
                  onClick={() => handleSearchMessages('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500">
              <Bell className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{messages.length}</span>
            </div>
          </div>
        </header>

        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin"
          onScroll={handleScroll}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {isInitialLoad && loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
              <span className="text-sm text-gray-500">Загрузка сообщений...</span>
            </div>
          ) : isSearchMode && filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-base">Сообщения не найдены</p>
              <p className="text-xs mt-1 opacity-70">Попробуйте изменить запрос</p>
            </div>
          ) : messages.length === 0 && !isSearchMode ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-medium text-base sm:text-lg">Нет сообщений</p>
              <p className="text-xs sm:text-sm mt-1 opacity-70">Начните обсуждение!</p>
            </div>
          ) : (
            <>
              {pinnedMessages.length > 0 && !isSearchMode && (
                <div className="mb-4 p-3 bg-yellow-50/50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800/30">
                  <div className="flex items-center gap-2 text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-2">
                    <Pin className="w-3.5 h-3.5" />
                    Закреплённые сообщения ({pinnedMessages.length})
                  </div>
                  {pinnedMessages.slice(0, 3).map(pinId => {
                    const msg = messages.find(m => m.id === pinId);
                    if (!msg) return null;
                    return (
                      <div key={pinId} className="text-xs text-gray-600 dark:text-gray-400 truncate py-0.5">
                        <span className="font-medium">{msg.user?.user_metadata?.full_name}:</span> {msg.content?.slice(0, 60)}...
                      </div>
                    );
                  })}
                </div>
              )}

              {Object.entries(groupedMessages).map(([date, msgs]) => (
                <React.Fragment key={date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400 font-medium">
                      {new Date(date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                  {msgs.map((msg) => (
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
                      formatMessage={formatMessage}
                      language={language}
                      textareaRef={textareaRef}
                      onPinMessage={handlePinMessage}
                      isPinned={pinnedMessages.includes(msg.id)}
                      onCopyMessage={handleCopyMessage}
                      isHighlighted={isSearchMode}
                      isFirstUnread={msg.id === firstUnreadId}
                    />
                  ))}
                </React.Fragment>
              ))}

              <div ref={(el) => {
                if (el && shouldAutoScroll && !isUserScrolling) {
                  el.scrollIntoView({ behavior: 'auto', block: 'end' });
                }
              }} />
            </>
          )}
        </div>

        {typingUsers.size > 0 && !isUserScrolling && (
          <div className="flex-shrink-0 px-4 py-1">
            <div className="flex items-center gap-2">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
              <span className="text-xs text-gray-500 animate-pulse">
                {Array.from(typingUsers).map(id => {
                  const userData = companyUsers.find(u => u.user_id === id);
                  return userData?.full_name?.split(' ')[0];
                }).join(', ')} печатает...
              </span>
            </div>
          </div>
        )}

        {isUserScrolling && !shouldAutoScroll && messages.length > 10 && (
          <button
            onClick={() => forceScrollToBottom('smooth')}
            className="absolute bottom-28 right-4 bg-[#4A6572] text-white rounded-full p-2.5 shadow-lg hover:bg-[#344955] transition-all z-10"
            style={{ bottom: '110px' }}
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}

        <MessageInput
          value={newMessage}
          onChange={handleTextareaChange}
          onSend={sendMessage}
          onKeyDown={handleKeyDown}
          onFileUpload={handleFileUpload}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          isSending={sending}
          placeholder={replyTo ? `Ответ ${replyTo.user?.user_metadata?.full_name}...` : 'Введите сообщение...'}
          textareaRef={textareaRef}
          onQuickReply={handleQuickReply}
          onMicToggle={toggleRecording}
          isRecording={isRecording}
          attachedFiles={attachedFiles}
          onRemoveFile={handleRemoveFile}
          mentionSuggestions={mentionSuggestions}
          onMentionSelect={handleMentionSelect}
          mentionIndex={mentionIndex}
        />
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Создать канал</h3>
            <input
              type="text"
              placeholder="Название канала"
              className="w-full p-3 border rounded-xl mb-3 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-[#4A6572]"
              id="channelName"
            />
            <textarea
              placeholder="Описание (необязательно)"
              className="w-full p-3 border rounded-xl mb-3 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-[#4A6572]"
              rows={2}
              id="channelDesc"
            />
            <div className="flex items-center gap-2 mb-4">
              <input type="checkbox" id="channelPrivate" className="rounded" />
              <label htmlFor="channelPrivate" className="text-sm text-gray-600 dark:text-gray-400">
                Приватный канал (только по приглашению)
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                Отмена
              </button>
              <button
                onClick={() => {
                  const name = document.getElementById('channelName')?.value;
                  const description = document.getElementById('channelDesc')?.value;
                  const isPrivate = document.getElementById('channelPrivate')?.checked;
                  if (name) {
                    handleCreateChannel({ name, description, icon: '💬', is_private: isPrivate });
                    setShowCreateModal(false);
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-lg transition-all"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {showChannelSettings && selectedChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Управление каналом</h3>
              <button 
                onClick={() => {
                  setShowChannelSettings(false);
                  setSelectedChannel(null);
                }} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2 text-sm text-gray-600 dark:text-gray-400">Участники ({channelMembers.length})</h4>
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
                      <div key={member.user_id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                        <div>
                          <p className="font-medium text-sm">{member.user?.full_name || 'Пользователь'}</p>
                          <p className="text-xs text-gray-500">{member.role}{isCreator && ' (создатель)'}</p>
                        </div>
                        {canRemove && (
                          <button
                            onClick={() => removeChannelMember(selectedChannel.id, member.user_id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium mb-2 text-sm text-gray-600 dark:text-gray-400">Добавить участника</h4>
              <select className="w-full p-3 border rounded-xl mb-3 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-[#4A6572]" id="newMemberSelect">
                <option value="">-- Выберите пользователя --</option>
                {companyUsers
                  .filter(u => !channelMembers.some(m => m.user_id === u.user_id))
                  .map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>
                  ))}
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
                className="w-full py-2.5 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-lg transition-all"
              >
                <UserPlus className="w-4 h-4 inline mr-2" /> Добавить
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  if (confirm(`Удалить канал "${selectedChannel.name}"?`)) {
                    deleteChannel(selectedChannel.id);
                    setShowChannelSettings(false);
                    setSelectedChannel(null);
                  }
                }}
                className="w-full py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all"
              >
                <Trash2 className="w-4 h-4 inline mr-2" /> Удалить канал
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CompanyChat);