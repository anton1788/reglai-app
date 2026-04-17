// ============================================
// 2. ДОБАВИТЬ В hooks/useApproval.js
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import approvalEngine from '../utils/approvalEngine';

// Константы статусов согласования
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
  EXPIRED: 'expired'
};

export const useApproval = (companyId, userId, userRole) => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState([]);

  // Загрузка ожидающих согласований
  const loadPendingApprovals = useCallback(async () => {
    if (!companyId || !userId) return;
    
    setLoading(true);
    try {
      // Получаем запросы на согласование для компании
      const { data: requests, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          applications:application_id (
            id, 
            object_name, 
            foreman_name, 
            foreman_phone,
            materials, 
            total_amount, 
            created_at, 
            status,
            status_history
          )
        `)
        .eq('company_id', companyId)
        .eq('status', APPROVAL_STATUS.PENDING)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setPendingApprovals(requests || []);
    } catch (err) {
      console.error('loadPendingApprovals error:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, userId]);

  // Загрузка истории согласований
  const loadApprovalHistory = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const { data, error } = await supabase
        .from('approval_history')
        .select(`
          *,
          applications:application_id (id, object_name, foreman_name),
          approver:user_id (email, full_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setApprovalHistory(data || []);
    } catch (err) {
      console.error('loadApprovalHistory error:', err);
    }
  }, [companyId]);

  // Загрузка правил согласования
  const loadApprovalRules = useCallback(async () => {
    if (!companyId) return;
    
    try {
      const { data, error } = await supabase
        .from('approval_rules')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('threshold_amount', { ascending: true });
      
      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      console.error('loadApprovalRules error:', err);
    }
  }, [companyId]);

  // Создание запроса на согласование
  const createApprovalRequest = useCallback(async (application, ruleId = null) => {
    if (!companyId || !userId) return null;
    
    try {
      const { data, error } = await supabase.rpc('create_approval_request', {
        p_application_id: application.id,
        p_company_id: companyId,
        p_requester_id: userId,
        p_total_amount: application.total_amount || 0,
        p_rule_id: ruleId
      });
      
      if (error) throw error;
      await loadPendingApprovals();
      return data;
    } catch (err) {
      console.error('createApprovalRequest error:', err);
      return null;
    }
  }, [companyId, userId, loadPendingApprovals]);

  // Согласование заявки
  const approveApplication = useCallback(async (approvalRequestId, comment = '') => {
    if (!userId) return false;
    
    try {
      // Используем RPC для обработки согласования
      const { data, error } = await supabase.rpc('approve_application', {
        p_approval_request_id: approvalRequestId,
        p_approver_id: userId,
        p_comment: comment,
        p_approver_role: userRole
      });
      
      if (error) {
        // Fallback на approvalEngine если RPC не существует
        const result = await approvalEngine.processApproval(
          approvalRequestId,
          'approve',
          comment,
          userId
        );
        await loadPendingApprovals();
        await loadApprovalHistory();
        return result;
      }
      
      await loadPendingApprovals();
      await loadApprovalHistory();
      return data;
    } catch (err) {
      console.error('approveApplication error:', err);
      return false;
    }
  }, [userId, userRole, loadPendingApprovals, loadApprovalHistory]);

  // Отклонение заявки
  const rejectApplication = useCallback(async (approvalRequestId, reason = '') => {
    if (!userId) return false;
    
    try {
      const { data, error } = await supabase.rpc('reject_application', {
        p_approval_request_id: approvalRequestId,
        p_approver_id: userId,
        p_reason: reason
      });
      
      if (error) {
        const result = await approvalEngine.processApproval(
          approvalRequestId,
          'reject',
          reason,
          userId
        );
        await loadPendingApprovals();
        await loadApprovalHistory();
        return result;
      }
      
      await loadPendingApprovals();
      await loadApprovalHistory();
      return data;
    } catch (err) {
      console.error('rejectApplication error:', err);
      return false;
    }
  }, [userId, loadPendingApprovals, loadApprovalHistory]);

  // Эскалация (передача выше)
  const escalateApplication = useCallback(async (approvalRequestId, reason = '') => {
    if (!userId) return false;
    
    try {
      const { data, error } = await supabase.rpc('escalate_approval', {
        p_approval_request_id: approvalRequestId,
        p_escalated_by: userId,
        p_reason: reason
      });
      
      if (error) {
        const result = await approvalEngine.processApproval(
          approvalRequestId,
          'escalate',
          reason,
          userId
        );
        await loadPendingApprovals();
        return result;
      }
      
      await loadPendingApprovals();
      return data;
    } catch (err) {
      console.error('escalateApplication error:', err);
      return false;
    }
  }, [userId, loadPendingApprovals]);

  // Проверка, требуется ли согласование
  const requiresApproval = useCallback(async (materials, totalAmount) => {
    if (!companyId) return false;
    
    try {
      // Если правила уже загружены, используем их
      if (rules.length > 0) {
        for (const rule of rules) {
          if (rule.threshold_amount && totalAmount >= rule.threshold_amount) {
            return true;
          }
          if (rule.rule_type === 'always') {
            return true;
          }
        }
        return false;
      }
      
      // Иначе загружаем правила из БД
      const { data, error } = await supabase
        .from('approval_rules')
        .select('id, threshold_amount, rule_type')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('threshold_amount', { ascending: true });
      
      if (error) throw error;
      
      for (const rule of data || []) {
        if (rule.threshold_amount && totalAmount >= rule.threshold_amount) {
          return true;
        }
        if (rule.rule_type === 'always') {
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('requiresApproval error:', err);
      // Fallback: проверка по сумме > 50000
      return totalAmount > 50000;
    }
  }, [companyId, rules]);

  // Получение следующего уровня согласования
  const getNextApprovalLevel = useCallback(async (currentLevel, totalAmount) => {
    if (!companyId) return null;
    
    try {
      const { data, error } = await supabase.rpc('get_next_approval_level', {
        p_company_id: companyId,
        p_current_level: currentLevel,
        p_amount: totalAmount
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('getNextApprovalLevel error:', err);
      return null;
    }
  }, [companyId]);

  useEffect(() => {
    if (userRole === 'manager' || userRole === 'director' || userRole === 'admin') {
      loadPendingApprovals();
      loadApprovalHistory();
      loadApprovalRules();
    }
  }, [userRole, loadPendingApprovals, loadApprovalHistory, loadApprovalRules]);

  return {
    pendingApprovals,
    approvalHistory,
    rules,
    loading,
    createApprovalRequest,
    approveApplication,
    rejectApplication,
    escalateApplication,
    requiresApproval,
    getNextApprovalLevel,
    loadPendingApprovals,
    loadApprovalHistory
  };
};

export default useApproval;