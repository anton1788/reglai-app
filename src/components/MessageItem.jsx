import React, { memo, useState } from 'react';
import { Edit2, Trash2, X, Check, Smile, CornerUpLeft, Bookmark, BookmarkCheck } from 'lucide-react';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '🤔'];

const MessageItem = memo(({ 
  msg, user, userRole, isOwn, isEditing, editText, 
  onStartEdit, onSaveEdit, onCancelEdit, onDelete, 
  onToggleReaction, onReply, onToggleSave,
  isSaved, showReactionsPicker, setShowReactionsPicker,
  formatMessage, formatTime, language, textareaRef,
  companyUsers
}) => {
  const [showActions, setShowActions] = useState(false);
  const isDeleted = msg.deleted_at;
  const isEdited = msg.edited_at;
  
  const canEdit = msg.user_id === user?.id || userRole === 'super_admin';
  const canDelete = msg.user_id === user?.id || userRole === 'super_admin' || userRole === 'manager';
  
  const getUserAvatar = () => {
    const companyUser = companyUsers?.find(u => u.user_id === msg.user_id);
    return companyUser?.full_name?.[0]?.toUpperCase() || '?';
  };
  
  const getUserName = () => {
    const companyUser = companyUsers?.find(u => u.user_id === msg.user_id);
    return companyUser?.full_name || msg.user?.user_metadata?.full_name || 'Пользователь';
  };
  
  const reactionCounts = React.useMemo(() => {
    if (!msg.reactions?.length) return {};
    return msg.reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});
  }, [msg.reactions]);

  const renderReplyPreview = () => {
    if (!msg.reply_to_message_id || !msg.replied_message) return null;
    const repliedMsg = msg.replied_message;
    return (
      <div className="mb-1 pb-1 border-l-2 border-[#4A6572] pl-2 text-xs opacity-70">
        <span className="font-bold text-[#4A6572] dark:text-[#F9AA33]">
          {repliedMsg.user?.user_metadata?.full_name || 'Пользователь'}:
        </span>
        <span className="ml-1">{repliedMsg.content?.slice(0, 50)}...</span>
      </div>
    );
  };

  return (
    <div 
      className={`group flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} hover:bg-gray-50/50 dark:hover:bg-gray-700/30 rounded-lg transition-all -mx-2 px-2 py-1`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Аватар */}
      <div className={`flex-shrink-0 ${isOwn ? 'order-2' : ''}`}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center shadow-md">
          <span className="text-white text-sm font-medium">{getUserAvatar()}</span>
        </div>
      </div>
      
      {/* Контент */}
      <div className={`max-w-[85%] md:max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
        {!isOwn && !isDeleted && (
          <div className="flex items-center gap-2 mb-1 ml-1">
            <span className="text-sm font-bold text-gray-800 dark:text-white">{getUserName()}</span>
            <time className="text-xs text-gray-400 dark:text-gray-500">
              {formatTime(msg.created_at, language)}
              {isEdited && <span className="ml-1">(ред.)</span>}
            </time>
          </div>
        )}
        
        {/* Пузырь */}
        <div className={`relative rounded-2xl px-4 py-2.5 shadow-sm ${
          isOwn 
            ? 'bg-[#4A6572] text-white rounded-br-sm' 
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm border'
        }`}>
          {renderReplyPreview()}
          
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
                className="flex-1 bg-black/10 rounded-lg px-2 py-1 text-sm resize-none focus:ring-2 focus:ring-[#F9AA33] min-h-[60px]"
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
            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {formatMessage(msg.content, msg.id)}
            </div>
          )}
        </div>
        
        {/* Действия */}
        <div className={`flex items-center gap-1 mt-1 transition-opacity ${showActions && !isDeleted && !isEditing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <div className="relative">
            <button onClick={() => setShowReactionsPicker(showReactionsPicker === msg.id ? null : msg.id)} className="p-1.5 hover:bg-gray-100 rounded-full">
              <Smile className="w-3.5 h-3.5 text-gray-500" />
            </button>
            {showReactionsPicker === msg.id && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl flex flex-wrap gap-1 z-50">
                {REACTION_EMOJIS.map(emoji => {
                  const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
                  return (
                    <button key={emoji} onClick={() => onToggleReaction(msg.id, emoji)} className={`p-2 rounded-lg text-xl transition-all ${hasReacted ? 'bg-[#4A6572]/10 scale-110' : 'hover:bg-gray-100'}`}>
                      {emoji}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          <button onClick={() => onReply(msg)} className="p-1.5 hover:bg-gray-100 rounded-full" title="Ответить">
            <CornerUpLeft className="w-3.5 h-3.5 text-gray-500" />
          </button>
          
          <button onClick={() => onToggleSave(msg.id)} className="p-1.5 hover:bg-gray-100 rounded-full" title={isSaved ? "Удалить из сохранённых" : "Сохранить"}>
            {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-[#F9AA33]" /> : <Bookmark className="w-3.5 h-3.5 text-gray-500" />}
          </button>
          
          {(canEdit || canDelete) && (
            <div className="flex items-center gap-0.5 pl-1 border-l border-gray-200">
              {canEdit && <button onClick={() => onStartEdit(msg)} className="p-1.5 hover:bg-blue-100 rounded text-blue-500"><Edit2 className="w-3.5 h-3.5" /></button>}
              {canDelete && <button onClick={() => onDelete(msg.id)} className="p-1.5 hover:bg-red-100 rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
            </div>
          )}
        </div>
        
        {/* Реакции под сообщением */}
        {Object.keys(reactionCounts).length > 0 && !isEditing && !isDeleted && (
          <div className={`flex flex-wrap gap-1.5 mt-1 ${isOwn ? 'justify-end' : ''}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <button key={emoji} onClick={() => onToggleReaction(msg.id, emoji)} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 hover:bg-gray-200">
                {emoji} <span className="opacity-80">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default MessageItem;