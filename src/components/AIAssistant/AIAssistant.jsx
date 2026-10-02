// src/components/AIAssistant/AIAssistant.jsx
import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react';
import {
  Bot, X, Send, Sparkles, Package, Warehouse, BarChart3,
  AlertTriangle, Plus, Search, FileText, CheckCircle, Clock,
  ArrowRight, User, TrendingUp, Loader2, ChevronRight, Mic,
  Home, ArrowLeft, Users, MessageCircle, Calendar, ClipboardList,
  DollarSign, Code, FileCheck, Plug, Building, Target, Layers,
  History, Truck, UserPlus, Briefcase, Settings, Bell, Star,
  Download, Volume2, Lightbulb, Pin, PinOff,
  MessageSquare, ShoppingBag, Gauge, Tag, Boxes, BadgeCheck,
  Inbox, Filter, Check, PackageCheck, Trophy,
} from 'lucide-react';
import SmartVoiceSearch from '../SmartVoiceSearch';
// 🆕 ИМПОРТ ГЛОБАЛЬНЫХ ROLE_VIEWS
import { ROLE_VIEWS } from '../../utils/roleViews';
// 🆕 ИМПОРТ ФУНКЦИЙ ПРАВ
import { isProcurement, isSupplier } from '../../utils/permissions';
// 🆕 ИМПОРТ API
import {
  getSuppliers,
  getRFQList,
  getPurchaseOrders,
  searchMaterialsAcrossSuppliers,
} from '../../api/suppliers';

// ─────────────────────────────────────────────────────────────
// 🎨 ГЛОБАЛЬНЫЕ АНИМАЦИИ
// ─────────────────────────────────────────────────────────────
const AI_ASSISTANT_STYLES = `
@keyframes aiBounceIn {
  0% { transform: scale(0.3) translateY(-10px); opacity: 0; }
  50% { transform: scale(1.05) translateY(0); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes aiSlideUpFade {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes aiSlideInRight {
  from { transform: translateX(30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes aiPulseRing {
  0% { box-shadow: 0 0 0 0 rgba(249, 170, 51, 0.7); }
  70% { box-shadow: 0 0 0 12px rgba(249, 170, 51, 0); }
  100% { box-shadow: 0 0 0 0 rgba(249, 170, 51, 0); }
}
@keyframes aiWiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}
@keyframes aiFadeOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(30px); }
}
.ai-bounce-in { animation: aiBounceIn 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55); }
.ai-slide-up { animation: aiSlideUpFade 0.3s ease-out; }
.ai-slide-right { animation: aiSlideInRight 0.3s ease-out; }
.ai-pulse-ring { animation: aiPulseRing 2s infinite; }
.ai-wiggle { animation: aiWiggle 0.6s ease-in-out; }
.ai-fade-out { animation: aiFadeOut 0.3s ease-in forwards; }
`;

// ─────────────────────────────────────────────────────────────
// 🕐 КОНСТАНТЫ КЭША
// ─────────────────────────────────────────────────────────────
const CACHE_TTL = 60 * 1000; // 1 минута

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
  objects: { view: 'objects', label: 'Объекты', icon: Building, path: '/objects', description: 'Папки объектов и проектов' },
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
  suppliers: { view: 'suppliers', label: 'Поставщики', icon: Truck, path: '/suppliers', description: 'Справочник поставщиков' },
  supplierCatalog: { view: 'supplierCatalog', label: 'Каталог материалов', icon: Layers, path: '/supplier-catalog', description: 'Сквозной поиск по прайс-листам' },
  supplierPriceList: { view: 'supplierPriceList', label: 'Прайс-лист поставщика', icon: Tag, path: '/supplier-price-list', description: 'Позиции поставщика' },
  rfqList: { view: 'rfqList', label: 'RFQ (Запросы цен)', icon: MessageSquare, path: '/rfq', description: 'Запросы цен поставщикам' },
  rfqCreate: { view: 'rfqCreate', label: 'Создать RFQ', icon: Plus, path: '/rfq/new', description: 'Новый запрос цен' },
  rfqDetails: { view: 'rfqDetails', label: 'Детали RFQ', icon: FileText, path: '/rfq/details', description: 'Предложения поставщиков' },
  purchaseOrders: { view: 'purchaseOrders', label: 'Заказы', icon: ShoppingBag, path: '/purchase-orders', description: 'Заказы поставщикам' },
  purchaseOrderCreate: { view: 'purchaseOrderCreate', label: 'Создать заказ', icon: Plus, path: '/purchase-orders/new', description: 'Новый заказ поставщику' },
  purchaseOrderDetails: { view: 'purchaseOrderDetails', label: 'Детали заказа', icon: FileText, path: '/purchase-orders/details', description: 'Статус заказа' },
  procurementDashboard: { view: 'procurementDashboard', label: 'Закупки', icon: Gauge, path: '/procurement', description: 'Дашборд закупщика' },
  supplierDashboard: { view: 'supplierDashboard', label: 'Мой дашборд', icon: Gauge, path: '/supplier-dashboard', description: 'Дашборд поставщика' },
};

// ─────────────────────────────────────────────────────────────
// 🎯 Быстрые действия по ролям
// ─────────────────────────────────────────────────────────────
const QUICK_ACTIONS = {
  master: [
    { id: 'create_app', label: '➕ Создать заявку', icon: Plus, group: 'quick' },
    { id: 'my_applications', label: '📋 Мои активные заявки', icon: Package, group: 'quick' },
    { id: 'my_objects', label: '🏢 Мои объекты', icon: Building, group: 'quick' },
    { id: 'not_received', label: '⏳ Что ещё не получено', icon: Clock, group: 'quick' },
  ],
  foreman: [
    { id: 'create_app', label: '➕ Создать заявку', icon: Plus, group: 'quick' },
    { id: 'my_applications', label: '📋 Мои активные заявки', icon: Package, group: 'quick' },
    { id: 'my_objects', label: '🏢 Мои объекты', icon: Building, group: 'quick' },
    { id: 'not_received', label: '⏳ Что ещё не получено', icon: Clock, group: 'quick' },
  ],
  supply_admin: [
    { id: 'pending_receipt', label: '📥 Ожидают приёмки', icon: Package, group: 'quick' },
    { id: 'ready_to_issue', label: '📤 Готовы к выдаче', icon: CheckCircle, group: 'quick' },
    { id: 'warehouse_stock', label: '🏭 Остатки на складе', icon: Warehouse, group: 'quick' },
    { id: 'suppliers_list', label: '🏢 Мои поставщики', icon: Truck, group: 'suppliers' },
    { id: 'rfq_pending', label: '📨 RFQ без ответа', icon: MessageSquare, group: 'suppliers' },
    { id: 'rfq_with_offers', label: '💰 RFQ с предложениями', icon: TrendingUp, group: 'suppliers' },
    { id: 'po_pending', label: '📦 Заказы в работе', icon: ShoppingBag, group: 'suppliers' },
    { id: 'po_received', label: '✅ Полученные заказы', icon: PackageCheck, group: 'suppliers' },
  ],
  manager: [
    { id: 'analytics_summary', label: '📊 Аналитика компании', icon: BarChart3, group: 'quick' },
    { id: 'problem_apps', label: '⚠️ Проблемные заявки', icon: AlertTriangle, group: 'quick' },
    { id: 'team_activity', label: '👥 Активность команды', icon: User, group: 'quick' },
    { id: 'my_objects', label: '🏢 Мои объекты', icon: Building, group: 'quick' },
    { id: 'top_objects', label: '🏗️ Топ объектов', icon: TrendingUp, group: 'quick' },
    { id: 'suppliers_list', label: '🏢 Поставщики', icon: Truck, group: 'suppliers' },
    { id: 'rfq_pending', label: '📨 RFQ без ответа', icon: MessageSquare, group: 'suppliers' },
    { id: 'rfq_with_offers', label: '💰 RFQ с предложениями', icon: TrendingUp, group: 'suppliers' },
    { id: 'po_pending', label: '📦 Заказы в работе', icon: ShoppingBag, group: 'suppliers' },
    { id: 'suppliers_stats', label: '📊 Статистика закупок', icon: Gauge, group: 'suppliers' },
  ],
  director: [
    { id: 'analytics_summary', label: '📊 Аналитика компании', icon: BarChart3, group: 'quick' },
    { id: 'problem_apps', label: '⚠️ Проблемные заявки', icon: AlertTriangle, group: 'quick' },
    { id: 'team_activity', label: '👥 Активность команды', icon: User, group: 'quick' },
    { id: 'my_objects', label: '🏢 Мои объекты', icon: Building, group: 'quick' },
    { id: 'suppliers_list', label: '🏢 Поставщики', icon: Truck, group: 'suppliers' },
    { id: 'rfq_pending', label: '📨 RFQ без ответа', icon: MessageSquare, group: 'suppliers' },
    { id: 'suppliers_stats', label: '📊 Статистика закупок', icon: Gauge, group: 'suppliers' },
  ],
  accountant: [
    { id: 'completed_apps', label: '✅ Завершённые заявки', icon: CheckCircle, group: 'quick' },
    { id: 'monthly_report', label: '📄 Отчёт за месяц', icon: FileText, group: 'quick' },
    { id: 'po_pending', label: '📦 Заказы в работе', icon: ShoppingBag, group: 'suppliers' },
    { id: 'po_received', label: '✅ Полученные заказы', icon: PackageCheck, group: 'suppliers' },
  ],
  client_manager: [
    { id: 'my_applications', label: '📋 Заявки', icon: Package, group: 'quick' },
    { id: 'create_app', label: '➕ Создать заявку', icon: Plus, group: 'quick' },
  ],
  client: [
    { id: 'client_applications', label: '📋 Мои заявки', icon: Package, group: 'quick' },
  ],
  procurement_manager: [
    { id: 'procurement_overview', label: '📊 Обзор закупок', icon: Gauge, group: 'quick' },
    { id: 'suppliers_list', label: '🏢 Поставщики', icon: Truck, group: 'quick' },
    { id: 'rfq_pending', label: '📨 RFQ без ответа', icon: MessageSquare, group: 'quick' },
    { id: 'rfq_with_offers', label: '💰 RFQ с предложениями', icon: TrendingUp, group: 'quick' },
    { id: 'po_pending', label: '📦 Заказы в работе', icon: ShoppingBag, group: 'quick' },
    { id: 'catalog_search_prompt', label: '🔍 Поиск в каталоге', icon: Search, group: 'quick' },
    { id: 'top_suppliers_by_price', label: '🏆 Топ поставщиков', icon: Trophy, group: 'quick' },
  ],
  supplier_admin: [
    { id: 'supplier_incoming_rfq', label: '📨 Входящие RFQ', icon: Inbox, group: 'quick' },
    { id: 'supplier_incoming_po', label: '📦 Входящие заказы', icon: ShoppingBag, group: 'quick' },
    { id: 'supplier_pricelist', label: '💰 Мой прайс-лист', icon: Tag, group: 'quick' },
  ],
  supplier_manager: [
    { id: 'supplier_incoming_rfq', label: '📨 Входящие RFQ', icon: Inbox, group: 'quick' },
    { id: 'supplier_incoming_po', label: '📦 Входящие заказы', icon: ShoppingBag, group: 'quick' },
    { id: 'supplier_pricelist', label: '💰 Мой прайс-лист', icon: Tag, group: 'quick' },
  ],
  default: [
    { id: 'my_applications', label: '📋 Мои заявки', icon: Package, group: 'quick' },
    { id: 'help', label: '❓ Что умеет бот', icon: Sparkles, group: 'quick' },
  ],
};

// ─────────────────────────────────────────────────────────────
// 🧠 КОНТЕКСТНЫЕ ДЕЙСТВИЯ
// ─────────────────────────────────────────────────────────────
const CONTEXTUAL_ACTIONS = {
  inwork: [
    { id: 'problem_apps', label: '⚠️ Показать проблемные', icon: AlertTriangle, isContextual: true },
    { id: 'create_app', label: '➕ Создать заявку', icon: Plus, isContextual: true },
  ],
  warehouse: [
    { id: 'pending_receipt', label: '📥 Ожидают приёмки', icon: Package, isContextual: true },
    { id: 'ready_to_issue', label: '📤 К выдаче', icon: CheckCircle, isContextual: true },
  ],
  readyToIssue: [
    { id: 'ready_to_issue', label: '📤 Показать топ-5', icon: CheckCircle, isContextual: true },
  ],
  received: [
    { id: 'pending_receipt', label: '📥 В работе', icon: Package, isContextual: true },
  ],
  analytics: [
    { id: 'analytics_summary', label: '📊 Сводка', icon: BarChart3, isContextual: true },
    { id: 'top_objects', label: '🏗️ Топ объектов', icon: TrendingUp, isContextual: true },
    { id: 'problem_apps', label: '⚠️ Проблемные', icon: AlertTriangle, isContextual: true },
  ],
  history: [
    { id: 'completed_apps', label: '✅ Завершённые', icon: CheckCircle, isContextual: true },
  ],
  documents: [
    { id: 'open_documents', label: '📄 Документы', icon: FileText, isContextual: true },
  ],
  clients: [
    { id: 'team_activity', label: '👥 Активность', icon: User, isContextual: true },
  ],
  objects: [
    { id: 'my_objects', label: '🏢 Все объекты', icon: Building, isContextual: true },
  ],
  suppliers: [
    { id: 'suppliers_list', label: '🏢 Все поставщики', icon: Truck, isContextual: true },
    { id: 'rfq_create', label: '📨 Создать RFQ', icon: MessageSquare, isContextual: true },
  ],
  supplierCatalog: [
    { id: 'catalog_search_prompt', label: '🔍 Найти материал', icon: Search, isContextual: true },
    { id: 'rfq_create', label: '📨 В RFQ', icon: MessageSquare, isContextual: true },
  ],
  supplierPriceList: [
    { id: 'suppliers_list', label: '⬅ К поставщикам', icon: Truck, isContextual: true },
    { id: 'rfq_create', label: '📨 Создать RFQ', icon: MessageSquare, isContextual: true },
  ],
  rfqList: [
    { id: 'rfq_pending', label: '📨 Без ответа', icon: Clock, isContextual: true },
    { id: 'rfq_with_offers', label: '💰 С предложениями', icon: TrendingUp, isContextual: true },
    { id: 'rfq_create', label: '➕ Создать RFQ', icon: Plus, isContextual: true },
  ],
  rfqCreate: [
    { id: 'suppliers_list', label: '🏢 Выбрать поставщиков', icon: Truck, isContextual: true },
  ],
  rfqDetails: [
    { id: 'rfq_best_offer', label: '🏆 Лучшее предложение', icon: TrendingUp, isContextual: true },
    { id: 'po_create_from_rfq', label: '📦 Создать заказ', icon: ShoppingBag, isContextual: true },
  ],
  purchaseOrders: [
    { id: 'po_pending', label: '📦 В работе', icon: Clock, isContextual: true },
    { id: 'po_received', label: '✅ Полученные', icon: PackageCheck, isContextual: true },
  ],
  purchaseOrderDetails: [
    { id: 'po_pending', label: '📦 Все в работе', icon: ShoppingBag, isContextual: true },
  ],
  procurementDashboard: [
    { id: 'rfq_pending', label: '📨 RFQ без ответа', icon: Clock, isContextual: true },
    { id: 'po_pending', label: '📦 Заказы в работе', icon: ShoppingBag, isContextual: true },
    { id: 'suppliers_stats', label: '📊 Статистика', icon: Gauge, isContextual: true },
  ],
  supplierDashboard: [
    { id: 'supplier_incoming_rfq', label: '📨 Входящие RFQ', icon: Inbox, isContextual: true },
    { id: 'supplier_incoming_po', label: '📦 Входящие заказы', icon: ShoppingBag, isContextual: true },
  ],
};

// ─────────────────────────────────────────────────────────────
// 🎯 ДЕЙСТВИЯ, ТРЕБУЮЩИЕ ДОСТУПА К ПОСТАВЩИКАМ
// ─────────────────────────────────────────────────────────────
const SUPPLIER_ACTIONS = [
  'suppliers_list', 'supplier_search', 'open_supplier_details', 'suppliers_stats',
  'catalog_search', 'catalog_search_prompt', 'best_price_for_material',
  'rfq_list', 'rfq_pending', 'rfq_with_offers', 'rfq_create', 'open_rfq_details', 'rfq_best_offer',
  'purchase_orders_list', 'po_pending', 'po_received', 'open_po_details', 'po_create_from_rfq',
  'supplier_incoming_rfq', 'supplier_incoming_po', 'supplier_pricelist', 'procurement_overview',
  'rfq_create_with_materials', 'compare_rfq_offers', 'top_suppliers_by_price', 'who_supplies_material',
];

const SUPPLIER_VIEWS = [
  'suppliers', 'supplierCatalog', 'supplierPriceList', 'rfqList', 'rfqCreate', 'rfqDetails',
  'purchaseOrders', 'purchaseOrderCreate', 'purchaseOrderDetails',
  'procurementDashboard', 'supplierDashboard',
];

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

const formatPrice = (value) => {
  const n = Number(value) || 0;
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// 🆕 RFQ статусы (по реальному enum из БД)
const getRFQStatusEmoji = (status) => {
  const map = {
    draft: '📝',
    sent: '📨',
    collecting: '⏳',
    analyzing: '⚖️',
    completed: '✅',
    canceled: '❌',
  };
  return map[status] || '📨';
};

const getRFQStatusLabel = (status) => {
  const map = {
    draft: 'Черновик',
    sent: 'Отправлен',
    collecting: 'Сбор предложений',
    analyzing: 'Анализ',
    completed: 'Завершён',
    canceled: 'Отменён',
  };
  return map[status] || status;
};

// 🆕 PO статусы (по реальному enum из БД)
const getPOStatusEmoji = (status) => {
  const map = {
    created: '📝',
    confirmed: '✅',
    paid: '💰',
    shipped: '🚚',
    delivered: '📦',
    received: '✅',
    canceled: '❌',
  };
  return map[status] || '📦';
};

const getPOStatusLabel = (status) => {
  const map = {
    created: 'Создан',
    confirmed: 'Подтверждён',
    paid: 'Оплачен',
    shipped: 'Отправлен',
    delivered: 'Доставлен',
    received: 'Получен',
    canceled: 'Отменён',
  };
  return map[status] || status;
};

const getPaymentStatusLabel = (status) => {
  const map = {
    unpaid: 'Не оплачен',
    partial: 'Частично',
    paid: 'Оплачен',
  };
  return map[status] || status;
};

function getViewGroup(viewId) {
  const groups = {
    'Основные': ['dashboard', 'inwork', 'create', 'received', 'history', 'readyToIssue', 'objects', 'object-hub'],
    'Работа с материалами': ['warehouse', 'merge', 'priceCatalog'],
    'Клиенты и проекты': ['clients', 'crm-sales', 'projects'],
    'Аналитика и финансы': ['analytics', 'reports', 'estimates', 'tariffs'],
    'Коммуникации': ['chat', 'calendar', 'tasks'],
    'Управление': ['employees', 'approvals', 'audit', 'api', 'integration',
                   'documents', 'settings', 'companyProfile', 'profile', 'help'],
    'Поставщики и закупки': ['suppliers', 'supplierCatalog', 'supplierPriceList',
                              'rfqList', 'rfqCreate', 'rfqDetails',
                              'purchaseOrders', 'purchaseOrderCreate', 'purchaseOrderDetails',
                              'procurementDashboard', 'supplierDashboard'],
  };

  for (const [group, ids] of Object.entries(groups)) {
    if (ids.includes(viewId)) return group;
  }
  return 'Основные';
}

// ─────────────────────────────────────────────────────────────
// 🤖 Компонент AI Assistant
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
  // 🆕 НОВЫЙ ПРОП
  onAddToRFQCart,
  pendingApprovalsCount = 0,
  readyToIssueCount = 0,
  mergeableCount = 0,
  cartItemsCount = 0,
  chatUnreadCount = 0,
  rfqCartCount = 0,
  currentView: currentViewProp = '',
  currentPlan = null,
  planLimits = null,
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

  const cacheRef = useRef({
    suppliers: null,
    suppliersFetchedAt: 0,
    rfqList: null,
    rfqFetchedAt: 0,
    poList: null,
    poFetchedAt: 0,
  });

  const [showHint, setShowHint] = useState(false);
  const [hintHiding, setHintHiding] = useState(false);

  const [pinnedViews, setPinnedViews] = useState(() => {
    try {
      const saved = localStorage.getItem(`pinned_views_${userRole}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [notifications, setNotifications] = useState([]);
  const [recommendation, setRecommendation] = useState(null);

  // ─────────────────────────────────────────────────────────
  // 🎨 Инжект стилей
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'ai-assistant-styles';
    styleEl.textContent = AI_ASSISTANT_STYLES;
    if (!document.getElementById('ai-assistant-styles')) {
      document.head.appendChild(styleEl);
    }
    return () => {
      const existing = document.getElementById('ai-assistant-styles');
      if (existing) existing.remove();
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // 📊 Отслеживание статистики просмотров
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentViewProp || !user?.id) return;

    try {
      const key = `view_stats_${user.id}`;
      const stats = JSON.parse(localStorage.getItem(key) || '{}');
      stats[currentViewProp] = (stats[currentViewProp] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(stats));
    } catch (err) {
      console.debug('View stats error:', err);
    }
  }, [currentViewProp, user?.id]);

  // ─────────────────────────────────────────────────────────
  // 🎯 Экспорт методов
  // ─────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
    isOpen: () => isOpen,
    notify: (notification) => {
      const id = Date.now();
      setNotifications(prev => [...prev, { id, ...notification }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 15000);
    },
  }), [isOpen]);

  // ─────────────────────────────────────────────────────────
  // ✅ Подсказка при первом входе
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || isOpen) return;

    const hasSeenHint = localStorage.getItem(`ai_hint_${user.id}`);
    if (hasSeenHint) return;

    const timer = setTimeout(() => setShowHint(true), 5000);
    const hideTimer = setTimeout(() => {
      setHintHiding(true);
      setTimeout(() => {
        setShowHint(false);
        setHintHiding(false);
        localStorage.setItem(`ai_hint_${user.id}`, 'seen');
      }, 300);
    }, 25000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [user?.id, isOpen]);

  const dismissHint = useCallback(() => {
    setHintHiding(true);
    setTimeout(() => {
      setShowHint(false);
      setHintHiding(false);
      if (user?.id) {
        localStorage.setItem(`ai_hint_${user.id}`, 'seen');
      }
    }, 300);
  }, [user?.id]);

  // ─────────────────────────────────────────────────────────
  // ✅ Персональные рекомендации
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !isOpen || !showMainMenu) return;

    try {
      const stats = JSON.parse(localStorage.getItem(`view_stats_${user.id}`) || '{}');
      const totalViews = Object.values(stats).reduce((a, b) => a + b, 0);
      if (totalViews < 10) return;

      if ((stats.analytics || 0) > 8 && (stats.create || 0) < 2) {
        setRecommendation({
          emoji: '💡',
          text: 'Вы часто смотрите аналитику! Хотите увидеть топ-3 объекта?',
          action: { id: 'top_objects', label: '🏗️ Показать топ' },
        });
        return;
      }

      if ((stats.warehouse || 0) > 15) {
        setRecommendation({
          emoji: '📦',
          text: 'Много работаете со складом! Проверьте остатки?',
          action: { id: 'warehouse_stock', label: '🏭 Проверить' },
        });
        return;
      }

      if ((stats.suppliers || 0) > 5 && (stats.rfqList || 0) < 2) {
        setRecommendation({
          emoji: '📨',
          text: 'Вы часто работаете с поставщиками! Создать RFQ?',
          action: { id: 'rfq_create', label: '📨 Создать RFQ' },
        });
        return;
      }

      const overdue = applications.filter(a =>
        a.status === 'pending' &&
        (Date.now() - new Date(a.created_at)) > 2 * 86400000
      );
      if (overdue.length > 3) {
        setRecommendation({
          emoji: '⚠️',
          text: `Обнаружено ${overdue.length} просроченных заявок. Показать?`,
          action: { id: 'problem_apps', label: '👁 Показать' },
        });
        return;
      }

      setRecommendation(null);
    } catch (err) {
      console.debug('Recommendation error:', err);
    }
  }, [user?.id, isOpen, showMainMenu, applications]);

  // ─────────────────────────────────────────────────────────
  // ✅ Проактивные уведомления
  // ─────────────────────────────────────────────────────────
  const lastNotifiedRef = useRef({});

  useEffect(() => {
    if (!user?.id || applications.length === 0) return;

    const checkProblems = () => {
      const now = Date.now();
      const lastCheck = lastNotifiedRef.current.lastCheck || 0;
      if (now - lastCheck < 5 * 60 * 1000) return;
      lastNotifiedRef.current.lastCheck = now;

      const overdue = applications.filter(a =>
        a.status === 'pending' &&
        (now - new Date(a.created_at)) > 2 * 86400000
      );
      const overdueKey = `overdue_${overdue.length}_${Math.floor(now / 86400000)}`;
      if (overdue.length > 0 && !lastNotifiedRef.current[overdueKey]) {
        lastNotifiedRef.current[overdueKey] = true;
        setNotifications(prev => [...prev, {
          id: `overdue_${now}`,
          type: 'warning',
          message: `⚠️ ${overdue.length} просроченных заявок`,
          action: { id: 'problem_apps', label: '👁 Показать' },
          timestamp: now,
        }]);
      }

      const ready = applications.filter(a => a.status === 'ready_for_issue');
      const readyKey = `ready_${ready.length}_${Math.floor(now / 86400000)}`;
      if (ready.length >= 5 && !lastNotifiedRef.current[readyKey]) {
        lastNotifiedRef.current[readyKey] = true;
        setNotifications(prev => [...prev, {
          id: `ready_${now}`,
          type: 'info',
          message: `📤 ${ready.length} заявок ждут выдачи`,
          action: { id: 'ready_to_issue', label: '👁 Показать' },
          timestamp: now,
        }]);
      }
    };

    checkProblems();
    const interval = setInterval(checkProblems, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, applications]);

  useEffect(() => {
    if (notifications.length === 0) return;

    const timers = notifications.map(n => {
      const elapsed = Date.now() - (n.timestamp || Date.now());
      const remaining = Math.max(0, 15000 - elapsed);
      return setTimeout(() => {
        setNotifications(prev => prev.filter(x => x.id !== n.id));
      }, remaining);
    });

    return () => timers.forEach(clearTimeout);
  }, [notifications]);

  // ─────────────────────────────────────────────────────────
  // 📌 Закреплённые разделы
  // ─────────────────────────────────────────────────────────
  const togglePin = useCallback((viewId) => {
    setPinnedViews(prev => {
      const isPinned = prev.includes(viewId);
      const updated = isPinned
        ? prev.filter(id => id !== viewId)
        : [...prev, viewId].slice(0, 4);

      localStorage.setItem(`pinned_views_${userRole}`, JSON.stringify(updated));
      return updated;
    });
  }, [userRole]);

  // 🆕 ИСПРАВЛЕНО: ROLE_VIEWS[role] — это объект, берём .allowedViews
  const availableViews = useMemo(() => {
    const config = ROLE_VIEWS[userRole] || ROLE_VIEWS.master;
    return config?.allowedViews || [];
  }, [userRole]);

  // 🆕 Проверка доступа к поставщикам (через флаги прав)
  const hasSuppliersAccess = useMemo(() => {
    return isProcurement(userRole) || isSupplier(userRole);
  }, [userRole]);

  // 🆕 getBadgeCount — теперь использует реальные данные из кэша
  const getBadgeCount = useCallback((viewId) => {
    switch (viewId) {
      case 'readyToIssue': return readyToIssueCount;
      case 'approvals': return pendingApprovalsCount;
      case 'merge': return mergeableCount;
      case 'chat': return chatUnreadCount;
      case 'cart': return cartItemsCount;
      case 'rfqList': {
        // 🆕 Активные RFQ: sent, collecting, analyzing
        const list = cacheRef.current.rfqList || [];
        return list.filter(r => ['sent', 'collecting', 'analyzing'].includes(r.status)).length;
      }
      default: return 0;
    }
  }, [readyToIssueCount, pendingApprovalsCount, mergeableCount, chatUnreadCount, cartItemsCount]);

  // ─────────────────────────────────────────────────────────
  // 🆕 ЗАГРУЗЧИКИ ДАННЫХ (через реальные API)
  // ─────────────────────────────────────────────────────────
  const loadSuppliers = useCallback(async (force = false) => {
    if (!userCompanyId || !supabase) return [];

    const now = Date.now();
    if (!force && cacheRef.current.suppliers && (now - cacheRef.current.suppliersFetchedAt) < CACHE_TTL) {
      return cacheRef.current.suppliers;
    }

    try {
      // 🆕 Используем getSuppliers с фильтром status='active'
      const data = await getSuppliers(userCompanyId, { status: 'active', limit: 100 });
      cacheRef.current.suppliers = data || [];
      cacheRef.current.suppliersFetchedAt = now;
      return data || [];
    } catch (err) {
      console.error('[AIAssistant] loadSuppliers error:', err);
      return [];
    }
  }, [userCompanyId, supabase]);

  const loadRFQList = useCallback(async (force = false) => {
    if (!userCompanyId || !supabase) return [];

    const now = Date.now();
    if (!force && cacheRef.current.rfqList && (now - cacheRef.current.rfqFetchedAt) < CACHE_TTL) {
      return cacheRef.current.rfqList;
    }

    try {
      // 🆕 Используем getRFQList (реальная таблица rfq_requests)
      const data = await getRFQList(userCompanyId, { limit: 100 });
      cacheRef.current.rfqList = data || [];
      cacheRef.current.rfqFetchedAt = now;
      return data || [];
    } catch (err) {
      console.error('[AIAssistant] loadRFQList error:', err);
      return [];
    }
  }, [userCompanyId, supabase]);

  const loadPurchaseOrders = useCallback(async (force = false) => {
    if (!userCompanyId || !supabase) return [];

    const now = Date.now();
    if (!force && cacheRef.current.poList && (now - cacheRef.current.poFetchedAt) < CACHE_TTL) {
      return cacheRef.current.poList;
    }

    try {
      // 🆕 Используем getPurchaseOrders (реальные поля: total, expected_delivery)
      const data = await getPurchaseOrders(userCompanyId, { limit: 100 });
      cacheRef.current.poList = data || [];
      cacheRef.current.poFetchedAt = now;
      return data || [];
    } catch (err) {
      console.error('[AIAssistant] loadPurchaseOrders error:', err);
      return [];
    }
  }, [userCompanyId, supabase]);

  // ─────────────────────────────────────────────────────────
  // 🎯 Логика действий
  // ─────────────────────────────────────────────────────────
  const executeAction = useCallback(async (actionId, payload) => {
    // 🆕 Проверка тарифа и доступа для функций поставщиков
    if (SUPPLIER_ACTIONS.includes(actionId)) {
      if (!hasSuppliersAccess) {
        return {
          content: '❌ Модуль "Поставщики" недоступен на вашем тарифе или для вашей роли.\n\nОбратитесь к руководителю или обновите тариф.',
          actions: [
            { id: 'navigate_to', label: '💎 Тарифы', payload: { viewId: 'tariffs' } },
          ],
        };
      }

      if (planLimits && !planLimits.canCreateApplication && ['rfq_create', 'po_create_from_rfq', 'rfq_create_with_materials'].includes(actionId)) {
        return {
          content: `⚠️ Лимит заявок исчерпан (${planLimits.applicationsThisMonth}/${planLimits.applicationsLimit}).\n\nОбновите тариф для создания новых RFQ и заказов.`,
          actions: [
            { id: 'navigate_to', label: '💎 Обновить тариф', payload: { viewId: 'tariffs' } },
          ],
        };
      }
    }

    switch (actionId) {

      // ═══════════════════════════════════════════════════════
      // СУЩЕСТВУЮЩИЕ ДЕЙСТВИЯ
      // ═══════════════════════════════════════════════════════
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

      // 🆕 СКЛАД: реальная таблица warehouse_stock, поле description
      case 'warehouse_stock': {
        if (!userCompanyId) return { content: '❌ Компания не найдена' };

        const { data, error } = await supabase
          .from('warehouse_stock')
          .select('id, description, quantity, unit, updated_at')
          .eq('company_id', userCompanyId)
          .gt('quantity', 0)
          .order('description', { ascending: true })
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
          id: item.id,
          emoji: '📦',
          title: item.description,
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

      case 'my_objects': {
        onNavigate?.('objects');
        return {
          content: '🏢 Открываю раздел **Объекты**...\n\nЗдесь собраны все папки проектов: заявки, материалы, прогресс, участники.',
        };
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
          content: `🤖 **Что я умею:**\n\n**Быстрые действия:**\n${roleActions}\n\n**Навигация:**\nВкладка "Разделы" — переход в любой раздел приложения.\n\n**Поставщики и закупки:**\n• "поставщики" — список поставщиков\n• "RFQ" — запросы цен\n• "заказы" — заказы поставщикам\n• "найди цемент М500" — поиск в каталоге\n• "создай RFQ на цемент 100 мешков"\n• "сравни предложения по RFQ #123"\n• "топ-5 поставщиков по цене"\n• "кто поставляет цемент"\n\n💡 **Совет:** Используйте кнопку 🎤 для голосового поиска!`,
        };
      }

      // ═══════════════════════════════════════════════════════
      // 🆕 ПОСТАВЩИКИ
      // ═══════════════════════════════════════════════════════
      case 'suppliers_list': {
        const suppliers = await loadSuppliers();

        if (suppliers.length === 0) {
          return {
            content: '🏢 У вас пока нет поставщиков.\n\nДобавить первого?',
            actions: [
              { id: 'navigate_to', label: '➕ Добавить поставщика', payload: { viewId: 'suppliers' } },
            ],
          };
        }

        const list = suppliers.slice(0, 8).map(s => ({
          id: s.id,
          emoji: '🏢',
          title: s.name,
          subtitle: [
            s.contact_person && `👤 ${s.contact_person}`,
            s.phone && `📞 ${s.phone}`,
            s.rating > 0 && `★ ${Number(s.rating).toFixed(1)}`,
          ].filter(Boolean).join(' · ') || '—',
          action: {
            id: 'open_supplier_details',
            label: '👁 Открыть',
            payload: { supplierId: s.id },
          },
        }));

        return {
          content: `🏢 **Поставщики (${suppliers.length}):**`,
          data: list,
          actions: [
            { id: 'navigate_to', label: '🏢 Все поставщики', payload: { viewId: 'suppliers' } },
            { id: 'rfq_create', label: '📨 Создать RFQ' },
          ],
        };
      }

      case 'supplier_search': {
        const query = (payload?.query || '').trim().toLowerCase();
        if (!query) {
          return { content: '🔍 Укажите название поставщика для поиска' };
        }

        const suppliers = await loadSuppliers();
        const matched = suppliers.filter(s =>
          s.name?.toLowerCase().includes(query) ||
          s.contact_person?.toLowerCase().includes(query) ||
          s.inn?.includes(query)
        );

        if (matched.length === 0) {
          return {
            content: `🔍 По запросу "${payload.query}" поставщиков не найдено.`,
            actions: [
              { id: 'suppliers_list', label: '🏢 Все поставщики' },
            ],
          };
        }

        const list = matched.slice(0, 8).map(s => ({
          id: s.id,
          emoji: '🏢',
          title: s.name,
          subtitle: s.contact_person || s.phone || '—',
          action: {
            id: 'open_supplier_details',
            label: '👁 Открыть',
            payload: { supplierId: s.id },
          },
        }));

        return {
          content: `🔍 **Найдено ${matched.length} поставщиков:**`,
          data: list,
        };
      }

      case 'open_supplier_details': {
        onNavigate?.('suppliers');
        return {
          content: `➡️ Открываю карточку поставщика...`,
        };
      }

      case 'suppliers_stats': {
        const suppliers = await loadSuppliers();
        const po = await loadPurchaseOrders();
        const rfq = await loadRFQList();

        const activePO = po.filter(p => !['received', 'canceled'].includes(p.status));
        const activeRFQ = rfq.filter(r => !['completed', 'canceled'].includes(r.status));
        const totalSpent = po
          .filter(p => p.status === 'received')
          .reduce((sum, p) => sum + (Number(p.total) || 0), 0);

        return {
          content: `📊 **Статистика закупок:**\n\n• Поставщиков: **${suppliers.length}**\n• Активных RFQ: **${activeRFQ.length}**\n• Активных заказов: **${activePO.length}**\n• Сумма полученных заказов: **${formatPrice(totalSpent)} ₽**`,
          actions: [
            { id: 'navigate_to', label: '📊 Дашборд закупок', payload: { viewId: 'procurementDashboard' } },
          ],
        };
      }

            // ═══════════════════════════════════════════════════════
      // 🆕 КАТАЛОГ МАТЕРИАЛОВ
      // ═══════════════════════════════════════════════════════
      case 'catalog_search_prompt': {
        onNavigate?.('supplierCatalog');
        return {
          content: '🔍 Открываю **Каталог материалов**...\n\nВведите название, артикул или бренд, и я найду лучшие цены во всех прайс-листах.',
        };
      }

      case 'catalog_search': {
        const query = (payload?.query || '').trim();
        if (!query || query.length < 2) {
          return { content: '🔍 Укажите название материала (минимум 2 символа)' };
        }

        try {
          // 🆕 Реальная сигнатура: searchMaterialsAcrossSuppliers(companyId, searchTerm, options)
          const results = await searchMaterialsAcrossSuppliers(userCompanyId, query, {
            limit: 10,
            availableOnly: false,
          });

          if (!results || results.length === 0) {
            return {
              content: `🔍 По запросу "${query}" ничего не найдено.`,
              actions: [
                { id: 'navigate_to', label: '🔍 Открыть каталог', payload: { viewId: 'supplierCatalog' } },
              ],
            };
          }

          // 🆕 Реальные поля: name, article, unit, price, supplier_name, stock_quantity, min_quantity
          const list = results.slice(0, 8).map((item, idx) => ({
            id: item.id || idx,
            emoji: idx === 0 ? '🏆' : '📦',
            title: item.name,
            subtitle: [
              item.article && `арт. ${item.article}`,
              `${formatPrice(item.price)} ₽ / ${item.unit || 'шт'}`,
              item.supplier_name,
            ].filter(Boolean).join(' · '),
          }));

          const cheapest = results[0];
          return {
            content: `🔍 **Найдено ${results.length} предложений по "${query}":**\n\n💰 Лучшая цена: **${formatPrice(cheapest.price)} ₽** у ${cheapest.supplier_name || '—'}`,
            data: list,
            actions: [
              { id: 'navigate_to', label: '🔍 Открыть каталог', payload: { viewId: 'supplierCatalog' } },
              { id: 'rfq_create', label: '📨 Создать RFQ' },
            ],
          };
        } catch (err) {
          console.error('[AIAssistant] catalog_search error:', err);
          return {
            content: '❌ Не удалось выполнить поиск. Открыть каталог?',
            actions: [
              { id: 'navigate_to', label: '🔍 Открыть каталог', payload: { viewId: 'supplierCatalog' } },
            ],
          };
        }
      }

      case 'best_price_for_material': {
        const query = (payload?.query || '').trim();
        if (!query) {
          return { content: '💰 Назовите материал, и я найду лучшую цену.' };
        }
        return executeAction('catalog_search', { query });
      }

      // ═══════════════════════════════════════════════════════
      // 🆕 RFQ
      // ═══════════════════════════════════════════════════════
      case 'rfq_list': {
        const rfq = await loadRFQList();

        if (rfq.length === 0) {
          return {
            content: '📨 У вас пока нет RFQ.\n\nСоздать первый запрос цен?',
            actions: [
              { id: 'rfq_create', label: '📨 Создать RFQ' },
            ],
          };
        }

        const list = rfq.slice(0, 8).map(r => ({
          id: r.id,
          emoji: getRFQStatusEmoji(r.status),
          title: r.title || `RFQ #${r.id.slice(0, 6)}`,
          subtitle: `${getRFQStatusLabel(r.status)} · ${r.items?.length || 0} поз. · ${r.offers_count || 0} предл.`,
          action: {
            id: 'open_rfq_details',
            label: '👁 Открыть',
            payload: { rfqId: r.id },
          },
        }));

        return {
          content: `📨 **Ваши RFQ (${rfq.length}):**`,
          data: list,
          actions: [
            { id: 'navigate_to', label: '📨 Все RFQ', payload: { viewId: 'rfqList' } },
            { id: 'rfq_create', label: '➕ Создать RFQ' },
          ],
        };
      }

      case 'rfq_pending': {
        const rfq = await loadRFQList();
        const pending = rfq.filter(r =>
          ['sent', 'collecting'].includes(r.status)
        );

        if (pending.length === 0) {
          return {
            content: '✅ Нет RFQ без ответа.',
            actions: [
              { id: 'rfq_list', label: '📨 Все RFQ' },
            ],
          };
        }

        const list = pending.slice(0, 8).map(r => {
          const days = Math.floor((Date.now() - new Date(r.created_at)) / 86400000);
          return {
            id: r.id,
            emoji: '⏳',
            title: r.title || `RFQ #${r.id.slice(0, 6)}`,
            subtitle: `${days} дн. · ${r.offers_count || 0} предл.`,
            action: {
              id: 'open_rfq_details',
              label: '👁 Открыть',
              payload: { rfqId: r.id },
            },
          };
        });

        return {
          content: `⏳ **RFQ без ответа (${pending.length}):**`,
          data: list,
          actions: [
            { id: 'navigate_to', label: '📨 Все RFQ', payload: { viewId: 'rfqList' } },
          ],
        };
      }

      case 'rfq_with_offers': {
        const rfq = await loadRFQList();
        const withOffers = rfq.filter(r =>
          ['collecting', 'analyzing'].includes(r.status) &&
          (r.offers_count || 0) > 0
        );

        if (withOffers.length === 0) {
          return {
            content: '💰 RFQ с предложениями пока нет.',
            actions: [
              { id: 'rfq_list', label: '📨 Все RFQ' },
            ],
          };
        }

        const list = withOffers.slice(0, 8).map(r => ({
          id: r.id,
          emoji: '💰',
          title: r.title || `RFQ #${r.id.slice(0, 6)}`,
          subtitle: `${r.offers_count} предложений${r.best_offer_total ? ` · от ${formatPrice(r.best_offer_total)} ₽` : ''}`,
          action: {
            id: 'open_rfq_details',
            label: '👁 Открыть',
            payload: { rfqId: r.id },
          },
        }));

        return {
          content: `💰 **RFQ с предложениями (${withOffers.length}):**`,
          data: list,
          actions: [
            { id: 'navigate_to', label: '📨 Все RFQ', payload: { viewId: 'rfqList' } },
          ],
        };
      }

      case 'rfq_create': {
        onNavigate?.('rfqCreate');
        return {
          content: rfqCartCount > 0
            ? `📨 Открываю форму создания RFQ...\n\nВ корзине **${rfqCartCount}** позиций из каталога.`
            : '📨 Открываю форму создания RFQ...\n\n💡 Совет: сначала добавьте материалы в каталоге.',
        };
      }

      case 'open_rfq_details': {
        const rfqId = payload?.rfqId;
        if (!rfqId) return { content: '❌ ID RFQ не указан' };

        onNavigate?.('rfqDetails');
        return {
          content: `➡️ Открываю детали RFQ...`,
        };
      }

      case 'rfq_best_offer': {
        const rfqId = payload?.rfqId;
        if (!rfqId) {
          const rfq = await loadRFQList();
          const active = rfq.find(r => (r.offers_count || 0) > 0);
          if (!active) {
            return { content: '💰 Нет RFQ с предложениями.' };
          }
          onNavigate?.('rfqDetails');
          return {
            content: `➡️ Открываю RFQ "${active.title || active.id.slice(0, 6)}", чтобы показать лучшее предложение...`,
          };
        }

        onNavigate?.('rfqDetails');
        return { content: '➡️ Открываю лучшее предложение...' };
      }

      // ═══════════════════════════════════════════════════════
      // 🆕 ЗАКАЗЫ
      // ═══════════════════════════════════════════════════════
      case 'purchase_orders_list': {
        const po = await loadPurchaseOrders();

        if (po.length === 0) {
          return {
            content: '📦 У вас пока нет заказов.\n\nСоздать первый заказ?',
            actions: [
              { id: 'navigate_to', label: '📦 Создать заказ', payload: { viewId: 'purchaseOrderCreate' } },
            ],
          };
        }

        const list = po.slice(0, 8).map(p => ({
          id: p.id,
          emoji: getPOStatusEmoji(p.status),
          title: p.order_number || `Заказ #${p.id.slice(0, 6)}`,
          subtitle: `${getPOStatusLabel(p.status)} · ${getPaymentStatusLabel(p.payment_status)} · ${formatPrice(p.total)} ₽`,
          action: {
            id: 'open_po_details',
            label: '👁 Открыть',
            payload: { poId: p.id },
          },
        }));

        return {
          content: `📦 **Ваши заказы (${po.length}):**`,
          data: list,
          actions: [
            { id: 'navigate_to', label: '📦 Все заказы', payload: { viewId: 'purchaseOrders' } },
          ],
        };
      }

      case 'po_pending': {
        const po = await loadPurchaseOrders();
        const pending = po.filter(p =>
          ['created', 'confirmed', 'paid', 'shipped', 'delivered'].includes(p.status)
        );

        if (pending.length === 0) {
          return {
            content: '✅ Нет активных заказов.',
            actions: [
              { id: 'purchase_orders_list', label: '📦 Все заказы' },
            ],
          };
        }

        const list = pending.slice(0, 8).map(p => {
          const days = Math.floor((Date.now() - new Date(p.created_at)) / 86400000);
          return {
            id: p.id,
            emoji: getPOStatusEmoji(p.status),
            title: p.order_number || `Заказ #${p.id.slice(0, 6)}`,
            subtitle: `${getPOStatusLabel(p.status)} · ${days} дн. · ${formatPrice(p.total)} ₽`,
            action: {
              id: 'open_po_details',
              label: '👁 Открыть',
              payload: { poId: p.id },
            },
          };
        });

        return {
          content: `📦 **Заказы в работе (${pending.length}):**`,
          data: list,
          actions: [
            { id: 'navigate_to', label: '📦 Все заказы', payload: { viewId: 'purchaseOrders' } },
          ],
        };
      }

      case 'po_received': {
        const po = await loadPurchaseOrders();
        const received = po.filter(p => p.status === 'received');

        if (received.length === 0) {
          return { content: '✅ Полученных заказов пока нет.' };
        }

        const list = received.slice(0, 8).map(p => ({
          id: p.id,
          emoji: '✅',
          title: p.order_number || `Заказ #${p.id.slice(0, 6)}`,
          subtitle: `${formatDate(p.created_at)} · ${formatPrice(p.total)} ₽`,
          action: {
            id: 'open_po_details',
            label: '👁 Открыть',
            payload: { poId: p.id },
          },
        }));

        return {
          content: `✅ **Полученные заказы (${received.length}):**`,
          data: list,
        };
      }

      case 'open_po_details': {
        const poId = payload?.poId;
        if (!poId) return { content: '❌ ID заказа не указан' };

        onNavigate?.('purchaseOrderDetails');
        return { content: `➡️ Открываю детали заказа...` };
      }

      case 'po_create_from_rfq': {
        onNavigate?.('purchaseOrderCreate');
        return { content: '📦 Открываю форму создания заказа...' };
      }

      // ═══════════════════════════════════════════════════════
      // 🆕 НОВЫЕ СЦЕНАРИИ
      // ═══════════════════════════════════════════════════════

      // 🆕 "создай RFQ на цемент 100 мешков"
      case 'rfq_create_with_materials': {
        const text = payload?.text || '';
        if (!onAddToRFQCart) {
          return { content: '⚠️ Функция добавления в RFQ недоступна. Открываю форму RFQ...\n\nДобавьте материалы вручную.' };
        }

        // Парсим: "создай RFQ на цемент 100 мешков"
        // Также варианты: "создай запрос цен на цемент 100 мешков", "создай rfq цемент 100 мешков"
        const match = text.match(
          /(?:созда[йть]|нов[ый]+)\s+(?:rfq|запрос\s+цен)\s+(?:на\s+)?(.+?)(?:\s+(\d+(?:[.,]\d+)?)\s*([а-яa-z]+)?)?$/i
        );

        if (!match) {
          return { content: '📨 Не удалось распознать материал. Попробуйте: «создай RFQ на цемент 100 мешков»' };
        }

        const [, materialRaw, qtyRaw, unitRaw] = match;
        const materialName = materialRaw?.trim() || '';
        const quantity = qtyRaw ? Number(qtyRaw.replace(',', '.')) : 1;
        const unit = unitRaw?.trim() || 'шт';

        if (!materialName) {
          return { content: '📨 Укажите название материала. Пример: «создай RFQ на цемент 100 мешков»' };
        }

        const items = [{
          name: materialName,
          quantity: quantity > 0 ? quantity : 1,
          unit,
        }];

        onAddToRFQCart(items);

        return {
          content: `📨 Создаю RFQ на **${materialName}** — **${quantity} ${unit}**...\n\nФорма открыта с предзаполненными данными.`,
        };
      }

      // 🆕 "сравни предложения по RFQ #123"
      case 'compare_rfq_offers': {
        const text = payload?.text || '';
        const numMatch = text.match(/#?(\d+)/);
        if (!numMatch) {
          return { content: '⚖️ Укажите номер RFQ. Например: «сравни предложения по RFQ #123»' };
        }

        const rfqNumber = numMatch[1];
        const rfqList = await loadRFQList();

        const targetRFQ = rfqList.find(r => {
          if (!r) return false;
          // Если id короткий — сравниваем по вхождению номера
          if (r.id?.includes(rfqNumber)) return true;
          if (r.title && new RegExp(`#?${rfqNumber}\\b`).test(r.title)) return true;
          return false;
        });

        if (!targetRFQ) {
          return { content: `⚖️ RFQ #${rfqNumber} не найден среди ваших запросов.` };
        }

        if ((targetRFQ.offers_count || 0) < 2) {
          return {
            content: `⚖️ У RFQ «${targetRFQ.title || rfqNumber}» пока меньше двух предложений — сравнить нечего.\n\nОткрыть детали RFQ?`,
            actions: [
              { id: 'open_rfq_details', label: '👁 Открыть RFQ', payload: { rfqId: targetRFQ.id } },
            ],
          };
        }

        // 🆕 Сохраняем флаг — RFQDetails сам откроет сравнение
        try {
          localStorage.setItem('rfq_focus_compare', targetRFQ.id);
        } catch (e) {
          console.warn('[AIAssistant] Не удалось сохранить rfq_focus_compare:', e);
        }

        onNavigate?.('rfqDetails');

        // Также нужно выставить selectedRFQId в App.jsx — сделаем это через спец. событие
        try {
          window.dispatchEvent(new CustomEvent('ai-open-rfq', {
            detail: { rfqId: targetRFQ.id, focusCompare: true },
          }));
        } catch (e) {
          console.warn('[AIAssistant] dispatch ai-open-rfq failed:', e);
        }

        return {
          content: `⚖️ Открываю RFQ **#${rfqNumber}** «${targetRFQ.title || ''}» для сравнения предложений...`,
        };
      }

      // 🆕 "топ-5 поставщиков по цене" (по сумме полученных заказов)
      case 'top_suppliers_by_price': {
        const suppliers = await loadSuppliers();
        const po = await loadPurchaseOrders();

        // Считаем сумму по каждому поставщику
        const totals = {};
        po.forEach(p => {
          if (!p.supplier_id) return;
          if (p.status === 'canceled') return;
          totals[p.supplier_id] = (totals[p.supplier_id] || 0) + (Number(p.total) || 0);
        });

        const sorted = Object.entries(totals)
          .map(([supplierId, total]) => {
            const supplier = suppliers.find(s => s.id === supplierId);
            return supplier ? { supplier, total } : null;
          })
          .filter(Boolean)
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        if (sorted.length === 0) {
          return {
            content: '📊 Пока нет данных о заказах для анализа.\n\nСоздайте первый заказ поставщику.',
            actions: [
              { id: 'navigate_to', label: '📦 К заказам', payload: { viewId: 'purchaseOrders' } },
            ],
          };
        }

        const list = sorted.map((item, idx) => ({
          id: item.supplier.id,
          emoji: idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏢',
          title: item.supplier.name,
          subtitle: `Сумма: ${formatPrice(item.total)} ₽${item.supplier.rating > 0 ? ` · ★ ${Number(item.supplier.rating).toFixed(1)}` : ''}`,
          action: {
            id: 'open_supplier_details',
            label: '👁 Открыть',
            payload: { supplierId: item.supplier.id },
          },
        }));

        return {
          content: `🏆 **Топ-5 поставщиков по сумме заказов:**`,
          data: list,
          actions: [
            { id: 'navigate_to', label: '📊 Дашборд закупок', payload: { viewId: 'procurementDashboard' } },
          ],
        };
      }

      // 🆕 "кто поставляет цемент"
      case 'who_supplies_material': {
        const text = payload?.text || '';
        const match = text.match(/(?:кто\s+поставляет|поставщики|поставщик)\s+(.+)/i);
        if (!match) {
          return { content: '🔍 Укажите материал. Например: «кто поставляет цемент»' };
        }

        const materialQuery = match[1].trim().replace(/[?.,!]+$/, '');
        if (materialQuery.length < 2) {
          return { content: '🔍 Уточните название материала.' };
        }

        try {
          const results = await searchMaterialsAcrossSuppliers(userCompanyId, materialQuery, {
            limit: 50,
            availableOnly: false,
          });

          if (!results || results.length === 0) {
            return {
              content: `🔍 По материалу "${materialQuery}" поставщиков не найдено.`,
              actions: [
                { id: 'navigate_to', label: '🔍 Открыть каталог', payload: { viewId: 'supplierCatalog' } },
              ],
            };
          }

          // Группируем по поставщику
          const bySupplier = new Map();
          for (const item of results) {
            const key = item.supplier_id || item.supplier_name || 'unknown';
            if (!bySupplier.has(key)) {
              bySupplier.set(key, {
                supplier_id: item.supplier_id,
                supplier_name: item.supplier_name || 'Поставщик',
                supplier_rating: item.supplier_rating,
                items: [],
              });
            }
            bySupplier.get(key).items.push(item);
          }

          const grouped = Array.from(bySupplier.values()).map(g => {
            const prices = g.items.map(i => Number(i.price) || 0).filter(p => p > 0);
            return {
              ...g,
              minPrice: prices.length ? Math.min(...prices) : 0,
              maxPrice: prices.length ? Math.max(...prices) : 0,
              count: g.items.length,
            };
          }).sort((a, b) => a.minPrice - b.minPrice);

          const list = grouped.slice(0, 8).map((g, idx) => ({
            id: g.supplier_id || g.supplier_name,
            emoji: idx === 0 ? '🏆' : '🏢',
            title: g.supplier_name,
            subtitle: `${g.count} предложений · от ${formatPrice(g.minPrice)} ₽${g.supplier_rating > 0 ? ` · ★ ${Number(g.supplier_rating).toFixed(1)}` : ''}`,
          }));

          return {
            content: `🔍 **Поставщики материала "${materialQuery}" (${grouped.length}):**`,
            data: list,
            actions: [
              { id: 'navigate_to', label: '🔍 Открыть каталог', payload: { viewId: 'supplierCatalog' } },
            ],
          };
        } catch (err) {
          console.error('[AIAssistant] who_supplies_material error:', err);
          return { content: '❌ Не удалось выполнить поиск.' };
        }
      }

      // ═══════════════════════════════════════════════════════
      // 🆕 ПАРСИНГ СВОБОДНОГО ТЕКСТА
      // ═══════════════════════════════════════════════════════
      case 'free_text': {
        const text = payload?.text?.trim();
        if (!text) return { content: '🤔 Введите запрос или используйте кнопки выше.' };

        const lowerText = text.toLowerCase();

        // ─── ЗАЯВКИ ───
        if (lowerText.includes('заявк') && (lowerText.includes('мои') || lowerText.includes('актив'))) {
          return executeAction('my_applications');
        }
        if (lowerText.includes('объект') || lowerText.includes('папк') || lowerText.includes('жк')) {
          return executeAction('my_objects');
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

        // ─── 🆕 НОВЫЕ СЦЕНАРИИ (проверяем раньше общих) ───

        // "создай RFQ на ..."
        if (/(?:созда[йть]|нов[ый]+)\s+(?:rfq|запрос\s+цен)/i.test(text)) {
          return executeAction('rfq_create_with_materials', { text });
        }

        // "сравни предложения по RFQ #..."
        if (/сравн/i.test(text) && /(rfq|предложен)/i.test(text)) {
          return executeAction('compare_rfq_offers', { text });
        }

        // "топ-N поставщиков по цене"
        if (/топ[-\s]?\d*\s*поставщик/i.test(text)) {
          return executeAction('top_suppliers_by_price');
        }

        // "кто поставляет ..."
        if (/кто\s+поставляет/i.test(text)) {
          return executeAction('who_supplies_material', { text });
        }

        // ─── 🆕 ПОСТАВЩИКИ ───
        if (lowerText.match(/поставщик|контрагент|vendor/i)) {
          const searchMatch = lowerText.match(/(?:найди|покажи|найти)\s+(?:поставщика\s+)?["«]?([^"»]+)["»]?/i);
          if (searchMatch && searchMatch[1]) {
            return executeAction('supplier_search', { query: searchMatch[1].trim() });
          }
          return executeAction('suppliers_list');
        }

        if (lowerText.includes('статистик') && lowerText.includes('закуп')) {
          return executeAction('suppliers_stats');
        }

        // ─── 🆕 КАТАЛОГ ───
        if (lowerText.match(/(?:найди|найти|поиск|где купить|цена|стоимость)\s+(.+)/i)) {
          const match = lowerText.match(/(?:найди|найти|поиск|где купить|цена|стоимость|сколько стоит)\s+(.+)/i);
          if (match && match[1]) {
            const query = match[1]
              .replace(/^(материал|товар|позицию)\s+/i, '')
              .trim();
            if (query.length >= 2) {
              return executeAction('catalog_search', { query });
            }
          }
        }
        if (lowerText.includes('каталог')) {
          return executeAction('catalog_search_prompt');
        }

        // ─── 🆕 RFQ ───
        if (lowerText.match(/rfq|запрос цен|запросы цен|тендер/i)) {
          if (lowerText.match(/созда|нов/i)) {
            return executeAction('rfq_create');
          }
          if (lowerText.match(/без ответ|висят|ожида|pending/i)) {
            return executeAction('rfq_pending');
          }
          if (lowerText.match(/предлож|оффер|offer/i)) {
            return executeAction('rfq_with_offers');
          }
          return executeAction('rfq_list');
        }

        // ─── 🆕 ЗАКАЗЫ ───
        if (lowerText.match(/заказ|purchase order/i)) {
          if (lowerText.match(/созда|нов/i)) {
            onNavigate?.('purchaseOrderCreate');
            return { content: '📦 Открываю форму создания заказа...' };
          }
          if (lowerText.match(/в работе|в пути|активн|pending/i)) {
            return executeAction('po_pending');
          }
          if (lowerText.match(/получен|доставлен|received/i)) {
            return executeAction('po_received');
          }
          return executeAction('purchase_orders_list');
        }

        // ─── ПОИСК ПО РАЗДЕЛАМ ───
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
          content: `🔍 По запросу "${text}" ничего не найдено.\n\nПопробуйте:\n• "поставщики"\n• "RFQ"\n• "заказы"\n• "найди цемент М500"\n• "создай RFQ на цемент 100 мешков"\n• "сравни предложения по RFQ #123"\n• "топ-5 поставщиков по цене"\n• "кто поставляет цемент"\n• "мои заявки"\n• "склад"`,
          actions: [
            { id: 'suppliers_list', label: '🏢 Поставщики' },
            { id: 'rfq_list', label: '📨 RFQ' },
            { id: 'purchase_orders_list', label: '📦 Заказы' },
            { id: 'help', label: '❓ Что я умею' },
          ],
        };
      }

      // ─── Actions для поставщика ───
      case 'supplier_incoming_rfq': {
        onNavigate?.('rfqList');
        return { content: '📨 Открываю входящие RFQ...' };
      }
      case 'supplier_incoming_po': {
        onNavigate?.('purchaseOrders');
        return { content: '📦 Открываю входящие заказы...' };
      }
      case 'supplier_pricelist': {
        onNavigate?.('supplierPriceList');
        return { content: '💰 Открываю мой прайс-лист...' };
      }
      case 'procurement_overview': {
        onNavigate?.('procurementDashboard');
        return { content: '📊 Открываю дашборд закупок...' };
      }

      default:
        return { content: '🤔 Не понял команду. Попробуйте ещё раз.' };
    }
  }, [
    applications, companyUsers, supabase, user,
    userCompanyId, userRole, onNavigate, availableViews,
    onCreateDraft, onOpenApplication, onOpenReceiveModal, showNotification,
    rfqCartCount, planLimits,
    loadSuppliers, loadRFQList, loadPurchaseOrders,
    hasSuppliersAccess, onAddToRFQCart,
  ]);

  const handleAction = useCallback(async (actionId, payload = null, customLabel = null) => {
    const action = (QUICK_ACTIONS[userRole] || QUICK_ACTIONS.default)
      .find(a => a.id === actionId);

    const viewInfo = ALL_VIEWS[payload?.viewId];

    const ctxAction = (CONTEXTUAL_ACTIONS[currentViewProp] || [])
      .find(a => a.id === actionId);

    setRecommendation(null);
    setShowMainMenu(false);

    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: customLabel || action?.label || ctxAction?.label || viewInfo?.label || actionId,
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
  }, [userRole, executeAction, currentViewProp]);

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

  const exportMessage = useCallback((msg) => {
    const content = `
AI-Ассистент Реглай
Дата: ${new Date(msg.timestamp).toLocaleString('ru-RU')}
Пользователь: ${user?.email || '—'}

────────────────────────────
${msg.content}
────────────────────────────
  `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reglay_assistant_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification?.('✅ Ответ сохранён', 'success');
  }, [user?.email, showNotification]);

  const speakText = useCallback((text) => {
    if (!('speechSynthesis' in window)) {
      showNotification?.('Озвучка не поддерживается браузером', 'warning');
      return;
    }

    window.speechSynthesis.cancel();

    const EMOJIS_TO_REMOVE = [
      '📋', '📦', '📥', '📤', '✅', '⏳', '🔴', '🟡', '🏭', '📊',
      '⚠️', '👥', '🏗️', '🎤', '💡', '🔍', '📍', '➡️', '❌', '🤔',
      '📭', '📄', '🆕', '🎯', '📌', '⭐', '🔊', '👁', '🕐', '🏢',
      '💰', '📨', '🚚', '🏆', '★', '⚙️', '🚫', '⚖️', '📝', '🟢',
      '🥈', '🥉',
    ];

    let cleanText = text.replace(/\*\*/g, '');
    EMOJIS_TO_REMOVE.forEach((emoji) => {
      cleanText = cleanText.split(emoji).join('');
    });

    cleanText = cleanText.trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, [showNotification]);

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
        procurement_manager: 'менеджер по закупкам',
        supplier_admin: 'администратор поставщика',
        supplier_manager: 'менеджер поставщика',
        designer: 'проектировщик',
      }[userRole] || 'пользователь';

      const supplierHint = hasSuppliersAccess
        ? '\n\n🏢 Могу помочь с **поставщиками, каталогом, RFQ и заказами**!'
        : '';

      const planLabel = currentPlan?.name ? `\n📦 Ваш тариф: **${currentPlan.name}**` : '';

      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Привет! Я ассистент Реглай.\n\nЯ вижу вас как **${roleLabel}**.${planLabel} Чем помочь?${supplierHint}\n\n💡 Выбирайте действия на вкладке "Действия" или переходите в разделы на вкладке "Разделы".`,
        timestamp: Date.now(),
      }]);
      setHasInitialized(true);
    }
  }, [isOpen, hasInitialized, userRole, hasSuppliersAccess, currentPlan]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current && !showMainMenu) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, showMainMenu]);

  // ─────────────────────────────────────────────────────────
  // 🎨 Рендер
  // ─────────────────────────────────────────────────────────
  const quickActions = QUICK_ACTIONS[userRole] || QUICK_ACTIONS.default;

  const groupedQuickActions = useMemo(() => {
    const groups = {};
    quickActions.forEach(action => {
      const group = action.group || 'quick';
      if (!groups[group]) groups[group] = [];
      groups[group].push(action);
    });
    return groups;
  }, [quickActions]);

  const contextualActions = useMemo(() => {
    return CONTEXTUAL_ACTIONS[currentViewProp] || [];
  }, [currentViewProp]);

  const groupedViews = useMemo(() => {
    const groups = {
      'Основные': [],
      'Работа с материалами': [],
      'Клиенты и проекты': [],
      'Аналитика и финансы': [],
      'Коммуникации': [],
      'Поставщики и закупки': [],
      'Управление': [],
    };

    availableViews.forEach(viewId => {
      const viewInfo = ALL_VIEWS[viewId];
      if (!viewInfo) return;

      const group = getViewGroup(viewId);
      if (groups[group]) {
        groups[group].push({ id: viewId, ...viewInfo });
      }
    });

    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
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

  return (
    <>
      {showHint && !isOpen && (
        <div
          className={`fixed top-20 right-4 lg:top-24 lg:right-24 z-[9997] ${
            hintHiding ? 'ai-fade-out' : 'ai-bounce-in'
          }`}
        >
          <div className="relative bg-gradient-to-r from-[#4A6572] to-[#344955] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-xs ai-pulse-ring">
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#344955] rotate-45" />
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ai-wiggle">
              <Sparkles className="w-5 h-5 text-[#F9AA33]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold mb-0.5">Я тут! 👋</div>
              <div className="text-xs text-white/90">
                Нажми <kbd className="px-1 py-0.5 bg-white/20 rounded text-[10px]">Ctrl+/</kbd> или иконку 🤖
              </div>
            </div>
            <button
              onClick={dismissHint}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
              aria-label="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {notifications.length > 0 && !isOpen && (
        <div className="fixed top-20 right-4 lg:top-24 lg:right-24 z-[9996] space-y-2 max-w-xs">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`ai-slide-right bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-l-4 p-3 flex items-start gap-2 ${
                notif.type === 'warning'
                  ? 'border-l-yellow-500'
                  : notif.type === 'error'
                  ? 'border-l-red-500'
                  : 'border-l-[#4A6572]'
              }`}
            >
              <div className="flex-1">
                <div className="text-xs font-medium text-gray-900 dark:text-white">
                  {notif.message}
                </div>
                {notif.action && (
                  <button
                    onClick={() => {
                      handleAction(notif.action.id);
                      setNotifications(prev => prev.filter(n => n.id !== notif.id));
                    }}
                    className="mt-1.5 text-[10px] px-2 py-1 rounded bg-[#4A6572] text-white hover:bg-[#344955] transition-colors"
                  >
                    {notif.action.label}
                  </button>
                )}
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="p-0.5 text-gray-400 hover:text-gray-600 rounded flex-shrink-0"
                aria-label="Закрыть"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div
          className="fixed top-20 right-4 lg:top-24 lg:right-8 w-[380px] max-w-[calc(100vw-2rem)] h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-[9999] border border-gray-200 dark:border-gray-700 ai-bounce-in"
          role="dialog"
          aria-label="AI-ассистент"
        >
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
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
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

          {showMainMenu ? (
            <div className="flex-1 overflow-y-auto p-3">
              {messages.length > 0 && messages[0].id === 'welcome' && (
                <div className="mb-4 p-3 bg-gradient-to-br from-[#4A6572]/5 to-[#344955]/5 rounded-xl ai-slide-up">
                  <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {renderMessageContent(messages[0])}
                  </div>
                </div>
              )}

              {recommendation && activeTab === 'actions' && (
                <div className="mb-3 p-3 bg-gradient-to-br from-[#F9AA33]/20 to-[#F57C00]/10 rounded-xl border border-[#F9AA33]/30 ai-bounce-in">
                  <div className="flex items-start gap-2">
                    <span className="text-xl flex-shrink-0">{recommendation.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-[#F57C00] dark:text-[#F9AA33] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />
                        Рекомендация
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-200 mb-2">
                        {recommendation.text}
                      </p>
                      <button
                        onClick={() => handleAction(recommendation.action.id)}
                        className="text-[10px] px-2 py-1 rounded bg-[#4A6572] text-white hover:bg-[#344955] transition-colors"
                      >
                        {recommendation.action.label}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'actions' && (
                <>
                  {contextualActions.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[10px] font-medium text-[#F9AA33] uppercase tracking-wide px-1 mb-2 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Рекомендую для этого экрана
                      </div>
                      <div className="space-y-1.5">
                        {contextualActions.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={`ctx-${action.id}`}
                              onClick={() => handleAction(action.id)}
                              disabled={isLoading}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-xl bg-gradient-to-r from-[#F9AA33]/10 to-[#F57C00]/5 hover:from-[#F9AA33]/20 hover:to-[#F57C00]/10 text-gray-700 dark:text-gray-200 transition-all disabled:opacity-50 border border-[#F9AA33]/30"
                            >
                              <div className="w-7 h-7 rounded-lg bg-[#F9AA33]/20 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-3.5 h-3.5 text-[#F57C00] dark:text-[#F9AA33]" />
                              </div>
                              <span className="flex-1 font-medium text-xs">{action.label}</span>
                              <ArrowRight className="w-3 h-3 text-[#F9AA33]" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {groupedQuickActions.quick && (
                    <>
                      <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1 mb-2">
                        Основные действия
                      </div>
                      <div className="space-y-2">
                        {groupedQuickActions.quick.map((action) => {
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
                    </>
                  )}

                  {groupedQuickActions.suppliers && (
                    <div className="mt-3">
                      <div className="text-[10px] font-medium text-[#4A6572] dark:text-[#F9AA33] uppercase tracking-wide px-1 mb-2 flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        Поставщики и закупки
                      </div>
                      <div className="space-y-2">
                        {groupedQuickActions.suppliers.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.id}
                              onClick={() => handleAction(action.id)}
                              disabled={isLoading}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left rounded-xl bg-gradient-to-r from-[#4A6572]/5 to-[#344955]/5 hover:from-[#4A6572]/10 hover:to-[#344955]/10 text-gray-700 dark:text-gray-200 transition-all disabled:opacity-50 border border-[#4A6572]/20"
                            >
                              <div className="w-8 h-8 rounded-lg bg-[#4A6572]/15 flex items-center justify-center flex-shrink-0">
                                <Icon className="w-4 h-4 text-[#4A6572] dark:text-[#F9AA33]" />
                              </div>
                              <span className="flex-1 font-medium">{action.label}</span>
                              {action.id === 'rfq_pending' && rfqCartCount > 0 && (
                                <span className="px-1.5 text-[10px] font-bold rounded-full bg-[#F9AA33] text-white">
                                  {rfqCartCount}
                                </span>
                              )}
                              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💡 <strong>Совет:</strong> Напишите <strong>"найди цемент М500"</strong> — найду лучшую цену. Или <strong>"создай RFQ на цемент 100 мешков"</strong>.
                    </p>
                  </div>
                </>
              )}

              {activeTab === 'navigation' && (
                <>
                  {pinnedViews.length > 0 && (
                    <div className="mb-3 p-2 bg-gradient-to-br from-[#F9AA33]/10 to-[#F57C00]/10 rounded-xl border border-[#F9AA33]/20">
                      <div className="text-[10px] font-semibold text-[#F57C00] dark:text-[#F9AA33] uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1">
                        <Pin className="w-3 h-3" />
                        Закреплённые ({pinnedViews.length})
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {pinnedViews.map(viewId => {
                          const view = ALL_VIEWS[viewId];
                          if (!view) return null;
                          const Icon = view.icon;
                          const badge = getBadgeCount(viewId);
                          return (
                            <div key={`pin-${viewId}`} className="relative group">
                              <button
                                onClick={() => handleAction('navigate_to', { viewId }, view.label)}
                                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg bg-white dark:bg-gray-800 hover:bg-[#4A6572]/10 text-gray-700 dark:text-gray-200 transition-all pr-6"
                              >
                                <Icon className="w-3.5 h-3.5 text-[#4A6572] dark:text-[#F9AA33] flex-shrink-0" />
                                <span className="flex-1 truncate text-left font-medium">{view.label}</span>
                                {badge > 0 && (
                                  <span className="px-1 text-[9px] font-bold rounded-full bg-[#F9AA33] text-white">
                                    {badge}
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); togglePin(viewId); }}
                                className="absolute right-0.5 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                                title="Открепить"
                              >
                                <PinOff className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1 mb-2">
                    Доступные разделы ({availableViews.length})
                  </div>

                  {groupedViews.map(({ groupName, items, count }) => (
                    <div key={groupName} className="mb-3">
                      <div className="flex items-center justify-between px-1 mb-1.5">
                        <div className={`text-[10px] font-semibold uppercase tracking-wider ${
                          groupName === 'Поставщики и закупки'
                            ? 'text-[#4A6572] dark:text-[#F9AA33]'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
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
                          const isPinned = pinnedViews.includes(view.id);
                          const isSupplier = groupName === 'Поставщики и закупки';

                          return (
                            <div key={view.id} className="relative group">
                              <button
                                onClick={() => handleAction('navigate_to', { viewId: view.id }, view.label)}
                                disabled={isLoading}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left rounded-lg transition-all disabled:opacity-50 border ${
                                  isPinned
                                    ? 'bg-[#F9AA33]/10 border-[#F9AA33]/30 hover:bg-[#F9AA33]/20'
                                    : isSupplier
                                    ? 'bg-[#4A6572]/5 border-[#4A6572]/20 hover:bg-[#4A6572]/10 text-gray-700 dark:text-gray-200'
                                    : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-[#4A6572]/10 dark:hover:bg-[#F9AA33]/10 text-gray-700 dark:text-gray-200 border-transparent hover:border-[#4A6572]/20 dark:hover:border-[#F9AA33]/20'
                                }`}
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

                              <button
                                onClick={(e) => { e.stopPropagation(); togglePin(view.id); }}
                                className={`absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded transition-all ${
                                  isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                } hover:bg-gray-200 dark:hover:bg-gray-600`}
                                title={isPinned ? 'Открепить' : 'Закрепить'}
                              >
                                {isPinned ? (
                                  <PinOff className="w-3 h-3 text-red-500" />
                                ) : (
                                  <Pin className="w-3 h-3 text-gray-400" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ai-slide-up`}
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

                    {msg.role === 'assistant' && !msg.isError && msg.id !== 'welcome' && (
                      <div className="mt-1.5 pt-1.5 border-t border-gray-300/30 dark:border-gray-600/30 flex items-center gap-1">
                        <button
                          onClick={() => speakText(msg.content)}
                          className="p-1 rounded hover:bg-white/40 dark:hover:bg-gray-600/40 transition-colors"
                          title="Озвучить"
                        >
                          <Volume2 className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => exportMessage(msg)}
                          className="p-1 rounded hover:bg-white/40 dark:hover:bg-gray-600/40 transition-colors"
                          title="Скачать"
                        >
                          <Download className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start ai-slide-up">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#4A6572]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Например: "найди цемент М500"'
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

      {showVoiceSearch && (
        <div className="fixed inset-0 bg-black/50 z-[10001] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-4 ai-bounce-in">
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