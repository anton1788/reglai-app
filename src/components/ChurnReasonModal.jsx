// src/components/ChurnReasonModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';

// 🔒 Константа ТОЛЬКО для внутреннего использования (не экспортируем!)
const REASON_OPTIONS = [
  { value: 'price', label: '💰 Дорого / не оправдало цену', color: 'red' },
  { value: 'features', label: '🔧 Не хватает функционала', color: 'orange' },
  { value: 'support', label: '🎧 Плохая поддержка', color: 'yellow' },
  { value: 'competitor', label: '🏆 Нашли лучшее решение', color: 'blue' },
  { value: 'usability', label: '🧭 Сложно использовать', color: 'purple' },
  { value: 'performance', label: '⚡ Технические проблемы', color: 'gray' },
  { value: 'other', label: '📝 Другое', color: 'slate' }
];

// 🎨 Фиксированные классы для Tailwind JIT (чтобы не вырезать стили)
const REASON_RING_CLASSES = {
  red: 'ring-red-500',
  orange: 'ring-orange-500',
  yellow: 'ring-yellow-500',
  blue: 'ring-blue-500',
  purple: 'ring-purple-500',
  gray: 'ring-gray-500',
  slate: 'ring-slate-500'
};

const REASON_DOT_CLASSES = {
  red: 'border-red-500 bg-red-500',
  orange: 'border-orange-500 bg-orange-500',
  yellow: 'border-yellow-500 bg-yellow-500',
  blue: 'border-blue-500 bg-blue-500',
  purple: 'border-purple-500 bg-purple-500',
  gray: 'border-gray-500 bg-gray-500',
  slate: 'border-slate-500 bg-slate-500'
};

const REASON_CARD_CLASSES = {
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600',
  slate: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
};

const ChurnReasonModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading,
  companyName,
  t // ← функция локализации из App.jsx
}) => {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [severity, setSeverity] = useState(3);
  
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);

  // 🔄 Сброс формы при открытии
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setComment('');
      setSeverity(3);
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ⌨️ Обработка Escape и Tab
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      // Базовый focus trap для Tab
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 🚫 Блокировка скролла фона
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason) return;
    onSubmit({ reason, comment: comment.trim(), severity });
  };

  const getCardClasses = (color) => REASON_CARD_CLASSES[color] || REASON_CARD_CLASSES.slate;
  const getRingClass = (color) => REASON_RING_CLASSES[color] || REASON_RING_CLASSES.slate;
  const getDotClass = (color) => REASON_DOT_CLASSES[color] || REASON_DOT_CLASSES.slate;

  // 🌐 Локализация с фоллбэком
  const label = (key, fallback) => t ? t(key) || fallback : fallback;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="churn-modal-title"
      aria-describedby="churn-modal-description"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200/50 dark:border-gray-700/50"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 id="churn-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                {label('churnModal.title', 'Почему вы уходите?')}
              </h3>
              {companyName && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {label('churnModal.company', 'Компания')}: {companyName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={label('common.close', 'Закрыть')}
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6" id="churn-modal-description">
          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {label('churnModal.mainReason', 'Основная причина')} *
            </label>
            <div className="space-y-2" role="radiogroup">
              {REASON_OPTIONS.map((option, index) => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    reason === option.value
                      ? `${getCardClasses(option.color)} ${getRingClass(option.color)} ring-2 ring-offset-2 dark:ring-offset-gray-800`
                      : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <input
                    ref={index === 0 ? firstInputRef : null}
                    type="radio"
                    name="churn-reason"
                    value={option.value}
                    checked={reason === option.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="sr-only"
                    aria-describedby={`reason-${option.value}-desc`}
                  />
                  <span className={`w-4 h-4 rounded-full border-2 mr-3 flex-shrink-0 transition-colors ${
                    reason === option.value 
                      ? getDotClass(option.color)
                      : 'border-gray-300 dark:border-gray-500'
                  }`}>
                    {reason === option.value && (
                      <span className="block w-2 h-2 rounded-full bg-white m-0.5" />
                    )}
                  </span>
                  <span className="text-sm flex-1" id={`reason-${option.value}-desc`}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Severity Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {label('churnModal.severity', 'Насколько это повлияло на решение?')}
            </label>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {label('churnModal.severityLow', 'Мало')}
              </span>
              <div className="flex-1 flex gap-1" role="slider" aria-valuenow={severity} aria-valuemin={1} aria-valuemax={5}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    className={`flex-1 h-8 rounded transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 ${
                      severity >= level
                        ? 'bg-gradient-to-r from-red-500 to-orange-500'
                        : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                    aria-label={label('churnModal.severityLevel', 'Уровень') + ` ${level}`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {label('churnModal.severityHigh', 'Критично')}
              </span>
            </div>
            <div className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
              {label('churnModal.severityValue', 'Уровень')}: {severity}/5
            </div>
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="churn-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {label('churnModal.comment', 'Комментарий')} ({label('common.optional', 'необязательно')})
            </label>
            <textarea
              id="churn-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={label('churnModal.placeholder', 'Что мы могли бы сделать лучше? Ваши пожелания...')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none transition-colors"
            />
          </div>

          {/* Privacy Note */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            💡 {label('churnModal.privacyNote', 'Ваш ответ поможет нам улучшить продукт. Данные анонимизируются при анализе.')}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            {label('common.skip', 'Пропустить')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!reason || isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center space-x-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 ${
              !reason 
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-md hover:from-red-600 hover:to-orange-600'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                <span>{label('common.sending', 'Отправка...')}</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>{label('common.send', 'Отправить')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChurnReasonModal;