// src/components/ui/FullscreenModal.jsx
import React from 'react';
import { X } from 'lucide-react';

export const FullscreenModal = ({ isOpen, onClose, title, children, showCloseButton = true }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-0">
      <div className="bg-white dark:bg-gray-800 shadow-2xl overflow-hidden flex flex-col w-full h-full">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gradient-to-r from-[#4A6572]/5 to-transparent">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {title}
          </h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
        
        {/* Content - центрированный с ограничением ширины */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full px-6 py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenModal;