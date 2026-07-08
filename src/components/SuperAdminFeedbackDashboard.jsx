// src/components/SuperAdmin/SuperAdminFeedbackDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  MessageCircle,
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  DollarSign,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../utils/supabaseClient';

const SuperAdminFeedbackDashboard = ({ showNotification, t }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    sent: 0,
    avgEaseOfUse: 0,
    avgSatisfaction: 0,
    avgNps: 0,
    priceDistribution: {}
  });

  const loadAllFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tester_feedback')
        .select(`
          *,
          users:user_id (email, user_metadata),
          companies:company_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFeedbacks(data || []);

      // Расчёт статистики
      const completed = data?.filter(f => f.status === 'completed') || [];
      const pending = data?.filter(f => f.status === 'pending') || [];
      const sent = data?.filter(f => f.status === 'sent') || [];

      const avgEase = completed.reduce((acc, f) => acc + (f.ease_of_use || 0), 0) / (completed.length || 1);
      const avgSat = completed.reduce((acc, f) => acc + (f.overall_satisfaction || 0), 0) / (completed.length || 1);
      const avgNps = completed.reduce((acc, f) => acc + (f.would_recommend || 0), 0) / (completed.length || 1);

      // Распределение цен
      const priceDist = {};
      completed.forEach(f => {
        const price = f.price_option || 'Не указано';
        priceDist[price] = (priceDist[price] || 0) + 1;
      });

      setStats({
        total: data?.length || 0,
        completed: completed.length,
        pending: pending.length,
        sent: sent.length,
        avgEaseOfUse: Math.round(avgEase * 10) / 10,
        avgSatisfaction: Math.round(avgSat * 10) / 10,
        avgNps: Math.round(avgNps * 10) / 10,
        priceDistribution: priceDist
      });
    } catch (err) {
      console.error('Load feedback error:', err);
      if (showNotification) {
        showNotification('Ошибка загрузки', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadAllFeedback();
  }, [loadAllFeedback]);

  const exportToExcel = useCallback(() => {
    const exportData = feedbacks.map(f => ({
      'Пользователь': f.users?.user_metadata?.full_name || f.users?.email || 'Unknown',
      'Компания': f.companies?.name || 'Unknown',
      'Статус': f.status === 'completed' ? 'Завершён' : f.status === 'sent' ? 'Отправлен' : 'Ожидает',
      'Первое впечатление': f.first_impression || '',
      'Проблемы': f.pain_points || '',
      'Используемые функции': f.most_used_features || '',
      'Баг-репорты': f.bugs_found || '',
      'Пожелания': f.feature_requests || '',
      'Конкуренты': f.competitors || '',
      'Готов платить': f.price_option || '',
      'Простота (1-5)': f.ease_of_use || '',
      'Удовлетворённость (1-5)': f.overall_satisfaction || '',
      'NPS (0-10)': f.would_recommend || '',
      'Дата создания': new Date(f.created_at).toLocaleString('ru-RU'),
      'Дата завершения': f.completed_at ? new Date(f.completed_at).toLocaleString('ru-RU') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Feedback');
    XLSX.writeFile(wb, `feedback_${new Date().toISOString().slice(0,10)}.xlsx`);
    if (showNotification) {
      showNotification('✅ Excel экспортирован', 'success');
    }
  }, [feedbacks, showNotification]);

  const getStatusBadge = useCallback((status) => {
    switch (status) {
      case 'completed': 
        return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">✅ Завершён</span>;
      case 'sent': 
        return <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">📧 Отправлен</span>;
      case 'pending': 
        return <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">⏳ Ожидает</span>;
      default: 
        return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  }, []);

  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(f => {
      if (filter !== 'all' && f.status !== filter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          f.first_impression?.toLowerCase().includes(term) ||
          f.pain_points?.toLowerCase().includes(term) ||
          f.feature_requests?.toLowerCase().includes(term) ||
          f.users?.user_metadata?.full_name?.toLowerCase().includes(term) ||
          f.users?.email?.toLowerCase().includes(term) ||
          f.companies?.name?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [feedbacks, filter, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A6572]"></div>
        <p className="ml-3 text-gray-500">{t?.('loading') || 'Загрузка данных...'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 page-enter space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-[#4A6572]" />
              Расширенные отзывы
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Все отзывы тестеров с полной аналитикой
            </p>
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
              onClick={loadAllFeedback}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Обновить
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200/50 dark:border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-xs text-gray-500">Всего</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200/50 dark:border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-xs text-gray-500">Завершено</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200/50 dark:border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs text-gray-500">Ожидают</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200/50 dark:border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
          <div className="text-xs text-gray-500">Отправлены</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200/50 dark:border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.avgEaseOfUse}</div>
          <div className="text-xs text-gray-500">Простота</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200/50 dark:border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-indigo-600">{stats.avgSatisfaction}</div>
          <div className="text-xs text-gray-500">Удовлетвор.</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-200/50 dark:border-gray-700/50 text-center">
          <div className="text-2xl font-bold text-pink-600">{stats.avgNps}</div>
          <div className="text-xs text-gray-500">NPS</div>
        </div>
      </div>

      {/* Price Distribution */}
      {Object.keys(stats.priceDistribution).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200/50 dark:border-gray-700/50 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            Распределение цен
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.priceDistribution).map(([price, count]) => (
              <div key={price} className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="font-medium">{price}</span>
                <span className="ml-2 text-sm text-gray-500">{count} чел.</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200/50 dark:border-gray-700/50 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'pending', 'sent', 'completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === f
                    ? 'bg-[#4A6572] text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? 'Все' : 
                 f === 'pending' ? '⏳ Ожидают' :
                 f === 'sent' ? '📧 Отправлены' :
                 '✅ Завершены'}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по пользователю, компании или содержимому..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-[#4A6572]"
            />
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200/50 dark:border-gray-700/50 divide-y divide-gray-200/50 dark:divide-gray-700/50">
        {filteredFeedbacks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">Нет отзывов</p>
            <p className="text-sm">Пока ни один тестер не оставил расширенный отзыв</p>
          </div>
        ) : (
          filteredFeedbacks.map((feedback) => (
            <div key={feedback.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {feedback.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : feedback.status === 'sent' ? (
                    <Clock className="w-5 h-5 text-blue-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-1">
                    {getStatusBadge(feedback.status)}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(feedback.created_at).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {feedback.users?.user_metadata?.full_name || feedback.users?.email || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {feedback.companies?.name || 'Unknown'}
                    </span>
                    {feedback.price_option && (
                      <span className="flex items-center gap-1 text-green-600">
                        <DollarSign className="w-3 h-3" />
                        {feedback.price_option}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedId(expandedId === feedback.id ? null : feedback.id)}
                    className="text-left w-full"
                  >
                    {expandedId === feedback.id ? (
                      <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                        <div>
                          <span className="font-medium">💡 Первое впечатление:</span>
                          <p className="mt-1">{feedback.first_impression || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">😟 Проблемы:</span>
                          <p className="mt-1">{feedback.pain_points || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">⚡ Используемые функции:</span>
                          <p className="mt-1">{feedback.most_used_features || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">🐛 Баги:</span>
                          <p className="mt-1">{feedback.bugs_found || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">💡 Пожелания:</span>
                          <p className="mt-1">{feedback.feature_requests || '—'}</p>
                        </div>
                        <div>
                          <span className="font-medium">🏆 Конкуренты:</span>
                          <p className="mt-1">{feedback.competitors || '—'}</p>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <span>Простота: {feedback.ease_of_use || '—'}/5</span>
                          <span>Удовлетворённость: {feedback.overall_satisfaction || '—'}/5</span>
                          <span>NPS: {feedback.would_recommend || '—'}/10</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {feedback.first_impression && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
                            💡 {feedback.first_impression}
                          </p>
                        )}
                        {feedback.feature_requests && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                            💡 {feedback.feature_requests}
                          </p>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-[#4A6572] dark:text-[#F9AA33] hover:underline flex items-center gap-1 mt-1">
                      {expandedId === feedback.id ? (
                        <>Свернуть <ChevronUp className="w-3 h-3" /></>
                      ) : (
                        <>Развернуть <ChevronDown className="w-3 h-3" /></>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SuperAdminFeedbackDashboard;