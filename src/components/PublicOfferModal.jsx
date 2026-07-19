import React from 'react';
import { X, Scale } from 'lucide-react';

const PublicOfferModal = ({ isOpen, onClose, t }) => {
  if (!isOpen) return null;

  // Используем t() для получения переводов
  const getText = (key, defaultValue) => {
    try {
      const result = t(key);
      return result !== key ? result : defaultValue;
    } catch {
      return defaultValue;
    }
  };

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
              {getText('publicOffer.title', 'Публичная оферта')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={getText('close', 'Закрыть')}
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section1.title', '1. Общие положения')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section1.text', 'Настоящая публичная оферта (далее — «Оферта») является официальным предложением ООО «Реглай» (далее — «Исполнитель») заключить договор на оказание услуг по предоставлению доступа к программному обеспечению «Реглай PRO» (далее — «Сервис») на условиях, изложенных ниже.')}
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section2.title', '2. Предмет оферты')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section2.text', 'Исполнитель предоставляет Заказчику доступ к Сервису «Реглай PRO» для управления заявками на материалы, складским учётом, аналитикой и другими функциями, описанными в функциональной документации.')}
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section3.title', '3. Порядок акцепта')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section3.text', 'Акцептом Оферты считается полное и безоговорочное принятие всех условий Оферты путём регистрации в Сервисе и/или оплаты тарифа. Датой акцепта считается дата регистрации или дата первой оплаты.')}
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section4.title', '4. Стоимость и порядок оплаты')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section4.text', 'Стоимость услуг определяется тарифным планом, выбранным Заказчиком. Оплата производится безналичным переводом на расчётный счёт Исполнителя. Исполнитель вправе изменять стоимость услуг с уведомлением Заказчика за 30 дней.')}
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section5.title', '5. Ответственность сторон')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section5.text', 'Исполнитель несёт ответственность за сохранность данных Заказчика в пределах, установленных законодательством РФ. Заказчик несёт ответственность за достоверность вводимых данных и соблюдение авторских прав.')}
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section6.title', '6. Срок действия')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section6.text', 'Оферта вступает в силу с момента её размещения на сайте и действует до момента отзыва. В случае изменения условий, новая редакция публикуется на сайте и вступает в силу с даты публикации.')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {getText('publicOffer.footer', '© 2024 ООО «Реглай». Все права защищены.')}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md transition-all font-medium text-sm"
          >
            {getText('close', 'Закрыть')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicOfferModal;