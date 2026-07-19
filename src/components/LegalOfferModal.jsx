import React from 'react';
import { X, FileCheck, Building, Mail, Calendar, Shield, Clock, Users, CreditCard, Phone } from 'lucide-react';

const LegalOfferModal = ({ 
  isOpen, 
  onClose, 
  t, 
  language, 
  companyName, 
  userRole 
}) => {
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

  const handlePrint = () => {
    const content = `
      <h1 style="text-align:center;color:#4A6572;font-size:24px;margin-bottom:10px;">${getText('legalOffer.title', 'Договор-оферта для юридических лиц')}</h1>
      <p style="text-align:center;color:#6b7280;font-size:12px;margin-bottom:30px;">${getText('legalOffer.version', 'Редакция от 01.01.2026')}</p>
      
      <h3 style="margin-top:20px;color:#1f2937;font-size:16px;">${getText('legalOffer.section1.title', '1. Стороны договора')}</h3>
      <p style="line-height:1.6;color:#374151;font-size:14px;">
        <strong>1.1. Исполнитель:</strong> ООО «Реглай»<br/>
        ОГРН: 1234567890123, ИНН: 1234567890, КПП: 123456789<br/>
        Юридический адрес: г. Москва, ул. Примерная, д. 1, офис 100<br/>
        <br/>
        <strong>1.2. Заказчик:</strong> ${companyName || '[Название компании]'}<br/>
        в лице ${userRole === 'manager' ? 'руководителя' : 'уполномоченного представителя'}, действующего на основании Устава.
      </p>
      
      <h3 style="margin-top:20px;color:#1f2937;font-size:16px;">${getText('legalOffer.section2.title', '2. Предмет договора')}</h3>
      <p style="line-height:1.6;color:#374151;font-size:14px;">
        2.1. Исполнитель обязуется предоставить Заказчику доступ к программному обеспечению «Реглай PRO» (далее — «Сервис») для автоматизации процессов управления заявками на материалы, складского учёта, аналитики и других функций, а Заказчик обязуется оплатить эти услуги на условиях, предусмотренных настоящим Договором.
        <br/><br/>
        2.2. Функциональные возможности Сервиса включают:
        <br/>
        • Создание и управление заявками на материалы<br/>
        • Отслеживание статуса поставок и получение уведомлений<br/>
        • Ведение складского учёта с детализацией по объектам<br/>
        • Генерация отчётов и аналитики в реальном времени<br/>
        • Коммуникация между участниками процесса через встроенный чат<br/>
        • Управление документами и фотоматериалами<br/>
        • Интеграция с внешними системами через API
      </p>
      
      <h3 style="margin-top:20px;color:#1f2937;font-size:16px;">${getText('legalOffer.section3.title', '3. Порядок оказания услуг')}</h3>
      <p style="line-height:1.6;color:#374151;font-size:14px;">
        3.1. Услуги оказываются дистанционно через сеть Интернет.<br/>
        3.2. Доступ к Сервису предоставляется после регистрации и выбора тарифного плана.<br/>
        3.3. Исполнитель обеспечивает техническую поддержку Заказчика в рабочие дни с 9:00 до 18:00 по МСК.<br/>
        3.4. Исполнитель гарантирует сохранность данных Заказчика и их конфиденциальность.<br/>
        3.5. Исполнитель проводит плановые технические работы с предварительным уведомлением Заказчика не менее чем за 24 часа.<br/>
        3.6. Исполнитель обеспечивает доступность Сервиса на уровне не менее 99.5% в месяц.
      </p>
      
      <h3 style="margin-top:20px;color:#1f2937;font-size:16px;">${getText('legalOffer.section4.title', '4. Стоимость и порядок расчётов')}</h3>
      <p style="line-height:1.6;color:#374151;font-size:14px;">
        4.1. Стоимость услуг определяется тарифным планом, выбранным Заказчиком.<br/>
        4.2. Оплата производится ежемесячно или ежегодно в соответствии с выбранным тарифом.<br/>
        4.3. Исполнитель выставляет счет на оплату не позднее 5-го числа каждого месяца.<br/>
        4.4. Заказчик обязан произвести оплату в течение 10 рабочих дней с момента получения счёта.<br/>
        4.5. При оплате годового тарифа предоставляется скидка в размере 40%.<br/>
        4.6. В случае просрочки оплаты более чем на 15 рабочих дней, Исполнитель имеет право приостановить доступ к Сервису.
      </p>
      
      <h3 style="margin-top:20px;color:#1f2937;font-size:16px;">${getText('legalOffer.section5.title', '5. Права и обязанности сторон')}</h3>
      <p style="line-height:1.6;color:#374151;font-size:14px;">
        <strong>5.1. Исполнитель обязуется:</strong><br/>
        • Обеспечить бесперебойную работу Сервиса (SLA 99.9%)<br/>
        • Проводить регулярное резервное копирование данных (ежедневно)<br/>
        • Своевременно устранять технические неполадки (критические — в течение 24 часов)<br/>
        • Обеспечить конфиденциальность данных Заказчика<br/>
        • Информировать Заказчика о новых функциях и обновлениях<br/>
        • Предоставлять отчёты об использовании Сервиса по запросу<br/>
        <br/>
        <strong>5.2. Заказчик обязуется:</strong><br/>
        • Своевременно оплачивать услуги в соответствии с выбранным тарифом<br/>
        • Не нарушать авторские права Исполнителя<br/>
        • Не передавать доступ к Сервису третьим лицам<br/>
        • Использовать Сервис в соответствии с его функциональным назначением<br/>
        • Предоставлять достоверные данные при регистрации и использовании Сервиса<br/>
        • Безопасно хранить логин и пароль от учётной записи
      </p>
      
      <h3 style="margin-top:20px;color:#1f2937;font-size:16px;">${getText('legalOffer.section6.title', '6. Ответственность сторон')}</h3>
      <p style="line-height:1.6;color:#374151;font-size:14px;">
        6.1. За неисполнение или ненадлежащее исполнение обязательств по Договору стороны несут ответственность в соответствии с законодательством РФ.<br/>
        6.2. Исполнитель не несёт ответственности за убытки, возникшие у Заказчика в результате использования Сервиса, если они не связаны с виновными действиями Исполнителя.<br/>
        6.3. Размер ответственности Исполнителя ограничен суммой, уплаченной Заказчиком за последние 3 месяца.<br/>
        6.4. Исполнитель не несёт ответственности за перерывы в работе Сервиса, вызванные действиями третьих лиц или обстоятельствами непреодолимой силы.<br/>
        6.5. Заказчик несёт ответственность за сохранность своих логина и пароля.
      </p>
      
      <h3 style="margin-top:20px;color:#1f2937;font-size:16px;">${getText('legalOffer.section7.title', '7. Срок действия и порядок расторжения')}</h3>
      <p style="line-height:1.6;color:#374151;font-size:14px;">
        7.1. Договор вступает в силу с момента регистрации и действует до полного исполнения обязательств.<br/>
        7.2. Заказчик вправе расторгнуть Договор в одностороннем порядке, уведомив Исполнителя за 30 календарных дней.<br/>
        7.3. Исполнитель вправе расторгнуть Договор в случае нарушения Заказчиком условий оплаты или использования Сервиса.<br/>
        7.4. При расторжении Договора данные Заказчика хранятся в течение 30 дней, после чего удаляются.<br/>
        7.5. При отсутствии заявления о расторжении за 30 дней до окончания срока, Договор автоматически пролонгируется на следующий календарный год.
      </p>
      
      <h3 style="margin-top:20px;color:#1f2937;font-size:16px;">${getText('legalOffer.section8.title', '8. Форс-мажор')}</h3>
      <p style="line-height:1.6;color:#374151;font-size:14px;">
        8.1. Стороны освобождаются от ответственности за неисполнение обязательств, вызванных обстоятельствами непреодолимой силы (форс-мажор).<br/>
        8.2. К форс-мажорным обстоятельствам относятся: стихийные бедствия, военные действия, террористические акты, изменения законодательства, а также иные обстоятельства, которые стороны не могли предвидеть.<br/>
        8.3. Сторона, не имеющая возможности исполнить обязательства, обязана уведомить другую сторону в течение 5 рабочих дней с момента наступления форс-мажора.
      </p>
      
      <h3 style="margin-top:20px;color:#1f2937;font-size:16px;">${getText('legalOffer.section9.title', '9. Конфиденциальность и защита данных')}</h3>
      <p style="line-height:1.6;color:#374151;font-size:14px;">
        9.1. Исполнитель обязуется не разглашать конфиденциальную информацию Заказчика, полученную в процессе исполнения Договора.<br/>
        9.2. Исполнитель обеспечивает защиту данных в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».<br/>
        9.3. Стороны обязуются принимать все необходимые меры для предотвращения утечки конфиденциальной информации.<br/>
        9.4. Исполнитель вправе использовать обезличенную статистическую информацию для улучшения Сервиса.
      </p>
      
      <h3 style="margin-top:20px;color:#1f2937;font-size:16px;">${getText('legalOffer.section10.title', '10. Прочие условия')}</h3>
      <p style="line-height:1.6;color:#374151;font-size:14px;">
        10.1. Во всем остальном, что не предусмотрено настоящим Договором, стороны руководствуются действующим законодательством РФ.<br/>
        10.2. Все споры и разногласия решаются путем переговоров. При невозможности достижения согласия, споры подлежат рассмотрению в Арбитражном суде по месту нахождения Исполнителя.<br/>
        10.3. Признание судом недействительности какого-либо условия Договора не влечет за собой недействительности остальных условий.<br/>
        10.4. Все изменения и дополнения к Договору оформляются в письменном виде и подписываются обеими сторонами.<br/>
        10.5. Стороны обязаны уведомлять друг друга об изменении реквизитов и контактных данных в течение 3 рабочих дней.
      </p>
      
      <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;">
        <h3 style="color:#1f2937;font-size:16px;">${getText('legalOffer.section11.title', '11. Реквизиты сторон')}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:10px;">
          <div style="background:#f9fafb;padding:15px;border-radius:8px;">
            <p style="font-weight:bold;margin:0 0 5px 0;">Исполнитель</p>
            <p style="font-size:13px;line-height:1.6;color:#374151;margin:0;">
              ООО «Реглай»<br/>
              Юридический адрес: г. Москва, ул. Примерная, д. 1, офис 100<br/>
              ИНН: 1234567890 | КПП: 123456789<br/>
              ОГРН: 1234567890123<br/>
              Расчётный счёт: 40702810123456789012<br/>
              Банк: АО «Тинькофф Банк»<br/>
              БИК: 044525974<br/>
              Кор. счёт: 30101810100000000974
            </p>
          </div>
          <div style="background:#f9fafb;padding:15px;border-radius:8px;">
            <p style="font-weight:bold;margin:0 0 5px 0;">Заказчик</p>
            <p style="font-size:13px;line-height:1.6;color:#374151;margin:0;">
              ${companyName || '[Название компании]'}<br/>
              Юридический адрес: ____________________<br/>
              ИНН: ____________________<br/>
              КПП: ____________________<br/>
              ОГРН: ____________________<br/>
              Расчётный счёт: ____________________<br/>
              Банк: ____________________<br/>
              БИК: ____________________<br/>
              Кор. счёт: ____________________
            </p>
          </div>
        </div>
      </div>
      
      <p style="margin-top:40px;text-align:center;color:#6b7280;font-size:12px;">
        ${getText('legalOffer.footer', 'Настоящий Договор является юридически обязывающим документом.')}<br/>
        ${new Date().toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}
      </p>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${getText('legalOffer.title', 'Договор для юридических лиц')}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 900px; margin: auto; }
              h3 { margin-top: 20px; color: #1f2937; font-size: 16px; }
              p { line-height: 1.6; color: #374151; font-size: 14px; }
              @media print {
                body { padding: 20px; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            ${content}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] fade-enter"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#4A6572]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4A6572]/10 rounded-lg">
              <FileCheck className="w-6 h-6 text-[#4A6572] dark:text-[#F9AA33]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {getText('legalOffer.title', 'Договор-оферта для юридических лиц')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span>{getText('legalOffer.version', 'Редакция от 01.01.2026')}</span>
                <span className="hidden sm:inline">|</span>
                <span className="hidden sm:inline flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {getText('legalOffer.legalForce', 'Юридическая сила: полная')}
                </span>
              </p>
              {companyName && (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  <Building className="w-3 h-3" />
                  {companyName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={getText('print', 'Печать')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={getText('close', 'Закрыть')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Информационная панель */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-blue-700 dark:text-blue-300">
              <Shield className="w-4 h-4" />
              {getText('legalOffer.legalForce', 'Юридическая сила: полная')}
            </span>
            <span className="flex items-center gap-1 text-blue-700 dark:text-blue-300">
              <Clock className="w-4 h-4" />
              {getText('legalOffer.validity', 'Срок действия: бессрочно')}
            </span>
            <span className="flex items-center gap-1 text-blue-700 dark:text-blue-300">
              <Users className="w-4 h-4" />
              {getText('legalOffer.parties', 'Стороны: 2')}
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section1.title', '1. Стороны договора')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              <strong>1.1. Исполнитель:</strong> ООО «Реглай» (ОГРН: 1234567890123, ИНН: 1234567890, КПП: 123456789)
              <br/>
              <strong>1.2. Заказчик:</strong> {companyName || '[Название компании]'} в лице {userRole === 'manager' ? 'руководителя' : 'уполномоченного представителя'}, действующего на основании Устава.
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section2.title', '2. Предмет договора')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              2.1. Исполнитель обязуется предоставить Заказчику доступ к программному обеспечению «Реглай PRO» (далее — «Сервис») для автоматизации процессов управления заявками на материалы, складского учёта, аналитики и других функций, а Заказчик обязуется оплатить эти услуги на условиях, предусмотренных настоящим Договором.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
              <strong>2.2. Функциональные возможности Сервиса включают:</strong>
              <br/>
              • Создание и управление заявками на материалы
              <br/>
              • Отслеживание статуса поставок и получение уведомлений
              <br/>
              • Ведение складского учёта с детализацией по объектам
              <br/>
              • Генерация отчётов и аналитики в реальном времени
              <br/>
              • Коммуникация между участниками процесса через встроенный чат
              <br/>
              • Управление документами и фотоматериалами
              <br/>
              • Интеграция с внешними системами через API
            </p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section3.title', '3. Порядок оказания услуг')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              3.1. Услуги оказываются дистанционно через сеть Интернет.
              3.2. Доступ к Сервису предоставляется после регистрации и выбора тарифного плана.
              3.3. Исполнитель обеспечивает техническую поддержку Заказчика в рабочие дни с 9:00 до 18:00 по МСК.
              3.4. Исполнитель гарантирует сохранность данных Заказчика и их конфиденциальность.
              3.5. Исполнитель проводит плановые технические работы с предварительным уведомлением Заказчика не менее чем за 24 часа.
              3.6. Исполнитель обеспечивает доступность Сервиса на уровне не менее 99.5% в месяц.
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section4.title', '4. Стоимость и порядок расчётов')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              4.1. Стоимость услуг определяется тарифным планом, выбранным Заказчиком.
              4.2. Оплата производится ежемесячно или ежегодно в соответствии с выбранным тарифом.
              4.3. Исполнитель выставляет счет на оплату не позднее 5-го числа каждого месяца.
              4.4. Заказчик обязан произвести оплату в течение 10 рабочих дней с момента получения счёта.
              4.5. При оплате годового тарифа предоставляется скидка в размере 40%.
              4.6. В случае просрочки оплаты более чем на 15 рабочих дней, Исполнитель имеет право приостановить доступ к Сервису.
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section5.title', '5. Права и обязанности сторон')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              <strong>5.1. Исполнитель обязуется:</strong>
              • Обеспечить бесперебойную работу Сервиса (SLA 99.9%)
              • Проводить регулярное резервное копирование данных (ежедневно)
              • Своевременно устранять технические неполадки (критические — в течение 24 часов)
              • Обеспечить конфиденциальность данных Заказчика
              • Информировать Заказчика о новых функциях и обновлениях
              • Предоставлять отчёты об использовании Сервиса по запросу

              <strong>5.2. Заказчик обязуется:</strong>
              • Своевременно оплачивать услуги в соответствии с выбранным тарифом
              • Не нарушать авторские права Исполнителя
              • Не передавать доступ к Сервису третьим лицам
              • Использовать Сервис в соответствии с его функциональным назначением
              • Предоставлять достоверные данные при регистрации и использовании Сервиса
              • Безопасно хранить логин и пароль от учётной записи
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section6.title', '6. Ответственность сторон')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              6.1. За неисполнение или ненадлежащее исполнение обязательств по Договору стороны несут ответственность в соответствии с законодательством РФ.
              6.2. Исполнитель не несёт ответственности за убытки, возникшие у Заказчика в результате использования Сервиса, если они не связаны с виновными действиями Исполнителя.
              6.3. Размер ответственности Исполнителя ограничен суммой, уплаченной Заказчиком за последние 3 месяца.
              6.4. Исполнитель не несёт ответственности за перерывы в работе Сервиса, вызванные действиями третьих лиц или обстоятельствами непреодолимой силы.
              6.5. Заказчик несёт ответственность за сохранность своих логина и пароля.
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section7.title', '7. Срок действия и порядок расторжения')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              7.1. Договор вступает в силу с момента регистрации и действует до полного исполнения обязательств.
              7.2. Заказчик вправе расторгнуть Договор в одностороннем порядке, уведомив Исполнителя за 30 календарных дней.
              7.3. Исполнитель вправе расторгнуть Договор в случае нарушения Заказчиком условий оплаты или использования Сервиса.
              7.4. При расторжении Договора данные Заказчика хранятся в течение 30 дней, после чего удаляются.
              7.5. При отсутствии заявления о расторжении за 30 дней до окончания срока, Договор автоматически пролонгируется на следующий календарный год.
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section8.title', '8. Форс-мажор')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              8.1. Стороны освобождаются от ответственности за неисполнение обязательств, вызванных обстоятельствами непреодолимой силы (форс-мажор).
              8.2. К форс-мажорным обстоятельствам относятся: стихийные бедствия, военные действия, террористические акты, изменения законодательства, а также иные обстоятельства, которые стороны не могли предвидеть.
              8.3. Сторона, не имеющая возможности исполнить обязательства, обязана уведомить другую сторону в течение 5 рабочих дней с момента наступления форс-мажора.
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section9.title', '9. Конфиденциальность и защита данных')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              9.1. Исполнитель обязуется не разглашать конфиденциальную информацию Заказчика, полученную в процессе исполнения Договора.
              9.2. Исполнитель обеспечивает защиту данных в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».
              9.3. Стороны обязуются принимать все необходимые меры для предотвращения утечки конфиденциальной информации.
              9.4. Исполнитель вправе использовать обезличенную статистическую информацию для улучшения Сервиса.
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section10.title', '10. Прочие условия')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              10.1. Во всем остальном, что не предусмотрено настоящим Договором, стороны руководствуются действующим законодательством РФ.
              10.2. Все споры и разногласия решаются путем переговоров. При невозможности достижения согласия, споры подлежат рассмотрению в Арбитражном суде по месту нахождения Исполнителя.
              10.3. Признание судом недействительности какого-либо условия Договора не влечет за собой недействительности остальных условий.
              10.4. Все изменения и дополнения к Договору оформляются в письменном виде и подписываются обеими сторонами.
              10.5. Стороны обязаны уведомлять друг друга об изменении реквизитов и контактных данных в течение 3 рабочих дней.
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          {/* Раздел 11: Реквизиты сторон */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section11.title', '11. Реквизиты сторон')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#4A6572]" />
                  {getText('legalOffer.executor', 'Исполнитель')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  ООО «Реглай»<br/>
                  Юридический адрес: г. Москва, ул. Примерная, д. 1, офис 100<br/>
                  ИНН: 1234567890 | КПП: 123456789<br/>
                  ОГРН: 1234567890123<br/>
                  Расчётный счёт: 40702810123456789012<br/>
                  Банк: АО «Тинькофф Банк»<br/>
                  БИК: 044525974<br/>
                  Кор. счёт: 30101810100000000974
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#4A6572]" />
                  {getText('legalOffer.client', 'Заказчик')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {companyName || '[Название компании]'}<br/>
                  Юридический адрес: ____________________<br/>
                  ИНН: ____________________<br/>
                  КПП: ____________________<br/>
                  ОГРН: ____________________<br/>
                  Расчётный счёт: ____________________<br/>
                  Банк: ____________________<br/>
                  БИК: ____________________<br/>
                  Кор. счёт: ____________________
                </p>
                <button
                  onClick={() => {
                    // Переход в профиль компании
                    onClose();
                    // setCurrentView('companyProfile');
                  }}
                  className="mt-2 text-xs text-[#4A6572] hover:underline dark:text-[#F9AA33] flex items-center gap-1"
                >
                  <CreditCard className="w-3 h-3" />
                  {getText('legalOffer.fillDetails', 'Заполнить реквизиты')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              legal@reglai.ru
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              +7 (800) 123-45-67
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date().toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-sm bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors flex items-center gap-1"
            >
              📄 {getText('print', 'PDF')}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {getText('close', 'Закрыть')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalOfferModal;