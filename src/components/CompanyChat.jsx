import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { 
  Send, Smile, Paperclip, Edit2, Trash2, X, Check, 
  AtSign, Loader2, MessageCircle, Shield, User, AlertCircle,
  Plus, Users, Settings, Search, CornerUpLeft, Bookmark, BookmarkCheck
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import MessageItem from './MessageItem';
import ChatSidebar from './ChatSidebar';

// Константы
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  SUPPLY_ADMIN: 'supply_admin',
  MASTER: 'master',
  USER: 'user'
};

const SYSTEM_CHANNELS = [
  { id: 'general', label: '# Общий', icon: '💬', description: 'Общие вопросы', adminOnly: false },
  { id: 'supply', label: '📦 Снабжение', icon: '📦', description: 'Закупки и материалы', adminOnly: false },
  { id: 'foremen', label: '👷 Прорабы', icon: '👷', description: 'Для прорабов', adminOnly: false },
  { id: 'announcements', label: '📢 Объявления', icon: '📢', description: 'Важные объявления', adminOnly: true }
];

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '🤔'];

const CompanyChat = ({ user, userCompanyId, userRole, t, language, showNotification }) => {
  // ========== СОСТОЯНИЯ ==========
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState('general');
  const [customChannels, setCustomChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showReactionsPicker, setShowReactionsPicker] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [connectionStatus] = useState('connected');  // убрали setConnectionStatus
const [showCreateModal, setShowCreateModal] = useState(false);
// showSettingsModal и selectedCustomChannel удалены (не используются);
  
  // Новые функции
  const [replyTo, setReplyTo] = useState(null);
  const [savedMessages, setSavedMessages] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showSidebar, setShowSidebar] = useState(true);

  // Refs
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const subscriptionRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessage = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part?.match?.(urlRegex)) {
        return <a key={`url-${i}`} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{part}</a>;
      }
      if (part?.startsWith?.('@')) {
        return <span key={`mention-${i}`} className="font-bold text-blue-500 bg-blue-50 px-0.5 rounded">{part}</span>;
      }
      return <span key={`text-${i}`}>{part}</span>;
    });
  };

  // Все каналы (системные + пользовательские)
  const allChannels = useMemo(() => {
    const system = SYSTEM_CHANNELS.filter(ch => {
      if (ch.adminOnly && userRole !== 'manager' && userRole !== 'supply_admin') return false;
      return true;
    });
    return [...system, ...customChannels];
  }, [customChannels, userRole]);

  // Текущий канал
  const currentChannel = allChannels.find(c => c.id === activeChannel);

  // ========== ЗАГРУЗКА ДАННЫХ ==========
  // Загрузка пользователей компании
  useEffect(() => {
    const loadUsers = async () => {
      if (!userCompanyId) return;
      try {
        const { data, error } = await supabase
          .from('company_users')
          .select('user_id, full_name, role, phone')
          .eq('company_id', userCompanyId)
          .eq('is_active', true);
        
        if (error) throw error;
        setCompanyUsers(data || []);
      } catch (err) {
        console.error('Ошибка загрузки пользователей:', err);
      }
    };
    loadUsers();
  }, [userCompanyId]);

  // Загрузка пользовательских каналов
  useEffect(() => {
    const loadCustomChannels = async () => {
      if (!userCompanyId) return;
      try {
        const { data, error } = await supabase
          .from('company_channels')
          .select('*')
          .eq('company_id', userCompanyId)
          .eq('is_archived', false);
        
        if (error) throw error;
        setCustomChannels(data || []);
      } catch (err) {
        console.error('Ошибка загрузки каналов:', err);
      }
    };
    loadCustomChannels();
  }, [userCompanyId]);

  // Загрузка сообщений
  const loadMessages = useCallback(async () => {
    if (!userCompanyId || !activeChannel) return;
    
    setLoading(true);
    try {
      const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
      let query = supabase
        .from('company_messages')
        .select('*')
        .eq('company_id', userCompanyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (isSystemChannel) {
        query = query.eq('channel', activeChannel).eq('channel_type', 'system');
      } else {
        query = query.eq('channel_id', activeChannel);
      }
      
      const { data: messagesData, error } = await query;
      if (error) throw error;
      
      // Загружаем реакции
      const messageIds = messagesData?.map(m => m.id) || [];
      let reactionsMap = {};
      if (messageIds.length > 0) {
        const { data: reactionsData } = await supabase
          .from('message_reactions')
          .select('message_id, emoji, user_id')
          .in('message_id', messageIds);
        if (reactionsData) {
          reactionsMap = reactionsData.reduce((acc, r) => {
            if (!acc[r.message_id]) acc[r.message_id] = [];
            acc[r.message_id].push({ emoji: r.emoji, user_id: r.user_id });
            return acc;
          }, {});
        }
      }
      
      // Загружаем информацию о пользователях
      const userIds = [...new Set(messagesData?.map(m => m.user_id).filter(Boolean))];
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
      
      // Загружаем ответы на сообщения
      let replyMap = {};
      const messagesWithReply = messagesData?.filter(m => m.reply_to_message_id) || [];
      if (messagesWithReply.length > 0) {
        const replyIds = messagesWithReply.map(m => m.reply_to_message_id);
        const { data: replyMessages } = await supabase
          .from('company_messages')
          .select('id, content, user_id')
          .in('id', replyIds);
        
        if (replyMessages) {
          const replyUserIds = [...new Set(replyMessages.map(r => r.user_id))];
          let replyUsersMap = {};
          if (replyUserIds.length > 0) {
            const { data: replyUsers } = await supabase
              .from('company_users')
              .select('user_id, full_name')
              .in('user_id', replyUserIds);
            replyUsersMap = (replyUsers || []).reduce((acc, u) => {
              acc[u.user_id] = { full_name: u.full_name };
              return acc;
            }, {});
          }
          
          replyMessages.forEach(reply => {
            replyMap[reply.id] = {
              ...reply,
              user: { user_metadata: { full_name: replyUsersMap[reply.user_id]?.full_name || 'Пользователь' } }
            };
          });
        }
      }
      
      // Формируем сообщения
      const enrichedMessages = (messagesData || []).map(msg => ({
        ...msg,
        user: { user_metadata: usersMap[msg.user_id] || { full_name: 'Пользователь', role: 'user' } },
        reactions: reactionsMap[msg.id] || [],
        replied_message: replyMap[msg.reply_to_message_id] || null
      }));
      
      setMessages(enrichedMessages);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
      showNotification?.('Ошибка загрузки чата', 'error');
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, activeChannel, showNotification]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ========== REAL-TIME ПОДПИСКА ==========
  useEffect(() => {
    if (!userCompanyId || !activeChannel) return;
    
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    
    const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
    const filter = isSystemChannel 
      ? `company_id=eq.${userCompanyId} AND channel=eq.${activeChannel} AND channel_type=eq.system`
      : `channel_id=eq.${activeChannel}`;
    
    subscriptionRef.current = supabase
      .channel(`messages:${activeChannel}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'company_messages',
        filter: filter
      }, async (payload) => {
        const newMsg = payload.new;
        if (newMsg.deleted_at) return;
        
        // Загружаем данные пользователя
        const { data: userData } = await supabase
          .from('company_users')
          .select('full_name, role')
          .eq('user_id', newMsg.user_id)
          .single();
        
        // Загружаем реакции
        const { data: reactionsData } = await supabase
          .from('message_reactions')
          .select('emoji, user_id')
          .eq('message_id', newMsg.id);
        
        const enrichedMessage = {
          ...newMsg,
          user: { user_metadata: userData || { full_name: 'Пользователь', role: 'user' } },
          reactions: reactionsData || [],
          replied_message: null
        };
        
        setMessages(prev => [...prev, enrichedMessage]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .subscribe();
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [userCompanyId, activeChannel]);

  // ========== СОХРАНЁННЫЕ СООБЩЕНИЯ ==========
  useEffect(() => {
    const loadSavedMessages = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('saved_messages')
        .select('message_id')
        .eq('user_id', user.id);
      if (data) {
        setSavedMessages(new Set(data.map(s => s.message_id)));
      }
    };
    loadSavedMessages();
  }, [user?.id]);

  const toggleSaveMessage = async (messageId) => {
    if (!user?.id) return;
    
    if (savedMessages.has(messageId)) {
      await supabase.from('saved_messages').delete().eq('message_id', messageId).eq('user_id', user.id);
      setSavedMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      showNotification?.('Сообщение удалено из сохранённых', 'info');
    } else {
      await supabase.from('saved_messages').insert({ message_id: messageId, user_id: user.id, saved_at: new Date() });
      setSavedMessages(prev => new Set([...prev, messageId]));
      showNotification?.('Сообщение сохранено', 'success');
    }
  };

  // ========== ОТВЕТЫ НА СООБЩЕНИЯ ==========
  const handleReply = (message) => {
    setReplyTo(message);
    textareaRef.current?.focus();
  };

  // ========== ИНДИКАТОР НАБОРА ТЕКСТА ==========
  const handleTyping = useCallback(() => {
  if (!user?.id || !activeChannel) return;
  
  const typingChannel = supabase.channel(`typing:${activeChannel}`);
  typingChannel.send({
    type: 'broadcast',
    event: 'typing',
    payload: { user_id: user.id, user_name: user.user_metadata?.full_name || 'Пользователь' }
  });
  
  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  typingTimeoutRef.current = setTimeout(() => {
    typingChannel.send({
      type: 'broadcast',
      event: 'typing_stop',
      payload: { user_id: user.id }
    });
  }, 1000);
}, [user?.id, activeChannel, user?.user_metadata?.full_name]); // ← добавлена зависимость

  useEffect(() => {
    if (!activeChannel) return;
    
    const typingChannel = supabase.channel(`typing:${activeChannel}`);
    typingChannel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== user?.id) {
          setTypingUsers(prev => new Set([...prev, payload.user_id]));
          setTimeout(() => {
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(payload.user_id);
              return newSet;
            });
          }, 2000);
        }
      })
      .subscribe();
    
    return () => { typingChannel.unsubscribe(); };
  }, [activeChannel, user?.id]);

  // ========== ОТПРАВКА СООБЩЕНИЯ ==========
  const sendMessage = async () => {
    const content = newMessage.trim();
    if (!content || !user?.id || sending) return;
    
    const safeCompanyId = userCompanyId;
    if (!safeCompanyId) {
      showNotification?.('Ошибка: компания не указана', 'error');
      return;
    }
    
    setSending(true);
    try {
      const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
      const messageData = {
        company_id: safeCompanyId,
        user_id: user.id,
        content: content,
        created_at: new Date().toISOString(),
        reply_to_message_id: replyTo?.id || null
      };
      
      if (isSystemChannel) {
        messageData.channel = activeChannel;
        messageData.channel_type = 'system';
      } else {
        messageData.channel_id = activeChannel;
      }
      
      const { error } = await supabase.from('company_messages').insert([messageData]);
      if (error) throw error;
      
      setNewMessage('');
      setReplyTo(null);
      textareaRef.current?.focus();
    } catch (err) {
      console.error('Ошибка отправки:', err);
      showNotification?.('Не удалось отправить сообщение', 'error');
    } finally {
      setSending(false);
    }
  };

  // ========== СОЗДАНИЕ КАНАЛА ==========
  const handleCreateChannel = async (channelData) => {
    if (!userCompanyId || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('company_channels')
        .insert([{
          company_id: userCompanyId,
          name: channelData.name,
          description: channelData.description,
          icon: channelData.icon,
          is_private: channelData.is_private || false,
          created_by: user.id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      if (channelData.is_private && channelData.memberIds?.length) {
        await supabase.from('channel_members').insert(
          channelData.memberIds.map(userId => ({
            channel_id: data.id,
            user_id: userId,
            role: 'member'
          }))
        );
      }
      
      setCustomChannels(prev => [...prev, data]);
      setActiveChannel(data.id);
      showNotification?.('Канал создан', 'success');
    } catch (err) {
      console.error('Ошибка создания канала:', err);
      showNotification?.('Не удалось создать канал', 'error');
      throw err;
    }
  };

  // ========== РЕДАКТИРОВАНИЕ/УДАЛЕНИЕ ==========
  const startEdit = (message) => {
    setEditingMessageId(message.id);
    setEditText(message.content);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };
  
  const saveEdit = async (messageId) => {
    const content = editText.trim();
    if (!content) return;
    
    try {
      await supabase
        .from('company_messages')
        .update({ content, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', user?.id);
      
      setEditingMessageId(null);
      setEditText('');
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, content, edited_at: new Date().toISOString() } : m
      ));
      showNotification?.('Сообщение обновлено', 'success');
    } catch (err) {
      console.error('Ошибка редактирования:', err);
      showNotification?.('Не удалось обновить сообщение', 'error');
    }
  };
  
  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };
  
  const deleteMessage = async (messageId) => {
    if (!window.confirm('Удалить сообщение?')) return;
    
    try {
      await supabase
        .from('company_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', user?.id);
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      showNotification?.('Сообщение удалено', 'info');
    } catch (err) {
      console.error('Ошибка удаления:', err);
      showNotification?.('Не удалось удалить сообщение', 'error');
    }
  };

  // ========== РЕАКЦИИ ==========
  const toggleReaction = async (messageId, emoji) => {
    if (!user?.id) return;
    
    const message = messages.find(m => m.id === messageId);
    const hasReacted = message?.reactions?.some(r => r.emoji === emoji && r.user_id === user.id);
    
    try {
      if (hasReacted) {
        await supabase
          .from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);
        
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, reactions: m.reactions.filter(r => !(r.emoji === emoji && r.user_id === user.id)) }
            : m
        ));
      } else {
        await supabase
          .from('message_reactions')
          .insert({ message_id: messageId, user_id: user.id, emoji, created_at: new Date().toISOString() });
        
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, reactions: [...m.reactions, { emoji, user_id: user.id }] }
            : m
        ));
      }
      setShowReactionsPicker(null);
    } catch (err) {
      console.error('Ошибка реакции:', err);
    }
  };

  // ========== ЗАГРУЗКА ФАЙЛОВ ==========
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
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
    e.target.value = '';
  };

  // ========== ОБРАБОТКА ВВОДА ==========
  const handleTextareaChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    
    if (value.trim()) {
      handleTyping();
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        saveEdit(editingMessageId);
      } else {
        sendMessage();
      }
    }
    if (e.key === 'Escape') {
      if (editingMessageId) cancelEdit();
      setShowReactionsPicker(null);
      setReplyTo(null);
    }
  };

  // ========== RENDER ==========
  return (
    <div className="flex flex-col w-full h-full bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <ChatSidebar
          channels={allChannels}
          activeChannel={activeChannel}
          onChannelSelect={setActiveChannel}
          canCreateChannel={userRole === 'manager' || userRole === 'supply_admin'}
          onCreateChannel={() => setShowCreateModal(true)}
          connectionStatus={connectionStatus}
          isMobile={window.innerWidth < 768}
          showSidebar={showSidebar}
          onCloseSidebar={() => setShowSidebar(false)}
          t={t}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="flex-shrink-0 px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between bg-white/50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowSidebar(true)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <span className="text-2xl bg-gray-100 dark:bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center">
                  {currentChannel?.icon || '💬'}
                </span>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">{currentChannel?.label || currentChannel?.name}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                    {currentChannel?.description}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{messages.length}</span>
            </div>
          </header>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
                <span className="text-sm text-gray-500">Загрузка...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-medium text-lg">Нет сообщений</p>
                <p className="text-sm mt-1 opacity-70">Начните обсуждение!</p>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <MessageItem
                    key={msg.id}
                    msg={msg}
                    user={user}
                    userRole={userRole}
                    isOwn={msg.user_id === user?.id}
                    isEditing={editingMessageId === msg.id}
                    editText={editText}
                    onStartEdit={startEdit}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    onDelete={deleteMessage}
                    onToggleReaction={toggleReaction}
                    onReply={handleReply}
                    onToggleSave={toggleSaveMessage}
                    isSaved={savedMessages.has(msg.id)}
                    showReactionsPicker={showReactionsPicker}
                    setShowReactionsPicker={setShowReactionsPicker}
                    formatMessage={formatMessage}
                    formatTime={formatTime}
                    language={language}
                    textareaRef={textareaRef}
                    companyUsers={companyUsers}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
            {/* Индикатор набора текста */}
            {typingUsers.size > 0 && (
              <div className="mb-2 flex items-center gap-2">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="text-xs text-gray-500 animate-pulse">
                  {Array.from(typingUsers).map(id => {
                    const userData = companyUsers.find(u => u.user_id === id);
                    return userData?.full_name?.split(' ')[0];
                  }).join(', ')} печатает...
                </span>
              </div>
            )}
            
            {/* Блок ответа */}
            {replyTo && (
              <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-start border-l-4 border-[#4A6572]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <CornerUpLeft className="w-3 h-3 text-[#4A6572]" />
                    <span className="font-bold text-[#4A6572] dark:text-[#F9AA33]">
                      Ответ {replyTo.user?.user_metadata?.full_name || 'пользователю'}:
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-1">
                    {replyTo.content?.slice(0, 80)}
                  </p>
                </div>
                <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-200 rounded-lg">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
            
            <div className="flex items-end gap-2">
              <label className="p-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300">
                <Paperclip className="w-5 h-5" />
                <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx" />
              </label>

              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder={replyTo ? `Ответ ${replyTo.user?.user_metadata?.full_name}...` : (t?.('chat.placeholder') || 'Введите сообщение...')}
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-[#4A6572] resize-none text-sm"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
              </div>

              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className={`p-2.5 rounded-xl transition-all ${
                  !newMessage.trim() || sending
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-lg active:scale-95'
                }`}
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 dark:text-gray-500">
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> — отправить
              <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded ml-2">Shift+Enter</kbd> — новая строка
            </div>
          </div>
        </div>
      </div>

      {/* Modals (упрощённые для краткости) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Создать канал</h3>
            <input type="text" placeholder="Название" className="w-full p-2 border rounded-lg mb-3" id="channelName" />
            <textarea placeholder="Описание" className="w-full p-2 border rounded-lg mb-3" rows={2} id="channelDesc" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600">Отмена</button>
              <button onClick={() => {
                const name = document.getElementById('channelName').value;
                const description = document.getElementById('channelDesc').value;
                if (name) {
                  handleCreateChannel({ name, description, icon: '💬', is_private: false });
                  setShowCreateModal(false);
                }
              }} className="px-4 py-2 bg-[#4A6572] text-white rounded-lg">Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CompanyChat);