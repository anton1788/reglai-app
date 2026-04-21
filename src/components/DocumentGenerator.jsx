import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileText, Download, Printer, Calendar, Package, ClipboardList, Truck, Loader2, AlertCircle, FileCheck, Ruler, Receipt } from 'lucide-react';

const DOCS = [
  // Первая очередь (обязательно)
  { id: 'work_act', label: 'Акт выполненных работ', icon: ClipboardList },
  { id: 'material_act', label: 'Акт приемки (М-7)', icon: Package },
  { id: 'work_log', label: 'Журнал работ', icon: Calendar },
  { id: 'invoice', label: 'Накладная', icon: Truck },
  // Вторая очередь (желательно)
  { id: 'ks2', label: 'КС-2', icon: FileCheck },
  { id: 'ks3', label: 'КС-3', icon: Receipt },
  { id: 'hidden_works', label: 'Акт скрытых работ', icon: FileText },
  { id: 'executive_diagram', label: 'Исполнительная схема', icon: Ruler },
  { id: 'invoice_bill', label: 'Счет', icon: Receipt },
  { id: 'invoice_vat', label: 'Счет-фактура', icon: FileText }
];

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden; }
  #printable-doc, #printable-doc * { visibility: visible; }
  #printable-doc { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
}
`;

const DocumentGenerator = ({
  applications = [],
  user,
  userRole,
  showNotification,
  companyName
}) => {
  const [activeTab, setActiveTab] = useState('work_act');
  const [selectedAppId, setSelectedAppId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = PRINT_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const selectedApp = useMemo(() =>
    applications.find(a => a.id === selectedAppId),
    [applications, selectedAppId]
  );

  const eligibleApps = useMemo(() =>
    applications.filter(app => {
      if (userRole === 'master' || userRole === 'foreman') return app.user_id === user?.id;
      return true;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [applications, userRole, user?.id]
  );

  const generateTemplate = (type, app) => {
    if (!app) return '';
    const date = new Date(app.created_at).toLocaleDateString('ru-RU');
    const docNumber = app.id?.slice(0, 8).toUpperCase() || '---';
    
    const materialsRows = app.materials.map(m => {
      const qty = Number(m.quantity) || 0;
      const received = Number(m.received || m.supplier_received_quantity || 0);
      const price = Number(m.price || 1000); // Заглушка, если цены нет
      const total = qty * price;
      return `
        <tr class="border-t border-gray-200 dark:border-gray-700">
          <td class="py-2 px-3 text-sm">${m.description}</td>
          <td class="py-2 px-3 text-sm text-center">${m.unit}</td>
          <td class="py-2 px-3 text-sm text-center">${qty.toLocaleString('ru-RU')}</td>
          <td class="py-2 px-3 text-sm text-center">${received.toLocaleString('ru-RU')}</td>
          <td class="py-2 px-3 text-sm text-right">${price.toLocaleString('ru-RU')} ₽</td>
          <td class="py-2 px-3 text-sm text-right font-medium">${total.toLocaleString('ru-RU')} ₽</td>
        </tr>
      `;
    }).join('');

    const totalAmount = app.materials.reduce((sum, m) => 
      sum + (Number(m.quantity) || 0) * (Number(m.price) || 1000), 0
    );

    const signatures = `
      <div class="mt-8 pt-4 border-t border-gray-300 dark:border-gray-600 flex justify-between">
        <div class="text-center w-1/2">
          <p class="text-sm text-gray-500 dark:text-gray-400">Исполнитель</p>
          <p class="mt-8 border-b border-gray-400 dark:border-gray-500 w-3/4 mx-auto"></p>
          <p class="text-xs mt-1">(${app.foreman_name})</p>
        </div>
        <div class="text-center w-1/2">
          <p class="text-sm text-gray-500 dark:text-gray-400">Заказчик</p>
          <p class="mt-8 border-b border-gray-400 dark:border-gray-500 w-3/4 mx-auto"></p>
          <p class="text-xs mt-1">(${companyName || '—'})</p>
        </div>
      </div>
    `;

    switch (type) {
      // === ПЕРВАЯ ОЧЕРЕДЬ (оставляем как есть) ===
      case 'work_act':
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-4xl mx-auto">
            <h1 class="text-xl font-bold text-center mb-4">АКТ ВЫПОЛНЕННЫХ РАБОТ</h1>
            <div class="grid grid-cols-2 gap-4 text-sm mb-6">
              <p><strong>Объект:</strong> ${app.object_name}</p>
              <p><strong>Дата:</strong> ${date}</p>
              <p><strong>Прораб:</strong> ${app.foreman_name}</p>
              <p><strong>Компания:</strong> ${companyName || '—'}</p>
            </div>
            <table class="w-full border-collapse text-left">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <th class="py-2 px-3 font-medium">Наименование</th>
                  <th class="py-2 px-3 font-medium text-center">Ед.изм.</th>
                  <th class="py-2 px-3 font-medium text-center">Заказано</th>
                  <th class="py-2 px-3 font-medium text-center">Выполнено</th>
                </tr>
              </thead>
              <tbody>${materialsRows}</tbody>
            </table>
            ${signatures}
          </div>`;
      
      case 'material_act':
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-4xl mx-auto">
            <h1 class="text-xl font-bold text-center mb-4">АКТ ПРИЁМКИ МАТЕРИАЛОВ (Форма М-7)</h1>
            <div class="grid grid-cols-2 gap-4 text-sm mb-6">
              <p><strong>Поставщик:</strong> ${companyName || '—'}</p>
              <p><strong>Склад/Объект:</strong> ${app.object_name}</p>
              <p><strong>Материально ответственное лицо:</strong> ${app.foreman_name}</p>
              <p><strong>Дата приёмки:</strong> ${date}</p>
            </div>
            <table class="w-full border-collapse text-left">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <th class="py-2 px-3 font-medium">Материал</th>
                  <th class="py-2 px-3 font-medium text-center">Ед.изм.</th>
                  <th class="py-2 px-3 font-medium text-center">По документам</th>
                  <th class="py-2 px-3 font-medium text-center">Фактически</th>
                </tr>
              </thead>
              <tbody>${materialsRows}</tbody>
            </table>
            <p class="mt-4 text-sm text-gray-500 dark:text-gray-400 italic">
              * Претензий по количеству и качеству не имею. Расхождения отсутствуют.
            </p>
            ${signatures}
          </div>`;
      
      case 'work_log': {
        const logEntries = app.status_history?.map(h => `
          <tr class="border-t border-gray-200 dark:border-gray-700">
            <td class="py-2 px-3 text-sm">${new Date(h.timestamp).toLocaleString('ru-RU')}</td>
            <td class="py-2 px-3 text-sm capitalize">${h.action?.replace(/_/g, ' ')}</td>
            <td class="py-2 px-3 text-sm">${h.old_status || '—'} → ${h.new_status}</td>
            <td class="py-2 px-3 text-sm">${h.details || '—'}</td>
          </tr>
        `).join('') || '<tr><td colspan="4" class="py-4 text-center text-gray-500">Нет записей в истории</td></tr>';
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-4xl mx-auto">
            <h1 class="text-xl font-bold text-center mb-4">ЖУРНАЛ РАБОТ</h1>
            <p class="text-sm mb-4"><strong>Объект:</strong> ${app.object_name} | <strong>Прораб:</strong> ${app.foreman_name}</p>
            <table class="w-full border-collapse text-left">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <th class="py-2 px-3 font-medium">Дата/Время</th>
                  <th class="py-2 px-3 font-medium">Действие</th>
                  <th class="py-2 px-3 font-medium">Статус</th>
                  <th class="py-2 px-3 font-medium">Примечание</th>
                </tr>
              </thead>
              <tbody>${logEntries}</tbody>
            </table>
          </div>`;
      }
      
      case 'invoice':
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-4xl mx-auto">
            <h1 class="text-xl font-bold text-center mb-4">ТОВАРНАЯ НАКЛАДНАЯ</h1>
            <div class="grid grid-cols-2 gap-4 text-sm mb-6">
              <p><strong>Отправитель:</strong> ${companyName || '—'}</p>
              <p><strong>Получатель:</strong> ${app.object_name}</p>
              <p><strong>Дата отгрузки:</strong> ${date}</p>
              <p><strong>Основание:</strong> Заявка № ${docNumber}</p>
            </div>
            <table class="w-full border-collapse text-left">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <th class="py-2 px-3 font-medium">Товар</th>
                  <th class="py-2 px-3 font-medium text-center">Ед.изм.</th>
                  <th class="py-2 px-3 font-medium text-center">Количество</th>
                  <th class="py-2 px-3 font-medium text-center">Примечание</th>
                </tr>
              </thead>
              <tbody>${materialsRows}</tbody>
            </table>
            ${signatures}
          </div>`;

      // === ВТОРАЯ ОЧЕРЕДЬ (НОВОЕ) ===
      
      case 'ks2':
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-5xl mx-auto">
            <div class="text-center mb-4">
              <h1 class="text-lg font-bold">АКТ № ${docNumber}</h1>
              <h2 class="text-xl font-bold mt-1">о приемке выполненных работ (форма КС-2)</h2>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded">
              <p><strong>Заказчик:</strong> ${companyName || '—'}</p>
              <p><strong>Подрядчик:</strong> ${app.foreman_name}</p>
              <p><strong>Объект:</strong> ${app.object_name}</p>
              <p><strong>Дата составления:</strong> ${date}</p>
              <p><strong>Период выполнения:</strong> ${date} — ${date}</p>
              <p><strong>Основание:</strong> Договор подряда</p>
            </div>
            <table class="w-full border-collapse text-left text-sm">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                  <th class="py-2 px-2 font-bold text-center" rowspan="2">№</th>
                  <th class="py-2 px-2 font-bold text-left" rowspan="2">Наименование работ</th>
                  <th class="py-2 px-2 font-bold text-center" rowspan="2">Ед.изм.</th>
                  <th class="py-2 px-2 font-bold text-center" colspan="2">Количество</th>
                  <th class="py-2 px-2 font-bold text-right" rowspan="2">Цена, ₽</th>
                  <th class="py-2 px-2 font-bold text-right" rowspan="2">Стоимость, ₽</th>
                </tr>
                <tr class="bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
                  <th class="py-1 px-2 font-bold text-center">По проекту</th>
                  <th class="py-1 px-2 font-bold text-center">Фактически</th>
                </tr>
              </thead>
              <tbody>
                ${app.materials.map((m, idx) => {
                  const qty = Number(m.quantity) || 0;
                  const received = Number(m.received || m.supplier_received_quantity || 0);
                  const price = Number(m.price || 1000);
                  const total = received * price;
                  return `
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                      <td class="py-2 px-2 text-center">${idx + 1}</td>
                      <td class="py-2 px-2">${m.description}</td>
                      <td class="py-2 px-2 text-center">${m.unit}</td>
                      <td class="py-2 px-2 text-center">${qty}</td>
                      <td class="py-2 px-2 text-center font-medium">${received}</td>
                      <td class="py-2 px-2 text-right">${price.toLocaleString('ru-RU')}</td>
                      <td class="py-2 px-2 text-right font-medium">${total.toLocaleString('ru-RU')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr class="bg-gray-50 dark:bg-gray-700/50 font-bold">
                  <td colspan="6" class="py-3 px-2 text-right">ИТОГО:</td>
                  <td class="py-3 px-2 text-right">${totalAmount.toLocaleString('ru-RU')} ₽</td>
                </tr>
              </tfoot>
            </table>
            <div class="mt-6 grid grid-cols-2 gap-8 text-sm">
              <div>
                <p class="font-medium mb-2">Работы выполнил:</p>
                <p class="border-b border-gray-400 dark:border-gray-500 pb-8">${app.foreman_name}</p>
                <p class="text-xs text-gray-500">(подпись, расшифровка)</p>
              </div>
              <div>
                <p class="font-medium mb-2">Работы принял:</p>
                <p class="border-b border-gray-400 dark:border-gray-500 pb-8">${companyName || '—'}</p>
                <p class="text-xs text-gray-500">(подпись, расшифровка)</p>
              </div>
            </div>
          </div>`;

      case 'ks3':
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-5xl mx-auto">
            <div class="text-center mb-4">
              <h1 class="text-lg font-bold">СПРАВКА № ${docNumber}</h1>
              <h2 class="text-xl font-bold mt-1">о стоимости выполненных работ и затрат (форма КС-3)</h2>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded">
              <p><strong>Стройка:</strong> ${app.object_name}</p>
              <p><strong>Заказчик:</strong> ${companyName || '—'}</p>
              <p><strong>Подрядчик:</strong> ${app.foreman_name}</p>
              <p><strong>Дата:</strong> ${date}</p>
            </div>
            <table class="w-full border-collapse text-left text-sm">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                  <th class="py-2 px-2 font-bold text-center" rowspan="2">№</th>
                  <th class="py-2 px-2 font-bold text-left" rowspan="2">Наименование работ</th>
                  <th class="py-2 px-2 font-bold text-center" rowspan="2">Ед.изм.</th>
                  <th class="py-2 px-2 font-bold text-right" colspan="2">Стоимость, ₽</th>
                </tr>
                <tr class="bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
                  <th class="py-1 px-2 font-bold text-right">По договору</th>
                  <th class="py-1 px-2 font-bold text-right">Фактически</th>
                </tr>
              </thead>
              <tbody>
                ${app.materials.map((m, idx) => {
                  const qty = Number(m.quantity) || 0;
                  const received = Number(m.received || m.supplier_received_quantity || 0);
                  const price = Number(m.price || 1000);
                  const contractTotal = qty * price;
                  const actualTotal = received * price;
                  return `
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                      <td class="py-2 px-2 text-center">${idx + 1}</td>
                      <td class="py-2 px-2">${m.description}</td>
                      <td class="py-2 px-2 text-center">${m.unit}</td>
                      <td class="py-2 px-2 text-right">${contractTotal.toLocaleString('ru-RU')}</td>
                      <td class="py-2 px-2 text-right font-medium">${actualTotal.toLocaleString('ru-RU')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr class="bg-gray-50 dark:bg-gray-700/50 font-bold">
                  <td colspan="3" class="py-3 px-2 text-right">ВСЕГО:</td>
                  <td class="py-3 px-2 text-right">${totalAmount.toLocaleString('ru-RU')} ₽</td>
                  <td class="py-3 px-2 text-right">${totalAmount.toLocaleString('ru-RU')} ₽</td>
                </tr>
                <tr class="bg-gray-100 dark:bg-gray-700 font-bold">
                  <td colspan="3" class="py-2 px-2 text-right">В т.ч. НДС 20%:</td>
                  <td class="py-2 px-2 text-right" colspan="2">${Math.round(totalAmount * 0.2 / 1.2).toLocaleString('ru-RU')} ₽</td>
                </tr>
              </tfoot>
            </table>
            ${signatures}
          </div>`;

      case 'hidden_works':
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-4xl mx-auto">
            <h1 class="text-xl font-bold text-center mb-4">АКТ<br/>на скрытые работы</h1>
            <div class="grid grid-cols-2 gap-4 text-sm mb-6">
              <p><strong>Объект:</strong> ${app.object_name}</p>
              <p><strong>Дата:</strong> ${date}</p>
              <p><strong>Прораб:</strong> ${app.foreman_name}</p>
              <p><strong>№ заявки:</strong> ${docNumber}</p>
            </div>
            <div class="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
              <p class="font-medium">Состав работ, подлежащих освидетельствованию:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                ${app.materials.slice(0, 5).map(m => `<li>${m.description} — ${m.quantity} ${m.unit}</li>`).join('')}
                ${app.materials.length > 5 ? `<li class="text-gray-500">и ещё ${app.materials.length - 5} позиций...</li>` : ''}
              </ul>
            </div>
            <table class="w-full border-collapse text-left mb-6">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <th class="py-2 px-3 font-medium">Наименование</th>
                  <th class="py-2 px-3 font-medium text-center">Ед.изм.</th>
                  <th class="py-2 px-3 font-medium text-center">Объём</th>
                  <th class="py-2 px-3 font-medium text-center">Качество</th>
                </tr>
              </thead>
              <tbody>
                ${app.materials.map(m => `
                  <tr class="border-t border-gray-200 dark:border-gray-700">
                    <td class="py-2 px-3 text-sm">${m.description}</td>
                    <td class="py-2 px-3 text-sm text-center">${m.unit}</td>
                    <td class="py-2 px-3 text-sm text-center">${Number(m.quantity).toLocaleString('ru-RU')}</td>
                    <td class="py-2 px-3 text-sm text-center text-green-600">✓ Соответствует</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="space-y-4 text-sm">
              <p><strong>Заключение:</strong> Работы выполнены в соответствии с проектной документацией и техническими регламентами. Претензий нет.</p>
              ${signatures}
            </div>
          </div>`;

      case 'executive_diagram':
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-4xl mx-auto">
            <h1 class="text-xl font-bold text-center mb-4">ИСПОЛНИТЕЛЬНАЯ СХЕМА</h1>
            <div class="grid grid-cols-2 gap-4 text-sm mb-6">
              <p><strong>Объект:</strong> ${app.object_name}</p>
              <p><strong>Дата:</strong> ${date}</p>
              <p><strong>Прораб:</strong> ${app.foreman_name}</p>
              <p><strong>№ заявки:</strong> ${docNumber}</p>
            </div>
            <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 mb-6 text-center bg-gray-50 dark:bg-gray-700/30">
              <p class="text-gray-500 dark:text-gray-400 mb-2">📐 Место для схемы / чертежа</p>
              <p class="text-xs text-gray-400">Прикрепите исполнительную схему в формате PDF, DWG или изображение</p>
              <div class="mt-4 flex justify-center gap-2">
                <button class="px-3 py-1.5 text-xs bg-[#4A6572] text-white rounded hover:bg-[#344955]">Загрузить файл</button>
                <button class="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500">Сделать фото</button>
              </div>
            </div>
            <div class="mb-6">
              <p class="font-medium mb-2">Перечень выполненных работ:</p>
              <ul class="space-y-1 text-sm">
                ${app.materials.map(m => `
                  <li class="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-1">
                    <span>${m.description}</span>
                    <span class="text-gray-500">${m.quantity} ${m.unit}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
            ${signatures}
          </div>`;

      case 'invoice_bill':
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-4xl mx-auto">
            <div class="flex justify-between items-start mb-6">
              <div>
                <h1 class="text-2xl font-bold">СЧЕТ № ${docNumber}</h1>
                <p class="text-sm text-gray-500">от ${date}</p>
              </div>
              <div class="text-right text-sm">
                <p><strong>Поставщик:</strong></p>
                <p>${companyName || '—'}</p>
                <p class="text-gray-500 mt-1">ИНН/КПП: — / —</p>
              </div>
            </div>
            <div class="mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded text-sm">
              <p><strong>Плательщик:</strong> ${app.object_name}</p>
              <p><strong>Основание:</strong> Заявка на материалы от ${date}</p>
            </div>
            <table class="w-full border-collapse text-left text-sm mb-6">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                  <th class="py-2 px-3 font-medium">№</th>
                  <th class="py-2 px-3 font-medium">Наименование</th>
                  <th class="py-2 px-3 font-medium text-center">Ед.</th>
                  <th class="py-2 px-3 font-medium text-center">Кол-во</th>
                  <th class="py-2 px-3 font-medium text-right">Цена</th>
                  <th class="py-2 px-3 font-medium text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                ${app.materials.map((m, idx) => {
                  const qty = Number(m.quantity) || 0;
                  const price = Number(m.price || 1000);
                  const total = qty * price;
                  return `
                    <tr class="border-t border-gray-200 dark:border-gray-700">
                      <td class="py-2 px-3">${idx + 1}</td>
                      <td class="py-2 px-3">${m.description}</td>
                      <td class="py-2 px-3 text-center">${m.unit}</td>
                      <td class="py-2 px-3 text-center">${qty}</td>
                      <td class="py-2 px-3 text-right">${price.toLocaleString('ru-RU')}</td>
                      <td class="py-2 px-3 text-right font-medium">${total.toLocaleString('ru-RU')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr class="bg-gray-50 dark:bg-gray-700/50 font-bold">
                  <td colspan="5" class="py-3 px-3 text-right">Итого:</td>
                  <td class="py-3 px-3 text-right">${totalAmount.toLocaleString('ru-RU')} ₽</td>
                </tr>
                <tr class="font-bold">
                  <td colspan="5" class="py-2 px-3 text-right">Всего к оплате:</td>
                  <td class="py-2 px-3 text-right text-lg">${totalAmount.toLocaleString('ru-RU')} ₽</td>
                </tr>
              </tfoot>
            </table>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              <p>Оплата в течение 3 банковских дней с момента выставления счета.</p>
              <p class="mt-2">Реквизиты для оплаты: [указать в настройках компании]</p>
            </div>
          </div>`;

      case 'invoice_vat':
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-5xl mx-auto">
            <h1 class="text-xl font-bold text-center mb-4">СЧЕТ-ФАКТУРА № ${docNumber}</h1>
            <p class="text-center text-sm text-gray-500 mb-6">от ${date}</p>
            <div class="grid grid-cols-2 gap-4 text-xs mb-6 p-3 bg-gray-50 dark:bg-gray-700/30 rounded">
              <div>
                <p><strong>Продавец:</strong></p>
                <p>${companyName || '—'}</p>
                <p>Адрес: —</p>
                <p>ИНН/КПП: — / —</p>
              </div>
              <div>
                <p><strong>Покупатель:</strong></p>
                <p>${app.object_name}</p>
                <p>Адрес: ${app.foreman_name}</p>
                <p>ИНН/КПП: — / —</p>
              </div>
            </div>
            <table class="w-full border-collapse text-left text-sm mb-6">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                  <th class="py-2 px-2 font-bold text-center">№</th>
                  <th class="py-2 px-2 font-bold text-left">Товар</th>
                  <th class="py-2 px-2 font-bold text-center">Ед.</th>
                  <th class="py-2 px-2 font-bold text-center">Кол-во</th>
                  <th class="py-2 px-2 font-bold text-right">Цена</th>
                  <th class="py-2 px-2 font-bold text-right">Без НДС</th>
                  <th class="py-2 px-2 font-bold text-right">НДС 20%</th>
                  <th class="py-2 px-2 font-bold text-right">Всего</th>
                </tr>
              </thead>
              <tbody>
                ${app.materials.map((m, idx) => {
                  const qty = Number(m.quantity) || 0;
                  const price = Number(m.price || 1000);
                  const total = qty * price;
                  const nds = Math.round(total * 0.2 / 1.2);
                  const withoutNds = total - nds;
                  return `
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                      <td class="py-2 px-2 text-center">${idx + 1}</td>
                      <td class="py-2 px-2">${m.description}</td>
                      <td class="py-2 px-2 text-center">${m.unit}</td>
                      <td class="py-2 px-2 text-center">${qty}</td>
                      <td class="py-2 px-2 text-right">${price.toLocaleString('ru-RU')}</td>
                      <td class="py-2 px-2 text-right">${withoutNds.toLocaleString('ru-RU')}</td>
                      <td class="py-2 px-2 text-right">${nds.toLocaleString('ru-RU')}</td>
                      <td class="py-2 px-2 text-right font-medium">${total.toLocaleString('ru-RU')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr class="bg-gray-50 dark:bg-gray-700/50 font-bold">
                  <td colspan="5" class="py-3 px-2 text-right">Итого:</td>
                  <td class="py-3 px-2 text-right">${Math.round(totalAmount * 100 / 120).toLocaleString('ru-RU')}</td>
                  <td class="py-3 px-2 text-right">${Math.round(totalAmount * 20 / 120).toLocaleString('ru-RU')}</td>
                  <td class="py-3 px-2 text-right">${totalAmount.toLocaleString('ru-RU')} ₽</td>
                </tr>
              </tfoot>
            </table>
            <div class="grid grid-cols-2 gap-8 text-sm mt-8">
              <div>
                <p class="font-medium mb-2">Руководитель:</p>
                <p class="border-b border-gray-400 dark:border-gray-500 pb-8">_________________</p>
              </div>
              <div>
                <p class="font-medium mb-2">Главный бухгалтер:</p>
                <p class="border-b border-gray-400 dark:border-gray-500 pb-8">_________________</p>
              </div>
            </div>
            <p class="mt-6 text-xs text-gray-400 text-center">
              * Документ сформирован в электронном виде. Подписан усиленной квалифицированной электронной подписью.
            </p>
          </div>`;

      default: 
        return '';
    }
  };

  const handleGenerate = () => {
    if (!selectedApp) {
      showNotification?.('Выберите заявку для формирования документа', 'warning');
      return;
    }
    setIsGenerating(true);
    setPreviewHtml(generateTemplate(activeTab, selectedApp));
    setIsGenerating(false);
  };

  const handlePrint = () => {
    if (!previewHtml) return;
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Документооборот</h2>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 no-scrollbar">
          {DOCS.map(doc => (
            <button
              key={doc.id}
              onClick={() => setActiveTab(doc.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === doc.id
                  ? 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30'
              }`}
            >
              <doc.icon className="w-4 h-4" />
              {doc.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Выберите заявку</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">— Не выбрано —</option>
              {eligibleApps.map(app => (
                <option key={app.id} value={app.id}>
                  {app.object_name} • {app.foreman_name} • {new Date(app.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={!selectedAppId || isGenerating}
              className="w-full md:w-auto px-6 py-2.5 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white rounded-lg font-medium hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Сформировать документ
            </button>
          </div>
        </div>

        {previewHtml ? (
          <div className="space-y-4">
            <div className="flex justify-end gap-3 no-print">
              <button onClick={handlePrint} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600">
                <Printer className="w-4 h-4" /> Печать / Экспорт в PDF
              </button>
            </div>
            <div ref={printRef} id="printable-doc" className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50 overflow-x-auto">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Выберите заявку и тип документа, затем нажмите «Сформировать документ»</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentGenerator;