// src/components/NpsSurveyModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Star, Send } from 'lucide-react';

const NpsSurveyModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading 
}) => {
  const [score, setScore] = useState(null);
  const [comment, setComment] = useState('');
  const [hoveredScore, setHoveredScore] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setScore(null);
      setComment('');
      setHoveredScore(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getScoreLabel = (value) => {
    if (value === null) return '';
    if (value <= 6) return 'Не доволен';
    if (value <= 8) return 'Нормально';
    return 'Очень доволен';
  };

  const getScoreColor = (value) => {
    if (value === null) return 'bg-gray-200 dark:bg-gray-700';
    if (value <= 6) return 'bg-red-500';
    if (value <= 8) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleSubmit = () => {
    if (score === null) return;
    onSubmit({ score, comment });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nps-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200/50 dark:border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-[#F9AA33] to-[#F57C00] rounded-lg">
              <Star className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 id="nps-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                Оценка качества
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Помогите нам стать лучше
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Question */}
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Насколько вероятно, что вы порекомендуете Реглай коллегам?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Выберите оценку от 0 до 10
            </p>
          </div>

          {/* Score Grid */}
          <div className="grid grid-cols-11 gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
              <button
                key={value}
                onClick={() => setScore(value)}
                onMouseEnter={() => setHoveredScore(value)}
                onMouseLeave={() => setHoveredScore(null)}
                className={`
                  aspect-square rounded-lg font-semibold text-sm transition-all duration-200
                  ${score === value 
                    ? `${getScoreColor(value)} text-white scale-110 shadow-lg` 
                    : hoveredScore === value
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white scale-105'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
                aria-label={`Оценка ${value}`}
                aria-pressed={score === value}
              >
                {value}
              </button>
            ))}
          </div>

          {/* Score Labels */}
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
            <span>0 - Не доволен</span>
            <span>10 - Очень доволен</span>
          </div>

          {/* Current Score Feedback */}
          {score !== null && (
            <div className={`text-center py-2 px-4 rounded-lg ${
              score <= 6 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
              score <= 8 ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' :
              'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            }`}>
              <p className="font-medium">{getScoreLabel(score)}</p>
            </div>
          )}

          {/* Comment Field */}
          <div>
            <label htmlFor="nps-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Комментарий (необязательно)
            </label>
            <textarea
              id="nps-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Что нам улучшить? Что нравится?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            Позже
          </button>
          <button
            onClick={handleSubmit}
            disabled={score === null || isLoading}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg flex items-center space-x-2 transition-all
              ${score === null 
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-md'
              }
            `}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Отправка...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>Отправить</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NpsSurveyModal;