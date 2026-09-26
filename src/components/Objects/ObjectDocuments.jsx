// src/components/Objects/ObjectDocuments.jsx
// ============================================================
// Вкладка "Документы" в папке объекта.
// Показывает:
//   1. Официальные документы (generated_documents) — HTML
//   2. Прикреплённые файлы (projects) — PDF, DWG, Excel...
// Обе категории связаны с заявками объекта.
// ============================================================

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  FileText, Image as ImageIcon, FileSpreadsheet, File as FileIcon,
  Download, ExternalLink, Search, X, RefreshCw, Loader2,
  FolderOpen, Eye, Star, Tag, Calendar, AlertCircle,
  ChevronRight, Package, Printer, FileCheck, Receipt,
  Ruler, Truck, ClipboardList, Filter
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

// ────────────────────────────────────────────────────────────
// Типы документов (синхронизированы с DocumentGenerator)
// ────────────────────────────────────────────────────────────
const DOCUMENT_TYPE_MAP = {
  work_act:          { label: 'Акт выполненных работ',  icon: ClipboardList, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' },
  material_act:      { label: 'Акт приёмки (М-7)',       icon: Package,       color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200' },
  work_log:          { label: 'Журнал работ',           icon: Calendar,      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200' },
  invoice:           { label: 'Накладная',              icon: Truck,         color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200' },
  ks2:               { label: 'КС-2',                   icon: FileCheck,     color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200' },
  ks3:               { label: 'КС-3',                   icon: Receipt,       color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200' },
  hidden_works:      { label: 'Акт скрытых работ',      icon: FileText,      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' },
  executive_diagram: { label: 'Исполнительная схема',   icon: Ruler,         color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-200' },
  invoice_bill:      { label: 'Счёт',                   icon: Receipt,       color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' },
  invoice_vat:       { label: 'Счёт-фактура',           icon: FileText,      color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200' },
};

// ────────────────────────────────────────────────────────────
// Категории файлов (синхронизированы с ProjectManager)
// ────────────────────────────────────────────────────────────
const CATEGORY_MAP = {
  construction: { label: '🏗️ Строительные', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' },
  engineering:  { label: '🔧 Инженерные',  color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200' },
  design:       { label: '🎨 Дизайн',       color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200' },
  electrical:   { label: '⚡ Электрика',    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200' },
  plumbing:     { label: '🚿 Сантехника',   color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200' },
  ventilation:  { label: '💨 Вентиляция',   color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200' },
  other:        { label: '📁 Прочее',       color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200' },
};

// ────────────────────────────────────────────────────────────
// Универсальный фолбэк-CSS для HTML-документов
// Применяется, если Tailwind CDN не загрузился (офлайн, CSP и т.п.)
// ────────────────────────────────────────────────────────────
const FALLBACK_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    padding: 20px;
    background: #fff;
    color: #111827;
    margin: 0;
    line-height: 1.5;
    font-size: 14px;
  }
  h1, h2, h3, h4 { margin: 0 0 8px 0; font-weight: 700; color: #111827; }
  h1 { font-size: 22px; } h2 { font-size: 18px; } h3 { font-size: 16px; } h4 { font-size: 14px; }
  p { margin: 0 0 8px 0; }
  /* Отступы */
  .p-0\\.5 { padding: 2px; } .p-1 { padding: 4px; } .p-2 { padding: 8px; }
  .p-4 { padding: 16px; } .p-6 { padding: 24px; } .p-8 { padding: 32px; }
  .mb-1 { margin-bottom: 4px; } .mb-2 { margin-bottom: 8px; }
  .mb-3 { margin-bottom: 12px; } .mb-4 { margin-bottom: 16px; }
  .mb-6 { margin-bottom: 24px; }
  .mt-1 { margin-top: 4px; } .mt-2 { margin-top: 8px; }
  .mt-4 { margin-top: 16px; } .mt-8 { margin-top: 32px; }
  .pl-4 { padding-left: 16px; } .pl-5 { padding-left: 20px; } .pl-6 { padding-left: 24px; } .pl-8 { padding-left: 32px; }
  .pr-2 { padding-right: 8px; } .pr-4 { padding-right: 16px; }
  /* Фоны */
  .bg-white { background: #fff; }
  .bg-gray-50 { background: #f9fafb; }
  .bg-gray-100 { background: #f3f4f6; }
  .bg-blue-50 { background: #eff6ff; }
  .bg-yellow-50 { background: #fefce8; }
  /* Текст */
  .text-center { text-align: center; }
  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .font-medium { font-weight: 500; }
  .text-xs { font-size: 11px; } .text-sm { font-size: 13px; }
  .text-base { font-size: 14px; } .text-lg { font-size: 16px; }
  .text-xl { font-size: 18px; } .text-2xl { font-size: 22px; }
  .text-gray-400 { color: #9ca3af; }
  .text-gray-500 { color: #6b7280; }
  .text-gray-600 { color: #4b5563; }
  .text-gray-700 { color: #374151; }
  .text-red-600 { color: #dc2626; }
  .text-green-600 { color: #16a34a; }
  .uppercase { text-transform: uppercase; }
  .whitespace-nowrap { white-space: nowrap; }
  /* Границы */
  .border { border: 1px solid #d1d5db; }
  .border-black { border-color: #000 !important; }
  .border-dotted { border-style: dotted !important; }
  .border-b { border-bottom: 1px solid #d1d5db; }
  .border-t { border-top: 1px solid #d1d5db; }
  .border-collapse { border-collapse: collapse; }
  .border-2 { border-width: 2px; }
  .border-dashed { border-style: dashed; }
  /* Размеры и layout */
  .w-full { width: 100%; }
  .w-1\\/2 { width: 50%; } .w-3\\/4 { width: 75%; }
  .h-full { height: 100%; }
  .min-w-\\[200px\\] { min-width: 200px; }
  .max-w-4xl { max-width: 56rem; } .max-w-5xl { max-width: 64rem; }
  .max-w-6xl { max-width: 72rem; } .max-w-7xl { max-width: 80rem; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .overflow-x-auto { overflow-x: auto; }
  .overflow-auto { overflow: auto; }
  .inline-block { display: inline-block; }
  .inline-flex { display: inline-flex; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .justify-end { justify-content: flex-end; }
  .justify-center { justify-content: center; }
  .flex { display: flex; }
  .grid { display: grid; }
  .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .col-span-2 { grid-column: span 2 / span 2; }
  .col-span-3 { grid-column: span 3 / span 3; }
  .col-span-7 { grid-column: span 7 / span 7; }
  .col-span-8 { grid-column: span 8 / span 8; }
  .col-span-9 { grid-column: span 9 / span 9; }
  .col-span-10 { grid-column: span 10 / span 10; }
  .col-span-11 { grid-column: span 11 / span 11; }
  .col-span-12 { grid-column: span 12 / span 12; }
  .gap-2 { gap: 8px; } .gap-4 { gap: 16px; } .gap-8 { gap: 32px; }
  .space-y-1 > * + * { margin-top: 4px; }
  .space-y-2 > * + * { margin-top: 8px; }
  .space-y-3 > * + * { margin-top: 12px; }
  .rounded { border-radius: 4px; } .rounded-lg { border-radius: 8px; }
  .rounded-xl { border-radius: 12px; }
  .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
  .list-disc { list-style-type: disc; }
  .list-inside { list-style-position: inside; }
  /* Таблицы */
  table { border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
  /* Печать */
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    table { page-break-inside: avoid; }
    tr { page-break-inside: avoid; }
  }
  .page-break { page-break-before: always; }
`;

// ────────────────────────────────────────────────────────────
// Хелперы
// ────────────────────────────────────────────────────────────
const formatSize = (bytes) => {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return dateStr; }
};

const getFileIcon = (name, type) => {
  const ext = (name || '').split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return ImageIcon;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  if (['pdf'].includes(ext)) return FileText;
  if (type?.startsWith('image/')) return ImageIcon;
  return FileIcon;
};

const isImageFile = (name) => {
  const ext = (name || '').split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
};

const isPdfFile = (name) => (name || '').toLowerCase().endsWith('.pdf');

// ────────────────────────────────────────────────────────────
// Основной компонент
// ────────────────────────────────────────────────────────────
const ObjectDocuments = memo(({
  objectId,
  language = 'ru',
  showNotification,
  onOpenApplication,
}) => {
  const isRu = language === 'ru';

  // ─── State ───────────────────────────────────────────────
  const [generatedDocs, setGeneratedDocs] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [previewFile, setPreviewFile] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);

  // ─── Загрузка данных ─────────────────────────────────────
  const loadDocuments = useCallback(async (silent = false) => {
    if (!objectId) return;
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const { data: apps, error: appsErr } = await supabase
        .from('applications')
        .select('id, object_name, foreman_name, created_at, status')
        .eq('object_id', objectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (appsErr) throw appsErr;
      setApplications(apps || []);

      if (!apps || apps.length === 0) {
        setGeneratedDocs([]);
        setAttachedFiles([]);
        setError(null);
        return;
      }

      const appIds = apps.map(a => a.id);
      const appsMap = apps.reduce((acc, a) => { acc[a.id] = a; return acc; }, {});

      // ─────────────────────────────────────────────────────
      // 🔧 ФИКС: добавляем `content_html` в select.
      // Без него handlePreviewHtml / handlePrintHtml / handleDownloadHtml
      // молча выходили с ошибкой 'Содержимое документа пусто'.
      // ─────────────────────────────────────────────────────
      const { data: genDocs, error: genErr } = await supabase
        .from('generated_documents')
        .select('id, application_id, document_type, generated_by, created_at, content_html')
        .in('application_id', appIds)
        .order('created_at', { ascending: false });

      if (genErr) {
        console.warn('[ObjectDocuments] generated_documents error:', genErr);
        setGeneratedDocs([]);
      } else {
        const enriched = (genDocs || []).map(doc => ({
          ...doc,
          linkedApplication: appsMap[doc.application_id],
        }));
        setGeneratedDocs(enriched);
      }

      // Прикреплённые файлы
      const { data: links, error: linksErr } = await supabase
        .from('project_application_links')
        .select('project_id, application_id')
        .in('application_id', appIds);

      if (linksErr || !links || links.length === 0) {
        setAttachedFiles([]);
      } else {
        const projectIds = [...new Set(links.map(l => l.project_id))];

        const { data: projects, error: projectsErr } = await supabase
          .from('projects')
          .select('*')
          .in('id', projectIds)
          .order('created_at', { ascending: false });

        if (projectsErr) throw projectsErr;

        const docs = [];
        (projects || []).forEach(project => {
          const projectLinks = links.filter(l => l.project_id === project.id);
          projectLinks.forEach(link => {
            const app = appsMap[link.application_id];
            if (!app) return;

            const { data: { publicUrl } } = supabase.storage
              .from('projects')
              .getPublicUrl(project.storage_path);

            docs.push({
              ...project,
              publicUrl,
              linkedApplication: app,
            });
          });
        });

        const uniqueDocs = docs.reduce((acc, current) => {
          const exists = acc.find(item => item.id === current.id);
          if (!exists) acc.push(current);
          return acc;
        }, []);

        setAttachedFiles(uniqueDocs);
      }

      setError(null);
    } catch (err) {
      console.error('[ObjectDocuments.load] error:', err);
      setError(err.message);
      setGeneratedDocs([]);
      setAttachedFiles([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [objectId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleRefresh = useCallback(async () => {
    await loadDocuments(true);
    showNotification?.(
      isRu ? '🔄 Документы обновлены' : '🔄 Documents refreshed',
      'success'
    );
  }, [loadDocuments, showNotification, isRu]);

  // ─── Фильтрация ──────────────────────────────────────────
  const filteredGenerated = useMemo(() => {
    if (!searchTerm.trim()) return generatedDocs;
    const term = searchTerm.trim().toLowerCase();
    return generatedDocs.filter(d =>
      (DOCUMENT_TYPE_MAP[d.document_type]?.label || d.document_type || '').toLowerCase().includes(term)
    );
  }, [generatedDocs, searchTerm]);

  const filteredAttached = useMemo(() => {
    if (!searchTerm.trim()) return attachedFiles;
    const term = searchTerm.trim().toLowerCase();
    return attachedFiles.filter(d =>
      (d.name || '').toLowerCase().includes(term) ||
      (d.description || '').toLowerCase().includes(term) ||
      (d.tags || []).some(t => t.toLowerCase().includes(term))
    );
  }, [attachedFiles, searchTerm]);

  const groupedByApplication = useMemo(() => {
    const groups = {};

    if (activeFilter === 'all' || activeFilter === 'generated') {
      filteredGenerated.forEach(doc => {
        const appId = doc.linkedApplication?.id || 'unknown';
        if (!groups[appId]) {
          groups[appId] = {
            application: doc.linkedApplication,
            generated: [],
            attached: [],
          };
        }
        groups[appId].generated.push(doc);
      });
    }

    if (activeFilter === 'all' || activeFilter === 'attached') {
      filteredAttached.forEach(doc => {
        const appId = doc.linkedApplication?.id || 'unknown';
        if (!groups[appId]) {
          groups[appId] = {
            application: doc.linkedApplication,
            generated: [],
            attached: [],
          };
        }
        groups[appId].attached.push(doc);
      });
    }

    return Object.values(groups);
  }, [filteredGenerated, filteredAttached, activeFilter]);

  const counts = useMemo(() => ({
    all: generatedDocs.length + attachedFiles.length,
    generated: generatedDocs.length,
    attached: attachedFiles.length,
  }), [generatedDocs.length, attachedFiles.length]);

  // ─── Действия: файлы ─────────────────────────────────────
  const handleDownloadFile = useCallback((doc) => {
    if (!doc.publicUrl) {
      showNotification?.('❌ Ссылка на файл недоступна', 'error');
      return;
    }
    const a = document.createElement('a');
    a.href = doc.publicUrl;
    a.download = doc.name || 'document';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [showNotification]);

  const handlePreviewFile = useCallback((doc) => {
    if (!doc.publicUrl) return;
    setPreviewFile(doc);
  }, []);

  // ─── Действия: HTML-документы ────────────────────────────
  const handlePreviewHtml = useCallback((doc) => {
    if (!doc.content_html) {
      showNotification?.(
        isRu
          ? '❌ Содержимое документа пусто. Пересоздайте его в разделе «Документы».'
          : '❌ Document content is empty. Re-generate it in the "Documents" section.',
        'error'
      );
      return;
    }
    setPreviewHtml(doc);
  }, [showNotification, isRu]);

  // ─────────────────────────────────────────────────────────
  // 🔧 ФИКС: печать через скрытый iframe вместо window.open.
  // window.open часто блокируется popup-блокировщиком — тогда
  // пользователь видел ошибку и печать не запускалась.
  // ─────────────────────────────────────────────────────────
  const handlePrintHtml = useCallback((doc) => {
    if (!doc.content_html) {
      showNotification?.('❌ Содержимое документа пусто', 'error');
      return;
    }

    const typeLabel = DOCUMENT_TYPE_MAP[doc.document_type]?.label || doc.document_type;

    // Создаём невидимый iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="ru">
        <head>
          <meta charset="UTF-8">
          <title>${typeLabel}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>${FALLBACK_CSS}</style>
        </head>
        <body>${doc.content_html}</body>
      </html>
    `);
    iframeDoc.close();

    const doPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('[ObjectDocuments] print error:', err);
        showNotification?.('❌ Не удалось запустить печать', 'error');
      } finally {
        // Убираем iframe через 1 секунду после закрытия диалога печати
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1000);
      }
    };

    // Ждём, пока Tailwind CDN подгрузится, но не дольше 1.5 сек
    if (iframe.contentWindow.document.readyState === 'complete') {
      setTimeout(doPrint, 500);
    } else {
      iframe.onload = () => setTimeout(doPrint, 500);
      setTimeout(doPrint, 1500); // страховка
    }
  }, [showNotification]);

  const handleDownloadHtml = useCallback((doc) => {
    if (!doc.content_html) {
      showNotification?.('❌ Содержимое документа пусто', 'error');
      return;
    }

    const typeLabel = DOCUMENT_TYPE_MAP[doc.document_type]?.label || doc.document_type;
    const fileName = `${typeLabel}_${doc.id.slice(0, 8)}.html`;

    const fullHtml = `<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${typeLabel}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>${FALLBACK_CSS}</style>
  </head>
  <body>
    ${doc.content_html}
  </body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification?.(
      isRu ? '📥 Документ скачан' : '📥 Document downloaded',
      'success'
    );
  }, [showNotification, isRu]);

  const handleOpenApplication = useCallback((app) => {
    if (!app || !onOpenApplication) return;
    onOpenApplication(app);
  }, [onOpenApplication]);

  // ─── Пусто: нет заявок у объекта ─────────────────────────
  if (!isLoading && applications.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 mb-4">
          <FileText className="w-8 h-8 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {isRu ? 'У объекта пока нет заявок' : 'No applications yet'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          {isRu
            ? 'Документы привязываются к заявкам. Как только появятся заявки — сюда можно будет добавить файлы и сгенерировать документы.'
            : 'Documents are linked to applications. Once applications appear, you can add files and generate documents here.'}
        </p>
      </div>
    );
  }

  // ─── Пусто: нет документов ───────────────────────────────
  if (!isLoading && counts.all === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/20 mb-4">
          <FolderOpen className="w-8 h-8 text-purple-500 dark:text-purple-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {isRu ? 'Документов пока нет' : 'No documents yet'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
          {isRu ? 'Два способа добавить документы:' : 'Two ways to add documents:'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6 text-left">
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="w-5 h-5 text-[#4A6572] dark:text-[#F9AA33]" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {isRu ? '📄 Официальные' : '📄 Official'}
              </span>
            </div>
            <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>{isRu ? 'Раздел "Документы"' : 'Go to "Documents"'}</li>
              <li>{isRu ? 'Выберите заявку' : 'Select application'}</li>
              <li>{isRu ? 'Нажмите "Сформировать"' : 'Click "Generate"'}</li>
            </ol>
          </div>

          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <FolderOpen className="w-5 h-5 text-[#4A6572] dark:text-[#F9AA33]" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {isRu ? '📎 Прикреплённые' : '📎 Attached'}
              </span>
            </div>
            <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>{isRu ? 'Раздел "Проекты"' : 'Go to "Projects"'}</li>
              <li>{isRu ? 'Загрузите файл' : 'Upload file'}</li>
              <li>{isRu ? 'Нажмите 🔗 "Привязать"' : 'Click 🔗 "Link"'}</li>
            </ol>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-5 py-2.5 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-xl hover:shadow-lg transition-all inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRu ? 'Проверить обновления' : 'Check for updates'}
        </button>
      </div>
    );
  }

  // ─── Основной рендер ─────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ─── Верхняя панель ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#4A6572]/10 to-[#344955]/10 rounded-xl">
              <FileText className="w-5 h-5 text-[#4A6572] dark:text-[#F9AA33]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {isRu ? 'Документы объекта' : 'Object documents'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isRu
                  ? `${counts.generated} офиц. · ${counts.attached} ${counts.attached === 1 ? 'файл' : 'файлов'} · ${applications.length} ${applications.length === 1 ? 'заявка' : 'заявок'}`
                  : `${counts.generated} official · ${counts.attached} files · ${applications.length} applications`}
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="self-start sm:self-auto px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRu ? 'Обновить' : 'Refresh'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-xl p-1">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Filter className="w-3 h-3" />
              {isRu ? 'Все' : 'All'} ({counts.all})
            </button>
            <button
              onClick={() => setActiveFilter('generated')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeFilter === 'generated'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <FileCheck className="w-3 h-3" />
              {isRu ? 'Официальные' : 'Official'} ({counts.generated})
            </button>
            <button
              onClick={() => setActiveFilter('attached')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeFilter === 'attached'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <FolderOpen className="w-3 h-3" />
              {isRu ? 'Файлы' : 'Files'} ({counts.attached})
            </button>
          </div>

          {(counts.all > 3) && (
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isRu ? 'Поиск...' : 'Search...'}
                className="w-full pl-9 pr-9 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  aria-label={isRu ? 'Очистить' : 'Clear'}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Контент ── */}
      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#4A6572] mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isRu ? 'Загрузка документов...' : 'Loading documents...'}
          </p>
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-800 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
            {isRu ? 'Ошибка загрузки' : 'Load error'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-[#4A6572] text-white rounded-xl text-sm font-medium hover:bg-[#344955] transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {isRu ? 'Повторить' : 'Retry'}
          </button>
        </div>
      ) : groupedByApplication.length === 0 && searchTerm ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isRu ? `Ничего не найдено по запросу "${searchTerm}"` : `Nothing found for "${searchTerm}"`}
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-3 text-sm text-[#4A6572] dark:text-[#F9AA33] hover:underline"
          >
            {isRu ? 'Сбросить поиск' : 'Clear search'}
          </button>
        </div>
      ) : (
        groupedByApplication.map((group) => (
          <div
            key={group.application?.id || 'unknown'}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {group.application && (
              <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-700/30 dark:to-transparent border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                    <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {group.application.foreman_name || '—'}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">
                      {isRu ? 'Заявка от ' : 'Application from '}
                      {formatDate(group.application.created_at)}
                      {group.generated.length > 0 && ` · ${group.generated.length} док.`}
                      {group.attached.length > 0 && ` · ${group.attached.length} файл.`}
                    </div>
                  </div>
                </div>

                {onOpenApplication && (
                  <button
                    onClick={() => handleOpenApplication(group.application)}
                    className="text-xs text-[#4A6572] dark:text-[#F9AA33] hover:underline flex items-center gap-1 font-medium whitespace-nowrap flex-shrink-0"
                  >
                    {isRu ? 'Открыть заявку' : 'Open application'}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* ─── Официальные документы ── */}
            {group.generated.length > 0 && (
              <div>
                <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-[#4A6572]/5 to-transparent dark:from-[#4A6572]/10 border-b border-gray-100 dark:border-gray-700">
                  <div className="text-[11px] font-semibold text-[#4A6572] dark:text-[#F9AA33] uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5" />
                    {isRu ? 'Официальные документы' : 'Official documents'} ({group.generated.length})
                  </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {group.generated.map((doc) => {
                    const typeInfo = DOCUMENT_TYPE_MAP[doc.document_type] || {
                      label: doc.document_type,
                      icon: FileText,
                      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
                    };
                    const Icon = typeInfo.icon;

                    return (
                      <div
                        key={doc.id}
                        className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-gradient-to-br from-[#4A6572]/10 to-[#344955]/10 dark:from-[#4A6572]/20 dark:to-[#344955]/20 rounded-xl flex-shrink-0">
                            <Icon className="w-5 h-5 text-[#4A6572] dark:text-[#F9AA33]" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {typeInfo.label}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  № {doc.id.slice(0, 8).toUpperCase()} · {formatDateTime(doc.created_at)}
                                </p>
                              </div>

                              {/* ─────────────────────────────────
                                  🔧 ФИКС: если content_html пуст —
                                  показываем бейдж и не даём жать
                                  превью/печать/скачивание.
                              ───────────────────────────────── */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {!doc.content_html ? (
                                  <span
                                    className="text-[10px] text-amber-600 dark:text-amber-400 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg whitespace-nowrap"
                                    title={isRu
                                      ? 'Содержимое документа пусто. Пересоздайте его в разделе «Документы».'
                                      : 'Document content is empty. Re-generate it in the "Documents" section.'}
                                  >
                                    ⚠️ {isRu ? 'Нет содержимого' : 'No content'}
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handlePreviewHtml(doc)}
                                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
                                      title={isRu ? 'Просмотр' : 'Preview'}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handlePrintHtml(doc)}
                                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
                                      title={isRu ? 'Печать' : 'Print'}
                                    >
                                      <Printer className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDownloadHtml(doc)}
                                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
                                      title={isRu ? 'Скачать HTML' : 'Download HTML'}
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(doc.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Прикреплённые файлы ── */}
            {group.attached.length > 0 && (
              <div>
                <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-gray-100/50 to-transparent dark:from-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                  <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5" />
                    {isRu ? 'Прикреплённые файлы' : 'Attached files'} ({group.attached.length})
                  </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {group.attached.map((doc) => {
                    const Icon = getFileIcon(doc.name, doc.file_type);
                    const category = CATEGORY_MAP[doc.category] || CATEGORY_MAP.other;
                    const canPreview = isImageFile(doc.name) || isPdfFile(doc.name);

                    return (
                      <div
                        key={doc.id}
                        className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-gradient-to-br from-[#4A6572]/10 to-[#344955]/10 dark:from-[#4A6572]/20 dark:to-[#344955]/20 rounded-xl flex-shrink-0">
                            <Icon className="w-5 h-5 text-[#4A6572] dark:text-[#F9AA33]" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {doc.name || '—'}
                                </h4>
                                {doc.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                                    {doc.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                {canPreview && (
                                  <button
                                    onClick={() => handlePreviewFile(doc)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
                                    title={isRu ? 'Просмотр' : 'Preview'}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDownloadFile(doc)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
                                  title={isRu ? 'Скачать' : 'Download'}
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <a
                                  href={doc.publicUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
                                  title={isRu ? 'Открыть в новой вкладке' : 'Open in new tab'}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {doc.category && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${category.color}`}>
                                  {category.label}
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <FileIcon className="w-3 h-3" />
                                {formatSize(doc.file_size)}
                              </span>
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(doc.created_at)}
                              </span>
                              {doc.is_favorite && (
                                <span className="text-[10px] text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-current" />
                                  {isRu ? 'Избранное' : 'Favorite'}
                                </span>
                              )}
                              {doc.tags && doc.tags.length > 0 && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-1 flex-wrap">
                                  <Tag className="w-3 h-3" />
                                  {doc.tags.slice(0, 3).map(tag => `#${tag}`).join(' ')}
                                  {doc.tags.length > 3 && ` +${doc.tags.length - 3}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* ─── Модалка предпросмотра файла ── */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] fade-enter"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewFile(null); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-gradient-to-br from-[#4A6572]/10 to-[#344955]/10 rounded-xl flex-shrink-0">
                  {React.createElement(getFileIcon(previewFile.name, previewFile.file_type), {
                    className: 'w-5 h-5 text-[#4A6572] dark:text-[#F9AA33]'
                  })}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {previewFile.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatSize(previewFile.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleDownloadFile(previewFile)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
                  title={isRu ? 'Скачать' : 'Download'}
                >
                  <Download className="w-4 h-4" />
                </button>
                <a
                  href={previewFile.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
                  title={isRu ? 'Открыть в новой вкладке' : 'Open in new tab'}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500 transition-colors"
                  aria-label={isRu ? 'Закрыть' : 'Close'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/50 p-4 flex items-center justify-center">
              {isImageFile(previewFile.name) ? (
                <img
                  src={previewFile.publicUrl}
                  alt={previewFile.name}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : isPdfFile(previewFile.name) ? (
                // 🔧 ФИКС: <object> вместо <embed> — работает с CSP `object-src`.
                //           Fallback внутри <object> покажет кнопку «Открыть в новой вкладке»,
                //           если браузер не умеет встроенный PDF.
                <object
                  data={previewFile.publicUrl}
                  type="application/pdf"
                  className="w-full h-[70vh] rounded-lg"
                >
                  <div className="text-center py-12">
                    <FileIcon className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {isRu
                        ? 'Встроенный просмотр PDF недоступен в этом браузере'
                        : 'Inline PDF preview is not available in this browser'}
                    </p>
                    <a
                      href={previewFile.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A6572] text-white rounded-xl text-sm font-medium hover:bg-[#344955] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {isRu ? 'Открыть PDF в новой вкладке' : 'Open PDF in new tab'}
                    </a>
                  </div>
                </object>
              ) : (
                <div className="text-center py-12">
                  <FileIcon className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {isRu ? 'Предпросмотр недоступен' : 'Preview not available'}
                  </p>
                  <a
                    href={previewFile.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#4A6572] text-white rounded-xl text-sm font-medium hover:bg-[#344955] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {isRu ? 'Открыть в новой вкладке' : 'Open in new tab'}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Модалка предпросмотра HTML-документа ── */}
      {previewHtml && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] fade-enter"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewHtml(null); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {(() => {
                  const typeInfo = DOCUMENT_TYPE_MAP[previewHtml.document_type] || {
                    label: previewHtml.document_type,
                    icon: FileText,
                  };
                  const Icon = typeInfo.icon;
                  return (
                    <>
                      <div className="p-2 bg-gradient-to-br from-[#4A6572]/10 to-[#344955]/10 rounded-xl flex-shrink-0">
                        <Icon className="w-5 h-5 text-[#4A6572] dark:text-[#F9AA33]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {typeInfo.label}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          № {previewHtml.id.slice(0, 8).toUpperCase()} · {formatDateTime(previewHtml.created_at)}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handlePrintHtml(previewHtml)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
                  title={isRu ? 'Печать' : 'Print'}
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownloadHtml(previewHtml)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
                  title={isRu ? 'Скачать HTML' : 'Download HTML'}
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewHtml(null)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500 transition-colors"
                  aria-label={isRu ? 'Закрыть' : 'Close'}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Iframe с документом */}
            <div className="flex-1 overflow-hidden bg-white">
              {/* 🔧 ФИКС:
                  - sandbox расширен allow-popups / allow-modals —
                    нужно для window.print() и внешних ссылок внутри документа;
                  - srcDoc работает благодаря `frame-src 'self' about: blob:`
                    в vite.config.js. */}
              <iframe
                title="Document preview"
                srcDoc={`
                  <!DOCTYPE html>
                  <html lang="ru">
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <script src="https://cdn.tailwindcss.com"></script>
                      <style>${FALLBACK_CSS}</style>
                    </head>
                    <body>${previewHtml.content_html || ''}</body>
                  </html>
                `}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ObjectDocuments.displayName = 'ObjectDocuments';

export default ObjectDocuments;