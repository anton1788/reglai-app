// src/components/ConsentModal.jsx
import React, { useState } from 'react';
import { X, Shield, CheckCircle, AlertCircle } from 'lucide-react';

const ConsentModal = ({ isOpen, onClose, onAccept, t }) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleAccept = () => {
    if (!isChecked) {
      // Показать предупреждение
      return;
    }
    setIsSubmitted(true);
    setTimeout(() => {
      onAccept?.();
      onClose();
      setIsChecked(false);
      setIsSubmitted(false);
    }, 500);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] fade-enter"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitted) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4A6572]/10 rounded-lg">
              <Shield className="w-5 h-5 text-[#4A6572] dark:text-[#F9AA33]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('consent.title') || 'Согласие на обработку данных'}
            </h3>
          </div>
          {!isSubmitted && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label={t('close') || 'Закрыть'}
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {isSubmitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('consent.confirmed') || 'Согласие подтверждено'}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('consent.confirmedText') || 'Ваши данные защищены и используются только в соответствии с Политикой конфиденциальности.'}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    {t('consent.notice') || 'Для использования сервиса необходимо дать согласие на обработку персональных данных в соответствии с Федеральным законом № 152-ФЗ.'}
                  </span>
                </p>
              </div>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>{t('consent.byAccepting') || 'Нажимая кнопку «Принимаю», вы даёте согласие на:'}</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{t('consent.point1') || 'Обработку ваших персональных данных (ФИО, телефон, email)'}</li>
                  <li>{t('consent.point2') || 'Хранение данных в защищённой базе данных'}</li>
                  <li>{t('consent.point3') || 'Использование данных для предоставления услуг сервиса'}</li>
                  <li>{t('consent.point4') || 'Получение уведомлений о статусе заявок'}</li>
                </ul>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <input
                  id="consent-checkbox"
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 text-[#4A6572] border-gray-300 rounded focus:ring-[#4A6572]"
                />
                <label htmlFor="consent-checkbox" className="text-sm text-gray-700 dark:text-gray-300">
                  {t('consent.iAccept') || 'Я принимаю условия '}
                  <button
                    type="button"
                    onClick={() => {
                      // Открыть политику конфиденциальности
                      // Можно вызвать пропс или открыть модалку
                    }}
                    className="text-[#4A6572] hover:underline dark:text-[#F9AA33] font-medium"
                  >
                    {t('consent.privacyPolicy') || 'Политики конфиденциальности'}
                  </button>
                  {' '}{t('consent.andConsent') || 'и даю согласие на обработку персональных данных'}
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {t('consent.decline') || 'Отказаться'}
                </button>
                <button
                  onClick={handleAccept}
                  disabled={!isChecked}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isChecked
                      ? 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white hover:shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {t('consent.accept') || 'Принимаю'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConsentModal;