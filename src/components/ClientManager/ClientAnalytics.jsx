// src/components/ClientManager/ClientAnalytics.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  X, Calendar, DollarSign, FileText, CheckCircle, Clock, 
  AlertCircle, TrendingUp, TrendingDown, Package, Building,
  Download, Printer, Eye, BarChart3, PieChart, CreditCard,
  FileCheck, FileX, Plus, Minus, History, Maximize2, Minimize2,
  User, Phone, Mail, MapPin, Briefcase, Calendar as CalendarIcon,
  ChevronRight, ExternalLink, Layers, ShoppingBag, Truck,
  Edit, Trash2, MoreVertical, Filter, Search, ArrowUpDown,
  FolderOpen
} from 'lucide-react';

// Импорт UnifiedDocumentManager и FullscreenModal
import { UnifiedDocumentManager } from '../DocumentManager/UnifiedDocumentManager';
import { FullscreenModal } from '../ui/FullscreenModal';

// Вспомогательные функции
const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatCurrency = (amount) => {
  if (!amount) return '0 ₽';
  return amount.toLocaleString('ru-RU') + ' ₽';
};

const formatNumber = (num) => {
  if (!num) return '0';
  return num.toLocaleString('ru-RU');
};

const getStatusBadge = (status) => {
  const statuses = {
    active: { text: 'Активен', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    completed: { text: 'Завершён', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    suspended: { text: 'Приостановлен', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    closed: { text: 'Закрыт', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400' }
  };
  const s = statuses[status] || statuses.active;
  return <span className={`px-2 py-0.5 text-xs rounded-full ${s.color}`}>{s.text}</span>;
};

const getApplicationStatusBadge = (status) => {
  const statusMap = {
    pending: { text: 'Ожидает', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    partial: { text: 'Частично', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    received: { text: 'Выполнена', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    canceled: { text: 'Отменена', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    admin_processing: { text: 'В обработке', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    pending_approval: { text: 'На согласовании', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' }
  };
  const s = statusMap[status] || { text: status || 'Неизвестно', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400' };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${s.color}`}>{s.text}</span>;
};

export const ClientAnalytics = ({ clientId, companyId, clientName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedContract, setSelectedContract] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [applicationFilter, setApplicationFilter] = useState('all');
  const [contractSortBy, setContractSortBy] = useState('totalAmount');
  const [contractSortOrder, setContractSortOrder] = useState('desc');
  const [applicationSortBy, setApplicationSortBy] = useState('created_at');
  const [applicationSortOrder, setApplicationSortOrder] = useState('desc');
  
  // Состояние для UnifiedDocumentManager
  const [showUnifiedDocs, setShowUnifiedDocs] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const getPeriodLabel = useCallback(() => {
    switch(selectedPeriod) {
      case 'month': return 'за последний месяц';
      case 'quarter': return 'за последний квартал';
      case 'year': return 'за последний год';
      default: return 'за всё время';
    }
  }, [selectedPeriod]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Загружаем заявки
      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select('*')
        .eq('company_id', companyId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      let filteredApps = apps || [];
      if (selectedPeriod !== 'all') {
        const now = new Date();
        let startDate = new Date();
        switch (selectedPeriod) {
          case 'month': startDate.setMonth(now.getMonth() - 1); break;
          case 'quarter': startDate.setMonth(now.getMonth() - 3); break;
          case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
          default: break;
        }
        filteredApps = apps.filter(a => new Date(a.created_at) >= startDate);
      }

      // Фильтрация по поиску
      if (searchTerm) {
        filteredApps = filteredApps.filter(a => 
          a.object_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.id?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Фильтрация по статусу
      if (applicationFilter !== 'all') {
        filteredApps = filteredApps.filter(a => a.status === applicationFilter);
      }

      // Сортировка заявок
      const sortedApps = [...filteredApps].sort((a, b) => {
        let aVal = a[applicationSortBy];
        let bVal = b[applicationSortBy];
        if (applicationSortBy === 'total_amount') {
          aVal = a.total_amount || 0;
          bVal = b.total_amount || 0;
        }
        if (applicationSortBy === 'created_at') {
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
        }
        if (aVal < bVal) return applicationSortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return applicationSortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      setApplications(sortedApps);

      // Формируем контракты
      const contractsMap = new Map();
      filteredApps.forEach(app => {
        const key = app.object_name || 'Без объекта';
        if (!contractsMap.has(key)) {
          contractsMap.set(key, {
            id: key,
            objectName: app.object_name || 'Без объекта',
            totalAmount: 0,
            applications: [],
            status: 'active',
            startDate: app.created_at,
            lastActivity: app.created_at,
            completedCount: 0,
            pendingCount: 0,
            canceledCount: 0,
            totalMaterials: 0
          });
        }
        const contract = contractsMap.get(key);
        contract.totalAmount += app.total_amount || 0;
        contract.applications.push(app);
        contract.totalMaterials += app.materials?.length || 0;
        if (app.status === 'received') contract.completedCount++;
        if (['pending', 'partial', 'admin_processing'].includes(app.status)) contract.pendingCount++;
        if (app.status === 'canceled') contract.canceledCount++;
        if (new Date(app.created_at) < new Date(contract.startDate)) contract.startDate = app.created_at;
        if (new Date(app.created_at) > new Date(contract.lastActivity)) contract.lastActivity = app.created_at;
      });

      let contractsList = Array.from(contractsMap.values());
      
      // Сортировка контрактов
      contractsList.sort((a, b) => {
        let aVal = a[contractSortBy];
        let bVal = b[contractSortBy];
        if (contractSortBy === 'totalAmount') {
          aVal = a.totalAmount;
          bVal = b.totalAmount;
        }
        if (contractSortBy === 'applicationsCount') {
          aVal = a.applications.length;
          bVal = b.applications.length;
        }
        if (aVal < bVal) return contractSortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return contractSortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      setContracts(contractsList);

      // Статистика
      const totalAmount = filteredApps.reduce((sum, a) => sum + (a.total_amount || 0), 0);
      const completedAmount = filteredApps.filter(a => a.status === 'received').reduce((sum, a) => sum + (a.total_amount || 0), 0);
      const pendingAmount = filteredApps.filter(a => ['pending', 'partial', 'admin_processing'].includes(a.status)).reduce((sum, a) => sum + (a.total_amount || 0), 0);
      
      setStats({
        totalApplications: filteredApps.length,
        totalAmount,
        completedAmount,
        pendingAmount,
        averageAmount: filteredApps.length > 0 ? totalAmount / filteredApps.length : 0,
        uniqueObjects: new Set(filteredApps.map(a => a.object_name).filter(Boolean)).size,
        totalMaterials: filteredApps.reduce((sum, a) => sum + (a.materials?.length || 0), 0),
        completedCount: filteredApps.filter(a => a.status === 'received').length,
        pendingCount: filteredApps.filter(a => ['pending', 'partial', 'admin_processing'].includes(a.status)).length,
        canceledCount: filteredApps.filter(a => a.status === 'canceled').length
      });

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId, selectedPeriod, searchTerm, applicationFilter, contractSortBy, contractSortOrder, applicationSortBy, applicationSortOrder]);

  useEffect(() => {
    if (clientId && companyId) {
      loadData();
    }
  }, [clientId, companyId, selectedPeriod, searchTerm, applicationFilter, contractSortBy, contractSortOrder, applicationSortBy, applicationSortOrder, loadData]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 flex items-center gap-4 shadow-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6572]"></div>
          <span className="text-lg">Загрузка аналитики...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <FullscreenModal 
        isOpen={true} 
        onClose={onClose} 
        title={`Аналитика клиента: ${clientName || 'Клиент'}`}
        showCloseButton={true}
      >
        <div className="p-6 space-y-6">
          
          {/* Фильтр по периоду */}
          <div className="flex flex-wrap gap-2 justify-end">
            {[
              { key: 'all', label: 'Всё время' },
              { key: 'month', label: 'Месяц' },
              { key: 'quarter', label: 'Квартал' },
              { key: 'year', label: 'Год' }
            ].map(period => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  selectedPeriod === period.key 
                    ? 'bg-[#4A6572] text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Карточки статистики */}
          {stats && (
            <>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200/50 hover:shadow-lg transition-shadow cursor-pointer w-full">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200/50 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Общая сумма</p>
                      <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(stats.totalAmount)}</p>
                    </div>
                    <DollarSign className="w-12 h-12 text-blue-500 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-5 border border-green-200/50 hover:shadow-lg transition-shadow cursor-pointer"
                     onClick={() => setApplicationFilter('received')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Выполнено</p>
                      <p className="text-3xl font-bold text-green-700 dark:text-green-300">{formatCurrency(stats.completedAmount)}</p>
                    </div>
                    <CheckCircle className="w-12 h-12 text-green-500 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-5 border border-orange-200/50 hover:shadow-lg transition-shadow cursor-pointer"
                     onClick={() => setApplicationFilter('pending')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">В работе</p>
                      <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(stats.pendingAmount)}</p>
                    </div>
                    <Clock className="w-12 h-12 text-orange-500 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-5 border border-purple-200/50 hover:shadow-lg transition-shadow cursor-pointer"
                     onClick={() => setApplicationFilter('all')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Всего заявок</p>
                      <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{stats.totalApplications}</p>
                    </div>
                    <FileText className="w-12 h-12 text-purple-500 opacity-50" />
                  </div>
                </div>
              </div>

              {/* Дополнительная статистика */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.uniqueObjects}</div>
                  <div className="text-xs text-gray-500">Объектов</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.totalMaterials)}</div>
                  <div className="text-xs text-gray-500">Позиций материалов</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.completedCount}</div>
                  <div className="text-xs text-gray-500">Завершённых</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.pendingCount}</div>
                  <div className="text-xs text-gray-500">Активных</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.canceledCount || 0}</div>
                  <div className="text-xs text-gray-500">Отменённых</div>
                </div>
              </div>

              {/* Средний чек */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Средняя сумма заявки</span>
                  <span className="text-2xl font-bold text-[#4A6572]">{formatCurrency(stats.averageAmount)}</span>
                </div>
              </div>
            </>
          )}

          {/* Договоры / Контракты */}
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <h4 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-600" />
                Договоры / Контракты ({contracts.length})
              </h4>
              <div className="flex gap-2">
                <select
                  value={contractSortBy}
                  onChange={(e) => setContractSortBy(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="totalAmount">По сумме</option>
                  <option value="applicationsCount">По кол-ву заявок</option>
                  <option value="startDate">По дате начала</option>
                  <option value="lastActivity">По последней активности</option>
                </select>
                <button
                  onClick={() => setContractSortOrder(contractSortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                >
                  {contractSortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {contracts.map(contract => (
                <div key={contract.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer"
                     onClick={() => {
                       setSelectedContract(contract);
                       setShowContractModal(true);
                     }}>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building className="w-5 h-5 text-gray-400" />
                        <span className="font-semibold text-base text-gray-900 dark:text-white">{contract.objectName}</span>
                        {getStatusBadge(contract.status)}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>💰 {formatCurrency(contract.totalAmount)}</span>
                        <span>📄 {contract.applications.length} заявок</span>
                        <span>📦 {contract.totalMaterials} позиций</span>
                        <span>✅ {contract.completedCount} завершено</span>
                        <span>⏳ {contract.pendingCount} в работе</span>
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>📅 Начало: {formatDate(contract.startDate)}</span>
                        <span>🔄 Последняя активность: {formatDate(contract.lastActivity)}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
              {contracts.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <FileText className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>Нет контрактов</p>
                  <p className="text-sm mt-1">Заявки не найдены</p>
                </div>
              )}
            </div>
          </div>

          {/* История заявок */}
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <h4 className="font-semibold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                История заявок ({applications.length})
              </h4>
              <div className="flex gap-2 flex-wrap">
                {/* Поиск */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск заявок..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 w-48"
                  />
                </div>
                {/* Фильтр по статусу */}
                <select
                  value={applicationFilter}
                  onChange={(e) => setApplicationFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="all">Все статусы</option>
                  <option value="received">Выполненные</option>
                  <option value="pending">Ожидают</option>
                  <option value="partial">Частично</option>
                  <option value="admin_processing">В обработке</option>
                  <option value="canceled">Отменённые</option>
                </select>
                {/* Сортировка */}
                <select
                  value={applicationSortBy}
                  onChange={(e) => setApplicationSortBy(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="created_at">По дате создания</option>
                  <option value="total_amount">По сумме</option>
                </select>
                <button
                  onClick={() => setApplicationSortOrder(applicationSortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                >
                  {applicationSortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {applications.map(app => (
                <div key={app.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all cursor-pointer"
                     onClick={() => {
                       setSelectedApplication(app);
                       setShowApplicationModal(true);
                     }}>
                  <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        {app.object_name || 'Без объекта'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Создана: {formatDateTime(app.created_at)}
                      </p>
                      {app.id && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          ID: {app.id.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                    {getApplicationStatusBadge(app.status)}
                  </div>
                  {app.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                      {app.description}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-between text-sm mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {app.materials?.length || 0} позиций
                    </span>
                    {app.total_amount > 0 && (
                      <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {formatCurrency(app.total_amount)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {applications.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <FileText className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>Нет заявок</p>
                  <p className="text-sm mt-1">Попробуйте изменить фильтры</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </FullscreenModal>

      {/* Модальное окно деталей контракта */}
      {showContractModal && selectedContract && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#4A6572]" />
                  Детали контракта
                </h3>
                <p className="text-sm text-gray-500 mt-1">{selectedContract.objectName}</p>
              </div>
              <button onClick={() => setShowContractModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Общая сумма</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(selectedContract.totalAmount)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Всего заявок</p>
                  <p className="text-xl font-bold">{selectedContract.applications.length}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Выполнено</p>
                  <p className="text-xl font-bold text-green-600">{selectedContract.completedCount}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">В работе</p>
                  <p className="text-xl font-bold text-orange-600">{selectedContract.pendingCount}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Даты</p>
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span>📅 Начало: {formatDate(selectedContract.startDate)}</span>
                  <span>🔄 Последнее: {formatDate(selectedContract.lastActivity)}</span>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Список заявок по контракту</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedContract.applications.map(app => (
                    <div key={app.id} 
                         className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                         onClick={() => {
                           setSelectedApplication(app);
                           setShowApplicationModal(true);
                           setShowContractModal(false);
                         }}>
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="text-sm font-medium">📅 {formatDate(app.created_at)}</span>
                        {getApplicationStatusBadge(app.status)}
                      </div>
                      <div className="flex justify-between items-center mt-2 text-sm">
                        <span>📦 {app.materials?.length || 0} позиций</span>
                        {app.total_amount > 0 && (
                          <span className="font-medium text-green-600">{formatCurrency(app.total_amount)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex justify-end">
              <button onClick={() => setShowContractModal(false)} className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно деталей заявки */}
      {showApplicationModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#4A6572]" />
                  Детали заявки
                </h3>
                <p className="text-sm text-gray-500 mt-1">ID: {selectedApplication.id}</p>
              </div>
              <button onClick={() => setShowApplicationModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Информация о заявке */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Объект</p>
                  <p className="font-medium">{selectedApplication.object_name || '—'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Статус</p>
                  <div className="mt-1">{getApplicationStatusBadge(selectedApplication.status)}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Дата создания</p>
                  <p className="font-medium">{formatDateTime(selectedApplication.created_at)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Общая сумма</p>
                  <p className="font-bold text-green-600">{formatCurrency(selectedApplication.total_amount)}</p>
                </div>
              </div>

              {/* Описание */}
              {selectedApplication.description && (
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2">Описание</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedApplication.description}</p>
                </div>
              )}

              {/* Материалы */}
              {selectedApplication.materials && selectedApplication.materials.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Материалы ({selectedApplication.materials.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedApplication.materials.map((material, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{material.name || material.material_name || 'Материал'}</p>
                            {material.article && (
                              <p className="text-xs text-gray-500">Артикул: {material.article}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {material.quantity && (
                              <p className="text-sm">{material.quantity} {material.unit || 'шт'}</p>
                            )}
                            {material.price && (
                              <p className="text-sm font-medium text-green-600">{formatCurrency(material.price)}</p>
                            )}
                          </div>
                        </div>
                        {material.comment && (
                          <p className="text-xs text-gray-500 mt-1">{material.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t flex justify-between">
              <div className="text-sm text-gray-500">
                Позиций: {selectedApplication.materials?.length || 0}
              </div>
              <button onClick={() => setShowApplicationModal(false)} className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UnifiedDocumentManager */}
      {showUnifiedDocs && (
        <UnifiedDocumentManager
          companyId={companyId}
          clientId={clientId}
          clientName={clientName}
          applications={applications}
          user={null}
          userRole="admin"
          showNotification={(msg, type) => console.log(msg, type)}
          companyName={clientName}
          supabaseClient={supabase}
          onClose={() => setShowUnifiedDocs(false)}
        />
      )}
    </>
  );
};