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
    showDetails: 'Показать детали',
    support: 'Сообщить в поддержку'
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
    showDetails: 'Show details',
    support: 'Report to support'
  }
};

const AUTO_REDIRECT_SECONDS = 10;
const MAX_STACK_LENGTH = 2000;
const CONSOLE_STYLES = {
  error: 'color: #ff6b6b; font-size: 14px; font-weight: bold;',
  info: 'color: #4ecdc4; font-size: 12px;'
};

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ (чистые функции)
// ─────────────────────────────────────────────────────────────

const getLanguage = () => {
  const lang = navigator.language?.toLowerCase() || 'en';
  return lang.startsWith('ru') ? 'ru' : 'en';
};

const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[<>]/g, '')
    .slice(0, 5000);
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
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

const formatErrorReport = (error, errorInfo, userAgent, url, timestamp) => {
  return {
    message: error?.message || 'Unknown error',
    stack: error?.stack?.slice(0, MAX_STACK_LENGTH) || 'No stack',
    componentStack: errorInfo?.componentStack?.slice(0, MAX_STACK_LENGTH) || 'No component stack',
    userAgent,
    url,
    timestamp,
    environment: import.meta.env?.MODE || 'development'
  };
};

// ─────────────────────────────────────────────────────────────
// 🧩 КОМПОНЕНТ ERROR BOUNDARY
// ─────────────────────────────────────────────────────────────

export class ErrorBoundary extends Component {
  state = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
    redirectCountdown: AUTO_REDIRECT_SECONDS,
    isRedirectCancelled: false
  };

  redirectTimer = null;

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const { supabase, companyId, onError } = this.props;
    
    this.setState({ errorInfo });
    
    // Стилизованный лог в консоль
    console.groupCollapsed(
      '%c🔴 ErrorBoundary caught an error',
      CONSOLE_STYLES.error
    );
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo?.componentStack);
    console.groupEnd();

    // Форматирование отчёта
    const errorReport = formatErrorReport(
      error,
      errorInfo,
      navigator.userAgent,
      window.location.href,
      new Date().toISOString()
    );

    // 🔧 ИСПРАВЛЕНО: передаём supabase в функцию
    this.reportErrorToService(errorReport, supabase, companyId);

    // Вызов колбэка
    onError?.(error, errorInfo);

    // Запуск таймера
    this.startRedirectTimer();
  }

  // 🔧 ИСПРАВЛЕНО: метод теперь внутри класса
  reportErrorToService = async (errorReport, supabase, companyId) => {
    try {
      if (supabase && companyId) {
        await supabase
          .from('error_logs')
          .insert([{
            company_id: companyId,
            error_message: errorReport.message,
            error_stack: errorReport.stack,
            component_stack: errorReport.componentStack,
            user_agent: errorReport.userAgent,
            url: errorReport.url,
            environment: errorReport.environment,
            created_at: errorReport.timestamp
          }]);
        console.log('✅ Error logged to Supabase');
      }
    } catch (err) {
      console.error('❌ Failed to report error:', err);
    }
  };

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.clearRedirectTimer();
  }

  handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      this.handleGoBack();
    } else if (e.key === 'Enter' && this.state.hasError) {
      this.handleReload();
    } else if (e.key === 'c' && (e.ctrlKey || e.metaKey) && this.state.hasError) {
      this.handleCopyError();
    }
  };

  startRedirectTimer = () => {
    const { autoRedirect = true } = this.props;
    
    if (!autoRedirect) return;
    
    this.redirectTimer = setInterval(() => {
      this.setState(prev => {
        if (prev.redirectCountdown <= 1) {
          this.clearRedirectTimer();
          if (!prev.isRedirectCancelled) {
            const { redirectUrl = '/' } = this.props;
            window.location.href = redirectUrl;
          }
          return prev;
        }
        return { redirectCountdown: prev.redirectCountdown - 1 };
      });
    }, 1000);
  };

  clearRedirectTimer = () => {
    if (this.redirectTimer) {
      clearInterval(this.redirectTimer);
      this.redirectTimer = null;
    }
  };

  handleReload = () => {
    this.clearRedirectTimer();
    window.location.reload();
  };

  handleGoBack = () => {
    this.clearRedirectTimer();
    this.setState({ isRedirectCancelled: true });
    
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = this.props.redirectUrl || '/';
    }
  };

  handleCancelRedirect = () => {
    this.setState({ isRedirectCancelled: true });
    this.clearRedirectTimer();
  };

  toggleDetails = () => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    const errorText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ОТЧЁТ ОБ ОШИБКЕ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ Время: ${new Date().toISOString()}
🌐 URL: ${window.location.href}
💻 User Agent: ${navigator.userAgent}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Ошибка:
${error?.message || 'Unknown error'}

📚 Stack Trace:
${error?.stack || 'No stack'}

🧩 Component Stack:
${errorInfo?.componentStack?.slice(0, MAX_STACK_LENGTH) || 'No component stack'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    const success = await copyToClipboard(errorText);
    this.setState({ copied: success });
    
    setTimeout(() => {
      this.setState({ copied: false });
    }, 3000);
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const lang = getLanguage();
    const t = ERROR_MESSAGES[lang];
    const { error, errorInfo, showDetails, copied, redirectCountdown, isRedirectCancelled } = this.state;
    const { showDetails: showDetailsProp = false } = this.props;
    
    const showDevDetails = showDetails || showDetailsProp;
    const isDev = import.meta.env?.MODE === 'development';
    const errorMessage = sanitizeText(error?.message || 'Unknown error');
    const componentStack = errorInfo?.componentStack 
      ? sanitizeText(errorInfo.componentStack).slice(0, MAX_STACK_LENGTH)
      : '';

    return (
      <section 
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4"
        role="alert"
        aria-live="assertive"
      >
        <article className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center transform transition-all duration-500 animate-fade-in">
          
          {/* Animated Icon */}
          <div 
            className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce"
            aria-hidden="true"
          >
            <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {t.title}
          </h1>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {t.description}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
            {t.tryReload}
          </p>

          {/* Auto-redirect indicator */}
          {!isRedirectCancelled && this.props.autoRedirect !== false && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{t.autoRedirect} <strong>{redirectCountdown}</strong> {t.seconds}...</span>
              </div>
              <button
                onClick={this.handleCancelRedirect}
                className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
              >
                Отменить автоматический переход
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:shadow-lg transition-all focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 font-medium"
            >
              🔄 {t.reload}
            </button>
            
            <button
              type="button"
              onClick={this.handleGoBack}
              className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl hover:shadow-lg transition-all focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 font-medium"
            >
              ← {t.goBack}
            </button>
          </div>

          {/* Additional buttons for production */}
          {!isDev && (
            <button
              onClick={this.handleReportToSupport}
              className="w-full px-4 py-2 text-sm bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors mb-4"
            >
              📧 {t.support}
            </button>
          )}

          {/* Copy Error Button (dev only) */}
          {isDev && (
            <button
              type="button"
              onClick={this.handleCopyError}
              className={`w-full px-4 py-2 text-sm rounded-xl transition-all mb-4 font-medium ${
                copied
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {copied ? '✅ ' + t.copied : '📋 ' + t.copyError}
            </button>
          )}

          {/* Toggle Details */}
          {(isDev || showDevDetails) && errorInfo && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium mb-3 transition-colors"
                aria-expanded={showDetails}
                aria-controls="error-details"
              >
                {showDetails ? '🔽 ' + t.hideDetails : '▶ ' + t.showDetails}
              </button>

              {showDetails && (
                <div id="error-details" className="text-left">
                  <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-xl overflow-auto max-h-60 font-mono text-xs">
                    <p className="font-semibold text-red-600 dark:text-red-400 mb-2 break-all">
                      {errorMessage}
                    </p>
                    {componentStack && (
                      <pre className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">
                        {componentStack}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hint for keyboard users */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
            💡 Нажмите <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd> для возврата или {' '}
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> для перезагрузки
          </p>
        </article>
      </section>
    );
  }
}

export default ErrorBoundary;