// src/hooks/useAuth.js
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} email
 * @property {Object} user_metadata
 * @property {string} user_metadata.role
 * @property {string} user_metadata.company_name
 * @property {string} user_metadata.company_id
 * @property {string} user_metadata.full_name
 * @property {string} user_metadata.phone
 * @property {boolean} user_metadata.is_company_approved
 */

/**
 * @typedef {Object} AuthState
 * @property {UserProfile|null} user
 * @property {string} userRole
 * @property {string|null} userCompany
 * @property {string|null} userCompanyId
 * @property {boolean} isCompanyApproved
 * @property {Object} profileData
 * @property {string} profileData.fullName
 * @property {string} profileData.phone
 * @property {boolean} isLoading
 * @property {boolean} isActionLoading
 * @property {Object|null} error
 */

/**
 * Кастомный хук для управления аутентификацией Supabase
 * @param {Object} config
 * @param {string} config.supabaseUrl
 * @param {string} config.supabaseKey
 * @param {Function} [config.onError] - Callback для обработки ошибок
 * @returns {AuthState & { login: Function, logout: Function, signup: Function, resetPassword: Function, updateProfile: Function, acceptInvitation: Function, refreshSession: Function }}
 */
export const useAuth = ({ supabaseUrl, supabaseKey, onError }) => {
  // Создаём клиент один раз через useRef (избегаем пересоздания)
  const supabaseRef = useRef(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  }
  const supabase = supabaseRef.current;

  // Состояние аутентификации
  const [authState, setAuthState] = useState({
    user: null,
    userRole: 'foreman',
    userCompany: null,
    userCompanyId: null,
    isCompanyApproved: false,
    profileData: { fullName: '', phone: '' },
    invitation: null,
    isLoading: true,
    isActionLoading: false,
    error: null
  });

  // Ref для предотвращения утечек при размонтировании
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Вспомогательная функция для безопасного обновления состояния
  const updateState = useCallback((updates) => {
    if (isMountedRef.current) {
      setAuthState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const handleError = useCallback((error, context) => {
    console.error(`[Auth] ${context}:`, error);
    const errorObj = { message: error.message, code: error.code, context };
    updateState({ error: errorObj });
    onError?.(errorObj);
    return errorObj;
  }, [updateState, onError]);

  // Извлечение данных пользователя из session
  const extractUserData = useCallback((session) => {
    const user = session?.user;
    if (!user) return null;
    
    const metadata = user.user_metadata || {};
    return {
      user,
      userRole: metadata.role || 'foreman',
      userCompany: metadata.company_name?.trim() || null,
      userCompanyId: metadata.company_id || null,
      isCompanyApproved: metadata.is_company_approved === true,
      profileData: {
        fullName: metadata.full_name || '',
        phone: metadata.phone || ''
      },
      invitation: metadata.invitation || null
    };
  }, []);

  // Проверка и загрузка сессии с retry-логикой
  const checkSession = useCallback(async (retries = 3) => {
    updateState({ isLoading: true, error: null });
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const userData = extractUserData(session);
        if (userData) {
          // Дополнительно проверяем статус компании из БД
          if (userData.userCompanyId) {
            const { data: company } = await supabase
              .from('companies')
              .select('approved')
              .eq('id', userData.userCompanyId)
              .maybeSingle();
            if (company) {
              userData.isCompanyApproved = company.approved === true;
            }
          }
          updateState({ ...userData, isLoading: false });
          return userData;
        }
        
        updateState({ isLoading: false });
        return null;
      } catch (err) {
        if (attempt === retries) {
          handleError(err, 'checkSession');
          updateState({ isLoading: false });
          return null;
        }
        // Экспоненциальная задержка перед повторной попыткой
        await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 100));
      }
    }
  }, [supabase, extractUserData, updateState, handleError]);

  // Подписка на изменения аутентификации
  useEffect(() => {
    checkSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] State change:', event);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const userData = extractUserData(session);
        if (userData && userData.userCompanyId) {
          // Проверяем статус компании при входе
          const { data: company } = await supabase
            .from('companies')
            .select('approved')
            .eq('id', userData.userCompanyId)
            .maybeSingle();
          if (company) userData.isCompanyApproved = company.approved === true;
        }
        updateState({ ...userData, isLoading: false, error: null });
      } else if (event === 'SIGNED_OUT') {
        updateState({
          user: null,
          userRole: 'foreman',
          userCompany: null,
          userCompanyId: null,
          isCompanyApproved: false,
          profileData: { fullName: '', phone: '' },
          invitation: null,
          isLoading: false,
          error: null
        });
      } else if (event === 'USER_UPDATED') {
        const userData = extractUserData(session);
        if (userData) updateState({ ...userData });
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, checkSession, extractUserData, updateState]);

  // ==================== AUTH ACTIONS ====================

  /** Вход в систему */
  const login = useCallback(async (email, password) => {
    updateState({ isActionLoading: true, error: null });
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      if (error) throw error;
      // Session change handler will update state
      return { success: true };
    } catch (err) {
      const errorObj = handleError(err, 'login');
      return { success: false, error: errorObj };
    } finally {
      updateState({ isActionLoading: false });
    }
  }, [supabase, updateState, handleError]);

  /** Выход из системы */
  const logout = useCallback(async () => {
    updateState({ isActionLoading: true });
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      // State cleared by onAuthStateChange
      return { success: true };
    } catch (err) {
      return { success: false, error: handleError(err, 'logout') };
    } finally {
      updateState({ isActionLoading: false });
    }
  }, [supabase, updateState, handleError]);

  /** Регистрация нового пользователя */
  const signup = useCallback(async (userData) => {
    updateState({ isActionLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        options: {
          data: {
            full_name: userData.fullName?.trim(),
            phone: userData.phone?.trim(),
            role: userData.role || 'foreman',
            company_name: userData.companyName?.trim(),
            company_id: userData.companyId,
            invitation_token: userData.invitationToken,
            is_company_approved: false // По умолчанию компания не одобрена
          },
          emailRedirectTo: window.location.origin + '/auth/callback'
        }
      });
      if (error) throw error;
      
      const user = data?.user;
      
      // Если есть инвайт-токен, пробуем принять его
      if (userData.invitationToken && user) {
        await acceptInvitation(userData.invitationToken, user.id);
      }
      
      return { success: true, user };
    } catch (err) {
      return { success: false, error: handleError(err, 'signup') };
    } finally {
      updateState({ isActionLoading: false });
    }
  }, [supabase, updateState, handleError]);

  /** Сброс пароля */
  const resetPassword = useCallback(async (email) => {
    updateState({ isActionLoading: true, error: null });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin + '/auth/reset-password'
      });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: handleError(err, 'resetPassword') };
    } finally {
      updateState({ isActionLoading: false });
    }
  }, [supabase, updateState, handleError]);

  /** Обновление профиля пользователя */
  const updateProfile = useCallback(async (updates) => {
    if (!authState.user) return { success: false, error: { message: 'Not authenticated' } };
    
    updateState({ isActionLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: updates.fullName?.trim() ?? authState.profileData.fullName,
          phone: updates.phone?.trim() ?? authState.profileData.phone,
          ...updates.metadata
        }
      });
      if (error) throw error;
      
      const user = data?.user;
      const userData = extractUserData({ user });
      if (userData) {
        updateState({ 
          profileData: userData.profileData,
          userRole: userData.userRole,
          userCompany: userData.userCompany,
          userCompanyId: userData.userCompanyId
        });
      }
      return { success: true, user };
    } catch (err) {
      return { success: false, error: handleError(err, 'updateProfile') };
    } finally {
      updateState({ isActionLoading: false });
    }
  }, [supabase, authState.user, authState.profileData, extractUserData, updateState, handleError]);

  /** Обновление пароля */
  const updatePassword = useCallback(async (newPassword) => {
    updateState({ isActionLoading: true, error: null });
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { success: false, error: handleError(err, 'updatePassword') };
    } finally {
      updateState({ isActionLoading: false });
    }
  }, [supabase, updateState, handleError]);

  /** Принятие приглашения в компанию */
  const acceptInvitation = useCallback(async (token, userId) => {
    updateState({ isActionLoading: true, error: null });
    try {
      // Вызываем RPC для принятия инвайта
      const { data, error } = await supabase.rpc('accept_company_invitation', {
        invitation_token: token,
        user_uuid: userId
      });
      if (error) throw error;
      
      // Обновляем локальное состояние
      if (data?.company_id) {
        updateState({
          userCompany: data.company_name,
          userCompanyId: data.company_id,
          userRole: data.role,
          isCompanyApproved: data.is_company_approved === true,
          invitation: null
        });
      }
      return { success: true, data };
    } catch (err) {
      return { success: false, error: handleError(err, 'acceptInvitation') };
    } finally {
      updateState({ isActionLoading: false });
    }
  }, [supabase, updateState, handleError]);

  /** Проверка валидности инвайт-токена */
  const checkInvitation = useCallback(async (token) => {
    try {
      const { data, error } = await supabase.rpc('check_invitation', {
        invitation_token: token
      });
      if (error) throw error;
      return { valid: data?.valid === true, data };
    } catch (err) {
      handleError(err, 'checkInvitation');
      return { valid: false, error: err.message };
    }
  }, [supabase, handleError]);

  /** Принудительное обновление сессии */
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      const session = data?.session;
      const userData = extractUserData(session);
      if (userData) updateState(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: handleError(err, 'refreshSession') };
    }
  }, [supabase, extractUserData, updateState, handleError]);

  /** Проверка, может ли пользователь создавать заявки */
  const canCreateRequests = useMemo(() => {
    return authState.isCompanyApproved && 
           ['foreman', 'manager', 'super_admin'].includes(authState.userRole);
  }, [authState.isCompanyApproved, authState.userRole]);

  /** Проверка, может ли пользователь управлять складом */
  const canManageWarehouse = useMemo(() => {
    return authState.isCompanyApproved && 
           ['supply_admin', 'manager', 'super_admin'].includes(authState.userRole);
  }, [authState.isCompanyApproved, authState.userRole]);

  // ==================== PUBLIC API ====================
  return {
    // State
    ...authState,
    
    // Actions
    login,
    logout,
    signup,
    resetPassword,
    updateProfile,
    updatePassword,
    acceptInvitation,
    checkInvitation,
    refreshSession,
    checkSession,
    
    // Helpers
    canCreateRequests,
    canManageWarehouse,
    
    // Direct access (for advanced use cases)
    supabase
  };
};