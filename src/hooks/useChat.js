// src/hooks/useChat.js
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';

export const useChat = ({
  user,
  userCompanyId,
  userRole,
  showNotification,
  onUnreadCountChange
}) => {
  // ===== СОСТОЯНИЯ =====
  const [messages, setMessages] = useState([]);
  const [activeChannel, setActiveChannel] = useState('general');
  const [customChannels, setCustomChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showReactionsPicker, setShowReactionsPicker] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [connectionStatus] = useState('connected');  // ← убран setter
  const [replyTo, setReplyTo] = useState(null);
  const [savedMessages, setSavedMessages] = useState(new Set());
  const [typingUsers] = useState(new Set());  // ← убран setter
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastReadTimes, setLastReadTimes] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [pinnedChannels, setPinnedChannels] = useState([]);

  // ===== REFS =====
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const subscriptionRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const animationFrameRef = useRef(null);
  const bottomRef = useRef(null);

  // ===== КОНСТАНТЫ =====
  const SYSTEM_CHANNELS = useMemo(() => [
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
  ], []);

  // ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
  const getChannelMessages = useCallback((channelId) => {
    return messages.filter(m => {
      const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === channelId);
      const isDirectChat = channelId?.startsWith('dm_');
      
      if (isSystemChannel) {
        return m.channel === channelId && m.channel_type === 'system';
      } else if (isDirectChat) {
        return m.channel_id === channelId && m.channel_type === 'direct';
      } else {
        return m.channel_id === channelId && m.channel_type === 'custom';
      }
    });
  }, [messages, SYSTEM_CHANNELS]);

  const canWriteToChannel = useCallback((channelId) => {
    const channel = SYSTEM_CHANNELS.find(c => c.id === channelId);
    if (!channel) return true;
    return channel.canWrite?.includes(userRole) || false;
  }, [userRole, SYSTEM_CHANNELS]);

  // ===== ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ =====
  const loadUsers = useCallback(async () => {
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
  }, [userCompanyId]);

  // ===== ЗАГРУЗКА КАНАЛОВ =====
  const loadCustomChannels = useCallback(async () => {
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
  }, [userCompanyId]);

  // ===== ЗАГРУЗКА СООБЩЕНИЙ =====
  const loadMessages = useCallback(async () => {
    if (!userCompanyId || !activeChannel) return;
    
    setLoading(true);
    try {
      const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
      const isDirectChat = activeChannel?.startsWith('dm_');
      
      let query = supabase
        .from('company_messages')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (isSystemChannel) {
        query = query.eq('channel', activeChannel).eq('channel_type', 'system');
      } else if (isDirectChat) {
        query = query.eq('channel_id', activeChannel).eq('channel_type', 'direct');
      } else {
        query = query.eq('channel_id', activeChannel).eq('channel_type', 'custom');
      }
      
      const { data: messagesData, error } = await query;
      if (error) {
        console.error('Ошибка загрузки:', error);
        throw error;
      }
      
      // Загрузка реакций
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
      
      // Загрузка пользователей
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
      
      // Загрузка ответов
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
      
      // Загрузка закреплённых
      const { data: pinnedData } = await supabase
        .from('company_messages')
        .select('id')
        .eq('company_id', userCompanyId)
        .eq('is_pinned', true);
      
      if (pinnedData) {
        setPinnedMessages(pinnedData.map(p => p.id));
      }

      // Загрузка закреплённых каналов
      const { data: pinnedChannelsData } = await supabase
        .from('pinned_channels')
        .select('channel_id')
        .eq('user_id', user?.id)
        .eq('company_id', userCompanyId);
      
      if (pinnedChannelsData) {
        setPinnedChannels(pinnedChannelsData.map(p => p.channel_id));
      }
      
      // Формирование сообщений
      const enrichedMessages = (messagesData || []).map(msg => ({
        ...msg,
        user: { user_metadata: usersMap[msg.user_id] || { full_name: 'Пользователь', role: 'user' } },
        reactions: reactionsMap[msg.id] || [],
        replied_message: replyMap[msg.reply_to_message_id] || null
      }));
      
      setMessages(enrichedMessages);
      
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
      showNotification?.('Ошибка загрузки чата', 'error');
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, activeChannel, showNotification, SYSTEM_CHANNELS, user?.id]);

  // ===== ОТПРАВКА СООБЩЕНИЯ =====
  const sendMessage = useCallback(async (content, replyToMessage = null) => {
    if (!content?.trim() || !user?.id || sending) return;
    
    if (!canWriteToChannel(activeChannel)) {
      showNotification?.('У вас нет прав на отправку сообщений в этот канал', 'error');
      return;
    }
    
    setSending(true);
    try {
      const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
      const isDirectChat = activeChannel?.startsWith('dm_');
      
      const messageData = {
        company_id: userCompanyId,
        user_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString(),
        reply_to_message_id: replyToMessage?.id || null
      };
      
      if (isSystemChannel) {
        messageData.channel = activeChannel;
        messageData.channel_type = 'system';
        messageData.channel_id = null;
      } else if (isDirectChat) {
        messageData.channel_id = activeChannel;
        messageData.channel_type = 'direct';
        messageData.channel = null;
      } else {
        messageData.channel_id = activeChannel;
        messageData.channel_type = 'custom';
        messageData.channel = null;
      }
      
      const { error } = await supabase.from('company_messages').insert([messageData]);
      if (error) {
        console.error('Ошибка Supabase:', error);
        throw error;
      }
      
      setReplyTo(null);
      return { success: true };
      
    } catch (err) {
      console.error('Ошибка отправки:', err);
      showNotification?.('Не удалось отправить сообщение: ' + (err.message || 'неизвестная ошибка'), 'error');
      return { success: false, error: err };
    } finally {
      setSending(false);
    }
  }, [user?.id, userCompanyId, activeChannel, canWriteToChannel, sending, showNotification, SYSTEM_CHANNELS]);

  // ===== РЕДАКТИРОВАНИЕ СООБЩЕНИЯ =====
  const saveEdit = useCallback(async (messageId, content) => {
    if (!content?.trim()) return;
    
    try {
      const { error } = await supabase
        .from('company_messages')
        .update({ content: content.trim(), edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('user_id', user?.id);
      
      if (error) throw error;
      
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, content: content.trim(), edited_at: new Date().toISOString() } : m
      ));
      
      setEditingMessageId(null);
      setEditText('');
      showNotification?.('Сообщение обновлено', 'success');
      return { success: true };
    } catch (err) {
      console.error('Ошибка редактирования:', err);
      showNotification?.('Не удалось обновить сообщение', 'error');
      return { success: false, error: err };
    }
  }, [user?.id, showNotification]);

  // ===== УДАЛЕНИЕ СООБЩЕНИЯ =====
  const deleteMessage = useCallback(async (messageId) => {
    if (!window.confirm('Удалить сообщение?')) return;
    
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;
      
      const canDelete = message.user_id === user?.id || 
                        userRole === 'manager' || 
                        userRole === 'supply_admin';
      
      if (!canDelete) {
        showNotification?.('У вас нет прав на удаление', 'error');
        return;
      }
      
      const { error } = await supabase
        .from('company_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
      
      setMessages(prev => prev.filter(m => m.id !== messageId));
      showNotification?.('Сообщение удалено', 'success');
      return { success: true };
    } catch (err) {
      console.error('Ошибка удаления:', err);
      showNotification?.('Не удалось удалить сообщение', 'error');
      return { success: false, error: err };
    }
  }, [user?.id, userRole, messages, showNotification]);

  // ===== РЕАКЦИИ =====
  const toggleReaction = useCallback(async (messageId, emoji) => {
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
      return { success: true };
    } catch (err) {
      console.error('Ошибка реакции:', err);
      return { success: false, error: err };
    }
  }, [user?.id, messages]);

  // ===== СОХРАНЕНИЕ СООБЩЕНИЯ =====
  const toggleSaveMessage = useCallback(async (messageId) => {
    if (!user?.id) return;
    
    try {
      if (savedMessages.has(messageId)) {
        await supabase
          .from('saved_messages')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user.id);
        
        setSavedMessages(prev => {
          const newSet = new Set(prev);
          newSet.delete(messageId);
          return newSet;
        });
        showNotification?.('Сообщение удалено из сохранённых', 'info');
      } else {
        await supabase
          .from('saved_messages')
          .insert({ message_id: messageId, user_id: user.id, saved_at: new Date() });
        
        setSavedMessages(prev => new Set([...prev, messageId]));
        showNotification?.('Сообщение сохранено', 'success');
      }
      return { success: true };
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      showNotification?.('Не удалось сохранить сообщение', 'error');
      return { success: false, error: err };
    }
  }, [user?.id, savedMessages, showNotification]);

  // ===== ЗАКРЕПЛЕНИЕ СООБЩЕНИЯ =====
  const pinMessage = useCallback(async (messageId) => {
    try {
      if (pinnedMessages.includes(messageId)) {
        setPinnedMessages(prev => prev.filter(id => id !== messageId));
        await supabase
          .from('company_messages')
          .update({ is_pinned: false, pinned_at: null })
          .eq('id', messageId);
        showNotification?.('Сообщение откреплено', 'info');
      } else {
        if (pinnedMessages.length >= 5) {
          showNotification?.('Нельзя закрепить более 5 сообщений', 'warning');
          return;
        }
        setPinnedMessages(prev => [...prev, messageId]);
        await supabase
          .from('company_messages')
          .update({ is_pinned: true, pinned_at: new Date().toISOString() })
          .eq('id', messageId);
        showNotification?.('Сообщение закреплено', 'success');
      }
      return { success: true };
    } catch (err) {
      console.error('Ошибка закрепления:', err);
      showNotification?.('Не удалось закрепить сообщение', 'error');
      return { success: false, error: err };
    }
  }, [pinnedMessages, showNotification]);

  // ===== ЗАКРЕПЛЕНИЕ КАНАЛА =====
  const pinChannel = useCallback(async (channelId) => {
    if (!user?.id || !userCompanyId) return;
    
    try {
      if (pinnedChannels.includes(channelId)) {
        setPinnedChannels(prev => prev.filter(id => id !== channelId));
        await supabase
          .from('pinned_channels')
          .delete()
          .eq('user_id', user.id)
          .eq('company_id', userCompanyId)
          .eq('channel_id', channelId);
      } else {
        if (pinnedChannels.length >= 5) {
          showNotification?.('Нельзя закрепить более 5 каналов', 'warning');
          return;
        }
        setPinnedChannels(prev => [...prev, channelId]);
        await supabase
          .from('pinned_channels')
          .insert({
            user_id: user.id,
            company_id: userCompanyId,
            channel_id: channelId,
            created_at: new Date().toISOString()
          });
      }
      return { success: true };
    } catch (err) {
      console.error('Ошибка закрепления канала:', err);
      showNotification?.('Не удалось закрепить канал', 'error');
      return { success: false, error: err };
    }
  }, [user?.id, userCompanyId, pinnedChannels, showNotification]);

  // ===== НЕПРОЧИТАННЫЕ СООБЩЕНИЯ =====
  const loadUnreadCounts = useCallback(async () => {
    if (!user?.id || !userCompanyId) return;
    
    try {
      const { data: readData } = await supabase
        .from('channel_read_status')
        .select('channel_id, last_read_at')
        .eq('user_id', user.id);
      
      const readMap = {};
      readData?.forEach(item => {
        readMap[item.channel_id] = new Date(item.last_read_at);
      });
      setLastReadTimes(readMap);
      
      // Все каналы
      const allChannels = [
        ...SYSTEM_CHANNELS.map(ch => ch.id),
        ...customChannels.map(ch => ch.id)
      ];
      
      const counts = {};
      for (const channelId of allChannels) {
        const lastRead = readMap[channelId] || new Date(0);
        const channelMessages = getChannelMessages(channelId);
        const unread = channelMessages.filter(m => {
          const msgDate = new Date(m.created_at);
          return msgDate > lastRead && m.user_id !== user.id;
        }).length;
        
        counts[channelId] = unread;
      }
      
      setUnreadCounts(counts);
      
      // Уведомляем родителя
      const totalUnread = Object.values(counts).reduce((sum, count) => sum + count, 0);
      onUnreadCountChange?.(totalUnread);
      
    } catch (err) {
      console.error('Ошибка загрузки непрочитанных:', err);
    }
  }, [user?.id, userCompanyId, SYSTEM_CHANNELS, customChannels, getChannelMessages, onUnreadCountChange]);

  // ===== ОТМЕТКА КАНАЛА КАК ПРОЧИТАННОГО =====
  const markChannelAsRead = useCallback(async (channelId) => {
    if (!user?.id || !channelId) return;
    
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('channel_read_status')
        .upsert({
          user_id: user.id,
          channel_id: channelId,
          last_read_at: now,
          updated_at: now
        }, { onConflict: 'user_id,channel_id' });
      
      if (!error) {
        setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
        setLastReadTimes(prev => ({ ...prev, [channelId]: new Date(now) }));
      }
    } catch (err) {
      console.error('Ошибка отметки прочитанного:', err);
    }
  }, [user?.id]);

  // ===== ПОДПИСКА НА СООБЩЕНИЯ =====
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
        
        // Обновляем счётчик непрочитанных
        if (newMsg.user_id !== user?.id) {
          setUnreadCounts(prev => ({
            ...prev,
            [activeChannel]: (prev[activeChannel] || 0) + 1
          }));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'company_messages',
        filter: filter
      }, (payload) => {
        const updatedMsg = payload.new;
        setMessages(prev => prev.map(m => 
          m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'company_messages',
        filter: filter
      }, (payload) => {
        const deletedMsg = payload.old;
        setMessages(prev => prev.filter(m => m.id !== deletedMsg.id));
      })
      .subscribe();
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [userCompanyId, activeChannel, user?.id, SYSTEM_CHANNELS]);

  // ===== ИНИЦИАЛИЗАЦИЯ =====
  useEffect(() => {
    loadUsers();
    loadCustomChannels();
  }, [loadUsers, loadCustomChannels]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    loadUnreadCounts();
  }, [loadUnreadCounts]);

  // ===== ВОЗВРАЩАЕМЫЕ ЗНАЧЕНИЯ =====
  return {
    // Состояния
    messages,
    activeChannel,
    setActiveChannel,
    customChannels,
    setCustomChannels,
    loading,
    sending,
    editingMessageId,
    setEditingMessageId,
    editText,
    setEditText,
    showReactionsPicker,
    setShowReactionsPicker,
    companyUsers,
    connectionStatus,
    replyTo,
    setReplyTo,
    savedMessages,
    typingUsers,
    unreadCounts,
    lastReadTimes,
    isMobile,
    setIsMobile,
    shouldAutoScroll,
    setShouldAutoScroll,
    isUserScrolling,
    setIsUserScrolling,
    pinnedMessages,
    pinnedChannels,
    
    // Refs
    messagesContainerRef,
    textareaRef,
    bottomRef,
    
    // Функции
    SYSTEM_CHANNELS,
    getChannelMessages,
    canWriteToChannel,
    sendMessage,
    saveEdit,
    deleteMessage,
    toggleReaction,
    toggleSaveMessage,
    pinMessage,
    pinChannel,
    loadUnreadCounts,
    markChannelAsRead,
    loadMessages,
    loadUsers,
    loadCustomChannels,
    
    // Вспомогательные
    scrollTimeoutRef,
    typingTimeoutRef,
    isUserScrollingRef,
    lastScrollTopRef,
    animationFrameRef
  };
};

export default useChat;