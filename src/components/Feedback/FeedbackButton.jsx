import React, { useState } from 'react';
import { 
  MessageCircle, X, Star, Send, 
  ThumbsUp, ThumbsDown, AlertCircle, 
  Lightbulb, Users, DollarSign, 
  ChevronDown, ChevronUp, Heart,
  Mail, CheckCircle
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const FeedbackButton = ({ user, userCompanyId, showNotification, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [likes, setLikes] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [mostUsedFeatures, setMostUsedFeatures] = useState([]);
  const [bugs, setBugs] = useState('');
  const [wishes, setWishes] = useState('');
  const [competitors, setCompetitors] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpEmail, setFollowUpEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const featureOptions = [
    'Создание заявок',
    'Управление складом',
    'Аналитика',
    'Чат с командой',
    'Календарь',
    'Документы',
    'Клиенты',
    'Проекты',
    'Сметы',
    'Отчеты'
  ];

  const priceOptions = ['500 ₽', '990 ₽', '1490 ₽', '1990 ₽', 'Другое'];

  const toggleFeature = (feature) => {
    setMostUsedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      showNotification(t('feedback.loginRequired'), 'error');
      return;
    }

    if (rating === 0) {
      showNotification(t('feedback.ratingRequired'), 'warning');
      return;
    }

    if (!feedbackText.trim()) {
      showNotification(t('feedback.textRequired'), 'warning');
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
          likes: likes.trim(),
          pain_points: painPoints.trim(),
          most_used_features: mostUsedFeatures,
          bugs: bugs.trim(),
          wishes: wishes.trim(),
          competitors: competitors.trim(),
          price_range: priceRange,
          status: 'pending'
        }]);

      if (error) throw error;

      showNotification(t('feedback.thankYou'), 'success');
      resetForm();
      setIsOpen(false);
    } catch (err) {
      console.error('Ошибка отправки отзыва:', err);
      showNotification(t('feedback.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setFeedbackText('');
    setLikes('');
    setPainPoints('');
    setMostUsedFeatures([]);
    setBugs('');
    setWishes('');
    setCompetitors('');
    setPriceRange('');
    setShowFollowUp(false);
    setFollowUpEmail('');
    setStep(1);
  };

  // ШАГ 1: Оценка и отзыв
  const renderStep1 = () => (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t?.('feedback.rating') || 'Оцените приложение'}
        </label>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="text-3xl transition-transform hover:scale-125 focus:outline-none"
            >
              <Star
                className={`w-10 h-10 ${
                  (hoverRating || rating) >= star
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                } transition-colors`}
              />
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1">
          {rating > 0 && t('feedback.ratingLabels')[rating - 1]}
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t?.('feedback.yourFeedback') || 'Ваш отзыв'}
        </label>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder={t?.('feedback.placeholder') || 'Расскажите, что вам нравится или что можно улучшить...'}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none min-h-[100px]"
          maxLength={1000}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">
          {feedbackText.length}/1000
        </p>
      </div>

      <button
        onClick={() => setStep(2)}
        disabled={rating === 0 || !feedbackText.trim()}
        className="w-full py-3 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        Далее <ChevronDown className="w-4 h-4" />
      </button>
    </>
  );

  // ШАГ 2: Детали
  const renderStep2 = () => (
    <>
      <button
        onClick={() => setStep(1)}
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 flex items-center gap-1"
      >
        ← Назад
      </button>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <ThumbsUp className="w-4 h-4 inline mr-1 text-green-500" />
          Что понравилось больше всего?
        </label>
        <textarea
          value={likes}
          onChange={(e) => setLikes(e.target.value)}
          placeholder="Например: удобный интерфейс, быстрая работа..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none min-h-[60px]"
          maxLength={500}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <ThumbsDown className="w-4 h-4 inline mr-1 text-red-500" />
          С какими проблемами столкнулись?
        </label>
        <textarea
          value={painPoints}
          onChange={(e) => setPainPoints(e.target.value)}
          placeholder="Что было сложно или неудобно?"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none min-h-[60px]"
          maxLength={500}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <CheckCircle className="w-4 h-4 inline mr-1 text-blue-500" />
          Какие функции используете чаще всего?
        </label>
        <div className="flex flex-wrap gap-2">
          {featureOptions.map(feature => (
            <button
              key={feature}
              onClick={() => toggleFeature(feature)}
              className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                mostUsedFeatures.includes(feature)
                  ? 'bg-[#4A6572] text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {feature}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <AlertCircle className="w-4 h-4 inline mr-1 text-orange-500" />
          Встречали ли баги или ошибки?
        </label>
        <textarea
          value={bugs}
          onChange={(e) => setBugs(e.target.value)}
          placeholder="Опишите, что пошло не так..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none min-h-[60px]"
          maxLength={500}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Lightbulb className="w-4 h-4 inline mr-1 text-yellow-500" />
          Что добавить/улучшить в первую очередь?
        </label>
        <textarea
          value={wishes}
          onChange={(e) => setWishes(e.target.value)}
          placeholder="Ваши идеи по улучшению..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none min-h-[60px]"
          maxLength={500}
        />
      </div>

      <button
        onClick={() => setStep(3)}
        className="w-full py-3 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        Дополнительные вопросы <ChevronDown className="w-4 h-4" />
      </button>
    </>
  );

  // ШАГ 3: Финальные вопросы
  const renderStep3 = () => (
    <>
      <button
        onClick={() => setStep(2)}
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4 flex items-center gap-1"
      >
        ← Назад
      </button>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Users className="w-4 h-4 inline mr-1 text-purple-500" />
          Что заставит вас перейти с конкурентов на Реглай PRO?
        </label>
        <textarea
          value={competitors}
          onChange={(e) => setCompetitors(e.target.value)}
          placeholder="Какие преимущества для вас важны?"
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none min-h-[60px]"
          maxLength={500}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <DollarSign className="w-4 h-4 inline mr-1 text-green-600" />
          Сколько вы готовы платить в месяц?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {priceOptions.map(price => (
            <button
              key={price}
              onClick={() => setPriceRange(price)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                priceRange === price
                  ? 'bg-[#4A6572] text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {price}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setShowFollowUp(!showFollowUp)}
            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <Mail className="w-4 h-4" />
            Хочу получать follow-up письма с вопросами
            {showFollowUp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        {showFollowUp && (
          <input
            type="email"
            value={followUpEmail}
            onChange={(e) => setFollowUpEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Мы отправим вам дополнительные вопросы для улучшения продукта
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
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
    </>
  );

  return (
    <>
      {/* Кнопка открытия */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-4 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 group"
        aria-label="Оставить отзыв"
title="Оставить отзыв"
      >
        <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
      </button>

      {/* Модальное окно */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 fade-enter"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
              resetForm();
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Заголовок */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  {step === 1 ? 'Ваше мнение' : step === 2 ? 'Детали' : 'Финальные вопросы'}
                </h3>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Прогресс */}
              <div className="flex gap-1 mb-4">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      s <= step ? 'bg-[#4A6572]' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>

              {/* Шаги */}
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;