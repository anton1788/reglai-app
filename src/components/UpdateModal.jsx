import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X, AlertCircle, CheckCircle } from 'lucide-react';

const UpdateModal = ({ isOpen, onClose, updateInfo, onApplyUpdate, isLoading }) => {
  const [countdown, setCountdown] = useState(5);
  const [autoUpdate, setAutoUpdate] = useState(true);

  useEffect(() => {
    let timer;
    if (isOpen && autoUpdate && countdown > 0) {
      timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    } else if (isOpen && autoUpdate && countdown === 0) {
      onApplyUpdate();
    }
    return () => clearTimeout(timer);
  }, [isOpen, autoUpdate, countdown, onApplyUpdate]);

  if (!isOpen || !updateInfo) return null;

  const isBreaking = updateInfo.breaking === true;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100000] fade-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      onClick={(e) => e.target === e.currentTarget && !isBreaking && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200/50 dark:border-gray-700/50 animate-scale-in">
        
        {/* Header with gradient */}
        <div className="relative overflow-hidden rounded-t-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[#4A6572] to-[#344955] opacity-10"></div>
          <div className="relative flex items-center justify-between p-5 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-[#F9AA33] to-[#F57C00] rounded-xl shadow-lg animate-pulse">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 id="update-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
                  🚀 Доступно обновление!
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Версия {updateInfo.from} → {updateInfo.to}
                </p>
              </div>
            </div>
            {!isBreaking && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Breaking change warning */}
          {isBreaking && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  ⚠️ Важное обновление
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Это обновление содержит критические изменения. Рекомендуется обновиться сейчас.
                </p>
              </div>
            </div>
          )}

          {/* What's new section */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span>📋 Что нового:</span>
              <span className="text-xs text-gray-400">
                {new Date(updateInfo.date).toLocaleDateString('ru-RU')}
              </span>
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {updateInfo.changes?.map((change, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{change}</span>
                </div>
              ))}
              {(!updateInfo.changes || updateInfo.changes.length === 0) && (
                <div className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Улучшена производительность и исправлены ошибки
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Update options message */}
          {updateInfo.updateOptions?.message && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                💡 {updateInfo.updateOptions.message}
              </p>
            </div>
          )}

          {/* Auto-update countdown */}
          {autoUpdate && countdown > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Автообновление через {countdown} секунд...
              </p>
              <button
                onClick={() => setAutoUpdate(false)}
                className="text-xs text-[#4A6572] hover:underline mt-1"
              >
                Отменить автообновление
              </button>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
          {!isBreaking && updateInfo.updateOptions?.showStayOption !== false && (
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
            >
              Позже
              {updateInfo.updateOptions?.remindLaterDays && (
                <span className="text-xs ml-1">
                  (через {updateInfo.updateOptions.remindLaterDays} дн.)
                </span>
              )}
            </button>
          )}
          <button
            onClick={onApplyUpdate}
            disabled={isLoading}
            className="px-6 py-2.5 text-sm font-medium bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Обновление...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Обновить сейчас</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;