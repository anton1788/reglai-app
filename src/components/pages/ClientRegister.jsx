// src/components/pages/ClientRegister.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const ClientRegister = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('invite');
  
  const [step, setStep] = useState('loading'); // loading, form, success, error
  const [invitation, setInvitation] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Загрузка данных приглашения
  const loadInvitation = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, companies(name)')
        .eq('id', inviteToken)
        .eq('accepted', false)
        .eq('role', 'client')
        .single();
      
      if (error || !data) {
        throw new Error('Приглашение не найдено или уже использовано');
      }
      
      setInvitation(data);
      setFormData(prev => ({
        ...prev,
        fullName: data.metadata?.full_name || '',
        phone: data.metadata?.phone || '',
        email: data.email || ''
      }));
      setStep('form');
      
    } catch (err) {
      console.error('Ошибка загрузки приглашения:', err);
      setStep('error');
      setError(err.message);
    }
  }, [inviteToken]);

  useEffect(() => {
    if (!inviteToken) {
      setStep('error');
      setError('Ссылка-приглашение не найдена');
      return;
    }
    
    loadInvitation();
  }, [inviteToken, loadInvitation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // ✅ ВАЖНО: Если есть активная сессия (руководитель), выходим из неё
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('[ClientRegister] Выход из текущей сессии перед регистрацией');
        await supabase.auth.signOut();
        // Небольшая задержка для завершения выхода
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 1. Регистрируем пользователя
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            role: 'client',
            company_id: invitation.company_id,
            company_name: invitation.companies?.name,
            invited_by: invitation.invited_by
          }
        }
      });
      
      if (signUpError) throw signUpError;
      
      if (!authData.user) throw new Error('Ошибка создания пользователя');
      
      // 2. Создаём запись в таблице clients
      const { error: clientError } = await supabase
        .from('clients')
        .insert([{
          user_id: authData.user.id,
          company_id: invitation.company_id,
          full_name: formData.fullName,
          phone: formData.phone,
          email: formData.email
        }]);
      
      if (clientError) {
        console.warn('Ошибка clients (не критично):', clientError);
      }
      
      // 3. Помечаем приглашение как использованное
      await supabase
        .from('invitations')
        .update({ 
          accepted: true, 
          accepted_at: new Date().toISOString(),
          client_id: authData.user.id
        })
        .eq('id', inviteToken);
      
      // 4. Создаём запись в company_users
      const { error: companyUserError } = await supabase
        .from('company_users')
        .insert([{
          user_id: authData.user.id,
          company_id: invitation.company_id,
          role: 'client',
          full_name: formData.fullName,
          phone: formData.phone,
          is_active: true
        }]);
      
      if (companyUserError) {
        console.warn('Ошибка company_users (не критично):', companyUserError);
      }
      
      // 5. Автоматический вход после регистрации
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      
      if (signInError) {
        console.warn('Ошибка автовхода:', signInError);
      }
      
      setStep('success');
      
      // Перенаправление через 2 секунды
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Состояние загрузки
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Состояние ошибки
  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Ошибка</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
          >
            На главную
          </button>
        </div>
      </div>
    );
  }

  // Состояние успеха
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Регистрация успешна!</h2>
          <p className="text-gray-600 mb-4">
            Добро пожаловать, {formData.fullName}!<br />
            Вы будете перенаправлены в личный кабинет...
          </p>
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
        </div>
      </div>
    );
  }

  // Форма регистрации
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
          <UserPlus className="w-8 h-8 mb-2" />
          <h1 className="text-xl font-bold">Регистрация заказчика</h1>
          <p className="text-sm opacity-90">Компания: {invitation?.companies?.name}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">ФИО</label>
            <input
              type="text"
              value={formData.fullName}
              className="w-full px-3 py-2 border rounded-lg bg-gray-50"
              disabled
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Телефон</label>
            <input
              type="tel"
              value={formData.phone}
              className="w-full px-3 py-2 border rounded-lg bg-gray-50"
              disabled
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Пароль *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Подтвердите пароль *</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Зарегистрироваться
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClientRegister;