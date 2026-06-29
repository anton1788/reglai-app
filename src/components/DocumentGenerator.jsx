// src/components/DocumentGenerator.jsx
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  FileText, Download, Printer, Calendar, Package, ClipboardList, Truck, 
  Loader2, AlertCircle, FileCheck, Ruler, Receipt, Check, X, Upload, 
  Paperclip, ExternalLink, Trash2, File, Image, FileArchive
} from 'lucide-react';

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileUrl, setUploadedFileUrl] = useState('');
  
  // ✅ Состояния для работы с проектной документацией
  const [projectFiles, setProjectFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  const printRef = useRef(null);
  const fileInputRef = useRef(null);

  const DOCS = useMemo(() => getAvailableDocsByRole(userRole), [userRole]);

  // ✅ Функция определения иконки по типу файла
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (ext === 'dwg' || ext === 'dxf') return '📐';
    if (ext === 'zip' || ext === 'rar' || ext === '7z') return '📦';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) return '🖼️';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    return '📎';
  };

  // ✅ Функция форматирования размера файла
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  };

  // Загрузка реквизитов компании
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

  // ✅ Загрузка файлов при выборе заявки
  const loadProjectFiles = useCallback(async (appId) => {
    if (!appId || !supabase) {
      setProjectFiles([]);
      setLoadingFiles(false);
      return;
    }
    setLoadingFiles(true);
    try {
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .eq('application_id', appId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.warn('Ошибка загрузки файлов:', error.message);
        setProjectFiles([]);
        return;
      }
      setProjectFiles(data || []);
    } catch (err) {
      console.error('Ошибка загрузки файлов:', err);
      setProjectFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [supabase]);

  // ✅ Реакция на смену заявки
  useEffect(() => {
    if (selectedAppId) {
      loadProjectFiles(selectedAppId);
    } else {
      setProjectFiles([]);
    }
  }, [selectedAppId, loadProjectFiles]);

  useEffect(() => {
    if (activeTab === 'executive_diagram' && selectedApp && previewHtml) {
      const updatedHtml = generateTemplate(activeTab, selectedApp);
      setPreviewHtml(updatedHtml);
    }
  }, [uploadedFileUrl, projectFiles, activeTab, selectedApp, previewHtml]);

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

  // ✅ Функция загрузки файла с прогрессом
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userCompanyId || !supabase || !selectedAppId) {
      showNotification?.('⚠️ Сначала выберите заявку', 'warning');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      showNotification?.('❌ Файл слишком большой. Максимум 50 МБ', 'error');
      return;
    }
    
    setUploadingFile(true);
    setUploadProgress(0);
    
    try {
      const fileName = `${userCompanyId}/projects/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          onUploadProgress: (progress) => {
            const percent = (progress.loaded / progress.total) * 100;
            setUploadProgress(Math.round(percent));
          }
        });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);
      
      const { error: dbError } = await supabase
        .from('project_files')
        .insert([{
          company_id: userCompanyId,
          application_id: selectedAppId,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id
        }]);
      
      if (dbError) throw dbError;
      
      setUploadedFileUrl(publicUrl);
      showNotification?.('📎 Файл успешно загружен и сохранён', 'success');
      await loadProjectFiles(selectedAppId);
    } catch (err) {
      console.error('Ошибка загрузки файла:', err);
      showNotification?.('❌ Ошибка загрузки файла', 'error');
    } finally {
      setUploadingFile(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ✅ Функция удаления файла с проверкой прав
  const handleDeleteFile = async (fileId, fileUrl) => {
    if (!supabase) return;
    
    const file = projectFiles.find(f => f.id === fileId);
    if (!file) {
      showNotification?.('❌ Файл не найден', 'error');
      return;
    }
    
    if (file.uploaded_by !== user.id && userRole !== 'director' && userRole !== 'admin') {
      showNotification?.('⛔ У вас нет прав на удаление этого файла', 'error');
      return;
    }
    
    if (!window.confirm(`Удалить файл "${file.file_name}"?`)) return;
    
    try {
      const filePath = fileUrl.split('/storage/v1/object/public/documents/')[1];
      if (filePath) {
        await supabase.storage.from('documents').remove([filePath]);
      }
      
      const { error } = await supabase
        .from('project_files')
        .delete()
        .eq('id', fileId);
      
      if (error) throw error;
      
      showNotification?.('🗑️ Файл удалён', 'success');
      await loadProjectFiles(selectedAppId);
      
      if (uploadedFileUrl === fileUrl) {
        setUploadedFileUrl('');
      }
    } catch (err) {
      console.error('Ошибка удаления файла:', err);
      showNotification?.('❌ Ошибка удаления файла', 'error');
    }
  };

  // ✅ Функция скачивания файла
  const handleDownloadFile = async (fileUrl, fileName) => {
    try {
      showNotification?.(`📥 Начинаем скачивание "${fileName}"...`, 'info');
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNotification?.('✅ Файл скачан', 'success');
    } catch (err) {
      console.error('Ошибка скачивания:', err);
      showNotification?.('❌ Ошибка при скачивании файла', 'error');
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

  const generateTemplate = useCallback((type, app) => {
    if (!app) return '';
    const date = new Date(app.created_at).toLocaleDateString('ru-RU');
    const docNumber = app.id?.slice(0, 8).toUpperCase() || '---';
    
    const cd = companyDetails || {};
    const inn = cd.inn || '—';
    const kpp = cd.kpp || '—';
    const address = cd.address || '—';
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
        const totalAmount = app.materials.reduce((sum, m) => 
          sum + (Number(m.quantity) * (Number(m.price) || 1000)), 0
        );
        const today = new Date();
        
        const materialsRows = app.materials.map((m, idx) => `
          <tr class="border border-black">
            <td class="border border-black p-1 text-center">${idx + 1}</td>
            <td class="border border-black p-1">${m.description || '—'}</td>
            <td class="border border-black p-1 text-center">—</td>
            <td class="border border-black p-1 text-center">${m.unit || 'шт'}</td>
            <td class="border border-black p-1 text-center">${Number(m.quantity).toLocaleString('ru-RU')}</td>
            <td class="border border-black p-1 text-right pr-2">${(Number(m.price) || 1000).toLocaleString('ru-RU')}</td>
            <td class="border border-black p-1 text-right pr-2 font-medium">${(Number(m.quantity) * (Number(m.price) || 1000)).toLocaleString('ru-RU')}</td>
          </tr>
        `).join('');

        return `
          <div class="p-4 bg-white rounded-xl shadow-sm max-w-5xl mx-auto font-sans text-sm print:p-2">
            <div class="text-center mb-2">
              <div class="text-xs">Унифицированная форма № КС-2</div>
              <div class="text-[10px] text-gray-500">Утверждена постановлением Госкомстата России от 11.11.99 № 100</div>
            </div>
            <div class="flex justify-end mb-2 text-[10px]">
              <table class="border-collapse">
                <tr>
                  <td class="border border-black px-1">Форма по ОКУД</td>
                  <td class="border border-black px-1 font-bold">0322005</td>
                </tr>
              </table>
            </div>
            <div class="space-y-1 mb-2 text-[10px]">
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium">Инвестор</div>
                <div class="col-span-8 border-b border-black border-dotted">${cd.investor || companyName || '—'}</div>
                <div class="col-span-2 text-right">по ОКПО</div>
                <div class="col-span-2 col-start-11 border-b border-black border-dotted">${cd.okpo || '—'}</div>
              </div>
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium">Заказчик</div>
                <div class="col-span-8 border-b border-black border-dotted">${cd.customer || companyName || '—'}</div>
                <div class="col-span-2 text-right">по ОКПО</div>
                <div class="col-span-2 col-start-11 border-b border-black border-dotted">${cd.okpo || '—'}</div>
              </div>
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium">Подрядчик</div>
                <div class="col-span-8 border-b border-black border-dotted">${companyName || '—'}</div>
                <div class="col-span-2 text-right">по ОКПО</div>
                <div class="col-span-2 col-start-11 border-b border-black border-dotted">${cd.okpo || '—'}</div>
              </div>
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium">Объект</div>
                <div class="col-span-10 border-b border-black border-dotted">${app.object_name || '—'}</div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2 mb-2 text-[10px]">
              <div class="flex items-center">
                <span class="font-medium mr-1">Договор №</span>
                <span class="border-b border-black w-20 text-center">${docNumber}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-1">от</span>
                <span class="border-b border-black w-20 text-center">${new Date(app.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              <div class="flex items-center justify-end">
                <span class="font-medium mr-1">Период:</span>
                <span class="border-b border-black w-16 text-center">с ${new Date(app.created_at).toLocaleDateString('ru-RU')}</span>
                <span class="mx-1">по</span>
                <span class="border-b border-black w-16 text-center">${today.toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
            <div class="text-center font-bold my-2">АКТ</div>
            <div class="text-center font-bold mb-3">о приёмке выполненных работ</div>
            <div class="flex justify-end mb-2 text-[10px]">
              <span class="font-medium mr-2">Сметная стоимость работ по договору:</span>
              <span class="border-b border-black w-28 text-right">${totalAmount.toLocaleString('ru-RU')}</span>
              <span class="ml-1">руб.</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-[9px] mb-2">
                <thead>
                  <tr class="border border-black">
                    <th class="border border-black p-0.5 text-center w-8">№ п/п</th>
                    <th class="border border-black p-0.5 text-left min-w-[200px]">Наименование работ</th>
                    <th class="border border-black p-0.5 text-center w-16">Ед. изм.</th>
                    <th class="border border-black p-0.5 text-center w-20">Количество</th>
                    <th class="border border-black p-0.5 text-right pr-1 w-24">Цена за единицу, руб.</th>
                    <th class="border border-black p-0.5 text-right pr-1 w-28">Стоимость, руб.</th>
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
            <div class="text-[10px] mb-3">
              <p>Всего выполнено на сумму: <span class="border-b border-black w-full inline-block"></span></p>
              <p class="text-[9px] text-gray-500">(прописью)</p>
            </div>
            <div class="mt-4 pt-2 border-t border-black text-[10px]">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="font-medium mb-2">Сдал (Подрядчик)</p>
                  <div class="flex items-center gap-2">
                    <span class="border-b border-black flex-1"></span>
                    <span class="text-[9px] text-gray-500">(должность)</span>
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="border-b border-black w-24"></span>
                    <span class="text-[9px] text-gray-500">(подпись)</span>
                    <span class="border-b border-black flex-1 ml-2"></span>
                    <span class="text-[9px] text-gray-500">${app.foreman_name || '(расшифровка)'}</span>
                  </div>
                  <div class="mt-2 text-center text-gray-400">М.П.</div>
                </div>
                <div>
                  <p class="font-medium mb-2">Принял (Заказчик)</p>
                  <div class="flex items-center gap-2">
                    <span class="border-b border-black flex-1"></span>
                    <span class="text-[9px] text-gray-500">(должность)</span>
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="border-b border-black w-24"></span>
                    <span class="text-[9px] text-gray-500">(подпись)</span>
                    <span class="border-b border-black flex-1 ml-2"></span>
                    <span class="text-[9px] text-gray-500">(расшифровка)</span>
                  </div>
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
      
      case 'work_log': {
        const today = new Date();
        return `
          <div class="p-8 bg-white rounded-xl shadow-sm max-w-6xl mx-auto font-sans">
            <div class="text-center mb-4">
              <div class="text-sm">Типовая межотраслевая форма № КС-6</div>
              <div class="text-xs text-gray-500">Утверждена постановлением Госкомстата России от 30.10.97 № 71а</div>
            </div>
            <div class="flex justify-between items-center mb-6">
              <div class="text-lg font-bold">ОБЩИЙ ЖУРНАЛ РАБОТ № 1</div>
              <div class="text-right">
                <div>Форма по ОКУД</div>
                <div class="font-bold">0336001</div>
              </div>
            </div>
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
            <div class="space-y-2 mb-6 text-sm">
              <p>Должность, фамилия, имя, отчество и подпись лица, ответственного от строительной организации за строительство объекта и ведение общего журнала работ:</p>
              <div class="border-b border-black h-10"></div>
              <div class="text-center text-xs text-gray-500">(должность, подпись, расшифровка подписи)</div>
              <p class="mt-4">Генеральная проектная организация:</p>
              <div class="border-b border-black h-10"></div>
              <div class="text-center text-xs text-gray-500">(подпись, расшифровка подписи)</div>
              <p class="mt-4">Заказчик:</p>
              <div class="border-b border-black h-10"></div>
              <div class="text-center text-xs text-gray-500">(должность, подпись, расшифровка подписи)</div>
            </div>
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
                <p class="font-medium">Окончание работ:</p>
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
            <div class="flex items-center gap-2 mb-6 text-sm">
              <span>В настоящем журнале</span>
              <span class="border-b border-black w-20 text-center">${app.materials?.length || 0}</span>
              <span>пронумерованных и прошнурованных страниц.</span>
            </div>
            <div class="border-t border-black pt-4 mt-4">
              <div class="text-center text-xs text-gray-400">1-я страница формы № КС-6</div>
            </div>
            <div class="page-break"></div>
            <div class="mt-6">
              <h3 class="text-md font-bold text-center mb-4">Раздел 1. Список инженерно-технического персонала</h3>
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="border border-black bg-gray-50">
                    <th class="border border-black p-2 text-left">ФИО, должность</th>
                    <th class="border border-black p-2 text-center w-24">Дата начала</th>
                    <th class="border border-black p-2 text-center w-24">Разрешение</th>
                    <th class="border border-black p-2 text-center w-24">Дата окончания</th>
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
                </tbody>
              </table>
            </div>
            <div class="border-t border-black pt-4 mt-4">
              <div class="text-center text-xs text-gray-400">2-я страница формы № КС-6</div>
            </div>
            <div class="page-break"></div>
            <div class="mt-6">
              <h3 class="text-md font-bold text-center mb-4">Раздел 5. Сведения о производстве работ</h3>
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr class="border border-black bg-gray-50">
                    <th class="border border-black p-2 text-center w-24">Дата</th>
                    <th class="border border-black p-2 text-left">Описание работ</th>
                    <th class="border border-black p-2 text-left">Ответственный</th>
                  </tr>
                </thead>
                <tbody>
                  ${app.materials.map((m) => `
                    <tr>
                      <td class="border border-black p-2 text-center">${today.toLocaleDateString('ru-RU')}</td>
                      <td class="border border-black p-2">Выполнены работы по ${m.description} в количестве ${m.quantity} ${m.unit}.</td>
                      <td class="border border-black p-2">${app.foreman_name} (прораб)</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div class="mt-8">
              <div class="text-center text-xs text-gray-400">Последняя страница формы № КС-6</div>
              <div class="mt-6 p-4 border border-black">
                <p class="text-sm">В этой книге пронумеровано и прошнуровано ________ страниц.</p>
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
                    <div class="text-xs text-gray-500">(расшифровка)</div>
                  </div>
                </div>
                <div class="text-center mt-4">«____» ______________ 20__ г.</div>
                <div class="flex justify-end mt-2">М.П.</div>
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
        const cd = companyDetails || {};
        
        const materialsRows = app.materials.map((m, idx) => {
          const qty = Number(m.quantity) || 0;
          const price = Number(m.price) || 1000;
          const itemTotal = qty * price;
          const itemNds = Math.round(itemTotal * 20 / 120);
          const itemWithoutNds = itemTotal - itemNds;
          return `
            <tr class="border border-black">
              <td class="border border-black p-1 text-center">${idx + 1}</td>
              <td class="border border-black p-1">${m.description || '—'}</td>
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
          <div class="p-4 bg-white rounded-xl shadow-sm max-w-7xl mx-auto font-sans text-sm print:p-2">
            <div class="text-center mb-2">
              <div class="text-xs">Унифицированная форма № ТОРГ-12</div>
              <div class="text-[10px] text-gray-500">Утверждена постановлением Госкомстата России от 25.12.98 № 132</div>
            </div>
            <div class="flex justify-end mb-2 text-[10px]">
              <table class="border-collapse">
                <tr>
                  <td class="border border-black px-1">Код</td>
                  <td class="border border-black px-1">Форма по ОКУД</td>
                  <td class="border border-black px-1 font-bold">0330212</td>
                </tr>
              </table>
            </div>
            <div class="mb-1">
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium text-[10px]">Грузоотправитель</div>
                <div class="col-span-8 border-b border-black border-dotted text-[10px]">${cd.address || companyName || '—'}</div>
              </div>
            </div>
            <div class="mb-1">
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium text-[10px]">Грузополучатель</div>
                <div class="col-span-8 border-b border-black border-dotted text-[10px]">${app.object_name || '—'}</div>
              </div>
            </div>
            <div class="mb-1">
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium text-[10px]">Поставщик</div>
                <div class="col-span-8 border-b border-black border-dotted text-[10px]">${companyName || '—'}, ${cd.address || ''}</div>
              </div>
            </div>
            <div class="mb-2">
              <div class="grid grid-cols-12">
                <div class="col-span-2 font-medium text-[10px]">Плательщик</div>
                <div class="col-span-8 border-b border-black border-dotted text-[10px]">${app.object_name || '—'}</div>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-2 text-[10px]">
              <div class="flex items-center">
                <span class="font-medium mr-1">Основание</span>
                <span class="border-b border-black w-32 text-center">договор № ${docNumber}</span>
                <span class="ml-1">от</span>
                <span class="border-b border-black w-20 text-center">${new Date(app.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
            <div class="flex justify-end gap-4 mb-2 text-[10px]">
              <div>
                <span class="font-medium">Номер документа</span>
                <div class="border-b border-black w-24 text-center mt-1">${docNumber}</div>
              </div>
              <div>
                <span class="font-medium">Дата составления</span>
                <div class="border-b border-black w-24 text-center mt-1">${today.toLocaleDateString('ru-RU')}</div>
              </div>
            </div>
            <div class="text-center font-bold mb-1">ТОВАРНАЯ НАКЛАДНАЯ</div>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse text-[9px] mb-2">
                <thead>
                  <tr class="border border-black">
                    <th rowspan="2" class="border border-black p-0.5 text-center w-8">№</th>
                    <th rowspan="2" class="border border-black p-0.5 text-left min-w-[150px]">Наименование</th>
                    <th colspan="2" class="border border-black p-0.5 text-center">Ед. изм.</th>
                    <th rowspan="2" class="border border-black p-0.5 text-center w-16">Упаковка</th>
                    <th colspan="2" class="border border-black p-0.5 text-center">Количество</th>
                    <th rowspan="2" class="border border-black p-0.5 text-center w-16">Масса брутто</th>
                    <th rowspan="2" class="border border-black p-0.5 text-center w-20">Масса нетто</th>
                    <th rowspan="2" class="border border-black p-0.5 text-right pr-1 w-20">Цена</th>
                    <th rowspan="2" class="border border-black p-0.5 text-right pr-1 w-24">Без НДС</th>
                    <th colspan="2" class="border border-black p-0.5 text-center">НДС</th>
                    <th rowspan="2" class="border border-black p-0.5 text-right pr-1 w-24">С НДС</th>
                  </tr>
                  <tr class="border border-black">
                    <th class="border border-black p-0.5 text-center w-12">код</th>
                    <th class="border border-black p-0.5 text-center w-16">наим.</th>
                    <th class="border border-black p-0.5 text-center w-16">в месте</th>
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
                  <tr class="border border-black font-bold">
                    <td colspan="9" class="border border-black p-1 text-right pr-2">Всего</td>
                    <td class="border border-black p-1 text-center">Х</td>
                    <td class="border border-black p-1 text-right pr-1">${withoutNds.toLocaleString('ru-RU')}</td>
                    <td class="border border-black p-1 text-center">Х</td>
                    <td class="border border-black p-1 text-right pr-1">${ndsAmount.toLocaleString('ru-RU')}</td>
                    <td class="border border-black p-1 text-right pr-1 font-bold">${totalAmount.toLocaleString('ru-RU')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div class="text-[10px] mb-2">
              <p>Товарная накладная имеет приложение на <span class="border-b border-black w-8 inline-block text-center">—</span> листах</p>
            </div>
            <div class="mt-4 pt-2 border-t border-black text-[10px]">
              <div class="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <p class="font-medium mb-1">Отпуск груза разрешил</p>
                  <div class="flex items-center gap-2">
                    <span class="border-b border-black flex-1"></span>
                    <span class="text-[9px] text-gray-500">(должность)</span>
                  </div>
                </div>
                <div>
                  <p class="font-medium mb-1">Главный бухгалтер</p>
                  <div class="flex items-center gap-2">
                    <span class="border-b border-black flex-1"></span>
                    <span class="text-[9px] text-gray-500">(подпись)</span>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="font-medium mb-1">Отпуск груза произвёл</p>
                  <div class="flex items-center gap-2">
                    <span class="border-b border-black flex-1"></span>
                    <span class="text-[9px] text-gray-500">(должность)</span>
                  </div>
                </div>
                <div>
                  <p class="font-medium mb-1">Груз получил грузополучатель</p>
                  <div class="flex items-center gap-2">
                    <span class="border-b border-black flex-1"></span>
                    <span class="text-[9px] text-gray-500">(должность)</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex justify-between mt-4 text-[10px]">
              <div class="text-center">
                <div class="border border-black w-32 h-16 mx-auto mb-1 flex items-center justify-center text-gray-400">М.П.</div>
              </div>
              <div class="text-center">
                <div class="border border-black w-32 h-16 mx-auto mb-1 flex items-center justify-center text-gray-400">М.П.</div>
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
              </div>
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Заказчик</div>
                <div class="col-span-8 border-b border-black border-dotted">${cd.customer || companyName || '—'}</div>
              </div>
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Подрядчик</div>
                <div class="col-span-8 border-b border-black border-dotted">${cd.contractor || companyName || '—'}</div>
              </div>
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Стройка</div>
                <div class="col-span-10 border-b border-black border-dotted">${app.object_name || '—'}</div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div class="flex items-center">
                <span class="font-medium mr-2">Договор №</span>
                <span class="border-b border-black w-24 text-center">${docNumber}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">от</span>
                <span class="border-b border-black w-24 text-center">${new Date(app.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div class="flex items-center">
                <span class="font-medium mr-2">Номер</span>
                <span class="border-b border-black w-32 text-center">${docNumber}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">Дата</span>
                <span class="border-b border-black w-32 text-center">${today.toLocaleDateString('ru-RU')}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">Период:</span>
                <span class="border-b border-black w-20 text-center">с ${startDate.toLocaleDateString('ru-RU')}</span>
                <span class="mx-1">по</span>
                <span class="border-b border-black w-20 text-center">${endDate.toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
            <div class="text-center my-6">
              <div class="text-lg font-bold">АКТ</div>
              <div class="text-md font-semibold">О ПРИЕМКЕ ВЫПОЛНЕННЫХ РАБОТ</div>
            </div>
            <div class="flex justify-between items-center mb-6 text-sm">
              <span>Сметная стоимость:</span>
              <div class="flex items-center gap-2">
                <span class="border-b border-black w-32 text-right">${totalAmount.toLocaleString('ru-RU')}</span>
                <span>руб.</span>
              </div>
            </div>
            <table class="w-full border-collapse text-sm mb-4">
              <thead>
                <tr class="border border-black">
                  <th class="border border-black p-1 text-center w-12">№</th>
                  <th class="border border-black p-1 text-left">Наименование работ</th>
                  <th class="border border-black p-1 text-center">Ед. изм.</th>
                  <th class="border border-black p-1 text-center">Кол-во</th>
                  <th class="border border-black p-1 text-center">Цена</th>
                  <th class="border border-black p-1 text-center">Стоимость</th>
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
                      <td class="border border-black p-1">${m.description || '—'}</td>
                      <td class="border border-black p-1 text-center">${m.unit || 'шт'}</td>
                      <td class="border border-black p-1 text-center">${received.toLocaleString('ru-RU')}</td>
                      <td class="border border-black p-1 text-right pr-2">${price.toLocaleString('ru-RU')}</td>
                      <td class="border border-black p-1 text-right pr-2">${total.toLocaleString('ru-RU')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr class="border border-black">
                  <td colspan="5" class="border border-black p-1 text-right font-bold pr-4">Итого</td>
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
                  <div class="mt-2 text-xs text-gray-500">(должность, подпись)</div>
                  <div class="mt-2">М.П.</div>
                </div>
                <div>
                  <div class="flex items-center gap-4">
                    <span>Принял</span>
                    <div class="flex-1 border-b border-black"></div>
                  </div>
                  <div class="mt-2 text-xs text-gray-500">(должность, подпись)</div>
                  <div class="mt-2">М.П.</div>
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
              </div>
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Заказчик</div>
                <div class="col-span-8 border-b border-black border-dotted">${cd.customer || companyName || '—'}</div>
              </div>
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Подрядчик</div>
                <div class="col-span-8 border-b border-black border-dotted">${cd.contractor || companyName || '—'}</div>
              </div>
              <div class="grid grid-cols-12 mt-2">
                <div class="col-span-2 font-medium">Стройка</div>
                <div class="col-span-10 border-b border-black border-dotted">${app.object_name || '—'}</div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div class="flex items-center">
                <span class="font-medium mr-2">Договор №</span>
                <span class="border-b border-black w-24 text-center">${docNumber}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">от</span>
                <span class="border-b border-black w-24 text-center">${new Date(app.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div class="flex items-center">
                <span class="font-medium mr-2">Номер</span>
                <span class="border-b border-black w-32 text-center">${docNumber}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">Дата</span>
                <span class="border-b border-black w-32 text-center">${today.toLocaleDateString('ru-RU')}</span>
              </div>
              <div class="flex items-center">
                <span class="font-medium mr-2">Период:</span>
                <span class="border-b border-black w-20 text-center">с ${startDate.toLocaleDateString('ru-RU')}</span>
                <span class="mx-1">по</span>
                <span class="border-b border-black w-20 text-center">${endDate.toLocaleDateString('ru-RU')}</span>
              </div>
            </div>
            <div class="text-center my-6">
              <div class="text-lg font-bold">СПРАВКА</div>
              <div class="text-md font-semibold">О СТОИМОСТИ ВЫПОЛНЕННЫХ РАБОТ</div>
            </div>
            <table class="w-full border-collapse text-sm mb-4">
              <thead>
                <tr class="border border-black">
                  <th class="border border-black p-1 text-center w-12">№</th>
                  <th class="border border-black p-1 text-left">Наименование работ</th>
                  <th class="border border-black p-1 text-center">С начала работ</th>
                  <th class="border border-black p-1 text-center">За отчетный период</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border border-black">
                  <td class="border border-black p-1 text-center">1</td>
                  <td class="border border-black p-1">Всего работ и затрат</td>
                  <td class="border border-black p-1 text-right pr-2">${totalAmount.toLocaleString('ru-RU')}</td>
                  <td class="border border-black p-1 text-right pr-2">${totalAmount.toLocaleString('ru-RU')}</td>
                </tr>
                ${app.materials.map((m) => {
                  const received = Number(m.supplier_received_quantity || m.received || 0);
                  const price = Number(m.price) || 1000;
                  const total = received * price;
                  return `
                    <tr class="border border-black">
                      <td class="border border-black p-1 text-center">2</td>
                      <td class="border border-black p-1 pl-8">${m.description}</td>
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
                </tr>
                <tr class="border border-black">
                  <td colspan="3" class="border border-black p-1 text-right pr-4">Сумма НДС</td>
                  <td class="border border-black p-1 text-right pr-2">${ndsAmount.toLocaleString('ru-RU')}</td>
                </tr>
                <tr class="border border-black">
                  <td colspan="3" class="border border-black p-1 text-right font-bold pr-4">Всего с НДС</td>
                  <td class="border border-black p-1 text-right pr-2 font-bold">${(totalAmount + ndsAmount).toLocaleString('ru-RU')}</td>
                </tr>
              </tfoot>
            </table>
            <div class="mt-8 pt-4">
              <div class="grid grid-cols-2 gap-8">
                <div>
                  <div class="flex items-center gap-4">
                    <span>Заказчик</span>
                    <div class="flex-1 border-b border-black"></div>
                  </div>
                  <div class="mt-2 text-xs text-gray-500">(должность, подпись)</div>
                  <div class="mt-2">М.П.</div>
                </div>
                <div>
                  <div class="flex items-center gap-4">
                    <span>Подрядчик</span>
                    <div class="flex-1 border-b border-black"></div>
                  </div>
                  <div class="mt-2 text-xs text-gray-500">(должность, подпись)</div>
                  <div class="mt-2">М.П.</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      
      case 'hidden_works': {
        const today = new Date();
        const cd = companyDetails || {};
        const worksRows = app.materials.map((m, idx) => `
          <tr class="border border-black">
            <td class="border border-black p-1 text-center w-8">${idx + 1}</td>
            <td class="border border-black p-1">${m.description || '—'}</td>
            <td class="border border-black p-1 text-center w-16">${m.unit || 'шт'}</td>
            <td class="border border-black p-1 text-center w-20">${Number(m.quantity).toLocaleString('ru-RU')}</td>
            <td class="border border-black p-1 text-center w-24">—</td>
            <td class="border border-black p-1 text-center w-32">✓ Соответствует</td>
          </tr>
        `).join('');
        return `
          <div class="p-6 bg-white rounded-xl shadow-sm max-w-5xl mx-auto font-sans text-sm print:p-4">
            <div class="text-center mb-4">
              <div class="text-lg font-bold">АКТ</div>
              <div class="text-md font-semibold">на скрытые работы № ${docNumber}</div>
              <div class="text-xs text-gray-500 mt-1">от ${today.toLocaleDateString('ru-RU')}</div>
            </div>
            <div class="space-y-2 mb-4 text-xs">
              <div class="grid grid-cols-12">
                <div class="col-span-3 font-medium">Объект</div>
                <div class="col-span-9 border-b border-black border-dotted">${app.object_name || '—'}</div>
              </div>
              <div class="grid grid-cols-12">
                <div class="col-span-3 font-medium">Адрес</div>
                <div class="col-span-9 border-b border-black border-dotted">${cd.address || '—'}</div>
              </div>
              <div class="grid grid-cols-12">
                <div class="col-span-3 font-medium">Заказчик</div>
                <div class="col-span-9 border-b border-black border-dotted">${cd.customer || companyName || '—'}</div>
              </div>
              <div class="grid grid-cols-12">
                <div class="col-span-3 font-medium">Подрядчик</div>
                <div class="col-span-9 border-b border-black border-dotted">${companyName || '—'}</div>
              </div>
            </div>
            <div class="mb-4">
              <p class="font-medium mb-2">Перечень работ:</p>
              <table class="w-full border-collapse text-xs">
                <thead>
                  <tr class="border border-black bg-gray-50">
                    <th class="border border-black p-1 text-center w-8">№</th>
                    <th class="border border-black p-1 text-left">Наименование</th>
                    <th class="border border-black p-1 text-center w-16">Ед.</th>
                    <th class="border border-black p-1 text-center w-20">Объём</th>
                    <th class="border border-black p-1 text-center w-24">Отметки</th>
                    <th class="border border-black p-1 text-center w-32">Качество</th>
                  </tr>
                </thead>
                <tbody>${worksRows}</tbody>
              </table>
            </div>
            <div class="mb-6 p-3 bg-gray-50 rounded border border-gray-200">
              <p class="font-medium mb-2">Заключение:</p>
              <p class="text-xs">Работы выполнены в соответствии с проектной документацией. Претензий к качеству нет. Работы приняты.</p>
            </div>
            <div class="mt-8 pt-4 border-t border-black text-xs">
              <div class="grid grid-cols-2 gap-8">
                <div>
                  <p class="font-medium mb-3">Представитель подрядчика</p>
                  <div class="flex items-center gap-2">
                    <span class="border-b border-black w-24"></span>
                    <span class="text-gray-500">(подпись)</span>
                    <span class="border-b border-black flex-1 ml-2"></span>
                    <span class="text-gray-500">${app.foreman_name || '(расшифровка)'}</span>
                  </div>
                </div>
                <div>
                  <p class="font-medium mb-3">Представитель технадзора</p>
                  <div class="flex items-center gap-2">
                    <span class="border-b border-black w-24"></span>
                    <span class="text-gray-500">(подпись)</span>
                    <span class="border-b border-black flex-1 ml-2"></span>
                    <span class="text-gray-500">(расшифровка)</span>
                  </div>
                </div>
              </div>
              <div class="flex justify-between mt-6 text-center text-gray-400">
                <div>М.П.<br/>«___» ______ 20__ г.</div>
                <div>М.П.<br/>«___» ______ 20__ г.</div>
              </div>
            </div>
          </div>
        `;
      }
      
      case 'executive_diagram': {
        const filesListHtml = projectFiles.length > 0 ? `
          <div class="mb-6">
            <p class="font-medium mb-2">📎 Приложенная проектная документация (${projectFiles.length} файл.):</p>
            <ul class="space-y-1 text-sm">
              ${projectFiles.map(f => `
                <li class="flex justify-between border-b border-gray-100 pb-1">
                  <span>${getFileIcon(f.file_name)} ${f.file_name}</span>
                  <span class="text-gray-500">${new Date(f.created_at).toLocaleDateString('ru-RU')} (${formatFileSize(f.file_size)})</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : '';
        
        return `
          <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm max-w-4xl mx-auto">
            <h1 class="text-xl font-bold text-center mb-4">ИСПОЛНИТЕЛЬНАЯ СХЕМА</h1>
            <div class="grid grid-cols-2 gap-4 text-sm mb-6">
              <p><strong>Объект:</strong> ${app.object_name}</p>
              <p><strong>Дата:</strong> ${date}</p>
              <p><strong>Прораб:</strong> ${app.foreman_name}</p>
              <p><strong>№ заявки:</strong> ${docNumber}</p>
            </div>
            ${filesListHtml}
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
        const cd = companyDetails || {};
        
        const materialsRows = app.materials.map((m, idx) => {
          const qty = Number(m.quantity) || 0;
          const price = Number(m.price) || 1000;
          const itemTotal = qty * price;
          return `
            <tr class="border border-black">
              <td class="border border-black p-1 text-center w-8">${idx + 1}</td>
              <td class="border border-black p-1">${m.description || '—'}</td>
              <td class="border border-black p-1 text-center w-12">${m.unit || 'шт'}</td>
              <td class="border border-black p-1 text-center w-16">${qty.toLocaleString('ru-RU')}</td>
              <td class="border border-black p-1 text-right pr-2 w-24">${price.toLocaleString('ru-RU')}</td>
              <td class="border border-black p-1 text-right pr-2 w-28 font-medium">${itemTotal.toLocaleString('ru-RU')}</td>
            </tr>
          `;
        }).join('');

        return `
          <div class="p-6 bg-white rounded-xl shadow-sm max-w-5xl mx-auto font-sans text-sm print:p-4">
            <div class="flex justify-between items-start mb-6 border-b border-black pb-4">
              <div class="w-1/2 pr-4">
                <p class="font-bold text-lg mb-2">ПОСТАВЩИК:</p>
                <p class="text-xs"><strong>${cd.name || companyName || '—'}</strong></p>
                <p class="text-xs">Адрес: ${cd.address || '—'}</p>
                <p class="text-xs">ИНН/КПП: ${cd.inn || '—'} / ${cd.kpp || '—'}</p>
                <p class="text-xs mt-2"><strong>Банковские реквизиты:</strong></p>
                <p class="text-xs">Банк: ${cd.bank_name || '—'}</p>
                <p class="text-xs">БИК: ${cd.bik || '—'}</p>
                <p class="text-xs">Р/с: ${cd.account_number || '—'}</p>
              </div>
              <div class="w-1/2 pl-4 border-l border-black">
                <p class="font-bold text-lg mb-2">ПОКУПАТЕЛЬ:</p>
                <p class="text-xs"><strong>${app.object_name || '—'}</strong></p>
                <p class="text-xs">Контактное лицо: ${app.foreman_name || '—'}</p>
              </div>
            </div>
            <div class="text-center mb-4">
              <h1 class="text-2xl font-bold">СЧЕТ № ${docNumber}</h1>
              <p class="text-sm text-gray-600">от ${today.toLocaleDateString('ru-RU')}</p>
            </div>
            <div class="mb-4 p-3 bg-gray-50 rounded border border-gray-200 text-xs">
              <p><strong>Основание:</strong> Заявка от ${new Date(app.created_at).toLocaleDateString('ru-RU')}</p>
            </div>
            <table class="w-full border-collapse text-xs mb-4">
              <thead>
                <tr class="border border-black bg-gray-50">
                  <th class="border border-black p-1 text-center w-8">№</th>
                  <th class="border border-black p-1 text-left">Наименование</th>
                  <th class="border border-black p-1 text-center w-12">Ед.</th>
                  <th class="border border-black p-1 text-center w-16">Кол-во</th>
                  <th class="border border-black p-1 text-right pr-2 w-24">Цена</th>
                  <th class="border border-black p-1 text-right pr-2 w-28">Сумма</th>
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
                  <td colspan="5" class="border border-black p-1 text-right pr-4 text-lg">Всего к оплате:</td>
                  <td class="border border-black p-1 text-right pr-2 text-lg font-bold">${totalAmount.toLocaleString('ru-RU')}</td>
                </tr>
              </tfoot>
            </table>
            <div class="mb-4 text-xs">
              <p>Всего к оплате прописью: <span class="border-b border-black w-full inline-block"></span></p>
            </div>
            <div class="mt-8 pt-4 border-t border-black text-xs">
              <div class="grid grid-cols-2 gap-8">
                <div>
                  <p class="font-medium mb-3">Руководитель</p>
                  <div class="flex items-center gap-2">
                    <span class="border-b border-black flex-1"></span>
                    <span class="text-gray-500">(подпись)</span>
                  </div>
                </div>
                <div>
                  <p class="font-medium mb-3">Главный бухгалтер</p>
                  <div class="flex items-center gap-2">
                    <span class="border-b border-black flex-1"></span>
                    <span class="text-gray-500">(подпись)</span>
                  </div>
                </div>
              </div>
              <div class="text-center mt-6 text-gray-400 text-xs">М.П.</div>
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
                <p>Р/с: ${account}</p>
              </div>
              <div>
                <p><strong>Покупатель:</strong></p>
                <p>${app.object_name}</p>
              </div>
            </div>
            <table class="w-full border-collapse text-left text-sm mb-6">
              <thead>
                <tr class="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300">
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
          </div>`;
      }
      
      default: 
        return '';
    }
  }, [companyDetails, companyName, projectFiles]);

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
      showNotification?.('✅ Все документы сформированы', 'success');
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
        {(userRole === 'master' || userRole === 'foreman') && (
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            📋 Вам доступны: Журнал работ и Исполнительная схема
          </p>
        )}
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

        {/* ✅ Блок загрузки и отображения PDF с улучшениями */}
        {activeTab === 'executive_diagram' && selectedAppId && (
          <div className="mb-4 no-print">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center bg-gray-50 dark:bg-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  Проектная документация ({projectFiles.length})
                </h4>
                <div className="flex gap-2">
                  <label className="px-4 py-2 text-sm bg-[#4A6572] text-white rounded hover:bg-[#344955] cursor-pointer inline-flex items-center gap-2 transition-colors">
                    <Upload className="w-4 h-4" />
                    {uploadingFile ? `Загрузка ${uploadProgress}%` : 'Загрузить файл'}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,.dwg,.dxf,.zip,.rar,.png,.jpg,.jpeg,.gif,.bmp,.svg"
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              
              {uploadingFile && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div 
                    className="bg-[#4A6572] h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-1">{uploadProgress}%</span>
                </div>
              )}
              
              {loadingFiles ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Загрузка файлов...</span>
                </div>
              ) : projectFiles.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {projectFiles.map(file => {
                    const canDelete = file.uploaded_by === user.id || userRole === 'director' || userRole === 'admin';
                    return (
                      <div 
                        key={file.id} 
                        className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <span className="text-2xl">{getFileIcon(file.file_name)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(file.created_at).toLocaleString('ru-RU')} • 
                            {formatFileSize(file.file_size)}
                            {file.uploaded_by === user.id && ' • (Вы)'}
                          </p>
                        </div>
                        <a 
                          href={file.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title="Открыть файл"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDownloadFile(file.file_url, file.file_name)}
                          className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                          title="Скачать файл"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button 
                            onClick={() => handleDeleteFile(file.id, file.file_url)}
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Удалить файл"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                  Файлы не загружены. Загрузите проектную документацию для этой заявки.
                </p>
              )}
            </div>
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