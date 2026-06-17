// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, X, Search, User, LogOut, Settings, HelpCircle, 
  Bell, ChevronDown, Home, Package, ClipboardList, 
  Users, BarChart3, FileText, Moon, Sun,
  Building, Calendar, MessageCircle,
  Plus, UserPlus, Briefcase,
  CheckCircle, ShoppingCart, Code, Shield, Sparkles,
  Globe, WifiOff, History, Eye, Clock,
  Target, ChevronLeft, ChevronRight, Merge
} from 'lucide-react';

const Navbar = ({ 
  user, 
  companyName, 
  userRole, 
  onLogout, 
  onNavigate, 
  currentPage,
  onInvite,
  onOpenTariffs,
  onOpenCompanyProfile,
  isOnline,
  offlineDraftsCount,
  theme,
  onToggleTheme,
  onToggleLanguage,
  notifications = [],
  onMarkNotificationRead,
  onClearNotifications,
  pendingApprovalsCount = 0,
  cartItemsCount = 0,
  isAdminMode = false,
  onToggleAdminMode,
  isCompanyOwner = false
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const searchRef = useRef(null);
  const navScrollRef = useRef(null);

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Глобальный поиск по Ctrl+K или /
  useEffect(() => {
    const handleGlobalSearch = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === '/' && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleGlobalSearch);
    return () => document.removeEventListener('keydown', handleGlobalSearch);
  }, []);

  // Проверка скролла для кнопок навигации
  useEffect(() => {
    const checkScroll = () => {
      if (navScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = navScrollRef.current;
        setShowLeftScroll(scrollLeft > 0);
        setShowRightScroll(scrollLeft + clientWidth < scrollWidth - 10);
      }
    };
    
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const scrollNav = (direction) => {
    if (navScrollRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = navScrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      navScrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate?.(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setIsMobileMenuOpen(false);
    }
  };

  const getRoleLabel = () => {
    const roles = {
      master: 'Прораб',
      foreman: 'Мастер',
      manager: 'Руководитель',
      supply_admin: 'Снабженец',
      accountant: 'Бухгалтер',
      client: 'Заказчик',
      client_manager: 'Менеджер по клиентам',
      director: 'Директор',
      super_admin: 'Супер Админ'
    };
    return roles[userRole] || userRole;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Все пункты навигации в зависимости от роли
  const getNavItems = () => {
    const items = [];

    items.push({ id: 'dashboard', label: 'Главная', icon: Home, path: '/' });
    items.push({ id: 'applications', label: 'Заявки', icon: ClipboardList, path: '/applications' });

    // ✅ CRM Sales - Лиды (только для manager и supply_admin)
    if (userRole === 'manager' || userRole === 'supply_admin') {
      items.push({ id: 'crm-sales', label: 'CRM Лиды', icon: Users, path: '/crm-sales' });
    }

    // ✅ Объединение заявок (только для manager и supply_admin)
    if (userRole === 'manager' || userRole === 'supply_admin') {
      items.push({ id: 'merge', label: 'Объединение заявок', icon: Merge, path: '/merge' });
    }

    // ✅ Для мастера и прораба - только заявки (свои), история
    if (userRole === 'master' || userRole === 'foreman') {
      items.push({ id: 'inwork', label: 'В работе', icon: Clock, path: '/inwork' });
      items.push({ id: 'history', label: 'История', icon: History, path: '/history' });
    }

    // ✅ Склад (для manager, supply_admin, foreman)
    if (userRole === 'manager' || userRole === 'supply_admin' || userRole === 'foreman') {
      items.push({ id: 'warehouse', label: 'Склад', icon: Package, path: '/warehouse' });
    }

    // ✅ Клиенты (для manager и client_manager)
    if (userRole === 'manager' || userRole === 'client_manager') {
      items.push({ id: 'clients', label: 'Клиенты', icon: Users, path: '/clients' });
    }

    // ✅ АНАЛИТИКА - ТОЛЬКО для manager, supply_admin, director, владельца компании
    if (userRole === 'manager' || userRole === 'supply_admin' || userRole === 'director' || isCompanyOwner) {
      items.push({ id: 'analytics', label: 'Аналитика', icon: BarChart3, path: '/analytics' });
    }

    // ✅ Документы - для всех, кроме client (у клиента отдельный раздел)
    if (userRole !== 'client') {
      items.push({ id: 'documents', label: 'Документы', icon: FileText, path: '/documents' });
    }

    // ✅ Чат - для всех
    items.push({ id: 'chat', label: 'Чат', icon: MessageCircle, path: '/chat' });
    items.push({ id: 'calendar', label: 'Календарь', icon: Calendar, path: '/calendar' });

    // ✅ Согласование (только для manager и director)
    if (userRole === 'manager' || userRole === 'director') {
      items.push({ 
        id: 'approvals', 
        label: `Согласование ${pendingApprovalsCount > 0 ? `(${pendingApprovalsCount})` : ''}`, 
        icon: CheckCircle, 
        path: '/approvals' 
      });
    }

    // ✅ Сотрудники (только для manager)
    if (userRole === 'manager') {
      items.push({ id: 'employees', label: 'Сотрудники', icon: Users, path: '/employees' });
    }

    // ✅ Корзина
    if (cartItemsCount > 0) {
      items.push({ id: 'cart', label: `Корзина (${cartItemsCount})`, icon: ShoppingCart, path: '/cart' });
    }

    // ✅ API (только для manager)
    if (userRole === 'manager') {
      items.push({ id: 'api', label: 'API', icon: Code, path: '/api' });
    }

    // ✅ АУДИТ - ТОЛЬКО для manager и director
    if (userRole === 'manager' || userRole === 'director' || isCompanyOwner) {
      items.push({ id: 'audit', label: 'Аудит', icon: Eye, path: '/audit' });
    }

    // ✅ Задачи
    if (userRole !== 'client') {
      items.push({ id: 'tasks', label: 'Задачи', icon: Target, path: '/tasks' });
    }

    // ✅ Для заказчика - отдельные пункты
    if (userRole === 'client') {
      items.push({ id: 'clientDashboard', label: 'Мой объект', icon: Home, path: '/client' });
      items.push({ id: 'clientDocuments', label: 'Мои документы', icon: FileText, path: '/client/documents' });
      items.push({ id: 'clientChat', label: 'Чат с прорабом', icon: MessageCircle, path: '/client/chat' });
    }

    return items;
  };

  const navItems = getNavItems();

  // CSS для скрытия скроллбара
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .no-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg sticky top-0 z-50 w-full">
      <div className="w-full px-2 sm:px-4">
        <div className="flex justify-between items-center h-14 sm:h-16">
          
          {/* Логотип и название */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Меню"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
            
            <button 
              onClick={() => onNavigate?.('/')}
              className="flex items-center gap-2 group cursor-pointer"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all">
                <img 
                  src="/icon-512.png" 
                  alt="Reglai logo" 
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-gray-800 dark:text-white text-base sm:text-lg">Реглай</span>
                {companyName && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 block -mt-0.5">
                    {companyName}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Поиск - центрированный */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Поиск... (Ctrl+K /)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-16 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A6572] focus:border-transparent bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white transition-all"
                />
                <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-0.5 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-md hidden sm:block">
                  ⌘K
                </kbd>
              </div>
            </form>
          </div>

                    {/* Правая часть */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* ✅ Офлайн-индикатор (НОВЫЙ) */}
            {!isOnline && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg text-xs">
                <WifiOff className="w-4 h-4" />
                <span className="hidden sm:inline">Офлайн</span>
              </div>
            )}

            {/* ✅ Черновики для синхронизации (НОВЫЙ) */}
            {isOnline && offlineDraftsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300 rounded-lg text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">{offlineDraftsCount} черновиков</span>
              </div>
            )}

            {isAdminMode && (
              <div className="flex items-center px-1.5 sm:px-2 py-1 sm:py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-lg text-xs font-medium">
                <Shield className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Админ режим</span>
                {onToggleAdminMode && (
                  <button onClick={onToggleAdminMode} className="ml-1 text-xs underline">
                    Выйти
                  </button>
                )}
              </div>
            )}

            {/* Быстрые действия */}
            {(userRole === 'manager' || userRole === 'supply_admin' || userRole === 'director' || userRole === 'master' || userRole === 'foreman') && (
              <div className="relative group">
                <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-gray-100 dark:border-gray-700">Быстрые действия</p>
                    <button 
                      onClick={() => { onNavigate?.('/applications/new'); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Plus className="w-4 h-4 text-blue-500" />
                      Создать заявку
                    </button>
                    {(userRole === 'manager' || userRole === 'supply_admin') && (
                      <button 
                        onClick={() => { onInvite?.(); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        <UserPlus className="w-4 h-4 text-green-500" />
                        Пригласить сотрудника
                      </button>
                    )}
                    <button 
                      onClick={() => { onNavigate?.('/warehouse'); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Package className="w-4 h-4 text-orange-500" />
                      Управление складом
                    </button>
                    <button 
                      onClick={() => { onNavigate?.('/documents'); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <FileText className="w-4 h-4 text-purple-500" />
                      Создать документ
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Уведомления */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
              
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Уведомления</h3>
                    {notifications.length > 0 && (
                      <button 
                        onClick={onClearNotifications}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      >
                        Очистить все
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Нет уведомлений</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${!notif.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                          onClick={() => onMarkNotificationRead?.(notif.id)}
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notif.message}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{notif.time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Переключение темы */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Сменить тему"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" /> : <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
            </button>

            {/* Переключение языка */}
            <button
              onClick={onToggleLanguage}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Сменить язык"
            >
              <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            {/* Профиль */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-lg flex items-center justify-center">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Пользователь'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getRoleLabel()}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 hidden lg:block" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#4A6572]/5 to-transparent">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user?.user_metadata?.full_name || 'Пользователь'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {getRoleLabel()}
                    </p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => { onNavigate?.('/profile'); setIsProfileOpen(false); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <User className="w-4 h-4" />
                      Профиль
                    </button>
                    <button 
                      onClick={() => { onOpenCompanyProfile?.(); setIsProfileOpen(false); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Building className="w-4 h-4" />
                      Реквизиты компании
                    </button>
                    <button 
                      onClick={() => { onOpenTariffs?.(); setIsProfileOpen(false); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      Тарифы
                    </button>
                    {userRole === 'super_admin' && (
                      <button 
                        onClick={() => { onNavigate?.('/superAdmin'); setIsProfileOpen(false); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        <Shield className="w-4 h-4 text-purple-500" />
                        Панель администратора
                      </button>
                    )}
                    <hr className="my-2 border-gray-200 dark:border-gray-700" />
                    <button 
                      onClick={() => { onNavigate?.('/settings'); setIsProfileOpen(false); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <Settings className="w-4 h-4" />
                      Настройки
                    </button>
                    <button 
                      onClick={() => { onNavigate?.('/help'); setIsProfileOpen(false); setIsMobileMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Помощь
                    </button>
                    <hr className="my-2 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      Выйти
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Планшетная навигация - иконки с подписями (видна на sm и md) */}
      {navItems.length > 0 && (
        <div className="hidden sm:flex lg:hidden border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 overflow-x-auto no-scrollbar">
          <div className="flex gap-1 p-2">
            {navItems.slice(0, 6).map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id || 
                (item.id === 'applications' && (currentPage === 'inwork' || currentPage === 'history'));
              return (
                <button
                  key={item.id}
                  onClick={() => { onNavigate?.(item.path); setIsMobileMenuOpen(false); }}
                  className={`flex flex-col items-center gap-1 px-2 sm:px-3 py-2 rounded-lg transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#4A6572]/10 to-[#344955]/10 text-[#344955] dark:text-[#F9AA33]'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Десктопная навигация - горизонтальное меню с прокруткой (только lg и выше) */}
      {navItems.length > 0 && (
        <div className="hidden lg:block border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="w-full px-4 relative">
            {/* Кнопка прокрутки влево */}
            {showLeftScroll && (
              <button
                onClick={() => scrollNav('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full shadow-md p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            
            {/* Прокручиваемое меню */}
            <div 
              ref={navScrollRef}
              className="flex overflow-x-auto no-scrollbar gap-1 py-2 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id || 
                  (item.id === 'applications' && (currentPage === 'inwork' || currentPage === 'history')) ||
                  (item.id === 'clients' && currentPage === 'clientDashboard') ||
                  (item.id === 'crm-sales' && currentPage === 'crm-sales');
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate?.(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`group relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#4A6572]/10 to-[#344955]/10 text-[#344955] dark:text-[#F9AA33] border border-[#4A6572]/20 dark:border-[#F9AA33]/20'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 hover:text-[#4A6572] dark:hover:text-[#F9AA33]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.id === 'approvals' && pendingApprovalsCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {pendingApprovalsCount}
                      </span>
                    )}
                    {item.id === 'cart' && cartItemsCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                        {cartItemsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Кнопка прокрутки вправо */}
            {showRightScroll && (
              <button
                onClick={() => scrollNav('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full shadow-md p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Мобильное меню (бургер) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 fade-enter max-h-[calc(100vh-56px)] overflow-y-auto">
          <form onSubmit={handleSearch} className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A6572] bg-gray-50 dark:bg-gray-800"
              />
            </div>
          </form>
          
          <div className="p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id ||
                (item.id === 'applications' && (currentPage === 'inwork' || currentPage === 'history')) ||
                (item.id === 'crm-sales' && currentPage === 'crm-sales');
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate?.(item.path);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-[#4A6572]/10 to-[#344955]/10 text-[#344955] dark:text-[#F9AA33]'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.id === 'approvals' && pendingApprovalsCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {pendingApprovalsCount}
                    </span>
                  )}
                  {item.id === 'cart' && cartItemsCount > 0 && (
                    <span className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
              );
            })}
            
            <hr className="my-3 border-gray-100 dark:border-gray-800" />
            
            {(userRole === 'manager' || userRole === 'supply_admin') && (
              <button
                onClick={() => { onInvite?.(); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <UserPlus className="w-5 h-5 text-green-500" />
                Пригласить сотрудника
              </button>
            )}
            <button
              onClick={() => { onOpenTariffs?.(); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Тарифы
            </button>
            <button
              onClick={() => { onOpenCompanyProfile?.(); setIsMobileMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <Building className="w-5 h-5" />
              Реквизиты
            </button>
            <hr className="my-3 border-gray-100 dark:border-gray-800" />
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Выйти
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;