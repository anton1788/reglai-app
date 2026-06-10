import React from 'react';
import { MessageCircle, Plus, Shield, X, Settings, Trash2 } from 'lucide-react';

const ChatSidebar = ({ 
  channels, activeChannel, onChannelSelect, 
  canCreateChannel, onCreateChannel, connectionStatus,
  isMobile, showSidebar, onCloseSidebar,
  onChannelSettings, onDeleteChannel, currentUserRole
}) => {
  if (isMobile && !showSidebar) return null;
  
  const canDeleteChannel = (channel) => {
    if (channel.type === 'system') return false;
    return currentUserRole === 'manager' || currentUserRole === 'supply_admin';
  };
  
  return (
    <aside className={`${isMobile ? 'fixed inset-0 z-50 bg-white dark:bg-gray-800 w-64' : 'w-64'} border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 p-4 flex flex-col overflow-y-auto`}>
      {isMobile && (
        <div className="flex justify-end mb-4">
          <button onClick={onCloseSidebar} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> Каналы
        </h3>
        {canCreateChannel && (
          <button onClick={onCreateChannel} className="p-1.5 hover:bg-[#4A6572]/10 rounded-lg text-[#4A6572]">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <nav className="space-y-1 flex-1 overflow-y-auto">
        {channels.map(channel => {
          const isActive = activeChannel === channel.id;
          const isSystem = channel.type === 'system';
          const canDelete = !isSystem && canDeleteChannel(channel);
          
          return (
            <div key={channel.id} className="relative group">
              <button
                onClick={() => onChannelSelect(channel.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${
                  isActive ? 'bg-[#4A6572] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{channel.icon}</span>
                <span className="truncate flex-1">{channel.label || channel.name}</span>
                {channel.adminOnly && <Shield className={`w-3 h-3 ${isActive ? 'text-white/80' : 'text-gray-400'}`} />}
              </button>
              
              {!isSystem && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChannelSettings(channel);
                    }}
                    className="p-1 rounded hover:bg-gray-200"
                    title="Управление каналом"
                  >
                    <Settings className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChannel(channel.id);
                      }}
                      className="p-1 rounded hover:bg-red-100"
                      title="Удалить канал"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      
      <div className="mt-4 pt-4 border-t px-2">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-500">{connectionStatus === 'connected' ? 'Онлайн' : 'Оффлайн'}</span>
        </div>
      </div>
    </aside>
  );
};

export default ChatSidebar;