// src/utils/analyticsTracker.js
import { supabase } from './supabaseClient';

export const AnalyticsTracker = {
  /**
   * Отслеживание шагов онбординга
   */
  trackOnboardingStep: async (userId, companyId, step, action, metadata = {}) => {
    try {
      await supabase
        .from('onboarding_analytics')
        .insert({
          user_id: userId,
          company_id: companyId,
          step,
          action,
          metadata,
          timestamp: new Date()
        });
    } catch (err) {
      console.debug('Track onboarding step error:', err);
    }
  },

  /**
   * Расчет конверсии онбординга
   */
  getOnboardingConversion: async (companyId) => {
    try {
      const { data: users } = await supabase
        .from('company_users')
        .select('user_id, created_at')
        .eq('company_id', companyId);

      const { data: completed } = await supabase
        .from('onboarding_progress')
        .select('user_id')
        .eq('company_id', companyId)
        .contains('completed_tasks', ['complete']);

      const total = users?.length || 0;
      const completedCount = completed?.length || 0;
      const conversion = total ? ((completedCount / total) * 100).toFixed(1) : 0;

      return {
        total,
        completed: completedCount,
        conversion: `${conversion}%`,
        conversionRate: parseFloat(conversion)
      };
    } catch (err) {
      console.debug('Get onboarding conversion error:', err);
      return { total: 0, completed: 0, conversion: '0%', conversionRate: 0 };
    }
  },

  /**
   * Отслеживание времени до первой заявки
   */
  trackTimeToFirstApplication: async (userId, applicationId) => {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('created_at')
        .eq('id', userId)
        .single();

      const { data: application } = await supabase
        .from('applications')
        .select('created_at')
        .eq('id', applicationId)
        .single();

      if (user && application) {
        const timeToFirst = (new Date(application.created_at) - new Date(user.created_at)) / (1000 * 60 * 60);
        
        await supabase
          .from('onboarding_analytics')
          .insert({
            user_id: userId,
            metric: 'time_to_first_application',
            value: timeToFirst,
            timestamp: new Date()
          });

        return timeToFirst;
      }
      return null;
    } catch (err) {
      console.debug('Track time to first application error:', err);
      return null;
    }
  },

  /**
   * Отслеживание завершения конкретной задачи
   */
  trackTaskCompleted: async (userId, companyId, taskId, timeSpent) => {
    try {
      await supabase
        .from('onboarding_analytics')
        .insert({
          user_id: userId,
          company_id: companyId,
          step: taskId,
          action: 'completed',
          metadata: { time_spent: timeSpent },
          timestamp: new Date()
        });
    } catch (err) {
      console.debug('Track task completed error:', err);
    }
  },

  /**
   * Получение статистики по онбордингу для дашборда
   */
  getOnboardingStats: async (companyId) => {
    try {
      const [conversion, tasksData, timeData] = await Promise.all([
        AnalyticsTracker.getOnboardingConversion(companyId),
        supabase
          .from('onboarding_progress')
          .select('completed_tasks')
          .eq('company_id', companyId),
        supabase
          .from('onboarding_analytics')
          .select('value')
          .eq('company_id', companyId)
          .eq('metric', 'time_to_first_application')
      ]);

      const tasks = tasksData.data || [];
      const times = timeData.data || [];

      // Считаем среднее время до первой заявки
      const avgTime = times.length > 0 
        ? times.reduce((sum, t) => sum + t.value, 0) / times.length 
        : null;

      // Считаем прогресс по каждой задаче
      const taskProgress = TASKS.map(task => {
        const completed = tasks.filter(t => 
          t.completed_tasks?.includes(task.id)
        ).length;
        return {
          ...task,
          completed,
          total: tasks.length,
          progress: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
        };
      });

      return {
        conversion,
        taskProgress,
        avgTimeToFirst: avgTime ? `${Math.round(avgTime)} ч` : 'Нет данных',
        totalUsers: tasks.length
      };
    } catch (err) {
      console.debug('Get onboarding stats error:', err);
      return null;
    }
  }
};

// Список задач для статистики
const TASKS = [
  { id: 'profile', label: 'Заполнить профиль' },
  { id: 'first_application', label: 'Создать первую заявку' },
  { id: 'invite_team', label: 'Пригласить коллегу' },
  { id: 'analytics', label: 'Посмотреть аналитику' },
  { id: 'complete', label: 'Получить бонус' }
];