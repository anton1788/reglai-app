import React, { useState, useEffect } from 'react';
import { Bot, ArrowRight, Send, X } from 'lucide-react';

const ManagerAIAssistant = ({ applications, companyUsers, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const insights = [];
    
    // Просроченные заявки
    const overdueApps = applications.filter(a => 
      a.status === 'pending' && 
      new Date(a.created_at) < new Date(Date.now() - 3*24*60*60*1000)
    );
    if (overdueApps.length > 0) {
      insights.push({
        icon: '⚠️',
        text: `${overdueApps.length} заявок просрочено`,
        action: () => onNavigate('inwork'),
        color: 'red',
        priority: 1
      });
    }
    
    // Неактивные сотрудники
    const inactiveUsers = companyUsers.filter(u => 
      !applications.some(a => a.user_id === u.user_id && 
        new Date(a.created_at) > new Date(Date.now() - 7*24*60*60*1000))
    );
    if (inactiveUsers.length > 0) {
      insights.push({
        icon: '😴',
        text: `${inactiveUsers.length} сотрудников неактивны 7+ дней`,
        action: () => onNavigate('employees'),
        color: 'yellow',
        priority: 2
      });
    }
    
    // Заявки на согласование
    const pendingApprovals = applications.filter(a => a.status === 'pending_approval');
    if (pendingApprovals.length > 0) {
      insights.push({
        icon: '📋',
        text: `${pendingApprovals.length} заявок await согласования`,
        action: () => onNavigate('approvals'),
        color: 'purple',
        priority: 1
      });
    }
    
    // Финансовый отчёт
    const totalSpent = applications.reduce((sum, a) => sum + (a.total_amount || 0), 0);
    insights.push({
      icon: '💰',
      text: `Общие расходы: ${totalSpent.toLocaleString()} ₽`,
      action: () => onNavigate('analytics'),
      color: 'green',
      priority: 3
    });
    
    setSuggestions(insights.sort((a, b) => a.priority - b.priority));
  }, [applications, companyUsers, onNavigate]);

  const handleQuery = () => {
    if (!query.trim()) return;
    
    // Простой AI-ответ на команды
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('просроч') || lowerQuery.includes('overdue')) {
      onNavigate('inwork');
    } else if (lowerQuery.includes('сотрудник') || lowerQuery.includes('employee')) {
      onNavigate('employees');
    } else if (lowerQuery.includes('финанс') || lowerQuery.includes('деньг')) {
      onNavigate('analytics');
    } else if (lowerQuery.includes('соглас') || lowerQuery.includes('approv')) {
      onNavigate('approvals');
    }
    
    setQuery('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
      >
        <Bot className="w-7 h-7 text-white" />
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 mb-6 relative">
      <button
        onClick={() => setIsOpen(false)}
        className="absolute top-4 right-4 p-1 hover:bg-gray-200 rounded-lg transition"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold">AI-ассистент руководителя</h3>
          <p className="text-xs text-gray-500">Анализирую данные в реальном времени</p>
        </div>
      </div>
      
      {/* Умные подсказки */}
      <div className="space-y-2 mb-4">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={s.action}
            className={`w-full text-left p-3 rounded-xl transition-all hover:scale-[1.01] ${
              s.color === 'red' ? 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20' :
              s.color === 'yellow' ? 'bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20' :
              s.color === 'purple' ? 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20' :
              'bg-green-50 hover:bg-green-100 dark:bg-green-900/20'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{s.icon}</span>
              <span className="flex-1 text-sm">{s.text}</span>
              <ArrowRight className="w-4 h-4 opacity-50" />
            </div>
          </button>
        ))}
      </div>
      
      {/* Чат с AI */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
          placeholder="Напишите: 'покажи просроченные' или 'сотрудники'..."
          className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button
          onClick={handleQuery}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:shadow-lg transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      
      <p className="text-xs text-gray-400 mt-3 text-center">
        💡 Подсказка: AI анализирует заявки, активность сотрудников и финансы
      </p>
    </div>
  );
};

export default ManagerAIAssistant;