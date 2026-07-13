import React, { useMemo } from 'react';

const CalendarHeatmap = ({ events, onDayClick, className = '' }) => {
  // Группировка событий по дням
  const heatmapData = useMemo(() => {
    const data = {};
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Инициализация всех дней
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split('T')[0];
      data[key] = { date: new Date(d), count: 0, events: [] };
    }

    // Заполнение данными
    events.forEach(event => {
      const date = new Date(event.start);
      const key = date.toISOString().split('T')[0];
      if (data[key]) {
        data[key].count++;
        data[key].events.push(event);
      }
    });

    return Object.values(data);
  }, [events]);

  // Получение интенсивности цвета
  const getIntensity = (count) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (count === 1) return 'bg-blue-200 dark:bg-blue-900/50';
    if (count === 2) return 'bg-blue-300 dark:bg-blue-800/60';
    if (count === 3) return 'bg-blue-400 dark:bg-blue-700/70';
    if (count === 4) return 'bg-blue-500 dark:bg-blue-600/80';
    if (count === 5) return 'bg-blue-600 dark:bg-blue-500/90';
    return 'bg-blue-700 dark:bg-blue-400';
  };

  // Получение размера ячейки
  const getSize = (count) => {
    if (count === 0) return 'w-3 h-3';
    if (count <= 2) return 'w-4 h-4';
    if (count <= 5) return 'w-5 h-5';
    return 'w-6 h-6';
  };

  // Группировка по неделям
  const weeks = [];
  let currentWeek = [];
  heatmapData.forEach((day, index) => {
    const dayOfWeek = day.date.getDay();
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
    if (index === heatmapData.length - 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
  });

  return (
    <div className={`p-4 bg-white/90 dark:bg-gray-800/90 rounded-xl border border-gray-200/50 dark:border-gray-700/50 ${className}`}>
      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
        📊 Тепловая карта активности
      </h4>
      
      <div className="overflow-x-auto">
        <div className="flex flex-col gap-1 min-w-[300px]">
          {/* Дни недели */}
          <div className="flex gap-1 ml-6">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
              <div key={day} className="flex-1 text-center text-[10px] text-gray-400">
                {day}
              </div>
            ))}
          </div>

          {/* Недели */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex gap-1 items-center">
              <span className="text-[10px] text-gray-400 w-5">
                {week[0]?.date?.getDate() || ''}
              </span>
              {week.map((day, dayIndex) => {
                const isToday = day.date.toDateString() === new Date().toDateString();
                return (
                  <button
                    key={`${weekIndex}-${dayIndex}`}
                    onClick={() => onDayClick?.(day.date)}
                    className={`${getIntensity(day.count)} ${getSize(day.count)} rounded transition-all hover:scale-110 hover:shadow-lg ${
                      isToday ? 'ring-2 ring-[#4A6572] ring-offset-1' : ''
                    }`}
                    title={`${day.date.toLocaleDateString('ru-RU')}: ${day.count} событий`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <span className="text-[10px] text-gray-400">Активность:</span>
        {[0, 1, 2, 3, 4, 5].map(count => (
          <div key={count} className="flex items-center gap-1">
            <span className={`${getIntensity(count)} ${getSize(count)} rounded`} />
            {count === 0 && <span className="text-[10px] text-gray-400">0</span>}
            {count === 5 && <span className="text-[10px] text-gray-400">5+</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarHeatmap;