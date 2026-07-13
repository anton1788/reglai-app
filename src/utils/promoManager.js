import React, { useState, useEffect } from 'react';
import { Gift, X, Loader2 } from 'lucide-react';

const PromoManager = ({ supabase, showNotification,onClose }) => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('📥 Загрузка промокодов...');
        const { data, error } = await supabase
          .from('promo_codes')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        console.log('✅ Загружено:', data?.length || 0, 'промокодов');
        setPromoCodes(data || []);
      } catch (err) {
        console.error('❌ Ошибка:', err);
        setError(err.message);
        if (showNotification) {
          showNotification('Ошибка загрузки: ' + err.message, 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [supabase, showNotification]);

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg mb-3">❌ Ошибка</div>
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
        >
          Перезагрузить
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="ml-3 text-gray-500">Загрузка...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Всего промокодов: {promoCodes.length}
        </h3>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Закрыть
        </button>
      </div>

      {promoCodes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Промокоды не найдены</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto">
          {promoCodes.map((promo) => (
            <div
              key={promo.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-lg">{promo.code}</span>
                  <span className={`ml-3 px-2 py-0.5 text-xs rounded-full ${
                    promo.is_active
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {promo.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                  <div className="text-sm text-gray-500 mt-1">
                    {promo.description || 'Без описания'} • Скидка: {promo.discount_percent}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromoManager;