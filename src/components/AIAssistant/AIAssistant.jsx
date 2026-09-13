// src/components/AIAssistant/AIAssistant.jsx
import React, { 
  useState, 
  useCallback, 
  useEffect, 
  useRef, 
  forwardRef, 
  useImperativeHandle 
} from 'react';
import {
  Bot, X, Send, Sparkles, Package, Warehouse, BarChart3,
  AlertTriangle, Plus, Search, FileText, CheckCircle, Clock,
  ArrowRight, User, TrendingUp, Loader2, ChevronRight, Mic,
  Home, ArrowLeft, Users, MessageCircle, Calendar, ClipboardList,
  DollarSign, Code, FileCheck, Plug, Building, Target, Layers,
  History, Truck, UserPlus, Briefcase, Settings, Bell
} from 'lucide-react';
import SmartVoiceSearch from '../SmartVoiceSearch';

// ─────────────────────────────────────────────────────────────
// 🗺️ КАРТА ВСЕХ РАЗДЕЛОВ ПРИЛОЖЕНИЯ
// ─────────────────────────────────────────────────────────────
const ALL_VIEWS = {
  inwork: { view: 'inwork', label: 'Заявки', icon: Package, path: '/applications', description: 'Все заявки' },
  create: { view: 'create', label: 'Создать заявку', icon: Plus, path: '/applications/new', description: 'Новая заявка' },
  readyToIssue: { view: 'readyToIssue', label: 'Готовы к выдаче', icon: CheckCircle, path: '/ready-to-issue', description: 'Ожидают выдачи' },
  received: { view: 'received', label: 'Приёмка', icon: Truck, path: '/received', description: 'Приёмка материалов' },
  history: { view: 'history', label: 'История', icon: History, path: '/history', description: 'Завершённые заявки' },
  projects: { view: 'projects', label: 'Проекты', icon: Briefcase, path: '/projects', description: 'Управление проектами' },
  merge: { view: 'merge', label: 'Объединение', icon: Layers, path: '/merge', description: 'Объединить заявки' },
  clients: { view: 'clients', label: 'Клиенты', icon: Users, path: '/clients', description: 'Управление клиентами' },
  'crm-sales': { view: 'crm-sales', label: 'CRM Лиды', icon: Target, path: '/crm-sales', description: 'Управление лидами' },
  warehouse: { view: 'warehouse', label: 'Склад', icon: Warehouse, path: '/warehouse', description: 'Остатки на складе' },
  analytics: { view: 'analytics', label: 'Аналитика', icon: BarChart3, path: '/analytics', description: 'Аналитика компании' },
  reports: { view: 'reports', label: 'Отчёты', icon: FileText, path: '/reports', description: 'Построение отчётов' },
  estimates: { view: 'estimates', label: 'Сметы', icon: DollarSign, path: '/estimates', description: 'Калькулятор смет' },
  documents: { view: 'documents', label: 'Документы', icon: FileCheck, path: '/documents', description: 'Генерация документов' },
  integration: { view: 'integration', label: 'Интеграция', icon: Plug, path: '/integration', description: 'Интеграция с 1С' },
  api: { view: 'api', label: 'API', icon: Code, path: '/api', description: 'API документация' },
  chat: { view: 'chat', label: 'Чат', icon: MessageCircle, path: '/chat', description: 'Чат компании' },
  calendar: { view: 'calendar', label: 'Календарь', icon: Calendar, path: '/calendar', description: 'Календарь событий' },
  tasks: { view: 'tasks', label: 'Задачи', icon: ClipboardList, path: '/tasks', description: 'Канбан задач' },
  employees: { view: 'employees', label: 'Сотрудники', icon: UserPlus, path: '/employees', description: 'Управление сотрудниками' },
  approvals: { view: 'approvals', label: 'Согласования', icon: CheckCircle, path: '/approvals', description: 'Очередь согласования' },
  audit: { view: 'audit', label: 'Аудит', icon: FileText, path: '/audit', description: 'Журнал действий' },
  settings: { view: 'settings', label: 'Настройки', icon: Settings, path: '/settings', description: 'Настройки приложения' },
  companyProfile: { view: 'companyProfile', label: 'Реквизиты компании', icon: Building, path: '/companyProfile', description: 'Реквизиты' },
  tariffs: { view: 'tariffs', label: 'Тарифы', icon: DollarSign, path: '/tariffs', description: 'Управление тарифом' },
  profile: { view: 'profile', label: 'Профиль', icon: User, path: '/profile', description: 'Мой профиль' },
  help: { view: 'help', label: 'Помощь', icon: Sparkles, path: '/help', description: 'Справка' },
  dashboard: { view: 'dashboard', label: 'Главная', icon: Home, path: '/', description: 'Главный экран' },
  clientDashboard: { view: 'clientDashboard', label: 'Мой объект', icon: Home, path: '/client', description: 'Сводка по объекту' },
  clientChat: { view: 'clientChat', label: 'Чат', icon: MessageCircle, path: '/client/chat', description: 'Чат с прорабом' },
  clientDocuments: { view: 'clientDocuments', label: 'Документы', icon: FileCheck, path: '/client/documents', description: 'Мои документы' },
  clientApplications: { view: 'clientApplications', label: 'Заявки', icon: Package, path: '/client/applications', description: 'Мои заявки' },
  clientCalendar: { view: 'clientCalendar', label: 'Календарь', icon: Calendar, path: '/client/calendar', description: 'Календарь' },
  clientConfirmation: { view: 'clientConfirmation', label: 'Согласования', icon: CheckCircle, path: '/client/confirmation', description: 'Согласования' },
  clientPhotos: { view: 'clientPhotos', label: 'Фотоотчёты', icon: FileText, path: '/client/photos', description: 'Фотоотчёты' },
  clientWorkAct: { view: 'clientWorkAct', label: 'Акты работ', icon: FileCheck, path: '/client/work-act', description: 'Акты работ' },
};

// ─────────────────────────────────────────────────────────────
// 🗺️ КАРТА ДОСТУПНЫХ РАЗДЕЛОВ ПО РОЛЯМ
// ─────────────────────────────────────────────────────────────
const ROLE_VIEWS = {
  master: [
    'dashboard', 'create', 'inwork', 'projects', 'history',
    'warehouse', 'documents', 'chat', 'calendar', 'tasks', 'profile', 'help'
  ],
  foreman: [
    'dashboard', 'create', 'inwork', 'projects', 'history',
    'warehouse', 'documents', 'chat', 'calendar', 'tasks', 'profile', 'help'
  ],
  supply_admin: [
    'dashboard', 'create', 'inwork', 'readyToIssue', 'received', 'projects',
    'crm-sales', 'merge', 'warehouse', 'analytics', 'api', 'estimates',
    'reports', 'integration', 'documents', 'chat', 'calendar', 'tasks',
    'profile', 'help'
  ],
  manager: [
    'dashboard', 'create', 'inwork', 'readyToIssue', 'received', 'projects',
    'merge', 'clients', 'crm-sales', 'warehouse', 'analytics', 'api',
    'estimates', 'reports', 'integration', 'documents', 'chat', 'calendar',
    'tasks', 'employees', 'approvals', 'audit', 'companyProfile',
    'tariffs', 'profile', 'help'
  ],
  director: [
    'dashboard', 'inwork', 'readyToIssue', 'received', 'projects',
    'clients', 'crm-sales', 'warehouse', 'analytics', 'api', 'estimates',
    'reports', 'integration', 'documents', 'chat', 'calendar', 'tasks',
    'employees', 'approvals', 'audit', 'companyProfile', 'tariffs',
    'profile', 'help'
  ],
  accountant: [
    'dashboard', 'inwork', 'received', 'history', 'warehouse',
    'analytics', 'reports', 'estimates', 'documents', 'chat',
    'calendar', 'tasks', 'profile', 'help'
  ],
  client_manager: [
    'dashboard', 'create', 'inwork', 'projects', 'clients',
    'crm-sales', 'warehouse', 'analytics', 'documents', 'chat',
    'calendar', 'tasks', 'profile', 'help'
  ],
  client: [
    'clientDashboard', 'clientChat', 'clientDocuments', 'clientApplications',
    'clientCalendar', 'clientConfirmation', 'clientPhotos', 'clientWorkAct',
    'profile', 'help'
  ],
};

// ─────────────────────────────────────────────────────────────
// 🎯 Быстрые действия по ролям
// ─────────────────────────────────────────────────────────────
const QUICK_ACTIONS = {
  master: [
    { id: 'create_app', label: '➕ Создать заявку', icon: Plus, group: 'quick' },
    { id: 'my_applications', label: '📋 Мои активные заявки', icon: Package, group: 'quick' },
    { id: 'not_received', label: '⏳ Что ещё не получено', icon: Clock, group: 'quick' },
  ],
  foreman: [
    { id: 'create_app', label: '➕ Создать заявку', icon: Plus, group: 'quick' },
    { id: 'my_applications', label: '📋 Мои активные заявки', icon: Package, group: 'quick' },
    { id: 'not_received', label: '⏳ Что ещё не получено', icon: Clock, group: 'quick' },
  ],
  supply_admin: [
    { id: 'pending_receipt', label: '📥 Ожидают приёмки', icon: Package, group: 'quick' },
    { id: 'ready_to_issue', label: '📤 Готовы к выдаче', icon: CheckCircle, group: 'quick' },
    { id: 'warehouse_stock', label: '🏭 Остатки на складе', icon: Warehouse, group: 'quick' },
  ],
  manager: [
    { id: 'analytics_summary', label: '📊 Аналитика компании', icon: BarChart3, group: 'quick' },
    { id: 'problem_apps', label: '⚠️ Проблемные заявки', icon: AlertTriangle, group: 'quick' },
    { id: 'team_activity', label: '👥 Активность команды', icon: User, group: 'quick' },
    { id: 'top_objects', label: '🏗️ Топ объектов', icon: TrendingUp, group: 'quick' },
  ],
  director: [
    { id: 'analytics_summary', label: '📊 Аналитика компании', icon: BarChart3, group: 'quick' },
    { id: 'problem_apps', label: '⚠️ Проблемные заявки', icon: AlertTriangle, group: 'quick' },
    { id: 'team_activity', label: '👥 Активность команды', icon: User, group: 'quick' },
  ],
  accountant: [
    { id: 'completed_apps', label: '✅ Завершённые заявки', icon: CheckCircle, group: 'quick' },
    { id: 'monthly_report', label: '📄 Отчёт за месяц', icon: FileText, group: 'quick' },
  ],
  client_manager: [
    { id: 'my_applications', label: '📋 Заявки', icon: Package, group: 'quick' },
    { id: 'create_app', label: '➕ Создать заявку', icon: Plus, group: 'quick' },
  ],
  client: [
    { id: 'client_applications', label: '📋 Мои заявки', icon: Package, group: 'quick' },
  ],
  default: [
    { id: 'my_applications', label: '📋 Мои заявки', icon: Package, group: 'quick' },
    { id: 'help', label: '❓ Что умеет бот', icon: Sparkles, group: 'quick' },
  ],
};

// ─────────────────────────────────────────────────────────────
// 🔧 Хелперы
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
// 🔧 Группировка разделов по категориям
// ─────────────────────────────────────────────────────────────
function getViewGroup(viewId) {
  const groups = {
    'Основные': ['dashboard', 'inwork', 'create', 'received', 'history', 'readyToIssue'],
    'Работа с материалами': ['warehouse', 'merge'],
    'Клиенты и проекты': ['clients', 'crm-sales', 'projects'],
    'Аналитика и финансы': ['analytics', 'reports', 'estimates', 'tariffs'],
    'Коммуникации': ['chat', 'calendar', 'tasks'],
    'Управление': ['employees', 'approvals', 'audit', 'api', 'integration',
                   'documents', 'settings', 'companyProfile', 'profile', 'help'],
  };
  
  for (const [group, ids] of Object.entries(groups)) {
    if (ids.includes(viewId)) return group;
  }
  return 'Основные';
}

// ─────────────────────────────────────────────────────────────
// 🤖 Компонент AI Assistant (с forwardRef для внешнего управления)
// ─────────────────────────────────────────────────────────────
const AIAssistant = forwardRef(({
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
  pendingApprovalsCount = 0,
  readyToIssueCount = 0,
  mergeableCount = 0,
  cartItemsCount = 0,
  chatUnreadCount = 0,
  t = (k) => k,
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showVoiceSearch, setShowVoiceSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('actions');
  const [showMainMenu, setShowMainMenu] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // ✅ ЭКСПОРТИРУЕМ МЕТОДЫ ДЛЯ ВНЕШНЕГО УПРАВЛЕНИЯ
  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
    isOpen: () => isOpen,
  }), [isOpen]);

  // ✅ Получаем список доступных разделов для роли
  const availableViews = ROLE_VIEWS[userRole] || ROLE_VIEWS.master;

  // ✅ Счётчики для бейджей
  const getBadgeCount = useCallback((viewId) => {
    switch (viewId) {
      case 'readyToIssue': return readyToIssueCount;
      case 'approvals': return pendingApprovalsCount;
      case 'merge': return mergeableCount;
      case 'chat': return chatUnreadCount;
      case 'cart': return cartItemsCount;
      default: return 0;
    }
  }, [readyToIssueCount, pendingApprovalsCount, mergeableCount, chatUnreadCount, cartItemsCount]);

  // ─────────────────────────────────────────────────────────
  // 🎯 Логика каждого действия
  // ─────────────────────────────────────────────────────────
  const executeAction = useCallback(async (actionId, payload) => {
    switch (actionId) {
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
          return { content: '✅ Всё получено! Незавершённых позиций нет.' };
        }

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

      case 'create_app': {
        if (onCreateDraft) onCreateDraft({});
        onNavigate?.('create');
        return { content: '✨ Открываю форму создания заявки...' };
      }

      case 'warehouse_stock': {
        if (!userCompanyId) return { content: '❌ Компания не найдена' };

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
        
        if (problems.length === 0) return { content: '✅ Проблемных заявок нет.' };

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

        return { content: `🏗️ **Топ объектов:**\n\n${list}` };
      }

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

      case 'open_application': {
        const appId = payload?.appId;
        const app = applications.find(a => a.id === appId);
        if (app && onOpenApplication) {
          onOpenApplication(app);
          return { content: `➡️ Открываю заявку "${app.object_name}"...` };
        }
        return { content: '❌ Заявка не найдена' };
      }

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

      case 'navigate_to': {
        const viewId = payload?.viewId;
        const viewInfo = ALL_VIEWS[viewId];
        
        if (!viewInfo) return { content: '❌ Раздел не найден' };
        
        if (!availableViews.includes(viewId)) {
          return { content: `❌ У вас нет доступа к разделу "${viewInfo.label}"` };
        }
        
        onNavigate?.(viewId);
        return { content: `➡️ Открываю **${viewInfo.label}**...` };
      }

      case 'help': {
        const roleActions = (QUICK_ACTIONS[userRole] || QUICK_ACTIONS.default)
          .map(a => `• ${a.label}`)
          .join('\n');
        
        return {
          content: `🤖 **Что я умею:**\n\n**Быстрые действия:**\n${roleActions}\n\n**Навигация:**\nВкладка "Разделы" — переход в любой раздел приложения.\n\n💡 **Совет:** Используйте кнопку 🎤 для голосового поиска!`,
        };
      }

      case 'free_text': {
        const text = payload?.text?.trim();
        if (!text) return { content: '🤔 Введите запрос или используйте кнопки выше.' };
        
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('заявк') && (lowerText.includes('мои') || lowerText.includes('актив'))) {
          return executeAction('my_applications');
        }
        if (lowerText.includes('склад') && (lowerText.includes('остат') || lowerText.includes('товар'))) {
          return executeAction('warehouse_stock');
        }
        if (lowerText.includes('приёмк') || lowerText.includes('приемк')) {
          return executeAction('pending_receipt');
        }
        if (lowerText.includes('выдач') || (lowerText.includes('готов') && lowerText.includes('заяв'))) {
          return executeAction('ready_to_issue');
        }
        if (lowerText.includes('аналитик') || lowerText.includes('статистик') || lowerText.includes('отчёт')) {
          return executeAction('analytics_summary');
        }
        if (lowerText.includes('проблем') || lowerText.includes('просроч')) {
          return executeAction('problem_apps');
        }
        if (lowerText.includes('созда') && lowerText.includes('заяв')) {
          return executeAction('create_app');
        }
        
        const viewMatches = [];
        Object.entries(ALL_VIEWS).forEach(([viewId, viewInfo]) => {
          if (!availableViews.includes(viewId)) return;
          
          const labelLower = viewInfo.label.toLowerCase();
          const descLower = viewInfo.description.toLowerCase();
          
          if (lowerText.includes(labelLower) || 
              labelLower.includes(lowerText) ||
              lowerText.includes(descLower) ||
              descLower.includes(lowerText)) {
            viewMatches.push({ viewId, viewInfo, score: 10 });
          } else {
            const words = lowerText.split(/\s+/);
            const viewWords = `${labelLower} ${descLower}`.split(/\s+/);
            let matches = 0;
            words.forEach(w => {
              if (w.length > 2 && viewWords.some(vw => vw.includes(w) || w.includes(vw))) {
                matches++;
              }
            });
            if (matches > 0) {
              viewMatches.push({ viewId, viewInfo, score: matches });
            }
          }
        });
        
        if (viewMatches.length > 0) {
          viewMatches.sort((a, b) => b.score - a.score);
          
          if (viewMatches.length === 1) {
            return executeAction('navigate_to', { viewId: viewMatches[0].viewId });
          }
          
          const list = viewMatches.slice(0, 5).map(m => ({
            id: m.viewId,
            emoji: '📍',
            title: m.viewInfo.label,
            subtitle: m.viewInfo.description,
            action: {
              id: 'navigate_to',
              label: '➡️ Перейти',
              payload: { viewId: m.viewId },
            },
          }));
          
          return {
            content: `🔍 **Найдено ${viewMatches.length} разделов по запросу "${text}":**`,
            data: list,
          };
        }
        
        return {
          content: `🔍 По запросу "${text}" ничего не найдено.\n\nПопробуйте:\n• "склад"\n• "аналитика"\n• "мои заявки"\n• "документы"`,
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
    userCompanyId, userRole, onNavigate, availableViews,
    onCreateDraft, onOpenApplication, onOpenReceiveModal, showNotification
  ]);

  // ─────────────────────────────────────────────────────────
  // 🧠 Обработчик клика по кнопке
  // ─────────────────────────────────────────────────────────
  const handleAction = useCallback(async (actionId, payload = null, customLabel = null) => {
    const action = (QUICK_ACTIONS[userRole] || QUICK_ACTIONS.default)
      .find(a => a.id === actionId);
    
    const viewInfo = ALL_VIEWS[payload?.viewId];
    
    setShowMainMenu(false);
    
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: customLabel || action?.label || viewInfo?.label || actionId,
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

  const handleBackToMenu = useCallback(() => {
    setShowMainMenu(true);
  }, []);

  const handleSendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    await handleAction('free_text', { text }, text);
  }, [inputValue, handleAction]);

  const handleVoiceSearch = useCallback((query) => {
    setShowVoiceSearch(false);
    if (query) {
      setInputValue(query);
      setTimeout(() => {
        handleAction('free_text', { text: query }, query);
        setInputValue('');
      }, 100);
    }
  }, [handleAction]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Приветствие
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      const roleLabel = {
        master: 'мастер',
        foreman: 'прораб',
        supply_admin: 'снабженец',
        manager: 'руководитель',
        director: 'директор',
        accountant: 'бухгалтер',
        client_manager: 'менеджер клиентов',
        client: 'заказчик',
      }[userRole] || 'пользователь';

      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Привет! Я ассистент Реглай.\n\nЯ вижу вас как **${roleLabel}**. Чем помочь?\n\n💡 Выбирайте действия на вкладке "Действия" или переходите в разделы на вкладке "Разделы".`,
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

  // Фокус
  useEffect(() => {
    if (isOpen && inputRef.current && !showMainMenu) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, showMainMenu]);

  // ─────────────────────────────────────────────────────────
  // 🎨 Рендер
  // ─────────────────────────────────────────────────────────
  const quickActions = QUICK_ACTIONS[userRole] || QUICK_ACTIONS.default;

  const groupedViews = React.useMemo(() => {
    const groups = {
      'Основные': [],
      'Работа с материалами': [],
      'Клиенты и проекты': [],
      'Аналитика и финансы': [],
      'Коммуникации': [],
      'Управление': [],
    };

    availableViews.forEach(viewId => {
      const viewInfo = ALL_VIEWS[viewId];
      if (!viewInfo) return;
      
      const group = viewInfo.group || getViewGroup(viewId);
      if (groups[group]) {
        groups[group].push({ id: viewId, ...viewInfo });
      }
    });

    return Object.entries(groups)
      .filter(([groupName, items]) => {
        if (items.length === 0) {
          console.debug(`[AIAssistant] Группа "${groupName}" пуста, скрываем`);
          return false;
        }
        return true;
      })
      .map(([groupName, items]) => ({
        groupName,
        items,
        count: items.length,
      }));
  }, [availableViews]);

  const renderMessageContent = (msg) => {
    if (msg.data && Array.isArray(msg.data) && msg.data.length > 0) {
      return (
        <>
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

  // ✅ Рендерим окно чата только когда открыто. Плавающей кнопки НЕТ — она в Navbar.
  return (
    <>
      {isOpen && (
        <div
          className="fixed top-20 right-4 lg:top-24 lg:right-8 w-[380px] max-w-[calc(100vw-2rem)] h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-[9999] border border-gray-200 dark:border-gray-700 fade-enter"
          role="dialog"
          aria-label="AI-ассистент"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#4A6572]/5 to-[#344955]/5 rounded-t-2xl">
            <div className="flex items-center gap-2">
              {!showMainMenu && (
                <button
                  onClick={handleBackToMenu}
                  className="p-1.5 text-[#4A6572] dark:text-[#F9AA33] hover:bg-[#4A6572]/10 dark:hover:bg-[#F9AA33]/10 rounded-lg transition-colors"
                  title="Вернуться в главное меню"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              
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
            <div className="flex items-center gap-1">
              {!showMainMenu && (
                <button
                  onClick={handleBackToMenu}
                  className="p-1.5 text-gray-400 hover:text-[#4A6572] dark:hover:text-[#F9AA33] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Главное меню"
                >
                  <Home className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Вкладки — только в главном меню */}
          {showMainMenu && (
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('actions')}
                className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'actions'
                    ? 'text-[#4A6572] dark:text-[#F9AA33] border-b-2 border-[#4A6572] dark:border-[#F9AA33]'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Действия
              </button>
              <button
                onClick={() => setActiveTab('navigation')}
                className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'navigation'
                    ? 'text-[#4A6572] dark:text-[#F9AA33] border-b-2 border-[#4A6572] dark:border-[#F9AA33]'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Разделы ({availableViews.length})
              </button>
            </div>
          )}

          {/* Главное меню */}
          {showMainMenu ? (
            <div className="flex-1 overflow-y-auto p-3">
              {messages.length > 0 && messages[0].id === 'welcome' && (
                <div className="mb-4 p-3 bg-gradient-to-br from-[#4A6572]/5 to-[#344955]/5 rounded-xl">
                  <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {renderMessageContent(messages[0])}
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1 mb-2">
                    Быстрые действия
                  </div>
                  <div className="space-y-2">
                    {quickActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.id}
                          onClick={() => handleAction(action.id)}
                          disabled={isLoading}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-[#4A6572]/10 dark:hover:bg-[#F9AA33]/10 text-gray-700 dark:text-gray-200 transition-all disabled:opacity-50 border border-transparent hover:border-[#4A6572]/20 dark:hover:border-[#F9AA33]/20"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#4A6572]/10 dark:bg-[#F9AA33]/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-[#4A6572] dark:text-[#F9AA33]" />
                          </div>
                          <span className="flex-1 font-medium">{action.label}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💡 <strong>Совет:</strong> Переключитесь на вкладку <strong>"Разделы"</strong>, чтобы перейти в любой раздел приложения.
                    </p>
                  </div>
                </>
              )}

              {activeTab === 'navigation' && (
                <>
                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1 mb-2">
                    Доступные разделы ({availableViews.length})
                  </div>
                  
                  {groupedViews.map(({ groupName, items, count }) => (
                    <div key={groupName} className="mb-3">
                      <div className="flex items-center justify-between px-1 mb-1.5">
                        <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                          {groupName}
                        </div>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-full px-1.5 py-0.5">
                          {count}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {items.map((view) => {
                          const Icon = view.icon;
                          const badge = getBadgeCount(view.id);
                          
                          return (
                            <button
                              key={view.id}
                              onClick={() => handleAction('navigate_to', { viewId: view.id }, view.label)}
                              disabled={isLoading}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-[#4A6572]/10 dark:hover:bg-[#F9AA33]/10 text-gray-700 dark:text-gray-200 transition-all disabled:opacity-50 border border-transparent hover:border-[#4A6572]/20 dark:hover:border-[#F9AA33]/20"
                            >
                              <Icon className="w-4 h-4 text-[#4A6572] dark:text-[#F9AA33] flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-xs">{view.label}</div>
                                <div className="text-[10px] text-gray-400 truncate">{view.description}</div>
                              </div>
                              {badge > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#F9AA33] text-white min-w-[20px] text-center">
                                  {badge}
                                </span>
                              )}
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            /* Чат с результатами */
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
              
              <button
                onClick={() => setShowVoiceSearch(true)}
                className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Голосовой ввод"
              >
                <Mic className="w-4 h-4" />
              </button>
              
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="px-3 py-2 rounded-xl bg-[#4A6572] text-white hover:bg-[#344955] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно голосового поиска */}
      {showVoiceSearch && (
        <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center p-4">
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
});

AIAssistant.displayName = 'AIAssistant';

export default AIAssistant;