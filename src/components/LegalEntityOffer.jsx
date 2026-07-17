// src/components/LegalEntityOffer.jsx
import React from 'react';
import { FileText } from 'lucide-react';

const LegalEntityOffer = () => {
  const handleDownload = () => {
    // Создаём HTML-версию документа для скачивания
    const content = document.getElementById('legal-offer-content')?.innerHTML || '';
    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta charset="UTF-8"><title>Договор-оферта</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6;">
          ${content}
        </body>
      </html>
    `;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Dogovor_Offer_Reglay_PRO.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#4A6572]" />
          Договор-оферта для юридических лиц
        </h2>
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors text-sm flex items-center gap-2"
        >
          📥 Скачать
        </button>
      </div>

      <div id="legal-offer-content" className="prose dark:prose-invert max-w-none text-sm">
        <h1 className="text-2xl font-bold text-center">ДОГОВОР-ОФЕРТА № ___</h1>
        <p className="text-center text-gray-500">на оказание услуг по предоставлению доступа к Сервису «Реглай PRO»</p>
        
        <h2 className="text-lg font-bold mt-6">1. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ</h2>
        <p>
          1.1. «Сервис» — программно-аппаратный комплекс «Реглай PRO», 
          предоставляемый Исполнителем через сеть Интернет.
        </p>
        <p>
          1.2. «Заказчик» — юридическое лицо, акцептовавшее настоящую Оферту.
        </p>
        <p>
          1.3. «Акцепт» — полное и безоговорочное принятие условий настоящей Оферты 
          путем совершения действий, указанных в п. 3.1.
        </p>

        <h2 className="text-lg font-bold mt-6">2. ПРЕДМЕТ ДОГОВОРА</h2>
        <p>
          2.1. Исполнитель обязуется предоставить Заказчику доступ к Сервису, 
          а Заказчик обязуется оплатить услуги в порядке и на условиях, 
          предусмотренных настоящим Договором.
        </p>

        <h2 className="text-lg font-bold mt-6">3. ПОРЯДОК ПРЕДОСТАВЛЕНИЯ УСЛУГ</h2>
        <p>
          3.1. Доступ к Сервису предоставляется после регистрации на сайте 
          https://reglay.pro и акцепта настоящей Оферты.
        </p>
        <p>
          3.2. Исполнитель предоставляет доступ 24/7, за исключением 
          времени плановых технических работ.
        </p>
        <p>
          3.3. Уведомление о плановых работах публикуется на сайте не менее чем за 24 часа.
        </p>

        <h2 className="text-lg font-bold mt-6">4. СТОИМОСТЬ УСЛУГ И ПОРЯДОК РАСЧЕТОВ</h2>
        <p>
          4.1. Стоимость услуг определяется согласно тарифам, размещенным на сайте.
        </p>
        <p>
          4.2. Оплата производится путем безналичного перевода на расчетный счет Исполнителя.
        </p>
        <p>
          4.3. Датой оплаты считается дата поступления денежных средств на счет Исполнителя.
        </p>
        <p>
          4.4. На период тестирования (до 31.12.2026) услуги предоставляются 
          на безвозмездной основе.
        </p>

        <h2 className="text-lg font-bold mt-6">5. ОТВЕТСТВЕННОСТЬ СТОРОН</h2>
        <p>
          5.1. Исполнитель несет ответственность за сохранность данных Заказчика.
        </p>
        <p>
          5.2. Заказчик несет ответственность за достоверность предоставленных данных.
        </p>
        <p>
          5.3. Стороны освобождаются от ответственности при форс-мажорных обстоятельствах.
        </p>
        <p>
          5.4. Совокупная ответственность Исполнителя ограничена суммой оплаченных услуг.
        </p>

        <h2 className="text-lg font-bold mt-6">6. СРОК ДЕЙСТВИЯ ДОГОВОРА</h2>
        <p>
          6.1. Договор вступает в силу с момента акцепта Оферты.
        </p>
        <p>
          6.2. Договор действует бессрочно до его расторжения одной из сторон.
        </p>
        <p>
          6.3. Заказчик вправе расторгнуть Договор в одностороннем порядке, 
          уведомив Исполнителя за 5 рабочих дней.
        </p>

        <h2 className="text-lg font-bold mt-6">7. КОНФИДЕНЦИАЛЬНОСТЬ</h2>
        <p>
          7.1. Стороны обязуются сохранять конфиденциальность информации, 
          полученной в рамках исполнения Договора.
        </p>
        <p>
          7.2. Передача информации третьим лицам допускается только с письменного 
          согласия другой Стороны.
        </p>

        <h2 className="text-lg font-bold mt-6">8. РЕКВИЗИТЫ И ПОДПИСИ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <h4 className="font-bold text-[#4A6572] dark:text-[#F9AA33]">Исполнитель:</h4>
            <p className="text-sm">
              ООО «РЕГЛАЙ ПРО»<br />
              ИНН: 1234567890<br />
              КПП: 123456789<br />
              ОГРН: 1234567890123<br />
              р/с: 12345678901234567890<br />
              БИК: 123456789<br />
              Юр. адрес: г. Москва, ул. Строителей, д. 1
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
            <h4 className="font-bold text-[#4A6572] dark:text-[#F9AA33]">Заказчик:</h4>
            <p className="text-sm">
              ____________________<br />
              ИНН: ___________<br />
              КПП: ___________<br />
              ОГРН: ___________<br />
              р/с: ___________<br />
              БИК: ___________<br />
              Юр. адрес: ____________________
            </p>
            <p className="text-xs text-gray-400 mt-2 italic">
              Заполняется Заказчиком при регистрации
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalEntityOffer;