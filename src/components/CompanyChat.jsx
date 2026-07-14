// src/components/CompanyChat.jsx
import React, { useState, useRef, useCallback, useMemo, memo } from 'react';
import { 
  Send, Smile, Paperclip, Edit2, Trash2, X, Check, 
  Loader2, MessageCircle, Plus, Settings, Search, CornerUpLeft, 
  Bookmark, BookmarkCheck, Menu, FileText, Pin, Download,
  Mic, Square, Play, Copy
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

// ============================================================
// 🔥 НОВЫЕ ИМПОРТЫ
// ============================================================
import ChatEmojiPicker from './Chat/ChatEmojiPicker';
import VoiceRecorder from './Chat/VoiceRecorder';
import ChatMessage from './Chat/ChatMessage';
import ChatInput from './Chat/ChatInput';
import ChatExport from './Chat/ChatExport';
import ChatSidebar from './Chat/ChatSidebar';
import useChat from '../hooks/useChat';

// ========== КОНСТАНТЫ ==========
const SYSTEM_CHANNELS = [
  { 
    id: 'general', 
    label: '# Общий', 
    icon: '💬', 
    description: 'Общие вопросы компании',
    canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'],
    canWrite: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client']
  },
  { 
    id: 'supply', 
    label: '📦 Снабжение', 
    icon: '📦', 
    description: 'Закупки, материалы, логистика',
    canView: ['manager', 'supply_admin'],
    canWrite: ['manager', 'supply_admin']
  },
  { 
    id: 'foremen', 
    label: '👷 Прорабы', 
    icon: '👷', 
    description: 'Оперативные вопросы на объектах',
    canView: ['manager', 'master', 'foreman'],
    canWrite: ['manager', 'master', 'foreman']
  },
  { 
    id: 'announcements', 
    label: '📢 Объявления', 
    icon: '📢', 
    description: 'Важные новости и приказы',
    canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'],
    canWrite: ['manager', 'supply_admin']
  }
];

// ========== ОСНОВНОЙ КОМПОНЕНТ ==========
const CompanyChat = ({ user, userCompanyId, userRole, showNotification, onUnreadCountChange }) => {
  // ============================================================
  // 🔥 ИСПОЛЬЗУЕМ ХУК useChat
  // ============================================================
  const chat = useChat({
    user,
    userCompanyId,
    userRole,
    showNotification,
    onUnreadCountChange
  });

  // ===== ЛОКАЛЬНЫЕ СОСТОЯНИЯ (которые не в хуке) =====
  const [newMessage, setNewMessage] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelMembers, setChannelMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // ===== REFS =====
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);

  // ===== ОТПРАВКА СООБЩЕНИЯ (обёртка над хуком) =====
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || chat.sending) return;
    
    const result = await chat.sendMessage(newMessage, chat.replyTo);
    if (result.success) {
      setNewMessage('');
      chat.setReplyTo(null);
    }
  }, [newMessage, chat]);

  // ===== ОТПРАВКА ГОЛОСОВОГО СООБЩЕНИЯ =====
  const handleVoiceSend = useCallback(async (audio) => {
    if (!audio || !audio.blob) return;
    
    try {
      // Загружаем аудио в Storage
      const fileName = `${userCompanyId}/voice_${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, audio.blob);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);
      
      // Отправляем сообщение с ссылкой на аудио
      const message = `🎙️ Голосовое сообщение: ${publicUrl}`;
      await chat.sendMessage(message);
      
      showNotification?.('✅ Голосовое сообщение отправлено', 'success');
    } catch (err) {
      console.error('Ошибка отправки голоса:', err);
      showNotification?.('Не удалось отправить голосовое сообщение', 'error');
    }
  }, [userCompanyId, chat, showNotification]);

  // ===== ЗАГРУЗКА УЧАСТНИКОВ КАНАЛА =====
  const loadChannelMembers = useCallback(async (channelId) => {
    if (!channelId) return;
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('channel_members')
        .select('user_id, role, joined_at')
        .eq('channel_id', channelId);
      
      if (error) throw error;
      
      const userIds = data?.map(m => m.user_id) || [];
      let usersMap = {};
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('company_users')
          .select('user_id, full_name, role')
          .in('user_id', userIds);
        usersMap = (usersData || []).reduce((acc, u) => {
          acc[u.user_id] = { full_name: u.full_name, role: u.role };
          return acc;
        }, {});
      }
      
      const membersWithUsers = (data || []).map(m => ({
        ...m,
        user: usersMap[m.user_id] || { full_name: 'Пользователь', role: 'user' }
      }));
      
      setChannelMembers(membersWithUsers);
    } catch (err) {
      console.error('Ошибка загрузки участников:', err);
      showNotification?.('Не удалось загрузить участников', 'error');
    } finally {
      setLoadingMembers(false);
    }
  }, [showNotification]);

  // ===== ДОБАВЛЕНИЕ УЧАСТНИКА =====
  const addChannelMember = useCallback(async (channelId, userId) => {
    if (!channelId || !userId) return;
    
    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({ channel_id: channelId, user_id: userId, role: 'member' });
      
      if (error) throw error;
      
      await loadChannelMembers(channelId);
      showNotification?.('Участник добавлен', 'success');
    } catch (err) {
      console.error('Ошибка добавления участника:', err);
      showNotification?.('Не удалось добавить участника', 'error');
    }
  }, [loadChannelMembers, showNotification]);

  // ===== УДАЛЕНИЕ УЧАСТНИКА =====
  const removeChannelMember = useCallback(async (channelId, userId) => {
    if (!channelId || !userId) return;
    
    try {
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      await loadChannelMembers(channelId);
      showNotification?.('Участник удалён', 'info');
    } catch (err) {
      console.error('Ошибка удаления участника:', err);
      showNotification?.('Не удалось удалить участника', 'error');
    }
  }, [loadChannelMembers, showNotification]);

  // ===== УДАЛЕНИЕ КАНАЛА =====
  const deleteChannel = useCallback(async (channelId) => {
    if (!channelId) return;
    
    const channel = chat.customChannels.find(c => c.id === channelId);
    if (!channel) return;
    
    if (!window.confirm(`Удалить канал "${channel.name}"? Все сообщения в канале будут удалены.`)) return;
    
    try {
      await supabase.from('company_messages').delete().eq('channel_id', channelId);
      await supabase.from('channel_members').delete().eq('channel_id', channelId);
      
      const { error } = await supabase.from('company_channels').delete().eq('id', channelId);
      if (error) throw error;
      
      chat.setCustomChannels(prev => prev.filter(c => c.id !== channelId));
      if (chat.activeChannel === channelId) {
        chat.setActiveChannel('general');
      }
      showNotification?.('Канал удалён', 'success');
    } catch (err) {
      console.error('Ошибка удаления канала:', err);
      showNotification?.('Не удалось удалить канал', 'error');
    }
  }, [chat, showNotification]);

  // ===== СОЗДАНИЕ КАНАЛА =====
  const handleCreateChannel = useCallback(async (channelData) => {
    if (!userCompanyId || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('company_channels')
        .insert([{
          company_id: userCompanyId,
          name: channelData.name,
          description: channelData.description,
          icon: channelData.icon || '💬',
          is_private: channelData.is_private || false,
          created_by: user.id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      await supabase.from('channel_members').insert({
        channel_id: data.id,
        user_id: user.id,
        role: 'admin'
      });
      
      if (channelData.is_private && channelData.memberIds?.length) {
        await supabase.from('channel_members').insert(
          channelData.memberIds.map(userId => ({
            channel_id: data.id,
            user_id: userId,
            role: 'member'
          }))
        );
      }
      
      chat.setCustomChannels(prev => [...prev, data]);
      chat.setActiveChannel(data.id);
      showNotification?.('Канал создан', 'success');
    } catch (err) {
      console.error('Ошибка создания канала:', err);
      showNotification?.('Не удалось создать канал', 'error');
      throw err;
    }
  }, [userCompanyId, user?.id, showNotification, chat]);

  // ===== ЗАГРУЗКА ФАЙЛА =====
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files[0];
    if (!file || !userCompanyId) return;
    
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showNotification?.('Файл слишком большой (макс. 10MB)', 'error');
      return;
    }
    
    try {
      const fileName = `${userCompanyId}/${Date.now()}_${file.name.replace(/[^a-z0-9.-]/gi, '_')}`;
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
      setNewMessage(prev => prev + `\n📎 ${file.name}: ${publicUrl}`);
      showNotification?.('Файл прикреплён', 'success');
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      showNotification?.('Не удалось загрузить файл', 'error');
    }
    if (e.target) e.target.value = '';
  }, [userCompanyId, showNotification]);

  // ===== ВСЕ КАНАЛЫ =====
const allChannels = useMemo(() => {
  // Каналы из БД (преобразуем в формат интерфейса)
  const dbChannels = chat.customChannels.map(ch => ({
    id: ch.id,
    label: ch.name,
    name: ch.name,
    icon: ch.icon || '💬',
    description: ch.description || '',
    type: ch.is_system ? 'system' : 'custom',
    is_private: ch.is_private || false,
    is_system: ch.is_system || false
  }));
  
  // Фильтруем каналы по правам доступа
  const filteredDbChannels = dbChannels.filter(ch => {
    // Если канал системный, проверяем права из SYSTEM_CHANNELS
    if (ch.is_system) {
      const sysChannel = SYSTEM_CHANNELS.find(s => s.id === ch.id || s.label === `# ${ch.name}`);
      if (sysChannel) {
        return sysChannel.canView?.includes(userRole) || false;
      }
    }
    return true;
  });
  
  // Если каналов из БД нет, используем SYSTEM_CHANNELS как запасной вариант
  if (filteredDbChannels.length === 0) {
    const system = SYSTEM_CHANNELS.filter(ch => {
      if (!ch.canView) return true;
      return ch.canView.includes(userRole);
    }).map(ch => ({ ...ch, type: 'system' }));
    return system;
  }
  
  console.log('📋 Каналы для отображения:', filteredDbChannels);
  return filteredDbChannels;
}, [chat.customChannels, userRole]);

  // ===== ФИЛЬТРАЦИЯ СООБЩЕНИЙ =====
  const displayedMessages = useMemo(() => {
    if (!searchQuery) return chat.messages;
    return chat.messages.filter(m => 
      m.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chat.messages, searchQuery]);

  // ===== ТЕКУЩИЙ КАНАЛ =====
  const currentChannel = allChannels.find(c => c.id === chat.activeChannel);

  // ============================================================
  // 🔥 РЕНДЕР
  // ============================================================
  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Сайдбар */}
        <ChatSidebar
          channels={allChannels}
          activeChannel={chat.activeChannel}
          onChannelSelect={chat.setActiveChannel}
          canCreateChannel={userRole === 'manager' || userRole === 'supply_admin'}
          onCreateChannel={() => setShowCreateModal(true)}
          connectionStatus={chat.connectionStatus}
          isMobile={chat.isMobile}
          showSidebar={chat.showSidebar}
          onCloseSidebar={() => chat.setShowSidebar(false)}
          onChannelSettings={(channel) => {
            setSelectedChannel(channel);
            setShowChannelSettings(true);
            loadChannelMembers(channel.id);
          }}
          onDeleteChannel={deleteChannel}
          currentUserRole={userRole}
          companyUsers={chat.companyUsers}
          currentUser={user}
          onStartDirectChat={chat.startDirectChat}
          unreadCounts={chat.unreadCounts}
          lastReadTimes={chat.lastReadTimes}
          pinnedChannels={chat.pinnedChannels}
          onTogglePinChannel={chat.pinChannel}
        />

        {/* Основная область */}
        {(!chat.isMobile || !chat.showSidebar) && (
          <div className="flex-1 flex flex-col min-w-0 h-full">
            {/* Хедер */}
            <header className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 sm:gap-3">
                {chat.isMobile && !chat.showSidebar && (
                  <button 
                    onClick={() => chat.setShowSidebar(true)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}
                
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl bg-gray-100 dark:bg-gray-700 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center">
                    {currentChannel?.icon || '💬'}
                  </span>
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                      {currentChannel?.label || currentChannel?.name}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                      {currentChannel?.description}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Кнопка экспорта */}
                <button 
                  onClick={() => setShowExportModal(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  title="Экспорт чата"
                >
                  <Download className="w-5 h-5" />
                </button>
                
                {/* Поиск */}
                <button 
                  onClick={() => setShowSearch(!showSearch)}
                  className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                  <Search className="w-5 h-5" />
                </button>
                
                {/* Счётчик сообщений */}
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                  <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{chat.messages.length}</span>
                </div>
              </div>
            </header>

            {/* Поиск */}
            {showSearch && (
              <div className="p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-20 shadow-md">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Поиск по сообщениям..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    autoFocus
                  />
                  <button 
                    onClick={() => {setShowSearch(false); setSearchQuery('')}} 
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16}/>
                  </button>
                </div>
                {searchQuery && (
                  <div className="text-xs text-gray-500 mt-1 px-2">
                    Найдено сообщений: {displayedMessages.length}
                  </div>
                )}
              </div>
            )}

            {/* Сообщения */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 relative"
              onScroll={chat.handleScroll}
              style={{ WebkitOverflowScrolling: 'touch' }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFileUpload(e);
              }}
            >
              {isDragging && (
                <div className="absolute inset-0 z-30 bg-blue-500/10 border-4 border-blue-500 border-dashed m-4 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center">
                    <Download size={48} className="text-blue-500 mb-2"/>
                    <p className="font-bold text-lg">Отпустите файл для отправки</p>
                  </div>
                </div>
              )}

              {chat.loading ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
                  <span className="text-sm text-gray-500">Загрузка...</span>
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="font-medium text-base sm:text-lg">
                    {searchQuery ? 'Ничего не найдено' : 'Нет сообщений'}
                  </p>
                  <p className="text-xs sm:text-sm mt-1 opacity-70">
                    {searchQuery ? 'Попробуйте изменить запрос' : 'Начните обсуждение!'}
                  </p>
                </div>
              ) : (
                <>
                  {displayedMessages.map(msg => (
                    <ChatMessage
                      key={msg.id}
                      msg={msg}
                      user={user}
                      userRole={userRole}
                      isOwn={msg.user_id === user?.id}
                      isEditing={chat.editingMessageId === msg.id}
                      editText={chat.editText}
                      onStartEdit={(message) => {
                        chat.setEditingMessageId(message.id);
                        chat.setEditText(message.content);
                      }}
                      onSaveEdit={chat.saveEdit}
                      onCancelEdit={() => {
                        chat.setEditingMessageId(null);
                        chat.setEditText('');
                      }}
                      onDelete={chat.deleteMessage}
                      onToggleReaction={chat.toggleReaction}
                      onReply={chat.setReplyTo}
                      onToggleSave={chat.toggleSaveMessage}
                      isSaved={chat.savedMessages.has(msg.id)}
                      showReactionsPicker={chat.showReactionsPicker}
                      setShowReactionsPicker={chat.setShowReactionsPicker}
                      onPinMessage={chat.pinMessage}
                      isPinned={chat.pinnedMessages.includes(msg.id)}
                      onCopyMessage={(messageId) => {
                        const message = chat.messages.find(m => m.id === messageId);
                        if (message?.content) {
                          navigator.clipboard.writeText(message.content);
                          showNotification?.('Текст скопирован', 'success');
                        }
                      }}
                      companyUsers={chat.companyUsers}
                      isMobile={chat.isMobile}
                      textareaRef={textareaRef}
                    />
                  ))}
                  <div ref={chat.bottomRef} />
                </>
              )}
            </div>

            {/* Кнопка прокрутки вниз */}
            {chat.isUserScrolling && !chat.shouldAutoScroll && chat.messages.length > 10 && (
              <button
                onClick={() => chat.forceScrollToBottom('smooth')}
                className="absolute bottom-24 right-4 bg-[#4A6572] text-white rounded-full p-2 shadow-lg hover:bg-[#344955] transition-all z-10"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            )}

            {/* Поле ввода */}
            <ChatInput
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onSend={handleSendMessage}
              onFileUpload={handleFileUpload}
              onVoiceSend={handleVoiceSend}
              replyTo={chat.replyTo}
              onCancelReply={() => chat.setReplyTo(null)}
              isSending={chat.sending}
              placeholder={chat.replyTo ? `Ответ ${chat.replyTo.user?.user_metadata?.full_name}...` : 'Введите сообщение...'}
            />
          </div>
        )}
      </div>

      {/* Модалка создания канала */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Создать канал</h3>
            <input type="text" placeholder="Название" className="w-full p-2 border rounded-lg mb-3" id="channelName" />
            <textarea placeholder="Описание" className="w-full p-2 border rounded-lg mb-3" rows={2} id="channelDesc" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600">Отмена</button>
              <button onClick={() => {
                const name = document.getElementById('channelName')?.value;
                const description = document.getElementById('channelDesc')?.value;
                if (name) {
                  handleCreateChannel({ name, description, icon: '💬', is_private: false });
                  setShowCreateModal(false);
                }
              }} className="px-4 py-2 bg-[#4A6572] text-white rounded-lg">Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка настроек канала */}
      {showChannelSettings && selectedChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Управление каналом: {selectedChannel.name}</h3>
              <button onClick={() => setShowChannelSettings(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium mb-2">Участники ({channelMembers.length})</h4>
              {loadingMembers ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : channelMembers.length === 0 ? (
                <p className="text-sm text-gray-500">Нет участников</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {channelMembers.map(member => {
                    const isCreator = selectedChannel.created_by === member.user_id;
                    const canRemove = !isCreator && (userRole === 'manager' || userRole === 'supply_admin');
                    return (
                      <div key={member.user_id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{member.user?.full_name || 'Пользователь'}</p>
                          <p className="text-xs text-gray-500">{member.role}{isCreator && ' (создатель)'}</p>
                        </div>
                        {canRemove && (
                          <button
                            onClick={() => removeChannelMember(selectedChannel.id, member.user_id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Добавить участника</h4>
              <select className="w-full p-2 border rounded-lg mb-3" id="newMemberSelect">
                <option value="">-- Выберите пользователя --</option>
                {chat.companyUsers
                  .filter(u => !channelMembers.some(m => m.user_id === u.user_id))
                  .map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>
                  ))
                }
              </select>
              <button
                onClick={() => {
                  const select = document.getElementById('newMemberSelect');
                  const userId = select?.value;
                  if (userId) {
                    addChannelMember(selectedChannel.id, userId);
                    select.value = '';
                  }
                }}
                className="w-full py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955]"
              >
                Добавить
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  if (confirm(`Удалить канал "${selectedChannel.name}"?`)) {
                    deleteChannel(selectedChannel.id);
                    setShowChannelSettings(false);
                  }
                }}
                className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Удалить канал
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка экспорта */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ChatExport
            messages={displayedMessages}
            channelName={currentChannel?.label || currentChannel?.name || 'Чат'}
            companyName={user?.user_metadata?.company_name || 'Компания'}
            onClose={() => setShowExportModal(false)}
          />
        </div>
      )}
    </div>
  );
};

// ========== ВСПОМОГАТЕЛЬНЫЙ КОМПОНЕНТ ==========
const ArrowDown = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

export default memo(CompanyChat);