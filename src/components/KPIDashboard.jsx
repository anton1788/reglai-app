import React, { useState, useEffect, useCallback } from 'react';
import { Target, TrendingUp, TrendingDown, Activity, RefreshCw, AlertCircle } from 'lucide-react';
import { KPI_TARGETS, calculateKPIs, getMetricStatus, getMetricColor } from '../utils/kpiConfig';
import LoadingOverlay from './LoadingOverlay';

const KPIDashboard = ({ supabase, companyId, onRefresh, refreshInterval = 300000 }) => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadKPIs = useCallback(async () => {
    if (!supabase || !companyId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Параллельная загрузка данных
      const [companiesRes, appsRes, usersRes, paymentsRes, commentsRes] = await Promise.all([
        supabase.from('companies').select('id, created_at, plan_tier, is_blocked'),
        supabase.from('applications').select('id, created_at, user_id, company_id, status'),
        supabase.from('users').select('id, created_at, email'),
        supabase.from('payments').select('id, amount, created_at'),
        supabase.from('comments').select('id, application_id, created_at')
      ]);
      
      const data = {
        companies: companiesRes.data || [],
        applications: appsRes.data || [],
        users: usersRes.data || [],
        payments: paymentsRes.data || [],
        comments: commentsRes.data || []
      };
      
      const calculatedKPIs = calculateKPIs(data);
      setKpis(calculatedKPIs);
      setLastUpdate(new Date());
      
      // Сохраняем в localStorage для истории
      const history = JSON.parse(localStorage.getItem('kpi_history') || '[]');
      history.push(calculatedKPIs);
      if (history.length > 30) history.shift(); // храним 30 последних записей
      localStorage.setItem('kpi_history', JSON.stringify(history));
      
    } catch (err) {
      console.error('Error loading KPIs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, companyId]);

  useEffect(() => {
    loadKPIs();
    
    // Автообновление каждые refreshInterval мс
    const interval = setInterval(loadKPIs, refreshInterval);
    return () => clearInterval(interval);
  }, [loadKPIs, refreshInterval]);

  const handleRefresh = () => {
    loadKPIs();
    onRefresh?.();
  };

  if (loading && !kpis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 relative min-h-[300px]">
        <LoadingOverlay isLoading={true} message="Загрузка KPI..." />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#4A6572]" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">KPI Дашборд</h3>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.entries(KPI_TARGETS).map(([key, config]) => {
          const value = kpis?.[key];
          if (value === undefined) return null;
          
          const status = getMetricStatus(key, value);
          const colorClass = getMetricColor(key, value);
          
          let icon;
          if (status === 'excellent') icon = <TrendingUp className="w-5 h-5" />;
          else if (status === 'bad') icon = <TrendingDown className="w-5 h-5" />;
          else icon = <Activity className="w-5 h-5" />;
          
          return (
            <div key={key} className={`rounded-lg p-4 transition-all hover:shadow-md ${colorClass}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{config.label}</span>
                {icon}
              </div>
              
              <div className="text-2xl font-bold">
                {value}
                <span className="text-sm font-normal ml-1">{config.unit}</span>
              </div>
              
              <div className="mt-2 text-xs opacity-75">
                Цель: {config.target}{config.unit}
                {config.min !== config.target && ` (мин: ${config.min})`}
              </div>
              
              {/* Прогресс-бар */}
              <div className="mt-2 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-current transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, (value / config.target) * 100)}%` 
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Сводка */}
      {kpis && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Активных пользователей (7 дней): {kpis.active_users}</span>
            <span>Среднее время ответа: {kpis.avg_response_time} ч</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIDashboard;