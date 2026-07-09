// src/components/SupportModal.jsx
import React, { useState } from 'react';
import { 
  X, MessageCircle, Mail, Phone, HelpCircle, 
  Send, Star, Users, Building, User, 
  ChevronRight, Clock, CheckCircle, Zap,
  Lightbulb, DollarSign, TrendingUp, Bug,
  ArrowLeft
} from 'lucide-react';
import TesterFeedbackForm from './Feedback/TesterFeedbackForm';

const SupportModal = ({ 
  isOpen, 
  onClose, 
  user, 
  userCompany, 
  userRole,
  showNotification,
  t
}) => {
  const [activeTab, setActiveTab] = useState('support'); // support, feedback
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  if (!isOpen) return null;

  const handleFeedbackSuccess = () => {
    setShowFeedbackForm(false);
    setActiveTab('support');
    if (showNotification) {
      showNotification('✅ Спасибо за ваш отзыв!', 'success');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#4A6572]/5 to-transparent">
          <div className="flex items-center gap-3">
            {activeTab === 'feedback' && !showFeedbackForm ? (
              <button
                onClick={() => setActiveTab('support')}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
            ) : showFeedbackForm ? (
              <button
                onClick={() => setShowFeedbackForm(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
            ) : null}
            <div className="p-2 bg-[#4A6572]/10 rounded-lg">
              {showFeedbackForm ? (
                <MessageCircle className="w-5 h-5 text-[#4A6572]" />
              ) : (
                <HelpCircle className="w-5 h-5 text-[#4A6572]" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {showFeedbackForm ? 'Расширенный отзыв' : 'Служба поддержки'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {showFeedbackForm 
                  ? 'Помогите нам стать лучше' 
                  : 'Мы всегда готовы помочь вам!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        {!showFeedbackForm && (
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
            <button
              onClick={() => setActiveTab('support')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'support'
                  ? 'border-[#4A6572] text-[#4A6572] dark:text-[#F9AA33]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              💬 Поддержка
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'feedback'
                  ? 'border-[#4A6572] text-[#4A6572] dark:text-[#F9AA33]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Star className="w-4 h-4" />
              Оставить отзыв
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showFeedbackForm ? (
            // Форма отзыва
            <TesterFeedbackForm
              user={user}
              userCompanyId={user?.user_metadata?.company_id}
              onClose={() => setShowFeedbackForm(false)}
              onSuccess={handleFeedbackSuccess}
              showNotification={showNotification}
              t={t}
            />
          ) : activeTab === 'feedback' ? (
            // Вкладка "Оставить отзыв" - краткая форма
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-[#4A6572]/5 to-[#344955]/5 p-6 rounded-xl text-center">
                <div className="w-16 h-16 bg-[#4A6572]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-[#4A6572]" />
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">Помогите нам стать лучше!</h4>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Ваше мнение очень важно для нас. Расскажите о своём опыте использования Реглай PRO.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowFeedbackForm(true)}
                  className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                      <Zap className="w-4 h-4 text-yellow-600" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Расширенный отзыв</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    7 вопросов • 3-5 минут
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-400 mt-2 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    // Быстрый NPS опрос
                    if (showNotification) {
                      showNotification('📊 Функция NPS опроса будет доступна в следующем обновлении', 'info');
                    }
                  }}
                  className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">Быстрый опрос (NPS)</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    1 вопрос • 1 минута
                  </p>
                  <ChevronRight className="w-4 h-4 text-gray-400 mt-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Все отзывы анонимны и используются только для улучшения продукта. Спасибо, что помогаете нам становиться лучше!</span>
                </p>
              </div>
            </div>
          ) : (
            // Основной контент поддержки
            <>
              {/* Данные пользователя */}
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Имя:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {user?.user_metadata?.full_name || 'Не указано'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Email:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {user?.email || 'Не указан'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Роль:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {userRole || 'Не указана'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Компания:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {userCompany || 'Не указана'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Способы связи */}
              <div className="space-y-4 mb-6">
                <h4 className="font-semibold text-gray-900 dark:text-white">Способы связи</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl text-center hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                      <MessageCircle className="w-6 h-6 text-teal-600" />
                    </div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Telegram чат</h5>
                    <p className="text-xs text-gray-500">Ответ в 5 минут</p>
                    <button className="mt-2 px-4 py-1.5 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600 transition-colors">
                      Написать
                    </button>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl text-center hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Электронная почта</h5>
                    <p className="text-xs text-gray-500">Ответ в 1 час</p>
                    <button className="mt-2 px-4 py-1.5 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
                      Написать
                    </button>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl text-center hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Phone className="w-6 h-6 text-green-600" />
                    </div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Телефон</h5>
                    <p className="text-xs text-gray-500">Пн-Пт: 9:00 - 21:00</p>
                    <button className="mt-2 px-4 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors">
                      Позвонить
                    </button>
                  </div>
                </div>
              </div>

              {/* Часто задаваемые вопросы */}
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Часто задаваемые вопросы</h4>
                <div className="space-y-2">
                  {[
                    'Как создать заявку на материалы?',
                    'Как отследить статус заявки?',
                    'Как пригласить сотрудника?'
                  ].map((question, index) => (
                    <button
                      key={index}
                      className="w-full flex items-center justify-between p-2 hover:bg-white dark:hover:bg-gray-600 rounded-lg transition-colors text-left"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">{question}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
                <span>Нажмите [ESC] или кликните вне окна, чтобы закрыть</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportModal;