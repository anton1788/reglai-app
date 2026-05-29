import { useState, useEffect, useCallback } from 'react';
import { loadClients, loadClientStats, updateClientStatus, removeClient } from '../utils/clientManager';

export function useClientManager(companyId) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientStats, setClientStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  console.log('🔵 useClientManager вызван, companyId:', companyId);

  // Загрузка клиентов
  const refreshClients = useCallback(async () => {
    console.log('🔄 refreshClients начал работу, companyId:', companyId);
    
    if (!companyId) {
      console.log('❌ Нет companyId, устанавливаем loading=false');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log('📡 Вызываем loadClients...');
      const data = await loadClients(companyId);
      console.log('✅ loadClients вернул:', data);
      setClients(data || []);
    } catch (error) {
      console.error('❌ Ошибка загрузки клиентов:', error);
      setClients([]);
    } finally {
      console.log('🏁 Устанавливаем loading=false');
      setLoading(false);
    }
  }, [companyId]);

  // ✅ ВОТ ЭТОТ useEffect НУЖНО ДОБАВИТЬ
  useEffect(() => {
    console.log('🔵 useEffect сработал, companyId:', companyId);
    refreshClients();
  }, [companyId, refreshClients]);

  // Загрузка статистики для клиента
  const loadStatsForClient = useCallback(async (clientId) => {
    if (!companyId || !clientId) return;
    try {
      const stats = await loadClientStats(companyId, clientId);
      setClientStats(prev => ({ ...prev, [clientId]: stats }));
      return stats;
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      return null;
    }
  }, [companyId]);

  // Загрузка статистики для всех клиентов
  useEffect(() => {
    if (clients.length > 0) {
      console.log('📊 Загрузка статистики для', clients.length, 'клиентов');
      clients.forEach(client => {
        loadStatsForClient(client.id);
      });
    }
  }, [clients, loadStatsForClient]);

  // Обновление статуса клиента
  const toggleClientStatus = useCallback(async (clientId, isActive) => {
    try {
      await updateClientStatus(clientId, isActive);
      setClients(prev => prev.map(client =>
        client.id === clientId
          ? { ...client, is_active: isActive, updated_at: new Date().toISOString() }
          : client
      ));
      return true;
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      return false;
    }
  }, []);

  // Удаление клиента
  const deleteClient = useCallback(async (clientId) => {
    try {
      await removeClient(clientId);
      setClients(prev => prev.filter(client => client.id !== clientId));
      setClientStats(prev => {
        const newStats = { ...prev };
        delete newStats[clientId];
        return newStats;
      });
      return true;
    } catch (error) {
      console.error('Ошибка удаления клиента:', error);
      return false;
    }
  }, []);

  // Фильтрация клиентов
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         client.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && client.is_active) ||
                         (statusFilter === 'inactive' && !client.is_active);
    return matchesSearch && matchesStatus;
  });

  console.log('📤 useClientManager возвращает:', {
    clientsCount: filteredClients.length,
    loading,
    hasCompanyId: !!companyId
  });

  return {
    clients: filteredClients,
    allClients: clients,
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
  };
}