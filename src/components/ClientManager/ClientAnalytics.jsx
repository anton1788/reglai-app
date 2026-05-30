/* eslint-disable no-unused-vars */
// src/components/ClientManager/ClientAnalytics.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  X, DollarSign, FileText, CheckCircle, Clock, 
  Package, Building, BarChart3, CreditCard,
  FileCheck, History, Maximize2, Minimize2,
  ChevronRight, Search, FolderOpen
} from 'lucide-react';

// Импорт UnifiedDocumentManager
import { UnifiedDocumentManager } from '../DocumentManager/UnifiedDocumentManager';

// Вспомогательные функции
const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ru-RU');
};

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('ru-RU');
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
    active: { text: 'Активен', color: 'bg-green-100 text-green-700' },
    completed: { text: 'Завершён', color: 'bg-blue-100 text-blue-700' },
    suspended: { text: 'Приостановлен', color: 'bg-yellow-100 text-yellow-700' },
    closed: { text: 'Закрыт', color: 'bg-gray-100 text-gray-700' }
  };
  const s = statuses[status] || statuses.active;
  return <span className={`px-2 py-0.5 text-xs rounded-full ${s.color}`}>{s.text}</span>;
};

const getApplicationStatusBadge = (status) => {
  const statusMap = {
    pending: { text: 'Ожидает', color: 'bg-yellow-100 text-yellow-700' },
    partial: { text: 'Частично', color: 'bg-orange-100 text-orange-700' },
    received: { text: 'Выполнена', color: 'bg-green-100 text-green-700' },
    canceled: { text: 'Отменена', color: 'bg-red-100 text-red-700' },
    admin_processing: { text: 'В обработке', color: 'bg-blue-100 text-blue-700' },
    pending_approval: { text: 'На согласовании', color: 'bg-purple-100 text-purple-700' }
  };
  const s = statusMap[status] || { text: status || 'Неизвестно', color: 'bg-gray-100 text-gray-700' };
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
  
  // Состояние для UnifiedDocumentManager
  const [showUnifiedDocs, setShowUnifiedDocs] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
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

      if (searchTerm) {
        filteredApps = filteredApps.filter(a => 
          a.object_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (applicationFilter !== 'all') {
        filteredApps = filteredApps.filter(a => a.status === applicationFilter);
      }

      setApplications(filteredApps);

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
  }, [clientId, companyId, selectedPeriod, searchTerm, applicationFilter, contractSortBy, contractSortOrder]);

  useEffect(() => {
    if (clientId && companyId) {
      loadData();
    }
  }, [clientId, companyId, selectedPeriod, searchTerm, applicationFilter, contractSortBy, contractSortOrder, loadData]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 flex items-center gap-4 shadow-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6572]"></div>
          <span className="text-lg">Загрузка аналитики...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 overflow-hidden">
      <div className="bg-white w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b flex-shrink-0 bg-gray-50">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[#4A6572]" />
              Аналитика клиента
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {clientName || 'Клиент'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUnifiedDocs(true)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              title="Документооборот"
            >
              <FolderOpen className="w-5 h-5 text-[#4A6572]" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Фильтр по периоду */}
          <div className="flex flex-wrap gap-2 justify-end mb-6">
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
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Карточки статистики */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                <p className="text-sm text-gray-500">Общая сумма</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(stats.totalAmount)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 cursor-pointer"
                   onClick={() => setApplicationFilter('received')}>
                <p className="text-sm text-gray-500">Выполнено</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.completedAmount)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 cursor-pointer"
                   onClick={() => setApplicationFilter('pending')}>
                <p className="text-sm text-gray-500">В работе</p>
                <p className="text-2xl font-bold text-orange-700">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 cursor-pointer"
                   onClick={() => setApplicationFilter('all')}>
                <p className="text-sm text-gray-500">Всего заявок</p>
                <p className="text-2xl font-bold text-purple-700">{stats.totalApplications}</p>
              </div>
            </div>
          )}

          {/* Дополнительная статистика */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.uniqueObjects}</div>
                <div className="text-xs text-gray-500">Объектов</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalMaterials)}</div>
                <div className="text-xs text-gray-500">Позиций материалов</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completedCount}</div>
                <div className="text-xs text-gray-500">Завершённых</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.pendingCount}</div>
                <div className="text-xs text-gray-500">Активных</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.canceledCount || 0}</div>
                <div className="text-xs text-gray-500">Отменённых</div>
              </div>
            </div>
          )}

          {/* Договоры */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-600" />
                Договоры / Контракты ({contracts.length})
              </h4>
              <div className="flex gap-2">
                <select
                  value={contractSortBy}
                  onChange={(e) => setContractSortBy(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-lg"
                >
                  <option value="totalAmount">По сумме</option>
                  <option value="applicationsCount">По кол-ву заявок</option>
                </select>
                <button
                  onClick={() => setContractSortOrder(contractSortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                >
                  {contractSortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {contracts.map(contract => (
                <div key={contract.id} className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                     onClick={() => {
                       setSelectedContract(contract);
                       setShowContractModal(true);
                     }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold">{contract.objectName}</span>
                        {getStatusBadge(contract.status)}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                        <span>💰 {formatCurrency(contract.totalAmount)}</span>
                        <span>📄 {contract.applications.length} заявок</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
              {contracts.length === 0 && (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Нет контрактов</p>
                </div>
              )}
            </div>
          </div>

          {/* История заявок */}
          <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                История заявок ({applications.length})
              </h4>
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Поиск..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-sm border rounded-lg w-48"
                  />
                </div>
                <select
                  value={applicationFilter}
                  onChange={(e) => setApplicationFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-lg"
                >
                  <option value="all">Все статусы</option>
                  <option value="received">Выполненные</option>
                  <option value="pending">Ожидают</option>
                  <option value="canceled">Отменённые</option>
                </select>
              </div>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {applications.map(app => (
                <div key={app.id} className="bg-white border rounded-xl p-4 hover:shadow-md transition-all cursor-pointer"
                     onClick={() => {
                       setSelectedApplication(app);
                       setShowApplicationModal(true);
                     }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{app.object_name || 'Без объекта'}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(app.created_at)}</p>
                    </div>
                    {getApplicationStatusBadge(app.status)}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    📦 {app.materials?.length || 0} позиций
                    {app.total_amount > 0 && ` • 💰 ${formatCurrency(app.total_amount)}`}
                  </div>
                </div>
              ))}
              {applications.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Нет заявок</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end flex-shrink-0 bg-gray-50">
          <button onClick={onClose} className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            Закрыть
          </button>
        </div>
      </div>

      {/* Модальное окно деталей контракта */}
      {showContractModal && selectedContract && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">Детали контракта</h3>
              <button onClick={() => setShowContractModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p><strong>Объект:</strong> {selectedContract.objectName}</p>
              <p><strong>Сумма:</strong> {formatCurrency(selectedContract.totalAmount)}</p>
              <p><strong>Заявок:</strong> {selectedContract.applications.length}</p>
              <p><strong>Выполнено:</strong> {selectedContract.completedCount}</p>
              <p><strong>В работе:</strong> {selectedContract.pendingCount}</p>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setShowContractModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно деталей заявки */}
      {showApplicationModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">Детали заявки</h3>
              <button onClick={() => setShowApplicationModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p><strong>Объект:</strong> {selectedApplication.object_name || '—'}</p>
              <p><strong>Статус:</strong> {getApplicationStatusBadge(selectedApplication.status)}</p>
              <p><strong>Дата:</strong> {formatDateTime(selectedApplication.created_at)}</p>
              <p><strong>Сумма:</strong> {formatCurrency(selectedApplication.total_amount)}</p>
              <p><strong>Материалов:</strong> {selectedApplication.materials?.length || 0} позиций</p>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setShowApplicationModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">
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
    </div>
  );
};