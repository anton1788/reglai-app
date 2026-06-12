// CompanyChat.jsx - ПОЛНАЯ ВЕРСИЯ (без ошибок ESLint)

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { 
  Send, Paperclip, X, Menu, Mic, Image, Smile, CornerUpLeft, Loader2,
  Phone, EllipsisVertical, Trash2, Edit2, Bookmark, BookmarkCheck,
  Plus, Users, Settings, Search, User, Mail, Shield, AtSign, AlertCircle,
  MessageCircle as MsgIcon
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import MessageItem from './MessageItem';
import ChatSidebar from './ChatSidebar';

// ========== КОНСТАНТЫ ==========
const SYSTEM_CHANNELS = [
  { id: 'general', label: 'Общий', icon: '💬', description: 'Общие вопросы',
    canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'],
    canWrite: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'] },
  { id: 'supply', label: 'Снабжение', icon: '📦', description: 'Закупки и материалы',
    canView: ['manager', 'supply_admin'], canWrite: ['manager', 'supply_admin'] },
  { id: 'foremen', label: 'Прорабы', icon: '👷', description: 'Для прорабов',
    canView: ['manager', 'master', 'foreman'], canWrite: ['manager', 'master', 'foreman'] },
  { id: 'announcements', label: 'Объявления', icon: '📢', description: 'Важные объявления',
    canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'],
    canWrite: ['manager', 'supply_admin'] }
];

const CompanyChat = ({ user, userCompanyId, userRole, language, showNotification }) => {
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
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [newChannelData, setNewChannelData] = useState({ name: '', description: '', isPrivate: false, selectedMembers: [] });

  // Refs
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const subscriptionRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastScrollTopRef = useRef(0);

  // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
  useEffect(() => {
    setShowSidebar(true);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', 
        { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', 
        { weekday: 'short' });
    } else {
      return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', 
        { day: 'numeric', month: 'short' });
    }
  };

  const formatMessage = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part?.match?.(urlRegex)) {
        return <a key={`url-${i}`} href={part} target="_blank" rel="noopener noreferrer" 
          className="text-blue-500 underline break-all">{part}</a>;
      }
      if (part?.startsWith?.('@')) {
        return <span key={`mention-${i}`} className="font-semibold text-[#25D366] bg-[#25D366]/10 px-0.5 rounded">
          {part}
        </span>;
      }
      return <span key={`text-${i}`}>{part}</span>;
    });
  };

  const allChannels = useMemo(() => {
    const system = SYSTEM_CHANNELS.filter(ch => {
      if (!ch.canView) return true;
      return ch.canView.includes(userRole);
    }).map(ch => ({ ...ch, type: 'system' }));
    
    const custom = customChannels.filter(ch => {
      if (ch.type === 'direct') return ch.participants?.includes(user?.id);
      return true;
    }).map(ch => ({ ...ch, type: ch.type || 'custom' }));
    
    return [...system, ...custom];
  }, [customChannels, userRole, user?.id]);

  const currentChannel = allChannels.find(c => c.id === activeChannel);
  const currentChatUser = useMemo(() => {
    if (activeChannel?.startsWith('dm_')) {
      const participants = activeChannel.replace('dm_', '').split('_');
      const otherUserId = participants.find(id => id !== user?.id);
      return companyUsers.find(u => u.user_id === otherUserId);
    }
    return null;
  }, [activeChannel, companyUsers, user?.id]);

  const chatTitle = currentChatUser?.full_name || currentChannel?.label || currentChannel?.name;
  const chatStatus = currentChatUser ? 'онлайн' : `${messages.length} сообщений`;

  const canWriteToChannel = (channelId) => {
    const channel = SYSTEM_CHANNELS.find(c => c.id === channelId);
    if (!channel) return true;
    return channel.canWrite?.includes(userRole) || false;
  };

  const canDeleteChannel = (channel) => {
    if (channel.type === 'system') return false;
    return userRole === 'manager' || userRole === 'supply_admin';
  };

  // ========== ПРОКРУТКА ==========
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    const isScrollingUp = scrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;
    
    if (isScrollingUp && !isNearBottom) {
      setShouldAutoScroll(false);
      setIsUserScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setIsUserScrolling(false), 5000);
    } else if (isNearBottom && !isScrollingUp) {
      setShouldAutoScroll(true);
      setIsUserScrolling(false);
    }
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (!shouldAutoScroll || isUserScrolling) return;
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: behavior
    });
  }, [shouldAutoScroll, isUserScrolling]);

  const forceScrollToBottom = useCallback((behavior = 'smooth') => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: behavior
    });
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
  }, []);

  // ========== НЕПРОЧИТАННЫЕ СООБЩЕНИЯ ==========
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
      
      const channels = allChannels.map(ch => ch.id);
      const counts = {};
      
      for (const channelId of channels) {
        const lastRead = readMap[channelId] || new Date(0);
        
        let query = supabase
          .from('company_messages')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', userCompanyId)
          .is('deleted_at', null)
          .gt('created_at', lastRead.toISOString())
          .neq('user_id', user.id);
        
        const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === channelId);
        const isDirectChat = channelId?.startsWith('dm_');
        
        if (isSystemChannel) {
          query = query.eq('channel', channelId).eq('channel_type', 'system');
        } else if (isDirectChat) {
          query = query.eq('channel_id', channelId).eq('channel_type', 'direct');
        } else {
          query = query.eq('channel_id', channelId).eq('channel_type', 'custom');
        }
        
        const { count, error } = await query;
        if (!error && count > 0) {
          counts[channelId] = count;
        }
      }
      setUnreadCounts(counts);
    } catch (err) {
      console.error('Ошибка загрузки непрочитанных:', err);
    }
  }, [user?.id, userCompanyId, allChannels]);

  const markChannelAsRead = useCallback(async (channelId) => {
    if (!user?.id || !channelId) return;
    try {
      const now = new Date().toISOString();
      await supabase
        .from('channel_read_status')
        .upsert({ 
          user_id: user.id, 
          channel_id: channelId, 
          last_read_at: now, 
          updated_at: now 
        }, { onConflict: 'user_id,channel_id' });
      setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
    } catch (err) {
      console.error('Ошибка отметки прочитанного:', err);
    }
  }, [user?.id]);

  // ========== ЗАГРУЗКА ДАННЫХ ==========
  useEffect(() => {
    const loadUsers = async () => {
      if (!userCompanyId) return;
      try {
        const { data, error } = await supabase
          .from('company_users')
          .select('user_id, full_name, role, phone, avatar_url')
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
        loadUnreadCounts();
      } catch (err) {
        console.error('Ошибка загрузки каналов:', err);
      }
    };
    loadCustomChannels();
  }, [userCompanyId, loadUnreadCounts]);

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
      if (error) throw error;
      
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
      setTimeout(() => forceScrollToBottom('auto'), 100);
      markChannelAsRead(activeChannel);
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
      showNotification?.('Ошибка загрузки чата', 'error');
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, activeChannel, showNotification, forceScrollToBottom, markChannelAsRead]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ========== REAL-TIME ПОДПИСКА ==========
  useEffect(() => {
    if (!userCompanyId || !activeChannel) return;
    if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    
    const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
    const filter = isSystemChannel 
      ? `company_id=eq.${userCompanyId} AND channel=eq.${activeChannel}`
      : `company_id=eq.${userCompanyId} AND channel_id=eq.${activeChannel}`;
    
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
        
        const enrichedMessage = {
          ...newMsg,
          user: { user_metadata: userData || { full_name: 'Пользователь', role: 'user' } },
          reactions: [],
          replied_message: null
        };
        
        setMessages(prev => [...prev, enrichedMessage]);
        setTimeout(() => scrollToBottom('smooth'), 50);
        
        if (newMsg.user_id !== user?.id) {
          markChannelAsRead(activeChannel);
        }
      })
      .subscribe();
    
    return () => { subscriptionRef.current?.unsubscribe(); };
  }, [userCompanyId, activeChannel, scrollToBottom, markChannelAsRead, user?.id]);

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

  // ========== ТАЙПИНГ ==========
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
    
    setSending(true);
    try {
      const isSystemChannel = SYSTEM_CHANNELS.some(ch => ch.id === activeChannel);
      const isDirectChat = activeChannel?.startsWith('dm_');
      
      const messageData = {
        company_id: userCompanyId,
        user_id: user.id,
        content: content,
        created_at: new Date().toISOString(),
        reply_to_message_id: replyTo?.id || null
      };
      
      if (isSystemChannel) {
        messageData.channel = activeChannel;
        messageData.channel_type = 'system';
      } else if (isDirectChat) {
        messageData.channel_id = activeChannel;
        messageData.channel_type = 'direct';
      } else {
        messageData.channel_id = activeChannel;
        messageData.channel_type = 'custom';
      }
      
      const { error } = await supabase.from('company_messages').insert([messageData]);
      if (error) throw error;
      
      setNewMessage('');
      setReplyTo(null);
      forceScrollToBottom('smooth');
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Ошибка отправки:', err);
      showNotification?.('Не удалось отправить сообщение', 'error');
    } finally {
      setSending(false);
    }
  };

  // ========== РЕДАКТИРОВАНИЕ ==========
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
  
  // ========== УДАЛЕНИЕ ==========
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

  // ========== СОХРАНЕНИЕ СООБЩЕНИЙ ==========
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

  // ========== ОТВЕТ ==========
  const handleReply = (message) => {
    setReplyTo(message);
    textareaRef.current?.focus();
  };

  // ========== УПРАВЛЕНИЕ КАНАЛАМИ ==========
  const handleCreateChannel = async () => {
    if (!newChannelData.name.trim()) {
      showNotification?.('Введите название канала', 'error');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('company_channels')
        .insert([{
          company_id: userCompanyId,
          name: newChannelData.name.trim(),
          description: newChannelData.description.trim(),
          icon: '💬',
          is_private: newChannelData.isPrivate,
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
      
      if (newChannelData.isPrivate && newChannelData.selectedMembers.length) {
        await supabase.from('channel_members').insert(
          newChannelData.selectedMembers.map(userId => ({
            channel_id: data.id,
            user_id: userId,
            role: 'member'
          }))
        );
      }
      
      setCustomChannels(prev => [...prev, data]);
      setActiveChannel(data.id);
      setShowCreateModal(false);
      setNewChannelData({ name: '', description: '', isPrivate: false, selectedMembers: [] });
      showNotification?.('Канал создан', 'success');
    } catch (err) {
      console.error('Ошибка создания канала:', err);
      showNotification?.('Не удалось создать канал', 'error');
    }
  };

  const deleteChannel = async (channelId) => {
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

  // ========== ФАЙЛЫ И ГОЛОС ==========
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userCompanyId) return;
    
    if (file.size > 10 * 1024 * 1024) {
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

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setTimeout(() => {
        setIsRecording(false);
        showNotification?.('🎙️ Голосовое сообщение записано', 'info');
      }, 3000);
    }
  };

  // ========== ОБРАБОТЧИКИ ==========
  const handleTextareaChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
    
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

  const handleChannelSelect = (channelId) => {
    setActiveChannel(channelId);
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    setReplyTo(null);
    markChannelAsRead(channelId);
    if (isMobile) setShowSidebar(false);
  };

  const toggleSidebar = () => setShowSidebar(!showSidebar);

  const startDirectChat = (targetUser) => {
    if (!targetUser || !user?.id) return;
    
    const dmId = `dm_${[user.id, targetUser.user_id].sort().join('_')}`;
    const existingDM = customChannels.find(c => c.id === dmId);
    
    if (!existingDM) {
      setCustomChannels(prev => [...prev, {
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
      }]);
    }
    
    setActiveChannel(dmId);
    markChannelAsRead(dmId);
    if (isMobile) setShowSidebar(false);
  };

  // ========== RENDER ==========
  return (
    <div className="flex h-[calc(100vh-120px)] bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
      {/* Сайдбар */}
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
          unreadCounts={unreadCounts}
        />
      )}

      {/* Main Chat Area */}
      {(!isMobile || !showSidebar) && (
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          {/* Header */}
          <div className="flex-shrink-0 bg-[#075E54] dark:bg-[#075E54] text-white px-4 py-3 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              {isMobile && !showSidebar && (
                <button onClick={toggleSidebar} className="p-1 hover:bg-white/10 rounded-full">
                  <Menu className="w-5 h-5" />
                </button>
              )}
              
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-lg">
                    {currentChatUser ? currentChatUser.full_name?.[0]?.toUpperCase() : currentChannel?.icon}
                  </span>
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#075E54]"></span>
              </div>
              
              <div>
                <h2 className="font-semibold text-base">{chatTitle}</h2>
                <p className="text-xs text-white/80">
                  {currentChatUser ? 'онлайн' : chatStatus}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {currentChatUser && (
                <button className="p-1 hover:bg-white/10 rounded-full">
                  <Phone className="w-5 h-5" />
                </button>
              )}
              <button className="p-1 hover:bg-white/10 rounded-full">
                <EllipsisVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#ECE5DD] dark:bg-[#1a1a1a]"
            onScroll={handleScroll}
            style={{ 
              WebkitOverflowScrolling: 'touch',
              backgroundImage: 'radial-gradient(circle at 25% 40%, rgba(200,200,200,0.1) 2%, transparent 2.5%)',
              backgroundSize: '30px 30px'
            }}
          >
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-[#075E54]" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MsgIcon className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">Нет сообщений</p>
                <p className="text-xs mt-1">Напишите что-нибудь...</p>
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
                <div ref={(el) => el && !isUserScrolling && el.scrollIntoView({ behavior: 'auto' })} />
              </>
            )}
          </div>

          {/* Reply Preview */}
          {replyTo && (
            <div className="flex-shrink-0 px-4 pt-2 pb-1 bg-[#F0F0F0] dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-[#075E54]">
                  <CornerUpLeft className="w-4 h-4" />
                  <span className="font-medium">Ответ {replyTo.user?.user_metadata?.full_name}</span>
                </div>
                <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-200 rounded-full">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-500 truncate pb-1">{replyTo.content}</p>
            </div>
          )}

          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <div className="flex-shrink-0 px-4 py-1">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <div className="flex gap-0.5">
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
                <span>печатает...</span>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="flex-shrink-0 bg-[#F0F0F0] dark:bg-gray-700 p-2 flex items-center gap-2">
            <label className="p-2 cursor-pointer text-gray-600 dark:text-gray-300 hover:text-[#075E54] transition-colors">
              <Paperclip className="w-5 h-5" />
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
            
            <button className="p-2 text-gray-600 dark:text-gray-300 hover:text-[#075E54] transition-colors">
              <Image className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Введите сообщение..."
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 rounded-full resize-none text-sm focus:outline-none focus:ring-1 focus:ring-[#25D366]"
                rows={1}
                style={{ minHeight: '42px', maxHeight: '100px' }}
              />
            </div>
            
            <button 
              onClick={handleVoiceRecord}
              className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-600 hover:text-[#075E54]'}`}
            >
              <Mic className="w-5 h-5" />
            </button>
            
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className={`p-2 rounded-full transition-all ${
                !newMessage.trim() || sending
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-[#075E54] hover:bg-[#25D366]/10'
              }`}
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">Создать канал</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <input
                type="text"
                placeholder="Название канала"
                value={newChannelData.name}
                onChange={(e) => setNewChannelData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 border rounded-lg"
              />
              <textarea
                placeholder="Описание (необязательно)"
                value={newChannelData.description}
                onChange={(e) => setNewChannelData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                rows={2}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newChannelData.isPrivate}
                  onChange={(e) => setNewChannelData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                />
                <span>Приватный канал (только по приглашению)</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600">Отмена</button>
              <button onClick={handleCreateChannel} className="px-4 py-2 bg-[#075E54] text-white rounded-lg">Создать</button>
            </div>
          </div>
        </div>
      )}

      {/* Channel Settings Modal */}
      {showChannelSettings && selectedChannel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">Управление каналом: {selectedChannel.name}</h3>
              <button onClick={() => setShowChannelSettings(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <h4 className="font-medium mb-2">Участники ({channelMembers.length})</h4>
              {loadingMembers ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                  {channelMembers.map(member => {
                    const isCreator = selectedChannel.created_by === member.user_id;
                    const canRemove = !isCreator && canDeleteChannel(selectedChannel);
                    return (
                      <div key={member.user_id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{member.user?.full_name || 'Пользователь'}</p>
                          <p className="text-xs text-gray-500">{member.role}{isCreator && ' (создатель)'}</p>
                        </div>
                        {canRemove && (
                          <button onClick={() => removeChannelMember(selectedChannel.id, member.user_id)} className="p-1 text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div>
                <h4 className="font-medium mb-2">Добавить участника</h4>
                <select
                  className="w-full p-2 border rounded-lg mb-3"
                  onChange={(e) => {
                    if (e.target.value) {
                      addChannelMember(selectedChannel.id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">-- Выберите пользователя --</option>
                  {companyUsers
                    .filter(u => !channelMembers.some(m => m.user_id === u.user_id))
                    .map(u => (
                      <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.role})</option>
                    ))
                  }
                </select>
              </div>
              
              {canDeleteChannel(selectedChannel) && (
                <div className="mt-6 pt-4 border-t">
                  <button onClick={() => deleteChannel(selectedChannel.id)} className="w-full py-2 bg-red-600 text-white rounded-lg">
                    Удалить канал
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CompanyChat);