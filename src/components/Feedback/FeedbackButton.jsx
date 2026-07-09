import React, { useState } from 'react';
import { MessageCircle, X, Star, Send } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const FeedbackButton = ({ user, userCompanyId, showNotification, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      showNotification('Пожалуйста, войдите в систему', 'error');
      return;
    }

    if (rating === 0) {
      showNotification('Пожалуйста, оцените приложение', 'warning');
      return;
    }

    if (!feedbackText.trim()) {
      showNotification('Пожалуйста, напишите ваш отзыв', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('tester_feedback')
        .insert([{
          user_id: user.id,
          user_email: user.email,
          user_company_id: userCompanyId,
          rating: rating,
          feedback_text: feedbackText.trim(),
          status: 'pending'
        }]);

      if (error) throw error;

      showNotification('✅ Спасибо за ваш отзыв!', 'success');
      setRating(0);
      setFeedbackText('');
      setIsOpen(false);
    } catch (err) {
      console.error('Ошибка отправки отзыва:', err);
      showNotification('❌ Не удалось отправить отзыв. Попробуйте позже.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Кнопка для открытия формы */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
        aria-label="Оставить отзыв"
        title="Оставить отзыв о приложении"
      >
        <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
      </button>

      {/* Модальное окно */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 fade-enter"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            {/* Заголовок */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('feedback.title') || '📝 Оставить отзыв'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Рейтинг */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Оцените приложение
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="text-3xl transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        (hoverRating || rating) >= star
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300 dark:text-gray-600'
                      } transition-colors`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {rating > 0 && (
                  ['Ужасно', 'Плохо', 'Нормально', 'Хорошо', 'Отлично'][rating - 1]
                )}
              </p>
            </div>

            {/* Текст отзыва */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ваш отзыв
              </label>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Расскажите, что вам нравится или что можно улучшить..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none min-h-[120px]"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">
                {feedbackText.length}/500
              </p>
            </div>

            {/* Кнопка отправки */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0 || !feedbackText.trim()}
              className="w-full py-3 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Отправить отзыв
                </>
              )}
            </button>

            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
              Ваш отзыв поможет нам стать лучше ❤️
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;