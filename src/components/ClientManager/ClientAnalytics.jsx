// src/components/ClientManager/ClientAnalytics.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  X, Calendar, DollarSign, FileText, CheckCircle, Clock, 
  AlertCircle, TrendingUp, TrendingDown, Package, Building,
  Download, Printer, Eye, BarChart3, PieChart, CreditCard,
  FileCheck, FileX, Plus, Minus, History, Maximize2, Minimize2
} from 'lucide-react';

// Вспомогательные функции
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
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

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
          case 'month': startDate.setMonth(now.getMonth() - 1); break;
          case 'quarter': startDate.setMonth(now.getMonth() - 3); break;
          case 'year': startDate.setFullYear(now.getFullYear() - 1); break;
          default: break;
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
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[10000]">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 flex items-center gap-4 shadow-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6572]"></div>
          <span className="text-lg">Загрузка аналитики...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[10000] fade-enter ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
        isFullscreen 
          ? 'w-full h-full rounded-none' 
          : 'w-full max-w-7xl max-h-[90vh] rounded-2xl'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-[#4A6572]/5 to-transparent">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[#4A6572]" />
              Аналитика клиента
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {clientName || 'Клиент'} • {getPeriodLabel()} • {stats?.totalApplications || 0} заявок
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isFullscreen ? "Обычный режим" : "Полный экран"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content - увеличенные отступы и размеры */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
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
                className={`px-3 sm:px-4 py-1.5 text-sm rounded-lg transition-colors ${
                  selectedPeriod === period.key 
                    ? 'bg-[#4A6572] text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {/* Карточки статистики - увеличенные */}
          {stats && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Общая сумма</p>
                      <p className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(stats.totalAmount)}</p>
                    </div>
                    <DollarSign className="w-10 h-10 text-blue-500 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Выполнено</p>
                      <p className="text-2xl sm:text-3xl font-bold text-green-700 dark:text-green-300">{formatCurrency(stats.completedAmount)}</p>
                    </div>
                    <CheckCircle className="w-10 h-10 text-green-500 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">В работе</p>
                      <p className="text-2xl sm:text-3xl font-bold text-orange-700 dark:text-orange-300">{formatCurrency(stats.pendingAmount)}</p>
                    </div>
                    <Clock className="w-10 h-10 text-orange-500 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Всего заявок</p>
                      <p className="text-2xl sm:text-3xl font-bold text-purple-700 dark:text-purple-300">{stats.totalApplications}</p>
                    </div>
                    <FileText className="w-10 h-10 text-purple-500 opacity-50" />
                  </div>
                </div>
              </div>

              {/* Дополнительная статистика */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            </>
          )}

          {/* Контракты - увеличенная область */}
          <div>
            <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-green-600" />
              Договоры / Контракты ({contracts.length})
            </h4>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {contracts.map(contract => (
                <div key={contract.id} className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 hover:shadow-md transition-shadow">
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
                    <button
                      onClick={() => {
                        setSelectedContract(contract);
                        setShowContractModal(true);
                      }}
                      className="px-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Детали
                    </button>
                  </div>
                </div>
              ))}
              {contracts.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                  <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  Нет контрактов
                </div>
              )}
            </div>
          </div>

          {/* История заявок - увеличенная область */}
          <div>
            <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              История заявок
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {applications.map(app => (
                <div key={app.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        {app.object_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Создана: {new Date(app.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                    {getApplicationStatusBadge(app.status)}
                  </div>
                  <div className="flex flex-wrap justify-between text-sm mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">
                      📦 {app.materials?.length || 0} позиций
                    </span>
                    {app.total_amount > 0 && (
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
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
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 flex justify-end bg-gray-50/50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Модальное окно деталей контракта - тоже увеличенное */}
      {showContractModal && selectedContract && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[10001] fade-enter">
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
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Общая сумма</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(selectedContract.totalAmount)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Всего заявок</p>
                  <p className="text-xl font-bold">{selectedContract.applications.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Выполнено</p>
                  <p className="text-xl font-bold text-green-600">{selectedContract.completedCount}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">В работе</p>
                  <p className="text-xl font-bold text-orange-600">{selectedContract.pendingCount}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
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
                    <div key={app.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <span className="text-sm font-medium">📅 {new Date(app.created_at).toLocaleDateString()}</span>
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
    </div>
  );
};