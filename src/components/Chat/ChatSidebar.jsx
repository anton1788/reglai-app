// src/components/Chat/ChatSidebar.jsx
import React, { useState, useMemo } from 'react';
import { 
  X, Settings, Trash2, Plus, Search, User, 
  MessageCircle, Lock, Globe, Users, Pin,
  ChevronDown, ChevronRight
} from 'lucide-react';

const ChatSidebar = ({
  channels = [],
  activeChannel,
  onChannelSelect,
  canCreateChannel,
  onCreateChannel,
  connectionStatus,
  showSidebar,
  onChannelSettings,
  onDeleteChannel,
  currentUserRole,
  companyUsers = [],
  currentUser,
  onStartDirectChat,
  unreadCounts = {},
  pinnedChannels = [],
  onTogglePinChannel,
  className = ''
}) => {
  // ===== СОСТОЯНИЯ =====
  const [search, setSearch] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [showDirectChats, setShowDirectChats] = useState(true);
  const [showChannelList, setShowChannelList] = useState(true);

  // ===== ФИЛЬТРАЦИЯ КАНАЛОВ =====
  const filteredChannels = useMemo(() => {
    console.log('🔍 [ChatSidebar] Фильтрация каналов, channels:', channels?.length || 0);
    if (!channels || !Array.isArray(channels)) return [];
    
    return channels.filter(ch => {
      const label = ch.label || ch.name || '';
      return label.toLowerCase().includes(search.toLowerCase());
    });
  }, [channels, search]);

  // ===== РАЗДЕЛЕНИЕ КАНАЛОВ =====
  const { systemChannels, directChannels } = useMemo(() => {
    const system = [];
    const direct = [];
    
    filteredChannels.forEach(ch => {
      const isDirect = ch.is_direct || ch.id?.startsWith('dm_');
      if (isDirect) {
        direct.push(ch);
      } else {
        system.push(ch);
      }
    });
    
    return { systemChannels: system, directChannels: direct };
  }, [filteredChannels]);

  // ===== ПОЛЬЗОВАТЕЛИ (исключая текущего) =====
  const otherUsers = useMemo(() => {
    if (!companyUsers || !Array.isArray(companyUsers)) return [];
    return companyUsers.filter(u => u.user_id !== currentUser?.id);
  }, [companyUsers, currentUser?.id]);

  // ===== ОТЛАДКА =====
  console.log('📋 [ChatSidebar] Всего каналов:', channels?.length || 0);
  console.log('📋 [ChatSidebar] Системных каналов:', systemChannels.length);
  console.log('📋 [ChatSidebar] Личных чатов:', directChannels.length);
  console.log('📋 [ChatSidebar] Пользователей (кроме себя):', otherUsers.length);

  // ===== РАННИЙ ВОЗВРАТ =====
  if (!showSidebar) return null;

  // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
  const canManageChannels = currentUserRole === 'manager' || currentUserRole === 'supply_admin' || currentUserRole === 'director';

  const getChannelIcon = (channel) => {
    if (channel.is_direct || channel.id?.startsWith('dm_')) {
      return '👤';
    }
    return channel.icon || '💬';
  };

  const getChannelName = (channel) => {
    if (channel.is_direct || channel.id?.startsWith('dm_')) {
      // Пытаемся найти имя собеседника
      if (channel.participant_name) {
        return channel.participant_name;
      }
      // Если есть name, используем его
      if (channel.name) {
        return channel.name.replace('Чат с ', '');
      }
      return 'Личный чат';
    }
    return channel.label || channel.name || 'Без названия';
  };

  const userInitial = currentUser?.user_metadata?.full_name?.[0]?.toUpperCase() || '?';
  const userName = currentUser?.user_metadata?.full_name || 'Пользователь';

  // ===== РЕНДЕР КАНАЛА =====
  const renderChannel = (channel) => {
    const isActive = activeChannel === channel.id;
    const unread = unreadCounts[channel.id] || 0;
    const isPinned = pinnedChannels.includes(channel.id);
    const isSystem = channel.is_system || channel.type === 'system';
    const isDirect = channel.is_direct || channel.id?.startsWith('dm_');
    const icon = getChannelIcon(channel);
    const displayName = getChannelName(channel);

    return (
      <div key={channel.id} className="relative group">
        <button
          onClick={() => onChannelSelect(channel.id)}
          className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${
            isActive 
              ? 'bg-[#4A6572] text-white shadow-md' 
              : isDirect
                ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
          }`}
        >
          <span className="text-lg flex-shrink-0">{icon}</span>
          <span className="truncate flex-1">{displayName}</span>
          
          {isPinned && (
            <Pin className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />
          )}
          
          {unread > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 min-w-[20px] text-center">
              {unread}
            </span>
          )}
          
          {isDirect && !isActive && (
            <span className="text-[10px] text-gray-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              💬
            </span>
          )}
        </button>
        
        {/* Кнопки управления (только для не-системных и не-личных каналов) */}
        {canManageChannels && !isSystem && !isDirect && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePinChannel?.(channel.id);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              aria-label="Закрепить канал"
            >
              <Pin className={`w-3 h-3 ${isPinned ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChannelSettings?.(channel);
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              aria-label="Настройки канала"
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
              aria-label="Удалить канал"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // ===== ОСНОВНОЙ РЕНДЕР =====
  return (
    <aside className={`flex flex-col border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 ${className}`}>
      {/* ===== ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ ===== */}
      <div className="p-3 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">{userInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{userName}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">{currentUserRole || 'Пользователь'}</p>
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

      {/* ===== ПОИСК ===== */}
      <div className="p-2 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск каналов и чатов..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A6572] border border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>

      {/* ===== КНОПКА СОЗДАНИЯ КАНАЛА ===== */}
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

      {/* ===== СПИСОК КАНАЛОВ ===== */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredChannels.length > 0 ? (
          <>
            {/* Системные каналы */}
            {systemChannels.length > 0 && (
              <div className="space-y-1">
                <button
                  onClick={() => setShowChannelList(!showChannelList)}
                  className="w-full flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 py-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showChannelList ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  Каналы ({systemChannels.length})
                </button>
                
                {showChannelList && (
                  <div className="space-y-1">
                    {systemChannels.map(channel => renderChannel(channel))}
                  </div>
                )}
              </div>
            )}

            {/* Личные чаты */}
            {directChannels.length > 0 && (
              <div className="space-y-1 mt-2">
                <button
                  onClick={() => setShowDirectChats(!showDirectChats)}
                  className="w-full flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 py-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showDirectChats ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  Личные чаты ({directChannels.length})
                </button>
                
                {showDirectChats && (
                  <div className="space-y-1">
                    {directChannels.map(channel => renderChannel(channel))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">
            {search ? 'Ничего не найдено' : 'Нет доступных каналов'}
          </div>
        )}
      </div>

      {/* ===== СПИСОК ПОЛЬЗОВАТЕЛЕЙ ===== */}
      {otherUsers.length > 0 && (
        <div className="p-2 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/20">
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-600 dark:text-gray-300">
              Пользователи ({otherUsers.length})
            </span>
            <span className="ml-auto text-[10px] text-gray-400">
              {showUserList ? '▲' : '▼'}
            </span>
          </button>
          
          {showUserList && (
            <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
              {otherUsers.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => {
                    console.log('👤 Начать чат с:', u.full_name, u.user_id);
                    onStartDirectChat?.(u);
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg flex items-center gap-2 transition-colors group"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[10px] font-medium">
                      {u.full_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <span className="truncate text-gray-700 dark:text-gray-300 flex-1">
                    {u.full_name}
                  </span>
                  <span className="text-[10px] text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    Написать 💬
                  </span>
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