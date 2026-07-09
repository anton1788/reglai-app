import React, { useState } from 'react';
import { X, Send, Star, Heart, ThumbsUp, Smile, Meh, Frown } from 'lucide-react';

const NpsSurveyModal = ({ isOpen, onClose, onSubmit, isLoading, t }) => {
  const [score, setScore] = useState(null);
  const [hoverScore, setHoverScore] = useState(null);
  const [comment, setComment] = useState('');
  const [step, setStep] = useState(1);

  if (!isOpen) return null;

  const handleScoreSelect = (value) => {
    setScore(value);
    setStep(2);
  };

  const handleSubmit = () => {
    if (score === null) return;
    onSubmit({ score, comment });
  };

  const getScoreLabel = (value) => {
    if (value <= 3) return 'Критик';
    if (value <= 6) return 'Нейтрал';
    return 'Промоутер';
  };

  const getScoreEmoji = (value) => {
    if (value <= 3) return <Frown className="w-8 h-8 text-red-500" />;
    if (value <= 6) return <Meh className="w-8 h-8 text-yellow-500" />;
    return <Smile className="w-8 h-8 text-green-500" />;
  };

  const getScoreColor = (value) => {
    if (value <= 3) return 'bg-red-100 border-red-300 hover:bg-red-200';
    if (value <= 6) return 'bg-yellow-100 border-yellow-300 hover:bg-yellow-200';
    return 'bg-green-100 border-green-300 hover:bg-green-200';
  };

  // Массив оценок от 0 до 10
  const scores = Array.from({ length: 11 }, (_, i) => i);

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] fade-enter"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-[#4A6572]" />
                {t?.('npsSurvey') || 'Быстрый опрос (NPS)'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {step === 1 ? '1 вопрос • 1 минута' : 'Шаг 2 из 2 • Оставьте комментарий'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-1 mt-3">
            <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-[#4A6572]' : 'bg-gray-200 dark:bg-gray-600'}`} />
            <div className={`h-1 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-[#4A6572]' : 'bg-gray-200 dark:bg-gray-600'}`} />
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {t?.('npsQuestion') || 'Насколько вероятно, что вы порекомендуете нас коллеге?'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  0 — {t?.('notLikely') || 'Не рекомендую'} • 10 — {t?.('veryLikely') || 'Обязательно'}
                </p>
              </div>

              {/* Score grid */}
              <div className="grid grid-cols-11 gap-1">
                {scores.map((value) => (
                  <button
                    key={value}
                    onClick={() => handleScoreSelect(value)}
                    onMouseEnter={() => setHoverScore(value)}
                    onMouseLeave={() => setHoverScore(null)}
                    className={`
                      py-3 rounded-lg text-sm font-medium transition-all
                      ${score === value 
                        ? 'bg-[#4A6572] text-white scale-105 shadow-md' 
                        : hoverScore === value
                          ? 'bg-gray-200 dark:bg-gray-600 scale-105'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }
                      ${value === 0 ? 'col-span-1' : ''}
                      ${value === 10 ? 'col-span-1' : ''}
                    `}
                  >
                    {value}
                  </button>
                ))}
              </div>

              {/* Labels */}
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>0 — {t?.('notLikely') || 'Не рекомендую'}</span>
                <span>10 — {t?.('veryLikely') || 'Обязательно'}</span>
              </div>

              {/* Selected feedback */}
              {score !== null && (
                <div className={`
                  flex items-center justify-center gap-3 p-4 rounded-xl border-2
                  ${getScoreColor(score)}
                `}>
                  {getScoreEmoji(score)}
                  <div>
                    <p className="font-bold text-lg">{score}/10</p>
                    <p className="text-sm font-medium">{getScoreLabel(score)}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`
                flex items-center justify-center gap-3 p-4 rounded-xl border-2
                ${getScoreColor(score)}
              `}>
                {getScoreEmoji(score)}
                <div>
                  <p className="font-bold text-lg">{score}/10</p>
                  <p className="text-sm font-medium">{getScoreLabel(score)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t?.('npsFeedbackPlaceholder') || 'Что можно улучшить? (необязательно)'}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t?.('npsFeedbackPlaceholder') || 'Расскажите, что можно улучшить...'}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none min-h-[100px]"
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">
                  {comment.length}/500
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl">
          <div className="flex justify-between">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                {t?.('back') || 'Назад'}
              </button>
            )}
            <div className="flex-1" />
            {step === 1 ? (
              <button
                onClick={() => {
                  if (score === null) {
                    // Показываем уведомление
                  }
                }}
                disabled={score === null}
                className={`
                  px-6 py-2 rounded-lg font-medium transition-all
                  ${score !== null 
                    ? 'bg-[#4A6572] text-white hover:bg-[#344955]' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {score !== null ? 'Далее →' : 'Выберите оценку'}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t?.('sending') || 'Отправка...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t?.('send') || 'Отправить'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NpsSurveyModal;