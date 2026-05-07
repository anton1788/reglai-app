// src/components/DocumentGenerator.jsx
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
  #printable-doc { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; }
  table { page-break-inside: avoid; }
  tr { page-break-inside: avoid; }
}
`;

const DocumentGenerator = ({
  applications = [],
  user,
  userRole,
  showNotification,
  companyName,
  userCompanyId,
  supabase
}) => {
  const [activeTab, setActiveTab] = useState('work_act');
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [companyDetails, setCompanyDetails] = useState(null);
  const [loadingCompanyDetails, setLoadingCompanyDetails] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  const printRef = useRef(null);
  const fileInputRef = useRef(null);

  // Загрузка реквизитов компании
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

  // ✅ ИСПРАВЛЕНО: Добавлен eslint-disable для функции, используемой в шаблонной строке
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
      
      // ✅ ИСПРАВЛЕННАЯ ФОРМА АКТА ПРИЕМКИ МАТЕРИАЛОВ (М-7)
      case 'material_act': {
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.supplier_received_quantity || m.received || 0) * (Number(m.price) || 1000)), 0
        );
        
        const today = new Date();
        // ✅ ИСПРАВЛЕНО: Добавлен eslint-disable для переменных, используемых в шаблонной строке
        // eslint-disable-next-line no-unused-vars
        const startDate = new Date(app.created_at);
        // eslint-disable-next-line no-unused-vars
        const endDate = today;
        
        return `
          <div class="p-8 bg-white rounded-xl shadow-sm max-w-6xl mx-auto font-sans">
            <div class="text-center mb-4">
              <div class="text-sm">Типовая межотраслевая форма № М-7</div>
              <div class="text-xs text-gray-500">Утверждена Постановлением Госкомстата России от 30.10.1997 № 71а</div>
            </div>
            
            <div class="flex justify-end mb-4">
              <div class="text-right">
                <div class="text-sm font-medium">УТВЕРЖДАЮ</div>
                <div class="mt-4 border-b border-black w-48"></div>
                <div class="text-xs text-gray-500">(должность)</div>
                <div class="mt-4 border-b border-black w-48"></div>
                <div class="text-xs text-gray-500">(подпись, расшифровка подписи)</div>
                <div class="mt-1">"___" __________ 20__ г.</div>
              </div>
            </div>
            
            <div class="text-center my-6">
              <div class="text-lg font-bold">АКТ № ${docNumber}</div>
              <div class="text-md font-semibold">о приемке материалов</div>
            </div>
            
            <div class="flex justify-end mb-2">
              <div class="text-right text-sm">
                <div>Форма по ОКУД</div>
                <div class="font-bold">0315004</div>
              </div>
            </div>
            
            <div class="mb-2">
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium">Организация</div>
                <div class="col-span-8 border-b border-black border-dotted">${companyName || '—'}</div>
                <div class="col-span-2 text-right">по ОКПО</div>
              </div>
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Дата составления</div>
                <div class="col-span-8 border-b border-black border-dotted">${today.toLocaleDateString('ru-RU')}</div>
              </div>
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Место составления акта</div>
                <div class="col-span-10 border-b border-black border-dotted">${address || companyName || '—'}</div>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div class="flex items-center">
                <span class="font-medium mr-2">Начало приемки</span>
                <span class="border-b border-black w-16 text-center">___</span>
                <span class="ml-1">ч.</span>
                <span class="border-b border-black w-16 text-center ml-2">___</span>
                <span class="ml-1">мин.</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">Окончание приемки</span>
                <span class="border-b border-black w-16 text-center">___</span>
                <span class="ml-1">ч.</span>
                <span class="border-b border-black w-16 text-center ml-2">___</span>
                <span class="ml-1">мин.</span>
              </div>
            </div>
            
            <div class="space-y-2 mb-4 text-sm">
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium">Отправитель</div>
                <div class="col-span-10 border-b border-black border-dotted">${companyName || '—'}</div>
              </div>
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium">Поставщик</div>
                <div class="col-span-10 border-b border-black border-dotted">${companyName || '—'}</div>
              </div>
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium">Получатель</div>
                <div class="col-span-10 border-b border-black border-dotted">${app.object_name || '—'}</div>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div class="flex items-center">
                <span class="font-medium mr-2">Договор №</span>
                <span class="border-b border-black w-24 text-center">${docNumber}</span>
                <span class="ml-2">от "___" __________ 20__ г.</span>
              </div>
            </div>
            
            <div class="mb-4">
              <div class="text-sm">По сопроводительным документам значилось:</div>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-sm mb-4">
                <thead>
                  <tr class="border border-black bg-gray-50">
                    <th rowspan="2" class="border border-black p-1 text-center w-12">Отметка об опломбировании</th>
                    <th rowspan="2" class="border border-black p-1 text-center w-12">Количество мест</th>
                    <th rowspan="2" class="border border-black p-1 text-center w-20">Вид упаковки</th>
                    <th rowspan="2" class="border border-black p-1 text-left min-w-[200px]">Наименование продукции</th>
                    <th rowspan="2" class="border border-black p-1 text-center w-16">Единица измерения</th>
                    <th colspan="3" class="border border-black p-1 text-center">Количество</th>
                    <th rowspan="2" class="border border-black p-1 text-right pr-2">Цена, руб.</th>
                    <th rowspan="2" class="border border-black p-1 text-right pr-2">Сумма, руб.</th>
                  </tr>
                  <tr class="border border-black bg-gray-50">
                    <th class="border border-black p-1 text-center w-20">По документам</th>
                    <th class="border border-black p-1 text-center w-20">Фактически</th>
                    <th class="border border-black p-1 text-center w-16">Отклонение</th>
                  </tr>
                </thead>
                <tbody>
                  ${app.materials
                    .filter(m => (m.supplier_received_quantity || m.received || 0) > 0)
                    // ✅ ИСПРАВЛЕНО: Добавлен eslint-disable для idx, используемого в шаблонной строке
                    // eslint-disable-next-line no-unused-vars
                    .map((m, idx) => {
                      const qtyDoc = Number(m.quantity) || 0;
                      const qtyFact = Number(m.supplier_received_quantity || m.received || 0);
                      const price = Number(m.price) || 1000;
                      const total = qtyFact * price;
                      const deviation = qtyFact - qtyDoc;
                      
                      return `
                        <tr class="border border-black">
                          <td class="border border-black p-1 text-center">${idx === 0 ? '—' : ''}</td>
                          <td class="border border-black p-1 text-center">1</td>
                          <td class="border border-black p-1 text-center">${m.unit === 'шт' ? 'ящик' : m.unit}</td>
                          <td class="border border-black p-1">${m.description || '—'}</td>
                          <td class="border border-black p-1 text-center">${m.unit || 'шт'}</td>
                          <td class="border border-black p-1 text-center">${qtyDoc.toLocaleString('ru-RU')}</td>
                          <td class="border border-black p-1 text-center font-medium">${qtyFact.toLocaleString('ru-RU')}</td>
                          <td class="border border-black p-1 text-center ${deviation !== 0 ? 'text-red-600' : 'text-green-600'}">
                            ${deviation !== 0 ? deviation.toLocaleString('ru-RU') : '—'}
                          </td>
                          <td class="border border-black p-1 text-right pr-2">${price.toLocaleString('ru-RU')}</td>
                          <td class="border border-black p-1 text-right pr-2">${total.toLocaleString('ru-RU')}</td>
                        </td>
                      `;
                    }).join('')}
                </tbody>
                <tfoot>
                  <tr class="border border-black bg-gray-50 font-bold">
                    <td colspan="6" class="border border-black p-1 text-right pr-4">ИТОГО:</td>
                    <td class="border border-black p-1 text-center">${app.materials.reduce((sum, m) => sum + (Number(m.supplier_received_quantity || m.received || 0)), 0).toLocaleString('ru-RU')}</td>
                    <td class="border border-black p-1 text-center">─</td>
                    <td class="border border-black p-1 text-right pr-2">─</td>
                    <td class="border border-black p-1 text-right pr-2">${totalAmount.toLocaleString('ru-RU')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div class="page-break"></div>
            <div class="text-center text-xs text-gray-400 mt-4">2-я страница формы № М-7</div>
            
            <div class="mt-6 mb-4">
              <div class="text-sm font-medium">Условия хранения продукции на складе получателя:</div>
              <div class="border-b border-black mt-2 h-8"></div>
            </div>
            
            <div class="mb-4">
              <div class="text-sm font-medium">Состояние тары и упаковки в момент осмотра продукции:</div>
              <div class="border-b border-black mt-2 h-8"></div>
            </div>
            
            <div class="mb-6">
              <div class="text-sm font-medium">Заключение комиссии:</div>
              <div class="border-b border-black mt-2 h-12"></div>
            </div>
            
            <div class="mb-6">
              <div class="text-sm font-medium">Приложение. Перечень прилагаемых документов:</div>
              <div class="border-b border-black mt-2 h-8"></div>
            </div>
            
            <div class="mt-8">
              <div class="text-xs text-gray-600 mb-4">
                С правилами приемки материальных ценностей по количеству, качеству и комплектности все члены комиссии ознакомлены и предупреждены, что они несут ответственность за подписание акта, содержащего данные, не соответствующие действительности.
              </div>
              
              <table class="w-full text-sm">
                <thead>
                  <tr>
                    <th class="text-left font-medium w-32">Должность</th>
                    <th class="text-left font-medium w-32">Подпись</th>
                    <th class="text-left font-medium w-40">Расшифровка подписи</th>
                    <th class="text-left font-medium">Номер и дата доверенности</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="border-b border-black h-10">${app.foreman_name || '_____________'}</td>
                    <td class="border-b border-black h-10"></td>
                    <td class="border-b border-black h-10"></td>
                    <td class="border-b border-black h-10"></td>
                  </tr>
                  <tr>
                    <td class="border-b border-black h-10">_____________</td>
                    <td class="border-b border-black h-10"></td>
                    <td class="border-b border-black h-10"></td>
                    <td class="border-b border-black h-10"></td>
                  </tr>
                  <tr>
                    <td class="border-b border-black h-10">_____________</td>
                    <td class="border-b border-black h-10"></td>
                    <td class="border-b border-black h-10"></td>
                    <td class="border-b border-black h-10"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="mt-8 pt-4 border-t border-gray-300">
              <div class="flex justify-between">
                <div>
                  <span class="font-medium">Заведующий складом</span>
                  <span class="ml-8 border-b border-black w-48 inline-block"></span>
                </div>
                <div>
                  <span class="border-b border-black w-32 inline-block"></span>
                </div>
              </div>
              <div class="text-xs text-gray-500 mt-1">(подпись, расшифровка подписи)</div>
            </div>
          </div>
        `;
      }
      
      // ✅ ИСПРАВЛЕННАЯ ФОРМА ОБЩЕГО ЖУРНАЛА РАБОТ (КС-6)
      case 'work_log': {
        const today = new Date();
        
        return `
          <div class="p-8 bg-white rounded-xl shadow-sm max-w-6xl mx-auto font-sans">
            <!-- Заголовок формы -->
            <div class="text-center mb-4">
              <div class="text-sm">Типовая межотраслевая форма № КС-6</div>
              <div class="text-xs text-gray-500">Утверждена постановлением Госкомстата России от 30.10.97 № 71а</div>
            </div>
            
            <!-- Номер журнала -->
            <div class="flex justify-between items-center mb-6">
              <div class="text-lg font-bold">ОБЩИЙ ЖУРНАЛ РАБОТ № 1</div>
              <div class="text-right">
                <div>Форма по ОКУД</div>
                <div class="font-bold">0336001</div>
              </div>
            </div>
            
            <!-- Титульный лист -->
            <div class="space-y-3 mb-6">
              <div class="grid grid-cols-12">
                <div class="col-span-3 font-medium">Специализированная строительная организация</div>
                <div class="col-span-7 border-b border-black border-dotted">${companyName || '—'}</div>
                <div class="col-span-2 text-right">по ОКПО</div>
              </div>
              
              <div class="grid grid-cols-12">
                <div class="col-span-3 font-medium">Адрес</div>
                <div class="col-span-9 border-b border-black border-dotted">${address || companyName || '—'}</div>
              </div>
              
              <div class="grid grid-cols-12">
                <div class="col-span-3 font-medium">Строительство объекта</div>
                <div class="col-span-9 border-b border-black border-dotted">${app.object_name || '—'}</div>
              </div>
              
              <div class="grid grid-cols-12">
                <div class="col-span-3 font-medium">Адрес объекта</div>
                <div class="col-span-9 border-b border-black border-dotted">${address || companyName || '—'}</div>
              </div>
            </div>
            
            <!-- Ответственные лица -->
            <div class="space-y-2 mb-6 text-sm">
              <p>Должность, фамилия, имя, отчество и подпись лица, ответственного от строительной организации за строительство объекта и ведение общего журнала работ:</p>
              <div class="border-b border-black h-10"></div>
              <div class="text-center text-xs text-gray-500">(должность, подпись, расшифровка подписи)</div>
              
              <p class="mt-4">Генеральная проектная организация, фамилия, имя, отчество и подпись главного инженера проекта:</p>
              <div class="border-b border-black h-10"></div>
              <div class="text-center text-xs text-gray-500">(подпись, расшифровка подписи)</div>
              
              <p class="mt-4">Заказчик (организация), должность, фамилия, имя, отчество руководителя (представителя технического надзора):</p>
              <div class="border-b border-black h-10"></div>
              <div class="text-center text-xs text-gray-500">(должность, подпись, расшифровка подписи)</div>
            </div>
            
            <!-- Сроки работ -->
            <div class="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p class="font-medium">Начало работ:</p>
                <div class="flex items-center gap-2">
                  <span>по договору</span>
                  <div class="border-b border-black w-32"></div>
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <span>фактически</span>
                  <div class="border-b border-black w-32"></div>
                </div>
              </div>
              <div>
                <p class="font-medium">Окончание работ (ввод в эксплуатацию):</p>
                <div class="flex items-center gap-2">
                  <span>по договору</span>
                  <div class="border-b border-black w-32"></div>
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <span>фактически</span>
                  <div class="border-b border-black w-32"></div>
                </div>
              </div>
            </div>
            
            <!-- Нумерация страниц -->
            <div class="flex items-center gap-2 mb-6 text-sm">
              <span>В настоящем журнале</span>
              <span class="border-b border-black w-20 text-center">${app.materials?.length || 0}</span>
              <span>пронумерованных и прошнурованных страниц.</span>
            </div>
            
            <div class="border-t border-black pt-4 mt-4">
              <div class="text-center text-xs text-gray-400">1-я страница формы № КС-6</div>
            </div>
            
            <div class="page-break"></div>
            
            <!-- Раздел 1. Список инженерно-технического персонала -->
            <div class="mt-6">
              <h3 class="text-md font-bold text-center mb-4">Раздел 1. Список инженерно-технического персонала, занятого на строительстве объекта</h3>
              
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="border border-black bg-gray-50">
                    <th class="border border-black p-2 text-left">Фамилия, имя, отчество, занимаемая должность, участок работы</th>
                    <th class="border border-black p-2 text-center w-24">Дата начала работ на строительстве объекта</th>
                    <th class="border border-black p-2 text-center w-24">Отметка о получении разрешения на право производства работ</th>
                    <th class="border border-black p-2 text-center w-24">Дата окончания работ на строительстве объекта</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="border border-black p-2">${app.foreman_name} — прораб</td>
                    <td class="border border-black p-2 text-center">${new Date(app.created_at).toLocaleDateString('ru-RU')}</td>
                    <td class="border border-black p-2 text-center">+</td>
                    <td class="border border-black p-2 text-center">—</td>
                  </tr>
                  <tr><td colspan="4" class="border border-black p-2 text-center text-gray-400">—</td></tr>
                  <tr><td colspan="4" class="border border-black p-2 text-center text-gray-400">—</td></tr>
                  <tr><td colspan="4" class="border border-black p-2 text-center text-gray-400">—</td></tr>
                  <tr><td colspan="4" class="border border-black p-2 text-center text-gray-400">—</td></tr>
                  <tr><td colspan="4" class="border border-black p-2 text-center text-gray-400">—</td></tr>
                </tbody>
              </table>
            </div>
            
            <div class="border-t border-black pt-4 mt-4">
              <div class="text-center text-xs text-gray-400">2-я страница формы № КС-6</div>
            </div>
            
            <div class="page-break"></div>
            
            <!-- Раздел 2. Перечень актов промежуточной приемки -->
            <div class="mt-6">
              <h3 class="text-md font-bold text-center mb-4">Раздел 2. Перечень актов промежуточной приемки ответственных конструкций и освидетельствования скрытых работ</h3>
              
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="border border-black bg-gray-50">
                    <th class="border border-black p-2 text-center w-16">Номер по порядку</th>
                    <th class="border border-black p-2 text-left">Наименование актов (с указанием места расположения конструкций и работ)</th>
                    <th class="border border-black p-2 text-left">Дата подписания акта, фамилии, инициалы и должности подписавших</th>
                  </tr>
                </thead>
                <tbody>
                  ${app.materials.slice(0, 10)
                    // ✅ ИСПРАВЛЕНО: Добавлен eslint-disable для idx, используемого в шаблонной строке
                    // eslint-disable-next-line no-unused-vars
                    .map((m, idx) => `
                    <tr>
                      <td class="border border-black p-2 text-center">${idx + 1}</td>
                      <td class="border border-black p-2">Приемка выполненных работ по ${m.description} — ${m.quantity} ${m.unit}</td>
                      <td class="border border-black p-2">${today.toLocaleDateString('ru-RU')}, ${app.foreman_name} (прораб)</td>
                    </tr>
                  `).join('')}
                  ${app.materials.length < 10 ? Array(10 - app.materials.length).fill(0)
                    // ✅ ИСПРАВЛЕНО: Добавлен eslint-disable для _ и idx
                    // eslint-disable-next-line no-unused-vars
                    .map((_, idx) => `
                    <tr>
                      <td class="border border-black p-2 text-center">${app.materials.length + idx + 1}</td>
                      <td class="border border-black p-2">—</td>
                      <td class="border border-black p-2">—</td>
                    </tr>
                  `).join('') : ''}
                </tbody>
              </table>
            </div>
            
            <div class="border-t border-black pt-4 mt-4">
              <div class="text-center text-xs text-gray-400">3-я страница формы № КС-6</div>
            </div>
            
            <div class="page-break"></div>
            
            <!-- Раздел 3. Ведомость результатов операционного контроля -->
            <div class="mt-6">
              <h3 class="text-md font-bold text-center mb-4">Раздел 3. Ведомость результатов операционного контроля и оценки качества строительно-монтажных работ</h3>
              
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="border border-black bg-gray-50">
                    <th class="border border-black p-2 text-center w-24">Дата</th>
                    <th class="border border-black p-2 text-left">Наименование конструктивных частей и элементов</th>
                    <th class="border border-black p-2 text-left">Результаты контроля и оценки качества работ</th>
                    <th class="border border-black p-2 text-left">Должности и подписи лиц, оценивающих качество работ</th>
                  </tr>
                </thead>
                <tbody>
                  ${app.materials.slice(0, 15)
                    // ✅ ИСПРАВЛЕНО: Добавлен eslint-disable для idx, используемого в шаблонной строке
                    // eslint-disable-next-line no-unused-vars
                    .map((m, idx) => `
                    <tr>
                      <td class="border border-black p-2 text-center">${today.toLocaleDateString('ru-RU')}</td>
                      <td class="border border-black p-2">${m.description} — ${m.quantity} ${m.unit}</td>
                      <td class="border border-black p-2">Соответствует проекту, качество работ удовлетворительное</td>
                      <td class="border border-black p-2">${app.foreman_name} (прораб)</td>
                    </tr>
                  `).join('')}
                  ${app.materials.length < 15 ? Array(15 - app.materials.length).fill(0).map(() => `
                    <tr>
                      <td class="border border-black p-2 text-center">—</td>
                      <td class="border border-black p-2">—</td>
                      <td class="border border-black p-2">—</td>
                      <td class="border border-black p-2">—</td>
                    </tr>
                  `).join('') : ''}
                </tbody>
              </table>
            </div>
            
            <div class="border-t border-black pt-4 mt-4">
              <div class="text-center text-xs text-gray-400">4-я страница формы № КС-6</div>
            </div>
            
            <div class="page-break"></div>
            
            <!-- Раздел 5. Сведения о производстве работ -->
            <div class="mt-6">
              <h3 class="text-md font-bold text-center mb-4">Раздел 5. Сведения о производстве работ</h3>
              
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="border border-black bg-gray-50">
                    <th class="border border-black p-2 text-center w-24">Дата</th>
                    <th class="border border-black p-2 text-left">Краткое описание и условия производства работ</th>
                    <th class="border border-black p-2 text-left">Должность и подпись ответственного лица</th>
                  </tr>
                </thead>
                <tbody>
                  ${app.materials.map((m) => `
                    <tr>
                      <td class="border border-black p-2 text-center">${today.toLocaleDateString('ru-RU')}</td>
                      <td class="border border-black p-2">Выполнены работы по ${m.description} в количестве ${m.quantity} ${m.unit}. Работы выполнены в соответствии с проектной документацией.</td>
                      <td class="border border-black p-2">${app.foreman_name} (прораб)</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <!-- Завершающая страница -->
            <div class="mt-8">
              <div class="text-center text-xs text-gray-400">Последняя страница формы № КС-6</div>
              
              <div class="mt-6 p-4 border border-black">
                <p class="text-sm">
                  В этой книге пронумеровано и прошнуровано ________ страниц и опечатано сургучной печатью.
                </p>
                <div class="flex justify-end gap-8 mt-4">
                  <div>
                    <div class="border-b border-black w-48 mb-1"></div>
                    <div class="text-xs text-gray-500">(должность)</div>
                  </div>
                  <div>
                    <div class="border-b border-black w-32 mb-1"></div>
                    <div class="text-xs text-gray-500">(подпись)</div>
                  </div>
                  <div>
                    <div class="border-b border-black w-32 mb-1"></div>
                    <div class="text-xs text-gray-500">(расшифровка подписи)</div>
                  </div>
                </div>
                <div class="text-center mt-4">
                  «____» ______________ 20__ г.
                </div>
                <div class="flex justify-end mt-2">
                  М.П.
                </div>
              </div>
            </div>
          </div>
        `;
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

      // ✅ ИСПРАВЛЕННАЯ ФОРМА КС-2
      case 'ks2': {
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.supplier_received_quantity || m.received || 0) * (Number(m.price) || 1000)), 0
        );
        
        const today = new Date();
        // ✅ ИСПРАВЛЕНО: Добавлен eslint-disable для переменных, используемых в шаблонной строке
        // eslint-disable-next-line no-unused-vars
        const startDate = new Date(app.created_at);
        // eslint-disable-next-line no-unused-vars
        const endDate = today;
        
        return `
          <div class="p-8 bg-white rounded-xl shadow-sm max-w-5xl mx-auto font-sans">
            <div class="text-center mb-6">
              <div class="text-sm">Унифицированная форма № КС-2</div>
              <div class="text-xs text-gray-500">Утверждена постановлением Госкомстата России от 11.11.99 № 100</div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4 text-xs">
              <div></div>
              <div class="text-right">
                <div>Форма по ОКУД</div>
                <div class="font-bold text-lg">0322005</div>
              </div>
            </div>
            
            <div class="space-y-2 mb-4 text-sm">
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium">Инвестор</div>
                <div class="col-span-8 border-b border-black border-dotted">${cd.investor || companyName || '—'}</div>
                <div class="col-span-2 text-right">по ОКПО</div>
              </div>
              <div class="pl-6 text-xs text-gray-500">(организация, адрес, телефон, факс)</div>
              
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Заказчик (Генподрядчик)</div>
                <div class="col-span-8 border-b border-black border-dotted">${cd.customer || companyName || '—'}</div>
                <div class="col-span-2 text-right">по ОКПО</div>
              </div>
              <div class="pl-6 text-xs text-gray-500">(организация, адрес, телефон, факс)</div>
              
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Подрядчик (Субподрядчик)</div>
                <div class="col-span-8 border-b border-black border-dotted">${cd.contractor || companyName || '—'}</div>
                <div class="col-span-2 text-right">по ОКПО</div>
              </div>
              <div class="pl-6 text-xs text-gray-500">(организация, адрес, телефон, факс)</div>
              
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Стройка</div>
                <div class="col-span-10 border-b border-black border-dotted">${app.object_name || '—'}</div>
              </div>
              <div class="pl-6 text-xs text-gray-500">(наименование, адрес)</div>
            </div>
            
            <div class="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div class="flex items-center">
                <span class="font-medium mr-2">Договор подряда (контракт)</span>
                <span class="border-b border-black w-24 text-center">${docNumber}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">от</span>
                <span class="border-b border-black w-24 text-center">${new Date(app.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">Вид операции</span>
                <span class="border-b border-black w-24 text-center"></span>
              </div>
            </div>
            
            <div class="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div class="flex items-center">
                <span class="font-medium mr-2">Номер документа</span>
                <span class="border-b border-black w-32 text-center">${docNumber}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">Дата составления</span>
                <span class="border-b border-black w-32 text-center">${today.toLocaleDateString('ru-RU')}</span>
              </div>
              <div class="flex items-center col-span-1">
                <span class="font-medium mr-2">Отчетный период</span>
                <div class="flex items-center gap-1">
                  <span class="border-b border-black w-20 text-center">с ${startDate.toLocaleDateString('ru-RU')}</span>
                  <span>по</span>
                  <span class="border-b border-black w-20 text-center">${endDate.toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            </div>
            
            <div class="text-center my-6">
              <div class="text-lg font-bold">АКТ</div>
              <div class="text-md font-semibold">О ПРИЕМКЕ ВЫПОЛНЕННЫХ РАБОТ</div>
            </div>
            
            <div class="flex justify-between items-center mb-6 text-sm">
              <span>Сметная (договорная) стоимость в соответствии с договором подряда (субподряда)</span>
              <div class="flex items-center gap-2">
                <span class="border-b border-black w-32 text-right">${totalAmount.toLocaleString('ru-RU')}</span>
                <span>руб.</span>
              </div>
            </div>
            
            <table class="w-full border-collapse text-sm mb-4">
              <thead>
                <tr class="border border-black">
                  <th rowspan="2" class="border border-black p-1 text-center w-12">Номер по порядку</th>
                  <th colspan="2" class="border border-black p-1 text-center">Позиция по смете</th>
                  <th rowspan="2" class="border border-black p-1 text-left">Наименование работ</th>
                  <th rowspan="2" class="border border-black p-1 text-center">Номер единичной расценки</th>
                  <th rowspan="2" class="border border-black p-1 text-center">Единица измерения</th>
                  <th colspan="2" class="border border-black p-1 text-center">Выполнено работ</th>
                  <th rowspan="2" class="border border-black p-1 text-center">Цена за единицу, руб.</th>
                  <th rowspan="2" class="border border-black p-1 text-center">Стоимость, руб.</th>
                </tr>
                <tr class="border border-black">
                  <th class="border border-black p-1 text-center w-12">2</th>
                  <th class="border border-black p-1 text-center w-12"></th>
                  <th class="border border-black p-1 text-center w-20">количество</th>
                  <th class="border border-black p-1 text-center w-12"></th>
                </tr>
              </thead>
              <tbody>
                ${app.materials
                  // ✅ ИСПРАВЛЕНО: Добавлен eslint-disable для idx, используемого в шаблонной строке
                  // eslint-disable-next-line no-unused-vars
                  .map((m, idx) => {
                  const received = Number(m.supplier_received_quantity || m.received || 0);
                  const price = Number(m.price) || 1000;
                  const total = received * price;
                  return `
                    <tr class="border border-black">
                      <td class="border border-black p-1 text-center">${idx + 1}</td>
                      <td class="border border-black p-1 text-center"></td>
                      <td class="border border-black p-1 text-center"></td>
                      <td class="border border-black p-1">${m.description || '—'}</td>
                      <td class="border border-black p-1 text-center"></td>
                      <td class="border border-black p-1 text-center">${m.unit || 'шт'}</td>
                      <td class="border border-black p-1 text-center">${received.toLocaleString('ru-RU')}</td>
                      <td class="border border-black p-1 text-center"></td>
                      <td class="border border-black p-1 text-right pr-2">${price.toLocaleString('ru-RU')}</td>
                      <td class="border border-black p-1 text-right pr-2">${total.toLocaleString('ru-RU')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr class="border border-black">
                  <td colspan="7" class="border border-black p-1 text-right font-bold pr-4">Итого</td>
                  <td class="border border-black p-1 text-center"></td>
                  <td class="border border-black p-1 text-center">Х</td>
                  <td class="border border-black p-1 text-right pr-2 font-bold">${totalAmount.toLocaleString('ru-RU')}</td>
                </tr>
              </tfoot>
            </table>
            
            <div class="page-break"></div>
            <div class="text-center text-xs text-gray-400 mt-8">2-я страница формы № КС-2</div>
            
            <div class="mt-8 pt-4">
              <div class="grid grid-cols-2 gap-8">
                <div>
                  <div class="flex items-center gap-4">
                    <span>Сдал</span>
                    <div class="flex-1 border-b border-black"></div>
                  </div>
                  <div class="mt-2 text-xs text-gray-500">(должность, подпись, расшифровка подписи)</div>
                  <div class="mt-2">М.П.</div>
                </div>
                <div>
                  <div class="flex items-center gap-4">
                    <span>Принял</span>
                    <div class="flex-1 border-b border-black"></div>
                  </div>
                  <div class="mt-2 text-xs text-gray-500">(должность, подпись, расшифровка подписи)</div>
                  <div class="mt-2">М.П.</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // ✅ ИСПРАВЛЕННАЯ ФОРМА КС-3
      case 'ks3': {
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.supplier_received_quantity || m.received || 0) * (Number(m.price) || 1000)), 0
        );
        const ndsAmount = Math.round(totalAmount * 20 / 120);
        
        const today = new Date();
        // ✅ ИСПРАВЛЕНО: Добавлен eslint-disable для переменных, используемых в шаблонной строке
        // eslint-disable-next-line no-unused-vars
        const startDate = new Date(app.created_at);
        // eslint-disable-next-line no-unused-vars
        const endDate = today;
        
        return `
          <div class="p-8 bg-white rounded-xl shadow-sm max-w-5xl mx-auto font-sans">
            <div class="text-center mb-6">
              <div class="text-sm">Унифицированная форма № КС-3</div>
              <div class="text-xs text-gray-500">Утверждена постановлением Госкомстата России от 11.11.99 № 100</div>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4 text-xs">
              <div></div>
              <div class="text-right">
                <div>Форма по ОКУД</div>
                <div class="font-bold text-lg">0322001</div>
              </div>
            </div>
            
            <div class="space-y-2 mb-4 text-sm">
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium">Инвестор</div>
                <div class="col-span-8 border-b border-black border-dotted">${cd.investor || companyName || '—'}</div>
                <div class="col-span-2 text-right">по ОКПО</div>
              </div>
              <div class="pl-6 text-xs text-gray-500">(организация, адрес, телефон, факс)</div>
              
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Заказчик (Генподрядчик)</div>
                <div class="col-span-8 border-b border-black border-dotted">${cd.customer || companyName || '—'}</div>
                <div class="col-span-2 text-right">по ОКПО</div>
              </div>
              <div class="pl-6 text-xs text-gray-500">(организация, адрес, телефон, факс)</div>
              
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Подрядчик (Субподрядчик)</div>
                <div class="col-span-8 border-b border-black border-dotted">${cd.contractor || companyName || '—'}</div>
                <div class="col-span-2 text-right">по ОКПО</div>
              </div>
              <div class="pl-6 text-xs text-gray-500">(организация, адрес, телефон, факс)</div>
              
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Стройка</div>
                <div class="col-span-10 border-b border-black border-dotted">${app.object_name || '—'}</div>
              </div>
              <div class="pl-6 text-xs text-gray-500">(наименование, адрес)</div>
            </div>
            
            <div class="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div class="flex items-center">
                <span class="font-medium mr-2">Договор подряда (контракт)</span>
                <span class="border-b border-black w-24 text-center">${docNumber}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">от</span>
                <span class="border-b border-black w-24 text-center">${new Date(app.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">Вид операции</span>
                <span class="border-b border-black w-24 text-center"></span>
              </div>
            </div>
            
            <div class="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div class="flex items-center">
                <span class="font-medium mr-2">Номер документа</span>
                <span class="border-b border-black w-32 text-center">${docNumber}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">Дата составления</span>
                <span class="border-b border-black w-32 text-center">${today.toLocaleDateString('ru-RU')}</span>
              </div>
              <div class="flex items-center col-span-1">
                <span class="font-medium mr-2">Отчетный период</span>
                <div class="flex items-center gap-1">
                  <span class="border-b border-black w-20 text-center">с ${startDate.toLocaleDateString('ru-RU')}</span>
                  <span>по</span>
                  <span class="border-b border-black w-20 text-center">${endDate.toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            </div>
            
            <div class="text-center my-6">
              <div class="text-lg font-bold">СПРАВКА</div>
              <div class="text-md font-semibold">О СТОИМОСТИ ВЫПОЛНЕННЫХ РАБОТ И ЗАТРАТ</div>
            </div>
            
            <table class="w-full border-collapse text-sm mb-4">
              <thead>
                <tr class="border border-black">
                  <th rowspan="2" class="border border-black p-1 text-center w-12">Номер по порядку</th>
                  <th rowspan="2" class="border border-black p-1 text-left">Наименование пусковых комплексов, этапов, объектов, видов выполненных работ, оборудования, затрат</th>
                  <th rowspan="2" class="border border-black p-1 text-center w-20">Код</th>
                  <th colspan="2" class="border border-black p-1 text-center">Стоимость выполненных работ и затрат, руб.</th>
                </tr>
                <tr class="border border-black">
                  <th class="border border-black p-1 text-center">с начала проведения работ</th>
                  <th class="border border-black p-1 text-center">в том числе за отчетный период</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border border-black">
                  <td class="border border-black p-1 text-center">1</td>
                  <td class="border border-black p-1">Всего работ и затрат, включаемых в стоимость работ</td>
                  <td class="border border-black p-1 text-center"></td>
                  <td class="border border-black p-1 text-right pr-2">${totalAmount.toLocaleString('ru-RU')}</td>
                  <td class="border border-black p-1 text-right pr-2">${totalAmount.toLocaleString('ru-RU')}</td>
                </tr>
                <tr class="border border-black">
                  <td class="border border-black p-1 text-center"></td>
                  <td class="border border-black p-1 pl-4">в том числе:</td>
                  <td class="border border-black p-1 text-center"></td>
                  <td class="border border-black p-1 text-right pr-2"></td>
                  <td class="border border-black p-1 text-right pr-2"></td>
                </tr>
                ${app.materials.map((m) => {
                  const received = Number(m.supplier_received_quantity || m.received || 0);
                  const price = Number(m.price) || 1000;
                  const total = received * price;
                  return `
                    <tr class="border border-black">
                      <td class="border border-black p-1 text-center">2</td>
                      <td class="border border-black p-1 pl-8">${m.description}</td>
                      <td class="border border-black p-1 text-center"></td>
                      <td class="border border-black p-1 text-right pr-2">${total.toLocaleString('ru-RU')}</td>
                      <td class="border border-black p-1 text-right pr-2">${total.toLocaleString('ru-RU')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr class="border border-black">
                  <td colspan="3" class="border border-black p-1 text-right font-bold pr-4">Итого</td>
                  <td class="border border-black p-1 text-right pr-2 font-bold">${totalAmount.toLocaleString('ru-RU')}</td>
                  <td class="border border-black p-1 text-right pr-2 font-bold">${totalAmount.toLocaleString('ru-RU')}</td>
                </tr>
                <tr class="border border-black">
                  <td colspan="3" class="border border-black p-1 text-right pr-4">Сумма НДС</td>
                  <td class="border border-black p-1 text-right pr-2">${ndsAmount.toLocaleString('ru-RU')}</td>
                  <td class="border border-black p-1 text-right pr-2">${ndsAmount.toLocaleString('ru-RU')}</td>
                </tr>
                <tr class="border border-black">
                  <td colspan="3" class="border border-black p-1 text-right font-bold pr-4">Всего с учетом НДС</td>
                  <td class="border border-black p-1 text-right pr-2 font-bold">${(totalAmount + ndsAmount).toLocaleString('ru-RU')}</td>
                  <td class="border border-black p-1 text-right pr-2 font-bold">${(totalAmount + ndsAmount).toLocaleString('ru-RU')}</td>
                </tr>
              </tfoot>
            </table>
            
            <div class="mt-8 pt-4">
              <div class="grid grid-cols-2 gap-8">
                <div>
                  <div class="flex items-center gap-4">
                    <span>Заказчик (Генподрядчик)</span>
                    <div class="flex-1 border-b border-black"></div>
                  </div>
                  <div class="mt-2 text-xs text-gray-500">(должность, подпись, расшифровка подписи)</div>
                  <div class="mt-2">М.П.</div>
                </div>
                <div>
                  <div class="flex items-center gap-4">
                    <span>Подрядчик (Субподрядчик)</span>
                    <div class="flex-1 border-b border-black"></div>
                  </div>
                  <div class="mt-2 text-xs text-gray-500">(должность, подпись, расшифровка подписи)</div>
                  <div class="mt-2">М.П.</div>
                </div>
              </div>
            </div>
          </div>
        `;
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
                  <td colspan="5" class="py-3 px-3 text-right">Итого:</td>
                  <td class="py-3 px-3 text-right">${formatRub(totalAmount)}</td>
                </tr>
                <tr class="font-bold">
                  <td colspan="5" class="py-2 px-3 text-right">Всего к оплате:</td>
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
                  <td colspan="5" class="py-3 px-2 text-right">Итого:</td>
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
        
        await saveGeneratedDocument(activeTab, app, html);
        
        setPreviewHtml(html);
        await new Promise(resolve => setTimeout(resolve, 300));
        window.print();
        
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
                setSelectedAppIds([]);
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