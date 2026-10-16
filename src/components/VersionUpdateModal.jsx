// src/components/VersionUpdateModal.jsx
import React, { memo } from 'react';
import { X, Download, AlertCircle, CheckCircle, Clock, Sparkles } from 'lucide-react';

const VersionUpdateModal = memo(({ 
  isOpen, 
  onClose, 
  onApplyUpdate,   // ← переименовали: App передаёт onApplyUpdate
  updateInfo,      // ← и updateInfo (объект), а не разрозненные пропсы
}) => {
  if (!isOpen || !updateInfo) return null;

  const {
    from,
    to,
    changes = [],
    date,
    breaking = false,
    updateOptions = {},
  } = updateInfo;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200/50 dark:border-gray-700/50 animate-slide-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 id="update-modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
                🎉 Доступна версия {to}!
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {from && to ? `v${from} → v${to}` : 'Рекомендуется обновиться'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {breaking && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300 flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span>⚠️ Это обновление содержит важные изменения. Рекомендуется обновиться сейчас.</span>
              </p>
            </div>
          )}

          {changes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Что нового в версии {to}:
              </h4>
              <ul className="space-y-2">
                {changes.map((change, idx) => (
                  <li key={idx} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 mt-0.5 mr-2">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {updateOptions.message && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {updateOptions.message}
              </p>
            </div>
          )}

          {date && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Дата выпуска: {new Date(date).toLocaleDateString('ru-RU')}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl space-y-2">
          <button
            onClick={onApplyUpdate}
            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Обновить сейчас
          </button>

          {!breaking && updateOptions.showStayOption !== false && (
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              Напомнить позже
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm font-medium transition-colors"
          >
            Отменить
          </button>
        </div>
      </div>
    </div>
  );
});

VersionUpdateModal.displayName = 'VersionUpdateModal';
export default VersionUpdateModal;