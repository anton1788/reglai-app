// src/components/CommentsSection.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MessageCircle, X, User, ChevronDown, Loader2, AlertCircle, CheckCircle, Send } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ (вынесены — не пересоздаются)
// ─────────────────────────────────────────────────────────────

const formatDate = (dateString, language) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};

const sanitizeInput = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0);
      return code >= 32 || code === 9 || code === 10 || code === 13;
    })
    .join('')
    .trim();
};

const CHARACTER_LIMIT = 2000;
const CHARACTER_WARNING_THRESHOLD = 1800;

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ
// ─────────────────────────────────────────────────────────────

const CommentSkeleton = () => (
  <div className="animate-pulse bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-600/30">
    <div className="flex items-start gap-2 mb-2">
      <div className="w-7 h-7 bg-gray-200 dark:bg-gray-600 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/3" />
        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4" />
      </div>
      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16" />
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full" />
      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3" />
    </div>
  </div>
);

const CharacterCounter = ({ current, limit, warningThreshold }) => {
  const remaining = limit - current;
  const isWarning = remaining <= warningThreshold && remaining > 0;
  const isOver = remaining <= 0;
  
  return (
    <span 
      className={`text-xs pointer-events-none transition-colors ${
        isOver ? 'text-red-600 dark:text-red-400 font-medium' :
        isWarning ? 'text-amber-600 dark:text-amber-400' :
        'text-gray-400 dark:text-gray-500'
      }`}
      aria-live="polite"
    >
      {current}/{limit}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────

const CommentsSection = React.memo(({
  application,
  comments = {},
  // ✅ ИСПРАВЛЕНИЕ 1: Используем showComments для контроля видимости
  showComments = {},
  onToggleComments,
  onAddComment,
  language = 'ru',
  t = (key) => key,
  getRoleLabel = (role) => role,
  escapeHtml = (str) => str,
  isLoading = false,
  user = null
}) => {
  // ─────────────────────────────────────────────────────────
  // 📊 STATE & REFS
  // ─────────────────────────────────────────────────────────
  
  const [localComment, setLocalComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const textareaRef = useRef(null);
  const commentValueRef = useRef('');
  
  useEffect(() => {
    commentValueRef.current = localComment;
  }, [localComment]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localComment]);

  useEffect(() => {
    // Сбрасываем локальные состояния при закрытии комментариев извне
    const isVisible = showComments[application?.id];
    if (!isVisible) {
      setError(null);
      setSuccess(false);
    }
  }, [showComments, application?.id]);

  // ─────────────────────────────────────────────────────────
  // 📋 ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ (memoized)
  // ─────────────────────────────────────────────────────────
  
  const appComments = useMemo(() => {
    const list = comments[application?.id];
    return Array.isArray(list) ? list : [];
  }, [comments, application?.id]);

  // ✅ ИСПРАВЛЕНИЕ 1: Используем showComments напрямую
  const isExpanded = !!showComments[application?.id];
  
  const characterCount = localComment.length;
  const isOverLimit = characterCount > CHARACTER_LIMIT;
  const isNearLimit = characterCount >= CHARACTER_WARNING_THRESHOLD;
  const canSubmit = localComment.trim() && !isSubmitting && !isLoading && user && !isOverLimit;

  // ─────────────────────────────────────────────────────────
  // 🎛️ ОБРАБОТЧИКИ
  // ─────────────────────────────────────────────────────────
  
  const submitComment = useCallback(async () => {
    const content = sanitizeInput(commentValueRef.current);
    
    if (!content || !application?.id || isSubmitting) return;
    
    // ✅ ИСПРАВЛЕНИЕ 2: Безопасная проверка без process
    try {
      // eslint-disable-next-line no-undef
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.log('📤 Sending comment:', {
          applicationId: application?.id,
          contentLength: content.length,
          preview: content.slice(0, 100)
        });
      }
    } catch {
      // Игнорируем ошибки доступа к process
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await onAddComment(content, application.id);
      setLocalComment('');
      setSuccess(true);
      
      setTimeout(() => setSuccess(false), 2000);
      
    } catch (err) {
      console.error('Failed to add comment:', err);
      setError(t('errorSavingComment') || 'Не удалось сохранить комментарий');
    } finally {
      setIsSubmitting(false);
      textareaRef.current?.focus();
    }
  }, [application?.id, onAddComment, isSubmitting, t]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      if (localComment.trim()) {
        e.preventDefault();
        setLocalComment('');
      }
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSubmit) {
        submitComment();
      }
      return;
    }
    
    if (e.key === 'Enter' && e.shiftKey) {
      return;
    }
  }, [localComment, canSubmit, submitComment]);

  const handleSubmitClick = useCallback(() => {
    if (canSubmit) {
      submitComment();
    }
  }, [canSubmit, submitComment]);

  const handleClear = useCallback(() => {
    setLocalComment('');
    setError(null);
    textareaRef.current?.focus();
  }, []);

  // ─────────────────────────────────────────────────────────
  // 📋 РЕНДЕРИНГ
  // ─────────────────────────────────────────────────────────

  return (
    <section className="mt-4 pt-4 border-t border-gray-200/30 dark:border-gray-700/30">
      
      {/* Toggle Button */}
      <button
        onClick={onToggleComments}
        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 w-full sm:w-auto justify-start"
        aria-label={isExpanded ? t('hideComments') : t('showComments')}
        aria-expanded={isExpanded}
        aria-controls={`comments-list-${application?.id}`}
        type="button"
      >
        <MessageCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        <span>{t('comments') || 'Комментарии'}</span>
        <span className="text-gray-400 dark:text-gray-500">({appComments.length})</span>
        {isExpanded 
          ? <X className="w-4 h-4 flex-shrink-0 ml-auto sm:ml-0" aria-hidden="true" /> 
          : <ChevronDown className="w-4 h-4 flex-shrink-0 ml-auto sm:ml-0 transition-transform" aria-hidden="true" />
        }
      </button>

      {/* Comments Content */}
      {isExpanded && (
        <div 
          id={`comments-list-${application?.id}`}
          className="mt-4 space-y-4"
          role="region"
          aria-label={t('commentsSection')}
        >
          
          {/* Loading State */}
          {isLoading && appComments.length === 0 && (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => <CommentSkeleton key={i} />)}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && appComments.length === 0 && (
            <div 
              className="flex items-center justify-center py-6 text-gray-500 dark:text-gray-400"
              role="status"
            >
              <MessageCircle className="w-5 h-5 mr-2 opacity-50" aria-hidden="true" />
              <span className="text-sm italic">{t('noComments') || 'Пока нет комментариев'}</span>
            </div>
          )}

          {/* Comments List */}
          {appComments.length > 0 && (
            <div 
              className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
              role="list"
              aria-label={t('commentsList')}
            >
              {appComments.map((comment) => (
                <article 
                  key={comment.id || `${comment.user_email}-${comment.created_at}`}
                  className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-600/30 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors"
                  role="listitem"
                  aria-labelledby={`comment-author-${comment.id}`}
                >
                  <header className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div 
                        className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0"
                        aria-hidden="true"
                      >
                        <User className="w-4 h-4 text-white" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span 
                          id={`comment-author-${comment.id}`}
                          className="text-xs font-medium text-gray-900 dark:text-white truncate block"
                        >
                          {escapeHtml(comment.user_email || t('unknownUser') || 'Пользователь')}
                        </span>
                        {comment.user_role && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            • {getRoleLabel(comment.user_role)}
                          </span>
                        )}
                      </div>
                    </div>
                    <time 
                      className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex-shrink-0"
                      dateTime={comment.created_at}
                      title={formatDate(comment.created_at, language)}
                    >
                      {formatDate(comment.created_at, language)}
                    </time>
                  </header>
                  
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                    {escapeHtml(comment.content)}
                  </p>
                </article>
              ))}
            </div>
          )}

          {/* Comment Form */}
          <div className="space-y-3">
            <div className="relative">
              <label htmlFor={`comment-input-${application?.id}`} className="sr-only">
                {t('addComment')}
              </label>
              <textarea
                id={`comment-input-${application?.id}`}
                ref={textareaRef}
                value={localComment}
                onChange={(e) => {
                  const value = e.target.value.slice(0, CHARACTER_LIMIT + 10);
                  setLocalComment(value);
                  if (error) setError(null);
                  if (success) setSuccess(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t('commentPlaceholder') || 'Напишите комментарий...'}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none transition-all ${
                  isOverLimit 
                    ? 'border-red-500 focus:ring-red-500' 
                    : isNearLimit 
                      ? 'border-amber-500' 
                      : 'border-gray-300 dark:border-gray-600'
                }`}
                rows={2}
                aria-describedby={`comment-hint-${application?.id}`}
                disabled={isSubmitting || isLoading || !user}
                maxLength={CHARACTER_LIMIT + 10}
              />
              
              {/* Controls: Counter + Clear */}
              <div className="absolute bottom-2 right-2 flex items-center gap-2">
                {localComment && !isSubmitting && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                    aria-label={t('clearComment')}
                    title={t('clearComment')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <CharacterCounter 
                  current={characterCount} 
                  limit={CHARACTER_LIMIT} 
                  warningThreshold={CHARACTER_WARNING_THRESHOLD} 
                />
              </div>
            </div>

            {/* Hint */}
            <p 
              id={`comment-hint-${application?.id}`}
              className="text-xs text-gray-400 dark:text-gray-500 text-right"
            >
              {language === 'ru' 
                ? 'Enter — отправить, Shift+Enter — новая строка, Esc — очистить' 
                : 'Enter to send, Shift+Enter for new line, Esc to clear'}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
              {error && (
                <div 
                  className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg" 
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}
              
              {success && (
                <div 
                  className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg" 
                  role="status"
                  aria-live="polite"
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{t('commentSent') || 'Отправлено!'}</span>
                </div>
              )}
              
              <button
                onClick={handleSubmitClick}
                disabled={!canSubmit}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 min-w-[90px] justify-center ${
                  canSubmit
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
                aria-label={t('sendComment')}
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span className="hidden sm:inline">{t('sending') || '...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">{t('sendComment') || 'Отправить'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

CommentsSection.displayName = 'CommentsSection';

export default CommentsSection;