import React, { useState, useMemo, memo } from 'react';
import { 
  MessageCircle, Plus, Shield, X, Settings, Trash2, Users, Search, 
  User, Mail, Star, Clock, MoreVertical, Pin, Volume2, VolumeX,
  Check, Crown, Sparkles, Filter, SortAsc, SortDesc, AtSign,
  Moon, Sun, Zap, Award, Target, Coffee, Smile, Heart
} from 'lucide-react';

// Вспомогательный компонент для иконки шеврона
const ChevronRight = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

// Вспомогательный компонент для иконки пакета
const Package = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const ChatSidebar = memo(({ 
  channels, activeChannel, onChannelSelect, 
  canCreateChannel, onCreateChannel, connectionStatus,
  isMobile, showSidebar, onCloseSidebar,
  onChannelSettings, onDeleteChannel, currentUserRole,
  companyUsers, currentUser, onStartDirectChat,
  unreadCounts = {},
  pinnedChannels = [],
  onTogglePin,
  favoriteChannels = [],
  onToggleFavorite
}) => {
  const [showContacts, setShowContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [sortBy, setSortBy] = useState('activity'); // activity, name, unread
  const [expandedSections, setExpandedSections] = useState({
    favorites: true,
    pinned: true,
    dms: true,
    groups: true
  });

  const canDeleteChannel = (channel) => {
    if (channel.type === 'system') return false;
    return currentUserRole === 'manager' || currentUserRole === 'supply_admin';
  };

  // Фильтрация и поиск пользователей
  const filteredUsers = useMemo(() => {
    let users = companyUsers?.filter(u => u.user_id !== currentUser?.id) || [];
    
    if (searchQuery) {
      users = users.filter(u => 
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.includes(searchQuery)
      );
    }
    
    if (showOnlineOnly) {
      // Симуляция онлайн-статуса (можно заменить на реальные данные)
      users = users.filter(() => Math.random() > 0.3);
    }
    
    return users;
  }, [companyUsers, currentUser?.id, searchQuery, showOnlineOnly]);

  // Функция сортировки каналов
  const getSortedChannels = (channelsList) => {
    let sorted = [...channelsList];
    
    if (sortBy === 'activity') {
      sorted.sort((a, b) => (b.last_activity || 0) - (a.last_activity || 0));
    } else if (sortBy === 'unread') {
      sorted.sort((a, b) => (unreadCounts[b.id] || 0) - (unreadCounts[a.id] || 0));
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => 
        (a.label || a.name).localeCompare(b.label || b.name)
      );
    }
    
    return sorted;
  };

  // Группировка пользователей по ролям с сортировкой
  const getUsersByRole = useMemo(() => {
    const groups = {
      directors: { label: 'Руководители', icon: <Crown className="w-3 h-3" />, users: [], priority: 1 },
      managers: { label: 'Менеджеры', icon: <Star className="w-3 h-3" />, users: [], priority: 2 },
      supply: { label: 'Снабжение', icon: <Package className="w-3 h-3" />, users: [], priority: 3 },
      masters: { label: 'Прорабы', icon: <Target className="w-3 h-3" />, users: [], priority: 4 },
      accountants: { label: 'Бухгалтерия', icon: <Award className="w-3 h-3" />, users: [], priority: 5 },
      others: { label: 'Сотрудники', icon: <User className="w-3 h-3" />, users: [], priority: 6 }
    };

    filteredUsers.forEach(user => {
      const role = user.role?.toLowerCase();
      if (role === 'director' || role === 'ceo') groups.directors.users.push(user);
      else if (role === 'manager') groups.managers.users.push(user);
      else if (role === 'supply_admin') groups.supply.users.push(user);
      else if (role === 'master' || role === 'foreman') groups.masters.users.push(user);
      else if (role === 'accountant') groups.accountants.users.push(user);
      else groups.others.users.push(user);
    });

    // Сортировка пользователей внутри групп
    Object.keys(groups).forEach(key => {
      if (sortBy === 'activity') {
        groups[key].users.sort((a, b) => (b.last_active || 0) - (a.last_active || 0));
      } else if (sortBy === 'name') {
        groups[key].users.sort((a, b) => a.full_name?.localeCompare(b.full_name));
      }
    });

    return Object.entries(groups)
      .filter(([, group]) => group.users.length > 0)
      .sort((a, b) => a[1].priority - b[1].priority);
  }, [filteredUsers, sortBy]);

  // Разделение каналов на избранные, закрепленные и обычные
  const { favoriteChannelsList, pinnedChannelsList, regularChannels } = useMemo(() => {
    const customChannels = channels.filter(c => c.type !== 'system');
    
    const favorites = customChannels.filter(c => favoriteChannels.includes(c.id));
    const pinned = customChannels.filter(c => pinnedChannels.includes(c.id) && !favoriteChannels.includes(c.id));
    const regular = customChannels.filter(c => 
      !favoriteChannels.includes(c.id) && !pinnedChannels.includes(c.id)
    );
    
    return {
      favoriteChannelsList: getSortedChannels(favorites),
      pinnedChannelsList: getSortedChannels(pinned),
      regularChannels: getSortedChannels(regular)
    };
  }, [channels, favoriteChannels, pinnedChannels, sortBy]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Компонент канала
  const ChannelItem = ({ channel, isActive, unreadCount, showActions = true }) => {
    const isFavorite = favoriteChannels.includes(channel.id);
    const isPinned = pinnedChannels.includes(channel.id);
    const isSystem = channel.type === 'system';
    const canDelete = !isSystem && canDeleteChannel(channel);
    
    return (
      <div className="relative group">
        <button
          onClick={() => onChannelSelect(channel.id)}
          className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-all duration-200 ${
            isActive 
              ? 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white shadow-lg scale-[1.02]' 
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:scale-[1.01]'
          }`}
        >
          <div className="relative">
            <span className="text-xl">{channel.icon}</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="truncate font-medium">{channel.label || channel.name}</span>
              {channel.adminOnly && <Shield className="w-3 h-3 opacity-60" />}
              {isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
              {isPinned && <Pin className="w-3 h-3 opacity-60" />}
            </div>
            {channel.description && (
              <p className="text-[10px] opacity-70 truncate">{channel.description}</p>
            )}
          </div>
          
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full min-w-[20px] text-center shadow-lg">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        
        {showActions && !isSystem && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(channel.id);
              }}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title={isFavorite ? "Убрать из избранного" : "В избранное"}
            >
              <Star className={`w-3.5 h-3.5 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin?.(channel.id);
              }}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title={isPinned ? "Открепить" : "Закрепить"}
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'text-blue-400' : 'text-gray-400'}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChannelSettings(channel);
              }}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title="Настройки"
            >
              <Settings className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {canDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChannel(channel.id);
                }}
                className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                title="Удалить"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Компонент пользователя
  const UserItem = ({ user, isOnline = true }) => {
    const dmChannelId = `dm_${[currentUser?.id, user.user_id].sort().join('_')}`;
    const unreadCount = unreadCounts?.[dmChannelId] || 0;
    
    const getRoleLabel = (role) => {
      const roles = {
        director: 'Директор',
        manager: 'Менеджер',
        supply_admin: 'Снабжение',
        master: 'Прораб',
        foreman: 'Прораб',
        accountant: 'Бухгалтер'
      };
      return roles[role] || role || 'Сотрудник';
    };
    
    return (
      <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer group transition-all duration-200 hover:scale-[1.01]">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center shadow-md">
            <span className="text-white text-sm font-medium">
              {user.full_name?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          {isOnline && (
            <>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75" />
            </>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {user.full_name}
            </p>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {getRoleLabel(user.role)}
            </p>
            {isOnline && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> онлайн
              </span>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => onStartDirectChat(user)}
          className="p-2 text-[#4A6572] hover:bg-[#4A6572]/10 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200"
          title="Написать сообщение"
        >
          <Mail className="w-4 h-4" />
        </button>
      </div>
    );
  };

  // Анимированная секция
  const Section = ({ title, icon, count, expanded, onToggle, children }) => (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-[#4A6572] transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
          {count > 0 && (
            <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
      </button>
      
      {expanded && (
        <div className="mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );

  if (isMobile && !showSidebar) return null;

  return (
    <aside className={`${
      isMobile ? 'fixed inset-0 z-50 bg-white dark:bg-gray-800' : 'w-80'
    } border-r border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-b from-gray-50/80 to-white/80 dark:from-gray-900/50 dark:to-gray-800/50 backdrop-blur-sm flex flex-col overflow-hidden shadow-xl`}>
      
      {/* Мобильный хедер */}
      {isMobile && (
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold bg-gradient-to-r from-[#4A6572] to-[#344955] bg-clip-text text-transparent">
            Чаты
          </h2>
          <button onClick={onCloseSidebar} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Вкладки */}
      <div className="flex border-b border-gray-200/50 dark:border-gray-700/50 px-3 pt-3 gap-1">
        <button
          onClick={() => setShowContacts(false)}
          className={`flex-1 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            !showContacts 
              ? 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white shadow-lg' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Каналы
        </button>
        <button
          onClick={() => setShowContacts(true)}
          className={`flex-1 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 flex items-center justify-center gap-2 ${
            showContacts 
              ? 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white shadow-lg' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Контакты
          <span className="text-xs opacity-80">({companyUsers?.length || 0})</span>
        </button>
      </div>
      
      {/* Поиск и фильтры */}
      <div className="p-3 border-b border-gray-200/50 dark:border-gray-700/50 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={showContacts ? "Поиск по имени или роли..." : "Поиск канала..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent transition-all"
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowOnlineOnly(!showOnlineOnly)}
              className={`p-1.5 rounded-lg transition-all ${
                showOnlineOnly ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:bg-gray-100'
              }`}
              title="Только онлайн"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSortBy(sortBy === 'name' ? 'activity' : 'name')}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-all"
              title="Сортировать"
            >
              {sortBy === 'name' ? <SortAsc className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            </button>
          </div>
          
          {!showContacts && canCreateChannel && (
            <button 
              onClick={onCreateChannel}
              className="p-1.5 bg-[#4A6572]/10 text-[#4A6572] rounded-lg hover:bg-[#4A6572]/20 transition-all group"
              title="Создать канал"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            </button>
          )}
        </div>
      </div>
      
      {/* Основной контент */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {!showContacts ? (
          // Каналы
          <div className="space-y-4">
            {/* Избранное */}
            {favoriteChannelsList.length > 0 && (
              <Section 
                title="ИЗБРАННОЕ" 
                icon={<Star className="w-3 h-3 text-yellow-500" />}
                count={favoriteChannelsList.length}
                expanded={expandedSections.favorites}
                onToggle={() => toggleSection('favorites')}
              >
                {favoriteChannelsList.map(channel => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    isActive={activeChannel === channel.id}
                    unreadCount={unreadCounts[channel.id] || 0}
                  />
                ))}
              </Section>
            )}
            
            {/* Закрепленные */}
            {pinnedChannelsList.length > 0 && (
              <Section 
                title="ЗАКРЕПЛЕННЫЕ" 
                icon={<Pin className="w-3 h-3 text-blue-500" />}
                count={pinnedChannelsList.length}
                expanded={expandedSections.pinned}
                onToggle={() => toggleSection('pinned')}
              >
                {pinnedChannelsList.map(channel => (
                  <ChannelItem
                    key={channel.id}
                    channel={channel}
                    isActive={activeChannel === channel.id}
                    unreadCount={unreadCounts[channel.id] || 0}
                  />
                ))}
              </Section>
            )}
            
            {/* Личные сообщения */}
            <Section 
              title="ЛИЧНЫЕ СООБЩЕНИЯ" 
              icon={<Mail className="w-3 h-3 text-purple-500" />}
              count={companyUsers?.filter(u => u.user_id !== currentUser?.id).length || 0}
              expanded={expandedSections.dms}
              onToggle={() => toggleSection('dms')}
            >
              {filteredUsers.slice(0, 10).map(user => {
                const dmChannelId = `dm_${[currentUser?.id, user.user_id].sort().join('_')}`;
                return (
                  <div key={user.user_id} className="relative group">
                    <button
                      onClick={() => onStartDirectChat(user)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-all duration-200 ${
                        activeChannel === dmChannelId
                          ? 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white shadow-lg'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center shadow-md">
                          <span className="text-white text-xs font-medium">
                            {user.full_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="truncate block font-medium">{user.full_name}</span>
                        <span className="text-[10px] opacity-70 capitalize">
                          {(() => {
                            const roles = {
                              director: 'Директор',
                              manager: 'Менеджер',
                              supply_admin: 'Снабжение',
                              master: 'Прораб',
                              foreman: 'Прораб',
                              accountant: 'Бухгалтер'
                            };
                            return roles[user.role] || user.role || 'Сотрудник';
                          })()}
                        </span>
                      </div>
                      {(unreadCounts[dmChannelId] || 0) > 0 && (
                        <span className="px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full shadow-lg">
                          {unreadCounts[dmChannelId] > 99 ? '99+' : unreadCounts[dmChannelId]}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">Нет контактов</p>
              )}
            </Section>
            
            {/* Групповые каналы */}
            <Section 
              title="ГРУППОВЫЕ КАНАЛЫ" 
              icon={<Users className="w-3 h-3 text-green-500" />}
              count={regularChannels.length}
              expanded={expandedSections.groups}
              onToggle={() => toggleSection('groups')}
            >
              {regularChannels.map(channel => (
                <ChannelItem
                  key={channel.id}
                  channel={channel}
                  isActive={activeChannel === channel.id}
                  unreadCount={unreadCounts[channel.id] || 0}
                />
              ))}
            </Section>
          </div>
        ) : (
          // Контакты с группировкой по ролям
          <div className="space-y-4">
            {getUsersByRole.map(([roleKey, group]) => (
              <div key={roleKey} className="animate-in slide-in-from-left-2 duration-300">
                <div className="flex items-center gap-2 px-2 py-1 mb-2">
                  <div className="text-gray-500">{group.icon}</div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {group.label}
                  </h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-transparent" />
                  <span className="text-[10px] text-gray-400">{group.users.length}</span>
                </div>
                <div className="space-y-1">
                  {group.users.map(user => (
                    <UserItem key={user.user_id} user={user} isOnline={Math.random() > 0.3} />
                  ))}
                </div>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Пользователи не найдены</p>
                <p className="text-xs text-gray-400 mt-1">Попробуйте изменить параметры поиска</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Статус бар */}
      <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
              {connectionStatus === 'connected' && (
                <span className="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping opacity-75" />
              )}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {connectionStatus === 'connected' ? 'В сети' : 'Нет соединения'}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="text-[10px] text-gray-400">
              {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </aside>
  );
});

export default ChatSidebar;