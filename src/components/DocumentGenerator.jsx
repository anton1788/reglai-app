import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileText, Download, Printer, Calendar, Package, ClipboardList, Truck, Loader2, AlertCircle } from 'lucide-react';

const DOCS = [
  { id: 'work_act', label: 'Акт выполненных работ', icon: ClipboardList },
  { id: 'material_act', label: 'Акт приемки (М-7)', icon: Package },
  { id: 'work_log', label: 'Журнал работ', icon: Calendar },
  { id: 'invoice', label: 'Накладная', icon: Truck }
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
  // ✅ УДАЛЕНО: userCompanyId, t — не используются в компоненте
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
    const materialsRows = app.materials.map(m => `
      <tr class="border-t border-gray-200 dark:border-gray-700">
        <td class="py-2 px-3 text-sm">${m.description}</td>
        <td class="py-2 px-3 text-sm text-center">${m.unit}</td>
        <td class="py-2 px-3 text-sm text-center">${Number(m.quantity).toLocaleString('ru-RU')}</td>
        <td class="py-2 px-3 text-sm text-center">${Number(m.received || m.supplier_received_quantity || 0).toLocaleString('ru-RU')}</td>
      </tr>
    `).join('');

    const signatures = `
      <div class="mt-8 pt-4 border-t border-gray-300 dark:border-gray-600 flex justify-between">
        <div class="text-center w-1/2">
          <p class="text-sm text-gray-500 dark:text-gray-400">Передал / Исполнитель</p>
          <p class="mt-8 border-b border-gray-400 dark:border-gray-500 w-3/4 mx-auto"></p>
          <p class="text-xs mt-1">(${app.foreman_name})</p>
        </div>
        <div class="text-center w-1/2">
          <p class="text-sm text-gray-500 dark:text-gray-400">Принял / Заказчик</p>
          <p class="mt-8 border-b border-gray-400 dark:border-gray-500 w-3/4 mx-auto"></p>
          <p class="text-xs mt-1">(${companyName || '—'})</p>
        </div>
      </div>
    `;

    switch (type) {
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
        // ✅ ОБЕРНУТО В {} для no-case-declarations
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
      } // ✅ Закрывающая скобка для case
      case 'invoice':
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-4xl mx-auto">
            <h1 class="text-xl font-bold text-center mb-4">ТОВАРНАЯ НАКЛАДНАЯ</h1>
            <div class="grid grid-cols-2 gap-4 text-sm mb-6">
              <p><strong>Отправитель:</strong> ${companyName || '—'}</p>
              <p><strong>Получатель:</strong> ${app.object_name}</p>
              <p><strong>Дата отгрузки:</strong> ${date}</p>
              <p><strong>Основание:</strong> Заявка № ${app.id?.slice(0, 8)}...</p>
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
      default: return '';
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
        <div className="flex flex-wrap gap-2">
          {DOCS.map(doc => (
            <button
              key={doc.id}
              onClick={() => setActiveTab(doc.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
                <Printer className="w-4 h-4" /> Печать / PDF
              </button>
            </div>
            <div ref={printRef} id="printable-doc" className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Выберите заявку и нажмите «Сформировать документ»</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentGenerator;