// src/components/Onboarding/OnboardingProgress.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Circle, Award, TrendingUp, Users, FileText, User, X } from 'lucide-react';

const TASKS = [
  { 
    id: 'profile', 
    label: 'Заполнить профиль', 
    icon: User, 
    action: '/profile',
    description: 'Добавьте свои контактные данные'
  },
  { 
    id: 'first_application', 
    label: 'Создать первую заявку', 
    icon: FileText, 
    action: '/applications/new',
    description: 'Создайте заявку на материалы'
  },
  { 
    id: 'invite_team', 
    label: 'Пригласить коллегу', 
    icon: Users, 
    action: '/employees',
    description: 'Пригласите сотрудника в компанию'
  },
  { 
    id: 'analytics', 
    label: 'Посмотреть аналитику', 
    icon: TrendingUp, 
    action: '/analytics',
    description: 'Ознакомьтесь с отчетами'
  },
  { 
    id: 'complete', 
    label: 'Получить бонус', 
    icon: Award, 
    action: null,
    description: '🎉 Вы выполнили все задачи!'
  }
];

const OnboardingProgress = ({ 
  supabase, 
  userId, 
  companyId, 
  onTaskComplete,
  onNavigate  // ← УБРАЛ currentView (не используется)
}) => {
  const [tasks, setTasks] = useState(TASKS);
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(true);
  const [loading, setLoading] = useState(false);

  // ✅ ОБЕРНУЛ loadProgress в useCallback
  const loadProgress = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('completed_tasks')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.debug('Load progress error:', error);
        return;
      }

      if (data?.completed_tasks) {
        const updatedTasks = TASKS.map(task => ({
          ...task,
          completed: data.completed_tasks.includes(task.id)
        }));
        setTasks(updatedTasks);
        
        const completedCount = updatedTasks.filter(t => t.completed).length;
        setProgress((completedCount / TASKS.length) * 100);
      }
    } catch (err) {
      console.debug('Load progress error:', err);
    }
  }, [supabase, userId]);

  // ✅ Добавил loadProgress в зависимости
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // ✅ ОБЕРНУЛ markTaskCompleted в useCallback
  const markTaskCompleted = useCallback(async (taskId) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: true } : task
    );
    setTasks(updatedTasks);

    const completedIds = updatedTasks.filter(t => t.completed).map(t => t.id);
    
    await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: userId,
        company_id: companyId,
        completed_tasks: completedIds,
        updated_at: new Date()
      });

    const completedCount = updatedTasks.filter(t => t.completed).length;
    const newProgress = (completedCount / TASKS.length) * 100;
    setProgress(newProgress);

    if (completedCount === TASKS.length) {
      onTaskComplete?.();
    }
  }, [tasks, supabase, userId, companyId, onTaskComplete]);

  // ✅ Добавил markTaskCompleted в зависимости
  useEffect(() => {
    const checkTaskCompletion = async () => {
      try {
        const { data } = await supabase
          .from('onboarding_progress')
          .select('completed_tasks')
          .eq('user_id', userId)
          .single();

        if (data?.completed_tasks) {
          const updatedTasks = tasks.map(task => ({
            ...task,
            completed: data.completed_tasks.includes(task.id)
          }));
          setTasks(updatedTasks);
          
          const completedCount = updatedTasks.filter(t => t.completed).length;
          const newProgress = (completedCount / TASKS.length) * 100;
          setProgress(newProgress);
          
          if (completedCount === TASKS.length) {
            onTaskComplete?.();
          }
        }
      } catch (err) {
        console.debug('Check completion error:', err);
      }
    };

    if (progress < 100) {
      const interval = setInterval(checkTaskCompletion, 5000);
      return () => clearInterval(interval);
    }
  }, [userId, supabase, tasks, progress, onTaskComplete]); // ✅ Все зависимости указаны

  const completeTask = async (taskId) => {
    if (loading) return;
    setLoading(true);
    
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      if (task.action) {
        const currentPath = window.location.pathname;
        const targetPath = task.action;
        
        console.log(`🔍 Навигация: ${currentPath} → ${targetPath}`);
        
        if (currentPath === targetPath) {
          await markTaskCompleted(taskId);
        } else {
          localStorage.setItem(`task_${taskId}_started`, 'true');
          
          if (onNavigate) {
            onNavigate(targetPath);
          } else {
            window.location.href = targetPath;
          }
        }
      } else {
        await markTaskCompleted(taskId);
      }
    } catch (err) {
      console.error('Error completing task:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Добавил markTaskCompleted в зависимости
  useEffect(() => {
    const checkPendingTask = async () => {
      for (const task of tasks) {
        if (!task.completed && task.action) {
          const started = localStorage.getItem(`task_${task.id}_started`);
          if (started === 'true' && window.location.pathname === task.action) {
            await markTaskCompleted(task.id);
            localStorage.removeItem(`task_${task.id}_started`);
          }
        }
      }
    };
    
    checkPendingTask();
    
    const handlePopState = () => checkPendingTask();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [tasks, markTaskCompleted]); // ✅ Добавил markTaskCompleted

  if (!show || progress === 100) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border border-gray-200/50 dark:border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#F9AA33]" />
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
            Онбординг {loading && <span className="text-xs text-gray-400">...</span>}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#4A6572]">{Math.round(progress)}%</span>
          <button 
            onClick={() => setShow(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-[#4A6572] to-[#F9AA33] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {tasks.map(task => {
          const Icon = task.icon;
          const isCompleted = task.completed;
          const isActive = !isCompleted && task.action;
          
          return (
            <div
              key={task.id}
              className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                isCompleted 
                  ? 'bg-green-50 dark:bg-green-900/20' 
                  : 'bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-600/30'
              } ${isActive ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="min-w-0">
                  <span className={`text-sm truncate block ${
                    isCompleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {task.label}
                  </span>
                  {!isCompleted && task.description && (
                    <span className="text-[10px] text-gray-400 truncate block">
                      {task.description}
                    </span>
                  )}
                </div>
              </div>
              {!isCompleted && task.action && (
                <button
                  onClick={() => completeTask(task.id)}
                  disabled={loading}
                  className="text-xs px-3 py-1 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors flex-shrink-0 ml-2 disabled:opacity-50"
                >
                  {loading ? '...' : 'Выполнить'}
                </button>
              )}
              {!isCompleted && !task.action && (
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  Ожидание...
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingProgress;