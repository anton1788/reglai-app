import React from 'react';
import { X, FileCheck, Building, Mail, Calendar } from 'lucide-react';

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
      <h1 style="text-align:center;color:#4A6572;">${getText('legalOffer.title', 'Договор для юридических лиц')}</h1>
      
      <h3>${getText('legalOffer.section1.title', '1. Стороны договора')}</h3>
      <p>1.1. Исполнитель: ООО «Реглай» (ОГРН: 1234567890123, ИНН: 1234567890)<br/>
      1.2. Заказчик: ${companyName || '[Название компании]'} в лице ${userRole === 'manager' ? 'руководителя' : 'уполномоченного представителя'}, действующего на основании Устава.</p>
      
      <h3>${getText('legalOffer.section2.title', '2. Предмет договора')}</h3>
      <p>Исполнитель обязуется предоставить Заказчику доступ к программному обеспечению «Реглай PRO» (далее — «Сервис») для автоматизации процессов управления заявками на материалы, складского учёта, аналитики и других функций, а Заказчик обязуется оплатить эти услуги на условиях, предусмотренных настоящим Договором.</p>
      
      <h3>${getText('legalOffer.section3.title', '3. Порядок оказания услуг')}</h3>
      <p>3.1. Услуги оказываются дистанционно через сеть Интернет.<br/>
      3.2. Доступ к Сервису предоставляется после регистрации и выбора тарифного плана.<br/>
      3.3. Исполнитель обеспечивает техническую поддержку Заказчика в рабочие дни с 9:00 до 18:00 по МСК.<br/>
      3.4. Исполнитель гарантирует сохранность данных Заказчика и их конфиденциальность.</p>
      
      <h3>${getText('legalOffer.section4.title', '4. Стоимость и порядок расчётов')}</h3>
      <p>4.1. Стоимость услуг определяется тарифным планом, выбранным Заказчиком.<br/>
      4.2. Оплата производится ежемесячно или ежегодно в соответствии с выбранным тарифом.<br/>
      4.3. Исполнитель выставляет счет на оплату не позднее 5-го числа каждого месяца.<br/>
      4.4. Заказчик обязан произвести оплату в течение 10 рабочих дней с момента получения счёта.</p>
      
      <h3>${getText('legalOffer.section5.title', '5. Права и обязанности сторон')}</h3>
      <p>5.1. Исполнитель обязуется:<br/>
      • Обеспечить бесперебойную работу Сервиса (SLA 99.9%)<br/>
      • Проводить регулярное резервное копирование данных<br/>
      • Своевременно устранять технические неполадки<br/>
      • Обеспечить конфиденциальность данных Заказчика<br/><br/>
      5.2. Заказчик обязуется:<br/>
      • Своевременно оплачивать услуги<br/>
      • Не нарушать авторские права Исполнителя<br/>
      • Не передавать доступ к Сервису третьим лицам<br/>
      • Использовать Сервис в соответствии с его функциональным назначением</p>
      
      <h3>${getText('legalOffer.section6.title', '6. Ответственность сторон')}</h3>
      <p>6.1. За неисполнение или ненадлежащее исполнение обязательств по Договору стороны несут ответственность в соответствии с законодательством РФ.<br/>
      6.2. Исполнитель не несёт ответственности за убытки, возникшие у Заказчика в результате использования Сервиса, если они не связаны с виновными действиями Исполнителя.<br/>
      6.3. Размер ответственности Исполнителя ограничен суммой, уплаченной Заказчиком за последние 3 месяца.</p>
      
      <h3>${getText('legalOffer.section7.title', '7. Срок действия и порядок расторжения')}</h3>
      <p>7.1. Договор вступает в силу с момента регистрации и действует до полного исполнения обязательств.<br/>
      7.2. Заказчик вправе расторгнуть Договор в одностороннем порядке, уведомив Исполнителя за 30 дней.<br/>
      7.3. Исполнитель вправе расторгнуть Договор в случае нарушения Заказчиком условий оплаты или использования Сервиса.<br/>
      7.4. При расторжении Договора данные Заказчика хранятся в течение 30 дней, после чего удаляются.</p>
      
      <h3>${getText('legalOffer.section8.title', '8. Реквизиты сторон')}</h3>
      <p>Исполнитель: ООО «Реглай»<br/>
      Юридический адрес: г. Москва, ул. Примерная, д. 1, офис 100<br/>
      ИНН: 1234567890<br/>
      КПП: 123456789<br/>
      ОГРН: 1234567890123<br/>
      Расчётный счёт: 40702810123456789012<br/>
      Банк: АО «Тинькофф Банк»<br/>
      БИК: 044525974<br/>
      Кор. счёт: 30101810100000000974</p>
      
      <p style="margin-top:40px;text-align:center;color:#6b7280;font-size:12px;">
        ${getText('legalOffer.footer', 'Настоящий Договор является юридически обязывающим документом.')}<br/>
        ${new Date().toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')}
      </p>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${getText('legalOffer.title', 'Договор для юридических лиц')}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: auto; }
              h3 { margin-top: 20px; color: #1f2937; }
              p { line-height: 1.6; color: #374151; }
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#4A6572]/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#4A6572]/10 rounded-lg">
              <FileCheck className="w-6 h-6 text-[#4A6572] dark:text-[#F9AA33]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {getText('legalOffer.title', 'Договор для юридических лиц')}
              </h2>
              {companyName && (
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {companyName}
                </p>
              )}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section1.title', '1. Стороны договора')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              1.1. Исполнитель: ООО «Реглай» (ОГРН: 1234567890123, ИНН: 1234567890)
              1.2. Заказчик: {companyName || '[Название компании]'} в лице {userRole === 'manager' ? 'руководителя' : 'уполномоченного представителя'}, действующего на основании Устава.
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section2.title', '2. Предмет договора')}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Исполнитель обязуется предоставить Заказчику доступ к программному обеспечению «Реглай PRO» (далее — «Сервис») для автоматизации процессов управления заявками на материалы, складского учёта, аналитики и других функций, а Заказчик обязуется оплатить эти услуги на условиях, предусмотренных настоящим Договором.
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
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section5.title', '5. Права и обязанности сторон')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              5.1. Исполнитель обязуется:
              • Обеспечить бесперебойную работу Сервиса (SLA 99.9%)
              • Проводить регулярное резервное копирование данных
              • Своевременно устранять технические неполадки
              • Обеспечить конфиденциальность данных Заказчика

              5.2. Заказчик обязуется:
              • Своевременно оплачивать услуги
              • Не нарушать авторские права Исполнителя
              • Не передавать доступ к Сервису третьим лицам
              • Использовать Сервис в соответствии с его функциональным назначением
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
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section7.title', '7. Срок действия и порядок расторжения')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              7.1. Договор вступает в силу с момента регистрации и действует до полного исполнения обязательств.
              7.2. Заказчик вправе расторгнуть Договор в одностороннем порядке, уведомив Исполнителя за 30 дней.
              7.3. Исполнитель вправе расторгнуть Договор в случае нарушения Заказчиком условий оплаты или использования Сервиса.
              7.4. При расторжении Договора данные Заказчика хранятся в течение 30 дней, после чего удаляются.
            </div>
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getText('legalOffer.section8.title', '8. Реквизиты сторон')}
            </h3>
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              Исполнитель: ООО «Реглай»
              Юридический адрес: г. Москва, ул. Примерная, д. 1, офис 100
              ИНН: 1234567890
              КПП: 123456789
              ОГРН: 1234567890123
              Расчётный счёт: 40702810123456789012
              Банк: АО «Тинькофф Банк»
              БИК: 044525974
              Кор. счёт: 30101810100000000974
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              legal@reglai.ru
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