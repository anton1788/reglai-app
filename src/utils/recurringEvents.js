// src/utils/recurringEvents.js
import React, { useState } from 'react';

/**
 * Генерация повторяющихся событий
 */
export const generateRecurringEvents = (baseEvent, recurrence) => {
  if (!recurrence || !recurrence.type) return [baseEvent];
  
  const events = [];
  const { type, interval = 1, count = 10, endDate } = recurrence;
  const startDate = new Date(baseEvent.start);
  const end = endDate ? new Date(endDate) : null;
  
  for (let i = 0; i < count; i++) {
    if (end && startDate > end) break;
    
    const newEvent = {
      ...baseEvent,
      id: `${baseEvent.id}-${i}`,
      start: new Date(startDate),
      end: new Date(startDate.getTime() + (baseEvent.end - baseEvent.start))
    };
    
    events.push(newEvent);
    
    // Увеличиваем дату
    switch (type) {
      case 'daily':
        startDate.setDate(startDate.getDate() + interval);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() + 7 * interval);
        break;
      case 'biweekly':
        startDate.setDate(startDate.getDate() + 14 * interval);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() + interval);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() + interval);
        break;
      default:
        return [baseEvent];
    }
  }
  
  return events;
};

/**
 * Компонент настройки повторения
 */
export const RecurrenceSettings = ({ value, onChange }) => {
  const [recurrence, setRecurrence] = useState(value || { type: 'none' });

  const handleChange = (key, val) => {
    const newRecurrence = { ...recurrence, [key]: val };
    setRecurrence(newRecurrence);
    onChange?.(newRecurrence);
  };

  return (
    <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Повторение:
        </label>
        <select
          value={recurrence.type}
          onChange={(e) => handleChange('type', e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-700"
        >
          <option value="none">Нет</option>
          <option value="daily">Ежедневно</option>
          <option value="weekly">Еженедельно</option>
          <option value="biweekly">Раз в 2 недели</option>
          <option value="monthly">Ежемесячно</option>
          <option value="yearly">Ежегодно</option>
        </select>
      </div>

      {recurrence.type !== 'none' && (
        <>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Интервал:
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={recurrence.interval || 1}
              onChange={(e) => handleChange('interval', parseInt(e.target.value) || 1)}
              className="w-16 px-2 py-1 text-sm border rounded-lg bg-white dark:bg-gray-700"
            />
            <span className="text-sm text-gray-500">повтор(ов)</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              Количество:
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={recurrence.count || 10}
              onChange={(e) => handleChange('count', parseInt(e.target.value) || 10)}
              className="w-16 px-2 py-1 text-sm border rounded-lg bg-white dark:bg-gray-700"
            />
            <span className="text-sm text-gray-500">событий</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              До даты:
            </label>
            <input
              type="date"
              value={recurrence.endDate || ''}
              onChange={(e) => handleChange('endDate', e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-700"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default {
  generateRecurringEvents,
  RecurrenceSettings
};