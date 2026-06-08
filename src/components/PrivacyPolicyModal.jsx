import React from 'react';
import { X, Shield, Download, Printer } from 'lucide-react';

const PrivacyPolicyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = document.getElementById('privacy-policy-content');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Политика конфиденциальности Реглай PRO</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
          }
          h1 { color: #4A6572; border-bottom: 2px solid #4A6572; padding-bottom: 10px; }
          h2 { color: #344955; margin-top: 25px; }
          h3 { color: #4A6572; margin-top: 20px; }
          ul { margin: 10px 0; padding-left: 25px; }
          li { margin: 5px 0; }
          .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
          @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${element ? element.innerHTML : ''}
        <div class="footer">
          <p>© 2025 Реглай PRO. Все права защищены.</p>
          <p>Дата последнего обновления: 01 января 2025 года</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'privacy_policy_reglai.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100000] fade-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#4A6572] to-[#344955] rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="privacy-policy-title" className="text-xl font-bold text-gray-900 dark:text-white">
                Политика конфиденциальности
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Реглай PRO — защита ваших данных</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="no-print p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Скачать HTML"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="no-print p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Распечатать"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div id="privacy-policy-content" className="overflow-y-auto p-6 space-y-6 text-gray-700 dark:text-gray-300">
          {/* Версия и дата */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-semibold">Версия 2.0</span> | Дата последнего обновления: 01 января 2025 года
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Настоящая Политика применяется ко всем пользователям сервиса «Реглай PRO»
            </p>
          </div>

          {/* 1. Общие положения */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#4A6572] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
               Общие положения
            </h3>
            <p className="mb-2">
              Настоящая Политика конфиденциальности регулирует порядок обработки и использования 
              персональных данных пользователей в сервисе управления строительными материалами 
              <span className="font-semibold text-[#4A6572]"> «Реглай PRO»</span> (далее — Сервис).
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Регистрируясь в Сервисе, вы принимаете условия настоящей Политики и даёте согласие 
              на обработку своих персональных данных в соответствии с Федеральным законом № 152-ФЗ 
              «О персональных данных» и GDPR (применимо для пользователей из ЕС).
            </p>
          </div>

          {/* 2. Какие данные мы собираем */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#4A6572] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
               Какие данные мы собираем
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">2.1. При регистрации:</p>
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Email адрес (используется как логин для входа)</li>
                  <li>ФИО пользователя</li>
                  <li>Номер телефона</li>
                  <li>Название компании</li>
                  <li>Роль в компании (прораб, менеджер, снабженец, заказчик, бухгалтер)</li>
                </ul>
              </div>
              
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">2.2. В процессе работы:</p>
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Данные о заявках на материалы (наименования, количество, единицы измерения, цены)</li>
                  <li>История статусов заявок (создана, в работе, частично получена, завершена, отменена)</li>
                  <li>Фотоматериалы объектов и поставок (с вашего устройства)</li>
                  <li>Комментарии и переписка в чатах компании</li>
                  <li>Данные о движении материалов на складе (приход, расход, остатки)</li>
                  <li>Акты выполненных работ и другие документы</li>
                </ul>
              </div>
              
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">2.3. Технические данные:</p>
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>IP-адреса, тип устройства, браузер, операционная система, время доступа</li>
                  <li>Журналы аудита действий пользователей (кто, когда, что сделал)</li>
                  <li>Данные офлайн-черновиков (при отсутствии интернета в IndexedDB)</li>
                  <li>Cookie и localStorage для работы интерфейса и сохранения настроек</li>
                  <li>Данные об использовании функций (аналитика для улучшения сервиса)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 3. Как мы используем ваши данные */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#4A6572] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
               Как мы используем ваши данные
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                <p className="font-medium text-[#4A6572]">🔐 Идентификация</p>
                <p className="text-sm">Доступ к заявкам и объектам вашей компании</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                <p className="font-medium text-[#4A6572]">📋 Управление заявками</p>
                <p className="text-sm">Создание, отслеживание, приёмка материалов</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                <p className="font-medium text-[#4A6572]">🔔 Уведомления</p>
                <p className="text-sm">Оповещения о статусе заявок через email/Telegram</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                <p className="font-medium text-[#4A6572]">📊 Аналитика</p>
                <p className="text-sm">Формирование отчётов по расходам и эффективности</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                <p className="font-medium text-[#4A6572]">🚀 Улучшение сервиса</p>
                <p className="text-sm">Анализ использования функций для оптимизации</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                <p className="font-medium text-[#4A6572]">🆘 Техподдержка</p>
                <p className="text-sm">Решение проблем на основе логов и обращений</p>
              </div>
            </div>
          </div>

          {/* 4. Хранение и защита данных */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#4A6572] text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
               Хранение и защита данных
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Данные хранятся на защищённых серверах <span className="font-medium">Supabase (AWS, регион Frankfurt)</span> — соответствие GDPR</li>
              <li>Используется шифрование данных при передаче (TLS 1.3) и при хранении (AES-256)</li>
              <li>Доступ к данным строго по ролевой модели (прораб видит только свои заявки, менеджер — все)</li>
              <li>Срок хранения — пока вы являетесь активным пользователем компании</li>
              <li>После удаления аккаунта данные хранятся 30 дней (возможность восстановления), затем полностью удаляются</li>
              <li>Регулярное автоматическое резервное копирование (ежедневно, с retention 30 дней)</li>
              <li>Двухфакторная аутентификация для администраторов (опционально)</li>
            </ul>
          </div>

          {/* 5. Передача данных третьим лицам */}
          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
               Передача данных третьим лицам
            </h3>
            <p className="mb-2 font-medium text-amber-800 dark:text-amber-400">
              ⚠️ Мы НЕ продаём и НЕ передаём ваши данные третьим лицам для маркетинговых целей.
            </p>
            <p className="mb-2">Исключения (строго ограниченные законом):</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>По требованию правоохранительных органов (в рамках законодательства РФ)</li>
              <li>Для обеспечения работы сервиса (хостинг-провайдеры, CDN, сервисы мониторинга)</li>
              <li>С вашего явного письменного согласия (например, для интеграции с вашими корпоративными системами)</li>
            </ul>
          </div>

          {/* 6. Права пользователя */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#4A6572] text-white rounded-full flex items-center justify-center text-xs font-bold">6</span>
               Ваши права (GDPR & 152-ФЗ)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border-l-4 border-[#4A6572] pl-3">
                <p className="font-medium">🔍 Право на доступ</p>
                <p className="text-sm">Вы можете запросить все данные о себе в любое время</p>
              </div>
              <div className="border-l-4 border-[#4A6572] pl-3">
                <p className="font-medium">✏️ Право на исправление</p>
                <p className="text-sm">Вы можете изменить свои данные в профиле</p>
              </div>
              <div className="border-l-4 border-[#4A6572] pl-3">
                <p className="font-medium">🗑️ Право на удаление</p>
                <p className="text-sm">Вы можете удалить свой аккаунт (данные будут стёрты через 30 дней)</p>
              </div>
              <div className="border-l-4 border-[#4A6572] pl-3">
                <p className="font-medium">📥 Право на экспорт</p>
                <p className="text-sm">Вы можете выгрузить свои данные в PDF/HTML/XLSX</p>
              </div>
              <div className="border-l-4 border-[#4A6572] pl-3">
                <p className="font-medium">⏸️ Право на ограничение обработки</p>
                <p className="text-sm">При спорных ситуациях обработка может быть приостановлена</p>
              </div>
              <div className="border-l-4 border-[#4A6572] pl-3">
                <p className="font-medium">🔁 Право на отзыв согласия</p>
                <p className="text-sm">В любой момент через администратора компании</p>
              </div>
            </div>
          </div>

          {/* 7. Офлайн-режим */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#4A6572] text-white rounded-full flex items-center justify-center text-xs font-bold">7</span>
               Офлайн-режим и локальное хранение
            </h3>
            <p className="mb-2">
              Сервис поддерживает работу без интернета. Ваши черновики и заявки временно сохраняются 
              в локальном хранилище вашего устройства <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">(IndexedDB)</span>. 
              При восстановлении соединения данные автоматически синхронизируются с сервером.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                🔒 Локальные данные защищены политиками безопасности вашего браузера и не доступны 
                другим сайтам или приложениям. При выходе из аккаунта данные остаются на устройстве 
                до следующей синхронизации.
              </p>
            </div>
          </div>

          {/* 8. Cookies и аналитика */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#4A6572] text-white rounded-full flex items-center justify-center text-xs font-bold">8</span>
               Cookies и аналитика
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Используются <span className="font-medium">только технические cookie</span> для авторизации и работы интерфейса</li>
              <li>Мы <span className="font-semibold text-green-600">НЕ используем</span> сторонние аналитические системы (Google Analytics, Яндекс.Метрика и т.п.)</li>
              <li>Вся аналитика использования анонимна и служит только для улучшения сервиса</li>
              <li>Вы можете отключить cookie в настройках браузера, но часть функций может работать некорректно</li>
              <li>Срок хранения cookie — до 30 дней или до выхода из аккаунта</li>
            </ul>
          </div>

          {/* 9. Контакты */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#4A6572] text-white rounded-full flex items-center justify-center text-xs font-bold">9</span>
               Контакты для вопросов о данных
            </h3>
            <p className="mb-2">По всем вопросам обработки персональных данных вы можете обратиться:</p>
            <div className="space-y-1 font-mono text-sm">
              <p>📧 Email: <a href="mailto:privacy@reglai.ru" className="text-[#4A6572] hover:underline">privacy@reglai.ru</a></p>
              <p>📞 Телефон: <a href="tel:+74951234567" className="text-[#4A6572] hover:underline">+7 (495) 123-45-67</a></p>
              <p>📍 Юридический адрес: 127006, г. Москва, ул. Тверская, д. 10, офис 501</p>
              <p>📠 Режим работы: Пн-Пт с 10:00 до 19:00 (МСК)</p>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Мы обязуемся ответить на ваш запрос в течение <span className="font-semibold">30 дней</span> в соответствии с 152-ФЗ.
            </p>
          </div>

          {/* 10. Изменение политики */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#4A6572] text-white rounded-full flex items-center justify-center text-xs font-bold">10</span>
               Изменение политики
            </h3>
            <p className="mb-2">
              Мы оставляем право обновлять Политику конфиденциальности. О существенных изменениях 
              мы уведомим вас через email или в интерфейсе сервиса (модальное окно).
            </p>
            <p className="text-sm text-gray-500">
              Актуальная версия всегда доступна по ссылке «Политика конфиденциальности» в форме регистрации 
              и в футере приложения.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 rounded-b-2xl border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2025 Реглай PRO. Все права защищены.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md transition-all font-medium"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyModal;