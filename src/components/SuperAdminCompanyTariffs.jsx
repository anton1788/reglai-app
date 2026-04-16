// src/components/SuperAdminCompanyTariffs.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, TrendingUp, DollarSign, Users, Activity, 
  AlertTriangle, ChevronDown, ChevronUp, Download, 
  RefreshCw, Edit3, CheckCircle, XCircle, Eye,
  BarChart3, FileText, PieChart, Calendar, Clock, ChevronRight
} from 'lucide-react';

const TARIFF_PLANS = {
  basic: { name: 'Базовый', monthlyPrice: 990, annualPrice: 9900, maxUsers: 5, maxApiCalls: 100, color: 'blue' },
  pro: { name: 'Профессиональный', monthlyPrice: 2990, annualPrice: 29900, maxUsers: 20, maxApiCalls: 500, color: 'green' },
  enterprise: { name: 'Корпоративный', monthlyPrice: 9990, annualPrice: 99900, maxUsers: 100, maxApiCalls: 2000, color: 'purple' }
};

const SuperAdminCompanyTariffs = ({ supabase, showNotification }) => {
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState(null);
  const [apiUsage, setApiUsage] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [upgradePredictions, setUpgradePredictions] = useState([]);
  const [revenueAnalytics, setRevenueAnalytics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [editingTariff, setEditingTariff] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Load all tariff-related data
  // src/components/SuperAdminCompanyTariffs.jsx

const loadData = useCallback(async () => {
  setIsLoading(true);
  try {
    // 1. Load companies with tariff info
    const { data: companiesData, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, plan_tier, is_blocked, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (companiesError) throw companiesError;
    
    // 2. Get tariff distribution stats — с защитой от ошибок
    const { data: tariffStats, error: tariffError } = await supabase
      .rpc('get_tariff_distribution_stats');
    if (tariffError) {
      console.warn('get_tariff_distribution_stats error:', tariffError);
      // Не прерываем загрузку, просто используем пустой массив
    }
    
    // 3. Get API usage stats
    const { data: apiStats, error: apiError } = await supabase
      .rpc('get_api_usage_stats', { p_days_back: 30 });
    if (apiError) {
      console.warn('get_api_usage_stats error:', apiError);
    }
    
    // 4. Get user activity by tariff
    const { data: activityStats, error: activityError } = await supabase
      .rpc('get_user_activity_by_tariff', { p_days_back: 30 });
    if (activityError) {
      console.warn('get_user_activity_by_tariff error:', activityError);
    }
    
    // 5. Get upgrade predictions
    const { data: predictions, error: predictError } = await supabase
      .rpc('get_upgrade_predictions');
    if (predictError) {
      console.warn('get_upgrade_predictions error:', predictError);
    }
    
    // 6. Get revenue analytics — ВАЖНО: передаём даты как строки!
    const startDate = dateRange.start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = dateRange.end || new Date().toISOString().split('T')[0];
    
    const { data: revenue, error: revenueError } = await supabase
      .rpc('get_revenue_analytics', {
        p_start_date: startDate,  // ← строка '2026-04-01'
        p_end_date: endDate        // ← строка '2026-04-05'
      });
    if (revenueError) {
      console.warn('get_revenue_analytics error:', revenueError);
    }
    
    // ✅ Безопасное присваивание с проверкой на массив
    setCompanies(Array.isArray(companiesData) ? companiesData : []);
    setStats(Array.isArray(tariffStats) ? tariffStats : []);
    setApiUsage(Array.isArray(apiStats) ? apiStats : []);
    setUserActivity(Array.isArray(activityStats) ? activityStats : []);
    setUpgradePredictions(Array.isArray(predictions) ? predictions : []);
    setRevenueAnalytics(Array.isArray(revenue) ? revenue : []);
    
  } catch (err) {
    console.error('❌ Error loading tariff data:', err);
    showNotification('Ошибка загрузки данных: ' + err.message, 'error');
    // Сбрасываем состояния в безопасные значения
    setCompanies([]);
    setStats([]);
    setApiUsage([]);
    setUserActivity([]);
    setUpgradePredictions([]);
    setRevenueAnalytics([]);
  } finally {
    setIsLoading(false);
  }
}, [supabase, dateRange, showNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update company tariff
  const handleUpdateTariff = async (companyId, newPlan) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ 
          plan_tier: newPlan, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', companyId);
      
      if (error) throw error;
      
      showNotification(`Тариф успешно обновлён`, 'success');
      setEditingTariff(null);
      loadData();
    } catch (error) {
      console.error('Error updating tariff:', error);
      showNotification('Ошибка обновления тарифа', 'error');
    }
  };

  // Export analytics to CSV
  const exportToCSV = useCallback((data, filename) => {
    if (!data || data.length === 0) {
      showNotification('Нет данных для экспорта', 'warning');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      }).join(','))
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('Экспорт завершён', 'success');
  }, [showNotification]);

  const getTariffColor = (plan) => {
    return TARIFF_PLANS[plan]?.color || 'gray';
  };

  const getUsageColor = (percent) => {
    if (percent >= 90) return 'text-red-600 bg-red-100';
    if (percent >= 70) return 'text-orange-600 bg-orange-100';
    return 'text-green-600 bg-green-100';
  };

  // Statistics Cards
  const renderStatCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <Building2 className="w-5 h-5 text-blue-500" />
          <span className="text-2xl font-bold">{companies.length}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Всего компаний</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <DollarSign className="w-5 h-5 text-green-500" />
          <span className="text-2xl font-bold">
            {revenueAnalytics.reduce((sum, r) => sum + (r.estimated_monthly_revenue || 0), 0).toLocaleString()} ₽
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Месячный доход (оценка)</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <Users className="w-5 h-5 text-purple-500" />
          <span className="text-2xl font-bold">
            {userActivity.reduce((sum, u) => sum + Number(u.active_users || 0), 0).toLocaleString()}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Активных пользователей</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <Activity className="w-5 h-5 text-orange-500" />
          <span className="text-2xl font-bold">
            {upgradePredictions.length}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Требуют апгрейда</p>
      </div>
    </div>
  );

  // Tariff Distribution Chart
  const renderTariffDistribution = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          Распределение тарифов
        </h3>
        <button
          onClick={() => exportToCSV(stats ? [stats] : [], 'tariff_distribution')}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
      </div>
      
      <div className="space-y-3">
        {Object.entries(TARIFF_PLANS).map(([planId, plan]) => {
          const planStats = stats?.find(s => s.plan_tier === planId);
          const count = planStats?.company_count || companies.filter(c => c.plan_tier === planId).length;
          const percentage = companies.length > 0 ? (count / companies.length) * 100 : 0;
          
          return (
            <div key={planId}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{plan.name}</span>
                <span className="text-gray-500">{count} компаний ({percentage.toFixed(1)}%)</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 bg-${plan.color}-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // API Usage Table
  const renderApiUsageTable = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Использование API по компаниям
        </h3>
        <button
          onClick={() => exportToCSV(apiUsage, 'api_usage_stats')}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
      </div>
      
      <div className="overflow-x-auto max-h-96">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Компания</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Тариф</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">API вызовов</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">В день (сред.)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Лимит</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Использование</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {apiUsage.slice(0, 20).map(company => (
              <tr key={company.company_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3 text-sm font-medium">{company.company_name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full bg-${getTariffColor(company.plan_tier)}-100 text-${getTariffColor(company.plan_tier)}-700`}>
                    {TARIFF_PLANS[company.plan_tier]?.name || company.plan_tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm">{Number(company.total_api_calls).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-sm">{Number(company.avg_daily_calls).toFixed(1)}</td>
                <td className="px-4 py-3 text-right text-sm">{company.quota_limit?.toLocaleString() || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          company.usage_percent >= 80 ? 'bg-red-500' : 
                          company.usage_percent >= 60 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(company.usage_percent || 0, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getUsageColor(company.usage_percent || 0)}`}>
                      {Math.round(company.usage_percent || 0)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Upgrade Predictions Table
  const renderUpgradePredictions = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Рекомендации по апгрейду тарифов
        </h3>
      </div>
      
      {upgradePredictions.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p>Все компании используют оптимальные тарифы</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {upgradePredictions.map(prediction => (
            <div key={prediction.company_id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{prediction.company_name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full bg-${getTariffColor(prediction.current_plan)}-100 text-${getTariffColor(prediction.current_plan)}-700`}>
                      {TARIFF_PLANS[prediction.current_plan]?.name}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className={`px-2 py-0.5 text-xs rounded-full bg-${getTariffColor(prediction.recommended_plan)}-100 text-${getTariffColor(prediction.recommended_plan)}-700`}>
                      {TARIFF_PLANS[prediction.recommended_plan]?.name}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {prediction.reason}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>API: {prediction.api_usage_percent}% от лимита</span>
                    <span>Пользователей: {prediction.user_count}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Через {prediction.days_until_upgrade} дней
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleUpdateTariff(prediction.company_id, prediction.recommended_plan)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Апгрейдить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Companies Table with inline tariff editing
  const renderCompaniesTable = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Компании
        </h3>
        <button
          onClick={() => exportToCSV(companies, 'companies_tariff_list')}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Компания</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Тариф</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Статус</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Дата регистрации</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {companies.map(company => (
              <React.Fragment key={company.id}>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                      className="flex items-center gap-2 text-left"
                    >
                      {expandedCompany === company.id ? 
                        <ChevronUp className="w-4 h-4 text-gray-400" /> : 
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      }
                      <span className="font-medium">{company.name}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {editingTariff === company.id ? (
                      <select
                        value={company.plan_tier}
                        onChange={(e) => handleUpdateTariff(company.id, e.target.value)}
                        className="px-2 py-1 text-sm border rounded"
                        autoFocus
                      >
                        {Object.entries(TARIFF_PLANS).map(([planId, plan]) => (
                          <option key={planId} value={planId}>{plan.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`px-2 py-1 text-xs rounded-full bg-${getTariffColor(company.plan_tier)}-100 text-${getTariffColor(company.plan_tier)}-700`}>
                        {TARIFF_PLANS[company.plan_tier]?.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {company.is_blocked ? (
                      <span className="text-red-600 text-sm flex items-center gap-1">
                        <XCircle className="w-4 h-4" /> Заблокирована
                      </span>
                    ) : (
                      <span className="text-green-600 text-sm flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Активна
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      {editingTariff === company.id ? (
                        <button
                          onClick={() => setEditingTariff(null)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingTariff(company.id)}
                          className="p-1 text-blue-500 hover:text-blue-700"
                          title="Изменить тариф"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => exportToCSV([company], `company_${company.name}_details`)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                        title="Экспорт данных компании"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedCompany === company.id && (
                  <tr className="bg-gray-50 dark:bg-gray-700/30">
                    <td colSpan="5" className="px-4 py-3">
                      <div className="text-sm">
                        <h4 className="font-medium mb-2">Детальная информация</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">ID компании</p>
                            <p className="text-sm font-mono">{company.id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Последнее обновление</p>
                            <p className="text-sm">{new Date(company.updated_at).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">API лимит</p>
                            <p className="text-sm">{TARIFF_PLANS[company.plan_tier]?.maxApiCalls}/день</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Макс. пользователей</p>
                            <p className="text-sm">{TARIFF_PLANS[company.plan_tier]?.maxUsers}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-500" />
            Управление тарифами компаний
          </h1>
          <p className="text-sm text-gray-500 mt-1">Мониторинг и управление тарифными планами компаний</p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="flex gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
        <Calendar className="w-5 h-5 text-gray-400" />
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700"
          />
          <span className="text-gray-500">—</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700"
          />
          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
          >
            Применить
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {renderStatCards()}
          {renderTariffDistribution()}
          {renderApiUsageTable()}
          {renderUpgradePredictions()}
          {renderCompaniesTable()}
        </>
      )}
    </div>
  );
};

export default SuperAdminCompanyTariffs;