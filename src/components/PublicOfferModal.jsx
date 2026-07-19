// src/components/PublicOfferModal.jsx
import React from 'react';
import { X, Scale } from 'lucide-react';

const PublicOfferModal = ({ isOpen, onClose, t, language }) => {
  if (!isOpen) return null;

  // Используем t для переводов
  const content = {
    ru: {
      title: t('publicOffer.title') || 'Публичная оферта',
      sections: [
        {
          title: t('publicOffer.section1.title') || '1. Общие положения',
          text: t('publicOffer.section1.text') || 'Настоящая публичная оферта (далее — «Оферта») является официальным предложением ООО «Реглай» (далее — «Исполнитель») заключить договор на оказание услуг по предоставлению доступа к программному обеспечению «Реглай PRO» (далее — «Сервис») на условиях, изложенных ниже.'
        },
        {
          title: t('publicOffer.section2.title') || '2. Предмет оферты',
          text: t('publicOffer.section2.text') || 'Исполнитель предоставляет Заказчику доступ к Сервису «Реглай PRO» для управления заявками на материалы, складским учётом, аналитикой и другими функциями, описанными в функциональной документации.'
        },
        {
          title: t('publicOffer.section3.title') || '3. Порядок акцепта',
          text: t('publicOffer.section3.text') || 'Акцептом Оферты считается полное и безоговорочное принятие всех условий Оферты путём регистрации в Сервисе и/или оплаты тарифа. Датой акцепта считается дата регистрации или дата первой оплаты.'
        },
        {
          title: t('publicOffer.section4.title') || '4. Стоимость и порядок оплаты',
          text: t('publicOffer.section4.text') || 'Стоимость услуг определяется тарифным планом, выбранным Заказчиком. Оплата производится безналичным переводом на расчётный счёт Исполнителя. Исполнитель вправе изменять стоимость услуг с уведомлением Заказчика за 30 дней.'
        },
        {
          title: t('publicOffer.section5.title') || '5. Ответственность сторон',
          text: t('publicOffer.section5.text') || 'Исполнитель несёт ответственность за сохранность данных Заказчика в пределах, установленных законодательством РФ. Заказчик несёт ответственность за достоверность вводимых данных и соблюдение авторских прав.'
        },
        {
          title: t('publicOffer.section6.title') || '6. Срок действия',
          text: t('publicOffer.section6.text') || 'Оферта вступает в силу с момента её размещения на сайте и действует до момента отзыва. В случае изменения условий, новая редакция публикуется на сайте и вступает в силу с даты публикации.'
        }
      ],
      footer: t('publicOffer.footer') || '© 2024 ООО «Реглай». Все права защищены.'
    },
    en: {
      title: t('publicOffer.title') || 'Public Offer',
      sections: [
        {
          title: t('publicOffer.section1.title') || '1. General Provisions',
          text: t('publicOffer.section1.text') || 'This public offer (hereinafter — the «Offer») is an official proposal of Reglai LLC (hereinafter — the «Executor») to conclude an agreement for the provision of access to the «Reglai PRO» software (hereinafter — the «Service») on the terms set out below.'
        },
        {
          title: t('publicOffer.section2.title') || '2. Subject of the Offer',
          text: t('publicOffer.section2.text') || 'The Executor provides the Customer with access to the «Reglai PRO» Service for managing material requests, warehouse accounting, analytics and other functions described in the functional documentation.'
        },
        {
          title: t('publicOffer.section3.title') || '3. Acceptance Procedure',
          text: t('publicOffer.section3.text') || 'Acceptance of the Offer is considered full and unconditional acceptance of all terms of the Offer by registering in the Service and/or paying for the tariff. The date of acceptance is the date of registration or the date of the first payment.'
        },
        {
          title: t('publicOffer.section4.title') || '4. Cost and Payment Procedure',
          text: t('publicOffer.section4.text') || 'The cost of services is determined by the tariff plan selected by the Customer. Payment is made by bank transfer to the Executor\'s settlement account. The Executor has the right to change the cost of services with 30 days\' notice to the Customer.'
        },
        {
          title: t('publicOffer.section5.title') || '5. Liability of the Parties',
          text: t('publicOffer.section5.text') || 'The Executor is responsible for the safety of the Customer\'s data within the limits established by the legislation of the Russian Federation. The Customer is responsible for the accuracy of the entered data and compliance with copyright.'
        },
        {
          title: t('publicOffer.section6.title') || '6. Validity Period',
          text: t('publicOffer.section6.text') || 'The Offer comes into force from the moment of its placement on the website and is valid until revoked. In case of changes in terms, the new version is published on the website and comes into force from the date of publication.'
        }
      ],
      footer: t('publicOffer.footer') || '© 2024 Reglai LLC. All rights reserved.'
    }
  };

  // Получаем контент на нужном языке, если ключи есть, иначе используем русский
  const currentContent = content[language] || content.ru;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] fade-enter"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#4A6572]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4A6572]/10 rounded-lg">
              <Scale className="w-6 h-6 text-[#4A6572] dark:text-[#F9AA33]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {currentContent.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t('close') || 'Закрыть'}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {currentContent.sections.map((section, index) => (
            <div key={index} className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {section.title}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {section.text}
              </p>
              {index < currentContent.sections.length - 1 && (
                <hr className="border-gray-200 dark:border-gray-700" />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentContent.footer}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md transition-all font-medium text-sm"
          >
            {t('close') || (language === 'ru' ? 'Закрыть' : 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicOfferModal;