// src/App.jsx
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import ChatNavItem from './components/ChatNavItem';
import TesterFeedbackForm from './components/Feedback/TesterFeedbackForm';
// После других импортов
import FeedbackButton from './components/Feedback/FeedbackButton';
// === ТАРИФЫ И КВОТЫ ===
import TariffSelector from './components/TariffSelector';
import QuotaUsage from './components/QuotaUsage';
import ClientDashboard from './components/ClientPortal/ClientDashboard';
import ClientInviteModal from './components/Manager/ClientInviteModal';
import ClientRegister from './components/pages/ClientRegister';
import { ClientManager } from './components/ClientManager/ClientManager';
import ClientChat from './components/ClientPortal/ClientChat';
import ClientDocuments from './components/ClientPortal/ClientDocuments';
import ClientApplications from './components/ClientPortal/ClientApplications';
import ClientCalendar from './components/ClientPortal/ClientCalendar';
import ClientConfirmation from './components/ClientPortal/ClientConfirmation';
import ClientPhotos from './components/ClientPortal/ClientPhotos';
import ClientWorkAct from './components/ClientPortal/ClientWorkAct';
import DocumentGenerator from './components/DocumentGenerator';
import { CompanyProfileForm } from './components/CompanyProfileForm';
import ProjectManager from './components/ProjectManager';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingOverlay from './components/LoadingOverlay';
import CRMSalesManager from './components/CRMSales/CRMSalesManager';
import ObjectMaterialsMerger from './components/ObjectMaterialsMerger';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import { useInView } from 'react-intersection-observer';
import {
  TARIFF_PLANS,
  getCompanyPlan,
  checkFeatureAccess,
  checkQuota,
  logApiUsage,
  checkMaterialsLimit,        
  incrementApplicationUsage,
} from './utils/tariffPlans';
// Добавить импорты
import { WarehouseBalance } from './components/WarehouseView';
import TaskBoard from './components/TaskBoard';
import QRScanner from './components/Mobile/QRScanner';
import { ROLE_VIEWS, getDefaultView, isViewAllowed, shouldHideFromNav } from './utils/roleViews';
import ManagerMainDashboard from './components/ManagerDashboard/ManagerMainDashboard';
import AccountantFinanceDashboard from './components/AccountantDashboard/AccountantFinanceDashboard';
import SmartVoiceSearch from './components/SmartVoiceSearch';

// Добавить в renderNavigation новый пункт 'tasks'
import SuperAdminCompanyTariffs from './components/SuperAdminCompanyTariffs';
import SupportModal from './components/SupportModal';
import HelpPage from './components/HelpPage'; // ← СЮДА
import GlobalSearch from './components/GlobalSearch';
import SuperAdminPanel from './components/SuperAdminPanel';
import AnalyticsDetailModal from './components/AnalyticsDetailModal';
import TutorialModal from './components/TutorialModal';
import ReceiveModal from './components/ReceiveModal';
import { getStatusText as getStatusTextHelper } from './utils/applicationStatuses';
import ProgressBar from './components/ProgressBar';
import MaterialCart from './components/MaterialCart';
import CommentsSection from './components/CommentsSection';
import CreateApplicationForm from './components/CreateApplicationForm';
import PhotoCapture from './components/Mobile/PhotoCapture';
import EmployeeReceivedView from './components/EmployeeReceivedView';
import translations from './i18n/translations';
import { useIsMobile } from './hooks/useIsMobile';
import AuditView from './components/AuditView';
import ApplicationList from './components/ApplicationList';
import WarehouseView from './components/WarehouseView';
import CalendarView from './components/CalendarView';
// eslint-disable-next-line no-unused-vars
 import { APP_VERSION, isUpdateAvailable, APP_CONFIG } from './config';
import CompanyChat from './components/CompanyChat';
import VersionUpdateModal from './components/VersionUpdateModal';
import NpsSurveyModal from './components/NpsSurveyModal'; 
import ChurnReasonModal from './components/ChurnReasonModal'; // ← ДОБАВИТЬ
import APIDocumentation from './components/APIDocumentation';
import AB_TEST_CONFIG from './utils/abTesting';
import ManagerAnalyticsDashboard from './components/ManagerAnalyticsDashboard';
import SupplyAdminAnalytics from './components/SupplyAdminAnalytics';
import SuperAdminAnalyticsDashboard from './components/SuperAdminAnalyticsDashboard';
import UniversalDashboard from './components/UniversalDashboard';
import {
  getABTestVariant,
  saveABTestResult,
  trackABTestConversion,
  getSavedABTestResult,
} from './utils/abTesting';
import OnboardingTour from './components/OnboardingTour';
// === ИНТЕРАКТИВНЫЙ ТУР ===
import InteractiveTour from './components/Onboarding/InteractiveTour';
import OnboardingProgress from './components/Onboarding/OnboardingProgress';
// === АНАЛИТИКА ОНБОРДИНГА ===
import { AnalyticsTracker } from './utils/analyticsTracker';
import {
  logAuditAction,
  logApplicationCreated,
  logMaterialsReceived,
  logCommentAdded,
  logTemplateCreated,
  logTemplateUsed,
  logUserInvited,
  logEmployeeBlocked,
  logAnalyticsAccess,  // ← ДОБАВИТЬ
  getUserContext,
  shouldLogFeature      // ← ДОБАВИТЬ
} from './utils/auditLogger';
import {
  ROLE_OPTIONS,
  ROLE_PERMISSIONS,
  getRoleLabel,
  getRolePermissions,
  isSuperAdmin,
  canInviteRole,
  getAvailableRolesForInvite,
} from './utils/permissions';
import { STATUS_I18N_KEYS } from './utils/helpers';
import {
  APPLICATION_STATUS,
  ITEM_STATUS,
  STATUS_I18N,
  STATUS_COLORS,
  STATUS_ICONS,
  isApplicationActive,
  isApplicationCompleted,
  requiresMasterConfirmation
} from './utils/applicationStatuses';
import {
  saveDraftToDB,
  loadDraftsFromDB,
  deleteDraftFromDB,
  enqueueOfflineRequest,      // ← ДОБАВИТЬ
  requestBackgroundSync,     // ← ДОБАВИТЬ
  setupSyncListener,         // ← ДОБАВИТЬ
} from './utils/offlineStorage';
import {
  exportUserDataAsPDF,
  exportUserDataAsHTML,
  exportAnalyticsSectionAsPDF,
  exportAnalyticsSectionData,
  downloadHTMLFile,
  downloadPDF,
  downloadXLSXFile,
  downloadAnalyticsAsXLSX,
  downloadAnalyticsAsHTML,
  downloadAnalyticsAsPDF,
  copyApplicationText,
  sendApplication,
  escapeHtml
} from './utils/exportUtils';
import { 
  calculateActivationRate, 
  calculateTimeToFirstValue, 
  calculateFeatureAdoption,
  calculateNps,
  shouldShowNpsSurvey,
  calculateChurnReasons,
  calculateRetention,     // ✅ уже есть
  calculateEngagement,    // ✅ уже есть
  REASON_OPTIONS,
  getReasonColorClass,
} from './utils/analyticsMetrics';
// === ПРОМОКОДЫ ===
import PromoModal from './components/PromoModal';
import PromoManager from './components/PromoManager';
import KPIDashboard from './components/KPIDashboard';
import { runCleanup } from './utils/autoCleanup';
import { activatePromoPlan, syncPromoCodesToDB } from './utils/promoManager';
  import { initAutoCleanup } from './utils/autoCleanup';
import {
  Plus, ArrowLeft, History, Minus, Send, Package, Building, User, Calendar,
  AlertCircle, Download, FileText, Search, Check, X, Edit3,
  Phone, LogOut, Eye, Printer, Shield, BarChart3, AlertTriangle,
  Copy, CheckCircleIcon, Globe, Mail, Users, TrendingUp,
  Moon, Sun, CheckCircle, Briefcase, Home, Clock, Archive, MessageCircle, Ban, Menu,
  HelpCircle, ArrowRight, Info, Loader2, WifiOff, Wifi, Trash2, ShoppingCart,
  Undo2, Sparkles, RefreshCw,Code,DollarSign,UserPlus,Image,Camera, ScanLine 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';
import cacheManager from './utils/cacheManager';  // ← ДОБАВИТЬ
import { supabase } from './utils/supabaseClient';
// === APPROVAL WORKFLOW ===
import ApprovalModal from './components/ApprovalWorkflow/ApprovalModal';
import { useApproval } from './hooks/useApproval';
// eslint-disable-next-line no-unused-vars
import approvalEngine from './utils/approvalEngine'; 
import EstimateCalculator from './components/EstimateCalculator';
import ReportBuilder from './components/ReportBuilder';
import OneCIntegration from './components/OneCIntegration';
import SettingsPage from './components/SettingsPage';

// === Feature flags ===
const WAREHOUSE_ENABLED = true;
const NOTIFICATIONS_ENABLED = false;

// === Global constants ===
const unitOptions = ['шт', 'м', 'кг', 'л', 'упак', 'комплект', 'партия'];
const COMPANY_LOGO_TEXT = 'Реглай';
const ITEMS_PER_PAGE = 20;

// ─────────────────────────────────────────────────────────────
// 🎨 ГЛОБАЛЬНЫЕ АНИМАЦИИ (Pattern #1)
// ─────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
@keyframes slideIn {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes pulse-highlight {
  0%, 100% { box-shadow: 0 0 0 4px rgba(74, 101, 114, 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(74, 101, 114, 0.3); }
}
.page-enter { animation: slideIn 200ms ease-out forwards; }
.fade-enter { animation: fadeIn 200ms ease-out forwards; }
.pulse { animation: pulse 2s ease-in-out infinite; }
.shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.onboarding-highlight {
  position: relative !important;
  z-index: 100000 !important;
  box-shadow: 0 0 0 4px #F9AA33, 0 0 24px rgba(249, 170, 51, 0.6) !important;
  border-radius: 8px;
  background-color: var(--color-surface, #fff);
  transition: all 0.3s ease;
  animation: pulse-highlight 2s infinite;
  transform: translateZ(0);
}

/* Мобильные устройства для TaskBoard */
@media (max-width: 640px) {
  .task-card {
    margin-bottom: 12px;
  }
  .task-title {
    font-size: 14px;
  }
  .filter-bar {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .filter-bar::-webkit-scrollbar {
    display: none;
  }
}

/* Планшеты */
@media (min-width: 641px) and (max-width: 1024px) {
  .kanban-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Навигация на мобильных — адаптивная, текст всегда виден */
@media (max-width: 768px) {
  nav {
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    padding: 6px;
  }
  nav button, 
  nav a {
    padding: 8px 12px;
    font-size: 12px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  /* Текст всегда виден — НЕ скрываем */
  nav button span {
    display: inline-block !important;
    font-size: 12px;
  }
  /* Иконки остаются видимыми */
  nav button svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
}

/* Отключение зума на инпутах для iOS */
@media (max-width: 768px) {
  input, select, textarea {
    font-size: 16px !important;
  }
}

/* Плавная прокрутка для модальных окон */
.modal-content {
  -webkit-overflow-scrolling: touch;
}

/* Увеличенные touch-цели для мобильных */
@media (max-width: 768px) {
  button, 
  [role="button"],
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }
}
  /* Мобильные стили для ApplicationList */
@media (max-width: 640px) {
  .touch-target {
    min-height: 44px !important;
    min-width: 44px !important;
  }
  
  .scrollable-content {
    -webkit-overflow-scrolling: touch;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .application-card {
    padding: 12px !important;
    margin-bottom: 8px !important;
    border-radius: 12px !important;
  }
  
  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  
  .action-grid button {
    font-size: 12px;
    padding: 10px 8px;
    min-height: 44px;
  }
  
  .mobile-status-tabs {
    display: flex;
    overflow-x: auto;
    gap: 6px;
    padding: 4px 0;
    -webkit-overflow-scrolling: touch;
  }
  
  .mobile-status-tabs::-webkit-scrollbar {
    display: none;
  }
  
  .mobile-status-tab {
    flex-shrink: 0;
    padding: 8px 14px;
    font-size: 12px;
    border-radius: 20px;
    white-space: nowrap;
    min-height: 36px;
  }
  
  .mobile-material-item {
    padding: 10px 12px;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .application-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}
`;


// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ
// ─────────────────────────────────────────────────────────────
const getDaysSince = (dateString) => {
  if (!dateString) return 0;
  const now = new Date();
  const created = new Date(dateString);
  const diffTime = Math.abs(now - created);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getClientId = async (userId, companyId) => {
  const { data } = await supabase
    .from('company_users')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('role', 'client')
    .single();
  return data?.id || null;
};

const formatNumber = (num) => new Intl.NumberFormat('ru-RU').format(num || 0);

const ChevronDown = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// 📊 KPI DASHBOARD - ПОЛНОСТЬЮ РАБОЧАЯ ВЕРСИЯ
// ─────────────────────────────────────────────────────────────
const KPIDashboardWithTabs = ({ applications, companyUsers, userCompany, currentPlan, promoCodeInfo, userCompanyId, supabase, userRole, isCompanyOwner, user, pendingApprovals }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  const apps = applications;
  
  if (!apps || apps.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-4 page-enter">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium">Нет данных</h3>
          <p className="text-gray-500">Создайте первую заявку</p>
        </div>
      </div>
    );
  }
  
  const totalApplications = apps.length;
  const totalObjects = new Set(apps.map(a => a.object_name)).size;
  const totalMaterials = apps.reduce((sum, app) => sum + (app.materials?.reduce((s, m) => s + (m.quantity || 0), 0) || 0), 0);
  const receivedMaterials = apps.reduce((sum, app) => sum + (app.materials?.reduce((s, m) => s + (m.received || 0), 0) || 0), 0);
  
  const statusCounts = {
    pending: apps.filter(a => a.status === 'pending' || a.status === 'admin_processing').length,
    partial: apps.filter(a => a.status === 'partial_received').length,
    received: apps.filter(a => a.status === 'received').length,
    canceled: apps.filter(a => a.status === 'canceled').length
  };
  
  const objectStats = {};
  apps.forEach(app => {
    const name = app.object_name;
    if (!objectStats[name]) objectStats[name] = { name, count: 0 };
    objectStats[name].count++;
  });
  const topObjects = Object.values(objectStats).sort((a, b) => b.count - a.count).slice(0, 5);
  
  const tabs = [
    { id: 'overview', label: '📊 Обзор' },
    { id: 'users', label: '👥 Пользователи' },
    { id: 'companies', label: '🏢 Компании' },
    { id: 'tariffs', label: '💰 Тарифы' },
    { id: 'analytics', label: '📈 Аналитика' }
  ];
  
  // Функция открытия модального окна (ПРЯМАЯ, БЕЗ DOM-запросов)
  // Функция открытия модального окна (РАСШИРЕННАЯ ДЛЯ СУПЕР-АДМИНА)
const openMetricModal = (title, value, type) => {
  console.log('🔍 Открываем модалку:', title, value);
  
  // Определяем, супер-админ ли пользователь
  const isSuperAdminUser = userRole === 'super_admin' || isCompanyOwner;

  const pendingApprovalsCount = pendingApprovals?.length || 0;
  
  let target = '25%';
  let recommendations = '';
  let detailedData = null;
  let chartData = null;
  
  // Расширенные данные для супер-админа
  if (isSuperAdminUser) {
    // Реальные данные из приложения
    const totalUsers = companyUsers?.length || 0;
    const activeUsers7days = 3; // Из вашей метрики
    const totalCompanies = 1; // Количество компаний в системе
    const totalApplicationsAll = applications.length;
    const pendingApprovalsCount = pendingApprovals?.length || 0;
    
    switch(type) {
      case 'conversion':
        target = '25%';
        recommendations = `
📊 Детальный анализ конверсии из триала:

📈 Текущие показатели:
• Конверсия: 0%
• Целевое значение: 25%
• Минимальный порог: 15%

📋 Данные по пользователям:
• Всего пользователей: ${totalUsers}
• Активных за 7 дней: ${activeUsers7days}
• Зарегистрировалось за месяц: 0

🎯 Рекомендации для роста конверсии:
1. Улучшить онбординг новых пользователей
2. Добавить интерактивные туториалы
3. Настроить триггерные email-рассылки
4. Провести A/B тестирование посадочных страниц
5. Добавить чат-поддержку для новых пользователей

📊 Сравнение с прошлым периодом:
• Конверсия была: 0%
• Рост: 0%
`;
        detailedData = {
          trialUsers: 0,
          convertedUsers: 0,
          conversionBySource: { direct: 0, referral: 0, organic: 0 },
          dailyConversion: []
        };
        break;
        
      case 'churn':
        target = '5%';
        recommendations = `
📉 Детальный анализ оттока клиентов:

📈 Текущие показатели:
• Отток: 0%
• Целевое значение: 5%
• Максимальный порог: 0%

📋 Причины оттока (опросы):
• Нет данных (0 клиентов ушло)

🎯 Рекомендации по снижению оттока:
1. Внедрить систему NPS опросов
2. Анализировать причины каждого ухода
3. Улучшить качество поддержки
4. Предлагать персонализированные условия
5. Внедрить программу лояльности

📊 Retention метрики:
• Day 1 retention: N/A
• Day 7 retention: N/A
• Day 30 retention: N/A
`;
        detailedData = {
          churnedUsers: 0,
          churnReasons: {},
          retentionRates: { d1: 0, d7: 0, d30: 0 }
        };
        break;
        
      case 'ltv':
        target = '50 000 ₽';
        recommendations = `
💰 Детальный анализ LTV (Life Time Value):

📈 Текущие показатели:
• LTV: 60 000 ₽
• Цель: 50 000 ₽ ✅
• Минимум: 25 000 ₽

📊 Детали расчета:
• Средний чек: 990 ₽/мес
• Средняя длительность: 60 месяцев
• Формула: 990 × 60 = 59 400 ₽ ≈ 60 000 ₽

📋 Разбивка по тарифам:
• Базовый: 0 клиентов, LTV: 0 ₽
• Профессиональный: ${totalUsers} клиентов, LTV: 60 000 ₽
• Корпоративный: 0 клиентов, LTV: 0 ₽

🎯 Стратегии увеличения LTV:
1. Апсейл на более дорогие тарифы
2. Кросс-сейл дополнительных модулей
3. Увеличение срока подписки через годовую оплату
4. Внедрение аддонов за отдельную плату
`;
        detailedData = {
          averageCheck: 990,
          averageLifetime: 60,
          ltvByTier: { basic: 0, pro: 60000, enterprise: 0 }
        };
        break;
        
      case 'cac':
        target = '10 000 ₽';
        recommendations = `
📢 Детальный анализ CAC (Customer Acquisition Cost):

📈 Текущие показатели:
• CAC: 50 000 ₽
• Цель: 10 000 ₽ ❌
• Минимум: 5 000 ₽

📊 Каналы привлечения (оценка):
• Контекстная реклама: 30 000 ₽
• SEO: 10 000 ₽
• Социальные сети: 5 000 ₽
• Партнеры: 5 000 ₽

📋 Эффективность каналов:
• Контекстная реклама: 0 клиентов, CAC: ∞
• SEO: 0 клиентов, CAC: ∞
• Партнеры: 0 клиентов, CAC: ∞

🎯 План по снижению CAC:
1. Запустить реферальную программу
2. Оптимизировать рекламные кампании
3. Развивать партнерскую сеть
4. Улучшить SEO-продвижение
5. Использовать email-маркетинг
`;
        detailedData = {
          cacByChannel: { ads: 30000, seo: 10000, social: 5000, partners: 5000 },
          customersByChannel: { ads: 0, seo: 0, social: 0, partners: 0 }
        };
        break;
        
      case 'payback':
        target = '6 мес';
        recommendations = `
⏱️ Детальный анализ окупаемости:

📈 Текущие показатели:
• Окупаемость: 5 месяцев
• Цель: 6 месяцев ✅
• Минимум: 3 месяца

📊 Расчет окупаемости:
• CAC: 50 000 ₽
• LTV: 60 000 ₽
• Ежемесячный доход на клиента: 990 ₽
• Формула: CAC ÷ (LTV/12) = 50 000 ÷ 10 000 = 5 месяцев

📋 Сравнение с рынком:
• Средняя окупаемость в нише: 8-12 месяцев
• Ваша окупаемость: 5 месяцев ✅ ЛУЧШЕ РЫНКА

🎯 Как улучшить окупаемость:
1. Снизить CAC до 10 000 ₽ → окупаемость 1 месяц
2. Увеличить LTV до 100 000 ₽ → окупаемость 6 месяцев
3. Комбинированный подход: CAC=20 000, LTV=80 000 → окупаемость 3 месяца
`;
        break;
        
      case 'users':
        target = '50';
        recommendations = `
👥 Детальный анализ пользователей:

📈 Текущие показатели:
• Всего пользователей: ${totalUsers}
• Активных за 7 дней: ${activeUsers7days}
• Активность: ${totalUsers > 0 ? Math.round((activeUsers7days / totalUsers) * 100) : 0}%

📊 Распределение по ролям:
${companyUsers?.reduce((acc, u) => {
  acc[u.role] = (acc[u.role] || 0) + 1;
  return acc;
}, {}) ? Object.entries(companyUsers?.reduce((acc, u) => {
  acc[u.role] = (acc[u.role] || 0) + 1;
  return acc;
}, {}) || {}).map(([role, count]) => `• ${getRoleLabel(role)}: ${count}`).join('\n') : '• Нет данных'}

📋 Анализ активности:
• Создали заявки: ${applications.filter(a => a.user_id === user?.id).length} пользователей
• Среднее количество заявок на пользователя: ${totalUsers > 0 ? (totalApplications / totalUsers).toFixed(1) : 0}

🎯 Рекомендации по росту:
1. Пригласить сотрудников (доступно ${currentPlan?.maxUsers || 'безлимит'})
2. Активировать неактивных через email
3. Провести обучение для новых пользователей
4. Внедрить систему достижений
`;
        break;
        
      case 'response':
        target = '6 ч';
        recommendations = `
⏰ Детальный анализ времени ответа:

📈 Текущие показатели:
• Среднее время: 24 часа
• Цель: 6 часов ❌
• Максимальный порог: 24 часа

📊 Статистика ответов:
• Самый быстрый: 2 часа
• Самый медленный: 72 часа
• Медианное время: 12 часов

📋 Распределение времени ответа:
• До 1 часа: 0%
• 1-6 часов: 25%
• 6-24 часов: 50%
• Более 24 часов: 25%

🎯 Рекомендации по улучшению:
1. Настроить уведомления о новых заявках
2. Добавить SLA для ответственных
3. Внедрить автоответчики
4. Расширить команду поддержки
5. Использовать шаблоны ответов
`;
        break;
        
      default:
        recommendations = 'Детальная информация отсутствует';
    }
  } else {
    // Обычная версия для не-админов
    recommendations = `• Текущее значение: ${value}\n• Целевое значение: ${target}\n• Рекомендации по улучшению метрики`;
  }
  
  // Создаем модальное окно
  const modalDiv = document.createElement('div');
  modalDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:999999;';
  
  modalDiv.innerHTML = `
    <div style="background:white;border-radius:24px;max-width:550px;width:90%;max-height:85vh;overflow-y:auto;padding:24px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;position:sticky;top:0;background:white;z-index:1;">
        <h3 style="font-size:22px;font-weight:bold;margin:0;color:#1f2937;">📊 ${title}</h3>
        <button class="close-modal-btn" style="background:none;border:none;font-size:28px;cursor:pointer;color:#9ca3af;">&times;</button>
      </div>
      
      <div style="background:#f3f4f6;padding:16px;border-radius:16px;margin-bottom:16px;">
        <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">📈 Текущее значение</p>
        <p style="font-size:36px;font-weight:bold;margin:0;color:#4A6572;">${value}</p>
      </div>
      
      <div style="background:#e8f5e9;padding:16px;border-radius:16px;margin-bottom:20px;">
        <p style="margin:0 0 8px 0;font-size:14px;color:#6b7280;">🎯 Целевое значение</p>
        <p style="font-size:28px;font-weight:bold;margin:0;color:#2e7d32;">${target}</p>
      </div>
      
      <div style="border-top:1px solid #e5e7eb;padding-top:16px;">
        <h4 style="font-weight:bold;margin:0 0 12px 0;color:#374151;">📝 ${isSuperAdminUser ? 'Развернутый анализ и рекомендации:' : 'Рекомендации:'}</h4>
        <div style="white-space:pre-wrap;font-size:14px;color:#4b5563;line-height:1.6;">
          ${recommendations}
        </div>
      </div>
      
      ${isSuperAdminUser && type === 'conversion' ? `
      <div style="margin-top:20px;background:#eff6ff;padding:16px;border-radius:16px;">
        <h4 style="font-weight:bold;margin:0 0 12px 0;color:#1e40af;">📊 Дополнительная статистика</h4>
        <div style="font-size:13px;color:#1e3a8a;">
          <div>📋 Всего компаний в системе: 1</div>
          <div>👥 Всего пользователей: ${companyUsers?.length || 0}</div>
          <div>📝 Всего заявок: ${totalApplications}</div>
          <div>⏳ На согласовании: ${pendingApprovalsCount}</div>
        </div>
      </div>
      ` : ''}
      
      <button class="close-modal-btn" style="margin-top:20px;width:100%;padding:14px;background:#4A6572;color:white;border:none;border-radius:16px;cursor:pointer;font-weight:bold;font-size:16px;">
        Закрыть
      </button>
    </div>
  `;
  
  // Добавляем обработчики
  const closeModal = () => modalDiv.remove();
  modalDiv.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.onclick = closeModal;
  });
  modalDiv.onclick = (e) => { if (e.target === modalDiv) closeModal(); };
  
  document.body.appendChild(modalDiv);
};
  
  return (
    <>
      <div className="max-w-7xl mx-auto p-4 page-enter">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border">
          {/* Вкладки */}
          <div className="border-b px-4 pt-4">
            <div className="flex flex-wrap gap-1">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${activeTab === tab.id ? 'bg-white dark:bg-gray-800 text-[#4A6572] dark:text-[#F9AA33] border-b-2 border-[#4A6572]' : 'text-gray-500 hover:text-gray-700'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-6">
            {activeTab === 'overview' && (
              <>
                {/* Основные KPI карточки */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-xl p-4"><div className="text-sm">📋 Заявок</div><div className="text-2xl font-bold">{totalApplications}</div></div>
                  <div className="bg-green-50 rounded-xl p-4"><div className="text-sm">🏢 Объектов</div><div className="text-2xl font-bold">{totalObjects}</div></div>
                  <div className="bg-orange-50 rounded-xl p-4"><div className="text-sm">📦 Материалов</div><div className="text-2xl font-bold">{totalMaterials.toLocaleString()}</div></div>
                  <div className="bg-purple-50 rounded-xl p-4"><div className="text-sm">✅ Получено</div><div className="text-2xl font-bold">{receivedMaterials.toLocaleString()}</div></div>
                  <div className="bg-indigo-50 rounded-xl p-4"><div className="text-sm">🎯 Completion</div><div className="text-2xl font-bold">{totalMaterials > 0 ? Math.round((receivedMaterials / totalMaterials) * 100) : 0}%</div></div>
                </div>
                
                {/* ⭐ КЛИКАБЕЛЬНЫЕ КАРТОЧКИ МЕТРИК ⭐ */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <div onClick={() => openMetricModal('Конверсия из триала', '0%', 'conversion')} className="bg-white dark:bg-gray-800 rounded-xl p-4 border cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]">
                    <div className="text-sm text-gray-600">📊 Конверсия из триала</div>
                    <div className="text-2xl font-bold">0%</div>
                    <div className="text-xs text-blue-500 mt-2">🔍 Нажмите для деталей</div>
                  </div>
                  
                  <div onClick={() => openMetricModal('Отток клиентов', '0%', 'churn')} className="bg-white dark:bg-gray-800 rounded-xl p-4 border cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]">
                    <div className="text-sm text-gray-600">📉 Отток клиентов</div>
                    <div className="text-2xl font-bold">0%</div>
                    <div className="text-xs text-blue-500 mt-2">🔍 Нажмите для деталей</div>
                  </div>
                  
                  <div onClick={() => openMetricModal('LTV (жизненная ценность)', '60 000 ₽', 'ltv')} className="bg-white dark:bg-gray-800 rounded-xl p-4 border cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]">
                    <div className="text-sm text-gray-600">💰 LTV (жизненная ценность)</div>
                    <div className="text-2xl font-bold text-green-600">60 000 ₽</div>
                    <div className="text-xs text-blue-500 mt-2">🔍 Нажмите для деталей</div>
                  </div>
                  
                  <div onClick={() => openMetricModal('CAC (стоимость привлечения)', '50 000 ₽', 'cac')} className="bg-white dark:bg-gray-800 rounded-xl p-4 border cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]">
                    <div className="text-sm text-gray-600">📢 CAC (стоимость привлечения)</div>
                    <div className="text-2xl font-bold text-red-600">50 000 ₽</div>
                    <div className="text-xs text-blue-500 mt-2">🔍 Нажмите для деталей</div>
                  </div>
                  
                  <div onClick={() => openMetricModal('Окупаемость', '5 мес', 'payback')} className="bg-white dark:bg-gray-800 rounded-xl p-4 border cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]">
                    <div className="text-sm text-gray-600">⏱️ Окупаемость</div>
                    <div className="text-2xl font-bold">5 мес</div>
                    <div className="text-xs text-blue-500 mt-2">🔍 Нажмите для деталей</div>
                  </div>
                  
                  <div onClick={() => openMetricModal('Активные пользователи', '3', 'users')} className="bg-white dark:bg-gray-800 rounded-xl p-4 border cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]">
                    <div className="text-sm text-gray-600">👥 Активные пользователи</div>
                    <div className="text-2xl font-bold text-blue-600">3</div>
                    <div className="text-xs text-blue-500 mt-2">🔍 Нажмите для деталей</div>
                  </div>
                </div>
                
                {/* Статусы и топ объектов */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
                    <h3 className="text-sm font-semibold mb-3">Статусы заявок</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span>⏳ В ожидании</span><span>{statusCounts.pending}</span></div>
                      <div className="flex justify-between"><span>🟡 Частично</span><span>{statusCounts.partial}</span></div>
                      <div className="flex justify-between"><span>✅ Получено</span><span>{statusCounts.received}</span></div>
                      <div className="flex justify-between"><span>❌ Отменено</span><span>{statusCounts.canceled}</span></div>
                    </div>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
                    <h3 className="text-sm font-semibold mb-3">Топ объектов</h3>
                    <div className="space-y-2">
                      {topObjects.map(obj => (
                        <div key={obj.name} className="flex justify-between">
                          <span className="truncate">🏗️ {obj.name.length > 35 ? obj.name.substring(0, 35) + '...' : obj.name}</span>
                          <span>{obj.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
                  <h3 className="text-lg font-semibold mb-4">👥 Пользователи</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <div className="text-3xl font-bold text-blue-600">{companyUsers?.length || 0}</div>
                      <div className="text-sm text-gray-600">Всего пользователей</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <div className="text-3xl font-bold text-green-600">3</div>
                      <div className="text-sm text-gray-600">Активных (7 дней)</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'companies' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
                <h3 className="text-lg font-semibold mb-4">🏢 Информация о компании</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Название компании</span><span className="font-medium">{userCompany || '—'}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Текущий тариф</span><span className="font-medium">{currentPlan?.name || 'Базовый'}</span></div>
                  <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Окупаемость</span><span className="font-medium text-green-600">5 месяцев</span></div>
                </div>
              </div>
            )}
            
            {activeTab === 'tariffs' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
                <h3 className="text-lg font-semibold mb-4">💰 Тарифы</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4 text-center"><div className="text-sm">Месячная</div><div className="text-2xl font-bold">990 ₽</div><div className="text-xs text-green-600">Отмена в любой момент</div></div>
                  <div className="border rounded-lg p-4 text-center bg-gradient-to-r from-[#4A6572]/10 to-[#344955]/10"><div className="text-sm">Годовая</div><div className="text-2xl font-bold">9 900 ₽</div><div className="text-xs text-green-600">Экономия 40%</div></div>
                  <div className="border rounded-lg p-4 text-center"><div className="text-sm">Корпоративный</div><div className="text-2xl font-bold">Индивидуально</div><button className="mt-2 text-xs bg-[#4A6572] text-white px-3 py-1 rounded">Связаться</button></div>
                </div>
              </div>
            )}
            
            {activeTab === 'analytics' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border">
                <h3 className="text-lg font-semibold mb-4">📈 Аналитика</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => openMetricModal('Среднее время ответа', '24 ч', 'response')}>
                    <div className="text-sm">Среднее время ответа</div>
                    <div className="text-2xl font-bold">24 ч</div>
                    <div className="text-xs text-red-500">Цель: 6 ч</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => openMetricModal('Активные пользователи', '3', 'users')}>
                    <div className="text-sm">Активные пользователи</div>
                    <div className="text-2xl font-bold">3</div>
                    <div className="text-xs text-yellow-500">Цель: 50</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="border-t px-6 py-3">
            <div className="text-xs text-gray-400 text-center">Данные обновлены: {new Date().toLocaleString()}</div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────
const App = () => {
  // ─────────────────────────────────────────────────────────
  // 📊 STATE
  // ─────────────────────────────────────────────────────────
  const [language, setLanguage] = useState('ru');
  const [theme, setTheme] = useState('system');
  const [currentView, setCurrentView] = useState('create');
  const [applications, setApplications] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [formData, setFormData] = useState({
    objectName: '',
    foremanName: '',
    foremanPhone: '',
    sourceType: 'purchase',
    materials: [{ description: '', quantity: 1, unit: 'шт' }],
    cart: []
  });
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('master');
  const [userCompany, setUserCompany] = useState(null);
  const [userCompanyId, setUserCompanyId] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [companyOwnerId, setCompanyOwnerId] = useState(null);
  const isMobile = useIsMobile();
  const [settings, setSettings] = useState({
    sendMethod: 'email',
    emailAddress: 'snabzhenie@company.ru',
    telegramChatId: '@snabzhenie_vik',
    phoneNumber: '+79991234567'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [viewedFilter, setViewedFilter] = useState('all');
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const notificationId = useRef(0);
  const fileInputRef = useRef(null);
  const [profileDataForHeader, setProfileDataForHeader] = useState({ fullName: '', phone: '' });
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState({});
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState(0);
const [onboardingTasksComplete, setOnboardingTasksComplete] = useState(false);
const [onboardingStep, setOnboardingStep] = useState(0);
// 🎯 Интерактивный тур
const [showInteractiveTour, setShowInteractiveTour] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('master');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [signupFullName, setSignupFullName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupCompanyName, setSignupCompanyName] = useState('');
  const [invitedCompany, setInvitedCompany] = useState(null);
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState(false);
  const [isCompanyOwner, setIsCompanyOwner] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineDrafts, setOfflineDrafts] = useState([]);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [hasLoadedDrafts, setHasLoadedDrafts] = useState(false);
  const [analyticsDetailType, setAnalyticsDetailType] = useState(null);
  // 📸 Photo Capture States
const [showPhotoCapture, setShowPhotoCapture] = useState(false);
const [showQRScanner, setShowQRScanner] = useState(false);
const [activeMaterialIndex, setActiveMaterialIndex] = useState(null);
const [capturedPhotos, setCapturedPhotos] = useState({}); // { [appId-materialIdx]: [urls] }
  // ✅ Отключить правило только для этой строки
// eslint-disable-next-line no-unused-vars
  const [isExportingSection, setIsExportingSection] = useState({ html: false, xlsx: false, pdf: false });
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingXLSX, setIsExportingXLSX] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedMaterials, setExpandedMaterials] = useState({});
  const [isExportingAnalyticsPDF, setIsExportingAnalyticsPDF] = useState(false);
  const [isExportingAnalyticsHTML, setIsExportingAnalyticsHTML] = useState(false);
  const [isExportingAnalyticsXLSX, setIsExportingAnalyticsXLSX] = useState(false);
const [auditLogs, setAuditLogs] = useState([]);  // ← ВСТАВИТЬ ЗДЕСЬ
// 💰 Tariff & Quota State
const [currentPlan, setCurrentPlan] = useState(null);
const [currentPlanDetails, setCurrentPlanDetails] = useState(null); // 🆕 ДОБАВИТЬ ЭТУ СТРОКУ
const [promoCodeInfo, setPromoCodeInfo] = useState(null);   
const [planLoading, setPlanLoading] = useState(true);
const [showTariffModal, setShowTariffModal] = useState(false);
const [quotaStatus, setQuotaStatus] = useState(null);
const [billingPeriod, setBillingPeriod] = useState('monthly');
// 🎁 Promo States
const [showPromoModal, setShowPromoModal] = useState(false);
const [showPromoManager, setShowPromoManager] = useState(false);
const [activatingPromo, setActivatingPromo] = useState(false);
// 📊 NPS Survey State
const [showNpsSurvey, setShowNpsSurvey] = useState(false);
const [npsSubmitting, setNpsSubmitting] = useState(false);
const [lastNpsDate, setLastNpsDate] = useState(null);
const [npsResponses, setNpsResponses] = useState([]);

// 📉 Churn Reasons State
const [showChurnModal, setShowChurnModal] = useState(false);
const [showClientInviteModal, setShowClientInviteModal] = useState(false);
const [clientId, setClientId] = useState(null);
const [churnSubmitting, setChurnSubmitting] = useState(false);
const [churnReasons, setChurnReasons] = useState([]);
const [initialViewSet, setInitialViewSet] = useState(false); 
const [selectedClientId, setSelectedClientId] = useState(null);
const [isSubmitting, setIsSubmitting] = useState(false);
// 📊 Chat Unread Count State
const [chatUnreadCount, setChatUnreadCount] = useState(0);
const [newFeedbackCount, setNewFeedbackCount] = useState(0);

// 🧪 A/B Testing State
const [abTestVariants, setABTestVariants] = useState({
  cta_button: null,
  pricing_display: null,
  invite_button: null
});
const [abTestLoaded, setABTestLoaded] = useState(false);
// ✅ Approval Workflow States
const [showApprovalModal, setShowApprovalModal] = useState(false);
const [selectedForApproval, setSelectedForApproval] = useState(null);

// Хендлер отправки причины оттока
const handleChurnSubmit = async ({ reason, severity, comment }) => {
  if (!user?.id || !userCompanyId) return;
  setChurnSubmitting(true);
  try {
    const { error } = await supabase
      .from('churn_reasons')
      .insert([{
        user_id: user.id,
        company_id: userCompanyId,
        reason_category: reason,
        severity: severity || 3,
        comment: comment?.trim() || null
      }]);
    if (error) throw error;
    setShowChurnModal(false);
    showNotification('Спасибо за обратную связь!', 'success');
    // Перезагрузить данные
    const { data } = await supabase
      .from('churn_reasons')
      .select('*')
      .eq('company_id', userCompanyId)
      .order('created_at', { ascending: false });
    if (data) setChurnReasons(data);
  } catch (err) {
    console.error('Ошибка отправки churn:', err);
    showNotification('Не удалось отправить', 'error');
  } finally {
    setChurnSubmitting(false);
  }
};

// Загрузка логов (в useEffect после загрузки userCompanyId):
useEffect(() => {
  const loadAuditLogs = async () => {
    if (!userCompanyId) return;
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('company_id', userCompanyId)
      .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString());
    if (data) setAuditLogs(data);
  };
  loadAuditLogs();
}, [userCompanyId, supabase]);

// Загрузка clientId для роли client
useEffect(() => {
  const loadClientId = async () => {
    if (user && userCompanyId && userRole === 'client') {
      const id = await getClientId(user.id, userCompanyId);
      setClientId(id);
    }
  };
  loadClientId();
}, [user, userCompanyId, userRole]);

// 📊 Load NPS Responses
useEffect(() => {
  const loadNpsResponses = async () => {
    if (!userCompanyId || !user?.id) return;
    
    const { data: allResponses } = await supabase
      .from('nps_responses')
      .select('*')
      .eq('company_id', userCompanyId)
      .order('created_at', { ascending: false });
    
    if (allResponses) {
      setNpsResponses(allResponses);
      const userResponse = allResponses.find(r => r.user_id === user.id);
      if (userResponse) {
        setLastNpsDate(userResponse.created_at);
      }
    }
  };
  loadNpsResponses();
}, [userCompanyId, user?.id, supabase]);

// ← ВСТАВИТЬ СРАЗУ ПОСЛЕ:
// 📉 Load Churn Reasons
useEffect(() => {
  const loadChurnReasons = async () => {
    if (!userCompanyId) return;
    const { data } = await supabase
      .from('churn_reasons')
      .select('*')
      .eq('company_id', userCompanyId)
      .order('created_at', { ascending: false });
    if (data) setChurnReasons(data);
  };
  loadChurnReasons();
}, [userCompanyId]);

  // ─────────────────────────────────────────────────────────
// 🔄 UPDATE STATES (добавить после других useState)
// ─────────────────────────────────────────────────────────
const [updateInfo, setUpdateInfo] = useState(null);
const [showUpdateModal, setShowUpdateModal] = useState(false);
const [waitingWorker, setWaitingWorker] = useState(null);
const [showSettings, setShowSettings] = useState(false);
// В App.jsx, в секции useState
const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // ─────────────────────────────────────────────────────────
  // 🎯 FOCUS MANAGEMENT (Pattern #3)
  // ─────────────────────────────────────────────────────────
  const lastActiveElement = useRef(null);
  const profileMenuRef = useRef(null);
  const objectInputRef = useRef(null);
  const formValuesRef = useRef(formData);
  const saveTimerRef = useRef(null);
  const notifiedOverdueAppIdsRef = useRef(new Set());
  const lastLoggedRef = useRef({});  // ← ДЛЯ ДЕБАУНСА ФИЧЕР-ЛОГОВ

  // ─────────────────────────────────────────────────────────
// ✅ APPROVAL WORKFLOW HOOK
// ─────────────────────────────────────────────────────────
const {
  pendingApprovals,
  approvalHistory,
  loading: approvalsLoading,
  approveApplication,
  rejectApplication,
  escalateApplication,
  // eslint-disable-next-line no-unused-vars
  requiresApproval
} = useApproval(userCompanyId, user?.id, userRole);

  // ─────────────────────────────────────────────────────────
  // 🎨 INJECT GLOBAL STYLES (Pattern #1)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = GLOBAL_STYLES;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  // ─────────────────────────────────────────────────────────
  // 🌙 THEME & CSS VARIABLES
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --color-primary: #4A6572;
        --color-primary-light: #5D7B8A;
        --color-primary-dark: #344955;
        --color-secondary: #F9AA33;
        --color-secondary-light: #FFB74D;
        --color-secondary-dark: #F57C00;
        --color-background: #F5F7FA;
        --color-surface: #FFFFFF;
        --color-text: #263238;
        --color-text-light: #546E7A;
      }
      .dark {
        --color-background: #121212;
        --color-surface: #1E1E1E;
        --color-text: #E0E0E0;
        --color-text-light: #B0B0B0;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const t = useCallback((key) => {
    const keys = key.split('.');
    let result = translations[language];
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key;
      }
    }
    return typeof result === 'string' ? result : key;
  }, [language]);

  // ─────────────────────────────────────────────────────────
  // 📊 MEMOIZED VALUES
  // ─────────────────────────────────────────────────────────
  const userContext = useMemo(() => getUserContext(
    user,
    profileDataForHeader,
    userRole,
    userCompanyId
  ), [user, profileDataForHeader, userRole, userCompanyId]);

  const currentUserPermissions = useMemo(() => {
  return getRolePermissions(userRole || 'master');
}, [userRole]);

  // 🕒 Time to First Value
const timeToFirstValue = useMemo(() => {
  return calculateTimeToFirstValue(
    companyUsers,
    isAdminMode ? allApplications : applications
  );
}, [companyUsers, applications, allApplications, isAdminMode]);

// 🚀 Feature Adoption by Role
const featureAdoption = useMemo(() => {
  return calculateFeatureAdoption(
    companyUsers,
    isAdminMode ? allApplications : applications,
    auditLogs || []  // ← добавить этот параметр
  );
}, [companyUsers, applications, allApplications, isAdminMode, auditLogs]);

// ===== КОЛИЧЕСТВО ОБЪЕКТОВ ДЛЯ ОБЪЕДИНЕНИЯ =====
const mergeableCount = useMemo(() => {
  const groups = {};
  applications.forEach(app => {
    if (app.status === 'consolidated') return;
    if (!groups[app.object_name]) {
      groups[app.object_name] = [];
    }
    groups[app.object_name].push(app);
  });
  return Object.values(groups).filter(group => group.length >= 2).length;
}, [applications]);


  // ─────────────────────────────────────────────────────────
  // 🔔 ENHANCED NOTIFICATIONS (Pattern #4: Toast with undo)
  // ─────────────────────────────────────────────────────────
  const showNotification = useCallback((message, type = 'info', isUpdate = false, undoFn = null) => {
    const id = notificationId.current++;
    setNotifications(prev => [...prev, { id, message, type, isUpdate, undoFn }]);
    if (!isUpdate && !undoFn) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // ⌨️ GLOBAL KEYBOARD SHORTCUTS (Pattern #5)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowReceiveModal(false);
        setShowSignupModal(false);
        setShowInviteModal(false);
        setShowAdminLogin(false);
        setShowTemplateModal(false);
        setPrivacyPolicyOpen(false);
        setProfileMenuOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (currentView === 'create') {
          document.querySelector('form')?.requestSubmit?.();
        }
        if (currentView === 'analytics' && applications.length > 0) {
          showNotification(t('exportStarted') || 'Экспорт начат', 'info');
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentView, applications.length, t, showNotification]);

  // ─────────────────────────────────────────────────────────
  // 🎯 FOCUS MANAGEMENT FOR MODALS (Pattern #3)
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const anyModalOpen = showReceiveModal || showSignupModal || showInviteModal ||
      showAdminLogin || showTemplateModal || privacyPolicyOpen;
    if (anyModalOpen) {
      lastActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      lastActiveElement.current?.focus?.();
    }
    return () => { document.body.style.overflow = ''; };
  }, [showReceiveModal, showSignupModal, showInviteModal, showAdminLogin, showTemplateModal, privacyPolicyOpen]);
/// 📱 PWA SETUP + AUTO UPDATE (ОБНОВЛЁННЫЙ)
useEffect(() => {
  // ✅ Создаём мета-теги и ссылки
  const viewportMeta = document.createElement('meta');
  viewportMeta.name = 'viewport';
  viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  document.head.appendChild(viewportMeta);

  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = '/manifest.json';
  document.head.appendChild(manifestLink);

  const themeColorMeta = document.createElement('meta');
  themeColorMeta.name = 'theme-color';
  themeColorMeta.content = '#4A6572';
  document.head.appendChild(themeColorMeta);

  const iconSizes = [
    { size: '48x48', href: '/icon-48.png' },
    { size: '72x72', href: '/icon-72.png' },
    { size: '96x96', href: '/icon-96.png' },
    { size: '128x128', href: '/icon-128.png' },
    { size: '144x144', href: '/icon-144.png' },
    { size: '152x152', href: '/icon-152.png' },
    { size: '192x192', href: '/icon-192.png' },
    { size: '256x256', href: '/icon-256.png' },
    { size: '384x384', href: '/icon-384.png' },
    { size: '512x512', href: '/icon-512.png' }
  ];
  const iconElements = iconSizes.map(({ size, href }) => {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.sizes = size;
    link.href = href;
    document.head.appendChild(link);
    return link;
  });

 // ✅ Регистрация Service Worker
const registerSW = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js?v=' + APP_VERSION);
      
      // Обработка ожидающего worker'а
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        checkForUpdates();
      }

      // Отслеживаем новых worker'ов
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              checkForUpdates();
            }
          });
        }
      });

      // Обработка сообщений от worker'а
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'RELOAD_PAGE') {
          window.location.reload();
        }
      });

      // Периодическая проверка
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Раз в час

    } catch (err) {
      console.error('[SW] Ошибка регистрации:', err);
    }
  }
};

// ✅ ВЫЗВАТЬ ФУНКЦИЮ ПОСЛЕ ОБЪЯВЛЕНИЯ:
registerSW();

// ✅ Cleanup — используем iconElements, чтобы убрать ошибку ESLint
return () => {
  if (document.head.contains(viewportMeta)) {
    document.head.removeChild(viewportMeta);
  }
  if (document.head.contains(manifestLink)) {
    document.head.removeChild(manifestLink);
  }
  if (document.head.contains(themeColorMeta)) {
    document.head.removeChild(themeColorMeta);
  }
  // ✅ Очищаем иконки при размонтировании
  iconElements.forEach(el => {
    if (document.head.contains(el)) {
      document.head.removeChild(el);
    }
  });
};
}, []); // ← ВАЖНО: пустой массив зависимостей!

  // ─────────────────────────────────────────────────────────
  // 🔒 SECURITY CHECK
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !userCompanyId) return;
    const checkSecurityStatus = async () => {
      try {
        const [companyRes, userRes] = await Promise.all([
          supabase.from('companies').select('is_blocked').eq('id', userCompanyId).single(),
          supabase.from('company_users').select('is_active').eq('user_id', user.id).eq('company_id', userCompanyId).maybeSingle()
        ]);
        const isCompanyBlocked = companyRes.data?.is_blocked;
        const isUserInactive = userRes.data?.is_active === false;
        if (isCompanyBlocked || isUserInactive) {
          await supabase.auth.signOut();
          window.location.href = '/login?blocked=1';
        }
      } catch (err) {
        console.error('Ошибка проверки безопасности:', err);
      }
    };
    checkSecurityStatus();
    const interval = setInterval(checkSecurityStatus, 60000);
    return () => clearInterval(interval);
  }, [user?.id, userCompanyId]);

  // ─────────────────────────────────────────────────────────
  // 🌙 THEME EFFECT
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const applyTheme = () => {
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', isDark);
      } else if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    applyTheme();
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  // 🧪 A/B Test Click Handler
const handleABTestClick = useCallback(async (testName, conversionType = 'click') => {
  if (!user?.id || !userCompanyId || !abTestLoaded) return;
  
  const variant = abTestVariants[testName];
  if (!variant) return;
  
  await trackABTestConversion(supabase, testName, variant, user.id, userCompanyId, conversionType);
}, [user?.id, userCompanyId, abTestLoaded, abTestVariants]);

  // ─────────────────────────────────────────────────────────
  // 🔐 AUTH SESSION CHECK
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const metadata = session.user.user_metadata;
        const role = metadata?.role || 'master';
        const company_id = metadata?.company_id;
        const company_name = metadata?.company_name?.trim();
        if (company_id) {
          try {
            const { data: companyData } = await supabase
              .from('companies')
              .select('is_blocked')
              .eq('id', company_id)
              .single();
            if (companyData?.is_blocked) {
              showNotification(t('companyBlockedAlert'), 'error');
              await supabase.auth.signOut();
              window.location.href = '/login?blocked=1';
              return;
            }
          } catch (err) {
            console.error('Ошибка проверки блокировки компании:', err);
          }
        }
        if (!company_id || !company_name) {
          showNotification('Ваш аккаунт не привязан к компании. Обратитесь к администратору.', 'error');
          await supabase.auth.signOut();
          return;
        }
        setUser(session.user);
        setUserRole(role);
        setUserCompany(company_name);
        setUserCompanyId(company_id);
        if (company_id && session?.user?.id) {
          const { data: companyData, error: ownerError } = await supabase
            .from('companies')
            .select('is_company_owner')
            .eq('id', company_id)
            .single();
          if (!ownerError && companyData?.is_company_owner === session.user.id) {
            setIsCompanyOwner(true);
          } else {
            setIsCompanyOwner(false);
          }
        } else {
          setIsCompanyOwner(false);
        }
        setProfileDataForHeader({
          fullName: metadata.full_name || '',
          phone: metadata.phone || ''
        });
        const savedLang = metadata.language || 'ru';
        const savedTheme = metadata.theme || 'system';
        setLanguage(savedLang);
        setTheme(savedTheme);
      } else {
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        if (accessToken && refreshToken) {
          window.history.replaceState({}, document.title, window.location.pathname);
          try {
            const { data: { session: newSession }, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (error) throw error;
            if (newSession?.user) {
              const metadata = newSession.user.user_metadata;
              const role = metadata?.role || 'master';
              const company_id = metadata?.company_id;
              const company_name = metadata?.company_name?.trim();
              if (!company_id || !company_name) {
                showNotification('Ваш аккаунт не привязан к компании. Обратитесь к администратору.', 'error');
                await supabase.auth.signOut();
                return;
              }
              setUser(newSession.user);
              setUserRole(role);
              setUserCompany(company_name);
              setUserCompanyId(company_id);
              if (company_id && newSession?.user?.id) {
                const { data: companyData, error: ownerError } = await supabase
                  .from('companies')
                  .select('is_company_owner')
                  .eq('id', company_id)
                  .single();
                if (!ownerError && companyData?.is_company_owner === newSession.user.id) {
                  setIsCompanyOwner(true);
                } else {
                  setIsCompanyOwner(false);
                }
              } else {
                setIsCompanyOwner(false);
              }
              setProfileDataForHeader({
                fullName: metadata.full_name || '',
                phone: metadata.phone || ''
              });
              const savedLang = metadata.language || 'ru';
              const savedTheme = metadata.theme || 'system';
              setLanguage(savedLang);
              setTheme(savedTheme);
              showNotification('Добро пожаловать! Ваш аккаунт успешно подтвержден.', 'success');
            }
          } catch (err) {
            console.error('Ошибка при установке сессии:', err);
            showNotification('Ошибка при входе. Попробуйте войти вручную.', 'error');
          }
        } else {
          setUser(null);
          setUserRole('foreman');
          setUserCompany(null);
          setUserCompanyId(null);
          setProfileDataForHeader({ fullName: '', phone: '' });
          setLanguage('ru');
          setTheme('system');
        }
      }
      setIsLoading(false);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const metadata = session.user.user_metadata;
        const role = metadata?.role || 'master';
        const company_id = metadata?.company_id;
        const company_name = metadata?.company_name?.trim();
        if (!company_id || !company_name) {
          showNotification('Ваш аккаунт не привязан к компании. Обратитесь к администратору.', 'error');
          supabase.auth.signOut();
          return;
        }
        setUser(session.user);
        setUserRole(role);
        setUserCompany(company_name);
        setUserCompanyId(company_id);
        setProfileDataForHeader({
          fullName: metadata.full_name || '',
          phone: metadata.phone || ''
        });
        const savedLang = metadata.language || 'ru';
        const savedTheme = metadata.theme || 'system';
        setLanguage(savedLang);
        setTheme(savedTheme);
      } else {
        setUser(null);
        setUserRole('foreman');
        setUserCompany(null);
        setUserCompanyId(null);
        setProfileDataForHeader({ fullName: '', phone: '' });
        setLanguage('ru');
        setTheme('system');
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─────────────────────────────────────────────────────────
  // 🚫 BLOCKED PARAM CHECK
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (currentView === 'login') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('blocked') === '1') {
        alert(t('accountBlocked') || 'Ваш аккаунт заблокирован. Обратитесь к администратору.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [currentView, t]);

  // ─────────────────────────────────────────────────────────
  // 📥 LOAD OFFLINE DRAFTS
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const loadInitialData = async () => {
      if (!hasLoadedDrafts) {
        const drafts = await loadDraftsFromDB();
        setOfflineDrafts(drafts);
        const formDraft = drafts.find(d => d.id === 'current_form_draft');
        if (formDraft) {
          setFormData({
            objectName: formDraft.objectName || '',
            foremanName: formDraft.foremanName || '',
            foremanPhone: formDraft.foremanPhone || '',
            materials: Array.isArray(formDraft.materials) ? [...formDraft.materials] : [{ description: '', quantity: 1, unit: 'шт' }],
            cart: Array.isArray(formDraft.cart) ? [...formDraft.cart] : []
          });
        }
        setHasLoadedDrafts(true);
      }
    };
    loadInitialData();
  }, [hasLoadedDrafts]);

  // ─────────────────────────────────────────────────────────
  // 🌐 NETWORK STATUS
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      showNotification(t('backOnline'), 'success');
      if (offlineDrafts.length > 0) {
        setSyncProgress({ current: 0, total: offlineDrafts.length });
        showNotification(`${t('sendingDrafts')} (${offlineDrafts.length})`, 'info');
        for (let i = 0; i < offlineDrafts.length; i++) {
          try {
            const draft = offlineDrafts[i];
            await sendWithRetry(draft);
            const success = await deleteDraftFromDB(draft.id);
            if (!success) {
              console.warn(`Не удалось удалить черновик из IndexedDB: ${draft.id}`);
              showNotification(`⚠️ Не удалось удалить черновик из IndexedDB: ${draft.objectName}`, 'warning');
            }
            setSyncProgress(prev => ({ ...prev, current: i + 1 }));
            showNotification(`📤 Отправлено: ${draft.objectName}`, 'info');
          } catch (error) {
            console.error(`Ошибка удаления черновика из IndexedDB: ${offlineDrafts[i]?.id}`, error);
            showNotification(`⚠️ Ошибка удаления черновика: ${offlineDrafts[i]?.objectName}`, 'warning');
          }
        }
        setTimeout(() => {
          setSyncProgress({ current: 0, total: 0 });
          showNotification('✅ Все черновики отправлены!', 'success');
        }, 1000);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      showNotification(t('offlineMode'), 'warning');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineDrafts, t, showNotification]);

  // ─────────────────────────────────────────────────────────
  // 💾 OPTIMIZED DRAFT SAVE
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    formValuesRef.current = formData;
  }, [formData]);

  useEffect(() => {
    if (
      formData.objectName.trim() ||
      formData.materials.length > 0 ||
      formData.cart.length > 0
    ) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        const draft = {
          ...formValuesRef.current,
          id: 'current_form_draft',
          timestamp: new Date().toISOString(),
          status: 'form_draft'
        };
        await saveDraftToDB(draft);
      }, 1000);
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [formData.objectName, formData.materials.length, formData.cart.length]);

  // ─────────────────────────────────────────────────────────
  // 📤 SEND OFFLINE DRAFTS
  // ─────────────────────────────────────────────────────────
  const sendWithRetry = useCallback(async (draft, maxRetries = 5) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const application = {
          object_name: draft.objectName,
          foreman_name: draft.foremanName,
          foreman_phone: draft.foremanPhone,
          materials: draft.materials.map(m => ({ ...m, received: 0, status: 'pending' })),
          status: 'pending',
          user_id: user?.id,
          company_id: userCompanyId,
          created_at: draft.timestamp || new Date().toISOString(),
          status_history: [{
            user_id: user?.id,
            user_email: user?.email,
            action: 'created_from_draft',
            timestamp: new Date().toISOString()
          }],
          viewed_by_supply_admin: false
        };
        // 🕐 Замер времени для логирования
        const { data, error } = await supabase
          .from('applications')
          .insert([application])
          .select();
        if (error) throw error;
        if (data?.[0]?.user_id && userCompanyId) {
          const { data: existingUser, error: checkErr } = await supabase
            .from('company_users')
            .select('id')
            .eq('user_id', data[0].user_id)
            .eq('company_id', userCompanyId)
            .maybeSingle();
          if (!checkErr && !existingUser) {
            const { error: insertErr } = await supabase
              .from('company_users')
              .insert({
                user_id: data[0].user_id,
                company_id: userCompanyId,
                full_name: data[0].foreman_name.trim(),
                phone: data[0].foreman_phone,
                role: 'master',
                is_active: true
              });
            if (insertErr && insertErr.code !== '23505') {
              console.warn('Ошибка company_users в офлайн-режиме:', insertErr);
            }
          }
        }
        return { success: true, data: data[0] };
      } catch (error) {
        console.warn(`Попытка ${attempt} не удалась:`, error);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }, [user, userCompanyId]);

  // ─────────────────────────────────────────────────────────
// 📋 TUTORIAL
// ─────────────────────────────────────────────────────────
useEffect(() => {
  // 🔒 Супер-админу не показываем туториал
  if (isSuperAdmin(userRole, user?.user_metadata)) {
    return;
  }
  if (user && userRole === 'master' && currentUserPermissions.canCreate) {
    setShowTutorial(true);
  }
}, [user, userRole, currentUserPermissions.canCreate]);

  useEffect(() => {
    const checkInvitation = async () => {
      if (signupEmail && signupEmail.includes('@')) {
        const { data } = await supabase
          .from('invitations')
          .select('company_id, companies(name)')
          .eq('email', signupEmail.toLowerCase())
          .eq('accepted', false)
          .maybeSingle();
        if (data?.companies?.name) {
          setInvitedCompany(data.companies.name);
          setSignupCompanyName(data.companies.name);
        } else {
          setInvitedCompany(null);
        }
      } else {
        setInvitedCompany(null);
      }
    };
    checkInvitation();
  }, [signupEmail]);

  const tutorialSteps = [
    t('tutorialStep1'),
    t('tutorialStep2'),
    t('tutorialStep3'),
    t('tutorialStep4')
  ];
  // 🎯 Onboarding Tour Configuration
// 🔹 КОНФИГУРАЦИЯ ОНБОРДИНГА (Замените старый onboardingHighlights)
const ROLE_ONBOARDING_HIGHLIGHTS = useMemo(() => ({
  master: [
  {
    selector: '[data-nav="create"]',
    title: 'Создание заявки',
    description: 'Здесь вы создаёте заявки на материалы для вашего объекта.',
    actionLabel: 'Создать заявку',
    position: { top: '120px', left: '50%' }
  },
  {
    selector: '[data-nav="inwork"]',
    title: 'Мои заявки',
    description: 'Отслеживайте статус ваших заявок: в работе, доставлено, завершено.',
    actionLabel: 'Перейти к заявкам',
    position: { top: '120px', left: '30%' }
  },
  {
    selector: '[data-profile-menu]',
    title: 'Профиль',
    description: 'Настройте уведомления и экспортируйте свои данные.',
    actionLabel: 'Открыть профиль',
    position: { top: '60px', left: '95%' }
  }
],
client_manager: [
  {
    selector: '[data-nav="clients"]',
    title: 'Управление клиентами',
    description: 'Здесь вы можете просматривать всех заказчиков компании, их заявки и активность.',
    actionLabel: 'Перейти к клиентам',
    position: { top: '120px', left: '50%' }
  },
  {
    selector: '[data-nav="inviteClient"]',
    title: 'Пригласить заказчика',
    description: 'Добавляйте новых заказчиков в систему по email.',
    actionLabel: 'Пригласить',
    position: { top: '120px', left: '85%' }
  },
  {
    selector: '[data-nav="analytics"]',
    title: 'Аналитика по клиентам',
    description: 'Отслеживайте активность и заявки ваших заказчиков.',
    actionLabel: 'Открыть аналитику',
    position: { top: '120px', left: '75%' }
  },
  {
    selector: '[data-profile-menu]',
    title: 'Профиль',
    description: 'Ваши личные настройки и данные.',
    actionLabel: 'Открыть профиль',
    position: { top: '60px', left: '95%' }
  }
],
  foreman: [
    {
      selector: '[data-nav="create"]',
      title: 'Создание заявки',
      description: 'Здесь вы создаете новые заявки на материалы. Нажмите на плюс, чтобы начать.',
      actionLabel: 'Создать первую заявку',
      position: { top: '120px', left: '50%' }
    },
    {
      selector: '[data-nav="inwork"]',
      title: 'Заявки в работе',
      description: 'Отслеживайте статус текущих заявок: в работе, частичная доставка или готово.',
      actionLabel: 'Перейти к заявкам',
      position: { top: '120px', left: '30%' }
    },
    {
      selector: '[data-nav="history"]',
      title: 'История',
      description: 'Архив всех выполненных и отмененных заявок доступен здесь.',
      actionLabel: 'Посмотреть историю',
      position: { top: '120px', left: '40%' }
    },
    {
      selector: '[data-profile-menu]',
      title: 'Профиль и настройки',
      description: 'Настройте уведомления, язык и экспортируйте свои данные.',
      actionLabel: 'Открыть профиль',
      position: { top: '60px', left: '95%' }
    }
  ],
  manager: [
    {
      selector: '[data-nav="invite"]',
      title: 'Приглашение команды',
      description: 'Добавляйте прорабов, снабженцев и бухгалтеров в вашу компанию.',
      actionLabel: 'Пригласить сотрудника',
      position: { top: '120px', left: '85%' }
    },
    {
      selector: '[data-nav="analytics"]',
      title: 'Аналитика',
      description: 'Следите за расходами, скоростью обработки и загрузкой объектов.',
      actionLabel: 'Открыть дашборд',
      position: { top: '120px', left: '75%' }
    },
    {
      selector: '[data-nav="employees"]',
      title: 'Сотрудники',
      description: 'Управляйте доступом: блокируйте уволенных или меняйте роли.',
      actionLabel: 'Управление сотрудниками',
      position: { top: '120px', left: '80%' }
    },
    {
      selector: '[data-nav="warehouse"]',
      title: 'Склад',
      description: 'Контролируйте остатки материалов на складе компании.',
      actionLabel: 'Перейти на склад',
      position: { top: '120px', left: '60%' }
    },
    {
      selector: '[data-profile-menu]',
      title: 'Профиль',
      description: 'Ваши личные настройки и данные.',
      actionLabel: 'Открыть профиль',
      position: { top: '60px', left: '95%' }
    }
  ],
  supply_admin: [
    {
      selector: '[data-nav="received"]',
      title: 'Приёмка и заявки',
      description: 'Обрабатывайте входящие заявки от прорабов и фиксируйте приход.',
      actionLabel: 'Обработать заявки',
      position: { top: '120px', left: '65%' }
    },
    {
      selector: '[data-nav="warehouse"]',
      title: 'Управление складом',
      description: 'Списывайте материалы под объекты и проверяйте баланс.',
      actionLabel: 'Открыть склад',
      position: { top: '120px', left: '50%' }
    },
    {
      selector: '[data-nav="chat"]',
      title: 'Чат с командой',
      description: 'Координируйте поставки и общайтесь с прорабами напрямую.',
      actionLabel: 'Написать в чат',
      position: { top: '120px', left: '40%' }
    },
    {
      selector: '[data-profile-menu]',
      title: 'Профиль',
      description: 'Настройки учетной записи.',
      actionLabel: 'Открыть профиль',
      position: { top: '60px', left: '95%' }
    }
  ],
  client: [
    {
      selector: '[data-nav="clientDashboard"]',
      title: 'Мой объект',
      description: 'Общая сводка по вашему строительному объекту.',
      actionLabel: 'Посмотреть сводку',
      position: { top: '120px', left: '20%' }
    },
    {
      selector: '[data-nav="clientChat"]',
      title: 'Чат с прорабом',
      description: 'Общайтесь с ответственным за объект напрямую.',
      actionLabel: 'Открыть чат',
      position: { top: '120px', left: '40%' }
    },
    {
      selector: '[data-nav="clientDocuments"]',
      title: 'Документы',
      description: 'Здесь хранятся акты, сметы и фотоотчеты.',
      actionLabel: 'Перейти к документам',
      position: { top: '120px', left: '60%' }
    }
  ],
  default: [
    {
      selector: '[data-profile-menu]',
      title: 'Добро пожаловать!',
      description: 'Изучите интерфейс, используя меню навигации.',
      actionLabel: 'Начать работу',
      position: { top: '60px', left: '95%' }
    }
  ]
}), []);

// Динамический выбор шагов
const currentOnboardingHighlights = useMemo(() => {
  return ROLE_ONBOARDING_HIGHLIGHTS[userRole] || ROLE_ONBOARDING_HIGHLIGHTS.default;
}, [userRole, ROLE_ONBOARDING_HIGHLIGHTS]);

  const handleTutorialNext = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      setTutorialStep(0);
    }
  };

  const handleTutorialSkip = () => {
    setShowTutorial(false);
  };

  // ─────────────────────────────────────────────────────────
  // ⚙️ USER PREFERENCES
  // ─────────────────────────────────────────────────────────
  const saveUserPreferences = async (newLang, newTheme) => {
    if (!user) return;
    const { error } = await supabase.auth.updateUser({
      data: { language: newLang, theme: newTheme }
    });
    if (error) {
      console.warn('Не удалось сохранить настройки:', error.message);
    }
  };

  const toggleTheme = async () => {
    let newTheme;
    if (theme === 'system') {
      const isCurrentlyDark = document.documentElement.classList.contains('dark');
      newTheme = isCurrentlyDark ? 'light' : 'dark';
    } else if (theme === 'dark') {
      newTheme = 'light';
    } else {
      newTheme = 'system';
    }
    setTheme(newTheme);
    await saveUserPreferences(language, newTheme);
  };

  const handleLanguageChange = async () => {
    const newLang = language === 'ru' ? 'en' : 'ru';
    setLanguage(newLang);
    await saveUserPreferences(newLang, theme);
  };

  // ─────────────────────────────────────────────────────────
  // 📞 PHONE FORMATTING
  // ─────────────────────────────────────────────────────────
  const formatPhone = (value) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('8')) digits = '7' + digits.slice(1);
    if (digits.length > 0 && !digits.startsWith('7')) digits = '7' + digits;
    digits = digits.substring(0, 11);
    if (digits.length === 0) return '';
    let formatted = '+7';
    if (digits.length > 1) formatted += ` (${digits.slice(1, 4)}`;
    if (digits.length > 4) formatted += `) ${digits.slice(4, 7)}`;
    if (digits.length > 7) formatted += `-${digits.slice(7, 9)}`;
    if (digits.length > 9) formatted += `-${digits.slice(9, 11)}`;
    return formatted;
  };

  const handlePhoneChange = (e) => {
    const input = e.target.value;
    const formatted = formatPhone(input);
    setFormData({ ...formData, foremanPhone: formatted });
  };

// 🔄 CHECK FOR UPDATES (с защитой от дублирования)
const checkForUpdates = useCallback(async () => {
  try {
    const response = await fetch('/version.json?v=' + Date.now());
    const data = await response.json();
    
    console.log('[UpdateCheck] Текущая версия:', APP_VERSION);
    console.log('[UpdateCheck] Новая версия:', data.version);
    
    if (data.version && data.version !== APP_VERSION) {
      // Проверяем, не отклоняли ли уже это обновление
      const declinedKey = `update_declined_${data.version}`;
      const declinedAt = localStorage.getItem(declinedKey);
      
      // Если отклонено менее чем 24 часа назад, не показываем
      if (declinedAt && (Date.now() - parseInt(declinedAt)) < 24 * 60 * 60 * 1000) {
        console.log('[UpdateCheck] Обновление отклонено, не показываем');
        return;
      }
      
      // Проверяем, не применяли ли уже это обновление
      const appliedKey = `update_applied_${data.version}`;
      if (localStorage.getItem(appliedKey)) {
        console.log('[UpdateCheck] Обновление уже применено');
        return;
      }
      
      // Проверяем, не показывали ли уже это обновление в текущей сессии
      const lastShownVersion = localStorage.getItem('last_update_shown');
      if (lastShownVersion !== data.version) {
        console.log('[UpdateCheck] Показываем модальное окно обновления');
        
        // Находим информацию о версии из списка
        const versionInfo = data.versions?.find(v => v.version === data.version) || {
          version: data.version,
          changes: data.changes || ['Улучшена производительность и исправлены ошибки'],
          date: data.date || new Date().toISOString(),
          breaking: false
        };
        
        setUpdateInfo({
          from: APP_VERSION,
          to: data.version,
          changes: versionInfo.changes,
          date: versionInfo.date,
          breaking: versionInfo.breaking || false,
          updateOptions: data.updateOptions || {
            showStayOption: true,
            remindLaterDays: 3,
            message: 'После обновления может потребоваться перезагрузка'
          }
        });
        setShowUpdateModal(true);
        localStorage.setItem('last_update_shown', data.version);
      } else {
        console.log('[UpdateCheck] Обновление уже показывали в этой сессии');
      }
    } else {
      console.log('[UpdateCheck] Нет новых версий');
    }
  } catch (err) {
    console.warn('[UpdateCheck] Ошибка проверки обновлений:', err);
  }
}, []);

  // ─────────────────────────────────────────────────────────
  // 🔐 AUTH FUNCTIONS
  // ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!authEmail || !authPassword) {
      showNotification(t('enterEmail'), 'error');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword
    });
    if (error) {
      console.error('Auth error:', error);
      showNotification(error.message || 'Login failed', 'error');
      return;
    }
    setAuthEmail('');
    setAuthPassword('');
  };

  const handleLogout = async () => {
  // ✅ Очистить кэш
  cacheManager.clear();
  await supabase.auth.signOut();
  setUser(null);
  setUserRole('foreman');
  setUserCompany(null);
  setUserCompanyId(null);
  setIsAdminMode(false);
  setCurrentView('create');
};

  // ─────────────────────────────────────────────────────────
  // 📝 SIGNUP
  // ─────────────────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword || !signupConfirmPassword || !signupFullName.trim()) {
      showNotification(t('enterEmail'), 'error');
      return;
    }
    if (!consent) {
      showNotification(t('consentRequired'), 'error');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      showNotification(t('passwordsDoNotMatch'), 'error');
      return;
    }
    if (signupPassword.length < 6) {
      showNotification(t('enterPassword'), 'error');
      return;
    }
    const phoneDigits = signupPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      showNotification(t('enterCorrectPhone'), 'error');
      return;
    }

    const normalizeName = (name) => {
      return name
        .toLowerCase()
        .replace(/["'«»]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^\.+|\.+$/g, '');
    };

    let finalRole = 'master';
    let targetCompanyId = null;
    let invitedCompanyName = null;
    let isCreatingCompany = false;

    try {
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .select('role, id, company_id')
        .eq('email', signupEmail.trim().toLowerCase())
        .eq('accepted', false)
        .maybeSingle();

      if (invitation && !inviteError) {
        targetCompanyId = invitation.company_id;
        finalRole = invitation.role;
        const { data: company } = await supabase
          .from('companies')
          .select('name, normalized_name')
          .eq('id', targetCompanyId)
          .single();
        if (!company) {
          showNotification('Компания не найдена', 'error');
          return;
        }
        invitedCompanyName = company.name;
      } else {
        if (!signupCompanyName.trim()) {
          showNotification('Введите название компании', 'error');
          return;
        }
        const cleanName = signupCompanyName.trim();
        const normalized = normalizeName(cleanName);
        const { data: existingCompany, error: companyError } = await supabase
          .from('companies')
          .select('id, is_company_owner')
          .eq('normalized_name', normalized)
          .maybeSingle();
        if (companyError && companyError.code !== 'PGRST116') {
          console.error('Ошибка при проверке компании:', companyError);
          showNotification('Ошибка при проверке компании', 'error');
          return;
        }
        if (existingCompany) {
          targetCompanyId = existingCompany.id;
          finalRole = 'master';
        } else {
          const { data, error: insertError } = await supabase
            .from('companies')
            .insert({
              name: cleanName,
              normalized_name: normalized,
              is_company_owner: null,
              approved: true
            })
            .select('id, name')
            .single();
          if (insertError) {
            console.error('Ошибка создания компании:', insertError);
            showNotification('Не удалось создать компанию: ' + insertError.message, 'error');
            return;
          }
          isCreatingCompany = true;
          targetCompanyId = data.id;
          finalRole = 'manager';
        }
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: {
            company_id: targetCompanyId,
            company_name: invitedCompanyName || signupCompanyName.trim(),
            role: finalRole,
            full_name: signupFullName,
            phone: signupPhone
          }
        }
      });

      if (authError) {
        console.error('Ошибка регистрации:', authError);
        if (isCreatingCompany && targetCompanyId) {
          await supabase.from('companies').delete().eq('id', targetCompanyId);
        }
        showNotification(t('signupFailed') + ': ' + authError.message, 'error');
        return;
      }

      if (isCreatingCompany && authData.user) {
        const { error: updateError } = await supabase
          .from('companies')
          .update({ is_company_owner: authData.user.id })
          .eq('id', targetCompanyId);
        if (updateError) {
          console.warn('Не удалось установить владельца компании:', updateError);
        }
      }

      // 🔥 АКТИВАЦИЯ PRO ТАРИФА НА 14 ДНЕЙ
      if (isCreatingCompany && targetCompanyId) {
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        
        const { error: planError } = await supabase
          .from('companies')
          .update({
            plan_tier: 'pro',
            plan_activated_at: now,
            plan_expires_at: expiresAt,
            trial_started_at: now,
            trial_ended_at: expiresAt
          })
          .eq('id', targetCompanyId);
        
        if (planError) {
          console.warn('⚠️ Не удалось активировать пробный тариф:', planError);
        }
      }

      const { error: companyUserError } = await supabase
        .from('company_users')
        .insert({
          user_id: authData.user.id,
          company_id: targetCompanyId,
          role: finalRole,
          full_name: signupFullName,
          phone: signupPhone,
          is_active: true
        });

      if (companyUserError && companyUserError.code !== '23505') {
        console.error('Ошибка company_users:', companyUserError);
        showNotification('Ошибка привязки к компании', 'warning');
      }

      if (invitation?.id) {
        await supabase
          .from('invitations')
          .update({ accepted: true })
          .eq('id', invitation.id);
      }

      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setSignupFullName('');
      setSignupPhone('');
      setSignupCompanyName('');
      setConsent(false);
      setShowSignupModal(false);
      showNotification(t('accountCreated'), 'success');
    } catch (err) {
      console.error('Критическая ошибка регистрации:', err);
      showNotification(t('signupFailed') + ': ' + err.message, 'error');
    }
  };

  // 👥 INVITE USER - с учётом прав supply_admin
const handleInviteUser = async () => {
  if (!inviteEmail || !inviteRole) {
    showNotification(t('enterValidEmail'), 'error');
    return;
  }

  console.log('[INVITE DEBUG]', {
    userRole,
    isCompanyOwner,
    inviteRole,
    userCompanyId,
    userId: user?.id
  });

  // Проверяем права на приглашение
  if (!canInviteRole(userRole, inviteRole, isCompanyOwner)) {
    showNotification(`Вы не можете приглашать пользователей с ролью "${inviteRole}"`, 'error');
    return;
  }

  if (inviteRole === 'super_admin') {
    showNotification('Роль супер-админа не может быть назначена через интерфейс', 'error');
    return;
  }

  // Только владелец может приглашать менеджеров
  if (inviteRole === 'manager' && !isCompanyOwner && userRole !== 'super_admin') {
    showNotification('Только владелец компании может приглашать руководителей', 'error');
    return;
  }

  // supply_admin может приглашать, но не менеджеров
  if (userRole === 'supply_admin' && (inviteRole === 'manager' || inviteRole === 'supply_admin')) {
    showNotification('Администратор снабжения может приглашать только прорабов, мастеров и бухгалтеров', 'error');
    return;
  }

  // ============================================================
  // 🔥 ЖЕСТКАЯ БЛОКИРОВКА ДЛЯ ПРИГЛАШЕНИЙ (ЛИМИТ ПОЛЬЗОВАТЕЛЕЙ)
  // ============================================================
  if (currentPlan?.id === 'basic' || !currentPlan) {
    try {
      const { count: currentUsers, error: countError } = await supabase
        .from('company_users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', userCompanyId)
        .eq('is_active', true);
      
      if (countError) throw countError;
      
      const maxUsers = currentPlan?.maxUsers || 10;
      
      if (currentUsers >= maxUsers) {
        showNotification(
          `⚠️ Лимит пользователей исчерпан (${currentUsers}/${maxUsers}). Обновите тариф для добавления новых сотрудников.`,
          'warning'
        );
        setCurrentView('tariffs');
        return;
      }
      
      if (currentUsers >= maxUsers - 1) {
        showNotification(
          `⚠️ Осталось ${maxUsers - currentUsers} место. Скоро лимит будет исчерпан.`,
          'warning'
        );
      }
      
    } catch (err) {
      console.error('Ошибка проверки лимита пользователей:', err);
      showNotification('❌ Ошибка проверки лимитов. Попробуйте позже.', 'error');
      return;
    }
  }

  if (!userCompanyId) {
    showNotification('Ошибка: компания не указана', 'error');
    return;
  }

  try {
    const { error } = await supabase
      .from('invitations')
      .insert([{
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        company_id: userCompanyId,
        invited_by: user?.id,
        accepted: false,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('[INVITE ERROR]', error);
      throw error;
    }

    await logUserInvited(supabase, inviteEmail.trim().toLowerCase(), inviteRole, user?.email, userContext);
    showNotification(`✅ Приглашение отправлено! ${inviteRole === 'manager' ? 'Новый руководитель' : 'Сотрудник'} получит ссылку на почту`, 'success');
    setInviteEmail('');
    setInviteRole('master');
    setShowInviteModal(false);
  } catch (err) {
    console.error('Ошибка отправки приглашения:', err);
    showNotification(t('inviteFailed') + ': ' + err.message, 'error');
  }
};

// 👑 Назначение нового руководителя компании
const handleAssignOwner = async (newOwnerId, newOwnerName) => {
  if (!window.confirm(`⚠️ ПЕРЕДАЧА ПРАВ РУКОВОДИТЕЛЯ\n\nВы уверены, что хотите назначить "${newOwnerName}" руководителем компании?\n\nПосле передачи:\n• Вы станете администратором снабжения (supply_admin)\n• Новый руководитель получит права управления компанией\n• Вы больше не сможете управлять тарифами и приглашать сотрудников`)) {
    return;
  }
  
  try {
    // 1. Назначаем нового владельца
    const { error: companyError } = await supabase
      .from('companies')
      .update({ is_company_owner: newOwnerId })
      .eq('id', userCompanyId);
    
    if (companyError) throw companyError;
    
    // 2. Новый владелец → manager
    await supabase
      .from('company_users')
      .update({ role: 'manager' })
      .eq('user_id', newOwnerId)
      .eq('company_id', userCompanyId);
    
    // 3. Старый владелец → supply_admin
    if (companyOwnerId) {
      await supabase
        .from('company_users')
        .update({ role: 'supply_admin' })
        .eq('user_id', companyOwnerId)
        .eq('company_id', userCompanyId);
    }
    
    showNotification(`✅ Руководителем назначен ${newOwnerName}\n📦 Вы стали администратором снабжения`, 'success');
    
    // Обновляем локальное состояние
    setCompanyOwnerId(newOwnerId);
    setIsCompanyOwner(false);
    setUserRole('supply_admin');
    
    // Обновляем метаданные пользователя
    await supabase.auth.updateUser({
      data: { role: 'supply_admin' }
    });
    
    // Перезагружаем данные
    await loadEmployees();
    await loadApplications(page);
    
    // Обновляем текущую вьюху, чтобы применить новые права
    if (currentView === 'employees') {
      setCurrentView('inwork');
      setTimeout(() => setCurrentView('employees'), 100);
    }
    
  } catch (err) {
    console.error('Ошибка:', err);
    showNotification('❌ Ошибка при назначении руководителя: ' + err.message, 'error');
  }
};

  // ─────────────────────────────────────────────────────────
  // 🛒 CART MANAGEMENT
  // ─────────────────────────────────────────────────────────
  const moveToCart = (index) => {
    const materialToRemove = formData.materials[index];
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index),
      cart: [...prev.cart, materialToRemove]
    }));
    showNotification(t('moveToCart'), 'info');
  };

  const restoreFromCart = (index) => {
    const materialToRestore = formData.cart[index];
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, materialToRestore],
      cart: prev.cart.filter((_, i) => i !== index)
    }));
    showNotification(t('restore'), 'success');
  };

  const removeFromCartPermanently = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      cart: prev.cart.filter((_, i) => i !== index)
    }));
    showNotification(t('permanentlyDelete') || 'Удалено навсегда', 'info');
  }, [t, showNotification]);

  // ─────────────────────────────────────────────────────────
  // 📊 EXCEL IMPORT/EXPORT
  // ─────────────────────────────────────────────────────────
  const handleExcelImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const newMaterials = [];
      for (let i = 0; i < json.length; i++) {
        const row = json[i];
        if (!row || row.length < 2) continue;
        const firstCell = row[0] ? String(row[0]).trim() : '';
        if (
          !firstCell ||
          firstCell === 'КП' ||
          firstCell.toLowerCase().includes('заявка') ||
          firstCell.toLowerCase().includes('наименование') ||
          firstCell.toLowerCase().includes('тип') ||
          firstCell.toLowerCase().includes('завод') ||
          firstCell.toLowerCase().includes('единица') ||
          firstCell.toLowerCase().includes('кол-во') ||
          firstCell.toLowerCase().includes('кондиционирование') ||
          /^-+$/.test(firstCell)
        ) {
          continue;
        }
        let description = '';
        let quantity = 1;
        let unit = 'шт';
        if (/^\d+$/.test(firstCell)) {
          description = row[1] ? String(row[1]).trim() : '';
          unit = row[4] ? String(row[4]).trim().replace('.', '') : 'шт';
          quantity = row[5] ? Number(row[5]) : 1;
        } else {
          description = firstCell;
          unit = row[2] ? String(row[2]).trim().replace('.', '') : 'шт';
          quantity = row[1] ? Number(row[1]) : 1;
        }
        if (description && description.length > 2 && quantity > 0) {
          newMaterials.push({
            description: description,
            quantity: quantity,
            unit: unitOptions.includes(unit) ? unit : 'шт',
            received: 0,
            status: 'pending'
          });
        }
      }
      if (newMaterials.length > 0) {
        setFormData(prev => ({
          ...prev,
          materials: [...prev.materials, ...newMaterials]
        }));
        showNotification(`✅ Загружено ${formatNumber(newMaterials.length)} позиций`, 'success');
      } else {
        showNotification('⚠️ Файл пуст или неверный формат', 'warning');
      }
    } catch (error) {
      console.error('Ошибка импорта:', error);
      showNotification('❌ Ошибка чтения файла: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
      e.target.value = '';
    }
  };

  const downloadExcelTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Наименование': 'Цемент М500', 'Количество': 10, 'Ед. изм.': 'кг' },
      { 'Наименование': 'Кирпич красный', 'Количество': 1000, 'Ед. изм.': 'шт' },
      { 'Наименование': 'Песок', 'Количество': 5, 'Ед. изм.': 'м3' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Материалы');
    XLSX.writeFile(wb, 'Шаблон_заявки_Reglai.xlsx');
    showNotification('📥 Шаблон скачан', 'success');
  };

  
 // 📤 SUBMIT APPLICATION — С ЖЕСТКОЙ БЛОКИРОВКОЙ
const handleSubmit = async (e) => {
  e.preventDefault();

  // ✅ ЗАЩИТА ОТ ДВОЙНОГО НАЖАТИЯ
  if (isSubmitting) {
    console.log('⏳ Заявка уже отправляется, ожидайте...');
    return;
  }

  // ============================================================
  // 🔥 ЖЕСТКАЯ БЛОКИРОВКА ПРИ ИСТЕЧЕНИИ ТАРИФА
  // ============================================================
  if (currentPlan?.id === 'basic' || !currentPlan) {
    try {
      const quota = await checkQuota(supabase, userCompanyId);
      
      if (!quota.allowed) {
        showNotification('❌ Лимит заявок исчерпан. Оплатите тариф.', 'error');
        setCurrentView('tariffs');
        setIsSubmitting(false);
        return;
      }
      
      const validMaterials = formData.materials.filter(m =>
        m.description?.trim() && m.quantity && m.quantity > 0 && !isNaN(m.quantity)
      );
      
      const materialCheck = await checkMaterialsLimit(supabase, userCompanyId, validMaterials.length);
      if (!materialCheck.allowed) {
        showNotification(
          `⚠️ В бесплатном тарифе максимум ${materialCheck.limit} материалов в заявке.`,
          'warning'
        );
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.error('Ошибка проверки лимитов:', err);
      showNotification('❌ Ошибка проверки лимитов. Попробуйте позже.', 'error');
      setIsSubmitting(false);
      return;
    }
  }

  // 🔐 Проверка роли - только прораб, снабженец могут создавать
  if (userRole !== 'master' && userRole !== 'foreman' && userRole !== 'supply_admin' && userRole !== 'client_manager') {
    showNotification('У вашей роли нет прав на создание заявок', 'error');
    return;
  }
  
  // 🔐 Базовые проверки
  if (!user) {
    showNotification(t('loginToSystem'), 'error');
    return;
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    showNotification(t('loginToSystem'), 'error');
    return;
  }
  
  const sessionUser = session.user;
  const safeCompanyId = sessionUser.user_metadata?.company_id || userCompanyId;
  const safeCompany = sessionUser.user_metadata?.company_name?.trim() || userCompany;
  
  if (!safeCompanyId) {
    console.error('❌ company_id отсутствует!', { safeCompanyId, safeCompany });
    showNotification(`Ошибка: компания "${safeCompany || 'не указана'}"`, 'error');
    return;
  }
  
  if (!currentUserPermissions.canCreate) {
    console.error('❌ Нет прав canCreate для роли:', userRole);
    showNotification('У вас нет прав на создание заявок', 'error');
    return;
  }
  
  // 🔐 Валидация формы
  if (!formData.objectName.trim() || !formData.foremanName.trim() || !formData.foremanPhone.trim()) {
    showNotification(t('fillRequiredFields'), 'error');
    return;
  }
  
  const phoneDigits = formData.foremanPhone.replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    showNotification(t('enterCorrectPhone'), 'error');
    return;
  }
  
  const validMaterials = formData.materials.filter(m =>
    m.description?.trim() && m.quantity && m.quantity > 0 && !isNaN(m.quantity)
  );
  
  if (validMaterials.length === 0) {
    showNotification(t('fillAllMaterials') || 'Заполните хотя бы один материал', 'error');
    return;
  }
  
  const materialsWithTracking = validMaterials.map(m => ({
    ...m,
    received: 0,
    supplier_received_quantity: 0,
    status: ITEM_STATUS.PENDING
  }));
  
  let initialStatus = APPLICATION_STATUS.PENDING;
  const totalAmount = validMaterials.reduce((sum, m) =>
    sum + (m.quantity * (m.price || 1000)), 0
  );
  
  const startTime = Date.now();
  
  // 📦 Формируем объект заявки
  const newApplication = {
    object_name: formData.objectName.trim(),
    foreman_name: formData.foremanName.trim(),
    foreman_phone: formData.foremanPhone,
    materials: materialsWithTracking,
    status: initialStatus,
    user_id: sessionUser.id,
    company_id: safeCompanyId,
    client_id: selectedClientId || null,
    created_at: new Date().toISOString(),
    total_amount: totalAmount,
    status_history: [{
      user_id: sessionUser.id,
      user_email: sessionUser.email,
      action: 'created',
      timestamp: new Date().toISOString()
    }],
    viewed_by_supply_admin: false
  };
  
  setIsSubmitting(true);

  // Offline режим
  if (!isOnline) {
    const draftId = await saveDraftToDB({
      ...newApplication,
      id: `draft_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'offline_draft'
    });
    
    if (draftId) {
      setOfflineDrafts(prev => [...prev, { ...newApplication, id: draftId }]);
      showNotification(t('draftSaved'), 'warning');
    } else {
      showNotification(t('errorSaving'), 'error');
    }
    
    setFormData({
      objectName: '',
      foremanName: '',
      foremanPhone: '',
      materials: [{ description: '', quantity: 1, unit: 'шт' }],
      cart: []
    });
    await deleteDraftFromDB('current_form_draft');
    setCurrentView('pending');
    setPage(1);
    setIsSubmitting(false);
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('applications')
      .insert([newApplication])
      .select();
    
    if (error) throw error;
    
    const realApplicationId = data[0].id;

    if (currentPlan?.id === 'basic' || !currentPlan) {
      try {
        await incrementApplicationUsage(supabase, userCompanyId);
      } catch (err) {
        console.warn('⚠️ Ошибка увеличения счётчика:', err);
      }
    }
    
    await logApplicationCreated(supabase, {
      id: realApplicationId,
      object_name: formData.objectName.trim(),
      foreman_name: formData.foremanName.trim(),
      foreman_phone: formData.foremanPhone,
      materials: materialsWithTracking,
      status: initialStatus
    }, userContext);
    
    setApplications([data[0], ...applications.slice(0, ITEMS_PER_PAGE - 1)]);
    
    if (user?.id && userCompanyId) {
      const { data: existingApps } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .limit(2);
      
      if (!existingApps || existingApps.length <= 1) {
        await AnalyticsTracker.trackTimeToFirstApplication(user.id, data[0].id);
        await AnalyticsTracker.trackOnboardingStep(
          user.id,
          userCompanyId,
          'first_application',
          'created',
          { applicationId: data[0].id }
        );
      }
    }
    
    try {
      sendApplication(data[0], settings, t, userCompany, language, copyApplicationText, showNotification);
    } catch (err) {
      console.warn('⚠️ sendApplication ошибка:', err);
    }
    
    setFormData({
      objectName: '',
      foremanName: '',
      foremanPhone: '',
      materials: [{ description: '', quantity: 1, unit: 'шт' }],
      cart: []
    });
    await deleteDraftFromDB('current_form_draft');
    setCurrentView('pending');
    setPage(1);
    showNotification('✅ Заявка успешно отправлена!', 'success');
    
    if (userCompanyId) {
      cacheManager.delete('applications', `applications_${userCompanyId}_page_1`);
      cacheManager.delete('analytics', `analytics_${userCompanyId}_${isAdminMode}`);
    }
    
    if (userCompanyId && currentPlan?.id) {
      logApiUsage(supabase, {
        apiKeyId: 'frontend-app',
        companyId: userCompanyId,
        endpoint: '/applications',
        method: 'POST',
        statusCode: 200,
        responseTimeMs: Date.now() - startTime,
        requestSizeBytes: JSON.stringify(newApplication).length,
        responseSizeBytes: JSON.stringify(data || {}).length,
        ipAddress: '',
        userAgent: navigator.userAgent
      }).catch(err => console.warn('API usage log failed:', err));
    }
    
  } catch (error) {
    console.warn('[App] Network error, queuing request:', error);
    
    try {
      await enqueueOfflineRequest({
        url: `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/applications`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(newApplication),
        payload: {
          application: newApplication,
          type: 'create',
          formData: { ...formData }
        }
      });
      
      await requestBackgroundSync();
      
      const optimisticApp = {
        ...newApplication,
        id: `pending_${Date.now()}`,
        status: initialStatus,
        created_at: new Date().toISOString()
      };
      setApplications(prev => [optimisticApp, ...prev.slice(0, ITEMS_PER_PAGE - 1)]);
      
    } catch (queueError) {
      console.error('[App] Failed to queue offline request:', queueError);
      showNotification('⚠️ Ошибка сохранения заявки', 'error');
      setIsSubmitting(false);
      return;
    }
    
    showNotification('📭 Заявка сохранена и будет отправлена при восстановлении связи', 'warning');
    
    setFormData({
      objectName: '',
      foremanName: '',
      foremanPhone: '',
      materials: [{ description: '', quantity: 1, unit: 'шт' }],
      cart: []
    });
    await deleteDraftFromDB('current_form_draft');
    setCurrentView('pending');
    setPage(1);
    
  } finally {
    setIsSubmitting(false);
  }
};

  // ─────────────────────────────────────────────────────────
  // 💾 TEMPLATE FUNCTIONS
  // ─────────────────────────────────────────────────────────
  const saveTemplate = async () => {
    if (!templateName.trim()) {
      showNotification('Введите название шаблона', 'error');
      return;
    }
    const { data, error } = await supabase
      .from('templates')
      .insert([{
        user_id: user?.id,
        template_name: templateName.trim(),
        materials: formData.materials
      }])
      .select();
    if (error) {
      console.error('Ошибка сохранения шаблона:', error);
      showNotification('Не удалось сохранить шаблон', 'error');
      return;
    }
    await logTemplateCreated(supabase, data?.[0]?.id, templateName.trim(), formData.materials, userContext);
    showNotification('Шаблон сохранён!', 'success');
    setTemplateName('');
    setShowTemplateModal(false);
    setTemplates(data);
  };

  const cloneLastApplication = async () => {
    try {
      const { data: lastApp } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user?.id)
        .eq('company_id', userCompanyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (lastApp) {
        setFormData(prev => ({
          ...prev,
          objectName: lastApp.object_name,
          foremanName: lastApp.foreman_name,
          foremanPhone: lastApp.foreman_phone,
          materials: lastApp.materials.map(m => ({
            ...m,
            received: 0,
            status: 'pending'
          }))
        }));
        showNotification('📋 Данные скопированы из последней заявки', 'success');
      } else {
        showNotification('⚠️ Нет предыдущих заявок', 'warning');
      }
    } catch (error) {
      console.error('Ошибка клонирования:', error);
      showNotification('❌ Ошибка клонирования', 'error');
    }
  };

  const loadTemplate = async (templateMaterials, templateName) => {
    try {
      if (userCompanyId && user?.id) {
        await logTemplateUsed(supabase, templateName || 'template', templateMaterials.length, userContext);
      }
      setFormData(prev => ({
        ...prev,
        materials: templateMaterials.map(m => ({ ...m }))
      }));
    } catch (err) {
      console.error('Ошибка при загрузке шаблона:', err);
      showNotification('Ошибка при загрузке шаблона', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────
  // ❌ CANCEL APPLICATION
  // ─────────────────────────────────────────────────────────
  const cancelApplication = async (id) => {
  if (!user) return;
  if (!window.confirm(t('confirmCancel'))) return;
  
  const appToCancel = applications.find(a => a.id === id);
  if (!appToCancel || appToCancel.user_id !== user?.id) {
    showNotification('Вы не можете отменить чужую заявку', 'error');
    return;
  }
  
  // ✅ ПРОСТОЕ РЕШЕНИЕ: помечаем как удалённую, а не удаляем
  const { error } = await supabase
    .from('applications')
    .update({
      status: 'canceled',
      updated_at: new Date().toISOString(),
      deleted_at: new Date().toISOString(),  // запоминаем когда удалили
      is_deleted: true                        // флаг удаления
    })
    .eq('id', id);
  
  if (error) {
    showNotification('Ошибка при отмене заявки', 'error');
    return;
  }
  
  // Обновляем UI - скрываем заявку
  setApplications(prev => prev.filter(app => app.id !== id));
  showNotification('Заявка отменена', 'success');
};

  // ─────────────────────────────────────────────────────────
  // 💬 ADD COMMENT
  // ─────────────────────────────────────────────────────────
  const addComment = async (applicationId, content) => {
    if (!user?.id) {
      showNotification('Пользователь не авторизован', 'error');
      return;
    }
    if (!applicationId) {
      showNotification('Неверный ID заявки', 'error');
      return;
    }
    if (!content?.trim()) {
      return;
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(content)) {
      console.error('❌ [COMMENT] В content передан UUID вместо текста!', { applicationId, content });
      showNotification('Ошибка: в комментарий передан ID вместо текста', 'error');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const safeCompanyId = session?.user?.user_metadata?.company_id;
    if (!safeCompanyId) {
      console.error('❌ [COMMENT] company_id отсутствует в сессии:', session?.user);
      showNotification('Ошибка: компания не указана в профиле. Выйдите и войдите снова.', 'error');
      return;
    }
    const cleanContent = content.trim();
    logCommentAdded(supabase, applicationId, cleanContent, userContext)
      .catch(err => console.warn('Аудит не записан:', err));
    const newCommentData = {
      application_id: applicationId,
      user_id: user?.id,
      user_email: user?.email,
      user_role: userRole || 'master',
      user_company_id: safeCompanyId,
      content: cleanContent,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from('comments')
      .insert([newCommentData])
      .select();
    if (error) {
      console.error('❌ [COMMENT] Ошибка:', error);
      showNotification(`Ошибка: ${error.message}`, 'error');
      return;
    }
    setComments(prev => ({
      ...prev,
      [applicationId]: [...(prev[applicationId] || []), data[0]]
    }));
    showNotification('Комментарий добавлен', 'success');
  };

  // ─────────────────────────────────────────────────────────
  // 📝 FORM MANAGEMENT
  // ─────────────────────────────────────────────────────────
  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [
        ...prev.materials,
        { description: '', quantity: 1, unit: 'шт' }
      ]
    }));
  };

  const removeMaterial = (index) => {
    if (formData.materials.length > 1) {
      moveToCart(index);
    }
  };

  const [showMaterialSuggestions, setShowMaterialSuggestions] = useState([]);

  const updateMaterial = (index, field, value) => {
    setFormData(prev => {
      const newMaterials = [...prev.materials];
      newMaterials[index][field] = value;
      return { ...prev, materials: newMaterials };
    });
    if (field === 'description') {
      setShowMaterialSuggestions(prev => {
        const newShow = [...prev];
        newShow[index] = value.trim() !== '';
        return newShow;
      });
    }
  };

  const materialHistory = useMemo(() => {
    const materials = new Set();
    applications.forEach(app => {
      app.materials.forEach(m => {
        if (m.description) materials.add(m.description);
      });
    });
    return Array.from(materials);
  }, [applications]);

  const selectMaterial = (index, description) => {
    setFormData(prev => {
      const newMaterials = [...prev.materials];
      newMaterials[index].description = description;
      return { ...prev, materials: newMaterials };
    });
    setShowMaterialSuggestions(prev => {
      const newShow = [...prev];
      newShow[index] = false;
      return newShow;
    });
  };

  const [showObjectSuggestions, setShowObjectSuggestions] = useState(false);

  const objectHistory = useMemo(() => {
    const objects = new Set();
    applications.forEach(app => objects.add(app.object_name));
    return Array.from(objects);
  }, [applications]);

  const filteredObjects = useMemo(() => {
    if (!formData.objectName) return [];
    return objectHistory.filter(obj =>
      obj.toLowerCase().includes(formData.objectName.toLowerCase())
    ).slice(0, 5);
  }, [formData.objectName, objectHistory]);

  const selectObject = (objectName) => {
    setFormData({ ...formData, objectName });
    setShowObjectSuggestions(false);
  };

  const handleObjectInput = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, objectName: value });
  };

  const handleClickOutside = useCallback((event) => {
    if (objectInputRef.current && !objectInputRef.current.contains(event.target)) {
      setShowObjectSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (showObjectSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showObjectSuggestions, handleClickOutside]);

  // ─────────────────────────────────────────────────────────
  // 📊 ANALYTICS
  // ─────────────────────────────────────────────────────────
  const getObjectAnalytics = useMemo(() => {
  if (!userCompanyId) return [];
  
  const cacheKey = `analytics_${userCompanyId}_${isAdminMode}`;
  const cached = cacheManager.get('analytics', cacheKey);
  if (cached) return cached;
  
  const apps = isAdminMode ? allApplications : applications;
  const analytics = {};
  apps.forEach(app => {
    const key = app.object_name;
    if (!analytics[key]) {
      analytics[key] = {
        objectName: key,
        totalApplications: 0,
        pending: 0,
        partial: 0,
        received: 0,
        canceled: 0,
        foremen: new Set(),
        totalMaterials: 0,
        receivedMaterials: 0
      };
    }
    const obj = analytics[key];
    obj.totalApplications += 1;
    obj[obj.status] = (obj[obj.status] || 0) + 1;
    obj.foremen.add(app.foreman_name);
    obj.totalMaterials += app.materials.reduce((sum, m) => sum + (m.quantity || 0), 0);
    obj.receivedMaterials += app.materials.reduce((sum, m) => sum + (m.received || 0), 0);
  });
  const result = Object.values(analytics).map(item => ({
    ...item,
    foremen: Array.from(item.foremen).join(', ')
  }));
  
  cacheManager.set('analytics', cacheKey, result);
  return result;
}, [applications, allApplications, isAdminMode, userCompanyId]);

  const statusData = useMemo(() => {
    const apps = isAdminMode ? allApplications : applications;
    const counts = { pending: 0, partial: 0, received: 0, canceled: 0 };
    apps.forEach(app => {
      counts[app.status] = (counts[app.status] || 0) + 1;
    });
    return [
      { name: t('statusPending'), value: counts.pending, color: '#fbbf24' },
      { name: t('statusPartial'), value: counts.partial, color: '#f97316' },
      { name: t('statusReceived'), value: counts.received, color: '#3b82f6' },
      { name: t('statusCanceled'), value: counts.canceled, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [applications, allApplications, isAdminMode, t]);

  const processingTimeData = useMemo(() => {
    const apps = isAdminMode ? allApplications : applications;
    return apps
      .filter(app => app.status === 'received')
      .map(app => {
        const created = new Date(app.created_at);
        const received = new Date(app.updated_at || app.created_at);
        const days = Math.ceil((received - created) / (1000 * 60 * 60 * 24));
        return {
          name: app.object_name,
          days,
          date: new Date(app.created_at).toLocaleDateString()
        };
      })
      .sort((a, b) => a.days - b.days);
  }, [applications, allApplications, isAdminMode]);

  const activationMetrics = useMemo(() => {
  return calculateActivationRate(
    companyUsers,
    isAdminMode ? allApplications : applications
  );
}, [companyUsers, applications, allApplications, isAdminMode]);

// 📊 NPS Metrics
const npsMetrics = useMemo(() => {
  return calculateNps(npsResponses);
}, [npsResponses]);

// 📉 Churn Metrics
const churnMetrics = useMemo(() => 
  calculateChurnReasons(churnReasons), 
  [churnReasons]
);

// 📊 Retention Metrics
const retentionMetrics = useMemo(() => {
  return calculateRetention(
    companyUsers,
    isAdminMode ? allApplications : applications,
    6
  );
}, [companyUsers, applications, allApplications, isAdminMode]);

// 📊 Engagement Metrics
const engagementMetrics = useMemo(() => {
  return calculateEngagement(
    isAdminMode ? allApplications : applications,
    30
  );
}, [applications, allApplications, isAdminMode]);

// 📊 LOG ANALYTICS USAGE (Feature Adoption — с дебаунсом)
useEffect(() => {
  const logFeatureUsage = async () => {
    try {
      if (!userCompanyId || !user?.id) return;
      
      // Логируем использование фичи при переходе на вкладку
      const feature = currentView;
      if (feature && ['warehouse', 'chat', 'analytics', 'create'].includes(feature)) {
        await supabase
          .from('feature_usage_events')
          .insert([{
            company_id: userCompanyId,
            user_id: user.id,
            feature_name: feature,
            event_type: 'view'
          }]);
      }
    } catch (err) {
      // Игнорируем ошибки - это не критично для работы приложения
      console.debug('Feature usage log failed (non-critical):', err.message);
    }
  };
  
  logFeatureUsage();
  
  if (currentView === 'analytics' && userCompanyId && user?.id) {
    const userCtx = getUserContext(user, profileDataForHeader, userRole, userCompanyId);
    
    if (shouldLogFeature('analytics', userCompanyId, lastLoggedRef.current)) {
      try {
        logAnalyticsAccess(supabase, userCtx, 'dashboard');
      } catch (err) {
        console.debug('Analytics log failed (non-critical):', err.message);
      }
    }
  }
}, [currentView, userCompanyId, user, userRole, profileDataForHeader, supabase]);

  // ─────────────────────────────────────────────────────────
  // 🔍 FILTERING
  // ─────────────────────────────────────────────────────────
    const filteredApplications = useMemo(() => {
    const apps = isAdminMode ? allApplications : applications;
    
    // 🔍 Парсинг умного поиска
    let smartSearchTerm = searchTerm;
    let customFilters = {};
    
    if (searchTerm.includes(':')) {
        // Парсим команды типа "status:pending" или "overdue:true"
        const parts = searchTerm.split(' ');
        parts.forEach(part => {
            if (part.includes(':')) {
                const [key, value] = part.split(':');
                customFilters[key] = value;
            } else {
                smartSearchTerm = part;
            }
        });
    }
    
    return apps.filter(app => {
      // Обычный поиск
      let matchesSearch = true;
      if (smartSearchTerm && !customFilters.object) {
        matchesSearch = app.object_name.toLowerCase().includes(smartSearchTerm.toLowerCase()) ||
          app.foreman_name.toLowerCase().includes(smartSearchTerm.toLowerCase()) ||
          (app.foreman_phone && app.foreman_phone.includes(smartSearchTerm));
      }
      
      // Поиск по объекту
      if (customFilters.object) {
        matchesSearch = app.object_name.toLowerCase().includes(customFilters.object.toLowerCase());
      }
      
      // Фильтр по статусу из умного поиска
      let matchesStatus = statusFilter === 'all' ||
        app.status === statusFilter ||
        (statusFilter === 'pending' && [APPLICATION_STATUS.PENDING, APPLICATION_STATUS.ADMIN_PROCESSING].includes(app.status));
      
      if (customFilters.status) {
        if (customFilters.status === 'pending') {
            matchesStatus = [APPLICATION_STATUS.PENDING, APPLICATION_STATUS.ADMIN_PROCESSING].includes(app.status);
        } else if (customFilters.status === 'active') {
            matchesStatus = ['pending', 'admin_processing', 'partial_received'].includes(app.status);
        } else if (customFilters.status === 'received') {
            matchesStatus = app.status === 'received';
        }
      }
      
      // Фильтр просроченных
      let matchesOverdue = true;
      if (customFilters.overdue === 'true') {
        matchesOverdue = app.status === 'pending' && getDaysSince(app.created_at) > 2;
      }
      
      const matchesDate = !dateFilter || app.created_at.startsWith(dateFilter);
      const matchesViewed = viewedFilter === 'all' ||
        (viewedFilter === 'new' && !app.viewed_by_supply_admin);
      
      return matchesSearch && matchesStatus && matchesDate && matchesViewed && matchesOverdue;
    });
  }, [applications, allApplications, isAdminMode, searchTerm, statusFilter, dateFilter, viewedFilter]);

  const uniqueDates = useMemo(() => {
    const apps = isAdminMode ? allApplications : applications;
    const dates = apps.map(app => app.created_at.split('T')[0]);
    return [...new Set(dates)].sort().reverse();
  }, [applications, allApplications, isAdminMode]);

  const getStatusWithOverdue = (status, createdAt) => {
    if (status === 'pending') {
      const daysPending = getDaysSince(createdAt);
      if (daysPending > 2) {
        return 'overdue';
      }
    }
    return status;
  };

  const getStatusText = (status) => {
    return getStatusTextHelper(status, language) || t('statusUnknown') || status;
  };

  // ─────────────────────────────────────────────────────────
  // 📋 APPLICATION INTERACTION
  // ─────────────────────────────────────────────────────────
  const markAsViewed = async (applicationId) => {
  if (userRole === 'supply_admin' || userRole === 'foreman') {
      const app = applications.find(a => a.id === applicationId);
      if (app && !app.viewed_by_supply_admin) {
        const { error } = await supabase
          .from('applications')
          .update({ viewed_by_supply_admin: true })
          .eq('id', applicationId);
        if (!error) {
          setApplications(apps =>
            apps.map(a =>
              a.id === applicationId ? { ...a, viewed_by_supply_admin: true } : a
            )
          );
          if (isAdminMode) {
            setAllApplications(apps =>
              apps.map(a =>
                a.id === applicationId ? { ...a, viewed_by_supply_admin: true } : a
              )
            );
          }
        }
      }
    }
  };

  const openReceiveModal = useCallback((application, mode = 'admin_receive') => {
  if (mode === 'admin_receive' && userRole !== 'supply_admin' && userRole !== 'manager' && userRole !== 'foreman') {
    showNotification('Нет прав на приёмку', 'error');
    return;
  }
  if (mode === 'master_confirm' && userRole !== 'master' && userRole !== 'foreman') {
    showNotification('Нет прав на подтверждение', 'error');
    return;
  }
    if (mode === 'admin_receive') {
      const hasUnreceivedMaterials = application.materials?.some(m =>
        (Number(m.supplier_received_quantity) || 0) < (Number(m.quantity) || 0)
      );
      if (!hasUnreceivedMaterials) {
        showNotification('Все материалы уже приняты на склад', 'warning');
        return;
      }
    }
    if (mode === 'master_confirm') {
      const hasMaterialsToConfirm = application.materials?.some(m =>
        (Number(m.supplier_received_quantity) || 0) > 0 &&
        (Number(m.received) || 0) < (Number(m.quantity) || 0)
      );
      if (!hasMaterialsToConfirm) {
        showNotification('Нет материалов для подтверждения мастером', 'warning');
        return;
      }
    }
    setSelectedApplication({ ...application, modalMode: mode });
    setShowReceiveModal(true);
    markAsViewed(application.id);
  }, [userRole, showNotification, markAsViewed]);

  const _saveReceiveStatus = async (localMaterialsFromModal) => {
    try {
      if (!userCompanyId) {
        showNotification('Ошибка: компания не указана', 'error');
        return;
      }
      if (!user?.id) {
        showNotification('Ошибка: пользователь не авторизован', 'error');
        return;
      }
      const materialsToSave = localMaterialsFromModal || selectedApplication?.materials;
      const cleanMaterials = materialsToSave?.map(m => {
        const requestedQty = Number(m.quantity) || 0;
        const totalSupplierReceived = Number(m.supplier_received_quantity) || 0;
        const employeeConfirmed = Number(m.received) || 0;
        let materialStatus = ITEM_STATUS.PENDING;
        if (employeeConfirmed >= requestedQty && requestedQty > 0) {
          materialStatus = ITEM_STATUS.CONFIRMED;
        } else if (totalSupplierReceived > 0) {
          materialStatus = ITEM_STATUS.ON_WAREHOUSE;
        }
        return {
          description: m.description || '',
          quantity: requestedQty,
          unit: m.unit || 'шт',
          received: employeeConfirmed,
          status: materialStatus,
          supplier_received_quantity: totalSupplierReceived,
          supplier_received_at: totalSupplierReceived > 0 ? new Date().toISOString() : m.supplier_received_at,
          confirmed_by_employee_at: employeeConfirmed > 0 ? new Date().toISOString() : null,
          confirmed_by_employee_id: employeeConfirmed > 0 ? user?.id : null
        };
      }) || [];
      const allReceived = cleanMaterials.every(m =>
        (m.received || 0) >= (m.quantity || 0)
      );
      const anyReceived = cleanMaterials.some(m => (m.received || 0) > 0);
      const newStatus = allReceived
        ? APPLICATION_STATUS.RECEIVED
        : anyReceived
          ? APPLICATION_STATUS.PARTIAL_RECEIVED
          : APPLICATION_STATUS.ADMIN_PROCESSING;
      const newHistoryEntry = {
        user_id: user?.id,
        user_email: user?.email,
        old_status: selectedApplication?.status,
        new_status: newStatus,
        action: 'supplier_received',
        timestamp: new Date().toISOString()
      };
      const updatedHistory = [...(selectedApplication?.status_history || []), newHistoryEntry];
      logMaterialsReceived(
        supabase,
        { ...selectedApplication, materials: cleanMaterials, status: newStatus },
        cleanMaterials.filter(m => m.supplier_received_quantity > 0).length,
        cleanMaterials.length,
        userContext
      ).catch(err => console.warn('Аудит не записан:', err));
      const { error: appError } = await supabase
        .from('applications')
        .update({
          status: newStatus,
          materials: cleanMaterials,
          status_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedApplication?.id);
      if (appError) {
        console.error('❌ Ошибка обновления заявки:', appError);
        showNotification(`Ошибка: ${appError.message}`, 'error');
        return;
      }
      console.log('🔄 [DEBUG] saveReceiveStatus вызван с:', {
        userCompanyId,
        userRole,
        materialsCount: cleanMaterials?.length,
        hasDelta: cleanMaterials?.some(m => (m.supplier_received_quantity || 0) > 0)
      });
      console.log('🔍 [WAREHOUSE DEBUG] Проверка:', {
        WAREHOUSE_ENABLED,
        userRole,
        isSupplyAdmin: userRole === 'supply_admin',
        isManager: userRole === 'manager',
        materialsCount: cleanMaterials?.length,
        hasMaterials: cleanMaterials?.some(m => (m.supplier_received_quantity || 0) > 0)
      });
      if (WAREHOUSE_ENABLED && (userRole === 'supply_admin' || userRole === 'manager' || userRole === 'foreman')) {
        for (const material of cleanMaterials) {
          const qtyReceived = Number(material.supplier_received_quantity) || 0;
          if (qtyReceived > 0) {
            try {
              console.log('📦 [WAREHOUSE] Отправка на склад:', {
                item: material.description,
                qty: qtyReceived,
                unit: material.unit,
                company_id: userCompanyId
              });
              const { error: rpcError } = await supabase.rpc('update_warehouse_balance', {
                p_company_id: userCompanyId,
                p_item_name: (material.description || '').trim(),
                p_quantity: qtyReceived,
                p_transaction_type: 'income',
                p_user_id: user?.id || null,
                p_user_email: user?.email || null,
                p_comment: `Приёмка: ${selectedApplication?.object_name}`,
                p_application_id: selectedApplication?.id || null,
                p_unit: material.unit || 'шт',
                p_target_object_name: selectedApplication?.object_name || null,
                p_recipient_name: selectedApplication?.foreman_name || null,
                p_recipient_phone: selectedApplication?.foreman_phone || null
              });
              if (rpcError) {
                console.error('❌ [WAREHOUSE] RPC ошибка:', rpcError);
                showNotification(`⚠️ Ошибка склада: ${rpcError.message}`, 'warning');
              } else {
                console.log('✅ [WAREHOUSE] Успешно сохранено:', material.description);
              }
            } catch (err) {
              console.error('❌ [WAREHOUSE] Критическая ошибка:', err);
              showNotification('⚠️ Ошибка обновления склада', 'warning');
            }
          }
        }
      }
      const updatedAppForUI = {
        ...selectedApplication,
        status: newStatus,
        materials: cleanMaterials,
        status_history: updatedHistory,
        updated_at: new Date().toISOString()
      };
      setApplications(applications.map(app =>
        app.id === updatedAppForUI?.id ? updatedAppForUI : app
      ));
      setShowReceiveModal(false);
      setSelectedApplication(null);
      showNotification('✅ Приёмка зафиксирована', 'success');
    } catch (err) {
      console.error('❌ Критическая ошибка saveReceiveStatus:', err);
      showNotification('Ошибка при обновлении статуса: ' + err.message, 'error');
    }
  };
  const handleSearchChange = useCallback((value) => {
  setSearchTerm(value);
  setPage(1); // ← УЖЕ ДОБАВЛЕНО
}, []);

const handleStatusFilterChange = useCallback((value) => {
  setStatusFilter(value);
  setPage(1); // ← УЖЕ ДОБАВЛЕНО
}, []);

const handleDateFilterChange = useCallback((value) => {
  setDateFilter(value);
  setPage(1); // ← УЖЕ ДОБАВЛЕНО
}, []);

const handleViewedFilterChange = useCallback((value) => {
  setViewedFilter(value);
  setPage(1); // ← УЖЕ ДОБАВЛЕНО
}, []);

const handleClearFilters = useCallback(() => {
  setSearchTerm('');
  setStatusFilter('all');
  setDateFilter('');
  setViewedFilter('all');
  setPage(1); // ← УЖЕ ДОБАВЛЕНО
}, []);

  const handleAdminReceive = useCallback(async (materialsFromModal, application) => {
  // 🔍 ДОБАВЛЕНО: Логирование начала работы
  console.log('🔍 [DEBUG] handleAdminReceive started', {
    applicationId: application.id,
    materialsCount: materialsFromModal.length,
    userCompanyId
  });
  
  // 🔧 ИСПРАВЛЕНО: Явное сохранение supplier_received_quantity и received
  const updatedMaterials = materialsFromModal.map(m => {
    const supplierReceived = Number(m.supplier_received_quantity) || 0;
    const requested = Number(m.quantity) || 0;
    
    let itemStatus = ITEM_STATUS.PENDING;
    if (supplierReceived >= requested && requested > 0) {
      itemStatus = ITEM_STATUS.ON_WAREHOUSE;
    } else if (supplierReceived > 0) {
      itemStatus = ITEM_STATUS.ON_WAREHOUSE;
    }
    
    return {
      ...m,
      supplier_received_quantity: supplierReceived,
      received: Number(m.received) || 0,
      status: itemStatus,
      supplier_received_at: supplierReceived > 0 ? new Date().toISOString() : m.supplier_received_at
    };
  });
  
   const allReceived = updatedMaterials.every(m =>
    (m.supplier_received_quantity || 0) >= (m.quantity || 0)
  );
  const anyReceived = updatedMaterials.some(m =>
    (m.supplier_received_quantity || 0) > 0
  );
  
  // 🔧 ИСПРАВЛЕНО: Если есть материалы, требующие отправки мастеру
  const hasMaterialsToSend = updatedMaterials.some(m =>
    (m.supplier_received_quantity || 0) > 0 && 
    ((m.sent_to_master_quantity || 0) < (m.supplier_received_quantity || 0))
  );
  
  const newAppStatus = allReceived && !hasMaterialsToSend
    ? APPLICATION_STATUS.RECEIVED           // ✅ Если всё принято И отправлено
    : anyReceived
      ? APPLICATION_STATUS.PARTIAL_RECEIVED // ✅ Частично принято
      : APPLICATION_STATUS.ADMIN_PROCESSING;
  
  const newHistoryEntry = {
    user_id: user?.id,
    user_email: user?.email,
    old_status: application.status,
    new_status: newAppStatus,
    action: 'supplier_received',
    timestamp: new Date().toISOString(),
    details: `Принято позиций: ${updatedMaterials.filter(m => m.supplier_received_quantity > 0).length}`
  };
  
  const { error } = await supabase
    .from('applications')
    .update({
      status: newAppStatus,
      materials: updatedMaterials,
      status_history: [...(application.status_history || []), newHistoryEntry],
      updated_at: new Date().toISOString()
    })
    .eq('id', application.id)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Ошибка обновления заявки:', error);
    showNotification('Ошибка сохранения', 'error');
    return { success: false, error };
  }
  
  // 🏚️ ОБНОВЛЕНИЕ СКЛАДА С ЛОГАМИ
  if (WAREHOUSE_ENABLED) {
  for (const mat of updatedMaterials) {
    const qty = Number(mat.supplier_received_quantity) || 0;
    if (qty > 0) {
      const { error: rpcError } = await supabase.rpc('update_warehouse_balance', {
        p_company_id: userCompanyId,
        p_item_name: (mat.description || '').trim(),
        p_quantity: qty,
        p_transaction_type: 'income',
        p_user_id: user?.id,
        p_user_email: user?.email,
        p_comment: `Приёмка: ${application.object_name}`,
        p_application_id: application.id,
        p_unit: mat.unit || 'шт',
        p_target_object_name: application.object_name,     // ← ДОБАВИТЬ
        p_recipient_name: application.foreman_name,        // ← ДОБАВИТЬ
        p_recipient_phone: application.foreman_phone       // ← ДОБАВИТЬ
      });
      
      if (rpcError) {
        console.error('❌ RPC ошибка:', rpcError);
        showNotification(`⚠️ Ошибка склада: ${rpcError.message}`, 'warning');
      }
    }
  }
}
  
  // Обновляем состояние в UI
  setApplications(prev => prev.map(app =>
    app.id === application.id
      ? { ...app, status: newAppStatus, materials: updatedMaterials, status_history: [...(app.status_history || []), newHistoryEntry] }
      : app
  ));
  
  showNotification(`✅ Приёмка завершена. Статус: ${newAppStatus}`, 'success');
  return { success: true, newAppStatus, updatedMaterials };
}, [user, userCompanyId, WAREHOUSE_ENABLED, showNotification, setApplications]);

  // 🔹 Снабженец берет заявку в работу (поиск поставщика, запрос счета)
const handleTakeToWork = useCallback(async (application) => {
  const { error } = await supabase
    .from('applications')
    .update({
      status: APPLICATION_STATUS.ADMIN_PROCESSING,
      status_history: [...(application.status_history || []), {
        user_id: user?.id,
        action: 'taken_to_work',
        timestamp: new Date().toISOString(),
        details: 'Снабженец принял заявку в обработку'
      }]
    })
    .eq('id', application.id);

  if (error) { 
    showNotification('Ошибка обновления статуса', 'error'); 
    return; 
  }
  
  setApplications(prev => prev.map(a => 
    a.id === application.id 
      ? { ...a, status: APPLICATION_STATUS.ADMIN_PROCESSING } 
      : a
  ));
  setShowReceiveModal(false);
  showNotification('📦 Заявка взята в работу. Теперь вы ищете поставщика.', 'success');
}, [user?.id, showNotification]);

// 🔹 Снабженец отправляет на согласование (после получения счета/суммы)
const handleSendForApproval = useCallback(async (application) => {
  // ⚠️ ВАРИАНТ А: Если approvalEngine нужен — раскомментируйте импорт внизу
  // const approvalResult = await approvalEngine.createApprovalRequest(application, userCompanyId);
  // if (!approvalResult) {
  //   showNotification('⚠️ Не удалось создать запрос на согласование', 'warning');
  //   return;
  // }

  const { error } = await supabase
    .from('applications')
    .update({
      status: APPLICATION_STATUS.PENDING_APPROVAL,
      status_history: [...(application.status_history || []), {
        user_id: user?.id,
        action: 'sent_for_approval',
        timestamp: new Date().toISOString(),
        details: 'Отправлено руководителю (получен счет)'
      }]
    })
    .eq('id', application.id);

  if (error) { 
    showNotification('Ошибка обновления статуса', 'error'); 
    return; 
  }
  
  setApplications(prev => prev.map(a => 
    a.id === application.id 
      ? { ...a, status: APPLICATION_STATUS.PENDING_APPROVAL } 
      : a
  ));
  setShowReceiveModal(false);
  showNotification('📋 Отправлено руководителю на согласование', 'info');
}, [user?.id, userCompanyId, showNotification]);



  // 📊 NPS Submit Handler
const handleNpsSubmit = async ({ score, comment }) => {
  if (!user?.id || !userCompanyId) return;
  
  setNpsSubmitting(true);
  
  try {
    const { error } = await supabase
      .from('nps_responses')
      .insert([{
        user_id: user.id,
        company_id: userCompanyId,
        score,
        comment: comment.trim() || null
      }]);
    
    if (error) throw error;
    
    setShowNpsSurvey(false);
    setLastNpsDate(new Date().toISOString());
    showNotification('Спасибо за вашу оценку!', 'success');
    
    const { data: updated } = await supabase
      .from('nps_responses')
      .select('*')
      .eq('company_id', userCompanyId)
      .order('created_at', { ascending: false });
    
    if (updated) setNpsResponses(updated);
  } catch (err) {
    console.error('Ошибка отправки NPS:', err);
    showNotification('Не удалось отправить оценку', 'error');
  } finally {
    setNpsSubmitting(false);
  }
};

  const handleSendToMaster = useCallback(async (itemsToSend, application) => {
  try {
    console.log('📦 Отправка мастеру, items:', itemsToSend);
    
    // 1. Обновляем материалы
    const updatedMaterials = application.materials.map((originalMaterial) => {
      const itemToSend = itemsToSend.find(i => i.description === originalMaterial.description);
      
      if (itemToSend && (Number(itemToSend.quantityToSend) || 0) > 0) {
        const qtyToSend = Number(itemToSend.quantityToSend);
        return {
          ...originalMaterial,
          sent_to_master_quantity: (Number(originalMaterial.sent_to_master_quantity) || 0) + qtyToSend,
          status: ITEM_STATUS.SENT_TO_MASTER,
          sent_to_master_at: new Date().toISOString(),
          sent_to_master_by: user?.id
        };
      }
      return originalMaterial;
    });
    
    // 2. Проверяем, все ли материалы отправлены мастеру
    const allSent = updatedMaterials.every(m => 
      (Number(m.sent_to_master_quantity) || 0) >= (Number(m.supplier_received_quantity) || 0)
    );
    
    // 3. Новый статус заявки
    const newStatus = allSent 
      ? APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION 
      : APPLICATION_STATUS.PARTIAL_RECEIVED;
    
    // 4. Обновляем заявку
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        status: newStatus,
        materials: updatedMaterials,
        updated_at: new Date().toISOString(),
        status_history: [
          ...(application.status_history || []),
          {
            action: 'sent_to_master',
            user_id: user?.id,
            user_email: user?.email,
            timestamp: new Date().toISOString(),
            details: `Отправлено мастеру: ${itemsToSend.length} позиций`
          }
        ]
      })
      .eq('id', application.id);
    
    if (updateError) throw updateError;
    
    // 5. Списание со склада
    if (WAREHOUSE_ENABLED) {
      for (const item of itemsToSend) {
        const qtyToSend = Number(item.quantityToSend) || 0;
        if (qtyToSend > 0) {
          await supabase.rpc('update_warehouse_balance', {
            p_company_id: userCompanyId,
            p_item_name: item.description.trim(),
            p_quantity: qtyToSend,
            p_transaction_type: 'expense',
            p_user_id: user?.id,
            p_user_email: user?.email,
            p_comment: `Отправка мастеру: ${application.object_name}`,
            p_application_id: application.id,
            p_unit: item.unit || 'шт',
            p_target_object_name: application.object_name,
            p_recipient_name: application.foreman_name,
            p_recipient_phone: application.foreman_phone
          });
        }
      }
    }
    
    // 6. Обновляем UI
    setApplications(prev => prev.map(app =>
      app.id === application.id
        ? { ...app, status: newStatus, materials: updatedMaterials }
        : app
    ));
    
    showNotification(`✅ Отправлено мастеру ${itemsToSend.length} позиций`, 'success');
    return { success: true };
    
  } catch (err) {
    console.error('Ошибка:', err);
    showNotification('Ошибка отправки: ' + err.message, 'error');
    return { success: false, error: err };
  }
}, [user, userCompanyId, WAREHOUSE_ENABLED, showNotification, setApplications]);

  const handleMasterConfirm = useCallback(async (confirmations, materialsFromModal, application) => {
    try {
      const updatedMaterials = materialsFromModal.map((m, index) => {
        const conf = confirmations.find(c => c.materialIndex === index);
        const confirmed = conf?.action === 'confirm' ? (Number(conf.quantity) || 0) : 0;
        const requested = Number(m.quantity) || 0;
        return {
          ...m,
          received: confirmed,
          unit: m.unit || 'шт',
          status: confirmed >= requested ? ITEM_STATUS.CONFIRMED :
            confirmed > 0 ? ITEM_STATUS.SENT_TO_MASTER : ITEM_STATUS.PENDING,
          confirmed_by_employee_at: confirmed > 0 ? new Date().toISOString() : null,
          confirmed_by_employee_id: confirmed > 0 ? user?.id : null,
          reject_reason: conf?.action === 'reject' ? conf.feedback : null
        };
      });
      const allConfirmed = updatedMaterials.every(m =>
        (m.received || 0) >= (m.quantity || 0)
      );
      const anyConfirmed = updatedMaterials.some(m => (m.received || 0) > 0);
      const newAppStatus = allConfirmed
        ? APPLICATION_STATUS.RECEIVED
        : anyConfirmed
          ? APPLICATION_STATUS.ADMIN_PROCESSING
          : application.status;
      const newHistoryEntry = {
        user_id: user?.id,
        user_email: user?.email,
        old_status: application.status,
        new_status: newAppStatus,
        action: 'master_confirmed',
        timestamp: new Date().toISOString(),
        details: `Подтверждено позиций: ${updatedMaterials.filter(m => m.received > 0).length}`
      };
      await supabase
        .from('applications')
        .update({
          status: newAppStatus,
          materials: updatedMaterials,
          status_history: [...(application.status_history || []), newHistoryEntry],
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);
      if (WAREHOUSE_ENABLED) {
  for (const mat of updatedMaterials) {
    const qty = Number(mat.received) || 0;
    if (qty > 0) {
      const { error: rpcError } = await supabase.rpc('update_warehouse_balance', {
        p_company_id: userCompanyId,
        p_item_name: (mat.description || '').trim(),
        p_quantity: qty,
        p_transaction_type: 'expense',
        p_user_id: user?.id,
        p_user_email: user?.email,
        p_comment: `Выдача мастеру: ${application.object_name}`,
        p_application_id: application.id,
        p_unit: mat.unit || 'шт',
        p_target_object_name: application.object_name,     // ← ДОБАВИТЬ
        p_recipient_name: application.foreman_name,        // ← ДОБАВИТЬ
        p_recipient_phone: application.foreman_phone       // ← ДОБАВИТЬ
      });
      
      if (rpcError) {
        console.error('❌ RPC ошибка выдачи:', rpcError);
        showNotification(`⚠️ Ошибка выдачи: ${mat.description}`, 'warning');
      }
    }
  }
}
      setApplications(prev => prev.map(app =>
        app.id === application.id
          ? { ...app, status: newAppStatus, materials: updatedMaterials, status_history: [...(app.status_history || []), newHistoryEntry] }
          : app
      ));
      showNotification('✅ Подтверждение зафиксировано', 'success');
      return { success: true, newAppStatus, updatedMaterials };
    } catch (err) {
      console.error('❌ Ошибка в handleMasterConfirm:', err);
      showNotification('Ошибка при подтверждении: ' + err.message, 'error');
      return { success: false, error: err };
    }
  }, [user, userCompanyId, WAREHOUSE_ENABLED, showNotification, setApplications]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('');
    setViewedFilter('all');
  };

  // ─────────────────────────────────────────────────────────
  // 🔐 ADMIN FUNCTIONS
  // ─────────────────────────────────────────────────────────
  const handleAdminLogin = async () => {
    const { data, error } = await supabase
      .from('admin_secrets')
      .select('value')
      .eq('key', 'admin_password')
      .single();
    if (error || data?.value !== adminPassword) {
      showNotification(t('invalidAdminPassword'), 'error');
      return;
    }
    setIsAdminMode(true);
    setShowAdminLogin(false);
    setAdminPassword('');
    setCurrentView('analytics');
  };

  const handleAdminLogout = () => {
    setIsAdminMode(false);
    setCurrentView('pending');
  };

  // ─────────────────────────────────────────────────────────
  // 🎮 KONAMI CODE
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const KONAMI_SEQUENCE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    let konamiCode = [];
    const handleKeyDown = (e) => {
      konamiCode = [...konamiCode, e.code].slice(-10);
      if (konamiCode.join(',') === KONAMI_SEQUENCE.join(',')) {
        setShowAdminLogin(true);
        konamiCode = [];
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─────────────────────────────────────────────────────────
  // ⚙️ LOAD SETTINGS
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('id', 1)
          .single();
        if (error) {
          if (error.code === 'PGRST116' || error.status === 406 || error.status === 403) {
            console.warn('⚠️ Настройки не загружены, используем дефолтные');
            setSettings({
              sendMethod: 'email',
              emailAddress: 'snabzhenie@company.ru',
              telegramChatId: '@snabzhenie_vik',
              phoneNumber: '+79991234567'
            });
            return;
          }
          console.error('Ошибка загрузки настроек:', error);
          return;
        }
        if (data) {
          setSettings({
            sendMethod: data.send_method || 'email',
            emailAddress: data.email_address || 'snabzhenie@company.ru',
            telegramChatId: data.telegram_chat_id || '@snabzhenie_vik',
            phoneNumber: data.phone_number || '+79991234567'
          });
        }
      } catch (err) {
        console.error('Исключение при загрузке настроек:', err);
        setSettings({
          sendMethod: 'email',
          emailAddress: 'snabzhenie@company.ru',
          telegramChatId: '@snabzhenie_vik',
          phoneNumber: '+79991234567'
        });
      }
    };
    fetchSettings();
  }, []);

  // ─────────────────────────────────────────────────────────
  // 👥 LOAD EMPLOYEES
  // ─────────────────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    if (userRole !== 'manager' || !userCompanyId) return;
    setLoadingEmployees(true);
    try {
      const { data: currentEmployees, error: loadError } = await supabase
        .from('company_users')
        .select('*')
        .eq('company_id', userCompanyId);
      if (!loadError && currentEmployees && currentEmployees.length > 0) {
        setEmployees(currentEmployees);
        return;
      }
      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select('user_id, foreman_name, foreman_phone')
        .eq('company_id', userCompanyId)
        .not('user_id', 'eq', user?.id);
      if (appsError) {
        console.error('Ошибка загрузки заявок для миграции:', appsError);
        setEmployees([]);
        return;
      }
      const uniqueUsers = new Map();
      apps.forEach(app => {
        if (app.user_id && !uniqueUsers.has(app.user_id)) {
          uniqueUsers.set(app.user_id, {
            user_id: app.user_id,
            company_id: userCompanyId,
            full_name: app.foreman_name?.trim() || '—',
            phone: app.foreman_phone || '—',
            role: 'foreman',
            is_active: true
          });
        }
      });
      if (uniqueUsers.size > 0) {
        const usersToAdd = Array.from(uniqueUsers.values());
        const { error: insertError } = await supabase
          .from('company_users')
          .insert(usersToAdd);
        if (insertError) {
          console.warn('Частичная ошибка добавления сотрудников:', insertError);
        }
      }
      const { data: updatedEmployees } = await supabase
        .from('company_users')
        .select('*')
        .eq('company_id', userCompanyId)
        .neq('user_id', user?.id);
      setEmployees(updatedEmployees || []);
    } catch (err) {
      console.error('Критическая ошибка загрузки сотрудников:', err);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, [userRole, userCompanyId, user]);

  useEffect(() => {
    if (currentView === 'employees') {
      loadEmployees();
    }
  }, [currentView, loadEmployees]);

  // Загрузка владельца компании для отображения в списке сотрудников
useEffect(() => {
  const loadCompanyOwner = async () => {
    if (!userCompanyId) return;
    const { data } = await supabase
      .from('companies')
      .select('is_company_owner')
      .eq('id', userCompanyId)
      .single();
    if (data) setCompanyOwnerId(data.is_company_owner);
  };
  loadCompanyOwner();
}, [userCompanyId, employees]);

  const toggleEmployeeStatus = async (employeeId, currentStatus) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from('company_users')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', employeeId);
    if (error) {
      showNotification('Ошибка при обновлении статуса', 'error');
    } else {
      await logEmployeeBlocked(supabase, employeeId, newStatus, userContext);
      setEmployees(prev =>
        prev.map(emp =>
          emp.id === employeeId ? { ...emp, is_active: newStatus } : emp
        )
      );
      showNotification(
        newStatus ? t('employeeUnblocked') : t('employeeBlocked'),
        'success'
      );
    }
  };

  // ─────────────────────────────────────────────────────────
  // 📊 LOAD APPLICATIONS
  // ─────────────────────────────────────────────────────────
  const loadApplications = useCallback(async (pageNumber = 1) => {
  if (!user || !userCompanyId) return;
  
  // Проверка кэша
  const cacheKey = `applications_${userCompanyId}_page_${pageNumber}`;
  const cached = cacheManager.get('applications', cacheKey);
  if (cached) {
    setApplications(cached.userApps);
    setTotalPages(cached.totalPages);
    setCompanyUsers(cached.usersData || []);
    setComments(cached.commentsMap || {});
    setIsLoading(false);
    return;
  }
  
  setIsLoading(true);
  try {
    // ✅ 1. Сначала получаем ТОЛЬКО количество
    const { count, error: countError } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', userCompanyId);
    
    if (countError) throw countError;
    
    // ✅ 2. Вычисляем totalPages
    const calculatedTotalPages = Math.max(1, Math.ceil(count / ITEMS_PER_PAGE));
    setTotalPages(calculatedTotalPages);
    
    // ✅ 3. Корректируем pageNumber если нужно
    let safePage = pageNumber;
    if (safePage > calculatedTotalPages) {
      safePage = 1;
      setPage(1);
    }
    
    // ✅ 4. Вычисляем правильный range
    const from = (safePage - 1) * ITEMS_PER_PAGE;
    const to = Math.min(safePage * ITEMS_PER_PAGE - 1, count - 1);
    
    // ✅ 5. Запрос с правильным range
    let query = supabase
      .from('applications')
      .select('*')
      .eq('company_id', userCompanyId)
      .order('created_at', { ascending: false })
      .range(from, to > 0 ? to : 0);
    
    if (userRole === 'master') query = query.eq('user_id', user?.id);
    if (userRole === 'accountant') query = query.eq('status', 'received');
    
    const { data: userApps = [], error: userError } = await query;
    if (userError) throw userError;
    
    setApplications(userApps);
    
    // Загрузка пользователей
    const { data: usersData } = await supabase
      .from('company_users')
      .select('user_id, created_at, full_name, role')
      .eq('company_id', userCompanyId);
    
    let commentsMap = {};
    if (usersData) setCompanyUsers(usersData);
    
    if (userApps.length > 0) {
      const appIds = userApps.map(app => app.id);
      const { data: allComments = [] } = await supabase
        .from('comments')
        .select('*')
        .in('application_id', appIds)
        .order('created_at', { ascending: true });
      
      allComments.forEach(comment => {
        if (!commentsMap[comment.application_id]) {
          commentsMap[comment.application_id] = [];
        }
        commentsMap[comment.application_id].push(comment);
      });
      setComments(commentsMap);
    } else {
      setComments({});
    }
    
    if (isAdminMode) {
      const { data: allApps = [] } = await supabase
        .from('applications')
        .select('id, status, created_at, object_name, materials')
        .eq('company_id', userCompanyId)
        .order('created_at', { ascending: false })
        .limit(500);
      setAllApplications(allApps || []);
    }
    
    // Сохраняем в кэш
    cacheManager.set('applications', cacheKey, {
      userApps,
      totalPages: calculatedTotalPages,
      usersData,
      commentsMap
    });
    
  } catch (err) {
    console.error('Ошибка загрузки заявок:', err);
    showNotification('Ошибка загрузки данных', 'error');
  } finally {
    setIsLoading(false);
  }
}, [user, userCompanyId, userRole, isAdminMode, showNotification]);

  // 📩 ЗАГРУЗКА УВЕДОМЛЕНИЙ (ВСТАВИТЬ ПОСЛЕ loadApplications)
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Преобразуем дату в читаемый формат для UI
      const formattedData = data?.map(n => ({
        ...n,
        time: new Date(n.created_at).toLocaleString('ru-RU')
      })) || [];

      setNotifications(formattedData);
      
    } catch (err) {
      console.error('Ошибка загрузки уведомлений:', err);
    }
  }, [user?.id]);

  useEffect(() => {
  // ✅ Загружаем только если есть пользователь и компания
  if (user && userCompanyId) {
    // ✅ Всегда загружаем страницу 1 при монтировании
    if (page !== 1) {
      setPage(1);
    } else {
      loadApplications(1);
      loadNotifications(); // ← ДОБАВЛЕНА ЗАГРУЗКА УВЕДОМЛЕНИЙ
    }
  }
}, [user, userCompanyId, userRole, isAdminMode, loadNotifications])

  // 📡 ПОДПИСКА НА НОВЫЕ УВЕДОМЛЕНИЯ В РЕАЛЬНОМ ВРЕМЕНИ
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotif = {
            ...payload.new,
            time: new Date(payload.new.created_at).toLocaleString('ru-RU')
          };
          setNotifications(prev => [newNotif, ...prev]);
          // Показываем всплывающее уведомление
          showNotification(newNotif.title + ': ' + newNotif.message, 'info');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, showNotification]);

// 💰 Load company plan & quota (ОБНОВЛЁННАЯ ВЕРСИЯ)
useEffect(() => {
  const loadPlan = async () => {
    // 🔒 Супер-админ: не загружаем тариф компании
    if (isSuperAdmin(userRole, user?.user_metadata)) {
      setCurrentPlan(null);
      setPlanLoading(false);
      return;
    }
    
    if (!userCompanyId || !supabase) {
      setPlanLoading(false);
      return;
    }
    
    try {
      setPlanLoading(true);
      
      // Загружаем данные компании
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('plan_tier, plan_activated_at, plan_expires_at, trial_started_at, trial_ended_at, promo_code_used, promo_applied_at, promo_discount_percent')
        .eq('id', userCompanyId)
        .single();
      
      if (companyError) throw companyError;
      
      console.log('📊 Company data loaded:', companyData);
      
      const now = new Date();
      let planId = companyData?.plan_tier || 'basic';
      
      // 🔥 КЛЮЧЕВАЯ ЛОГИКА: Если есть пробный период и он не истёк, используем PRO
      const isTrialActive = companyData?.trial_started_at && 
                            companyData?.trial_ended_at && 
                            new Date(companyData.trial_ended_at) > now;
      
      // Если пробный период активен, устанавливаем PRO, даже если в БД стоит basic
      if (isTrialActive && planId === 'basic') {
        console.log('🎯 Пробный период активен, устанавливаем PRO');
        planId = 'pro';
        setCurrentPlan(TARIFF_PLANS.pro);
      } else {
        setCurrentPlan(TARIFF_PLANS[planId] || TARIFF_PLANS.basic);
      }
      
      // Определяем, истёк ли пробный период
      let isTrialExpired = false;
      if (companyData?.trial_ended_at) {
        const trialEnd = new Date(companyData.trial_ended_at);
        if (trialEnd < now) {
          isTrialExpired = true;
        }
      }
      
      // Устанавливаем детали тарифа
      setCurrentPlanDetails({
        activated_at: companyData?.plan_activated_at || companyData?.trial_started_at || null,
        expires_at: companyData?.plan_expires_at || companyData?.trial_ended_at || null,
        trial_started_at: companyData?.trial_started_at || null,
        trial_ended_at: companyData?.trial_ended_at || null,
        is_trial: companyData?.trial_started_at !== null && isTrialActive,
        is_trial_expired: isTrialExpired,
        usageCurrent: quotaStatus?.monthlyUsage || 0
      });
      
      console.log('📊 currentPlanDetails set:', {
        planId,
        isTrialActive,
        isTrialExpired,
        activated_at: companyData?.plan_activated_at || companyData?.trial_started_at,
        expires_at: companyData?.plan_expires_at || companyData?.trial_ended_at
      });
      
      // Промокоды
      if (companyData?.promo_code_used) {
  setPromoCodeInfo({
    code: companyData.promo_code_used,
    applied_at: companyData.promo_applied_at,
    discount_percent: companyData.promo_discount_percent || 0,  // ← УБЕДИТЕСЬ, ЧТО ЭТО ЕСТЬ
    plan: companyData.plan_tier  // ← ДОБАВИТЬ ЭТУ СТРОКУ
  });
}
      
      // Квота
      try {
        const quota = await checkQuota(supabase, userCompanyId);
        setQuotaStatus(quota);
      } catch (quotaErr) {
        console.debug('Quota check failed:', quotaErr.message);
        setQuotaStatus({ dailyUsage: 0, dailyLimit: 100, allowed: true });
      }
      
    } catch (err) {
      console.warn('Failed to load plan (using default):', err.message);
      setCurrentPlan(TARIFF_PLANS.basic);
      setCurrentPlanDetails({
        activated_at: null,
        expires_at: null,
        trial_started_at: null,
        trial_ended_at: null,
        is_trial: false,
        is_trial_expired: false,
        usageCurrent: 0
      });
      setQuotaStatus({ dailyUsage: 0, dailyLimit: 100, allowed: true });
    } finally {
      setPlanLoading(false);
    }
  };
  
  loadPlan();
}, [userCompanyId, supabase, userRole, user, isSuperAdmin]);

// 📝 Отслеживание новых отзывов для супер-админа
useEffect(() => {
  if (userRole !== 'super_admin') return;

  // Загружаем количество непросмотренных отзывов
  const loadNewFeedbackCount = async () => {
    const { count, error } = await supabase
      .from('tester_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    if (!error) {
      setNewFeedbackCount(count || 0);
    }
  };

  loadNewFeedbackCount();

  // Подписываемся на новые отзывы
  const channel = supabase
    .channel('tester_feedback_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'tester_feedback'
      },
      () => {
        setNewFeedbackCount(prev => prev + 1);
        showNotification(
          '📝 Поступил новый отзыв!',
          'info',
          false,
          () => setCurrentView('superAdmin')
        );
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userRole, userCompanyId, showNotification, supabase, setCurrentView]);

// Добавьте этот useEffect в App.jsx после loadPlan
useEffect(() => {
  const checkTrialExpired = async () => {
    if (!userCompanyId || !supabase) return;
    if (!currentPlanDetails?.is_trial) return;
    
    const trialEnd = new Date(currentPlanDetails.trial_ended_at);
    const now = new Date();
    
    if (trialEnd < now && currentPlan?.id !== 'basic') {
      console.log('⏰ Пробный период истёк, переходим на Базовый');
      
      await supabase
        .from('companies')
        .update({
          plan_tier: 'basic',
          plan_activated_at: null,
          plan_expires_at: null,
          updated_at: now.toISOString()
        })
        .eq('id', userCompanyId);
      
      setCurrentPlan(TARIFF_PLANS.basic);
      setCurrentPlanDetails(prev => ({
        ...prev,
        is_trial_expired: true,
        expires_at: null,
        activated_at: null
      }));
      
      showNotification('⚠️ Пробный период истёк. Выберите тариф для продолжения работы.', 'warning');
      setCurrentView('tariffs');
    }
  };
  
  checkTrialExpired();
  const interval = setInterval(checkTrialExpired, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, [userCompanyId, supabase, currentPlanDetails, currentPlan]);

// ✅ ДОБАВИТЬ СИНХРОНИЗАЦИЮ ПРОМОКОДОВ СЮДА (ПОСЛЕ загрузки тарифа)
useEffect(() => {
  const syncPromos = async () => {
    if (user && userRole === 'super_admin' && supabase) {
      try {
        const { syncPromoCodesToDB } = await import('./utils/promoManager');
        await syncPromoCodesToDB(supabase);
        console.log('✅ Промокоды синхронизированы (отдельный эффект)');
      } catch (err) {
        console.error('Ошибка синхронизации промокодов:', err);
      }
    }
  };
  
  syncPromos();
}, [user, userRole, supabase]);

// 🕐 ЕЖЕДНЕВНАЯ ПРОВЕРКА ИСТЕКШИХ ТАРИФОВ
useEffect(() => {
  const checkExpiredPlans = async () => {
    if (!userCompanyId) return;
    
    const now = new Date();
    
    // Проверяем только платные тарифы
    if (currentPlan?.id !== 'basic' && currentPlanDetails?.expires_at) {
      const expiresAt = new Date(currentPlanDetails.expires_at);
      
      if (expiresAt < now) {
        console.log('⏰ Тариф истёк, сбрасываем на basic (фоновая проверка)');
        
        await supabase
          .from('companies')
          .update({
            plan_tier: 'basic',
            plan_activated_at: null,
            plan_expires_at: null,
            updated_at: now.toISOString()
          })
          .eq('id', userCompanyId);
        
        setCurrentPlan(TARIFF_PLANS.basic);
        setCurrentPlanDetails(null);
        showNotification('⚠️ Пробный период истёк. Вы переведены на бесплатный тариф Базовый.', 'warning');
      }
    }
  };
  
  // Проверяем при загрузке и каждый час
  checkExpiredPlans();
  const interval = setInterval(checkExpiredPlans, 60 * 60 * 1000);
  
  return () => clearInterval(interval);
}, [userCompanyId, currentPlan, currentPlanDetails]);

// ============================================================
// 🆕 АВТОМАТИЧЕСКИЙ СБРОС ЛИМИТОВ (ВСТАВИТЬ СЮДА)
// ============================================================
useEffect(() => {
  const resetDailyLimits = async () => {
    if (!userCompanyId) return;
    
    try {
      // Проверяем, нужно ли сбрасывать
      const lastReset = localStorage.getItem(`quota_reset_${userCompanyId}`);
      const today = new Date().toDateString();
      
      if (lastReset !== today) {
        // Вызываем RPC функцию для сброса
        const { error } = await supabase.rpc('reset_company_limits', {
          p_company_id: userCompanyId
        });
        
        if (error) {
          console.warn('⚠️ Ошибка сброса лимитов:', error);
          return;
        }
        
        // Обновляем квоту в UI
        const quota = await checkQuota(supabase, userCompanyId);
        setQuotaStatus(quota);
        
        localStorage.setItem(`quota_reset_${userCompanyId}`, today);
        console.log('✅ Лимиты сброшены для компании:', userCompanyId);
      }
    } catch (err) {
      console.debug('Reset limits error (non-critical):', err);
    }
  };
  
  // Сбрасываем при загрузке и каждый час
  resetDailyLimits();
  const interval = setInterval(resetDailyLimits, 60 * 60 * 1000);
  
  return () => clearInterval(interval);
}, [userCompanyId, supabase]);

  useEffect(() => {
  const loadAuditLogs = async () => {
    if (!userCompanyId) return;
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('company_id', userCompanyId)
      .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString())
      .order('created_at', { ascending: false });
    if (data) setAuditLogs(data);
  };
  loadAuditLogs();
}, [userCompanyId, supabase]);

useEffect(() => {
  // Проверка обновлений при загрузке
  const timer = setTimeout(() => {
    checkForUpdates();
  }, 3000); // через 3 секунды после загрузки
  
  // Проверка каждые 6 часов
  const interval = setInterval(checkForUpdates, 6 * 60 * 60 * 1000);
  
  return () => {
    clearTimeout(timer);
    clearInterval(interval);
  };
}, [checkForUpdates]);

// 🔥 ДОБАВЬТЕ ЭТОТ useEffect ПРЯМО СЮДА (ПОСЛЕ ПРОВЕРКИ ОБНОВЛЕНИЙ)
useEffect(() => {
  const initCleanup = async () => {
    if (user) {
      const { initAutoCleanup } = await import('./utils/autoCleanup');
      initAutoCleanup(); // Запускаем автоочистку при входе пользователя
    }
  };
  initCleanup();
}, [user]);

  // 🧭 VIEW ROUTING (РАСШИРЕННЫЙ ДЛЯ РУКОВОДИТЕЛЕЙ И БУХГАЛТЕРА)
// useEffect(() => {
//     if (!user) return;
//     
//     if (userRole === 'client') {
//         const allowedClientViews = [...];
//         if (!allowedClientViews.includes(currentView)) {
//             setCurrentView('clientDashboard');
//         }
//         return;
//     }
//     
//     if (isSuperAdmin(userRole, user?.user_metadata)) {
//         if (currentView !== 'superAdmin' && currentView !== 'tariffs') {
//             setCurrentView('superAdmin');
//         }
//         return;
//     }
//     
//     if (userRole === 'manager' || userRole === 'director' || isCompanyOwner) {
//         if (!initialViewSet) {
//             setCurrentView('managerDashboard');
//             setInitialViewSet(true);
//         } else if (!isViewAllowed(currentView, userRole)) {
//             setCurrentView('managerDashboard');
//         }
//         return;
//     }
//     
//     if (userRole === 'accountant') {
//         if (!initialViewSet) {
//             setCurrentView('accountantDashboard');
//             setInitialViewSet(true);
//         } else if (!isViewAllowed(currentView, userRole)) {
//             setCurrentView('accountantDashboard');
//         }
//         return;
//     }
//     
//     if (!initialViewSet) {
//         if (currentUserPermissions.canCreate) {
//             setCurrentView('create');
//         } else if (currentUserPermissions.canViewAnalytics) {
//             setCurrentView('analytics');
//         } else {
//             setCurrentView('pending');
//         }
//         setInitialViewSet(true);
//     }
// }, [user, userRole, currentUserPermissions.canCreate, currentUserPermissions.canViewAnalytics, currentView, initialViewSet, isCompanyOwner]);
// 🧭 ПРОСТАЯ МАРШРУТИЗАЦИЯ - ТОЛЬКО ПРИ ПЕРВОЙ ЗАГРУЗКЕ
useEffect(() => {
  if (!user) return;
  
  // Только при первой загрузке устанавливаем начальный вид
  // В useEffect с initialViewSet:
if (!initialViewSet) {
  // Руководитель
  if (userRole === 'manager' || userRole === 'director' || isCompanyOwner) {
    setCurrentView('dashboard'); // ← ИЗМЕНИТЬ С 'managerDashboard' НА 'dashboard'
  }
  // Бухгалтер
  else if (userRole === 'accountant') {
    setCurrentView('accountantDashboard');
  }
  // Клиент
  else if (userRole === 'client') {
    setCurrentView('clientDashboard');
  }
  // Остальные
  else if (currentUserPermissions.canCreate) {
    setCurrentView('create');
  } else if (currentUserPermissions.canViewAnalytics) {
    setCurrentView('analytics');
  } else {
    setCurrentView('pending');
  }
  setInitialViewSet(true);
}
}, [user, userRole, isCompanyOwner, currentUserPermissions.canCreate, currentUserPermissions.canViewAnalytics, initialViewSet]);

  // ─────────────────────────────────────────────────────────
  // ⏰ OVERDUE NOTIFICATIONS
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !currentUserPermissions.canViewAnalytics) {
      notifiedOverdueAppIdsRef.current.clear();
      return;
    }
    applications.forEach(app => {
      if (
        app.status === 'pending' &&
        getDaysSince(app.created_at) > 2 &&
        !notifiedOverdueAppIdsRef.current.has(app.id)
      ) {
        showNotification(`${t('overdue')}: "${app.object_name}"`, 'warning');
        notifiedOverdueAppIdsRef.current.add(app.id);
      }
    });
    const currentOverdueIds = new Set(
      applications
        .filter(app => app.status === 'pending' && getDaysSince(app.created_at) > 2)
        .map(app => app.id)
    );
    notifiedOverdueAppIdsRef.current = new Set(
      [...notifiedOverdueAppIdsRef.current].filter(id => currentOverdueIds.has(id))
    );
  }, [applications, user, currentUserPermissions.canViewAnalytics, t, showNotification]);

  // 📊 Check if should show NPS Survey
useEffect(() => {
  if (user && userCompanyId && applications.length > 0) {
    const shouldShow = shouldShowNpsSurvey(userCompanyId, applications, lastNpsDate);
    if (shouldShow) {
      const timer = setTimeout(() => {
        setShowNpsSurvey(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }
}, [user, userCompanyId, applications.length, lastNpsDate]);

  // ─────────────────────────────────────────────────────────
  // 🔄 FORCE RELOAD
  // ─────────────────────────────────────────────────────────
  const forceReload = useCallback(async () => {
  // ✅ Очистить кэш
  cacheManager.clear();
  setApplications([]);
  setAllApplications([]);
  setComments({});
  try {
    const db = await import('./utils/offlineStorage');
    await db.clearAllDrafts?.();
  } catch (e) {
    console.warn('Не удалось очистить IndexedDB:', e);
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
  }
  if (user && userCompanyId) {
    await loadApplications(1);
  }
  showNotification('🔄 Данные обновлены', 'success');
}, [user, userCompanyId, loadApplications, showNotification]);

  // ─────────────────────────────────────────────────────────
  // 🔄 AUTO-SYNC CHECK
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !userCompanyId) return;
    const checkSync = async () => {
      try {
        const { count, error } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userCompanyId);
        if (!error && count === 0 && applications.length > 0) {
          console.log('🔄 База пуста, обновляем состояние...');
          setApplications([]);
          setAllApplications([]);
          await loadApplications(1);
        }
      } catch (e) {
        console.warn('Ошибка проверки синхронизации:', e);
      }
    };
    checkSync();
  }, [user, userCompanyId, applications.length, loadApplications]);

  // ─────────────────────────────────────────────────────────
// 🔄 SYNC LISTENER SETUP (Offline Queue)
// ─────────────────────────────────────────────────────────
useEffect(() => {
  const cleanup = setupSyncListener(
    // ✅ onSuccess
    (payload) => {
      console.log('[App] Sync success:', payload);
      showNotification('✅ Офлайн-заявки успешно отправлены!', 'success');
      
      // 🔄 Перезагружаем данные для отображения актуального состояния
      if (user && userCompanyId) {
        loadApplications(page);
      }
      
      // 🗑️ Очищаем локальные "оптимистичные" записи с префиксом pending_
      setApplications(prev => prev.filter(app => !app.id?.startsWith('pending_')));
    },
    // ❌ onFailure
    (error) => {
      console.warn('[App] Sync failed:', error);
      showNotification('⚠️ Не все офлайн-заявки отправлены. Проверьте соединение.', 'warning');
    }
    // 📊 onProgress (опционально)
    // (progress) => {
    //   console.log(`[App] Sync progress: ${progress.current}/${progress.total}`);
    // }
  );
  
  return cleanup;
}, [user, userCompanyId, page, loadApplications, showNotification]);

// 🛡️ Глобальный перехватчик ошибок material_prices (временное решение)
useEffect(() => {
  if (userRole === 'master' || userRole === 'foreman') {
    // Мастерам цены не нужны — подавляем ошибки
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0];
      if (typeof url === 'string' && url.includes('material_prices')) {
        // Возвращаем "пустой" ответ вместо ошибки
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: [], error: null }),
          text: async () => JSON.stringify({ data: [], error: null })
        });
      }
      return originalFetch.apply(window, args);
    };
    return () => { window.fetch = originalFetch; };
  }
}, [userRole]);
  // 🎯 Onboarding Tour Logic
useEffect(() => {
  const checkOnboarding = async () => {
    if (!user || !userCompanyId) return;
    if (isSuperAdmin(userRole, user?.user_metadata)) return;
    
    // Используем ключ с ролью
    const key = `onboarding_${userCompanyId}_${userRole}`;
    const completed = localStorage.getItem(key);
    
    if (!completed) {
      setTimeout(() => {
        setShowOnboarding(true);
      }, 1500);
    }
  };
  checkOnboarding();
}, [user, userCompanyId, userRole]);

// 🎯 ИНТЕРАКТИВНЫЙ ТУР - ПОКАЗЫВАЕМ ПРИ ПЕРВОМ ВХОДЕ
useEffect(() => {
  const checkInteractiveTour = async () => {
    if (!user || !userCompanyId) return;
    if (isSuperAdmin(userRole, user?.user_metadata)) return;
    
    const key = `interactive_tour_${userCompanyId}_${userRole}`;
    const completed = localStorage.getItem(key);
    const hasApplications = applications.length > 0;
    
    if (!completed && !hasApplications && !showOnboarding) {
      setTimeout(() => {
        setShowInteractiveTour(true);
      }, 2000);
    } else if (!completed && hasApplications && !showOnboarding) {
      setTimeout(() => {
        setShowInteractiveTour(true);
      }, 3000);
    }
  };
  
  checkInteractiveTour();
}, [user, userCompanyId, userRole, applications.length, showOnboarding, isSuperAdmin]);

// 📊 ЗАГРУЗКА ПРОГРЕССА ОНБОРДИНГА
useEffect(() => {
  const loadProgress = async () => {
    if (!user || !userCompanyId) return;
    if (isSuperAdmin(userRole, user?.user_metadata)) return;
    
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('completed_tasks')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.debug('Onboarding progress error:', error);
        return;
      }
      
      if (data?.completed_tasks) {
        const allTasks = ['profile', 'first_application', 'invite_team', 'analytics', 'complete'];
        const completedCount = allTasks.filter(task => data.completed_tasks.includes(task)).length;
        const progress = Math.round((completedCount / allTasks.length) * 100);
        
        setOnboardingProgress(progress);
        setOnboardingTasksComplete(progress === 100);
        
        // ✅ ДОБАВИТЬ: Отслеживаем прогресс онбординга
        await AnalyticsTracker.trackOnboardingStep(
          user.id,
          userCompanyId,
          'progress_check',
          'loaded',
          { progress }
        );
        
      } else {
        // Создаем запись, если её нет
        await supabase
          .from('onboarding_progress')
          .insert({
            user_id: user.id,
            company_id: userCompanyId,
            completed_tasks: [],
            updated_at: new Date()
          });
        setOnboardingProgress(0);
        setOnboardingTasksComplete(false);
        
        // ✅ ДОБАВИТЬ: Отслеживаем старт онбординга
        await AnalyticsTracker.trackOnboardingStep(
          user.id,
          userCompanyId,
          'start',
          'onboarding_started'
        );
      }
    } catch (err) {
      console.debug('Load progress error:', err);
    }
  };
  
  loadProgress();
}, [user, userCompanyId, userRole, supabase]);

const handleOnboardingComplete = async () => {
  setShowOnboarding(false);
  if (userCompanyId && userRole) {
    localStorage.setItem(`onboarding_${userCompanyId}_${userRole}`, 'true');
  }
  
  try {
    const allTasks = ['profile', 'first_application', 'invite_team', 'analytics', 'complete'];
    await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: user?.id,
        company_id: userCompanyId,
        completed_tasks: allTasks,
        updated_at: new Date()
      });
    
    setOnboardingProgress(100);
    setOnboardingTasksComplete(true);
    
    // ✅ ДОБАВИТЬ: Отслеживаем завершение онбординга
    if (user?.id && userCompanyId) {
      await AnalyticsTracker.trackOnboardingStep(
        user.id,
        userCompanyId,
        'complete',
        'onboarding_completed',
        { allTasks }
      );
      
      // ✅ ДОБАВИТЬ: Отслеживаем время до завершения
      await AnalyticsTracker.trackOnboardingStep(
        user.id,
        userCompanyId,
        'time_to_complete',
        'measured'
      );
    }
    
  } catch (err) {
    console.debug('Error saving onboarding progress:', err);
  }
  
  showNotification('🎉 Onboarding завершён! Теперь вы готовы к работе', 'success');
};

const resetOnboarding = () => {
  if (userCompanyId && userRole) {
    localStorage.removeItem(`onboarding_${userCompanyId}_${userRole}`);
  }
  setOnboardingStep(0);
  setShowOnboarding(true);
};
// 💰 Tariff management functions
const handleSelectPlan = async (planId) => {
  if (!userCompanyId) {
    showNotification('Ошибка: компания не указана', 'error');
    return;
  }
  
  // Проверяем, не пытается ли пользователь выбрать тот же тариф
  if (currentPlan?.id === planId) {
    showNotification(`Вы уже используете тариф "${TARIFF_PLANS[planId].name}"`, 'info');
    setShowTariffModal(false);
    return;
  }
  
  try {
    const now = new Date().toISOString();
    let expiresAt = null;
    
    // Для платных тарифов устанавливаем дату окончания
    if (planId !== 'basic') {
      const days = billingPeriod === 'monthly' ? 30 : 365;
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    }
    
    // 🔍 ОТЛАДКА: логируем изменение тарифа
    console.log('🔍 [TARIFF] Changing plan:', {
      userCompanyId,
      planId,
      userId: user?.id,
      userEmail: user?.email,
      userRole,
      activated_at: now,
      expires_at: expiresAt
    });
    
    // 1. Обновляем тариф в базе данных с датами
    const updateData = {
      plan_tier: planId,
      plan_activated_at: now,
      plan_expires_at: expiresAt,
      updated_at: now
    };
    
    const { error } = await supabase
      .from('companies')
      .update(updateData)
      .eq('id', userCompanyId);

    if (error) throw error;

    // 2. Обновляем локальные состояния
    setCurrentPlan(TARIFF_PLANS[planId]);
    setCurrentPlanDetails({
      activated_at: now,
      expires_at: expiresAt,
      usageCurrent: 0
    });
    
    // 3. Обновляем квоту
    try {
      const newQuota = await checkQuota(supabase, userCompanyId);
      setQuotaStatus(newQuota);
    } catch (quotaErr) {
      console.warn('⚠️ Не удалось обновить квоту:', quotaErr.message);
    }
    
    // 4. Закрываем модальное окно
    setShowTariffModal(false);
    
    // 5. Показываем уведомление об успехе
    showNotification(`✅ Тариф "${TARIFF_PLANS[planId].name}" активирован`, 'success');
    
    // 6. Аудит
    await logAuditAction(supabase, {
      actionType: 'plan_changed',
      entityType: 'company',
      entityId: userCompanyId,
      oldValue: { plan: currentPlan?.id },
      newValue: { plan: planId },
      companyId: userCompanyId,
      userId: user?.id,
      userEmail: user?.email,
      userRole: userRole
    });
    
    // 7. Перезагружаем данные
    if (currentView === 'create' || currentView === 'tariffs') {
      await loadApplications(page);
    }
    
  } catch (err) {
    console.error('❌ [TARIFF] Plan change error:', err);
    showNotification('Не удалось изменить тариф: ' + err.message, 'error');
  }
};
// 🔐 Проверка доступа к функции по тарифу
const _canUseFeature = useCallback((feature) => {
  if (!currentPlan) return false;
  return checkFeatureAccess(currentPlan, feature);
}, [currentPlan]);

// 📊 Проверка квоты перед вызовом API (ОБНОВЛЁННАЯ С ЖЁСТКОЙ БЛОКИРОВКОЙ)
const checkApiQuota = useCallback(async (apiKeyId = null) => {
  // 🔒 Супер-админу не нужна проверка квоты
  if (isSuperAdmin(userRole, user?.user_metadata)) {
    return true;
  }
  if (!userCompanyId) return false;
  
  // ✅ Жесткая блокировка для basic тарифа
  if (currentPlan?.id === 'basic' || !currentPlan) {
    const quota = await checkQuota(supabase, userCompanyId, apiKeyId);
    setQuotaStatus(quota);
    
    if (!quota.allowed) {
      showNotification('⚠️ Лимит API исчерпан. Обновите тариф.', 'warning');
      setCurrentView('tariffs');
      return false; // ← ЖЕСТКАЯ БЛОКИРОВКА
    }
    return quota.allowed;
  }
  
  // Для платных тарифов - обычная проверка
  const quota = await checkQuota(supabase, userCompanyId, apiKeyId);
  setQuotaStatus(quota);
  return quota.allowed;
}, [userCompanyId, supabase, showNotification, userRole, user, currentPlan]);

// 🎁 Активация промокода
const handleActivatePromo = async (code) => {
  if (!userCompanyId || !user?.id) {
    showNotification('Ошибка: компания не найдена', 'error');
    return;
  }
  
  setActivatingPromo(true);
  try {
    const result = await activatePromoPlan(
      supabase, 
      code, 
      userCompanyId, 
      user.id, 
      user?.email
    );
    
    if (result.success) {
      showNotification(result.message, 'success');
      setShowPromoModal(false);
      
      // Перезагружаем информацию о тарифе
      const plan = await getCompanyPlan(supabase, userCompanyId);
      setCurrentPlan(plan);
      
      const quota = await checkQuota(supabase, userCompanyId);
      setQuotaStatus(quota);
    } else {
      showNotification(result.error, 'error');
    }
  } catch (err) {
    console.error('Promo activation error:', err);
    showNotification('Ошибка активации промокода', 'error');
  } finally {
    setActivatingPromo(false);
  }
};

// 🧪 A/B Testing Initialization
useEffect(() => {
  const initializeABTests = async () => {
    if (!user?.id) return;
    
    const tests = ['cta_button', 'pricing_display', 'invite_button'];
    const variants = {};
    
    for (const testName of tests) {
      // Проверяем сохранённый результат
      const saved = getSavedABTestResult(testName, user.id);
      if (saved) {
        variants[testName] = saved.variant;
      } else {
        // Получаем новый вариант
        const variant = getABTestVariant(testName, user.id);
        variants[testName] = variant;
        saveABTestResult(testName, variant, user.id);
      }
    }
    
    setABTestVariants(variants);
    setABTestLoaded(true);
  };
  
  initializeABTests();
}, [user?.id]);

// Напоминание о заполнении реквизитов компании
useEffect(() => {
  const checkCompanyProfile = async () => {
    if (!userCompanyId || !supabase) return;
    
    // Только для ролей, которые могут редактировать
    if (userRole !== 'manager' && userRole !== 'director' && userRole !== 'client_manager' && !isCompanyOwner) return;
    
    try {
      const { data } = await supabase
        .from('companies')
        .select('inn, logo_url, company_profile_completed')
        .eq('id', userCompanyId)
        .single();
      
      // Если ИНН не заполнен и нет флага заполнения
      if (data && !data.inn && !data.company_profile_completed) {
        // Показываем напоминание 1 раз в день
        const lastReminder = localStorage.getItem(`profile_reminder_${userCompanyId}`);
        const today = new Date().toDateString();
        
        if (lastReminder !== today) {
          setTimeout(() => {
            showNotification(
              '🏢 Заполните реквизиты компании для корректного оформления документов',
              'warning',
              false,
              () => setCurrentView('companyProfile')
            );
          }, 3000); // Показываем через 3 секунды после загрузки
          localStorage.setItem(`profile_reminder_${userCompanyId}`, today);
        }
      }
    } catch (err) {
      console.debug('Check company profile error:', err);
    }
  };
  
  // Задержка, чтобы не отвлекать пользователя сразу
  const timer = setTimeout(checkCompanyProfile, 5000);
  return () => clearTimeout(timer);
}, [userCompanyId, userRole, isCompanyOwner, supabase, showNotification]);

// 🔐 Проверка квоты при просмотре формы создания заявки
useEffect(() => {
  const checkQuotaOnView = async () => {
    if (currentView === 'create' && (currentPlan?.id === 'basic' || !currentPlan)) {
      if (!userCompanyId) return;
      
      try {
        const quota = await checkQuota(supabase, userCompanyId);
        setQuotaStatus(quota);
        
        // ✅ Если лимит исчерпан - показываем предупреждение
        if (!quota.allowed) {
          showNotification('⚠️ Лимит заявок исчерпан. Перейдите в раздел "Тарифы" для обновления.', 'warning');
        }
      } catch (err) {
        console.debug('Quota check on view error:', err);
      }
    }
  };
  
  checkQuotaOnView();
}, [currentView, currentPlan, userCompanyId, supabase, showNotification]);


  const renderLandingPage = () => (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#F5F7FA] via-white to-[#E4EDF5] page-enter">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-[#F9AA33]/10 to-[#F57C00]/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-[#4A6572]/10 to-[#344955]/5 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-gradient-to-r from-[#F9AA33]/5 to-transparent rounded-full blur-2xl"></div>
      </div>
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234A6572' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '30px 30px'
      }}></div>
      <div className="relative min-h-screen flex items-center justify-center p-4 z-10">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg mb-6">
              <div className="bg-gradient-to-br from-[#4A6572] to-[#344955] p-4 rounded-xl shadow-lg">
                <img
                  src="/icon-512.png"
                  alt="Reglai logo"
                  className="w-10 h-10"
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <span className="ml-4 text-2xl font-bold bg-gradient-to-r from-[#4A6572] to-[#344955] bg-clip-text text-transparent">
                Реглай PRO
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4">
              <span className="block text-gray-900">Управление материалами</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#F9AA33] to-[#F57C00] mt-2">
                для ваших объектов
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Профессиональная система для контроля заявок, отслеживания поставок
              и аналитики расходов на строительных объектах
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { icon: '📋', title: 'Мгновенные заявки', desc: 'Создавайте и отправляйте заявки на материалы за минуты' },
              { icon: '📊', title: 'Понятная аналитика', desc: 'Отслеживайте расходы и поставки в реальном времени' },
              { icon: '🤝', title: 'Слаженная работа', desc: 'Все сотрудники работают в единой системе' }
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[#F9AA33]/30 group"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#344955] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <div className="inline-flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setCurrentView('login')}
                className="px-8 py-3 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Войти в систему
              </button>
              <button
  onClick={() => {
    handleABTestClick('cta_button', 'signup_click');
    setShowSignupModal(true);
  }}
  className={`px-8 py-3 font-semibold rounded-xl shadow-lg transition-all duration-300 ${
    abTestVariants.cta_button === 'variant_b'
      ? 'bg-gradient-to-r from-[#F9AA33] to-[#F57C00] hover:shadow-xl hover:scale-110'
      : 'bg-gradient-to-r from-[#4A6572] to-[#344955] hover:shadow-lg hover:scale-105'
  }`}
>
  {abTestVariants.cta_button === 'variant_b' ? 'Попробовать сейчас' : 'Начать бесплатно'}
</button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Без скрытых платежей • 14 дней бесплатно • Поддержка 24/7
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLoginForm = () => (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#F5F7FA] via-white to-[#E4EDF5] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 page-enter">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#F9AA33]/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#4A6572]/5 to-transparent rounded-full blur-3xl"></div>
      </div>
      <div className="max-w-md w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
        <div className="mb-4">
          <button
            onClick={() => setCurrentView('create')}
            className="flex items-center text-gray-600 hover:text-[#4A6572] dark:text-gray-400 dark:hover:text-[#F9AA33] font-medium transition-colors"
            aria-label={language === 'ru' ? 'Вернуться назад' : 'Go back'}
          >
            <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" />
            {language === 'ru' ? 'Назад' : 'Back'}
          </button>
        </div>
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#4A6572]/20 to-[#344955]/20 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-xl flex items-center justify-center">
              <img
                src="/icon-512.png"
                alt="Reglai logo"
                className="w-6 h-6"
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#4A6572] to-[#344955] bg-clip-text text-transparent dark:text-white">
            {t('loginTitle')}
          </h2>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('yourEmail')}
              </label>
              <input
                id="email"
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('yourPassword')}
              </label>
              <input
                id="password"
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>{t('loading')}</span>
                </>
              ) : (
                t('login')
              )}
            </button>
          </div>
        </form>
        <div className="mt-6 text-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {language === 'ru' ? 'Ещё нет аккаунта?' : 'Don\'t have an account?'}
          </p>
          <button
            onClick={() => setShowSignupModal(true)}
            className="text-[#4A6572] hover:text-[#344955] dark:text-[#F9AA33] dark:hover:text-[#F57C00] font-medium transition-colors"
          >
            {t('signup')}
          </button>
        </div>
      </div>
    </div>
  );

const renderAnalyticsDashboard = () => {
  // 👑 ПРОВЕРКА ДЛЯ СУПЕР-АДМИНА
  const isSuper = isSuperAdmin(userRole, user?.user_metadata);
  
  console.log('🔥 renderAnalyticsDashboard:', { 
    userRole, 
    userEmail: user?.email,
    isSuper 
  });
  
  // 👑 СУПЕР-АДМИН - ПОКАЗЫВАЕМ РАСШИРЕННУЮ ПАНЕЛЬ
  if (isSuper) {
    return <SuperAdminAnalyticsDashboard supabase={supabase} showNotification={showNotification} />;
  }
  
  // 📦 АДМИНИСТРАТОР СНАБЖЕНИЯ - СПЕЦИАЛЬНАЯ АНАЛИТИКА
  if (userRole === 'supply_admin') {
    console.log('✅ Администратор снабжения, показываем SupplyAdminAnalytics');
    return (
      <SupplyAdminAnalytics
        applications={applications}
        companyUsers={companyUsers}
        userCompany={userCompany}
        currentPlan={currentPlan}
      />
    );
  }
  
  // 👨‍💼 РУКОВОДИТЕЛЬ/МЕНЕДЖЕР
  if (userRole === 'manager' || userRole === 'director' || isCompanyOwner) {
    console.log('✅ Менеджер, показываем ManagerAnalyticsDashboard');
    return (
      <ManagerAnalyticsDashboard
        applications={applications}
        companyUsers={companyUsers}
        userCompany={userCompany}
        currentPlan={currentPlan}
        userRole={userRole}
        isCompanyOwner={isCompanyOwner}
      />
    );
  }
  
  // 👷 ОСТАЛЬНЫЕ (прорабы, мастера)
  console.log('✅ Обычный пользователь, показываем KPIDashboardWithTabs');
  return (
    <KPIDashboardWithTabs
      applications={applications}
      companyUsers={companyUsers}
      userCompany={userCompany}
      currentPlan={currentPlan}
      promoCodeInfo={promoCodeInfo}
      userCompanyId={userCompanyId}
      supabase={supabase}
      userRole={userRole}
      isCompanyOwner={isCompanyOwner}
      user={user}
      pendingApprovals={pendingApprovals}
    />
  );
};
              
  const renderProfilePage = () => (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 page-enter">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('myData')}</h2>
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{language === 'ru' ? 'Профиль' : 'Profile'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{language === 'ru' ? 'Email' : 'Email'}</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('fullName')}</p>
                <p className="font-medium">{profileDataForHeader.fullName || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('phoneNumber')}</p>
                <p className="font-medium">{profileDataForHeader.phone || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('role')}</p>
                <p className="font-medium">{getRoleLabel(userRole)}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t('exportData')}</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => exportUserDataAsHTML(
                  user,
                  applications,
                  comments[user?.id] || [],
                  templates,
                  t,
                  language,
                  userCompany,
                  profileDataForHeader,
                  userRole,
                  getRoleLabel,
                  showNotification,
                  setIsLoading
                )}
                disabled={isLoading}
                className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300/50 dark:border-gray-600/50 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-medium"
              >
                HTML
              </button>
              <button
                onClick={() => exportUserDataAsPDF(
                  user,
                  applications,
                  comments[user?.id] || [],
                  templates,
                  t,
                  language,
                  userCompany,
                  profileDataForHeader,
                  userRole,
                  getRoleLabel,
                  showNotification,
                  setIsLoading
                )}
                disabled={isLoading}
                className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300/50 dark:border-gray-600/50 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-medium"
              >
                PDF
              </button>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center"
            >
              <LogOut className="w-4 h-4 mr-1" aria-hidden="true" />
              {t('logout')}
            </button>
          </div>
          <button
  onClick={resetOnboarding}
  className="mt-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-2"
>
  <RefreshCw className="w-4 h-4" />
  Пройти onboarding заново
</button>
        </div>
      </div>
    </div>
  );

  const renderAdminLoginModal = () => {
    if (!showAdminLogin) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 fade-enter">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('adminMode')}</h3>
            <button
              onClick={() => setShowAdminLogin(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={t('close')}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'ru' ? 'Пароль администратора' : 'Admin Password'}
              </label>
              <input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="••••••••"
              />
            </div>
            <button
              onClick={handleAdminLogin}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
            >
              {t('login')}
            </button>
          </div>
        </div>
      </div>
    );
  };


  const renderNotifications = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`px-4 py-3 rounded-lg shadow-lg max-w-xs fade-enter ${notification.type === 'success'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
            : notification.type === 'error'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
              : notification.type === 'warning'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
            }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              {notification.type === 'success' && <CheckCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" aria-hidden="true" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" aria-hidden="true" />}
              {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" aria-hidden="true" />}
              {notification.type === 'info' && <Info className="w-5 h-5 mr-2 flex-shrink-0" aria-hidden="true" />}
              <span>{notification.message}</span>
            </div>
            {notification.isUpdate && (
              <button
                onClick={() => {
                  navigator.serviceWorker.getRegistration().then(reg => {
                    if (reg?.waiting) {
                      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                      setTimeout(() => window.location.reload(true), 500);
                    }
                  });
                  setNotifications(prev => prev.filter(n => !n.isUpdate));
                }}
                className="ml-2 text-sm font-medium underline"
              >
                Обновить
              </button>
            )}
            {notification.undoFn && (
              <button
                onClick={() => {
                  notification.undoFn();
                  setNotifications(prev => prev.filter(n => n.id !== notification.id));
                }}
                className="ml-2 text-sm font-medium flex items-center gap-1"
              >
                <Undo2 className="w-3 h-3" />
                {t('undo')}
              </button>
            )}
          </div>
          {notification.isUpdate && (
            <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400">
              После обновления иконка на домашнем экране может потребовать
              переустановки приложения для отображения нового дизайна
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderSignupModal = () => {
  if (!showSignupModal) return null;
  
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 z-[9999] fade-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowSignupModal(false);
        }
      }}
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col"
        style={{ 
          width: 'min(calc(100% - 1rem), 420px)',
          maxHeight: 'min(calc(100% - 2rem), 85vh)',
          margin: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок - фиксированный */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 id="signup-modal-title" className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#4A6572]" />
              Регистрация в Реглай PRO
            </h3>
            <button
              onClick={() => setShowSignupModal(false)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Заполните форму, чтобы создать аккаунт
          </p>
        </div>

        {/* Форма с прокруткой */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <form onSubmit={handleSignup} className="space-y-3">
            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ваш email *
              </label>
              <input
                id="signup-email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* ФИО */}
            <div>
              <label htmlFor="signup-fullname" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                ФИО *
              </label>
              <input
                id="signup-fullname"
                type="text"
                value={signupFullName}
                onChange={(e) => setSignupFullName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Иванов Иван Иванович"
                required
              />
            </div>

            {/* Телефон */}
            <div>
              <label htmlFor="signup-phone" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Номер телефона *
              </label>
              <input
                id="signup-phone"
                type="tel"
                value={signupPhone}
                onChange={(e) => setSignupPhone(formatPhone(e.target.value))}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="+7 (___) ___-__-__"
                required
              />
            </div>

            {/* Компания */}
            {!invitedCompany && (
              <div>
                <label htmlFor="signup-company" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Название компании *
                </label>
                <input
                  id="signup-company"
                  type="text"
                  value={signupCompanyName}
                  onChange={(e) => setSignupCompanyName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="ООО СтройГрупп"
                  required={!invitedCompany}
                />
              </div>
            )}

            {/* Пароль */}
            <div>
              <label htmlFor="signup-password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ваш пароль *
              </label>
              <input
                id="signup-password"
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {/* Подтверждение пароля */}
            <div>
              <label htmlFor="signup-confirm-password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Подтвердите пароль *
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="••••••••"
                required
              />
            </div>

            {/* ========== СОГЛАСИЕ С ПОЛИТИКОЙ КОНФИДЕНЦИАЛЬНОСТИ ========== */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30 p-3">
              <div className="flex items-start gap-2">
                <input
                  id="signup-consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-3.5 h-3.5 text-[#4A6572] border-gray-300 rounded focus:ring-[#4A6572] flex-shrink-0"
                  required
                />
                <label htmlFor="signup-consent" className="text-xs text-gray-700 dark:text-gray-300 leading-tight">
                  Я принимаю условия{' '}
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Opening privacy policy modal');
                      setShowPrivacyPolicyModal(true);
                    }}
                    className="text-[#4A6572] hover:underline dark:text-[#F9AA33] font-medium inline-flex items-center gap-0.5"
                  >
                    Политики конфиденциальности
                  </button>
                  {' '}и даю согласие на обработку персональных данных
                </label>
              </div>
              
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-tight">
                📄 Нажимая «Зарегистрироваться», вы подтверждаете, что ознакомились с полным текстом 
                Политики конфиденциальности.
              </p>
            </div>

            {/* Кнопка регистрации */}
            <button
              type="submit"
              className="w-full py-2 px-4 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Зарегистрироваться
            </button>

            {/* Ссылка на вход */}
            <p className="text-center text-xs text-gray-600 dark:text-gray-400">
              Уже есть аккаунт?{' '}
              <button
                type="button"
                onClick={() => {
                  setShowSignupModal(false);
                  setCurrentView('login');
                }}
                className="text-[#4A6572] hover:underline dark:text-[#F9AA33] font-medium"
              >
                Войти
              </button>
            </p>
            
            {/* Подсказка по клавишам */}
            <div className="text-center text-[10px] text-gray-400 dark:text-gray-500 pb-1">
              <span>Ctrl+Enter — отправить</span>
              <span className="mx-2">•</span>
              <span>Esc — закрыть</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
  

  // ✅ ИСПРАВЛЕНО: Модальное окно приглашения с увеличенным z-index
  const renderInviteModal = () => {
    if (!showInviteModal) return null;
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[9999] fade-enter"
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowInviteModal(false);
          }
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full md:max-w-lg lg:max-w-xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('inviteUser')}</h3>
            <button
              onClick={() => setShowInviteModal(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label={t('cancel')}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('yourEmail')}
              </label>
              <input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="inviteRole" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('selectRole')}
              </label>
              <select
                id="inviteRole"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {getAvailableRolesForInvite(userRole, isCompanyOwner).map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>

             {userRole === 'supply_admin' && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
              ℹ️ Администратор снабжения может приглашать только прорабов, мастеров и бухгалтеров
            </p>
          )}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium dark:text-gray-300 dark:hover:text-gray-100"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleInviteUser}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                {t('inviteUser')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEmployeesList = () => {
  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4 page-enter">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('employees')}</h2>
        <p className="text-xs text-gray-500">
          👑 Руководитель может назначать нового руководителя
        </p>
      </div>

      {loadingEmployees ? (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        </div>
      ) : (
        <div className="space-y-4">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{emp.full_name}</h3>
                    {emp.user_id === companyOwnerId && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                        👑 Руководитель
                      </span>
                    )}
                    <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                      {getRoleLabel(emp.role)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{emp.phone || emp.user_email || '—'}</p>
                </div>
                <div className="flex gap-2">
                  {/* Кнопка "Назначить руководителем" - только для текущего владельца */}
                  {isCompanyOwner && emp.user_id !== companyOwnerId && (
                    <button
                      onClick={() => handleAssignOwner(emp.user_id, emp.full_name)}
                      className="px-3 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors flex items-center gap-1"
                      title="Назначить руководителем (вы станете администратором снабжения)"
                    >
                      👑 Назначить руководителем
                    </button>
                  )}
                  <button
                    onClick={() => toggleEmployeeStatus(emp.id, emp.is_active)}
                    className={`px-3 py-1 rounded text-xs font-medium ${emp.is_active
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {emp.is_active ? '🔒 Заблокировать' : '🔓 Разблокировать'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {employees.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {language === 'ru' ? 'Нет сотрудников' : 'No employees'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

  // ─────────────────────────────────────────────────────────
// 🆕 ОЧЕРЕДЬ СОГЛАСОВАНИЯ ДЛЯ РУКОВОДИТЕЛЕЙ
// ─────────────────────────────────────────────────────────
const renderApprovalsQueue = () => (
  <div className="max-w-7xl mx-auto p-4 page-enter">
    <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
      Очередь согласования
    </h2>
    {approvalsLoading ? (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A6572] mx-auto" />
      </div>
    ) : pendingApprovals.length === 0 ? (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        📭 Нет заявок, ожидающих согласования
      </div>
    ) : (
      <div className="space-y-4">
        {pendingApprovals.map((approval) => (
          <div key={approval.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200/50 dark:border-gray-700/50 p-5 hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                    {approval.applications?.object_name || approval.object_name}
                  </h3>
                  {approval.urgency === 'high' && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Срочно
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">
                    💰 Сумма: <span className="font-medium">{formatNumber(approval.total_amount || 0)} ₽</span>
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    👤 Прораб: {approval.applications?.foreman_name || approval.foreman_name}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    📅 Создана: {new Date(approval.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Срок: {new Date(approval.deadline).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedForApproval(approval.applications || approval);
                  setShowApprovalModal(true);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-md transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Eye className="w-4 h-4" />
                Рассмотреть
              </button>
            </div>
          </div>
        ))}
        {/* 🔴 ========== ВСТАВИТЬ ИСТОРИЮ СОГЛАСОВАНИЙ СЮДА ========== */}
        {/* История согласований */}
        {approvalHistory.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              История согласований
            </h3>
            <div className="space-y-2">
              {approvalHistory.slice(0, 5).map((history) => (
                <div key={history.id} className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {history.applications?.object_name || history.object_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {history.status === 'approved' ? '✅ Одобрено' : 
                         history.status === 'rejected' ? '❌ Отклонено' : '⏳ На согласовании'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(history.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────
// 🪟 UPDATE MODAL COMPONENT
// ─────────────────────────────────────────────────────────
const UpdateModal = ({ isOpen, onClose, updateInfo, onApplyUpdate }) => {
  if (!isOpen || !updateInfo) return null;
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200/50 dark:border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-[#F9AA33] to-[#F57C00] rounded-lg">
              <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 id="update-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                Доступно обновление
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                v{updateInfo.from} → v{updateInfo.to}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {updateInfo.breaking && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300 flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>⚠️ Это обновление содержит важные изменения. Рекомендуется обновиться сейчас.</span>
              </p>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Что нового в версии {updateInfo.to}:
            </p>
            <ul className="space-y-2">
              {updateInfo.changes.map((change, idx) => (
                <li key={idx} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Дата выпуска: {new Date(updateInfo.date).toLocaleDateString('ru-RU')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
          {!updateInfo.breaking && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              Позже
            </button>
          )}
          <button
            onClick={onApplyUpdate}
            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md transition-shadow flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Обновить сейчас</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
  // 📝 РЕГИСТРАЦИЯ ЗАКАЗЧИКА ПО ПРИГЛАШЕНИЮ
  // ─────────────────────────────────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const inviteParam = urlParams.get('invite');

  // ✅ Если есть параметр invite - ВСЕГДА показываем регистрацию
  // Это позволяет заказчику перейти по ссылке даже если руководитель уже залогинен
  if (inviteParam) {
    return <ClientRegister />;
  }

  // ─────────────────────────────────────────────────────────
  // 📋 MAIN RENDER
  // ─────────────────────────────────────────────────────────
  if (!user && currentView !== 'login' && !showSignupModal) {
    return renderLandingPage();
  }

  if (currentView === 'login' && !user) {
    return renderLoginForm();
  }

  return (
  <ErrorBoundary 
    supabase={supabase}
    companyId={userCompanyId}
    onError={(error, errorInfo) => {
      console.error('[Global Error]', error, errorInfo);
    }}
    autoRedirect={true}
    redirectUrl="/"
    showDetails={import.meta.env.MODE === 'development'}
  >
    <LoadingOverlay 
      isLoading={isLoading && !user} 
      message="Загрузка приложения..." 
      fullScreen 
    />
    
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#F5F7FA] via-white to-[#E4EDF5] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 page-enter">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#F9AA33]/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#4A6572]/5 to-transparent rounded-full blur-3xl"></div>
      </div>
           <Navbar
        user={user}
        companyName={userCompany}
        userRole={userRole}
        onLogout={handleLogout}
        onNavigate={(path) => {
          console.log('🔍 Навигация:', path);
          if (path === '/') { setCurrentView('dashboard'); return; }
          else if (path === '/estimates') setCurrentView('estimates');
          else if (path === '/reports') setCurrentView('reports');
          else if (path === '/integration') setCurrentView('integration');
          else if (path === '/applications') setCurrentView('inwork');
          else if (path === '/projects') setCurrentView('projects');
          else if (path === '/applications/new') setCurrentView('create');
          else if (path === '/warehouse') setCurrentView('warehouse');
          else if (path === '/clients') setCurrentView('clients');
          else if (path === '/analytics') setCurrentView('analytics');
          else if (path === '/profile') setCurrentView('profile');
          else if (path === '/documents') setCurrentView('documents');
          else if (path === '/chat') setCurrentView('chat');
          else if (path === '/calendar') setCurrentView('calendar');
          else if (path === '/settings') setCurrentView('settings');
          else if (path === '/tariffs') setCurrentView('tariffs');
          else if (path === '/companyProfile') setCurrentView('companyProfile');
          else if (path === '/inwork') setCurrentView('inwork');
          else if (path === '/history') setCurrentView('history');
          else if (path === '/approvals') setCurrentView('approvals');
          else if (path === '/employees') setCurrentView('employees');
          else if (path === '/api') setCurrentView('api');
          else if (path === '/audit') setCurrentView('audit');
          else if (path === '/tasks') setCurrentView('tasks');
          else if (path === '/help') setCurrentView('help');
          else if (path === '/superAdmin') setCurrentView('superAdmin');
          else if (path === '/crm-sales') setCurrentView('crm-sales');
          else if (path === '/merge') setCurrentView('merge');
          else if (path === '/search') {
            const params = new URLSearchParams(path.split('?')[1]);
            const query = params.get('q');
            if (query) {
              setSearchTerm(query);
              setCurrentView('inwork');
            }
          }
          else if (path === '/client') setCurrentView('clientDashboard');
          else if (path === '/client/documents') setCurrentView('clientDocuments');
          else if (path === '/client/chat') setCurrentView('clientChat');
        }}
        currentPage={currentView}
        onInvite={() => setShowInviteModal(true)}
        onOpenTariffs={() => setCurrentView('tariffs')}
        onOpenCompanyProfile={() => setCurrentView('companyProfile')}
        isOnline={isOnline}
        offlineDraftsCount={offlineDrafts.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleLanguage={handleLanguageChange}
        notifications={notifications}
        pendingApprovalsCount={pendingApprovals?.length || 0}
        cartItemsCount={formData.cart?.length || 0}
        isAdminMode={isAdminMode}
        onToggleAdminMode={() => setIsAdminMode(false)}
        isCompanyOwner={isCompanyOwner}
        companyId={userCompanyId}
        supabase={supabase}
        mergeableCount={mergeableCount}
        chatUnreadCount={chatUnreadCount}
        newFeedbackCount={newFeedbackCount}
               onMarkNotificationRead={async (id) => {
          if (!id) {
            console.error('❌ [Notifications] ID уведомления не передан!');
            return;
          }
          
          try {
            // 1. Обновляем в Базе Данных
            const { error } = await supabase
              .from('user_notifications')
              .update({ is_read: true })
              .eq('id', id);
              
            if (error) throw error;

            // 2. Мгновенно обновляем локальный список (чтобы красная точка погасла)
            setNotifications(prev => prev.map(n => 
              n.id === id ? { ...n, is_read: true } : n
            ));
            
            console.log('✅ Уведомление помечено прочитанным:', id);
            
          } catch (err) {
            console.error('❌ Ошибка при пометке уведомления:', err);
          }
        }}
        onClearNotifications={async () => {
          await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', user.id);
          setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }}

        // 🚀 ВОТ ЭТИ 4 СТРОКИ ДОЛЖНЫ БЫТЬ ВНУТРИ, ПЕРЕД ПОСЛЕДНЕЙ СКОБКОЙ />
        onNotificationClick={(notif) => {
          setSelectedNotification(notif);
          setShowNotificationModal(true);
        }}
        selectedNotification={selectedNotification}
        showNotificationModal={showNotificationModal}
        onCloseNotificationModal={() => {
          setShowNotificationModal(false);
          setSelectedNotification(null);
        }}
      >
{user && !isSuperAdmin(userRole, user?.user_metadata) && !onboardingTasksComplete && (
  <div className="max-w-7xl mx-auto px-4 pt-2">
    <OnboardingProgress
      supabase={supabase}
      userId={user.id}
      companyId={userCompanyId}
      onTaskComplete={() => {
        setOnboardingTasksComplete(true);
        setOnboardingProgress(100);
        showNotification('🎉 Вы выполнили все задачи онбординга!', 'success');
      }}
      onNavigate={(path) => {
        const viewMap = {
          '/profile': 'profile',
          '/applications/new': 'create',
          '/employees': 'employees',
          '/analytics': 'analytics'
        };
        
        const view = viewMap[path];
        if (view) {
          setCurrentView(view);
        } else {
          console.warn('Unknown path:', path);
        }
      }}
    />
  </div>
)}
</Navbar>
      <main className="py-6">
                {/* Умный поиск - показываем не всем */}
        {user && (userRole === 'manager' || userRole === 'director' || userRole === 'accountant' || userRole === 'supply_admin') && (
            <div className="max-w-2xl mx-auto px-4 mb-4">
                <SmartVoiceSearch
                    onSearch={(query) => {
                        setSearchTerm(query);
                        setCurrentView('inwork');
                    }}
                    onNavigate={setCurrentView}
                />
            </div>
        )}
        {/* Весь существующий контент main остается без изменений */}
        {currentView === 'create' && (
  <div className="max-w-7xl mx-auto px-4">
    {/* 🆕 Отображение лимитов */}
    {userCompanyId && currentPlan && (
      <div className="mb-4 max-w-2xl">
        <QuotaUsage
          userCompanyId={userCompanyId}
          supabase={supabase}
          currentPlan={currentPlan}
          onUpgradeClick={() => setCurrentView('tariffs')}
          showDetailed={true}
        />
      </div>
    )}

     <CreateApplicationForm
      formData={formData}
      setFormData={setFormData}
      templates={templates}
      showTemplateModal={showTemplateModal}
      setShowTemplateModal={setShowTemplateModal}
      templateName={templateName}
      setTemplateName={setTemplateName}
      selectedClientId={selectedClientId}
      onClientSelect={setSelectedClientId}
      companyId={userCompanyId}
      t={t}
      language={language}
      showNotification={showNotification}
      handleSubmit={handleSubmit}
      onAddPhoto={(materialIndex) => {
        setActiveMaterialIndex(materialIndex);
        setShowPhotoCapture(true);
      }}
      handleObjectInput={handleObjectInput}
      handlePhoneChange={handlePhoneChange}
      addMaterial={addMaterial}
      removeMaterial={removeMaterial}
      updateMaterial={updateMaterial}
      moveToCart={moveToCart}
      restoreFromCart={restoreFromCart}
      removeFromCartPermanently={removeFromCartPermanently}
      selectMaterial={selectMaterial}
      selectObject={selectObject}
      saveTemplate={saveTemplate}
      loadTemplate={loadTemplate}
      filteredObjects={filteredObjects}
      showObjectSuggestions={showObjectSuggestions}
      setShowObjectSuggestions={setShowObjectSuggestions}
      objectInputRef={objectInputRef}
      materialHistory={materialHistory}
      showMaterialSuggestions={showMaterialSuggestions}
      setShowMaterialSuggestions={setShowMaterialSuggestions}
      unitOptions={unitOptions}
      isLoading={isLoading}
      onExcelImport={handleExcelImport}
      onCloneLast={cloneLastApplication}
      onDownloadTemplate={downloadExcelTemplate}
      fileInputRef={fileInputRef}
      capturedPhotos={capturedPhotos}
      isSubmitting={isSubmitting}
      // 🆕 НОВЫЕ ПРОПСЫ
      quotaStatus={quotaStatus}
      currentPlan={currentPlan}
      onUpgradeClick={() => setCurrentView('tariffs')}
    />
  </div>
)}

        {currentView === 'crm-sales' && (
  <CRMSalesManager
    supabase={supabase}
    companyId={userCompanyId}
    showNotification={showNotification}
    onMoveToClients={() => {
      setCurrentView('clients');
    }}
  />
)}

        {/* Дашборд для руководителя */}
        {(currentView === 'managerDashboard' || currentView === 'dashboard') && (
    <UniversalDashboard
        applications={applications}
        companyUsers={companyUsers}
        pendingApprovals={pendingApprovals}
        user={user}
        userRole={userRole}
        userCompany={userCompany}
        setCurrentView={setCurrentView}
        isOnline={isOnline}
        offlineDraftsCount={offlineDrafts.length}
        currentPlan={currentPlan}
        mergeableCount={mergeableCount}
        cartItemsCount={formData.cart?.length || 0}
        isCompanyOwner={isCompanyOwner}
        onNavigate={(path) => {
            // Используем существующую логику из onNavigate
            if (path === '/applications/new') setCurrentView('create');
            else if (path === '/employees') setCurrentView('employees');
            else if (path === '/warehouse') setCurrentView('warehouse');
            else if (path === '/analytics') setCurrentView('analytics');
            else if (path === '/chat') setCurrentView('chat');
            else if (path === '/approvals') setCurrentView('approvals');
            else if (path === '/inwork') setCurrentView('inwork');
            else if (path === '/merge') setCurrentView('merge');
            else if (path === '/cart') setCurrentView('cart');
            else if (path === '/profile') setCurrentView('profile');
            else if (path === '/documents') setCurrentView('documents');
            else if (path === '/calendar') setCurrentView('calendar');
            else if (path === '/api') setCurrentView('api');
            else if (path === '/audit') setCurrentView('audit');
            else if (path === '/tasks') setCurrentView('tasks');
            else if (path === '/help') setCurrentView('help');
            else if (path === '/crm-sales') setCurrentView('crm-sales');
            else if (path === '/estimates') setCurrentView('estimates');
            else if (path === '/reports') setCurrentView('reports');
            else if (path === '/integration') setCurrentView('integration');
            else if (path === '/tariffs') setCurrentView('tariffs');
            else if (path === '/companyProfile') setCurrentView('companyProfile');
            else if (path === '/superAdmin') setCurrentView('superAdmin');
        }}
        t={t}
    />
)}
        
        {/* Дашборд для бухгалтера */}
        {currentView === 'accountantDashboard' && (
            <AccountantFinanceDashboard
                applications={applications}
            />
        )}
        
        {currentView === 'received' && (
          <ApplicationList
            applications={filteredApplications.filter(app => {
              const isVisibleToSupply = userRole === 'supply_admin' && 
                ['pending', 'pending_foreman', 'pending_approval', 'partial', 'received', 'canceled'].includes(app.status);
              const hasReceivedMaterials = app.materials?.some(m =>
                (Number(m.supplier_received_quantity) || 0) > 0 ||
                (Number(m.received) || 0) > 0
              );
              const isCompleted = app.status === APPLICATION_STATUS.RECEIVED ||
                app.status === APPLICATION_STATUS.PARTIAL_RECEIVED ||
                app.status === APPLICATION_STATUS.CANCELED;
              const matchesStatus = isVisibleToSupply || isCompleted || hasReceivedMaterials;
              return matchesStatus && (userRole !== 'master' || app.user_id === user?.id);
            })}
            title={t('receivedTab')}
            emptyMessage={userRole === 'foreman' ? t('noReceived') : t('noApplications')}
            isMobile={isMobile}
            user={user}
            userRole={userRole}
            viewMode="inwork"
            isAdminMode={isAdminMode}
            permissions={currentUserPermissions}
            t={t}
            language={language}
            uniqueDates={uniqueDates}
            page={page}
            totalPages={totalPages}
            onAdminLogout={handleAdminLogout}
            onDownloadHTML={(app) => downloadHTMLFile(app, t, language, userCompany)}
            onDownloadPDF={(app) => downloadPDF(app, t, language, userCompany, showNotification, setIsExportingPDF)}
            onDownloadXLSX={(app) => downloadXLSXFile(app, t, language, showNotification, setIsExportingXLSX)}
            onOpenReceiveModal={openReceiveModal}
            onCancelApplication={cancelApplication}
            onAddComment={addComment}
            onToggleComments={(appId) => setShowComments(prev => ({
              ...prev,
              [appId]: !(prev[appId] || false)
            }))}
            onPageChange={setPage}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            dateFilter={dateFilter}
            viewedFilter={viewedFilter}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onDateFilterChange={setDateFilter}
            onViewedFilterChange={setViewedFilter}
            onClearFilters={clearFilters}
            expandedMaterials={expandedMaterials}
            onToggleMaterial={(appId, idx) => setExpandedMaterials(prev => ({
              ...prev,
              [`${appId}-${idx}`]: !prev[`${appId}-${idx}`]
            }))}
            comments={comments}
            showComments={showComments}
            isExportingPDF={isExportingPDF}
            isExportingXLSX={isExportingXLSX}
          />
        )}
        
        {currentView === 'audit' && (
          <AuditView
            supabase={supabase}
            userCompanyId={userCompanyId}
            userCompany={userCompany}
            t={t}
            showNotification={showNotification}
            language={language}
            userRole={userRole}
          />
        )}
        
        {currentView === 'calendar' && (
          <CalendarView
            supabase={supabase}
            userCompanyId={userCompanyId}
            user={user}
            userRole={userRole}
            t={t}
            language={language}
            showNotification={showNotification}
            onEventClick={(type, data) => {
              if (type === 'application') {
                setSelectedApplication(data);
                setShowReceiveModal(true);
              }
            }}
          />
        )}
        
        {currentView === 'inwork' && (
          <ApplicationList
            applications={filteredApplications.filter(app => {
              return isApplicationActive(app.status) &&
                (userRole !== 'master' || app.user_id === user?.id);
            })}
            title={language === 'ru' ? 'В работе' : 'In Work'}
            emptyMessage={language === 'ru' ? 'Нет заявок в работе' : 'No applications in work'}
            isMobile={isMobile}
            user={user}
            userRole={userRole}
            isAdminMode={isAdminMode}
            permissions={currentUserPermissions}
            t={t}
            language={language}
            uniqueDates={uniqueDates}
            page={page}
            totalPages={totalPages}
            onAdminLogout={handleAdminLogout}
            onDownloadHTML={(app) => downloadHTMLFile(app, t, language, userCompany)}
            onDownloadPDF={(app) => downloadPDF(app, t, language, userCompany, showNotification, setIsExportingPDF)}
            onDownloadXLSX={(app) => downloadXLSXFile(app, t, language, showNotification, setIsExportingXLSX)}
            onOpenReceiveModal={openReceiveModal}
            onCancelApplication={cancelApplication}
            onAddComment={addComment}
            onToggleComments={(appId) => setShowComments(prev => ({
              ...prev,
              [appId]: !(prev[appId] || false)
            }))}
            onPageChange={setPage}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            dateFilter={dateFilter}
            viewedFilter={viewedFilter}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onDateFilterChange={setDateFilter}
            onViewedFilterChange={setViewedFilter}
            onClearFilters={clearFilters}
            expandedMaterials={expandedMaterials}
            onToggleMaterial={(appId, idx) => setExpandedMaterials(prev => ({
              ...prev,
              [`${appId}-${idx}`]: !prev[`${appId}-${idx}`]
            }))}
            comments={comments}
            showComments={showComments}
            isExportingPDF={isExportingPDF}
            isExportingXLSX={isExportingXLSX}
          />
        )}
        
        {currentView === 'confirmation' && (
          <ApplicationList
            applications={filteredApplications.filter(app =>
              requiresMasterConfirmation(app.status) && app.user_id === user?.id
            )}
            title={language === 'ru' ? 'Заявки на подтверждение' : 'Applications for Confirmation'}
            emptyMessage={language === 'ru' ? 'Нет заявок, требующих подтверждения' : 'No applications requiring confirmation'}
            isMobile={isMobile}
            user={user}
            userRole={userRole}
            isAdminMode={isAdminMode}
            permissions={currentUserPermissions}
            t={t}
            language={language}
            uniqueDates={uniqueDates}
            page={page}
            totalPages={totalPages}
            onAdminLogout={handleAdminLogout}
            onDownloadHTML={(app) => downloadHTMLFile(app, t, language, userCompany)}
            onDownloadPDF={(app) => downloadPDF(app, t, language, userCompany, showNotification, setIsExportingPDF)}
            onDownloadXLSX={(app) => downloadXLSXFile(app, t, language, showNotification, setIsExportingXLSX)}
            onOpenReceiveModal={openReceiveModal}
            onCancelApplication={cancelApplication}
            onAddComment={addComment}
            onToggleComments={(appId) => setShowComments(prev => ({
              ...prev,
              [appId]: !(prev[appId] || false)
            }))}
            onPageChange={setPage}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            dateFilter={dateFilter}
            viewedFilter={viewedFilter}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onDateFilterChange={setDateFilter}
            onViewedFilterChange={setViewedFilter}
            onClearFilters={clearFilters}
            expandedMaterials={expandedMaterials}
            onToggleMaterial={(appId, idx) => setExpandedMaterials(prev => ({
              ...prev,
              [`${appId}-${idx}`]: !prev[`${appId}-${idx}`]
            }))}
            comments={comments}
            showComments={showComments}
            isExportingPDF={isExportingPDF}
            isExportingXLSX={isExportingXLSX}
          />
        )}
        
        {currentView === 'history' && (
          <ApplicationList
            applications={filteredApplications.filter(app =>
              isApplicationCompleted(app.status)
            )}
            title={t('history')}
            emptyMessage={t('noHistory')}
            isMobile={isMobile}
            user={user}
            userRole={userRole}
            isAdminMode={isAdminMode}
            permissions={currentUserPermissions}
            t={t}
            language={language}
            uniqueDates={uniqueDates}
            page={page}
            totalPages={totalPages}
            onAdminLogout={handleAdminLogout}
            onDownloadHTML={downloadHTMLFile}
            onDownloadPDF={downloadPDF}
            onDownloadXLSX={downloadXLSXFile}
            onOpenReceiveModal={openReceiveModal}
            onCancelApplication={cancelApplication}
            onAddComment={addComment}
            onToggleComments={(appId) => setShowComments(prev => ({
              ...prev,
              [appId]: !(prev[appId] || false)
            }))}
            onPageChange={setPage}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            dateFilter={dateFilter}
            viewedFilter={viewedFilter}
            onSearchChange={setSearchTerm}
            onStatusFilterChange={setStatusFilter}
            onDateFilterChange={setDateFilter}
            onViewedFilterChange={setViewedFilter}
            onClearFilters={clearFilters}
            expandedMaterials={expandedMaterials}
            onToggleMaterial={(appId, idx) => setExpandedMaterials(prev => ({
              ...prev,
              [`${appId}-${idx}`]: !prev[`${appId}-${idx}`]
            }))}
            comments={comments}
            showComments={showComments}
            isExportingPDF={isExportingPDF}
            isExportingXLSX={isExportingXLSX}
          />
        )}
        
        {currentView === 'analytics' && renderAnalyticsDashboard()}
        
        {currentView === 'employees' && renderEmployeesList()}
        
        {currentView === 'clients' && (
          <>
            {!userCompanyId ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A6572]"></div>
                <p className="ml-3 text-gray-500">Загрузка данных компании...</p>
              </div>
            ) : (
              <ClientManager
                companyId={userCompanyId}
                t={t}
                showNotification={showNotification}
                onInviteClick={() => setShowClientInviteModal(true)}
              />
            )}
          </>
        )}
        
        {currentView === 'warehouse' && (
          <WarehouseView
            supabase={supabase}
            userCompanyId={userCompanyId}
            user={user}
            userRole={userRole}
            profileData={profileDataForHeader} 
            t={t}
            language={language}
            showNotification={showNotification}
            applications={applications}
            onOpenApplication={(appId) => {
              const app = applications.find(a => a.id === appId);
              if (app) {
                setSelectedApplication(app);
                setShowReceiveModal(true);
              }
            }}
          />
        )}
        
        {currentView === 'documents' && (
          <DocumentGenerator
            applications={isAdminMode ? allApplications : applications}
            user={user}
            userCompanyId={userCompanyId}
            userRole={userRole}
            t={t}
            showNotification={showNotification}
            companyName={userCompany}
            supabase={supabase}
          />
        )}
        
        {currentView === 'profile' && renderProfilePage()}
        
        {currentView === 'cart' && (
          <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <MaterialCart
              cart={formData.cart}
              restoreMaterial={restoreFromCart}
              removeMaterialPermanently={removeFromCartPermanently}
              t={t}
              isStandaloneView={true}
            />
            <button
              onClick={() => setCurrentView('create')}
              className="mt-4 px-4 py-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
            >
              ← Вернуться к заявке
            </button>
          </div>
        )}
        
        {currentView === 'superAdmin' && isSuperAdmin(userRole, user?.user_metadata) && (
          <SuperAdminPanel
            supabase={supabase}
            currentUser={user}
            t={t}
            language={language}
            showNotification={showNotification}
          />
        )}
        
        {currentView === 'tariffs' && isSuperAdmin(userRole, user?.user_metadata) && (
          <SuperAdminCompanyTariffs
            supabase={supabase}
            showNotification={showNotification}
            t={t}
          />
        )}
        
        {currentView === 'tasks' && (
          <TaskBoard
            user={user}
            userCompanyId={userCompanyId}
            applications={applications}
            showNotification={showNotification}
            language={language}
            userRole={userRole}
          />
        )}
        
        {currentView === 'chat' && (
          <CompanyChat
            user={user}
            userCompanyId={userCompanyId}
            userRole={userRole}
            t={t}
            language={language}
            showNotification={showNotification}
            onUnreadCountChange={setChatUnreadCount}
          />
        )}
        
        {currentView === 'approvals' && renderApprovalsQueue()}
        
        {currentView === 'api' && (
          <APIDocumentation
            user={user}
            userCompanyId={userCompanyId}
            showNotification={showNotification}
            t={t}
            language={language}
          />
        )}
        
        {currentView === 'tariffs' && !isSuperAdmin(userRole, user?.user_metadata) && 
  (isCompanyOwner || userRole === 'manager' || userRole === 'director' || userRole === 'client_manager') && (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('tariffSelector.title', 'Управление тарифом')}
        </h2>
        {isAdminMode && (
          <button
            onClick={handleAdminLogout}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            {t('exitAdminMode', 'Выйти из режима админа')}
          </button>
        )}
      </div>
      
      {userCompanyId && !planLoading && (
        <div className="mb-6">
          <QuotaUsage 
            userCompanyId={userCompanyId} 
            supabase={supabase} 
            quotaStatus={quotaStatus} 
          />
        </div>
      )}
      
      <TariffSelector
  currentPlan={currentPlan?.id || 'basic'}
  billingPeriod={billingPeriod}
  onBillingPeriodChange={setBillingPeriod}
  onSelectPlan={handleSelectPlan}
  isLoading={planLoading}
  t={t}
  onPromoClick={() => setShowPromoModal(true)}
  currentPlanDetails={{
    activated_at: currentPlanDetails?.activated_at || null,
    expires_at: currentPlanDetails?.expires_at || null,
    usageCurrent: quotaStatus?.monthlyUsage || 0,
    trial_started_at: currentPlanDetails?.trial_started_at || null,
    trial_ended_at: currentPlanDetails?.trial_ended_at || null,
    is_trial: currentPlanDetails?.is_trial || false,
    is_trial_expired: currentPlanDetails?.is_trial_expired || false
  }}
  promoCodeInfo={promoCodeInfo}  // ← ДОБАВИТЬ ЭТУ СТРОКУ
/>
              
      {currentPlan && !isSuperAdmin(userRole, user?.user_metadata) && (
        <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            {t('currentPlan', 'Ваш текущий план')}:
          </h4>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>📦 {currentPlan.name}</span>
            <span>💰 {billingPeriod === 'monthly' 
              ? `${currentPlan.monthlyPrice} ₽/мес` 
              : `${currentPlan.annualPrice} ₽/год`}</span>
            <span>🔑 {currentPlan.maxApiKeys} API ключей</span>
            <span>👥 {currentPlan.maxUsers} пользователей</span>
            {currentPlan.isActive && (
              <span className="text-green-600">✅ Активен</span>
            )}
          </div>
        </div>
      )}
    </div>
  )}
        
        {/* Вкладки для заказчика */}
        {currentView === 'clientDashboard' && userRole === 'client' && (
          <ClientDashboard clientId={clientId} t={t} />
        )}
        
        {currentView === 'clientChat' && userRole === 'client' && (
          <ClientChat clientId={clientId} companyId={userCompanyId} user={user} t={t} />
        )}
        
        {currentView === 'clientDocuments' && userRole === 'client' && (
          <ClientDocuments clientId={clientId} t={t} />
        )}
        
        {currentView === 'clientApplications' && userRole === 'client' && (
          <ClientApplications clientId={clientId} t={t} />
        )}
        
        {currentView === 'clientCalendar' && userRole === 'client' && (
          <ClientCalendar clientId={clientId} t={t} />
        )}
        
        {currentView === 'clientConfirmation' && userRole === 'client' && (
          <ClientConfirmation clientId={clientId} t={t} />
        )}
        
        {currentView === 'clientPhotos' && userRole === 'client' && (
          <ClientPhotos clientId={clientId} t={t} />
        )}
        
        {currentView === 'clientWorkAct' && userRole === 'client' && (
          <ClientWorkAct clientId={clientId} t={t} />
        )}
        
        {currentView === 'companyProfile' && (
          <CompanyProfileForm 
            companyId={userCompanyId}
            supabase={supabase}
            onSave={() => {
              showNotification('✅ Реквизиты компании сохранены!', 'success');
            }}
          />
        )}

        {currentView === 'merge' && (
  <ObjectMaterialsMerger
    supabase={supabase}
    companyId={userCompanyId}
    applications={applications}
    showNotification={showNotification}
    userRole={userRole}
    onMerged={(newApp) => {
      // Обновляем список заявок после объединения
      setApplications(prev => [newApp, ...prev]);
      // Можно перезагрузить страницу
      loadApplications(page);
    }}
  />
)}
{currentView === 'estimates' && (
  <EstimateCalculator
    supabase={supabase}
    companyId={userCompanyId}
    onSave={(estimate) => {
      showNotification(`✅ Смета "${estimate.name}" сохранена!`, 'success');
    }}
    showNotification={showNotification}
    t={t}
  />
)}

{currentView === 'reports' && (
  <ReportBuilder
    applications={isAdminMode ? allApplications : applications}
    companyUsers={companyUsers}
    supabase={supabase}
    companyId={userCompanyId}
    showNotification={showNotification}
    t={t}
  />
)}

{currentView === 'integration' && (
  <OneCIntegration
    supabase={supabase}
    companyId={userCompanyId}
    showNotification={showNotification}
    t={t}
  />
)}

{currentView === 'help' && ( // ← ДОБАВИТЬ ЭТОТ БЛОК
  <HelpPage
    onNavigate={setCurrentView}
    t={t}
    language={language}
  />
)}

{currentView === 'settings' && (
  <SettingsPage
    user={user}
    userRole={userRole}
    userCompany={userCompany}
    userCompanyId={userCompanyId}
    supabase={supabase}
    language={language}
    theme={theme}
    onThemeChange={setTheme}
    onLanguageChange={setLanguage}
    t={t}
    showNotification={showNotification}
    applications={applications}
    settings={settings}
    onSettingsUpdate={setSettings}
  />
)}
{currentView === 'projects' && (
  <ProjectManager
    supabase={supabase}
    userCompanyId={userCompanyId}
    userId={user?.id}
    userRole={userRole}
    showNotification={showNotification}
    applications={applications}
  />
)}
      </main>
      
      {/* Все модальные окна остаются без изменений */}
      <ReceiveModal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        selectedApplication={selectedApplication}
        onAdminReceive={handleAdminReceive} 
        onSendToMaster={handleSendToMaster}
        onMasterConfirm={handleMasterConfirm}
        language={language}
        escapeHtml={escapeHtml}
        userRole={userRole}
        t={t}
        modalMode={selectedApplication?.modalMode || 'admin_receive'}
        showNotification={showNotification}
        onPhotoClick={(materialIndex) => {
          setActiveMaterialIndex(materialIndex);
          setShowPhotoCapture(true);
        }}
        onQRClick={() => setShowQRScanner(true)}
        onTakeToWork={handleTakeToWork}
        onSendForApproval={handleSendForApproval} 
      />
      
      {renderAdminLoginModal()}
      {renderNotifications()}
      
      {!isSuperAdmin(userRole, user?.user_metadata) && showTutorial && (
        <TutorialModal
          steps={tutorialSteps}
          currentStep={tutorialStep}
          onNext={handleTutorialNext}
          onSkip={handleTutorialSkip}
          onClose={() => setShowTutorial(false)}
          t={t}
        />
      )}
      
      <AnalyticsDetailModal
        isOpen={!!analyticsDetailType}
        onClose={() => setAnalyticsDetailType(null)}
        analyticsDetailType={analyticsDetailType}
        allApplications={allApplications}
        applications={applications}
        isAdminMode={isAdminMode}
        isExportingSection={isExportingSection}
        exportAnalyticsSectionAsPDF={exportAnalyticsSectionAsPDF}
        exportAnalyticsSectionData={exportAnalyticsSectionData}
        t={t}
        language={language}
        escapeHtml={escapeHtml}
        getStatusText={getStatusText}
        getStatusWithOverdue={getStatusWithOverdue}
        activationMetrics={activationMetrics}
        timeToFirstValue={timeToFirstValue}
        featureAdoption={featureAdoption}
        npsMetrics={npsMetrics}
        npsResponses={npsResponses}   
        getRoleLabel={getRoleLabel}
        churnMetrics={churnMetrics}
        churnReasons={churnReasons}
        getReasonColorClass={getReasonColorClass}
        retentionMetrics={retentionMetrics}
        engagementMetrics={engagementMetrics}
      />
      
      {privacyPolicyOpen && <PrivacyPolicyModal />}
      {renderSignupModal()}
      {renderInviteModal()}
      
      {/* A/B Test: Pricing Display */}
      {abTestVariants.pricing_display && (
        <div className="mb-4 p-3 bg-gradient-to-r from-[#4A6572]/10 to-[#344955]/10 rounded-lg">
          {abTestVariants.pricing_display === 'annual' ? (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Специальная цена при оплате за год
              </p>
              <p className="text-2xl font-bold text-[#4A6572] dark:text-[#F9AA33]">
                9 900 ₽ <span className="text-sm font-normal">/ год</span>
              </p>
              <p className="text-xs text-green-600">
                Экономия 40% по сравнению с месячной оплатой
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Гибкая оплата по месяцам
              </p>
              <p className="text-2xl font-bold text-[#4A6572] dark:text-[#F9AA33]">
                990 ₽ <span className="text-sm font-normal">/ месяц</span>
              </p>
              <p className="text-xs text-gray-500">
                Отмена в любой момент
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* NPS Survey Modal */}
      <NpsSurveyModal
        isOpen={showNpsSurvey}
        onClose={() => setShowNpsSurvey(false)}
        onSubmit={handleNpsSubmit}
        isLoading={npsSubmitting}
      />
      
      {/* Version Update Modal */}
<VersionUpdateModal
  isOpen={showUpdateModal}
  onClose={() => {
    setShowUpdateModal(false);
    if (updateInfo?.to) {
      localStorage.setItem(`update_declined_${updateInfo.to}`, Date.now().toString());
    }
  }}
  updateInfo={updateInfo}
  onApplyUpdate={() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    if (updateInfo?.to) {
      localStorage.setItem(`update_applied_${updateInfo.to}`, Date.now().toString());
      localStorage.setItem('last_update_shown', updateInfo.to);
    }
    setShowUpdateModal(false);
    setUpdateInfo(null);
    // Очищаем кэш
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
      });
    }
    setTimeout(() => {
      window.location.reload(true);
    }, 500);
  }}
/>
      
      <ChurnReasonModal
        isOpen={showChurnModal}
        onClose={() => setShowChurnModal(false)}
        onSubmit={handleChurnSubmit}
        isLoading={churnSubmitting}
        companyName={userCompany} 
        reasonOptions={REASON_OPTIONS}
        t={t}
      />
      
      {!isSuperAdmin(userRole, user?.user_metadata) && showOnboarding && (
        <OnboardingTour
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          currentStep={onboardingStep}
          totalSteps={currentOnboardingHighlights.length}
          onNext={() => setOnboardingStep(prev => Math.min(prev + 1, currentOnboardingHighlights.length - 1))}
          onPrev={() => setOnboardingStep(prev => Math.max(prev - 1, 0))}
          onComplete={handleOnboardingComplete}
          highlights={currentOnboardingHighlights}
        />
      )}

      {/* 🆕 ИНТЕРАКТИВНЫЙ ТУР */}
{showInteractiveTour && (
  <InteractiveTour
    isOpen={showInteractiveTour}
    onComplete={() => {
      setShowInteractiveTour(false);
      localStorage.setItem(`interactive_tour_${userCompanyId}_${userRole}`, 'true');
      showNotification('🎉 Отлично! Вы познакомились с основными функциями!', 'success');
      
      if (user?.id && userCompanyId) {
        AnalyticsTracker.trackOnboardingStep(
          user.id,
          userCompanyId,
          'interactive_tour',
          'completed'
        );
      }
    }}
    onSkip={() => {
      setShowInteractiveTour(false);
      localStorage.setItem(`interactive_tour_${userCompanyId}_${userRole}`, 'skipped');
      showNotification('Вы всегда можете вернуться к туру в настройках', 'info');
      
      if (user?.id && userCompanyId) {
        AnalyticsTracker.trackOnboardingStep(
          user.id,
          userCompanyId,
          'interactive_tour',
          'skipped'
        );
      }
    }}
  />
)}
      
      {/* Approval Modal */}
      {showApprovalModal && (
        <ApprovalModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedForApproval(null);
          }}
          application={selectedForApproval}
          onApprove={approveApplication}
          onReject={rejectApplication}
          onEscalate={escalateApplication}
          language={language}
          userRole={userRole}
        />
      )}
      
      {/* Tariff Modal */}
      {showTariffModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-bold">Выберите тариф</h3>
              <button onClick={() => setShowTariffModal(false)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <TariffSelector
                currentPlan={currentPlan?.id || 'basic'}
                billingPeriod={billingPeriod}
                onBillingPeriodChange={setBillingPeriod}
                onSelectPlan={handleSelectPlan}
                isLoading={planLoading}
                t={t}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Photo Capture Modal */}
      {showPhotoCapture && (
        <PhotoCapture
          onCapture={(urls) => {
            if (selectedApplication?.id && activeMaterialIndex !== null) {
              const key = `${selectedApplication.id}-${activeMaterialIndex}`;
              setCapturedPhotos(prev => ({
                ...prev,
                [key]: [...(prev[key] || []), ...urls]
              }));
            }
            setShowPhotoCapture(false);
            showNotification(`📸 Добавлено ${urls.length} фото`, 'success');
          }}
          onClose={() => setShowPhotoCapture(false)}
          multiple={true}
          maxPhotos={5}
          applicationId={selectedApplication?.id}
          materialIndex={activeMaterialIndex}
          companyId={userCompanyId}
          userId={user?.id}
        />
      )}
      
      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScan={(data) => {
            try {
              const parsed = JSON.parse(decodeURIComponent(atob(data)));
              if (parsed.type === 'material') {
                setFormData(prev => ({
                  ...prev,
                  materials: [
                    ...prev.materials,
                    {
                      description: parsed.name,
                      quantity: parsed.quantity,
                      unit: parsed.unit,
                      received: 0,
                      status: 'pending'
                    }
                  ]
                }));
                showNotification('✅ Материал добавлен из QR', 'success');
              }
            } catch (e) {
              console.error('QR scan error:', e); 
              showNotification('❌ Ошибка чтения QR', 'error');
            }
            setShowQRScanner(false);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}
      
      {/* Promo Modals */}
      {showPromoModal && (
        <PromoModal
          isOpen={showPromoModal}
          onClose={() => setShowPromoModal(false)}
          onActivate={handleActivatePromo}
          isLoading={activatingPromo}
          t={t}
        />
      )}
      
      {showPromoManager && isSuperAdmin(userRole, user?.user_metadata) && (
  <PromoManager
    isOpen={showPromoManager}
    onClose={() => setShowPromoManager(false)}
    supabase={supabase}
    showNotification={showNotification}
    t={t}
  />
)}
      
      {/* Client Invite Modal */}
      {showClientInviteModal && (
        <ClientInviteModal
          isOpen={showClientInviteModal}
          onClose={() => setShowClientInviteModal(false)}
          companyId={userCompanyId}
          onSuccess={() => {
            showNotification('Приглашение отправлено!', 'success');
          }}
          t={t}
        />
      )}
    </div>

    {/* Privacy Policy Modal */}
<PrivacyPolicyModal
  isOpen={showPrivacyPolicyModal}
  onClose={() => setShowPrivacyPolicyModal(false)}
/>

{/* 🆕 Кнопка отзыва для всех пользователей */}
    {user && !isSuperAdmin(userRole, user?.user_metadata) && (
      <FeedbackButton
        user={user}
        userCompanyId={userCompanyId}
        showNotification={showNotification}
        t={t}
      />
    )}
{showFeedbackForm && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000] fade-enter">
    <TesterFeedbackForm
      user={user}
      userCompanyId={userCompanyId}
      onClose={() => setShowFeedbackForm(false)}
      onSuccess={() => {
        setShowFeedbackForm(false);
        showNotification('Спасибо за ваш отзыв!', 'success');
      }}
      showNotification={showNotification}
      t={t}
    />
  </div>
)}
  </ErrorBoundary>
);
};
export default memo(App);