// src/components/CompanyChat.jsx
import React, { 
  useState, useEffect, useRef, useCallback, useMemo, memo 
} from 'react';
import { 
  Send, Smile, Paperclip, Edit2, Trash2, X, Check, 
  AtSign, Loader2, MessageCircle, Shield, User, AlertCircle,
  Plus, Users, Settings, Search
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { 
  logChatAccess, 
  getUserContext, 
  shouldLogFeature 
} from '../utils/auditLogger';

// === Конфигурация ===
const SUPABASE_URL = 'https://lcfooydickfghjlqpivw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZm9veWRpY2tmZ2hqbHFwaXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjIwMjcsImV4cCI6MjA5MTkzODAyN30.f6TqW2G_nbUeD_wmUc0wJLRiSIw9m95Iwv-BR-FbSb4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  global: { headers: { apikey: SUPABASE_ANON_KEY } },
  realtime: { params: { apikey: SUPABASE_ANON_KEY } }
});

// === Константы и Роли ===
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  SUPPLY_ADMIN: 'supply_admin',
  MASTER: 'master',
  USER: 'user'
};

const CHANNEL_TYPES = {
  SYSTEM: 'system',
  CUSTOM: 'custom'
};

const SYSTEM_CHANNELS = [
  { id: 'general', label: '# Общий', icon: '💬', description: 'Общие вопросы', type: CHANNEL_TYPES.SYSTEM, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SUPPLY_ADMIN, ROLES.MASTER, ROLES.USER] },
  { id: 'supply', label: '📦 Снабжение', icon: '📦', description: 'Закупки и материалы', type: CHANNEL_TYPES.SYSTEM, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SUPPLY_ADMIN, ROLES.MASTER] },
  { id: 'foremen', label: '👷 Прорабы', icon: '👷', description: 'Для прорабов', type: CHANNEL_TYPES.SYSTEM, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.MASTER] },
  { id: 'announcements', label: '📢 Объявления', icon: '📢', description: 'Важные объявления', type: CHANNEL_TYPES.SYSTEM, adminOnly: true, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SUPPLY_ADMIN] }
];

const REACTION_EMOJIS = Object.freeze(['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '🤔']);
const CHANNEL_ICONS = ['💬', '📦', '👷', '📢', '🔧', '📋', '🎯', '💡', '🚀', '⭐'];

// ─────────────────────────────────────────────────────────────
// 🧩 Helper: Проверка прав доступа
// ─────────────────────────────────────────────────────────────
const canAccessChannel = (channel, userRole, isMember = false) => {
  if (!userRole) return false;
  if (userRole === ROLES.SUPER_ADMIN) return true;
  if (channel.type === CHANNEL_TYPES.CUSTOM && channel.is_private) {
    return isMember;
  }
  if (channel.adminOnly) {
    return [ROLES.MANAGER, ROLES.SUPPLY_ADMIN].includes(userRole);
  }
  return channel.roles?.includes(userRole) || channel.roles?.includes(ROLES.USER);
};

const canCreateChannel = (userRole) => {
  return [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SUPPLY_ADMIN].includes(userRole);
};

const canManageChannel = (channel, userId, userRole) => {
  if (userRole === ROLES.SUPER_ADMIN) return true;
  if (channel.created_by === userId) return true;
  if (channel.type === CHANNEL_TYPES.SYSTEM) return [ROLES.MANAGER, ROLES.SUPPLY_ADMIN].includes(userRole);
  return false;
};

const canEditMessage = (msg, userId, userRole) => {
  if (!userId) return false;
  if (msg.user_id === userId) return true;
  if (userRole === ROLES.SUPER_ADMIN) return true;
  return false;
};

const canDeleteMessage = (msg, userId, userRole) => {
  if (!userId) return false;
  if (msg.user_id === userId) return true;
  if (userRole === ROLES.SUPER_ADMIN) return true;
  if ([ROLES.MANAGER, ROLES.SUPPLY_ADMIN].includes(userRole)) return true;
  return false;
};

// ─────────────────────────────────────────────────────────────
// 🧩 CreateChannelModal Component
// ─────────────────────────────────────────────────────────────
const CreateChannelModal = ({ isOpen, onClose, onCreate, companyUsers, currentUser, t }) => {
  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('💬');
  const [isPrivate, setIsPrivate] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return companyUsers.filter(u => u.user_id !== currentUser?.id);
    const query = searchQuery.toLowerCase();
    return companyUsers.filter(u => 
      u.user_id !== currentUser?.id && 
      (u.full_name?.toLowerCase().includes(query) || u.role?.toLowerCase().includes(query))
    );
  }, [searchQuery, companyUsers, currentUser?.id]);

  const toggleUser = (user) => {
    setSelectedUsers(prev => 
      prev.some(u => u.user_id === user.user_id)
        ? prev.filter(u => u.user_id !== user.user_id)
        : [...prev, user]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!channelName.trim()) {
      setError(t?.('chat.channelNameRequired') || 'Введите название канала');
      return;
    }
    
    setCreating(true);
    setError(null);
    
    try {
      await onCreate({
        name: channelName.trim(),
        description: description.trim(),
        icon: selectedIcon,
        is_private: isPrivate,
        memberIds: isPrivate ? selectedUsers.map(u => u.user_id) : []
      });
      setChannelName('');
      setDescription('');
      setSelectedIcon('💬');
      setIsPrivate(true);
      setSelectedUsers([]);
      setSearchQuery('');
      onClose();
    } catch (err) {
      console.error('❌ Create channel error:', err);
      setError(err.message || t?.('chat.channelCreateError') || 'Ошибка создания канала');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#4A6572]" />
            {t?.('chat.createChannel') || 'Создать канал'}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t?.('chat.channelName') || 'Название канала'} *
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder={t?.('chat.channelNamePlaceholder') || 'Например: Проект А...'}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent text-sm"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t?.('chat.description') || 'Описание'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t?.('chat.descriptionPlaceholder') || 'Краткое описание...'}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] focus:border-transparent text-sm resize-none"
              rows={2}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t?.('chat.icon') || 'Иконка'}
            </label>
            <div className="flex flex-wrap gap-2">
              {CHANNEL_ICONS.map(icon => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  aria-pressed={selectedIcon === icon}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                    selectedIcon === icon
                      ? 'bg-[#4A6572] text-white ring-2 ring-[#4A6572]/30 scale-110'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t?.('chat.privateChannel') || 'Приватный канал'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isPrivate 
                  ? (t?.('chat.privateDesc') || 'Только приглашённые') 
                  : (t?.('chat.publicDesc') || 'Доступен всем')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              role="switch"
              aria-checked={isPrivate}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isPrivate ? 'bg-[#4A6572]' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                isPrivate ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>

          {isPrivate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t?.('chat.inviteMembers') || 'Пригласить участников'}
                {selectedUsers.length > 0 && (
                  <span className="ml-2 text-xs text-[#4A6572] dark:text-[#F9AA33]">
                    {selectedUsers.length} выбрано
                  </span>
                )}
              </label>
              
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t?.('chat.searchUsers') || 'Поиск...'}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>

              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-xl">
                {filteredUsers.length === 0 ? (
                  <p className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                    {t?.('chat.noUsersFound') || 'Пользователи не найдены'}
                  </p>
                ) : (
                  filteredUsers.map(user => {
                    const isSelected = selectedUsers.some(u => u.user_id === user.user_id);
                    return (
                      <button
                        key={user.user_id}
                        type="button"
                        onClick={() => toggleUser(user)}
                        className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                          isSelected ? 'bg-[#4A6572]/5' : ''
                        }`}
                        aria-pressed={isSelected}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-[#4A6572] border-[#4A6572]' : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">
                            {user.full_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/30">
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t?.('chat.cancel') || 'Отмена'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={creating || !channelName.trim()}
            className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-all flex items-center gap-2 ${
              creating || !channelName.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#4A6572] to-[#344955] hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{t?.('chat.creating') || 'Создание...'}</>
            ) : (
              <><Plus className="w-4 h-4" />{t?.('chat.create') || 'Создать'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🧩 ChannelSettingsModal Component
// ─────────────────────────────────────────────────────────────
const ChannelSettingsModal = ({ isOpen, onClose, channel, companyUsers, currentUser, onAddMember, onRemoveMember, t }) => {
  const [members, setMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    if (!channel?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('channel_members')
        .select(`user_id, role, joined_at, company_users:company_users!channel_members_user_id_fkey(full_name, role, phone)`)
        .eq('channel_id', channel.id);
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('❌ Load members error:', err);
    } finally {
      setLoading(false);
    }
  }, [channel?.id]);

  useEffect(() => {
    if (isOpen && channel?.id) {
      loadMembers();
    }
  }, [isOpen, channel?.id, loadMembers]);

  const handleAddMember = async (userId) => {
    try {
      await onAddMember(channel.id, userId);
      loadMembers();
    } catch (err) { console.error('❌ Add member error:', err); }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm(t?.('chat.confirmRemoveMember') || 'Удалить участника?')) return;
    try {
      await onRemoveMember(channel.id, userId);
      loadMembers();
    } catch (err) { console.error('❌ Remove member error:', err); }
  };

  const availableUsers = useMemo(() => {
    const memberIds = members.map(m => m.user_id);
    return companyUsers.filter(u => !memberIds.includes(u.user_id) && u.user_id !== currentUser?.id);
  }, [companyUsers, members, currentUser?.id]);

  const filteredAvailableUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers.slice(0, 10);
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(u => u.full_name?.toLowerCase().includes(query) || u.role?.toLowerCase().includes(query)).slice(0, 10);
  }, [searchQuery, availableUsers]);

  if (!isOpen || !channel) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-xl">{channel.icon}</span>{channel.name}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Закрыть">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />{t?.('chat.members') || 'Участники'} ({members.length})
            </h4>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : (
              <div className="space-y-2">
                {members.map(member => {
                  const userData = member.company_users;
                  const isCreator = channel.created_by === member.user_id;
                  const isCurrentUser = member.user_id === currentUser?.id;
                  return (
                    <div key={member.user_id} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center">
                        <span className="text-white text-xs font-medium">{userData?.full_name?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {userData?.full_name}{isCreator && <span className="ml-2 text-[10px] text-[#F9AA33]">создатель</span>}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{userData?.role} • {member.role}</p>
                      </div>
                      {!isCreator && !isCurrentUser && canManageChannel(channel, currentUser?.id, currentUser?.user_metadata?.role) && (
                        <button onClick={() => handleRemoveMember(member.user_id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={t?.('chat.removeMember') || 'Удалить'}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {canManageChannel(channel, currentUser?.id, currentUser?.user_metadata?.role) && channel.is_private && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t?.('chat.addMembers') || 'Добавить участников'}</h4>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t?.('chat.searchUsers') || 'Поиск...'} className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm" />
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {filteredAvailableUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">{t?.('chat.noMoreUsers') || 'Нет доступных пользователей'}</p>
                ) : (
                  filteredAvailableUsers.map(user => (
                    <button key={user.user_id} onClick={() => handleAddMember(user.user_id)} className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors text-left">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center">
                        <span className="text-white text-xs font-medium">{user.full_name?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.full_name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p></div>
                      <Plus className="w-4 h-4 text-[#4A6572]" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🧩 MessageItem Component
// ─────────────────────────────────────────────────────────────
const MessageItem = memo(function MessageItem({ 
  msg, user, userRole, isOwn, isEditing, editText, onStartEdit, onSaveEdit, 
  onCancelEdit, onDelete, onToggleReaction, showReactionsPicker, setShowReactionsPicker, 
  formatMessage, formatTime, t, language, textareaRef 
}) {
  const isDeleted = msg.deleted_at;
  const isEdited = msg.edited_at;
  
  const canEdit = canEditMessage(msg, user?.id, userRole);
  const canDelete = canDeleteMessage(msg, user?.id, userRole);

  const reactionCounts = useMemo(() => {
    if (!msg.reactions?.length) return {};
    return msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {});
  }, [msg.reactions]);

  return (
    <article className={`group flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0 shadow-sm ${isOwn ? 'order-2' : ''}`}>
        <span className="text-white text-xs font-medium">{msg.user?.user_metadata?.full_name?.[0]?.toUpperCase() || '?'}</span>
      </div>
      <div className={`max-w-[85%] md:max-w-[75%] ${isOwn ? 'order-1' : ''}`}>
        {!isOwn && !isDeleted && (
          <div className="flex items-center gap-2 mb-1 pl-1">
            <span className="text-xs font-bold text-[#4A6572] dark:text-[#F9AA33]">{msg.user?.user_metadata?.full_name || (t?.('chat.user') || 'Пользователь')}</span>
            {msg.user?.user_metadata?.role && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                {msg.user.user_metadata.role === 'super_admin' ? 'Admin' : msg.user.user_metadata.role}
              </span>
            )}
          </div>
        )}
        <div className={`relative rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
          isOwn ? 'bg-[#4A6572] text-white rounded-br-md' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-gray-100 dark:border-gray-600'
        }`}>
          {isDeleted ? (
            <span className="text-gray-400 dark:text-gray-500 italic text-sm flex items-center gap-1"><Trash2 className="w-3 h-3" /> [Удалено]</span>
          ) : isEditing ? (
            <div className="flex gap-2 items-start">
              <textarea ref={textareaRef} value={editText} onChange={(e) => onStartEdit({ ...msg, message: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSaveEdit(msg.id); } if (e.key === 'Escape') onCancelEdit(); }} className="flex-1 bg-black/10 dark:bg-white/10 rounded-lg px-2 py-1 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#F9AA33] min-h-[60px]" rows={2} autoFocus />
              <div className="flex flex-col gap-1">
                <button onClick={() => onSaveEdit(msg.id)} className="p-1 hover:bg-green-500/20 text-green-600 rounded-lg" aria-label="Сохранить"><Check className="w-4 h-4" /></button>
                <button onClick={onCancelEdit} className="p-1 hover:bg-red-500/20 text-red-600 rounded-lg" aria-label="Отмена"><X className="w-4 h-4" /></button>
              </div>
            </div>
          ) : (
            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">{formatMessage?.(msg.content, msg.id)}</div>
          )}
        </div>
        <div className={`flex items-center gap-2 mt-1 text-xs ${isOwn ? 'justify-end' : ''}`}>
          <time className="text-gray-400 dark:text-gray-500 select-none" dateTime={msg.created_at} title={new Date(msg.created_at).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}>
            {formatTime?.(msg.created_at, language)}
            {isEdited && !isDeleted && <span className="ml-1 opacity-70">{t?.('chat.edited') || '(изм.)'}</span>}
          </time>
          {!isDeleted && !isEditing && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative">
                <button onClick={() => setShowReactionsPicker?.(showReactionsPicker === msg.id ? null : msg.id)} className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-600/50 rounded-full" aria-label="Реакция"><Smile className="w-3.5 h-3.5 text-gray-500" /></button>
                {showReactionsPicker === msg.id && (
                  <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-wrap gap-1 z-50">
                    {REACTION_EMOJIS.map(emoji => {
                      const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
                      return (
                        <button key={emoji} onClick={() => onToggleReaction?.(msg.id, emoji)} className={`p-2 rounded-lg transition-all text-lg ${hasReacted ? 'bg-[#4A6572]/10 scale-110' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`} aria-pressed={hasReacted}>{emoji}</button>
                      );
                    })}
                  </div>
                )}
              </div>
              {(canEdit || canDelete) && (
                <div className="flex items-center pl-1 border-l border-gray-300 dark:border-gray-600 ml-1">
                  {canEdit && <button onClick={() => onStartEdit?.(msg)} className="p-1 hover:bg-blue-100/50 rounded text-blue-500" aria-label="Редактировать"><Edit2 className="w-3.5 h-3.5" /></button>}
                  {canDelete && <button onClick={() => onDelete?.(msg.id)} className="p-1 hover:bg-red-100/50 rounded text-red-500" aria-label="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              )}
            </div>
          )}
        </div>
        {Object.keys(reactionCounts).length > 0 && !isEditing && !isDeleted && (
          <div className={`flex flex-wrap gap-1.5 mt-2 ${isOwn ? 'justify-end' : ''}`}>
            {Object.entries(reactionCounts).map(([emoji, count]) => {
              const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.user_id === user?.id);
              return (
                <button key={`${msg.id}-${emoji}`} onClick={() => onToggleReaction?.(msg.id, emoji)} className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${hasReacted ? 'bg-[#4A6572]/10 text-[#4A6572] dark:text-[#F9AA33]' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'}`} aria-pressed={hasReacted}>{emoji} <span className="opacity-80">{count}</span></button>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
});

// ─────────────────────────────────────────────────────────────
// 🧩 MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const CompanyChat = ({ user, userCompanyId, userRole, t, language, showNotification }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState('general');
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [showReactionsPicker, setShowReactionsPicker] = useState(null);
  const [showMentions, setShowMentions] = useState(false); // eslint-disable-line no-unused-vars
  const [mentionQuery, setMentionQuery] = useState('');
  const [companyUsers, setCompanyUsers] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false); // eslint-disable-line no-unused-vars
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeCustomChannel, setActiveCustomChannel] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const channelRef = useRef(activeChannel);
  const subscriptionRef = useRef(null);
  const mentionTimerRef = useRef(null);
  const formatCacheRef = useRef(new Map());

  const formatTime = useCallback((dateString, lang) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const allChannels = useMemo(() => {
    const system = SYSTEM_CHANNELS.filter(ch => canAccessChannel(ch, userRole));
    const custom = channels.filter(ch => {
      const isMember = ch.members?.some(m => m.user_id === user?.id);
      return canAccessChannel(ch, userRole, isMember);
    });
    return [...system, ...custom];
  }, [channels, userRole, user?.id]);

  useEffect(() => {
    if (!allChannels.find(ch => ch.id === activeChannel)) {
      setActiveChannel(allChannels[0]?.id || 'general');
    }
  }, [allChannels, activeChannel]);

  const formatMessage = useCallback((text, messageId) => {
    if (!text) return null;
    const cacheKey = `${messageId}_${text.length}`;
    const cached = formatCacheRef.current.get(cacheKey);
    if (cached) return cached;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    const result = parts.map((part, i) => {
      if (part?.match?.(urlRegex)) return <a key={`url-${i}`} href={part} target="_blank" rel="noopener noreferrer" className="text-[#4A6572] dark:text-[#F9AA33] underline hover:no-underline">{part}</a>;
      if (part?.startsWith?.('@')) return <span key={`mention-${i}`} className="font-bold text-[#4A6572] dark:text-[#F9AA33] bg-[#4A6572]/5 dark:bg-[#F9AA33]/5 px-0.5 rounded">{part}</span>;
      return <span key={`text-${i}`}>{part}</span>;
    });
    if (formatCacheRef.current.size > 100) formatCacheRef.current.clear();
    formatCacheRef.current.set(cacheKey, result);
    return result;
  }, []);

  useEffect(() => { channelRef.current = activeChannel; }, [activeChannel]);

  useEffect(() => {
    if (!userCompanyId) return;
    let mounted = true;
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase.from('company_users').select('user_id, full_name, role, phone').eq('company_id', userCompanyId).eq('is_active', true).order('full_name', { ascending: true });
        if (error) throw error;
        if (mounted) setCompanyUsers(data || []);
      } catch (err) { console.error('❌ Error loading users:', err); }
    };
    loadUsers();
    return () => { mounted = false; };
  }, [userCompanyId]);

  const loadCustomChannels = useCallback(async () => {
    if (!userCompanyId) return;
    try {
      const { data: channelsData, error: chError } = await supabase.from('company_channels').select('*').eq('company_id', userCompanyId).eq('is_archived', false).order('created_at', { ascending: false });
      if (chError) throw chError;
      const { data: memberships, error: memError } = await supabase.from('channel_members').select('channel_id').eq('user_id', user?.id);
      if (memError) throw memError;
      const memberChannelIds = new Set(memberships?.map(m => m.channel_id) || []);
      const accessibleChannels = (channelsData || []).filter(ch => {
        if (ch.is_private) return memberChannelIds.has(ch.id);
        return true;
      }).map(ch => ({ ...ch, type: CHANNEL_TYPES.CUSTOM, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.SUPPLY_ADMIN, ROLES.MASTER, ROLES.USER], members: ch.is_private ? memberships?.filter(m => m.channel_id === ch.id) : [] }));
      setChannels(accessibleChannels);
    } catch (err) { console.error('❌ Load custom channels error:', err); }
  }, [userCompanyId, user?.id]);

  useEffect(() => { loadCustomChannels(); }, [loadCustomChannels]);

  const loadMessages = useCallback(async () => {
    if (!userCompanyId) return;
    setLoading(true);
    try {
      const isCustomChannel = channels.find(c => c.id === activeChannel);
      let query = supabase.from('company_messages').select('*');
      if (isCustomChannel) query = query.eq('channel_id', activeChannel);
      else query = query.eq('channel', activeChannel).eq('channel_type', CHANNEL_TYPES.SYSTEM);
      const { data: messagesData, error: msgError } = await query.eq('company_id', userCompanyId).is('deleted_at', null).order('created_at', { ascending: true }).limit(100);
      if (msgError) throw msgError;
      const messageIds = messagesData?.map(m => m.id) || [];
      let reactionsMap = {};
      if (messageIds.length > 0) {
        const { data: reactionsData } = await supabase.from('message_reactions').select('message_id, emoji, user_id').in('message_id', messageIds);
        if (reactionsData) reactionsMap = reactionsData.reduce((acc, r) => { if (!acc[r.message_id]) acc[r.message_id] = []; acc[r.message_id].push({ emoji: r.emoji, user_id: r.user_id }); return acc; }, {});
      }
      const userIds = [...new Set(messagesData?.map(m => m.user_id).filter(Boolean))];
      let usersMap = {};
      if (userIds.length > 0) {
        const { data: usersData } = await supabase.from('company_users').select('user_id, full_name, role, phone').in('user_id', userIds).eq('company_id', userCompanyId);
        usersMap = (usersData || []).reduce((acc, u) => { acc[u.user_id] = { email: null, user_metadata: { full_name: u.full_name, role: u.role, phone: u.phone } }; return acc; }, {});
      }
      const enrichedMessages = (messagesData || []).map(msg => ({ ...msg, user: usersMap[msg.user_id] || { email: null, user_metadata: { full_name: 'Пользователь', role: 'unknown' } }, reactions: reactionsMap[msg.id] || [] }));
      setMessages(enrichedMessages);
    } catch (err) { console.error('Ошибка загрузки сообщений:', err); showNotification?.(t?.('chat.sendMessageError') || 'Ошибка загрузки чата', 'error'); } finally { setLoading(false); }
  }, [userCompanyId, activeChannel, channels, showNotification, t]);

  useEffect(() => { loadMessages(); }, [activeChannel, loadMessages]);

  useEffect(() => {
    if (!userCompanyId || !activeChannel) return;
    if (subscriptionRef.current) { subscriptionRef.current.unsubscribe(); subscriptionRef.current = null; }
    const isCustomChannel = channels.find(c => c.id === activeChannel);
    const channelName = `chat:${userCompanyId}:${activeChannel}`;
    const subscription = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'company_messages', filter: isCustomChannel ? `channel_id=eq.${activeChannel}` : `company_id=eq.${userCompanyId} AND channel=eq.${activeChannel} AND channel_type=eq.${CHANNEL_TYPES.SYSTEM}` }, async (payload) => {
        if (payload.new?.deleted_at) return;
        try {
          const [reactionsRes, userRes] = await Promise.all([supabase.from('message_reactions').select('emoji, user_id').eq('message_id', payload.new.id), supabase.from('company_users').select('full_name, role, phone').eq('user_id', payload.new.user_id).maybeSingle()]);
          const enrichedMessage = { ...payload.new, user: userRes.data ? { email: null, user_metadata: { full_name: userRes.data.full_name, role: userRes.data.role, phone: userRes.data.phone } } : { email: null, user_metadata: { full_name: 'Пользователь', role: 'unknown' } }, reactions: reactionsRes.data || [] };
          setMessages(prev => prev.some(m => m.id === enrichedMessage.id) ? prev : [...prev, enrichedMessage]);
          if (messagesEndRef.current) { const container = messagesEndRef.current.parentElement; if (container && container.scrollHeight - container.scrollTop - container.clientHeight < 100) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' }); }
        } catch (err) { console.error('❌ Error processing new message:', err); }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'company_messages', filter: `company_id=eq.${userCompanyId}` }, (payload) => setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, (payload) => setMessages(prev => prev.map(m => ({ ...m, reactions: m.reactions?.filter(r => !(r.message_id === payload.old?.message_id && r.user_id === payload.old?.user_id)) || [] }))))
      .subscribe((status) => { if (status === 'SUBSCRIBED') setConnectionStatus('connected'); else if (status === 'CHANNEL_ERROR') setConnectionStatus('error'); else setConnectionStatus('disconnected'); });
    subscriptionRef.current = subscription;
    return () => { if (subscriptionRef.current) subscriptionRef.current.unsubscribe(); };
  }, [userCompanyId, activeChannel, channels]);

  useEffect(() => {
    if (userCompanyId && user?.id) {
      const userCtx = getUserContext(user, null, userRole, userCompanyId);
      if (shouldLogFeature('chat', userCompanyId, {})) logChatAccess(supabase, userCtx, 'open').catch(err => console.warn('[CHAT] Аудит не записан:', err));
    }
  }, [userCompanyId, user, userRole]);

  const sendMessage = useCallback(async () => {
    const content = newMessage.trim();
    if (!content || !user?.id || sending) return;
    const { data: { session } } = await supabase.auth.getSession();
    const safeCompanyId = session?.user?.user_metadata?.company_id || userCompanyId;
    if (!safeCompanyId) { showNotification?.('Ошибка: компания не указана', 'error'); return; }
    setSending(true);
    try {
      const isCustomChannel = channels.find(c => c.id === activeChannel);
      const mentionRegex = /@([^\s,;!?.]+)/g;
      const mentions = [...content.matchAll(mentionRegex)].map(m => m[1].toLowerCase());
      const mentionedUsers = companyUsers.filter(u => mentions.includes(u.full_name?.toLowerCase().replace(/\s+/g, '')));
      const messageData = { company_id: safeCompanyId, user_id: user.id, content: content, attachments: [], created_at: new Date().toISOString() };
      if (isCustomChannel) { messageData.channel_id = activeChannel; messageData.channel_type = CHANNEL_TYPES.CUSTOM; }
      else { messageData.channel = activeChannel; messageData.channel_type = CHANNEL_TYPES.SYSTEM; }
      const { data, error } = await supabase.from('company_messages').insert([messageData]).select().single();
      if (error) throw error;
      if (mentionedUsers.length > 0 && data?.id) await supabase.from('message_mentions').insert(mentionedUsers.map(u => ({ message_id: data.id, mentioned_user_id: u.user_id, created_at: new Date().toISOString() })));
      try { const userCtx = getUserContext(user, null, userRole, safeCompanyId); await logChatAccess(supabase, userCtx, 'send_message'); } catch (auditErr) { console.warn('[CHAT] Аудит не записан:', auditErr); }
      setNewMessage(''); setShowMentions(false); textareaRef.current?.focus();
    } catch (err) { console.error('❌ Send error:', err); showNotification?.(t?.('chat.sendError') || 'Не удалось отправить', 'error'); } finally { setSending(false); }
  }, [newMessage, user, userCompanyId, activeChannel, companyUsers, sending, showNotification, t, userRole, channels]);

  const handleCreateChannel = async (channelData) => {
    try {
      const { data: newChannel, error: chError } = await supabase.from('company_channels').insert([{ company_id: userCompanyId, name: channelData.name, description: channelData.description, icon: channelData.icon, created_by: user.id, is_private: channelData.is_private }]).select().single();
      if (chError) throw chError;
      await supabase.from('channel_members').insert([{ channel_id: newChannel.id, user_id: user.id, role: 'admin' }]);
      if (channelData.is_private && channelData.memberIds?.length > 0) await supabase.from('channel_members').insert(channelData.memberIds.map(userId => ({ channel_id: newChannel.id, user_id: userId, role: 'member' })));
      await loadCustomChannels();
      setActiveChannel(newChannel.id);
      showNotification?.(t?.('chat.channelCreated') || 'Канал создан', 'success');
      const userCtx = getUserContext(user, null, userRole, userCompanyId);
      await logChatAccess(supabase, userCtx, 'create_channel');
    } catch (err) { console.error('❌ Create channel error:', err); throw err; }
  };

  const handleAddMember = async (channelId, userId) => { await supabase.from('channel_members').insert([{ channel_id: channelId, user_id: userId, role: 'member' }]); showNotification?.(t?.('chat.memberAdded') || 'Участник добавлен', 'success'); };
  const handleRemoveMember = async (channelId, userId) => { await supabase.from('channel_members').delete().eq('channel_id', channelId).eq('user_id', userId); showNotification?.(t?.('chat.memberRemoved') || 'Участник удалён', 'info'); };

  const handleTextareaChange = useCallback((e) => {
    const value = e.target.value; setNewMessage(value);
    if (value.includes('@')) {
      if (mentionTimerRef.current) clearTimeout(mentionTimerRef.current);
      mentionTimerRef.current = setTimeout(() => { const match = value.match(/@([^\s,;!?.]+)$/); if (match) { setShowMentions(true); setMentionQuery(match[0]); } else { setShowMentions(false); } }, 100);
    } else { setShowMentions(false); }
    e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }, []);

  const cancelEdit = useCallback(() => { setEditingMessageId(null); setEditText(''); }, []);
  const saveEdit = useCallback(async (messageId) => { const content = editText.trim(); if (!content) return; try { await supabase.from('company_messages').update({ content, edited_at: new Date().toISOString() }).eq('id', messageId).eq('user_id', user?.id); setEditingMessageId(null); setEditText(''); showNotification?.(t?.('chat.messageUpdated') || 'Сообщение обновлено', 'success'); } catch (err) { console.error('❌ Edit error:', err); showNotification?.(t?.('chat.editError') || 'Ошибка', 'error'); } }, [editText, user?.id, showNotification, t]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (editingMessageId) saveEdit(editingMessageId); else sendMessage(); return; }
    if (e.key === 'Escape') { setShowMentions(false); setShowReactionsPicker(null); if (editingMessageId) cancelEdit(); }
  }, [editingMessageId, sendMessage, saveEdit, cancelEdit]);

  const startEdit = useCallback((message) => { if (!canEditMessage(message, user?.id, userRole)) return; setEditingMessageId(message.id); setEditText(message.content); setTimeout(() => textareaRef.current?.focus(), 50); }, [user?.id, userRole]);
  const deleteMessage = useCallback(async (messageId) => { if (!window.confirm(t?.('chat.confirmDelete') || 'Удалить?')) return; try { await supabase.from('company_messages').update({ content: '[Удалено]', deleted_at: new Date().toISOString() }).eq('id', messageId).eq('user_id', user?.id); showNotification?.(t?.('chat.deleted') || 'Удалено', 'info'); } catch (err) { console.error('❌ Delete error:', err); showNotification?.(t?.('chat.deleteError') || 'Ошибка', 'error'); } }, [user?.id, showNotification, t]);
  const toggleReaction = useCallback(async (messageId, emoji) => { if (!user?.id) return; const message = messages.find(m => m.id === messageId); const hasReaction = message?.reactions?.some(r => r.emoji === emoji && r.user_id === user.id); try { if (hasReaction) await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji); else await supabase.from('message_reactions').insert([{ message_id: messageId, user_id: user.id, emoji, created_at: new Date().toISOString() }]); } catch (err) { console.error('❌ Reaction error:', err); showNotification?.(t?.('chat.reactionError') || 'Ошибка', 'error'); } setShowReactionsPicker(null); }, [user?.id, messages, showNotification, t]);

  const handleFileUpload = useCallback(async (e) => {
    const file = e?.target?.files?.[0];
    if (!file || !userCompanyId) return;
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (file.size > maxSize) { showNotification?.(t?.('chat.fileTooLarge') || 'Файл слишком большой (макс. 10MB)', 'error'); if (e?.target) e.target.value = ''; return; }
    if (!allowedTypes.includes(file.type)) { showNotification?.(t?.('chat.fileTypeNotAllowed') || 'Недопустимый тип файла', 'error'); if (e?.target) e.target.value = ''; return; }
    setUploadingFile(true);
    try {
      const fileName = `${userCompanyId}/${Date.now()}_${file.name.replace(/[^a-z0-9.-]/gi, '_')}`;
      const { error: uploadError } = await supabase.storage.from('chat-attachments').upload(fileName, file, { upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
      const fileLink = `\n📎 [${file.name}](${publicUrl})`;
      setNewMessage(prev => prev + fileLink);
      showNotification?.(t?.('chat.fileAttached') || 'Файл прикреплён', 'success');
    } catch (err) { console.error('❌ Upload error:', err); showNotification?.(t?.('chat.uploadError') || 'Не удалось загрузить файл', 'error'); } finally { setUploadingFile(false); if (e?.target) e.target.value = ''; }
  }, [userCompanyId, showNotification, t]);

  // eslint-disable-next-line no-unused-vars
  const filteredMentions = useMemo(() => { if (!mentionQuery.trim() || mentionQuery === '@') return companyUsers.slice(0, 5); const query = mentionQuery.toLowerCase().replace('@', '').trim(); return companyUsers.filter(u => u.full_name?.toLowerCase().includes(query)).slice(0, 5); }, [mentionQuery, companyUsers]);
  // eslint-disable-next-line no-unused-vars
  const insertMention = useCallback((userName) => { setNewMessage(prev => prev.replace(/@([^\s]*)$/, `@${userName} `)); setShowMentions(false); setMentionQuery(''); textareaRef.current?.focus(); }, []);

  // ✅ Исправленный cleanup-эффект для formatCacheRef
  useEffect(() => {
    // Копируем значение рефа в локальную переменную для безопасного использования в cleanup
    const cacheRef = formatCacheRef;
    const timerRef = mentionTimerRef;
    const subRef = subscriptionRef;
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      // Используем локальную ссылку на реф, а не форматCacheRef.current напрямую
      const cache = cacheRef.current;
      if (cache && typeof cache.clear === 'function') cache.clear();
      if (subRef.current) subRef.current.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentChannel = [...SYSTEM_CHANNELS, ...channels].find(c => c.id === activeChannel);
  const isCustomChannel = currentChannel?.type === CHANNEL_TYPES.CUSTOM;
  const canManageCurrentChannel = currentChannel && canManageChannel(currentChannel, user?.id, userRole);

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      <aside className="w-64 border-r border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/30 p-4 hidden md:flex flex-col">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2"><MessageCircle className="w-4 h-4" /> {t?.('chat.channels') || 'Каналы'}</h3>
          {canCreateChannel(userRole) && <button onClick={() => setShowCreateModal(true)} className="p-1.5 hover:bg-[#4A6572]/10 dark:hover:bg-[#F9AA33]/10 rounded-lg text-[#4A6572] dark:text-[#F9AA33] transition-colors" title={t?.('chat.createChannel') || 'Создать канал'} aria-label="Создать канал"><Plus className="w-4 h-4" /></button>}
        </div>
        <nav className="space-y-1 flex-1 overflow-y-auto">
          {allChannels.map(channel => {
            const isActive = activeChannel === channel.id;
            const isSystem = channel.type === CHANNEL_TYPES.SYSTEM;
            return (
              <button key={channel.id} onClick={() => setActiveChannel(channel.id)} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium flex items-center gap-3 transition-all ${isActive ? 'bg-[#4A6572] text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}`} aria-current={isActive ? 'page' : undefined}>
                <span className="text-lg">{channel.icon}</span><span className="truncate flex-1">{channel.label || channel.name}</span>
                {(!isSystem && channel.is_private || isSystem && channel.adminOnly) && <Shield className={`w-3 h-3 ${isActive ? 'text-white/80' : 'text-gray-400'}`} />}
              </button>
            );
          })}
        </nav>
        {isCustomChannel && canManageCurrentChannel && <button onClick={() => { setActiveCustomChannel(currentChannel); setShowSettingsModal(true); }} className="mt-3 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-[#4A6572] dark:hover:text-[#F9AA33] flex items-center gap-2 transition-colors"><Settings className="w-3.5 h-3.5" />{t?.('chat.channelSettings') || 'Настройки'}</button>}
        <div className="mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50 px-2"><div className="flex items-center gap-2 text-xs"><span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} /><span className="text-gray-500 dark:text-gray-400">{connectionStatus === 'connected' ? 'Онлайн' : 'Оффлайн'}</span></div></div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="md:hidden"><select value={activeChannel} onChange={(e) => setActiveChannel(e.target.value)} className="text-sm bg-gray-100 dark:bg-gray-700 rounded-lg px-2 py-1">{allChannels.map(ch => <option key={ch.id} value={ch.id}>{ch.label || ch.name}</option>)}</select></div>
            <div className="flex items-center gap-3"><span className="text-2xl bg-gray-100 dark:bg-gray-700 w-10 h-10 rounded-full flex items-center justify-center">{currentChannel?.icon}</span><div><h2 className="font-bold text-gray-900 dark:text-white">{currentChannel?.label || currentChannel?.name}</h2><p className="text-xs text-gray-500 dark:text-gray-400">{currentChannel?.description}</p></div></div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500"><MessageCircle className="w-4 h-4" /><span>{messages.length}</span></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#4A6572]" /></div> : messages.length === 0 ? <div className="text-center py-12 text-gray-500"><p>{t?.('chat.noMessages') || 'Нет сообщений'}</p></div> : messages.map(msg => <MessageItem key={msg.id} msg={msg} user={user} userRole={userRole} isOwn={msg.user_id === user?.id} isEditing={editingMessageId === msg.id} editText={editText} onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={cancelEdit} onDelete={deleteMessage} onToggleReaction={toggleReaction} showReactionsPicker={showReactionsPicker} setShowReactionsPicker={setShowReactionsPicker} formatMessage={formatMessage} formatTime={formatTime} t={t} language={language} textareaRef={textareaRef} />)}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-end gap-2">
            <label className="p-2.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50" title={t?.('chat.attachFile') || 'Прикрепить файл'}>
              {uploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
              <input type="file" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" accept="image/*,.pdf,.doc,.docx" />
            </label>
            <div className="flex-1 relative">
              <textarea ref={textareaRef} value={newMessage} onChange={handleTextareaChange} onKeyDown={handleKeyDown} placeholder={t?.('chat.placeholder') || 'Введите сообщение...'} className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700/50 rounded-xl focus:ring-2 focus:ring-[#4A6572] resize-none text-sm" rows={1} style={{ minHeight: '44px', maxHeight: '120px' }} />
            </div>
            <button onClick={sendMessage} disabled={!newMessage.trim() || sending} className={`p-2.5 rounded-xl ${!newMessage.trim() || sending ? 'bg-gray-200 cursor-not-allowed' : 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white'}`} aria-label="Отправить">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <CreateChannelModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreateChannel} companyUsers={companyUsers} currentUser={user} t={t} />
      <ChannelSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} channel={activeCustomChannel} companyUsers={companyUsers} currentUser={user} onAddMember={handleAddMember} onRemoveMember={handleRemoveMember} t={t} />
    </div>
  );
};

export default memo(CompanyChat);