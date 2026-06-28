// components/PromoModal.jsx
import React, { useState } from 'react';
import { X, Gift, Loader2 } from 'lucide-react';

const PromoModal = ({ isOpen, onClose, onActivate, isLoading }) => {
  const [promoCode, setPromoCode] = useState('');
  const [showHints, setShowHints] = useState(false);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (promoCode.trim()) {
      onActivate(promoCode.trim());
    }
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10001] fade-enter"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] rounded-lg">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Активация промокода
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Введите промокод
            </label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="например: FREE3M"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-lg font-mono"
              autoFocus
              disabled={isLoading}
            />
            
            {/* 🆕 ПОДСКАЗКИ - ДОБАВИТЬ ЭТОТ БЛОК */}
            <button
              type="button"
              onClick={() => setShowHints(!showHints)}
              className="text-xs text-blue-500 hover:text-blue-700 mt-2"
            >
              {showHints ? 'Скрыть подсказки' : 'Какие промокоды доступны?'}
            </button>
            
            {showHints && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs space-y-1.5">
                <p className="font-medium text-gray-700 dark:text-gray-300">Доступные промокоды:</p>
                <div className="grid grid-cols-2 gap-1">
                  <div><code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">FREE3M</code> — 3 мес бесплатно</div>
                  <div><code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">HALF6M</code> — -50% на 6 мес</div>
                  <div><code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">PARTNER2026</code> — 1 год доступа</div>
                  <div><code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">TEST7D</code> — 7 дней теста</div>
                  <div><code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">STARTUP30</code> — -30% стартапам</div>
                  <div><code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">WELCOME20</code> — -20% новым</div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">* Промокоды активируются только владельцем компании</p>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              * Промокод предоставляется по согласованию с администратором
            </p>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!promoCode.trim() || isLoading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Проверка...</span>
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  <span>Активировать</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PromoModal;