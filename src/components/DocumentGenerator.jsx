import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  FileText, Download, Printer, Calendar, Package, ClipboardList, Truck, 
  Loader2, AlertCircle, FileCheck, Ruler, Receipt, Check, X, Upload, Paperclip
} from 'lucide-react';

const DOCS = [
  { id: 'work_act', label: 'Акт выполненных работ', icon: ClipboardList },
  { id: 'material_act', label: 'Акт приемки (М-7)', icon: Package },
  { id: 'work_log', label: 'Журнал работ', icon: Calendar },
  { id: 'invoice', label: 'Накладная', icon: Truck },
  { id: 'ks2', label: 'КС-2', icon: FileCheck },
  { id: 'ks3', label: 'КС-3', icon: Receipt },
  { id: 'hidden_works', label: 'Акт скрытых работ', icon: FileText },
  { id: 'executive_diagram', label: 'Исполнительная схема', icon: Ruler },
  { id: 'invoice_bill', label: 'Счёт', icon: Receipt },
  { id: 'invoice_vat', label: 'Счёт-фактура', icon: FileText }
];

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden; }
  #printable-doc, #printable-doc * { visibility: visible; }
  #printable-doc { position: absolute; left: 0; top: 0; width: 100%; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
}
`;

const DocumentGenerator = ({
  applications = [],
  user,
  userRole,
  showNotification,
  companyName,
  userCompanyId,
  supabase // ← ДОБАВИТЬ этот пропс при интеграции в App.jsx
}) => {
  const [activeTab, setActiveTab] = useState('work_act');
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState([]); // ✅ Для пакетной печати
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [companyDetails, setCompanyDetails] = useState(null);
  const [loadingCompanyDetails, setLoadingCompanyDetails] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const printRef = useRef(null);
  const fileInputRef = useRef(null);

  // ✅ Загрузка реквизитов компании
  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (!userCompanyId || !supabase) return;
      setLoadingCompanyDetails(true);
      try {
        const { data, error } = await supabase
          .from('company_details')
          .select('*')
          .eq('company_id', userCompanyId)
          .maybeSingle();
        if (!error && data) {
          setCompanyDetails(data);
        }
      } catch (err) {
        console.warn('Не удалось загрузить реквизиты:', err);
      } finally {
        setLoadingCompanyDetails(false);
      }
    };
    fetchCompanyDetails();
  }, [userCompanyId, supabase]);

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

  const formatRub = (num) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(num || 0);

  // ✅ Загрузка файла в Supabase Storage
  // eslint-disable-next-line no-unused-vars
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userCompanyId || !supabase) return;
    
    setUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userCompanyId}/diagrams/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);
      
      setUploadedFileUrl(publicUrl);
      showNotification('📎 Файл загружен', 'success');
    } catch (err) {
      console.error('Ошибка загрузки файла:', err);
      showNotification('❌ Ошибка загрузки файла', 'error');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ✅ Сохранение сгенерированного документа в БД
  const saveGeneratedDocument = useCallback(async (docType, app, htmlContent) => {
    if (!supabase || !userCompanyId || !user?.id) return null;
    try {
      const { data, error } = await supabase
        .from('generated_documents')
        .insert([{
          company_id: userCompanyId,
          application_id: app.id,
          document_type: docType,
          generated_by: user.id,
          content_html: htmlContent,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('Не удалось сохранить документ:', err);
      return null;
    }
  }, [supabase, userCompanyId, user?.id]);

  const generateTemplate = (type, app) => {
    if (!app) return '';
    const date = new Date(app.created_at).toLocaleDateString('ru-RU');
    const docNumber = app.id?.slice(0, 8).toUpperCase() || '---';
    
    // ✅ Используем реальные реквизиты или заглушки
    const cd = companyDetails || {};
    const inn = cd.inn || '—';
    const kpp = cd.kpp || '—';
    const address = cd.address || '—';
    const bank = cd.bank_name || '—';
    const bik = cd.bik || '—';
    const account = cd.account_number || '—';
    
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

    const vatSignatures = `
      <div class="mt-8 pt-4 border-t border-gray-300 dark:border-gray-600 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p class="font-medium mb-2">Руководитель</p>
          <p class="border-b border-gray-400 dark:border-gray-500 pb-8">_________________</p>
        </div>
        <div>
          <p class="font-medium mb-2">Главный бухгалтер</p>
          <p class="border-b border-gray-400 dark:border-gray-500 pb-8">_________________</p>
        </div>
      </div>
    `;

    switch (type) {
      case 'work_act': {
        const materialsRows = app.materials.map(m => `
          <tr class="border-t border-gray-200 dark:border-gray-700">
            <td class="py-2 px-3 text-sm">${m.description}</td>
            <td class="py-2 px-3 text-sm text-center">${m.unit}</td>
            <td class="py-2 px-3 text-sm text-center">${Number(m.quantity).toLocaleString('ru-RU')}</td>
            <td class="py-2 px-3 text-sm text-center">${Number(m.received || m.supplier_received_quantity || 0).toLocaleString('ru-RU')}</td>
          </tr>
        `).join('');
        
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
      }
      
      case 'material_act': {
        const materialsRows = app.materials.map(m => `
          <tr class="border-t border-gray-200 dark:border-gray-700">
            <td class="py-2 px-3 text-sm">${m.description}</td>
            <td class="py-2 px-3 text-sm text-center">${m.unit}</td>
            <td class="py-2 px-3 text-sm text-center">${Number(m.quantity).toLocaleString('ru-RU')}</td>
            <td class="py-2 px-3 text-sm text-center">${Number(m.received || m.supplier_received_quantity || 0).toLocaleString('ru-RU')}</td>
          </tr>
        `).join('');
        
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
      }
      
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
      
      case 'invoice': {
        const materialsRows = app.materials.map(m => `
          <tr class="border-t border-gray-200 dark:border-gray-700">
            <td class="py-2 px-3 text-sm">${m.description}</td>
            <td class="py-2 px-3 text-sm text-center">${m.unit}</td>
            <td class="py-2 px-3 text-sm text-center">${Number(m.quantity).toLocaleString('ru-RU')}</td>
            <td class="py-2 px-3 text-sm text-center">—</td>
          </tr>
        `).join('');
        
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
      }

      case 'ks2': {
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.quantity) || 0) * (Number(m.price) || 1000), 0
        );
        
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-5xl mx-auto">
            <div class="text-center mb-4">
              <h1 class="text-lg font-bold">АКТ № ${docNumber}</h1>
              <h2 class="text-xl font-bold mt-1">о приемке выполненных работ (форма КС-2)</h2>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded">
              <p><strong>Заказчик:</strong> ${companyName || '—'}<br/>ИНН/КПП: ${inn}/${kpp}</p>
              <p><strong>Подрядчик:</strong> ${app.foreman_name}</p>
              <p><strong>Объект:</strong> ${app.object_name}</p>
              <p><strong>Дата составления:</strong> ${date}</p>
              <p><strong>Период выполнения:</strong> ${date} — ${date}</p>
              <p><strong>Основание:</strong> Договор подряда</p>
            </div>
            <table class="w-full border-collapse text-left text-sm">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                  <th class="py-2 px-2 font-bold text-center" rowSpan="2">№</th>
                  <th class="py-2 px-2 font-bold text-left" rowSpan="2">Наименование работ</th>
                  <th class="py-2 px-2 font-bold text-center" rowSpan="2">Ед.изм.</th>
                  <th class="py-2 px-2 font-bold text-center" colSpan="2">Количество</th>
                  <th class="py-2 px-2 font-bold text-right" rowSpan="2">Цена, ₽</th>
                  <th class="py-2 px-2 font-bold text-right" rowSpan="2">Стоимость, ₽</th>
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
                  const price = Number(m.price) || 1000;
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
                  <td colSpan="6" class="py-3 px-2 text-right">ИТОГО:</td>
                  <td class="py-3 px-2 text-right">${formatRub(totalAmount)}</td>
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
      }

      case 'ks3': {
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.quantity) || 0) * (Number(m.price) || 1000), 0
        );
        const ndsAmount = Math.round(totalAmount * 20 / 120);
        
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-5xl mx-auto">
            <div class="text-center mb-4">
              <h1 class="text-lg font-bold">СПРАВКА № ${docNumber}</h1>
              <h2 class="text-xl font-bold mt-1">о стоимости выполненных работ и затрат (форма КС-3)</h2>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs mb-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded">
              <p><strong>Стройка:</strong> ${app.object_name}</p>
              <p><strong>Заказчик:</strong> ${companyName || '—'}<br/>ИНН/КПП: ${inn}/${kpp}</p>
              <p><strong>Подрядчик:</strong> ${app.foreman_name}</p>
              <p><strong>Дата:</strong> ${date}</p>
            </div>
            <table class="w-full border-collapse text-left text-sm">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
                  <th class="py-2 px-2 font-bold text-center" rowSpan="2">№</th>
                  <th class="py-2 px-2 font-bold text-left" rowSpan="2">Наименование работ</th>
                  <th class="py-2 px-2 font-bold text-center" rowSpan="2">Ед.изм.</th>
                  <th class="py-2 px-2 font-bold text-right" colSpan="2">Стоимость, ₽</th>
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
                  const price = Number(m.price) || 1000;
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
                  <td colSpan="3" class="py-3 px-2 text-right">ВСЕГО:</td>
                  <td class="py-3 px-2 text-right">${formatRub(totalAmount)}</td>
                  <td class="py-3 px-2 text-right">${formatRub(totalAmount)}</td>
                </tr>
                <tr class="bg-gray-100 dark:bg-gray-700 font-bold">
                  <td colSpan="3" class="py-2 px-2 text-right">В т.ч. НДС 20%:</td>
                  <td class="py-2 px-2 text-right" colSpan="2">${formatRub(ndsAmount)}</td>
                </tr>
              </tfoot>
            </table>
            ${signatures}
          </div>`;
      }

      case 'hidden_works': {
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
      }

      case 'executive_diagram': {
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-4xl mx-auto">
            <h1 class="text-xl font-bold text-center mb-4">ИСПОЛНИТЕЛЬНАЯ СХЕМА</h1>
            <div class="grid grid-cols-2 gap-4 text-sm mb-6">
              <p><strong>Объект:</strong> ${app.object_name}</p>
              <p><strong>Дата:</strong> ${date}</p>
              <p><strong>Прораб:</strong> ${app.foreman_name}</p>
              <p><strong>№ заявки:</strong> ${docNumber}</p>
            </div>
            ${uploadedFileUrl ? `
              <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p class="font-medium flex items-center gap-2">
                  <Paperclip class="w-4 h-4" /> Прикреплённый файл:
                </p>
                <a href="${uploadedFileUrl}" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline break-all">
                  ${uploadedFileUrl.split('/').pop()}
                </a>
              </div>
            ` : `
              <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 mb-6 text-center bg-gray-50 dark:bg-gray-700/30">
                <p class="text-gray-500 dark:text-gray-400 mb-2">📐 Место для схемы / чертежа</p>
                <p class="text-xs text-gray-400">Прикрепите исполнительную схему в формате PDF, DWG или изображение</p>
                <div class="mt-4 flex justify-center gap-2 no-print">
                  <label class="px-3 py-1.5 text-xs bg-[#4A6572] text-white rounded hover:bg-[#344955] cursor-pointer flex items-center gap-1">
                    <Upload class="w-3 h-3" />
                    ${uploadingFile ? 'Загрузка...' : 'Загрузить файл'}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,.dwg,.png,.jpg,.jpeg"
                      class="hidden"
                    />
                  </label>
                  <button class="px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500">Сделать фото</button>
                </div>
              </div>
            `}
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
      }

      case 'invoice_bill': {
        const materialsRows = app.materials.map((m, idx) => {
          const qty = Number(m.quantity) || 0;
          const price = Number(m.price) || 1000;
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
        }).join('');
        
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.quantity) || 0) * (Number(m.price) || 1000), 0
        );
        
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
                <p class="text-gray-500 mt-1">ИНН/КПП: ${inn} / ${kpp}</p>
                <p class="text-gray-500">Адрес: ${address}</p>
                <p class="text-gray-500">Банк: ${bank}, БИК ${bik}</p>
                <p class="text-gray-500">Р/с: ${account}</p>
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
              <tbody>${materialsRows}</tbody>
              <tfoot>
                <tr class="bg-gray-50 dark:bg-gray-700/50 font-bold">
                  <td colSpan="5" class="py-3 px-3 text-right">Итого:</td>
                  <td class="py-3 px-3 text-right">${formatRub(totalAmount)}</td>
                </tr>
                <tr class="font-bold">
                  <td colSpan="5" class="py-2 px-3 text-right">Всего к оплате:</td>
                  <td class="py-2 px-3 text-right text-lg">${formatRub(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            <div class="text-sm text-gray-600 dark:text-gray-400">
              <p>Оплата в течение 3 банковских дней с момента выставления счета.</p>
            </div>
          </div>`;
      }

      case 'invoice_vat': {
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.quantity) || 0) * (Number(m.price) || 1000), 0
        );
        const ndsAmount = Math.round(totalAmount * 20 / 120);
        const withoutNds = totalAmount - ndsAmount;
        
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-5xl mx-auto">
            <h1 class="text-xl font-bold text-center mb-4">СЧЕТ-ФАКТУРА № ${docNumber}</h1>
            <p class="text-center text-sm text-gray-500 mb-6">от ${date}</p>
            <div class="grid grid-cols-2 gap-4 text-xs mb-6 p-3 bg-gray-50 dark:bg-gray-700/30 rounded">
              <div>
                <p><strong>Продавец:</strong></p>
                <p>${companyName || '—'}</p>
                <p>Адрес: ${address}</p>
                <p>ИНН/КПП: ${inn} / ${kpp}</p>
                <p>Банк: ${bank}, БИК ${bik}</p>
                <p>Р/с: ${account}</p>
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
                  const price = Number(m.price) || 1000;
                  const total = qty * price;
                  const itemNds = Math.round(total * 20 / 120);
                  const itemWithoutNds = total - itemNds;
                  return `
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                      <td class="py-2 px-2 text-center">${idx + 1}</td>
                      <td class="py-2 px-2">${m.description}</td>
                      <td class="py-2 px-2 text-center">${m.unit}</td>
                      <td class="py-2 px-2 text-center">${qty}</td>
                      <td class="py-2 px-2 text-right">${price.toLocaleString('ru-RU')}</td>
                      <td class="py-2 px-2 text-right">${itemWithoutNds.toLocaleString('ru-RU')}</td>
                      <td class="py-2 px-2 text-right">${itemNds.toLocaleString('ru-RU')}</td>
                      <td class="py-2 px-2 text-right font-medium">${total.toLocaleString('ru-RU')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr class="bg-gray-50 dark:bg-gray-700/50 font-bold">
                  <td colSpan="5" class="py-3 px-2 text-right">Итого:</td>
                  <td class="py-3 px-2 text-right">${formatRub(withoutNds)}</td>
                  <td class="py-3 px-2 text-right">${formatRub(ndsAmount)}</td>
                  <td class="py-3 px-2 text-right">${formatRub(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            ${vatSignatures}
            <p class="mt-6 text-xs text-gray-400 text-center">
              * Документ сформирован в электронном виде. Подпись не требуется.
            </p>
          </div>`;
      }

      default: 
        return '';
    }
  };

  // ✅ Пакетная генерация и печать
  const handleBatchPrint = async () => {
    if (selectedAppIds.length === 0) {
      showNotification?.('Выберите хотя бы одну заявку', 'warning');
      return;
    }
    
    setIsGenerating(true);
    showNotification?.(`Формирование ${selectedAppIds.length} документов...`, 'info');
    
    try {
      for (const appId of selectedAppIds) {
        const app = applications.find(a => a.id === appId);
        if (!app) continue;
        
        const html = generateTemplate(activeTab, app);
        if (!html) continue;
        
        // Сохраняем в БД
        await saveGeneratedDocument(activeTab, app, html);
        
        // Печатаем
        setPreviewHtml(html);
        await new Promise(resolve => setTimeout(resolve, 300)); // Небольшая задержка для рендера
        window.print();
        
        // Разделитель страниц для следующего документа
        if (selectedAppIds.indexOf(appId) < selectedAppIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      showNotification?.('✅ Все документы сформированы и отправлены на печать', 'success');
    } catch (err) {
      console.error('Ошибка пакетной печати:', err);
      showNotification?.('❌ Ошибка при пакетной печати', 'error');
    } finally {
      setIsGenerating(false);
      setPreviewHtml('');
    }
  };

  const handleGenerate = async () => {
    if (!selectedApp) {
      showNotification?.('Выберите заявку для формирования документа', 'warning');
      return;
    }
    setIsGenerating(true);
    try {
      const html = generateTemplate(activeTab, selectedApp);
      setPreviewHtml(html);
      // Сохраняем в БД
      await saveGeneratedDocument(activeTab, selectedApp, html);
      showNotification?.('📄 Документ сформирован и сохранён', 'success');
    } catch (err) {
      console.error('Ошибка генерации:', err);
      showNotification?.('❌ Ошибка формирования документа', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!previewHtml) return;
    window.print();
  };

  const toggleAppSelection = (appId) => {
    setSelectedAppIds(prev => 
      prev.includes(appId) 
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    );
  };

  const selectAllApps = () => {
    if (selectedAppIds.length === eligibleApps.length) {
      setSelectedAppIds([]);
    } else {
      setSelectedAppIds(eligibleApps.map(app => app.id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Документооборот</h2>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 no-scrollbar">
          {DOCS.map(doc => (
            <button
              key={doc.id}
              onClick={() => {
                setActiveTab(doc.id);
                setSelectedAppIds([]); // Сброс выбора при смене типа
                setUploadedFileUrl('');
              }}
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

      {/* ✅ Пакетный выбор заявок */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-700 dark:text-gray-300">Пакетная печать</h3>
          <button 
            onClick={selectAllApps}
            className="text-xs text-[#4A6572] hover:underline dark:text-[#F9AA33]"
          >
            {selectedAppIds.length === eligibleApps.length ? 'Снять все' : 'Выбрать все'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {eligibleApps.slice(0, 20).map(app => (
            <label key={app.id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
              <input
                type="checkbox"
                checked={selectedAppIds.includes(app.id)}
                onChange={() => toggleAppSelection(app.id)}
                className="rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572]"
              />
              <span className="truncate max-w-[200px]">{app.object_name}</span>
            </label>
          ))}
        </div>
        {selectedAppIds.length > 0 && (
          <button
            onClick={handleBatchPrint}
            disabled={isGenerating}
            className="mt-3 px-4 py-2 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white rounded-lg font-medium hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Печать выбранных ({selectedAppIds.length})
          </button>
        )}
      </div>

      {/* ✅ Основная панель генерации */}
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
          <div className="flex items-end gap-2">
            <button
              onClick={handleGenerate}
              disabled={!selectedAppId || isGenerating}
              className="px-6 py-2.5 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white rounded-lg font-medium hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Сформировать
            </button>
            <button
              onClick={handlePrint}
              disabled={!previewHtml}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Печать
            </button>
          </div>
        </div>

        {loadingCompanyDetails && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Загрузка реквизитов компании...
          </div>
        )}

        {previewHtml ? (
          <div className="space-y-4">
            <div ref={printRef} id="printable-doc" className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-900/50 overflow-x-auto">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Выберите заявку и тип документа, затем нажмите «Сформировать»</p>
            <p className="text-xs mt-2 text-gray-400">
              💡 Для пакетной печати используйте чекбоксы выше
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentGenerator;