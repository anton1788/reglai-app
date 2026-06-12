import React, { useState } from 'react';
import { Search, Users, Filter, UserPlus, RefreshCw, Activity, Building, Calendar, Package, TrendingUp, DollarSign, X } from 'lucide-react';
import { useClientManager } from '../../hooks/useClientManager';
import { ClientCard } from './ClientCard';
import { ClientDetailsModal } from './ClientDetailsModal';
import { ClientAnalytics } from './ClientAnalytics';

export const ClientManager = ({ companyId, t, onInviteClick }) => {
  const {
    clients,
    loading,
    selectedClient,
    setSelectedClient,
    clientStats,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    refreshClients,
    loadStatsForClient,
    toggleClientStatus,
    deleteClient
  } = useClientManager(companyId);

  const [selectedClientForAnalytics, setSelectedClientForAnalytics] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFilters, setShowFilters] = useState(false);

  // Отслеживание мобильного устройства
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const aggregatedStats = clients.reduce((acc, client) => {
    const stats = clientStats[client.id] || {};
    acc.totalClients++;
    if (client.is_active) acc.activeClients++;
    acc.totalApplications += stats.totalApplications || 0;
    acc.activeApplications += stats.activeApplications || 0;
    acc.totalAmount += stats.totalAmount || 0;
    return acc;
  }, {
    totalClients: 0,
    activeClients: 0,
    totalApplications: 0,
    activeApplications: 0,
    totalAmount: 0
  });

  const handleViewClient = (client) => {
    setSelectedClient(client);
    loadStatsForClient(client.id);
  };

  const handleViewAnalytics = (client) => {
    setSelectedClientForAnalytics(client);
  };

  const handleStatClick = (type) => {
    switch(type) {
      case 'all':
        setStatusFilter('all');
        setSearchTerm('');
        break;
      case 'active':
        setStatusFilter('active');
        setSearchTerm('');
        break;
      default:
        break;
    }
    if (isMobile) setShowFilters(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setShowFilters(false);
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all';
  const activeFiltersCount = (searchTerm ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A6572]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 page-enter">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[#4A6572]" />
            Управление клиентами
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
            Управление заказчиками, отслеживание активности и заявок
          </p>
        </div>
        <button
          onClick={onInviteClick}
          className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-md transition-all flex items-center justify-center gap-2 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Пригласить заказчика</span>
        </button>
      </div>

      {/* Статистика - адаптивная сетка */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button
          onClick={() => handleStatClick('all')}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all text-left active:scale-95"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {aggregatedStats.totalClients}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500">Всего клиентов</p>
            </div>
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-[#4A6572] opacity-50" />
          </div>
        </button>
        
        <button
          onClick={() => handleStatClick('active')}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all text-left active:scale-95"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {aggregatedStats.activeClients}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500">Активных</p>
            </div>
            <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 opacity-50" />
          </div>
        </button>
        
        <button
          className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50 text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">
                {aggregatedStats.totalApplications}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500">Всего заявок</p>
            </div>
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 opacity-50" />
          </div>
        </button>
        
        <button
          className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50 text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">
                {aggregatedStats.activeApplications}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500">В работе</p>
            </div>
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 opacity-50" />
          </div>
        </button>
      </div>

      {/* Общая сумма */}
      {aggregatedStats.totalAmount > 0 && (
        <div className="mb-4 sm:mb-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-3 sm:p-4 border border-green-200/50 dark:border-green-800/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Общая сумма всех заявок:</span>
            </div>
            <span className="text-base sm:text-xl font-bold text-green-600">
              {aggregatedStats.totalAmount.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      )}

      {/* Фильтры и поиск - мобильная версия */}
      <div className="mb-4 sm:mb-6">
        {isMobile && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 w-full py-2 mb-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm"
          >
            <Filter className="w-4 h-4" />
            Фильтры и поиск
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-[#4A6572] text-white rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
        )}
        
        {(showFilters || !isMobile) && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по имени, email или телефону..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 hidden sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Все клиенты</option>
                <option value="active">Активные</option>
                <option value="inactive">Заблокированные</option>
              </select>
              <button
                onClick={refreshClients}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Обновить"
              >
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}
        
        {hasActiveFilters && isMobile && showFilters && (
          <button
            onClick={clearFilters}
            className="mt-2 text-xs text-red-600 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Сбросить фильтры
          </button>
        )}
      </div>

      {/* Список клиентов */}
      {clients.length === 0 ? (
        <div className="text-center py-12 sm:py-16 bg-white dark:bg-gray-800 rounded-xl">
          <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            {searchTerm ? 'Ничего не найдено' : 'Нет приглашённых заказчиков'}
          </p>
          {!searchTerm && (
            <button
              onClick={onInviteClick}
              className="mt-3 sm:mt-4 px-3 py-1.5 sm:px-4 sm:py-2 text-sm text-[#4A6572] hover:text-[#344955] font-medium"
            >
              + Пригласить заказчика
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {clients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              stats={clientStats[client.id]}
              onView={handleViewClient}
              onToggleStatus={toggleClientStatus}
              onDelete={deleteClient}
              onViewAnalytics={handleViewAnalytics}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Модальное окно с деталями */}
      <ClientDetailsModal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        client={selectedClient}
        companyId={companyId}
      />

      {/* Аналитика клиента */}
      {selectedClientForAnalytics && (
        <ClientAnalytics
          clientId={selectedClientForAnalytics.id}
          companyId={companyId}
          clientName={selectedClientForAnalytics.full_name}
          onClose={() => setSelectedClientForAnalytics(null)}
        />
      )}
    </div>
  );
};