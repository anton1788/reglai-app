// src/components/CalendarView.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ru';
import { 
  Package, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Bell,
  Download,
  RefreshCw,
  X,
  Eye,
  FileText
} from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// ========== ИМПОРТЫ ==========
import CalendarExportButton from './CalendarExport';
import useCalendarNotifications from '../hooks/useCalendarNotifications';
import CalendarFilters from './CalendarFilters';
import CalendarHeatmap from './CalendarHeatmap';
import { getObjectColor, getLightColor, isDarkColor } from '../utils/calendarColors';

// ============================================================
// 🔥 ПРИНУДИТЕЛЬНАЯ УСТАНОВКА РУССКОЙ ЛОКАЛИ
// ============================================================
moment.locale('ru');

// ========== СТИЛИ ==========
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
  
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  
  .slide-down {
    animation: slideDown 0.2s ease-out forwards;
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

// ========== ВСПОМОГАТЕЛЬНЫЙ КОМПОНЕНТ ==========
const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { label: 'В обработке', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    admin_processing: { label: 'На приёмке', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
    partial_received: { label: 'Частично', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    received: { label: '✅ Получено', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    canceled: { label: '❌ Отменено', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    pending_master_confirmation: { label: 'Ожидает подтверждения', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    overdue: { label: '⚠️ Просрочено', color: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-200' }
  };
  
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// ========== ОСНОВНОЙ КОМПОНЕНТ ==========
const CalendarView = ({ 
  supabase, 
  userCompanyId, 
  user, 
  t, 
  language, 
  showNotification,
  onEventClick,
  userCompany
}) => {
  // ===== СОСТОЯНИЯ =====
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterSettings, setFilterSettings] = useState({ objects: [], statuses: [], types: [] });
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [eventCount, setEventCount] = useState({ total: 0, applications: 0, tasks: 0, overdue: 0, completed: 0 });

  // ===== REFS =====
  const containerRef = useRef(null);
  const calendarRef = useRef(null);

  // ============================================================
  // 🔥 ЛОКАЛИЗАЦИЯ — ПРИНУДИТЕЛЬНО РУССКИЙ
  // ============================================================
  const localizer = useMemo(() => {
    // Всегда используем русскую локаль
    moment.locale('ru');
    return momentLocalizer(moment);
  }, []); // ← пустой массив, чтобы не пересоздавался

  // ============================================================
  // 🔥 УСТАНОВКА ЛОКАЛИ ПРИ ИЗМЕНЕНИИ ЯЗЫКА
  // ============================================================
  useEffect(() => {
    // Всегда русский язык для календаря
    moment.locale('ru');
    
    // Принудительно обновляем календарь
    setDate(prev => new Date(prev));
    setFilteredEvents(prev => [...prev]);
  }, [language]);

  // ===== ИНЪЕКЦИЯ СТИЛЕЙ =====
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = CALENDAR_STYLES;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  // ===== УВЕДОМЛЕНИЯ =====
  const { forceCheck, notifiedEvents } = useCalendarNotifications({
    events: filteredEvents,
    user,
    showNotification,
    notificationHours: [24, 2, 1]
  });

  // ===== ПОДСЧЁТ СТАТИСТИКИ =====
  const updateEventCounts = useCallback((eventsList) => {
    const counts = {
      total: eventsList.length,
      applications: eventsList.filter(e => e.type === 'application').length,
      tasks: eventsList.filter(e => e.type === 'task').length,
      overdue: eventsList.filter(e => e.isOverdue).length,
      completed: eventsList.filter(e => e.status === 'received' || e.status === 'completed').length
    };
    setEventCount(counts);
  }, []);

  // ===== ЗАГРУЗКА СОБЫТИЙ =====
  const loadCalendarEvents = useCallback(async () => {
    if (!userCompanyId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // ============================================================
      // 🔥 ЗАГРУЗКА ЗАЯВОК (applications) — поле planned_date
      // ============================================================
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select(`
          id,
          object_name,
          created_at,
          status,
          foreman_name,
          materials,
          status_history,
          planned_date,
          updated_at
        `)
        .eq('company_id', userCompanyId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (appError) throw appError;

      // ============================================================
      // 🔥 ЗАГРУЗКА ЗАДАЧ (tasks) — поле due_date
      // ============================================================
      let tasks = [];
      try {
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, title, due_date, assigned_to, status, priority, description, created_at')
          .eq('company_id', userCompanyId)
          .not('due_date', 'is', null);
        
        tasks = tasksData || [];
      } catch (taskErr) {
        console.warn('Таблица tasks не найдена:', taskErr);
      }

      // ============================================================
      // 🔥 ФОРМИРОВАНИЕ СОБЫТИЙ
      // ============================================================
      const calendarEvents = [];

      // --- События из заявок (applications) ---
      applications?.forEach(app => {
        const startDate = app.planned_date ? new Date(app.planned_date) : new Date(app.created_at);
        const lastStatus = app.status_history?.[app.status_history.length - 1];
        const endDate = lastStatus?.timestamp 
          ? new Date(lastStatus.timestamp) 
          : new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

        let isOverdue = false;
        if (app.status === 'pending') {
          const daysPending = Math.ceil((new Date() - startDate) / (1000 * 60 * 60 * 24));
          if (daysPending > 2) isOverdue = true;
        }

        calendarEvents.push({
          id: `app-${app.id}`,
          title: app.object_name || 'Без названия',
          start: startDate,
          end: endDate,
          type: 'application',
          isOverdue,
          status: app.status,
          foreman: app.foreman_name,
          materialsCount: app.materials?.length || 0,
          application: app,
          objectName: app.object_name,
          resource: {
            onClick: () => onEventClick?.('application', app)
          }
        });
      });

      // --- События из задач (tasks) с полем due_date ---
      tasks?.forEach(task => {
        const dueDate = new Date(task.due_date);
        const isOverdue = task.status !== 'completed' && dueDate < new Date();

        calendarEvents.push({
          id: `task-${task.id}`,
          title: task.title || 'Задача',
          start: dueDate,
          end: new Date(dueDate.getTime() + 60 * 60 * 1000),
          type: 'task',
          isOverdue,
          status: task.status || 'pending',
          priority: task.priority,
          assignedTo: task.assigned_to,
          task: task,
          objectName: task.title,
          resource: {
            onClick: () => onEventClick?.('task', task)
          }
        });
      });

      setEvents(calendarEvents);
      updateEventCounts(calendarEvents);
      setFilteredEvents(calendarEvents);
      
    } catch (err) {
      console.error('Ошибка загрузки событий:', err);
      setError(t('calendarLoadError') || 'Не удалось загрузить события');
      showNotification?.(t('calendarLoadError') || 'Ошибка загрузки календаря', 'error');
    } finally {
      setLoading(false);
    }
  }, [supabase, userCompanyId, t, showNotification, onEventClick, updateEventCounts]);

  // ===== ПРИМЕНЕНИЕ ФИЛЬТРОВ =====
  useEffect(() => {
    let result = events;
    
    if (filterSettings.objects.length > 0) {
      result = result.filter(e => 
        filterSettings.objects.includes(e.objectName || e.title)
      );
    }
    
    if (filterSettings.statuses.length > 0) {
      result = result.filter(e => 
        filterSettings.statuses.includes(e.status)
      );
    }
    
    if (filterSettings.types.length > 0) {
      result = result.filter(e => 
        filterSettings.types.includes(e.type)
      );
    }
    
    setFilteredEvents(result);
    updateEventCounts(result);
  }, [events, filterSettings, updateEventCounts]);

  // ===== ПОДПИСКА НА ИЗМЕНЕНИЯ =====
  useEffect(() => {
    loadCalendarEvents();
    
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

  // ===== СТИЛИЗАЦИЯ СОБЫТИЙ (С ЦВЕТОВЫМИ МЕТКАМИ) =====
  const eventStyleGetter = useCallback((event) => {
    const baseStyle = {
      borderRadius: '0.5rem',
      border: 'none',
      fontSize: '0.75rem',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    };

    if (event.isOverdue) {
      return {
        style: {
          ...baseStyle,
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white',
          animation: 'pulse 2s ease-in-out infinite'
        }
      };
    }

    let objectColor = getObjectColor(event.objectName || event.title);
    let lightColor = getLightColor(objectColor);
    const isDark = isDarkColor(objectColor);

    if (event.type === 'application' || event.type === 'task') {
      return {
        style: {
          ...baseStyle,
          background: `linear-gradient(135deg, ${objectColor}, ${lightColor})`,
          color: isDark ? 'white' : '#1a1a1a',
          borderLeft: `4px solid ${objectColor}`,
          boxShadow: `0 2px 8px ${objectColor}44`
        }
      };
    }

    return {
      style: {
        ...baseStyle,
        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
        color: 'white'
      }
    };
  }, []);

  
  // ============================================================
// 🔥 ФОРМАТЫ — РУССКИЕ
// ============================================================
const formats = useMemo(() => ({
  weekdayFormat: (date) => {
    // Принудительно русские дни недели
    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return weekdays[date.getDay()];
  },
  dayFormat: (date) => {
    return moment(date).locale('ru').format('DD');
  },
  dayHeaderFormat: (date) => {
    return moment(date).locale('ru').format('DD ddd');
  },
  monthHeaderFormat: (date) => {
    return moment(date).locale('ru').format('MMMM YYYY');
  },
  agendaHeaderFormat: ({ start, end }) => {
    return `${moment(start).locale('ru').format('LL')} — ${moment(end).locale('ru').format('LL')}`;
  }
}), []);

  // ============================================================
  // 🔥 СООБЩЕНИЯ — РУССКИЕ
  // ============================================================
  const messages = useMemo(() => ({
    allDay: 'Весь день',
    previous: 'Назад',
    next: 'Вперёд',
    today: 'Сегодня',
    month: 'Месяц',
    week: 'Неделя',
    day: 'День',
    agenda: 'Список',
    date: 'Дата',
    time: 'Время',
    event: 'Событие',
    noEventsInRange: 'Нет событий',
    showMore: (count) => `+${count} ещё`,
    work_week: 'Рабочая неделя',
    yesterday: 'Вчера',
    tomorrow: 'Завтра'
  }), []);

  // ===== ОБРАБОТЧИКИ СОБЫТИЙ =====
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    event.resource?.onClick?.();
  }, []);

  // ===== DRAG-AND-DROP =====
  const handleEventDrop = useCallback(async ({ event, start, end }) => {
    if (!event.id) return;
    
    setFilteredEvents(prev => prev.map(e => 
      e.id === event.id ? { ...e, start, end } : e
    ));
    
    // Обновление даты в БД
    if (event.type === 'application' && event.application) {
      try {
        const { error } = await supabase
          .from('applications')
          .update({ 
            planned_date: start.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', event.application.id);
        
        if (error) throw error;
        showNotification(`📅 Дата заявки "${event.title}" обновлена`, 'success');
      } catch (err) {
        console.error('Ошибка обновления даты:', err);
        showNotification('Не удалось обновить дату', 'error');
      }
    }
    
    // Обновление даты задачи (due_date)
    if (event.type === 'task' && event.task) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ 
            due_date: start.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', event.task.id);
        
        if (error) throw error;
        showNotification(`📅 Дата задачи "${event.title}" обновлена`, 'success');
      } catch (err) {
        console.error('Ошибка обновления даты задачи:', err);
        showNotification('Не удалось обновить дату задачи', 'error');
      }
    }
  }, [supabase, showNotification]);

  // ===== РЕНДЕР СОБЫТИЯ =====
  const renderEventContent = useCallback((event) => {
    const Icon = event.type === 'application' ? Package : CheckCircle;
    
    return (
      <div className="flex items-center gap-1 truncate" title={`${event.title}\n${event.foreman ? `Прораб: ${event.foreman}` : ''}`}>
        <Icon className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
        <span className="truncate">{event.title}</span>
        {event.isOverdue && (
          <AlertCircle className="w-3 h-3 flex-shrink-0 text-white/90" aria-hidden="true" />
        )}
      </div>
    );
  }, []);

  // ===== ЛЕГЕНДА ОБЪЕКТОВ =====
  const renderLegend = useCallback(() => {
    const objectGroups = {};
    filteredEvents.forEach(event => {
      const name = event.objectName || event.title;
      if (!objectGroups[name]) {
        objectGroups[name] = { count: 0, color: getObjectColor(name) };
      }
      objectGroups[name].count++;
    });

    const topObjects = Object.entries(objectGroups)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    if (topObjects.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          📊 Объекты:
        </span>
        {topObjects.map(([name, data]) => (
          <div key={name} className="flex items-center gap-1.5">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.color }}
            />
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[100px]">
              {name.length > 15 ? name.slice(0, 15) + '…' : name}
            </span>
            <span className="text-xs text-gray-400">({data.count})</span>
          </div>
        ))}
        {topObjects.length < Object.keys(objectGroups).length && (
          <span className="text-xs text-gray-400">
            +{Object.keys(objectGroups).length - topObjects.length} др.
          </span>
        )}
      </div>
    );
  }, [filteredEvents]);

  // ============================================================
  // 🔥 КАСТОМНАЯ ПАНЕЛЬ ИНСТРУМЕНТОВ — РУССКАЯ
  // ============================================================
  const CustomToolbar = useCallback((toolbar) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToToday = () => toolbar.onNavigate('TODAY');

    // Месяц на русском
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const currentDate = new Date(toolbar.label);
    const monthLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    return (
      <div className="rbc-toolbar flex flex-wrap items-center justify-between gap-2 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <button
            onClick={goToBack}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Назад"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <span className="font-semibold text-gray-900 dark:text-white min-w-[140px] text-center">
            {monthLabel}
          </span>
          <button
            onClick={goToNext}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Вперёд"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md transition-shadow flex items-center gap-1"
          >
            <CalendarIcon className="w-4 h-4" />
            Сегодня
          </button>
          
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
            {['month', 'week', 'day'].map((v) => {
              const labels = { month: 'Месяц', week: 'Неделя', day: 'День' };
              return (
                <button
                  key={v}
                  onClick={() => toolbar.onView(v)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    toolbar.view === v
                      ? 'bg-[#4A6572] text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  {labels[v]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }, []);

  // ===== КНОПКИ БЫСТРОГО ДЕЙСТВИЯ =====
  const renderQuickActions = () => (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={forceCheck}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
        title="Проверить уведомления"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {notifiedEvents.size > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
            {notifiedEvents.size}
          </span>
        )}
      </button>

      <CalendarFilters
        events={events}
        onFilterChange={setFilterSettings}
        initialFilters={filterSettings}
      />

      <button
        onClick={() => setShowHeatmap(!showHeatmap)}
        className={`p-2 rounded-lg transition-colors ${
          showHeatmap 
            ? 'bg-[#4A6572] text-white' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}
        title="Тепловая карта"
      >
        <Eye className="w-5 h-5" />
      </button>

      <button
        onClick={() => setShowExportModal(true)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
        title="Экспорт календаря"
      >
        <Download className="w-5 h-5" />
      </button>

      <button
        onClick={loadCalendarEvents}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
        title="Обновить"
      >
        <RefreshCw className="w-5 h-5" />
      </button>
    </div>
  );

  // ===== МОДАЛЬНОЕ ОКНО ЭКСПОРТА =====
  const renderExportModal = () => {
    if (!showExportModal) return null;

    return (
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-enter"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowExportModal(false);
          }
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 slide-down">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              📤 Экспорт календаря
            </h3>
            <button
              onClick={() => setShowExportModal(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Экспортировать {filteredEvents.length} событий в формате iCal/ICS
          </p>

          <div className="space-y-3">
            <CalendarExportButton
              events={filteredEvents}
              calendarName={userCompany || 'Реглай PRO'}
              className="w-full justify-center"
            />

            <button
              onClick={() => {
                const json = JSON.stringify(filteredEvents.map(e => ({
                  title: e.title,
                  start: e.start,
                  end: e.end,
                  type: e.type,
                  status: e.status
                })), null, 2);
                navigator.clipboard.writeText(json);
                showNotification('✅ Данные скопированы в буфер обмена', 'success');
                setShowExportModal(false);
              }}
              className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Копировать JSON
            </button>
          </div>

          <button
            onClick={() => setShowExportModal(false)}
            className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Отмена
          </button>
        </div>
      </div>
    );
  };

  // ===== СТАТИСТИКА =====
  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="text-2xl font-bold text-[#4A6572] dark:text-[#F9AA33]">
          {eventCount.total}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Всего</div>
      </div>
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="text-2xl font-bold text-blue-500">
          {eventCount.applications}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Заявки</div>
      </div>
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="text-2xl font-bold text-[#F9AA33]">
          {eventCount.tasks}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Задачи</div>
      </div>
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="text-2xl font-bold text-red-500">
          {eventCount.overdue}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Просрочено</div>
      </div>
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="text-2xl font-bold text-green-500">
          {eventCount.completed}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Завершено</div>
      </div>
    </div>
  );

  // ===== ЗАГРУЗКА =====
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A6572] mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Загрузка календаря...</p>
        </div>
      </div>
    );
  }

  // ===== ОШИБКА =====
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
            Повторить
          </button>
        </div>
      </div>
    );
  }

  // ===== ОСНОВНОЙ РЕНДЕР =====
  return (
    <div className="reglai-calendar space-y-4 page-enter" ref={containerRef}>
      {renderStats()}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {renderLegend()}
        {renderQuickActions()}
      </div>

      {showHeatmap && (
        <CalendarHeatmap
          events={filteredEvents}
          onDayClick={(date) => {
            setDate(date);
            setView('day');
            setShowHeatmap(false);
          }}
        />
      )}

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
        <Calendar
          ref={calendarRef}
          localizer={localizer}
          events={filteredEvents}
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
          onEventDrop={handleEventDrop}
          draggableAccessor={() => true}
          resizableAccessor={() => true}
          onEventResize={handleEventDrop}
          step={30}
          timeslots={2}
        />
      </div>

      {/* Модальное окно события */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-enter"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedEvent(null);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 slide-down"
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
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>
                    {moment(selectedEvent.start).locale('ru').format('DD.MM.YYYY HH:mm')}
                    {selectedEvent.end && selectedEvent.end.getTime() !== selectedEvent.start.getTime() && (
                      ` — ${moment(selectedEvent.end).locale('ru').format('HH:mm')}`
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
                    <span>{selectedEvent.materialsCount} материалов</span>
                  </div>
                )}
                
                {selectedEvent.status && (
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedEvent.isOverdue ? 'overdue' : selectedEvent.status} />
                  </div>
                )}
                
                {selectedEvent.isOverdue && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">⚠️ Просрочено!</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {selectedEvent.type === 'application' && (
                  <button
                    onClick={() => {
                      onEventClick?.('application', selectedEvent.application);
                      setSelectedEvent(null);
                    }}
                    className="px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors text-sm font-medium"
                  >
                    📋 Открыть заявку
                  </button>
                )}
                
                {selectedEvent.type === 'task' && (
                  <button
                    onClick={() => {
                      onEventClick?.('task', selectedEvent.task);
                      setSelectedEvent(null);
                    }}
                    className="px-4 py-2 bg-[#F9AA33] text-gray-800 rounded-lg hover:bg-[#F57C00] transition-colors text-sm font-medium"
                  >
                    📌 Открыть задачу
                  </button>
                )}
                
                <button
                  onClick={() => {
                    const text = `${selectedEvent.title}\n${moment(selectedEvent.start).locale('ru').format('DD.MM.YYYY HH:mm')}\n${selectedEvent.foreman ? `Прораб: ${selectedEvent.foreman}` : ''}`;
                    navigator.clipboard.writeText(text);
                    showNotification('✅ Данные скопированы', 'success');
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                >
                  📋 Копировать
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {renderExportModal()}
    </div>
  );
};

export default React.memo(CalendarView);