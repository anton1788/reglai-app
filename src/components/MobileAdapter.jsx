// src/components/MobileAdapter.jsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  Menu, X, Home, Plus, List, History, Warehouse, Users, 
  BarChart3, Settings, HelpCircle, LogOut, ChevronLeft,
  ShoppingCart, FileText, Calendar, MessageCircle, Briefcase,
  ClipboardList, UserCog, CreditCard, TrendingUp, FolderOpen,
  PieChart, Shield, CheckCircle, Zap, Code, Calculator, User,
  Wifi, WifiOff, Search, Sun, Moon, Bell, Globe
} from 'lucide-react';

/**
 * ============================================================
 * 📱 MobileAdapter — Адаптация приложения под мобильные устройства
 * ============================================================
 * 
 * 🔹 Что делает:
 *   - Реактивно определяет мобильное устройство (с resize)
 *   - Показывает Bottom Navigation вместо верхнего меню
 *   - Добавляет выдвижное меню (Drawer) с прокруткой
 *   - Поддерживает свайп-жесты
 *   - Увеличивает touch-цели до 44px+
 *   - Поддерживает безопасные зоны iPhone
 *   - Показывает индикатор офлайн-режима
 *   - Подсветка активного пункта меню
 */
const MobileAdapter = ({ 
  // ===== ДЕТИ =====
  children, 
  
  // ===== НАВИГАЦИЯ =====
  currentView, 
  onNavigate,
  onLogout,
  
  // ===== ПОЛЬЗОВАТЕЛЬ =====
  user,
  userRole,
  userCompany,
  
  // ===== СТАТУСЫ =====
  isOnline,
  offlineDraftsCount,
  pendingApprovalsCount,
  cartItemsCount,
  mergeableCount,
  
  // ===== НАСТРОЙКИ =====
  theme,
  onToggleTheme,
  onToggleLanguage,
  language,
}) => {
  // ============================================================
  // 📊 СОСТОЯНИЯ
  // ============================================================
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const drawerRef = useRef(null);
  
  // ✅ РЕАКТИВНОЕ ОПРЕДЕЛЕНИЕ МОБИЛЬНОСТИ
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth <= 768
  );

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============================================================
  // 🧭 НАСТРОЙКА НАВИГАЦИОННЫХ ПУНКТОВ
  // ============================================================
  const navigationItems = useMemo(() => {
    const items = [];
    const role = userRole || 'master';

    // === ГЛАВНАЯ ===
    items.push({
      id: 'dashboard',
      icon: Home,
      label: 'Главная',
      path: '/',
      show: true,
      badge: 0
    });

    // === СОЗДАНИЕ ЗАЯВКИ ===
    if (['master', 'foreman', 'supply_admin', 'client_manager', 'manager', 'director'].includes(role)) {
      items.push({
        id: 'create',
        icon: Plus,
        label: 'Создать',
        path: '/applications/new',
        show: true,
        badge: 0,
        highlight: true
      });
    }

    // === ЗАЯВКИ ===
    if (role !== 'client' && role !== 'accountant') {
      items.push({
        id: 'inwork',
        icon: List,
        label: 'Заявки',
        path: '/applications',
        show: true,
        badge: pendingApprovalsCount || 0
      });
    }

    // === СКЛАД ===
    if (['supply_admin', 'manager', 'director', 'foreman', 'master', 'accountant'].includes(role)) {
      items.push({
        id: 'warehouse',
        icon: Warehouse,
        label: 'Склад',
        path: '/warehouse',
        show: true,
        badge: cartItemsCount || 0
      });
    }

    // === КЛИЕНТЫ ===
    if (['client_manager', 'manager', 'director', 'supply_admin'].includes(role)) {
      items.push({
        id: 'clients',
        icon: Users,
        label: 'Клиенты',
        path: '/clients',
        show: true,
        badge: 0
      });
    }

    // === АНАЛИТИКА ===
    if (role !== 'client') {
      items.push({
        id: 'analytics',
        icon: BarChart3,
        label: 'Аналитика',
        path: '/analytics',
        show: true,
        badge: 0
      });
    }

    // === ПРОЕКТЫ ===
    if (['manager', 'director', 'supply_admin', 'client_manager', 'master', 'foreman'].includes(role)) {
      items.push({
        id: 'projects',
        icon: FolderOpen,
        label: 'Проекты',
        path: '/projects',
        show: false,
        badge: 0
      });
    }

    // === CRM ЛИДЫ ===
    if (['manager', 'supply_admin'].includes(role)) {
      items.push({
        id: 'crm-sales',
        icon: TrendingUp,
        label: 'CRM Лиды',
        path: '/crm-sales',
        show: false,
        badge: 0
      });
    }

    // === ОБЪЕДИНЕНИЕ ===
    if (['manager', 'director', 'supply_admin'].includes(role)) {
      items.push({
        id: 'merge',
        icon: FolderOpen,
        label: 'Объединение',
        path: '/merge',
        show: false,
        badge: mergeableCount || 0
      });
    }

    // === ДОКУМЕНТЫ ===
    if (['manager', 'director', 'supply_admin', 'accountant', 'client_manager'].includes(role)) {
      items.push({
        id: 'documents',
        icon: FileText,
        label: 'Документы',
        path: '/documents',
        show: false,
        badge: 0
      });
    }

    // === КАЛЕНДАРЬ ===
    if (['manager', 'director', 'supply_admin'].includes(role)) {
      items.push({
        id: 'calendar',
        icon: Calendar,
        label: 'Календарь',
        path: '/calendar',
        show: false,
        badge: 0
      });
    }

    // === ЧАТ ===
    if (['master', 'foreman', 'supply_admin', 'manager', 'director', 'client_manager'].includes(role)) {
      items.push({
        id: 'chat',
        icon: MessageCircle,
        label: 'Чат',
        path: '/chat',
        show: false,
        badge: 0
      });
    }

    // === СОГЛАСОВАНИЯ ===
    if (['manager', 'director'].includes(role)) {
      items.push({
        id: 'approvals',
        icon: ClipboardList,
        label: 'Согласования',
        path: '/approvals',
        show: false,
        badge: pendingApprovalsCount || 0
      });
    }

    // === ИСТОРИЯ ===
    if (['master', 'foreman', 'supply_admin', 'manager', 'director'].includes(role)) {
      items.push({
        id: 'history',
        icon: History,
        label: 'История',
        path: '/history',
        show: false,
        badge: 0
      });
    }

    // === ТАРИФЫ ===
    if (['manager', 'director', 'client_manager', 'supply_admin'].includes(role)) {
      items.push({
        id: 'tariffs',
        icon: CreditCard,
        label: 'Тарифы',
        path: '/tariffs',
        show: false,
        badge: 0
      });
    }

    // === СОТРУДНИКИ ===
    if (['manager', 'director'].includes(role)) {
      items.push({
        id: 'employees',
        icon: UserCog,
        label: 'Сотрудники',
        path: '/employees',
        show: false,
        badge: 0
      });
    }

    // === СМЕТЫ ===
    if (['manager', 'director', 'supply_admin', 'accountant'].includes(role)) {
      items.push({
        id: 'estimates',
        icon: Calculator,
        label: 'Сметы',
        path: '/estimates',
        show: false,
        badge: 0
      });
    }

    // === ОТЧЁТЫ ===
    if (['manager', 'director', 'accountant'].includes(role)) {
      items.push({
        id: 'reports',
        icon: PieChart,
        label: 'Отчёты',
        path: '/reports',
        show: false,
        badge: 0
      });
    }

    // === ИНТЕГРАЦИЯ ===
    if (['manager', 'director', 'supply_admin'].includes(role)) {
      items.push({
        id: 'integration',
        icon: Zap,
        label: 'Интеграция',
        path: '/integration',
        show: false,
        badge: 0
      });
    }

    // === API ===
    if (['manager', 'director', 'supply_admin', 'accountant'].includes(role)) {
      items.push({
        id: 'api',
        icon: Code,
        label: 'API',
        path: '/api',
        show: false,
        badge: 0
      });
    }

    // === АУДИТ ===
    if (['manager', 'director', 'supply_admin', 'accountant'].includes(role)) {
      items.push({
        id: 'audit',
        icon: Shield,
        label: 'Аудит',
        path: '/audit',
        show: false,
        badge: 0
      });
    }

    // === ЗАДАЧИ ===
    if (['master', 'foreman', 'supply_admin', 'manager', 'director'].includes(role)) {
      items.push({
        id: 'tasks',
        icon: CheckCircle,
        label: 'Задачи',
        path: '/tasks',
        show: false,
        badge: 0
      });
    }

    // === НАСТРОЙКИ ===
    items.push({
      id: 'settings',
      icon: Settings,
      label: 'Настройки',
      path: '/settings',
      show: false,
      badge: 0
    });

    // === ПОМОЩЬ ===
    items.push({
      id: 'help',
      icon: HelpCircle,
      label: 'Помощь',
      path: '/help',
      show: false,
      badge: 0
    });

    // === ПРОФИЛЬ ===
    items.push({
      id: 'profile',
      icon: User,
      label: 'Профиль',
      path: '/profile',
      show: false,
      badge: 0
    });

    // === КОРЗИНА ===
    if (cartItemsCount > 0) {
      items.push({
        id: 'cart',
        icon: ShoppingCart,
        label: 'Корзина',
        path: '/cart',
        show: false,
        badge: cartItemsCount
      });
    }

    return items.filter(item => item.show !== false);
  }, [userRole, pendingApprovalsCount, cartItemsCount, mergeableCount]);

  // ============================================================
  // 📱 BOTTOM NAVIGATION BAR (нижняя панель)
  // ============================================================
  const BottomNav = useCallback(() => {
    const mainItems = navigationItems.slice(0, 5);
    const hasMore = navigationItems.length > 5;

    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-50 safe-area-bottom shadow-lg">
        <div className="flex items-center justify-around px-1 py-1 max-w-screen-xl mx-auto">
          {mainItems.map((item) => {
            const isActive = currentView === item.id || 
                            (item.id === 'dashboard' && currentView === '');
            const Icon = item.icon;
            const hasBadge = item.badge > 0;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.path);
                  setIsMenuOpen(false);
                }}
                className={`
                  flex flex-col items-center justify-center 
                  min-h-[52px] min-w-[48px] px-2 py-1 rounded-xl
                  transition-all duration-200 touch-target relative
                  ${isActive 
                    ? 'text-[#4A6572] dark:text-[#F9AA33] scale-105' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }
                  ${item.highlight ? 'relative' : ''}
                `}
                aria-label={item.label}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-2' : 'stroke-1.5'}`} />
                
                {hasBadge && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}

                <span className={`text-[10px] font-medium mt-0.5 transition-colors ${
                  isActive ? 'text-[#4A6572] dark:text-[#F9AA33]' : ''
                }`}>
                  {item.label}
                </span>

                {isActive && (
                  <span className="absolute -top-0.5 w-6 h-0.5 bg-[#4A6572] dark:bg-[#F9AA33] rounded-full" />
                )}
              </button>
            );
          })}

          {hasMore && (
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`
                flex flex-col items-center justify-center 
                min-h-[52px] min-w-[48px] px-2 py-1 rounded-xl
                transition-all duration-200 touch-target
                ${isMenuOpen ? 'text-[#4A6572] dark:text-[#F9AA33]' : 'text-gray-500 dark:text-gray-400'}
              `}
            >
              <Menu className={`w-5 h-5 ${isMenuOpen ? 'stroke-2' : 'stroke-1.5'}`} />
              <span className="text-[10px] font-medium mt-0.5">
                {isMenuOpen ? 'Закрыть' : 'Ещё'}
              </span>
            </button>
          )}
        </div>
      </nav>
    );
  }, [navigationItems, currentView, onNavigate, isMenuOpen]);

  // ============================================================
  // 📱 ВЫДВИЖНОЕ МЕНЮ (Drawer)
  // ============================================================
  const DrawerMenu = useCallback(() => {
    if (!isMenuOpen) return null;

    const extraItems = navigationItems.slice(5);
    const filteredExtraItems = extraItems.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <>
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 fade-enter"
          onClick={() => setIsMenuOpen(false)}
          onTouchEnd={(e) => {
            if (e.target === e.currentTarget) setIsMenuOpen(false);
          }}
        />
        
        <div 
          ref={drawerRef}
          className="fixed right-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-white dark:bg-gray-900 shadow-2xl z-50 slide-in-right overflow-y-auto"
        >
          {/* Шапка меню */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 z-10">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-xl flex items-center justify-center shadow-md">
                  <img src="/icon-192.png" alt="Reglai" className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-sm text-gray-900 dark:text-white block">Реглай PRO</span>
                  <span className="text-[10px] text-gray-400">v1.0.0</span>
                </div>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-target"
                aria-label="Закрыть меню"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Информация о пользователе */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#4A6572]/5 to-[#344955]/5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center text-white font-bold text-lg">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {user?.user_metadata?.full_name || user?.email || 'Пользователь'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {userCompany || 'Компания не указана'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                      isOnline ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {isOnline ? 'Онлайн' : 'Офлайн'}
                    </span>
                    {offlineDraftsCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                        📤 {offlineDraftsCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Поиск по меню */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по меню..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A6572] bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Пункты меню */}
          <div className="p-3 pb-32">
            {filteredExtraItems.length > 0 ? (
              <>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-3 py-2">
                  Все разделы
                </p>
                {filteredExtraItems.map((item) => {
                  const isActive = currentView === item.id || 
                                  (item.id === 'dashboard' && currentView === '');
                  const Icon = item.icon;
                  const hasBadge = item.badge > 0;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.path);
                        setIsMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3 rounded-xl
                        transition-all duration-200 touch-target
                        ${isActive 
                          ? 'bg-[#4A6572]/10 dark:bg-[#4A6572]/20 text-[#4A6572] dark:text-[#F9AA33]' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'stroke-2' : 'stroke-1.5'}`} />
                      <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                      {hasBadge && (
                        <span className="min-w-[20px] h-[20px] px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                Ничего не найдено
              </div>
            )}

            <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

            {/* Настройки и выход */}
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onNavigate('/settings');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 touch-target"
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm font-medium">Настройки</span>
            </button>

            <button
              onClick={() => {
                setIsMenuOpen(false);
                if (onLogout) onLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400 touch-target"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Выйти</span>
            </button>

            <div className="mt-4 text-center">
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Реглай PRO v1.0.0 • {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }, [isMenuOpen, navigationItems, currentView, onNavigate, onLogout, user, userCompany, isOnline, offlineDraftsCount, searchQuery]);

  // ============================================================
  // 📱 HEADER ДЛЯ МОБИЛЬНОЙ ВЕРСИИ
  // ============================================================
  const MobileHeader = useCallback(() => {
    const getTitle = () => {
      const item = navigationItems.find(i => i.id === currentView || (i.id === 'dashboard' && currentView === ''));
      return item?.label || 'Реглай PRO';
    };

    return (
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 safe-area-top shadow-sm">
        <div className="flex items-center justify-between px-3 py-2 max-w-screen-xl mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-lg flex items-center justify-center flex-shrink-0">
              <img src="/icon-192.png" alt="Reglai" className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {getTitle()}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            
            <button
              onClick={() => onNavigate('/search')}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-target"
              aria-label="Поиск"
            >
              <Search className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-target"
              aria-label="Переключить тему"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-500" />
              )}
            </button>

            <button
              onClick={onToggleLanguage}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-target text-xs font-medium"
            >
              {language === 'ru' ? 'RU' : 'EN'}
            </button>

            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors touch-target"
              aria-label="Открыть меню"
            >
              <Menu className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </header>
    );
  }, [currentView, navigationItems, isOnline, theme, language, onToggleTheme, onToggleLanguage, onNavigate]);

  // ============================================================
  // 📱 СВАЙП-ЖЕСТЫ
  // ============================================================
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    setIsSwiping(false);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!touchStartX || !touchStartY) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      setIsSwiping(true);
      e.preventDefault();
    }
  }, [touchStartX, touchStartY]);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStartX || !isSwiping) {
      setTouchStartX(0);
      setTouchStartY(0);
      setIsSwiping(false);
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    
    if (deltaX > 80) {
      if (window.history.state?.idx > 0) {
        window.history.back();
      }
    } else if (deltaX < -80) {
      if (window.history.state?.idx < window.history.length - 1) {
        window.history.forward();
      }
    }

    setTouchStartX(0);
    setTouchStartY(0);
    setIsSwiping(false);
  }, [touchStartX, isSwiping]);

  // ============================================================
  // 📱 ИНДИКАТОР ОФЛАЙН-РЕЖИМА
  // ============================================================
  const OfflineIndicator = useCallback(() => {
    if (isOnline) return null;

    return (
      <div className="fixed top-14 left-0 right-0 z-40 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-center py-1.5 text-xs font-medium shadow-lg flex items-center justify-center gap-2">
        <WifiOff className="w-3.5 h-3.5" />
        <span>Офлайн-режим. Данные будут синхронизированы при восстановлении связи.</span>
        {offlineDraftsCount > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
            {offlineDraftsCount} заявок ожидают отправки
          </span>
        )}
      </div>
    );
  }, [isOnline, offlineDraftsCount]);

  // ============================================================
  // 📱 CSS СТИЛИ
  // ============================================================
  const styles = `
    .safe-area-top {
      padding-top: env(safe-area-inset-top, 0px);
    }
    .safe-area-bottom {
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    @keyframes slide-in-right {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .slide-in-right {
      animation: slide-in-right 280ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .fade-enter {
      animation: fade-in 200ms ease-out forwards;
    }
    .touch-target {
      min-height: 44px;
      min-width: 44px;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .smooth-scroll {
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }
    .no-select {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    @media (max-width: 768px) {
      input, select, textarea {
        font-size: 16px !important;
      }
    }
    .mobile-container {
      padding-left: 12px;
      padding-right: 12px;
    }
  `;

  // ============================================================
  // 📱 ЕСЛИ НЕ МОБИЛЬНОЕ УСТРОЙСТВО — ВОЗВРАЩАЕМ ДЕТЕЙ
  // ============================================================
  if (!isMobile) {
    return <>{children}</>;
  }

  // ============================================================
  // 📱 РЕНДЕР МОБИЛЬНОЙ ВЕРСИИ
  // ============================================================
  return (
    <div 
      className="min-h-screen bg-gray-50 dark:bg-gray-950 no-select"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <MobileHeader />
      <OfflineIndicator />
      <main className={`pb-20 ${!isOnline ? 'pt-[52px]' : 'pt-14'} smooth-scroll`}>
        <div className="mobile-container max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <BottomNav />
      <DrawerMenu />
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-20 right-4 p-3 bg-[#4A6572] text-white rounded-full shadow-lg hover:shadow-xl transition-all touch-target opacity-70 hover:opacity-100 z-30"
        aria-label="Наверх"
      >
        <ChevronLeft className="w-5 h-5 rotate-90" />
      </button>
    </div>
  );
};

export default MobileAdapter;