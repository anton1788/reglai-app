// src/components/ClientManager/ClientAnalytics.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  X, Calendar, DollarSign, FileText, CheckCircle, Clock, 
  AlertCircle, TrendingUp, TrendingDown, Package, Building,
  Download, Printer, Eye, BarChart3, PieChart, CreditCard,
  FileCheck, FileX, Plus, Minus, History
} from 'lucide-react';

// Выносим вспомогательные функции за пределы компонента, чтобы они не создавались при каждом рендере
const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatCurrency = (amount) => {
  if (!amount) return '0 ₽';
  return amount.toLocaleString('ru-RU') + ' ₽';
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
  const s = statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-700' };
  return <span className={`px-2 py-0.5 text-xs rounded-full ${s.color}`}>{s.text}</span>;
};

export const ClientAnalytics = ({ clientId, companyId, clientName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);

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
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            break;
        }
        filteredApps = apps.filter(a => new Date(a.created_at) >= startDate);
      }

      setApplications(filteredApps);

      const contractsMap = new Map();
      filteredApps.forEach(app => {
        const key = app.object_name;
        if (!contractsMap.has(key)) {
          contractsMap.set(key, {
            id: key,
            objectName: app.object_name,
            totalAmount: 0,
            applications: [],
            status: 'active',
            startDate: app.created_at,
            lastActivity: app.created_at,
            completedCount: 0,
            pendingCount: 0,
            totalMaterials: 0
          });
        }
        const contract = contractsMap.get(key);
        contract.totalAmount += app.total_amount || 0;
        contract.applications.push(app);
        contract.totalMaterials += app.materials?.length || 0;
        if (app.status === 'received') contract.completedCount++;
        if (['pending', 'partial', 'admin_processing'].includes(app.status)) contract.pendingCount++;
        if (new Date(app.created_at) < new Date(contract.startDate)) contract.startDate = app.created_at;
        if (new Date(app.created_at) > new Date(contract.lastActivity)) contract.lastActivity = app.created_at;
      });

      setContracts(Array.from(contractsMap.values()));

      const totalAmount = filteredApps.reduce((sum, a) => sum + (a.total_amount || 0), 0);
      const completedAmount = filteredApps.filter(a => a.status === 'received').reduce((sum, a) => sum + (a.total_amount || 0), 0);
      const pendingAmount = filteredApps.filter(a => ['pending', 'partial', 'admin_processing'].includes(a.status)).reduce((sum, a) => sum + (a.total_amount || 0), 0);
      
      setStats({
        totalApplications: filteredApps.length,
        totalAmount,
        completedAmount,
        pendingAmount,
        averageAmount: filteredApps.length > 0 ? totalAmount / filteredApps.length : 0,
        uniqueObjects: new Set(filteredApps.map(a => a.object_name)).size,
        totalMaterials: filteredApps.reduce((sum, a) => sum + (a.materials?.length || 0), 0),
        completedCount: filteredApps.filter(a => a.status === 'received').length,
        pendingCount: filteredApps.filter(a => ['pending', 'partial', 'admin_processing'].includes(a.status)).length
      });

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId, selectedPeriod]);

  useEffect(() => {
    if (clientId && companyId) {
      loadData();
    }
  }, [clientId, companyId, selectedPeriod, loadData]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4A6572]"></div>
          <span>Загрузка аналитики...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[10000] fade-enter">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[#4A6572]" />
              Аналитика: {clientName || 'Клиент'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {getPeriodLabel()} • {stats?.totalApplications || 0} заявок
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          
          {/* Фильтр по периоду */}
          <div className="flex flex-wrap gap-1 sm:gap-2 justify-end">
            {[
              { key: 'all', label: 'Всё время' },
              { key: 'month', label: 'Месяц' },
              { key: 'quarter', label: 'Квартал' },
              { key: 'year', label: 'Год' }
            ].map(period => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key)}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg transition-colors ${
                  selectedPeriod === period.key 
                    ? 'bg-[#4A6572] text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Карточки статистики */}
          {stats && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-2 sm:p-3">
                  <p className="text-xs text-gray-500">Общая сумма</p>
                  <p className="text-base sm:text-lg font-bold text-blue-700 dark:text-blue-300">{formatCurrency(stats.totalAmount)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-2 sm:p-3">
                  <p className="text-xs text-gray-500">Выполнено</p>
                  <p className="text-base sm:text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(stats.completedAmount)}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-2 sm:p-3">
                  <p className="text-xs text-gray-500">В работе</p>
                  <p className="text-base sm:text-lg font-bold text-orange-700 dark:text-orange-300">{formatCurrency(stats.pendingAmount)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-2 sm:p-3">
                  <p className="text-xs text-gray-500">Всего заявок</p>
                  <p className="text-base sm:text-lg font-bold text-purple-700 dark:text-purple-300">{stats.totalApplications}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
                  <div className="text-sm sm:text-base font-bold">{stats.uniqueObjects}</div>
                  <div className="text-xs text-gray-500">Объектов</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
                  <div className="text-sm sm:text-base font-bold">{stats.totalMaterials}</div>
                  <div className="text-xs text-gray-500">Позиций</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
                  <div className="text-sm sm:text-base font-bold text-green-600">{stats.completedCount}</div>
                  <div className="text-xs text-gray-500">Завершено</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-center">
                  <div className="text-sm sm:text-base font-bold text-orange-600">{stats.pendingCount}</div>
                  <div className="text-xs text-gray-500">Активных</div>
                </div>
              </div>
            </>
          )}

          {/* Контракты */}
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-green-600" />
              Договоры ({contracts.length})
            </h4>
            <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
              {contracts.slice(0, 5).map(contract => (
                <div key={contract.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 sm:p-3">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <Building className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{contract.objectName}</span>
                        {getStatusBadge(contract.status)}
                      </div>
                      <div className="flex flex-wrap gap-2 sm:gap-3 mt-1 text-xs text-gray-600 dark:text-gray-400">
                        <span>💰 {formatCurrency(contract.totalAmount)}</span>
                        <span>📄 {contract.applications.length} заяв.</span>
                        <span>✅ {contract.completedCount} вып.</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedContract(contract);
                        setShowContractModal(true);
                      }}
                      className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border rounded-lg hover:bg-gray-50 flex-shrink-0"
                    >
                      <Eye className="w-3 h-3 inline mr-1" />
                      Детали
                    </button>
                  </div>
                </div>
              ))}
              {contracts.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">Нет контрактов</div>
              )}
            </div>
          </div>

          {/* История заявок */}
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              Последние заявки
            </h4>
            <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
              {applications.slice(0, 10).map(app => (
                <div key={app.id} className="bg-white dark:bg-gray-800 rounded-lg p-2 sm:p-3 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex justify-between items-start flex-wrap gap-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{app.object_name}</p>
                      <p className="text-xs text-gray-500">{new Date(app.created_at).toLocaleDateString('ru-RU')}</p>
                    </div>
                    {getApplicationStatusBadge(app.status)}
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span>📦 {app.materials?.length || 0} поз.</span>
                    {app.total_amount > 0 && <span>💰 {formatCurrency(app.total_amount)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Модальное окно деталей контракта - с дублированными вспомогательными функциями */}
      {showContractModal && selectedContract && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10001] fade-enter">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Детали контракта
              </h3>
              <button onClick={() => setShowContractModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="font-medium text-center text-lg">{selectedContract.objectName}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Общая сумма</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(selectedContract.totalAmount)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Всего заявок</p>
                  <p className="text-lg font-bold">{selectedContract.applications.length}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Выполнено</p>
                  <p className="text-lg font-bold text-green-600">{selectedContract.completedCount}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <p className="text-xs text-gray-500">В работе</p>
                  <p className="text-lg font-bold text-orange-600">{selectedContract.pendingCount}</p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">Даты</p>
                <div className="flex justify-between text-sm">
                  <span>📅 Начало: {formatDate(selectedContract.startDate)}</span>
                  <span>🔄 Последнее: {formatDate(selectedContract.lastActivity)}</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-sm">Заявки по контракту</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedContract.applications.map(app => (
                    <div key={app.id} className="bg-gray-50 rounded-lg p-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{new Date(app.created_at).toLocaleDateString()}</span>
                        {getApplicationStatusBadge(app.status)}
                      </div>
                      {app.total_amount > 0 && (
                        <div className="text-right text-sm font-medium">{formatCurrency(app.total_amount)}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setShowContractModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};