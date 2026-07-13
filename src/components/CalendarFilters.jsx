import React, { useState, useMemo } from 'react';
import { Filter, X, Check } from 'lucide-react';

const CalendarFilters = ({ 
  events, 
  onFilterChange, 
  initialFilters = {},
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    objects: [],
    statuses: [],
    types: [],
    ...initialFilters
  });

  // Получение уникальных значений для фильтров
  const filterOptions = useMemo(() => {
    const objects = new Set();
    const statuses = new Set();
    const types = new Set();

    events.forEach(event => {
      const name = event.objectName || event.title;
      if (name) objects.add(name);
      if (event.status) statuses.add(event.status);
      if (event.type) types.add(event.type);
    });

    return {
      objects: Array.from(objects).sort(),
      statuses: Array.from(statuses).sort(),
      types: Array.from(types).sort()
    };
  }, [events]);

  // Переключение фильтра
  const toggleFilter = (category, value) => {
    setFilters(prev => {
      const current = prev[category] || [];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      
      const newFilters = { ...prev, [category]: newValues };
      onFilterChange?.(newFilters);
      return newFilters;
    });
  };

  // Очистка всех фильтров
  const clearFilters = () => {
    const empty = { objects: [], statuses: [], types: [] };
    setFilters(empty);
    onFilterChange?.(empty);
  };

  // Активные фильтры
  const activeCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  // Рендер группы фильтров
  const renderFilterGroup = (title, category, options) => {
    if (!options.length) return null;

    return (
      <div className="mb-3">
        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
          {title}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {options.map(option => {
            const isActive = filters[category]?.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggleFilter(category, option)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all flex items-center gap-1 ${
                  isActive
                    ? 'bg-[#4A6572] text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {isActive && <Check className="w-3 h-3" />}
                {option.length > 20 ? option.slice(0, 18) + '…' : option}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
          activeCount > 0
            ? 'bg-[#4A6572] text-white shadow-md'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">Фильтры</span>
        {activeCount > 0 && (
          <span className="bg-white text-[#4A6572] text-xs px-1.5 py-0.5 rounded-full font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-30">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900 dark:text-white">Фильтры</h3>
            <div className="flex gap-2">
              {activeCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-red-500 hover:text-red-700 dark:text-red-400"
                >
                  Очистить
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {renderFilterGroup('Объекты', 'objects', filterOptions.objects)}
            {renderFilterGroup('Статусы', 'statuses', filterOptions.statuses)}
            {renderFilterGroup('Типы', 'types', filterOptions.types)}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <span className="text-xs text-gray-400">
              {activeCount > 0 ? `${activeCount} фильтр(ов) активно` : 'Все события показаны'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarFilters;