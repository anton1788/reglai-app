// src/components/ErrorBoundary.jsx
import { Component } from 'react';

// ─────────────────────────────────────────────────────────────
// 📦 КОНСТАНТЫ
// ─────────────────────────────────────────────────────────────

const ERROR_MESSAGES = {
  ru: {
    title: 'Произошла ошибка',
    description: 'Приложение столкнулось с непредвиденной проблемой.',
    tryReload: 'Попробуйте обновить страницу',
    goBack: 'Вернуться назад',
    reload: 'Обновить',
    copyError: 'Скопировать ошибку',
    copied: 'Скопировано!',
    autoRedirect: 'Автоматический переход на главную через',
    seconds: 'сек',
    details: 'Детали ошибки (только для разработчиков)',
    hideDetails: 'Скрыть детали',
    showDetails: 'Показать детали'
  },
  en: {
    title: 'Something went wrong',
    description: 'The application encountered an unexpected error.',
    tryReload: 'Try refreshing the page',
    goBack: 'Go back',
    reload: 'Reload',
    copyError: 'Copy error',
    copied: 'Copied!',
    autoRedirect: 'Redirecting to home in',
    seconds: 'sec',
    details: 'Error details (developers only)',
    hideDetails: 'Hide details',
    showDetails: 'Show details'
  }
};

const AUTO_REDIRECT_SECONDS = 10;
const MAX_STACK_LENGTH = 2000;

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ (чистые функции)
// ─────────────────────────────────────────────────────────────

/**
 * Определяет язык интерфейса
 * @returns {'ru' | 'en'}
 */
const getLanguage = () => {
  const lang = navigator.language?.toLowerCase() || 'en';
  return lang.startsWith('ru') ? 'ru' : 'en';
};

/**
 * Санитизация текста для безопасного рендера
 * @param {string} text
 * @returns {string}
 */
const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[<>]/g, '') // Базовая XSS-защита
    .slice(0, 5000); // Ограничение длины
};

/**
 * Копирование текста в буфер обмена
 * @param {string} text
 * @returns {Promise<boolean>}
 */
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback для старых браузеров
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }
};

// ─────────────────────────────────────────────────────────────
// 🧩 КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────

/**
 * Error Boundary компонент для перехвата ошибок React
 * @augments {Component<{ children: React.ReactNode }, ErrorBoundaryState>}
 */
export class ErrorBoundary extends Component {
  /** @type {ErrorBoundaryState} */
  state = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
    redirectCountdown: AUTO_REDIRECT_SECONDS
  };

  /** @type {NodeJS.Timeout | null} */
  redirectTimer = null;

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    
    // Логирование в консоль
    console.error('ErrorBoundary caught:', {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack
    });

    // Отправка в мониторинг (только в production)
    try {
      // eslint-disable-next-line no-undef
      if (import.meta.env?.PROD) {
        // reportErrorToService(error, errorInfo);
      }
    } catch {
      // Игнорируем ошибки доступа к import.meta.env
    }

    // Запуск таймера авто-редиректа
    this.startRedirectTimer();
  }

  componentDidMount() {
    // Обработчик клавиатуры
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.clearRedirectTimer();
  }

  /**
   * Обработчик клавиатуры
   * @param {KeyboardEvent} e
   */
  handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      // Возврат назад по Escape
      window.history.back();
    } else if (e.key === 'Enter' && this.state.hasError) {
      // Перезагрузка по Enter
      this.handleReload();
    }
  };

  /**
   * Запуск таймера авто-редиректа
   */
  startRedirectTimer = () => {
    this.redirectTimer = setInterval(() => {
      this.setState(prev => {
        if (prev.redirectCountdown <= 1) {
          this.clearRedirectTimer();
          window.location.href = '/';
          return prev;
        }
        return { redirectCountdown: prev.redirectCountdown - 1 };
      });
    }, 1000);
  };

  /**
   * Очистка таймера
   */
  clearRedirectTimer = () => {
    if (this.redirectTimer) {
      clearInterval(this.redirectTimer);
      this.redirectTimer = null;
    }
  };

  /**
   * Перезагрузка страницы
   */
  handleReload = () => {
    this.clearRedirectTimer();
    window.location.reload();
  };

  /**
   * Возврат назад
   */
  handleGoBack = () => {
    this.clearRedirectTimer();
    window.history.back();
  };

  /**
   * Переключение видимости деталей
   */
  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  /**
   * Копирование ошибки в буфер
   */
  handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    const errorText = `
Error: ${error?.message || 'Unknown error'}
Stack: ${error?.stack || 'No stack'}
Component Stack: ${errorInfo?.componentStack?.slice(0, MAX_STACK_LENGTH) || 'No component stack'}
    `.trim();

    const success = await copyToClipboard(errorText);
    this.setState({ copied: success });
    
    // Сброс статуса "copied" через 2 секунды
    setTimeout(() => {
      this.setState({ copied: false });
    }, 2000);
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const lang = getLanguage();
    const t = ERROR_MESSAGES[lang];
    const { error, errorInfo, showDetails, copied, redirectCountdown } = this.state;
    const errorMessage = sanitizeText(error?.message || 'Unknown error');
    const componentStack = errorInfo?.componentStack 
      ? sanitizeText(errorInfo.componentStack).slice(0, MAX_STACK_LENGTH)
      : '';

    return (
      <section 
        className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4"
        role="alert"
        aria-live="assertive"
      >
        <article className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
          
          {/* Icon */}
          <div 
            className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
            aria-hidden="true"
          >
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t.title}
          </h1>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-1">
            {t.description}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
            {t.tryReload}
          </p>

          {/* Auto-redirect indicator */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            {t.autoRedirect} <span className="font-medium">{redirectCountdown}</span> {t.seconds}...
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center mb-4">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              aria-label={t.reload}
            >
              {t.reload}
            </button>
            
            <button
              type="button"
              onClick={this.handleGoBack}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              aria-label={t.goBack}
            >
              {t.goBack}
            </button>
          </div>

          {/* Copy Error Button (dev only) */}
          {import.meta.env?.DEV && (
            <button
              type="button"
              onClick={this.handleCopyError}
              className={`w-full px-4 py-2 text-sm rounded-lg transition-colors mb-4 ${
                copied
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
              aria-label={copied ? t.copied : t.copyError}
            >
              {copied ? t.copied : t.copyError}
            </button>
          )}

          {/* Toggle Details */}
          {import.meta.env?.DEV && errorInfo && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium mb-2"
                aria-expanded={showDetails}
                aria-controls="error-details"
              >
                {showDetails ? t.hideDetails : t.showDetails}
              </button>

              {showDetails && (
                <details id="error-details" open>
                  <summary className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                    {t.details}
                  </summary>
                  <div className="text-left text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-40 font-mono text-gray-800 dark:text-gray-200">
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-1">
                      {errorMessage}
                    </p>
                    {componentStack && (
                      <pre className="whitespace-pre-wrap break-words">
                        {componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}
        </article>
      </section>
    );
  }
}

export default ErrorBoundary;