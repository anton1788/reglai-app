// MessageItem.jsx - WhatsApp style сообщения
import React, { memo, useState } from 'react';
import { Edit2, Trash2, X, Check, Smile, CornerUpLeft, Bookmark, BookmarkCheck, CheckCheck, Clock } from 'lucide-react';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '🤔'];

const MessageItem = memo(({ 
  msg, user, userRole, isOwn, isEditing, editText, 
  onStartEdit, onSaveEdit, onCancelEdit, onDelete, 
  onToggleReaction, onReply, onToggleSave,
  isSaved, showReactionsPicker, setShowReactionsPicker,
  formatMessage, formatTime, language, textareaRef
  // companyUsers удален, так как не используется
}) => {
  const [showActions, setShowActions] = useState(false);
  const isDeleted = msg.deleted_at;
  const isEdited = msg.edited_at;
  
  const canEdit = msg.user_id === user?.id || userRole === 'super_admin';
  const canDelete = msg.user_id === user?.id || userRole === 'super_admin' || userRole === 'manager';
  
  const reactionCounts = React.useMemo(() => {
    if (!msg.reactions?.length) return {};
    return msg.reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});
  }, [msg.reactions]);

  // Статус прочтения (имитация)
  const messageStatus = isOwn ? (msg.read_at ? 'read' : 'delivered') : null;

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`max-w-[75%] md:max-w-[65%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        
        {/* Bubble */}
        <div className={`relative px-3 py-2 rounded-2xl ${
          isOwn 
            ? 'bg-[#DCF8C6] dark:bg-[#075E54] text-gray-800 dark:text-white rounded-br-md' 
            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-md shadow-sm'
        }`}>
          
          {/* Reply Preview */}
          {msg.reply_to_message_id && msg.replied_message && (
            <div className="mb-1 pb-1 border-l-2 border-[#25D366] pl-2 text-xs opacity-70">
              <span className="font-bold text-[#075E54] dark:text-[#25D366]">
                {msg.replied_message.user?.user_metadata?.full_name || 'Пользователь'}:
              </span>
              <span className="ml-1 truncate">{msg.replied_message.content?.slice(0, 40)}</span>
            </div>
          )}
          
          {/* Message Content */}
          {isDeleted ? (
            <span className="text-gray-400 italic text-sm flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> [Удалено]
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
                className="flex-1 bg-gray-100 dark:bg-gray-600 rounded-lg px-2 py-1 text-sm resize-none"
                rows={2}
                autoFocus
              />
              <div className="flex flex-col gap-1">
                <button onClick={() => onSaveEdit(msg.id)} className="p-1 hover:bg-green-500/20 text-green-600 rounded-lg">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={onCancelEdit} className="p-1 hover:bg-red-500/20 text-red-600 rounded-lg">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {formatMessage(msg.content, msg.id)}
            </div>
          )}
          
          {/* Time and Status */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <time className="text-[10px] text-gray-500 dark:text-gray-400">
              {formatTime(msg.created_at, language)}
              {isEdited && <span className="ml-1">(ред.)</span>}
            </time>
            {messageStatus === 'delivered' && <Check className="w-3 h-3 text-gray-500" />}
            {messageStatus === 'read' && <CheckCheck className="w-3 h-3 text-[#34B7F1]" />}
          </div>
        </div>
        
        {/* Actions Row - WhatsApp style (наведение) */}
        <div className={`flex items-center gap-1 mt-1 transition-all duration-200 ${
          showActions && !isDeleted && !isEditing ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Reaction Button */}
          <div className="relative">
            <button 
              onClick={() => setShowReactionsPicker(showReactionsPicker === msg.id ? null : msg.id)} 
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
            >
              <Smile className="w-3.5 h-3.5 text-gray-500" />
            </button>
            {showReactionsPicker === msg.id && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-full shadow-xl flex gap-1 z-50">
                {REACTION_EMOJIS.map(emoji => (
                  <button 
                    key={emoji} 
                    onClick={() => onToggleReaction(msg.id, emoji)} 
                    className="p-1.5 rounded-full hover:bg-gray-100 text-xl transition-transform hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button onClick={() => onReply(msg)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" title="Ответить">
            <CornerUpLeft className="w-3.5 h-3.5 text-gray-500" />
          </button>
          
          <button onClick={() => onToggleSave(msg.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" title={isSaved ? "Удалить из сохранённых" : "Сохранить"}>
            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-[#25D366]" /> : <Bookmark className="w-3.5 h-3.5 text-gray-500" />}
          </button>
          
          {(canEdit || canDelete) && (
            <div className="flex items-center gap-0.5 pl-1 border-l border-gray-200 dark:border-gray-600">
              {canEdit && (
                <button onClick={() => onStartEdit(msg)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full text-blue-500">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete(msg.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Reactions Display */}
        {Object.keys(reactionCounts).length > 0 && !isEditing && !isDeleted && (
          <div className="flex gap-1 mt-0.5">
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button 
                key={emoji} 
                onClick={() => onToggleReaction(msg.id, emoji)} 
                className="px-1.5 py-0.5 rounded-full text-xs bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600"
              >
                {emoji} <span className="text-[10px] opacity-70">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageItem;