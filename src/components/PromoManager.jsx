// ============================================
// components/PromoManager.jsx
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Copy, AlertCircle, Check } from 'lucide-react';

const PromoManager = ({ isOpen, onClose, supabase, showNotification }) => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [newPromo, setNewPromo] = useState({
    code: '',
    discount_percent: 10,
    max_uses: 1,
    expires_at: '',
    plan_id: 'pro',
    description: ''
  });

  // Загрузка промокодов
  const loadPromoCodes = useCallback(async () => {
    if (!supabase) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Таблица пуста — это нормально
          setPromoCodes([]);
          return;
        }
        throw error;
      }
      
      const formattedCodes = (data || []).map(code => ({
        ...code,
        used_count: code.used_count || 0,
        discount_percent: code.discount_percent || 10,
        plan_id: code.plan_id || 'pro'
      }));
      
      setPromoCodes(formattedCodes);
    } catch (err) {
      console.error('Error loading promocodes:', err);
      showNotification?.('Ошибка загрузки промокодов: ' + err.message, 'error');
      setPromoCodes([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, showNotification]);

  useEffect(() => {
    if (isOpen) {
      loadPromoCodes();
    }
  }, [isOpen, loadPromoCodes]);

  // Создание промокода
  const handleCreate = async () => {
    if (!newPromo.code?.trim()) {
      showNotification?.('Введите код промокода', 'error');
      return;
    }

    if (!supabase) {
      showNotification?.('Ошибка подключения к базе данных', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const promoData = {
        code: newPromo.code.toUpperCase().trim(),
        discount_percent: newPromo.discount_percent,
        max_uses: newPromo.max_uses,
        expires_at: newPromo.expires_at || null,
        plan_id: newPromo.plan_id,
        description: newPromo.description?.trim() || null,
        is_active: true,
        used_count: 0,
        created_by: user?.id
        // created_at и updated_at добавятся автоматически через триггеры/дефолты
      };

      const { error } = await supabase
        .from('promo_codes')
        .insert([promoData]);

      if (error) throw error;

      showNotification?.('Промокод создан', 'success');
      setShowCreateForm(false);
      setNewPromo({
        code: '',
        discount_percent: 10,
        max_uses: 1,
        expires_at: '',
        plan_id: 'pro',
        description: ''
      });
      await loadPromoCodes();
    } catch (err) {
      console.error('Error creating promo:', err);
      showNotification?.('Ошибка создания промокода: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Переключение статуса промокода (активация/деактивация)
  const handleToggleActive = async (promoCode) => {
    const newStatus = !promoCode.is_active;
    const actionText = newStatus ? 'Активировать' : 'Деактивировать';
    
    if (!window.confirm(`${actionText} промокод "${promoCode.code}"?`)) return;

    if (!supabase) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ 
          is_active: newStatus
          // updated_at обновится автоматически
        })
        .eq('id', promoCode.id);
      
      if (error) throw error;
      
      showNotification?.(newStatus ? 'Промокод активирован' : 'Промокод деактивирован', 'success');
      await loadPromoCodes();
    } catch (err) {
      console.error('Error toggling promo status:', err);
      showNotification?.('Ошибка: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Копирование кода в буфер обмена
  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      showNotification?.('Код скопирован', 'success');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      showNotification?.('Не удалось скопировать', 'error');
    }
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Получение названия тарифа
  const getPlanName = (planId) => {
    const plans = {
      basic: 'Базовый',
      pro: 'Профессиональный',
      enterprise: 'Корпоративный'
    };
    return plans[planId] || planId || 'Профессиональный';
  };

  // Проверка истечения срока
  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-manager-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div>
            <h2 id="promo-manager-title" className="text-xl font-bold text-gray-900 dark:text-white">
              Управление промокодами
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Создание и управление промокодами для активации тарифов
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Кнопка создания */}
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="mb-4 px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Создать промокод
          </button>

          {/* Форма создания */}
          {showCreateForm && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Новый промокод</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Код промокода *
                  </label>
                  <input
                    type="text"
                    value={newPromo.code}
                    onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                    placeholder="WELCOME2024"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-transparent"
                    maxLength={50}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Скидка (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newPromo.discount_percent}
                    onChange={(e) => setNewPromo({ 
                      ...newPromo, 
                      discount_percent: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Макс. использований
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newPromo.max_uses}
                    onChange={(e) => setNewPromo({ 
                      ...newPromo, 
                      max_uses: Math.max(1, parseInt(e.target.value) || 1) 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Дата истечения
                  </label>
                  <input
                    type="date"
                    value={newPromo.expires_at}
                    onChange={(e) => setNewPromo({ ...newPromo, expires_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Тарифный план
                  </label>
                  <select
                    value={newPromo.plan_id}
                    onChange={(e) => setNewPromo({ ...newPromo, plan_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-transparent"
                  >
                    <option value="basic">Базовый</option>
                    <option value="pro">Профессиональный</option>
                    <option value="enterprise">Корпоративный</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Описание (необязательно)
                  </label>
                  <textarea
                    value={newPromo.description}
                    onChange={(e) => setNewPromo({ ...newPromo, description: e.target.value })}
                    placeholder="Краткое описание условий промокода..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-transparent resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !newPromo.code.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Создание...' : 'Создать'}
                </button>
              </div>
            </div>
          )}

          {/* Список промокодов */}
          {loading && promoCodes.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6572]"></div>
            </div>
          ) : !Array.isArray(promoCodes) || promoCodes.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Нет созданных промокодов</p>
              <p className="text-sm mt-1">Нажмите "Создать промокод", чтобы добавить первый</p>
            </div>
          ) : (
            <div className="space-y-3">
              {promoCodes.map((promo) => {
                const expired = isExpired(promo.expires_at);
                const fullyUsed = promo.max_uses && promo.used_count >= promo.max_uses;
                
                return (
                  <div
                    key={promo.id}
                    className={`bg-white dark:bg-gray-800 p-4 rounded-xl border transition-all ${
                      !promo.is_active || expired || fullyUsed
                        ? 'border-gray-200 dark:border-gray-700 opacity-75'
                        : 'border-gray-200/50 dark:border-gray-700/50 hover:border-[#4A6572]/50 dark:hover:border-[#F9AA33]/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded font-mono text-sm font-bold text-gray-900 dark:text-white">
                            {promo.code}
                          </code>
                          <div className="flex gap-1">
                            {!promo.is_active && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs rounded-full">
                                Неактивен
                              </span>
                            )}
                            {expired && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 text-xs rounded-full">
                                Истёк
                              </span>
                            )}
                            {fullyUsed && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs rounded-full">
                                Использован
                              </span>
                            )}
                            {promo.is_active && !expired && !fullyUsed && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs rounded-full">
                                Активен
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            Скидка: <strong className="text-gray-900 dark:text-white">{promo.discount_percent || 0}%</strong>
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            Использований: <strong className="text-gray-900 dark:text-white">{promo.used_count || 0}/{promo.max_uses || '∞'}</strong>
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            До: <strong className="text-gray-900 dark:text-white">{formatDate(promo.expires_at)}</strong>
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            Тариф: <strong className="text-gray-900 dark:text-white">{getPlanName(promo.plan_id)}</strong>
                          </span>
                        </div>
                        {promo.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                            {promo.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleCopyCode(promo.code)}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                          title={copiedCode === promo.code ? 'Скопировано!' : 'Копировать код'}
                        >
                          {copiedCode === promo.code ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleToggleActive(promo)}
                          className={`p-2 rounded-lg transition-colors ${
                            promo.is_active
                              ? 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20'
                              : 'text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                          title={promo.is_active ? 'Деактивировать' : 'Активировать'}
                        >
                          {promo.is_active ? (
                            <X className="w-4 h-4" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoManager;