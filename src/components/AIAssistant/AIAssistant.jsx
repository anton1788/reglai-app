// src/components/AIAssistant/AIAssistant.jsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Bot, X, Send, Sparkles, Package, Warehouse, BarChart3,
  AlertTriangle, Plus, Search, FileText, CheckCircle, Clock,
  ArrowRight, User, TrendingUp, Loader2, ChevronRight, Mic
} from 'lucide-react';
import SmartVoiceSearch from '../SmartVoiceSearch';

// ─────────────────────────────────────────────────────────────
// 🤖 Быстрые действия по ролям (без LLM!)
// ─────────────────────────────────────────────────────────────
const QUICK_ACTIONS = {
  master: [
    { id: 'my_applications', label: '📋 Мои активные заявки', icon: Package },
    { id: 'not_received', label: '⏳ Что ещё не получено', icon: Clock },
    { id: 'create_app', label: '➕ Создать заявку', icon: Plus },
  ],
  foreman: [
    { id: 'my_applications', label: '📋 Мои активные заявки', icon: Package },
    { id: 'not_received', label: '⏳ Что ещё не получено', icon: Clock },
    { id: 'create_app', label: '➕ Создать заявку', icon: Plus },
  ],
  supply_admin: [
    { id: 'warehouse_stock', label: '🏭 Остатки на складе', icon: Warehouse },
    { id: 'pending_receipt', label: '📥 Ожидают приёмки', icon: Package },
    { id: 'ready_to_issue', label: '📤 Готовы к выдаче', icon: CheckCircle },
    { id: 'search_app', label: '🔍 Найти заявку', icon: Search },
  ],
  manager: [
    { id: 'analytics_summary', label: '📊 Аналитика компании', icon: BarChart3 },
    { id: 'problem_apps', label: '⚠️ Проблемные заявки', icon: AlertTriangle },
    { id: 'team_activity', label: '👥 Активность команды', icon: User },
    { id: 'top_objects', label: '🏗️ Топ объектов', icon: TrendingUp },
  ],
  director: [
    { id: 'analytics_summary', label: '📊 Аналитика компании', icon: BarChart3 },
    { id: 'problem_apps', label: '⚠️ Проблемные заявки', icon: AlertTriangle },
    { id: 'team_activity', label: '👥 Активность команды', icon: User },
  ],
  accountant: [
    { id: 'completed_apps', label: '✅ Завершённые заявки', icon: CheckCircle },
    { id: 'monthly_report', label: '📄 Отчёт за месяц', icon: FileText },
  ],
  default: [
    { id: 'my_applications', label: '📋 Мои заявки', icon: Package },
    { id: 'help', label: '❓ Что умеет бот', icon: Sparkles },
  ],
};

// ─────────────────────────────────────────────────────────────
// 🔧 Хелперы для форматирования
// ─────────────────────────────────────────────────────────────
const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  });
};

const getStatusEmoji = (status) => {
  const map = {
    pending: '⏳',
    admin_processing: '⚙️',
    partial_received: '🟡',
    pending_master_confirmation: '📦',
    ready_for_issue: '📤',
    received: '✅',
    canceled: '❌',
  };
  return map[status] || '📋';
};

const getStatusLabel = (status) => {
  const map = {
    pending: 'Ожидает',
    admin_processing: 'В обработке',
    partial_received: 'Частично',
    pending_master_confirmation: 'На подтверждении',
    ready_for_issue: 'Готово к выдаче',
    received: 'Получено',
    canceled: 'Отменено',
  };
  return map[status] || status;
};

// ─────────────────────────────────────────────────────────────
// 🤖 Компонент AI Assistant
// ─────────────────────────────────────────────────────────────
const AIAssistant = ({
  user,
  userRole,
  userCompanyId,
  applications = [],
  companyUsers = [],
  supabase,
  showNotification,
  onNavigate,
  onCreateDraft,
  onOpenApplication,
  onOpenReceiveModal,
  t = (k) => k,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showVoiceSearch, setShowVoiceSearch] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // ─────────────────────────────────────────────────────────
  // 🎯 Логика каждого действия
  // ─────────────────────────────────────────────────────────
  const executeAction = useCallback(async (actionId, payload) => {
    switch (actionId) {
      // ─── МОИ ЗАЯВКИ ───
      case 'my_applications': {
        const myApps = applications.filter(
          a => a.user_id === user?.id &&
               !['received', 'canceled', 'is_deleted'].includes(a.status)
        );

        if (myApps.length === 0) {
          return {
            content: '📭 У вас нет активных заявок.\n\nСоздать новую?',
            actions: [{ id: 'create_app', label: '➕ Создать заявку' }],
          };
        }

        // ✅ Формируем структурированные данные для интерактивного списка
        const list = myApps.slice(0, 5).map(a => {
          const total = a.materials?.length || 0;
          const received = a.materials?.filter(m => 
            (Number(m.received) || 0) >= (Number(m.quantity) || 0)
          ).length || 0;

          return {
            id: a.id,
            emoji: getStatusEmoji(a.status),
            title: a.object_name,
            subtitle: `${received}/${total} позиций · ${formatDate(a.created_at)}`,
            status: getStatusLabel(a.status),
            action: {
              id: 'open_application',
              label: '👁 Открыть',
              payload: { appId: a.id },
            },
          };
        });

        return {
          content: `📋 **Ваши активные заявки (${myApps.length}):**`,
          data: list,
          actions: [
            { id: 'open_my_apps', label: '👁 Открыть все' },
            { id: 'create_app', label: '➕ Создать заявку' },
          ],
        };
      }

      // ─── ЧТО НЕ ПОЛУЧЕНО ───
      case 'not_received': {
        const myApps = applications.filter(a => 
          a.user_id === user?.id &&
          ['partial_received', 'pending_master_confirmation', 'ready_for_issue'].includes(a.status)
        );

        const pendingItems = [];
        myApps.forEach(app => {
          app.materials?.forEach(m => {
            const received = Number(m.received) || 0;
            const quantity = Number(m.quantity) || 0;
            if (received < quantity) {
              pendingItems.push({
                appId: app.id,
                object: app.object_name,
                name: m.description,
                received,
                quantity,
                unit: m.unit || 'шт',
              });
            }
          });
        });

        if (pendingItems.length === 0) {
          return {
            content: '✅ Всё получено! Незавершённых позиций нет.',
          };
        }

        // ✅ Группируем по заявкам для удобства
        const groupedItems = {};
        pendingItems.forEach(item => {
          if (!groupedItems[item.appId]) {
            groupedItems[item.appId] = {
              appId: item.appId,
              object: item.object,
              items: [],
            };
          }
          groupedItems[item.appId].items.push(item);
        });

        const list = Object.values(groupedItems).slice(0, 5).map(group => ({
          id: group.appId,
          emoji: '⏳',
          title: group.object,
          subtitle: `${group.items.length} позиций ожидают получения`,
          action: {
            id: 'open_application',
            label: '👁 Открыть',
            payload: { appId: group.appId },
          },
        }));

        return {
          content: `⏳ **Не получено (${pendingItems.length} позиций в ${Object.keys(groupedItems).length} заявках):**`,
          data: list,
          actions: [{ id: 'open_my_apps', label: '👁 Открыть заявки' }],
        };
      }

      // ─── СОЗДАТЬ ЗАЯВКУ ───
      case 'create_app': {
        if (onCreateDraft) {
          onCreateDraft({});
        }
        onNavigate?.('create');
        return {
          content: '✨ Открываю форму создания заявки...',
        };
      }

      // ─── ОСТАТКИ НА СКЛАДЕ ───
      case 'warehouse_stock': {
        if (!userCompanyId) {
          return { content: '❌ Компания не найдена' };
        }

        const { data, error } = await supabase
          .from('warehouse_balance')
          .select('item_name, quantity, unit, updated_at')
          .eq('company_id', userCompanyId)
          .gt('quantity', 0)
          .order('item_name', { ascending: true })
          .limit(20);

        if (error) {
          showNotification?.('Не удалось загрузить склад', 'error');
          throw error;
        }

        if (!data || data.length === 0) {
          return {
            content: '📦 Склад пуст или нет данных.',
            actions: [{ id: 'open_warehouse', label: '🏭 Открыть склад' }],
          };
        }

        const list = data.map(item => ({
          id: item.item_name,
          emoji: '📦',
          title: item.item_name,
          subtitle: `${item.quantity} ${item.unit}`,
        }));

        return {
          content: `🏭 **Остатки на складе (${data.length}):**`,
          data: list,
          actions: [{ id: 'open_warehouse', label: '🏭 Открыть склад' }],
        };
      }

      // ─── ОЖИДАЮТ ПРИЁМКИ ───
      case 'pending_receipt': {
        const pending = applications.filter(a => {
          if (!['pending', 'admin_processing', 'partial_received'].includes(a.status)) return false;
          return a.materials?.some(m => {
            const total = Number(m.quantity) || 0;
            const received = Number(m.supplier_received_quantity) || 0;
            return received < total;
          });
        });

        if (pending.length === 0) {
          return { content: '✅ Нет заявок, ожидающих приёмки.' };
        }

        const list = pending.slice(0, 6).map(a => {
          const days = Math.floor((Date.now() - new Date(a.created_at)) / 86400000);
          const total = a.materials?.length || 0;
          const received = a.materials?.filter(m => 
            (Number(m.supplier_received_quantity) || 0) > 0
          ).length || 0;
          return {
            id: a.id,
            emoji: '📥',
            title: a.object_name,
            subtitle: `${received}/${total} позиций · ${days} дн.`,
            action: {
              id: 'open_receive_modal',
              label: '📥 Принять',
              payload: { appId: a.id, mode: 'admin_receive' },
            },
          };
        });

        return {
          content: `📥 **Ожидают приёмки (${pending.length}):**`,
          data: list,
          actions: [{ id: 'open_received', label: '📥 Открыть все' }],
        };
      }

      // ─── ГОТОВЫ К ВЫДАЧЕ ───
      case 'ready_to_issue': {
        const ready = applications.filter(a => 
          a.status === 'ready_for_issue' || a.status === 'partial_received'
        );

        if (ready.length === 0) {
          return { content: '📤 Нет заявок, готовых к выдаче.' };
        }

        const list = ready.slice(0, 6).map(a => ({
          id: a.id,
          emoji: '📤',
          title: a.object_name,
          subtitle: `Прораб: ${a.foreman_name || '—'}`,
          action: {
            id: 'open_receive_modal',
            label: '📤 Выдать',
            payload: { appId: a.id, mode: 'admin_ready_to_issue' },
          },
        }));

        return {
          content: `📤 **Готовы к выдаче (${ready.length}):**`,
          data: list,
          actions: [{ id: 'open_ready', label: '📤 Открыть все' }],
        };
      }

      // ─── ПОИСК ЗАЯВКИ ───
      case 'search_app': {
        return {
          content: '🔍 Введите название объекта или ФИО прораба в поисковой строке — я покажу результаты.',
          actions: [{ id: 'open_all', label: '📋 Все заявки' }],
        };
      }

      // ─── АНАЛИТИКА ───
      case 'analytics_summary': {
        const total = applications.length;
        const active = applications.filter(a => 
          ['pending', 'admin_processing', 'partial_received', 'ready_for_issue'].includes(a.status)
        ).length;
        const received = applications.filter(a => a.status === 'received').length;
        const totalMaterials = applications.reduce((sum, a) => 
          sum + (a.materials?.reduce((s, m) => s + (Number(m.quantity) || 0), 0) || 0), 0
        );

        return {
          content: `📊 **Аналитика компании:**\n\n• Всего заявок: **${total}**\n• Активных: **${active}**\n• Завершено: **${received}**\n• Материалов: **${totalMaterials.toLocaleString('ru-RU')}**`,
          actions: [{ id: 'open_analytics', label: '📊 Открыть аналитику' }],
        };
      }

      // ─── ПРОБЛЕМНЫЕ ───
      case 'problem_apps': {
        const overdue = applications.filter(a => 
          a.status === 'pending' && 
          (Date.now() - new Date(a.created_at)) > 2 * 86400000
        );
        const partial = applications.filter(a => 
          a.status === 'partial_received' &&
          (Date.now() - new Date(a.updated_at || a.created_at)) > 3 * 86400000
        );

        const problems = [...overdue, ...partial];
        
        if (problems.length === 0) {
          return { content: '✅ Проблемных заявок нет.' };
        }

        const list = problems.slice(0, 6).map(a => {
          const days = Math.floor((Date.now() - new Date(a.created_at)) / 86400000);
          const isOverdue = overdue.includes(a);
          return {
            id: a.id,
            emoji: isOverdue ? '🔴' : '🟡',
            title: a.object_name,
            subtitle: `${isOverdue ? 'Просрочено' : 'Частичная'} · ${days} дн.`,
            action: {
              id: 'open_application',
              label: '👁 Открыть',
              payload: { appId: a.id },
            },
          };
        });

        return {
          content: `⚠️ **Проблемные заявки (${problems.length}):**`,
          data: list,
        };
      }

      // ─── КОМАНДА ───
      case 'team_activity': {
        const active7d = new Set();
        const now = Date.now();
        applications.forEach(a => {
          if (now - new Date(a.created_at) < 7 * 86400000) {
            active7d.add(a.user_id);
          }
        });

        return {
          content: `👥 **Команда:**\n\n• Всего: **${companyUsers.length}**\n• Активных за 7 дней: **${active7d.size}**`,
        };
      }

      // ─── ТОП ОБЪЕКТОВ ───
      case 'top_objects': {
        const byObject = {};
        applications.forEach(a => {
          byObject[a.object_name] = (byObject[a.object_name] || 0) + 1;
        });
        const top = Object.entries(byObject)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        const list = top.map(([name, count], i) => 
          `${i + 1}. **${name}** — ${count} заявок`
        ).join('\n');

        return {
          content: `🏗️ **Топ объектов:**\n\n${list}`,
        };
      }

      // ─── ЗАВЕРШЁННЫЕ ───
      case 'completed_apps': {
        const monthAgo = Date.now() - 30 * 86400000;
        const completed = applications.filter(a => 
          a.status === 'received' &&
          new Date(a.updated_at || a.created_at).getTime() > monthAgo
        );

        if (completed.length === 0) {
          return { content: '📄 За последние 30 дней завершённых заявок нет.' };
        }

        return {
          content: `✅ **Завершено за 30 дней: ${completed.length}**\n\nПерейти к документам?`,
          actions: [{ id: 'open_documents', label: '📄 Документы' }],
        };
      }

      // ─── ОТКРЫТЬ КОНКРЕТНУЮ ЗАЯВКУ ───
      case 'open_application': {
        const appId = payload?.appId;
        const app = applications.find(a => a.id === appId);
        if (app && onOpenApplication) {
          onOpenApplication(app);
          return { content: `➡️ Открываю заявку "${app.object_name}"...` };
        }
        return { content: '❌ Заявка не найдена' };
      }

      // ─── ОТКРЫТЬ МОДАЛЬНОЕ ОКНО ПРИЁМКИ/ВЫДАЧИ ───
      case 'open_receive_modal': {
        const appId = payload?.appId;
        const mode = payload?.mode || 'admin_receive';
        const app = applications.find(a => a.id === appId);
        
        if (app && onOpenReceiveModal) {
          onOpenReceiveModal(app, mode);
          const modeLabel = mode === 'admin_receive' ? 'приёмки' : 
                           mode === 'admin_ready_to_issue' ? 'выдачи' : 'подтверждения';
          return { content: `➡️ Открываю заявку для ${modeLabel}...` };
        }
        return { content: '❌ Заявка не найдена' };
      }

      // ─── ПОМОЩЬ ───
      case 'help': {
        const roleActions = (QUICK_ACTIONS[userRole] || QUICK_ACTIONS.default)
          .map(a => `• ${a.label}`)
          .join('\n');
        
        return {
          content: `🤖 **Что я умею:**\n\n${roleActions}\n\n💡 **Совет:** Используйте кнопку 🎤 для голосового поиска!`,
        };
      }

      // ─── НАВИГАЦИОННЫЕ ───
      case 'open_my_apps':
        onNavigate?.('inwork');
        return { content: '➡️ Открываю заявки...' };
      
      case 'open_warehouse':
        onNavigate?.('warehouse');
        return { content: '➡️ Открываю склад...' };
      
      case 'open_received':
        onNavigate?.('received');
        return { content: '➡️ Открываю приёмку...' };
      
      case 'open_ready':
        onNavigate?.('readyToIssue');
        return { content: '➡️ Открываю выдачу...' };
      
      case 'open_analytics':
        onNavigate?.('analytics');
        return { content: '➡️ Открываю аналитику...' };
      
      case 'open_all':
        onNavigate?.('inwork');
        return { content: '➡️ Открываю список заявок...' };
      
      case 'open_documents':
        onNavigate?.('documents');
        return { content: '➡️ Открываю документы...' };

      // ─── СВОБОДНЫЙ ВВОД (пока просто перенаправляем в поиск) ───
      case 'free_text': {
        const text = payload?.text?.trim();
        if (!text) {
          return { content: '🤔 Введите запрос или используйте кнопки выше.' };
        }
        
        // Простой анализ текста для определения намерения
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('заявк') || lowerText.includes('мои')) {
          return executeAction('my_applications');
        }
        if (lowerText.includes('склад') || lowerText.includes('остат')) {
          return executeAction('warehouse_stock');
        }
        if (lowerText.includes('приёмк') || lowerText.includes('приемк')) {
          return executeAction('pending_receipt');
        }
        if (lowerText.includes('выдач') || lowerText.includes('готов')) {
          return executeAction('ready_to_issue');
        }
        if (lowerText.includes('аналитик') || lowerText.includes('статистик')) {
          return executeAction('analytics_summary');
        }
        if (lowerText.includes('проблем') || lowerText.includes('просроч')) {
          return executeAction('problem_apps');
        }
        if (lowerText.includes('созда') || lowerText.includes('нов')) {
          return executeAction('create_app');
        }
        
        // Если не распознали — предлагаем поиск
        return {
          content: `🔍 Понимаю ваш запрос: "${text}"\n\nПопробуйте использовать кнопки быстрых действий или уточните запрос.`,
          actions: [
            { id: 'my_applications', label: '📋 Мои заявки' },
            { id: 'help', label: '❓ Что я умею' },
          ],
        };
      }

      default:
        return { content: '🤔 Не понял команду. Попробуйте ещё раз.' };
    }
  }, [
    applications, companyUsers, supabase, user,
    userCompanyId, userRole, onNavigate,
    onCreateDraft, onOpenApplication, onOpenReceiveModal, showNotification
  ]);

  // ─────────────────────────────────────────────────────────
  // 🧠 Обработчик клика по кнопке
  // ─────────────────────────────────────────────────────────
  const handleAction = useCallback(async (actionId, payload = null, customLabel = null) => {
    const action = (QUICK_ACTIONS[userRole] || QUICK_ACTIONS.default)
      .find(a => a.id === actionId);
    
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: customLabel || action?.label || actionId,
      timestamp: Date.now(),
    }]);

    setIsLoading(true);

    try {
      const result = await executeAction(actionId, payload);
      
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: result.content,
        actions: result.actions || [],
        data: result.data,
        timestamp: Date.now(),
      }]);
    } catch (err) {
      console.error('[AIAssistant] Error:', err);
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '❌ Не удалось выполнить запрос. Попробуйте позже.',
        isError: true,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [userRole, executeAction]);

  // ─────────────────────────────────────────────────────────
  // 📤 Отправка свободного текста
  // ─────────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text) return;

    setInputValue('');
    await handleAction('free_text', { text }, text);
  }, [inputValue, handleAction]);

  // ─────────────────────────────────────────────────────────
  // 🎤 Обработка голосового ввода
  // ─────────────────────────────────────────────────────────
  const handleVoiceSearch = useCallback((query) => {
    setShowVoiceSearch(false);
    if (query) {
      setInputValue(query);
      // Автоматически отправляем
      setTimeout(() => {
        handleAction('free_text', { text: query }, query);
        setInputValue('');
      }, 100);
    }
  }, [handleAction]);

  // ─────────────────────────────────────────────────────────
  // ⌨️ Обработка Enter
  // ─────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Приветствие при первом открытии
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      const roleLabel = {
        master: 'мастер',
        foreman: 'прораб',
        supply_admin: 'снабженец',
        manager: 'руководитель',
        director: 'директор',
        accountant: 'бухгалтер',
      }[userRole] || 'пользователь';

      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Привет! Я ассистент Реглай.\n\nЯ вижу вас как **${roleLabel}**. Чем помочь?\n\n💡 Используйте кнопки ниже или напишите запрос.`,
        timestamp: Date.now(),
      }]);
      setHasInitialized(true);
    }
  }, [isOpen, hasInitialized, userRole]);

  // Автоскролл
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Фокус на инпут при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ─────────────────────────────────────────────────────────
  // 🎨 Рендер
  // ─────────────────────────────────────────────────────────
  const quickActions = QUICK_ACTIONS[userRole] || QUICK_ACTIONS.default;

  // Рендер сообщения с интерактивными данными
  const renderMessageContent = (msg) => {
    // Если есть структурированные данные — рендерим их
    if (msg.data && Array.isArray(msg.data) && msg.data.length > 0) {
      return (
        <>
          {/* Текст сообщения */}
          {msg.content.split('\n').map((line, i) => {
            const parts = line.split(/(\*\*[^*]+\*\*)/g);
            return (
              <div key={i} className="mb-1">
                {parts.map((part, j) =>
                  part.startsWith('**') && part.endsWith('**') ? (
                    <strong key={j}>{part.slice(2, -2)}</strong>
                  ) : (
                    <span key={j}>{part}</span>
                  )
                )}
              </div>
            );
          })}
          
          {/* Интерактивный список */}
          <div className="mt-2 space-y-1.5">
            {msg.data.map((item, index) => (
              <div
                key={item.id || index}
                className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-2 border border-gray-200/50 dark:border-gray-600/50"
              >
                <div className="flex items-start gap-2">
                  <span className="text-base flex-shrink-0">{item.emoji || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs truncate">{item.title}</div>
                    {item.subtitle && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                </div>
                {item.action && (
                  <button
                    onClick={() => handleAction(item.action.id, item.action.payload, item.action.label)}
                    className="mt-1.5 w-full text-[10px] px-2 py-1 rounded bg-[#4A6572] text-white hover:bg-[#344955] transition-colors flex items-center justify-center gap-1"
                  >
                    {item.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      );
    }

    // Обычный текстовый рендер
    return msg.content.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i}>
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={j}>{part.slice(2, -2)}</strong>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </div>
      );
    });
  };

  return (
    <>
      {/* Плавающая кнопка */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] text-white shadow-2xl hover:scale-110 active:scale-95 transition-all z-[9998] flex items-center justify-center"
        aria-label={t('aiAssistant') || 'AI-ассистент'}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#F9AA33] rounded-full animate-pulse" />
          </>
        )}
      </button>

      {/* Чат-окно */}
      {isOpen && (
        <div
          className="fixed bottom-40 right-4 lg:bottom-24 lg:right-8 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-[9998] border border-gray-200 dark:border-gray-700 fade-enter"
          role="dialog"
          aria-label="AI-ассистент"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#4A6572]/5 to-[#344955]/5 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {t('aiAssistant') || 'Ассистент Реглай'}
                </div>
                <div className="text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {t('online') || 'онлайн'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-[#4A6572] text-white rounded-br-sm'
                      : msg.isError
                      ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded-bl-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {renderMessageContent(msg)}

                  {/* Кнопки действий */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-300/50 dark:border-gray-600/50 space-y-1">
                      {msg.actions.map((action) => (
                        <button
                          key={action.id}
                          onClick={() => handleAction(action.id, action.payload, action.label)}
                          className="w-full text-left text-xs px-2 py-1.5 rounded-lg bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 text-[#4A6572] dark:text-[#F9AA33] font-medium flex items-center justify-between transition-colors"
                        >
                          <span>{action.label}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#4A6572]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions — показываем только в начале */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 space-y-1.5">
              <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
                {t('quickActions') || 'Быстрые действия'}
              </div>
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.id)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-[#4A6572]/10 dark:hover:bg-[#F9AA33]/10 text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50"
                  >
                    <Icon className="w-4 h-4 text-[#4A6572] dark:text-[#F9AA33] flex-shrink-0" />
                    <span className="flex-1">{action.label}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишите запрос..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-[#4A6572] focus:border-transparent"
              />
              
              {/* Кнопка голосового ввода */}
              <button
                onClick={() => setShowVoiceSearch(true)}
                className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Голосовой ввод"
              >
                <Mic className="w-4 h-4" />
              </button>
              
              {/* Кнопка отправки */}
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="px-3 py-2 rounded-xl bg-[#4A6572] text-white hover:bg-[#344955] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 text-center">
              💡 Используйте кнопку 🎤 для голосового ввода
            </p>
          </div>
        </div>
      )}

      {/* Модальное окно голосового поиска */}
      {showVoiceSearch && (
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                🎤 Голосовой ввод
              </h3>
              <button
                onClick={() => setShowVoiceSearch(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <SmartVoiceSearch
              onSearch={handleVoiceSearch}
              onNavigate={(view) => {
                setShowVoiceSearch(false);
                onNavigate?.(view);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;