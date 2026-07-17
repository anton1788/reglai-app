// src/components/OfferModal.jsx
import React from 'react';
import { X } from 'lucide-react';

const OfferModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[10000] fade-enter">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Публичная оферта
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="prose dark:prose-invert max-w-none text-sm">
          <h3 className="text-lg font-bold mt-6">1. Общие положения</h3>
          <p>
            1.1. Настоящий документ является публичной офертой (далее — «Оферта») 
            ООО «РЕГЛАЙ ПРО» (далее — «Исполнитель») в лице генерального директора, 
            действующего на основании Устава.
          </p>
          <p>
            1.2. Оферта адресована неопределенному кругу лиц и содержит все существенные 
            условия предоставления доступа к Сервису «Реглай PRO».
          </p>

          <h3 className="text-lg font-bold mt-6">2. Предмет оферты</h3>
          <p>
            2.1. Исполнитель предоставляет Заказчику доступ к Сервису «Реглай PRO» 
            для управления заявками на материалы, складским учётом и документооборотом.
          </p>
          <p>
            2.2. Сервис предоставляется на условиях «как есть» (as is).
          </p>

          <h3 className="text-lg font-bold mt-6">3. Порядок использования</h3>
          <p>
            3.1. Регистрация в Сервисе осуществляется через форму на сайте.
          </p>
          <p>
            3.2. Использование Сервиса означает полное согласие с условиями Оферты.
          </p>

          <h3 className="text-lg font-bold mt-6">4. Права и обязанности сторон</h3>
          <p>
            4.1. Исполнитель обязуется:
            <br />- Обеспечить доступ к Сервису 24/7 (кроме времени плановых работ)
            <br />- Обеспечить сохранность данных пользователей
            <br />- Предоставить техническую поддержку
          </p>
          <p>
            4.2. Заказчик обязуется:
            <br />- Использовать Сервис в соответствии с законодательством РФ
            <br />- Не передавать доступ третьим лицам
            <br />- Своевременно обновлять данные
          </p>

          <h3 className="text-lg font-bold mt-6">5. Стоимость и порядок расчетов</h3>
          <p>
            5.1. На период тестирования (до 31.12.2026) Сервис предоставляется 
            на безвозмездной основе.
          </p>
          <p>
            5.2. Стоимость платных тарифов указана на сайте и может быть изменена 
            с предварительным уведомлением за 30 дней.
          </p>

          <h3 className="text-lg font-bold mt-6">6. Ответственность сторон</h3>
          <p>
            6.1. Исполнитель не несет ответственности за:
            <br />- Действия третьих лиц
            <br />- Потерю данных при форс-мажорных обстоятельствах
            <br />- Убытки, связанные с использованием Сервиса
          </p>

          <h3 className="text-lg font-bold mt-6">7. Срок действия оферты</h3>
          <p>
            7.1. Оферта вступает в силу с момента её размещения на сайте.
          </p>
          <p>
            7.2. Оферта действует до момента её отзыва Исполнителем.
          </p>

          <h3 className="text-lg font-bold mt-6">8. Реквизиты</h3>
          <p className="text-sm">
            ООО «РЕГЛАЙ ПРО»<br />
            ИНН: 1234567890<br />
            КПП: 123456789<br />
            ОГРН: 1234567890123<br />
            Юр. адрес: г. Москва, ул. Строителей, д. 1<br />
            Email: legal@reglay.pro
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors font-medium"
          >
            Я ознакомился с условиями
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Версия 1.0 от 17.07.2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfferModal;