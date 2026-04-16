// src/components/CalendarView.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ru'; // ✅ Импортируем русскую локаль!
import { 
  Package, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Кастомные стили для календаря
const CALENDAR_STYLES = `
  .reglai-calendar .rbc-toolbar {
    margin-bottom: 1rem;
    padding: 0.5rem;
    background: var(--color-surface);
    border-radius: 0.75rem;
    border: 1px solid var(--color-border, rgba(0,0,0,0.1));
  }
  
  .dark .reglai-calendar .rbc-toolbar {
    background: var(--color-surface);
    border-color: rgba(255,255,255,0.1);
  }
  
  .reglai-calendar .rbc-toolbar button {
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .reglai-calendar .rbc-toolbar button.rbc-active {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: white;
    border: none;
    box-shadow: 0 2px 8px rgba(74, 101, 114, 0.3);
  }
  
  .reglai-calendar .rbc-header {
    padding: 0.75rem 0.25rem;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.75rem;
    color: var(--color-text-light);
    border-bottom-color: var(--color-border, rgba(0,0,0,0.1));
  }
  
  .reglai-calendar .rbc-day-bg {
    border-color: var(--color-border, rgba(0,0,0,0.1));
  }
  
  .reglai-calendar .rbc-off-range-bg {
    background: var(--color-background);
  }
  
  .reglai-calendar .rbc-today {
    background: linear-gradient(135deg, rgba(249, 170, 51, 0.15), transparent);
  }
  
  .reglai-calendar .rbc-event {
    border: none;
    border-radius: 0.5rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  
  .reglai-calendar .rbc-event:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  
  .reglai-calendar .rbc-event.application {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  }
  
  .reglai-calendar .rbc-event.task {
    background: linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark));
    color: #1a1a1a;
  }
  
  .reglai-calendar .rbc-event.overdue {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    animation: pulse 2s ease-in-out infinite;
  }
  
  .reglai-calendar .rbc-event-label {
    font-weight: 500;
  }
  
  .reglai-calendar .rbc-time-view .rbc-time-header-content {
    border-left-color: var(--color-border, rgba(0,0,0,0.1));
  }
  
  .reglai-calendar .rbc-time-view .rbc-time-content {
    border-top-color: var(--color-border, rgba(0,0,0,0.1));
  }
  
  .reglai-calendar .rbc-timeslot-group {
    border-bottom-color: var(--color-border, rgba(0,0,0,0.1));
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
  }
  
  @media (max-width: 768px) {
    .reglai-calendar .rbc-toolbar {
      flex-direction: column;
      gap: 0.5rem;
    }
    .reglai-calendar .rbc-toolbar-label {
      order: -1;
      font-size: 1rem;
    }
    .reglai-calendar .rbc-event {
      font-size: 0.7rem;
      padding: 0.2rem 0.4rem;
    }
  }
`;

const CalendarView = ({ 
  supabase, 
  userCompanyId, 
  user, // eslint-disable-line no-unused-vars
  userRole, // eslint-disable-line no-unused-vars
  t, 
  language, 
  showNotification,
  onEventClick 
}) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  // ✅ Localizer с пересозданием при смене языка
  const localizer = useMemo(() => {
    // Убеждаемся, что локаль установлена
    moment.locale(language === 'ru' ? 'ru' : 'en');
    return momentLocalizer(moment);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Инъекция стилей
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = CALENDAR_STYLES;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  // ✅ Установка локали moment.js при изменении языка
  useEffect(() => {
    moment.locale(language === 'ru' ? 'ru' : 'en');
    // Форсируем перерисовку календаря при смене языка
    setDate(prev => new Date(prev));
  }, [language]);

  // Загрузка событий из Supabase
  const loadCalendarEvents = useCallback(async () => {
    if (!userCompanyId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Загрузка заявок
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select(`
          id,
          object_name,
          created_at,
          status,
          foreman_name,
          materials,
          status_history
        `)
        .eq('company_id', userCompanyId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (appError) throw appError;

      // Загрузка задач (если таблица существует)
      let tasks = [];
      try {
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, title, deadline, assigned_to, status, priority')
          .eq('company_id', userCompanyId)
          .not('deadline', 'is', null);
        
        tasks = tasksData || [];
      } catch (taskErr) {
        console.warn('Таблица tasks не найдена или недоступна:', taskErr);
      }

      // Формирование событий календаря
      const calendarEvents = [];

      // События из заявок
      applications?.forEach(app => {
        const startDate = new Date(app.created_at);
        const lastStatus = app.status_history?.[app.status_history.length - 1];
        const endDate = lastStatus?.timestamp 
          ? new Date(lastStatus.timestamp) 
          : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        let eventType = 'application';
        let isOverdue = false;

        if (app.status === 'pending') {
          const daysPending = Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24));
          if (daysPending > 2) isOverdue = true;
        }

        calendarEvents.push({
          id: `app-${app.id}`,
          title: `${app.object_name}`,
          start: startDate,
          end: endDate,
          type: eventType,
          isOverdue,
          status: app.status,
          foreman: app.foreman_name,
          materialsCount: app.materials?.length || 0,
          application: app,
          resource: {
            onClick: () => onEventClick?.('application', app)
          }
        });
      });

      // События из задач
      tasks?.forEach(task => {
        const deadline = new Date(task.deadline);
        const isOverdue = task.status !== 'completed' && deadline < new Date();

        calendarEvents.push({
          id: `task-${task.id}`,
          title: `${task.title}`,
          start: deadline,
          end: new Date(deadline.getTime() + 60 * 60 * 1000),
          type: 'task',
          isOverdue,
          status: task.status,
          priority: task.priority,
          assignedTo: task.assigned_to,
          task: task,
          resource: {
            onClick: () => onEventClick?.('task', task)
          }
        });
      });

      setEvents(calendarEvents);
    } catch (err) {
      console.error('Ошибка загрузки событий календаря:', err);
      setError(t('calendarLoadError') || 'Не удалось загрузить события');
      showNotification?.(t('calendarLoadError') || 'Ошибка загрузки календаря', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, userCompanyId, t, showNotification, onEventClick]);

  useEffect(() => {
    loadCalendarEvents();
    
    // Подписка на изменения в реальном времени
    const channel = supabase
      .channel('calendar_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `company_id=eq.${userCompanyId}`
        },
        () => loadCalendarEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCalendarEvents, supabase, userCompanyId]);

  // Форматирование заголовка события
  const eventStyleGetter = useCallback((event) => {
    const baseStyle = {
      borderRadius: '0.5rem',
      border: 'none',
      fontSize: '0.75rem',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem'
    };

    if (event.isOverdue) {
      return {
        style: {
          ...baseStyle,
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          animation: 'pulse 2s ease-in-out infinite'
        }
      };
    }

    if (event.type === 'application') {
      return {
        style: {
          ...baseStyle,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))'
        }
      };
    }

    return {
      style: {
        ...baseStyle,
        background: 'linear-gradient(135deg, var(--color-secondary), var(--color-secondary-dark))',
        color: '#1a1a1a'
      }
    };
  }, []);

  // ✅ Форматы с зависимостью от language
  const formats = useMemo(() => ({
    weekdayFormat: (date, culture, localizer) => 
      localizer.format(date, 'ddd', culture).toUpperCase(),
    dayFormat: (date) => moment(date).format('DD'),
    dayHeaderFormat: (date) => moment(date).format('DD ddd'),
    monthHeaderFormat: (date) => moment(date).format('MMMM YYYY'),
    agendaHeaderFormat: ({ start, end }, culture, localizer) =>
      `${localizer.format(start, 'LL', culture)} — ${localizer.format(end, 'LL', culture)}`
  }), [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Сообщения календаря с полной локализацией
  const messages = useMemo(() => ({
    allDay: t('allDay') || 'Весь день',
    previous: t('previous') || 'Назад',
    next: t('next') || 'Вперёд',
    today: t('today') || 'Сегодня',
    month: t('month') || 'Месяц',
    week: t('week') || 'Неделя',
    day: t('day') || 'День',
    agenda: t('agenda') || 'Список',
    date: t('date') || 'Дата',
    time: t('time') || 'Время',
    event: t('event') || 'Событие',
    noEventsInRange: t('noEvents') || 'Нет событий',
    showMore: (count) => `+${count} ${t('more') || 'ещё'}`,
    // Дополнительные ключи react-big-calendar
    work_week: language === 'ru' ? 'Рабочая неделя' : 'Work week',
    yesterday: language === 'ru' ? 'Вчера' : 'Yesterday',
    tomorrow: language === 'ru' ? 'Завтра' : 'Tomorrow'
  }), [t, language]);

  // Обработчик клика по событию
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    event.resource?.onClick?.();
  }, []);

  // Рендер содержимого события
  const renderEventContent = useCallback((event) => {
    const icon = event.type === 'application' ? Package : CheckCircle;
    const Icon = icon;
    
    return (
      <div className="flex items-center gap-1 truncate" title={event.title}>
        <Icon className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
        <span className="truncate">{event.title}</span>
        {event.isOverdue && (
          <AlertCircle className="w-3 h-3 flex-shrink-0 text-white/90" aria-hidden="true" />
        )}
      </div>
    );
  }, []);

  // Кастомная панель инструментов
  const CustomToolbar = useCallback((toolbar) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToToday = () => toolbar.onNavigate('TODAY');

    return (
      <div className="rbc-toolbar flex flex-wrap items-center justify-between gap-2 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <button
            onClick={goToBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('previous')}
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <span className="font-semibold text-gray-900 dark:text-white min-w-[140px] text-center">
            {moment(toolbar.label).format('MMMM YYYY')}
          </span>
          <button
            onClick={goToNext}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={t('next')}
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md transition-shadow flex items-center gap-1"
          >
            <CalendarIcon className="w-4 h-4" />
            {t('today')}
          </button>
          
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
            {['month', 'week', 'day'].map((v) => (
              <button
                key={v}
                onClick={() => toolbar.onView(v)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  toolbar.view === v
                    ? 'bg-[#4A6572] text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {t(v)}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }, [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A6572] mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">{t('loadingCalendar')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-red-200 dark:border-red-800">
        <div className="text-center p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">{error}</p>
          <button
            onClick={loadCalendarEvents}
            className="px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reglai-calendar space-y-4 page-enter">
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="text-2xl font-bold text-[#4A6572] dark:text-[#F9AA33]">
            {events.filter(e => e.type === 'application').length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('applications')}</div>
        </div>
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="text-2xl font-bold text-[#F9AA33]">
            {events.filter(e => e.type === 'task').length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('tasks')}</div>
        </div>
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="text-2xl font-bold text-red-500">
            {events.filter(e => e.isOverdue).length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('overdue')}</div>
        </div>
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <div className="text-2xl font-bold text-green-500">
            {events.filter(e => e.status === 'received' || e.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('completed')}</div>
        </div>
      </div>

      {/* Календарь */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          date={date}
          onView={setView}
          onNavigate={setDate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          components={{
            event: renderEventContent,
            toolbar: CustomToolbar
          }}
          formats={formats}
          messages={messages}
          style={{ height: 600 }}
          className="rounded-xl"
          popup
          showMultiDayTimes
          min={new Date(2024, 0, 1, 8, 0)}
          max={new Date(2024, 0, 1, 20, 0)}
        />
      </div>

      {/* Модальное окно события */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-enter"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                {selectedEvent.type === 'application' ? (
                  <Package className="w-5 h-5 text-[#4A6572]" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-[#F9AA33]" />
                )}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>
                  {moment(selectedEvent.start).format('DD.MM.YYYY HH:mm')}
                  {selectedEvent.end && selectedEvent.end.getTime() !== selectedEvent.start.getTime() && (
                    ` — ${moment(selectedEvent.end).format('HH:mm')}`
                  )}
                </span>
              </div>
              
              {selectedEvent.foreman && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4" />
                  <span>{selectedEvent.foreman}</span>
                </div>
              )}
              
              {selectedEvent.materialsCount > 0 && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Package className="w-4 h-4" />
                  <span>{selectedEvent.materialsCount} {t('materials')}</span>
                </div>
              )}
              
              {selectedEvent.isOverdue && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>{t('overdueItem')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CalendarView);