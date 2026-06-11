import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { 
  Send, Smile, Paperclip, Edit2, Trash2, X, Check, 
  AtSign, Loader2, MessageCircle, Shield, User, AlertCircle,
  Plus, Users, Settings, Search, CornerUpLeft, Bookmark, BookmarkCheck, Menu
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import MessageItem from './MessageItem';
import ChatSidebar from './ChatSidebar';

// ========== КОНСТАНТЫ ==========
const SYSTEM_CHANNELS = [
  { 
    id: 'general', 
    label: '# Общий', 
    icon: '💬', 
    description: 'Общие вопросы',
    canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'],
    canWrite: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client']
  },
  { 
    id: 'supply', 
    label: '📦 Снабжение', 
    icon: '📦', 
    description: 'Закупки и материалы',
    canView: ['manager', 'supply_admin'],
    canWrite: ['manager', 'supply_admin']
  },
  { 
    id: 'foremen', 
    label: '👷 Прорабы', 
    icon: '👷', 
    description: 'Для прорабов',
    canView: ['manager', 'master', 'foreman'],
    canWrite: ['manager', 'master', 'foreman']
  },
  { 
    id: 'announcements', 
    label: '📢 Объявления', 
    icon: '📢', 
    description: 'Важные объявления',
    canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'],
    canWrite: ['manager', 'supply_admin']
  }
];

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
  const [connectionStatus] = useState('connected');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelMembers, setChannelMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  const [replyTo, setReplyTo] = useState(null);
  const [savedMessages, setSavedMessages] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  
  // Мобильная адаптация
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true); // На мобильных показываем либо сайдбар, либо чат

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setShowSidebar(true); // Просто всегда true при загрузке
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ========== ЛИЧНЫЕ СООБЩЕНИЯ ==========
  const startDirectChat = (targetUser) => {
    if (!targetUser || !user?.id) return;
    
    const dmId = `dm_${[user.id, targetUser.user_id].sort().join('_')}`;
    const existingDM = customChannels.find(c => c.id === dmId);
    
    if (!existingDM) {
      const newDM = {
        id: dmId,
        name: targetUser.full_name,
        label: targetUser.full_name,
        icon: '💬',
        description: `Личный чат с ${targetUser.full_name}`,
        type: 'direct',
        is_private: true,
        participants: [user.id, targetUser.user_id],
        created_by: user.id,
        created_at: new Date().toISOString()
      };
      setCustomChannels(prev => [...prev, newDM]);
    }
    
    setActiveChannel(dmId);
    if (isMobile) {
      setShowSidebar(false); // На мобильных после выбора чата показываем сообщения
    }
  };

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

  // Все каналы (системные + пользовательские + личные)
  const allChannels = useMemo(() => {
    const system = SYSTEM_CHANNELS.filter(ch => {
      if (!ch.canView) return true;
      return ch.canView.includes(userRole);
    }).map(ch => ({ ...ch, type: 'system' }));
    
    const custom = customChannels.filter(ch => {
      if (ch.type === 'direct') {
        return ch.participants?.includes(user?.id);
      }
      return true;
    }).map(ch => ({ ...ch, type: ch.type || 'custom' }));
    
    return [...system, ...custom];
  }, [customChannels, userRole, user?.id]);

  // Проверка прав на отправку
  const canWriteToChannel = (channelId) => {
    const channel = SYSTEM_CHANNELS.find(c => c.id === channelId);
    if (!channel) return true;
    return channel.canWrite?.includes(userRole) || false;
  };

  // Текущий канал
  const currentChannel = allChannels.find(c => c.id === activeChannel);

  // ========== ЗАГРУЗКА ДАННЫХ ==========
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
      .is('deleted_at', null)
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
      console.error('❌ Ошибка загрузки:', error);
      throw error;
    }
      
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

  const handleReply = (message) => {
    setReplyTo(message);
    textareaRef.current?.focus();
  };

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
  }, [user?.id, activeChannel, user?.user_metadata?.full_name]);

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
  
  if (!canWriteToChannel(activeChannel)) {
    showNotification?.('У вас нет прав на отправку сообщений в этот канал', 'error');
    return;
  }
  
  const safeCompanyId = userCompanyId;
  if (!safeCompanyId) {
    showNotification?.('Ошибка: компания не указана', 'error');
    return;
  }
  
  setSending(true);
  try {
    const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
    const isDirectChat = activeChannel?.startsWith('dm_');
    
    // Базовые поля, общие для всех типов сообщений
    const messageData = {
      company_id: safeCompanyId,
      user_id: user.id,
      content: content,
      created_at: new Date().toISOString(),
      reply_to_message_id: replyTo?.id || null
    };
    
    if (isSystemChannel) {
      // Для системных каналов
      messageData.channel = activeChannel;
      messageData.channel_type = 'system';
      // Не отправляем channel_id для системных каналов
    } else if (isDirectChat) {
      // Для личных сообщений
      messageData.channel_id = activeChannel;
      messageData.channel_type = 'direct';
      messageData.channel = null; // Явно устанавливаем null
    } else {
      // Для пользовательских каналов
      messageData.channel_id = activeChannel;
      messageData.channel_type = 'custom';
      messageData.channel = null;
    }
    
    console.log('📤 Отправка сообщения:', messageData);
    
    const { error } = await supabase.from('company_messages').insert([messageData]);
    if (error) {
      console.error('❌ Ошибка Supabase:', error);
      throw error;
    }
    
    setNewMessage('');
    setReplyTo(null);
    textareaRef.current?.focus();
  } catch (err) {
    console.error('Ошибка отправки:', err);
    showNotification?.('Не удалось отправить сообщение: ' + (err.message || 'неизвестная ошибка'), 'error');
  } finally {
    setSending(false);
  }
};

  // ========== УПРАВЛЕНИЕ УЧАСТНИКАМИ ==========
  const loadChannelMembers = async (channelId) => {
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
  };

  const addChannelMember = async (channelId, userId) => {
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
  };

  const removeChannelMember = async (channelId, userId) => {
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
  };

  const deleteChannel = async (channelId) => {
    if (!channelId) return;
    
    const channel = customChannels.find(c => c.id === channelId);
    if (!channel) return;
    
    if (!window.confirm(`Удалить канал "${channel.name}"? Все сообщения в канале будут удалены.`)) return;
    
    try {
      await supabase.from('company_messages').delete().eq('channel_id', channelId);
      await supabase.from('channel_members').delete().eq('channel_id', channelId);
      
      const { error } = await supabase.from('company_channels').delete().eq('id', channelId);
      if (error) throw error;
      
      setCustomChannels(prev => prev.filter(c => c.id !== channelId));
      if (activeChannel === channelId) {
        setActiveChannel('general');
      }
      showNotification?.('Канал удалён', 'success');
    } catch (err) {
      console.error('Ошибка удаления канала:', err);
      showNotification?.('Не удалось удалить канал', 'error');
    }
  };

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
      
      setCustomChannels(prev => [...prev, data]);
      setActiveChannel(data.id);
      showNotification?.('Канал создан', 'success');
    } catch (err) {
      console.error('Ошибка создания канала:', err);
      showNotification?.('Не удалось создать канал', 'error');
      throw err;
    }
  };

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

  // Функция для переключения сайдбара на мобильных
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Функция для выбора канала на мобильных
  const handleChannelSelect = (channelId) => {
    setActiveChannel(channelId);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  // ========== RENDER ==========
  return (
    <div className="flex flex-col w-full h-[calc(100vh-120px)] bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      {/* Мобильная кнопка назад */}
      {isMobile && !showSidebar && (
        <button
          onClick={toggleSidebar}
          className="absolute top-3 left-3 z-20 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700"
        >
          <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}
      
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Сайдбар - на мобильных показывается когда showSidebar === true */}
        {(showSidebar || !isMobile) && (
          <ChatSidebar
            channels={allChannels}
            activeChannel={activeChannel}
            onChannelSelect={handleChannelSelect}
            canCreateChannel={userRole === 'manager' || userRole === 'supply_admin'}
            onCreateChannel={() => setShowCreateModal(true)}
            connectionStatus={connectionStatus}
            isMobile={isMobile}
            showSidebar={showSidebar}
            onCloseSidebar={toggleSidebar}
            onChannelSettings={(channel) => {
              setSelectedChannel(channel);
              setShowChannelSettings(true);
              loadChannelMembers(channel.id);
            }}
            onDeleteChannel={deleteChannel}
            currentUserRole={userRole}
            companyUsers={companyUsers}
            currentUser={user}
            onStartDirectChat={startDirectChat}
          />
        )}

        {/* Main Chat Area - на мобильных показывается когда showSidebar === false */}
        {(!isMobile || !showSidebar) && (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <header className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 sm:gap-3">
                {isMobile && !showSidebar && (
                  <button 
                    onClick={toggleSidebar}
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
              
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{messages.length}</span>
              </div>
            </header>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4 min-h-0">
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
                  <p className="font-medium text-base sm:text-lg">Нет сообщений</p>
                  <p className="text-xs sm:text-sm mt-1 opacity-70">Начните обсуждение!</p>
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
        )}
      </div>

      {/* Create Channel Modal */}
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

      {/* Channel Settings Modal */}
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
                {companyUsers
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
    </div>
  );
};

export default memo(CompanyChat);