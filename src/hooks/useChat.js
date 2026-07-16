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
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [replyTo, setReplyTo] = useState(null);
  const [savedMessages, setSavedMessages] = useState(new Set());
  const [typingUsers] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastReadTimes, setLastReadTimes] = useState({});
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [pinnedChannels, setPinnedChannels] = useState([]);

  // Инициализация isMobile и showSidebar
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [showSidebar, setShowSidebar] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

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

  // ============================================================
  // 🛠️ ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ — ПРИВЕДЕНИЕ companyId К СТРОКЕ
  // ============================================================
  const getCompanyId = useCallback(() => {
    if (!userCompanyId) return null;
    
    if (typeof userCompanyId === 'object') {
      if (userCompanyId?.id) {
        return String(userCompanyId.id);
      }
      try {
        const str = String(userCompanyId);
        if (str !== '[object Object]') {
          return str;
        }
      } catch {
        console.warn('Не удалось преобразовать companyId в строку');
      }
      return null;
    }
    
    return String(userCompanyId);
  }, [userCompanyId]);

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

  // ============================================================
  // 🔥 ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ
  // ============================================================
  const loadUsers = useCallback(async () => {
    const companyId = getCompanyId();
    if (!companyId) {
      console.warn('⚠️ loadUsers: нет companyId');
      return;
    }
    
    console.log('📂 Загрузка пользователей для компании:', companyId);
    
    try {
      const { data, error } = await supabase
        .from('company_users')
        .select('user_id, full_name, role, phone')
        .eq('company_id', companyId)
        .eq('is_active', true);
      
      if (error) throw error;
      
      console.log('📂 Загружены пользователи:', data?.length || 0);
      setCompanyUsers(data || []);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    }
  }, [getCompanyId]);

  // ============================================================
// 🔥 ЗАГРУЗКА КАНАЛОВ
// ============================================================
const loadCustomChannels = useCallback(async () => {
  const companyId = getCompanyId();
  if (!companyId) {
    console.warn('⚠️ loadCustomChannels: нет companyId');
    return;
  }
  
  console.log('📂 Загрузка каналов для компании:', companyId);
  
  try {
    // ✅ Используем select * или перечисляем все колонки
    const { data, error } = await supabase
      .from('company_channels')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_archived', false);
    
    if (error) throw error;
    
    console.log('📂 Загружены каналы из БД:', data);
    console.log('📊 Количество каналов:', data?.length || 0);
    
    // Добавляем label для совместимости
    const channelsWithLabel = (data || []).map(ch => ({
      ...ch,
      label: ch.name || ch.label || 'Без названия'
    }));
    
    setCustomChannels(channelsWithLabel);
  } catch (error) {
    console.error('❌ Ошибка загрузки каналов:', error);
    showNotification?.('Ошибка загрузки каналов', 'error');
  }
}, [getCompanyId, showNotification]);

  // ============================================================
  // 🔥 ЗАГРУЗКА СООБЩЕНИЙ
  // ============================================================
  const loadMessages = useCallback(async () => {
    const companyId = getCompanyId();
    if (!companyId || !activeChannel) {
      console.warn('⚠️ loadMessages: нет companyId или activeChannel');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
      const isDirectChat = activeChannel?.startsWith('dm_');
      
      let query = supabase
        .from('company_messages')
        .select('*')
        .eq('company_id', companyId)
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
        .eq('company_id', companyId)
        .eq('is_pinned', true);
      
      if (pinnedData) {
        setPinnedMessages(pinnedData.map(p => p.id));
      }

      // Загрузка закреплённых каналов
      if (user?.id) {
        const { data: pinnedChannelsData } = await supabase
          .from('pinned_channels')
          .select('channel_id')
          .eq('user_id', user.id)
          .eq('company_id', companyId);
        
        if (pinnedChannelsData) {
          setPinnedChannels(pinnedChannelsData.map(p => p.channel_id));
        }
      }
      
      // Формирование сообщений
      const enrichedMessages = (messagesData || []).map(msg => ({
        ...msg,
        user: { user_metadata: usersMap[msg.user_id] || { full_name: 'Пользователь', role: 'user' } },
        reactions: reactionsMap[msg.id] || [],
        replied_message: replyMap[msg.reply_to_message_id] || null
      }));
      
      setMessages(enrichedMessages);
      
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
      showNotification?.('Ошибка загрузки чата', 'error');
    } finally {
      setLoading(false);
    }
  }, [getCompanyId, activeChannel, showNotification, SYSTEM_CHANNELS, user?.id]);

  // ===== ОТПРАВКА СООБЩЕНИЯ =====
  const sendMessage = useCallback(async (content, replyToMessage = null) => {
    if (!content?.trim() || !user?.id || sending) {
      return { success: false, error: 'Нет контента или пользователя' };
    }
    
    if (!canWriteToChannel(activeChannel)) {
      showNotification?.('У вас нет прав на отправку сообщений в этот канал', 'error');
      return { success: false, error: 'Нет прав' };
    }
    
    const companyId = getCompanyId();
    if (!companyId) {
      showNotification?.('Ошибка: компания не указана', 'error');
      return { success: false, error: 'Нет companyId' };
    }
    
    setSending(true);
    try {
      const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
      const isDirectChat = activeChannel?.startsWith('dm_');
      
      const messageData = {
        company_id: companyId,
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
      
    } catch (error) {
      console.error('Ошибка отправки:', error);
      showNotification?.('Не удалось отправить сообщение: ' + (error.message || 'неизвестная ошибка'), 'error');
      return { success: false, error: error };
    } finally {
      setSending(false);
    }
  }, [user?.id, activeChannel, canWriteToChannel, sending, showNotification, SYSTEM_CHANNELS, getCompanyId]);

  // ===== РЕДАКТИРОВАНИЕ СООБЩЕНИЯ =====
  const saveEdit = useCallback(async (messageId, content) => {
    if (!content?.trim()) return { success: false, error: 'Нет контента' };
    
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
    } catch (error) {
      console.error('Ошибка редактирования:', error);
      showNotification?.('Не удалось обновить сообщение', 'error');
      return { success: false, error: error };
    }
  }, [user?.id, showNotification]);

  // ===== РЕАКЦИИ =====
  const toggleReaction = useCallback(async (messageId, emoji) => {
    if (!user?.id) return { success: false, error: 'Нет пользователя' };
    
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
    } catch (error) {
      console.error('Ошибка реакции:', error);
      return { success: false, error: error };
    }
  }, [user?.id, messages]);

  // ===== СОХРАНЕНИЕ СООБЩЕНИЯ =====
  const toggleSaveMessage = useCallback(async (messageId) => {
    if (!user?.id) return { success: false, error: 'Нет пользователя' };
    
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
          .insert({ message_id: messageId, user_id: user.id, saved_at: new Date().toISOString() });
        
        setSavedMessages(prev => new Set([...prev, messageId]));
        showNotification?.('Сообщение сохранено', 'success');
      }
      return { success: true };
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      showNotification?.('Не удалось сохранить сообщение', 'error');
      return { success: false, error: error };
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
          return { success: false, error: 'Лимит' };
        }
        setPinnedMessages(prev => [...prev, messageId]);
        await supabase
          .from('company_messages')
          .update({ is_pinned: true, pinned_at: new Date().toISOString() })
          .eq('id', messageId);
        showNotification?.('Сообщение закреплено', 'success');
      }
      return { success: true };
    } catch (error) {
      console.error('Ошибка закрепления:', error);
      showNotification?.('Не удалось закрепить сообщение', 'error');
      return { success: false, error: error };
    }
  }, [pinnedMessages, showNotification]);

  // ===== ЗАКРЕПЛЕНИЕ КАНАЛА =====
  const pinChannel = useCallback(async (channelId) => {
    const companyId = getCompanyId();
    if (!user?.id || !companyId) {
      return { success: false, error: 'Нет данных' };
    }
    
    try {
      if (pinnedChannels.includes(channelId)) {
        setPinnedChannels(prev => prev.filter(id => id !== channelId));
        await supabase
          .from('pinned_channels')
          .delete()
          .eq('user_id', user.id)
          .eq('company_id', companyId)
          .eq('channel_id', channelId);
        showNotification?.('Канал откреплён', 'info');
      } else {
        if (pinnedChannels.length >= 5) {
          showNotification?.('Нельзя закрепить более 5 каналов', 'warning');
          return { success: false, error: 'Лимит' };
        }
        setPinnedChannels(prev => [...prev, channelId]);
        await supabase
          .from('pinned_channels')
          .insert({
            user_id: user.id,
            company_id: companyId,
            channel_id: channelId,
            created_at: new Date().toISOString()
          });
        showNotification?.('Канал закреплён', 'success');
      }
      return { success: true };
    } catch (error) {
      console.error('Ошибка закрепления канала:', error);
      showNotification?.('Не удалось закрепить канал', 'error');
      return { success: false, error: error };
    }
  }, [user?.id, pinnedChannels, showNotification, getCompanyId]);

  // ===== НЕПРОЧИТАННЫЕ СООБЩЕНИЯ =====
  const loadUnreadCounts = useCallback(async () => {
    const companyId = getCompanyId();
    if (!user?.id || !companyId) return;
    
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
      
      const allChannels = [
        ...SYSTEM_CHANNELS.map(ch => ch.id),
        ...customChannels.map(ch => ch.id)
      ];
      
      const counts = {};
      let totalUnread = 0;
      
      for (const channelId of allChannels) {
        const lastRead = readMap[channelId] || new Date(0);
        const channelMessages = getChannelMessages(channelId);
        const unread = channelMessages.filter(m => {
          const msgDate = new Date(m.created_at);
          return msgDate > lastRead && m.user_id !== user.id;
        }).length;
        
        counts[channelId] = unread;
        totalUnread += unread;
      }
      
      setUnreadCounts(counts);
      onUnreadCountChange?.(totalUnread);
      
    } catch (error) {
      console.error('Ошибка загрузки непрочитанных:', error);
    }
  }, [user?.id, SYSTEM_CHANNELS, customChannels, getChannelMessages, onUnreadCountChange, getCompanyId]);

  // ===== ОТМЕТКА КАНАЛА КАК ПРОЧИТАННОГО =====
  const markChannelAsRead = useCallback(async (channelId) => {
    if (!user?.id || !channelId) return;
    
    const companyId = getCompanyId();
    if (!companyId) return;
    
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
    } catch (error) {
      console.error('Ошибка отметки прочитанного:', error);
    }
  }, [user?.id, getCompanyId]);

  // ===== ПРОКРУТКА =====
  const forceScrollToBottom = useCallback((behavior = 'smooth') => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior });
      setShouldAutoScroll(true);
      setIsUserScrolling(false);
    }
  }, []);

  const handleScroll = useCallback((e) => {
    const target = e.target;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    
    if (!isAtBottom) {
      setIsUserScrolling(true);
      setShouldAutoScroll(false);
    } else {
      setIsUserScrolling(false);
      setShouldAutoScroll(true);
    }
  }, []);

 // ============================================================
// 🔥 НАЧАТЬ ЛИЧНЫЙ ЧАТ (С ПОДРОБНЫМ ЛОГИРОВАНИЕМ)
// ============================================================
const startDirectChat = useCallback(async (userData) => {
  console.log('📞 [startDirectChat] Начало');
  console.log('📞 userData:', userData);
  
  // --- Проверки ---
  if (!user?.id) {
    console.error('❌ Нет текущего пользователя');
    showNotification?.('Ошибка: пользователь не авторизован', 'error');
    return { success: false, error: 'Нет пользователя' };
  }

  if (!userData?.user_id) {
    console.error('❌ Нет данных пользователя');
    showNotification?.('Ошибка: данные пользователя не найдены', 'error');
    return { success: false, error: 'Нет данных пользователя' };
  }

  if (userData.user_id === user.id) {
    console.warn('⚠️ Нельзя начать чат с самим собой');
    showNotification?.('Нельзя начать чат с самим собой', 'warning');
    return { success: false, error: 'Сам с собой' };
  }

  const companyId = getCompanyId();
  if (!companyId) {
    console.error('❌ Нет companyId');
    showNotification?.('Ошибка: компания не указана', 'error');
    return { success: false, error: 'Нет companyId' };
  }

  // --- Проверка сессии ---
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.error('❌ Ошибка сессии:', sessionError);
    showNotification?.('Ошибка: требуется авторизация', 'error');
    return { success: false, error: 'No session' };
  }
  console.log('✅ Сессия активна, пользователь:', session.user.id);

  // --- Логируем ID для отладки ---
  console.log('👤 Текущий пользователь (id):', user.id);
  console.log('👤 Собеседник (id):', userData.user_id);
  console.log('🏢 Компания (id):', companyId);

  try {
    // ✅ ВЫЗЫВАЕМ RPC ФУНКЦИЮ
    console.log('📤 Вызов RPC check_or_create_direct_chat...');
    const { data, error } = await supabase
      .rpc('check_or_create_direct_chat', {
        p_other_user_id: userData.user_id,
        p_company_id: companyId
      });

    // ✅ ПОДРОБНОЕ ЛОГИРОВАНИЕ ОТВЕТА
    console.log('📦 Полный ответ RPC:', { data, error });
    console.log('📦 data.success:', data?.success);
    console.log('📦 data.error:', data?.error);
    console.log('📦 data.channel_id:', data?.channel_id);
    console.log('📦 data.exists:', data?.exists);

    if (error) {
      console.error('❌ Ошибка RPC:', error);
      showNotification?.('Не удалось создать чат', 'error');
      return { success: false, error };
    }

    if (!data?.success) {
      console.error('❌ Ошибка в данных:', data?.error);
      showNotification?.(`Не удалось создать чат: ${data?.error || 'неизвестная ошибка'}`, 'error');
      return { success: false, error: data?.error };
    }

    const channelId = data.channel_id;
    if (!channelId) {
      console.error('❌ Нет channel_id в ответе');
      showNotification?.('Не удалось создать чат: нет ID канала', 'error');
      return { success: false, error: 'No channel_id' };
    }

    const displayName = userData.full_name || userData.name || 'пользователь';
    const channelName = `Чат с ${displayName}`;
    
    console.log('✅ Чат найден/создан:', channelId);
    console.log('📊 Существовал ранее:', data.exists);

    // --- Добавляем в локальное состояние ---
    setCustomChannels(prev => {
      const exists = prev.some(ch => ch.id === channelId);
      if (!exists) {
        console.log('✅ Добавляем канал в список');
        return [...prev, {
          id: channelId,
          name: channelName,
          label: channelName,
          description: `Личный чат с ${displayName}`,
          icon: '👤',
          is_private: true,
          is_direct: true,
          created_by: user.id,
          created_at: new Date().toISOString(),
          participant_id: userData.user_id,
          participant_name: displayName
        }];
      }
      return prev;
    });

    // --- Переключаемся на канал ---
    console.log('🔄 Переключаемся на канал:', channelId);
    setActiveChannel(channelId);
    
    // --- Добавляем в закрепленные ---
    setPinnedChannels(prev => {
      if (!prev.includes(channelId)) {
        return [...prev, channelId];
      }
      return prev;
    });

    // --- На мобильных устройствах закрываем сайдбар ---
    if (isMobile) {
      setShowSidebar(false);
    }

    // --- Принудительно загружаем сообщения ---
    setTimeout(() => {
      loadMessages();
    }, 100);

    showNotification?.(`💬 Чат с ${displayName} ${data.exists ? 'открыт' : 'создан'}`, 'success');

    return { success: true, channelId };

  } catch (error) {
    console.error('❌ Ошибка создания диалога:', error);
    showNotification?.('Не удалось создать диалог', 'error');
    return { success: false, error };
  }
}, [user, getCompanyId, showNotification, setCustomChannels, setActiveChannel, setPinnedChannels, isMobile, setShowSidebar, loadMessages]);

  // ============================================================
  // 🔥 ЭФФЕКТ ДЛЯ ОТСЛЕЖИВАНИЯ РАЗМЕРА ЭКРАНА
  // ============================================================
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (!mobile) {
        setShowSidebar(true);
      }
    };
    
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ===== ПОДПИСКА НА СООБЩЕНИЯ =====
  useEffect(() => {
    const companyId = getCompanyId();
    if (!companyId || !activeChannel) return;
    
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    
    const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
    const filter = isSystemChannel 
      ? `company_id=eq.${companyId} AND channel=eq.${activeChannel} AND channel_type=eq.system`
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
        
        const { data: userData } = await supabase
          .from('company_users')
          .select('full_name, role')
          .eq('user_id', newMsg.user_id)
          .single();
        
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
  }, [getCompanyId, activeChannel, user?.id, SYSTEM_CHANNELS]);

  // ============================================================
  // 🔥 АВТОМАТИЧЕСКИЙ ВЫБОР ПЕРВОГО КАНАЛА
  // ============================================================
  useEffect(() => {
    if (customChannels.length > 0 && activeChannel === 'general') {
      console.log('🔄 Устанавливаем первый канал как активный:', customChannels[0].id);
      setActiveChannel(customChannels[0].id);
    }
  }, [customChannels, activeChannel]);

  // ===== ИНИЦИАЛИЗАЦИЯ =====
  useEffect(() => {
    if (userCompanyId) {
      loadUsers();
      loadCustomChannels();
    }
  }, [loadUsers, loadCustomChannels, userCompanyId]);

  useEffect(() => {
    if (activeChannel && userCompanyId) {
      loadMessages();
    }
  }, [loadMessages, activeChannel, userCompanyId]);

  useEffect(() => {
    if (userCompanyId && user?.id) {
      loadUnreadCounts();
    }
  }, [loadUnreadCounts, userCompanyId, user?.id]);

  // ============================================================
  // 🔥 ВОЗВРАЩАЕМЫЕ ЗНАЧЕНИЯ
  // ============================================================
  return {
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
    setConnectionStatus,
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
    showSidebar,
    setShowSidebar,
    messagesContainerRef,
    textareaRef,
    bottomRef,
    scrollTimeoutRef,
    typingTimeoutRef,
    isUserScrollingRef,
    lastScrollTopRef,
    animationFrameRef,
    SYSTEM_CHANNELS,
    getChannelMessages,
    canWriteToChannel,
    sendMessage,
    saveEdit,
    // deleteMessage, // ✅ УДАЛЕНО — теперь используется из CompanyChat.jsx
    toggleReaction,
    toggleSaveMessage,
    pinMessage,
    pinChannel,
    loadUnreadCounts,
    markChannelAsRead,
    loadMessages,
    loadUsers,
    loadCustomChannels,
    forceScrollToBottom,
    handleScroll,
    startDirectChat,
    getCompanyId
  };
};

export default useChat;