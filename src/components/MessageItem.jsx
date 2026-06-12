// MessageItem.jsx - НЕВЕРОЯТНАЯ версия с премиум эффектами
import React, { memo, useState, useRef, useEffect } from 'react';
import { 
  Edit2, Trash2, X, Check, Smile, CornerUpLeft, Bookmark, BookmarkCheck, 
  CheckCheck, Clock, Copy, Flag, Pin, PinOff, Reply, Volume2, VolumeX,
  Sparkles, Gift, Heart, ThumbsUp, Laugh, Angry, Frown, Eye, EyeOff,
  Zap, Star, Award, Send, MoreHorizontal, Link, Share2, Download,
  MessageCircle, UserPlus, AlertTriangle, Mic, MicOff
} from 'lucide-react';

// Премиум набор реакций с анимацией
const REACTION_EMOJIS = [
  { emoji: '👍', name: 'Нравится', color: 'hover:bg-blue-100' },
  { emoji: '❤️', name: 'Любовь', color: 'hover:bg-red-100' },
  { emoji: '😂', name: 'Смех', color: 'hover:bg-yellow-100' },
  { emoji: '😮', name: 'Удивление', color: 'hover:bg-purple-100' },
  { emoji: '😢', name: 'Печаль', color: 'hover:bg-blue-100' },
  { emoji: '🔥', name: 'Огонь', color: 'hover:bg-orange-100' },
  { emoji: '🎉', name: 'Праздник', color: 'hover:bg-pink-100' },
  { emoji: '🤔', name: 'Думаю', color: 'hover:bg-gray-100' },
  { emoji: '⭐', name: 'Звезда', color: 'hover:bg-yellow-100' },
  { emoji: '💎', name: 'Драгоценность', color: 'hover:bg-blue-100' }
];

const MessageItem = memo(({ 
  msg, user, userRole, isOwn, isEditing, editText, 
  onStartEdit, onSaveEdit, onCancelEdit, onDelete, 
  onToggleReaction, onReply, onToggleSave,
  isSaved, showReactionsPicker, setShowReactionsPicker,
  formatMessage, formatTime, language, textareaRef,
  onPinMessage, isPinned, onCopyMessage, onForward,
  onReport, onMention, onReactFast
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [textSize, setTextSize] = useState('normal'); // normal, large, huge
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const messageRef = useRef(null);
  
  const isDeleted = msg.deleted_at;
  const isEdited = msg.edited_at;
  const isVoiceMessage = msg.type === 'voice';
  const isImageMessage = msg.type === 'image';
  const isFileMessage = msg.type === 'file';
  
  // Права доступа (используются в JSX)
  const canEdit = msg.user_id === user?.id || userRole === 'super_admin';
  const canDelete = msg.user_id === user?.id || userRole === 'super_admin' || userRole === 'manager';
  const canPin = userRole === 'super_admin' || userRole === 'manager';
  
  // Подсчёт и группировка реакций
  const reactionCounts = React.useMemo(() => {
    if (!msg.reactions?.length) return {};
    return msg.reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});
  }, [msg.reactions]);

  // Уникальные пользователи для реакций
  const uniqueReactors = React.useMemo(() => {
    if (!msg.reactions?.length) return [];
    const reactors = {};
    msg.reactions.forEach(r => {
      if (!reactors[r.emoji]) reactors[r.emoji] = new Set();
      reactors[r.emoji].add(r.user_name || 'Пользователь');
    });
    return reactors;
  }, [msg.reactions]);

  // Статус прочтения
  const messageStatus = isOwn ? (msg.read_at ? 'read' : 'delivered') : null;
  
  // Эффект анимации при появлении
  useEffect(() => {
    if (messageRef.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [msg.id]);

  // Копирование текста
  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2000);
    onCopyMessage?.(msg.id);
  };

  // Быстрые реакции (двойной клик)
  const handleDoubleClick = () => {
    if (!isDeleted && !isEditing) {
      onReactFast?.(msg.id, '❤️');
    }
  };

  // Удаление сообщения с подтверждением
  const handleDelete = () => {
    if (window.confirm('Удалить это сообщение?')) {
      onDelete?.(msg.id);
    }
  };

  // Размер текста
  const getTextSizeClass = () => {
    switch(textSize) {
      case 'large': return 'text-base';
      case 'huge': return 'text-lg';
      default: return 'text-sm';
    }
  };

  // Эффект конфетти при получении реакции
  const showConfetti = () => {
    // Здесь можно добавить реальную библиотеку конфетти
    console.log('🎉 Confetti effect for reaction!');
  };

  return (
    <div 
      ref={messageRef}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isAnimating ? 'scale-100' : 'scale-100'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowFullMenu(false);
      }}
      onDoubleClick={handleDoubleClick}
    >
      <div className={`max-w-[75%] md:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col relative`}>
        
        {/* Message Bubble с градиентом */}
        <div 
          className={`relative px-4 py-2.5 rounded-2xl transition-all duration-300 ${
            isOwn 
              ? 'bg-gradient-to-br from-[#DCF8C6] to-[#c5e8b0] dark:from-[#075E54] dark:to-[#054d44] text-gray-800 dark:text-white rounded-br-md shadow-md hover:shadow-lg' 
              : 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-750 text-gray-800 dark:text-white rounded-bl-md shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-600'
          } ${isPinned ? 'border-l-4 border-l-yellow-400' : ''} ${
            isHovered ? 'scale-[1.02]' : 'scale-100'
          }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          
          {/* Pin Badge */}
          {isPinned && (
            <div className="absolute -top-2 -right-2">
              <div className="bg-yellow-400 rounded-full p-1 shadow-lg animate-bounce">
                <Pin className="w-3 h-3 text-white" />
              </div>
            </div>
          )}
          
          {/* Reply Preview */}
          {msg.reply_to_message_id && msg.replied_message && (
            <div className="mb-2 pb-1.5 border-l-3 border-[#25D366] pl-2 text-xs opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-1">
                <Reply className="w-3 h-3" />
                <span className="font-bold text-[#075E54] dark:text-[#25D366]">
                  {msg.replied_message.user?.user_metadata?.full_name || 'Пользователь'}
                </span>
              </div>
              <span className="line-clamp-2 text-[11px]">{msg.replied_message.content?.slice(0, 60)}</span>
            </div>
          )}
          
          {/* Voice Message Player */}
          {isVoiceMessage && (
            <div className="flex items-center gap-3 min-w-[200px]">
              <button 
                onClick={() => setIsPlayingVoice(!isPlayingVoice)}
                className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center hover:scale-110 transition-transform"
              >
                {isPlayingVoice ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div className="flex-1">
                <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div className="h-full bg-[#25D366] rounded-full animate-pulse" style={{ width: '45%' }} />
                </div>
                <span className="text-[10px] opacity-70 mt-1 block">0:45 / 1:30</span>
              </div>
            </div>
          )}
          
          {/* Image Preview */}
          {isImageMessage && msg.image_url && (
            <div className="mb-2 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity">
              <img src={msg.image_url} alt="Message attachment" className="max-w-full h-auto max-h-64 object-cover" />
            </div>
          )}
          
          {/* File Attachment */}
          {isFileMessage && msg.file_url && (
            <div className="mb-2 p-2 bg-black/5 dark:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-black/10 transition-colors">
              <Download className="w-5 h-5 text-[#25D366]" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{msg.file_name || 'Файл'}</p>
                <p className="text-[10px] opacity-70">{msg.file_size || '1.2 MB'}</p>
              </div>
            </div>
          )}
          
          {/* Message Content */}
          {isDeleted ? (
            <span className="text-gray-400 italic text-sm flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> [Сообщение удалено]
            </span>
          ) : isEditing ? (
            <div className="flex gap-2 items-start">
              <textarea 
                ref={textareaRef}
                value={editText} 
                onChange={(e) => onStartEdit({ ...msg, message: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit(msg.id); }
                  if (e.key === 'Escape') onCancelEdit();
                }}
                className="flex-1 bg-gray-100 dark:bg-gray-600 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#25D366]"
                rows={2}
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
          ) : (
            <div className={`${getTextSizeClass()} whitespace-pre-wrap break-words leading-relaxed message-content`}>
              {formatMessage(msg.content, msg.id)}
            </div>
          )}
          
          {/* Time and Status с анимацией */}
          <div className="flex items-center justify-end gap-1.5 mt-1.5">
            <time className="text-[10px] text-gray-500 dark:text-gray-400">
              {formatTime(msg.created_at, language)}
              {isEdited && <span className="ml-1 opacity-70">(ред.)</span>}
            </time>
            {messageStatus === 'delivered' && (
              <Check className="w-3.5 h-3.5 text-gray-500 animate-in fade-in" />
            )}
            {messageStatus === 'read' && (
              <div className="flex items-center">
                <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1] animate-in fade-in" />
                <span className="text-[10px] text-[#34B7F1] ml-0.5">Прочитано</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Actions Menu - Premium Style */}
        <div className={`flex items-center gap-1 mt-1.5 transition-all duration-300 transform ${
          showActions && !isDeleted && !isEditing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}>
          
          {/* Quick Reactions Bar */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-1 py-0.5">
            {['👍', '❤️', '😂', '🔥'].map(emoji => (
              <button
                key={emoji}
                onClick={() => onToggleReaction(msg.id, emoji)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-125 text-lg"
                title={`Реакция ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          
          {/* Main Action Buttons */}
          <div className="flex items-center gap-0.5 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 px-1 py-0.5">
            <button 
              onClick={() => setShowReactionsPicker(showReactionsPicker === msg.id ? null : msg.id)} 
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110"
              title="Все реакции"
            >
              <Smile className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </button>
            
            <button 
              onClick={() => onReply(msg)} 
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110"
              title="Ответить"
            >
              <CornerUpLeft className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
            </button>
            
            <button 
              onClick={() => onToggleSave(msg.id)} 
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110"
              title={isSaved ? "Удалить из сохранённых" : "Сохранить"}
            >
              {isSaved ? 
                <BookmarkCheck className="w-3.5 h-3.5 text-[#25D366]" /> : 
                <Bookmark className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              }
            </button>
            
            <button 
              onClick={handleCopy}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110 relative"
              title="Копировать текст"
            >
              <Copy className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              {showCopyFeedback && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded-full whitespace-nowrap animate-in fade-in slide-in-from-bottom-2">
                  Скопировано!
                </span>
              )}
            </button>
            
            {(canEdit || canDelete) && (
              <button 
                onClick={() => setShowFullMenu(!showFullMenu)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110"
                title="Ещё действия"
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>
        
        {/* Full Menu Dropdown */}
        {showFullMenu && showActions && !isDeleted && !isEditing && (
          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 min-w-[200px] z-50 animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-1">
              <button 
                onClick={() => onMention?.(msg.user_id)}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
              >
                <AtSign className="w-4 h-4" /> Упомянуть автора
              </button>
              
              <button 
                onClick={() => onForward?.(msg)}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" /> Переслать
              </button>
              
              <button 
                onClick={() => onReport?.(msg.id)}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" /> Пожаловаться
              </button>
              
              {canEdit && (
                <button 
                  onClick={() => onStartEdit(msg)}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                  <Edit2 className="w-4 h-4" /> Редактировать
                </button>
              )}
              
              {canDelete && (
                <button 
                  onClick={handleDelete}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Удалить
                </button>
              )}
              
              {canPin && (
                <button 
                  onClick={() => onPinMessage?.(msg.id)}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                  {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  {isPinned ? "Открепить" : "Закрепить"}
                </button>
              )}
              
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              
              <div className="px-3 py-1">
                <p className="text-xs text-gray-500 mb-1">Размер текста</p>
                <div className="flex gap-1">
                  <button onClick={() => setTextSize('normal')} className="flex-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700">Норм</button>
                  <button onClick={() => setTextSize('large')} className="flex-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700">Круп</button>
                  <button onClick={() => setTextSize('huge')} className="flex-1 px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700">Огром</button>
                </div>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              
              <div className="px-3 py-2 text-xs text-gray-500">
                ID: {msg.id?.slice(-6)}
              </div>
            </div>
          </div>
        )}
        
        {/* Reactions Picker Popup */}
        {showReactionsPicker === msg.id && (
          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 z-50 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex gap-1.5">
              {REACTION_EMOJIS.map(({ emoji, name, color }) => {
                const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
                return (
                  <button
                    key={emoji}
                    onClick={() => {
                      onToggleReaction(msg.id, emoji);
                      setShowReactionsPicker(null);
                      showConfetti();
                    }}
                    className={`p-2 rounded-xl transition-all duration-200 text-2xl ${
                      hasReacted 
                        ? 'bg-[#25D366]/20 scale-110 shadow-md' 
                        : `${color} hover:scale-125`
                    }`}
                    title={name}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500">
              Выберите реакцию
            </div>
          </div>
        )}
        
        {/* Reactions Display */}
        {Object.keys(reactionCounts).length > 0 && !isEditing && !isDeleted && (
          <div className="flex flex-wrap gap-1 mt-1.5 ml-1">
            {Object.entries(reactionCounts).map(([emoji, count]) => {
              const reactors = uniqueReactors[emoji];
              const reactorNames = reactors ? Array.from(reactors).slice(0, 3).join(', ') : '';
              const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
              
              return (
                <button 
                  key={emoji} 
                  onClick={() => onToggleReaction(msg.id, emoji)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                    hasReacted 
                      ? 'bg-[#25D366]/20 text-[#075E54] dark:text-[#25D366] scale-105' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={reactorNames || 'Нажмите, чтобы добавить реакцию'}
                >
                  <span className="text-sm">{emoji}</span>
                  <span className="font-semibold">{count}</span>
                </button>
              );
            })}
          </div>
        )}
        
        {/* Premium Effects - Sparkles for saved messages */}
        {isSaved && !isDeleted && (
          <div className="absolute -top-1 -right-1 animate-pulse">
            <Sparkles className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          </div>
        )}
      </div>
    </div>
  );
});

// Добавляем display name для лучшей отладки
MessageItem.displayName = 'MessageItem';

export default MessageItem;