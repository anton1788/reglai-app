import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Users, Building2, DollarSign, TrendingUp, Package, 
  CheckCircle, AlertCircle, Clock, RefreshCw, Target, Gift,
  BarChart3, UserPlus, Settings, CreditCard, Zap
} from 'lucide-react';

const SuperAdminAnalyticsDashboard = ({ supabase, showNotification }) => {
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalApplications: 0,
    companiesByTariff: { basic: 0, pro: 0, enterprise: 0 },
    recentCompanies: [],
    tariffStats: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const loadDashboardData = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    
    try {
      // Загрузка компаний
      const { data: companies } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Загрузка пользователей
      const { data: companyUsers } = await supabase
        .from('company_users')
        .select('*');
      
      // Загрузка заявок (только количество, без сумм)
      const { data: applications } = await supabase
        .from('applications')
        .select('id, company_id, status');
      
      // Статистика по компаниям
      const companiesByTariff = {
        basic: companies?.filter(c => c.plan_tier === 'basic' || !c.plan_tier).length || 0,
        pro: companies?.filter(c => c.plan_tier === 'pro').length || 0,
        enterprise: companies?.filter(c => c.plan_tier === 'enterprise').length || 0
      };
      
      const activeCompanies = companies?.filter(c => !c.is_blocked).length || 0;
      
      // Статистика по пользователям
      const activeUsers = companyUsers?.filter(u => u.is_active !== false).length || 0;
      
      // Статистика по заявкам (только количество)
      const applicationsByStatus = {
        pending: applications?.filter(a => a.status === 'pending').length || 0,
        in_progress: applications?.filter(a => a.status === 'in_progress').length || 0,
        completed: applications?.filter(a => a.status === 'received').length || 0,
        cancelled: applications?.filter(a => a.status === 'canceled').length || 0
      };
      
      // Последние компании
      const recentCompanies = companies?.slice(0, 5).map(c => ({
        id: c.id,
        name: c.name,
        plan_tier: c.plan_tier || 'basic',
        users_count: companyUsers?.filter(u => u.company_id === c.id).length || 0,
        created_at: c.created_at,
        is_blocked: c.is_blocked
      })) || [];
      
      // Статистика по тарифам
      const tariffStats = {
        basic: { price: 990, period: 'месяц', features: ['До 3 пользователей', '100 заявок/мес', 'Базовая аналитика'] },
        pro: { price: 2900, period: 'месяц', features: ['До 10 пользователей', '1000 заявок/мес', 'Расширенная аналитика', 'API доступ'] },
        enterprise: { price: 'Индивидуально', period: '', features: ['Неограниченно', 'Персональная поддержка', 'Кастомная разработка'] }
      };
      
      setStats({
        totalCompanies: companies?.length || 0,
        activeCompanies,
        totalUsers: companyUsers?.length || 0,
        activeUsers,
        totalApplications: applications?.length || 0,
        applicationsByStatus,
        companiesByTariff,
        recentCompanies,
        tariffStats
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

  const tabs = [
    { id: 'overview', label: '📊 Обзор', icon: BarChart3 },
    { id: 'companies', label: '🏢 Компании', icon: Building2 },
    { id: 'users', label: '👥 Пользователи', icon: Users },
    { id: 'tariffs', label: '💰 Тарифы', icon: DollarSign },
    { id: 'analytics', label: '📈 Аналитика', icon: TrendingUp }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-[#4A6572]" />
        <span className="ml-3 text-gray-500">Загрузка данных...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      {/* Заголовок */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 mb-6">
        <div className="p-6 border-b bg-gradient-to-r from-[#4A6572]/5 to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                  <Shield className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Панель супер-администратора
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Управление системой, компаниями и тарифами
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={loadDashboardData}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Обновить"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Вкладки */}
        <div className="px-4 pt-4">
          <div className="flex flex-wrap gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-800 text-[#4A6572] dark:text-[#F9AA33] border-b-2 border-[#4A6572]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Вкладка Обзор */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Карточки */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">🏢 Всего компаний</div>
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-700">{stats.totalCompanies}</div>
              <div className="text-xs text-green-600 mt-2">Активных: {stats.activeCompanies}</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">👥 Всего пользователей</div>
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-700">{stats.totalUsers}</div>
              <div className="text-xs text-blue-600 mt-2">Активных: {stats.activeUsers}</div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">📋 Всего заявок</div>
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-purple-700">{stats.totalApplications}</div>
              <div className="text-xs text-gray-500 mt-2">по всем компаниям</div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-600">💰 Тарифов</div>
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-3xl font-bold text-amber-700">3</div>
              <div className="text-xs text-gray-500 mt-2">Базовый, Pro, Enterprise</div>
            </div>
          </div>
          
          {/* Распределение по тарифам */}
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#4A6572]" />
              Распределение компаний по тарифам
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>📦 Базовый</span>
                  <span>{stats.companiesByTariff.basic} компаний</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stats.totalCompanies > 0 ? (stats.companiesByTariff.basic / stats.totalCompanies) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>⭐ Профессиональный</span>
                  <span>{stats.companiesByTariff.pro} компаний</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.totalCompanies > 0 ? (stats.companiesByTariff.pro / stats.totalCompanies) * 100 : 0}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>🏆 Корпоративный</span>
                  <span>{stats.companiesByTariff.enterprise} компаний</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${stats.totalCompanies > 0 ? (stats.companiesByTariff.enterprise / stats.totalCompanies) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Последние компании */}
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#4A6572]" />
              Последние компании
            </h3>
            <div className="space-y-2">
              {stats.recentCompanies.map(company => (
                <div key={company.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <div>
                    <div className="font-medium">{company.name}</div>
                    <div className="text-xs text-gray-500">
                      👥 {company.users_count} пользователей • Тариф: {company.plan_tier === 'pro' ? 'Профессиональный' : company.plan_tier === 'enterprise' ? 'Корпоративный' : 'Базовый'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(company.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Вкладка Тарифы */}
      {activeTab === 'tariffs' && (
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 border">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#4A6572]" />
            Тарифные планы Реглай
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Базовый тариф */}
            <div className="border rounded-xl p-5 hover:shadow-lg transition-all">
              <div className="text-center mb-4">
                <div className="text-2xl font-bold">📦</div>
                <h4 className="text-lg font-bold mt-2">Базовый</h4>
                <div className="text-2xl font-bold text-[#4A6572] mt-2">990 ₽</div>
                <div className="text-xs text-gray-500">/месяц</div>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> До 3 пользователей</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 100 заявок в месяц</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Базовая аналитика</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Складской учёт</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Чат поддержки</li>
              </ul>
            </div>
            
            {/* Профессиональный тариф */}
            <div className="border-2 border-[#F9AA33] rounded-xl p-5 hover:shadow-lg transition-all relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#F9AA33] text-white text-xs px-3 py-1 rounded-full">
                🔥 Рекомендуемый
              </div>
              <div className="text-center mb-4">
                <div className="text-2xl font-bold">⭐</div>
                <h4 className="text-lg font-bold mt-2">Профессиональный</h4>
                <div className="text-2xl font-bold text-[#F9AA33] mt-2">2 900 ₽</div>
                <div className="text-xs text-gray-500">/месяц</div>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> До 10 пользователей</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 1 000 заявок в месяц</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Расширенная аналитика</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> API доступ</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Приоритетная поддержка</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Интеграции</li>
              </ul>
              <div className="mt-4 pt-3 border-t text-center">
                <span className="text-xs text-green-600">Экономия 40% при оплате за год</span>
              </div>
            </div>
            
            {/* Корпоративный тариф */}
            <div className="border rounded-xl p-5 hover:shadow-lg transition-all">
              <div className="text-center mb-4">
                <div className="text-2xl font-bold">🏆</div>
                <h4 className="text-lg font-bold mt-2">Корпоративный</h4>
                <div className="text-xl font-bold text-purple-600 mt-2">Индивидуально</div>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Неограниченно пользователей</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Неограниченно заявок</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Полная аналитика</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Выделенный API</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> SLA 24/7</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Кастомная разработка</li>
              </ul>
              <button className="mt-4 w-full py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg text-sm">
                Связаться с нами
              </button>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  💡 Все тарифы включают:
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Бесплатное обновление, облачное хранение данных, SSL шифрование, 
                  резервное копирование, PWA приложение, офлайн-режим
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Вкладка Компании */}
      {activeTab === 'companies' && (
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 border">
          <h3 className="text-lg font-semibold mb-4">Управление компаниями</h3>
          <p className="text-gray-500 text-sm">Полный список компаний доступен в разделе "Список компаний"</p>
        </div>
      )}
      
      {/* Вкладка Пользователи */}
      {activeTab === 'users' && (
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 border">
          <h3 className="text-lg font-semibold mb-4">Управление пользователями</h3>
          <p className="text-gray-500 text-sm">Полный список пользователей доступен в разделе "Список пользователей"</p>
        </div>
      )}
      
      {/* Вкладка Аналитика */}
      {activeTab === 'analytics' && (
        <div className="bg-white/90 dark:bg-gray-800/90 rounded-xl p-6 border">
          <h3 className="text-lg font-semibold mb-4">Системная аналитика</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalApplications}</div>
              <div className="text-sm text-gray-600">Всего заявок</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{stats.applicationsByStatus?.completed || 0}</div>
              <div className="text-sm text-gray-600">Выполнено</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminAnalyticsDashboard;