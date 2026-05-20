// ⬇️ УДАЛИТЬ useState из импорта (не используется)
import React from 'react';
import { Search, Users, Filter, UserPlus, RefreshCw, Activity, Building, Calendar, Package } from 'lucide-react';
import { useClientManager } from '../../hooks/useClientManager';
import { ClientCard } from './ClientCard';
import { ClientDetailsModal } from './ClientDetailsModal';

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

  // Агрегированная статистика
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

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A6572]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-[#4A6572]" />
            Управление клиентами
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Управление заказчиками, отслеживание активности и заявок
          </p>
        </div>
        <button
          onClick={onInviteClick}
          className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-md transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Пригласить заказчика
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{aggregatedStats.totalClients}</p>
              <p className="text-xs text-gray-500">Всего клиентов</p>
            </div>
            <Users className="w-8 h-8 text-[#4A6572] opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-600">{aggregatedStats.activeClients}</p>
              <p className="text-xs text-gray-500">Активных</p>
            </div>
            <Activity className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{aggregatedStats.totalApplications}</p>
              <p className="text-xs text-gray-500">Всего заявок</p>
            </div>
            <Package className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{aggregatedStats.activeApplications}</p>
              <p className="text-xs text-gray-500">В работе</p>
            </div>
            <Building className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по имени, email или телефону..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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

      {/* Список клиентов */}
      {clients.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Ничего не найдено' : 'Нет приглашённых заказчиков'}
          </p>
          {!searchTerm && (
            <button
              onClick={onInviteClick}
              className="mt-4 px-4 py-2 text-[#4A6572] hover:text-[#344955] font-medium"
            >
              + Пригласить заказчика
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              stats={clientStats[client.id]}
              onView={handleViewClient}
              onToggleStatus={toggleClientStatus}
              onDelete={deleteClient}
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
    </div>
  );
};