// src/components/ClientPortal/ClientCalendar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle, X, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const ClientCalendar = ({ clientId, t }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // 🔥 Хелпер для безопасного перевода
  const translate = useCallback((key, fallback) => {
    if (typeof t === 'function') {
      const result = t(key);
      return result !== key ? result : fallback;
    }
    return fallback;
  }, [t]);

  const loadEvents = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: applications, error: queryError } = await supabase
        .from('applications')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      // 🔥 Обработка ошибок Supabase
      if (queryError) {
        console.error('❌ Ошибка загрузки событий:', queryError);
        
        let errorMessage = translate('clientCalendar.loadError', 'Ошибка загрузки данных');
        
        if (queryError.code === 'PGRST116' || queryError.status === 404) {
          errorMessage = translate('clientCalendar.tableNotFound', 'Таблица заявок не найдена');
        } else if (queryError.code === '401' || queryError.code === 'PGRST301') {
          errorMessage = translate('clientCalendar.noPermissions', 'Нет прав для просмотра');
        } else if (queryError.message) {
          errorMessage = queryError.message;
        }
        
        setError(errorMessage);
        setEvents([]);
        return;
      }

      // 🔥 Валидация: data должен быть массивом
      const applicationsArray = Array.isArray(applications) ? applications : [];
      
      const calendarEvents = applicationsArray
        .filter(app => app?.created_at) // 🔥 Фильтруем записи без даты
        .map(app => ({
          id: app.id,
          title: app.object_name || translate('clientCalendar.untitled', 'Без названия'),
          date: app.created_at,
          status: app.status || 'pending',
          type: 'application',
          foreman: app.foreman_name,
          phone: app.foreman_phone,
          materials: Array.isArray(app.materials) ? app.materials : []
        }));
      
      setEvents(calendarEvents);
    } catch (err) {
      console.error('❌ Критическая ошибка загрузки календаря:', err);
      setError(err.message || translate('clientCalendar.unknownError', 'Неизвестная ошибка'));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [clientId, translate]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // 🔥 Обработка Escape для закрытия модалки
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && selectedEvent) {
        setSelectedEvent(null);
      }
    };
    
    if (selectedEvent) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [selectedEvent]);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const getEventsForDay = (day) => {
    // 🔥 Исправлено: корректное сравнение дат с учётом таймзоны
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const targetStr = targetDate.toISOString().split('T')[0];
    
    return events.filter(event => {
      if (!event?.date) return false;
      const eventDate = new Date(event.date);
      const eventStr = eventDate.toISOString().split('T')[0];
      return eventStr === targetStr;
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      received: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300',
      pending_master_confirmation: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
      canceled: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300',
      partial_received: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300',
      pending: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
      admin_processing: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300'
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'received': return <CheckCircle className="w-4 h-4 flex-shrink-0" />;
      case 'canceled': return <X className="w-4 h-4 flex-shrink-0" />;
      default: return <Clock className="w-4 h-4 flex-shrink-0" />;
    }
  };

  const getStatusText = (status) => {
    const map = {
      pending: translate('clientCalendar.statusPending', 'В обработке'),
      admin_processing: translate('clientCalendar.statusAdminProcessing', 'Приёмка'),
      partial_received: translate('clientCalendar.statusPartial', 'Частично'),
      pending_master_confirmation: translate('clientCalendar.statusPendingConfirm', 'Ожидает подтверждения'),
      received: translate('clientCalendar.statusCompleted', 'Выполнено'),
      canceled: translate('clientCalendar.statusCanceled', 'Отменено')
    };
    return map[status] || status;
  };

  const changeMonth = (delta) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthNames = translate('months', 'Январь,Февраль,Март,Апрель,Май,Июнь,Июль,Август,Сентябрь,Октябрь,Ноябрь,Декабрь').split(',');
  const weekDays = translate('weekdaysShort', 'Вс,Пн,Вт,Ср,Чт,Пт,Сб').split(',');

  // 🔥 Loading state
  if (loading) {
    return (
      <div className="text-center py-12" role="status" aria-live="polite">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">{translate('clientCalendar.loading', 'Загрузка...')}</p>
      </div>
    );
  }

  // 🔥 Error state с кнопкой повтора
  if (error) {
    return (
      <div className="text-center py-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl p-6" role="alert">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-80" />
        <p className="font-medium mb-2">{translate('clientCalendar.loadError', 'Ошибка загрузки')}</p>
        <p className="text-sm mb-4 opacity-80">{error}</p>
        <button 
          onClick={loadEvents}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          aria-label={translate('clientCalendar.retry', 'Повторить загрузку')}
        >
          <RefreshCw className="w-4 h-4" />
          {translate('clientCalendar.retry', 'Повторить')}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4" role="region" aria-label={translate('clientCalendar.title', 'Календарь работ')}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
          <Calendar className="w-5 h-5" aria-hidden="true" />
          {translate('clientCalendar.title', 'Календарь работ')}
        </h2>
        <div className="flex items-center gap-1" role="navigation" aria-label={translate('clientCalendar.monthNavigation', 'Навигация по месяцам')}>
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label={translate('clientCalendar.previousMonth', 'Предыдущий месяц')}
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="text-lg font-medium px-4 py-1 text-gray-900 dark:text-white min-w-[140px] text-center" aria-live="polite">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label={translate('clientCalendar.nextMonth', 'Следующий месяц')}
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2" role="row">
        {weekDays.map((day, idx) => (
          <div 
            key={`weekday-${idx}`} 
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2"
            role="columnheader"
            aria-label={day}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={translate('clientCalendar.calendarGrid', 'Сетка календаря')}>
        {/* Empty cells for days before first day of month */}
        {Array.from({ length: firstDay }).map((_, idx) => (
          <div 
            key={`empty-${idx}`} 
            className="min-h-[100px] bg-gray-50 dark:bg-gray-700/30 rounded-lg p-1"
            aria-hidden="true"
          />
        ))}
        
        {/* Days of month */}
        {Array.from({ length: daysInMonth }, (_, idx) => {
          const day = idx + 1;
          const dayEvents = getEventsForDay(day);
          const today = new Date();
          const isToday = day === today.getDate() && 
                         year === today.getFullYear() && 
                         month === today.getMonth();
          
          return (
            <div
              key={`day-${day}`}
              className={`min-h-[100px] bg-white dark:bg-gray-800 border rounded-lg p-1 overflow-y-auto transition-colors ${
                isToday 
                  ? 'border-indigo-500 border-2 ring-1 ring-indigo-200 dark:ring-indigo-800' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              role="gridcell"
              aria-label={`${day} ${monthNames[month]} ${year}`}
            >
              <div className={`text-right text-sm font-medium mb-1 ${
                isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {day}
              </div>
              <div className="space-y-1">
                {dayEvents.length > 0 ? (
                  dayEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => event?.id && setSelectedEvent(event)}
                      className={`w-full text-left text-xs p-1.5 rounded border transition-all hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-offset-1 ${getStatusColor(event.status)}`}
                      disabled={!event?.id}
                      aria-label={`${event.title}: ${getStatusText(event.status)}`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        {getStatusIcon(event.status)}
                        <span className="truncate flex-1">{event.title}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-600 px-1 block text-center">·</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-enter" 
          onClick={() => setSelectedEvent(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-modal-title"
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 id="event-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedEvent.title}
              </h3>
              <button 
                onClick={() => setSelectedEvent(null)} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label={translate('clientCalendar.closeModal', 'Закрыть')}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <span>
                  {selectedEvent.date 
                    ? new Date(selectedEvent.date).toLocaleDateString(translate('locale', 'ru-RU'), {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : '—'
                  }
                </span>
              </div>
              
              {/* Status */}
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedEvent.status)}
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedEvent.status)}`}>
                  {getStatusText(selectedEvent.status)}
                </span>
              </div>
              
              {/* Foreman info */}
              {(selectedEvent.foreman || selectedEvent.phone) && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                    {translate('clientCalendar.contact', 'Контакт')}
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {selectedEvent.foreman && (
                      <div>{translate('clientCalendar.foreman', 'Прораб')}: {selectedEvent.foreman}</div>
                    )}
                    {selectedEvent.phone && (
                      <div>{translate('clientCalendar.phone', 'Телефон')}: {selectedEvent.phone}</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Materials list */}
              {selectedEvent.materials?.length > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                    {translate('clientCalendar.materials', 'Материалы')}
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedEvent.materials.map((m, idx) => (
                      <div key={idx} className="text-sm flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
                          {m.description || translate('clientCalendar.noDescription', '—')}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                          {m.received || 0}/{m.quantity || 0} {m.unit || translate('clientCalendar.unit', 'шт')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {translate('clientCalendar.close', 'Закрыть')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ClientCalendar);