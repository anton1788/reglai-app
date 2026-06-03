import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, TrendingUp, Users, Building2, DollarSign, RefreshCw } from 'lucide-react';

const formatNumber = (num) => new Intl.NumberFormat('ru-RU').format(num || 0);

const escapeHtml = (str) => {
  if (!str) return '—';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

function calculateCompanyStats(applications) {
  if (!applications || applications.length === 0) {
    return { totalAmount: 0, conversionRate: 0, receivedAmount: 0 };
  }
  
  const totalAmount = applications.reduce((sum, app) => sum + (app.total_amount || 0), 0);
  const completedApps = applications.filter(app => app.status === 'received').length;
  const conversionRate = applications.length > 0 ? Math.round((completedApps / applications.length) * 100) : 0;
  
  return { totalAmount, receivedAmount: 0, conversionRate };
}

const SuperAdminAnalyticsDashboard = ({ supabase }) => {
  const [companiesData, setCompaniesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadAllData = useCallback(async () => {
    if (!supabase) return;
    
    setIsLoading(true);
    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companies && companies.length > 0) {
        const enriched = await Promise.all(companies.map(async (company) => {
          const { data: users } = await supabase
            .from('company_users')
            .select('id, user_id, full_name, role, is_active')
            .eq('company_id', company.id);
          
          const { data: companyApps } = await supabase
            .from('applications')
            .select('status, created_at, materials, total_amount')
            .eq('company_id', company.id);
          
          const stats = calculateCompanyStats(companyApps || []);
          
          return { 
            ...company, 
            stats, 
            totalApps: companyApps?.length || 0,
            usersCount: users?.length || 0,
            activeUsers: users?.filter(u => u.is_active !== false).length || 0
          };
        }));
        
        const sorted = enriched.sort((a, b) => {
          if (a.name === 'admin') return 1;
          if (b.name === 'admin') return -1;
          return 0;
        });
        
        setCompaniesData(sorted);
      }

      setLastUpdate(new Date());
      
    } catch (err) {
      console.error('Error loading super admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const totalStats = useMemo(() => {
    const stats = {
      totalCompanies: companiesData.filter(c => c.name !== 'admin').length,
      totalUsers: companiesData.reduce((sum, c) => sum + (c.usersCount || 0), 0),
      totalActiveUsers: companiesData.reduce((sum, c) => sum + (c.activeUsers || 0), 0),
      totalApplications: companiesData.reduce((sum, c) => sum + (c.totalApps || 0), 0),
      totalRevenue: companiesData.reduce((sum, c) => sum + (c.stats?.totalAmount || 0), 0),
      activeCompanies: companiesData.filter(c => c.plan_tier !== 'cancelled' && c.plan_tier !== null && c.name !== 'admin').length,
    };
    
    const conversions = companiesData.filter(c => c.name !== 'admin').map(c => c.stats?.conversionRate || 0);
    stats.averageConversion = conversions.length ? 
      (conversions.reduce((a, b) => a + b, 0) / conversions.length).toFixed(1) : 0;
    
    return stats;
  }, [companiesData]);

  const openMetricModal = (title) => {
    const modalDiv = document.createElement('div');
    modalDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:999999;backdrop-filter:blur(4px);';
    
    modalDiv.innerHTML = `
      <div style="background:white;border-radius:24px;padding:24px;max-width:600px;width:90%;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="font-size:20px;font-weight:bold;">📊 ${escapeHtml(title)}</h3>
          <button class="close-modal" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button>
        </div>
        <button class="close-modal" style="margin-top:20px;width:100%;padding:12px;background:#4A6572;color:white;border:none;border-radius:12px;cursor:pointer;">Закрыть</button>
      </div>
    `;
    
    const closeModal = () => modalDiv.remove();
    modalDiv.querySelectorAll('.close-modal').forEach(btn => {
      btn.onclick = closeModal;
    });
    modalDiv.onclick = (e) => { if (e.target === modalDiv) closeModal(); };
    
    document.body.appendChild(modalDiv);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
        <span className="ml-3 text-gray-500">Загрузка данных всех компаний...</span>
      </div>
    );
  }

  const displayCompanies = companiesData.filter(c => c.name !== 'admin');

  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50">
        
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-[#4A6572]/5 to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-6 h-6 text-[#4A6572]" />
                Панель супер-администратора
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Полная аналитика по всем компаниям в системе
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadAllData}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Обновить"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <div className="text-xs text-gray-400">
                Данные обновлены: {lastUpdate ? lastUpdate.toLocaleString() : new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
        
        {/* KPI Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div 
              onClick={() => openMetricModal('Всего компаний')} 
              className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">🏢 Всего компаний</div>
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-700">{totalStats.totalCompanies}</div>
              <div className="text-xs text-green-600 mt-2">Активных: {totalStats.activeCompanies}</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">👥 Всего пользователей</div>
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-700">{totalStats.totalUsers}</div>
              <div className="text-xs text-blue-600 mt-2">Активных: {totalStats.totalActiveUsers}</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">📋 Всего заявок</div>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-700">{totalStats.totalApplications}</div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">💰 Общая выручка</div>
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-3xl font-bold text-amber-700">{formatNumber(totalStats.totalRevenue)} ₽</div>
            </div>
          </div>
          
          {/* Companies Table */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Список компаний
            </h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200/50 dark:border-gray-700/50">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Компания</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Тариф</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Пользователей</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Заявок</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Выручка</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Конверсия</th>
                  </tr>
                </thead>
                <tbody>
                  {displayCompanies.map(company => (
                    <tr key={company.id} className="border-b border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm font-medium">{company.name || '—'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          company.plan_tier === 'pro' ? 'bg-green-100 text-green-700' :
                          company.plan_tier === 'business' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {company.plan_tier === 'pro' ? 'Профессиональный' :
                           company.plan_tier === 'business' ? 'Бизнес' : 'Базовый'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{company.usersCount}</td>
                      <td className="px-4 py-3 text-sm">{company.totalApps}</td>
                      <td className="px-4 py-3 text-sm">{formatNumber(company.stats?.totalAmount || 0)} ₽</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={company.stats?.conversionRate > 20 ? 'text-green-600' : 'text-yellow-600'}>
                          {company.stats?.conversionRate || 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {displayCompanies.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-500">
                        Нет компаний в системе
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAnalyticsDashboard;