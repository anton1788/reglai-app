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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#4A6572]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4A6572]/10 rounded-lg">
              <Scale className="w-6 h-6 text-[#4A6572] dark:text-[#F9AA33]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {getText('publicOffer.title', 'Публичная оферта')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getText('publicOffer.version', 'Редакция от 01.01.2026')}
              </p>
            </div>
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6 prose prose-sm dark:prose-invert max-w-none">
          {/* Раздел 1: Общие положения */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section1.title', '1. Общие положения')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section1.text', '1.1. Настоящая публичная оферта (далее — «Оферта») является официальным предложением ООО «Реглай» (далее — «Исполнитель») заключить договор на оказание услуг по предоставлению доступа к программному обеспечению «Реглай PRO» (далее — «Сервис») на условиях, изложенных ниже.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section1.p2', '1.2. В соответствии с пунктом 2 статьи 437 Гражданского кодекса РФ настоящий документ является публичной офертой. Акцептом Оферты признается регистрация в Сервисе и/или оплата тарифа, что считается заключением Договора на условиях настоящей Оферты.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section1.p3', '1.3. Исполнитель имеет право вносить изменения в условия настоящей Оферты без предварительного уведомления Пользователя. Новая редакция Оферты вступает в силу с момента её размещения на сайте.')}
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          {/* Раздел 2: Предмет оферты */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section2.title', '2. Предмет оферты')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section2.text', '2.1. Исполнитель предоставляет Заказчику доступ к Сервису «Реглай PRO» для управления заявками на материалы, складским учётом, аналитикой и другими функциями, описанными в функциональной документации.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section2.p2', '2.2. Функциональные возможности Сервиса включают, но не ограничиваются:')}
            </p>
            <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1">
              <li>{getText('publicOffer.section2.li1', 'Создание и управление заявками на материалы')}</li>
              <li>{getText('publicOffer.section2.li2', 'Отслеживание статуса поставок и получение уведомлений')}</li>
              <li>{getText('publicOffer.section2.li3', 'Ведение складского учёта с детализацией по объектам')}</li>
              <li>{getText('publicOffer.section2.li4', 'Генерация отчётов и аналитики в реальном времени')}</li>
              <li>{getText('publicOffer.section2.li5', 'Коммуникация между участниками процесса через встроенный чат')}</li>
              <li>{getText('publicOffer.section2.li6', 'Управление документами и фотоматериалами')}</li>
              <li>{getText('publicOffer.section2.li7', 'Интеграция с внешними системами через API')}</li>
            </ul>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          {/* Раздел 3: Порядок акцепта */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section3.title', '3. Порядок акцепта')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section3.text', '3.1. Акцептом Оферты считается полное и безоговорочное принятие всех условий Оферты путём регистрации в Сервисе и/или оплаты тарифа.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section3.p2', '3.2. Датой акцепта считается дата регистрации в Сервисе или дата первой оплаты тарифа.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section3.p3', '3.3. Совершая акцепт, Заказчик подтверждает, что ознакомлен и согласен с условиями Оферты, а также с Политикой конфиденциальности и Согласием на обработку персональных данных.')}
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          {/* Раздел 4: Стоимость и порядок оплаты */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section4.title', '4. Стоимость услуг и порядок оплаты')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section4.text', '4.1. Стоимость услуг определяется тарифным планом, выбранным Заказчиком. Актуальные тарифы опубликованы на сайте.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section4.p2', '4.2. Оплата производится безналичным переводом на расчётный счёт Исполнителя через платёжные системы, представленные на сайте.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section4.p3', '4.3. Исполнитель вправе изменять стоимость услуг с уведомлением Заказчика не менее чем за 14 календарных дней до вступления изменений в силу.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section4.p4', '4.4. При оплате годового тарифа предоставляется скидка в размере 40% по сравнению с ежемесячной оплатой.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section4.p5', '4.5. Возврат денежных средств осуществляется в порядке, установленном законодательством РФ, и при условии, что услуги не были оказаны в полном объёме.')}
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          {/* Раздел 5: Права и обязанности сторон */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section5.title', '5. Права и обязанности сторон')}
            </h3>
            <div className="space-y-3">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                {getText('publicOffer.section5.executor', '5.1. Исполнитель обязуется:')}
              </p>
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1">
                <li>{getText('publicOffer.section5.e1', 'Обеспечить круглосуточный доступ к Сервису (доступность не менее 99.5% в месяц)')}</li>
                <li>{getText('publicOffer.section5.e2', 'Осуществлять техническую поддержку Заказчика в рабочие дни с 9:00 до 18:00 по МСК через чат, email и телефон')}</li>
                <li>{getText('publicOffer.section5.e3', 'Обеспечивать сохранность и конфиденциальность данных Заказчика')}</li>
                <li>{getText('publicOffer.section5.e4', 'Своевременно устранять технические неполадки и ошибки в работе Сервиса')}</li>
                <li>{getText('publicOffer.section5.e5', 'Информировать Заказчика о плановых технических работах не менее чем за 24 часа')}</li>
                <li>{getText('publicOffer.section5.e6', 'Проводить регулярное резервное копирование данных (ежедневно)')}</li>
              </ul>
              
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium mt-3">
                {getText('publicOffer.section5.client', '5.2. Заказчик обязуется:')}
              </p>
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1">
                <li>{getText('publicOffer.section5.c1', 'Предоставлять достоверные данные при регистрации и использовании Сервиса')}</li>
                <li>{getText('publicOffer.section5.c2', 'Не передавать доступ к учётной записи третьим лицам')}</li>
                <li>{getText('publicOffer.section5.c3', 'Соблюдать законодательство РФ при использовании Сервиса')}</li>
                <li>{getText('publicOffer.section5.c4', 'Своевременно оплачивать услуги в соответствии с выбранным тарифом')}</li>
                <li>{getText('publicOffer.section5.c5', 'Использовать Сервис исключительно в законных целях')}</li>
                <li>{getText('publicOffer.section5.c6', 'Безопасно хранить логин и пароль от учётной записи')}</li>
              </ul>
              
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium mt-3">
                {getText('publicOffer.section5.rights', '5.3. Исполнитель имеет право:')}
              </p>
              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1">
                <li>{getText('publicOffer.section5.r1', 'Приостанавливать доступ к Сервису при нарушении Заказчиком условий Оферты')}</li>
                <li>{getText('publicOffer.section5.r2', 'Изменять функциональные возможности Сервиса с уведомлением Заказчика')}</li>
                <li>{getText('publicOffer.section5.r3', 'Удалять учётные записи, нарушающие условия использования или законодательство')}</li>
                <li>{getText('publicOffer.section5.r4', 'Привлекать третьих лиц для исполнения обязательств с сохранением ответственности')}</li>
              </ul>
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          {/* Раздел 6: Ответственность сторон */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section6.title', '6. Ответственность сторон')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section6.text', '6.1. Исполнитель несёт ответственность за сохранность данных Заказчика в пределах, установленных законодательством РФ.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section6.p2', '6.2. Заказчик несёт ответственность за достоверность вводимых данных и соблюдение авторских прав.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section6.p3', '6.3. Исполнитель не несёт ответственности за убытки, возникшие у Заказчика в результате использования Сервиса, если они не связаны с виновными действиями Исполнителя.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section6.p4', '6.4. В случае нарушения обязательств по Договору, виновная сторона возмещает другой стороне причинённые убытки в размере, не превышающем сумму оплаты за последние 3 месяца.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section6.p5', '6.5. Исполнитель не несёт ответственности за прерывание доступа к Сервису по причинам, не зависящим от Исполнителя (сбои в интернете, действия третьих лиц и т.д.).')}
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          {/* Раздел 7: Срок действия */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section7.title', '7. Срок действия и порядок расторжения')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section7.text', '7.1. Оферта вступает в силу с момента её размещения на сайте и действует до момента отзыва.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section7.p2', '7.2. В случае изменения условий, новая редакция публикуется на сайте и вступает в силу с даты публикации.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section7.p3', '7.3. Заказчик вправе расторгнуть Договор в одностороннем порядке, уведомив Исполнителя за 14 календарных дней.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section7.p4', '7.4. Исполнитель вправе расторгнуть Договор в одностороннем порядке при нарушении Заказчиком условий Оферты или законодательства.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section7.p5', '7.5. После расторжения Договора данные Заказчика хранятся в течение 30 дней, после чего удаляются.')}
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          {/* Раздел 8: Форс-мажор */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section8.title', '8. Форс-мажор')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section8.text', '8.1. Стороны освобождаются от ответственности за неисполнение обязательств, вызванных обстоятельствами непреодолимой силы (форс-мажор).')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section8.p2', '8.2. К форс-мажорным обстоятельствам относятся: стихийные бедствия, военные действия, террористические акты, изменения законодательства, а также иные обстоятельства, которые стороны не могли предвидеть.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section8.p3', '8.3. Сторона, не имеющая возможности исполнить обязательства, обязана уведомить другую сторону в течение 5 рабочих дней с момента наступления форс-мажора.')}
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          {/* Раздел 9: Конфиденциальность */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section9.title', '9. Конфиденциальность и защита данных')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section9.text', '9.1. Исполнитель обязуется не разглашать конфиденциальную информацию Заказчика, полученную в процессе использования Сервиса.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section9.p2', '9.2. Исполнитель обеспечивает защиту данных в соответствии с Федеральным законом № 152-ФЗ "О персональных данных".')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section9.p3', '9.3. Стороны обязуются принимать все необходимые меры для предотвращения утечки конфиденциальной информации.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section9.p4', '9.4. Исполнитель вправе использовать обезличенную статистическую информацию для улучшения Сервиса.')}
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          {/* Раздел 10: Прочие условия */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('publicOffer.section10.title', '10. Прочие условия')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section10.text', '10.1. Во всем остальном, что не предусмотрено настоящей Офертой, стороны руководствуются действующим законодательством РФ.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section10.p2', '10.2. Все споры и разногласия решаются путем переговоров. При невозможности достижения согласия, споры подлежат рассмотрению в суде по месту нахождения Исполнителя.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section10.p3', '10.3. Признание судом недействительности какого-либо условия Оферты не влечет за собой недействительности остальных условий.')}
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {getText('publicOffer.section10.p4', '10.4. Стороны обязаны уведомлять друг друга об изменении контактных данных в течение 3 рабочих дней.')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>{getText('publicOffer.version', 'Редакция от 01.01.2026')}</span>
            <span className="hidden sm:inline">|</span>
            <span>{getText('publicOffer.legalForce', 'Юридическая сила: полная')}</span>
            <span className="hidden sm:inline">|</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {getText('publicOffer.active', 'Действует')}
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                // Функция печати
                window.print();
              }}
              className="flex-1 sm:flex-none px-4 py-2 border border-[#4A6572] text-[#4A6572] dark:text-[#F9AA33] dark:border-[#F9AA33] rounded-lg hover:bg-[#4A6572]/5 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {getText('print', 'Печать')}
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-6 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md transition-all font-medium text-sm"
            >
              {getText('close', 'Закрыть')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicOfferModal;