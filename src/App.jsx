// src/App.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
// === ТАРИФЫ И КВОТЫ ===
import TariffSelector from './components/TariffSelector';
import QuotaUsage from './components/QuotaUsage';
import {
  TARIFF_PLANS,
  getCompanyPlan,
  checkFeatureAccess,
  checkQuota,
  logApiUsage,
  getUsageStats
} from './utils/tariffPlans';
// Добавить импорты
import { WarehouseBalance } from './components/WarehouseView';
import TaskBoard from './components/TaskBoard';
import QRScanner from './components/Mobile/QRScanner';

// Добавить в renderNavigation новый пункт 'tasks'
import SuperAdminCompanyTariffs from './components/SuperAdminCompanyTariffs';
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
import {
  getABTestVariant,
  saveABTestResult,
  trackABTestConversion,
  getSavedABTestResult,
} from './utils/abTesting';
import OnboardingTour from './components/OnboardingTour';
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
  getAvailableRolesForInvite
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
import { activatePromoPlan, 
  // eslint-disable-next-line no-unused-vars
  getAllPromoCodes } from './utils/promoManager';
import {
  Plus, ArrowLeft, History, Minus, Send, Package, Building, User, Calendar,
  AlertCircle, Download, FileText, Search, Check, X, Edit3,
  Phone, LogOut, Eye, Printer, Shield, BarChart3, AlertTriangle,
  Copy, CheckCircleIcon, Globe, Mail, Users, TrendingUp,
  Moon, Sun, CheckCircle, Briefcase, Home, Clock, Archive, MessageCircle, Ban, Menu,
  HelpCircle, ArrowRight, Info, Loader2, WifiOff, Wifi, Trash2, ShoppingCart,
  Undo2, Sparkles, RefreshCw,Code,DollarSign
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';
import cacheManager from './utils/cacheManager';  // ← ДОБАВИТЬ
import { supabase } from './utils/supabaseClient';
// === APPROVAL WORKFLOW ===
import ApprovalModal from './components/ApprovalWorkflow/ApprovalModal';
import { useApproval } from './hooks/useApproval';
import approvalEngine from './utils/approvalEngine';

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
/* 🎯 Onboarding Highlight Effect */
.onboarding-highlight {
  animation: pulse-highlight 2s ease-in-out infinite;
  box-shadow: 0 0 0 4px rgba(74, 101, 114, 0.5);
  border-radius: 8px;
  position: relative;
  z-index: 9999;
  transition: box-shadow 0.3s ease;
}
  /* ✅ ВСТАВИТЬ ВОТ СЮДА (скроллбар) */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
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

const formatNumber = (num) => new Intl.NumberFormat('ru-RU').format(num || 0);

const ChevronDown = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

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
  const [userRole, setUserRole] = useState('foreman');
  const [userCompany, setUserCompany] = useState(null);
  const [userCompanyId, setUserCompanyId] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
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
  const [isLoading, setIsLoading] = useState(false);
  const notificationId = useRef(0);
  const fileInputRef = useRef(null);
  const [profileDataForHeader, setProfileDataForHeader] = useState({ fullName: '', phone: '' });
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState({});
  const [templates, setTemplates] = useState([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
const [onboardingStep, setOnboardingStep] = useState(0);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('foreman');
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
const [_showTariffModal, setShowTariffModal] = useState(false);
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
const [churnSubmitting, setChurnSubmitting] = useState(false);
const [churnReasons, setChurnReasons] = useState([]);

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
    return getRolePermissions(userRole || 'foreman');
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
        setMobileMenuOpen(false);
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
        const role = metadata?.role || 'foreman';
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
              const role = metadata?.role || 'foreman';
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
        const role = metadata?.role || 'foreman';
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
                role: 'foreman',
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
  if (user && userRole === 'foreman' && currentUserPermissions.canCreate) {
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
const onboardingHighlights = useMemo(() => [
  {
    selector: 'button[aria-label="Создать заявку"]',
    title: 'Создание заявки',
    description: 'Нажмите сюда, чтобы создать новую заявку на материалы',
    actionLabel: 'Попробуйте создать свою первую заявку!',
    position: { top: '60%', left: '50%' }
  },
  {
    selector: '[data-nav="analytics"]',
    title: 'Аналитика',
    description: 'Здесь вы можете отслеживать все показатели по объектам',
    actionLabel: 'Проверьте статистику по вашим заявкам',
    position: { top: '20%', left: '70%' }
  },
  {
    selector: '[data-nav="warehouse"]',
    title: 'Склад',
    description: 'Управляйте остатками материалов на складе',
    actionLabel: 'Проверьте текущие остатки',
    position: { top: '20%', left: '50%' }
  },
  {
    selector: '[data-nav="chat"]',
    title: 'Чат команды',
    description: 'Общайтесь с коллегами прямо в приложении',
    actionLabel: 'Отправьте первое сообщение',
    position: { top: '20%', left: '30%' }
  },
  {
    selector: '[data-profile-menu]',
    title: 'Профиль',
    description: 'Настройте уведомления и экспорт данных',
    actionLabel: 'Заполните информацию о себе',
    position: { top: '10%', left: '90%' }
  }
], []);

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
    
    if (data.version !== APP_VERSION) {
      // Проверяем, не отклоняли ли уже это обновление
      const declinedKey = `update_declined_${data.version}`;
      const declinedAt = localStorage.getItem(declinedKey);
      
      // Если отклонено менее чем 24 часа назад, не показываем
      if (declinedAt && (Date.now() - parseInt(declinedAt) < 24 * 60 * 60 * 1000)) {
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
        setUpdateInfo({
          from: APP_VERSION,
          to: data.version,
          changes: data.changes,
          date: data.date
        });
        setShowUpdateModal(true);
        localStorage.setItem('last_update_shown', data.version);
      }
    }
  } catch (err) {
    console.warn('[UpdateCheck]', err);
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

    let finalRole = 'foreman';
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
          finalRole = 'foreman';
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

  // ─────────────────────────────────────────────────────────
  // 👥 INVITE USER - ✅ ИСПРАВЛЕНО С ОТЛАДКОЙ
  // ─────────────────────────────────────────────────────────
  const handleInviteUser = async () => {
    if (!inviteEmail || !inviteRole) {
      showNotification(t('enterValidEmail'), 'error');
      return;
    }

    // ✅ ДОБАВИТЬ отладку
    console.log('[INVITE DEBUG]', {
      userRole,
      isCompanyOwner,
      inviteRole,
      userCompanyId,
      userId: user?.id
    });

    if (!canInviteRole(userRole, inviteRole, isCompanyOwner)) {
      showNotification(t('cantInviteRole'), 'error');
      return;
    }

    if (inviteRole === 'super_admin') {
      showNotification('Роль супер-админа не может быть назначена через интерфейс', 'error');
      return;
    }

    if (inviteRole === 'manager' && !isCompanyOwner) {
      showNotification('Только владелец компании может приглашать менеджеров', 'error');
      return;
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
      showNotification(t('inviteSent'), 'success');
      setInviteEmail('');
      setInviteRole('foreman');
      setShowInviteModal(false);
    } catch (err) {
      console.error('Ошибка отправки приглашения:', err);
      showNotification(t('inviteFailed') + ': ' + err.message, 'error');
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

  // ─────────────────────────────────────────────────────────
  // 📤 SUBMIT APPLICATION
  // ─────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────
// 📤 SUBMIT APPLICATION — С ИНТЕГРАЦИЕЙ APPROVAL WORKFLOW
// ─────────────────────────────────────────────────────────
const handleSubmit = async (e) => {
  e.preventDefault();
  
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
  
  // ========== 🆕 НОВОЕ: ПРОВЕРКА НА НЕОБХОДИМОСТЬ СОГЛАСОВАНИЯ ==========
  // Рассчитываем общую сумму заявки
  const totalAmount = validMaterials.reduce((sum, m) => 
    sum + (m.quantity * (m.price || 1000)), 0
  );
  
  // Проверяем, требуется ли согласование
  const needsApproval = requiresApproval(validMaterials);
  
  // Определяем начальный статус
  const initialStatus = needsApproval ? 'pending_approval' : APPLICATION_STATUS.PENDING;
  // ========== КОНЕЦ НОВОГО БЛОКА ==========
  
  // 🔐 Проверка квоты
  if (currentPlan && !planLoading) {
    const quotaOk = await checkApiQuota();
    if (!quotaOk) {
      showNotification('⚠️ Лимит исчерпан. Обновите тариф.', 'warning');
      return;
    }
  }
  
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
    created_at: new Date().toISOString(),
    total_amount: totalAmount,
    status_history: [{
      user_id: sessionUser.id,
      user_email: sessionUser.email,
      action: needsApproval ? 'created_awaiting_approval' : 'created',
      timestamp: new Date().toISOString()
    }],
    viewed_by_supply_admin: false
  };
  
  // ─────────────────────────────────────────────────────────
  // 🔄 OFFLINE QUEUE INTEGRATION
  // ─────────────────────────────────────────────────────────
  
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
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('applications')
      .insert([newApplication])
      .select();
    
    if (error) throw error;
    
    const realApplicationId = data[0].id;
    
    // ========== 🆕 НОВОЕ: ЕСЛИ ТРЕБУЕТСЯ СОГЛАСОВАНИЕ ==========
if (needsApproval) {
  // Создаем заказ на закупку при сумме > 100000
  if (totalAmount > 100000) {
    await supabase
      .from('purchase_orders')
      .insert([{
        application_id: data[0].id,
        company_id: safeCompanyId,
        created_by: sessionUser.id,
        total_amount: totalAmount,
        status: 'pending_approval',
        expected_delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      }]);
  }
  
  await approvalEngine.createApprovalRequest(data[0], safeCompanyId);
  showNotification('📋 Заявка отправлена на согласование руководителю', 'info');
  
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
  return;
}
// ========== КОНЕЦ НОВОГО БЛОКА ==========
    
    await logApplicationCreated(supabase, {
      id: realApplicationId,
      object_name: formData.objectName.trim(),
      foreman_name: formData.foremanName.trim(),
      foreman_phone: formData.foremanPhone,
      materials: materialsWithTracking,
      status: initialStatus
    }, userContext);
    
    if (NOTIFICATIONS_ENABLED) {
      try {
        const response = await fetch('/functions/v1/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'application_created', application: data[0] })
        });
        if (response.status === 404) {
          console.warn('⚠️ Edge Function не развёрнута');
        }
      } catch (err) {
        console.warn('⚠️ Уведомление не отправлено:', err);
      }
    }
    
    setApplications([data[0], ...applications.slice(0, ITEMS_PER_PAGE - 1)]);
    
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
    return;
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
    await logAuditAction(supabase, {
      actionType: 'application_canceled',
      entityType: 'application',
      entityId: id,
      oldValue: { status: appToCancel.status },
      newValue: { status: 'canceled' },
      companyId: userCompanyId,
      userId: user?.id,
      userEmail: user?.email,
      userRole: userRole,
      userFullName: profileDataForHeader.fullName,
      userPhone: profileDataForHeader.phone
    });
    const newHistoryEntry = {
      user_id: user?.id,
      user_email: user?.email,
      old_status: appToCancel.status,
      new_status: APPLICATION_STATUS.CANCELED,
      action: 'canceled',
      timestamp: new Date().toISOString()
    };
    const updatedHistory = [...(appToCancel.status_history || []), newHistoryEntry];
    const { error } = await supabase
      .from('applications')
      .update({
        status: APPLICATION_STATUS.CANCELED,
        status_history: updatedHistory
      })
      .eq('id', id)
      .eq('user_id', user?.id);
    if (error) {
      console.error('Ошибка при отмене заявки:', error);
      showNotification('Ошибка при отмене заявки', 'error');
      return;
    }
    const updatedApps = applications.map(app =>
      app.id === id ? { ...app, status: APPLICATION_STATUS.CANCELED, status_history: updatedHistory } : app
    );
    setApplications(updatedApps);
    if (isAdminMode) {
      const updatedAll = allApplications.map(app =>
        app.id === id ? { ...app, status: APPLICATION_STATUS.CANCELED, status_history: updatedHistory } : app
      );
      setAllApplications(updatedAll);
    }
    showNotification(t('applicationCanceled') || 'Заявка отменена', 'success');
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
      user_role: userRole || 'foreman',
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
  };
  
  logFeatureUsage();
  
  if (currentView === 'analytics' && userCompanyId && user?.id) {
    const userCtx = getUserContext(user, profileDataForHeader, userRole, userCompanyId);
    
    if (shouldLogFeature('analytics', userCompanyId, lastLoggedRef.current)) {
      logAnalyticsAccess(supabase, userCtx, 'dashboard');
    }
  }
}, [currentView, userCompanyId, user, userRole, profileDataForHeader, supabase]);

  // ─────────────────────────────────────────────────────────
  // 🔍 FILTERING
  // ─────────────────────────────────────────────────────────
  const filteredApplications = useMemo(() => {
    const apps = isAdminMode ? allApplications : applications;
    return apps.filter(app => {
      const matchesSearch = app.object_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.foreman_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.foreman_phone && app.foreman_phone.includes(searchTerm));
      const matchesStatus = statusFilter === 'all' ||
        app.status === statusFilter ||
        (statusFilter === 'pending' && [APPLICATION_STATUS.PENDING, APPLICATION_STATUS.ADMIN_PROCESSING].includes(app.status));
      const matchesDate = !dateFilter || app.created_at.startsWith(dateFilter);
      const matchesViewed = viewedFilter === 'all' ||
        (viewedFilter === 'new' && !app.viewed_by_supply_admin);
      return matchesSearch && matchesStatus && matchesDate && matchesViewed;
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
    if (userRole === 'supply_admin') {
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
    if (mode === 'admin_receive' && userRole !== 'supply_admin' && userRole !== 'manager') {
      showNotification('Нет прав на приёмку', 'error');
      return;
    }
    if (mode === 'master_confirm' && userRole !== 'foreman') {
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
      if (WAREHOUSE_ENABLED && (userRole === 'supply_admin' || userRole === 'manager')) {
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

  const handleAdminReceive = useCallback(async (materialsFromModal, application) => {
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
    const newAppStatus = allReceived
      ? APPLICATION_STATUS.PARTIAL_RECEIVED
      : anyReceived
        ? APPLICATION_STATUS.PARTIAL_RECEIVED
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
      console.error('❌ Ошибка обновления истории:', error);
      showNotification('Ошибка сохранения истории', 'error');
      return { success: false, error };
    }
    if (WAREHOUSE_ENABLED) {
      for (const mat of updatedMaterials) {
        const qty = Number(mat.supplier_received_quantity) || 0;
        if (qty > 0) {
          await supabase.rpc('update_warehouse_balance', {
            p_company_id: userCompanyId,
            p_item_name: (mat.description || '').trim(),
            p_quantity: qty,
            p_transaction_type: 'income',
            p_user_id: user?.id,
            p_user_email: user?.email,
            p_comment: `Приёмка: ${application.object_name}`,
            p_application_id: application.id,
            p_unit: mat.unit || 'шт'
          });
        }
      }
    }
    setApplications(prev => prev.map(app =>
      app.id === application.id
        ? { ...app, status: newAppStatus, materials: updatedMaterials, status_history: [...(app.status_history || []), newHistoryEntry] }
        : app
    ));
    return { success: true, newAppStatus, updatedMaterials };
  }, [user, userCompanyId, WAREHOUSE_ENABLED, showNotification, setApplications]);

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
      const updatedMaterials = application.materials.map((m) => {
        const item = itemsToSend.find(i =>
          i.description === m.description &&
          i.unit === m.unit
        );
        if (item && (Number(item.quantityToSend) || 0) > 0) {
          return {
            ...m,
            sent_to_master_quantity: Number(item.quantityToSend),
            status: ITEM_STATUS.SENT_TO_MASTER,
            sent_to_master_at: new Date().toISOString(),
            sent_to_master_by: user?.id
          };
        }
        return m;
      });
      const newHistoryEntry = {
        user_id: user?.id,
        user_email: user?.email,
        old_status: application.status,
        new_status: APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
        action: 'sent_to_master',
        timestamp: new Date().toISOString(),
        details: `Отправлено мастеру: ${itemsToSend.filter(i => (Number(i.quantityToSend) || 0) > 0).length} позиций`
      };
      await supabase
        .from('applications')
        .update({
          status: APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION,
          materials: updatedMaterials,
          status_history: [...(application.status_history || []), newHistoryEntry],
          updated_at: new Date().toISOString()
        })
        .eq('id', application.id);
      setApplications(prev => prev.map(app =>
        app.id === application.id
          ? { ...app, status: APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION, materials: updatedMaterials, status_history: [...(app.status_history || []), newHistoryEntry] }
          : app
      ));
      showNotification('✅ Материалы отправлены мастеру', 'success');
      return { success: true, updatedMaterials };
    } catch (err) {
      console.error('❌ Ошибка в handleSendToMaster:', err);
      showNotification('Ошибка отправки: ' + err.message, 'error');
      return { success: false, error: err };
    }
  }, [user, showNotification, setApplications]);

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
            await supabase.rpc('update_warehouse_balance', {
              p_company_id: userCompanyId,
              p_item_name: (mat.description || '').trim(),
              p_quantity: qty,
              p_transaction_type: 'expense',
              p_user_id: user?.id,
              p_user_email: user?.email,
              p_comment: `Выдача мастеру: ${application.object_name}`,
              p_application_id: application.id,
              p_unit: mat.unit || 'шт',
              p_target_object_name: application.object_name,
              p_recipient_name: application.foreman_name,
              p_recipient_phone: application.foreman_phone
            });
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
  
  // ✅ Проверить кэш
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
    const { count } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', userCompanyId);
    const totalPages = Math.ceil(count / ITEMS_PER_PAGE);
    setTotalPages(totalPages);
    let query = supabase
      .from('applications')
      .select('*')
      .eq('company_id', userCompanyId)
      .order('created_at', { ascending: false })
      .range((pageNumber - 1) * ITEMS_PER_PAGE, pageNumber * ITEMS_PER_PAGE - 1);
    if (userRole === 'foreman') query = query.eq('user_id', user?.id);
    if (userRole === 'accountant') query = query.eq('status', 'received');
    const { data: userApps = [], error: userError } = await query;
    if (userError) throw userError;
    setApplications(userApps);
    
    // Загрузка пользователей для метрик активации
    const { data: usersData } = await supabase
      .from('company_users')
      .select('user_id, created_at, full_name, role')
      .eq('company_id', userCompanyId);

    let commentsMap = {};
    if (usersData) {
      setCompanyUsers(usersData);
    }
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
      if (!allApps) setAllApplications([]);
      else setAllApplications(allApps);
    }
    
    // ✅ Сохранить в кэш после загрузки
    cacheManager.set('applications', cacheKey, {
      userApps,
      totalPages,
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

  useEffect(() => {
    loadApplications(page);
  }, [user, userCompanyId, userRole, isAdminMode, page, loadApplications]);
  // 💰 Load company plan & quota
useEffect(() => {
  const loadPlan = async () => {
    // 🔒 Супер-админ: не загружаем тариф компании
    if (isSuperAdmin(userRole, user?.user_metadata)) {
      setCurrentPlan(null);
      setPlanLoading(false);
      return;
    }
    
    if (!userCompanyId || !supabase) return;
    try {
      setPlanLoading(true);
      const plan = await getCompanyPlan(supabase, userCompanyId);
      setCurrentPlan(plan);
      
      // 🆕 ЗАГРУЗКА ДЕТАЛЕЙ ТАРИФА
      const { data: companyData } = await supabase
        .from('companies')
        .select('plan_activated_at, plan_expires_at, promo_code_used, promo_applied_at, promo_discount_percent')
        .eq('id', userCompanyId)
        .single();
      
      if (companyData) {
        setCurrentPlanDetails({
          activated_at: companyData.plan_activated_at,
          expires_at: companyData.plan_expires_at
        });
        
        if (companyData.promo_code_used) {
          setPromoCodeInfo({
            code: companyData.promo_code_used,
            applied_at: companyData.promo_applied_at,
            discount_percent: companyData.promo_discount_percent
          });
        }
      }
      
      const quota = await checkQuota(supabase, userCompanyId);
      setQuotaStatus(quota);
      
      // ✅ Добавить использование getUsageStats
      const stats = await getUsageStats(userCompanyId);
      console.log('Usage stats:', stats);
      
    } catch (err) {
      console.warn('Failed to load plan:', err);
      setCurrentPlan(TARIFF_PLANS.basic);
    } finally {
      setPlanLoading(false);
    }
  };
  loadPlan();
}, [userCompanyId, supabase, userRole, user, isSuperAdmin]);

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

  // ─────────────────────────────────────────────────────────
  // 🧭 VIEW ROUTING
  // ─────────────────────────────────────────────────────────
 // ✅ НОВАЯ ВЕРСИЯ (с защитой для супер-админа)
useEffect(() => {
  if (!user) return;
  
  // 🔒 СУПЕР-АДМИН: Всегда на superAdmin вьюхе
  if (isSuperAdmin(userRole, user?.user_metadata)) {
    if (currentView !== 'superAdmin' && currentView !== 'tariffs') {
      console.log('[SuperAdmin] Перенаправление на superAdmin панель');
      setCurrentView('superAdmin');
    }
    return; // ⚠️ ВАЖНО: выходим, чтобы обычная логика не сработала
  }
  
  // 👨‍💼 ОБЫЧНЫЕ ПОЛЬЗОВАТЕЛИ: обычная логика
  if (currentUserPermissions.canCreate) {
    setCurrentView('create');
  } else if (currentUserPermissions.canViewAnalytics) {
    setCurrentView('analytics');
  } else {
    setCurrentView('pending');
  }
}, [user, userRole, currentUserPermissions.canCreate, currentUserPermissions.canViewAnalytics, currentView]);

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

  // 🎯 Onboarding Tour Logic
useEffect(() => {
  const checkOnboarding = async () => {
    if (!user || !userCompanyId) return;
    
    // 🔒 Супер-админу не показываем onboarding
    if (isSuperAdmin(userRole, user?.user_metadata)) {
      return;
    }
    
    const completed = localStorage.getItem(`onboarding_${userCompanyId}`);
    if (!completed) {
      setTimeout(() => {
        setShowOnboarding(true);
      }, 2000);
    }
  };
  checkOnboarding();
}, [user, userCompanyId, userRole]);

const handleOnboardingComplete = async () => {
  setShowOnboarding(false);
  if (userCompanyId) {
    localStorage.setItem(`onboarding_${userCompanyId}`, 'true');
  }
  showNotification('🎉 Onboarding завершён! Теперь вы готовы к работе', 'success');
};

const resetOnboarding = () => {
  if (userCompanyId) {
    localStorage.removeItem(`onboarding_${userCompanyId}`);
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
  if (!userCompanyId) {
    showNotification('Ошибка: компания не указана', 'error');
    return;
  }
  try {
    // 🔍 ОТЛАДКА: логируем изменение тарифа
    console.log('🔍 [TARIFF] Changing plan:', {
      userCompanyId,
      planId,
      userId: user?.id,
      userEmail: user?.email,
      userRole
    });
    
    const { error } = await supabase
      .from('companies')
      .update({
        plan_tier: planId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userCompanyId);
    
    if (error) throw error;
    
    setCurrentPlan(TARIFF_PLANS[planId]);
    setShowTariffModal(false);
    showNotification(`✅ Тариф "${TARIFF_PLANS[planId].name}" активирован`, 'success');
    
    // 🔍 ОТЛАДКА АУДИТА
    console.log('📝 [AUDIT] Calling logAuditAction...');
    const auditResult = await logAuditAction(supabase, {
      actionType: 'plan_changed',  // ← Исправлено: было 'settings_changed'
      entityType: 'company',
      entityId: userCompanyId,
      oldValue: { plan: currentPlan?.id },
      newValue: { plan: planId },
      companyId: userCompanyId,
      userId: user?.id,
      userEmail: user?.email,
      userRole: userRole
    });
    console.log('📝 [AUDIT] Result:', auditResult);
    
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

// 📊 Проверка квоты перед вызовом API
const checkApiQuota = useCallback(async (apiKeyId = null) => {
  // 🔒 Супер-админу не нужна проверка квоты
  if (isSuperAdmin(userRole, user?.user_metadata)) {
    return true;
  }
  if (!userCompanyId) return false;
  const quota = await checkQuota(supabase, userCompanyId, apiKeyId);
  setQuotaStatus(quota);
  if (!quota.allowed) {
    showNotification('⚠️ Лимит API исчерпан. Обновите тариф.', 'warning');
    setShowTariffModal(true);
  }
  return quota.allowed;
}, [userCompanyId, supabase, showNotification, userRole, user]);

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

  // ─────────────────────────────────────────────────────────
  // 🎨 RENDER FUNCTIONS
  // ─────────────────────────────────────────────────────────
  const renderHeader = () => (
    <header className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-sm border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-[#4A6572] to-[#344955] p-2.5 rounded-xl shadow-md">
              <img
                src="/icon-512.png"
                alt="Reglai logo"
                className="w-6 h-6"
                style={{ objectFit: 'contain' }}
              />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-[#4A6572] to-[#344955] bg-clip-text text-transparent">
                Реглай
              </h1>
              {userCompany && !isSuperAdmin(userRole, user?.user_metadata) && (
  <p className="text-xs text-gray-500 dark:text-gray-400">{userCompany}</p>
)}
            </div>
          </div>
          <div className="flex items-center space-x-4">
             {/* ← ДОБАВИТЬ ГЛОБАЛЬНЫЙ ПОИСК ЗДЕСЬ */}
  {user && (
    <div className="hidden md:block w-64">
      <GlobalSearch
        supabase={supabase}
        userCompanyId={userCompanyId}
        onResultSelect={(result) => {
          if (result.type === 'application') {
            setSelectedApplication(result.data);
            setShowReceiveModal(true);
          } else if (result.type === 'user') {
            setCurrentView('employees');
          } else if (result.type === 'company') {
            setCurrentView('employees');
          }
        }}
        t={t}
        showNotification={showNotification}
      />
    </div>
  )}
            <button
              onClick={handleLanguageChange}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
              aria-label={language === 'ru' ? 'Switch to English' : 'Переключить на русский'}
            >
              <Globe className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
              aria-label={theme === 'dark' ? t('toggleLightMode') : t('toggleDarkMode')}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {/* ✅ ИСПРАВЛЕНО: Кнопка приглашения теперь видна на мобильных */}
            {(userRole === 'manager' || userRole === 'supply_admin' || isCompanyOwner) && (
  <button
    onClick={() => {
      handleABTestClick('invite_button', 'invite_click');
      setShowInviteModal(true);
    }}
    className={`flex items-center ${
      abTestVariants.invite_button === 'icon_only'
        ? 'space-x-0 px-3 py-2'
        : 'space-x-2 px-3 py-2'
    } bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white text-sm font-medium rounded-xl hover:shadow-md transition-shadow`}
    aria-label={t('inviteUser')}
  >
    <User className="w-4 h-4" />
    {abTestVariants.invite_button !== 'icon_only' && (
      <span className="hidden sm:inline">{t('inviteUser')}</span>
    )}
  </button>
)}
            {user && (
              <div className="flex items-center space-x-2">
                {!isOnline ? (
                  <div className="flex items-center px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-lg text-xs font-medium animate-pulse">
                    <WifiOff className="w-4 h-4 mr-1" />
                    <span>{t('offlineMode')}</span>
                    {offlineDrafts.length > 0 && (
                      <span className="ml-1">({formatNumber(offlineDrafts.length)} {t('drafts')})</span>
                    )}
                  </div>
                ) : syncProgress.total > 0 && syncProgress.current < syncProgress.total ? (
                  <div className="flex items-center px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg text-xs font-medium">
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    <span>{formatNumber(syncProgress.current)}/{formatNumber(syncProgress.total)} {t('sendingDrafts')}</span>
                  </div>
                ) : null}
                <button
                  onClick={forceReload}
                  className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-1 transition-colors"
                  title="Перезагрузить данные"
                  aria-label={t('refreshData') || 'Обновить данные'}
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{t('refreshData') || 'Обновить'}</span>
                </button>
              </div>
            )}
            {user && (
              <div className="relative" ref={profileMenuRef}>
                <button
  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
  data-profile-menu  // ← ДОБАВИТЬ ЭТУ СТРОКУ
  className="flex items-center space-x-2 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border border-gray-200/50 dark:border-gray-700/50"
  aria-label={t('myData')}
>
                  <div className="w-8 h-8 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" aria-hidden="true" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {profileDataForHeader.fullName || user?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getRoleLabel(userRole)}
                    </p>
                  </div>
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-2 z-50 border border-gray-200/50 dark:border-gray-700/50 fade-enter">
                    <button
                      onClick={() => setCurrentView('profile')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-[#4A6572] dark:hover:text-[#F9AA33]"
                    >
                      {t('myData')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {t('logout')}
                    </button>
                  </div>
                )}
              </div>
            )}
            {!user && (
              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentView('login')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[#4A6572] dark:hover:text-[#F9AA33] hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-colors"
                >
                  {t('login')}
                </button>
                <button
                  onClick={() => setShowSignupModal(true)}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-md transition-shadow"
                >
                  {t('signup')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );

  const renderNavigation = () => {
  let navItems;
  const isRealSuperAdmin = isSuperAdmin(userRole, user?.user_metadata);
  
  // 🔒 СУПЕР-АДМИН: ТОЛЬКО админские пункты
  if (isRealSuperAdmin) {
    navItems = [
      { id: 'superAdmin', label: t('superAdminPanelTitle'), icon: Shield, condition: true },
      { id: 'tariffs', label: t('tariffs') || 'Тарифы', icon: DollarSign, condition: true }
    ];
    // ⚠️ ВАЖНО: Никаких 'create', 'warehouse', 'chat' и т.д.!
  } 
  // 👨‍💼 ОБЫЧНЫЕ ПОЛЬЗОВАТЕЛИ: все остальные пункты
  else {
    navItems = [
      { id: 'tasks', label: language === 'ru' ? 'Задачи' : 'Tasks', icon: CheckCircle, condition: currentUserPermissions.canCreate || userRole === 'manager' || userRole === 'supply_admin' },
      { id: 'approvals', label: `Согласование (${pendingApprovals.length})`, icon: CheckCircle, condition: userRole === 'manager' || userRole === 'director' },
      { id: 'create', label: t('createApplication'), icon: Plus, condition: currentUserPermissions.canCreate },
      { id: 'chat', label: t('chat') || 'Чат', icon: MessageCircle, condition: true },
      { id: 'audit', label: t('audit'), icon: History, condition: currentUserPermissions.canViewAudit },
      { id: 'calendar', label: t('calendar') || 'Календарь', icon: Calendar, condition: currentUserPermissions.canViewAnalytics },
      { id: 'inwork', label: language === 'ru' ? 'В работе' : 'In Work', icon: Briefcase, condition: userRole === 'foreman' || userRole === 'supply_admin' || userRole === 'manager' },
      { id: 'confirmation', label: language === 'ru' ? 'Подтверждение' : 'Confirmation', icon: CheckCircle, condition: userRole === 'foreman' },
      { id: 'warehouse', label: language === 'ru' ? 'Склад' : 'Warehouse', icon: Package, condition: userRole === 'manager' || userRole === 'supply_admin' || isAdminMode },
      { id: 'received', label: t('receivedTab'), icon: Package, condition: true },
      { id: 'history', label: t('history'), icon: Archive, condition: true },
      { id: 'analytics', label: t('analytics'), icon: BarChart3, condition: currentUserPermissions.canViewAnalytics },
      { id: 'employees', label: t('employees'), icon: Users, condition: userRole === 'manager' },
      { id: 'api', label: 'API', icon: Code, condition: userRole === 'manager' || isCompanyOwner },
      { id: 'invite', label: t('inviteUser'), icon: User, condition: userRole === 'manager' || userRole === 'supply_admin' || isCompanyOwner },
      { id: 'cart', label: t('cart'), icon: ShoppingCart, condition: formData.cart.length > 0 },
      { id: 'tariffs', label: t('tariffs') || 'Тарифы', icon: Sparkles, condition: isCompanyOwner || userRole === 'manager' }
    ].filter(item => item.condition);
  }

  return (
    <nav className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-sm border-b border-gray-200/50 dark:border-gray-700/50 sticky top-16 z-40 page-enter">
      <div className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6">
  <div className="flex justify-center h-14">  {/* ← ИСПРАВЛЕНО */}
    <div className="hidden lg:flex items-center space-x-1 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'invite') {
                    setShowInviteModal(true);
                  } else {
                    setCurrentView(item.id);
                  }
                  setMobileMenuOpen(false);
                }}
                data-nav={item.id}
                title={item.label} // Нативная подсказка
                className={`
                  group relative flex items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 flex-shrink-0 snap-center
                  ${currentView === item.id
                    ? 'bg-gradient-to-r from-[#4A6572]/10 to-[#344955]/10 text-[#344955] dark:text-[#F9AA33] border border-[#4A6572]/20 dark:border-[#F9AA33]/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-[#4A6572] dark:hover:text-[#F9AA33]'}
                `}
              >
                {/* ИКОНКА: Видна всегда (на lg и выше) */}
                <item.icon className={`w-5 h-5 transition-transform duration-200 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`} aria-hidden="true" />
                
                {/* ТЕКСТ: Скрыт на lg, появляется на 2xl (широкие мониторы) */}
                <span className="hidden 2xl:inline ml-2 whitespace-nowrap text-sm font-medium">
                  {item.label}
                </span>

                {/* КАСТОМНЫЙ ТУЛТИП: Появляется на lg при наведении, скрыт на 2xl */}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap 2xl:hidden z-50">
                  {item.label}
                  {/* Стрелочка тултипа */}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></span>
                </span>
              </button>
            ))}
          </div>

          {/* ✅ БУРГЕР МЕНЮ (появляется только на экранах < lg) */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
              aria-label="Открыть меню"
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Мобильное меню (для экранов < lg) */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 fade-enter max-h-[80vh] overflow-y-auto">
          <div className="px-3 pt-2 pb-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'invite') {
                    setShowInviteModal(true);
                  } else {
                    setCurrentView(item.id);
                  }
                  setMobileMenuOpen(false);
                }}
                data-nav={item.id}
                className={`w-full text-left px-4 py-3 rounded-lg text-base font-medium flex items-center space-x-3 transition-colors ${
                  currentView === item.id
                    ? 'bg-gradient-to-r from-[#4A6572]/10 to-[#344955]/10 text-[#344955] dark:text-[#F9AA33]'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <item.icon className="w-5 h-5" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

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

  const renderAnalyticsDashboard = () => (
  <div className="max-w-7xl mx-auto p-4 page-enter">
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-0">{t('analytics')}</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => downloadAnalyticsAsPDF(
              getObjectAnalytics,
              statusData,
              processingTimeData,
              t,
              language,
              userCompany,
              showNotification,
              setIsExportingAnalyticsPDF,
              escapeHtml
            )}
            disabled={isExportingAnalyticsPDF}
            className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300/50 dark:border-gray-600/50 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-medium flex items-center"
          >
            <Download className="w-4 h-4 mr-1" aria-hidden="true" />
            PDF
          </button>
          <button
            onClick={() => downloadAnalyticsAsHTML(
              getObjectAnalytics,
              statusData,
              processingTimeData,
              t,
              language,
              userCompany,
              showNotification,
              setIsExportingAnalyticsHTML,
              escapeHtml
            )}
            disabled={isExportingAnalyticsHTML}
            className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300/50 dark:border-gray-600/50 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-medium"
          >
            HTML
          </button>
          <button
            onClick={() => downloadAnalyticsAsXLSX(
              getObjectAnalytics,
              t,
              setIsExportingAnalyticsXLSX
            )}
            disabled={isExportingAnalyticsXLSX}
            className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300/50 dark:border-gray-600/50 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm font-medium"
          >
            Excel
          </button>
          {isAdminMode && (
            <button
              onClick={handleAdminLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center space-x-1"
            >
              <Shield className="w-4 h-4" aria-hidden="true" />
              <span>{t('adminMode')}</span>
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 auto-rows-fr">
        {/* 🔹 Карточка 1: Заявок */}
        <button
          onClick={() => setAnalyticsDetailType('applications')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('totalApplications')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform">
            {formatNumber(getObjectAnalytics.reduce((sum, obj) => sum + obj.totalApplications, 0))}
          </div>
          <div className="text-xs text-gray-400 mt-2">за всё время</div>
        </button>
        
        {/* 🔹 Карточка 2: Объекты */}
        <button
          onClick={() => setAnalyticsDetailType('objects')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('totalObjects')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform">
            {formatNumber(getObjectAnalytics.length)}
          </div>
          <div className="text-xs text-gray-400 mt-2">объектов</div>
        </button>
        
        {/* 🔹 Карточка 3: Материалы */}
        <button
          onClick={() => setAnalyticsDetailType('materials')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('totalMaterials')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform">
            {formatNumber(getObjectAnalytics.reduce((sum, obj) => sum + obj.totalMaterials, 0))}
          </div>
          <div className="text-xs text-gray-400 mt-2">всего заказано</div>
        </button>
        
        {/* 🔹 Карточка 4: Полученные материалы */}
        <button
          onClick={() => setAnalyticsDetailType('receivedMaterials')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('receivedMaterials')}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform">
            {formatNumber(getObjectAnalytics.reduce((sum, obj) => sum + obj.receivedMaterials, 0))}
          </div>
          <div className="text-xs text-gray-400 mt-2">получено на склад</div>
        </button>
        
        {/* 🔹 Карточка 5: Activation Rate */}
        <button
          onClick={() => setAnalyticsDetailType('activation')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
          title="Процент пользователей, создавших первую заявку в течение 24 часов"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Activation Rate (24ч)</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform inline-block">
              {activationMetrics.rate}%
            </span>
            <span className="text-xs text-gray-400">
              {activationMetrics.activated}/{activationMetrics.total}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#4A6572] to-[#344955] transition-all duration-500"
              style={{ width: `${activationMetrics.rate}%` }}
            />
          </div>
        </button>
        
        {/* 🔹 Карточка 6: Time to First Value */}
        <button
          onClick={() => setAnalyticsDetailType('ttfv')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
          title="Среднее время от регистрации до первой заявки"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Time to First Value</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform">
              {timeToFirstValue.averageDays !== null ? `${timeToFirstValue.averageDays} дн.` : '—'}
            </span>
            <span className="text-xs text-gray-400">(n={timeToFirstValue.sampleSize})</span>
          </div>
          {timeToFirstValue.distribution && (
            <div className="mt-2 flex gap-1">
              {['< 1 ч', '1 - 24 ч', '> 24 ч'].map((key) => {
                const count = timeToFirstValue.distribution[key] || 0;
                const pct = timeToFirstValue.sampleSize > 0 ? Math.round(count / timeToFirstValue.sampleSize * 100) : 0;
                return (
                  <div key={key} className="flex-1 text-center">
                    <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded">
                      <div className="h-full bg-[#4A6572] rounded transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[9px] text-gray-400 mt-0.5">{pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </button>

        {/* 🔹 Карточка 7: Feature Adoption */}
        <button
          onClick={() => setAnalyticsDetailType('adoption')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
          title="Использование функций по ролям"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Feature Adoption</div>
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="text-gray-500">📦 Склад</span>
            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded">
              <div className="h-full bg-[#4A6572] rounded" style={{ width: `${featureAdoption.overall.warehouse}%` }} />
            </div>
            <span className="text-gray-500 w-8 text-right">{featureAdoption.overall.warehouse}%</span>
          </div>
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="text-gray-500">💬 Чат</span>
            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded">
              <div className="h-full bg-[#F9AA33] rounded" style={{ width: `${featureAdoption.overall.chat}%` }} />
            </div>
            <span className="text-gray-500 w-8 text-right">{featureAdoption.overall.chat}%</span>
          </div>
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="text-gray-500">📊 Аналитика</span>
            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded">
              <div className="h-full bg-[#3b82f6] rounded" style={{ width: `${featureAdoption.overall.analytics}%` }} />
            </div>
            <span className="text-gray-500 w-8 text-right">{featureAdoption.overall.analytics}%</span>
          </div>
          <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between text-[9px] text-gray-400">
              <span>Среднее</span>
              <span>{Math.round((featureAdoption.overall.warehouse + featureAdoption.overall.chat + featureAdoption.overall.analytics) / 3)}%</span>
            </div>
          </div>
        </button>

        {/* 🔹 Карточка 8: NPS Score */}
        <button
          onClick={() => setAnalyticsDetailType('nps')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
          title="Net Promoter Score"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">NPS Score</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold group-hover:scale-105 transition-transform ${
              npsMetrics.score >= 50 ? 'text-green-600' :
              npsMetrics.score >= 0 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {npsMetrics.score !== null ? npsMetrics.score : '—'}
            </span>
            <span className="text-xs text-gray-400">({npsMetrics.total} ответов)</span>
          </div>
          <div className="mt-2 flex gap-1 text-[10px]">
            <span className="text-green-600">👍 {npsMetrics.promotersPercent}%</span>
            <span className="text-gray-400">|</span>
            <span className="text-yellow-600">😐 {npsMetrics.passivesPercent}%</span>
            <span className="text-gray-400">|</span>
            <span className="text-red-600">👎 {npsMetrics.detractorsPercent}%</span>
          </div>
        </button>

        {/* 🔹 Карточка 9: Churn Reasons */}
        <button
          onClick={() => setAnalyticsDetailType('churn')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
          title="Причины оттока пользователей"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Churn Reasons</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform">
              {churnMetrics.total}
            </span>
            <span className="text-xs text-gray-400">записей</span>
          </div>
          {churnMetrics.topReason && (
            <div className="mt-2 text-xs text-gray-500 truncate">
              Топ: {REASON_OPTIONS.find(r => r.value === churnMetrics.topReason)?.label || churnMetrics.topReason}
            </div>
          )}
        </button>

        {/* 🔹 Карточка 10: A/B Test Results */}
        <button
          onClick={() => setAnalyticsDetailType('ab_tests')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
          title="Результаты A/B-тестов"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">A/B Test Results</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform">
              {Object.keys(AB_TEST_CONFIG).length}
            </span>
            <span className="text-xs text-gray-400">активных тестов</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(abTestVariants).slice(0, 2).map(([testName, variant]) => (
              <span key={testName} className={`text-[9px] px-1 py-0.5 rounded ${
                variant === 'variant_a' || variant === 'monthly' || variant === 'icon_text'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
              }`}>
                {testName.split('_')[0]}: {variant}
              </span>
            ))}
          </div>
        </button>

        {/* 🔹 Карточка 11: Использование квоты */}
        <button
          onClick={() => setAnalyticsDetailType('quota')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Использование API</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform">
              {quotaStatus?.dailyUsage || 0} / {quotaStatus?.dailyLimit || 100}
            </span>
            <span className="text-xs text-gray-400">/день</span>
          </div>
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#4A6572] to-[#344955] transition-all"
              style={{ width: `${quotaStatus ? (quotaStatus.dailyUsage / quotaStatus.dailyLimit) * 100 : 0}%` }}
            />
          </div>
        </button>

        {/* 🔹 Карточка 12: User Retention */}
        <button
          onClick={() => setAnalyticsDetailType('retention')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
          title="Удержание пользователей по месяцам"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">User Retention</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform">
              {retentionMetrics.overallRetention}%
            </span>
            <span className="text-xs text-gray-400">через 1 месяц</span>
          </div>
          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#4A6572] to-[#344955] transition-all"
              style={{ width: `${retentionMetrics.overallRetention}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {retentionMetrics.cohorts.length} когорт
          </div>
        </button>

        {/* 🔹 Карточка 13: User Engagement */}
        <button
          onClick={() => setAnalyticsDetailType('engagement')}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left h-36 flex flex-col justify-between group"
          title="Вовлеченность пользователей за 30 дней"
        >
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">User Engagement</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform">
              {engagementMetrics.activeUsers}
            </span>
            <span className="text-xs text-gray-400">активных</span>
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 mt-1">
            <span>📋 {engagementMetrics.totalApplications} заявок</span>
            <span>📊 {engagementMetrics.avgApplicationsPerUser} на пользователя</span>
          </div>
          {engagementMetrics.topUsers.length > 0 && (
            <div className="text-[9px] text-gray-400 mt-1 truncate">
              Топ: {engagementMetrics.topUsers[0]?.count} заявок
            </div>
          )}
        </button>
      </div>
    </div>
  </div>
);
              
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

  const PrivacyPolicyModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 fade-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full md:max-w-lg lg:max-w-2xl max-h-[80vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 id="privacy-policy-title" className="text-xl font-bold text-gray-900 dark:text-white">
            {t('privacyPolicy')}
          </h3>
          <button
            onClick={() => setPrivacyPolicyOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label={t('close')}
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2 overflow-y-auto max-h-[60vh]">
          <p>Настоящая Политика конфиденциальности регулирует порядок обработки и использования персональных данных пользователей приложения «Снабжение ВиК» (далее — Приложение).</p>
          <h4 className="font-bold">1. Сбор информации</h4>
          <p>Мы собираем следующую информацию:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>ФИО</li>
            <li>Номер телефона</li>
            <li>Email</li>
            <li>Название компании</li>
            <li>Роль в компании (прораб, менеджер снабжения и т.д.)</li>
          </ul>
          <h4 className="font-bold">2. Использование информации</h4>
          <p>Собранная информация используется для:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Идентификации пользователя в системе</li>
            <li>Отправки уведомлений о заявках</li>
            <li>Формирования отчетов для руководства</li>
            <li>Улучшения функционала Приложения</li>
          </ul>
          <h4 className="font-bold">3. Хранение данных</h4>
          <p>Данные хранятся на защищенных серверах в Российской Федерации. Срок хранения — пока пользователь является активным сотрудником компании.</p>
          <h4 className="font-bold">4. Права пользователя</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Получать информацию о том, какие данные о вас хранятся</li>
            <li>Запрашивать исправление неточных данных</li>
            <li>Запрашивать удаление ваших данных (обратитесь к администратору вашей компании)</li>
          </ul>
          <h4 className="font-bold">5. Отзыв согласия</h4>
          <p>Вы можете в любой момент отозвать согласие на обработку персональных данных, написав администратору вашей компании. После этого ваш аккаунт будет удалён.</p>
          <p className="font-semibold text-gray-900 dark:text-white">Нажимая «Зарегистрироваться», вы подтверждаете, что ознакомились с настоящей Политикой и даёте согласие на обработку персональных данных.</p>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setPrivacyPolicyOpen(false)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            aria-label={t('gotIt')}
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );

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
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9999] fade-enter"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSignupModal(false);
          }
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full md:max-w-lg lg:max-w-xl p-6 dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 id="signup-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
              {t('signupTitle')}
            </h3>
            <button
              onClick={() => setShowSignupModal(false)}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label={t('close')}
            >
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('yourEmail')} *
              </label>
              <input
                id="signup-email"
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="signup-fullname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('fullName')} *
              </label>
              <input
                id="signup-fullname"
                type="text"
                value={signupFullName}
                onChange={(e) => setSignupFullName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('fullName')}
                required
              />
            </div>
            <div>
              <label htmlFor="signup-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('phoneNumber')} *
              </label>
              <input
                id="signup-phone"
                type="tel"
                value={signupPhone}
                onChange={(e) => setSignupPhone(formatPhone(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="+7 (___) ___-__-__"
                required
              />
            </div>
            {!invitedCompany && (
              <div>
                <label htmlFor="signup-company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('companyName')} *
                </label>
                <input
                  id="signup-company"
                  type="text"
                  value={signupCompanyName}
                  onChange={(e) => setSignupCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={t('companyName')}
                  required={!invitedCompany}
                />
              </div>
            )}
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('yourPassword')} *
              </label>
              <input
                id="signup-password"
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div>
              <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('confirmPassword')} *
              </label>
              <input
                id="signup-confirm-password"
                type="password"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="flex items-start">
              <input
                id="signup-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 w-4 h-4 text-[#4A6572] border-gray-300 rounded focus:ring-[#4A6572]"
                required
              />
              <label htmlFor="signup-consent" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {t('consentText')}{' '}
                <button
                  type="button"
                  onClick={() => setPrivacyPolicyOpen(true)}
                  className="text-[#4A6572] hover:underline dark:text-[#F9AA33]"
                >
                  {t('privacyPolicy')}
                </button>
              </label>
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
            >
              {t('signup')}
            </button>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              {language === 'ru' ? 'Уже есть аккаунт?' : 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setShowSignupModal(false);
                  setCurrentView('login');
                }}
                className="text-[#4A6572] hover:underline dark:text-[#F9AA33] font-medium"
              >
                {t('login')}
              </button>
            </p>
          </form>
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

  const renderEmployeesList = () => (
    <div className="max-w-7xl mx-auto p-4 space-y-4 page-enter">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('employees')}</h2>
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
                  <h3 className="font-semibold text-gray-900 dark:text-white">{emp.full_name}</h3>
                  <p className="text-sm text-gray-500">{getRoleLabel(emp.role)}</p>
                  <p className="text-xs">{emp.phone}</p>
                </div>
                <button
                  onClick={() => toggleEmployeeStatus(emp.id, emp.is_active)}
                  className={`px-3 py-1 rounded text-xs font-medium ${emp.is_active
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                >
                  {emp.is_active ? t('blockEmployee') : t('unblockEmployee')}
                </button>
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
  // 📋 MAIN RENDER
  // ─────────────────────────────────────────────────────────
  if (!user && currentView !== 'login' && !showSignupModal) {
    return renderLandingPage();
  }

  if (currentView === 'login' && !user) {
    return renderLoginForm();
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#F5F7FA] via-white to-[#E4EDF5] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 page-enter">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#F9AA33]/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#4A6572]/5 to-transparent rounded-full blur-3xl"></div>
      </div>
      {renderHeader()}
      {renderNavigation()}
      <main className="py-6">
  {currentView === 'create' && (
    <CreateApplicationForm
      formData={formData}
      setFormData={setFormData}
      templates={templates}
      showTemplateModal={showTemplateModal}
      setShowTemplateModal={setShowTemplateModal}
      templateName={templateName}
      setTemplateName={setTemplateName}
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
    />
  )}
  
  {currentView === 'received' && (
    <ApplicationList
      applications={filteredApplications.filter(app => {
        const hasReceivedMaterials = app.materials?.some(m =>
          (Number(m.supplier_received_quantity) || 0) > 0 ||
          (Number(m.received) || 0) > 0
        );
        const isCompleted = app.status === APPLICATION_STATUS.RECEIVED ||
          app.status === APPLICATION_STATUS.PARTIAL_RECEIVED ||
          app.status === APPLICATION_STATUS.CANCELED;
        return (isCompleted || hasReceivedMaterials) &&
          (userRole !== 'foreman' || app.user_id === user?.id);
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
          (userRole !== 'foreman' || app.user_id === user?.id);
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
    />
  )}
    {currentView === 'approvals' && renderApprovalsQueue()}
  {currentView === 'api' && (
  <APIDocumentation
    user={user}
    userCompanyId={userCompanyId}
    showNotification={showNotification}
    t={t}              // ← функция перевода
    language={language} // ← текущий язык
  />
)}
{currentView === 'tariffs' && !isSuperAdmin(userRole, user?.user_metadata) && (
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
      // 🆕 НОВЫЕ ПРОПСЫ
      currentPlanDetails={currentPlanDetails}
      promoCodeInfo={promoCodeInfo}
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
</main>
      <ReceiveModal
  isOpen={showReceiveModal}
  onClose={() => setShowReceiveModal(false)}
  selectedApplication={selectedApplication}
  onAdminReceive={handleAdminReceive}
  onSendToMaster={handleSendToMaster}
  onMasterConfirm={handleMasterConfirm}
  language={language}  // ← УДАЛИТЬ
  escapeHtml={escapeHtml}
  userRole={userRole}
  t={t}
  modalMode={selectedApplication?.modalMode || 'admin_receive'}
  showNotification={showNotification}
   onPhotoClick={(materialIndex) => {     // ← ДОБАВИТЬ
   setActiveMaterialIndex(materialIndex);
   setShowPhotoCapture(true);
 }}
 onQRClick={() => setShowQRScanner(true)}
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
  // ✅ НОВЫЕ ПРОПСЫ
  retentionMetrics={retentionMetrics}
  engagementMetrics={engagementMetrics}
/>
      {privacyPolicyOpen && <PrivacyPolicyModal />}
      {renderSignupModal()}
      {renderInviteModal()}

      {/* 🧪 A/B Test: Pricing Display */}
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
      {/* Модальное окно обновления */}
<VersionUpdateModal
  isOpen={showUpdateModal}
  onClose={() => {
    setShowUpdateModal(false);
    // Сохраняем, что пользователь отказался от этого обновления
    if (updateInfo?.to) {
      localStorage.setItem(`update_declined_${updateInfo.to}`, Date.now().toString());
    }
  }}
  updateInfo={updateInfo}
  onApplyUpdate={() => {
    // 1. Очищаем флаг ожидающего обновления
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    
    // 2. Сохраняем версию, чтобы больше не показывать
    if (updateInfo?.to) {
      localStorage.setItem(`update_applied_${updateInfo.to}`, Date.now().toString());
      localStorage.setItem('last_update_shown', updateInfo.to);
    }
    
    // 3. Закрываем модалку
    setShowUpdateModal(false);
    setUpdateInfo(null);
    
    // 4. Очищаем кэш Service Worker
    if ('caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(key => caches.delete(key));
      });
    }
    
    // 5. Перезагружаем страницу принудительно
    setTimeout(() => {
      window.location.reload(true); // true = принудительная перезагрузка с сервера
    }, 200);
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
    totalSteps={onboardingHighlights.length}
    onNext={() => setOnboardingStep(prev => Math.min(prev + 1, onboardingHighlights.length - 1))}
    onPrev={() => setOnboardingStep(prev => Math.max(prev - 1, 0))}
    onComplete={handleOnboardingComplete}
    highlights={onboardingHighlights}
  />
)}
{/* 🆕 Модалка согласования */}
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
 {/* ✅ ДОБАВИТЬ СЮДА - Модалка выбора тарифа */}
      {_showTariffModal && (
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
      {/* 📸 Photo Capture Modal */}
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

{/* 📷 QR Scanner Modal */}
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
    onClose={() => setShowQRScanner(false)}  // ← Убедитесь, что здесь нет (e) =>
  />
)}
{/* 🎁 Promo Modals */}
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
    </div>
  );
};
export default memo(App);