// src/components/CompanyChat.jsx
import React, { useState, useRef, useCallback, useMemo, memo, useEffect } from 'react';
import { 
  Send, Smile, Paperclip, Edit2, Trash2, X, Check, 
  Loader2, MessageCircle, Plus, Settings, Search, CornerUpLeft, 
  Bookmark, BookmarkCheck, Menu, FileText, Pin, Download,
  Mic, Square, Play, Copy
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

// ============================================================
// 🔥 ИМПОРТЫ КОМПОНЕНТОВ
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
    label: 'Общий', 
    name: 'Общий',
    icon: '💬', 
    description: 'Общие вопросы компании',
    canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'],
    canWrite: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client']
  },
  { 
    id: 'supply', 
    label: 'Снабжение', 
    name: 'Снабжение',
    icon: '📦', 
    description: 'Закупки, материалы, логистика',
    canView: ['manager', 'supply_admin'],
    canWrite: ['manager', 'supply_admin']
  },
  { 
    id: 'foremen', 
    label: 'Прорабы', 
    name: 'Прорабы',
    icon: '👷', 
    description: 'Оперативные вопросы на объектах',
    canView: ['manager', 'master', 'foreman'],
    canWrite: ['manager', 'master', 'foreman']
  },
  { 
    id: 'announcements', 
    label: 'Объявления', 
    name: 'Объявления',
    icon: '📢', 
    description: 'Важные новости и приказы',
    canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'],
    canWrite: ['manager', 'supply_admin']
  }
];

// ========== ВСПОМОГАТЕЛЬНЫЙ КОМПОНЕНТ ==========
const ArrowDown = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

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

  // ===== ЛОКАЛЬНЫЕ СОСТОЯНИЯ =====
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

  // ============================================================
  // 🔥 ВСЕ КАНАЛЫ (ОБЪЕДИНЕННЫЕ)
  // ============================================================
  const allChannels = useMemo(() => {
    // 1️⃣ Системные каналы (фильтруем по роли)
    const systemChannels = SYSTEM_CHANNELS
      .filter(ch => ch.canView?.includes(userRole))
      .map(ch => ({ 
        ...ch, 
        id: ch.id,
        label: ch.label || ch.name,
        name: ch.name || ch.label,
        type: 'system',
        is_system: true,
        is_private: false,
        canView: ch.canView || [],
        canWrite: ch.canWrite || []
      }));
    
    // 2️⃣ Каналы из БД (включая личные чаты)
    const dbChannels = (chat.customChannels || []).map(ch => {
      const isDirect = ch.is_direct || ch.id?.startsWith('dm_');
      return {
        id: ch.id,
        label: isDirect 
          ? (ch.participant_name || ch.name?.replace('Чат с ', '') || 'Личный чат') 
          : (ch.name || ch.label || 'Без названия'),
        name: ch.name || ch.label || 'Без названия',
        icon: ch.icon || (isDirect ? '👤' : '💬'),
        description: ch.description || (isDirect ? 'Личный чат' : ''),
        type: isDirect ? 'direct' : 'custom',
        is_private: ch.is_private || false,
        is_system: false,
        is_direct: isDirect,
        created_by: ch.created_by,
        created_at: ch.created_at,
        participant_id: ch.participant_id,
        participant_name: ch.participant_name,
        canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'],
        canWrite: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client']
      };
    });
    
    // 3️⃣ Объединяем
    const result = [...systemChannels, ...dbChannels];
    
    // 🐛 ОТЛАДКА
    console.log('📋 [CompanyChat] Все каналы (объединенные):', result);
    console.log('📊 [CompanyChat] Количество каналов:', result.length);
    console.log('🔍 [CompanyChat] Системных:', systemChannels.length);
    console.log('📦 [CompanyChat] Из БД:', dbChannels.length);
    console.log('👤 [CompanyChat] Личных чатов:', dbChannels.filter(ch => ch.is_direct).length);
    console.log('👤 [CompanyChat] Роль пользователя:', userRole);
    
    return result;
  }, [chat.customChannels, userRole]);

  // ============================================================
  // 🔥 ТЕКУЩИЙ КАНАЛ
  // ============================================================
  const currentChannel = useMemo(() => {
    return allChannels.find(c => c.id === chat.activeChannel);
  }, [allChannels, chat.activeChannel]);

  // ============================================================
  // 🔥 ОТПРАВКА СООБЩЕНИЯ
  // ============================================================
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || chat.sending) return;
    
    const result = await chat.sendMessage(newMessage, chat.replyTo);
    if (result.success) {
      setNewMessage('');
      chat.setReplyTo(null);
    }
  }, [newMessage, chat]);

  const handleVoiceSend = useCallback(async (audio) => {
  console.log('🔍 [handleVoiceSend] Начало');
  console.log('📊 audio:', audio);
  console.log('📊 audio.blob:', audio?.blob);
  console.log('📊 audio.blob.size:', audio?.blob?.size);
  console.log('📊 audio.blob.type:', audio?.blob?.type);
  
  if (!audio || !audio.blob) {
    console.error('❌ Нет аудио для отправки');
    showNotification?.('Не удалось отправить голосовое сообщение', 'error');
    return;
  }
  
  try {
    const companyId = chat.getCompanyId();
    console.log('🏢 companyId:', companyId);
    
    if (!companyId) {
      showNotification?.('Ошибка: компания не указана', 'error');
      return;
    }

    // ✅ Проверяем размер
    if (audio.blob.size > 10 * 1024 * 1024) {
      showNotification?.('Файл слишком большой (макс. 10MB)', 'error');
      return;
    }

    if (audio.blob.size < 1024) {
      showNotification?.('Запись слишком короткая', 'error');
      return;
    }
    
    // ✅ Определяем расширение файла
    const mimeType = audio.mimeType || audio.blob.type || 'audio/webm';
    const extension = mimeType.includes('ogg') ? 'ogg' : 
                     mimeType.includes('mp4') ? 'mp4' : 'webm';
    
    // ✅ Создаем File
    const file = new File(
      [audio.blob], 
      `voice_${Date.now()}.${extension}`, 
      { 
        type: mimeType,
        lastModified: Date.now()
      }
    );
    
    const fileName = `${companyId}/voice_${Date.now()}.${extension}`;
    console.log('📤 Загрузка голоса:', fileName);
    console.log('📊 Размер файла:', file.size, 'байт');
    console.log('📊 Тип файла:', file.type);
    
    // ✅ Проверяем bucket перед загрузкой
    const { data: buckets } = await supabase.storage.listBuckets();
    console.log('📦 Все buckets:', buckets);
    
    const bucketExists = buckets?.some(b => b.id === 'chat-attachments');
    console.log('✅ chat-attachments существует:', bucketExists);
    
    if (!bucketExists) {
      console.log('🆕 Создаем bucket через RPC...');
      const { data: bucketData, error: bucketError } = await supabase
        .rpc('create_chat_bucket');
      
      if (bucketError) {
        console.error('❌ Ошибка создания bucket:', bucketError);
        showNotification?.('Ошибка доступа к хранилищу', 'error');
        return;
      }
      console.log('✅ Bucket создан:', bucketData);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // ✅ Загружаем с подробным логированием
    console.log('📤 Отправка запроса на загрузку...');
    const startTime = Date.now();
    
    const { data, error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: mimeType
      });
    
    console.log(`⏱️ Загрузка заняла: ${Date.now() - startTime}мс`);
    
    if (uploadError) {
      console.error('❌ Ошибка загрузки:', uploadError);
      console.error('❌ Код ошибки:', uploadError.statusCode);
      console.error('❌ Сообщение:', uploadError.message);
      console.error('❌ Детали:', uploadError);
      
      showNotification?.(`Ошибка загрузки: ${uploadError.message || 'Неизвестная ошибка'}`, 'error');
      return;
    }
    
    console.log('✅ Загрузка успешна:', data);
    
    // ✅ Проверяем, что файл действительно существует
    console.log('🔍 Проверка существования файла...');
    const { data: checkData, error: checkError } = await supabase.storage
      .from('chat-attachments')
      .download(fileName);
    
    if (checkError) {
      console.error('❌ Файл не найден после загрузки:', checkError);
      showNotification?.('Файл загружен, но недоступен. Попробуйте снова.', 'error');
      return;
    }
    
    console.log('✅ Файл подтвержден, размер:', checkData?.size, 'байт');
    
    // ✅ Получаем публичный URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName);
    
    console.log('✅ Публичный URL:', publicUrl);
    
    // ✅ Отправляем ТОЛЬКО ссылку (без HTML)
    const result = await chat.sendMessage(`🎙️ Голосовое сообщение: ${publicUrl}`);
    
    if (result.success) {
      showNotification?.('✅ Голосовое сообщение отправлено', 'success');
    } else {
      throw new Error('Не удалось отправить сообщение');
    }
    
  } catch (err) {
    console.error('❌ Ошибка отправки голоса:', err);
    console.error('❌ Стек ошибки:', err.stack);
    showNotification?.('Не удалось отправить голосовое сообщение', 'error');
  }
}, [chat, showNotification]);

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

  // ============================================================
  // 🔥 УДАЛЕНИЕ КАНАЛА
  // ============================================================
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

  const handleCreateChannel = useCallback(async (channelData) => {
    if (!userCompanyId || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('company_channels')
        .insert([{
          company_id: userCompanyId,
          name: channelData.name,
          description: channelData.description || '',
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

  // ============================================================
// 🔥 УДАЛЕНИЕ СООБЩЕНИЯ (С УДАЛЕНИЕМ ФАЙЛА ИЗ STORAGE)
// ============================================================
const deleteMessage = useCallback(async (messageId) => {
  if (!messageId) {
    console.error('❌ Нет ID сообщения');
    return;
  }
  
  console.log('🗑️ Начинаем удаление сообщения:', messageId);
  
  // Находим сообщение
  const message = chat.messages.find(m => m.id === messageId);
  if (!message) {
    console.error('❌ Сообщение не найдено');
    showNotification?.('Сообщение не найдено', 'error');
    return;
  }
  
  console.log('📨 Сообщение:', message);
  console.log('📝 Содержание:', message.content);
  
  // ✅ Проверяем, является ли сообщение голосовым
  const isVoice = message.content?.includes('🎙️ Голосовое сообщение') && 
                  message.content?.includes('.webm');
  
  console.log('🎵 Это голосовое сообщение?', isVoice);
  
  // ✅ Если это голосовое сообщение, извлекаем путь к файлу
  let filePath = null;
  if (isVoice) {
    // Ищем URL в сообщении
    const urlMatch = message.content.match(/https?:\/\/[^\s]+\.webm/);
    console.log('🔗 Найденный URL:', urlMatch?.[0]);
    
    if (urlMatch) {
      const url = urlMatch[0];
      console.log('🔗 Полный URL:', url);
      
      // ✅ ИЗВЛЕКАЕМ ПУТЬ ИЗ URL
      // Пробуем разные способы
      
      // Способ 1: через split
      const pathParts = url.split('/public/chat-attachments/');
      if (pathParts.length === 2) {
        filePath = pathParts[1];
        console.log('📁 Путь (способ 1):', filePath);
      }
      
      // Способ 2: через регулярное выражение
      if (!filePath) {
        const regexMatch = url.match(/\/object\/public\/chat-attachments\/(.+\.webm)/);
        if (regexMatch) {
          filePath = regexMatch[1];
          console.log('📁 Путь (способ 2):', filePath);
        }
      }
      
      // Способ 3: через URL объект
      if (!filePath) {
        try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          // /storage/v1/object/public/chat-attachments/folder/file.webm
          const parts = pathname.split('/public/chat-attachments/');
          if (parts.length === 2) {
            filePath = parts[1];
            console.log('📁 Путь (способ 3):', filePath);
          }
        } catch (e) {
          console.error('❌ Ошибка парсинга URL:', e);
        }
      }
      
      // Если путь найден, убираем возможные параметры
      if (filePath) {
        filePath = filePath.split('?')[0];
        console.log('📁 Итоговый путь:', filePath);
      }
    }
  }
  
  // Подтверждение удаления
  if (!window.confirm('Удалить сообщение?')) {
    console.log('❌ Удаление отменено пользователем');
    return;
  }
  
  try {
    // ✅ Сначала удаляем файл из Storage (если это голосовое сообщение)
    if (filePath) {
      console.log('🗑️ Удаление файла из Storage:', filePath);
      
      try {
        const { data: removeData, error: storageError } = await supabase.storage
          .from('chat-attachments')
          .remove([filePath]);
        
        if (storageError) {
          console.error('❌ Ошибка удаления файла из Storage:', storageError);
          console.error('❌ Код ошибки:', storageError.statusCode);
          console.error('❌ Сообщение:', storageError.message);
          // Продолжаем удаление сообщения даже если файл не удалился
        } else {
          console.log('✅ Файл удален из Storage:', removeData);
        }
      } catch (storageErr) {
        console.error('❌ Исключение при удалении файла:', storageErr);
        // Продолжаем удаление сообщения
      }
    } else {
      console.log('ℹ️ Это не голосовое сообщение или файл не найден');
    }
    
    // ✅ Удаляем сообщение из БД
    console.log('🗑️ Удаление сообщения из БД...');
    const { error: deleteError } = await supabase
      .from('company_messages')
      .delete()
      .eq('id', messageId);
    
    if (deleteError) {
      console.error('❌ Ошибка удаления из БД:', deleteError);
      throw deleteError;
    }
    
    console.log('✅ Сообщение удалено из БД');
    
    // ✅ Обновляем локальное состояние
    chat.setMessages(prev => prev.filter(m => m.id !== messageId));
    showNotification?.('Сообщение удалено', 'success');
    
  } catch (error) {
    console.error('❌ Ошибка удаления:', error);
    showNotification?.('Не удалось удалить сообщение', 'error');
  }
}, [chat, showNotification]);

  // ===== ФИЛЬТРАЦИЯ СООБЩЕНИЙ =====
  const displayedMessages = useMemo(() => {
    if (!searchQuery) return chat.messages;
    return chat.messages.filter(m => 
      m.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chat.messages, searchQuery]);

  // ===== ЭФФЕКТЫ =====
  useEffect(() => {
    if (chat.shouldAutoScroll && chat.messages.length > 0) {
      chat.forceScrollToBottom('smooth');
    }
  }, [chat.messages, chat.shouldAutoScroll]);

  useEffect(() => {
    if (showChannelSettings && selectedChannel?.id) {
      loadChannelMembers(selectedChannel.id);
    }
  }, [showChannelSettings, selectedChannel, loadChannelMembers]);

  // ============================================================
  // 🔥 ОТЛАДКА - перед рендером ChatSidebar
  // ============================================================
  console.log('📦 [CompanyChat] Передаем в ChatSidebar каналы:', allChannels);
  console.log('📊 [CompanyChat] Количество каналов для ChatSidebar:', allChannels.length);
  console.log('📋 [CompanyChat] Структура первого канала:', allChannels[0]);
  console.log('🎯 [CompanyChat] Активный канал:', chat.activeChannel);
  console.log('📱 [CompanyChat] showSidebar:', chat.showSidebar);
  console.log('📱 [CompanyChat] isMobile:', chat.isMobile);

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
          onChannelSelect={(channelId) => {
            chat.setActiveChannel(channelId);
            if (chat.isMobile) {
              chat.setShowSidebar(false);
            }
          }}
          canCreateChannel={userRole === 'manager' || userRole === 'supply_admin' || userRole === 'director'}
          onCreateChannel={() => setShowCreateModal(true)}
          connectionStatus={chat.connectionStatus}
          showSidebar={chat.showSidebar}
          onChannelSettings={(channel) => {
            setSelectedChannel(channel);
            setShowChannelSettings(true);
          }}
          onDeleteChannel={deleteChannel}
          currentUserRole={userRole}
          companyUsers={chat.companyUsers}
          currentUser={user}
          onStartDirectChat={async (userData) => {
            await chat.startDirectChat(userData);
            if (chat.isMobile) {
              chat.setShowSidebar(false);
            }
          }}
          unreadCounts={chat.unreadCounts}
          pinnedChannels={chat.pinnedChannels}
          onTogglePinChannel={chat.pinChannel}
          className={chat.isMobile ? 'absolute inset-0 z-50 shadow-2xl' : ''}
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
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    aria-label="Открыть список каналов"
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
                      {currentChannel?.label || currentChannel?.name || 'Чат'}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                      {currentChannel?.description || ''}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowExportModal(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                  title="Экспорт чата"
                >
                  <Download className="w-5 h-5" />
                </button>
                
                <button 
                  onClick={() => setShowSearch(!showSearch)}
                  className={`p-2 rounded-lg transition-colors ${
                    showSearch 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
                  }`}
                >
                  <Search className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                  <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{chat.messages.length}</span>
                </div>
              </div>
            </header>

            {/* Поиск */}
            {showSearch && (
              <div className="p-2 bg-white/95 dark:bg-gray-800/95 border-b border-gray-200 dark:border-gray-700 z-20 shadow-md">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Поиск по сообщениям..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A6572] text-sm"
                    autoFocus
                  />
                  <button 
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                    }} 
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={16}/>
                  </button>
                </div>
                {searchQuery && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2">
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
                  <span className="text-sm text-gray-500 dark:text-gray-400">Загрузка...</span>
                </div>
              ) : displayedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400 dark:text-gray-500">
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
                      onDelete={deleteMessage}
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
                aria-label="Прокрутить вниз"
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

      {/* Модальные окна */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] fade-enter">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Создать канал</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Название канала *</label>
                <input 
                  id="channelName"
                  type="text" 
                  placeholder="Например: Обсуждение проекта" 
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572]"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Описание</label>
                <textarea 
                  id="channelDesc"
                  placeholder="Краткое описание канала..." 
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572]"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Иконка (эмодзи)</label>
                <input 
                  id="channelIcon"
                  type="text" 
                  placeholder="💬" 
                  maxLength={2}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] text-center text-xl"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input type="checkbox" id="channelPrivate" className="w-4 h-4 text-[#4A6572] rounded" />
                <label htmlFor="channelPrivate" className="text-sm text-gray-700 dark:text-gray-300">Приватный канал</label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={() => {
                  const name = document.getElementById('channelName')?.value?.trim();
                  const description = document.getElementById('channelDesc')?.value?.trim();
                  const icon = document.getElementById('channelIcon')?.value?.trim() || '💬';
                  const isPrivate = document.getElementById('channelPrivate')?.checked || false;
                  
                  if (!name) {
                    showNotification?.('Введите название канала', 'error');
                    return;
                  }
                  
                  handleCreateChannel({ name, description, icon, is_private: isPrivate });
                  setShowCreateModal(false);
                }} 
                className="px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {showChannelSettings && selectedChannel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] fade-enter">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Управление каналом: {selectedChannel.name}
              </h3>
              <button 
                onClick={() => setShowChannelSettings(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Участники ({channelMembers.length})</h4>
              {loadingMembers ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-[#4A6572]" />
                </div>
              ) : channelMembers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Нет участников</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {channelMembers.map(member => {
                    const isCreator = selectedChannel.created_by === member.user_id;
                    const canRemove = !isCreator && (userRole === 'manager' || userRole === 'supply_admin' || userRole === 'director');
                    return (
                      <div key={member.user_id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{member.user?.full_name || 'Пользователь'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {member.role}{isCreator && ' (создатель)'}
                          </p>
                        </div>
                        {canRemove && (
                          <button
                            onClick={() => removeChannelMember(selectedChannel.id, member.user_id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Добавить участника</h4>
              <select className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572]" id="newMemberSelect">
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
                className="w-full mt-2 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors"
              >
                Добавить
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  if (confirm(`Удалить канал "${selectedChannel.name}"?`)) {
                    deleteChannel(selectedChannel.id);
                    setShowChannelSettings(false);
                  }
                }}
                className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Удалить канал
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] fade-enter">
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

export default memo(CompanyChat);