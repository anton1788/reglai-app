import React, { useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle,
  Send,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Zap,
  TrendingUp,
  DollarSign,
  Users,
  Bug,
  Lightbulb
} from 'lucide-react';

const TesterFeedbackForm = ({ 
  user, 
  userCompanyId, 
  onClose, 
  onSuccess,
  showNotification
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_impression: '',
    pain_points: '',
    most_used_features: '',
    bugs_found: '',
    feature_requests: '',
    competitors: '',
    price_willing_to_pay: null,
    price_option: '',
    ease_of_use: 4,
    would_recommend: 8,
    overall_satisfaction: 4
  });

  const priceOptions = [
    { value: 500, label: '500 ₽/мес' },
    { value: 990, label: '990 ₽/мес' },
    { value: 1490, label: '1 490 ₽/мес' },
    { value: 1990, label: '1 990+ ₽/мес' }
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!user?.id || !userCompanyId) {
        showNotification('Ошибка: пользователь не авторизован', 'error');
        return;
      }

      const { error } = await supabase
        .from('tester_feedback')
        .insert([{
          user_id: user.id,
          company_id: userCompanyId,
          ...formData,
          status: 'completed',
          completed_at: new Date().toISOString(),
          user_agent: navigator.userAgent,
          referrer: document.referrer || window.location.href
        }]);

      if (error) throw error;

      showNotification('✅ Спасибо за ваш отзыв! Он очень важен для нас.', 'success');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('Feedback error:', err);
      showNotification('❌ Ошибка отправки. Попробуйте позже.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ШАГ 1
  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            Что понравилось больше всего?
          </span>
        </label>
        <textarea
          value={formData.first_impression}
          onChange={(e) => setFormData(prev => ({ ...prev, first_impression: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows="2"
          placeholder="Например: удобный интерфейс, быстрая работа, понятная навигация..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <span className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-red-500" />
            С какими проблемами столкнулись?
          </span>
        </label>
        <textarea
          value={formData.pain_points}
          onChange={(e) => setFormData(prev => ({ ...prev, pain_points: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows="2"
          placeholder="Опишите трудности, с которыми столкнулись..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            Какие функции используете чаще всего?
          </span>
        </label>
        <textarea
          value={formData.most_used_features}
          onChange={(e) => setFormData(prev => ({ ...prev, most_used_features: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows="2"
          placeholder="Создание заявок, просмотр статусов, работа со складом..."
        />
      </div>
    </div>
  );

  // ШАГ 2
  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            Встречали ли баги или ошибки?
          </span>
        </label>
        <textarea
          value={formData.bugs_found}
          onChange={(e) => setFormData(prev => ({ ...prev, bugs_found: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows="2"
          placeholder="Опишите любые ошибки или неполадки..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <span className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Что добавить/улучшить в первую очередь?
          </span>
        </label>
        <textarea
          value={formData.feature_requests}
          onChange={(e) => setFormData(prev => ({ ...prev, feature_requests: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows="2"
          placeholder="Какие функции вы хотели бы видеть в первую очередь..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            Что заставит вас перейти с конкурентов на Реглай PRO?
          </span>
        </label>
        <textarea
          value={formData.competitors}
          onChange={(e) => setFormData(prev => ({ ...prev, competitors: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows="2"
          placeholder="Например: более низкая цена, удобный интерфейс, интеграции..."
        />
      </div>
    </div>
  );

  // ШАГ 3
  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <span className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            Сколько вы готовы платить в месяц?
          </span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {priceOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                price_option: option.label,
                price_willing_to_pay: option.value 
              }))}
              className={`px-4 py-3 rounded-lg border-2 text-center transition-all ${
                formData.price_option === option.label
                  ? 'border-[#4A6572] bg-[#4A6572]/10 dark:bg-[#4A6572]/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              <div className="font-bold text-gray-900 dark:text-white">
                {option.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Оцените по шкале 1-5:
        </h4>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Простота использования</span>
              <span>{formData.ease_of_use}/5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={formData.ease_of_use}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                ease_of_use: parseInt(e.target.value) 
              }))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Общая удовлетворённость</span>
              <span>{formData.overall_satisfaction}/5</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={formData.overall_satisfaction}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                overall_satisfaction: parseInt(e.target.value) 
              }))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Готовность рекомендовать (NPS)</span>
              <span>{formData.would_recommend}/10</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={formData.would_recommend}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                would_recommend: parseInt(e.target.value) 
              }))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-[#4A6572]" />
              Расширенный отзыв
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Шаг {step} из 3 • Помогите нам стать лучше
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
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-[#4A6572]' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl">
        <div className="flex justify-between">
          <button
            onClick={() => setStep(prev => Math.max(1, prev - 1))}
            className={`px-4 py-2 text-sm font-medium ${
              step === 1 ? 'invisible' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Назад
          </button>
          
          {step < 3 ? (
            <button
              onClick={() => setStep(prev => Math.min(3, prev + 1))}
              className="px-6 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors font-medium"
            >
              Далее →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Отправить отзыв
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TesterFeedbackForm;