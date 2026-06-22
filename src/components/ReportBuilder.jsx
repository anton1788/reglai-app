// src/components/ReportBuilder.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { 
  FileText, Plus, Trash2, Eye, Download, Settings,
  Calendar, BarChart3, PieChart, LineChart, Filter, Save
} from 'lucide-react';

const ReportBuilder = ({ 
  applications, 
  // companyUsers - удалён, так как не используется
  supabase,
  companyId,
  showNotification
  // t - удалён, так как не используется
}) => {
  const [reportName, setReportName] = useState('');
  const [selectedFields, setSelectedFields] = useState([
    'object_name', 'foreman_name', 'status', 'created_at'
  ]);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    objectName: ''
  });
  const [chartType, setChartType] = useState('bar');
  const [viewMode, setViewMode] = useState('table');
  const [savedReports, setSavedReports] = useState([]);

  // Загрузка сохранённых отчётов - обернута в useCallback
  const loadSavedReports = useCallback(async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('saved_reports')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (data) setSavedReports(data);
  }, [companyId, supabase]);

  // Эффект с корректными зависимостями
  React.useEffect(() => {
    loadSavedReports();
  }, [loadSavedReports]);

  const availableFields = [
    { key: 'object_name', label: 'Объект' },
    { key: 'foreman_name', label: 'Прораб' },
    { key: 'foreman_phone', label: 'Телефон' },
    { key: 'status', label: 'Статус' },
    { key: 'created_at', label: 'Дата создания' },
    { key: 'total_amount', label: 'Сумма' },
    { key: 'materials_count', label: 'Кол-во материалов' },
    { key: 'completion_rate', label: '% выполнения' }
  ];

  const toggleField = (fieldKey) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey)
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const filteredData = useMemo(() => {
    let data = applications;
    
    if (filters.dateFrom) {
      data = data.filter(app => app.created_at >= filters.dateFrom);
    }
    if (filters.dateTo) {
      data = data.filter(app => app.created_at <= filters.dateTo);
    }
    if (filters.status !== 'all') {
      data = data.filter(app => app.status === filters.status);
    }
    if (filters.objectName) {
      data = data.filter(app => 
        app.object_name.toLowerCase().includes(filters.objectName.toLowerCase())
      );
    }
    
    return data;
  }, [applications, filters]);

  const chartData = useMemo(() => {
    const statusCounts = {};
    filteredData.forEach(app => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count
    }));
  }, [filteredData]);

  const exportReport = (format = 'csv') => {
    let content = '';
    let filename = `report_${reportName || 'untitled'}_${new Date().toISOString().slice(0,10)}`;
    
    if (format === 'csv') {
      content = selectedFields.join(',') + '\n';
      filteredData.forEach(app => {
        const row = selectedFields.map(field => {
          let value = app[field];
          if (field === 'materials_count') {
            value = app.materials?.length || 0;
          }
          if (field === 'completion_rate') {
            const total = app.materials?.reduce((s, m) => s + m.quantity, 0) || 0;
            const received = app.materials?.reduce((s, m) => s + m.received, 0) || 0;
            value = total > 0 ? Math.round((received / total) * 100) : 0;
          }
          return `"${String(value || '').replace(/"/g, '""')}"`;
        });
        content += row.join(',') + '\n';
      });
      filename += '.csv';
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    
    showNotification(`📊 Отчёт "${reportName || 'без названия'}" экспортирован`, 'success');
  };

  const saveReport = async () => {
    if (!reportName.trim()) {
      showNotification('Введите название отчёта', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('saved_reports')
        .insert([{
          company_id: companyId,
          name: reportName.trim(),
          config: {
            fields: selectedFields,
            filters: filters,
            chartType: chartType,
            viewMode: viewMode
          },
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      
      showNotification('✅ Отчёт сохранён!', 'success');
      await loadSavedReports();
      
    } catch (err) {
      console.error('Ошибка сохранения отчёта:', err);
      showNotification('Ошибка сохранения: ' + err.message, 'error');
    }
  };

  const loadSavedReport = (report) => {
    setReportName(report.name);
    setSelectedFields(report.config.fields || ['object_name', 'foreman_name', 'status', 'created_at']);
    setFilters(report.config.filters || { dateFrom: '', dateTo: '', status: 'all', objectName: '' });
    setChartType(report.config.chartType || 'bar');
    setViewMode(report.config.viewMode || 'table');
    showNotification(`📋 Загружен отчёт: ${report.name}`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#4A6572]" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Конструктор отчётов
            </h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={saveReport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Сохранить
            </button>
            <button
              onClick={() => exportReport('csv')}
              className="px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Экспорт CSV
            </button>
          </div>
        </div>

        {/* Сохранённые отчёты */}
        {savedReports.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <p className="text-sm font-medium mb-2">Сохранённые отчёты:</p>
            <div className="flex flex-wrap gap-2">
              {savedReports.map(report => (
                <button
                  key={report.id}
                  onClick={() => loadSavedReport(report)}
                  className="px-3 py-1 bg-white dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  {report.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Настройки отчёта */}
          <div className="lg:col-span-1 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Название отчёта
              </label>
              <input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="Название..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Filter className="w-4 h-4 inline mr-1" />
                Фильтры
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                />
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                >
                  <option value="all">Все статусы</option>
                  <option value="pending">В ожидании</option>
                  <option value="partial_received">Частично</option>
                  <option value="received">Получено</option>
                  <option value="canceled">Отменено</option>
                </select>
                <input
                  value={filters.objectName}
                  onChange={(e) => setFilters({ ...filters, objectName: e.target.value })}
                  placeholder="Поиск по объекту..."
                  className="w-full px-3 py-1.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Settings className="w-4 h-4 inline mr-1" />
                Поля
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableFields.map(field => (
                  <label key={field.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.key)}
                      onChange={() => toggleField(field.key)}
                      className="rounded"
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <BarChart3 className="w-4 h-4 inline mr-1" />
                Тип графика
              </label>
              <div className="flex gap-2">
                {['bar', 'pie', 'line'].map(type => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
                      chartType === type 
                        ? 'bg-[#4A6572] text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {type === 'bar' && <BarChart3 className="w-4 h-4" />}
                    {type === 'pie' && <PieChart className="w-4 h-4" />}
                    {type === 'line' && <LineChart className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'chart' : 'table')}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {viewMode === 'table' ? '📊 Показать график' : '📋 Показать таблицу'}
            </button>
          </div>

          {/* Результат */}
          <div className="lg:col-span-3">
            {viewMode === 'table' ? (
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      {selectedFields.map(field => (
                        <th key={field} className="px-3 py-2 text-left">
                          {availableFields.find(f => f.key === field)?.label || field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((app, idx) => (
                      <tr key={app.id} className="border-t dark:border-gray-700">
                        <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                        {selectedFields.map(field => {
                          let value = app[field];
                          if (field === 'materials_count') {
                            value = app.materials?.length || 0;
                          }
                          if (field === 'completion_rate') {
                            const total = app.materials?.reduce((s, m) => s + m.quantity, 0) || 0;
                            const received = app.materials?.reduce((s, m) => s + m.received, 0) || 0;
                            value = total > 0 ? `${Math.round((received / total) * 100)}%` : '0%';
                          }
                          if (field === 'created_at') {
                            value = new Date(value).toLocaleDateString();
                          }
                          if (field === 'status') {
                            const statusMap = {
                              'pending': '⏳ В ожидании',
                              'partial_received': '🟡 Частично',
                              'received': '✅ Получено',
                              'canceled': '❌ Отменено'
                            };
                            value = statusMap[value] || value;
                          }
                          return (
                            <td key={field} className="px-3 py-2">
                              {String(value || '-')}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan={selectedFields.length + 1} className="px-3 py-8 text-center text-gray-400">
                          Нет данных для отображения
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="px-3 py-2 text-xs text-gray-400 border-t">
                  Всего: {filteredData.length} записей
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 h-96 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">График {chartType === 'bar' ? 'столбчатый' : chartType === 'pie' ? 'круговой' : 'линейный'}</p>
                  <div className="mt-4 space-y-1">
                    {chartData.map((item, idx) => (
                      <div key={idx} className="flex justify-between gap-8 text-sm">
                        <span>{item.name}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                    {chartData.length === 0 && (
                      <p className="text-gray-400">Нет данных для графика</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;