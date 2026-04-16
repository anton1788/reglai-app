// src/components/VersionUpdateModal.jsx
import React, { memo } from 'react';
import { X, Download, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const VersionUpdateModal = memo(({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onStay, 
  newVersion, 
  changes, 
  message 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 
      bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl 
        max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 
                rounded-xl text-white">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  🎉 Доступна версия {newVersion}!
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Рекомендуется обновиться
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 
              dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Changes List */}
        {changes && changes.length > 0 && (
          <div className="p-6">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 
              mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Что нового:
            </h4>
            <ul className="space-y-2">
              {changes.map((change, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm 
                  text-gray-600 dark:text-gray-400">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warning Message */}
        {message && (
          <div className="px-6 pb-4">
            <div className="flex items-start gap-2 p-3 bg-amber-50 
              dark:bg-amber-900/20 rounded-lg border border-amber-200 
              dark:border-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 
                mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {message}
              </p>
            </div>
          </div>
        )}

        {/* Footer with 3 Options */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 
          bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
          <div className="flex flex-col gap-3">
            <button onClick={onConfirm} className="w-full px-4 py-3 
              bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 
              hover:to-purple-700 text-white rounded-xl font-medium 
              transition-all shadow-lg hover:shadow-xl flex items-center 
              justify-center gap-2">
              <Download className="w-4 h-4" />
              Обновить сейчас
            </button>
            
            {onStay && (
              <button onClick={onStay} className="w-full px-4 py-3 
                bg-white dark:bg-gray-800 border border-gray-300 
                dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 
                text-gray-700 dark:text-gray-300 rounded-xl font-medium 
                transition-all flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Напомнить позже
              </button>
            )}
            
            <button onClick={onClose} className="w-full px-4 py-2 
              text-gray-500 dark:text-gray-400 hover:text-gray-700 
              dark:hover:text-gray-200 text-sm font-medium transition-colors">
              Отменить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

VersionUpdateModal.displayName = 'VersionUpdateModal';
export default VersionUpdateModal;