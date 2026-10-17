// src/components/Objects/ObjectSelector.jsx
// ============================================================
// Умный автокомплит для выбора/создания объекта
// Заменяет старый ObjectInput в форме заявки
// ============================================================

import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  Search, Plus, Building2, MapPin, X, Loader2, Check, AlertCircle
} from 'lucide-react';
import { listObjects, findOrCreateObject, normalizeObjectName } from '../../api/objects';

const DEBOUNCE_MS = 300;

// ────────────────────────────────────────────────────────────
// Компонент
// ────────────────────────────────────────────────────────────
const ObjectSelector = memo(({
  companyId,
  userId,
  value,                 // текущий object_id (или '')
  valueName,             // текущее имя (для отображения)
  onChange,              // ({ objectId, name }) => void
  language = 'ru',
  showNotification,
  required = true,
  error = null,
  autoFocus = false,
}) => {
  const isRu = language === 'ru';

  // ─── State ───────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [objects, setObjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Debounce поиска ─────────────────────────────────────
  const [debouncedTerm, setDebouncedTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ─── Загрузка списка ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !companyId) return;

    let cancelled = false;
    setIsLoading(true);

    listObjects(companyId, {
      search: debouncedTerm,
      onlyActive: false,
      limit: 20,
    }).then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) {
        console.warn('[ObjectSelector.list] error:', err);
        setObjects([]);
      } else {
        setObjects(data || []);
      }
      setIsLoading(false);
      setActiveIndex(-1);
    });

    return () => { cancelled = true; };
  }, [isOpen, companyId, debouncedTerm]);

  // ─── Закрытие по клику вне ───────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [isOpen]);

  // ─── Автофокус ───────────────────────────────────────────
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // ─── Открытие списка ─────────────────────────────────────
  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (!value) setSearchTerm('');
  }, [value]);

  // ─── Выбор существующего ─────────────────────────────────
  const handleSelect = useCallback((obj) => {
    onChange?.({ objectId: obj.id, name: obj.name });
    setSearchTerm('');
    setIsOpen(false);
    setActiveIndex(-1);
  }, [onChange]);

  // ─── Создание нового ─────────────────────────────────────
  const handleCreateNew = useCallback(async () => {
    const name = searchTerm.trim();
    if (!name || isCreating) return;

    setIsCreating(true);
    try {
      const { data, error: err, created } = await findOrCreateObject(companyId, name, {
        created_by: userId,
      });

      if (err || !data) {
        showNotification?.(`❌ ${err || 'Ошибка создания'}`, 'error');
        return;
      }

      onChange?.({ objectId: data.id, name: data.name });

      if (created) {
        showNotification?.(
          isRu ? `✅ Создан объект "${data.name}"` : `✅ Object "${data.name}" created`,
          'success'
        );
      }

      setSearchTerm('');
      setIsOpen(false);
      setActiveIndex(-1);
    } catch (err) {
      console.error('[ObjectSelector.createNew] error:', err);
      showNotification?.(`❌ ${err.message}`, 'error');
    } finally {
      setIsCreating(false);
    }
  }, [searchTerm, isCreating, companyId, userId, onChange, showNotification, isRu]);

  // ─── Клавиатура ──────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    const hasCreateOption = searchTerm.trim() && !objects.some(
      o => normalizeObjectName(o.name) === normalizeObjectName(searchTerm)
    );
    const totalOptions = objects.length + (hasCreateOption ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, totalOptions - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < objects.length) {
        handleSelect(objects[activeIndex]);
      } else if (hasCreateOption && (activeIndex === objects.length || activeIndex === -1)) {
        handleCreateNew();
      } else if (!objects.length && hasCreateOption) {
        handleCreateNew();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }, [objects, searchTerm, activeIndex, handleSelect, handleCreateNew]);

  // ─── Очистка ─────────────────────────────────────────────
  const handleClear = useCallback((e) => {
    e.stopPropagation();
    onChange?.({ objectId: '', name: '' });
    setSearchTerm('');
  }, [onChange]);

  // ─── Список отфильтрованных для показа ───────────────────
  const showCreateOption = useMemo(() => {
    if (!searchTerm.trim()) return false;
    return !objects.some(
      o => normalizeObjectName(o.name) === normalizeObjectName(searchTerm)
    );
  }, [searchTerm, objects]);

  // ─── Отображаемое значение в input ───────────────────────
  const displayValue = isOpen ? searchTerm : (valueName || '');

  // ─── Рендер ──────────────────────────────────────────────
  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        <Building2 className="w-3.5 h-3.5 inline mr-1" />
        {isRu ? 'Объект' : 'Object'}{' '}
        {required && <span className="text-red-500">*</span>}
      </label>

      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={handleOpen}
          onClick={handleOpen}
          onKeyDown={handleKeyDown}
          placeholder={isRu
            ? 'Начните вводить название объекта...'
            : 'Start typing object name...'}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="sentences"
          spellCheck="false"
          className={`w-full pl-9 pr-10 py-2.5 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all focus:ring-2 focus:ring-[#4A6572] ${
            error
              ? 'border-red-400 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        />

        {/* Иконка состояния справа */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {(isLoading || isCreating) && (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          )}
          {value && !isLoading && !isCreating && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              aria-label={isRu ? 'Очистить' : 'Clear'}
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
          {value && !isOpen && (
            <Check className="w-4 h-4 text-green-500" />
          )}
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}

      {/* Подсказка: выбранный объект */}
      {value && valueName && !isOpen && (
        <p className="mt-1 text-xs text-gray-400 flex items-center gap-1">
          <Check className="w-3 h-3 text-green-500" />
          {isRu ? 'Выбран: ' : 'Selected: '}
          <span className="font-medium text-gray-600 dark:text-gray-300">{valueName}</span>
        </p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-30 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-72 overflow-y-auto"
        >
          {/* Существующие объекты */}
          {objects.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
                {isRu ? 'Найденные объекты' : 'Found objects'}
              </div>
              {objects.map((obj, idx) => (
                <button
                  key={obj.id}
                  type="button"
                  onClick={() => handleSelect(obj)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors ${
                    activeIndex === idx
                      ? 'bg-[#4A6572]/10 dark:bg-[#4A6572]/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#4A6572] mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {obj.name}
                    </div>
                    {obj.address && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {obj.address}
                      </div>
                    )}
                  </div>
                  {obj.status && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {obj.progress_percent || 0}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Ничего не найдено */}
          {objects.length === 0 && !isLoading && !searchTerm.trim() && (
            <div className="px-3 py-6 text-center text-sm text-gray-400">
              {isRu
                ? 'Начните вводить название объекта'
                : 'Start typing object name'}
            </div>
          )}

          {objects.length === 0 && !isLoading && searchTerm.trim() && !showCreateOption && (
            <div className="px-3 py-6 text-center text-sm text-gray-400">
              {isRu ? 'Ничего не найдено' : 'Nothing found'}
            </div>
          )}

          {/* Опция "Создать новый" */}
          {showCreateOption && (
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={isCreating}
              onMouseEnter={() => setActiveIndex(objects.length)}
              className={`w-full text-left px-3 py-2.5 flex items-start gap-2 border-t border-gray-100 dark:border-gray-700 transition-colors ${
                activeIndex === objects.length
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'hover:bg-green-50 dark:hover:bg-green-900/20'
              } disabled:opacity-50`}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 text-green-600 mt-0.5 animate-spin flex-shrink-0" />
              ) : (
                <Plus className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-green-700 dark:text-green-400">
                  {isRu ? 'Создать новый объект' : 'Create new object'}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500 truncate">
                  "{searchTerm.trim()}"
                </div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
});

ObjectSelector.displayName = 'ObjectSelector';

export default ObjectSelector;