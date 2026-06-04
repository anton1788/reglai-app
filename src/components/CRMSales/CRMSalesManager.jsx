// src/components/CRMSales/CRMSalesManager.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Users, Phone, Calendar, MessageSquare, Star, Archive, 
  Plus, Search, Filter, Clock, CheckCircle, XCircle,
  AlertCircle, ChevronDown, Edit2, Trash2, Eye,
  PhoneCall, Mail, UserPlus, RefreshCw, Download,
  LayoutGrid, List, BarChart3, PieChart, TrendingUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import SalesClientCard from './SalesClientCard';
import SalesClientForm from './SalesClientForm';
import SalesCallReminder from './SalesCallReminder';

// Статусы потенциальных клиентов (для продаж)
const SALES_STATUSES = {
  new: { label: '🆕 Новый лид', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', order: 1 },
  call_scheduled: { label: '📞 Звонок запланирован', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', order: 2 },
  negotiation: { label: '🤝 Договорённость', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300', order: 3 },
  client: { label: '✅ Стал клиентом', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', order: 4 },
  lost: { label: '❌ Потерян', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', order: 5 },
  archive: { label: '📦 Архив', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', order: 6 }
};

// Компонент лоадера
const LoaderIcon = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
);

const CRMSalesManager = ({ supabase, companyId, showNotification, onMoveToClients }) => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [activeTab, setActiveTab] = useState('kanban'); // kanban, list, analytics
  
  // Форма нового клиента
  const [clientForm, setClientForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    position: '',
    status: 'new',
    notes: '',
    next_call_date: '',
    next_call_time: '',
    source: 'manual'
  });

  // Загрузка потенциальных клиентов
  const loadClients = useCallback(async () => {
    if (!companyId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_sales_leads')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error('Ошибка загрузки CRM:', err);
      showNotification('Ошибка загрузки лидов', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, companyId, showNotification]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Добавление/обновление клиента
  const saveClient = async () => {
    if (!clientForm.name.trim()) {
      showNotification('Введите имя клиента', 'error');
      return;
    }
    
    if (!clientForm.phone.trim() && !clientForm.email.trim()) {
      showNotification('Укажите телефон или email', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      const clientData = {
        company_id: companyId,
        name: clientForm.name.trim(),
        phone: clientForm.phone.trim(),
        email: clientForm.email.trim(),
        company: clientForm.company.trim(),
        position: clientForm.position.trim(),
        status: clientForm.status,
        notes: clientForm.notes,
        next_call_date: clientForm.next_call_date || null,
        next_call_time: clientForm.next_call_time || null,
        source: clientForm.source,
        updated_at: new Date().toISOString()
      };
      
      if (editingClient) {
        const { error } = await supabase
          .from('crm_sales_leads')
          .update(clientData)
          .eq('id', editingClient.id);
        
        if (error) throw error;
        showNotification('Лид обновлён', 'success');
      } else {
        clientData.created_at = new Date().toISOString();
        const { error } = await supabase
          .from('crm_sales_leads')
          .insert([clientData]);
        
        if (error) throw error;
        showNotification('Лид добавлен', 'success');
      }
      
      setShowAddModal(false);
      setEditingClient(null);
      setClientForm({
        name: '', phone: '', email: '', company: '', position: '',
        status: 'new', notes: '', next_call_date: '', next_call_time: '', source: 'manual'
      });
      await loadClients();
      
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      showNotification('Ошибка сохранения', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Превращение лида в клиента
  const convertToClient = async (lead) => {
    if (!window.confirm(`Превратить "${lead.name}" в полноценного клиента?`)) return;
    
    setIsLoading(true);
    try {
      const tempEmail = lead.email || `${lead.phone?.replace(/\D/g, '') || Date.now()}@temp.reglai.ru`;
      const tempPassword = Math.random().toString(36).slice(-8);
      
      const { data: userData, error: userError } = await supabase.auth.signUp({
        email: tempEmail,
        password: tempPassword,
        options: {
          data: {
            role: 'client',
            company_id: companyId,
            company_name: lead.company || 'Новый клиент',
            full_name: lead.name,
            phone: lead.phone
          }
        }
      });
      
      if (userError) throw userError;
      
      await supabase
        .from('company_users')
        .insert([{
          user_id: userData.user.id,
          company_id: companyId,
          full_name: lead.name,
          phone: lead.phone,
          role: 'client',
          is_active: true
        }]);
      
      await supabase
        .from('crm_sales_leads')
        .update({ status: 'client', converted_at: new Date().toISOString() })
        .eq('id', lead.id);
      
      showNotification(`✅ ${lead.name} стал клиентом!`, 'success');
      onMoveToClients?.();
      await loadClients();
      
    } catch (err) {
      console.error('Ошибка конвертации:', err);
      showNotification('Ошибка при создании клиента', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Удаление лида
  const deleteClient = async (client) => {
    if (!window.confirm(`Удалить лид "${client.name}"?`)) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('crm_sales_leads')
        .delete()
        .eq('id', client.id);
      
      if (error) throw error;
      
      showNotification('Лид удалён', 'success');
      await loadClients();
      
    } catch (err) {
      console.error('Ошибка удаления:', err);
      showNotification('Ошибка удаления', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Изменение статуса
  const updateStatus = async (clientId, newStatus) => {
    try {
      const { error } = await supabase
        .from('crm_sales_leads')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);
      
      if (error) throw error;
      
      showNotification(`Статус изменён на ${SALES_STATUSES[newStatus].label}`, 'success');
      await loadClients();
      
    } catch (err) {
      console.error('Ошибка смены статуса:', err);
      showNotification('Ошибка', 'error');
    }
  };

  // Отложить звонок
  const snoozeCall = async (id, date, time) => {
    await supabase
      .from('crm_sales_leads')
      .update({ next_call_date: date, next_call_time: time })
      .eq('id', id);
    await loadClients();
  };

  // Фильтрация
  const filteredClients = useMemo(() => {
    let result = clients;
    
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(term) ||
        c.phone?.includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.company?.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [clients, statusFilter, searchTerm]);

  // Клиенты для звонка сегодня
  const todaysCalls = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return clients.filter(c => 
      c.next_call_date === today && 
      c.status !== 'archive' &&
      c.status !== 'client' &&
      c.status !== 'lost'
    );
  }, [clients]);

  // Статистика
  const stats = useMemo(() => {
    return {
      total: clients.length,
      new: clients.filter(c => c.status === 'new').length,
      callScheduled: clients.filter(c => c.status === 'call_scheduled').length,
      negotiation: clients.filter(c => c.status === 'negotiation').length,
      clients: clients.filter(c => c.status === 'client').length,
      lost: clients.filter(c => c.status === 'lost').length,
      archive: clients.filter(c => c.status === 'archive').length
    };
  }, [clients]);

  // Группировка по статусам для канбана
  const kanbanColumns = useMemo(() => {
    const columns = {};
    Object.keys(SALES_STATUSES).forEach(status => {
      columns[status] = filteredClients.filter(c => c.status === status);
    });
    return columns;
  }, [filteredClients]);

  // Аналитика по источникам
  const sourceAnalytics = useMemo(() => {
    const sources = {};
    clients.forEach(c => {
      const source = c.source || 'manual';
      sources[source] = (sources[source] || 0) + 1;
    });
    return Object.entries(sources).map(([name, value]) => ({ name, value }));
  }, [clients]);

  // Динамика по месяцам
  const monthlyDynamics = useMemo(() => {
    const months = {};
    clients.forEach(c => {
      const month = new Date(c.created_at).toLocaleString('ru-RU', { month: 'short', year: 'numeric' });
      months[month] = (months[month] || 0) + 1;
    });
    return Object.entries(months).map(([name, value]) => ({ name, value }));
  }, [clients]);

  // Экспорт в Excel
  const exportToExcel = () => {
    const exportData = clients.map(c => ({
      'Имя': c.name,
      'Телефон': c.phone,
      'Email': c.email,
      'Компания': c.company,
      'Должность': c.position,
      'Статус': SALES_STATUSES[c.status]?.label || c.status,
      'Следующий звонок': c.next_call_date ? `${c.next_call_date} ${c.next_call_time || ''}` : '',
      'Примечания': c.notes,
      'Источник': c.source,
      'Дата создания': new Date(c.created_at).toLocaleDateString('ru-RU')
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CRM_Лиды');
    XLSX.writeFile(wb, `CRM_Лиды_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Экспорт завершён', 'success');
  };

  // Рендер канбан-доски
  const renderKanban = () => (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {Object.entries(SALES_STATUSES).map(([statusKey, statusConfig]) => {
          const columnClients = kanbanColumns[statusKey] || [];
          return (
            <div key={statusKey} className="w-80 flex-shrink-0">
              <div className={`rounded-t-lg p-2 ${statusConfig.color.replace('text-', 'bg-').replace('dark:bg-', 'dark:bg-')}`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{statusConfig.label}</span>
                  <span className="text-xs bg-white/50 rounded-full px-2 py-0.5">{columnClients.length}</span>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-b-lg p-2 min-h-[400px] space-y-2">
                {columnClients.map(client => (
                  <SalesClientCard
                    key={client.id}
                    client={client}
                    statuses={SALES_STATUSES}
                    onEdit={(c) => {
                      setEditingClient(c);
                      setClientForm({
                        name: c.name,
                        phone: c.phone || '',
                        email: c.email || '',
                        company: c.company || '',
                        position: c.position || '',
                        status: c.status,
                        notes: c.notes || '',
                        next_call_date: c.next_call_date || '',
                        next_call_time: c.next_call_time || '',
                        source: c.source || 'manual'
                      });
                      setShowAddModal(true);
                    }}
                    onDelete={deleteClient}
                    onStatusChange={updateStatus}
                    onConvert={convertToClient}
                    onView={(c) => {
                      setSelectedClient(c);
                      setShowDetailsModal(true);
                    }}
                  />
                ))}
                {columnClients.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Нет лидов
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Рендер списка
  const renderList = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {filteredClients.map(client => (
        <SalesClientCard
          key={client.id}
          client={client}
          statuses={SALES_STATUSES}
          onEdit={(c) => {
            setEditingClient(c);
            setClientForm({
              name: c.name,
              phone: c.phone || '',
              email: c.email || '',
              company: c.company || '',
              position: c.position || '',
              status: c.status,
              notes: c.notes || '',
              next_call_date: c.next_call_date || '',
              next_call_time: c.next_call_time || '',
              source: c.source || 'manual'
            });
            setShowAddModal(true);
          }}
          onDelete={deleteClient}
          onStatusChange={updateStatus}
          onConvert={convertToClient}
          onView={(c) => {
            setSelectedClient(c);
            setShowDetailsModal(true);
          }}
        />
      ))}
    </div>
  );

  // Рендер аналитики
  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Статистика по статусам */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          Распределение по статусам
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Object.entries(stats).map(([key, value]) => {
            const config = SALES_STATUSES[key];
            if (!config && key === 'total') return null;
            return (
              <div key={key} className={`p-3 rounded-xl text-center ${config?.color || 'bg-gray-100'}`}>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs">{config?.label || key}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Аналитика по источникам */}
      {sourceAnalytics.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Источники привлечения
          </h3>
          <div className="space-y-3">
            {sourceAnalytics.map(source => (
              <div key={source.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{source.name === 'manual' ? 'Ручное добавление' : source.name}</span>
                  <span>{source.value} ({Math.round(source.value / clients.length * 100)}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full" 
                    style={{ width: `${source.value / clients.length * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Динамика по месяцам */}
      {monthlyDynamics.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Динамика добавления лидов
          </h3>
          <div className="space-y-3">
            {monthlyDynamics.map(month => (
              <div key={month.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{month.name}</span>
                  <span>{month.value}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, month.value / Math.max(...monthlyDynamics.map(m => m.value)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Конверсия */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
        <h3 className="text-lg font-semibold mb-4">📊 Воронка продаж</h3>
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.new + stats.callScheduled}</div>
            <div className="text-xs text-gray-500">Активные лиды</div>
          </div>
          <ArrowRight className="w-6 h-6 text-gray-400" />
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.negotiation}</div>
            <div className="text-xs text-gray-500">Договорённость</div>
          </div>
          <ArrowRight className="w-6 h-6 text-gray-400" />
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.clients}</div>
            <div className="text-xs text-gray-500">Стали клиентами</div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t text-center">
          <div className="text-sm text-gray-600">
            Конверсия: {stats.new + stats.callScheduled + stats.negotiation > 0 
              ? Math.round(stats.clients / (stats.new + stats.callScheduled + stats.negotiation) * 100) 
              : 0}%
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Заголовок */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                CRM - База лидов
              </h1>
              <p className="text-sm text-gray-500">Потенциальные клиенты и воронка продаж</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Excel
            </button>
            <button
              onClick={() => {
                setEditingClient(null);
                setClientForm({
                  name: '', phone: '', email: '', company: '', position: '',
                  status: 'new', notes: '', next_call_date: '', next_call_time: '', source: 'manual'
                });
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Добавить лида
            </button>
          </div>
        </div>
        
        {/* Вкладки */}
        <div className="flex gap-2 mb-4 border-b pb-2">
          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'kanban' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Канбан
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'list' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <List className="w-4 h-4" />
            Список
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'analytics' 
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Аналитика
          </button>
        </div>
        
        {/* Статистика (краткая) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Всего</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
            <div className="text-xs text-gray-500">Новые</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.callScheduled}</div>
            <div className="text-xs text-gray-500">Звонок</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.negotiation}</div>
            <div className="text-xs text-gray-500">Договор</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-green-600">{stats.clients}</div>
            <div className="text-xs text-gray-500">Клиенты</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-red-600">{stats.lost}</div>
            <div className="text-xs text-gray-500">Потеряны</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-xl text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.archive}</div>
            <div className="text-xs text-gray-500">Архив</div>
          </div>
        </div>
        
        {/* Напоминания о звонках */}
        <SalesCallReminder 
          clients={todaysCalls}
          onCallCompleted={updateStatus}
          onSnooze={snoozeCall}
          showNotification={showNotification}
        />
        
        {/* Поиск и фильтры */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск по имени, телефону, email, компании..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg dark:bg-gray-700"
          >
            <option value="all">Все статусы</option>
            {Object.entries(SALES_STATUSES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <button
            onClick={loadClients}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Контент в зависимости от вкладки */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoaderIcon />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-12 bg-white/80 dark:bg-gray-800/80 rounded-2xl">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">
            {searchTerm ? 'Лиды не найдены' : 'Нет лидов в базе'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
            >
              + Добавить первого лида
            </button>
          )}
        </div>
      ) : (
        <>
          {activeTab === 'kanban' && renderKanban()}
          {activeTab === 'list' && renderList()}
          {activeTab === 'analytics' && renderAnalytics()}
        </>
      )}
      
      {/* Модальные окна */}
      <SalesClientForm
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        clientForm={clientForm}
        setClientForm={setClientForm}
        onSave={saveClient}
        isLoading={isLoading}
        editingClient={editingClient}
        statuses={SALES_STATUSES}
      />
      
      {/* Модальное окно деталей */}
      {showDetailsModal && selectedClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">{selectedClient.name}</h3>
              <button onClick={() => setShowDetailsModal(false)} className="p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Статус:</span>
                <span className={`px-2 py-1 rounded-full text-sm ${SALES_STATUSES[selectedClient.status]?.color}`}>
                  {SALES_STATUSES[selectedClient.status]?.label}
                </span>
              </div>
              {selectedClient.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Телефон:</span>
                  <a href={`tel:${selectedClient.phone}`} className="text-indigo-600">{selectedClient.phone}</a>
                </div>
              )}
              {selectedClient.email && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span>{selectedClient.email}</span>
                </div>
              )}
              {selectedClient.company && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Компания:</span>
                  <span>{selectedClient.company}</span>
                </div>
              )}
              {selectedClient.next_call_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Следующий звонок:</span>
                  <span>
                    {new Date(selectedClient.next_call_date).toLocaleDateString('ru-RU')}
                    {selectedClient.next_call_time && ` в ${selectedClient.next_call_time}`}
                  </span>
                </div>
              )}
              {selectedClient.notes && (
                <div>
                  <span className="text-gray-500 block mb-1">Примечания:</span>
                  <p className="text-sm bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                    {selectedClient.notes}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => {
                  setEditingClient(selectedClient);
                  setClientForm({
                    name: selectedClient.name,
                    phone: selectedClient.phone || '',
                    email: selectedClient.email || '',
                    company: selectedClient.company || '',
                    position: selectedClient.position || '',
                    status: selectedClient.status,
                    notes: selectedClient.notes || '',
                    next_call_date: selectedClient.next_call_date || '',
                    next_call_time: selectedClient.next_call_time || '',
                    source: selectedClient.source || 'manual'
                  });
                  setShowDetailsModal(false);
                  setShowAddModal(true);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4 inline mr-1" />
                Редактировать
              </button>
              {selectedClient.status !== 'client' && selectedClient.status !== 'lost' && (
                <button
                  onClick={() => {
                    convertToClient(selectedClient);
                    setShowDetailsModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <UserPlus className="w-4 h-4 inline mr-1" />
                  Стал клиентом
                </button>
              )}
              {selectedClient.phone && (
                <button
                  onClick={() => window.location.href = `tel:${selectedClient.phone}`}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <PhoneCall className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMSalesManager;