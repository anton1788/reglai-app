// src/components/SettingsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Sun, Moon, Monitor, Bell, Mail, MessageCircle, 
  FileText, Shield, Globe, Database, RefreshCw,
  Smartphone, Lock, Eye, EyeOff, Save, Loader2, Palette, Settings
} from 'lucide-react';

const SettingsPage = ({
  user,
  userRole,
  userCompany,
  userCompanyId,
  supabase,
  language,
  theme,
  onThemeChange,
  onLanguageChange,
  // eslint-disable-next-line no-unused-vars
  t,
  showNotification,
  applications,
  // eslint-disable-next-line no-unused-vars
  settings: globalSettings,
  onSettingsUpdate
}) => {
  // 📌 Состояния
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // 🎨 Внешний вид
  const [localTheme, setLocalTheme] = useState(theme || 'system');
  const [localLanguage, setLocalLanguage] = useState(language || 'ru');
  const [accentColor, setAccentColor] = useState('#4A6572');
  
  // 🔔 Уведомления
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    telegramNotifications: false,
    newApplicationAlerts: true,
    statusChangeAlerts: true,
    dailyDigest: false,
    weeklyReport: true,
    soundEnabled: true
  });
  
  // 📧 Способы отправки
  const [sendMethod, setSendMethod] = useState('email');
  const [emailAddress, setEmailAddress] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // 🔐 Безопасность
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(60);
  
  // 📊 Экспорт
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportIncludeComments, setExportIncludeComments] = useState(true);
  const [exportIncludeHistory, setExportIncludeHistory] = useState(true);
  const [autoExportEnabled, setAutoExportEnabled] = useState(false);
  
  // 💾 Данные
  const [dataRetentionDays, setDataRetentionDays] = useState(365);
  const [autoCleanupEnabled, setAutoCleanupEnabled] = useState(true);
  
  // 📱 Приложение
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  
  // 📋 Активные вкладки
  const [activeTab, setActiveTab] = useState('appearance');

  // Загрузка настроек
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Загружаем настройки пользователя
      const { data: userPrefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (userPrefs) {
        setLocalTheme(userPrefs.theme || 'system');
        setLocalLanguage(userPrefs.language || 'ru');
        setAccentColor(userPrefs.accent_color || '#4A6572');
        setNotificationSettings({
          emailNotifications: userPrefs.email_notifications ?? true,
          pushNotifications: userPrefs.push_notifications ?? true,
          telegramNotifications: userPrefs.telegram_notifications ?? false,
          newApplicationAlerts: userPrefs.new_application_alerts ?? true,
          statusChangeAlerts: userPrefs.status_change_alerts ?? true,
          dailyDigest: userPrefs.daily_digest ?? false,
          weeklyReport: userPrefs.weekly_report ?? true,
          soundEnabled: userPrefs.sound_enabled ?? true
        });
        setSendMethod(userPrefs.send_method || 'email');
        setEmailAddress(userPrefs.email_address || '');
        setTelegramChatId(userPrefs.telegram_chat_id || '');
        setPhoneNumber(userPrefs.phone_number || '');
        setTwoFactorEnabled(userPrefs.two_factor_enabled || false);
        setSessionTimeout(userPrefs.session_timeout || 60);
        setExportFormat(userPrefs.export_format || 'pdf');
        setExportIncludeComments(userPrefs.export_include_comments ?? true);
        setExportIncludeHistory(userPrefs.export_include_history ?? true);
        setAutoExportEnabled(userPrefs.auto_export_enabled || false);
        setDataRetentionDays(userPrefs.data_retention_days || 365);
        setAutoCleanupEnabled(userPrefs.auto_cleanup_enabled ?? true);
      }

      // Загружаем API ключ (адаптировано под вашу структуру)
      const { data: apiData } = await supabase
        .from('api_keys')
        .select('key_value, key_name, is_active')
        .eq('company_id', userCompanyId)
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (apiData && apiData.length > 0) {
        setApiKey(apiData[0].key_value);
      }

      // Загружаем версию приложения
      try {
        const response = await fetch('/version.json');
        const data = await response.json();
        setAppVersion(data.version || '1.0.0');
      } catch (e) {
        console.warn('Не удалось загрузить версию:', e);
      }

    } catch (err) {
      console.error('Ошибка загрузки настроек:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, user?.id, userCompanyId]);

  // Отслеживаем статус онлайн
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Загрузка настроек
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Сохраняем настройки пользователя
      const { error: saveError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user?.id,
          company_id: userCompanyId,
          theme: localTheme,
          language: localLanguage,
          accent_color: accentColor,
          email_notifications: notificationSettings.emailNotifications,
          push_notifications: notificationSettings.pushNotifications,
          telegram_notifications: notificationSettings.telegramNotifications,
          new_application_alerts: notificationSettings.newApplicationAlerts,
          status_change_alerts: notificationSettings.statusChangeAlerts,
          daily_digest: notificationSettings.dailyDigest,
          weekly_report: notificationSettings.weeklyReport,
          sound_enabled: notificationSettings.soundEnabled,
          send_method: sendMethod,
          email_address: emailAddress,
          telegram_chat_id: telegramChatId,
          phone_number: phoneNumber,
          two_factor_enabled: twoFactorEnabled,
          session_timeout: sessionTimeout,
          export_format: exportFormat,
          export_include_comments: exportIncludeComments,
          export_include_history: exportIncludeHistory,
          auto_export_enabled: autoExportEnabled,
          data_retention_days: dataRetentionDays,
          auto_cleanup_enabled: autoCleanupEnabled,
          updated_at: new Date().toISOString()
        });

      if (saveError) throw saveError;

      // Обновляем глобальные настройки
      if (onThemeChange) onThemeChange(localTheme);
      if (onLanguageChange) onLanguageChange(localLanguage);
      if (onSettingsUpdate) {
        onSettingsUpdate({
          sendMethod,
          emailAddress,
          telegramChatId,
          phoneNumber
        });
      }

      showNotification('✅ Настройки сохранены!', 'success');
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      showNotification('❌ Ошибка сохранения настроек', 'error');
    } finally {
      setSaving(false);
    }
  };

  const generateApiKey = async () => {
    setLoading(true);
    try {
      const newKey = `rg_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      
      // Адаптировано под вашу структуру api_keys
      const { error } = await supabase
        .from('api_keys')
        .insert({
          company_id: userCompanyId,
          key_name: `API Key ${new Date().toLocaleDateString()}`,
          key_value: newKey,
          is_active: true,
          created_by: user?.id,
          permissions: { read: true, write: true },
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setApiKey(newKey);
      showNotification('🔑 Новый API ключ сгенерирован', 'success');
    } catch (err) {
      console.error('Ошибка генерации ключа:', err);
      showNotification('❌ Ошибка генерации API ключа', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showNotification('📋 Скопировано в буфер обмена', 'success');
  };

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      const response = await fetch('/version.json?v=' + Date.now());
      const data = await response.json();
      
      if (data.version && data.version !== appVersion) {
        showNotification(
          `🔄 Доступно обновление v${data.version}! Текущая: v${appVersion}`,
          'info'
        );
      } else {
        showNotification('✅ У вас последняя версия приложения', 'success');
      }
    } catch {
      showNotification('❌ Ошибка проверки обновлений', 'error');
    } finally {
      setCheckingUpdate(false);
    }
  };

  // 🎨 Вкладки настроек
  const tabs = [
    { id: 'appearance', label: '🎨 Внешний вид', icon: Palette },
    { id: 'notifications', label: '🔔 Уведомления', icon: Bell },
    { id: 'delivery', label: '📤 Отправка', icon: Mail },
    { id: 'security', label: '🔐 Безопасность', icon: Shield },
    { id: 'export', label: '📊 Экспорт', icon: FileText },
    { id: 'data', label: '💾 Данные', icon: Database },
    { id: 'about', label: 'ℹ️ О приложении', icon: Globe },
  ];

  // 🎨 Вкладка "Внешний вид"
  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Тема оформления</h4>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setLocalTheme('light')}
            className={`p-4 rounded-xl border-2 transition-all ${
              localTheme === 'light' 
                ? 'border-[#4A6572] bg-[#4A6572]/10' 
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
            }`}
          >
            <Sun className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
            <span className="text-xs">Светлая</span>
          </button>
          <button
            onClick={() => setLocalTheme('dark')}
            className={`p-4 rounded-xl border-2 transition-all ${
              localTheme === 'dark' 
                ? 'border-[#4A6572] bg-[#4A6572]/10' 
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
            }`}
          >
            <Moon className="w-6 h-6 mx-auto mb-1 text-blue-400" />
            <span className="text-xs">Тёмная</span>
          </button>
          <button
            onClick={() => setLocalTheme('system')}
            className={`p-4 rounded-xl border-2 transition-all ${
              localTheme === 'system' 
                ? 'border-[#4A6572] bg-[#4A6572]/10' 
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
            }`}
          >
            <Monitor className="w-6 h-6 mx-auto mb-1 text-gray-500" />
            <span className="text-xs">Системная</span>
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Язык интерфейса</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setLocalLanguage('ru')}
            className={`p-3 rounded-xl border-2 transition-all ${
              localLanguage === 'ru' 
                ? 'border-[#4A6572] bg-[#4A6572]/10' 
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <span className="text-lg">🇷🇺</span>
            <span className="block text-xs mt-1">Русский</span>
          </button>
          <button
            onClick={() => setLocalLanguage('en')}
            className={`p-3 rounded-xl border-2 transition-all ${
              localLanguage === 'en' 
                ? 'border-[#4A6572] bg-[#4A6572]/10' 
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <span className="text-lg">🇬🇧</span>
            <span className="block text-xs mt-1">English</span>
          </button>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Акцентный цвет</h4>
        <div className="flex gap-3 flex-wrap">
          {['#4A6572', '#F9AA33', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
            <button
              key={color}
              onClick={() => setAccentColor(color)}
              className={`w-10 h-10 rounded-full border-2 transition-all ${
                accentColor === color ? 'border-black dark:border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // 🔔 Вкладка "Уведомления"
  const renderNotificationsTab = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Каналы уведомлений</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <span className="text-sm">Email уведомления</span>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.emailNotifications}
              onChange={(e) => setNotificationSettings(prev => ({
                ...prev,
                emailNotifications: e.target.checked
              }))}
              className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-gray-500" />
              <span className="text-sm">Push-уведомления</span>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.pushNotifications}
              onChange={(e) => setNotificationSettings(prev => ({
                ...prev,
                pushNotifications: e.target.checked
              }))}
              className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-gray-500" />
              <span className="text-sm">Telegram уведомления</span>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.telegramNotifications}
              onChange={(e) => setNotificationSettings(prev => ({
                ...prev,
                telegramNotifications: e.target.checked
              }))}
              className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
            />
          </label>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Типы уведомлений</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Новые заявки</span>
            <input
              type="checkbox"
              checked={notificationSettings.newApplicationAlerts}
              onChange={(e) => setNotificationSettings(prev => ({
                ...prev,
                newApplicationAlerts: e.target.checked
              }))}
              className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Изменение статуса</span>
            <input
              type="checkbox"
              checked={notificationSettings.statusChangeAlerts}
              onChange={(e) => setNotificationSettings(prev => ({
                ...prev,
                statusChangeAlerts: e.target.checked
              }))}
              className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Ежедневный дайджест</span>
            <input
              type="checkbox"
              checked={notificationSettings.dailyDigest}
              onChange={(e) => setNotificationSettings(prev => ({
                ...prev,
                dailyDigest: e.target.checked
              }))}
              className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Еженедельный отчёт</span>
            <input
              type="checkbox"
              checked={notificationSettings.weeklyReport}
              onChange={(e) => setNotificationSettings(prev => ({
                ...prev,
                weeklyReport: e.target.checked
              }))}
              className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Звуковые оповещения</span>
            <input
              type="checkbox"
              checked={notificationSettings.soundEnabled}
              onChange={(e) => setNotificationSettings(prev => ({
                ...prev,
                soundEnabled: e.target.checked
              }))}
              className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
            />
          </label>
        </div>
      </div>
    </div>
  );

  // 📤 Вкладка "Отправка"
  const renderDeliveryTab = () => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Способ отправки заявок</h4>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'email', label: '📧 Email' },
            { id: 'telegram', label: '📱 Telegram' },
            { id: 'both', label: '📧+📱 Оба' }
          ].map(option => (
            <button
              key={option.id}
              onClick={() => setSendMethod(option.id)}
              className={`p-3 rounded-xl border-2 transition-all ${
                sendMethod === option.id
                  ? 'border-[#4A6572] bg-[#4A6572]/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}
            >
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email для отправки
          </label>
          <input
            type="email"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] dark:bg-gray-700"
            placeholder="snabzhenie@company.ru"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Telegram Chat ID
          </label>
          <input
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] dark:bg-gray-700"
            placeholder="@snabzhenie_vik"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Номер телефона
          </label>
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] dark:bg-gray-700"
            placeholder="+79991234567"
          />
        </div>
      </div>
    </div>
  );

  // 🔐 Вкладка "Безопасность"
  const renderSecurityTab = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">API Ключ</h4>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey || 'Не сгенерирован'}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-sm"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={() => copyToClipboard(apiKey)}
            className="p-2 text-gray-500 hover:text-gray-700"
            title="Копировать"
          >
            <Save className="w-5 h-5" />
          </button>
          <button
            onClick={generateApiKey}
            disabled={loading}
            className="px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сгенерировать'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Используйте этот ключ для доступа к API. Храните его в безопасности.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Двухфакторная аутентификация</h4>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm">Включить 2FA</span>
          <input
            type="checkbox"
            checked={twoFactorEnabled}
            onChange={(e) => setTwoFactorEnabled(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
          />
        </label>
        <p className="text-xs text-gray-500 mt-2">
          Добавляет дополнительный уровень безопасности при входе
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Время сессии</h4>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="15"
            max="480"
            step="15"
            value={sessionTimeout}
            onChange={(e) => setSessionTimeout(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm font-medium min-w-[60px]">
            {sessionTimeout} мин
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Время бездействия до автоматического выхода
        </p>
      </div>
    </div>
  );

  // 📊 Вкладка "Экспорт"
  const renderExportTab = () => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Формат экспорта по умолчанию</h4>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'pdf', label: '📄 PDF' },
            { id: 'html', label: '🌐 HTML' },
            { id: 'xlsx', label: '📊 Excel' }
          ].map(option => (
            <button
              key={option.id}
              onClick={() => setExportFormat(option.id)}
              className={`p-3 rounded-xl border-2 transition-all ${
                exportFormat === option.id
                  ? 'border-[#4A6572] bg-[#4A6572]/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}
            >
              <span className="text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl space-y-3">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm">Включать комментарии</span>
          <input
            type="checkbox"
            checked={exportIncludeComments}
            onChange={(e) => setExportIncludeComments(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm">Включать историю статусов</span>
          <input
            type="checkbox"
            checked={exportIncludeHistory}
            onChange={(e) => setExportIncludeHistory(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm">Автоматический экспорт</span>
          <input
            type="checkbox"
            checked={autoExportEnabled}
            onChange={(e) => setAutoExportEnabled(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
          />
        </label>
        {autoExportEnabled && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500">
              Еженедельный отчёт будет отправлен на указанный email
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // 💾 Вкладка "Данные"
  const renderDataTab = () => (
    <div className="space-y-4">
      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Хранение данных</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Срок хранения данных (дней)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="30"
                max="1095"
                step="30"
                value={dataRetentionDays}
                onChange={(e) => setDataRetentionDays(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium min-w-[60px]">
                {dataRetentionDays}
              </span>
            </div>
          </div>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Автоматическая очистка</span>
            <input
              type="checkbox"
              checked={autoCleanupEnabled}
              onChange={(e) => setAutoCleanupEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
            />
          </label>
          <p className="text-xs text-gray-500">
            Старые данные будут автоматически удаляться после указанного срока
          </p>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Управление данными</h4>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              if (window.confirm('Очистить кэш приложения?')) {
                localStorage.clear();
                showNotification('✅ Кэш очищен', 'success');
              }
            }}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm"
          >
            🗑️ Очистить кэш
          </button>
          <button
            onClick={() => {
              if (window.confirm('Вы уверены? Это действие необратимо.')) {
                showNotification('⚠️ Функция в разработке', 'warning');
              }
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
          >
            🗑️ Удалить все данные
          </button>
        </div>
      </div>
    </div>
  );

  // ℹ️ Вкладка "О приложении"
  const renderAboutTab = () => {
    const stats = {
      totalApplications: applications?.length || 0,
      totalUsers: 0,
      totalObjects: new Set(applications?.map(a => a.object_name) || []).size
    };

    return (
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl text-center">
          <div className="flex justify-center mb-3">
            <img src="/icon-512.png" alt="Reglai" className="w-16 h-16" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Реглай PRO</h3>
          <p className="text-sm text-gray-500">Версия {appVersion}</p>
          <div className="mt-4 flex justify-center gap-6">
            <div>
              <div className="text-2xl font-bold text-[#4A6572]">{stats.totalApplications}</div>
              <div className="text-xs text-gray-500">Заявок</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#4A6572]">{stats.totalObjects}</div>
              <div className="text-xs text-gray-500">Объектов</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#4A6572]">{stats.totalUsers || 1}</div>
              <div className="text-xs text-gray-500">Пользователей</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={checkForUpdates}
            disabled={checkingUpdate}
            className="px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] disabled:opacity-50 flex items-center gap-2"
          >
            {checkingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Проверить обновления
          </button>
          <button
            onClick={() => window.open('https://t.me/reglai_support', '_blank')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Поддержка
          </button>
          <button
            onClick={() => window.open('/privacy-policy', '_blank')}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Политика конфиденциальности
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Информация о системе</h4>
          <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <div>Пользователь: {user?.email}</div>
            <div>Компания: {userCompany}</div>
            <div>Роль: {userRole}</div>
            <div>Язык: {localLanguage}</div>
            <div>Тема: {localTheme}</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
        <span className="ml-2 text-gray-500">Загрузка настроек...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 page-enter">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
        {/* Заголовок */}
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Настройки
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Управление параметрами приложения и учетной записи
            </p>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>

        {/* Тело */}
        <div className="flex flex-col md:flex-row">
          {/* Боковая панель */}
          <div className="md:w-48 p-4 border-r border-gray-200/50 dark:border-gray-700/50">
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-sm ${
                    activeTab === tab.id
                      ? 'bg-[#4A6572]/10 text-[#4A6572] dark:bg-[#4A6572]/20 dark:text-[#F9AA33]'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Контент */}
          <div className="flex-1 p-6">
            {activeTab === 'appearance' && renderAppearanceTab()}
            {activeTab === 'notifications' && renderNotificationsTab()}
            {activeTab === 'delivery' && renderDeliveryTab()}
            {activeTab === 'security' && renderSecurityTab()}
            {activeTab === 'export' && renderExportTab()}
            {activeTab === 'data' && renderDataTab()}
            {activeTab === 'about' && renderAboutTab()}
          </div>
        </div>

        {/* Футер */}
        <div className="px-6 py-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-700/20 flex justify-between items-center text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>⚡ {isOnline ? 'Онлайн' : 'Офлайн'}</span>
            <span>📦 Заявок: {applications?.length || 0}</span>
          </div>
          <div>© 2024 Реглай PRO v{appVersion}</div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;