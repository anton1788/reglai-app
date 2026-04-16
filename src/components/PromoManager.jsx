// ============================================
// components/PromoManager.jsx
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Copy, AlertCircle } from 'lucide-react';

const PromoManager = ({ isOpen, onClose, supabase: supabaseClient, showNotification }) => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPromo, setNewPromo] = useState({
    code: '',
    discount_percent: 10,
    max_uses: 1,
    expires_at: '',
    plan_id: 'pro'
  });

  // Загрузка промокодов
  const loadPromoCodes = useCallback(async () => {
    if (!supabaseClient) return;
    
    setLoading(true);
    try {
      // Получаем промокоды из БД
      const { data, error } = await supabaseClient
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Преобразуем данные для отображения
      const formattedCodes = (data || []).map(code => ({
        ...code,
        used_count: code.used_count || 0,
        discount_percent: code.discount_percent || 10,
        tariff_plan_id: code.plan_id || code.tariff_plan_id || 'pro'
      }));
      
      setPromoCodes(formattedCodes);
    } catch (err) {
      console.error('Error loading promocodes:', err);
      showNotification('Ошибка загрузки промокодов: ' + err.message, 'error');
      setPromoCodes([]);
    } finally {
      setLoading(false);
    }
  }, [supabaseClient, showNotification]);

  useEffect(() => {
    if (isOpen) {
      loadPromoCodes();
    }
  }, [isOpen, loadPromoCodes]);

  // Создание промокода
  const handleCreate = async () => {
    if (!newPromo.code.trim()) {
      showNotification('Введите код промокода', 'error');
      return;
    }

    if (!supabaseClient) {
      showNotification('Ошибка подключения к базе данных', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      const { error } = await supabaseClient
        .from('promo_codes')
        .insert([{
          code: newPromo.code.toUpperCase(),
          discount_percent: newPromo.discount_percent,
          max_uses: newPromo.max_uses,
          expires_at: newPromo.expires_at || null,
          plan_id: newPromo.plan_id,
          is_active: true,
          used_count: 0,
          created_by: user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (error) throw error;

      showNotification('Промокод создан', 'success');
      setShowCreateForm(false);
      setNewPromo({
        code: '',
        discount_percent: 10,
        max_uses: 1,
        expires_at: '',
        plan_id: 'pro'
      });
      loadPromoCodes();
    } catch (err) {
      console.error('Error creating promo:', err);
      showNotification('Ошибка создания промокода: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Деактивация промокода
  const handleDeactivate = async (promoCode) => {
    if (!window.confirm(`Деактивировать промокод "${promoCode.code}"?`)) return;

    if (!supabaseClient) return;

    setLoading(true);
    try {
      const { error } = await supabaseClient
        .from('promo_codes')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', promoCode.id);
      
      if (error) throw error;
      
      showNotification('Промокод деактивирован', 'success');
      loadPromoCodes();
    } catch (err) {
      console.error('Error deactivating promo:', err);
      showNotification('Ошибка деактивации промокода: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Активация промокода
  const handleActivate = async (promoCode) => {
    if (!window.confirm(`Активировать промокод "${promoCode.code}"?`)) return;

    if (!supabaseClient) return;

    setLoading(true);
    try {
      const { error } = await supabaseClient
        .from('promo_codes')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', promoCode.id);
      
      if (error) throw error;
      
      showNotification('Промокод активирован', 'success');
      loadPromoCodes();
    } catch (err) {
      console.error('Error activating promo:', err);
      showNotification('Ошибка активации промокода: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Копирование кода
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    showNotification('Код скопирован', 'success');
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('ru-RU');
    } catch {
      return dateString;
    }
  };

  // Получение названия тарифа
  const getPlanName = (planId) => {
    switch (planId) {
      case 'basic': return 'Базовый';
      case 'pro': return 'Профессиональный';
      case 'enterprise': return 'Корпоративный';
      default: return planId || 'Профессиональный';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Скидка (%)
                  </label>
                  <input
                    type="number"
                    value={newPromo.discount_percent}
                    onChange={(e) => setNewPromo({ ...newPromo, discount_percent: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Макс. использований
                  </label>
                  <input
                    type="number"
                    value={newPromo.max_uses}
                    onChange={(e) => setNewPromo({ ...newPromo, max_uses: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Тарифный план
                  </label>
                  <select
                    value={newPromo.plan_id}
                    onChange={(e) => setNewPromo({ ...newPromo, plan_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="basic">Базовый</option>
                    <option value="pro">Профессиональный</option>
                    <option value="enterprise">Корпоративный</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
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
              {promoCodes.map((promo) => (
                <div
                  key={promo.id}
                  className={`bg-white dark:bg-gray-800 p-4 rounded-xl border ${
                    promo.is_active === false
                      ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10'
                      : 'border-gray-200/50 dark:border-gray-700/50'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded font-mono text-sm font-bold">
                          {promo.code}
                        </code>
                        {promo.is_active === false && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs rounded-full">
                            Деактивирован
                          </span>
                        )}
                        {promo.is_active === true && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs rounded-full">
                            Активен
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Скидка: <strong>{promo.discount_percent || 0}%</strong>
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          Использований: <strong>{promo.used_count || 0}/{promo.max_uses || '∞'}</strong>
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          Действует до: <strong>{formatDate(promo.expires_at)}</strong>
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          Тариф: <strong>{getPlanName(promo.plan_id || promo.tariff_plan_id)}</strong>
                        </span>
                      </div>
                      {promo.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {promo.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyCode(promo.code)}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                        title="Копировать код"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {promo.is_active === true ? (
                        <button
                          onClick={() => handleDeactivate(promo)}
                          className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Деактивировать"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(promo)}
                          className="p-2 text-green-500 hover:text-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                          title="Активировать"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoManager;