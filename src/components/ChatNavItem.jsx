import React from 'react';
import { MessageCircle } from 'lucide-react';

const ChatNavItem = ({ unreadCount, onClick, isActive }) => {
  return (
    <button 
      onClick={onClick} 
      className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-100 text-blue-700' 
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <MessageCircle className="w-5 h-5" />
      <span>Чат</span>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};

export default ChatNavItem;