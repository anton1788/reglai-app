// src/components/ObjectMaterialsMerger.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { 
  Package, AlertCircle, CheckCircle, 
  Layers, Merge, X,
  ClipboardList, Building, Calendar, Users,
  Loader2, Filter, Search, ChevronDown, ChevronUp,
  Trash2, Edit3, Eye, FileText, Download
} from 'lucide-react';

const ObjectMaterialsMerger = ({ 
  supabase, 
  companyId, 
  applications, 
  showNotification,
  onMerged // ← новый callback для обновления списка
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mergedData, setMergedData] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedObjects, setExpandedObjects] = useState(new Set());

  // Фильтрация объектов по поиску
  const filteredObjects = useMemo(() => {
    if (!searchQuery.trim()) return objectsWithApplications;
    const query = searchQuery.toLowerCase().trim();
    return objectsWithApplications.filter(obj => 
      obj.name.toLowerCase().includes(query) ||
      obj.foremen?.some(f => f.toLowerCase().includes(query))
    );
  }, [objectsWithApplications, searchQuery]);

  // Группировка заявок по объектам (улучшена)
  const objectsWithApplications = useMemo(() => {
    const objects = {};
    
    applications.forEach(app => {
      // Пропускаем уже объединённые заявки
      if (app.status === 'consolidated') return;
      
      const objName = app.object_name;
      if (!objects[objName]) {
        objects[objName] = {
          name: objName,
          applications: [],
          totalMaterials: 0,
          uniqueMaterials: new Map(),
          statuses: new Set(),
          createdDates: [],
          foremen: new Set(),
          totalQuantity: 0,
          receivedQuantity: 0
        };
      }
      
      const obj = objects[objName];
      obj.applications.push(app);
      obj.statuses.add(app.status);
      obj.createdDates.push(new Date(app.created_at));
      obj.foremen.add(app.foreman_name);
      
      // Сбор материалов с улучшенной агрегацией
      app.materials?.forEach(mat => {
        const key = mat.description.toLowerCase().trim();
        const existing = obj.uniqueMaterials.get(key);
        const qty = Number(mat.quantity) || 0;
        const received = Number(mat.received) || 0;
        
        if (existing) {
          existing.totalQuantity += qty;
          existing.totalReceived += received;
          existing.applications.push({
            id: app.id,
            date: app.created_at,
            foreman: app.foreman_name,
            quantity: qty,
            received: received,
            status: mat.status
          });
        } else {
          obj.uniqueMaterials.set(key, {
            name: mat.description,
            unit: mat.unit || 'шт',
            totalQuantity: qty,
            totalReceived: received,
            applications: [{
              id: app.id,
              date: app.created_at,
              foreman: app.foreman_name,
              quantity: qty,
              received: received,
              status: mat.status
            }]
          });
        }
        
        obj.totalQuantity += qty;
        obj.receivedQuantity += received;
      });
      
      obj.totalMaterials += app.materials?.length || 0;
    });
    
    // Конвертируем и сортируем по количеству заявок (сначала самые "проблемные")
    return Object.values(objects)
      .map(obj => ({
        ...obj,
        uniqueMaterialsArray: Array.from(obj.uniqueMaterials.values()),
        totalUniqueMaterials: obj.uniqueMaterials.size,
        lastActivity: obj.createdDates.length > 0 
          ? new Date(Math.max(...obj.createdDates)).toLocaleDateString('ru-RU')
          : '—',
        mergeScore: obj.applications.length * 10 + obj.uniqueMaterials.size,
        foremen: Array.from(obj.foremen)
      }))
      .sort((a, b) => b.mergeScore - a.mergeScore);
  }, [applications]);

  // Улучшенное обнаружение дубликатов
  const duplicates = useMemo(() => {
    const allMaterials = {};
    
    applications.forEach(app => {
      if (app.status === 'consolidated') return;
      
      app.materials?.forEach(mat => {
        const key = `${app.object_name}|${mat.description.toLowerCase().trim()}`;
        if (!allMaterials[key]) {
          allMaterials[key] = {
            objectName: app.object_name,
            materialName: mat.description,
            unit: mat.unit || 'шт',
            applications: [],
            totalQuantity: 0
          };
        }
        const qty = Number(mat.quantity) || 0;
        allMaterials[key].applications.push({
          id: app.id,
          foreman: app.foreman_name,
          quantity: qty,
          date: app.created_at,
          status: app.status
        });
        allMaterials[key].totalQuantity += qty;
      });
    });
    
    // Только материалы, которые заказаны в нескольких заявках
    return Object.values(allMaterials)
      .filter(m => m.applications.length > 1)
      .sort((a, b) => b.applications.length - a.applications.length);
  }, [applications]);

  // Функция для объединения материалов по объекту
  const mergeObjectMaterials = async (objectName, applicationsToMerge) => {
    setIsLoading(true);
    
    try {
      // Собираем все уникальные материалы с улучшенной агрегацией
      const mergedMaterials = new Map();
      
      applicationsToMerge.forEach(app => {
        app.materials?.forEach(mat => {
          const key = mat.description.toLowerCase().trim();
          const existing = mergedMaterials.get(key);
          const qty = Number(mat.quantity) || 0;
          const received = Number(mat.received) || 0;
          
          if (existing) {
            existing.totalQuantity += qty;
            existing.totalReceived += received;
            existing.applications.push({
              id: app.id,
              foreman: app.foreman_name,
              quantity: qty,
              received: received,
              date: app.created_at
            });
          } else {
            mergedMaterials.set(key, {
              description: mat.description,
              unit: mat.unit || 'шт',
              totalQuantity: qty,
              totalReceived: received,
              requestedQuantity: qty,
              receivedQuantity: received,
              applications: [{
                id: app.id,
                foreman: app.foreman_name,
                quantity: qty,
                received: received,
                date: app.created_at
              }]
            });
          }
        });
      });
      
      setMergedData({
        objectName,
        applications: applicationsToMerge,
        materials: Array.from(mergedMaterials.values()),
        totalApplications: applicationsToMerge.length,
        totalMaterials: mergedMaterials.size,
        foremen: [...new Set(applicationsToMerge.map(a => a.foreman_name))],
        totalQuantity: Array.from(mergedMaterials.values()).reduce((sum, m) => sum + m.totalQuantity, 0)
      });
      
      setShowMergeModal(true);
      
    } catch (err) {
      console.error('Ошибка объединения:', err);
      showNotification('Ошибка при анализе заявок', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Создание сводной заявки из объединённых материалов (улучшена)
  const createConsolidatedApplication = async () => {
    if (!mergedData) return;
    
    setIsLoading(true);
    
    try {
      // Проверяем, не была ли уже создана сводная заявка
      const { data: existing } = await supabase
        .from('applications')
        .select('id')
        .eq('object_name', mergedData.objectName)
        .eq('is_consolidated', true)
        .maybeSingle();
      
      if (existing) {
        showNotification('⚠️ Для этого объекта уже есть сводная заявка', 'warning');
        setShowMergeModal(false);
        setIsLoading(false);
        return;
      }
      
      // Создаём новую заявку со статусом "сводная"
      const consolidatedApp = {
        object_name: mergedData.objectName,
        foreman_name: `Сводная заявка (${mergedData.foremen.join(', ')})`,
        foreman_phone: mergedData.applications[0]?.foreman_phone || '',
        materials: mergedData.materials.map(m => ({
          description: m.description,
          quantity: m.totalQuantity,
          unit: m.unit,
          received: 0,
          supplier_received_quantity: 0,
          status: 'pending',
          original_applications: m.applications.map(a => a.id),
          original_quantities: m.applications.map(a => ({
            applicationId: a.id,
            quantity: a.quantity,
            foreman: a.foreman
          }))
        })),
        status: 'pending',
        user_id: (await supabase.auth.getUser()).data.user?.id,
        company_id: companyId,
        created_at: new Date().toISOString(),
        is_consolidated: true,
        consolidated_from: mergedData.applications.map(a => a.id),
        total_amount: mergedData.materials.reduce((sum, m) => sum + (m.totalQuantity * 1000), 0),
        status_history: [{
          action: 'created_consolidated',
          timestamp: new Date().toISOString(),
          details: `Объединено ${mergedData.applications.length} заявок от ${mergedData.foremen.join(', ')}`
        }]
      };
      
      const { data, error } = await supabase
        .from('applications')
        .insert([consolidatedApp])
        .select();
      
      if (error) throw error;
      
      // Помечаем исходные заявки как объединённые
      for (const app of mergedData.applications) {
        await supabase
          .from('applications')
          .update({
            status: 'consolidated',
            consolidated_into: data[0].id,
            status_history: [
              ...(app.status_history || []),
              {
                action: 'consolidated',
                timestamp: new Date().toISOString(),
                details: `Объединено в сводную заявку #${data[0].id}`
              }
            ]
          })
          .eq('id', app.id);
      }
      
      showNotification(`✅ Создана сводная заявка для объекта "${mergedData.objectName}"`, 'success');
      setShowMergeModal(false);
      setMergedData(null);
      
      // Вызываем callback для обновления списка
      if (onMerged) {
        onMerged(data[0]);
      }
      
      // Перезагружаем данные без полного релоада
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (err) {
      console.error('Ошибка создания сводной заявки:', err);
      showNotification('Ошибка при создании сводной заявки: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Переключение разворачивания объекта
  const toggleObject = useCallback((objectName) => {
    setExpandedObjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectName)) {
        newSet.delete(objectName);
      } else {
        newSet.add(objectName);
      }
      return newSet;
    });
  }, []);

  // Рендер карточки объекта (улучшена)
  const ObjectCard = ({ obj }) => {
    const duplicateCount = duplicates.filter(d => d.objectName === obj.name).length;
    const isExpanded = expandedObjects.has(obj.name);
    const canMerge = obj.applications.length >= 2;
    const totalQty = obj.uniqueMaterialsArray.reduce((sum, m) => sum + m.totalQuantity, 0);
    const receivedQty = obj.uniqueMaterialsArray.reduce((sum, m) => sum + m.totalReceived, 0);
    const completionPercent = totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;
    
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl border transition-all ${
        canMerge ? 'border-indigo-200 dark:border-indigo-800 hover:shadow-lg' : 'border-gray-200/60 dark:border-gray-700/60'
      }`}>
        {/* Заголовок карточки - кликабельный */}
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors"
          onClick={() => toggleObject(obj.name)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Building className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {obj.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {duplicateCount > 0 && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {duplicateCount}
                </span>
              )}
              <ChevronDown 
                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              />
            </div>
          </div>
          
          {/* Компактная статистика */}
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" />
              {obj.applications.length} заявок
            </span>
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              {obj.totalUniqueMaterials} материалов
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {obj.foremen.length} бригад
            </span>
            {totalQty > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                {completionPercent}%
              </span>
            )}
          </div>
        </div>
        
        {/* Развернутая часть */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700">
            {/* Список заявок */}
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Заявки:</p>
              {obj.applications.map((app, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 dark:bg-gray-700/20 rounded">
                  <span className="text-gray-700 dark:text-gray-300">
                    #{app.id?.slice(0, 8)} • {app.foreman_name}
                  </span>
                  <span className="text-gray-500">
                    {app.materials?.length || 0} материалов
                  </span>
                </div>
              ))}
            </div>
            
            {/* Дублирующиеся материалы */}
            {duplicateCount > 0 && (
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                  ⚠️ {duplicateCount} материалов заказаны в нескольких заявках
                </p>
                <div className="mt-1 space-y-0.5">
                  {duplicates.filter(d => d.objectName === obj.name).slice(0, 3).map((d, i) => (
                    <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400">
                      • {d.materialName} ({d.applications.length} заявок, всего {d.totalQuantity} {d.unit})
                    </p>
                  ))}
                  {duplicates.filter(d => d.objectName === obj.name).length > 3 && (
                    <p className="text-xs text-yellow-500">
                      + ещё {duplicates.filter(d => d.objectName === obj.name).length - 3}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Кнопка объединения */}
            <button
              onClick={() => mergeObjectMaterials(obj.name, obj.applications)}
              disabled={isLoading || !canMerge}
              className={`w-full mt-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                canMerge
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Merge className="w-4 h-4" />
              )}
              {canMerge ? `Объединить ${obj.applications.length} заявок` : 'Нет заявок для объединения'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // Модальное окно предпросмотра объединения (улучшена)
  const MergePreviewModal = () => {
    if (!showMergeModal || !mergedData) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold">Объединение заявок</h3>
            </div>
            <button onClick={() => setShowMergeModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Информация об объекте */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-lg">{mergedData.objectName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Объединяется {mergedData.applications.length} заявок от {mergedData.foremen.join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Всего материалов: <span className="font-bold">{mergedData.totalMaterials}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Общее количество: <span className="font-bold">{mergedData.totalQuantity}</span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Список материалов с группировкой */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Сводный список материалов ({mergedData.materials.length} позиций)
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {mergedData.materials.map((mat, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{mat.description}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {mat.totalQuantity} {mat.unit}
                          </span>
                          {mat.totalReceived > 0 && (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              ✅ получено: {mat.totalReceived}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            в {mat.applications.length} заявках
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500 flex-shrink-0 ml-4">
                        <p className="font-medium">По заявкам:</p>
                        {mat.applications.map((app, i) => (
                          <p key={i}>
                            {app.foreman}: {app.quantity} {mat.unit}
                            {app.received > 0 && ` ✅${app.received}`}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
            <button
              onClick={() => setShowMergeModal(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={createConsolidatedApplication}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Создать сводную заявку
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Статистика для顶部
  const stats = useMemo(() => {
    const totalApps = applications.filter(a => a.status !== 'consolidated').length;
    const totalObjects = objectsWithApplications.length;
    const totalDuplicates = duplicates.length;
    const mergeableObjects = objectsWithApplications.filter(o => o.applications.length >= 2).length;
    
    return { totalApps, totalObjects, totalDuplicates, mergeableObjects };
  }, [applications, objectsWithApplications, duplicates]);

  if (objectsWithApplications.length === 0) {
    return (
      <div className="text-center py-12 bg-white/80 dark:bg-gray-800/80 rounded-2xl">
        <Building className="w-16 h-16 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">Нет объектов с заявками</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Merge className="w-6 h-6 text-indigo-600" />
            Объединение заявок
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Объединяйте заявки на одном объекте для оптимизации закупок
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              // Экспорт данных в консоль
              console.log('📊 Данные для объединения:', { objectsWithApplications, duplicates });
              showNotification('📊 Данные выведены в консоль', 'info');
            }}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            <FileText className="w-4 h-4 inline mr-1" />
            Экспорт данных
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl">
          <div className="text-2xl font-bold text-indigo-600">{stats.totalObjects}</div>
          <div className="text-xs text-gray-600">Объектов с заявками</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl">
          <div className="text-2xl font-bold text-yellow-600">{stats.totalDuplicates}</div>
          <div className="text-xs text-gray-600">Потенциальных дублей</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
          <div className="text-2xl font-bold text-green-600">{stats.mergeableObjects}</div>
          <div className="text-xs text-gray-600">Объектов для объединения</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl">
          <div className="text-2xl font-bold text-purple-600">{stats.totalApps}</div>
          <div className="text-xs text-gray-600">Всего активных заявок</div>
        </div>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по объекту или бригадиру..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white/80 dark:bg-gray-700/80 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* Предупреждение о дублях */}
      {duplicates.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300">
                Обнаружены повторяющиеся материалы ({duplicates.length})
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Некоторые материалы заказаны в нескольких заявках на одном объекте.
                Рекомендуем объединить заявки для оптимизации закупок.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Список объектов */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredObjects.map((obj, idx) => (
          <ObjectCard key={idx} obj={obj} />
        ))}
      </div>

      {/* Если нет результатов поиска */}
      {filteredObjects.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p>Ничего не найдено по запросу "{searchQuery}"</p>
        </div>
      )}

      {/* Модальное окно */}
      <MergePreviewModal />
    </div>
  );
};

export default ObjectMaterialsMerger;