import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';

const ApprovalModal = ({ isOpen, onClose, application, onApprove, onReject, onEscalate, language = 'ru' }) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionResult, setActionResult] = useState(null); // null | 'success' | 'error'
  const [resultMessage, setResultMessage] = useState('');
  
  // Auto-close after success feedback
  useEffect(() => {
    if (actionResult === 'success') {
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [actionResult, onClose]);
  
  if (!isOpen || !application) return null;
  
  const t = (key) => {
    const translations = {
      'approve_title': { ru: 'Согласование заявки', en: 'Application Approval' },
      'approve_comment': { ru: 'Комментарий (обязательно)', en: 'Comment (required)' },
      'approve_placeholder': { ru: 'Укажите причину решения...', en: 'Provide reason for decision...' },
      'btn_approve': { ru: 'Согласовать', en: 'Approve' },
      'btn_reject': { ru: 'Отклонить', en: 'Reject' },
      'btn_escalate': { ru: 'Эскалировать', en: 'Escalate' },
      'total_amount': { ru: 'Сумма заявки', en: 'Total Amount' },
      'deadline': { ru: 'Срок согласования', en: 'Approval Deadline' },
      'success_approved': { ru: '✅ Заявка согласована!', en: '✅ Application approved!' },
      'success_rejected': { ru: '❌ Заявка отклонена', en: '❌ Application rejected' },
      'success_escalated': { ru: '📤 Заявка эскалирована', en: '📤 Application escalated' },
      'error_occurred': { ru: '⚠️ Произошла ошибка', en: '⚠️ An error occurred' }
    };
    return translations[key]?.[language] || key;
  };
  
  const totalAmount = application.materials?.reduce((sum, m) => 
    sum + (m.quantity * (m.price || 1000)), 0
  ) || 0;
  
  const handleSubmit = async (action) => {
    if (action !== 'approve' && !comment.trim()) {
      alert(t('approve_comment'));
      return;
    }
    
    setIsSubmitting(true);
    setActionResult(null);
    
    try {
      switch(action) {
        case 'approve':
          await onApprove(application.id, comment);
          setActionResult('success');
          setResultMessage(t('success_approved'));
          break;
        case 'reject':
          await onReject(application.id, comment);
          setActionResult('success');
          setResultMessage(t('success_rejected'));
          break;
        case 'escalate':
          await onEscalate(application.id, comment);
          setActionResult('success');
          setResultMessage(t('success_escalated'));
          break;
      }
    } catch (error) {
      console.error('Approval error:', error);
      setActionResult('error');
      setResultMessage(`${t('error_occurred')}: ${error.message}`);
      // Allow user to retry or close on error
      setTimeout(() => {
        setActionResult(null);
        setIsSubmitting(false);
      }, 3000);
      return;
    } finally {
      if (actionResult !== 'error') {
        setIsSubmitting(false);
      }
    }
  };
  
  // Render success overlay
  if (actionResult === 'success') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 fade-enter">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-8 text-center animate-pulse">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400 animate-bounce" />
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {resultMessage}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'ru' ? 'Закрытие...' : 'Closing...'}
          </p>
        </div>
      </div>
    );
  }
  
  // Render error overlay
  if (actionResult === 'error') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 fade-enter">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h4 className="font-semibold text-red-700 dark:text-red-400">
                {t('error_occurred')}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {resultMessage}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setActionResult(null);
              setIsSubmitting(false);
            }}
            className="w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            {language === 'ru' ? 'Попробовать снова' : 'Try again'}
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 fade-enter">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('approve_title')}
          </h3>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Application Info */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>{application.object_name}</strong>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {t('total_amount')}: {totalAmount.toLocaleString('ru-RU')} ₽
          </p>
          <p className="text-sm text-gray-500 flex items-center mt-1">
            <Clock className="w-4 h-4 mr-1" />
            {t('deadline')}: {new Date(application.approval_deadline).toLocaleString()}
          </p>
        </div>
        
        {/* Materials Preview */}
        <div className="mb-4 max-h-40 overflow-y-auto">
          <p className="text-sm font-medium mb-2">Материалы:</p>
          {application.materials?.slice(0, 5).map((m, idx) => (
            <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 py-1 border-b dark:border-gray-600">
              {m.description} - {m.quantity} {m.unit}
            </div>
          ))}
          {application.materials?.length > 5 && (
            <p className="text-xs text-gray-400 mt-1">
              + еще {application.materials.length - 5} позиций
            </p>
          )}
        </div>
        
        {/* Comment Field */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            {t('approve_comment')}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            rows="3"
            placeholder={t('approve_placeholder')}
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleSubmit('approve')}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            {t('btn_approve')}
          </button>
          
          <button
            onClick={() => handleSubmit('reject')}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            {t('btn_reject')}
          </button>
          
          <button
            onClick={() => handleSubmit('escalate')}
            disabled={isSubmitting}
            className="w-full py-2.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {t('btn_escalate')}
          </button>
        </div>
        
        {/* Loading indicator */}
        {isSubmitting && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
            {language === 'ru' ? 'Обработка...' : 'Processing...'}
          </p>
        )}
      </div>
    </div>
  );
};

export default ApprovalModal;