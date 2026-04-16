// src/components/TaskBoard.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Plus, MoreVertical, Trash2, Edit3, Calendar, User, Clock, 
  CheckCircle, XCircle, AlertCircle, Link as LinkIcon, MessageSquare,
  BarChart3, Search, TrendingUp, ArrowUpRight,
  Activity, Flag, Paperclip, X, Send
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// ✅ ИСПРАВЛЕНИЕ: убраны пробелы в URL
const SUPABASE_URL = 'https://lcfooydickfghjlqpivw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZm9veWRpY2tmZ2hqbHFwaXZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjIwMjcsImV4cCI6MjA5MTkzODAyN30.f6TqW2G_nbUeD_wmUc0wJLRiSIw9m95Iwv-BR-FbSb4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─────────────────────────────────────────────────────────────
// 🎨 КОМПОНЕНТ КАРТОЧКИ ЗАДАЧИ
// ─────────────────────────────────────────────────────────────
const TaskCard = ({ task, onEdit, onDelete, onOpenComments, applications, showNotification, language }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const priorityConfig = {
    low: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', label: 'Низкий', icon: '🟢' },
    medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', label: 'Средний', icon: '🟡' },
    high: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', label: 'Высокий', icon: '🔴' }
  };
  
  const statusConfig = {
  pending: { border: 'border-l-4 border-gray-400', icon: '📋' },
  in_progress: { border: 'border-l-4 border-blue-500', icon: '⏳' },
  received: { border: 'border-l-4 border-green-500', icon: '✅' },
  canceled: { border: 'border-l-4 border-red-500', icon: '❌' }
};
  
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const daysUntilDue = task.due_date ? Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('taskId', task.id)}
      className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-3 cursor-move hover:shadow-lg transition-all ${statusConfig[task.status]?.border} ${isOverdue ? 'ring-2 ring-red-400' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">{task.title}</h4>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            aria-label="Меню задачи"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
              <button
                onClick={() => { onEdit(task); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Edit3 className="w-3 h-3" /> Редактировать
              </button>
              <button
                onClick={() => { onOpenComments(task); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <MessageSquare className="w-3 h-3" /> Комментарии ({task.comments_count || 0})
              </button>
              <button
                onClick={() => { onDelete(task.id); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 flex items-center gap-2"
              >
                <Trash2 className="w-3 h-3" /> Удалить
              </button>
            </div>
          )}
        </div>
      </div>
      
      {task.description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>
      )}
      
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`text-xs px-2 py-1 rounded-full ${priorityConfig[task.priority]?.color}`}>
          {priorityConfig[task.priority]?.icon} {priorityConfig[task.priority]?.label}
        </span>
        
        {task.application_id && (
          <span 
            className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 flex items-center gap-1 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              const app = applications?.find(a => a.id === task.application_id);
              if (app) {
                showNotification?.(`📋 Заявка: ${app.object_name}`, 'info');
                // Адаптируйте путь под ваш роутинг
                window.open(`/applications/${app.id}`, '_blank');
              }
            }}
            title={language === 'ru' ? 'Открыть заявку' : 'Open application'}
          >
            <LinkIcon className="w-3 h-3" /> 
            {language === 'ru' ? 'Заявка' : 'Application'}
          </span>
        )}
      </div>
      
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        {task.due_date && (
          <div className={`flex items-center ${isOverdue ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
            <Calendar className="w-3 h-3 mr-1" />
            {isOverdue ? `Просрочено (${Math.abs(daysUntilDue)} дн.)` : `Дедлайн: ${new Date(task.due_date).toLocaleDateString('ru-RU')}`}
            {daysUntilDue !== null && daysUntilDue <= 2 && daysUntilDue > 0 && !isOverdue && (
              <AlertCircle className="w-3 h-3 ml-1 text-orange-500" />
            )}
          </div>
        )}
      </div>
      
      {task.comments_count > 0 && (
        <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
          <MessageSquare className="w-3 h-3 mr-1" />
          {task.comments_count} коммент.
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🎨 МОДАЛЬНОЕ ОКНО СОЗДАНИЯ/РЕДАКТИРОВАНИЯ
// ─────────────────────────────────────────────────────────────
const TaskModal = ({ isOpen, onClose, onSave, task, applications }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    application_id: '',
    status: 'pending' 
  });
  const [selectedApplication, setSelectedApplication] = useState(null);
  
  useEffect(() => {
  // Маппинг старых статусов на новые
  const mapStatus = (s) => {
    if (s === 'new') return 'pending';
    if (s === 'done') return 'received';
    return s;
  };
  
  if (task) {
    setFormData({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      due_date: task.due_date ? task.due_date.split('T')[0] : '',
      application_id: task.application_id || '',
      status: mapStatus(task.status) || 'pending'  // ← ИСПРАВЛЕНО
    });
    if (task.application_id && applications) {
      const app = applications.find(a => a.id === task.application_id);
      setSelectedApplication(app);
    }
  } else {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      application_id: '',
      status: 'pending'  // ← ИСПРАВЛЕНО
    });
    setSelectedApplication(null);
  }
}, [task, applications]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {task ? 'Редактировать задачу' : 'Новая задача'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Введите название задачи"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows="3"
              placeholder="Описание задачи"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Приоритет</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">🟢 Низкий</option>
                <option value="medium">🟡 Средний</option>
                <option value="high">🔴 Высокий</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Статус</label>
              <select
  value={formData.status}
  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
>
  <option value="pending">📋 Новые</option>
  <option value="in_progress">⏳ В работе</option>
  <option value="received">✅ Выполнено</option>
  <option value="canceled">❌ Отменено</option>
</select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Срок выполнения</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <LinkIcon className="w-4 h-4 inline mr-1" />
              Привязать к заявке
            </label>
            <select
              value={formData.application_id}
              onChange={(e) => {
                setFormData({ ...formData, application_id: e.target.value });
                if (applications) {
                  const app = applications.find(a => a.id === e.target.value);
                  setSelectedApplication(app);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Не привязано</option>
              {applications?.map(app => (
                <option key={app.id} value={app.id}>
                  {app.object_name} - {app.foreman_name}
                </option>
              ))}
            </select>
            
            {selectedApplication && (
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Paperclip className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">{selectedApplication.object_name}</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      {selectedApplication.materials?.length || 0} материалов • Статус: {selectedApplication.status}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            Отмена
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.title.trim()}
            className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md disabled:opacity-50"
          >
            {task ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 💬 КОМПОНЕНТ КОММЕНТАРИЕВ
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
    if (isOpen) {
      loadComments();
    }
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">💬 Комментарии</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6572]"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Нет комментариев</p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
  {comment.user_email?.split('@')[0] || 'Пользователь'}
</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {new Date(comment.created_at).toLocaleString('ru-RU')}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addComment()}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Введите комментарий..."
            />
            <button
              onClick={addComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md disabled:opacity-50"
              aria-label="Отправить комментарий"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 📊 АНАЛИТИКА ПО ЗАДАЧАМ
// ─────────────────────────────────────────────────────────────
const TaskAnalytics = ({ tasks, onClose }) => {
  const stats = useMemo(() => {
  const total = tasks.length;
  const byStatus = {
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    received: tasks.filter(t => t.status === 'received').length,  // ← received вместо done
    canceled: tasks.filter(t => t.status === 'canceled').length
  };
  const byPriority = {
    low: tasks.filter(t => t.priority === 'low').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    high: tasks.filter(t => t.priority === 'high').length
  };
  const overdue = tasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'received' // ← received вместо done
  ).length;
  const withApplications = tasks.filter(t => t.application_id).length;
  const completionRate = total > 0 ? Math.round((byStatus.received / total) * 100) : 0; // ← received
  
  return { total, byStatus, byPriority, overdue, withApplications, completionRate };
}, [tasks]);

const statusColors = {
  pending: 'bg-gray-500',      // ← исправлено
  in_progress: 'bg-blue-500',
  received: 'bg-green-500',    // ← исправлено
  canceled: 'bg-red-500'
};
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Аналитика задач
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-[#4A6572] to-[#344955] text-white p-4 rounded-xl">
            <p className="text-sm opacity-80">Всего задач</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl">
            <p className="text-sm opacity-80">Выполнено</p>
            <p className="text-3xl font-bold">{stats.byStatus.done}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-4 rounded-xl">
            <p className="text-sm opacity-80">Просрочено</p>
            <p className="text-3xl font-bold">{stats.overdue}</p>
          </div>
          <div className="bg-gradient-to-br from-[#F9AA33] to-[#F57C00] text-white p-4 rounded-xl">
            <p className="text-sm opacity-80">Завершено</p>
            <p className="text-3xl font-bold">{stats.completionRate}%</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              По статусам
            </h4>
            <div className="space-y-3">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusColors[status]}`}></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">
  {status === 'pending' ? 'Новые' : status === 'in_progress' ? 'В работе' : status === 'received' ? 'Выполнено' : 'Отменено'}
</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{count}</span>
                  <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${statusColors[status]}`} 
                      style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Flag className="w-5 h-5" />
              По приоритетам
            </h4>
            <div className="space-y-3">
              {Object.entries(stats.byPriority).map(([priority, count]) => (
                <div key={priority} className="flex items-center gap-3">
                  <span className="text-lg">
                    {priority === 'low' ? '🟢' : priority === 'medium' ? '🟡' : '🔴'}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                    {priority === 'low' ? 'Низкий' : priority === 'medium' ? 'Средний' : 'Высокий'}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{count}</span>
                  <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${priority === 'low' ? 'bg-green-500' : priority === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// 🎯 ОСНОВНОЙ КОМПОНЕНТ TASKBOARD
// ─────────────────────────────────────────────────────────────
const TaskBoard = ({ user, userCompanyId, applications, showNotification, language, userRole }) => {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedTaskForComments, setSelectedTaskForComments] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [applicationFilter, setApplicationFilter] = useState('all'); // 'all' | 'linked' | 'unlinked'
  const notificationIntervalRef = useRef(null);
  
  const columns = [
  { id: 'pending', title: language === 'ru' ? 'Новые' : 'New', color: 'gray', icon: '📋' },
  { id: 'in_progress', title: language === 'ru' ? 'В работе' : 'In Progress', color: 'blue', icon: '⏳' },
  { id: 'received', title: language === 'ru' ? 'Выполнено' : 'Done', color: 'green', icon: '✅' },
  { id: 'canceled', title: language === 'ru' ? 'Отменено' : 'Canceled', color: 'red', icon: '❌' }
];
  
  const checkDeadlines = useCallback(() => {
    const now = new Date();
    tasks.forEach(task => {
      if (task.due_date && task.status !== 'received' && task.status !== 'canceled') {
        const dueDate = new Date(task.due_date);
        const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          showNotification(`⏰ Задача "${task.title}" должна быть выполнена завтра!`, 'warning');
        } else if (diffDays === 0) {
          showNotification(`🚨 Задача "${task.title}" должна быть выполнена сегодня!`, 'error');
        } else if (diffDays < 0) {
          showNotification(`❗ Задача "${task.title}" просрочена на ${Math.abs(diffDays)} дн.!`, 'error');
        }
      }
    });
  }, [tasks, showNotification]);
  
  const loadTasks = useCallback(async () => {
    if (!userCompanyId) return;
    
    setIsLoading(true);
    try {
      // ✅ ДЛЯ supply_admin: показываем ВСЕ задачи компании
      // ✅ ДЛЯ foreman: показываем только свои задачи (если нужно)
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('created_at', { ascending: false });
      
      // ✅ Опционально: foreman видит только свои задачи
      // if (userRole === 'foreman') {
      //   query = query.eq('created_by', user?.id);
      // }
      
      const { data: tasksData, error: tasksError } = await query;
      
      if (tasksError) throw tasksError;
      
      // Загружаем количество комментариев для каждой задачи + маппинг статусов
const tasksWithCounts = await Promise.all(
  (tasksData || []).map(async (task) => {
    // 🔹 Маппинг старых статусов на новые (для совместимости)
    const mapStatus = (s) => {
      if (s === 'new') return 'pending';
      if (s === 'done') return 'received';
      return s;
    };
    
    const { count, error } = await supabase
      .from('task_comments')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', task.id);
    
    return {
      ...task,
      status: mapStatus(task.status),  // ← применяем маппинг
      comments_count: error ? 0 : count
    };
  })
);

setTasks(tasksWithCounts);
    } catch (err) {
      console.error('Ошибка загрузки задач:', err);
      showNotification('Ошибка загрузки задач', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [userCompanyId, userRole, user?.id, showNotification]);
  
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);
  
  useEffect(() => {
    if (tasks.length > 0) {
      checkDeadlines();
      notificationIntervalRef.current = setInterval(checkDeadlines, 5 * 60 * 1000);
    }
    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
      }
    };
  }, [tasks.length, checkDeadlines]);
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    if (taskId) {
      await moveTask(taskId, newStatus);
    }
  };
  
  const moveTask = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) throw error;
      
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      
      showNotification('Статус задачи обновлён', 'success');
    } catch (err) {
      console.error('Ошибка обновления задачи:', err);
      showNotification('Ошибка обновления задачи', 'error');
    }
  };
  
  const handleCreateTask = async (formData) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: formData.title.trim(),
          description: formData.description?.trim() || null,
          priority: formData.priority,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          application_id: formData.application_id || null,
          status: formData.status,
          company_id: userCompanyId,
          created_by: user?.id,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Ошибка Supabase:', error);
        throw error;
      }
      
      setTasks([{ ...data, comments_count: 0 }, ...tasks]);
      setShowModal(false);
      showNotification('Задача создана', 'success');
    } catch (err) {
      console.error('Ошибка создания задачи:', err);
      showNotification('Ошибка создания задачи: ' + (err.message || 'Неизвестная ошибка'), 'error');
    }
  };
  
  const handleUpdateTask = async (formData) => {
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
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTask.id);
      
      if (error) throw error;
      
      setTasks(tasks.map(t => 
        t.id === editingTask.id ? { ...t, ...formData } : t
      ));
      
      setEditingTask(null);
      setShowModal(false);
      showNotification('Задача обновлена', 'success');
    } catch (err) {
      console.error('Ошибка обновления задачи:', err);
      showNotification('Ошибка обновления задачи', 'error');
    }
  };
  
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      
      setTasks(tasks.filter(t => t.id !== taskId));
      showNotification('Задача удалена', 'success');
    } catch (err) {
      console.error('Ошибка удаления задачи:', err);
      showNotification('Ошибка удаления задачи', 'error');
    }
  };
  
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      
      // ✅ ФИЛЬТР ПО ПРИВЯЗКЕ К ЗАЯВКАМ
      const matchesApplication = applicationFilter === 'all' 
        ? true 
        : applicationFilter === 'linked' 
          ? !!task.application_id 
          : !task.application_id;
      
      return matchesSearch && matchesPriority && matchesApplication;
    });
  }, [tasks, searchTerm, priorityFilter, applicationFilter]);
  
  const columnColors = {
    gray: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  };
  
  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {language === 'ru' ? 'Управление задачами' : 'Task Management'}
        </h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'ru' ? 'Поиск...' : 'Search...'}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">{language === 'ru' ? 'Все приоритеты' : 'All Priorities'}</option>
            <option value="high">🔴 Высокий</option>
            <option value="medium">🟡 Средний</option>
            <option value="low">🟢 Низкий</option>
          </select>
          
          {/* ✅ ФИЛЬТР ПО ЗАЯВКАМ */}
          <select
            value={applicationFilter}
            onChange={(e) => setApplicationFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">{language === 'ru' ? 'Все задачи' : 'All Tasks'}</option>
            <option value="linked">📎 С заявками</option>
            <option value="unlinked">📄 Без заявок</option>
          </select>
          
          <button
            onClick={() => setShowAnalytics(true)}
            className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2 text-sm"
          >
            <BarChart3 className="w-4 h-4" />
            {language === 'ru' ? 'Аналитика' : 'Analytics'}
          </button>
          
          <button
            onClick={() => { setEditingTask(null); setShowModal(true); }}
            className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            {language === 'ru' ? 'Новая задача' : 'New Task'}
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6572]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map(col => (
            <div
              key={col.id}
              className={`rounded-xl p-4 border ${columnColors[col.color]} min-h-[500px]`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>{col.icon}</span>
                  {col.title}
                </h3>
                <span className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded-full">
                  {filteredTasks.filter(t => t.status === col.id).length}
                </span>
              </div>
              
              <div className="space-y-1">
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
                      language={language}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <TaskModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingTask(null); }}
        onSave={editingTask ? handleUpdateTask : handleCreateTask}
        task={editingTask}
        applications={applications}
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