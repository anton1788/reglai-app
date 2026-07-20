// src/components/KPIDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Target, TrendingUp, TrendingDown, Activity, RefreshCw, AlertCircle, Eye, EyeOff, Users, Clock, CheckCircle, DollarSign, Shield } from 'lucide-react';
import { KPI_TARGETS, calculateKPIs, getMetricStatus, getMetricColor } from '../utils/kpiConfig';
import LoadingOverlay from './LoadingOverlay';
import { usePriceVisibility } from '../hooks/usePriceVisibility';

// Метрики, которые НЕ должны видеть мастер и прораб (финансовые)
const FINANCIAL_METRICS = ['trial_conversion', 'churn_rate', 'ltv', 'cac', 'payback_period'];

// Базовые метрики, видимые всем
const BASIC_METRICS = ['active_users', 'avg_response_time'];

const KPIDashboard = ({ 
  supabase, 
  companyId, 
  onRefresh, 
  refreshInterval = 300000,
  userRole = 'master',
  isMasterMode = false
}) => {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // ✅ ИСПРАВЛЕНО: убрали неиспользуемый shouldHidePrices
  const { isMaster } = usePriceVisibility(userRole);
  
  const hideFinancialMetrics = isMaster || isMasterMode;

  const loadKPIs = useCallback(async () => {
    if (!supabase || !companyId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const [companiesRes, appsRes, usersRes, paymentsRes, commentsRes] = await Promise.all([
        supabase.from('companies').select('id, created_at, plan_tier, is_blocked'),
        supabase.from('applications').select('id, created_at, user_id, company_id, status'),
        supabase.from('users').select('id, created_at, email, last_active_at'),
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
      try {
        const history = JSON.parse(localStorage.getItem('kpi_history') || '[]');
        history.push({ ...calculatedKPIs, timestamp: new Date().toISOString() });
        if (history.length > 30) history.shift();
        localStorage.setItem('kpi_history', JSON.stringify(history));
      } catch {
        // Игнорируем ошибки localStorage
      }
      
    } catch (err) {
      console.error('Error loading KPIs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, companyId]);

  useEffect(() => {
    loadKPIs();
    
    const interval = setInterval(loadKPIs, refreshInterval);
    return () => clearInterval(interval);
  }, [loadKPIs, refreshInterval]);

  const handleRefresh = () => {
    loadKPIs();
    onRefresh?.();
  };

  const getVisibleMetrics = () => {
    if (!kpis) return [];
    
    const allMetricKeys = Object.keys(KPI_TARGETS);
    
    if (hideFinancialMetrics) {
      return allMetricKeys.filter(key => BASIC_METRICS.includes(key));
    }
    
    return allMetricKeys;
  };

  const isFinancialMetric = (key) => FINANCIAL_METRICS.includes(key);

  if (loading && !kpis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 relative min-h-[300px]">
        <LoadingOverlay isLoading={true} message="Загрузка KPI..." />
      </div>
    );
  }

  const visibleMetrics = getVisibleMetrics();
  const hasFinancialData = kpis && Object.keys(kpis).some(key => FINANCIAL_METRICS.includes(key) && kpis[key] !== undefined);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#4A6572]" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {hideFinancialMetrics ? '📊 Мои показатели' : '📈 KPI Дашборд'}
          </h3>
          {lastUpdate && (
            <span className="text-xs text-gray-400 ml-2 hidden sm:inline">
              обновлено: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hideFinancialMetrics && (
            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full flex items-center gap-1">
              <EyeOff className="w-3 h-3" />
              Без финансов
            </span>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Обновить"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
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
        {visibleMetrics.map((key) => {
          const value = kpis?.[key];
          if (value === undefined || value === null) return null;
          
          const config = KPI_TARGETS[key];
          if (!config) return null;
          
          const status = getMetricStatus(key, value);
          const colorClass = getMetricColor(key, value);
          const isFinancial = isFinancialMetric(key);
          
          let IconComponent;
          if (isFinancial) {
            IconComponent = DollarSign;
          } else if (key === 'active_users') {
            IconComponent = Users;
          } else if (key === 'avg_response_time') {
            IconComponent = Clock;
          } else {
            IconComponent = status === 'excellent' ? TrendingUp : 
                          status === 'bad' ? TrendingDown : Activity;
          }
          
          return (
            <div 
              key={key} 
              className={`rounded-lg p-4 transition-all hover:shadow-md ${colorClass} ${isFinancial && hideFinancialMetrics ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium truncate" title={config.label}>
                  {config.label}
                </span>
                <IconComponent className="w-5 h-5 flex-shrink-0" />
              </div>
              
              <div className="text-2xl font-bold">
                {value}
                <span className="text-sm font-normal ml-1">{config.unit}</span>
              </div>
              
              <div className="mt-2 text-xs opacity-75">
                {status === 'excellent' && '✅ Отлично'}
                {status === 'good' && '📊 Норма'}
                {status === 'bad' && '⚠️ Требует внимания'}
                {` • Цель: ${config.target}${config.unit}`}
              </div>
              
              <div className="mt-2 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-current transition-all duration-500"
                  style={{ 
                    width: `${Math.min(100, Math.max(0, (value / config.target) * 100))}%` 
                  }}
                />
              </div>
              
              {isFinancial && hideFinancialMetrics && (
                <div className="mt-1 text-[10px] opacity-60 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Только для руководителей
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hideFinancialMetrics && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <EyeOff className="w-4 h-4" />
            💡 Финансовые показатели скрыты. Для информации по ценам и финансовым метрикам обратитесь к снабженцу или руководителю.
          </p>
        </div>
      )}

      {kpis && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
          <div className="flex flex-wrap justify-between gap-2">
            <span>👥 Активных пользователей: {kpis.active_users || 0}</span>
            <span>⏱️ Среднее время ответа: {kpis.avg_response_time || 0} ч</span>
            {!hideFinancialMetrics && hasFinancialData && (
              <>
                <span>💰 LTV: {kpis.ltv?.toLocaleString() || 0} ₽</span>
                <span>📊 Конверсия: {kpis.trial_conversion || 0}%</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIDashboard;