// src/components/SupportModal.jsx
import React from 'react';
import { X, MessageCircle, Mail, Phone, HelpCircle, ExternalLink, Clock, CheckCircle, Users, BookOpen } from 'lucide-react';

const SupportModal = ({ isOpen, onClose, user, userCompany, userRole }) => {
  if (!isOpen) return null;

  const supportOptions = [
    {
      id: 'telegram',
      icon: MessageCircle,
      label: 'Telegram чат',
      description: 'Ответ в течение 5 минут',
      action: 'https://t.me/reglay_support',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      hoverBg: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      id: 'email',
      icon: Mail,
      label: 'Электронная почта',
      description: 'Ответ в течение 1 часа',
      action: 'mailto:support@reglay.pro?subject=Вопрос по Реглай PRO',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900/30',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      id: 'phone',
      icon: Phone,
      label: 'Телефон',
      description: 'Пн-Пт: 9:00 - 21:00 (МСК)',
      action: 'tel:+78005553535',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900/30',
      iconBg: 'bg-green-100 dark:bg-green-900/30'
    }
  ];

  const faqItems = [
    { question: 'Как создать заявку на материалы?', answer: 'Перейдите в раздел "Создать заявку", заполните форму и нажмите "Отправить".' },
    { question: 'Как отследить статус заявки?', answer: 'В разделе "В работе" вы можете видеть статус всех ваших заявок.' },
    { question: 'Как пригласить сотрудника?', answer: 'В разделе "Сотрудники" нажмите "Пригласить" и укажите email нового сотрудника.' },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200/50 dark:border-gray-700/50">
        {/* Заголовок */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-[#4A6572] to-[#344955] rounded-xl">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="support-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
                Служба поддержки
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Мы всегда готовы помочь вам!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Информация о пользователе */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Ваши данные для поддержки:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Email:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white break-all">
                  {user?.email || '—'}
                </span>
              </div>
              {userCompany && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Компания:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {userCompany}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500 dark:text-gray-400">Роль:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {userRole}
                </span>
              </div>
              {user?.user_metadata?.full_name && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Имя:</span>
                  <span className="ml-2 font-medium text-gray-900 dark:text-white">
                    {user.user_metadata.full_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Способы связи */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span>📞</span> Способы связи
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {supportOptions.map((option) => (
                <a
                  key={option.id}
                  href={option.action}
                  target={option.id === 'telegram' ? '_blank' : undefined}
                  rel={option.id === 'telegram' ? 'noopener noreferrer' : undefined}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${option.bgColor} ${option.hoverBg} border border-transparent hover:border-[#4A6572]/20 group`}
                >
                  <div className={`p-3 rounded-xl ${option.iconBg}`}>
                    <option.icon className="w-6 h-6 text-[#4A6572] dark:text-[#F9AA33]" />
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {option.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    {option.description}
                  </span>
                  <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-[#4A6572] transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Часто задаваемые вопросы */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Часто задаваемые вопросы
              </h4>
              <button
                onClick={() => {
                  onClose();
                  window.location.href = '/help';
                }}
                className="text-sm text-[#4A6572] dark:text-[#F9AA33] hover:underline flex items-center gap-1"
              >
                Все FAQ
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {faqItems.map((faq, index) => (
                <details key={index} className="group">
                  <summary className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors list-none">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {faq.question}
                    </span>
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="p-3 pt-2 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200/50 dark:border-gray-700/50">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* Быстрые ссылки */}
          <div className="bg-gradient-to-r from-[#4A6572]/5 to-[#344955]/5 rounded-xl p-4 border border-[#4A6572]/10">
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              💡 <span className="font-medium">Совет:</span> Нажмите <kbd className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+K</kbd> для быстрого поиска по системе
            </p>
          </div>

          {/* Клавиша Esc */}
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Нажмите <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">Esc</kbd> или кликните вне окна, чтобы закрыть
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportModal;