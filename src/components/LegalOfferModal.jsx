// src/components/LegalOfferModal.jsx
import React from 'react';
import { X, FileCheck, Building, Mail, Calendar } from 'lucide-react';

const LegalOfferModal = ({ isOpen, onClose, t, language, companyName, userRole }) => {
  if (!isOpen) return null;

  const content = {
    ru: {
      title: t('legalOffer.title') || 'Договор для юридических лиц',
      sections: [
        {
          title: t('legalOffer.section1.title') || '1. Стороны договора',
          text: t('legalOffer.section1.text') || `1.1. Исполнитель: ООО «Реглай» (ОГРН: 1234567890123, ИНН: 1234567890)\n1.2. Заказчик: ${companyName || '[Название компании]'} в лице ${userRole === 'manager' ? 'руководителя' : 'уполномоченного представителя'}, действующего на основании Устава.`
        },
        {
          title: t('legalOffer.section2.title') || '2. Предмет договора',
          text: t('legalOffer.section2.text') || 'Исполнитель обязуется предоставить Заказчику доступ к программному обеспечению «Реглай PRO» (далее — «Сервис») для автоматизации процессов управления заявками на материалы, складского учёта, аналитики и других функций, а Заказчик обязуется оплатить эти услуги на условиях, предусмотренных настоящим Договором.'
        },
        {
          title: t('legalOffer.section3.title') || '3. Порядок оказания услуг',
          text: t('legalOffer.section3.text') || '3.1. Услуги оказываются дистанционно через сеть Интернет.\n3.2. Доступ к Сервису предоставляется после регистрации и выбора тарифного плана.\n3.3. Исполнитель обеспечивает техническую поддержку Заказчика в рабочие дни с 9:00 до 18:00 по МСК.\n3.4. Исполнитель гарантирует сохранность данных Заказчика и их конфиденциальность.'
        },
        {
          title: t('legalOffer.section4.title') || '4. Стоимость и порядок расчётов',
          text: t('legalOffer.section4.text') || '4.1. Стоимость услуг определяется тарифным планом, выбранным Заказчиком.\n4.2. Оплата производится ежемесячно или ежегодно в соответствии с выбранным тарифом.\n4.3. Исполнитель выставляет счет на оплату не позднее 5-го числа каждого месяца.\n4.4. Заказчик обязан произвести оплату в течение 10 рабочих дней с момента получения счёта.'
        },
        {
          title: t('legalOffer.section5.title') || '5. Права и обязанности сторон',
          text: t('legalOffer.section5.text') || '5.1. Исполнитель обязуется:\n• Обеспечить бесперебойную работу Сервиса (SLA 99.9%)\n• Проводить регулярное резервное копирование данных\n• Своевременно устранять технические неполадки\n• Обеспечить конфиденциальность данных Заказчика\n\n5.2. Заказчик обязуется:\n• Своевременно оплачивать услуги\n• Не нарушать авторские права Исполнителя\n• Не передавать доступ к Сервису третьим лицам\n• Использовать Сервис в соответствии с его функциональным назначением'
        },
        {
          title: t('legalOffer.section6.title') || '6. Ответственность сторон',
          text: t('legalOffer.section6.text') || '6.1. За неисполнение или ненадлежащее исполнение обязательств по Договору стороны несут ответственность в соответствии с законодательством РФ.\n6.2. Исполнитель не несёт ответственности за убытки, возникшие у Заказчика в результате использования Сервиса, если они не связаны с виновными действиями Исполнителя.\n6.3. Размер ответственности Исполнителя ограничен суммой, уплаченной Заказчиком за последние 3 месяца.'
        },
        {
          title: t('legalOffer.section7.title') || '7. Срок действия и порядок расторжения',
          text: t('legalOffer.section7.text') || '7.1. Договор вступает в силу с момента регистрации и действует до полного исполнения обязательств.\n7.2. Заказчик вправе расторгнуть Договор в одностороннем порядке, уведомив Исполнителя за 30 дней.\n7.3. Исполнитель вправе расторгнуть Договор в случае нарушения Заказчиком условий оплаты или использования Сервиса.\n7.4. При расторжении Договора данные Заказчика хранятся в течение 30 дней, после чего удаляются.'
        },
        {
          title: t('legalOffer.section8.title') || '8. Реквизиты сторон',
          text: t('legalOffer.section8.text') || 'Исполнитель: ООО «Реглай»\nЮридический адрес: г. Москва, ул. Примерная, д. 1, офис 100\nИНН: 1234567890\nКПП: 123456789\nОГРН: 1234567890123\nРасчётный счёт: 40702810123456789012\nБанк: АО «Тинькофф Банк»\nБИК: 044525974\nКор. счёт: 30101810100000000974'
        }
      ],
      footer: t('legalOffer.footer') || 'Настоящий Договор является юридически обязывающим документом.'
    },
    en: {
      title: t('legalOffer.title') || 'Agreement for Legal Entities',
      sections: [
        {
          title: t('legalOffer.section1.title') || '1. Parties to the Agreement',
          text: t('legalOffer.section1.text') || `1.1. Executor: Reglai LLC (OGRN: 1234567890123, INN: 1234567890)\n1.2. Customer: ${companyName || '[Company Name]'} represented by ${userRole === 'manager' ? 'the manager' : 'an authorized representative'} acting on the basis of the Charter.`
        },
        {
          title: t('legalOffer.section2.title') || '2. Subject of the Agreement',
          text: t('legalOffer.section2.text') || 'The Executor undertakes to provide the Customer with access to the «Reglai PRO» software (hereinafter — the «Service») for automating material request management, warehouse accounting, analytics and other functions, and the Customer undertakes to pay for these services on the terms provided for in this Agreement.'
        },
        {
          title: t('legalOffer.section3.title') || '3. Procedure for Service Provision',
          text: t('legalOffer.section3.text') || '3.1. Services are provided remotely via the Internet.\n3.2. Access to the Service is provided after registration and selection of a tariff plan.\n3.3. The Executor provides technical support to the Customer on working days from 9:00 to 18:00 Moscow time.\n3.4. The Executor guarantees the safety of the Customer\'s data and its confidentiality.'
        },
        {
          title: t('legalOffer.section4.title') || '4. Cost and Settlement Procedure',
          text: t('legalOffer.section4.text') || '4.1. The cost of services is determined by the tariff plan selected by the Customer.\n4.2. Payment is made monthly or annually in accordance with the chosen tariff.\n4.3. The Executor issues an invoice for payment no later than the 5th day of each month.\n4.4. The Customer is obliged to make payment within 10 working days from the date of receipt of the invoice.'
        },
        {
          title: t('legalOffer.section5.title') || '5. Rights and Obligations of the Parties',
          text: t('legalOffer.section5.text') || '5.1. The Executor undertakes:\n• Ensure uninterrupted operation of the Service (SLA 99.9%)\n• Conduct regular data backups\n• Timely eliminate technical problems\n• Ensure confidentiality of Customer data\n\n5.2. The Customer undertakes:\n• Timely pay for services\n• Not to violate the Executor\'s copyright\n• Not to transfer access to the Service to third parties\n• Use the Service in accordance with its functional purpose'
        },
        {
          title: t('legalOffer.section6.title') || '6. Liability of the Parties',
          text: t('legalOffer.section6.text') || '6.1. For non-performance or improper performance of obligations under the Agreement, the parties bear responsibility in accordance with the legislation of the Russian Federation.\n6.2. The Executor shall not be liable for losses incurred by the Customer as a result of using the Service, unless they are related to the Executor\'s culpable actions.\n6.3. The amount of the Executor\'s liability is limited to the amount paid by the Customer for the last 3 months.'
        },
        {
          title: t('legalOffer.section7.title') || '7. Validity Period and Termination Procedure',
          text: t('legalOffer.section7.text') || '7.1. The Agreement comes into force from the moment of registration and is valid until the full fulfillment of obligations.\n7.2. The Customer has the right to terminate the Agreement unilaterally by notifying the Executor 30 days in advance.\n7.3. The Executor has the right to terminate the Agreement in case of violation by the Customer of the terms of payment or use of the Service.\n7.4. Upon termination of the Agreement, the Customer\'s data is stored for 30 days, after which it is deleted.'
        },
        {
          title: t('legalOffer.section8.title') || '8. Details of the Parties',
          text: t('legalOffer.section8.text') || 'Executor: Reglai LLC\nLegal address: Moscow, Primernaya St., 1, office 100\nINN: 1234567890\nKPP: 123456789\nOGRN: 1234567890123\nSettlement account: 40702810123456789012\nBank: JSC Tinkoff Bank\nBIC: 044525974\nCorr. account: 30101810100000000974'
        }
      ],
      footer: t('legalOffer.footer') || 'This Agreement is a legally binding document.'
    }
  };

  const currentContent = content[language] || content.ru;

  const handlePrint = () => {
    const element = document.createElement('div');
    element.innerHTML = currentContent.sections.map(s => 
      `<h3 style="margin-top:20px;font-size:18px;">${s.title}</h3><p style="font-size:14px;line-height:1.6;">${s.text.replace(/\n/g, '<br/>')}</p>`
    ).join('');
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${currentContent.title}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: auto; }
              h3 { margin-top: 20px; color: #1f2937; }
              p { line-height: 1.6; color: #374151; }
            </style>
          </head>
          <body>
            <h1 style="text-align:center;color:#4A6572;">${currentContent.title}</h1>
            ${element.innerHTML}
            <p style="margin-top:40px;text-align:center;color:#6b7280;font-size:12px;">
              ${currentContent.footer}<br/>
              ${new Date().toLocaleDateString('ru-RU')}
            </p>
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
                {currentContent.title}
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
              <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {section.text}
              </div>
              {index < currentContent.sections.length - 1 && (
                <hr className="border-gray-200 dark:border-gray-700" />
              )}
            </div>
          ))}
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
              📄 {t('print') || (language === 'ru' ? 'PDF' : 'PDF')}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t('close') || (language === 'ru' ? 'Закрыть' : 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalOfferModal;