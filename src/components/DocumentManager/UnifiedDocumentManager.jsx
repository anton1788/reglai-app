// src/components/DocumentManager/UnifiedDocumentManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, FileText, Download, Printer, Calendar, Package, ClipboardList, Truck, 
  Loader2, AlertCircle, FileCheck, Ruler, Receipt, Check, Upload, Paperclip,
  ChevronRight, Building, Plus, Minus, History, CheckCircle, Clock, 
  Eye, CreditCard, FolderOpen, Layers, ShoppingBag, Users, Briefcase,
  BarChart3, FileWarning, TrendingUp, TrendingDown, DollarSign, Filter, Search,
  ChevronDown, ChevronUp, Edit, Trash2, MoreVertical, Send, UserCheck,
  ThumbsUp, ThumbsDown, MinusCircle, Archive, RefreshCw
} from 'lucide-react';

// ==================== КОНСТАНТЫ ====================

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

const CONTRACT_STATUSES = {
  draft: { label: 'Черновик', color: 'bg-gray-100 text-gray-700', icon: FileText, nextStatuses: ['pending_approval'] },
  pending_approval: { label: 'На согласовании', color: 'bg-yellow-100 text-yellow-700', icon: Clock, nextStatuses: ['active', 'rejected'] },
  active: { label: 'Активен', color: 'bg-green-100 text-green-700', icon: CheckCircle, nextStatuses: ['suspended', 'completed'] },
  suspended: { label: 'Заморожен', color: 'bg-blue-100 text-blue-700', icon: MinusCircle, nextStatuses: ['active', 'terminated'] },
  completed: { label: 'Завершён', color: 'bg-purple-100 text-purple-700', icon: FileCheck, nextStatuses: [] },
  terminated: { label: 'Расторгнут', color: 'bg-orange-100 text-orange-700', icon: FileWarning, nextStatuses: [] },
  rejected: { label: 'Отклонён', color: 'bg-red-100 text-red-700', icon: ThumbsDown, nextStatuses: ['draft'] }
};

const DOCUMENT_STATUSES = {
  draft: { label: 'Черновик', color: 'bg-gray-100 text-gray-700' },
  pending: { label: 'На подписи', color: 'bg-yellow-100 text-yellow-700' },
  signed: { label: 'Подписан', color: 'bg-green-100 text-green-700' },
  sent: { label: 'Отправлен', color: 'bg-blue-100 text-blue-700' },
  rejected: { label: 'Отклонён', color: 'bg-red-100 text-red-700' }
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

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('ru-RU');
};

const formatCurrency = (amount) => {
  if (!amount) return '0 ₽';
  return amount.toLocaleString('ru-RU') + ' ₽';
};

// ==================== ОСНОВНОЙ КОМПОНЕНТ ====================

export const UnifiedDocumentManager = ({ 
  companyId, 
  clientId, 
  clientName, 
  applications = [],
  user,
  userRole,
  showNotification,
  companyName,
  supabase: supabaseClient,
  onClose 
}) => {
  // ==================== СОСТОЯНИЯ ====================
  const [activeModule, setActiveModule] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Данные
  const [contracts, setContracts] = useState([]);
  const [generatedDocs, setGeneratedDocs] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Состояния для договоров
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showContractDetails, setShowContractDetails] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedContract, setExpandedContract] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Состояния для нового договора
  const [newContract, setNewContract] = useState({
    contract_number: '',
    contract_date: new Date().toISOString().split('T')[0],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    amount: '',
    description: '',
    file: null
  });
  
  // Состояния для генератора документов
  const [activeDocType, setActiveDocType] = useState('work_act');
  const [selectedAppId, setSelectedAppId] = useState('');
  const [selectedAppIds, setSelectedAppIds] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const printRef = React.useRef(null);

  // ==================== ЗАГРУЗКА ДАННЫХ ====================
  
  const loadContracts = useCallback(async () => {
    try {
      const { data, error } = await supabaseClient
        .from('contracts')
        .select('*')
        .eq('company_id', companyId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Ошибка загрузки договоров:', error);
    }
  }, [supabaseClient, companyId, clientId]);

  const loadGeneratedDocs = useCallback(async () => {
    if (applications.length === 0) {
      setGeneratedDocs([]);
      return;
    }
    try {
      const { data, error } = await supabaseClient
        .from('generated_documents')
        .select('*')
        .eq('company_id', companyId)
        .in('application_id', applications.map(a => a.id))
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGeneratedDocs(data || []);
    } catch (error) {
      console.error('Ошибка загрузки документов:', error);
    }
  }, [supabaseClient, companyId, applications]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadContracts(), loadGeneratedDocs()]);
    setLoading(false);
  }, [loadContracts, loadGeneratedDocs]);

  // Обновление статистики при изменении данных
  useEffect(() => {
    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const pendingContracts = contracts.filter(c => c.status === 'pending_approval').length;
    const totalDocuments = generatedDocs.length;
    const signedDocuments = generatedDocs.filter(d => d.status === 'signed').length;
    const totalContractAmount = contracts.reduce((sum, c) => sum + (c.amount || 0), 0);
    
    setStats({
      activeContracts,
      pendingContracts,
      totalDocuments,
      signedDocuments,
      totalContracts: contracts.length,
      totalContractAmount,
      draftContracts: contracts.filter(c => c.status === 'draft').length,
      suspendedContracts: contracts.filter(c => c.status === 'suspended').length,
      completedContracts: contracts.filter(c => c.status === 'completed').length,
      documentsByType: {
        work_act: generatedDocs.filter(d => d.document_type === 'work_act').length,
        invoice: generatedDocs.filter(d => d.document_type === 'invoice').length,
        invoice_bill: generatedDocs.filter(d => d.document_type === 'invoice_bill').length,
        ks2: generatedDocs.filter(d => d.document_type === 'ks2').length,
        ks3: generatedDocs.filter(d => d.document_type === 'ks3').length,
      }
    });
  }, [contracts, generatedDocs]);

  useEffect(() => {
    if (companyId && clientId) {
      loadAllData();
    }
  }, [companyId, clientId, loadAllData]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = PRINT_STYLES;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // ==================== ФУНКЦИИ ДЛЯ ДОГОВОРОВ ====================

  const uploadFile = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `contracts/${companyId}/${clientId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseClient.storage
      .from('documents')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const createContract = async () => {
    if (!newContract.contract_number) {
      showNotification?.('Введите номер договора', 'error');
      return;
    }

    setUploading(true);
    try {
      let fileUrl = null;
      if (newContract.file) {
        fileUrl = await uploadFile(newContract.file);
      }

      const { error } = await supabaseClient
        .from('contracts')
        .insert([{
          company_id: companyId,
          client_id: clientId,
          contract_number: newContract.contract_number,
          contract_date: newContract.contract_date,
          start_date: newContract.start_date,
          end_date: newContract.end_date || null,
          amount: parseFloat(newContract.amount) || 0,
          description: newContract.description,
          file_url: fileUrl,
          status: 'draft',
          created_by: user?.id,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      await loadContracts();
      setShowContractModal(false);
      setNewContract({
        contract_number: '',
        contract_date: new Date().toISOString().split('T')[0],
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        amount: '',
        description: '',
        file: null
      });
      showNotification?.('Договор успешно создан', 'success');
    } catch (error) {
      console.error('Ошибка создания договора:', error);
      showNotification?.('Ошибка при создании договора', 'error');
    } finally {
      setUploading(false);
    }
  };

  const updateContractStatus = async (contractId, status, comment = '') => {
    try {
      const { error } = await supabaseClient
        .from('contracts')
        .update({
          status: status,
          updated_at: new Date().toISOString(),
          ...(comment && { last_comment: comment })
        })
        .eq('id', contractId);

      if (error) throw error;

      await loadContracts();
      setShowCommentModal(false);
      setCommentText('');
      setNewStatus('');
      showNotification?.(`Статус договора изменён на ${CONTRACT_STATUSES[status]?.label}`, 'success');
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      showNotification?.('Ошибка при обновлении статуса', 'error');
    }
  };

  const downloadFile = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Ошибка скачивания:', error);
      showNotification?.('Ошибка при скачивании файла', 'error');
    }
  };

  // ==================== ФУНКЦИИ ДЛЯ ГЕНЕРАТОРА ДОКУМЕНТОВ ====================

  const selectedApp = applications.find(a => a.id === selectedAppId);
  
  const eligibleApps = applications.filter(app => {
    if (userRole === 'master' || userRole === 'foreman') return app.user_id === user?.id;
    return true;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const saveGeneratedDocument = async (docType, app, htmlContent) => {
    if (!supabaseClient || !companyId || !user?.id) return null;
    try {
      const { error } = await supabaseClient
        .from('generated_documents')
        .insert([{
          company_id: companyId,
          application_id: app.id,
          document_type: docType,
          generated_by: user.id,
          content_html: htmlContent,
          status: 'draft',
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Не удалось сохранить документ:', err);
      return null;
    }
  };

  const generateTemplate = (type, app) => {
    if (!app) return '';
    const date = new Date(app.created_at).toLocaleDateString('ru-RU');
    const docNumber = app.id?.slice(0, 8).toUpperCase() || '---';
    
    const signatures = `
      <div class="mt-8 pt-4 border-t border-gray-300 flex justify-between">
        <div class="text-center w-1/2">
          <p class="text-sm text-gray-500">Исполнитель</p>
          <p class="mt-8 border-b border-gray-400 w-3/4 mx-auto"></p>
          <p class="text-xs mt-1">(${app.foreman_name || '—'})</p>
        </div>
        <div class="text-center w-1/2">
          <p class="text-sm text-gray-500">Заказчик</p>
          <p class="mt-8 border-b border-gray-400 w-3/4 mx-auto"></p>
          <p class="text-xs mt-1">(${clientName || '—'})</p>
        </div>
      </div>
    `;

    switch (type) {
      case 'work_act': {
        const totalAmount = app.materials?.reduce((sum, m) => 
          sum + (Number(m.quantity) * (Number(m.price) || 1000)), 0
        ) || 0;
        
        const materialsRows = app.materials?.map((m, idx) => `
          <tr class="border border-black">
            <td class="border border-black p-1 text-center">${idx + 1}</td>
            <td class="border border-black p-1">${m.description || '—'}</td>
            <td class="border border-black p-1 text-center">${m.unit || 'шт'}</td>
            <td class="border border-black p-1 text-center">${Number(m.quantity).toLocaleString('ru-RU')}</td>
            <td class="border border-black p-1 text-right pr-2">${(Number(m.price) || 1000).toLocaleString('ru-RU')}</td>
            <td class="border border-black p-1 text-right pr-2 font-medium">${(Number(m.quantity) * (Number(m.price) || 1000)).toLocaleString('ru-RU')}</td>
          </tr>
        `).join('') || '';

        return `
          <div class="p-4 bg-white max-w-5xl mx-auto font-sans text-sm">
            <div class="text-center mb-4">
              <div class="text-lg font-bold">АКТ № ${docNumber}</div>
              <div class="text-md">о приёмке выполненных работ</div>
              <div class="text-xs text-gray-500">от ${date}</div>
            </div>
            <div class="mb-4">
              <p><strong>Объект:</strong> ${app.object_name || '—'}</p>
              <p><strong>Заказчик:</strong> ${clientName || '—'}</p>
              <p><strong>Подрядчик:</strong> ${companyName || '—'}</p>
            </div>
            <table class="w-full border-collapse text-xs mb-4">
              <thead>
                <tr class="border border-black bg-gray-50">
                  <th class="border border-black p-1 text-center">№</th>
                  <th class="border border-black p-1 text-left">Наименование работ</th>
                  <th class="border border-black p-1 text-center">Ед.</th>
                  <th class="border border-black p-1 text-center">Кол-во</th>
                  <th class="border border-black p-1 text-right">Цена</th>
                  <th class="border border-black p-1 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>${materialsRows}</tbody>
              <tfoot>
                <tr class="border border-black font-bold">
                  <td colspan="5" class="border border-black p-1 text-right">Итого:</td>
                  <td class="border border-black p-1 text-right">${formatCurrency(totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
            ${signatures}
          </div>
        `;
      }
      
      default:
        return `<div class="p-8 text-center">Документ "${DOCS.find(d => d.id === type)?.label}" в разработке</div>`;
    }
  };

  const handleGenerate = async () => {
    if (!selectedApp) {
      showNotification?.('Выберите заявку для формирования документа', 'warning');
      return;
    }
    setIsGenerating(true);
    try {
      const html = generateTemplate(activeDocType, selectedApp);
      setPreviewHtml(html);
      await saveGeneratedDocument(activeDocType, selectedApp, html);
      await loadGeneratedDocs();
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
        
        const html = generateTemplate(activeDocType, app);
        if (!html) continue;
        
        await saveGeneratedDocument(activeDocType, app, html);
        setPreviewHtml(html);
        await new Promise(resolve => setTimeout(resolve, 300));
        window.print();
        
        if (selectedAppIds.indexOf(appId) < selectedAppIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      await loadGeneratedDocs();
      showNotification?.('✅ Все документы сформированы и отправлены на печать', 'success');
    } catch (err) {
      console.error('Ошибка пакетной печати:', err);
      showNotification?.('❌ Ошибка при пакетной печати', 'error');
    } finally {
      setIsGenerating(false);
      setPreviewHtml('');
    }
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

  // ==================== ФИЛЬТРАЦИЯ ДАННЫХ ====================

  const filteredContracts = contracts.filter(contract => {
    if (filterStatus !== 'all' && contract.status !== filterStatus) return false;
    if (searchTerm) {
      return contract.contract_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             contract.description?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  // ==================== КОМПОНЕНТЫ МОДУЛЕЙ ====================

  const ModulesNav = () => {
    const modules = [
      { id: 'overview', label: 'Обзор', icon: BarChart3, description: 'Общая статистика' },
      { id: 'contracts', label: 'Договоры', icon: FileCheck, description: 'Управление договорами', count: contracts.length },
      { id: 'documents', label: 'Документы', icon: FileText, description: 'Генерация документов', count: generatedDocs.length },
      { id: 'analytics', label: 'Аналитика', icon: TrendingUp, description: 'Детальная аналитика' }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {modules.map(module => {
          const Icon = module.icon;
          const isActive = activeModule === module.id;
          return (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={`p-4 rounded-xl text-left transition-all ${
                isActive 
                  ? 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white shadow-lg' 
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-[#4A6572]'}`} />
                {module.count !== undefined && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}>
                    {module.count}
                  </span>
                )}
              </div>
              <p className={`font-semibold ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {module.label}
              </p>
              <p className={`text-xs mt-1 ${isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                {module.description}
              </p>
            </button>
          );
        })}
      </div>
    );
  };

  const OverviewModule = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Договоров</p>
              <p className="text-2xl font-bold text-blue-700">{stats?.totalContracts || 0}</p>
            </div>
            <FileCheck className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Активных</p>
              <p className="text-2xl font-bold text-green-700">{stats?.activeContracts || 0}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Документов</p>
              <p className="text-2xl font-bold text-purple-700">{stats?.totalDocuments || 0}</p>
            </div>
            <FileText className="w-10 h-10 text-purple-500 opacity-50" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Сумма договоров</p>
              <p className="text-xl font-bold text-orange-700">{formatCurrency(stats?.totalContractAmount || 0)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-green-600" />
            Последние договоры
          </h4>
          <div className="space-y-2">
            {contracts.slice(0, 5).map(contract => (
              <div key={contract.id} className="flex justify-between items-center p-2 hover:bg-white rounded-lg">
                <div>
                  <p className="font-medium">{contract.contract_number}</p>
                  <p className="text-xs text-gray-500">{formatDate(contract.contract_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${CONTRACT_STATUSES[contract.status]?.color}`}>
                    {CONTRACT_STATUSES[contract.status]?.label}
                  </span>
                  <span className="text-sm font-medium">{formatCurrency(contract.amount)}</span>
                </div>
              </div>
            ))}
            {contracts.length === 0 && (
              <p className="text-center text-gray-500 py-4">Нет договоров</p>
            )}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Последние документы
          </h4>
          <div className="space-y-2">
            {generatedDocs.slice(0, 5).map(doc => (
              <div key={doc.id} className="flex justify-between items-center p-2 hover:bg-white rounded-lg">
                <div>
                  <p className="font-medium">{DOCS.find(d => d.id === doc.document_type)?.label || doc.document_type}</p>
                  <p className="text-xs text-gray-500">{formatDate(doc.created_at)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${DOCUMENT_STATUSES[doc.status || 'draft']?.color}`}>
                  {DOCUMENT_STATUSES[doc.status || 'draft']?.label}
                </span>
              </div>
            ))}
            {generatedDocs.length === 0 && (
              <p className="text-center text-gray-500 py-4">Нет документов</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#4A6572]/5 to-transparent rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-gray-500">Клиент</p>
            <p className="font-semibold">{clientName || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Активных договоров</p>
            <p className="font-semibold text-green-600">{stats?.activeContracts || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Сгенерировано документов</p>
            <p className="font-semibold text-blue-600">{stats?.totalDocuments || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Подписано документов</p>
            <p className="font-semibold text-purple-600">{stats?.signedDocuments || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const ContractsModule = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowContractModal(true)}
          className="px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#3d5460] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Создать договор
        </button>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border rounded-lg w-48"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border rounded-lg"
          >
            <option value="all">Все статусы</option>
            {Object.entries(CONTRACT_STATUSES).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredContracts.map(contract => {
          const status = CONTRACT_STATUSES[contract.status] || CONTRACT_STATUSES.draft;
          const StatusIcon = status.icon;
          const isExpanded = expandedContract === contract.id;
          
          return (
            <div key={contract.id} className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                   onClick={() => setExpandedContract(isExpanded ? null : contract.id)}>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h4 className="font-semibold text-lg">{contract.contract_number}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                      <span>📅 Дата: {formatDate(contract.contract_date)}</span>
                      <span>💰 {formatCurrency(contract.amount)}</span>
                      {contract.end_date && <span>⏰ До: {formatDate(contract.end_date)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {contract.file_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(contract.file_url, `contract_${contract.contract_number}.pdf`);
                        }}
                        className="p-2 hover:bg-gray-200 rounded-lg"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedContract(contract);
                        setShowContractDetails(true);
                      }}
                      className="p-2 hover:bg-gray-200 rounded-lg"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>
              
              {isExpanded && (
                <div className="p-4 border-t bg-white">
                  {contract.description && (
                    <p className="text-sm text-gray-600 mb-3">{contract.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {status.nextStatuses.map(nextStatus => {
                      const nextStatusInfo = CONTRACT_STATUSES[nextStatus];
                      if (!nextStatusInfo) return null;
                      return (
                        <button
                          key={nextStatus}
                          onClick={() => {
                            setSelectedContract(contract);
                            setNewStatus(nextStatus);
                            setShowCommentModal(true);
                          }}
                          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 transition-colors
                            ${nextStatus === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                              nextStatus === 'suspended' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                              nextStatus === 'completed' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                              'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          <nextStatusInfo.icon className="w-3 h-3" />
                          {nextStatusInfo.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {filteredContracts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-3 opacity-50" />
            <p>Нет договоров</p>
          </div>
        )}
      </div>
    </div>
  );

  const DocumentsModule = () => (
    <div className="space-y-5">
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {DOCS.map(doc => (
            <button
              key={doc.id}
              onClick={() => setActiveDocType(doc.id)}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 transition-colors ${
                activeDocType === doc.id
                  ? 'bg-[#4A6572] text-white'
                  : 'bg-white border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <doc.icon className="w-3 h-3" />
              {doc.label}
            </button>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-1">Выберите заявку</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">— Не выбрано —</option>
              {eligibleApps.map(app => (
                <option key={app.id} value={app.id}>
                  {app.object_name} • {new Date(app.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleGenerate}
              disabled={!selectedAppId || isGenerating}
              className="px-4 py-2 bg-[#4A6572] text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Сформировать
            </button>
            <button
              onClick={handlePrint}
              disabled={!previewHtml}
              className="px-4 py-2 bg-gray-200 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Печать
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium">Пакетная печать</h4>
            <button onClick={selectAllApps} className="text-xs text-[#4A6572] hover:underline">
              {selectedAppIds.length === eligibleApps.length ? 'Снять все' : 'Выбрать все'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {eligibleApps.slice(0, 10).map(app => (
              <label key={app.id} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAppIds.includes(app.id)}
                  onChange={() => toggleAppSelection(app.id)}
                  className="rounded"
                />
                <span className="truncate max-w-[200px]">{app.object_name}</span>
              </label>
            ))}
          </div>
          {selectedAppIds.length > 0 && (
            <button
              onClick={handleBatchPrint}
              disabled={isGenerating}
              className="mt-3 px-4 py-2 bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white rounded-lg flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Печать выбранных ({selectedAppIds.length})
            </button>
          )}
        </div>
      </div>

      {previewHtml ? (
        <div ref={printRef} id="printable-doc" className="border rounded-xl p-4 bg-gray-50 overflow-x-auto">
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Выберите заявку и тип документа, затем нажмите «Сформировать»</p>
        </div>
      )}
    </div>
  );

  const AnalyticsModule = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{stats?.activeContracts || 0}</p>
          <p className="text-xs text-gray-500">Активных договоров</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{stats?.pendingContracts || 0}</p>
          <p className="text-xs text-gray-500">На согласовании</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{stats?.signedDocuments || 0}</p>
          <p className="text-xs text-gray-500">Подписано документов</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-700">{stats?.totalDocuments || 0}</p>
          <p className="text-xs text-gray-500">Всего документов</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-gray-50 rounded-xl p-5">
          <h4 className="font-semibold mb-4">Статусы договоров</h4>
          <div className="space-y-2">
            {Object.entries(contracts.reduce((acc, c) => {
              acc[c.status] = (acc[c.status] || 0) + 1;
              return acc;
            }, {})).map(([status, count]) => (
              <div key={status} className="flex justify-between items-center">
                <span className="text-sm">{CONTRACT_STATUSES[status]?.label || status}</span>
                <div className="flex items-center gap-3 flex-1 ml-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${status === 'active' ? 'bg-green-500' : 
                        status === 'pending_approval' ? 'bg-yellow-500' :
                        status === 'suspended' ? 'bg-blue-500' : 'bg-gray-500'}`}
                      style={{ width: `${(count / contracts.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-12">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-5">
          <h4 className="font-semibold mb-4">Документы по типам</h4>
          <div className="space-y-2">
            {Object.entries(stats?.documentsByType || {}).map(([type, count]) => {
              const doc = DOCS.find(d => d.id === type);
              return (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm">{doc?.label || type}</span>
                  <div className="flex items-center gap-3 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-[#4A6572] h-2 rounded-full"
                        style={{ width: `${(count / Math.max(1, stats?.totalDocuments)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#4A6572]/10 to-transparent rounded-xl p-5">
        <h4 className="font-semibold mb-3">Сводка</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Общая сумма договоров</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(stats?.totalContractAmount || 0)}</p>
          </div>
          <div>
            <p className="text-gray-500">Средняя сумма договора</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency((stats?.totalContractAmount || 0) / Math.max(1, stats?.totalContracts))}</p>
          </div>
          <div>
            <p className="text-gray-500">Документов на договор</p>
            <p className="text-xl font-bold text-purple-600">{((stats?.totalDocuments || 0) / Math.max(1, stats?.totalContracts)).toFixed(1)}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ==================== МОДАЛЬНЫЕ ОКНА ====================

  // Модальное окно создания договора
  const ContractCreateModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[10001]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="text-xl font-bold">Создание договора</h3>
          <button onClick={() => setShowContractModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Номер договора *</label>
            <input
              type="text"
              value={newContract.contract_number}
              onChange={(e) => setNewContract({...newContract, contract_number: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Д-001/2024"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Дата договора</label>
              <input
                type="date"
                value={newContract.contract_date}
                onChange={(e) => setNewContract({...newContract, contract_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Сумма</label>
              <input
                type="number"
                value={newContract.amount}
                onChange={(e) => setNewContract({...newContract, amount: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="0 ₽"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Дата начала</label>
              <input
                type="date"
                value={newContract.start_date}
                onChange={(e) => setNewContract({...newContract, start_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Дата окончания</label>
              <input
                type="date"
                value={newContract.end_date}
                onChange={(e) => setNewContract({...newContract, end_date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <textarea
              value={newContract.description}
              onChange={(e) => setNewContract({...newContract, description: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg"
              rows="3"
              placeholder="Условия договора..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Файл договора</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setNewContract({...newContract, file: e.target.files[0]})}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={() => setShowContractModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">
            Отмена
          </button>
          <button onClick={createContract} disabled={uploading} className="px-4 py-2 bg-[#4A6572] text-white rounded-lg flex items-center gap-2">
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            Создать
          </button>
        </div>
      </div>
    </div>
  );

  // Модальное окно деталей договора
  const ContractDetailsModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[10001]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-5 border-b">
          <h3 className="text-xl font-bold">Детали договора</h3>
          <button onClick={() => setShowContractDetails(false)} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Номер договора</p>
              <p className="font-medium">{selectedContract?.contract_number}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Статус</p>
              <p>{CONTRACT_STATUSES[selectedContract?.status]?.label}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Дата договора</p>
              <p>{formatDate(selectedContract?.contract_date)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Сумма</p>
              <p className="font-bold text-green-600">{formatCurrency(selectedContract?.amount)}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Период действия</p>
              <p>{formatDate(selectedContract?.start_date)} — {formatDate(selectedContract?.end_date) || 'бессрочно'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">Дата создания</p>
              <p>{formatDateTime(selectedContract?.created_at)}</p>
            </div>
          </div>
          
          {selectedContract?.description && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">Описание</p>
              <p className="text-sm">{selectedContract.description}</p>
            </div>
          )}
          
          {selectedContract?.file_url && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">Файл договора</p>
              <button
                onClick={() => downloadFile(selectedContract.file_url, `contract_${selectedContract.contract_number}.pdf`)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Download className="w-4 h-4" />
                Скачать файл
              </button>
            </div>
          )}
        </div>
        
        <div className="p-5 border-t flex justify-end">
          <button onClick={() => setShowContractDetails(false)} className="px-5 py-2 bg-gray-200 rounded-lg">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );

  // Модальное окно комментария
  const CommentModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[10001]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-5">
          <h3 className="text-xl font-bold mb-2">Комментарий</h3>
          <p className="text-sm text-gray-500 mb-4">
            Договор: {selectedContract?.contract_number}<br/>
            Новый статус: {CONTRACT_STATUSES[newStatus]?.label}
          </p>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            rows="4"
            placeholder="Введите причину изменения статуса..."
          />
        </div>
        <div className="p-5 border-t flex justify-end gap-3">
          <button onClick={() => setShowCommentModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">
            Отмена
          </button>
          <button 
            onClick={() => updateContractStatus(selectedContract.id, newStatus, commentText)} 
            className="px-4 py-2 bg-[#4A6572] text-white rounded-lg"
          >
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );

  // ==================== ОСНОВНОЙ РЕНДЕР ====================

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[10000] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="w-7 h-7 text-[#4A6572]" />
              Документооборот
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {clientName || 'Клиент'} • Управление документами
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Модули навигации */}
        <div className="p-5 border-b bg-gray-50 dark:bg-gray-700/30">
          <ModulesNav />
        </div>

        {/* Контент */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
            </div>
          ) : (
            <>
              {activeModule === 'overview' && <OverviewModule />}
              {activeModule === 'contracts' && <ContractsModule />}
              {activeModule === 'documents' && <DocumentsModule />}
              {activeModule === 'analytics' && <AnalyticsModule />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end">
          <button onClick={onClose} className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
            Закрыть
          </button>
        </div>
      </div>

      {/* Модальные окна */}
      {showContractModal && <ContractCreateModal />}
      {showContractDetails && selectedContract && <ContractDetailsModal />}
      {showCommentModal && selectedContract && <CommentModal />}
    </div>
  );
};

export default UnifiedDocumentManager;