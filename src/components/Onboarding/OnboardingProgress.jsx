// src/components/Onboarding/OnboardingProgress.jsx
import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, Award, TrendingUp, Users, FileText, User, X } from 'lucide-react';

const TASKS = [
  { id: 'profile', label: 'Заполнить профиль', icon: User, action: '/profile' },
  { id: 'first_application', label: 'Создать первую заявку', icon: FileText, action: '/applications/new' },
  { id: 'invite_team', label: 'Пригласить коллегу', icon: Users, action: '/employees' },
  { id: 'analytics', label: 'Посмотреть аналитику', icon: TrendingUp, action: '/analytics' },
  { id: 'complete', label: 'Получить бонус', icon: Award, action: null }
];

const OnboardingProgress = ({ supabase, userId, companyId, onTaskComplete }) => {
  const [tasks, setTasks] = useState(TASKS);
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
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
        const updatedTasks = tasks.map(task => ({
          ...task,
          completed: data.completed_tasks.includes(task.id)
        }));
        setTasks(updatedTasks);
        
        const completedCount = updatedTasks.filter(t => t.completed).length;
        setProgress((completedCount / tasks.length) * 100);
      }
    } catch (err) {
      console.debug('Load progress error:', err);
    }
  };

  const completeTask = async (taskId) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: true } : task
    );
    setTasks(updatedTasks);

    const completedIds = updatedTasks.filter(t => t.completed).map(t => t.id);
    
    try {
      await supabase
        .from('onboarding_progress')
        .upsert({
          user_id: userId,
          company_id: companyId,
          completed_tasks: completedIds,
          updated_at: new Date()
        });

      const completedCount = updatedTasks.filter(t => t.completed).length;
      const newProgress = (completedCount / tasks.length) * 100;
      setProgress(newProgress);

      if (completedCount === tasks.length) {
        onTaskComplete?.();
      }
    } catch (err) {
      console.error('Error saving task:', err);
    }
  };

  if (!show || progress === 100) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 border border-gray-200/50 dark:border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#F9AA33]" />
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Онбординг</h4>
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

      <div className="space-y-2">
        {tasks.map(task => {
          const Icon = task.icon;
          const isCompleted = task.completed;
          
          return (
            <div
              key={task.id}
              className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                isCompleted 
                  ? 'bg-green-50 dark:bg-green-900/20' 
                  : 'bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-600/30'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className={`text-sm truncate ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {task.label}
                </span>
              </div>
              {!isCompleted && task.action && (
                <button
                  onClick={() => {
                    // Используем React Router или прямую навигацию
                    if (window.location.pathname !== task.action) {
                      window.location.href = task.action;
                    }
                    completeTask(task.id);
                  }}
                  className="text-xs px-3 py-1 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors flex-shrink-0 ml-2"
                >
                  Выполнить
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingProgress;