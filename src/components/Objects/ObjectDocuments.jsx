// src/components/Objects/ObjectDocuments.jsx
// ============================================================
// Вкладка "Документы" в папке объекта.
// Показывает все файлы из таблицы projects, привязанные
// к заявкам данного объекта (через project_application_links).
// ============================================================

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  FileText, Image as ImageIcon, FileSpreadsheet, File as FileIcon,
  Download, ExternalLink, Search, X, RefreshCw, Loader2,
  FolderOpen, Eye, Star, Tag, Calendar, AlertCircle,
  ChevronRight, Package
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

// ────────────────────────────────────────────────────────────
// Категории (синхронизированы с ProjectManager)
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
  onOpenApplication,   // (app) => void — открыть заявку
}) => {
  const isRu = language === 'ru';

  // ─── State ───────────────────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewFile, setPreviewFile] = useState(null);

  // ─── Загрузка документов ─────────────────────────────────
  const loadDocuments = useCallback(async (silent = false) => {
    if (!objectId) return;
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // 1. Находим все заявки объекта
      const { data: apps, error: appsErr } = await supabase
        .from('applications')
        .select('id, object_name, foreman_name, created_at, status')
        .eq('object_id', objectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (appsErr) throw appsErr;
      setApplications(apps || []);

      if (!apps || apps.length === 0) {
        setDocuments([]);
        setError(null);
        return;
      }

      const appIds = apps.map(a => a.id);

      // 2. Находим все связи project ↔ application
      const { data: links, error: linksErr } = await supabase
        .from('project_application_links')
        .select('project_id, application_id')
        .in('application_id', appIds);

      if (linksErr) {
        // Таблица может отсутствовать — не считаем это критичной ошибкой
        console.warn('[ObjectDocuments] links error:', linksErr);
        setDocuments([]);
        setError(null);
        return;
      }

      if (!links || links.length === 0) {
        setDocuments([]);
        setError(null);
        return;
      }

      // 3. Забираем сами проекты (файлы)
      const projectIds = [...new Set(links.map(l => l.project_id))];

      const { data: projects, error: projectsErr } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('created_at', { ascending: false });

      if (projectsErr) throw projectsErr;

      // 4. Собираем результат: файл + заявка, к которой он привязан
      const appsMap = apps.reduce((acc, a) => { acc[a.id] = a; return acc; }, {});

      const docs = [];
      (projects || []).forEach(project => {
        // Находим все связи этого проекта с нашими заявками
        const projectLinks = links.filter(l => l.project_id === project.id);

        projectLinks.forEach(link => {
          const app = appsMap[link.application_id];
          if (!app) return;

          // Собираем публичный URL
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

      // Дедупликация: один проект может быть привязан к нескольким заявкам — но нам нужен один раз
      const uniqueDocs = docs.reduce((acc, current) => {
        const exists = acc.find(item => item.id === current.id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []);

      setDocuments(uniqueDocs);
      setError(null);
    } catch (err) {
      console.error('[ObjectDocuments.load] error:', err);
      setError(err.message);
      setDocuments([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [objectId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // ─── Обновление ──────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    await loadDocuments(true);
    showNotification?.(
      isRu ? '🔄 Документы обновлены' : '🔄 Documents refreshed',
      'success'
    );
  }, [loadDocuments, showNotification, isRu]);

  // ─── Фильтрация ──────────────────────────────────────────
  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const term = searchTerm.trim().toLowerCase();
    return documents.filter(d =>
      (d.name || '').toLowerCase().includes(term) ||
      (d.description || '').toLowerCase().includes(term) ||
      (d.tags || []).some(t => t.toLowerCase().includes(term))
    );
  }, [documents, searchTerm]);

  // ─── Группировка по заявкам ──────────────────────────────
  const groupedByApplication = useMemo(() => {
    const groups = {};
    filteredDocuments.forEach(doc => {
      const appId = doc.linkedApplication?.id || 'unknown';
      if (!groups[appId]) {
        groups[appId] = {
          application: doc.linkedApplication,
          documents: [],
        };
      }
      groups[appId].documents.push(doc);
    });
    return Object.values(groups);
  }, [filteredDocuments]);

  // ─── Скачивание ──────────────────────────────────────────
  const handleDownload = useCallback((doc) => {
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

  // ─── Просмотр ────────────────────────────────────────────
  const handlePreview = useCallback((doc) => {
    if (!doc.publicUrl) return;
    setPreviewFile(doc);
  }, []);

  // ─── Открыть связанную заявку ────────────────────────────
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
            ? 'Документы привязываются к заявкам. Как только появятся заявки — сюда можно будет прикрепить файлы через раздел "Проекты".'
            : 'Documents are linked to applications. Once applications appear, you can attach files here.'}
        </p>
      </div>
    );
  }

  // ─── Пусто: нет документов ───────────────────────────────
  if (!isLoading && documents.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-900/20 mb-4">
          <FolderOpen className="w-8 h-8 text-purple-500 dark:text-purple-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {isRu ? 'Документов пока нет' : 'No documents yet'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
          {isRu
            ? 'Чтобы прикрепить файл к объекту:'
            : 'To attach a file to the object:'}
        </p>
        <ol className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto text-left space-y-2 mb-6">
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#4A6572] dark:text-[#F9AA33] flex-shrink-0">1.</span>
            <span>{isRu ? 'Перейдите в раздел "Проекты"' : 'Go to "Projects" section'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#4A6572] dark:text-[#F9AA33] flex-shrink-0">2.</span>
            <span>{isRu ? 'Загрузите файл (PDF, DWG, Excel, картинка)' : 'Upload a file (PDF, DWG, Excel, image)'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#4A6572] dark:text-[#F9AA33] flex-shrink-0">3.</span>
            <span>{isRu ? 'Нажмите 🔗 "Привязать к заявке"' : 'Click 🔗 "Link to application"'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#4A6572] dark:text-[#F9AA33] flex-shrink-0">4.</span>
            <span>{isRu ? 'Выберите заявку объекта' : 'Choose the object application'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-[#4A6572] dark:text-[#F9AA33] flex-shrink-0">5.</span>
            <span>{isRu ? 'Файл появится здесь автоматически' : 'The file will appear here automatically'}</span>
          </li>
        </ol>
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
      {/* ─── Верхняя панель: поиск + счётчик + обновление ── */}
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
                  ? `${documents.length} ${documents.length === 1 ? 'файл' : documents.length < 5 ? 'файла' : 'файлов'} · ${applications.length} ${applications.length === 1 ? 'заявка' : 'заявок'}`
                  : `${documents.length} files · ${applications.length} applications`}
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

        {/* Поиск */}
        {documents.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRu ? 'Поиск по названию, описанию, тегам...' : 'Search by name, description, tags...'}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] text-sm"
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

      {/* ─── Загрузка ── */}
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
      ) : filteredDocuments.length === 0 && searchTerm ? (
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
        /* ─── Группировка по заявкам ── */
        groupedByApplication.map((group) => (
          <div
            key={group.application?.id || 'unknown'}
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Шапка группы — заявка */}
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

            {/* Список файлов группы */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {group.documents.map((doc) => {
                const Icon = getFileIcon(doc.name, doc.file_type);
                const category = CATEGORY_MAP[doc.category] || CATEGORY_MAP.other;
                const canPreview = isImageFile(doc.name) || isPdfFile(doc.name);

                return (
                  <div
                    key={doc.id}
                    className="p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Иконка типа файла */}
                      <div className="p-2.5 bg-gradient-to-br from-[#4A6572]/10 to-[#344955]/10 dark:from-[#4A6572]/20 dark:to-[#344955]/20 rounded-xl flex-shrink-0">
                        <Icon className="w-5 h-5 text-[#4A6572] dark:text-[#F9AA33]" />
                      </div>

                      {/* Основная информация */}
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

                          {/* Кнопки действий */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {canPreview && (
                              <button
                                onClick={() => handlePreview(doc)}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-[#4A6572] dark:hover:text-[#F9AA33] transition-colors"
                                title={isRu ? 'Просмотр' : 'Preview'}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDownload(doc)}
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

                        {/* Мета-информация */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {/* Категория */}
                          {doc.category && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${category.color}`}>
                              {category.label}
                            </span>
                          )}

                          {/* Размер */}
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <FileIcon className="w-3 h-3" />
                            {formatSize(doc.file_size)}
                          </span>

                          {/* Дата */}
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(doc.created_at)}
                          </span>

                          {/* Избранное */}
                          {doc.is_favorite && (
                            <span className="text-[10px] text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              {isRu ? 'Избранное' : 'Favorite'}
                            </span>
                          )}

                          {/* Теги */}
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
        ))
      )}

      {/* ─── Модалка предпросмотра ── */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] fade-enter"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewFile(null); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
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
                  onClick={() => handleDownload(previewFile)}
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

            {/* Content */}
            <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900/50 p-4 flex items-center justify-center">
              {isImageFile(previewFile.name) ? (
                <img
                  src={previewFile.publicUrl}
                  alt={previewFile.name}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : isPdfFile(previewFile.name) ? (
                <embed
                  src={previewFile.publicUrl}
                  type="application/pdf"
                  className="w-full h-[70vh] rounded-lg"
                />
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
    </div>
  );
});

ObjectDocuments.displayName = 'ObjectDocuments';

export default ObjectDocuments;