// src/components/ConfirmModal.jsx
import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Подтверждение',
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'default', // 'default' | 'danger' | 'warning' | 'success'
  icon: CustomIcon,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Enter') onConfirm();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  // 🎨 Стили по варианту
  const variants = {
    default: {
      iconBg: 'from-indigo-500 to-blue-600',
      confirmBg: 'from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700',
      IconComponent: CustomIcon || AlertTriangle,
    },
    danger: {
      iconBg: 'from-red-500 to-rose-600',
      confirmBg: 'from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700',
      IconComponent: CustomIcon || AlertTriangle,
    },
    warning: {
      iconBg: 'from-amber-500 to-orange-600',
      confirmBg: 'from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700',
      IconComponent: CustomIcon || AlertTriangle,
    },
    success: {
      iconBg: 'from-emerald-500 to-green-600',
      confirmBg: 'from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700',
      IconComponent: CustomIcon || AlertTriangle,
    },
  };

  const config = variants[variant] || variants.default;
  const Icon = config.IconComponent;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] fade-enter"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ animation: 'fadeIn 200ms ease-out' }}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        style={{ animation: 'slideIn 200ms ease-out' }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 pb-4">
          <div className={`p-3 bg-gradient-to-br ${config.iconBg} rounded-2xl flex-shrink-0 shadow-lg`}>
            <Icon className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Message */}
        <div className="px-6 pb-6">
          <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
            {message}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 p-4 border-t border-gray-200/60 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 font-medium rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-white font-medium rounded-xl bg-gradient-to-r ${config.confirmBg} transition-all shadow-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
};

export default ConfirmModal;