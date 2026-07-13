// src/hooks/useCalendarNotifications.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useCalendarNotifications = ({ 
  events, 
  user, 
  showNotification, 
  notificationHours = [24, 2, 1] // За сколько часов уведомлять
}) => {
  const [notifiedEvents, setNotifiedEvents] = useState(new Set());
  const intervalRef = useRef(null);

  // Проверка событий
  const checkUpcomingEvents = useCallback(() => {
    if (!events?.length || !user) return;

    const now = new Date();

    events.forEach(event => {
      const eventDate = new Date(event.start);
      const eventId = event.id;

      // Пропускаем уже уведомлённые
      if (notifiedEvents.has(eventId)) return;

      // Пропускаем события, которые уже прошли
      if (eventDate < now) return;

      // Проверяем каждую временную метку
      notificationHours.forEach(hours => {
        const notifyTime = new Date(eventDate.getTime() - hours * 60 * 60 * 1000);
        
        if (now >= notifyTime) {
          // Уведомление!
          const diffHours = Math.floor((eventDate - now) / (1000 * 60 * 60));
          const diffDays = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));
          
          let timeText = '';
          if (diffDays >= 1) {
            timeText = `через ${diffDays} дн. ${diffHours % 24} ч.`;
          } else if (diffHours >= 1) {
            timeText = `через ${diffHours} ч.`;
          } else {
            const diffMinutes = Math.floor((eventDate - now) / (1000 * 60));
            timeText = `через ${diffMinutes} мин.`;
          }

          const title = event.type === 'application' ? '📋 Заявка' : '📌 Задача';
          const statusText = event.isOverdue ? ' ⚠️ ПРОСРОЧЕНО!' : '';
          
          showNotification(
            `${title}: ${event.title}${statusText}\n⏰ ${timeText}`,
            event.isOverdue ? 'error' : 'info',
            false,
            () => {
              // Callback - например, перейти к событию
              console.log('Переход к событию:', event.id);
            }
          );

          // Помечаем как уведомлённое
          setNotifiedEvents(prev => new Set([...prev, eventId]));
        }
      });
    });
  }, [events, user, showNotification, notificationHours, notifiedEvents]);

  // Очистка уведомлений для удалённых событий
  const cleanupNotifiedEvents = useCallback(() => {
    const eventIds = new Set(events.map(e => e.id));
    setNotifiedEvents(prev => {
      const newSet = new Set(prev);
      for (const id of prev) {
        if (!eventIds.has(id)) {
          newSet.delete(id);
        }
      }
      return newSet;
    });
  }, [events]);

  // Запуск проверки
  useEffect(() => {
    // Первая проверка через 5 секунд
    const initialTimer = setTimeout(checkUpcomingEvents, 5000);
    
    // Периодическая проверка каждые 5 минут
    intervalRef.current = setInterval(checkUpcomingEvents, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkUpcomingEvents]);

  // Очистка при изменении событий
  useEffect(() => {
    cleanupNotifiedEvents();
  }, [events, cleanupNotifiedEvents]);

  // Ручной запуск проверки
  const forceCheck = useCallback(() => {
    checkUpcomingEvents();
  }, [checkUpcomingEvents]);

  return { forceCheck, notifiedEvents };
};

export default useCalendarNotifications;