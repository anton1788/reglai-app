import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export const useApproval = (companyId, userId, userRole) => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Загрузка ожидающих согласования заявок
  const loadPendingApprovals = useCallback(async () => {
    if (!companyId) return [];
    
    try {
      // Сначала получаем запросы на согласование
      const { data: requests, error: reqError } = await supabase
        .from('approval_requests')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (reqError) throw reqError;
      
      // Для каждого запроса получаем данные заявки отдельно
      const requestsWithApps = await Promise.all(
        (requests || []).map(async (req) => {
          const { data: appData } = await supabase
            .from('applications')
            .select('id, object_name, foreman_name, foreman_phone, materials, total_amount, created_at, status, status_history')
            .eq('id', req.application_id)
            .single();
          
          return {
            ...req,
            applications: appData
          };
        })
      );
      
      setPendingApprovals(requestsWithApps);
      return requestsWithApps;
    } catch (err) {
      console.error('Ошибка загрузки pending approvals:', err);
      setPendingApprovals([]);
      return [];
    }
  }, [companyId]);

  // Загрузка истории согласований
  const loadApprovalHistory = useCallback(async () => {
    if (!companyId) return [];
    
    try {
      // Получаем историю
      const { data: history, error: histError } = await supabase
        .from('approval_history')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (histError) throw histError;
      
      // Для каждой записи получаем данные заявки и утверждающего
      const historyWithDetails = await Promise.all(
        (history || []).map(async (item) => {
          const [appData, approverData] = await Promise.all([
            supabase.from('applications').select('id, object_name, foreman_name').eq('id', item.application_id).single(),
            supabase.from('company_users').select('email, full_name').eq('id', item.approver_id).single()
          ]);
          
          return {
            ...item,
            applications: appData.data,
            approver: approverData.data
          };
        })
      );
      
      setApprovalHistory(historyWithDetails);
      return historyWithDetails;
    } catch (err) {
      console.error('Ошибка загрузки approval history:', err);
      setApprovalHistory([]);
      return [];
    }
  }, [companyId]);

  // Подтверждение заявки
  const approveApplication = useCallback(async (applicationId, comment) => {
    if (!companyId || !userId) return false;
    
    try {
      // Обновляем статус в approval_requests
      const { error: updateError } = await supabase
        .from('approval_requests')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('application_id', applicationId)
        .eq('company_id', companyId);

      if (updateError) throw updateError;

      // Записываем в историю
      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          company_id: companyId,
          application_id: applicationId,
          approver_id: userId,
          action: 'approved',
          comment: comment || null,
          created_at: new Date().toISOString()
        });

      if (historyError) throw historyError;

      // Обновляем статус заявки
      await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);

      await loadPendingApprovals();
      await loadApprovalHistory();
      return true;
    } catch (err) {
      console.error('Ошибка подтверждения:', err);
      return false;
    }
  }, [companyId, userId, loadPendingApprovals, loadApprovalHistory]);

  // Отклонение заявки
  const rejectApplication = useCallback(async (applicationId, comment) => {
    if (!companyId || !userId) return false;
    
    try {
      const { error: updateError } = await supabase
        .from('approval_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('application_id', applicationId)
        .eq('company_id', companyId);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          company_id: companyId,
          application_id: applicationId,
          approver_id: userId,
          action: 'rejected',
          comment: comment || null,
          created_at: new Date().toISOString()
        });

      if (historyError) throw historyError;

      await supabase
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', applicationId);

      await loadPendingApprovals();
      await loadApprovalHistory();
      return true;
    } catch (err) {
      console.error('Ошибка отклонения:', err);
      return false;
    }
  }, [companyId, userId, loadPendingApprovals, loadApprovalHistory]);

  // Эскалация (поднять выше)
  const escalateApplication = useCallback(async (applicationId, comment) => {
    if (!companyId || !userId) return false;
    
    try {
      const { error: updateError } = await supabase
        .from('approval_requests')
        .update({ 
          status: 'escalated', 
          urgency: 'high',
          updated_at: new Date().toISOString() 
        })
        .eq('application_id', applicationId)
        .eq('company_id', companyId);

      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('approval_history')
        .insert({
          company_id: companyId,
          application_id: applicationId,
          approver_id: userId,
          action: 'escalated',
          comment: comment || null,
          created_at: new Date().toISOString()
        });

      if (historyError) throw historyError;

      await loadPendingApprovals();
      await loadApprovalHistory();
      return true;
    } catch (err) {
      console.error('Ошибка эскалации:', err);
      return false;
    }
  }, [companyId, userId, loadPendingApprovals, loadApprovalHistory]);

  // Проверка, требует ли заявка согласования
  const requiresApproval = useCallback(async (application) => {
    if (!companyId || !application) return false;
    
    try {
      const { data: rules } = await supabase
        .from('approval_rules')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('threshold_amount', { ascending: true });

      if (!rules || rules.length === 0) return false;
      
      const totalAmount = application.total_amount || 0;
      const applicableRule = rules.find(rule => totalAmount >= (rule.threshold_amount || 0));
      
      return !!applicableRule;
    } catch (err) {
      console.error('Ошибка проверки правила:', err);
      return false;
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId && (userRole === 'manager' || userRole === 'director')) {
      loadPendingApprovals();
      loadApprovalHistory();
    } else {
      setLoading(false);
    }
  }, [companyId, userRole, loadPendingApprovals, loadApprovalHistory]);

  return {
    pendingApprovals,
    approvalHistory,
    loading,
    approveApplication,
    rejectApplication,
    escalateApplication,
    requiresApproval
  };
};