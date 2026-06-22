// src/components/OneCIntegration.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, RefreshCw, CheckCircle, AlertCircle, Download, Upload } from 'lucide-react';

const OneCIntegration = ({ 
  supabase, 
  companyId, 
  showNotification
  // t - удалён, так как не используется
}) => {
  const [settings, setSettings] = useState({
    baseUrl: '',
    apiKey: '',
    organizationId: '',
    exportFormat: 'json',
    autoSync: false,
    syncInterval: 60
  });
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  // Загрузка настроек - обернута в useCallback
  const loadSettings = useCallback(async () => {
    if (!companyId) return;
    
    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('company_id', companyId)
      .eq('type', '1c')
      .single();

    if (data) {
      setSettings(data.config);
      setLastSync(data.last_sync_at);
    }
  }, [companyId, supabase]);

  // Эффект с корректными зависимостями
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    if (!settings.baseUrl || !settings.apiKey) {
      showNotification('Заполните URL и API ключ', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('integrations')
        .upsert({
          company_id: companyId,
          type: '1c',
          config: settings,
          is_active: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      showNotification('✅ Настройки 1С сохранены!', 'success');
      await loadSettings();
      
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      showNotification('Ошибка: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const syncWith1C = async () => {
    if (!settings.baseUrl || !settings.apiKey) {
      showNotification('Настройте интеграцию с 1С', 'error');
      return;
    }

    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      // Здесь будет реальный запрос к 1С
      const response = await fetch(`${settings.baseUrl}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': settings.apiKey
        },
        body: JSON.stringify({
          organizationId: settings.organizationId,
          lastSync: lastSync
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      // data удалена, так как не используется
      // const data = await response.json();
      await response.json(); // Просто читаем ответ, но не используем
      
      setSyncStatus('success');
      setLastSync(new Date().toISOString());
      
      showNotification('✅ Синхронизация с 1С выполнена!', 'success');
      
    } catch (err) {
      console.error('Ошибка синхронизации:', err);
      setSyncStatus('error');
      showNotification('❌ Ошибка синхронизации: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const exportTo1C = async () => {
    if (!settings.baseUrl || !settings.apiKey) {
      showNotification('Настройте интеграцию с 1С', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Получаем данные для экспорта
      const { data: applications } = await supabase
        .from('applications')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);

      const response = await fetch(`${settings.baseUrl}/api/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': settings.apiKey
        },
        body: JSON.stringify({
          organizationId: settings.organizationId,
          applications: applications
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      showNotification('📤 Данные экспортированы в 1С', 'success');
      
    } catch (err) {
      console.error('Ошибка экспорта:', err);
      showNotification('❌ Ошибка экспорта: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 page-enter">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-8 h-8 text-[#4A6572]" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Интеграция с 1С
          </h2>
        </div>

        {/* Статус синхронизации */}
        {syncStatus && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            syncStatus === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
            syncStatus === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
          }`}>
            {syncStatus === 'success' && <CheckCircle className="w-5 h-5" />}
            {syncStatus === 'error' && <AlertCircle className="w-5 h-5" />}
            {syncStatus === 'syncing' && <RefreshCw className="w-5 h-5 animate-spin" />}
            <span>
              {syncStatus === 'success' && 'Синхронизация успешно завершена'}
              {syncStatus === 'error' && 'Ошибка синхронизации'}
              {syncStatus === 'syncing' && 'Выполняется синхронизация...'}
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL сервера 1С *
            </label>
            <input
              value={settings.baseUrl}
              onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
              placeholder="https://1c-server.company.ru"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              API Ключ *
            </label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="••••••••••••••••"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID организации в 1С
            </label>
            <input
              value={settings.organizationId}
              onChange={(e) => setSettings({ ...settings, organizationId: e.target.value })}
              placeholder="org-12345"
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Формат экспорта
            </label>
            <select
              value={settings.exportFormat}
              onChange={(e) => setSettings({ ...settings, exportFormat: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="json">JSON</option>
              <option value="xml">XML</option>
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.autoSync}
                onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
                className="rounded"
              />
              Автосинхронизация
            </label>
            {settings.autoSync && (
              <div className="flex items-center gap-2">
                <label className="text-sm">Каждые</label>
                <input
                  type="number"
                  value={settings.syncInterval}
                  onChange={(e) => setSettings({ ...settings, syncInterval: Number(e.target.value) })}
                  className="w-16 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 text-center"
                  min="15"
                />
                <span className="text-sm">минут</span>
              </div>
            )}
          </div>

          {lastSync && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Последняя синхронизация: {new Date(lastSync).toLocaleString()}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <button
              onClick={saveSettings}
              disabled={isLoading}
              className="px-6 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Сохранить настройки
            </button>
            <button
              onClick={syncWith1C}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Синхронизировать
            </button>
            <button
              onClick={exportTo1C}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              Экспорт данных
            </button>
          </div>

          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
            <h4 className="font-semibold mb-2">📋 Инструкция по настройке</h4>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal pl-4">
              <li>Укажите URL вашего сервера 1С</li>
              <li>Получите API ключ в 1С для авторизации</li>
              <li>Укажите ID организации из 1С</li>
              <li>Нажмите "Синхронизировать" для тестирования</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OneCIntegration;