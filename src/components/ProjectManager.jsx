// src/components/ProjectManager.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FileText, Download, Trash2, Upload, Loader2, 
  FolderOpen, Image, File, RefreshCw, Plus,
  Search, X, Calendar, Link, ExternalLink,
  Grid, List, Eye
} from 'lucide-react';

const ProjectManager = ({ supabase, userCompanyId, userId, userRole, showNotification }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  // Загрузка проектов компании
  const loadProjects = useCallback(async () => {
    if (!userCompanyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Получаем публичные URL
      const projectsWithUrls = await Promise.all((data || []).map(async (project) => {
        const { data: { publicUrl } } = supabase.storage
          .from('projects')
          .getPublicUrl(project.storage_path);
        
        return { ...project, publicUrl };
      }));
      
      setProjects(projectsWithUrls);
    } catch (err) {
      console.error('Ошибка загрузки проектов:', err);
      showNotification?.('❌ Не удалось загрузить проекты', 'error');
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, supabase, showNotification]);

  // Загрузка файла
  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    const uploadedProjects = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Проверка размера (макс 50MB)
        if (file.size > 50 * 1024 * 1024) {
          showNotification?.(`⚠️ Файл "${file.name}" превышает 50MB`, 'warning');
          continue;
        }
        
        // Создаём уникальное имя
        const safeFileName = file.name
          .replace(/[^a-zA-Zа-яА-Я0-9._-]/g, '_')
          .replace(/_+/g, '_');
        const storagePath = `${userCompanyId}/projects/${Date.now()}_${safeFileName}`;
        
        // Загружаем в Storage
        const { error: uploadError } = await supabase.storage
          .from('projects')
          .upload(storagePath, file);
        
        if (uploadError) throw uploadError;
        
        // Сохраняем в БД
        const { data, error: dbError } = await supabase
          .from('projects')
          .insert([{
            company_id: userCompanyId,
            uploaded_by: userId,
            name: file.name,
            description: '',
            file_size: file.size,
            file_type: file.type || 'application/octet-stream',
            storage_path: storagePath,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (dbError) throw dbError;
        
        // Получаем публичный URL
        const { data: { publicUrl } } = supabase.storage
          .from('projects')
          .getPublicUrl(storagePath);
        
        uploadedProjects.push({ ...data, publicUrl });
        setUploadProgress(((i + 1) / files.length) * 100);
      }
      
      setProjects(prev => [...uploadedProjects, ...prev]);
      showNotification?.(`✅ Загружено ${uploadedProjects.length} проектов`, 'success');
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      showNotification?.(`❌ Ошибка: ${err.message}`, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Удаление проекта
  const handleDelete = async (projectId, storagePath) => {
    if (!confirm('Удалить этот проект?')) return;
    
    try {
      // Удаляем из Storage
      const { error: storageError } = await supabase.storage
        .from('projects')
        .remove([storagePath]);
      
      if (storageError) throw storageError;
      
      // Удаляем из БД
      const { error: dbError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (dbError) throw dbError;
      
      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        setShowPreview(false);
      }
      showNotification?.('🗑️ Проект удалён', 'success');
    } catch (err) {
      console.error('Ошибка удаления:', err);
      showNotification?.('❌ Ошибка удаления', 'error');
    }
  };

  // Открыть предпросмотр
  const handlePreview = (project) => {
    setSelectedProject(project);
    setShowPreview(true);
  };

  // Закрыть предпросмотр
  const handleClosePreview = () => {
    setSelectedProject(null);
    setShowPreview(false);
  };

  // Форматирование размера
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Иконка для типа файла
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return Image;
    if (['pdf'].includes(ext)) return FileText;
    if (['dwg', 'dxf'].includes(ext)) return FolderOpen;
    if (['doc', 'docx'].includes(ext)) return FileText;
    if (['xls', 'xlsx'].includes(ext)) return FileText;
    return File;
  };

  // Фильтрация
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Проверяем, есть ли доступ к проектам
  const canManage = ['manager', 'director', 'supply_admin', 'master', 'foreman'].includes(userRole);

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">У вас нет доступа к управлению проектами</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-4 page-enter">
        {/* Заголовок */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-[#4A6572]" />
              Мои проекты
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Загружайте и управляйте проектными документами
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Загрузка...' : 'Загрузить проект'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={loadProjects}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Обновить"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Прогресс загрузки */}
        {uploading && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-[#4A6572] to-[#344955] h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Загрузка: {Math.round(uploadProgress)}%</p>
          </div>
        )}

        {/* Поиск и фильтры */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск проектов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-800"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              title="Сетка"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              title="Список"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Список проектов */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#4A6572]" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Нет загруженных проектов</p>
            <p className="text-sm text-gray-400 mt-1">Нажмите «Загрузить проект», чтобы добавить файлы</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((project) => {
              const Icon = getFileIcon(project.name);
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(
                project.name.split('.').pop()?.toLowerCase()
              );
              
              return (
                <div
                  key={project.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all group cursor-pointer"
                  onClick={() => handlePreview(project)}
                >
                  <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
                    {isImage ? (
                      <img 
                        src={project.publicUrl} 
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon className="w-16 h-16 text-gray-400" />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <a
                        href={project.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                        title="Просмотр"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye className="w-5 h-5 text-gray-700" />
                      </a>
                      <a
                        href={project.publicUrl}
                        download={project.name}
                        className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                        title="Скачать"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="w-5 h-5 text-gray-700" />
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(project.publicUrl);
                          showNotification?.('📋 Ссылка скопирована', 'success');
                        }}
                        className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                        title="Копировать ссылку"
                      >
                        <Link className="w-5 h-5 text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(project.id, project.storage_path);
                        }}
                        className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate" title={project.name}>
                      {project.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span>{formatSize(project.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(project.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => {
              const Icon = getFileIcon(project.name);
              
              return (
                <div
                  key={project.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-all flex items-center gap-4 group cursor-pointer"
                  onClick={() => handlePreview(project)}
                >
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {project.name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{formatSize(project.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(project.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <a
                      href={project.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Просмотр"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <a
                      href={project.publicUrl}
                      download={project.name}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Скачать"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(project.publicUrl);
                        showNotification?.('📋 Ссылка скопирована', 'success');
                      }}
                      className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Копировать ссылку"
                    >
                      <Link className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id, project.storage_path)}
                      className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-4 text-xs text-gray-400 text-center">
          Всего проектов: {filteredProjects.length}
        </div>
      </div>

      {/* Модальное окно предпросмотра */}
      {showPreview && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={handleClosePreview}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FolderOpen className="w-5 h-5 text-[#4A6572] flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                  {selectedProject.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedProject.publicUrl}
                  download={selectedProject.name}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Скачать"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button
                  onClick={handleClosePreview}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {(() => {
                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(
                  selectedProject.name.split('.').pop()?.toLowerCase()
                );
                const isPDF = selectedProject.name.toLowerCase().endsWith('.pdf');
                
                if (isImage) {
                  return (
                    <img 
                      src={selectedProject.publicUrl} 
                      alt={selectedProject.name}
                      className="w-full h-auto rounded-lg"
                    />
                  );
                } else if (isPDF) {
                  return (
                    <embed
                      src={selectedProject.publicUrl}
                      type="application/pdf"
                      className="w-full h-[70vh] rounded-lg"
                    />
                  );
                } else {
                  return (
                    <div className="text-center py-12">
                      <FileText className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Предпросмотр недоступен для этого типа файла</p>
                      <a
                        href={selectedProject.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Открыть в новой вкладке
                      </a>
                    </div>
                  );
                }
              })()}
              
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Название:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedProject.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Размер:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{formatSize(selectedProject.file_size)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Загружен:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedProject.created_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Тип:</span>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedProject.file_type || 'Неизвестно'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectManager;