// src/components/ProjectManager.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  FileText, Download, Trash2, Upload, Loader2, 
  FolderOpen, Image, File, RefreshCw, Plus,
  Search, X, Calendar, Link, ExternalLink,
  Grid, List, Eye, Star, StarOff, Tag, 
  Clock, Users, MessageCircle, Layers,
  ChevronDown, ChevronUp, Edit3, Save,
  Paperclip, Link2, Copy, Check
} from 'lucide-react';

// Категории проектов
const PROJECT_CATEGORIES = [
  { id: 'construction', label: '🏗️ Строительные', color: 'bg-blue-100 text-blue-700' },
  { id: 'engineering', label: '🔧 Инженерные', color: 'bg-green-100 text-green-700' },
  { id: 'design', label: '🎨 Дизайн', color: 'bg-purple-100 text-purple-700' },
  { id: 'electrical', label: '⚡ Электрика', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'plumbing', label: '🚿 Сантехника', color: 'bg-cyan-100 text-cyan-700' },
  { id: 'ventilation', label: '💨 Вентиляция', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'other', label: '📁 Прочее', color: 'bg-gray-100 text-gray-700' },
];

// Популярные теги
const POPULAR_TAGS = [
  'Строительство', 'Ремонт', 'Отделка', 'Фундамент', 'Кровля',
  'Фасад', 'Интерьер', 'Экстерьер', 'Ландшафт', 'Инженерия',
  'Электрика', 'Сантехника', 'Вентиляция', 'Кондиционирование',
  'Отопление', 'Водоснабжение', 'Канализация', 'Газоснабжение',
  'Проект', 'Рабочая документация', 'Схема', 'Чертеж'
];

const ProjectManager = ({ supabase, userCompanyId, userId, userRole, showNotification, applications = [], user }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState({});
  const [commentLoading, setCommentLoading] = useState({});
  const [editingProject, setEditingProject] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');
  const [showLinkToApplication, setShowLinkToApplication] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const fileInputRef = useRef(null);

  // Загрузка проектов компании
  const loadProjects = useCallback(async () => {
    if (!userCompanyId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('created_at', { ascending: false });
      
      if (showOnlyFavorites) {
        query = query.eq('is_favorite', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Получаем публичные URL
      const projectsWithUrls = await Promise.all((data || []).map(async (project) => {
        const { data: { publicUrl } } = supabase.storage
          .from('projects')
          .getPublicUrl(project.storage_path);
        
        // Получаем количество комментариев
        const { count: commentsCount } = await supabase
          .from('project_comments')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', project.id);
        
        // Получаем связи с заявками
        const { data: links } = await supabase
          .from('project_application_links')
          .select('application_id')
          .eq('project_id', project.id);
        
        return { 
          ...project, 
          publicUrl, 
          comments_count: commentsCount || 0,
          linked_applications: links?.map(l => l.application_id) || []
        };
      }));
      
      setProjects(projectsWithUrls);
    } catch (err) {
      console.error('Ошибка загрузки проектов:', err);
      showNotification?.('❌ Не удалось загрузить проекты', 'error');
    } finally {
      setLoading(false);
    }
  }, [userCompanyId, supabase, showNotification, showOnlyFavorites]);

  // Загрузка комментариев
  const loadComments = useCallback(async (projectId) => {
    if (!projectId) return;
    
    setCommentLoading(prev => ({ ...prev, [projectId]: true }));
    try {
      const { data, error } = await supabase
        .from('project_comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setComments(prev => ({ ...prev, [projectId]: data || [] }));
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
      showNotification?.('❌ Не удалось загрузить комментарии', 'error');
    } finally {
      setCommentLoading(prev => ({ ...prev, [projectId]: false }));
    }
  }, [supabase, showNotification]);

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
        
        if (file.size > 50 * 1024 * 1024) {
          showNotification?.(`⚠️ Файл "${file.name}" превышает 50MB`, 'warning');
          continue;
        }
        
        const fileExt = file.name.split('.').pop() || 'pdf';
        const storagePath = `${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('projects')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/octet-stream'
          });
        
        if (uploadError) {
          console.error('❌ Ошибка загрузки в Storage:', uploadError);
          showNotification?.(`❌ Ошибка Storage: ${uploadError.message}`, 'error');
          continue;
        }
        
        const { data, error: dbError } = await supabase
          .from('projects')
          .insert([{
            company_id: userCompanyId,
            uploaded_by: userId,
            name: file.name,
            description: '',
            category: 'other',
            tags: [],
            version: 1,
            file_size: file.size,
            file_type: file.type || 'application/octet-stream',
            storage_path: storagePath,
            is_favorite: false,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (dbError) {
          console.error('❌ Ошибка сохранения в БД:', dbError);
          showNotification?.(`❌ Ошибка БД: ${dbError.message}`, 'error');
          continue;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('projects')
          .getPublicUrl(storagePath);
        
        uploadedProjects.push({ ...data, publicUrl, comments_count: 0, linked_applications: [] });
        setUploadProgress(((i + 1) / files.length) * 100);
      }
      
      if (uploadedProjects.length > 0) {
        setProjects(prev => [...uploadedProjects, ...prev]);
        showNotification?.(`✅ Загружено ${uploadedProjects.length} проектов`, 'success');
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      showNotification?.(`❌ Ошибка: ${err.message || 'Неизвестная ошибка'}`, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Добавление комментария
  const handleAddComment = async (projectId) => {
    if (!commentText.trim() || !projectId) return;
    
    try {
      const { data, error } = await supabase
        .from('project_comments')
        .insert([{
          project_id: projectId,
          user_id: userId,
          user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Пользователь',
          content: commentText.trim()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      setComments(prev => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), data]
      }));
      
      // Обновляем счётчик комментариев
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, comments_count: (p.comments_count || 0) + 1 }
          : p
      ));
      
      setCommentText('');
      showNotification?.('💬 Комментарий добавлен', 'success');
    } catch (err) {
      console.error('Ошибка добавления комментария:', err);
      showNotification?.('❌ Не удалось добавить комментарий', 'error');
    }
  };

  // Удаление комментария
  const handleDeleteComment = async (projectId, commentId) => {
    if (!confirm('Удалить комментарий?')) return;
    
    try {
      const { error } = await supabase
        .from('project_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      
      setComments(prev => ({
        ...prev,
        [projectId]: (prev[projectId] || []).filter(c => c.id !== commentId)
      }));
      
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) }
          : p
      ));
      
      showNotification?.('🗑️ Комментарий удалён', 'success');
    } catch (err) {
      console.error('Ошибка удаления комментария:', err);
      showNotification?.('❌ Не удалось удалить комментарий', 'error');
    }
  };

  // Переключение "Избранное"
  const handleToggleFavorite = async (projectId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_favorite: !currentStatus })
        .eq('id', projectId);
      
      if (error) throw error;
      
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, is_favorite: !currentStatus }
          : p
      ));
      
      showNotification?.(!currentStatus ? '⭐ Добавлено в избранное' : '⭐ Убрано из избранного', 'success');
    } catch (err) {
      console.error('Ошибка:', err);
      showNotification?.('❌ Не удалось изменить статус', 'error');
    }
  };

  // Привязка к заявке
  const handleLinkToApplication = async (projectId) => {
    if (!selectedApplicationId) {
      showNotification?.('⚠️ Выберите заявку', 'warning');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('project_application_links')
        .insert([{
          project_id: projectId,
          application_id: selectedApplicationId
        }]);
      
      if (error) throw error;
      
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, linked_applications: [...(p.linked_applications || []), selectedApplicationId] }
          : p
      ));
      
      setShowLinkToApplication(false);
      setSelectedApplicationId('');
      showNotification?.('🔗 Проект привязан к заявке', 'success');
    } catch (err) {
      console.error('Ошибка привязки:', err);
      showNotification?.('❌ Не удалось привязать проект', 'error');
    }
  };

  // Обновление проекта
  const handleUpdateProject = async (projectId) => {
    if (!editName.trim()) {
      showNotification?.('⚠️ Введите название', 'warning');
      return;
    }
    
    try {
      const updateData = {
        name: editName.trim(),
        category: editCategory || 'other',
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId);
      
      if (error) throw error;
      
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, ...updateData }
          : p
      ));
      
      setEditingProject(null);
      showNotification?.('✅ Проект обновлён', 'success');
    } catch (err) {
      console.error('Ошибка обновления:', err);
      showNotification?.('❌ Не удалось обновить проект', 'error');
    }
  };

  // Удаление проекта
  const handleDeleteProject = async (projectId, storagePath) => {
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
      showNotification?.('🗑️ Проект удалён', 'success');
    } catch (err) {
      console.error('Ошибка удаления:', err);
      showNotification?.('❌ Не удалось удалить проект', 'error');
    }
  };

  // Форматирование размера
  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Фильтрация
  const filteredProjects = useMemo(() => {
    let result = projects;
    
    // Поиск
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(term) ||
        (p.description || '').toLowerCase().includes(term) ||
        (p.tags || []).some(t => t.toLowerCase().includes(term))
      );
    }
    
    // Категория
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category === selectedCategory);
    }
    
    return result;
  }, [projects, searchTerm, selectedCategory]);

  // Доступ к управлению
  const canManage = ['manager', 'director', 'supply_admin', 'master', 'foreman'].includes(userRole);

  // Инициализация
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">У вас нет доступа к управлению проектами</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      {/* Заголовок */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-[#4A6572]" />
            Мои проекты
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Управляйте проектными документами, добавляйте теги и категории
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              showOnlyFavorites
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            <Star className="w-4 h-4" />
            Избранное
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
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

      {/* Фильтры */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по названию, описанию, тегам..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-800"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4A6572]"
        >
          <option value="all">📁 Все категории</option>
          {PROJECT_CATEGORIES.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.label}</option>
          ))}
        </select>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
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
          <p className="text-gray-500 text-lg">Нет проектов</p>
          <p className="text-sm text-gray-400 mt-1">Нажмите «Загрузить проект», чтобы добавить файлы</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProjects.map((project) => {
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(
              project.name.split('.').pop()?.toLowerCase()
            );
            const category = PROJECT_CATEGORIES.find(c => c.id === project.category);
            
            return (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all group"
              >
                {/* Картинка/превью */}
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
                  {isImage ? (
                    <img 
                      src={project.publicUrl} 
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="w-16 h-16 text-gray-400" />
                  )}
                  
                  {/* Бейджи */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {category && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${category.color}`}>
                        {category.label}
                      </span>
                    )}
                    {project.is_favorite && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> Избранное
                      </span>
                    )}
                    {project.version > 1 && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                        v{project.version}
                      </span>
                    )}
                  </div>
                  
                  {/* Кнопки действий */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 flex-wrap p-2">
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setShowPreview(true);
                      }}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                      title="Просмотр"
                    >
                      <Eye className="w-5 h-5 text-gray-700" />
                    </button>
                    <a
                      href={project.publicUrl}
                      download={project.name}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                      title="Скачать"
                    >
                      <Download className="w-5 h-5 text-gray-700" />
                    </a>
                    <button
                      onClick={() => handleToggleFavorite(project.id, project.is_favorite)}
                      className={`p-2 rounded-lg transition-colors ${project.is_favorite ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-white hover:bg-gray-100'}`}
                      title={project.is_favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                    >
                      {project.is_favorite ? <Star className="w-5 h-5 text-white" /> : <Star className="w-5 h-5 text-gray-700" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingProject(project.id);
                        setEditName(project.name);
                        setEditCategory(project.category || 'other');
                        setEditTags((project.tags || []).join(', '));
                      }}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                      title="Редактировать"
                    >
                      <Edit3 className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setShowLinkToApplication(true);
                      }}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
                      title="Привязать к заявке"
                    >
                      <Link2 className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProject(project);
                        setShowComments(true);
                        loadComments(project.id);
                      }}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors relative"
                      title="Комментарии"
                    >
                      <MessageCircle className="w-5 h-5 text-gray-700" />
                      {project.comments_count > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {project.comments_count}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id, project.storage_path)}
                      className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
                
                {/* Информация */}
                <div className="p-3">
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate" title={project.name}>
                    {project.name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>{formatSize(project.file_size)}</span>
                    <span>•</span>
                    <span>{new Date(project.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                          #{tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{project.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                  {project.linked_applications && project.linked_applications.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-blue-500">
                      <Link2 className="w-3 h-3" />
                      <span>{project.linked_applications.length} заявок</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredProjects.map((project) => {
            const category = PROJECT_CATEGORIES.find(c => c.id === project.category);
            
            return (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-all flex items-center gap-4 group"
              >
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {project.name}
                    </p>
                    {category && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${category.color}`}>
                        {category.label}
                      </span>
                    )}
                    {project.is_favorite && (
                      <Star className="w-4 h-4 text-yellow-500" />
                    )}
                    {project.version > 1 && (
                      <span className="text-xs text-gray-400">v{project.version}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>{formatSize(project.file_size)}</span>
                    <span>•</span>
                    <span>{new Date(project.created_at).toLocaleDateString('ru-RU')}</span>
                    {project.tags && project.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex gap-1">
                          {project.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                              #{tag}
                            </span>
                          ))}
                        </span>
                      </>
                    )}
                    {project.comments_count > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {project.comments_count}
                        </span>
                      </>
                    )}
                    {project.linked_applications && project.linked_applications.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-blue-500">
                          <Link2 className="w-3 h-3" />
                          {project.linked_applications.length} заявок
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setShowPreview(true);
                    }}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <a
                    href={project.publicUrl}
                    download={project.name}
                    className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleToggleFavorite(project.id, project.is_favorite)}
                    className={`p-1.5 rounded-lg transition-colors ${project.is_favorite ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:bg-gray-100'}`}
                  >
                    {project.is_favorite ? <Star className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setEditingProject(project.id);
                      setEditName(project.name);
                      setEditCategory(project.category || 'other');
                      setEditTags((project.tags || []).join(', '));
                    }}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setShowComments(true);
                      loadComments(project.id);
                    }}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id, project.storage_path)}
                    className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
        {showOnlyFavorites && ' (только избранные)'}
      </div>

      {/* Модальное окно редактирования */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingProject(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Редактировать проект</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Категория</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                >
                  {PROJECT_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Теги (через запятую)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Строительство, Ремонт, Фасад"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {POPULAR_TAGS.slice(0, 8).map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        const current = editTags.split(',').map(t => t.trim()).filter(Boolean);
                        if (!current.includes(tag)) {
                          setEditTags([...current, tag].join(', '));
                        }
                      }}
                      className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleUpdateProject(editingProject)}
                  className="flex-1 px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Сохранить
                </button>
                <button
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно комментариев */}
      {showComments && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowComments(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Комментарии к "{selectedProject.name}"
              </h3>
              <button onClick={() => setShowComments(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {commentLoading[selectedProject.id] ? (
                <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-[#4A6572]" /></div>
              ) : (comments[selectedProject.id] || []).length === 0 ? (
                <p className="text-center text-gray-400 py-4">Нет комментариев</p>
              ) : (
                (comments[selectedProject.id] || []).map(comment => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {comment.user_name || 'Пользователь'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {new Date(comment.created_at).toLocaleString('ru-RU')}
                        </span>
                        {comment.user_id === userId && (
                          <button
                            onClick={() => handleDeleteComment(selectedProject.id, comment.id)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Напишите комментарий..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A6572]"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment(selectedProject.id);
                    }
                  }}
                />
                <button
                  onClick={() => handleAddComment(selectedProject.id)}
                  disabled={!commentText.trim()}
                  className="px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors disabled:opacity-50"
                >
                  Отправить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно привязки к заявке */}
      {showLinkToApplication && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLinkToApplication(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Привязать к заявке</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Выберите заявку для привязки проекта "{selectedProject.name}"
              </p>
              <select
                value={selectedApplicationId}
                onChange={(e) => setSelectedApplicationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Выберите заявку...</option>
                {applications
                  .filter(a => !(selectedProject.linked_applications || []).includes(a.id))
                  .map(app => (
                    <option key={app.id} value={app.id}>
                      {app.object_name} - {app.foreman_name} ({new Date(app.created_at).toLocaleDateString()})
                    </option>
                  ))}
              </select>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleLinkToApplication(selectedProject.id)}
                  disabled={!selectedApplicationId}
                  className="flex-1 px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors disabled:opacity-50"
                >
                  <Link2 className="w-4 h-4 inline mr-2" /> Привязать
                </button>
                <button
                  onClick={() => setShowLinkToApplication(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно предпросмотра */}
      {showPreview && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <FolderOpen className="w-5 h-5 text-[#4A6572] flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{selectedProject.name}</h3>
                {selectedProject.is_favorite && <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleFavorite(selectedProject.id, selectedProject.is_favorite)}
                  className="p-2 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                >
                  {selectedProject.is_favorite ? <Star className="w-5 h-5" /> : <Star className="w-5 h-5" />}
                </button>
                <a
                  href={selectedProject.publicUrl}
                  download={selectedProject.name}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button onClick={() => setShowPreview(false)} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
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
                  return <img src={selectedProject.publicUrl} alt={selectedProject.name} className="w-full h-auto rounded-lg" />;
                } else if (isPDF) {
                  return <embed src={selectedProject.publicUrl} type="application/pdf" className="w-full h-[70vh] rounded-lg" />;
                } else {
                  return (
                    <div className="text-center py-12">
                      <FileText className="w-24 h-24 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Предпросмотр недоступен для этого типа файла</p>
                      <a href={selectedProject.publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#4A6572] text-white rounded-lg hover:bg-[#344955] transition-colors">
                        <ExternalLink className="w-4 h-4" /> Открыть в новой вкладке
                      </a>
                    </div>
                  );
                }
              })()}
              
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Название:</span> <p className="font-medium">{selectedProject.name}</p></div>
                  <div><span className="text-gray-500">Размер:</span> <p className="font-medium">{formatSize(selectedProject.file_size)}</p></div>
                  <div><span className="text-gray-500">Загружен:</span> <p className="font-medium">{new Date(selectedProject.created_at).toLocaleString('ru-RU')}</p></div>
                  <div><span className="text-gray-500">Версия:</span> <p className="font-medium">v{selectedProject.version}</p></div>
                  <div><span className="text-gray-500">Категория:</span> <p className="font-medium">{PROJECT_CATEGORIES.find(c => c.id === selectedProject.category)?.label || 'Не указана'}</p></div>
                  <div><span className="text-gray-500">Теги:</span> <p className="font-medium">{(selectedProject.tags || []).join(', ') || 'Нет'}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManager;