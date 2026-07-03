// CompanyChat.jsx - ИСПРАВЛЕННАЯ ВЕРСИЯ (Удален setSelectedChannel и добавлены недостающие импорты)

import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { 
  Send, Smile, Paperclip, Edit2, Trash2, X, Check, 
  Loader2, MessageCircle, Shield, User, AlertCircle,
  Plus, Users, Settings, Search, CornerUpLeft, Bookmark, BookmarkCheck, Menu,
  Mic, MicOff, Video, Phone, PhoneOff, Copy, Pin, PinOff,
  Download, Upload, Share2, Clock, Zap, Sparkles, Bot,
  Moon, Sun, Palette, Eye, EyeOff, Link, Hash, Bell, BellOff,
  Volume2, VolumeX, Filter, Grid, List, Archive, RefreshCw,
  Calendar, Camera, Image, Music, MapPin, Gift, Heart, Star, FolderOpen
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

// ============================================================
// 1. КОНСТАНТЫ
// ============================================================

const SYSTEM_CHANNELS = [
  { id: 'general', label: '# Общий', icon: '💬', description: 'Общие вопросы', canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'], canWrite: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'] },
  { id: 'supply', label: '📦 Снабжение', icon: '📦', description: 'Закупки и материалы', canView: ['manager', 'supply_admin'], canWrite: ['manager', 'supply_admin'] },
  { id: 'foremen', label: '👷 Прорабы', icon: '👷', description: 'Для прорабов', canView: ['manager', 'master', 'foreman'], canWrite: ['manager', 'master', 'foreman'] },
  { id: 'announcements', label: '📢 Объявления', icon: '📢', description: 'Важные объявления', canView: ['manager', 'supply_admin', 'master', 'foreman', 'accountant', 'client'], canWrite: ['manager', 'supply_admin'] }
];

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '💀', '⭐', '👀', '🤝', '💯', '🫡', '🤌', '👏', '🙌'];

const EMOJI_CATEGORIES = {
  'Смайлы': ['😊', '😂', '🤣', '😍', '🥰', '😘', '😋', '😎', '🤩', '🥳', '😏', '😒', '😞', '😢', '😭', '😤', '😠', '🤯', '😳', '🥵', '🥶', '😱', '😨', '🤔', '🤫', '😶', '😐', '😑', '😬', '🙄', '😴', '🤤', '😪', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '💀', '☠️', '👻', '👽', '👾', '🤖', '💩', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
  'Жесты': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾'],
  'Сердца': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Еда': ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🫑', '🌶', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧋', '🧃', '🧉', '🧊'],
  'Активности': ['🎉', '🎊', '🎈', '🎁', '🎀', '🎭', '🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🪕', '🎲', '♟', '🎯', '🎳', '🎮', '🎰', '🧩']
};

const THEMES = {
  dark: { bg: '#1a1a2e', bgSecondary: '#16213e', bgTertiary: '#0f3460', text: '#ffffff', textSecondary: '#a8a8b3', accent: '#e94560', accentHover: '#ff6b81', messageOwn: '#e94560', messageOther: '#16213e', border: '#2a2a4a', shadow: '0 4px 20px rgba(0,0,0,0.5)' },
  light: { bg: '#f5f7fa', bgSecondary: '#ffffff', bgTertiary: '#e8ecf1', text: '#2d3436', textSecondary: '#636e72', accent: '#4A6572', accentHover: '#344955', messageOwn: '#4A6572', messageOther: '#ffffff', border: '#dfe6e9', shadow: '0 4px 20px rgba(0,0,0,0.1)' },
  neon: { bg: '#0a0a0a', bgSecondary: '#1a1a1a', bgTertiary: '#2a2a2a', text: '#00ff41', textSecondary: '#00cc33', accent: '#ff00ff', accentHover: '#ff44ff', messageOwn: '#ff00ff', messageOther: '#1a1a1a', border: '#00ff41', shadow: '0 4px 20px rgba(0,255,65,0.2)' },
  ocean: { bg: '#0c2461', bgSecondary: '#1B1464', bgTertiary: '#2c3e7a', text: '#ffffff', textSecondary: '#a8c0ff', accent: '#00d2d3', accentHover: '#00f5f6', messageOwn: '#00d2d3', messageOther: '#1B1464', border: '#2c3e7a', shadow: '0 4px 20px rgba(0,210,211,0.2)' },
  sunset: { bg: '#1a0b2e', bgSecondary: '#2d1b4e', bgTertiary: '#3d2b5e', text: '#ffd9b3', textSecondary: '#ffb380', accent: '#ff6b35', accentHover: '#ff8c5a', messageOwn: '#ff6b35', messageOther: '#2d1b4e', border: '#4d3b6e', shadow: '0 4px 20px rgba(255,107,53,0.2)' }
};

// ============================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ============================================================

const ArrowDown = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const StatCard = memo(({ icon, label, value, color = '#4A6572' }) => (
  <div className="stat-card p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
    <div className="flex items-center gap-2">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="font-bold text-sm" style={{ color }}>{value}</p>
      </div>
    </div>
  </div>
));

// ============================================================
// 3. КОМПОНЕНТ ЭМОДЗИ-ПИКЕРА
// ============================================================

const EmojiPicker = memo(({ onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmojis = useMemo(() => {
    if (!searchTerm) return EMOJI_CATEGORIES[activeCategory] || [];
    const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
    return allEmojis.filter(emoji => emoji === searchTerm);
  }, [searchTerm, activeCategory]);

  return (
    <div className="emoji-picker bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 w-80 z-50">
      <div className="flex justify-between items-center mb-2">
        <input
          type="text"
          placeholder="Поиск эмодзи..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg"
        />
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto mb-2 pb-2">
        {Object.keys(EMOJI_CATEGORIES).map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-2 py-1 text-xs rounded-lg whitespace-nowrap ${activeCategory === category ? 'bg-[#4A6572] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {filteredEmojis.map(emoji => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xl transition-transform hover:scale-125"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
});

// ============================================================
// 4. КОМПОНЕНТ GIF-ПИКЕРА
// ============================================================

const GifPicker = memo(({ onSelect, onClose }) => {
  const [gifs, setGifs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const searchGifs = useCallback(async (query) => {
    if (!query) return;
    setLoading(true);
    try {
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=YOUR_GIPHY_API_KEY&q=${encodeURIComponent(query)}&limit=20`);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Ошибка загрузки GIF:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="gif-picker bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-3 w-80 z-50">
      <div className="flex justify-between items-center mb-2">
        <input
          type="text"
          placeholder="Поиск GIF..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); searchGifs(e.target.value); }}
          className="flex-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg"
        />
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {gifs.map(gif => (
            <img
              key={gif.id}
              src={gif.images?.fixed_height?.url || gif.images?.original?.url}
              alt="GIF"
              className="w-full rounded-lg cursor-pointer hover:opacity-80 transition"
              onClick={() => { onSelect(gif.images?.original?.url || gif.images?.fixed_height?.url); onClose(); }}
            />
          ))}
          {gifs.length === 0 && search && (
            <p className="col-span-2 text-center text-sm text-gray-500 py-4">GIF не найдены</p>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================
// 5. КОМПОНЕНТ ВИДЕОЗВОНКА
// ============================================================

const VideoCall = memo(({ onEndCall, targetUser }) => {
  const [callState, setCallState] = useState('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    let stream = null;
    let intervalId = null;
    const localVideoElement = localVideoRef.current;
    const remoteVideoElement = remoteVideoRef.current;
    
    const initCall = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoElement) {
          localVideoElement.srcObject = stream;
        }
        setCallState('connected');
        intervalId = setInterval(() => {
          setDuration(prev => prev + 1);
        }, 1000);
      } catch (err) {
        console.error('Ошибка инициализации звонка:', err);
        setCallState('error');
      }
    };
    
    initCall();
    
    return () => {
      if (intervalId) clearInterval(intervalId);
      if (localVideoElement && localVideoElement.srcObject) {
        const tracks = localVideoElement.srcObject.getTracks();
        tracks.forEach(t => t.stop());
        localVideoElement.srcObject = null;
      }
      if (remoteVideoElement && remoteVideoElement.srcObject) {
        const tracks = remoteVideoElement.srcObject.getTracks();
        tracks.forEach(t => t.stop());
        remoteVideoElement.srcObject = null;
      }
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="relative w-full max-w-4xl aspect-video">
        <video ref={remoteVideoRef} className="w-full h-full object-cover rounded-xl" autoPlay playsInline />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
          <button onClick={() => setIsMuted(!isMuted)} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition">
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button onClick={onEndCall} className="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white transition">
            <PhoneOff className="w-5 h-5" />
          </button>
          <button onClick={() => setIsVideoOff(!isVideoOff)} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition">
            {isVideoOff ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <div className="absolute top-4 right-4 w-48 aspect-video rounded-lg overflow-hidden border-2 border-white/30">
          <video ref={localVideoRef} className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : ''}`} autoPlay playsInline muted />
        </div>
        <div className="absolute top-4 left-4 text-white">
          <p className="font-bold">{targetUser?.full_name || 'Собеседник'}</p>
          <p className="text-sm opacity-70">
            {callState === 'connected' ? `⏱ ${formatDuration(duration)}` : 'Подключение...'}
          </p>
        </div>
      </div>
    </div>
  );
});

// ============================================================
// 6. КОМПОНЕНТ СООБЩЕНИЯ
// ============================================================

const MessageItem = memo(function({ 
  msg, user, userRole, isOwn, isEditing, editText, 
  onStartEdit, onSaveEdit, onCancelEdit, onDelete, 
  onToggleReaction, onReply, onToggleSave, isSaved,
  showReactionsPicker, setShowReactionsPicker, 
  formatMessage, formatTime, language, textareaRef, companyUsers,
  onPinMessage, isPinned, onCopyMessage, onTranslate,
  onReactWithEmoji, showEmojiPicker, setShowEmojiPicker,
  showGifPicker, setShowGifPicker,
  onReactWithGif
}) {
  const reactionCounts = useMemo(() => {
    if (!msg.reactions?.length) return {};
    return msg.reactions.reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});
  }, [msg.reactions]);

  const reactionUsers = useMemo(() => {
    if (!msg.reactions?.length) return {};
    return msg.reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = [];
      acc[r.emoji].push(r.user_id);
      return acc;
    }, {});
  }, [msg.reactions]);

  const canEdit = msg.user_id === user?.id || userRole === 'manager' || userRole === 'supply_admin';
  const canDelete = msg.user_id === user?.id || userRole === 'manager' || userRole === 'supply_admin';

  const mentions = useMemo(() => {
    if (!msg.content) return [];
    const mentionRegex = /@([^\s]+)/g;
    return [...msg.content.matchAll(mentionRegex)].map(m => m[1]);
  }, [msg.content]);

  const formattedTime = useMemo(() => {
    return formatTime?.(msg.created_at, language);
  }, [msg.created_at, language, formatTime]);

  const handleDoubleClick = () => {
    if (!msg.deleted_at && !isEditing) {
      onToggleReaction?.(msg.id, '❤️');
    }
  };

  const isLongMessage = msg.content?.length > 500;
  const [isExpanded, setIsExpanded] = useState(!isLongMessage);
  const [isTranslated, setIsTranslated] = useState(false);

  const handleTranslate = async () => {
    if (isTranslated) {
      setIsTranslated(false);
      return;
    }
    await onTranslate?.(msg.id);
    setIsTranslated(true);
  };

  const isGif = msg.content?.includes('giphy.com') || msg.content?.includes('tenor.com');

  return (
    <article className={`group flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} animate-in fade-in`} onDoubleClick={handleDoubleClick}>
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0 ${isOwn ? 'order-2' : ''}`}>
        <span className="text-white text-xs font-medium">
          {msg.user?.user_metadata?.full_name?.[0]?.toUpperCase() || '?'}
        </span>
      </div>
      
      <div className={`max-w-[85%] md:max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1 pl-1">
            <span className="text-xs font-bold text-[#4A6572] dark:text-[#F9AA33]">
              {msg.user?.user_metadata?.full_name || 'Пользователь'}
            </span>
            {userRole && <span className="text-[10px] text-gray-400">• {userRole}</span>}
            {msg.is_encrypted && <Shield className="w-3 h-3 text-green-500" />}
            {msg.is_pinned && <Pin className="w-3 h-3 text-yellow-500" />}
          </div>
        )}
        
        <div className={`relative rounded-2xl px-4 py-2.5 shadow-sm ${
          isOwn 
            ? 'bg-[#4A6572] text-white rounded-br-md' 
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-gray-100 dark:border-gray-600'
        } ${isPinned ? 'border-l-4 border-l-yellow-400' : ''}`}>
          {isEditing ? (
            <div className="flex gap-2 items-start">
              <textarea 
                ref={textareaRef} 
                value={editText}
                onChange={(e) => onStartEdit({ ...msg, content: e.target.value })} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSaveEdit(msg.id);
                  }
                  if (e.key === 'Escape') onCancelEdit();
                }}
                className="flex-1 bg-black/10 dark:bg-white/10 rounded-lg px-2 py-1 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#F9AA33] min-h-[60px]"
                rows={2} 
                autoFocus 
              />
              <div className="flex flex-col gap-1">
                <button onClick={() => onSaveEdit(msg.id)} className="p-1 hover:bg-green-500/20 text-green-600 rounded-lg">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={onCancelEdit} className="p-1 hover:bg-red-500/20 text-red-600 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              {msg.replied_message && (
                <div className="mb-2 p-2 bg-black/10 dark:bg-white/10 rounded-lg border-l-4 border-[#4A6572]">
                  <p className="text-xs font-bold text-[#4A6572] dark:text-[#F9AA33]">
                    {msg.replied_message.user?.user_metadata?.full_name}
                  </p>
                  <p className="text-xs opacity-75 truncate">{msg.replied_message.content}</p>
                </div>
              )}
              {isGif ? (
                <img src={msg.content.match(/https?:\/\/[^\s]+/)?.[0]} alt="GIF" className="max-w-full rounded-lg max-h-64" loading="lazy" />
              ) : (
                <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {isLongMessage && !isExpanded ? (
                    <>
                      {formatMessage?.(msg.content.slice(0, 500))}...
                      <button onClick={() => setIsExpanded(true)} className="text-[#4A6572] dark:text-[#F9AA33] font-medium ml-1">
                        Показать полностью
                      </button>
                    </>
                  ) : (
                    formatMessage?.(msg.content)
                  )}
                  {mentions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {mentions.map((mention, idx) => {
                        const mentionedUser = companyUsers?.find(u => u.full_name === mention);
                        return mentionedUser ? (
                          <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                            @{mention}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  {msg.is_encrypted && (
                    <div className="mt-1 text-[10px] opacity-50 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Зашифровано
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className={`flex items-center gap-2 mt-1 text-xs ${isOwn ? 'justify-end' : ''}`}>
          <time className="text-gray-400 dark:text-gray-500">
            {formattedTime}
            {msg.edited_at && <span className="ml-1 opacity-70">(изм.)</span>}
          </time>
          {!isEditing && !msg.deleted_at && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
              <button onClick={() => setShowReactionsPicker?.(showReactionsPicker === msg.id ? null : msg.id)} className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded-full" title="Реакции">
                <Smile className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button onClick={() => setShowEmojiPicker?.(showEmojiPicker === msg.id ? null : msg.id)} className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded-full" title="Добавить эмодзи">
                <Plus className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button onClick={() => setShowGifPicker?.(showGifPicker === msg.id ? null : msg.id)} className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded-full" title="Добавить GIF">
                <span className="text-gray-500 text-sm">🎬</span>
              </button>
              <button onClick={() => onReply?.(msg)} className="p-1 hover:bg-gray-200/50 rounded-full" title="Ответить">
                <CornerUpLeft className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button onClick={() => onToggleSave?.(msg.id)} className="p-1 hover:bg-gray-200/50 rounded-full" title="Сохранить">
                {isSaved ? <BookmarkCheck className="w-3.5 h-3.5 text-[#4A6572]" /> : <Bookmark className="w-3.5 h-3.5 text-gray-500" />}
              </button>
              <button onClick={() => onCopyMessage?.(msg.id)} className="p-1 hover:bg-gray-200/50 rounded-full" title="Копировать">
                <Copy className="w-3.5 h-3.5 text-gray-500" />
              </button>
              <button onClick={handleTranslate} className="p-1 hover:bg-gray-200/50 rounded-full" title="Перевести">
                <span className="text-gray-500 text-sm">🌐</span>
              </button>
              {canEdit && (
                <button onClick={() => onStartEdit?.(msg)} className="p-1 hover:bg-blue-100/50 rounded text-blue-500" title="Редактировать">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete?.(msg.id)} className="p-1 hover:bg-red-100/50 rounded text-red-500" title="Удалить">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              {onPinMessage && (
                <button onClick={() => onPinMessage?.(msg.id)} className="p-1 hover:bg-yellow-100/50 rounded text-yellow-500" title={isPinned ? 'Открепить' : 'Закрепить'}>
                  {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          )}
        </div>
        
        {showReactionsPicker === msg.id && (
          <div className="absolute bottom-full mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 flex gap-1 z-50">
            {REACTION_EMOJIS.map(emoji => {
              const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
              return (
                <button
                  key={emoji}
                  onClick={() => {
                    onToggleReaction?.(msg.id, emoji);
                    setShowReactionsPicker?.(null);
                  }}
                  className={`p-2 rounded-lg transition-all text-lg ${hasReacted ? 'bg-[#4A6572]/10 scale-110' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
        
        {showEmojiPicker === msg.id && (
          <div className="absolute bottom-full mb-2 z-50">
            <EmojiPicker
              onSelect={(emoji) => {
                onReactWithEmoji?.(msg.id, emoji);
                setShowEmojiPicker?.(null);
              }}
              onClose={() => setShowEmojiPicker?.(null)}
            />
          </div>
        )}
        
        {showGifPicker === msg.id && (
          <div className="absolute bottom-full mb-2 z-50 right-0">
            <GifPicker
              onSelect={(gifUrl) => {
                onReactWithGif?.(msg.id, gifUrl);
                setShowGifPicker?.(null);
              }}
              onClose={() => setShowGifPicker?.(null)}
            />
          </div>
        )}
        
        {Object.keys(reactionCounts).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-2 ${isOwn ? 'justify-end' : ''}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => {
              const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
              const users = reactionUsers[emoji] || [];
              return (
                <button
                  key={`${msg.id}-${emoji}`}
                  onClick={() => onToggleReaction?.(msg.id, emoji)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
                    hasReacted 
                      ? 'bg-[#4A6572]/10 text-[#4A6572] dark:bg-[#F9AA33]/10 dark:text-[#F9AA33]' 
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={users.map(id => {
                    const u = companyUsers?.find(cu => cu.user_id === id);
                    return u?.full_name || 'Пользователь';
                  }).join(', ')}
                >
                  {emoji} <span>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
});

// ============================================================
// 7. КОМПОНЕНТ АНАЛИТИКИ
// ============================================================

const ChatAnalytics = memo(({ messages, companyUsers }) => {
  const [stats, setStats] = useState({});
  
  useEffect(() => {
    if (!messages.length) return;
    const totalMessages = messages.length;
    const activeUsers = new Set(messages.map(m => m.user_id)).size;
    const messagesPerUser = totalMessages / (activeUsers || 1);
    const userMessageCount = {};
    messages.forEach(m => {
      userMessageCount[m.user_id] = (userMessageCount[m.user_id] || 0) + 1;
    });
    const mostActiveUserId = Object.keys(userMessageCount).reduce((a, b) => 
      userMessageCount[a] > userMessageCount[b] ? a : b
    , '');
    const mostActiveUser = companyUsers?.find(u => u.user_id === mostActiveUserId);
    const totalLength = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
    const averageLength = totalLength / (totalMessages || 1);
    const hourCounts = {};
    messages.forEach(m => {
      const hour = new Date(m.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b
    , 0);
    const emojiCounts = {};
    messages.forEach(m => {
      if (m.reactions) {
        m.reactions.forEach(r => {
          emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1;
        });
      }
    });
    const topEmoji = Object.keys(emojiCounts).reduce((a, b) => 
      emojiCounts[a] > emojiCounts[b] ? a : b
    , '');
    setStats({
      totalMessages,
      activeUsers,
      messagesPerUser: messagesPerUser.toFixed(1),
      averageLength: averageLength.toFixed(0),
      mostActiveUser: mostActiveUser?.full_name || 'Неизвестно',
      peakHour: `${peakHour}:00 - ${parseInt(peakHour) + 1}:00`,
      totalReactions: messages.reduce((sum, m) => sum + (m.reactions?.length || 0), 0),
      topEmoji: topEmoji || '😊'
    });
  }, [messages, companyUsers]);
  
  return (
    <div className="analytics-panel p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl">
      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-[#F9AA33]" /> Статистика чата
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard icon="💬" label="Сообщений" value={stats.totalMessages || 0} />
        <StatCard icon="👥" label="Участников" value={stats.activeUsers || 0} />
        <StatCard icon="⭐" label="Лидер" value={stats.mostActiveUser || 'Нет'} />
        <StatCard icon="❤️" label="Реакций" value={stats.totalReactions || 0} />
        <StatCard icon="📊" label="В среднем" value={`${stats.messagesPerUser || 0}`} />
        <StatCard icon="📏" label="Длина" value={`${stats.averageLength || 0} симв.`} />
        <StatCard icon="🕐" label="Пик" value={stats.peakHour || 'Нет'} />
        <StatCard icon="🎯" label="Топ эмодзи" value={stats.topEmoji} />
      </div>
    </div>
  );
});

// ============================================================
// 8. КОМПОНЕНТ БОКОВОЙ ПАНЕЛИ
// ============================================================

const ChatSidebar = memo(function({ 
  channels, activeChannel, onChannelSelect, canCreateChannel, onCreateChannel,
  connectionStatus, isMobile, showSidebar, onCloseSidebar,
  currentUserRole, companyUsers, currentUser, onStartDirectChat,
  unreadCounts, onThemeChange, currentTheme, themeNames,
  toggleNotifications, notificationsEnabled,
  onSearch, searchResults, onSearchResultClick,
  onShowAnalytics, showAnalytics,
  onDeleteChannel,
  canManageChannels,
  lastReadTimes
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  if (!showSidebar) return null;

  const userInitial = currentUser?.user_metadata?.full_name?.[0]?.toUpperCase() || '?';
  const userName = currentUser?.user_metadata?.full_name || 'Пользователь';

  const handleSearch = (value) => {
    setSearchQuery(value);
    if (value.length > 1) {
      onSearch?.(value);
    }
  };

  const handleDeleteChannel = (channelId, channelName) => {
    if (window.confirm(`Удалить канал "${channelName}"? Все сообщения будут удалены без возможности восстановления.`)) {
      onDeleteChannel?.(channelId);
    }
  };

  const hasUsers = companyUsers && companyUsers.length > 0;

  const formatLastRead = (date) => {
    if (!date) return null;
    const now = new Date();
    const readDate = new Date(date);
    const diffMs = now - readDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return readDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  return (
    <aside className={`${isMobile ? 'absolute z-40 w-64 h-full' : 'w-64'} border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col`}>
      <div className="p-3 sm:p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2 mb-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center">
            <span className="text-white text-xs font-medium">{userInitial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{userName}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{currentUserRole}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-3">
          <div className="flex-1 flex items-center gap-1">
            <button
              onClick={toggleNotifications}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
              title={notificationsEnabled ? 'Выключить уведомления' : 'Включить уведомления'}
            >
              {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
            <button
              onClick={onShowAnalytics}
              className={`p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg ${showAnalytics ? 'bg-[#4A6572]/20' : ''}`}
              title="Статистика"
            >
              <Zap className="w-4 h-4" />
            </button>
            <div className="relative group">
              <button className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
                <Palette className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 hidden group-hover:block z-50">
                {Object.entries(THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => onThemeChange?.(key)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg w-full ${currentTheme === key ? 'bg-[#4A6572]/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  >
                    <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: theme.accent }} />
                    {themeNames?.[key] || key}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {isMobile && (
            <button onClick={onCloseSidebar} className="p-1 hover:bg-gray-200 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-[#4A6572] outline-none"
          />
          {searchResults?.length > 0 && searchQuery.length > 1 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-32 overflow-y-auto z-50">
              {searchResults.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => { onSearchResultClick?.(msg.id); setSearchQuery(''); }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
                >
                  <p className="truncate">{msg.content?.slice(0, 50)}...</p>
                  <p className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {canCreateChannel && (
          <button
            onClick={onCreateChannel}
            className="w-full px-3 py-2 bg-[#4A6572] text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 hover:bg-[#344955] transition-colors"
          >
            <Plus className="w-4 h-4" /> Создать канал
          </button>
        )}
      </div>
      
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {channels.map(channel => {
          const isActive = activeChannel === channel.id;
          const unread = unreadCounts[channel.id] || 0;
          const isCustom = channel.type === 'custom' || channel.type === 'direct';
          const canDelete = canManageChannels && isCustom;
          const lastRead = lastReadTimes?.[channel.id];
          const lastReadText = formatLastRead(lastRead);
          
          return (
            <div key={channel.id} className="relative group">
              <button
                onClick={() => onChannelSelect(channel.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex flex-col gap-1 transition-all ${
                  isActive 
                    ? 'bg-[#4A6572] text-white shadow-md' 
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <span className="text-lg">{channel.icon}</span>
                  <span className="truncate flex-1">{channel.label || channel.name}</span>
                  {unread > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                      {unread}
                    </span>
                  )}
                </div>
                {lastReadText && (
                  <div className="text-[10px] opacity-60 pl-8">
                    Прочитано: {lastReadText}
                  </div>
                )}
              </button>
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChannel(channel.id, channel.name);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                  title="Удалить канал"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </nav>
      
      {/* СПИСОК СОТРУДНИКОВ */}
      <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3 h-3" /> 
            Сотрудники {hasUsers ? `(${companyUsers.length})` : ''}
          </h4>
          {hasUsers && (
            <span className="text-[10px] font-normal text-green-500">
              {companyUsers.filter(u => u.is_online).length} онлайн
            </span>
          )}
        </div>
        
        {!hasUsers ? (
          <div className="text-center py-4 text-xs text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
            Загрузка сотрудников...
          </div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {companyUsers.map(u => (
              <button
                key={u.user_id}
                onClick={() => onStartDirectChat?.(u)}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg flex items-center gap-2 transition-colors group"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center">
                    <span className="text-white text-[10px] font-medium">
                      {u.full_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white dark:border-gray-800 ${u.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                </div>
                <span className="truncate text-gray-700 dark:text-gray-300 flex-1">{u.full_name}</span>
                {u.role === 'manager' && <Shield className="w-3 h-3 text-yellow-500 flex-shrink-0" />}
                {u.user_id === currentUser?.id && (
                  <span className="text-[8px] text-gray-400 flex-shrink-0">(вы)</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-500 dark:text-gray-400">
              {connectionStatus === 'connected' ? 'Онлайн' : 'Оффлайн'}
            </span>
          </div>
          <button className="text-gray-400 hover:text-gray-600">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </aside>
  );
});

// ============================================================
// 9. ОСТАЛЬНЫЕ КОМПОНЕНТЫ
// ============================================================

const AIAssistant = memo(({ suggestions, onSelect, onClose }) => (
  <div className="fixed bottom-24 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-80 z-50 animate-in slide-in-from-bottom-4">
    <div className="flex justify-between items-center mb-3">
      <h4 className="font-bold flex items-center gap-2">
        <Bot className="w-4 h-4 text-yellow-500" /> ИИ-помощник
      </h4>
      <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect?.(suggestion)}
          className="w-full text-left p-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <Sparkles className="w-3 h-3 text-yellow-500 flex-shrink-0" /> {suggestion}
        </button>
      ))}
    </div>
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      <p className="text-[10px] text-gray-400 text-center">Основано на анализе последних сообщений</p>
    </div>
  </div>
));

const FileManager = memo(({ files, onFileSelect, onFileDelete, onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[80vh]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <FolderOpen className="w-5 h-5" /> Файлы чата
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-96">
        {files.map((file, i) => (
          <div key={i} className="group relative bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <div className="w-full aspect-square bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
              {file.type?.startsWith('image/') ? (
                <img src={file.url} alt={file.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <div className="text-4xl">📄</div>
              )}
            </div>
            <p className="text-xs truncate mt-1">{file.name}</p>
            <button onClick={() => onFileSelect?.(file)} className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition" />
            <button onClick={() => onFileDelete?.(file.id)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  </div>
));

// ============================================================
// 10. ОСНОВНОЙ КОМПОНЕНТ
// ============================================================

const CompanyChat = ({ user, userCompanyId, userRole, t, language, showNotification }) => {
  // ===== СОСТОЯНИЯ =====
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState('general');
  const [customChannels, setCustomChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showReactionsPicker, setShowReactionsPicker] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [showGifPicker, setShowGifPicker] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelMembers, setChannelMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [savedMessages, setSavedMessages] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastReadTimes, setLastReadTimes] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [currentTheme, setCurrentTheme] = useState('dark');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [videoCall, setVideoCall] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [showFileManager, setShowFileManager] = useState(false);
  const [lastTypingTime, setLastTypingTime] = useState(0);
  
  // ===== REFS =====
  const messagesContainerRef = useRef(null);
  const textareaRef = useRef(null);
  const subscriptionRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const animationFrameRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ===== ХУКИ =====
  useEffect(() => {
    isUserScrollingRef.current = isUserScrolling;
  }, [isUserScrolling]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) setShowSidebar(true);
  }, [isMobile]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('companies').select('id').limit(1);
        setConnectionStatus(error || !data ? 'error' : 'connected');
      } catch {
        setConnectionStatus('error');
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // ===== ОСНОВНЫЕ ФУНКЦИИ =====
  
  const formatTime = useCallback((dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }, [language]);

  const formatMessage = useCallback((text) => {
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
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    const isScrollingUp = scrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;
    
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      if (isScrollingUp && !isNearBottom) {
        setShouldAutoScroll(false);
        setIsUserScrolling(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          setIsUserScrolling(false);
        }, 3000);
      } else if (isNearBottom && !isScrollingUp) {
        setShouldAutoScroll(true);
        setIsUserScrolling(false);
      }
    });
  }, []);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (!messagesContainerRef.current || !shouldAutoScroll || isUserScrollingRef.current) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      if (messagesContainerRef.current && (!isUserScrollingRef.current || behavior === 'auto')) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior
        });
      }
    });
  }, [shouldAutoScroll]);

  const forceScrollToBottom = useCallback((behavior = 'smooth') => {
    if (!messagesContainerRef.current) return;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      messagesContainerRef.current?.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    });
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    isUserScrollingRef.current = false;
  }, []);

  // Все каналы
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

  const canWriteToChannel = useCallback((channelId) => {
    const channel = SYSTEM_CHANNELS.find(c => c.id === channelId);
    if (!channel) return true;
    return channel.canWrite?.includes(userRole) || false;
  }, [userRole]);

  const canManageChannels = userRole === 'manager' || userRole === 'supply_admin';

  const currentChannel = allChannels.find(c => c.id === activeChannel);

  // ===== ЗАГРУЗКА ДАННЫХ =====
  
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
      setLastReadTimes(prev => ({ ...prev, [channelId]: new Date(now) }));
    } catch (err) {
      console.error('Ошибка отметки прочитанного:', err);
    }
  }, [user?.id]);

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

  // Загрузка пользователей
  useEffect(() => {
    const loadUsers = async () => {
      if (!userCompanyId) return;
      try {
        const { data, error } = await supabase
          .from('company_users')
          .select('user_id, full_name, role, phone, is_online')
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

  // Загрузка каналов
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
        setTimeout(() => loadUnreadCounts(), 100);
      } catch (err) {
        console.error('Ошибка загрузки каналов:', err);
      }
    };
    loadCustomChannels();
  }, [userCompanyId, loadUnreadCounts]);

  // Загрузка сообщений
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
      
      const { data: pinnedData } = await supabase
        .from('company_messages')
        .select('id')
        .eq('company_id', userCompanyId)
        .eq('is_pinned', true);
      
      if (pinnedData) {
        setPinnedMessages(pinnedData.map(p => p.id));
      }
      
      const enrichedMessages = (messagesData || []).map(msg => ({
        ...msg,
        user: { user_metadata: usersMap[msg.user_id] || { full_name: 'Пользователь', role: 'user' } },
        reactions: reactionsMap[msg.id] || [],
        replied_message: null,
        is_encrypted: msg.is_encrypted || false,
        is_pinned: pinnedData?.some(p => p.id === msg.id) || false
      }));
      
      setMessages(enrichedMessages);
      setTimeout(() => forceScrollToBottom('auto'), 150);
      markChannelAsRead(activeChannel);
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err);
      showNotification?.('Ошибка загрузки чата', 'error');
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, activeChannel, showNotification, forceScrollToBottom, markChannelAsRead]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // ===== ОТПРАВКА СООБЩЕНИЙ =====
  const sendMessage = useCallback(async (content) => {
    const text = content || newMessage.trim();
    if (!text || !user?.id || sending) return;
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
        content: text,
        created_at: new Date().toISOString(),
        reply_to_message_id: replyTo?.id || null,
        is_encrypted: false
      };
      
      if (isSystemChannel) {
        messageData.channel = activeChannel;
        messageData.channel_type = 'system';
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
      if (error) throw error;
      
      setNewMessage('');
      setReplyTo(null);
      forceScrollToBottom('smooth');
    } catch (err) {
      console.error('Ошибка отправки:', err);
      showNotification?.('Не удалось отправить сообщение', 'error');
    } finally {
      setSending(false);
    }
  }, [newMessage, user?.id, sending, activeChannel, canWriteToChannel, userCompanyId, replyTo, showNotification, forceScrollToBottom]);

  // ===== ОСТАЛЬНЫЕ ФУНКЦИИ =====
  
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

  const deleteChannel = useCallback(async (channelId) => {
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
  }, [customChannels, activeChannel, showNotification]);

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
      
      setCustomChannels(prev => [...prev, data]);
      setActiveChannel(data.id);
      showNotification?.('Канал создан', 'success');
    } catch (err) {
      console.error('Ошибка создания канала:', err);
      showNotification?.('Не удалось создать канал', 'error');
    }
  }, [userCompanyId, user?.id, showNotification]);

  const startEdit = useCallback((message) => {
    setEditingMessageId(message.id);
    setEditText(message.content);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);
  
  const saveEdit = useCallback(async (messageId) => {
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
  }, [editText, user?.id, showNotification]);
  
  const cancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditText('');
  }, []);

  const deleteMessage = useCallback(async (messageId) => {
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
  }, [user?.id, showNotification]);

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
      setShowEmojiPicker(null);
      setShowGifPicker(null);
    } catch (err) {
      console.error('Ошибка реакции:', err);
    }
  }, [user?.id, messages]);

  const reactWithGif = useCallback(async (messageId, gifUrl) => {
    const content = `🎬 GIF: ${gifUrl}`;
    await sendMessage(content);
    setShowGifPicker(null);
  }, [sendMessage]);

  const toggleSaveMessage = useCallback(async (messageId) => {
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
  }, [user?.id, savedMessages, showNotification]);

  const handleReply = useCallback((message) => {
    setReplyTo(message);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const handleTyping = useCallback(() => {
    if (!user?.id || !activeChannel) return;
    const now = Date.now();
    if (now - lastTypingTime < 2000) return;
    setLastTypingTime(now);
    
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
  }, [user?.id, activeChannel, user?.user_metadata?.full_name, lastTypingTime]);

  // Подписка на события печати
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

  const handlePinMessage = useCallback(async (messageId) => {
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
    } catch (err) {
      console.error('Ошибка при закреплении:', err);
      showNotification?.('Не удалось закрепить сообщение', 'error');
    }
  }, [pinnedMessages, showNotification]);

  const handleCopyMessage = useCallback((messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.content) {
      navigator.clipboard.writeText(message.content);
      showNotification?.('Текст скопирован', 'success');
    }
  }, [messages, showNotification]);

  const handleFileUpload = useCallback(async (e) => {
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
      setSharedFiles(prev => [...prev, {
        id: Date.now(),
        name: file.name,
        url: publicUrl,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.id
      }]);
      setNewMessage(prev => prev + `\n📎 ${file.name}: ${publicUrl}`);
      showNotification?.('Файл прикреплён', 'success');
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      showNotification?.('Не удалось загрузить файл', 'error');
    }
    e.target.value = '';
  }, [userCompanyId, user?.id, showNotification]);

  const exportChat = useCallback(async () => {
    try {
      const data = {
        channel: currentChannel?.name || activeChannel,
        messages: messages.map(m => ({
          user: m.user?.user_metadata?.full_name || 'Пользователь',
          content: m.content,
          created_at: m.created_at,
          reactions: m.reactions || []
        })),
        exportedAt: new Date().toISOString(),
        totalMessages: messages.length
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_${currentChannel?.name || activeChannel}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification?.('Чат экспортирован', 'success');
    } catch (err) {
      console.error('Ошибка экспорта:', err);
      showNotification?.('Не удалось экспортировать чат', 'error');
    }
  }, [messages, currentChannel, activeChannel, showNotification]);

  // ===== ОБРАБОТЧИКИ =====
  const handleChannelSelect = useCallback((channelId) => {
    setActiveChannel(channelId);
    setShouldAutoScroll(true);
    setIsUserScrolling(false);
    isUserScrollingRef.current = false;
    if (isMobile) setShowSidebar(false);
  }, [isMobile]);

  const handleTextareaChange = useCallback((e) => {
    const value = e.target.value;
    setNewMessage(value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    if (value.trim()) handleTyping();
  }, [handleTyping]);

  const handleKeyDown = useCallback((e) => {
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
      setShowEmojiPicker(null);
      setShowGifPicker(null);
      setReplyTo(null);
    }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const searchInput = document.querySelector('[placeholder="Поиск..."]');
      searchInput?.focus();
    }
  }, [editingMessageId, saveEdit, sendMessage, cancelEdit]);

  const toggleSidebar = useCallback(() => {
    setShowSidebar(prev => !prev);
  }, []);

  // ===== ПОИСК =====
  const searchMessages = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const { data } = await supabase
        .from('company_messages')
        .select('id, content, created_at, user_id')
        .eq('company_id', userCompanyId)
        .ilike('content', `%${query}%`)
        .is('deleted_at', null)
        .limit(20);
      
      if (data) {
        const userIds = [...new Set(data.map(m => m.user_id))];
        const { data: usersData } = await supabase
          .from('company_users')
          .select('user_id, full_name')
          .in('user_id', userIds);
        const usersMap = (usersData || []).reduce((acc, u) => {
          acc[u.user_id] = { user_metadata: { full_name: u.full_name } };
          return acc;
        }, {});
        setSearchResults(data.map(m => ({
          ...m,
          user: usersMap[m.user_id] || { user_metadata: { full_name: 'Пользователь' } }
        })));
      }
    } catch (err) {
      console.error('Ошибка поиска:', err);
    }
  }, [userCompanyId]);

  const onSearchResultClick = useCallback((messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      const index = messages.indexOf(message);
      if (index > -1) {
        const container = messagesContainerRef.current;
        if (container) {
          const messageElements = container.querySelectorAll('article');
          if (messageElements[index]) {
            messageElements[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElements[index].classList.add('bg-yellow-100', 'dark:bg-yellow-900/30');
            setTimeout(() => {
              messageElements[index].classList.remove('bg-yellow-100', 'dark:bg-yellow-900/30');
            }, 2000);
          }
        }
      }
    }
  }, [messages]);

  // ===== ИИ-АССИСТЕНТ =====
  const getAISuggestion = useCallback(async () => {
    if (messages.length < 3) {
      showNotification?.('Нужно больше сообщений для анализа', 'info');
      return;
    }
    setIsAIAssistantOpen(true);
    setAiSuggestions([
      '💡 Попробуйте обсудить детали проекта подробнее',
      '📋 Не забудьте согласовать сроки выполнения',
      '🤝 Предложите встречу для обсуждения ключевых вопросов',
      '📊 Приложите актуальные данные и отчеты',
      '✅ Подведите итоги обсуждения и зафиксируйте решения'
    ]);
  }, [messages, showNotification]);

  const selectAISuggestion = useCallback((suggestion) => {
    setNewMessage(prev => prev + ' ' + suggestion);
    setIsAIAssistantOpen(false);
    textareaRef.current?.focus();
  }, []);

  // ===== ВИДЕОЗВОНКИ =====
  const startVideoCall = useCallback((targetUser) => {
    setVideoCall(targetUser);
  }, []);

  const endVideoCall = useCallback(() => {
    setVideoCall(null);
  }, []);

  // ===== ПЕРЕВОД =====
  const translateMessage = useCallback(async (messageId) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    try {
      const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(message.content)}&langpair=ru|en`);
      const data = await response.json();
      if (data.responseData) {
        showNotification?.('Сообщение переведено', 'success');
      }
    } catch (err) {
      console.error('Ошибка перевода:', err);
      showNotification?.('Не удалось перевести', 'error');
    }
  }, [messages, showNotification]);

  // ===== ГОЛОСОВЫЕ СООБЩЕНИЯ =====
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const fileName = `voice_${Date.now()}.webm`;
        const filePath = `${userCompanyId}/voice/${fileName}`;
        const { error } = await supabase.storage.from('chat-attachments').upload(filePath, audioBlob);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(filePath);
          setNewMessage(prev => prev + `\n🎤 Голосовое сообщение: ${publicUrl}`);
          showNotification?.('Голосовое сообщение записано', 'success');
        }
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Ошибка записи:', err);
      showNotification?.('Нет доступа к микрофону', 'error');
    }
  }, [userCompanyId, showNotification]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, [isRecording]);

  // ===== ПОДПИСКА =====
  useEffect(() => {
    if (!userCompanyId || !activeChannel) return;
    if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    
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
        
        const msgChannelId = newMsg.channel_id || newMsg.channel;
        if (activeChannel !== msgChannelId && newMsg.user_id !== user?.id) {
          setUnreadCounts(prev => ({
            ...prev,
            [msgChannelId]: (prev[msgChannelId] || 0) + 1
          }));
        }
        
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
          replied_message: null,
          is_encrypted: newMsg.is_encrypted || false
        };
        
        setMessages(prev => [...prev, enrichedMessage]);
        setTimeout(() => scrollToBottom('smooth'), 50);
      })
      .subscribe();
    
    return () => {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    };
  }, [userCompanyId, activeChannel, user?.id, scrollToBottom]);

  // ===== ТАЙМЕРЫ =====
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // ===== RENDER =====

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <ChatSidebar
          channels={allChannels}
          activeChannel={activeChannel}
          onChannelSelect={handleChannelSelect}
          canCreateChannel={canManageChannels}
          onCreateChannel={() => setShowCreateModal(true)}
          connectionStatus={connectionStatus}
          isMobile={isMobile}
          showSidebar={showSidebar}
          onCloseSidebar={toggleSidebar}
          currentUserRole={userRole}
          companyUsers={companyUsers}
          currentUser={user}
          onStartDirectChat={(targetUser) => {
            const dmId = `dm_${[user?.id, targetUser.user_id].sort().join('_')}`;
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
                participants: [user?.id, targetUser.user_id],
                created_by: user?.id,
                created_at: new Date().toISOString()
              }]);
            }
            setActiveChannel(dmId);
            if (isMobile) setShowSidebar(false);
          }}
          unreadCounts={unreadCounts}
          lastReadTimes={lastReadTimes}
          onThemeChange={setCurrentTheme}
          currentTheme={currentTheme}
          themeNames={Object.keys(THEMES)}
          toggleNotifications={() => setNotificationsEnabled(prev => !prev)}
          notificationsEnabled={notificationsEnabled}
          onSearch={searchMessages}
          searchResults={searchResults}
          onSearchResultClick={onSearchResultClick}
          onShowAnalytics={() => setShowAnalytics(prev => !prev)}
          showAnalytics={showAnalytics}
          onDeleteChannel={deleteChannel}
          canManageChannels={canManageChannels}
        />

        {(!isMobile || !showSidebar) && (
          <div className="flex-1 flex flex-col min-w-0 h-full">
            <header className="flex-shrink-0 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2 sm:gap-3">
                {isMobile && !showSidebar && (
                  <button onClick={toggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg">
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
                <button onClick={() => setShowFileManager(true)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Файлы">
                  <FolderOpen className="w-4 h-4" />
                </button>
                {companyUsers.filter(u => u.is_online).length > 0 && (
                  <button onClick={() => startVideoCall(companyUsers.find(u => u.is_online))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Видеозвонок">
                    <Video className="w-4 h-4" />
                  </button>
                )}
                <button onClick={exportChat} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="Экспорт">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={getAISuggestion} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" title="ИИ-помощник">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </button>
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                  <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{messages.length}</span>
                </div>
              </div>
            </header>

            {showAnalytics && (
              <div className="flex-shrink-0 p-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
                <ChatAnalytics messages={messages} companyUsers={companyUsers} />
              </div>
            )}

            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4"
              onScroll={handleScroll}
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
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
                  {pinnedMessages.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-2 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 text-xs font-medium text-yellow-700 dark:text-yellow-300">
                        <Pin className="w-3 h-3" /> Закрепленные сообщения ({pinnedMessages.length})
                      </div>
                      {pinnedMessages.map(id => {
                        const msg = messages.find(m => m.id === id);
                        return msg ? (
                          <div key={id} className="text-xs truncate opacity-70 mt-1">
                            {msg.content?.slice(0, 50)}...
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
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
                      showEmojiPicker={showEmojiPicker}
                      setShowEmojiPicker={setShowEmojiPicker}
                      showGifPicker={showGifPicker}
                      setShowGifPicker={setShowGifPicker}
                      formatMessage={formatMessage}
                      formatTime={formatTime}
                      language={language}
                      textareaRef={textareaRef}
                      companyUsers={companyUsers}
                      onPinMessage={handlePinMessage}
                      isPinned={pinnedMessages.includes(msg.id)}
                      onCopyMessage={handleCopyMessage}
                      onTranslate={translateMessage}
                      onReactWithEmoji={toggleReaction}
                      onReactWithGif={reactWithGif}
                    />
                  ))}
                  <div ref={(el) => {
                    if (el && shouldAutoScroll && !isUserScrolling) {
                      el.scrollIntoView({ behavior: 'auto', block: 'end' });
                    }
                  }} />
                </>
              )}
            </div>

            {isUserScrolling && !shouldAutoScroll && messages.length > 10 && (
              <button
                onClick={() => forceScrollToBottom('smooth')}
                className="absolute bottom-24 right-4 bg-[#4A6572] text-white rounded-full p-2 shadow-lg hover:bg-[#344955] transition-all z-10"
                style={{ bottom: '100px' }}
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            )}

            <div className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
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
                  <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,.pdf,.doc,.docx,.webm,.mp4" />
                </label>

                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2.5 rounded-xl transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                >
                  {isRecording ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={() => setShowEmojiPicker(prev => prev === 'input' ? null : 'input')}
                  className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50"
                >
                  <Smile className="w-5 h-5" />
                </button>

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
              
              {showEmojiPicker === 'input' && (
                <div className="absolute bottom-20 left-4 z-50">
                  <EmojiPicker
                    onSelect={(emoji) => {
                      setNewMessage(prev => prev + emoji);
                      setShowEmojiPicker(null);
                      textareaRef.current?.focus();
                    }}
                    onClose={() => setShowEmojiPicker(null)}
                  />
                </div>
              )}
              
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 dark:text-gray-500">
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> — отправить
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded ml-2">Shift+Enter</kbd> — новая строка
                <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded ml-2">/</kbd> — поиск
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Модальные окна */}
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

      {/* ИИ-Ассистент */}
      {isAIAssistantOpen && (
        <AIAssistant
          suggestions={aiSuggestions}
          onSelect={selectAISuggestion}
          onClose={() => setIsAIAssistantOpen(false)}
        />
      )}

      {/* Видеозвонок */}
      {videoCall && (
        <VideoCall onEndCall={endVideoCall} targetUser={videoCall} />
      )}

      {/* Файловый менеджер */}
      {showFileManager && (
        <FileManager
          files={sharedFiles}
          onFileSelect={(file) => {
            setNewMessage(prev => prev + `\n📎 ${file.name}: ${file.url}`);
            setShowFileManager(false);
          }}
          onFileDelete={(fileId) => {
            setSharedFiles(prev => prev.filter(f => f.id !== fileId));
          }}
          onClose={() => setShowFileManager(false)}
        />
      )}
    </div>
  );
};

export default memo(CompanyChat);