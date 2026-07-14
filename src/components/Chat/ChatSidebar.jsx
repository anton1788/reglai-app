// src/components/Chat/ChatSidebar.jsx
import React, { useState } from 'react';
import { 
  X, Settings, Trash2, Plus, Search, User, 
  MessageCircle, Lock, Globe, Users, Pin
} from 'lucide-react';

const ChatSidebar = ({
  channels,
  activeChannel,
  onChannelSelect,
  canCreateChannel,
  onCreateChannel,
  connectionStatus,
  showSidebar,
  onChannelSettings,
  onDeleteChannel,
  currentUserRole,
  companyUsers,
  currentUser,
  onStartDirectChat,
  unreadCounts,
  pinnedChannels = [],
  onTogglePinChannel,
  className = ''
}) => {
  const [search, setSearch] = useState('');
  const [showUserList, setShowUserList] = useState(false);

  if (!showSidebar) return null;

  // Фильтрация каналов по поиску
  const filteredChannels = channels.filter(ch => {
    const label = ch.label || ch.name || '';
    return label.toLowerCase().includes(search.toLowerCase());
  });

  // ============================================================
  // 🔥 ИСПРАВЛЕНО: Все каналы показываем вместе
  // ============================================================
  // Просто показываем все каналы в одном списке
  const allChannels = filteredChannels;

  const userInitial = currentUser?.user_metadata?.full_name?.[0]?.toUpperCase() || '?';
  const userName = currentUser?.user_metadata?.full_name || 'Пользователь';

  const canManageChannels = currentUserRole === 'manager' || currentUserRole === 'supply_admin';

  // Проверяем, что каналы есть
  console.log('📋 ChatSidebar: каналов для отображения:', allChannels.length);

  return (
    <aside className={`flex flex-col border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 ${className}`}>
      {/* Профиль пользователя */}
      <div className="p-3 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">{userInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{userName}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{currentUserRole}</p>
          </div>
        </div>

        {/* Статус соединения */}
        <div className="flex items-center gap-2 mt-2 px-1">
          <span className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            {connectionStatus === 'connected' ? 'Онлайн' : 'Оффлайн'}
          </span>
        </div>
      </div>

      {/* Поиск каналов */}
      <div className="p-2 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск каналов..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A6572]"
          />
        </div>
      </div>

      {/* Кнопка создания канала */}
      {canCreateChannel && (
        <div className="p-2 border-b border-gray-200/50 dark:border-gray-700/50">
          <button
            onClick={onCreateChannel}
            className="w-full px-3 py-1.5 bg-[#4A6572] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 hover:bg-[#344955] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Создать канал
          </button>
        </div>
      )}

      {/* Список каналов */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {allChannels.length > 0 ? (
          <>
            <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 py-1">
              Каналы
            </div>
            {allChannels.map(channel => {
              const isActive = activeChannel === channel.id;
              const unread = unreadCounts[channel.id] || 0;
              const isPinned = pinnedChannels.includes(channel.id);
              const isSystem = channel.is_system || channel.type === 'system';
              
              return (
                <div key={channel.id} className="relative group">
                  <button
                    onClick={() => onChannelSelect(channel.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${
                      isActive 
                        ? 'bg-[#4A6572] text-white shadow-md' 
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-lg flex-shrink-0">{channel.icon || '💬'}</span>
                    <span className="truncate flex-1">{channel.label || channel.name}</span>
                    {isPinned && <Pin className="w-3 h-3 opacity-60 flex-shrink-0" />}
                    {unread > 0 && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {unread}
                      </span>
                    )}
                  </button>
                  
                  {canManageChannels && !isSystem && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePinChannel?.(channel.id);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        <Pin className={`w-3 h-3 ${isPinned ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onChannelSettings?.(channel);
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Удалить канал "${channel.name}"?`)) {
                            onDeleteChannel?.(channel.id);
                          }
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            Нет каналов
          </div>
        )}
      </div>

      {/* Пользователи */}
      {companyUsers && companyUsers.length > 0 && (
        <div className="p-2 border-t border-gray-200/50 dark:border-gray-700/50">
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-300">
              Пользователи ({companyUsers.length})
            </span>
            <span className="ml-auto text-[10px] text-gray-400">
              {showUserList ? '▲' : '▼'}
            </span>
          </button>
          
          {showUserList && (
            <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
              {companyUsers.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => onStartDirectChat?.(u)}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-medium">
                      {u.full_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <span className="truncate text-gray-700 dark:text-gray-300">{u.full_name}</span>
                  {u.user_id === currentUser?.id && (
                    <span className="text-[10px] text-gray-400">(вы)</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default ChatSidebar;