// src/components/UniversalDashboard.jsx
import React, { useState, useMemo } from 'react';
import { 
  Users, Briefcase, Clock, CheckCircle, AlertCircle, 
  TrendingUp, Building, UserPlus, Package, BarChart3, 
  ChevronRight, ShoppingCart, Merge, WifiOff, Crown,
  ClipboardList, MessageCircle, Home, Calendar, FileText,
  Plus, Send, X, Sparkles
} from 'lucide-react';
import { usePriceVisibility } from '../hooks/usePriceVisibility';
import { sanitizeApplicationsForMaster } from '../utils/materialSanitizer';

// ─────────────────────────────────────────────────────────────
// 🧩 MASTER DASHBOARD (Упрощённая версия без цен)
// ─────────────────────────────────────────────────────────────
const MasterDashboard = ({ 
  applications, 
  user, 
  userCompany,
  setCurrentView,
  isOnline,
  currentPlan,
}) => {
  // 📊 РАСЧЕТ МЕТРИК (без финансов)
  const metrics = useMemo(() => {
    const totalApps = applications?.length || 0;
    const activeApps = applications?.filter(a => 
      ['pending', 'admin_processing', 'partial_received'].includes(a.status)
    ).length || 0;
    const completedApps = applications?.filter(a => 
      ['received', 'confirmed'].includes(a.status)
    ).length || 0;
    const overdueApps = applications?.filter(a => 
      a.status === 'pending' && 
      (new Date() - new Date(a.created_at)) > 2 * 24 * 60 * 60 * 1000
    ).length || 0;
    
    const objects = new Set(applications?.map(a => a.object_name) || []);
    const myApps = applications?.filter(a => a.user_id === user?.id) || [];
    
    return {
      totalApps,
      activeApps,
      completedApps,
      overdueApps,
      objectsCount: objects.size,
      myAppsCount: myApps.length,
      myActiveApps: myApps.filter(a => ['pending', 'admin_processing'].includes(a.status)).length,
      myCompletedApps: myApps.filter(a => ['received', 'confirmed'].includes(a.status)).length,
    };
  }, [applications, user]);

  // 📊 ВИДЖЕТЫ ДЛЯ МАСТЕРА
  const widgets = [
    {
      icon: <Briefcase className="w-5 h-5 text-blue-500" />,
      label: 'Мои заявки',
      value: metrics.myAppsCount,
      color: 'border-blue-500',
      onClick: () => setCurrentView('inwork'),
      subtitle: `${metrics.myActiveApps} в работе`
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      label: 'Выполнено',
      value: metrics.myCompletedApps,
      color: 'border-green-500',
      onClick: () => setCurrentView('history'),
      subtitle: 'Завершённые заявки'
    },
    {
      icon: <Building className="w-5 h-5 text-orange-500" />,
      label: 'Объекты',
      value: metrics.objectsCount,
      color: 'border-orange-500',
      onClick: () => setCurrentView('analytics'),
      subtitle: 'Всего объектов'
    },
    {
      icon: <Clock className="w-5 h-5 text-yellow-500" />,
      label: 'В работе',
      value: metrics.myActiveApps,
      color: 'border-yellow-500',
      onClick: () => setCurrentView('inwork'),
      subtitle: 'Активные заявки'
    }
  ];

  // Быстрые действия для мастера
  const quickActions = [
    { icon: '📝', label: 'Создать заявку', onClick: () => setCurrentView('create'), color: 'bg-blue-600' },
    { icon: '📋', label: 'Мои заявки', onClick: () => setCurrentView('inwork'), color: 'bg-indigo-600' },
    { icon: '💬', label: 'Чат', onClick: () => setCurrentView('chat'), color: 'bg-purple-600' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    let time = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
    return `${time}, 👷 Мастер!`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 page-enter">
      {/* Верхний баннер */}
      <div className="bg-gradient-to-r from-[#4A6572] to-[#344955] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">👷</span>
              <div>
                <h1 className="text-2xl font-bold">{getGreeting()}</h1>
                <p className="text-white/70 text-sm">
                  {userCompany || 'Компания'} • {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm mt-2">
              <span className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">📋 {metrics.totalApps} заявок</span>
              <span className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">🏗️ {metrics.objectsCount} объектов</span>
              {!isOnline && (
                <span className="bg-yellow-500/30 px-3 py-1 rounded-full flex items-center gap-1">
                  <WifiOff className="w-3 h-3" /> Офлайн
                </span>
              )}
              {currentPlan && (
                <span className="bg-green-500/30 px-3 py-1 rounded-full flex items-center gap-1 text-xs">
                  <Crown className="w-3 h-3" /> {currentPlan.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ВИДЖЕТЫ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {widgets.map((widget, index) => (
          <div
            key={index}
            className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all cursor-pointer border-l-4 ${widget.color} hover:scale-[1.02]`}
            onClick={widget.onClick}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{widget.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{widget.value}</p>
                {widget.subtitle && <p className="text-xs text-gray-400 mt-1">{widget.subtitle}</p>}
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {widget.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-500" /> Быстрые действия
        </h3>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`flex items-center gap-2 px-4 py-2 ${action.color} text-white rounded-xl hover:shadow-lg transition-all hover:scale-105 text-sm`}
            >
              <span className="text-lg">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* ПОСЛЕДНИЕ ЗАЯВКИ (без цен) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-lg">📋</span> Мои заявки
          </h3>
          <button onClick={() => setCurrentView('inwork')} className="text-xs text-[#4A6572] dark:text-[#F9AA33] hover:underline flex items-center gap-1">
            Все заявки <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        
        {applications?.filter(a => a.user_id === user?.id).slice(0, 5).map((app) => (
          <div
            key={app.id}
            className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 px-2 rounded-lg transition-colors"
            onClick={() => setCurrentView('inwork')}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                {app.object_name}
                {app.status === 'pending' && (new Date() - new Date(app.created_at)) > 2 * 24 * 60 * 60 * 1000 && (
                  <span className="ml-2 text-red-500 text-xs animate-pulse">⚠️</span>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span>📦 {app.materials?.length || 0} материалов</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  app.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  app.status === 'received' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {app.status === 'pending' ? '⏳ В работе' :
                   app.status === 'received' ? '✅ Получено' :
                   app.status === 'partial_received' ? '🟡 Частично' :
                   `📌 ${app.status}`}
                </span>
              </p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
              {new Date(app.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
        
        {(!applications || applications.filter(a => a.user_id === user?.id).length === 0) && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">У вас нет заявок</p>
            <button onClick={() => setCurrentView('create')} className="mt-2 text-xs text-[#4A6572] dark:text-[#F9AA33] hover:underline">
              Создать первую заявку →
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4">
        <p>💡 Нажмите на виджет для перехода в раздел</p>
        <p className="mt-1 text-green-500">🔒 Цены и финансовая информация скрыты для вашей роли</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🧩 FULL DASHBOARD (Полная версия с ценами)
// ─────────────────────────────────────────────────────────────
const FullDashboard = ({ 
  applications, 
  companyUsers, 
  pendingApprovals, 
  user, 
  userRole,
  userCompany,
  setCurrentView,
  isOnline,
  currentPlan,
  mergeableCount,
  cartItemsCount,
  isCompanyOwner,
}) => {
  // AI Assistant State
  const [aiMessage, setAiMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);

  // 📊 РАСЧЕТ МЕТРИК
  const metrics = useMemo(() => {
    const totalApps = applications?.length || 0;
    const activeApps = applications?.filter(a => 
      ['pending', 'admin_processing', 'partial_received'].includes(a.status)
    ).length || 0;
    const completedApps = applications?.filter(a => 
      ['received', 'confirmed'].includes(a.status)
    ).length || 0;
    const overdueApps = applications?.filter(a => 
      a.status === 'pending' && 
      (new Date() - new Date(a.created_at)) > 2 * 24 * 60 * 60 * 1000
    ).length || 0;
    
    const totalUsers = companyUsers?.length || 0;
    const activeUsers = companyUsers?.filter(u => u.is_active !== false).length || 0;
    
    const totalExpenses = applications?.reduce((sum, app) => {
      return sum + (app.materials?.reduce((s, m) => 
        s + (Number(m.quantity) || 0) * (Number(m.price) || 1000), 0
      ) || 0);
    }, 0) || 0;
    
    const objects = new Set(applications?.map(a => a.object_name) || []);
    const myApps = applications?.filter(a => a.user_id === user?.id) || [];
    
    return {
      totalApps,
      activeApps,
      completedApps,
      overdueApps,
      totalUsers,
      activeUsers,
      totalExpenses,
      objectsCount: objects.size,
      pendingApprovals: pendingApprovals?.length || 0,
      myAppsCount: myApps.length,
      myActiveApps: myApps.filter(a => ['pending', 'admin_processing'].includes(a.status)).length,
      inactiveUsers: companyUsers?.filter(u => u.is_active === false).length || 0
    };
  }, [applications, companyUsers, pendingApprovals, user]);

  // 🧠 AI ОТВЕТЫ ПО РОЛЯМ
  const handleAIAssistant = (message) => {
    if (!message.trim()) return;
    setIsAILoading(true);
    
    setTimeout(() => {
      let response = '';
      const lowerMsg = message.toLowerCase();

      if (userRole === 'supply_admin') {
        const pending = applications?.filter(a => ['pending', 'admin_processing'].includes(a.status)) || [];
        if (lowerMsg.includes('заявк')) {
          response = `📦 Заявки на обработку: ${pending.length}\n${pending.slice(0, 5).map(a => `• ${a.object_name}`).join('\n')}`;
        } else if (lowerMsg.includes('склад')) {
          response = `🏚️ Перейдите в раздел "Склад" для управления остатками`;
        } else {
          response = `📦 Привет, снабженец! Я могу помочь с:\n• "заявки" — список на обработку\n• "склад" — информация о складе`;
        }
      }
      else if (userRole === 'accountant') {
        if (lowerMsg.includes('расход') || lowerMsg.includes('финанс')) {
          response = `💰 Расходы: ${metrics.totalExpenses.toLocaleString()} ₽\n• Средние на объект: ${(metrics.totalExpenses / (metrics.objectsCount || 1)).toLocaleString()} ₽`;
        } else {
          response = `💰 Привет, бухгалтер! Все финансовые данные в разделе "Аналитика"`;
        }
      }
      else if (userRole === 'manager' || userRole === 'director' || isCompanyOwner) {
        if (lowerMsg.includes('просрочен')) {
          const overdue = applications?.filter(a => 
            a.status === 'pending' && (new Date() - new Date(a.created_at)) > 2 * 24 * 60 * 60 * 1000
          ) || [];
          response = overdue.length > 0 
            ? `🔴 Просрочено: ${overdue.length}\n${overdue.map(a => `• ${a.object_name}`).join('\n')}`
            : '✅ Просроченных заявок нет';
        } else if (lowerMsg.includes('сотрудник')) {
          response = `👥 Команда: ${metrics.totalUsers}\n🟢 Активных: ${metrics.activeUsers}\n🔴 Неактивных: ${metrics.inactiveUsers}`;
        } else {
          response = `👔 Привет, руководитель! Я могу помочь с:\n• "просроченные" — просроченные заявки\n• "сотрудники" — статистика по команде`;
        }
      }
      else if (userRole === 'client') {
        if (lowerMsg.includes('объект')) {
          const myObjects = [...new Set(applications?.filter(a => a.client_id === user?.id).map(a => a.object_name) || [])];
          response = `🏗️ Ваши объекты:\n${myObjects.length > 0 ? myObjects.map(o => `• ${o}`).join('\n') : 'Нет объектов'}`;
        } else {
          response = `🏠 Привет, заказчик! Все данные доступны в вашем личном кабинете`;
        }
      }
      else {
        response = `🤖 Я AI-ассистент. Спросите о заявках, сотрудниках, расходах или объектах.`;
      }

      setAiResponse(response);
      setIsAILoading(false);
    }, 500);
  };

  // 📊 ВИДЖЕТЫ ПО РОЛЯМ
  const getWidgets = () => {
    const widgets = [];

    widgets.push({
      icon: <Briefcase className="w-5 h-5 text-blue-500" />,
      label: 'Активные заявки',
      value: metrics.activeApps,
      color: 'border-blue-500',
      onClick: () => setCurrentView('inwork'),
      subtitle: `${metrics.totalApps} всего`
    });

    if (userRole === 'supply_admin') {
      const pending = applications?.filter(a => ['pending', 'admin_processing'].includes(a.status)).length || 0;
      widgets.push({
        icon: <Package className="w-5 h-5 text-orange-500" />,
        label: 'На обработке',
        value: pending,
        color: 'border-orange-500',
        onClick: () => setCurrentView('received'),
        subtitle: 'Ожидают обработки'
      });
    }

    if (userRole === 'manager' || userRole === 'director' || isCompanyOwner) {
      widgets.push({
        icon: <Clock className="w-5 h-5 text-yellow-500" />,
        label: 'На согласовании',
        value: metrics.pendingApprovals,
        color: 'border-yellow-500',
        onClick: () => setCurrentView('approvals'),
        subtitle: 'Ожидают решения',
        badge: metrics.pendingApprovals > 0 ? `${metrics.pendingApprovals} новых` : null
      });
    }

    if (userRole === 'accountant' || userRole === 'manager' || userRole === 'director' || isCompanyOwner) {
      widgets.push({
        icon: <TrendingUp className="w-5 h-5 text-green-500" />,
        label: 'Расходы',
        value: `${(metrics.totalExpenses / 1000).toFixed(1)}K ₽`,
        color: 'border-green-500',
        onClick: () => setCurrentView('analytics'),
        subtitle: `${metrics.objectsCount} объектов`
      });
    }

    if (userRole === 'manager' || userRole === 'director' || isCompanyOwner) {
      widgets.push({
        icon: <Users className="w-5 h-5 text-purple-500" />,
        label: 'Команда',
        value: metrics.activeUsers,
        color: 'border-purple-500',
        onClick: () => setCurrentView('employees'),
        subtitle: `${metrics.totalUsers} сотрудников`,
        badge: metrics.inactiveUsers > 0 ? `${metrics.inactiveUsers} неактивны` : null
      });
    }

    widgets.push({
      icon: <Building className="w-5 h-5 text-orange-500" />,
      label: 'Объекты',
      value: metrics.objectsCount,
      color: 'border-orange-500',
      onClick: () => setCurrentView('analytics'),
      subtitle: 'Всего объектов'
    });

    if (cartItemsCount > 0) {
      widgets.push({
        icon: <ShoppingCart className="w-5 h-5 text-pink-500" />,
        label: 'Корзина',
        value: cartItemsCount,
        color: 'border-pink-500',
        onClick: () => setCurrentView('cart'),
        subtitle: 'Материалов',
        badge: `${cartItemsCount} позиций`
      });
    }

    if (mergeableCount > 0 && (userRole === 'manager' || userRole === 'supply_admin' || userRole === 'director' || isCompanyOwner)) {
      widgets.push({
        icon: <Merge className="w-5 h-5 text-indigo-500" />,
        label: 'Объединение',
        value: mergeableCount,
        color: 'border-indigo-500',
        onClick: () => setCurrentView('merge'),
        subtitle: 'Групп для объединения',
        badge: `${mergeableCount} групп`
      });
    }

    return widgets;
  };

  const widgets = getWidgets();

  const getQuickActions = () => {
    const actions = [];

    if (['master', 'foreman', 'supply_admin', 'client_manager'].includes(userRole)) {
      actions.push({ icon: '📝', label: 'Создать заявку', onClick: () => setCurrentView('create'), color: 'bg-blue-600' });
    }
    if (userRole === 'manager' || userRole === 'director' || isCompanyOwner) {
      actions.push({ icon: '👥', label: 'Команда', onClick: () => setCurrentView('employees'), color: 'bg-green-600' });
    }
    if (userRole === 'supply_admin' || userRole === 'manager' || userRole === 'director' || isCompanyOwner) {
      actions.push({ icon: '🏚️', label: 'Склад', onClick: () => setCurrentView('warehouse'), color: 'bg-orange-600' });
    }
    if (['manager', 'director', 'accountant', 'supply_admin'].includes(userRole) || isCompanyOwner) {
      actions.push({ icon: '📊', label: 'Аналитика', onClick: () => setCurrentView('analytics'), color: 'bg-purple-600' });
    }
    actions.push({ icon: '💬', label: 'Чат', onClick: () => setCurrentView('chat'), color: 'bg-indigo-600' });

    return actions;
  };

  const quickActions = getQuickActions();

  const getGreeting = () => {
    const hour = new Date().getHours();
    let time = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
    const roles = {
      manager: '👔 Руководитель',
      director: '👔 Директор',
      supply_admin: '📦 Снабженец',
      accountant: '💰 Бухгалтер',
      client: '🏠 Заказчик',
      client_manager: '🤝 Менеджер'
    };
    return `${time}, ${roles[userRole] || 'Сотрудник'}!`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 page-enter">
      {/* Верхний баннер */}
      <div className="bg-gradient-to-r from-[#4A6572] to-[#344955] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">🏢</span>
              <div>
                <h1 className="text-2xl font-bold">{getGreeting()}</h1>
                <p className="text-white/70 text-sm">
                  {userCompany || 'Компания'} • {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm mt-2">
              <span className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">📋 {metrics.totalApps} заявок</span>
              <span className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">👥 {metrics.totalUsers} сотрудников</span>
              <span className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">🏗️ {metrics.objectsCount} объектов</span>
              {!isOnline && (
                <span className="bg-yellow-500/30 px-3 py-1 rounded-full flex items-center gap-1">
                  <WifiOff className="w-3 h-3" /> Офлайн
                </span>
              )}
              {currentPlan && (
                <span className="bg-green-500/30 px-3 py-1 rounded-full flex items-center gap-1 text-xs">
                  <Crown className="w-3 h-3" /> {currentPlan.name}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={() => setShowAIAssistant(!showAIAssistant)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl backdrop-blur-sm transition-all flex items-center gap-2 text-sm font-medium"
          >
            <span className="text-lg">🧠</span>
            {showAIAssistant ? 'Скрыть AI' : 'AI-ассистент'}
            <span className="text-xs bg-green-400/30 px-2 py-0.5 rounded-full">Beta</span>
          </button>
        </div>
      </div>

      {/* AI АССИСТЕНТ */}
      {showAIAssistant && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden fade-enter">
          <div className="p-4 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧠</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">AI-ассистент</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Анализирует данные в реальном времени</p>
              </div>
              <span className="ml-auto text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Онлайн
              </span>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {userRole === 'supply_admin' ? (
                <>
                  <button onClick={() => handleAIAssistant('заявки')} className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg text-xs">📦 Заявки</button>
                  <button onClick={() => handleAIAssistant('склад')} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-xs">🏚️ Склад</button>
                </>
              ) : userRole === 'manager' || userRole === 'director' || isCompanyOwner ? (
                <>
                  <button onClick={() => handleAIAssistant('просроченные')} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-xs">⚠️ Просроченные</button>
                  <button onClick={() => handleAIAssistant('сотрудники')} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs">👥 Команда</button>
                </>
              ) : userRole === 'client' ? (
                <button onClick={() => handleAIAssistant('объекты')} className="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg text-xs">🏗️ Мои объекты</button>
              ) : userRole === 'accountant' ? (
                <button onClick={() => handleAIAssistant('расходы')} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-xs">💰 Расходы</button>
              ) : null}
              <button onClick={() => handleAIAssistant('помощь')} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs">❓ Помощь</button>
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { handleAIAssistant(aiMessage); setAiMessage(''); } }}
                placeholder="Напишите запрос..."
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#4A6572] bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
              <button
                onClick={() => { handleAIAssistant(aiMessage); setAiMessage(''); }}
                disabled={isAILoading}
                className="px-4 py-2 bg-[#4A6572] text-white rounded-xl hover:bg-[#344955] transition-colors disabled:opacity-50"
              >
                {isAILoading ? <span className="animate-spin">⟳</span> : <Send className="w-4 h-4" />}
              </button>
            </div>
            
            {aiResponse && (
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700 fade-enter">
                <div className="flex items-start gap-3">
                  <span className="text-lg">🤖</span>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="text-xs text-gray-400 font-medium">AI Assistant</p>
                      <button onClick={() => setAiResponse('')} className="text-gray-400 hover:text-gray-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-1">{aiResponse}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ВИДЖЕТЫ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {widgets.map((widget, index) => (
          <div
            key={index}
            className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all cursor-pointer border-l-4 ${widget.color} hover:scale-[1.02]`}
            onClick={widget.onClick}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400">{widget.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{widget.value}</p>
                {widget.subtitle && <p className="text-xs text-gray-400 mt-1">{widget.subtitle}</p>}
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {widget.icon}
              </div>
            </div>
            {widget.badge && (
              <span className="mt-2 inline-block px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs rounded-full">
                {widget.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-500" /> Быстрые действия
        </h3>
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`flex items-center gap-2 px-4 py-2 ${action.color} text-white rounded-xl hover:shadow-lg transition-all hover:scale-105 text-sm`}
            >
              <span className="text-lg">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* ПОСЛЕДНИЕ ЗАЯВКИ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-lg">📋</span> Последние заявки
          </h3>
          <button onClick={() => setCurrentView('inwork')} className="text-xs text-[#4A6572] dark:text-[#F9AA33] hover:underline flex items-center gap-1">
            Все заявки <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        
        {applications?.slice(0, 5).map((app) => (
          <div
            key={app.id}
            className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 px-2 rounded-lg transition-colors"
            onClick={() => setCurrentView('inwork')}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                {app.object_name}
                {app.status === 'pending' && (new Date() - new Date(app.created_at)) > 2 * 24 * 60 * 60 * 1000 && (
                  <span className="ml-2 text-red-500 text-xs animate-pulse">⚠️</span>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span>👤 {app.foreman_name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  app.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                  app.status === 'received' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {app.status === 'pending' ? '⏳ В работе' :
                   app.status === 'received' ? '✅ Получено' :
                   app.status === 'partial_received' ? '🟡 Частично' :
                   `📌 ${app.status}`}
                </span>
              </p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
              {new Date(app.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
        
        {(!applications || applications.length === 0) && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Нет заявок</p>
            {['master', 'foreman', 'supply_admin'].includes(userRole) && (
              <button onClick={() => setCurrentView('create')} className="mt-2 text-xs text-[#4A6572] dark:text-[#F9AA33] hover:underline">
                Создать первую заявку →
              </button>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4">
        <p>💡 Нажмите на виджет для перехода в раздел • 🗣️ Используйте AI-ассистента для вопросов</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────
const UniversalDashboard = ({ 
  applications, 
  companyUsers, 
  pendingApprovals, 
  user, 
  userRole,
  userCompany,
  setCurrentView,
  isOnline,
  offlineDraftsCount: _offlineDraftsCount, // eslint-disable-line no-unused-vars
  currentPlan,
  mergeableCount,
  cartItemsCount,
  isCompanyOwner,
  onNavigate: _onNavigate, // eslint-disable-line no-unused-vars
  t: _t, // eslint-disable-line no-unused-vars
}) => {
  const { isMaster } = usePriceVisibility(userRole);
  
  // Если мастер или прораб - показываем упрощённый дашборд без цен
  if (isMaster) {
    const safeApps = sanitizeApplicationsForMaster(applications);
    return (
      <MasterDashboard
        applications={safeApps}
        user={user}
        userCompany={userCompany}
        setCurrentView={setCurrentView}
        isOnline={isOnline}
        currentPlan={currentPlan}
      />
    );
  }
  
  // Для остальных - полный дашборд с ценами
  return (
    <FullDashboard
      applications={applications}
      companyUsers={companyUsers}
      pendingApprovals={pendingApprovals}
      user={user}
      userRole={userRole}
      userCompany={userCompany}
      setCurrentView={setCurrentView}
      isOnline={isOnline}
      currentPlan={currentPlan}
      mergeableCount={mergeableCount}
      cartItemsCount={cartItemsCount}
      isCompanyOwner={isCompanyOwner}
    />
  );
};

export default UniversalDashboard;