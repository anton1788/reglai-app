// src/components/RoleDashboard.jsx
import React, { useMemo } from 'react';
import { 
  Briefcase, Clock, CheckCircle, 
  TrendingUp, Building, Package, 
  Merge, WifiOff, Sparkles, ShoppingCart
} from 'lucide-react';

const isMasterRole = (role) => role === 'master' || role === 'foreman';

const MasterDashboard = ({ applications, user, userCompany, setCurrentView, isOnline }) => {
  const metrics = useMemo(() => {
    const myApps = applications?.filter(a => a.user_id === user?.id) || [];
    return {
      total: myApps.length,
      active: myApps.filter(a => ['pending', 'admin_processing', 'partial_received'].includes(a.status)).length,
      completed: myApps.filter(a => ['received', 'confirmed', 'canceled'].includes(a.status)).length,
      objects: new Set(myApps.map(a => a.object_name)).size,
    };
  }, [applications, user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const time = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
    return `${time}, 👷 Мастер!`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 page-enter">
      <div className="bg-gradient-to-r from-[#4A6572] to-[#344955] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{getGreeting()}</h1>
            <p className="text-white/70 text-sm">{userCompany} • {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <div className="flex flex-wrap gap-2 text-sm mt-3">
              <span className="bg-white/20 px-3 py-1 rounded-full">📋 {metrics.total} заявок</span>
              <span className="bg-white/20 px-3 py-1 rounded-full">🏗️ {metrics.objects} объектов</span>
              {!isOnline && <span className="bg-yellow-500/30 px-3 py-1 rounded-full flex items-center gap-1"><WifiOff className="w-3 h-3" /> Офлайн</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Briefcase className="w-5 h-5 text-blue-500" />, label: 'Мои заявки', value: metrics.total, color: 'border-blue-500', onClick: () => setCurrentView('inwork'), sub: `${metrics.active} в работе` },
          { icon: <CheckCircle className="w-5 h-5 text-green-500" />, label: 'Выполнено', value: metrics.completed, color: 'border-green-500', onClick: () => setCurrentView('history'), sub: 'Завершённые' },
          { icon: <Building className="w-5 h-5 text-orange-500" />, label: 'Объекты', value: metrics.objects, color: 'border-orange-500', onClick: () => setCurrentView('analytics'), sub: 'Всего объектов' },
          { icon: <Clock className="w-5 h-5 text-yellow-500" />, label: 'В работе', value: metrics.active, color: 'border-yellow-500', onClick: () => setCurrentView('inwork'), sub: 'Требуют внимания' },
        ].map((w, i) => (
          <div key={i} onClick={w.onClick} className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all cursor-pointer border-l-4 ${w.color} hover:scale-[1.02]`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{w.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{w.value}</p>
                <p className="text-xs text-gray-400 mt-1">{w.sub}</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">{w.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-500" /> Быстрые действия</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setCurrentView('create')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:shadow-lg transition-all text-sm">📝 Создать заявку</button>
          <button onClick={() => setCurrentView('inwork')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:shadow-lg transition-all text-sm">📋 Мои заявки</button>
          <button onClick={() => setCurrentView('chat')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:shadow-lg transition-all text-sm">💬 Чат</button>
        </div>
      </div>
    </div>
  );
};

const FullDashboard = ({ applications, companyUsers, pendingApprovals, userRole, userCompany, setCurrentView, isOnline, mergeableCount, cartItemsCount, isCompanyOwner }) => {
  const metrics = useMemo(() => {
    const activeApps = applications?.filter(a => ['pending', 'admin_processing', 'partial_received'].includes(a.status)).length || 0;
    const totalExpenses = applications?.reduce((sum, app) => sum + (app.materials?.reduce((s, m) => s + (Number(m.quantity) || 0) * (Number(m.price) || 1000), 0) || 0), 0) || 0;
    return {
      activeApps,
      totalExpenses,
      objectsCount: new Set(applications?.map(a => a.object_name) || []).size,
      pendingApprovals: pendingApprovals?.length || 0,
      totalUsers: companyUsers?.length || 0,
    };
  }, [applications, companyUsers, pendingApprovals]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    const time = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
    const roles = { supply_admin: '📦 Снабженец', accountant: '💰 Бухгалтер', manager: '👔 Руководитель', director: '👔 Директор' };
    return `${time}, ${roles[userRole] || 'Сотрудник'}!`;
  };

  const widgets = [
    { icon: <Briefcase className="w-5 h-5 text-blue-500" />, label: 'Активные заявки', value: metrics.activeApps, color: 'border-blue-500', onClick: () => setCurrentView('inwork') },
  ];
  
  if (userRole === 'supply_admin') {
    const pending = applications?.filter(a => ['pending', 'admin_processing'].includes(a.status)).length || 0;
    widgets.push({ icon: <Package className="w-5 h-5 text-orange-500" />, label: 'На обработке', value: pending, color: 'border-orange-500', onClick: () => setCurrentView('received') });
  }
  if (userRole === 'manager' || userRole === 'director' || isCompanyOwner) {
    widgets.push({ icon: <Clock className="w-5 h-5 text-yellow-500" />, label: 'На согласовании', value: metrics.pendingApprovals, color: 'border-yellow-500', onClick: () => setCurrentView('approvals') });
    widgets.push({ icon: <TrendingUp className="w-5 h-5 text-green-500" />, label: 'Расходы', value: `${(metrics.totalExpenses / 1000).toFixed(1)}K ₽`, color: 'border-green-500', onClick: () => setCurrentView('analytics') });
  }
  if (cartItemsCount > 0) widgets.push({ icon: <ShoppingCart className="w-5 h-5 text-pink-500" />, label: 'Корзина', value: cartItemsCount, color: 'border-pink-500', onClick: () => setCurrentView('cart') });
  if (mergeableCount > 0) widgets.push({ icon: <Merge className="w-5 h-5 text-indigo-500" />, label: 'Объединение', value: mergeableCount, color: 'border-indigo-500', onClick: () => setCurrentView('merge') });

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 page-enter">
      <div className="bg-gradient-to-r from-[#4A6572] to-[#344955] rounded-2xl p-6 text-white shadow-xl">
        <h1 className="text-2xl font-bold mb-1">{getGreeting()}</h1>
        <p className="text-white/70 text-sm">{userCompany} • {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <div className="flex flex-wrap gap-2 text-sm mt-3">
          <span className="bg-white/20 px-3 py-1 rounded-full">📋 {applications?.length || 0} заявок</span>
          <span className="bg-white/20 px-3 py-1 rounded-full">👥 {metrics.totalUsers} сотрудников</span>
          {!isOnline && <span className="bg-yellow-500/30 px-3 py-1 rounded-full flex items-center gap-1"><WifiOff className="w-3 h-3" /> Офлайн</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {widgets.map((w, i) => (
          <div key={i} onClick={w.onClick} className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-all cursor-pointer border-l-4 ${w.color} hover:scale-[1.02]`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{w.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{w.value}</p>
              </div>
              <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">{w.icon}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function RoleDashboard(props) {
  if (isMasterRole(props.userRole)) {
    return <MasterDashboard {...props} />;
  }
  return <FullDashboard {...props} />;
}