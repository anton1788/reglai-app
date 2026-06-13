import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Search, X, Loader2, History, TrendingUp, Package, Users } from 'lucide-react';

const SmartVoiceSearch = ({ onSearch, onNavigate, className = '' }) => { // ← удалили t
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Проверка поддержки голосового ввода
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);
  
  // Загрузка истории поиска из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('voice_search_history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved).slice(0, 10));
      } catch (e) {
        console.error('Failed to load search history:', e);
      }
    }
  }, []);
  
  // Сохранение истории поиска
  const saveToHistory = useCallback((query) => {
    if (!query.trim()) return;
    
    setSearchHistory(prev => {
      const newHistory = [query, ...prev.filter(h => h !== query)].slice(0, 10);
      localStorage.setItem('voice_search_history', JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);
  
  // Генерация умных подсказок на основе ввода
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const smartSuggestions = [];
    
    // Категории поиска
    const categories = [
      { keywords: ['просроч', 'overdue', 'просрочен'], action: 'filter_overdue', label: 'Показать просроченные заявки', icon: '⚠️' },
      { keywords: ['активн', 'active', 'в работе'], action: 'filter_active', label: 'Показать активные заявки', icon: '🟢' },
      { keywords: ['завершен', 'completed', 'выполнен', 'готов'], action: 'filter_completed', label: 'Показать выполненные заявки', icon: '✅' },
      { keywords: ['сегодня', 'today', 'новые'], action: 'filter_today', label: 'Заявки за сегодня', icon: '📅' },
      { keywords: ['сумма', 'total', 'деньги', 'финанс'], action: 'show_finance', label: 'Финансовая сводка', icon: '💰' },
      { keywords: ['сотрудник', 'employee', 'пользователь', 'user'], action: 'show_employees', label: 'Управление сотрудниками', icon: '👥' },
      { keywords: ['склад', 'warehouse', 'остаток'], action: 'show_warehouse', label: 'Остатки на складе', icon: '📦' },
      { keywords: ['объект', 'object', 'site'], action: 'search_object', label: `Поиск по объекту: ${searchQuery}`, icon: '🏗️' }
    ];
    
    categories.forEach(cat => {
      if (cat.keywords.some(kw => query.includes(kw))) {
        smartSuggestions.push({
          ...cat,
          relevance: 10 - Math.min(...cat.keywords.map(kw => Math.abs(query.length - kw.length)))
        });
      }
    });
    
    // Добавляем поиск по тексту
    if (smartSuggestions.length === 0 && searchQuery.length > 2) {
      smartSuggestions.push({
        action: 'text_search',
        label: `Поиск: "${searchQuery}"`,
        icon: '🔍',
        relevance: 5
      });
    }
    
    setSuggestions(smartSuggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 5));
  }, [searchQuery]);
  
  // Обработка голосовой команды (вынесена вперёд, чтобы использовать в startListening)
  const handleVoiceCommand = useCallback((command) => {
    const lowerCommand = command.toLowerCase();
    let response = '';
    
    // Анализ команд
    if (lowerCommand.includes('просроч') || lowerCommand.includes('overdue')) {
      response = 'Показываю просроченные заявки';
      if (onSearch) onSearch('status:pending overdue:true');
      if (onNavigate) onNavigate('inwork');
    }
    else if (lowerCommand.includes('активн') || lowerCommand.includes('в работе')) {
      response = 'Показываю активные заявки';
      if (onSearch) onSearch('status:active');
      if (onNavigate) onNavigate('inwork');
    }
    else if (lowerCommand.includes('завершен') || lowerCommand.includes('выполнен')) {
      response = 'Показываю выполненные заявки';
      if (onSearch) onSearch('status:received');
      if (onNavigate) onNavigate('history');
    }
    else if (lowerCommand.includes('сегодня')) {
      response = 'Заявки за сегодня';
      if (onSearch) onSearch(`date:${new Date().toISOString().split('T')[0]}`);
      if (onNavigate) onNavigate('inwork');
    }
    else if (lowerCommand.includes('сотрудник') || lowerCommand.includes('команда')) {
      response = 'Открываю управление сотрудниками';
      if (onNavigate) onNavigate('employees');
    }
    else if (lowerCommand.includes('финанс') || lowerCommand.includes('деньги') || lowerCommand.includes('бюджет')) {
      response = 'Открываю финансовую аналитику';
      if (onNavigate) onNavigate('analytics');
    }
    else if (lowerCommand.includes('склад') || lowerCommand.includes('остаток')) {
      response = 'Показываю складские остатки';
      if (onNavigate) onNavigate('warehouse');
    }
    else if (lowerCommand.includes('создай') || lowerCommand.includes('новая заявка')) {
      response = 'Перехожу к созданию заявки';
      if (onNavigate) onNavigate('create');
    }
    else if (lowerCommand.match(/объект\s+(.+)/i)) {
      const objectName = lowerCommand.match(/объект\s+(.+)/i)[1];
      response = `Ищу объект: ${objectName}`;
      if (onSearch) onSearch(`object:${objectName}`);
    }
    else if (command.length > 3) {
      response = `Поиск: "${command}"`;
      saveToHistory(command);
      if (onSearch) onSearch(command);
    }
    else {
      response = 'Не понял команду. Попробуйте сказать: "просроченные", "активные", "сотрудники"';
    }
    
    setTranscript(response);
    setTimeout(() => setTranscript(''), 3000);
  }, [onSearch, onNavigate, saveToHistory]);
  
  // Голосовое распознавание
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Голосовой поиск не поддерживается вашим браузером');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('🎙️ Слушаю...');
    };
    
    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      
      if (event.results[0].isFinal) {
        handleVoiceCommand(result);
        setIsListening(false);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setTranscript(`❌ Ошибка: ${event.error}`);
      setTimeout(() => setTranscript(''), 2000);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setTimeout(() => setIsListening(false), 500);
    };
    
    recognition.start();
  }, [handleVoiceCommand]); // ← добавили зависимость handleVoiceCommand
  
  // Обработка текстового поиска
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    saveToHistory(searchQuery);
    if (onSearch) onSearch(searchQuery);
    setIsExpanded(false);
  }, [searchQuery, onSearch, saveToHistory]);
  
  // Выбор подсказки
  const handleSuggestionClick = useCallback((suggestion) => {
    if (suggestion.action === 'filter_overdue') {
      if (onSearch) onSearch('status:pending overdue:true');
      if (onNavigate) onNavigate('inwork');
    } else if (suggestion.action === 'filter_active') {
      if (onSearch) onSearch('status:active');
      if (onNavigate) onNavigate('inwork');
    } else if (suggestion.action === 'filter_completed') {
      if (onSearch) onSearch('status:received');
      if (onNavigate) onNavigate('history');
    } else if (suggestion.action === 'filter_today') {
      if (onSearch) onSearch(`date:${new Date().toISOString().split('T')[0]}`);
      if (onNavigate) onNavigate('inwork');
    } else if (suggestion.action === 'show_finance') {
      if (onNavigate) onNavigate('analytics');
    } else if (suggestion.action === 'show_employees') {
      if (onNavigate) onNavigate('employees');
    } else if (suggestion.action === 'show_warehouse') {
      if (onNavigate) onNavigate('warehouse');
    } else if (suggestion.action === 'search_object') {
      if (onSearch) onSearch(suggestion.label.replace('Поиск по объекту: ', ''));
    } else if (suggestion.action === 'text_search') {
      if (onSearch) onSearch(searchQuery);
    }
    
    setSearchQuery('');
    setSuggestions([]);
    setIsExpanded(false);
  }, [onSearch, onNavigate, searchQuery]);
  
  return (
    <div className={`relative ${className}`}>
      {/* Поисковая строка */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsExpanded(true)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={isListening ? transcript : "Поиск заявок, объектов или сотрудников..."}
            className="w-full pl-10 pr-24 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800"
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            {isSupported && (
              <button
                onClick={startListening}
                disabled={isListening}
                className={`p-2 rounded-lg transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 hover:bg-gray-200'
                }`}
                title="Голосовой поиск"
              >
                {isListening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 hover:bg-gray-200"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Транскрипт голоса */}
        {transcript && !isListening && (
          <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-600 dark:text-blue-400 animate-fadeIn">
            {transcript}
          </div>
        )}
      </div>
      
      {/* Выпадающая панель с подсказками и историей */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-fadeIn">
          {/* Подсказки */}
          {suggestions.length > 0 && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 px-2 py-1">📌 Подсказки</p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
                >
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-sm">{s.label}</span>
                </button>
              ))}
            </div>
          )}
          
          {/* История поиска */}
          {searchHistory.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-gray-400 px-2 py-1 flex items-center justify-between">
                <span>🕐 Недавние поиски</span>
                <button
                  onClick={() => {
                    setSearchHistory([]);
                    localStorage.removeItem('voice_search_history');
                  }}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Очистить
                </button>
              </p>
              {searchHistory.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSearchQuery(item);
                    handleSearch();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition flex items-center gap-2 text-sm"
                >
                  <History className="w-3 h-3 text-gray-400" />
                  <span>{item}</span>
                </button>
              ))}
            </div>
          )}
          
          {/* Быстрые фильтры */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
            <p className="text-xs text-gray-400 mb-2">⚡ Быстрые фильтры</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip icon="⚠️" label="Просроченные" onClick={() => {
                if (onSearch) onSearch('status:pending overdue:true');
                if (onNavigate) onNavigate('inwork');
                setIsExpanded(false);
              }} />
              <FilterChip icon="🟢" label="Активные" onClick={() => {
                if (onSearch) onSearch('status:active');
                if (onNavigate) onNavigate('inwork');
                setIsExpanded(false);
              }} />
              <FilterChip icon="✅" label="Выполненные" onClick={() => {
                if (onSearch) onSearch('status:received');
                if (onNavigate) onNavigate('history');
                setIsExpanded(false);
              }} />
              <FilterChip icon="📅" label="Сегодня" onClick={() => {
                if (onSearch) onSearch(`date:${new Date().toISOString().split('T')[0]}`);
                if (onNavigate) onNavigate('inwork');
                setIsExpanded(false);
              }} />
              <FilterChip icon="💰" label="Финансы" onClick={() => {
                if (onNavigate) onNavigate('analytics');
                setIsExpanded(false);
              }} />
              <FilterChip icon="👥" label="Сотрудники" onClick={() => {
                if (onNavigate) onNavigate('employees');
                setIsExpanded(false);
              }} />
              <FilterChip icon="📦" label="Склад" onClick={() => {
                if (onNavigate) onNavigate('warehouse');
                setIsExpanded(false);
              }} />
            </div>
          </div>
          
          {/* Закрыть */}
          <button
            onClick={() => setIsExpanded(false)}
            className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}
    </div>
  );
};

// Компонент чипа фильтра
const FilterChip = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="px-3 py-1.5 bg-white dark:bg-gray-700 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition flex items-center gap-1 shadow-sm"
  >
    <span>{icon}</span>
    <span>{label}</span>
  </button>
);

export default SmartVoiceSearch;