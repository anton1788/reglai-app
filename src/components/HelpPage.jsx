// src/components/HelpPage.jsx
import React, { useState } from 'react';
import {
  ArrowLeft,
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
  BookOpen,
  Video,
  FileText,
  Search,
  ExternalLink,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Users,
  Building,
  Package,
  ClipboardList,
  BarChart3,
  Calendar,
  MessageSquare,
  Settings,
  UserPlus,
  Shield,
  Database,
  Code
} from 'lucide-react';

const HelpPage = ({ onNavigate, t, language = 'ru' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);

  const sections = [
    {
      id: 'getting-started',
      icon: <HelpCircle className="w-5 h-5" />,
      title: t?.('help.sections.gettingStarted') || 'Начало работы',
      items: [
        { title: t?.('help.items.register') || 'Регистрация и вход', path: '/help/register' },
        { title: t?.('help.items.firstSteps') || 'Первые шаги в системе', path: '/help/first-steps' },
        { title: t?.('help.items.profile') || 'Настройка профиля', path: '/help/profile' },
        { title: t?.('help.items.invite') || 'Приглашение сотрудников', path: '/help/invite' }
      ]
    },
    {
      id: 'applications',
      icon: <ClipboardList className="w-5 h-5" />,
      title: t?.('help.sections.applications') || 'Заявки на материалы',
      items: [
        { title: t?.('help.items.createApplication') || 'Создание заявки', path: '/help/create-application' },
        { title: t?.('help.items.statuses') || 'Статусы заявок', path: '/help/application-statuses' },
        { title: t?.('help.items.materials') || 'Работа с материалами', path: '/help/materials' },
        { title: t?.('help.items.history') || 'История заявок', path: '/help/history' }
      ]
    },
    {
      id: 'warehouse',
      icon: <Package className="w-5 h-5" />,
      title: t?.('help.sections.warehouse') || 'Склад',
      items: [
        { title: t?.('help.items.warehouseManage') || 'Управление складом', path: '/help/warehouse' },
        { title: t?.('help.items.receive') || 'Приёмка материалов', path: '/help/receive' },
        { title: t?.('help.items.writeOff') || 'Списание материалов', path: '/help/write-off' },
        { title: t?.('help.items.balance') || 'Остатки и баланс', path: '/help/balance' }
      ]
    },
    {
      id: 'analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      title: t?.('help.sections.analytics') || 'Аналитика и отчёты',
      items: [
        { title: t?.('help.items.dashboard') || 'Дашборд аналитики', path: '/help/analytics' },
        { title: t?.('help.items.reports') || 'Отчёты по заявкам', path: '/help/reports' },
        { title: t?.('help.items.estimates') || 'Сметы и калькуляция', path: '/help/estimates' },
        { title: t?.('help.items.export') || 'Экспорт данных', path: '/help/export' }
      ]
    },
    {
      id: 'roles',
      icon: <Users className="w-5 h-5" />,
      title: t?.('help.sections.roles') || 'Роли и права',
      items: [
        { title: t?.('help.items.rolesList') || 'Роли в системе', path: '/help/roles' },
        { title: t?.('help.items.permissions') || 'Права доступа', path: '/help/permissions' },
        { title: t?.('help.items.employees') || 'Управление сотрудниками', path: '/help/employees' },
        { title: t?.('help.items.blockUser') || 'Блокировка пользователей', path: '/help/block-user' }
      ]
    },
    {
      id: 'communication',
      icon: <MessageSquare className="w-5 h-5" />,
      title: t?.('help.sections.communication') || 'Коммуникация',
      items: [
        { title: t?.('help.items.chat') || 'Чат компании', path: '/help/chat' },
        { title: t?.('help.items.calendar') || 'Календарь событий', path: '/help/calendar' },
        { title: t?.('help.items.comments') || 'Комментарии к заявкам', path: '/help/comments' },
        { title: t?.('help.items.notifications') || 'Уведомления', path: '/help/notifications' }
      ]
    },
    {
      id: 'settings',
      icon: <Settings className="w-5 h-5" />,
      title: t?.('help.sections.settings') || 'Настройки',
      items: [
        { title: t?.('help.items.companySettings') || 'Настройки компании', path: '/help/company-settings' },
        { title: t?.('help.items.api') || 'API интеграция', path: '/help/api' },
        { title: t?.('help.items.integration1c') || 'Интеграция с 1С', path: '/help/1c-integration' },
        { title: t?.('help.items.tariffs') || 'Тарифы и оплата', path: '/help/tariffs' }
      ]
    }
  ];

  const quickLinks = [
    { icon: <Video className="w-4 h-4" />, label: t?.('help.quickLinks.video') || 'Видео-туториалы', color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' },
    { icon: <FileText className="w-4 h-4" />, label: t?.('help.quickLinks.docs') || 'Документация', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
    { icon: <MessageCircle className="w-4 h-4" />, label: t?.('help.quickLinks.chat') || 'Чат поддержки', color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' },
    { icon: <Mail className="w-4 h-4" />, label: t?.('help.quickLinks.email') || 'Email поддержки', color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' }
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  // Обработчик навигации
  const handleNavigate = () => {
    // остаёмся на странице помощи
    if (onNavigate) {
      onNavigate('help');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      {/* Навигация назад */}
      <button
        onClick={() => onNavigate?.('dashboard')}
        className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {language === 'ru' ? 'Назад' : 'Back'}
      </button>

      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-[#4A6572] to-[#344955] rounded-2xl">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          {language === 'ru' ? 'Помощь и документация' : 'Help & Documentation'}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 ml-2">
          {language === 'ru'
            ? 'Всё, что нужно знать для эффективной работы в Реглай PRO'
            : 'Everything you need to know to work effectively in Reglai PRO'
          }
        </p>
      </div>

      {/* Поиск */}
      <div className="relative max-w-2xl mb-8">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={language === 'ru' ? 'Поиск по документации...' : 'Search documentation...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6572] focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        <kbd className="absolute right-4 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 rounded">⌘K</kbd>
      </div>

      {/* Быстрые ссылки */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {quickLinks.map((link, index) => (
          <div
            key={index}
            className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer hover:shadow-md transition-all ${link.color}`}
            onClick={() => {
              if (index === 2) {
                window.open('https://t.me/reglay_support', '_blank');
              } else if (index === 3) {
                window.location.href = 'mailto:support@reglay.pro';
              }
            }}
          >
            {link.icon}
            <span className="text-sm font-medium">{link.label}</span>
          </div>
        ))}
      </div>

      {/* Разделы документации */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSections.map((section) => (
          <div
            key={section.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden hover:shadow-md transition-shadow"
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-[#4A6572] dark:text-[#F9AA33]">
                  {section.icon}
                </div>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {section.title}
                </span>
              </div>
              {expandedSection === section.id ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSection === section.id && (
              <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-3 space-y-1">
                {section.items.map((item) => (
                  <button
                    key={item.path}
                    onClick={handleNavigate}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {item.title}
                    <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Связь с поддержкой */}
      <div className="mt-8 p-6 bg-gradient-to-r from-[#4A6572]/5 to-[#344955]/5 rounded-2xl border border-[#4A6572]/10">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#4A6572] dark:text-[#F9AA33]" />
          {language === 'ru' ? 'Не нашли ответ?' : 'Still have questions?'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {language === 'ru'
            ? 'Наша команда поддержки всегда готова помочь вам лично'
            : 'Our support team is always ready to help you personally'
          }
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.open('https://t.me/reglay_support', '_blank')}
            className="flex items-center gap-2 px-4 py-2 bg-[#4A6572] text-white rounded-xl hover:bg-[#344955] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {language === 'ru' ? 'Написать в Telegram' : 'Write to Telegram'}
          </button>
          <button
            onClick={() => window.location.href = 'mailto:support@reglay.pro'}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <Mail className="w-4 h-4" />
            support@reglay.pro
          </button>
        </div>
      </div>

      {/* Клавиша Esc */}
      <div className="text-center mt-6">
        <p className="text-xs text-gray-400">
          {language === 'ru'
            ? 'Нажмите Esc, чтобы вернуться в приложение'
            : 'Press Esc to return to the app'
          }
        </p>
      </div>
    </div>
  );
};

export default HelpPage;