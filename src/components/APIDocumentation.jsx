// src/components/APIDocumentation.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Key, Copy, Check, Shield, Clock, Activity, 
  AlertTriangle, Trash2, Plus, ExternalLink, Code,
  Server, Lock, RefreshCw, Download, Loader2
} from 'lucide-react';
import { 
  generateAPIKey, 
  getCompanyAPIKeys, 
  revokeAPIKey 
} from '../utils/apiKeys';

const APIDocumentation = ({ user, userCompanyId, showNotification, t }) => {
  const [apiKeys, setAPIKeys] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);

  // Загрузка API-ключей
  const loadAPIKeys = useCallback(async () => {
    if (!userCompanyId) return;
    
    setLoadingKeys(true);
    try {
      const keys = await getCompanyAPIKeys(userCompanyId);
      setAPIKeys(keys);
    } catch (err) {
      console.error('Ошибка загрузки API-ключей:', err);
      showNotification?.('Не удалось загрузить ключи', 'error');
    } finally {
      setLoadingKeys(false);
    }
  }, [userCompanyId, showNotification]);

  useEffect(() => {
    loadAPIKeys();
  }, [loadAPIKeys]);

  // Генерация нового ключа
  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      showNotification?.('Введите название ключа', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const result = await generateAPIKey(
        user?.id,
        userCompanyId,
        newKeyName,
        ['read:applications', 'write:applications', 'read:analytics']
      );
      setGeneratedKey(result.key);
      setShowGenerateModal(false);
      setNewKeyName('');
      await loadAPIKeys();
      showNotification?.('API-ключ создан!', 'success');
    } catch (err) {
      showNotification?.('Ошибка создания ключа: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Отзыв ключа
  const handleRevokeKey = async (keyId) => {
    if (!window.confirm('Вы уверены? Этот ключ перестанет работать.')) return;
    
    try {
      await revokeAPIKey(keyId);
      await loadAPIKeys();
      showNotification?.('Ключ отозван', 'success');
    } catch (err) {
      showNotification?.('Ошибка: ' + err.message, 'error');
    }
  };

  // Копирование в буфер обмена
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showNotification?.('Скопировано!', 'success');
    } catch (err) {
      console.error('Ошибка копирования:', err);
      showNotification?.('Не удалось скопировать', 'error');
    }
  };

  const tabs = [
    { id: 'overview', label: t?.('apiTabOverview') || 'Обзор', icon: Activity },
    { id: 'authentication', label: t?.('apiTabAuth') || 'Аутентификация', icon: Lock },
    { id: 'endpoints', label: t?.('apiTabEndpoints') || 'Эндпоинты', icon: Server },
    { id: 'webhooks', label: t?.('apiTabWebhooks') || 'Webhooks', icon: ExternalLink },
    { id: 'keys', label: t?.('apiTabKeys') || 'Мои ключи', icon: Key }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 page-enter">
      {/* Header */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-xl">
              <Code className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                API Документация
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Интеграция с внешними системами
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md transition-shadow flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Создать ключ
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#4A6572] text-[#4A6572] dark:text-[#F9AA33]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 flex-shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'authentication' && <AuthenticationTab />}
        {activeTab === 'endpoints' && <EndpointsTab />}
        {activeTab === 'webhooks' && <WebhooksTab />}
        {activeTab === 'keys' && (
          <APIKeysTab 
            apiKeys={apiKeys}
            onRevoke={handleRevokeKey}
            onCopy={copyToClipboard}
            loadingKeys={loadingKeys}
          />
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Создать новый API-ключ
            </h3>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Название ключа"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={handleGenerateKey}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md disabled:opacity-50"
              >
                {loading ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Key Modal */}
      {generatedKey && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[10000]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-4">
              <Check className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Ключ создан
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              ⚠️ Сохраните этот ключ! Он показывается только один раз.
            </p>
            <div className="flex gap-2 mb-4">
              <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono break-all">
                {generatedKey}
              </code>
              <button
                onClick={() => copyToClipboard(generatedKey)}
                className="px-3 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] relative"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-300" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              onClick={() => setGeneratedKey(null)}
              className="w-full px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg"
            >
              Готово
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// TAB COMPONENTS
// ─────────────────────────────────────────────────────────

const OverviewTab = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Быстрый старт
      </h2>
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-[#4A6572] text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Создайте API-ключ во вкладке "Мои ключи"
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-[#4A6572] text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Используйте ключ в заголовке <code className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">Authorization: Bearer YOUR_API_KEY</code>
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 bg-[#4A6572] text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Отправляйте запросы на <code className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">https://api.reglai.ru/v1</code>
          </p>
        </div>
      </div>
    </div>

    <div className="grid md:grid-cols-3 gap-4">
      <div className="bg-gradient-to-br from-[#4A6572]/10 to-[#344955]/10 rounded-lg p-4 border border-[#4A6572]/20">
        <Activity className="w-6 h-6 text-[#4A6572] mb-2" />
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Rate Limit</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">100 запросов в минуту</p>
      </div>
      <div className="bg-gradient-to-br from-[#F9AA33]/10 to-[#F57C00]/10 rounded-lg p-4 border border-[#F9AA33]/20">
        <Shield className="w-6 h-6 text-[#F9AA33] mb-2" />
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Безопасность</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">SHA-256 хеширование ключей</p>
      </div>
      <div className="bg-gradient-to-br from-[#3b82f6]/10 to-[#2563eb]/10 rounded-lg p-4 border border-[#3b82f6]/20">
        <Clock className="w-6 h-6 text-[#3b82f6] mb-2" />
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Срок действия</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">365 дней по умолчанию</p>
      </div>
    </div>
  </div>
);

const AuthenticationTab = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Аутентификация
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Все API-запросы требуют аутентификации через API-ключ в заголовке.
      </p>
      
      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
        <pre className="text-sm text-green-400 font-mono">
{`curl -X GET https://api.reglai.ru/v1/applications \\
  -H "Authorization: Bearer rk_live_..." \\
  -H "Content-Type: application/json"`}
        </pre>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Формат ответа
      </h3>
      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
        <pre className="text-sm text-blue-400 font-mono">
{`{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}`}
        </pre>
      </div>
    </div>

    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Коды ошибок
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 text-gray-900 dark:text-white">Код</th>
              <th className="text-left py-2 text-gray-900 dark:text-white">Описание</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 dark:text-gray-400">
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 font-mono">400</td>
              <td className="py-2">Неверный запрос</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 font-mono">401</td>
              <td className="py-2">Неверный API-ключ</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 font-mono">403</td>
              <td className="py-2">Недостаточно прав</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <td className="py-2 font-mono">429</td>
              <td className="py-2">Превышен лимит запросов</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const EndpointsTab = () => (
  <div className="space-y-6">
    <EndpointCard
      method="GET"
      path="/v1/applications"
      description="Получить список заявок"
      params={[
        { name: 'page', type: 'integer', required: false, default: '1' },
        { name: 'limit', type: 'integer', required: false, default: '20' },
        { name: 'status', type: 'string', required: false, default: 'all' }
      ]}
    />
    
    <EndpointCard
      method="POST"
      path="/v1/applications"
      description="Создать новую заявку"
      body={{
        object_name: "string (required)",
        foreman_name: "string (required)",
        foreman_phone: "string (required)",
        materials: "array (required)"
      }}
    />
    
    <EndpointCard
      method="GET"
      path="/v1/analytics"
      description="Получить аналитику компании"
      params={[
        { name: 'from', type: 'date', required: false },
        { name: 'to', type: 'date', required: false }
      ]}
    />
    
    <EndpointCard
      method="POST"
      path="/v1/webhooks"
      description="Зарегистрировать webhook"
      body={{
        url: "string (required)",
        events: "array (required)"
      }}
    />
  </div>
);

const EndpointCard = ({ method, path, description, params, body }) => {
  const methodColors = {
    GET: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className={`px-2 py-1 rounded text-xs font-bold ${methodColors[method]}`}>
          {method}
        </span>
        <code className="text-sm font-mono text-gray-900 dark:text-white">{path}</code>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      
      {params && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            QUERY PARAMETERS
          </h4>
          <div className="space-y-2">
            {params.map((param, idx) => (
              <div 
                key={`${param.name}-${idx}`}
                className="flex items-center gap-2 text-sm flex-wrap"
              >
                <code className="text-[#4A6572] dark:text-[#F9AA33]">{param.name}</code>
                <span className="text-gray-400">({param.type})</span>
                {param.required && <span className="text-red-500 text-xs">required</span>}
                {param.default && <span className="text-gray-500 text-xs">default: {param.default}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {body && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            REQUEST BODY
          </h4>
          <div className="bg-gray-900 rounded p-3 overflow-x-auto">
            <pre className="text-xs text-blue-400 font-mono">
              {JSON.stringify(body, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

const WebhooksTab = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Webhooks
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Получайте уведомления о событиях в реальном времени.
      </p>
    </div>

    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Доступные события
      </h3>
      <div className="space-y-2">
        {[
          { event: 'application.created', desc: 'Новая заявка создана' },
          { event: 'application.updated', desc: 'Заявка обновлена' },
          { event: 'application.received', desc: 'Заявка принята' },
          { event: 'material.received', desc: 'Материал получен на склад' }
        ].map((item, idx) => (
          <div 
            key={`${item.event}-${idx}`}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            <code className="text-sm text-[#4A6572] dark:text-[#F9AA33]">{item.event}</code>
            <span className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</span>
          </div>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
        Пример payload
      </h3>
      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
        <pre className="text-sm text-green-400 font-mono">
{`{
  "event": "application.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "id": "uuid",
    "object_name": "Объект 1",
    "status": "pending"
  }
}`}
        </pre>
      </div>
    </div>
  </div>
);

const APIKeysTab = ({ apiKeys, onRevoke, onCopy, loadingKeys = false }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        Активные ключи
      </h2>
      <button
        onClick={() => window.location.reload()}
        className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        disabled={loadingKeys}
        aria-label="Обновить список ключей"
      >
        <RefreshCw className={`w-4 h-4 ${loadingKeys ? 'animate-spin' : ''}`} />
      </button>
    </div>

    {/* Индикатор загрузки */}
    {loadingKeys ? (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#4A6572] dark:text-[#F9AA33]" />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Загрузка ключей...
        </p>
      </div>
    ) : apiKeys.length === 0 ? (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>У вас пока нет API-ключей</p>
        <p className="text-sm">Создайте первый ключ для начала работы</p>
      </div>
    ) : (
      <div className="space-y-3">
        {apiKeys.map(key => (
          <div
            key={key.id}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {key.name}
                </h3>
                {key.is_active ? (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full flex-shrink-0">
                    Активен
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs rounded-full flex-shrink-0">
                    Отозван
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {key.usage_count} запросов
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  До: {new Date(key.expires_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              {key.is_active && (
                <button
                  onClick={() => onRevoke?.(key.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Отозвать ключ"
                  aria-label={`Отозвать ключ ${key.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {onCopy && (
                <button
                  onClick={() => onCopy(key.name)}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Копировать название"
                  aria-label={`Копировать название ключа ${key.name}`}
                >
                  <Copy className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default APIDocumentation;