// src/components/Chat/ChatMessage.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { 
  Edit2, Trash2, CornerUpLeft, Bookmark, BookmarkCheck, 
  Pin, FileText, Smile, Copy, Check, X
} from 'lucide-react';
import { formatChatMessage, extractMentions } from '../../utils/chatFormatters';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👀'];

const ChatMessage = ({
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
  onReply,
  onToggleSave,
  isSaved,
  onPinMessage,
  isPinned,
  showReactionsPicker,
  setShowReactionsPicker,
  textareaRef
}) => {
  const [copied, setCopied] = useState(false);

  // ✅ Проверяем, является ли сообщение голосовым
  const isVoiceMessage = useMemo(() => {
    return msg.content?.includes('🎙️ Голосовое сообщение') && 
           msg.content?.includes('https://') && 
           msg.content?.includes('.webm');
  }, [msg.content]);

  // ✅ Извлекаем URL из голосового сообщения
  const voiceAudioUrl = useMemo(() => {
    if (!isVoiceMessage) return null;
    const urlMatch = msg.content.match(/https?:\/\/[^\s]+\.webm/);
    return urlMatch ? urlMatch[0] : null;
  }, [isVoiceMessage, msg.content]);

  // Форматированное содержимое (только для текстовых сообщений)
  const formattedContent = useMemo(() => {
    if (!msg.content || isVoiceMessage) return '';
    return formatChatMessage(msg.content);
  }, [msg.content, isVoiceMessage]);

  // Упоминания в сообщении
  const mentions = useMemo(() => {
    return extractMentions(msg.content);
  }, [msg.content]);

  // Реакции с группировкой
  const reactionCounts = useMemo(() => {
    if (!msg.reactions?.length) return {};
    return msg.reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});
  }, [msg.reactions]);

  // Проверка, поставил ли текущий пользователь реакцию
  const hasReacted = useCallback((emoji) => {
    return msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
  }, [msg.reactions, user?.id]);

  // ✅ Права на редактирование и удаление
  const canEdit = msg.user_id === user?.id || userRole === 'manager' || userRole === 'supply_admin' || userRole === 'director';
  const canDelete = msg.user_id === user?.id || userRole === 'manager' || userRole === 'supply_admin' || userRole === 'director';

  // Двойной клик для быстрой реакции ❤️
  const handleDoubleClick = useCallback(() => {
    if (!isEditing) {
      onToggleReaction?.(msg.id, '❤️');
    }
  }, [isEditing, onToggleReaction, msg.id]);

  // Копирование текста
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(msg.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Не удалось скопировать:', err);
      const textarea = document.createElement('textarea');
      textarea.value = msg.content || '';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [msg.content]);

  // Имя отправителя
  const senderName = msg.user?.user_metadata?.full_name || 'Пользователь';
  const senderInitial = senderName[0]?.toUpperCase() || '?';
  const senderRole = msg.user?.user_metadata?.role || userRole;

  // Проверка, упомянут ли текущий пользователь
  const isMentioned = useMemo(() => {
    if (!user?.user_metadata?.full_name) return false;
    const nameParts = user.user_metadata.full_name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts[1] || '';
    
    return mentions.some(m => 
      m.toLowerCase() === user.user_metadata.full_name.toLowerCase() ||
      m.toLowerCase() === firstName.toLowerCase() ||
      (lastName && m.toLowerCase() === lastName.toLowerCase()) ||
      m.toLowerCase() === 'меня' ||
      m.toLowerCase() === 'всех'
    );
  }, [mentions, user]);

  // ============================================================
  // ✅ Рендер голосового сообщения (С ДОБАВЛЕННЫМИ ДЕЙСТВИЯМИ)
  // ============================================================
  if (isVoiceMessage && voiceAudioUrl) {
    return (
      <article 
        className={`group flex gap-2 sm:gap-3 ${isOwn ? 'flex-row-reverse' : ''} animate-in fade-in`}
      >
        {/* Аватар */}
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0 ${isOwn ? 'order-2' : ''}`}>
          <span className="text-white text-[10px] sm:text-xs font-medium">
            {senderInitial}
          </span>
        </div>
        
        <div className={`max-w-[85%] sm:max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
          {/* Имя отправителя */}
          {!isOwn && (
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 pl-1 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-[#4A6572] dark:text-[#F9AA33]">
                {senderName}
              </span>
              {senderRole && (
                <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500">
                  · {senderRole}
                </span>
              )}
            </div>
          )}
          
          {/* ✅ Аудио-плеер */}
          <div 
            className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm ${
              isOwn 
                ? 'bg-[#4A6572] text-white rounded-br-md' 
                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-gray-100 dark:border-gray-600'
            }`}
          >
            <div className="flex flex-col gap-1">
              <audio 
                controls 
                src={voiceAudioUrl}
                className="w-full max-w-[280px] h-10 rounded"
                preload="metadata"
              >
                <source src={voiceAudioUrl} type="audio/webm" />
                <source src={voiceAudioUrl} type="audio/ogg" />
                <source src={voiceAudioUrl} type="audio/mp4" />
                Ваш браузер не поддерживает аудио.
              </audio>
              <span className="text-[10px] opacity-70">🎙️ Голосовое сообщение</span>
            </div>
          </div>
          
          {/* ✅ Действия под голосовым сообщением (ВКЛЮЧАЯ УДАЛЕНИЕ) */}
          <div className={`flex items-center gap-1 mt-0.5 text-[10px] sm:text-xs ${isOwn ? 'justify-end' : ''}`}>
            <span className="text-gray-400 dark:text-gray-500">
              {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </span>
            
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Ответ */}
              <button 
                onClick={() => onReply?.(msg)} 
                className="p-0.5 sm:p-1 hover:bg-gray-200/50 rounded-full"
              >
                <CornerUpLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
              </button>
              
              {/* Копировать */}
              <button 
                onClick={handleCopy}
                className="p-0.5 sm:p-1 hover:bg-gray-200/50 rounded-full"
              >
                {copied ? (
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
                )}
              </button>
              
              {/* Закрепить */}
              {onPinMessage && (
                <button 
                  onClick={() => onPinMessage?.(msg.id)} 
                  className="p-0.5 sm:p-1 hover:bg-yellow-100/50 rounded text-yellow-500"
                >
                  <Pin className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                </button>
              )}
              
              {/* ✅ УДАЛИТЬ (добавлено для голосовых сообщений) */}
              {canDelete && (
                <button 
                  onClick={() => onDelete?.(msg.id)} 
                  className="p-0.5 sm:p-1 hover:bg-red-100/50 rounded text-red-500"
                >
                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  // ============================================================
  // ✅ Рендер текстового сообщения
  // ============================================================
  return (
    <article 
      className={`group flex gap-2 sm:gap-3 ${isOwn ? 'flex-row-reverse' : ''} animate-in fade-in ${
        isMentioned ? 'bg-yellow-50 dark:bg-yellow-900/10 rounded-lg -mx-2 px-2 py-1 border-l-4 border-yellow-400' : ''
      }`}
      onDoubleClick={handleDoubleClick}
    >
      {/* Аватар */}
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0 ${isOwn ? 'order-2' : ''}`}>
        <span className="text-white text-[10px] sm:text-xs font-medium">
          {senderInitial}
        </span>
      </div>
      
      <div className={`max-w-[85%] sm:max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
        {/* Имя отправителя */}
        {!isOwn && (
          <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 pl-1 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-[#4A6572] dark:text-[#F9AA33]">
              {senderName}
            </span>
            {senderRole && (
              <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500">
                · {senderRole}
              </span>
            )}
            {isMentioned && (
              <span className="text-[10px] bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-1.5 py-0.5 rounded-full">
                @упомянут
              </span>
            )}
          </div>
        )}
        
        {/* Тело сообщения */}
        <div 
          className={`relative rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm ${
            isOwn 
              ? 'bg-[#4A6572] text-white rounded-br-md' 
              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-gray-100 dark:border-gray-600'
          } ${isPinned ? 'border-l-4 border-l-yellow-400' : ''}`}
        >
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
              {/* Ответ на сообщение */}
              {msg.replied_message && (
                <div className="mb-2 p-1.5 sm:p-2 bg-black/10 dark:bg-white/10 rounded-lg border-l-4 border-[#4A6572]">
                  <p className="text-[10px] sm:text-xs font-bold text-[#4A6572] dark:text-[#F9AA33]">
                    ↳ {msg.replied_message.user?.user_metadata?.full_name || 'Пользователь'}
                  </p>
                  <p className="text-[10px] sm:text-xs opacity-75 truncate">{msg.replied_message.content}</p>
                </div>
              )}
              
              {/* Контент с форматированием */}
              <div 
                className="text-sm whitespace-pre-wrap break-words leading-relaxed chat-message-content"
                dangerouslySetInnerHTML={{ __html: formattedContent }}
              />
              
              {/* Отметка о редактировании */}
              {msg.edited_at && (
                <span className="text-[10px] opacity-50 mt-1 block">
                  (изменено)
                </span>
              )}
            </>
          )}
        </div>
        
        {/* Действия под сообщением */}
        <div className={`flex items-center gap-1 mt-0.5 text-[10px] sm:text-xs ${isOwn ? 'justify-end' : ''}`}>
          <span className="text-gray-400 dark:text-gray-500">
            {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
          </span>
          
          {!isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Реакции */}
              <button 
                onClick={() => setShowReactionsPicker?.(showReactionsPicker === msg.id ? null : msg.id)}
                className="p-0.5 sm:p-1 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded-full"
              >
                <Smile className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
              </button>
              
              {/* Ответ */}
              <button 
                onClick={() => onReply?.(msg)} 
                className="p-0.5 sm:p-1 hover:bg-gray-200/50 rounded-full"
              >
                <CornerUpLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
              </button>
              
              {/* Сохранить */}
              <button 
                onClick={() => onToggleSave?.(msg.id)} 
                className="p-0.5 sm:p-1 hover:bg-gray-200/50 rounded-full"
              >
                {isSaved ? (
                  <BookmarkCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#4A6572]" />
                ) : (
                  <Bookmark className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
                )}
              </button>

              {/* Копировать */}
              <button 
                onClick={handleCopy}
                className="p-0.5 sm:p-1 hover:bg-gray-200/50 rounded-full"
              >
                {copied ? (
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500" />
                )}
              </button>
              
              {/* Закрепить */}
              {onPinMessage && (
                <button 
                  onClick={() => onPinMessage?.(msg.id)} 
                  className="p-0.5 sm:p-1 hover:bg-yellow-100/50 rounded text-yellow-500"
                >
                  <Pin className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                </button>
              )}
              
              {/* Редактировать */}
              {canEdit && (
                <button 
                  onClick={() => onStartEdit?.(msg)} 
                  className="p-0.5 sm:p-1 hover:bg-blue-100/50 rounded text-blue-500"
                >
                  <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
              
              {/* Удалить */}
              {canDelete && (
                <button 
                  onClick={() => onDelete?.(msg.id)} 
                  className="p-0.5 sm:p-1 hover:bg-red-100/50 rounded text-red-500"
                >
                  <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Реакции под сообщением */}
        {Object.keys(reactionCounts).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isOwn ? 'justify-end' : ''}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => {
              const reacted = hasReacted(emoji);
              return (
                <button
                  key={`${msg.id}-${emoji}`}
                  onClick={() => onToggleReaction?.(msg.id, emoji)}
                  className={`px-1.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-0.5 transition-all ${
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
        
        {/* Picker реакций */}
        {showReactionsPicker === msg.id && (
          <div className="absolute bottom-full mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 flex gap-1 z-50">
            {REACTION_EMOJIS.map(emoji => {
              const reacted = hasReacted(emoji);
              return (
                <button
                  key={emoji}
                  onClick={() => {
                    onToggleReaction?.(msg.id, emoji);
                    setShowReactionsPicker?.(null);
                  }}
                  className={`p-1.5 rounded-lg transition-all text-lg ${
                    reacted ? 'bg-[#4A6572]/10 scale-110' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
};

export default React.memo(ChatMessage);