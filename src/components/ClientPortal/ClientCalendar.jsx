// src/components/ClientPortal/ClientCalendar.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const ClientCalendar = ({ clientId, t }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

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
        .eq('client_id', clientId);
      
      // 🔥 Обработка ошибки запроса
      if (queryError) {
        console.error('❌ Ошибка загрузки событий:', queryError);
        
        // Обработка специфичных ошибок Supabase
        if (queryError.code === 'PGRST116' || queryError.status === 404) {
          setError('Таблица заявок не найдена. Обратитесь к администратору.');
        } else if (queryError.code === '401' || queryError.code === '403') {
          setError('Нет прав для просмотра календаря.');
        } else {
          setError(queryError.message || 'Ошибка загрузки данных');
        }
        
        setEvents([]);
        return;
      }

      // 🔥 КРИТИЧЕСКАЯ ПРОВЕРКА: что data — это массив
      if (!Array.isArray(applications)) {
        console.warn('⚠️ Ожидался массив заявок, получено:', applications);
        setEvents([]);
        return;
      }
      
      const calendarEvents = applications.map(app => ({
        id: app.id,
        title: app.object_name,
        date: app.created_at,
        status: app.status,
        type: 'application',
        foreman: app.foreman_name,
        phone: app.foreman_phone,
        materials: Array.isArray(app.materials) ? app.materials : []
      }));
      
      setEvents(calendarEvents);
    } catch (err) {
      console.error('❌ Критическая ошибка загрузки календаря:', err);
      setError(err.message || 'Неизвестная ошибка');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const getEventsForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // 🔥 Безопасная фильтрация
    return Array.isArray(events) 
      ? events.filter(event => event?.date?.startsWith(dateStr))
      : [];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'received': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending_master_confirmation': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'canceled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'received': return <CheckCircle className="w-4 h-4" />;
      case 'canceled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status) => {
    const map = {
      pending: t?.('clientCalendar.statusPending') || 'В обработке',
      admin_processing: t?.('clientCalendar.statusAdminProcessing') || 'Приёмка материалов',
      partial_received: t?.('clientCalendar.statusPartial') || 'Частично выполнено',
      pending_master_confirmation: t?.('clientCalendar.statusPendingConfirm') || 'Ожидает подтверждения',
      received: t?.('clientCalendar.statusCompleted') || 'Выполнено',
      canceled: t?.('clientCalendar.statusCanceled') || 'Отменено'
    };
    return map[status] || status;
  };

  const changeMonth = (delta) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthNames = t?.('months') || [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const weekDays = t?.('weekdaysShort') || ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
        <AlertCircle className="w-12 h-12 mx-auto mb-3" />
        <p className="font-medium mb-2">{t?.('clientCalendar.loadError') || 'Ошибка загрузки'}</p>
        <p className="text-sm mb-4">{error}</p>
        <button 
          onClick={loadEvents}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          {t?.('retry') || 'Повторить'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {t?.('clientCalendar.title') || 'Календарь работ'}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t?.('previousMonth') || 'Предыдущий месяц'}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-medium px-4 py-1">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t?.('nextMonth') || 'Следующий месяц'}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, idx) => (
          <div key={idx} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, idx) => (
          <div key={`empty-${idx}`} className="min-h-[100px] bg-gray-50 dark:bg-gray-700/30 rounded-lg p-1" />
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const dayEvents = getEventsForDay(day);
          const isToday = day === new Date().getDate() && 
                         year === new Date().getFullYear() && 
                         month === new Date().getMonth();
          
          return (
            <div
              key={day}
              className={`min-h-[100px] bg-white dark:bg-gray-800 border rounded-lg p-1 overflow-y-auto ${
                isToday ? 'border-indigo-500 border-2' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className={`text-right text-sm font-medium mb-1 ${
                isToday ? 'text-indigo-600' : 'text-gray-500'
              }`}>
                {day}
              </div>
              <div className="space-y-1">
                {/* 🔥 Безопасный рендеринг событий */}
                {Array.isArray(dayEvents) && dayEvents.length > 0 ? (
                  dayEvents.map((event) => (
                    <button
                      key={event?.id || `event-${day}-${idx}`}
                      onClick={() => event?.id && setSelectedEvent(event)}
                      className={`w-full text-left text-xs p-1 rounded ${getStatusColor(event?.status)} transition-colors hover:opacity-80`}
                      disabled={!event?.id}
                    >
                      <div className="flex items-center gap-1">
                        {getStatusIcon(event?.status)}
                        <span className="truncate">{event?.title || t?.('clientCalendar.untitled') || 'Без названия'}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 px-1">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{selectedEvent.title || t?.('clientCalendar.untitled')}</h3>
              <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-gray-100 rounded-lg" aria-label={t?.('close') || 'Закрыть'}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString() : '—'}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                {getStatusIcon(selectedEvent.status)}
                <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(selectedEvent.status)}`}>
                  {getStatusText(selectedEvent.status)}
                </span>
              </div>
              
              {selectedEvent.foreman && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div>{t?.('clientCalendar.foreman') || 'Прораб'}: {selectedEvent.foreman}</div>
                  <div>{t?.('clientCalendar.phone') || 'Телефон'}: {selectedEvent.phone}</div>
                </div>
              )}
              
              {selectedEvent.materials && Array.isArray(selectedEvent.materials) && selectedEvent.materials.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-medium mb-2">{t?.('clientCalendar.materials') || 'Материалы'}:</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedEvent.materials.map((m, idx) => (
                      <div key={idx} className="text-sm flex justify-between border-b pb-1">
                        <span>{m.description || '—'}</span>
                        <span>{m.received || 0}/{m.quantity || 0} {m.unit || 'шт'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientCalendar;