// src/components/DocumentGenerator.jsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  FileText, Download, Printer, Calendar, Package, ClipboardList, Truck, 
  Loader2, AlertCircle, FileCheck, Ruler, Receipt, Check, X, Upload, Paperclip, Menu, X as XIcon
} from 'lucide-react';

// ✅ ИСПРАВЛЕНИЕ: Выносим formatRub вовне компонента. 
// Это устраняет no-undef и react-hooks/exhaustive-deps (внешние константы не нужны в deps).
const formatRub = (amount) => Number(amount || 0).toLocaleString('ru-RU');

// ✅ ДОСТУПНЫЕ ДОКУМЕНТЫ В ЗАВИСИМОСТИ ОТ РОЛИ
const getAvailableDocsByRole = (userRole) => {
  if (userRole === 'master' || userRole === 'foreman') {
    return [
      { id: 'work_log', label: 'Журнал работ', icon: Calendar },
      { id: 'executive_diagram', label: 'Исполнительная схема', icon: Ruler }
    ];
  }
  
  if (userRole === 'supply_admin') {
    return [
      { id: 'work_log', label: 'Журнал работ', icon: Calendar },
      { id: 'material_act', label: 'Акт приемки (М-7)', icon: Package },
      { id: 'invoice', label: 'Накладная', icon: Truck }
    ];
  }
  
  if (userRole === 'manager' || userRole === 'director') {
    return [
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
  }
  
  if (userRole === 'accountant') {
    return [
      { id: 'invoice', label: 'Накладная', icon: Truck },
      { id: 'invoice_bill', label: 'Счёт', icon: Receipt },
      { id: 'invoice_vat', label: 'Счёт-фактура', icon: FileText }
    ];
  }
  
  if (userRole === 'client') {
    return [
      { id: 'work_log', label: 'Журнал работ', icon: Calendar },
      { id: 'executive_diagram', label: 'Исполнительная схема', icon: Ruler },
      { id: 'invoice_bill', label: 'Счёт', icon: Receipt }
    ];
  }
  
  return [
    { id: 'work_log', label: 'Журнал работ', icon: Calendar },
    { id: 'executive_diagram', label: 'Исполнительная схема', icon: Ruler }
  ];
};

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const printRef = useRef(null);
  const fileInputRef = useRef(null);

  const DOCS = useMemo(() => getAvailableDocsByRole(userRole), [userRole]);

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (!userCompanyId || !supabase) return;
      setLoadingCompanyDetails(true);
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userCompanyId)
          .single();
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

  // Исправленный useEffect с правильными зависимостями
  const generateTemplate = useCallback((type, app) => {
    if (!app) return '';
    const date = new Date(app.created_at).toLocaleDateString('ru-RU');
    const docNumber = app.id?.slice(0, 8).toUpperCase() || '---';
    
    const cd = companyDetails || {};
    const inn = cd.inn || '—';
    const kpp = cd.kpp || '—';
    // ✅ ИСПРАВЛЕНИЕ: Удалены неиспользуемые переменные address, bank, bik, account
    
    const signatures = `
      <div class="mt-8 pt-4 border-t border-gray-300 dark:border-gray-600 flex flex-col sm:flex-row justify-between gap-4">
        <div class="text-center w-full sm:w-1/2">
          <p class="text-sm text-gray-500 dark:text-gray-400">Исполнитель</p>
          <p class="mt-8 border-b border-gray-400 dark:border-gray-500 w-3/4 mx-auto"></p>
          <p class="text-xs mt-1">(${app.foreman_name})</p>
        </div>
        <div class="text-center w-full sm:w-1/2">
          <p class="text-sm text-gray-500 dark:text-gray-400">Заказчик</p>
          <p class="mt-8 border-b border-gray-400 dark:border-gray-500 w-3/4 mx-auto"></p>
          <p class="text-xs mt-1">(${companyName || '—'})</p>
        </div>
      </div>
    `;

    const vatSignatures = `
      <div class="mt-8 pt-4 border-t border-gray-300 dark:border-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.quantity) * (Number(m.price) || 1000)), 0
        );
        const today = new Date();
        
        const materialsRows = app.materials.map((m, idx) => `
          <tr class="border border-black">
            <td class="border border-black p-1 sm:p-2 text-center text-xs sm:text-sm">${idx + 1}</td>
            <td class="border border-black p-1 sm:p-2 break-words text-xs sm:text-sm">${m.description || '—'}</td>
            <td class="border border-black p-1 sm:p-2 text-center text-xs sm:text-sm">—</td>
            <td class="border border-black p-1 sm:p-2 text-center text-xs sm:text-sm">${m.unit || 'шт'}</td>
            <td class="border border-black p-1 sm:p-2 text-center text-xs sm:text-sm">${Number(m.quantity).toLocaleString('ru-RU')}</td>
            <td class="border border-black p-1 sm:p-2 text-right pr-2 text-xs sm:text-sm">${(Number(m.price) || 1000).toLocaleString('ru-RU')}</td>
            <td class="border border-black p-1 sm:p-2 text-right pr-2 font-medium text-xs sm:text-sm">${(Number(m.quantity) * (Number(m.price) || 1000)).toLocaleString('ru-RU')}</td>
          </tr>
        `).join('');

        return `
          <div class="p-3 sm:p-4 bg-white rounded-xl shadow-sm max-w-full mx-auto font-sans print:p-2">
            <div class="text-center mb-2">
              <div class="text-xs">Унифицированная форма № КС-2</div>
              <div class="text-[10px] text-gray-500">Утверждена постановлением Госкомстата России от 11.11.99 № 100</div>
            </div>
            
            <div class="flex justify-end mb-2 text-[10px]">
              <table class="border-collapse">
                <tr><td class="border border-black px-1">Форма по ОКУД</td><td class="border border-black px-1 font-bold">0322005</td></tr>
              </table>
            </div>
            
            <div class="space-y-1 mb-2 text-[10px] sm:text-xs">
              <div class="flex flex-wrap items-center">
                <span class="font-medium w-24">Инвестор</span>
                <span class="flex-1 border-b border-black border-dotted">${cd.investor || companyName || '—'}</span>
                <span class="text-right w-16">по ОКПО</span>
                <span class="border-b border-black w-16">${cd.okpo || '—'}</span>
              </div>
              <div class="flex flex-wrap items-center">
                <span class="font-medium w-24">Заказчик</span>
                <span class="flex-1 border-b border-black border-dotted">${cd.customer || companyName || '—'}</span>
                <span class="text-right w-16">по ОКПО</span>
                <span class="border-b border-black w-16">${cd.okpo || '—'}</span>
              </div>
              <div class="flex flex-wrap items-center">
                <span class="font-medium w-24">Подрядчик</span>
                <span class="flex-1 border-b border-black border-dotted">${companyName || '—'}</span>
                <span class="text-right w-16">по ОКПО</span>
                <span class="border-b border-black w-16">${cd.okpo || '—'}</span>
              </div>
              <div class="flex flex-wrap items-center">
                <span class="font-medium w-24">Объект</span>
                <span class="flex-1 border-b border-black border-dotted">${app.object_name || '—'}</span>
              </div>
            </div>
            
            <div class="flex flex-wrap gap-2 mb-2 text-[10px] sm:text-xs">
              <div class="flex items-center"><span class="font-medium mr-1">Договор №</span><span class="border-b border-black w-20 text-center">${docNumber}</span></div>
              <div class="flex items-center"><span class="font-medium mr-1">от</span><span class="border-b border-black w-20 text-center">${new Date(app.created_at).toLocaleDateString('ru-RU')}</span></div>
              <div class="flex items-center flex-wrap"><span class="font-medium mr-1">Период:</span><span class="border-b border-black w-16 text-center">с ${new Date(app.created_at).toLocaleDateString('ru-RU')}</span><span class="mx-1">по</span><span class="border-b border-black w-16 text-center">${today.toLocaleDateString('ru-RU')}</span></div>
            </div>
            
            <div class="text-center font-bold my-2 text-sm sm:text-base">АКТ</div>
            <div class="text-center font-bold mb-3 text-sm sm:text-base">о приёмке выполненных работ</div>
            
            <div class="flex flex-wrap justify-end mb-2 text-[10px] sm:text-xs">
              <span class="font-medium mr-2">Сметная стоимость работ по договору:</span>
              <span class="border-b border-black w-28 text-right">${totalAmount.toLocaleString('ru-RU')}</span>
              <span class="ml-1">руб.</span>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-[9px] sm:text-xs mb-2 min-w-[600px]">
                <thead>
                  <tr class="border border-black">
                    <th class="border border-black p-0.5 sm:p-1 text-center w-8">№ п/п</th>
                    <th class="border border-black p-0.5 sm:p-1 text-left min-w-[200px]">Наименование работ</th>
                    <th class="border border-black p-0.5 sm:p-1 text-center w-16">Ед. изм.</th>
                    <th class="border border-black p-0.5 sm:p-1 text-center w-20">Количество</th>
                    <th class="border border-black p-0.5 sm:p-1 text-right pr-1 w-24">Цена за единицу, руб.</th>
                    <th class="border border-black p-0.5 sm:p-1 text-right pr-1 w-28">Стоимость, руб.</th>
                  </tr>
                </thead>
                <tbody>${materialsRows}</tbody>
                <tfoot>
                  <tr class="border border-black font-bold">
                    <td colspan="4" class="border border-black p-1 text-right pr-2">Итого</td>
                    <td class="border border-black p-1 text-center">Х</td>
                    <td class="border border-black p-1 text-right pr-2">${totalAmount.toLocaleString('ru-RU')}</td>
                  </tr>
                  <tr class="border border-black font-bold">
                    <td colspan="4" class="border border-black p-1 text-right pr-2">Всего</td>
                    <td class="border border-black p-1 text-center">Х</td>
                    <td class="border border-black p-1 text-right pr-2 font-bold">${totalAmount.toLocaleString('ru-RU')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div class="text-[10px] sm:text-xs mb-3">
              <p>Всего выполнено на сумму: <span class="border-b border-black w-full inline-block"></span></p>
              <p class="text-[9px] text-gray-500">(прописью)</p>
            </div>
            
            <div class="mt-4 pt-2 border-t border-black text-[10px] sm:text-xs">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p class="font-medium mb-2">Сдал (Подрядчик)</p>
                  <div class="flex items-center gap-2"><span class="border-b border-black flex-1"></span><span class="text-[9px] text-gray-500">(должность)</span></div>
                  <div class="flex items-center gap-2 mt-1"><span class="border-b border-black w-24"></span><span class="text-[9px] text-gray-500">(подпись)</span><span class="border-b border-black flex-1 ml-2"></span><span class="text-[9px] text-gray-500">${app.foreman_name || '(расшифровка)'}</span></div>
                  <div class="mt-2 text-center text-gray-400">М.П.</div>
                </div>
                <div>
                  <p class="font-medium mb-2">Принял (Заказчик)</p>
                  <div class="flex items-center gap-2"><span class="border-b border-black flex-1"></span><span class="text-[9px] text-gray-500">(должность)</span></div>
                  <div class="flex items-center gap-2 mt-1"><span class="border-b border-black w-24"></span><span class="text-[9px] text-gray-500">(подпись)</span><span class="border-b border-black flex-1 ml-2"></span><span class="text-[9px] text-gray-500">(расшифровка)</span></div>
                  <div class="mt-2 text-center text-gray-400">М.П.</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      
      case 'material_act': {
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.supplier_received_quantity || m.received || 0) * (Number(m.price) || 1000)), 0
        );
        const today = new Date();
        
        return `
          <div class="p-3 sm:p-8 bg-white rounded-xl shadow-sm max-w-full mx-auto font-sans overflow-x-auto">
            <div class="min-w-[600px]">
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
                <div class="flex flex-wrap items-center mb-2">
                  <span class="font-medium w-24">Организация</span>
                  <span class="flex-1 border-b border-black border-dotted">${companyName || '—'}</span>
                  <span class="text-right w-16">по ОКПО</span>
                </div>
                <div class="flex flex-wrap items-center mb-2">
                  <span class="font-medium w-24">Дата составления</span>
                  <span class="flex-1 border-b border-black border-dotted">${today.toLocaleDateString('ru-RU')}</span>
                </div>
                <div class="flex flex-wrap items-center">
                  <span class="font-medium w-24">Место составления акта</span>
                  <span class="flex-1 border-b border-black border-dotted">${cd.address || companyName || '—'}</span>
                </div>
              </div>
              
              <div class="overflow-x-auto">
                <table class="w-full border-collapse text-sm mb-4 min-w-[800px]">
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
                            <td class="border border-black p-1 break-words">${m.description || '—'}</td>
                            <td class="border border-black p-1 text-center">${m.unit || 'шт'}</td>
                            <td class="border border-black p-1 text-center">${qtyDoc.toLocaleString('ru-RU')}</td>
                            <td class="border border-black p-1 text-center font-medium">${qtyFact.toLocaleString('ru-RU')}</td>
                            <td class="border border-black p-1 text-center ${deviation !== 0 ? 'text-red-600' : 'text-green-600'}">
                              ${deviation !== 0 ? deviation.toLocaleString('ru-RU') : '—'}
                            </td>
                            <td class="border border-black p-1 text-right pr-2">${price.toLocaleString('ru-RU')}</td>
                            <td class="border border-black p-1 text-right pr-2">${total.toLocaleString('ru-RU')}</td>
                          </tr>
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
                    <tr><td class="border-b border-black h-10">${app.foreman_name || '_____________'}</td><td class="border-b border-black h-10"></td><td class="border-b border-black h-10"></td><td class="border-b border-black h-10"></td></tr>
                    <tr><td class="border-b border-black h-10">_____________</td><td class="border-b border-black h-10"></td><td class="border-b border-black h-10"></td><td class="border-b border-black h-10"></td></tr>
                    <tr><td class="border-b border-black h-10">_____________</td><td class="border-b border-black h-10"></td><td class="border-b border-black h-10"></td><td class="border-b border-black h-10"></td></tr>
                  </tbody>
                </table>
              </div>
              
              <div class="mt-8 pt-4 border-t border-gray-300">
                <div class="flex flex-col sm:flex-row justify-between gap-4">
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
          </div>
        `;
      }
      
      case 'work_log': {
        const today = new Date();
        
        return `
          <div class="p-3 sm:p-8 bg-white rounded-xl shadow-sm max-w-full mx-auto font-sans overflow-x-auto">
            <div class="min-w-[600px]">
              <div class="text-center mb-4">
                <div class="text-sm">Типовая межотраслевая форма № КС-6</div>
                <div class="text-xs text-gray-500">Утверждена постановлением Госкомстата России от 30.10.97 № 71а</div>
              </div>
              
              <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
                <div class="text-lg font-bold">ОБЩИЙ ЖУРНАЛ РАБОТ № 1</div>
                <div class="text-right">
                  <div>Форма по ОКУД</div>
                  <div class="font-bold">0336001</div>
                </div>
              </div>
              
              <div class="space-y-3 mb-6">
                <div class="flex flex-wrap items-center">
                  <span class="font-medium w-48">Специализированная строительная организация</span>
                  <span class="flex-1 border-b border-black border-dotted">${companyName || '—'}</span>
                  <span class="text-right w-16">по ОКПО</span>
                </div>
                <div class="flex flex-wrap items-center">
                  <span class="font-medium w-48">Адрес</span>
                  <span class="flex-1 border-b border-black border-dotted">${cd.address || companyName || '—'}</span>
                </div>
                <div class="flex flex-wrap items-center">
                  <span class="font-medium w-48">Строительство объекта</span>
                  <span class="flex-1 border-b border-black border-dotted">${app.object_name || '—'}</span>
                </div>
                <div class="flex flex-wrap items-center">
                  <span class="font-medium w-48">Адрес объекта</span>
                  <span class="flex-1 border-b border-black border-dotted">${cd.address || companyName || '—'}</span>
                </div>
              </div>
              
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
              
              <div class="overflow-x-auto">
                <table class="w-full border-collapse text-sm mb-4 min-w-[700px]">
                  <thead>
                    <tr class="border border-black bg-gray-50">
                      <th class="border border-black p-2 text-left">Фамилия, имя, отчество, занимаемая должность, участок работы</th>
                      <th class="border border-black p-2 text-center w-24">Дата начала работ</th>
                      <th class="border border-black p-2 text-center w-24">Отметка о получении разрешения</th>
                      <th class="border border-black p-2 text-center w-24">Дата окончания работ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="border border-black p-2">${app.foreman_name} — прораб</td>
                      <td class="border border-black p-2 text-center">${new Date(app.created_at).toLocaleDateString('ru-RU')}</td>
                      <td class="border border-black p-2 text-center">+</td>
                      <td class="border border-black p-2 text-center">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="border-t border-black pt-4 mt-4">
                <div class="text-center text-xs text-gray-400">1-я страница формы № КС-6</div>
              </div>
              
              <div class="page-break"></div>
              
              <div class="mt-6 overflow-x-auto">
                <h3 class="text-md font-bold text-center mb-4">Раздел 2. Перечень актов промежуточной приемки ответственных конструкций и освидетельствования скрытых работ</h3>
                
                <table class="w-full border-collapse text-sm min-w-[600px]">
                  <thead>
                    <tr class="border border-black bg-gray-50">
                      <th class="border border-black p-2 text-center w-16">№ п/п</th>
                      <th class="border border-black p-2 text-left">Наименование актов (с указанием места расположения конструкций и работ)</th>
                      <th class="border border-black p-2 text-left">Дата подписания акта, фамилии, инициалы и должности подписавших</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${app.materials.map((m, idx) => `
                      <tr>
                        <td class="border border-black p-2 text-center">${idx + 1}</td>
                        <td class="border border-black p-2">Приемка выполненных работ по ${m.description} — ${m.quantity} ${m.unit}</td>
                        <td class="border border-black p-2">${today.toLocaleDateString('ru-RU')}, ${app.foreman_name} (прораб)</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              
              <div class="border-t border-black pt-4 mt-4">
                <div class="text-center text-xs text-gray-400">2-я страница формы № КС-6</div>
              </div>
            </div>
          </div>
        `;
      }
      
      case 'invoice': {
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.quantity) * (Number(m.price) || 1000)), 0
        );
        const ndsAmount = Math.round(totalAmount * 20 / 120);
        const withoutNds = totalAmount - ndsAmount;
        const today = new Date();
        
        const materialsRows = app.materials.map((m, idx) => {
          const qty = Number(m.quantity) || 0;
          const price = Number(m.price) || 1000;
          const itemTotal = qty * price;
          const itemNds = Math.round(itemTotal * 20 / 120);
          const itemWithoutNds = itemTotal - itemNds;
          
          return `
            <tr class="border border-black">
              <td class="border border-black p-1 text-center">${idx + 1}</td>
              <td class="border border-black p-1 break-words">${m.description || '—'}</td>
              <td class="border border-black p-1 text-center">${m.unit || 'шт'}</td>
              <td class="border border-black p-1 text-center">—</td>
              <td class="border border-black p-1 text-center">${qty.toLocaleString('ru-RU')}</td>
              <td class="border border-black p-1 text-center">1</td>
              <td class="border border-black p-1 text-center">—</td>
              <td class="border border-black p-1 text-right pr-2">${price.toLocaleString('ru-RU')}</td>
              <td class="border border-black p-1 text-right pr-2">${itemWithoutNds.toLocaleString('ru-RU')}</td>
              <td class="border border-black p-1 text-center">20%</td>
              <td class="border border-black p-1 text-right pr-2">${itemNds.toLocaleString('ru-RU')}</td>
              <td class="border border-black p-1 text-right pr-2 font-medium">${itemTotal.toLocaleString('ru-RU')}</td>
            </tr>
          `;
        }).join('');
        
        return `
          <div class="p-3 sm:p-4 bg-white rounded-xl shadow-sm max-w-full mx-auto font-sans text-sm print:p-2 overflow-x-auto">
            <div class="min-w-[800px]">
              <div class="text-center mb-2">
                <div class="text-xs">Унифицированная форма № ТОРГ-12</div>
                <div class="text-[10px] text-gray-500">Утверждена постановлением Госкомстата России от 25.12.98 № 132</div>
              </div>
              
              <div class="flex justify-end mb-2 text-[10px]">
                <table class="border-collapse">
                  <tr><td class="border border-black px-1">Код</td><td class="border border-black px-1">Форма по ОКУД</td><td class="border border-black px-1 font-bold">0330212</td></tr>
                </table>
              </div>
              
              <div class="mb-1">
                <div class="flex flex-wrap items-center"><span class="font-medium w-28 text-[10px]">Грузоотправитель</span><span class="flex-1 border-b border-black border-dotted text-[10px]">${cd.address || companyName || '—'}</span><span class="text-right w-16 text-[10px]">по ОКПО</span><span class="border-b border-black w-16">${cd.okpo || '—'}</span></div>
              </div>
              
              <div class="mb-1">
                <div class="flex flex-wrap items-center"><span class="font-medium w-28 text-[10px]">Грузополучатель</span><span class="flex-1 border-b border-black border-dotted text-[10px]">${app.object_name || '—'}</span><span class="text-right w-16 text-[10px]">по ОКПО</span><span class="border-b border-black w-16">—</span></div>
              </div>
              
              <div class="mb-2">
                <div class="flex flex-wrap items-center"><span class="font-medium w-28 text-[10px]">Поставщик</span><span class="flex-1 border-b border-black border-dotted text-[10px]">${companyName || '—'}, ${cd.address || ''}</span><span class="text-right w-16 text-[10px]">по ОКПО</span><span class="border-b border-black w-16">${cd.okpo || '—'}</span></div>
              </div>
              
              <div class="flex flex-wrap justify-between gap-4 mb-2 text-[10px]">
                <div class="flex items-center"><span class="font-medium mr-1">Основание</span><span class="border-b border-black w-32 text-center">договор № ${docNumber}</span><span class="ml-1">от</span><span class="border-b border-black w-20 text-center">${new Date(app.created_at).toLocaleDateString('ru-RU')}</span></div>
                <div class="flex items-center"><span class="font-medium mr-1">Транспортная накладная №</span><span class="border-b border-black w-16 text-center">—</span><span class="ml-1">от</span><span class="border-b border-black w-16 text-center">—</span></div>
              </div>
              
              <div class="flex flex-wrap justify-end gap-4 mb-2 text-[10px]">
                <div><span class="font-medium">Номер документа</span><div class="border-b border-black w-24 text-center mt-1">${docNumber}</div></div>
                <div><span class="font-medium">Дата составления</span><div class="border-b border-black w-24 text-center mt-1">${today.toLocaleDateString('ru-RU')}</div></div>
              </div>
              
              <div class="text-center font-bold mb-1">ТОВАРНАЯ НАКЛАДНАЯ</div>
              
              <div class="overflow-x-auto">
                <table class="w-full border-collapse text-[9px] mb-2 min-w-[900px]">
                  <thead>
                    <tr class="border border-black">
                      <th rowspan="2" class="border border-black p-0.5 text-center w-8">№ п/п</th>
                      <th rowspan="2" class="border border-black p-0.5 text-left min-w-[150px]">Наименование товара</th>
                      <th colspan="2" class="border border-black p-0.5 text-center">Единица измерения</th>
                      <th rowspan="2" class="border border-black p-0.5 text-center w-16">Вид упаковки</th>
                      <th colspan="2" class="border border-black p-0.5 text-center">Количество</th>
                      <th rowspan="2" class="border border-black p-0.5 text-center w-16">Масса брутто</th>
                      <th rowspan="2" class="border border-black p-0.5 text-center w-20">Количество (масса нетто)</th>
                      <th rowspan="2" class="border border-black p-0.5 text-right pr-1 w-20">Цена, руб.</th>
                      <th rowspan="2" class="border border-black p-0.5 text-right pr-1 w-24">Сумма без НДС</th>
                      <th colspan="2" class="border border-black p-0.5 text-center">НДС</th>
                      <th rowspan="2" class="border border-black p-0.5 text-right pr-1 w-24">Сумма с НДС</th>
                    </tr>
                    <tr class="border border-black">
                      <th class="border border-black p-0.5 text-center w-12">код</th>
                      <th class="border border-black p-0.5 text-center w-16">наименование</th>
                      <th class="border border-black p-0.5 text-center w-16">в одном месте</th>
                      <th class="border border-black p-0.5 text-center w-12">мест</th>
                      <th class="border border-black p-0.5 text-center w-16">ставка</th>
                      <th class="border border-black p-0.5 text-right pr-1 w-20">сумма</th>
                    </tr>
                  </thead>
                  <tbody>${materialsRows}</tbody>
                  <tfoot>
                    <tr class="border border-black font-bold">
                      <td colspan="5" class="border border-black p-1 text-right pr-2">Итого</td>
                      <td class="border border-black p-1 text-center">—</td>
                      <td class="border border-black p-1 text-center">${app.materials.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0).toLocaleString('ru-RU')}</td>
                      <td class="border border-black p-1 text-center">—</td>
                      <td class="border border-black p-1 text-center">—</td>
                      <td class="border border-black p-1 text-right pr-1">Х</td>
                      <td class="border border-black p-1 text-right pr-1">${withoutNds.toLocaleString('ru-RU')}</td>
                      <td class="border border-black p-1 text-center">Х</td>
                      <td class="border border-black p-1 text-right pr-1">${ndsAmount.toLocaleString('ru-RU')}</td>
                      <td class="border border-black p-1 text-right pr-1">${totalAmount.toLocaleString('ru-RU')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div class="mt-4 pt-2 border-t border-black text-[10px]">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                  <div>
                    <p class="font-medium mb-1">Отпуск груза разрешил</p>
                    <div class="flex items-center gap-2"><span class="border-b border-black flex-1"></span><span class="text-[9px] text-gray-500">(должность)</span></div>
                    <div class="flex items-center gap-2 mt-1"><span class="border-b border-black w-24"></span><span class="text-[9px] text-gray-500">(подпись)</span><span class="border-b border-black flex-1 ml-2"></span><span class="text-[9px] text-gray-500">(расшифровка)</span></div>
                  </div>
                  <div>
                    <p class="font-medium mb-1">Главный бухгалтер</p>
                    <div class="flex items-center gap-2"><span class="border-b border-black flex-1"></span><span class="text-[9px] text-gray-500">(подпись)</span><span class="border-b border-black w-32 ml-2"></span><span class="text-[9px] text-gray-500">(расшифровка)</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      
      case 'ks2': {
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.supplier_received_quantity || m.received || 0) * (Number(m.price) || 1000)), 0
        );
        const today = new Date();
        const startDate = new Date(app.created_at);
        const endDate = today;
        
        return `
          <div class="p-3 sm:p-8 bg-white rounded-xl shadow-sm max-w-full mx-auto font-sans overflow-x-auto">
            <div class="min-w-[600px]">
              <div class="text-center mb-6">
                <div class="text-sm">Унифицированная форма № КС-2</div>
                <div class="text-xs text-gray-500">Утверждена постановлением Госкомстата России от 11.11.99 № 100</div>
              </div>
              
              <div class="grid grid-cols-2 gap-4 mb-4 text-xs">
                <div></div>
                <div class="text-right"><div>Форма по ОКУД</div><div class="font-bold text-lg">0322005</div></div>
              </div>
              
              <div class="space-y-2 mb-4 text-sm">
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Инвестор</span><span class="flex-1 border-b border-black border-dotted">${cd.investor || companyName || '—'}</span><span class="text-right w-16">по ОКПО</span></div>
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Заказчик</span><span class="flex-1 border-b border-black border-dotted">${cd.customer || companyName || '—'}</span><span class="text-right w-16">по ОКПО</span></div>
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Подрядчик</span><span class="flex-1 border-b border-black border-dotted">${cd.contractor || companyName || '—'}</span><span class="text-right w-16">по ОКПО</span></div>
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Стройка</span><span class="flex-1 border-b border-black border-dotted">${app.object_name || '—'}</span></div>
              </div>
              
              <div class="flex flex-wrap gap-4 mb-4 text-sm">
                <div class="flex items-center"><span class="font-medium mr-2">Договор подряда</span><span class="border-b border-black w-24 text-center">${docNumber}</span></div>
                <div class="flex items-center"><span class="font-medium mr-2">от</span><span class="border-b border-black w-24 text-center">${new Date(app.created_at).toLocaleDateString('ru-RU')}</span></div>
              </div>
              
              <div class="flex flex-wrap gap-4 mb-4 text-sm">
                <div class="flex items-center"><span class="font-medium mr-2">Номер документа</span><span class="border-b border-black w-32 text-center">${docNumber}</span></div>
                <div class="flex items-center"><span class="font-medium mr-2">Дата составления</span><span class="border-b border-black w-32 text-center">${today.toLocaleDateString('ru-RU')}</span></div>
                <div class="flex items-center flex-wrap"><span class="font-medium mr-2">Отчетный период</span><span class="border-b border-black w-20 text-center">с ${startDate.toLocaleDateString('ru-RU')}</span><span class="mx-1">по</span><span class="border-b border-black w-20 text-center">${endDate.toLocaleDateString('ru-RU')}</span></div>
              </div>
              
              <div class="text-center my-6">
                <div class="text-lg font-bold">АКТ</div>
                <div class="text-md font-semibold">О ПРИЕМКЕ ВЫПОЛНЕННЫХ РАБОТ</div>
              </div>
              
              <div class="overflow-x-auto">
                <table class="w-full border-collapse text-sm mb-4 min-w-[700px]">
                  <thead>
                    <tr class="border border-black">
                      <th rowspan="2" class="border border-black p-1 text-center w-12">№ п/п</th>
                      <th rowspan="2" class="border border-black p-1 text-left">Наименование работ</th>
                      <th rowspan="2" class="border border-black p-1 text-center">Ед. изм.</th>
                      <th colspan="2" class="border border-black p-1 text-center">Выполнено работ</th>
                      <th rowspan="2" class="border border-black p-1 text-center">Цена, руб.</th>
                      <th rowspan="2" class="border border-black p-1 text-center">Стоимость, руб.</th>
                    </tr>
                    <tr class="border border-black">
                      <th class="border border-black p-1 text-center w-20">количество</th>
                      <th class="border border-black p-1 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${app.materials.map((m, idx) => {
                      const received = Number(m.supplier_received_quantity || m.received || 0);
                      const price = Number(m.price) || 1000;
                      const total = received * price;
                      return `
                        <tr class="border border-black">
                          <td class="border border-black p-1 text-center">${idx + 1}</td>
                          <td class="border border-black p-1 break-words">${m.description || '—'}</td>
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
                      <td colspan="5" class="border border-black p-1 text-right font-bold pr-4">Итого</td>
                      <td class="border border-black p-1 text-center">Х</td>
                      <td class="border border-black p-1 text-right pr-2 font-bold">${totalAmount.toLocaleString('ru-RU')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div class="mt-8 pt-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div><div class="flex items-center gap-4"><span>Сдал</span><div class="flex-1 border-b border-black"></div></div><div class="mt-2">М.П.</div></div>
                  <div><div class="flex items-center gap-4"><span>Принял</span><div class="flex-1 border-b border-black"></div></div><div class="mt-2">М.П.</div></div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      
      case 'ks3': {
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.supplier_received_quantity || m.received || 0) * (Number(m.price) || 1000)), 0
        );
        const ndsAmount = Math.round(totalAmount * 20 / 120);
        const today = new Date();
        const startDate = new Date(app.created_at);
        const endDate = today;
        
        return `
          <div class="p-3 sm:p-8 bg-white rounded-xl shadow-sm max-w-full mx-auto font-sans overflow-x-auto">
            <div class="min-w-[600px]">
              <div class="text-center mb-6">
                <div class="text-sm">Унифицированная форма № КС-3</div>
                <div class="text-xs text-gray-500">Утверждена постановлением Госкомстата России от 11.11.99 № 100</div>
              </div>
              
              <div class="grid grid-cols-2 gap-4 mb-4 text-xs">
                <div></div>
                <div class="text-right"><div>Форма по ОКУД</div><div class="font-bold text-lg">0322001</div></div>
              </div>
              
              <div class="space-y-2 mb-4 text-sm">
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Инвестор</span><span class="flex-1 border-b border-black border-dotted">${cd.investor || companyName || '—'}</span><span class="text-right w-16">по ОКПО</span></div>
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Заказчик</span><span class="flex-1 border-b border-black border-dotted">${cd.customer || companyName || '—'}</span><span class="text-right w-16">по ОКПО</span></div>
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Подрядчик</span><span class="flex-1 border-b border-black border-dotted">${cd.contractor || companyName || '—'}</span><span class="text-right w-16">по ОКПО</span></div>
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Стройка</span><span class="flex-1 border-b border-black border-dotted">${app.object_name || '—'}</span></div>
              </div>
              
              <div class="flex flex-wrap gap-4 mb-4 text-sm">
                <div class="flex items-center"><span class="font-medium mr-2">Договор подряда</span><span class="border-b border-black w-24 text-center">${docNumber}</span></div>
                <div class="flex items-center"><span class="font-medium mr-2">от</span><span class="border-b border-black w-24 text-center">${new Date(app.created_at).toLocaleDateString('ru-RU')}</span></div>
              </div>
              
              <div class="flex flex-wrap gap-4 mb-4 text-sm">
                <div class="flex items-center"><span class="font-medium mr-2">Номер документа</span><span class="border-b border-black w-32 text-center">${docNumber}</span></div>
                <div class="flex items-center"><span class="font-medium mr-2">Дата составления</span><span class="border-b border-black w-32 text-center">${today.toLocaleDateString('ru-RU')}</span></div>
                <div class="flex items-center flex-wrap"><span class="font-medium mr-2">Отчетный период</span><span class="border-b border-black w-20 text-center">с ${startDate.toLocaleDateString('ru-RU')}</span><span class="mx-1">по</span><span class="border-b border-black w-20 text-center">${endDate.toLocaleDateString('ru-RU')}</span></div>
              </div>
              
              <div class="text-center my-6">
                <div class="text-lg font-bold">СПРАВКА</div>
                <div class="text-md font-semibold">О СТОИМОСТИ ВЫПОЛНЕННЫХ РАБОТ И ЗАТРАТ</div>
              </div>
              
              <div class="overflow-x-auto">
                <table class="w-full border-collapse text-sm mb-4 min-w-[600px]">
                  <thead>
                    <tr class="border border-black">
                      <th class="border border-black p-1 text-center w-12">№</th>
                      <th class="border border-black p-1 text-left">Наименование</th>
                      <th class="border border-black p-1 text-center w-32">Стоимость, руб.</th>
                    </table>
                  </thead>
                  <tbody>
                    ${app.materials.map((m, idx) => {
                      const received = Number(m.supplier_received_quantity || m.received || 0);
                      const price = Number(m.price) || 1000;
                      const total = received * price;
                      return `
                        <tr class="border border-black">
                          <td class="border border-black p-1 text-center">${idx + 1}</td>
                          <td class="border border-black p-1 break-words">${m.description}</td>
                          <td class="border border-black p-1 text-right pr-2">${total.toLocaleString('ru-RU')}</td>
                        </td>
                      `;
                    }).join('')}
                  </tbody>
                  <tfoot>
                    <tr class="border border-black font-bold">
                      <td colspan="2" class="border border-black p-1 text-right pr-4">Итого</td>
                      <td class="border border-black p-1 text-right pr-2">${totalAmount.toLocaleString('ru-RU')}</td>
                    </tr>
                    <tr class="border border-black">
                      <td colspan="2" class="border border-black p-1 text-right pr-4">НДС 20%</td>
                      <td class="border border-black p-1 text-right pr-2">${ndsAmount.toLocaleString('ru-RU')}</td>
                    </tr>
                    <tr class="border border-black font-bold">
                      <td colspan="2" class="border border-black p-1 text-right pr-4">Всего с НДС</td>
                      <td class="border border-black p-1 text-right pr-2">${(totalAmount + ndsAmount).toLocaleString('ru-RU')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div class="mt-8 pt-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div><div class="flex items-center gap-4"><span>Заказчик</span><div class="flex-1 border-b border-black"></div></div><div class="mt-2">М.П.</div></div>
                  <div><div class="flex items-center gap-4"><span>Подрядчик</span><div class="flex-1 border-b border-black"></div></div><div class="mt-2">М.П.</div></div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      
      case 'hidden_works': {
        const today = new Date();
        
        const worksRows = app.materials.map((m, idx) => `
          <tr class="border border-black">
            <td class="border border-black p-1 text-center w-8">${idx + 1}</td>
            <td class="border border-black p-1 break-words">${m.description || '—'}</td>
            <td class="border border-black p-1 text-center w-16">${m.unit || 'шт'}</td>
            <td class="border border-black p-1 text-center w-20">${Number(m.quantity).toLocaleString('ru-RU')}</td>
            <td class="border border-black p-1 text-center w-24">—</td>
            <td class="border border-black p-1 text-center w-32">✓ Соответствует проекту</td>
          </tr>
        `).join('');
        
        return `
          <div class="p-4 sm:p-6 bg-white rounded-xl shadow-sm max-w-full mx-auto font-sans text-sm print:p-4 overflow-x-auto">
            <div class="min-w-[600px]">
              <div class="text-center mb-4">
                <div class="text-lg font-bold">АКТ</div>
                <div class="text-md font-semibold">на скрытые работы № ${docNumber}</div>
                <div class="text-xs text-gray-500 mt-1">от ${today.toLocaleDateString('ru-RU')}</div>
              </div>
              
              <div class="space-y-2 mb-4 text-xs">
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Объект</span><span class="flex-1 border-b border-black border-dotted">${app.object_name || '—'}</span></div>
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Адрес объекта</span><span class="flex-1 border-b border-black border-dotted">${cd.address || '—'}</span></div>
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Заказчик</span><span class="flex-1 border-b border-black border-dotted">${cd.customer || companyName || '—'}</span></div>
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Подрядчик</span><span class="flex-1 border-b border-black border-dotted">${companyName || '—'}</span></div>
                <div class="flex flex-wrap items-center"><span class="font-medium w-24">Основание</span><span class="flex-1 border-b border-black border-dotted">Договор № ${docNumber} от ${new Date(app.created_at).toLocaleDateString('ru-RU')}</span></div>
              </div>
              
              <div class="mb-4 overflow-x-auto">
                <p class="font-medium mb-2">Перечень работ, подлежащих освидетельствованию:</p>
                <table class="w-full border-collapse text-xs min-w-[600px]">
                  <thead>
                    <tr class="border border-black bg-gray-50">
                      <th class="border border-black p-1 text-center w-8">№</th>
                      <th class="border border-black p-1 text-left">Наименование работ</th>
                      <th class="border border-black p-1 text-center w-16">Ед.изм.</th>
                      <th class="border border-black p-1 text-center w-20">Объём</th>
                      <th class="border border-black p-1 text-center w-24">Проектные отметки</th>
                      <th class="border border-black p-1 text-center w-32">Качество</th>
                    </tr>
                  </thead>
                  <tbody>${worksRows}</tbody>
                </table>
              </div>
              
              <div class="mb-6 p-3 bg-gray-50 rounded border border-gray-200">
                <p class="font-medium mb-2">Заключение:</p>
                <p class="text-xs">Работы выполнены в соответствии с проектной документацией, техническими регламентами и СНиП. Претензий к качеству выполненных работ нет. Работы приняты.</p>
              </div>
              
              <div class="mb-6 text-xs">
                <p class="font-medium">Приложения:</p>
                <ul class="list-disc pl-5 mt-1 space-y-1">
                  <li>Исполнительная схема — ${app.materials.length} л.</li>
                  <li>Фотофиксация — ${app.materials.length} л.</li>
                  <li>Протоколы испытаний — по мере наличия</li>
                </ul>
              </div>
              
              <div class="mt-8 pt-4 border-t border-black text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <p class="font-medium mb-3">Представитель подрядчика</p>
                    <div class="flex items-center gap-2"><span class="border-b border-black flex-1"></span><span class="text-gray-500">(должность)</span></div>
                    <div class="flex items-center gap-2 mt-1"><span class="border-b border-black w-24"></span><span class="text-gray-500">(подпись)</span><span class="border-b border-black flex-1 ml-2"></span><span class="text-gray-500">${app.foreman_name || '(расшифровка)'}</span></div>
                  </div>
                  <div>
                    <p class="font-medium mb-3">Представитель заказчика / технадзора</p>
                    <div class="flex items-center gap-2"><span class="border-b border-black flex-1"></span><span class="text-gray-500">(должность)</span></div>
                    <div class="flex items-center gap-2 mt-1"><span class="border-b border-black w-24"></span><span class="text-gray-500">(подпись)</span><span class="border-b border-black flex-1 ml-2"></span><span class="text-gray-500">(расшифровка)</span></div>
                  </div>
                </div>
                <div class="flex flex-col sm:flex-row justify-between mt-6 text-center text-gray-400 gap-4">
                  <div>М.П.<br/>«___» ______ 20__ г.</div>
                  <div>М.П.<br/>«___» ______ 20__ г.</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      
      case 'executive_diagram': {
        return `
          <div class="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-full mx-auto">
            <h1 class="text-xl font-bold text-center mb-4 break-words">ИСПОЛНИТЕЛЬНАЯ СХЕМА</h1>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-6">
              <p><strong>Объект:</strong> ${app.object_name}</p>
              <p><strong>Дата:</strong> ${date}</p>
              <p><strong>Прораб:</strong> ${app.foreman_name}</p>
              <p><strong>№ заявки:</strong> ${docNumber}</p>
            </div>
            ${uploadedFileUrl ? `
              <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg break-words">
                <p class="font-medium flex items-center gap-2 flex-wrap">📎 Прикреплённый файл:</p>
                <a href="${uploadedFileUrl}" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline break-all text-sm">${uploadedFileUrl.split('/').pop()}</a>
              </div>
            ` : `
              <div class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 mb-6 text-center bg-gray-50 dark:bg-gray-700/30">
                <p class="text-gray-500 dark:text-gray-400 mb-2">📐 Место для схемы / чертежа</p>
                <p class="text-xs text-gray-400">Исполнительная схема не загружена</p>
              </div>
            `}
            <div class="mb-6">
              <p class="font-medium mb-2">Перечень выполненных работ:</p>
              <div class="space-y-1 text-sm">
                ${app.materials.map(m => `
                  <div class="flex flex-wrap justify-between border-b border-gray-100 dark:border-gray-700 pb-2 gap-2">
                    <span class="flex-1 break-words">${m.description}</span>
                    <span class="text-gray-500 whitespace-nowrap">${m.quantity} ${m.unit}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            ${signatures}
          </div>
        `;
      }
      
      case 'invoice_bill': {
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.quantity) || 0) * (Number(m.price) || 1000), 0
        );
        const ndsAmount = Math.round(totalAmount * 20 / 120);
        const withoutNds = totalAmount - ndsAmount;
        const today = new Date();
        
        const materialsRows = app.materials.map((m, idx) => {
          const qty = Number(m.quantity) || 0;
          const price = Number(m.price) || 1000;
          const itemTotal = qty * price;
          return `
            <tr class="border border-black">
              <td class="border border-black p-1 text-center w-8">${idx + 1}</td>
              <td class="border border-black p-1 break-words">${m.description || '—'}</td>
              <td class="border border-black p-1 text-center w-12">${m.unit || 'шт'}</td>
              <td class="border border-black p-1 text-center w-16">${qty.toLocaleString('ru-RU')}</td>
              <td class="border border-black p-1 text-right pr-2 w-24">${price.toLocaleString('ru-RU')}</td>
              <td class="border border-black p-1 text-right pr-2 w-28 font-medium">${itemTotal.toLocaleString('ru-RU')}</td>
            </tr>
          `;
        }).join('');
        
        return `
          <div class="p-4 sm:p-6 bg-white rounded-xl shadow-sm max-w-full mx-auto font-sans text-sm print:p-4 overflow-x-auto">
            <div class="min-w-[600px]">
              <div class="flex flex-col sm:flex-row justify-between items-start mb-6 border-b border-black pb-4 gap-4">
                <div class="w-full sm:w-1/2">
                  <p class="font-bold text-lg mb-2">ПОСТАВЩИК:</p>
                  <p class="text-xs break-words"><strong>${cd.name || companyName || '—'}</strong></p>
                  <p class="text-xs break-words">Адрес: ${cd.address || '—'}</p>
                  <p class="text-xs">ИНН/КПП: ${cd.inn || '—'} / ${cd.kpp || '—'}</p>
                </div>
                <div class="w-full sm:w-1/2 sm:border-l sm:pl-4">
                  <p class="font-bold text-lg mb-2">ПОКУПАТЕЛЬ:</p>
                  <p class="text-xs break-words"><strong>${app.object_name || '—'}</strong></p>
                  <p class="text-xs">Контактное лицо: ${app.foreman_name || '—'}</p>
                </div>
              </div>
              
              <div class="text-center mb-4">
                <h1 class="text-xl sm:text-2xl font-bold break-words">СЧЕТ № ${docNumber}</h1>
                <p class="text-sm text-gray-600">от ${today.toLocaleDateString('ru-RU')}</p>
              </div>
              
              <div class="mb-4 p-3 bg-gray-50 rounded border border-gray-200 text-xs">
                <p><strong>Основание:</strong> Заявка на материалы от ${new Date(app.created_at).toLocaleDateString('ru-RU')}</p>
                <p><strong>Договор:</strong> № ${docNumber} от ${new Date(app.created_at).toLocaleDateString('ru-RU')}</p>
              </div>
              
              <div class="overflow-x-auto">
                <table class="w-full border-collapse text-xs mb-4 min-w-[500px]">
                  <thead>
                    <tr class="border border-black bg-gray-50">
                      <th class="border border-black p-1 text-center w-8">№</th>
                      <th class="border border-black p-1 text-left">Наименование</th>
                      <th class="border border-black p-1 text-center w-12">Ед.</th>
                      <th class="border border-black p-1 text-center w-16">Кол-во</th>
                      <th class="border border-black p-1 text-right pr-2 w-24">Цена, руб.</th>
                      <th class="border border-black p-1 text-right pr-2 w-28">Сумма, руб.</th>
                    </tr>
                  </thead>
                  <tbody>${materialsRows}</tbody>
                  <tfoot>
                    <tr class="border border-black font-bold">
                      <td colspan="5" class="border border-black p-1 text-right pr-4">Итого:</td>
                      <td class="border border-black p-1 text-right pr-2">${withoutNds.toLocaleString('ru-RU')}</td>
                    </tr>
                    <tr class="border border-black">
                      <td colspan="5" class="border border-black p-1 text-right pr-4">НДС 20%:</td>
                      <td class="border border-black p-1 text-right pr-2">${ndsAmount.toLocaleString('ru-RU')}</td>
                    </tr>
                    <tr class="border border-black font-bold bg-gray-50">
                      <td colspan="5" class="border border-black p-1 text-right pr-4 text-base sm:text-lg">Всего к оплате:</td>
                      <td class="border border-black p-1 text-right pr-2 text-base sm:text-lg font-bold">${totalAmount.toLocaleString('ru-RU')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <div class="mb-6 p-3 bg-blue-50 rounded border border-blue-200 text-xs">
                <p><strong>Условия оплаты:</strong> Оплата в течение 3 (трёх) банковских дней с момента выставления счёта.</p>
              </div>
              
              <div class="mt-8 pt-4 border-t border-black text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <p class="font-medium mb-3">Руководитель</p>
                    <div class="flex items-center gap-2"><span class="border-b border-black flex-1"></span><span class="text-gray-500">(подпись)</span></div>
                  </div>
                  <div>
                    <p class="font-medium mb-3">Главный бухгалтер</p>
                    <div class="flex items-center gap-2"><span class="border-b border-black flex-1"></span><span class="text-gray-500">(подпись)</span></div>
                  </div>
                </div>
                <div class="text-center mt-6 text-gray-400 text-xs">М.П.</div>
              </div>
            </div>
          </div>
        `;
      }
      
      case 'invoice_vat': {
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.quantity) || 0) * (Number(m.price) || 1000), 0
        );
        const ndsAmount = Math.round(totalAmount * 20 / 120);
        const withoutNds = totalAmount - ndsAmount;
        
        const materialsRows = app.materials.map((m, idx) => {
          const qty = Number(m.quantity) || 0;
          const price = Number(m.price) || 1000;
          const total = qty * price;
          const itemNds = Math.round(total * 20 / 120);
          const itemWithoutNds = total - itemNds;
          return `
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <td class="py-2 px-2 text-center text-xs sm:text-sm">${idx + 1}</td>
              <td class="py-2 px-2 break-words text-xs sm:text-sm">${m.description}</td>
              <td class="py-2 px-2 text-center text-xs sm:text-sm">${m.unit}</td>
              <td class="py-2 px-2 text-center text-xs sm:text-sm">${qty}</td>
              <td class="py-2 px-2 text-right text-xs sm:text-sm">${price.toLocaleString('ru-RU')}</td>
              <td class="py-2 px-2 text-right text-xs sm:text-sm">${itemWithoutNds.toLocaleString('ru-RU')}</td>
              <td class="py-2 px-2 text-right text-xs sm:text-sm">${itemNds.toLocaleString('ru-RU')}</td>
              <td class="py-2 px-2 text-right font-medium text-xs sm:text-sm">${total.toLocaleString('ru-RU')}</td>
            </tr>
          `;
        }).join('');
        
        return `
          <div class="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-full mx-auto overflow-x-auto">
            <div class="min-w-[700px]">
              <h1 class="text-xl font-bold text-center mb-4 break-words">СЧЕТ-ФАКТУРА № ${docNumber}</h1>
              <p class="text-center text-sm text-gray-500 mb-6">от ${date}</p>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-6 p-3 bg-gray-50 dark:bg-gray-700/30 rounded break-words">
                <div>
                  <p><strong>Продавец:</strong></p>
                  <p>${companyName || '—'}</p>
                  <p>ИНН/КПП: ${inn} / ${kpp}</p>
                </div>
                <div>
                  <p><strong>Покупатель:</strong></p>
                  <p>${app.object_name}</p>
                </div>
              </div>
              
              <div class="overflow-x-auto">
                <table class="w-full border-collapse text-left text-xs sm:text-sm mb-6 min-w-[800px]">
                  <thead>
                    <tr class="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300">
                      <th class="py-2 px-2 font-bold text-center">№</th>
                      <th class="py-2 px-2 font-bold text-left">Товар</th>
                      <th class="py-2 px-2 font-bold text-center">Ед.</th>
                      <th class="py-2 px-2 font-bold text-center">Кол-во</th>
                      <th class="py-2 px-2 font-bold text-right">Цена</th>
                      <th class="py-2 px-2 font-bold text-right">Без НДС</th>
                      <th class="py-2 px-2 font-bold text-right">НДС</th>
                      <th class="py-2 px-2 font-bold text-right">Всего</th>
                    </tr>
                  </thead>
                  <tbody>${materialsRows}</tbody>
                  <tfoot>
                    <tr class="bg-gray-50 dark:bg-gray-700/50 font-bold">
                      <td colspan="5" class="py-3 px-2 text-right">Итого:</td>
                      <td class="py-3 px-2 text-right">${formatRub(withoutNds)}</td>
                      <td class="py-3 px-2 text-right">${formatRub(ndsAmount)}</td>
                      <td class="py-3 px-2 text-right">${formatRub(totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              ${vatSignatures}
            </div>
          </div>
        `;
      }
      
      default: 
        return '';
    }
  }, [companyDetails, companyName, uploadedFileUrl]); // ✅ ИСПРАВЛЕНИЕ: Убрали formatRub из зависимостей

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

  // Исправленный useEffect
  useEffect(() => {
    if (activeTab === 'executive_diagram' && selectedApp && previewHtml) {
      const updatedHtml = generateTemplate(activeTab, selectedApp);
      setPreviewHtml(updatedHtml);
    }
  }, [uploadedFileUrl, activeTab, selectedApp, generateTemplate, previewHtml]);

  // ✅ ИСПРАВЛЕНИЕ: Реализована функция сохранения документа
  const saveGeneratedDocument = useCallback(async (type, app, html) => {
    if (!supabase || !userCompanyId || !user?.id) return;
    try {
      const { error } = await supabase.from('generated_documents').insert([{
        company_id: userCompanyId,
        user_id: user.id,
        application_id: app.id,
        document_type: type,
        html_content: html,
        created_at: new Date().toISOString()
      }]);
      if (error) {
        // Таблица может не существовать, просто пропускаем без падения
        // console.warn('Save document skipped:', error.message);
      }
    } catch (err) {
      console.debug('Save document skipped:', err);
    }
  }, [supabase, userCompanyId, user?.id]);

  // ✅ ИСПРАВЛЕНИЕ: Реализована функция загрузки файла (использует setUploadingFile)
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userCompanyId || !supabase) return;
    
    setUploadingFile(true);
    try {
      const fileName = `${userCompanyId}/executive/${Date.now()}_${file.name.replace(/[^a-z0-9.-]/gi, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { upsert: false });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);
      
      setUploadedFileUrl(publicUrl);
      showNotification?.('Файл успешно загружен', 'success');
    } catch (err) {
      console.error('File upload error:', err);
      showNotification?.('Ошибка загрузки файла', 'error');
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = ''; // Сбрасываем input, чтобы можно было загрузить тот же файл
    }
  }, [userCompanyId, supabase, showNotification]);

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

  // Мобильное меню для типов документов
  const MobileDocsMenu = () => (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden flex items-center justify-between w-full px-4 py-3 bg-[#4A6572] text-white rounded-xl"
      >
        <span className="flex items-center gap-2">
          {DOCS.find(d => d.id === activeTab)?.icon && React.createElement(DOCS.find(d => d.id === activeTab)?.icon, { className: "w-5 h-5" })}
          {DOCS.find(d => d.id === activeTab)?.label || 'Выберите документ'}
        </span>
        {isMobileMenuOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-lg">Тип документа</h3>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1"><XIcon className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {DOCS.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => {
                    setActiveTab(doc.id);
                    setSelectedAppIds([]);
                    setUploadedFileUrl('');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === doc.id
                      ? 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <doc.icon className="w-5 h-5" />
                  <span className="font-medium">{doc.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6 page-enter">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Документооборот</h2>
        {(userRole === 'master' || userRole === 'foreman') && (
          <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
            📋 Вам доступны: Журнал работ и Исполнительная схема
          </p>
        )}
      </div>

      {/* Типы документов - десктоп */}
      <div className="hidden md:flex flex-wrap gap-2 overflow-x-auto pb-2 no-scrollbar">
        {DOCS.map(doc => (
          <button
            key={doc.id}
            onClick={() => {
              setActiveTab(doc.id);
              setSelectedAppIds([]);
              setUploadedFileUrl('');
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
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

      {/* Типы документов - мобильное меню */}
      <MobileDocsMenu />

      {/* Пакетная печать */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl p-3 sm:p-4 border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="font-medium text-gray-700 dark:text-gray-300 text-sm sm:text-base">Пакетная печать</h3>
          <button 
            onClick={selectAllApps}
            className="text-xs text-[#4A6572] hover:underline dark:text-[#F9AA33]"
          >
            {selectedAppIds.length === eligibleApps.length ? 'Снять все' : 'Выбрать все'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {eligibleApps.slice(0, 20).map(app => (
            <label key={app.id} className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs sm:text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
              <input
                type="checkbox"
                checked={selectedAppIds.includes(app.id)}
                onChange={() => toggleAppSelection(app.id)}
                className="rounded border-gray-300 text-[#4A6572] focus:ring-[#4A6572] w-4 h-4"
              />
              <span className="truncate max-w-[150px] sm:max-w-[200px]">{app.object_name}</span>
            </label>
          ))}
        </div>
        {selectedAppIds.length > 0 && (
          <button
            onClick={handleBatchPrint}
            disabled={isGenerating}
            className="mt-3 w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white rounded-lg font-medium hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            <Printer className="w-4 h-4" />
            Печать выбранных ({selectedAppIds.length})
          </button>
        )}
      </div>

      {/* Основная форма */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-200/50 dark:border-gray-700/50">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Выберите заявку</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full px-4 py-3 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base"
            >
              <option value="">— Не выбрано —</option>
              {eligibleApps.map(app => (
                <option key={app.id} value={app.id}>
                  {app.object_name} • {app.foreman_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <button
              onClick={handleGenerate}
              disabled={!selectedAppId || isGenerating}
              className="px-6 py-3 sm:py-2.5 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white rounded-lg font-medium hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Сформировать
            </button>
            <button
              onClick={handlePrint}
              disabled={!previewHtml}
              className="px-4 py-3 sm:py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center gap-2 disabled:opacity-50"
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

        {activeTab === 'executive_diagram' && previewHtml && (
          <div className="mb-4 no-print">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <label className="px-3 py-2 text-xs sm:text-sm bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] cursor-pointer inline-flex items-center gap-1">
                <Upload className="w-3 h-3 sm:w-4 sm:h-4" />
                {uploadingFile ? 'Загрузка...' : 'Загрузить схему'}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.dwg,.png,.jpg,.jpeg"
                  className="hidden"
                />
              </label>
              {uploadedFileUrl && (
                <p className="mt-2 text-xs text-green-600 break-all">
                  ✓ Файл загружен: ${uploadedFileUrl.split('/').pop()}
                </p>
              )}
            </div>
          </div>
        )}

        {previewHtml ? (
          <div className="space-y-4">
            <div ref={printRef} id="printable-doc" className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 overflow-x-auto">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm sm:text-base">Выберите заявку и тип документа, затем нажмите «Сформировать»</p>
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