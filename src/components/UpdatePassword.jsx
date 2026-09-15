// src/components/UpdatePassword.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowLeft, Shield, Lock, KeyRound
} from 'lucide-react';

const UpdatePassword = () => {
  // ─────────────────────────────────────────────────────────
  // 📊 STATE
  // ─────────────────────────────────────────────────────────
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // 'info' | 'error' | 'success'
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: '',
    color: ''
  });

  // ─────────────────────────────────────────────────────────
  // 🔐 ПРОВЕРКА СЕССИИ ВОССТАНОВЛЕНИЯ
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        // Supabase автоматически обрабатывает токен из URL хэша
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session check error:', error);
          setMessage('Ошибка проверки сессии. Попробуйте перейти по ссылке из письма ещё раз.');
          setMessageType('error');
          setCheckingSession(false);
          return;
        }

        // Проверяем, есть ли событие PASSWORD_RECOVERY
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (session?.user) {
          setIsValidSession(true);
        } else if (accessToken && type === 'recovery') {
          // Supabase обработает токен автоматически
          setIsValidSession(true);
        } else {
          setMessage('Ссылка недействительна или устарела. Запросите новую ссылку для сброса пароля.');
          setMessageType('error');
        }
      } catch (err) {
        console.error('Recovery check error:', err);
        setMessage('Ошибка проверки ссылки. Попробуйте ещё раз.');
        setMessageType('error');
      } finally {
        setCheckingSession(false);
      }
    };

    // Слушаем событие восстановления пароля от Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidSession(true);
          setCheckingSession(false);
        } else if (event === 'SIGNED_IN' && session?.user) {
          setIsValidSession(true);
          setCheckingSession(false);
        }
      }
    );

    checkRecoverySession();

    // Таймаут на случай, если ничего не сработало
    const timeout = setTimeout(() => {
      setCheckingSession(false);
    }, 5000);

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // 💪 ОЦЕНКА НАДЁЖНОСТИ ПАРОЛЯ
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!password) {
      setPasswordStrength({ score: 0, label: '', color: '' });
      return;
    }

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    let label = '';
    let color = '';
    if (score <= 2) {
      label = 'Слабый пароль';
      color = 'text-red-500';
    } else if (score === 3) {
      label = 'Средний пароль';
      color = 'text-yellow-500';
    } else if (score === 4) {
      label = 'Хороший пароль';
      color = 'text-blue-500';
    } else {
      label = 'Отличный пароль';
      color = 'text-green-500';
    }

    setPasswordStrength({ score, label, color });
  }, [password]);

  // ─────────────────────────────────────────────────────────
  // 🔄 ОБНОВЛЕНИЕ ПАРОЛЯ
  // ─────────────────────────────────────────────────────────
  const handleUpdatePassword = useCallback(async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage('Пароли не совпадают');
      setMessageType('error');
      return;
    }

    if (password.length < 6) {
      setMessage('Пароль должен содержать минимум 6 символов');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setMessage('✅ Пароль успешно обновлён! Перенаправляем на главную...');
      setMessageType('success');
      setIsSuccess(true);

      // Очищаем URL от токена
      window.history.replaceState({}, document.title, '/update-password');

      // Перенаправляем на главную через 2 секунды
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (err) {
      console.error('Update password error:', err);
      let errorMsg = 'Ошибка при обновлении пароля';

      if (err.message?.includes('same password')) {
        errorMsg = 'Новый пароль должен отличаться от старого';
      } else if (err.message?.includes('weak')) {
        errorMsg = 'Пароль слишком слабый. Используйте более надёжный пароль.';
      } else if (err.message) {
        errorMsg = err.message;
      }

      setMessage(errorMsg);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, [password, confirmPassword]);

  // ─────────────────────────────────────────────────────────
  // ⏳ ЗАГРУЗКА (проверка сессии)
  // ─────────────────────────────────────────────────────────
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F7FA] via-white to-[#E4EDF5] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#4A6572]/20 to-[#344955]/20 mb-4">
            <Loader2 className="w-8 h-8 text-[#4A6572] animate-spin" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Проверка ссылки...</p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // ❌ НЕВАЛИДНАЯ СЕССИЯ
  // ─────────────────────────────────────────────────────────
  if (!isValidSession) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#F5F7FA] via-white to-[#E4EDF5] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#F9AA33]/5 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#4A6572]/5 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-md w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50 text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Ссылка недействительна
          </h2>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {message || 'Ссылка для сброса пароля устарела или уже была использована. Запросите новую ссылку.'}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться на главную
            </button>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Чтобы получить новую ссылку, вернитесь на страницу входа и нажмите «Забыли пароль?»
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // ✅ ФОРМА ОБНОВЛЕНИЯ ПАРОЛЯ
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#F5F7FA] via-white to-[#E4EDF5] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 page-enter">
      {/* Декоративный фон */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#F9AA33]/5 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#4A6572]/5 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-md w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">

        {/* Логотип и заголовок */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#4A6572]/20 to-[#344955]/20 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-xl flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#4A6572] to-[#344955] bg-clip-text text-transparent dark:text-white">
            Новый пароль
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Придумайте надёжный пароль для вашего аккаунта
          </p>
        </div>

        {/* Форма */}
        <form onSubmit={handleUpdatePassword}>
          <div className="space-y-4">

            {/* Новый пароль */}
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Новый пароль *
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  disabled={isSuccess}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Индикатор надёжности */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.score <= 2 ? 'bg-red-500' :
                          passwordStrength.score === 3 ? 'bg-yellow-500' :
                          passwordStrength.score === 4 ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Подтверждение пароля */}
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Подтвердите пароль *
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-red-400 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="••••••••"
                  required
                  disabled={isSuccess}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Индикатор совпадения */}
              {confirmPassword && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${
                  password === confirmPassword
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400'
                }`}>
                  {password === confirmPassword ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      Пароли совпадают
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" />
                      Пароли не совпадают
                    </>
                  )}
                </p>
              )}
            </div>

            {/* Сообщение */}
            {message && (
              <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
                messageType === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : messageType === 'error'
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}>
                {messageType === 'success' ? (
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                )}
                <span>{message}</span>
              </div>
            )}

            {/* Кнопка */}
            <button
              type="submit"
              disabled={loading || isSuccess || !password || password !== confirmPassword}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Сохранение...</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Готово!</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Сохранить новый пароль</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Ссылка назад */}
        {!isSuccess && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="text-sm text-[#4A6572] hover:text-[#344955] dark:text-[#F9AA33] dark:hover:text-[#F57C00] font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Вернуться на главную
            </button>
          </div>
        )}

        {/* Подсказки безопасности */}
        <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-[#4A6572] dark:text-[#F9AA33] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">Требования к паролю:</p>
              <ul className="space-y-0.5">
                <li>• Минимум 6 символов</li>
                <li>• Рекомендуется: заглавные + строчные буквы, цифры, символы</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatePassword;