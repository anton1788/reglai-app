// src/components/Chat/ChatInput.jsx
import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Smile, X, CornerUpLeft, Loader2 } from 'lucide-react';
import ChatEmojiPicker from './ChatEmojiPicker';
import VoiceRecorder from './VoiceRecorder';

const ChatInput = ({
  value,
  onChange,
  onSend,
  onFileUpload,
  onVoiceSend,
  replyTo,
  onCancelReply,
  isSending,
  placeholder = 'Введите сообщение...',
  disabled = false,
  className = ''
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);

  // Автоматическая высота textarea
  const handleChange = useCallback((e) => {
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
    onChange?.(e);
  }, [onChange]);

  // Обработка Enter
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend?.();
    }
  }, [onSend]);

  // Вставка эмодзи
  const handleEmojiSelect = useCallback((emoji) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + emoji + value.substring(end);
    
    onChange?.({ target: { value: newValue } });
    
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
    }, 10);
  }, [value, onChange]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Ответ на сообщение */}
      {replyTo && (
        <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-l-4 border-[#4A6572]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs">
              <CornerUpLeft className="w-3 h-3 text-[#4A6572]" />
              <span className="font-bold text-[#4A6572] dark:text-[#F9AA33]">
                Ответ {replyTo.user?.user_metadata?.full_name || 'пользователю'}:
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
              {replyTo.content?.slice(0, 80)}
            </p>
          </div>
          <button 
            onClick={onCancelReply} 
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Основное поле ввода */}
      <div className="flex items-end gap-2">
        {/* Кнопка вложения */}
        <label className="p-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 transition-colors">
          <Paperclip className="w-5 h-5" />
          <input 
            type="file" 
            onChange={onFileUpload} 
            className="hidden" 
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            multiple
          />
        </label>

        {/* Кнопка эмодзи */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300 transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 z-50">
              <ChatEmojiPicker
                onSelect={handleEmojiSelect}
                onClose={() => setShowEmojiPicker(false)}
              />
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={replyTo ? `Ответ ${replyTo.user?.user_metadata?.full_name}...` : placeholder}
          disabled={disabled || isSending}
          className="flex-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-[#4A6572] resize-none text-sm disabled:opacity-50"
          style={{ minHeight: '44px', maxHeight: '120px' }}
          rows={1}
        />

        {/* Кнопка отправки */}
        <button
          onClick={onSend}
          disabled={!value.trim() || isSending || disabled}
          className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
            !value.trim() || isSending || disabled
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-lg active:scale-95'
          }`}
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Подсказки по клавишам */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400 dark:text-gray-500">
          <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd>
          <span>— отправить</span>
          <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded ml-1">Shift+Enter</kbd>
          <span>— новая строка</span>
        </div>
        
        {/* Голосовая запись */}
        <VoiceRecorder
          onSend={(audio) => {
            onVoiceSend?.(audio);
          }}
          onCancel={() => {}}
          maxDuration={60}
        />
      </div>
    </div>
  );
};

export default ChatInput;