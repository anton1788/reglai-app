// src/components/ChatSidebar.jsx
import React from 'react';
import { MessageCircle, Plus, Shield, Settings, X } from 'lucide-react';

const ChatSidebar = ({ 
  channels, activeChannel, onChannelSelect, 
  canCreateChannel, onCreateChannel, connectionStatus,
  isMobile, showSidebar, onCloseSidebar,
  t 
}) => {
  if (isMobile && !showSidebar) return null;
  
  return (
    <aside className={`${isMobile ? 'fixed inset-0 z-50 bg-white dark:bg-gray-800 w-64' : 'w-64'} border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 p-4 flex flex-col overflow-y-auto`}>
      {isMobile && (
        <div className="flex justify-end mb-4">
          <button onClick={onCloseSidebar} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4 px-2 flex-shrink-0">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> {t?.('chat.channels') || 'Каналы'}
        </h3>
        {canCreateChannel && (
          <button onClick={onCreateChannel} className="p-1.5 hover:bg-[#4A6572]/10 rounded-lg text-[#4A6572] transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <nav className="space-y-1 flex-1 overflow-y-auto">
        {channels.map(channel => (
          <button
            key={channel.id}
            onClick={() => {
              onChannelSelect(channel.id);
              if (isMobile) onCloseSidebar();
            }}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${
              activeChannel === channel.id
                ? 'bg-[#4A6572] text-white shadow-md' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
          >
            <span className="text-lg">{channel.icon}</span>
            <span className="truncate flex-1">{channel.label || channel.name}</span>
            {(channel.adminOnly || (channel.type === 'custom' && channel.is_private)) && (
              <Shield className={`w-3 h-3 ${activeChannel === channel.id ? 'text-white/80' : 'text-gray-400'}`} />
            )}
          </button>
        ))}
      </nav>
      
      <div className="flex-shrink-0 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 px-2">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-500 dark:text-gray-400">
            {connectionStatus === 'connected' ? 'Онлайн' : 'Оффлайн'}
          </span>
        </div>
      </div>
    </aside>
  );
};

export default ChatSidebar;