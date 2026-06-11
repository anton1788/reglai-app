// src/components/TaskBoard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, MoreVertical, Trash2, Edit3, Calendar, User, Clock, 
  CheckCircle, XCircle, AlertCircle, Link as LinkIcon, MessageSquare,
  BarChart3, Search, TrendingUp, ArrowUpRight, Filter, X, Send,
  Flag, Paperclip, LayoutGrid, List, Eye, EyeOff, Settings,
  RefreshCw, Zap, Award, Target, Briefcase, Users, Loader2, Activity,
  Menu, Home, ChevronDown
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

// ─────────────────────────────────────────────────────────────
// 🎨 КОМПОНЕНТ КАРТОЧКИ ЗАДАЧИ (МОБИЛЬНАЯ ВЕРСИЯ)
// ─────────────────────────────────────────────────────────────
const TaskCard = ({ task, onEdit, onDelete, onOpenComments, applications, showNotification, userRole }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const canEdit = userRole === 'manager' || userRole === 'supply_admin' || userRole === 'director';
  const canDelete = userRole === 'manager' || userRole === 'director';
  
  const priorityConfig = {
    low: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', border: 'border-l-emerald-500', label: 'Низкий', icon: '🟢' },
    medium: { color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', border: 'border-l-amber-500', label: 'Средний', icon: '🟡' },
    high: { color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300', border: 'border-l-rose-500', label: 'Высокий', icon: '🔴' }
  };
  
  const statusConfig = {
    pending: { bg: 'bg-gray-50 dark:bg-gray-800/50', border: 'border-l-4 border-gray-400', icon: '📋', label: 'Новая' },
    in_progress: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-l-4 border-blue-500', icon: '⏳', label: 'В работе' },
    received: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-l-4 border-emerald-500', icon: '✅', label: 'Выполнена' },
    canceled: { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-l-4 border-rose-500', icon: '❌', label: 'Отменена' }
  };
  
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'received' && task.status !== 'canceled';
  const daysUntilDue = task.due_date ? Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  
  const getDaysText = () => {
    if (!daysUntilDue && daysUntilDue !== 0) return null;
    if (daysUntilDue === 0) return 'Сегодня';
    if (daysUntilDue === 1) return 'Завтра';
    if (daysUntilDue > 0) return `Через ${daysUntilDue} дн.`;
    return `Просрочено ${Math.abs(daysUntilDue)} дн.`;
  };
  
  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => canEdit && e.dataTransfer.setData('taskId', task.id)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 300)}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-3 transition-all duration-200 overflow-hidden touch-manipulation
        ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
        ${isHovered ? 'shadow-md' : 'shadow-sm'}
        ${statusConfig[task.status]?.border}
      `}
    >
      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base leading-tight line-clamp-2 flex-1">
            {task.title}
          </h4>
          
          {(canEdit || canDelete) && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>
              {showMenu && (
                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                  {canEdit && (
                    <button
                      onClick={() => { onEdit(task); setShowMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" /> Редактировать
                    </button>
                  )}
                  <button
                    onClick={() => { onOpenComments(task); setShowMenu(false); }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Комментарии ({task.comments_count || 0})
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => { onDelete(task.id); setShowMenu(false); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Удалить
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {task.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>
        )}
        
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`text-xs px-2.5 py-1.5 rounded-full font-medium ${priorityConfig[task.priority]?.color}`}>
            {priorityConfig[task.priority]?.icon} {priorityConfig[task.priority]?.label}
          </span>
          
          {task.application_id && (
            <button 
              className="text-xs px-2.5 py-1.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 flex items-center gap-1.5 min-h-[36px]"
              onClick={(e) => {
                e.stopPropagation();
                const app = applications?.find(a => a.id === task.application_id);
                if (app) {
                  showNotification?.(`📋 Заявка: ${app.object_name}`, 'info');
                }
              }}
            >
              <LinkIcon className="w-3 h-3" /> 
              Заявка
            </button>
          )}
          
          {task.assigned_to && (
            <span className="text-xs px-2.5 py-1.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <User className="w-3 h-3" />
              {task.assigned_name || 'Назначен'}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          {task.due_date && (
            <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-rose-600' : daysUntilDue <= 2 && daysUntilDue > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{getDaysText() || new Date(task.due_date).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
          
          {task.comments_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{task.comments_count}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🎨 МОДАЛЬНОЕ ОКНО (АДАПТИВНОЕ)
// ─────────────────────────────────────────────────────────────
const TaskModal = ({ isOpen, onClose, onSave, task, applications, companyUsers }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    application_id: '',
    status: 'pending',
    assigned_to: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileModal, setIsMobileModal] = useState(false);
  
  useEffect(() => {
    setIsMobileModal(window.innerWidth < 640);
    const handleResize = () => setIsMobileModal(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        application_id: task.application_id || '',
        status: task.status || 'pending',
        assigned_to: task.assigned_to || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        application_id: '',
        status: 'pending',
        assigned_to: ''
      });
    }
  }, [task]);
  
  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    setIsSubmitting(true);
    await onSave(formData);
    setIsSubmitting(false);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {task ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {task ? 'Редактировать задачу' : 'Новая задача'}
            </h3>
            <button onClick={onClose} className="p-2 min-w-[44px] min-h-[44px] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Название <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Введите название задачи"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={isMobileModal ? 4 : 3}
              placeholder="Подробное описание задачи"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Приоритет</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">🟢 Низкий</option>
                <option value="medium">🟡 Средний</option>
                <option value="high">🔴 Высокий</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Статус</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="pending">📋 Новая</option>
                <option value="in_progress">⏳ В работе</option>
                <option value="received">✅ Выполнена</option>
                <option value="canceled">❌ Отменена</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Срок выполнения</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Исполнитель</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">-- Не назначен --</option>
                {companyUsers?.map(user => (
                  <option key={user.user_id} value={user.user_id}>{user.full_name} ({user.role})</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <LinkIcon className="w-4 h-4 inline mr-1" />
              Привязать к заявке
            </label>
            <select
              value={formData.application_id}
              onChange={(e) => setFormData({ ...formData, application_id: e.target.value })}
              className="w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">-- Не привязано --</option>
              {applications?.map(app => (
                <option key={app.id} value={app.id}>
                  {app.object_name} - {app.foreman_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium min-w-[80px]"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.title.trim() || isSubmitting}
            className="px-6 py-3 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2 min-w-[100px] justify-center"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            {task ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 💬 КОММЕНТАРИИ (АДАПТИВНЫЕ)
// ─────────────────────────────────────────────────────────────
const TaskCommentsModal = ({ isOpen, onClose, task, user, showNotification }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const loadComments = useCallback(async () => {
    if (!task?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
    } finally {
      setIsLoading(false);
    }
  }, [task?.id]);
  
  useEffect(() => {
    if (isOpen) loadComments();
  }, [isOpen, loadComments]);
  
  const addComment = async () => {
    if (!newComment.trim() || !task?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert([{
          task_id: task.id,
          user_id: user?.id,
          user_email: user?.email,
          content: newComment.trim(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      setComments([...comments, data]);
      setNewComment('');
      showNotification('Комментарий добавлен', 'success');
    } catch (err) {
      console.error('Ошибка добавления комментария:', err);
      showNotification('Ошибка добавления комментария', 'error');
    }
  };
  
  if (!isOpen || !task) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Комментарии
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 line-clamp-1">{task.title}</p>
          </div>
          <button onClick={onClose} className="p-2 min-w-[44px] min-h-[44px] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p>Нет комментариев</p>
              <p className="text-sm mt-1">Будьте первым, кто оставит комментарий</p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs sm:text-sm font-medium">
                    {comment.user_email?.[0]?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 dark:bg-gray-700/50 rounded-xl p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {comment.user_email?.split('@')[0] || 'Пользователь'}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words">{comment.content}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(comment.created_at).toLocaleString('ru-RU')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 sm:p-5 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#4A6572] to-[#344955] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs sm:text-sm font-medium">
                {user?.email?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addComment()}
                className="flex-1 px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Напишите комментарий..."
              />
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="px-4 py-3 min-w-[60px] bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 📊 АНАЛИТИКА (АДАПТИВНАЯ)
// ─────────────────────────────────────────────────────────────
const TaskAnalytics = ({ tasks, onClose }) => {
  const [isMobileAnalytics, setIsMobileAnalytics] = useState(false);
  
  useEffect(() => {
    setIsMobileAnalytics(window.innerWidth < 640);
    const handleResize = () => setIsMobileAnalytics(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const stats = useMemo(() => {
    const total = tasks.length;
    const byStatus = {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      received: tasks.filter(t => t.status === 'received').length,
      canceled: tasks.filter(t => t.status === 'canceled').length
    };
    const byPriority = {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length
    };
    const overdue = tasks.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'received' && t.status !== 'canceled'
    ).length;
    const completionRate = total > 0 ? Math.round((byStatus.received / total) * 100) : 0;
    const withApplications = tasks.filter(t => t.application_id).length;
    
    return { total, byStatus, byPriority, overdue, withApplications, completionRate };
  }, [tasks]);

  const statusColors = {
    pending: { bg: 'bg-gray-500', light: 'bg-gray-100' },
    in_progress: { bg: 'bg-blue-500', light: 'bg-blue-100' },
    received: { bg: 'bg-emerald-500', light: 'bg-emerald-100' },
    canceled: { bg: 'bg-rose-500', light: 'bg-rose-100' }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Аналитика задач
            </h3>
            <button onClick={onClose} className="p-2 min-w-[44px] min-h-[44px] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-[#4A6572] to-[#344955] text-white p-3 sm:p-5 rounded-2xl shadow-lg">
              <p className="text-xs sm:text-sm opacity-80 mb-1">Всего задач</p>
              <p className="text-2xl sm:text-4xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-3 sm:p-5 rounded-2xl shadow-lg">
              <p className="text-xs sm:text-sm opacity-80 mb-1">Выполнено</p>
              <p className="text-2xl sm:text-4xl font-bold">{stats.byStatus.received}</p>
            </div>
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 text-white p-3 sm:p-5 rounded-2xl shadow-lg">
              <p className="text-xs sm:text-sm opacity-80 mb-1">Просрочено</p>
              <p className="text-2xl sm:text-4xl font-bold">{stats.overdue}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-3 sm:p-5 rounded-2xl shadow-lg">
              <p className="text-xs sm:text-sm opacity-80 mb-1">Завершено</p>
              <p className="text-2xl sm:text-4xl font-bold">{stats.completionRate}%</p>
            </div>
          </div>
          
          <div className={`grid ${isMobileAnalytics ? 'grid-cols-1' : 'lg:grid-cols-2'} gap-4 sm:gap-6`}>
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 sm:p-5 rounded-2xl">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Activity className="w-5 h-5 text-[#4A6572]" />
                По статусам
              </h4>
              <div className="space-y-4">
                {Object.entries(stats.byStatus).map(([status, count]) => (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status]?.bg}`}></div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {status === 'pending' ? 'Новые' : status === 'in_progress' ? 'В работе' : status === 'received' ? 'Выполнены' : 'Отменены'}
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${statusColors[status]?.bg}`}
                        style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 sm:p-5 rounded-2xl">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Flag className="w-5 h-5 text-[#4A6572]" />
                По приоритетам
              </h4>
              <div className="space-y-4">
                {Object.entries(stats.byPriority).map(([priority, count]) => (
                  <div key={priority} className="space-y-1">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{priority === 'low' ? '🟢' : priority === 'medium' ? '🟡' : '🔴'}</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {priority === 'low' ? 'Низкий' : priority === 'medium' ? 'Средний' : 'Высокий'}
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${priority === 'low' ? 'bg-emerald-500' : priority === 'medium' ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 sm:p-4 rounded-xl">
              <p className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300 mb-1">📎 Привязано к заявкам</p>
              <p className="text-xl sm:text-2xl font-bold text-indigo-800 dark:text-indigo-200">{stats.withApplications}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 sm:p-4 rounded-xl">
              <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mb-1">👥 Активных задач</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-200">{stats.total - stats.byStatus.received - stats.byStatus.canceled}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🎯 ОСНОВНОЙ КОМПОНЕНТ TASKBOARD (МОБИЛЬНАЯ ВЕРСИЯ)
// ─────────────────────────────────────────────────────────────
const TaskBoard = ({ user, userCompanyId, applications, showNotification, userRole }) => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedTaskForComments, setSelectedTaskForComments] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [companyUsers, setCompanyUsers] = useState([]);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (mobile) {
        setViewMode('list');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const canCreateTasks = userRole === 'manager' || userRole === 'supply_admin' || userRole === 'director';
  const canEditTasks = userRole === 'manager' || userRole === 'supply_admin' || userRole === 'director';
  
  // Загрузка пользователей компании
  useEffect(() => {
    const loadUsers = async () => {
      if (!userCompanyId) return;
      const { data } = await supabase
        .from('company_users')
        .select('user_id, full_name, role')
        .eq('company_id', userCompanyId)
        .eq('is_active', true);
      if (data) setCompanyUsers(data);
    };
    loadUsers();
  }, [userCompanyId]);
  
  const columns = [
    { id: 'pending', title: 'Новые', color: 'gray', icon: '📋', bg: 'bg-gray-50 dark:bg-gray-800/50' },
    { id: 'in_progress', title: 'В работе', color: 'blue', icon: '⏳', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'received', title: 'Выполнены', color: 'green', icon: '✅', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { id: 'canceled', title: 'Отменены', color: 'red', icon: '❌', bg: 'bg-rose-50 dark:bg-rose-900/20' }
  ];
  
  const loadTasks = useCallback(async () => {
    if (!userCompanyId) {
      console.log('⚠️ Нет company_id, задачи не загружаются');
      return;
    }
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('created_at', { ascending: false });
      
      if (userRole === 'master' || userRole === 'foreman') {
        query = query.or(`assigned_to.eq.${user?.id},created_by.eq.${user?.id}`);
      }
      
      const { data: tasksData, error: tasksError } = await query;
      if (tasksError) throw tasksError;
      
      const tasksWithCounts = await Promise.all(
        (tasksData || []).map(async (task) => {
          const { count, error } = await supabase
            .from('task_comments')
            .select('*', { count: 'exact', head: true })
            .eq('task_id', task.id);
          
          let assigned_name = null;
          if (task.assigned_to && companyUsers.length) {
            const assignedUser = companyUsers.find(u => u.user_id === task.assigned_to);
            assigned_name = assignedUser?.full_name;
          }
          
          return {
            ...task,
            comments_count: error ? 0 : count,
            assigned_name
          };
        })
      );
      
      setTasks(tasksWithCounts);
    } catch (err) {
      console.error('Ошибка загрузки задач:', err);
      if (showNotification) showNotification('Ошибка загрузки задач', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [userCompanyId, userRole, user?.id, companyUsers, showNotification]);
  
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);
  
  const handleCreateTask = async (formData) => {
    if (!canCreateTasks) {
      if (showNotification) showNotification('У вас нет прав на создание задач', 'error');
      return;
    }
    
    if (!userCompanyId) {
      if (showNotification) showNotification('Ошибка: компания не идентифицирована', 'error');
      return;
    }
    
    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        priority: formData.priority,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        application_id: formData.application_id || null,
        status: formData.status,
        assigned_to: formData.assigned_to || null,
        company_id: userCompanyId,
        created_by: user?.id,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single();
      
      if (error) throw error;
      
      const newTask = { ...data, comments_count: 0, assigned_name: null };
      setTasks([newTask, ...tasks]);
      setShowModal(false);
      if (showNotification) showNotification('✅ Задача создана', 'success');
    } catch (err) {
      console.error('Ошибка создания задачи:', err);
      if (showNotification) showNotification('❌ Ошибка создания задачи', 'error');
    }
  };
  
  const handleUpdateTask = async (formData) => {
    if (!canEditTasks) {
      if (showNotification) showNotification('У вас нет прав на редактирование задач', 'error');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: formData.title.trim(),
          description: formData.description?.trim() || null,
          priority: formData.priority,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          application_id: formData.application_id || null,
          status: formData.status,
          assigned_to: formData.assigned_to || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTask.id);
      
      if (error) throw error;
      
      const assignedUser = companyUsers.find(u => u.user_id === formData.assigned_to);
      setTasks(tasks.map(t => 
        t.id === editingTask.id 
          ? { ...t, ...formData, assigned_name: assignedUser?.full_name || null }
          : t
      ));
      
      setEditingTask(null);
      setShowModal(false);
      if (showNotification) showNotification('✅ Задача обновлена', 'success');
    } catch (err) {
      console.error('Ошибка обновления задачи:', err);
      if (showNotification) showNotification('❌ Ошибка обновления задачи', 'error');
    }
  };
  
  const handleDeleteTask = async (taskId) => {
    if (!canEditTasks) {
      if (showNotification) showNotification('У вас нет прав на удаление задач', 'error');
      return;
    }
    
    if (!window.confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      
      setTasks(tasks.filter(t => t.id !== taskId));
      if (showNotification) showNotification('🗑️ Задача удалена', 'success');
    } catch (err) {
      console.error('Ошибка удаления задачи:', err);
      if (showNotification) showNotification('❌ Ошибка удаления задачи', 'error');
    }
  };
  
  const handleDragOver = (e) => e.preventDefault();
  
  const handleDrop = async (e, newStatus) => {
    if (!canEditTasks) return;
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', taskId);
        
        if (error) throw error;
        
        setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        if (showNotification) showNotification('Статус обновлён', 'success');
      } catch (err) {
        console.error('Ошибка обновления статуса:', err);
        if (showNotification) showNotification('❌ Ошибка обновления статуса', 'error');
      }
    }
  };
  
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [tasks, searchTerm, priorityFilter, statusFilter]);
  
  const stats = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'received').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'received' && t.status !== 'canceled').length
  }), [tasks]);
  
  // Очистка фильтров
  const clearFilters = () => {
    setSearchTerm('');
    setPriorityFilter('all');
    setStatusFilter('all');
    setShowFilters(false);
  };
  
  // Количество активных фильтров
  const activeFiltersCount = (searchTerm ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);
  
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 page-enter">
      {/* Шапка - адаптивная */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-6 h-6 sm:w-8 sm:h-8 text-[#4A6572]" />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Задачи
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  {canCreateTasks ? 'Управляйте задачами команды' : 'Отслеживайте свои задачи'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Статистика - компактная на мобильных */}
              <div className="hidden md:flex items-center gap-2 text-xs">
                <div className="px-2 py-1 bg-gray-100 rounded-full">
                  Всего: {stats.total}
                </div>
                {stats.overdue > 0 && (
                  <div className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full">
                    Просрочено: {stats.overdue}
                  </div>
                )}
              </div>
              
              {/* Кнопки действий */}
              <button
                onClick={() => setShowAnalytics(true)}
                className="p-2 bg-white dark:bg-gray-800 text-gray-700 rounded-xl border"
                title="Аналитика"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              
              {!isMobileView && (
                <button
                  onClick={() => setViewMode(viewMode === 'kanban' ? 'list' : 'kanban')}
                  className="p-2 bg-white dark:bg-gray-800 text-gray-700 rounded-xl border"
                >
                  {viewMode === 'kanban' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                </button>
              )}
              
              <button
                onClick={loadTasks}
                className="p-2 bg-white dark:bg-gray-800 text-gray-700 rounded-xl border"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              
              {canCreateTasks && (
                <button
                  onClick={() => { setEditingTask(null); setShowModal(true); }}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl font-medium text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden xs:inline">Новая</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Мобильная статистика */}
          {isMobileView && (
            <div className="flex gap-2 text-xs">
              <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                📊 {stats.total}
              </div>
              <div className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                ✅ {stats.completed}
              </div>
              <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                ⏳ {stats.inProgress}
              </div>
              {stats.overdue > 0 && (
                <div className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full">
                  ⚠️ {stats.overdue}
                </div>
              )}
            </div>
          )}
          
          {/* Фильтры - кнопка показать/скрыть на мобильных */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded-xl"
            >
              <Filter className="w-4 h-4" />
              Фильтры
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#4A6572] text-white rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-red-600 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Сбросить
              </button>
            )}
          </div>
          
          {/* Панель фильтров - показывается при showFilters */}
          {(showFilters || !isMobileView) && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Поиск задач..."
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700"
                />
              </div>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 text-sm border rounded-xl bg-white dark:bg-gray-700"
              >
                <option value="all">Все приоритеты</option>
                <option value="high">🔴 Высокий</option>
                <option value="medium">🟡 Средний</option>
                <option value="low">🟢 Низкий</option>
              </select>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border rounded-xl bg-white dark:bg-gray-700"
              >
                <option value="all">Все статусы</option>
                <option value="pending">📋 Новые</option>
                <option value="in_progress">⏳ В работе</option>
                <option value="received">✅ Выполнены</option>
                <option value="canceled">❌ Отменены</option>
              </select>
            </div>
          )}
        </div>
      </div>
      
      {/* Контент */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#4A6572]" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-2xl">
          <Target className="w-20 h-20 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg text-gray-500 dark:text-gray-400">Нет задач</p>
          {canCreateTasks && (
            <button
              onClick={() => { setEditingTask(null); setShowModal(true); }}
              className="mt-4 px-5 py-2.5 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Создать первую задачу
            </button>
          )}
        </div>
      ) : viewMode === 'kanban' && !isMobileView ? (
        // Канбан-вид только на десктопе
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {columns.map(col => (
            <div
              key={col.id}
              className={`rounded-xl p-3 sm:p-4 ${col.bg} min-h-[450px] transition-all`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                  <span>{col.icon}</span>
                  {col.title}
                </h3>
                <span className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
                  {filteredTasks.filter(t => t.status === col.id).length}
                </span>
              </div>
              
              <div className="space-y-2">
                {filteredTasks
                  .filter(t => t.status === col.id)
                  .map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={(task) => { setEditingTask(task); setShowModal(true); }}
                      onDelete={handleDeleteTask}
                      onOpenComments={(task) => { setSelectedTaskForComments(task); setShowCommentsModal(true); }}
                      applications={applications}
                      showNotification={showNotification}
                      userRole={userRole}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Список (основной вид на мобильных)
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={(task) => { setEditingTask(task); setShowModal(true); }}
              onDelete={handleDeleteTask}
              onOpenComments={(task) => { setSelectedTaskForComments(task); setShowCommentsModal(true); }}
              applications={applications}
              showNotification={showNotification}
              userRole={userRole}
            />
          ))}
        </div>
      )}
      
      <TaskModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingTask(null); }}
        onSave={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
        applications={applications}
        companyUsers={companyUsers}
      />
      
      <TaskCommentsModal
        isOpen={showCommentsModal}
        onClose={() => { setShowCommentsModal(false); setSelectedTaskForComments(null); loadTasks(); }}
        task={selectedTaskForComments}
        user={user}
        showNotification={showNotification}
      />
      
      {showAnalytics && <TaskAnalytics tasks={tasks} onClose={() => setShowAnalytics(false)} />}
    </div>
  );
};

export default TaskBoard;