// src/components/CalendarExport.jsx
import React from 'react';
import { Download } from 'lucide-react';

// ============================================================
// 🛠️ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (внутри файла, НЕ экспортируются)
// ============================================================

/**
 * Экранирование спецсимволов для ICS
 */
const escapeICS = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
};

/**
 * Получение текста статуса
 */
const getStatusText = (status) => {
  const map = {
    pending: 'В обработке',
    admin_processing: 'На приёмке',
    partial_received: 'Частично получено',
    received: 'Получено',
    canceled: 'Отменено',
    pending_master_confirmation: 'Ожидает подтверждения'
  };
  return map[status] || status;
};

// ============================================================
// 📤 ФУНКЦИЯ ГЕНЕРАЦИИ ICS (НЕ ЭКСПОРТИРУЕТСЯ!)
// ============================================================

/**
 * Генерация iCal/ICS файла из событий календаря
 */
const generateICS = (events, calendarName = 'Реглай PRO') => {
  if (!events?.length) return '';
  
  const now = new Date();
  const uid = `reglai-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Реглай PRO//Календарь//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:Europe/Moscow',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Moscow',
    'BEGIN:STANDARD',
    'DTSTART:20241027T030000',
    'TZOFFSETFROM:+0400',
    'TZOFFSETTO:+0300',
    'TZNAME:MSK',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:20240331T020000',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0400',
    'TZNAME:MSD',
    'END:DAYLIGHT',
    'END:VTIMEZONE'
  ];

  events.forEach((event, index) => {
    const start = new Date(event.start);
    const end = new Date(event.end || event.start);
    
    if (end.getTime() === start.getTime()) {
      end.setHours(end.getHours() + 1);
    }

    const formatDate = (date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const status = event.status === 'received' ? 'COMPLETED' : 'CONFIRMED';
    const eventUid = `${uid}-${index}`;

    ics.push(
      'BEGIN:VEVENT',
      `UID:${eventUid}`,
      `DTSTAMP:${formatDate(now)}`,
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:${escapeICS(event.title || 'Событие')}`,
      `DESCRIPTION:${escapeICS(
        [
          event.type === 'application' ? `📋 Заявка #${event.id?.slice(0, 8)}` : '📌 Задача',
          event.foreman ? `👤 Прораб: ${event.foreman}` : '',
          event.materialsCount ? `📦 Материалов: ${event.materialsCount}` : '',
          event.status ? `📊 Статус: ${getStatusText(event.status)}` : '',
          event.isOverdue ? '⚠️ ПРОСРОЧЕНО!' : ''
        ].filter(Boolean).join('\\n')
      )}`,
      `LOCATION:${escapeICS(event.objectName || 'Реглай PRO')}`,
      `STATUS:${status}`,
      `CATEGORIES:${event.type === 'application' ? 'Заявка' : 'Задача'}`,
      `PRIORITY:${event.isOverdue ? '1' : '3'}`,
      'END:VEVENT'
    );
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
};

// ============================================================
// 🎯 ЕДИНСТВЕННЫЙ ЭКСПОРТ — КОМПОНЕНТ
// ============================================================

/**
 * Компонент кнопки экспорта календаря
 */
const CalendarExportButton = ({ events, calendarName, className = '' }) => {
  const handleExport = () => {
    const icsContent = generateICS(events, calendarName);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `calendar_${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <button
      onClick={handleExport}
      disabled={!events?.length}
      className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <Download className="w-4 h-4" />
      <span>Экспорт календаря (.ics)</span>
    </button>
  );
};

export default CalendarExportButton;