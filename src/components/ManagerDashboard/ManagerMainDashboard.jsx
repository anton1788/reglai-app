import React from 'react';
import { Clock, Bell, CheckCircle, AlertCircle, TrendingUp, Users as UsersIcon, ArrowRight } from 'lucide-react';
import ManagerAIAssistant from './ManagerAIAssistant';
import CompanyOrgChart from './CompanyOrgChart';
import QuickActionCard from './QuickActionCard';

const ManagerMainDashboard = ({ 
  applications, 
  companyUsers, 
  pendingApprovals,
  user,
  setCurrentView
}) => {
  // Статистика
  const todayApps = applications.filter(a => 
    new Date(a.created_at).toDateString() === new Date().toDateString()
  ).length;
  
  const overdueApps = applications.filter(a => 
    a.status === 'pending' && 
    new Date(a.created_at) < new Date(Date.now() - 3*24*60*60*1000)
  ).length;
  
  const totalSpent = applications.reduce((sum, a) => sum + (a.total_amount || 0), 0);
  
  const activeEmployees = companyUsers.filter(u => {
    const userApps = applications.filter(a => a.user_id === u.user_id);
    const lastActive = userApps.length > 0 
      ? new Date(Math.max(...userApps.map(a => new Date(a.created_at))))
      : null;
    return lastActive && (new Date() - lastActive) < 7 * 24 * 60 * 60 * 1000;
  }).length;
  
  // Уведомления
  const notifications = [
    overdueApps > 0 && {
      icon: '⚠️',
      text: `${overdueApps} заявок просрочено`,
      time: 'Требуют внимания',
      type: 'warning',
      action: () => setCurrentView('inwork')
    },
    (pendingApprovals?.length > 0) && {
      icon: '📋',
      text: `${pendingApprovals.length} заявок на согласовании`,
      time: 'Ожидают решения',
      type: 'info',
      action: () => setCurrentView('approvals')
    },
    (companyUsers.length - activeEmployees) > 0 && {
      icon: '😴',
      text: `${companyUsers.length - activeEmployees} сотрудников неактивны`,
      time: 'Нет активности >7 дней',
      type: 'warning',
      action: () => setCurrentView('employees')
    }
  ].filter(Boolean);
  
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 page-enter">
      {/* Приветствие */}
      <div className="bg-gradient-to-r from-[#4A6572] to-[#344955] rounded-2xl p-6 text-white shadow-xl">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Добро пожаловать, {user?.user_metadata?.full_name?.split(' ')[0] || 'Руководитель'}!
            </h1>
            <p className="opacity-90">
              {new Date().toLocaleDateString('ru-RU', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="text-right bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
            <div className="text-sm opacity-80">Активность сегодня</div>
            <div className="text-4xl font-bold">{todayApps}</div>
            <div className="text-xs opacity-75">новых заявок</div>
          </div>
        </div>
      </div>
      
      {/* AI-ассистент */}
      <ManagerAIAssistant 
        applications={applications}
        companyUsers={companyUsers}
        onNavigate={setCurrentView}
      />
      
      {/* Оргструктура */}
      <CompanyOrgChart 
        users={companyUsers}
        applications={applications}
      />
      
      {/* Быстрые действия */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickActionCard
          icon={<UsersIcon className="w-6 h-6" />}
          title="Сотрудники"
          count={`${activeEmployees}/${companyUsers.length}`}
          onClick={() => setCurrentView('employees')}
          color="blue"
        />
        <QuickActionCard
          icon={<TrendingUp className="w-6 h-6" />}
          title="Аналитика"
          count={`${totalSpent.toLocaleString()} ₽`}
          onClick={() => setCurrentView('analytics')}
          color="green"
        />
        <QuickActionCard
          icon={<AlertCircle className="w-6 h-6" />}
          title="Согласование"
          count={pendingApprovals?.length || 0}
          onClick={() => setCurrentView('approvals')}
          color="red"
        />
        <QuickActionCard
          icon={<Clock className="w-6 h-6" />}
          title="Активные заявки"
          count={applications.filter(a => 
            ['pending', 'admin_processing', 'partial_received'].includes(a.status)
          ).length}
          onClick={() => setCurrentView('inwork')}
          color="orange"
        />
      </div>
      
      {/* Две колонки */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Последние заявки */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Последние заявки
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {applications.slice(0, 5).map(app => (
              <div 
                key={app.id} 
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition"
                onClick={() => setCurrentView('inwork')}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{app.object_name}</p>
                    <p className="text-sm text-gray-500">{app.foreman_name}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {app.total_amount && (
                      <p className="text-sm font-semibold text-green-600">
                        {app.total_amount.toLocaleString()} ₽
                      </p>
                    )}
                    <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                      app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      app.status === 'partial_received' ? 'bg-blue-100 text-blue-700' :
                      app.status === 'received' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {app.status === 'pending' ? '⏳ В работе' :
                       app.status === 'partial_received' ? '🟡 Частично' :
                       app.status === 'received' ? '✅ Выполнена' : app.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {applications.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                Нет заявок
              </div>
            )}
          </div>
        </div>
        
        {/* Уведомления */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-bold flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-500" />
              Уведомления
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notif, i) => (
              <button
                key={i}
                onClick={notif.action}
                className="w-full px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition text-left"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{notif.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {notif.text}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            ))}
            {notifications.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-50" />
                <p>Все хорошо! Нет новых уведомлений</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerMainDashboard;