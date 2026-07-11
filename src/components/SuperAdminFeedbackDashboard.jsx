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
  Reply,
  Send,
  X,
  Mail
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../utils/supabaseClient';

const SuperAdminFeedbackDashboard = ({ showNotification, t }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [replyModal, setReplyModal] = useState(null); // { feedbackId, userEmail, userName }
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
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
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const companyIds = data?.map(f => f.company_id || f.user_company_id).filter(Boolean) || [];
      let companiesMap = {};

      if (companyIds.length > 0) {
        const { data: companiesData } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);
        if (companiesData) {
          companiesMap = Object.fromEntries(companiesData.map(c => [c.id, c]));
        }
      }

      const enrichedData = data?.map(f => ({
        ...f,
        user_display_name: f.user_email?.split('@')[0] || 'Unknown',
        companies: companiesMap[f.company_id || f.user_company_id] || null
      })) || [];

      setFeedbacks(enrichedData);

      const completed = enrichedData?.filter(f => f.status === 'completed') || [];
      const pending = enrichedData?.filter(f => f.status === 'pending') || [];
      const sent = enrichedData?.filter(f => f.status === 'sent') || [];

      const avgEase = completed.reduce((acc, f) => acc + (f.ease_of_use || 0), 0) / (completed.length || 1);
      const avgSat = completed.reduce((acc, f) => acc + (f.overall_satisfaction || 0), 0) / (completed.length || 1);
      const avgNps = completed.reduce((acc, f) => acc + (f.would_recommend || 0), 0) / (completed.length || 1);

      const priceDist = {};
      completed.forEach(f => {
        const price = f.price_option || 'Не указано';
        priceDist[price] = (priceDist[price] || 0) + 1;
      });

      setStats({
        total: enrichedData?.length || 0,
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
        showNotification('Ошибка загрузки отзывов', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadAllFeedback();
  }, [loadAllFeedback]);

    // ============================================================
  // 📧 ОТПРАВКА ОТВЕТА (С УВЕДОМЛЕНИЕМ ПОЛЬЗОВАТЕЛЮ)
  // ============================================================
  const sendReply = async () => {
    if (!replyModal || !replyText.trim()) {
      showNotification('Введите текст ответа', 'warning');
      return;
    }

    setSendingReply(true);
    try {
      const cleanReply = replyText.trim();
      const feedbackId = replyModal.feedbackId;

      // 1. Сохраняем ответ в БД (feedback_replies)
      const { error: insertError } = await supabase
        .from('feedback_replies')
        .insert([{
          feedback_id: feedbackId,
          admin_id: replyModal.adminId || null,
          admin_email: replyModal.adminEmail || 'admin@reglay.pro',
          reply_text: cleanReply,
          created_at: new Date().toISOString()
        }]);
      if (insertError) throw insertError;

      // 2. Обновляем статус feedback на 'sent'
      const { error: updateError } = await supabase
        .from('tester_feedback')
        .update({ status: 'sent' })
        .eq('id', feedbackId);
      if (updateError) throw updateError;

      // ==========================================================
      // 🚀 3. ОТПРАВЛЯЕМ УВЕДОМЛЕНИЕ ПОЛЬЗОВАТЕЛЮ В ПРИЛОЖЕНИЕ
      // ==========================================================
      // Сначала получаем ID пользователя, которому отвечаем
      const { data: userData, error: userError } = await supabase
        .from('tester_feedback')
        .select('user_id, user_company_id')
        .eq('id', feedbackId)
        .single();

      if (userError) {
        console.warn('Не удалось получить user_id для уведомления:', userError);
      } else if (userData?.user_id) {
        // Если user_id найден, создаём уведомление в таблице notifications
        const { error: notifError } = await supabase
          .from('notifications')
          .insert([{
            user_id: userData.user_id,
            company_id: userData.user_company_id,
            title: 'Ответ на ваш отзыв',
            message: `Администратор ответил: "${cleanReply.substring(0, 80)}${cleanReply.length > 80 ? '...' : ''}"`,
            type: 'feedback_reply',
            is_read: false,
            created_at: new Date().toISOString()
          }]);

        if (notifError) {
          console.warn('Уведомление не отправилось, но ответ сохранён:', notifError);
        }
      }

      // 4. Обновляем локальный список
      setFeedbacks(prev => prev.map(f => 
        f.id === feedbackId ? { ...f, status: 'sent' } : f
      ));
      
      showNotification(`✅ Ответ отправлен пользователю ${replyModal.userName}`, 'success');
      
      setReplyModal(null);
      setReplyText('');
      await loadAllFeedback();

    } catch (err) {
      console.error('Error sending reply:', err);
      showNotification('❌ Ошибка отправки ответа: ' + err.message, 'error');
    } finally {
      setSendingReply(false);
    }
  };
  // ============================================================
  // 📋 ЭКСПОРТ В EXCEL
  // ============================================================
  const exportToExcel = useCallback(() => {
    const exportData = feedbacks.map(f => ({
      'Email': f.user_email || 'Unknown',
      'Пользователь': f.user_display_name || 'Unknown',
      'Компания': f.companies?.name || 'Unknown',
      'Статус': f.status === 'completed' ? 'Завершён' : f.status === 'sent' ? 'Отправлен' : 'Ожидает',
      'Рейтинг': f.rating || '',
      'Отзыв': f.feedback_text || '',
      'Первое впечатление': f.first_impression || '',
      'Проблемы': f.pain_points || '',
      'Используемые функции': f.most_used_features_text || f.most_used_features || '',
      'Баг-репорты': f.bugs_found || f.bugs || '',
      'Пожелания': f.feature_requests || f.wishes || '',
      'Конкуренты': f.competitors || '',
      'Готов платить': f.price_option || f.price_range || '',
      'Простота (1-5)': f.ease_of_use || '',
      'Удовлетворённость (1-5)': f.overall_satisfaction || '',
      'NPS (0-10)': f.would_recommend || '',
      'Дата создания': new Date(f.created_at).toLocaleString('ru-RU'),
      'Дата завершения': f.completed_at ? new Date(f.completed_at).toLocaleString('ru-RU') : '',
      'Ответ отправлен': f.replied_at ? new Date(f.replied_at).toLocaleString('ru-RU') : ''
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
        return <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">📧 Ответ отправлен</span>;
      case 'pending': 
        return <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">⏳ Ожидает ответа</span>;
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
          f.feedback_text?.toLowerCase().includes(term) ||
          f.user_email?.toLowerCase().includes(term) ||
          f.user_display_name?.toLowerCase().includes(term) ||
          f.companies?.name?.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [feedbacks, filter, searchTerm]);

  // ============================================================
  // 🪟 МОДАЛЬНОЕ ОКНО ОТВЕТА
  // ============================================================
  const renderReplyModal = () => {
    if (!replyModal) return null;

    return (
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setReplyModal(null);
            setReplyText('');
          }
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-lg">
                <Reply className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Ответ на отзыв
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {replyModal.userName || replyModal.userEmail}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setReplyModal(null);
                setReplyText('');
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Текст ответа
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Напишите ответ на отзыв пользователя..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none min-h-[150px]"
                maxLength={2000}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-1">
                {replyText.length}/2000
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Mail className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Ответ будет отправлен на почту пользователя: <br />
                <span className="font-medium">{replyModal.userEmail}</span>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
            <button
              onClick={() => {
                setReplyModal(null);
                setReplyText('');
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              Отмена
            </button>
            <button
              onClick={sendReply}
              disabled={sendingReply || !replyText.trim()}
              className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {sendingReply ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Отправить ответ
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

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
      {/* Header - без изменений */}
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

      {/* Stats - без изменений */}
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

      {/* Price Distribution - без изменений */}
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

      {/* Filters - без изменений */}
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

      {/* Feedback List - С КНОПКОЙ ОТВЕТИТЬ */}
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
                    <Mail className="w-5 h-5 text-blue-500" />
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
                      {feedback.user_display_name || feedback.user_email || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {feedback.companies?.name || 'Unknown'}
                    </span>
                    {feedback.rating && (
                      <span className="flex items-center gap-1 text-yellow-500">
                        ⭐ {feedback.rating}/5
                      </span>
                    )}
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
                        {feedback.feedback_text && (
                          <div>
                            <span className="font-medium">📝 Отзыв:</span>
                            <p className="mt-1">{feedback.feedback_text}</p>
                          </div>
                        )}
                        {feedback.first_impression && (
                          <div>
                            <span className="font-medium">💡 Первое впечатление:</span>
                            <p className="mt-1">{feedback.first_impression}</p>
                          </div>
                        )}
                        {feedback.pain_points && (
                          <div>
                            <span className="font-medium">😟 Проблемы:</span>
                            <p className="mt-1">{feedback.pain_points}</p>
                          </div>
                        )}
                        {feedback.most_used_features_text && (
                          <div>
                            <span className="font-medium">⚡ Используемые функции:</span>
                            <p className="mt-1">{feedback.most_used_features_text}</p>
                          </div>
                        )}
                        {(feedback.bugs_found || feedback.bugs) && (
                          <div>
                            <span className="font-medium">🐛 Баги:</span>
                            <p className="mt-1">{feedback.bugs_found || feedback.bugs}</p>
                          </div>
                        )}
                        {(feedback.feature_requests || feedback.wishes) && (
                          <div>
                            <span className="font-medium">💡 Пожелания:</span>
                            <p className="mt-1">{feedback.feature_requests || feedback.wishes}</p>
                          </div>
                        )}
                        {feedback.competitors && (
                          <div>
                            <span className="font-medium">🏆 Конкуренты:</span>
                            <p className="mt-1">{feedback.competitors}</p>
                          </div>
                        )}
                        <div className="flex gap-4 text-xs">
                          {feedback.ease_of_use && <span>Простота: {feedback.ease_of_use}/5</span>}
                          {feedback.overall_satisfaction && <span>Удовлетворённость: {feedback.overall_satisfaction}/5</span>}
                          {feedback.would_recommend && <span>NPS: {feedback.would_recommend}/10</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {feedback.feedback_text && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
                            📝 {feedback.feedback_text}
                          </p>
                        )}
                        {feedback.first_impression && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                            💡 {feedback.first_impression}
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

                {/* 🔥 КНОПКА "ОТВЕТИТЬ" */}
                {feedback.status !== 'sent' && (
                  <button
                    onClick={() => setReplyModal({
                      feedbackId: feedback.id,
                      userEmail: feedback.user_email,
                      userName: feedback.user_display_name || feedback.user_email,
                      adminId: null, // можно передать ID админа
                      adminEmail: 'admin@reglay.pro'
                    })}
                    className="flex-shrink-0 px-3 py-1.5 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors flex items-center gap-1.5 text-sm"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    Ответить
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Модальное окно ответа */}
      {renderReplyModal()}
    </div>
  );
};

export default SuperAdminFeedbackDashboard;