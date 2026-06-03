// src/components/SuperAdminAnalyticsDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Eye, TrendingUp, Users, Building2, DollarSign } from 'lucide-react';

const formatNumber = (num) => new Intl.NumberFormat('ru-RU').format(num || 0);

// Функция для экранирования HTML (должна быть определена ДО использования)
const escapeHtml = (str) => {
  if (!str) return '—';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Вспомогательные функции (определены ДО использования)
function calculateCompanyStats(applications) {
  if (!applications || applications.length === 0) {
    return { totalAmount: 0, conversionRate: 0 };
  }
  const totalAmount = applications.reduce((sum, app) => sum + (app.total_amount || 0), 0);
  const completedApps = applications.filter(app => app.status === 'received').length;
  const conversionRate = applications.length > 0 ? Math.round((completedApps / applications.length) * 100) : 0;
  return { totalAmount, conversionRate };
}

function getRoleLabelLocal(role) {
  const roles = {
    'super_admin': 'Супер-админ',
    'manager': 'Руководитель',
    'master': 'Прораб',
    'foreman': 'Мастер',
    'supply_admin': 'Снабженец',
    'client': 'Заказчик',
    'accountant': 'Бухгалтер'
  };
  return roles[role] || role;
}

const SuperAdminAnalyticsDashboard = ({ supabase }) => {
  const [companiesData, setCompaniesData] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка полных данных по всем компаниям
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        // Получаем все компании с их тарифами
        const { data: companies } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false });

        if (companies && companies.length > 0) {
          const enriched = await Promise.all(companies.map(async (company) => {
            // Получаем пользователей компании
            const { data: users } = await supabase
              .from('company_users')
              .select('id, user_id, full_name, role, is_active')
              .eq('company_id', company.id);
            
            // Получаем заявки компании
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
          setCompaniesData(enriched);
        }

        // Получаем всех пользователей системы
        const { data: users } = await supabase
          .from('company_users')
          .select('*, companies(name)')
          .limit(200);
        
        if (users) setAllUsers(users);
        
      } catch (err) {
        console.error('Error loading super admin data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAllData();
  }, [supabase]);

  // Полная статистика по ВСЕМ компаниям
  const totalStats = useMemo(() => {
    const stats = {
      totalCompanies: companiesData.length,
      totalUsers: companiesData.reduce((sum, c) => sum + (c.usersCount || 0), 0),
      totalActiveUsers: companiesData.reduce((sum, c) => sum + (c.activeUsers || 0), 0),
      totalApplications: companiesData.reduce((sum, c) => sum + (c.totalApps || 0), 0),
      totalRevenue: companiesData.reduce((sum, c) => sum + (c.stats?.totalAmount || 0), 0),
      activeCompanies: companiesData.filter(c => c.plan_tier !== 'cancelled' && c.plan_tier !== null).length,
    };
    
    const conversions = companiesData.map(c => c.stats?.conversionRate || 0);
    stats.averageConversion = conversions.length ? 
      (conversions.reduce((a, b) => a + b, 0) / conversions.length).toFixed(1) : 0;
    
    return stats;
  }, [companiesData]);

  // Функция открытия модалки для суперадмина
  const openMetricModal = (title, type) => {
    const modalDiv = document.createElement('div');
    modalDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;z-index:999999;backdrop-filter:blur(4px);';
    
    let content = '';
    
    if (type === 'companies') {
      content = `
        <div style="background:white;border-radius:24px;padding:24px;max-width:900px;width:90%;max-height:85vh;overflow-y:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="font-size:24px;font-weight:bold;">🏢 Все компании (${companiesData.length})</h3>
            <button class="close-modal" style="background:none;border:none;font-size:28px;cursor:pointer;">&times;</button>
          </div>
          <div style="display:grid;gap:12px;">
            ${companiesData.map(c => `
              <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;cursor:pointer;transition:all 0.2s;" 
                   onmouseover="this.style.backgroundColor='#f9fafb'" 
                   onmouseout="this.style.backgroundColor='white'"
                   onclick="window.__viewCompanyDetails('${c.id}')">
                <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px;">
                  <div style="flex:1;">
                    <div style="font-weight:bold;font-size:16px;">${escapeHtml(c.name || '—')}</div>
                    <div style="font-size:13px;color:#6b7280;margin-top:4px;">
                      👥 ${c.usersCount} пользователей • 
                      📋 ${c.totalApps} заявок • 
                      💰 ${formatNumber(c.stats?.totalAmount || 0)} ₽
                    </div>
                  </div>
                  <div style="display:flex;gap:8px;">
                    <span style="font-size:12px;padding:4px 8px;background:${c.plan_tier === 'pro' ? '#e8f5e9' : c.plan_tier === 'business' ? '#e3f2fd' : '#f5f5f5'};border-radius:8px;">
                      ${c.plan_tier === 'pro' ? 'Профессиональный' : c.plan_tier === 'business' ? 'Бизнес' : 'Базовый'}
                    </span>
                    ${c.is_blocked ? '<span style="font-size:12px;padding:4px 8px;background:#ffebee;color:#c62828;border-radius:8px;">🔒 Заблокирована</span>' : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (type === 'users') {
      content = `
        <div style="background:white;border-radius:24px;padding:24px;max-width:1000px;width:90%;max-height:85vh;overflow-y:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h3 style="font-size:24px;font-weight:bold;">👥 Все пользователи (${totalStats.totalUsers})</h3>
            <button class="close-modal" style="background:none;border:none;font-size:28px;cursor:pointer;">&times;</button>
          </div>
          <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="background:#f3f4f6;">
                  <th style="text-align:left;padding:12px;">Пользователь</th>
                  <th style="text-align:left;padding:12px;">Email</th>
                  <th style="text-align:left;padding:12px;">Компания</th>
                  <th style="text-align:left;padding:12px;">Роль</th>
                  <th style="text-align:left;padding:12px;">Статус</th>
                </tr>
              </thead>
              <tbody>
                ${allUsers.map(u => `
                  <tr style="border-bottom:1px solid #e5e7eb;">
                    <td style="padding:12px;">${escapeHtml(u.full_name || '—')}</td>
                    <td style="padding:12px;">${escapeHtml(u.user_id || '—')}</td>
                    <td style="padding:12px;">${escapeHtml(u.companies?.name || '—')}</td>
                    <td style="padding:12px;">${getRoleLabelLocal(u.role)}</td>
                    <td style="padding:12px;">
                      <span style="padding:2px 8px;border-radius:12px;background:${u.is_active !== false ? '#e8f5e9' : '#ffebee'};color:${u.is_active !== false ? '#2e7d32' : '#c62828'};font-size:12px;">
                        ${u.is_active !== false ? 'Активен' : 'Заблокирован'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      content = `
        <div style="background:white;border-radius:24px;padding:24px;max-width:600px;width:90%;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-size:20px;font-weight:bold;">📊 ${escapeHtml(title)}</h3>
            <button class="close-modal" style="background:none;border:none;font-size:24px;cursor:pointer;">&times;</button>
          </div>
          <button class="close-modal" style="margin-top:20px;width:100%;padding:12px;background:#4A6572;color:white;border:none;border-radius:12px;cursor:pointer;">Закрыть</button>
        </div>
      `;
    }
    
    modalDiv.innerHTML = content;
    
    const closeModal = () => modalDiv.remove();
    modalDiv.querySelectorAll('.close-modal').forEach(btn => {
      btn.onclick = closeModal;
    });
    modalDiv.onclick = (e) => { if (e.target === modalDiv) closeModal(); };
    
    // Добавляем глобальную функцию для просмотра компании
    window.__viewCompanyDetails = (companyId) => {
      const company = companiesData.find(c => c.id === companyId);
      if (company) {
        closeModal();
        alert(`Компания: ${company.name}\nПользователей: ${company.usersCount}\nЗаявок: ${company.totalApps}\nТариф: ${company.plan_tier}`);
      }
    };
    
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

  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50">
        
        {/* Заголовок */}
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
            <div className="text-right">
              <div className="text-xs text-gray-400">
                Данные обновлены: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Глобальные KPI */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div 
              onClick={() => openMetricModal('Всего компаний', 'companies')} 
              className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">🏢 Всего компаний</div>
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-700">{totalStats.totalCompanies}</div>
              <div className="text-xs text-green-600 mt-2">Активных: {totalStats.activeCompanies}</div>
            </div>
            
            <div 
              onClick={() => openMetricModal('Всего пользователей', 'users')} 
              className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
            >
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
          
          {/* Таблица компаний */}
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {companiesData.map(company => (
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
                      <td className="px-4 py-3">
                        <button 
                          onClick={() => openMetricModal(company.name, 'company_detail')}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                       </td>
                    </tr>
                  ))}
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