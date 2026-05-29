// src/components/ClientManager/ClientAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  X, Calendar, DollarSign, FileText, CheckCircle, Clock, 
  AlertCircle, TrendingUp, TrendingDown, Package, Building,
  Download, Printer, Eye, BarChart3, PieChart, CreditCard,
  FileCheck, FileX, Plus, Minus, History
} from 'lucide-react';

export const ClientAnalytics = ({ clientId, companyId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // all, month, quarter, year
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);

  useEffect(() => {
    if (clientId && companyId) {
      loadData();
    }
  }, [clientId, companyId, selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Загружаем все заявки клиента
      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select('*')
        .eq('company_id', companyId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (appsError) throw appsError;

      // Фильтруем по периоду
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
        }
        filteredApps = apps.filter(a => new Date(a.created_at) >= startDate);
      }

      setApplications(filteredApps);

      // Загружаем/создаём контракты (договоры) на основе заявок
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

      // Общая статистика
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
  };

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

  const getPeriodLabel = () => {
    switch(selectedPeriod) {
      case 'month': return 'за последний месяц';
      case 'quarter': return 'за последний квартал';
      case 'year': return 'за последний год';
      default: return 'за всё время';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4A6572]"></div>
          <span>Загрузка аналитики...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#4A6572]" />
              Аналитика по клиенту
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Детальная статистика по заявкам, контрактам и финансам {getPeriodLabel()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Фильтр по периоду */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedPeriod === 'all' 
                  ? 'bg-[#4A6572] text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Всё время
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedPeriod === 'month' 
                  ? 'bg-[#4A6572] text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setSelectedPeriod('quarter')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedPeriod === 'quarter' 
                  ? 'bg-[#4A6572] text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Квартал
            </button>
            <button
              onClick={() => setSelectedPeriod('year')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedPeriod === 'year' 
                  ? 'bg-[#4A6572] text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Год
            </button>
          </div>

          {/* Карточки статистики */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200/50">
                <div className="flex items-center justify-between">
                  <DollarSign className="w-8 h-8 text-blue-500 opacity-75" />
                  <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(stats.totalAmount)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Общая сумма</p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200/50">
                <div className="flex items-center justify-between">
                  <CheckCircle className="w-8 h-8 text-green-500 opacity-75" />
                  <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(stats.completedAmount)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Выполнено</p>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200/50">
                <div className="flex items-center justify-between">
                  <Clock className="w-8 h-8 text-orange-500 opacity-75" />
                  <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {formatCurrency(stats.pendingAmount)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">В работе</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200/50">
                <div className="flex items-center justify-between">
                  <FileText className="w-8 h-8 text-purple-500 opacity-75" />
                  <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {stats.totalApplications}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Всего заявок</p>
              </div>
            </div>
          )}

          {/* Дополнительная статистика */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.uniqueObjects}</div>
                <div className="text-xs text-gray-500">Объектов</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalMaterials}</div>
                <div className="text-xs text-gray-500">Позиций материалов</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-green-600">{stats.completedCount}</div>
                <div className="text-xs text-gray-500">Завершённых заявок</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-orange-600">{stats.pendingCount}</div>
                <div className="text-xs text-gray-500">Активных заявок</div>
              </div>
            </div>
          )}

          {/* Контракты (договоры) */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-green-600" />
              Договоры / Контракты ({contracts.length})
            </h4>
            <div className="space-y-3">
              {contracts.map(contract => (
                <div key={contract.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">{contract.objectName}</span>
                        {getStatusBadge(contract.status)}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <span>💰 {formatCurrency(contract.totalAmount)}</span>
                        <span>📄 {contract.applications.length} заявок</span>
                        <span>📦 {contract.totalMaterials} позиций</span>
                        <span>✅ {contract.completedCount} завершено</span>
                        <span>⏳ {contract.pendingCount} в работе</span>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>📅 Начало: {formatDate(contract.startDate)}</span>
                        <span>🔄 Последняя активность: {formatDate(contract.lastActivity)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedContract(contract);
                        setShowContractModal(true);
                      }}
                      className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Детали
                    </button>
                  </div>
                </div>
              ))}
              {contracts.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Нет контрактов
                </div>
              )}
            </div>
          </div>

          {/* История заявок */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              История заявок
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {applications.slice(0, 20).map(app => (
                <div key={app.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        {app.object_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Создана: {new Date(app.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    {getApplicationStatusBadge(app.status)}
                  </div>
                  <div className="flex flex-wrap justify-between text-sm mt-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      📦 {app.materials?.length || 0} позиций
                    </span>
                    {app.total_amount > 0 && (
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        💰 {app.total_amount.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Модальное окно деталей контракта */}
      {showContractModal && selectedContract && (
        <ContractDetailsModal
          contract={selectedContract}
          onClose={() => setShowContractModal(false)}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getApplicationStatusBadge={getApplicationStatusBadge}
        />
      )}
    </div>
  );
};

// Компонент деталей контракта
const ContractDetailsModal = ({ contract, onClose, formatCurrency, formatDate, getApplicationStatusBadge }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10001] fade-enter">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-200/50 dark:border-gray-700/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#4A6572]" />
              Детали контракта
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{contract.objectName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
              <p className="text-xs text-gray-500">Общая сумма</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(contract.totalAmount)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
              <p className="text-xs text-gray-500">Всего заявок</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{contract.applications.length}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
              <p className="text-xs text-gray-500">Выполнено заявок</p>
              <p className="text-xl font-bold text-green-600">{contract.completedCount}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
              <p className="text-xs text-gray-500">В работе</p>
              <p className="text-xl font-bold text-orange-600">{contract.pendingCount}</p>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-2">Даты</p>
            <div className="flex justify-between text-sm">
              <span>📅 Начало: {formatDate(contract.startDate)}</span>
              <span>🔄 Последнее: {formatDate(contract.lastActivity)}</span>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Список заявок по контракту</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {contract.applications.map(app => (
                <div key={app.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">Заявка от {new Date(app.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">ID: {app.id.slice(0, 8)}...</p>
                    </div>
                    {getApplicationStatusBadge(app.status)}
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <span>📦 {app.materials?.length || 0} позиций</span>
                    {app.total_amount > 0 && <span className="font-medium">💰 {formatCurrency(app.total_amount)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-5 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};