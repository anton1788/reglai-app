import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingOverlay = ({ isLoading, message = 'Загрузка...', fullScreen = false, transparent = false }) => {
  if (!isLoading) return null;
  
  const containerClass = fullScreen 
    ? 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center'
    : `absolute inset-0 ${transparent ? 'bg-white/30 dark:bg-gray-800/30' : 'bg-white/80 dark:bg-gray-800/80'} rounded-lg flex items-center justify-center z-50`;
  
  return (
    <div className={containerClass}>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl flex flex-col items-center space-y-3 min-w-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;