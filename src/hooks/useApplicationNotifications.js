// src/hooks/useApplicationNotifications.js
import { useCallback } from 'react';

/**
 * Хук для отправки уведомлений при смене статуса заявки
 */
export const useApplicationNotifications = (supabase) => {
  const notifyStatusChange = useCallback(async ({
    application,
    oldStatus,
    newStatus,
    changedBy,
    companyId,
    extraMessage = null
  }) => {
    if (!application?.id || !companyId) return;
    if (oldStatus === newStatus) return;

    try {
      const recipients = new Set();

      // 1. Автор заявки
      if (application.user_id && application.user_id !== changedBy) {
        recipients.add(application.user_id);
      }

      // 2. Владелец компании
      const { data: company } = await supabase
        .from('companies')
        .select('is_company_owner')
        .eq('id', companyId)
        .single();
      
      if (company?.is_company_owner && company.is_company_owner !== changedBy) {
        recipients.add(company.is_company_owner);
      }

      // 3. Снабженцы и руководители
      const { data: staff } = await supabase
        .from('company_users')
        .select('user_id, role')
        .eq('company_id', companyId)
        .in('role', ['supply_admin', 'manager', 'director'])
        .eq('is_active', true);

      staff?.forEach(u => {
        if (u.user_id !== changedBy) recipients.add(u.user_id);
      });

      if (recipients.size === 0) return;

      // Формируем сообщение
      const statusMessages = {
        'pending': 'создана',
        'admin_processing': 'взята в работу снабженцем',
        'ready_for_issue': 'готова к выдаче со склада',
        'pending_master_confirmation': 'материалы отправлены мастеру',
        'partial_received': 'частично получена',
        'received': 'завершена',
        'canceled': 'отменена',
        'pending_approval': 'отправлена на согласование'
      };

      const statusText = statusMessages[newStatus] || `изменён статус на "${newStatus}"`;
      const message = extraMessage || `Заявка "${application.object_name}" ${statusText}`;

      const notifications = Array.from(recipients).map(userId => ({
        user_id: userId,
        company_id: companyId,
        application_id: application.id,
        title: `📦 ${application.object_name}`,
        message,
        type: newStatus === 'canceled' ? 'warning' 
            : newStatus === 'received' ? 'success' 
            : 'info',
        is_read: false,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('user_notifications')
        .insert(notifications);

      if (error) {
        console.warn('[Notifications] Ошибка вставки:', error.message);
      }
    } catch (err) {
      console.warn('[Notifications] Ошибка:', err.message);
    }
  }, [supabase]);

  return { notifyStatusChange };
};

export default useApplicationNotifications;