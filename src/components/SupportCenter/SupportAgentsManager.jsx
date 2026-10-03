// src/components/SupportCenter/SupportAgentsManager.jsx
// ============================================================
// 🎧 УПРАВЛЕНИЕ ОПЕРАТОРАМИ ПОДДЕРЖКИ
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, UserPlus, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

export default function SupportAgentsManager({ showNotification }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Загрузка списка операторов ──
  const loadAgents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_agents')
        .select(`
          id,
          user_id,
          display_name,
          specialization,
          is_available,
          created_at,
          status:support_agent_status(is_online, last_seen_at, current_tickets_count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Нормализуем: status — массив, берём первый элемент
      const normalized = (data || []).map(a => ({
        ...a,
        status: Array.isArray(a.status) ? a.status[0] : a.status,
      }));

      setAgents(normalized);
    } catch (e) {
      console.error('[SupportAgentsManager] loadAgents', e);
      showNotification?.('Ошибка загрузки: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // ── Добавление оператора ──
  const handleAddAgent = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();

    if (!cleanEmail || !cleanName) {
      showNotification?.('Заполните email и имя', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('create_support_agent', {
        p_email: cleanEmail,
        p_display_name: cleanName,
        p_specialization: ['tech'],
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      const message = result?.message || 'Неизвестный результат';

      if (message.startsWith('❌')) {
        showNotification?.(message, 'error');
        return;
      }
      if (message.startsWith('⚠️')) {
        showNotification?.(message, 'warning');
        return;
      }

      showNotification?.(`✅ Оператор "${cleanName}" добавлен`, 'success');
      setShowAddModal(false);
      setEmail('');
      setDisplayName('');
      loadAgents();
    } catch (e) {
      console.error('[SupportAgentsManager] handleAddAgent', e);
      showNotification?.('Ошибка: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Удаление оператора ──
  const handleRemoveAgent = async (agentId, displayName) => {
    if (!window.confirm(
      `⚠️ Удалить оператора "${displayName}"?\n\n` +
      `Он потеряет доступ к дашборду поддержки. ` +
      `Его тикеты останутся в системе.`
    )) return;

    try {
      const { data, error } = await supabase.rpc('remove_support_agent', {
        p_agent_id: agentId,
      });

      if (error) throw error;

      const message = typeof data === 'string' ? data : 'Оператор удалён';
      showNotification?.(message, message.startsWith('❌') ? 'error' : 'success');
      loadAgents();
    } catch (e) {
      console.error('[SupportAgentsManager] handleRemoveAgent', e);
      showNotification?.('Ошибка: ' + e.message, 'error');
    }
  };

  // ── Helpers ──
  const formatLastSeen = (iso) => {
    if (!iso) return '—';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff} сек назад`;
    if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
    return new Date(iso).toLocaleDateString('ru-RU');
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Шапка */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            🎧 Операторы поддержки
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {agents.length} {agents.length === 1 ? 'оператор' : 'операторов'} в системе
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#4A6572] hover:bg-[#344955] text-white rounded-lg flex items-center gap-2 font-medium transition"
        >
          <Plus className="w-4 h-4" />
          Добавить оператора
        </button>
      </div>

      {/* Список */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-5xl mb-3">🎧</div>
          <h3 className="text-lg font-semibold mb-1">Операторов пока нет</h3>
          <p className="text-sm text-gray-500 mb-4">
            Добавьте первого оператора, чтобы начать принимать обращения
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#4A6572] text-white rounded-lg"
          >
            Добавить оператора
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map(agent => {
            const isOnline = agent.status?.is_online;
            const lastSeen = agent.status?.last_seen_at;
            const ticketCount = agent.status?.current_tickets_count || 0;

            return (
              <div
                key={agent.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3"
              >
                {/* Инфо */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Аватар с индикатором */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center text-white font-semibold">
                      {agent.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                      title={isOnline ? 'Онлайн' : 'Офлайн'}
                    />
                  </div>

                  {/* Имя + метаданные */}
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white truncate">
                      {agent.display_name}
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-0.5">
                      {isOnline ? (
                        <span className="text-green-600 font-medium">● Онлайн</span>
                      ) : (
                        <span>○ Был(а) {formatLastSeen(lastSeen)}</span>
                      )}
                      {ticketCount > 0 && (
                        <span>📬 {ticketCount} активных</span>
                      )}
                      {agent.specialization?.length > 0 && (
                        <span>🏷 {agent.specialization.join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Кнопка удаления */}
                <button
                  onClick={() => handleRemoveAgent(agent.id, agent.display_name)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition flex-shrink-0"
                  title="Удалить оператора"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Модалка добавления ── */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter"
          onClick={(e) => e.target === e.currentTarget && !submitting && setShowAddModal(false)}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Хедер */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#4A6572]" />
                Новый оператор
              </h3>
              <button
                onClick={() => !submitting && setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                disabled={submitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Форма */}
            <div className="p-4 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  Пользователь должен быть <strong>уже зарегистрирован</strong> в системе.
                  Если его нет — сначала пригласите его через «Пригласить сотрудника».
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email пользователя *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="operator@reglai.ru"
                  disabled={submitting}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Отображаемое имя *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Иван Операторов"
                  disabled={submitting}
                  maxLength={80}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Имя увидят клиенты в чате поддержки
                </p>
              </div>
            </div>

            {/* Футер */}
            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleAddAgent}
                disabled={submitting || !email.trim() || !displayName.trim()}
                className="flex-1 px-4 py-2.5 bg-[#4A6572] hover:bg-[#344955] text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Создаём...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Добавить
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}