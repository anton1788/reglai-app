import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

const ApprovalModal = ({ isOpen, onClose, application, onApprove, onReject, onEscalate, language = 'ru' }) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
      'deadline': { ru: 'Срок согласования', en: 'Approval Deadline' }
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
    try {
      switch(action) {
        case 'approve':
          await onApprove(application.id, comment);
          break;
        case 'reject':
          await onReject(application.id, comment);
          break;
        case 'escalate':
          await onEscalate(application.id, comment);
          break;
      }
      onClose();
    } catch (error) {
      console.error('Approval error:', error);
      alert('Ошибка: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 fade-enter">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('approve_title')}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
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
            <div key={idx} className="text-xs text-gray-600 py-1 border-b">
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
          <label className="block text-sm font-medium mb-1">
            {t('approve_comment')}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder={t('approve_placeholder')}
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleSubmit('approve')}
            disabled={isSubmitting}
            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            {t('btn_approve')}
          </button>
          
          <button
            onClick={() => handleSubmit('reject')}
            disabled={isSubmitting}
            className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            {t('btn_reject')}
          </button>
          
          <button
            onClick={() => handleSubmit('escalate')}
            disabled={isSubmitting}
            className="w-full py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center justify-center gap-2"
          >
            <AlertCircle className="w-4 h-4" />
            {t('btn_escalate')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;