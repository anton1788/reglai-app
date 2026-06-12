// ChatSidebar.jsx - ИСПРАВЛЕННЫЙ (с личными чатами)

import React, { useState } from 'react';
import { MessageCircle, Plus, Shield, X, Settings, Trash2, Users, Search, User, Mail } from 'lucide-react';

const ChatSidebar = ({ 
  channels, activeChannel, onChannelSelect, 
  canCreateChannel, onCreateChannel, connectionStatus,
  isMobile, showSidebar, onCloseSidebar,
  onChannelSettings, onDeleteChannel, currentUserRole,
  companyUsers, currentUser, onStartDirectChat,
  unreadCounts = {}
}) => {
  const [showContacts, setShowContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  if (isMobile && !showSidebar) return null;
  
  const canDeleteChannel = (channel) => {
    if (channel.type === 'system') return false;
    return currentUserRole === 'manager' || currentUserRole === 'supply_admin';
  };
  
  // Фильтрация пользователей для контактов
  const filteredUsers = companyUsers?.filter(u => 
    u.user_id !== currentUser?.id &&
    (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.role?.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];
  
  // Группировка пользователей по ролям
  const usersByRole = {
    managers: filteredUsers.filter(u => u.role === 'manager' || u.role === 'director'),
    supply: filteredUsers.filter(u => u.role === 'supply_admin'),
    masters: filteredUsers.filter(u => u.role === 'master' || u.role === 'foreman'),
    others: filteredUsers.filter(u => !['manager', 'director', 'supply_admin', 'master', 'foreman'].includes(u.role))
  };
  
  // Получение существующих DM чатов
  const existingDMChannels = channels.filter(ch => ch.type === 'direct');
  
  // Пользователи, с которыми уже есть DM чаты
  const usersWithDM = existingDMChannels.flatMap(ch => ch.participants || []);
  
  // Пользователи, с которыми НЕТ DM чатов
  const usersWithoutDM = companyUsers?.filter(u => 
    u.user_id !== currentUser?.id && 
    !usersWithDM.includes(u.user_id)
  ) || [];
  
  return (
    <aside className={`${isMobile ? 'fixed inset-0 z-50 bg-white dark:bg-gray-800 w-80' : 'w-80'} border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col overflow-hidden`}>
      {isMobile && (
        <div className="flex justify-end p-2">
          <button onClick={onCloseSidebar} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Вкладки */}
      <div className="flex border-b px-2 pt-2">
        <button
          onClick={() => setShowContacts(false)}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${!showContacts ? 'text-[#4A6572] border-b-2 border-[#4A6572]' : 'text-gray-500'}`}
        >
          <MessageCircle className="w-4 h-4 inline mr-1" /> Каналы
        </button>
        <button
          onClick={() => setShowContacts(true)}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${showContacts ? 'text-[#4A6572] border-b-2 border-[#4A6572]' : 'text-gray-500'}`}
        >
          <Users className="w-4 h-4 inline mr-1" /> Контакты
          <span className="ml-1 text-xs text-gray-400">({companyUsers?.length || 0})</span>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        {!showContacts ? (
          // ========== КАНАЛЫ ==========
          <>
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Каналы</h3>
              {canCreateChannel && (
                <button onClick={onCreateChannel} className="p-1.5 hover:bg-[#4A6572]/10 rounded-lg text-[#4A6572]">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <nav className="space-y-1">
              {/* ЛИЧНЫЕ СООБЩЕНИЯ - существующие DM чаты */}
              {existingDMChannels.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-xs font-semibold text-gray-400 px-2 py-1">ЛИЧНЫЕ СООБЩЕНИЯ</h4>
                  {existingDMChannels.map(channel => {
                    // Находим собеседника
                    const otherUserId = channel.participants?.find(id => id !== currentUser?.id);
                    const otherUser = companyUsers?.find(u => u.user_id === otherUserId);
                    const isActive = activeChannel === channel.id;
                    const unreadCount = unreadCounts?.[channel.id] || 0;
                    
                    if (!otherUser) return null;
                    
                    return (
                      <button
                        key={channel.id}
                        onClick={() => onChannelSelect(channel.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${
                          isActive ? 'bg-[#4A6572] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="relative">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              {otherUser.full_name?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>
                        </div>
                        <span className="truncate flex-1">{otherUser.full_name}</span>
                        {unreadCount > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full min-w-[20px] text-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* ГРУППОВЫЕ КАНАЛЫ */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 px-2 py-1">ГРУППОВЫЕ КАНАЛЫ</h4>
                {channels.filter(ch => ch.type !== 'direct').map(channel => {
                  const isActive = activeChannel === channel.id;
                  const isSystem = channel.type === 'system';
                  const canDelete = !isSystem && canDeleteChannel(channel);
                  const unreadCount = unreadCounts?.[channel.id] || 0;
                  
                  return (
                    <div key={channel.id} className="relative group">
                      <button
                        onClick={() => onChannelSelect(channel.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${
                          isActive ? 'bg-[#4A6572] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-lg">{channel.icon}</span>
                        <span className="truncate flex-1">{channel.label || channel.name}</span>
                        {unreadCount > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full min-w-[20px] text-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
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
              </div>
            </nav>
          </>
        ) : (
          // ========== КОНТАКТЫ ==========
          <>
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск контактов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Кнопка "Начать новый чат" */}
            {usersWithoutDM.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-2">НОВЫЙ ЧАТ</h4>
                {usersWithoutDM.slice(0, 5).map(user => (
                  <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer group">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center">
                        <span className="text-white text-xs font-medium">
                          {user.full_name?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.role === 'supply_admin' ? 'Снабжение' : user.role === 'manager' ? 'Руководитель' : 'Сотрудник'}</p>
                    </div>
                    <button 
                      onClick={() => onStartDirectChat(user)}
                      className="p-1.5 text-[#4A6572] hover:bg-gray-200 rounded-full"
                      title="Начать чат"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Существующие контакты по ролям */}
            <div className="space-y-4">
              {usersByRole.managers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 mb-2">Руководители</h4>
                  {usersByRole.managers.map(user => (
                    <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer group">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {user.full_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-500">Руководитель</p>
                      </div>
                      <button 
                        onClick={() => onStartDirectChat(user)}
                        className="p-1.5 text-[#4A6572] hover:bg-gray-200 rounded-full"
                        title="Написать сообщение"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {usersByRole.supply.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 mb-2">Снабжение</h4>
                  {usersByRole.supply.map(user => (
                    <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer group">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {user.full_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-500">Снабжение</p>
                      </div>
                      <button 
                        onClick={() => onStartDirectChat(user)}
                        className="p-1.5 text-[#4A6572] hover:bg-gray-200 rounded-full"
                        title="Написать сообщение"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {usersByRole.masters.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 mb-2">Прорабы</h4>
                  {usersByRole.masters.map(user => (
                    <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer group">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {user.full_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-500">Прораб</p>
                      </div>
                      <button 
                        onClick={() => onStartDirectChat(user)}
                        className="p-1.5 text-[#4A6572] hover:bg-gray-200 rounded-full"
                        title="Написать сообщение"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {usersByRole.others.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 mb-2">Другие сотрудники</h4>
                  {usersByRole.others.map(user => (
                    <div key={user.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer group">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                          <span className="text-white text-xs font-medium">
                            {user.full_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.role === 'accountant' ? 'Бухгалтер' : user.role}</p>
                      </div>
                      <button 
                        onClick={() => onStartDirectChat(user)}
                        className="p-1.5 text-[#4A6572] hover:bg-gray-200 rounded-full"
                        title="Написать сообщение"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {filteredUsers.length === 0 && (
                <p className="text-center text-gray-500 py-8">Пользователи не найдены</p>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Статус */}
      <div className="p-3 border-t">
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-gray-500">{connectionStatus === 'connected' ? 'Онлайн' : 'Оффлайн'}</span>
        </div>
      </div>
    </aside>
  );
};

export default ChatSidebar;