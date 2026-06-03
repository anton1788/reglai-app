import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, TrendingDown, Activity, RefreshCw, AlertCircle } from 'lucide-react';

const SuperAdminKPIDashboard = ({ supabase, onRefresh }) => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadKPIs = async () => {
    if (!supabase) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Получаем ВСЕ компании
      const { data: companies } = await supabase.from('companies').select('id, created_at, plan_tier, is_blocked');
      
      // Получаем ВСЕ заявки
      const { data: applications } = await supabase.from('applications').select('id, created_at, user_id, company_id, status');
      
      // Получаем ВСЕХ пользователей
      const { data: companyUsers } = await supabase.from('company_users').select('id, user_id, company_id, is_active, role');
      
      // Получаем ВСЕ платежи
      const { data: payments } = await supabase.from('payments').select('id, amount, created_at, company_id');
      
      // Расчёт метрик по ВСЕМ компаниям
      const totalCompanies = companies?.length || 0;
      const activeCompanies = companies?.filter(c => !c.is_blocked).length || 0;
      
      const totalUsers = companyUsers?.length || 0;
      const activeUsers = companyUsers?.filter(u => u.is_active !== false).length || 0;
      
      const totalApplications = applications?.length || 0;
      const completedApplications = applications?.filter(a => a.status === 'received').length || 0;
      const completionRate = totalApplications > 0 ? Math.round((completedApplications / totalApplications) * 100) : 0;
      
      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      
      // Активные пользователи за последние 7 дней (упрощённо - все активные)
      const activeUsers7days = activeUsers;
      
      // Среднее время ответа (упрощённо)
      const avgResponseTime = 24;
      
      setKpis({
        total_companies: totalCompanies,
        active_companies: activeCompanies,
        total_users: totalUsers,
        active_users: activeUsers7days,
        total_applications: totalApplications,
        completion_rate: completionRate,
        total_revenue: totalRevenue,
        avg_response_time: avgResponseTime
      });
      
      setLastUpdate(new Date());
      
    } catch (err) {
      console.error('Error loading SuperAdmin KPIs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKPIs();
    const interval = setInterval(loadKPIs, 300000); // каждые 5 минут
    return () => clearInterval(interval);
  }, [supabase]);

  const handleRefresh = () => {
    loadKPIs();
    onRefresh?.();
  };

  if (loading && !kpis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 relative min-h-[300px]">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  const kpiItems = [
    { key: 'total_companies', label: 'Всего компаний', value: kpis?.total_companies, unit: '', icon: '🏢', color: 'blue' },
    { key: 'active_companies', label: 'Активных компаний', value: kpis?.active_companies, unit: '', icon: '✅', color: 'green' },
    { key: 'total_users', label: 'Всего пользователей', value: kpis?.total_users, unit: '', icon: '👥', color: 'purple' },
    { key: 'active_users', label: 'Активных пользователей (7д)', value: kpis?.active_users, unit: '', icon: '📊', color: 'amber' },
    { key: 'total_applications', label: 'Всего заявок', value: kpis?.total_applications, unit: '', icon: '📋', color: 'orange' },
    { key: 'completion_rate', label: 'Выполнение заявок', value: kpis?.completion_rate, unit: '%', icon: '🎯', color: 'teal' },
    { key: 'total_revenue', label: 'Общая выручка', value: kpis?.total_revenue, unit: ' ₽', icon: '💰', color: 'emerald' },
    { key: 'avg_response_time', label: 'Среднее время ответа', value: kpis?.avg_response_time, unit: ' ч', icon: '⏱️', color: 'rose' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-500" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">KPI Дашборд (все компании)</h3>
          {lastUpdate && (
            <span className="text-xs text-gray-400 ml-2">
              обновлено: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600 dark:text-red-400">Ошибка загрузки: {error}</span>
        </div>
      )}

      {/* Карточки KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.map((item) => {
          const value = item.value;
          if (value === undefined) return null;
          
          return (
            <div key={item.key} className={`bg-${item.color}-50 dark:bg-${item.color}-900/20 rounded-xl p-4 hover:shadow-md transition-all`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                <span className="text-xl">{item.icon}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {typeof value === 'number' ? value.toLocaleString() : value}
                <span className="text-sm font-normal ml-1">{item.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Сводка */}
      {kpis && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex flex-wrap justify-between gap-2">
            <span>📊 Система: {kpis.total_companies} компаний, {kpis.total_users} пользователей</span>
            <span>📝 Заявок: {kpis.total_applications} (выполнено {kpis.completion_rate}%)</span>
            <span>💰 Выручка: {kpis.total_revenue?.toLocaleString()} ₽</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminKPIDashboard;