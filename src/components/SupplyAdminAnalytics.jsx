// src/components/SupplyAdminAnalytics.jsx
import React, { useMemo } from 'react';
import { Package, Clock, CheckCircle, AlertTriangle, TrendingUp, Users, Calendar, Box } from 'lucide-react';

const SupplyAdminAnalytics = ({ applications, companyUsers, userCompany, currentPlan }) => {
  const stats = useMemo(() => {
    if (!applications || applications.length === 0) {
      return {
        total: 0,
        pending: 0,
        partial: 0,
        received: 0,
        canceled: 0,
        avgProcessingTime: 0,
        topMaterials: [],
        completionRate: 0,
        totalMaterials: 0,
        totalUsers: 0,
        monthlyStats: { total: 0, received: 0, pending: 0 }
      };
    }
    
    const total = applications.length;
    const pending = applications.filter(a => a.status === 'pending' || a.status === 'admin_processing').length;
    const partial = applications.filter(a => a.status === 'partial_received').length;
    const received = applications.filter(a => a.status === 'received').length;
    const canceled = applications.filter(a => a.status === 'canceled').length;
    
    // Среднее время обработки (в днях)
    const processedApps = applications.filter(a => 
      a.status === 'received' || a.status === 'partial_received'
    );
    const avgProcessingTime = processedApps.length > 0 
      ? processedApps.reduce((sum, app) => {
          const created = new Date(app.created_at);
          const updated = new Date(app.updated_at || app.created_at);
          return sum + (updated - created) / (1000 * 60 * 60 * 24);
        }, 0) / processedApps.length
      : 0;
    
    // Топ материалов
    const materialCount = {};
    applications.forEach(app => {
      app.materials?.forEach(m => {
        if (m.description) {
          materialCount[m.description] = (materialCount[m.description] || 0) + (m.quantity || 0);
        }
      });
    });
    const topMaterials = Object.entries(materialCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    
    // Общее количество материалов
    const totalMaterials = applications.reduce((sum, app) => 
      sum + (app.materials?.reduce((s, m) => s + (m.quantity || 0), 0) || 0), 0);
    
    // Статистика за текущий месяц
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyApps = applications.filter(a => new Date(a.created_at) >= startOfMonth);
    
    return {
      total,
      pending,
      partial,
      received,
      canceled,
      avgProcessingTime: Math.round(avgProcessingTime * 10) / 10,
      topMaterials,
      completionRate: total > 0 ? Math.round((received / total) * 100) : 0,
      totalMaterials,
      totalUsers: companyUsers?.length || 0,
      monthlyStats: {
        total: monthlyApps.length,
        received: monthlyApps.filter(a => a.status === 'received').length,
        pending: monthlyApps.filter(a => a.status === 'pending' || a.status === 'admin_processing').length
      }
    };
  }, [applications, companyUsers]);

  // Компонент карточки KPI - исправлен для ESLint
  const KPICard = ({ title, value, icon: IconComponent, color, subtitle }) => {
    // Используем IconComponent для рендеринга
    const Icon = IconComponent;
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
        {/* Заголовок */}
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                📊 Аналитика снабжения
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {userCompany || 'Ваша компания'} • Роль: Администратор снабжения
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">
                Обновлено: {new Date().toLocaleString()}
              </div>
              {currentPlan && (
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Тариф: {currentPlan.name}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* KPI Карточки */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KPICard 
              title="Всего заявок" 
              value={stats.total} 
              icon={Package} 
              color="text-blue-600"
              subtitle={`За месяц: ${stats.monthlyStats.total}`}
            />
            <KPICard 
              title="В обработке" 
              value={stats.pending} 
              icon={Clock} 
              color="text-yellow-600"
              subtitle={`${stats.pending > 0 ? '⚠️ Требуют внимания' : '✅ Все обработаны'}`}
            />
            <KPICard 
              title="Выполнено" 
              value={stats.received} 
              icon={CheckCircle} 
              color="text-green-600"
              subtitle={`${stats.completionRate}% выполнения`}
            />
            <KPICard 
              title="Сотрудников" 
              value={stats.totalUsers} 
              icon={Users} 
              color="text-purple-600"
            />
          </div>

          {/* Детальная статистика */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Эффективность */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Эффективность
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Среднее время обработки</span>
                  <span className="text-sm font-semibold">{stats.avgProcessingTime} дней</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Частично выполнено</span>
                  <span className="text-sm font-semibold text-orange-600">{stats.partial}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Отменено</span>
                  <span className="text-sm font-semibold text-red-600">{stats.canceled}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Всего материалов</span>
                  <span className="text-sm font-semibold">{stats.totalMaterials} шт</span>
                </div>
              </div>
            </div>

            {/* Топ материалов */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Box className="w-4 h-4 text-green-500" />
                Топ материалов
              </h3>
              {stats.topMaterials.length > 0 ? (
                <div className="space-y-3">
                  {stats.topMaterials.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]">
                        {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '📍 '}
                        {item.name}
                      </span>
                      <span className="text-sm font-semibold">{item.count} шт</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-6 text-sm">
                  Нет данных о материалах
                </div>
              )}
            </div>

            {/* Быстрые действия */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                Быстрые действия
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'inwork' }))}
                  className="w-full py-2.5 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-left flex items-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Заявки в работе ({stats.pending})
                </button>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'warehouse' }))}
                  className="w-full py-2.5 px-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Управление складом
                </button>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'received' }))}
                  className="w-full py-2.5 px-4 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors text-left flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Завершённые заявки ({stats.received})
                </button>
              </div>
            </div>
          </div>

          {/* Прогресс-бар выполнения */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                Общий прогресс выполнения
              </h3>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {stats.completionRate}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  stats.completionRate >= 80 ? 'bg-green-500' :
                  stats.completionRate >= 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>0%</span>
              <span>{stats.received} из {stats.total} выполнено</span>
              <span>100%</span>
            </div>
          </div>

          {/* Предупреждения для снабженца */}
          {stats.pending > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    Внимание: {stats.pending} заявок ожидают обработки
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    Рекомендуется проверить заявки и распределить задачи по поставщикам
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200/50 dark:border-gray-700/50 px-6 py-4">
          <div className="text-center text-xs text-gray-400">
            Данные обновлены: {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplyAdminAnalytics;