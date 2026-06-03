import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Shield, Users, Building2, DollarSign, TrendingUp, 
  CheckCircle, RefreshCw, Target, CreditCard, Zap, BarChart3,
  Activity, Search, Eye, X, LineChart
} from 'lucide-react';

const formatNumber = (num) => new Intl.NumberFormat('ru-RU').format(num || 0);
const formatDate = (date) => new Date(date).toLocaleDateString('ru-RU');
const formatDateTime = (date) => new Date(date).toLocaleString('ru-RU');

const SuperAdminAnalyticsDashboard = ({ supabase, showNotification }) => {
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    blockedCompanies: 0,
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    companiesByTariff: { basic: 0, pro: 0, enterprise: 0 },
    recentCompanies: [],
    recentUsers: [],
    revenueStats: { monthly: 0, total: 0 }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [chartData, setChartData] = useState([]);

  const loadDashboardData = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    
    try {
      const [companiesRes, usersRes, paymentsRes] = await Promise.all([
        supabase.from('companies').select('*').order('created_at', { ascending: false }),
        supabase.from('company_users').select('*, companies(name)'),
        supabase.from('payments').select('amount, created_at, plan_type')
      ]);
      
      const companies = companiesRes.data || [];
      const users = usersRes.data || [];
      const payments = paymentsRes.data || [];
      
      const activeCompanies = companies.filter(c => !c.is_blocked).length;
      const blockedCompanies = companies.filter(c => c.is_blocked).length;
      const activeUsers = users.filter(u => u.is_active !== false).length;
      const blockedUsers = users.filter(u => u.is_active === false).length;
      
      const companiesByTariff = {
        basic: companies.filter(c => c.plan_tier === 'basic' || !c.plan_tier).length,
        pro: companies.filter(c => c.plan_tier === 'pro').length,
        enterprise: companies.filter(c => c.plan_tier === 'enterprise').length
      };
      
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('ru-RU', { month: 'short' });
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthCompanies = companies.filter(c => {
          const created = new Date(c.created_at);
          return created >= monthStart && created <= monthEnd;
        }).length;
        
        last6Months.push({ month: monthName, companies: monthCompanies });
      }
      setChartData(last6Months);
      
      const recentCompanies = companies.slice(0, 10).map(c => ({
        id: c.id,
        name: c.name,
        plan_tier: c.plan_tier || 'basic',
        users_count: users.filter(u => u.company_id === c.id).length,
        created_at: c.created_at,
        is_blocked: c.is_blocked,
        email: c.email || '—',
        phone: c.phone || '—',
        inn: c.inn || '—'
      }));
      
      const recentUsers = users.slice(0, 10).map(u => ({
        id: u.id,
        full_name: u.full_name || '—',
        email: u.user_id,
        role: u.role,
        company_name: u.companies?.name || '—',
        is_active: u.is_active !== false,
        created_at: u.created_at
      }));
      
      const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const monthlyRevenue = payments
        .filter(p => new Date(p.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      
      setStats({
        totalCompanies: companies.length,
        activeCompanies,
        blockedCompanies,
        totalUsers: users.length,
        activeUsers,
        blockedUsers,
        companiesByTariff,
        recentCompanies,
        recentUsers,
        revenueStats: { monthly: monthlyRevenue, total: totalRevenue }
      });
      
    } catch (err) {
      console.error('Error loading super admin dashboard:', err);
      showNotification?.('Ошибка загрузки данных', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, showNotification]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return stats.recentCompanies;
    return stats.recentCompanies.filter(c => 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stats.recentCompanies, searchTerm]);

  const viewCompanyDetails = async (companyId) => {
    if (!supabase) return;
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      
      const { data: users } = await supabase
        .from('company_users')
        .select('*')
        .eq('company_id', companyId);
      
      setSelectedCompany({
        ...company,
        users: users || [],
        totalUsers: users?.length || 0
      });
      setShowCompanyModal(true);
    } catch (err) {
      console.error('Error loading company details:', err);
      showNotification?.('Ошибка загрузки деталей компании', 'error');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Обзор', icon: BarChart3 },
    { id: 'companies', label: 'Компании', icon: Building2 },
    { id: 'users', label: 'Пользователи', icon: Users },
    { id: 'tariffs', label: 'Тарифы', icon: DollarSign },
    { id: 'revenue', label: 'Финансы', icon: Activity }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw className="w-10 h-10 animate-spin text-[#4A6572]" />
        <span className="ml-4 text-gray-500 text-lg">Загрузка данных...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      {/* Header */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 mb-6">
        <div className="p-6 border-b bg-gradient-to-r from-[#4A6572]/5 to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Панель супер-администратора
                </h1>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                  <span>Управление компаниями, пользователями и тарифами</span>
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                    Обновлено: {formatDateTime(new Date())}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-[#4A6572] text-white rounded-xl hover:bg-[#344955] transition-all flex items-center gap-2 shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              Обновить данные
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="px-4 pt-4 overflow-x-auto">
          <div className="flex flex-wrap gap-1 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-800 text-[#4A6572] dark:text-[#F9AA33] border-b-2 border-[#4A6572] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-3">
                <Building2 className="w-8 h-8 opacity-80" />
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Всего</span>
              </div>
              <div className="text-3xl font-bold">{stats.totalCompanies}</div>
              <div className="text-sm opacity-80 mt-1">компаний в системе</div>
              <div className="flex gap-3 mt-3 text-xs">
                <span className="bg-green-500/30 px-2 py-0.5 rounded">Актив: {stats.activeCompanies}</span>
                <span className="bg-red-500/30 px-2 py-0.5 rounded">Заблок: {stats.blockedCompanies}</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-8 h-8 opacity-80" />
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Всего</span>
              </div>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
              <div className="text-sm opacity-80 mt-1">пользователей</div>
              <div className="flex gap-3 mt-3 text-xs">
                <span className="bg-green-500/30 px-2 py-0.5 rounded">Актив: {stats.activeUsers}</span>
                <span className="bg-red-500/30 px-2 py-0.5 rounded">Заблок: {stats.blockedUsers}</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-center justify-between mb-3">
                <DollarSign className="w-8 h-8 opacity-80" />
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Выручка</span>
              </div>
              <div className="text-3xl font-bold">{formatNumber(stats.revenueStats.total)} ₽</div>
              <div className="text-sm opacity-80 mt-1">за всё время</div>
              <div className="flex gap-2 mt-3 text-xs">
                <span className="bg-emerald-500/30 px-2 py-0.5 rounded">За месяц: {formatNumber(stats.revenueStats.monthly)} ₽</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 border shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <LineChart className="w-5 h-5 text-[#4A6572]" />
              Динамика регистрации компаний по месяцам
            </h3>
            <div className="flex items-end gap-3 h-48">
              {chartData.map((item, idx) => {
                const maxCompanies = Math.max(...chartData.map(d => d.companies), 1);
                const height = (item.companies / maxCompanies) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-lg transition-all" style={{ height: height + '%', minHeight: '4px' }}>
                      <div className="w-full h-full bg-blue-500 rounded-t-lg opacity-70" style={{ height: height + '%' }} />
                    </div>
                    <span className="text-xs text-gray-500">{item.month}</span>
                    <span className="text-xs font-bold text-gray-700">{item.companies}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 border shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#4A6572]" />
              Распределение компаний по тарифам
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2"><span className="text-xl">📦</span> Базовый</span>
                  <span className="font-bold">{stats.companiesByTariff.basic}</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: (stats.companiesByTariff.basic / stats.totalCompanies) * 100 + '%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2"><span className="text-xl">⭐</span> Профессиональный</span>
                  <span className="font-bold">{stats.companiesByTariff.pro}</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: (stats.companiesByTariff.pro / stats.totalCompanies) * 100 + '%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2"><span className="text-xl">🏆</span> Корпоративный</span>
                  <span className="font-bold">{stats.companiesByTariff.enterprise}</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: (stats.companiesByTariff.enterprise / stats.totalCompanies) * 100 + '%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Companies Tab */}
      {activeTab === 'companies' && (
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#4A6572]" />
              Все компании ({stats.totalCompanies})
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск компании..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border rounded-lg w-80 focus:ring-2 focus:ring-[#4A6572] focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Название</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Тариф</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Пользователей</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Статус</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Дата</th>
                  <th className="px-4 py-3 text-left text-sm font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map(company => (
                  <tr key={company.id} className="border-b hover:bg-gray-50 transition-all">
                    <td className="px-4 py-3 text-sm font-medium">{company.name}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        company.plan_tier === 'pro' ? 'bg-green-100 text-green-700' : 
                        company.plan_tier === 'enterprise' ? 'bg-purple-100 text-purple-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {company.plan_tier === 'pro' ? 'Профессиональный' : 
                         company.plan_tier === 'enterprise' ? 'Корпоративный' : 'Базовый'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{company.users_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{company.email}</td>
                    <td className="px-4 py-3 text-sm">
                      {company.is_blocked ? (
                        <span className="text-red-600 text-xs">Заблокирована</span>
                      ) : (
                        <span className="text-green-600 text-xs">Активна</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(company.created_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => viewCompanyDetails(company.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 border shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#4A6572]" />
            Все пользователи ({stats.totalUsers})
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">ФИО</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Роль</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Компания</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Статус</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map(user => (
                  <tr key={user.id} className="border-b hover:bg-gray-50 transition-all">
                    <td className="px-4 py-3 text-sm font-medium">{user.full_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                        {user.role === 'manager' ? 'Руководитель' : 
                         user.role === 'master' ? 'Прораб' :
                         user.role === 'supply_admin' ? 'Снабженец' :
                         user.role === 'client' ? 'Заказчик' : user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.company_name}</td>
                    <td className="px-4 py-3 text-sm">
                      {user.is_active ? (
                        <span className="text-green-600 text-xs">Активен</span>
                      ) : (
                        <span className="text-red-600 text-xs">Заблокирован</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tariffs Tab - Simplified */}
      {activeTab === 'tariffs' && (
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 border shadow-sm">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-[#4A6572]" />
            Тарифные планы
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border rounded-xl p-6 text-center hover:shadow-lg transition-all">
              <div className="text-4xl mb-2">📦</div>
              <h4 className="text-xl font-bold">Базовый</h4>
              <div className="text-3xl font-bold text-[#4A6572] mt-3">990 ₽</div>
              <div className="text-sm text-gray-500">/месяц</div>
              <ul className="mt-4 space-y-2 text-sm text-left">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> До 3 пользователей</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Базовая аналитика</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Складской учёт</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Чат поддержки</li>
              </ul>
            </div>
            
            <div className="border-2 border-[#F9AA33] rounded-xl p-6 text-center hover:shadow-lg transition-all relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#F9AA33] text-white text-xs px-3 py-1 rounded-full font-bold">
                Рекомендуемый
              </div>
              <div className="text-4xl mb-2">⭐</div>
              <h4 className="text-xl font-bold">Профессиональный</h4>
              <div className="text-3xl font-bold text-[#F9AA33] mt-3">2 900 ₽</div>
              <div className="text-sm text-gray-500">/месяц</div>
              <ul className="mt-4 space-y-2 text-sm text-left">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> До 10 пользователей</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Расширенная аналитика</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> API доступ</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Приоритетная поддержка</li>
              </ul>
            </div>
            
            <div className="border rounded-xl p-6 text-center hover:shadow-lg transition-all">
              <div className="text-4xl mb-2">🏆</div>
              <h4 className="text-xl font-bold">Корпоративный</h4>
              <div className="text-2xl font-bold text-purple-600 mt-3">Индивидуально</div>
              <ul className="mt-4 space-y-2 text-sm text-left">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Неограниченно пользователей</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Полная аналитика</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> SLA 24/7</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Кастомная разработка</li>
              </ul>
              <button className="mt-6 w-full py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-sm">
                Связаться
              </button>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Все тарифы включают:</p>
                <p className="text-xs text-amber-700 mt-1">Бесплатное обновление, облачное хранение, SSL шифрование, PWA приложение, офлайн-режим</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 border shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#4A6572]" />
            Финансовая аналитика
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
              <div className="text-sm opacity-80">Общая выручка</div>
              <div className="text-3xl font-bold mt-2">{formatNumber(stats.revenueStats.total)} ₽</div>
              <div className="text-xs opacity-70 mt-1">за всё время</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="text-sm opacity-80">Выручка за месяц</div>
              <div className="text-3xl font-bold mt-2">{formatNumber(stats.revenueStats.monthly)} ₽</div>
              <div className="text-xs opacity-70 mt-1">последние 30 дней</div>
            </div>
          </div>
          
          <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Прогноз на следующий месяц
            </h4>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-sm text-gray-600">Ожидаемая выручка:</span>
              <span className="text-2xl font-bold text-green-600">{formatNumber(stats.revenueStats.monthly * 1.15)} ₽</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">+15% рост</span>
            </div>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: '15%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Company Details Modal */}
      {showCompanyModal && selectedCompany && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100000] overflow-y-auto" onClick={() => setShowCompanyModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-5 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{selectedCompany.name}</h3>
                <p className="text-sm text-gray-500">ID: {selectedCompany.id}</p>
              </div>
              <button onClick={() => setShowCompanyModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedCompany.totalUsers}</div>
                  <div className="text-xs text-gray-600">Пользователей</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {selectedCompany.plan_tier === 'pro' ? 'Pro' : selectedCompany.plan_tier === 'enterprise' ? 'Enterprise' : 'Basic'}
                  </div>
                  <div className="text-xs text-gray-600">Тариф</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Список пользователей
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedCompany.users?.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{user.full_name || '—'}</div>
                        <div className="text-xs text-gray-500">{user.role}</div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${user.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.is_active !== false ? 'Активен' : 'Заблокирован'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminAnalyticsDashboard;