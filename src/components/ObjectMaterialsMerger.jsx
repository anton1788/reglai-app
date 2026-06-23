// src/components/ObjectMaterialsMerger.jsx
import React, { useState, useMemo } from 'react';
import { Package, ChevronDown, ChevronRight, CheckCircle, AlertCircle, Loader2, Layers, Plus } from 'lucide-react';

const ObjectMaterialsMerger = ({
  supabase,
  companyId,
  applications,
  showNotification,
  user,
  setApplications,
  // eslint-disable-next-line no-unused-vars
  loadApplications,
  // eslint-disable-next-line no-unused-vars
  page,
  onMergeComplete
}) => {
  // ============================================================
  // 📊 STATE
  // ============================================================
  const [isLoading, setIsLoading] = useState(false);
  const [expandedObjects, setExpandedObjects] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [selectedObject, setSelectedObject] = useState(null);
  
  // ✅ ДОБАВЛЕННЫЕ СОСТОЯНИЯ
  // eslint-disable-next-line no-unused-vars
  const [isMerging, setIsMerging] = useState(false);
  const [mergeInProgress, setMergeInProgress] = useState(null);
  
  // ============================================================
  // 📊 ГРУППИРОВКА ЗАЯВОК ПО ОБЪЕКТАМ
  // ============================================================
  const groupedApplications = useMemo(() => {
    const groups = {};
    
    applications.forEach(app => {
      // Пропускаем отменённые и завершённые
      if (app.status === 'canceled' || app.status === 'received') return;
      
      const objectName = app.object_name || 'Без объекта';
      if (!groups[objectName]) {
        groups[objectName] = [];
      }
      groups[objectName].push(app);
    });
    
    // Сортировка по количеству заявок
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  }, [applications]);

  // ============================================================
  // 🔄 ФУНКЦИЯ ОБЪЕДИНЕНИЯ (С ДОБАВЛЕННОЙ ЗАЩИТОЙ)
  // ============================================================
  // src/components/ObjectMaterialsMerger.jsx

const mergeObjectMaterials = async (objectName, applicationsToMerge) => {
  // ✅ Проверяем, не выполняется ли уже объединение для этого объекта
  if (mergeInProgress === objectName) {
    showNotification('⏳ Объединение уже выполняется', 'info');
    return;
  }
  
  if (applicationsToMerge.length < 2) {
    showNotification('Для объединения нужно минимум 2 заявки', 'warning');
    return;
  }
  
  // Проверяем, нет ли уже объединённой заявки
  const hasConsolidated = applications.some(app =>
    app.object_name === objectName &&
    app.is_consolidated === true
  );
  
  if (hasConsolidated) {
    showNotification('Заявки по этому объекту уже объединены', 'warning');
    return;
  }
  
  setMergeInProgress(objectName);
  setIsLoading(true);
  
  try {
    // Собираем все материалы из всех заявок
    const allMaterials = [];
    
    applicationsToMerge.forEach(app => {
      if (app.materials && Array.isArray(app.materials)) {
        app.materials.forEach(material => {
          const qty = Number(material.quantity) || 0;
          allMaterials.push({
            description: material.description || 'Без названия',
            quantity: qty,
            unit: material.unit || 'шт',
            source_application_id: app.id,
            source_object_name: app.object_name,
            received: Number(material.received) || 0,
            status: material.status || 'pending'
          });
        });
      }
    });
    
    if (allMaterials.length === 0) {
      showNotification('Нет материалов для объединения', 'warning');
      return;
    }
    
    // Группируем материалы по названию
    const groupedMaterials = {};
    allMaterials.forEach(material => {
      const key = material.description.trim().toLowerCase();
      if (!groupedMaterials[key]) {
        groupedMaterials[key] = {
          description: material.description,
          unit: material.unit,
          quantity: 0,
          received: 0,
          sources: [],
          status: material.status
        };
      }
      groupedMaterials[key].quantity += material.quantity;
      groupedMaterials[key].received += material.received || 0;
      groupedMaterials[key].sources.push({
        applicationId: material.source_application_id,
        quantity: material.quantity,
        objectName: material.source_object_name
      });
    });
    
    // Преобразуем обратно в массив
    const mergedMaterials = Object.values(groupedMaterials).map(m => ({
      description: m.description,
      quantity: m.quantity,
      unit: m.unit || 'шт',
      received: m.received,
      status: m.received >= m.quantity ? 'received' : 'pending',
      sources: m.sources
    }));
    
    // Создаём объединённую заявку
    const consolidatedApplication = {
      object_name: objectName,
      foreman_name: applicationsToMerge[0]?.foreman_name || 'Объединённая заявка',
      foreman_phone: applicationsToMerge[0]?.foreman_phone || '',
      materials: mergedMaterials,
      status: 'pending',
      user_id: user?.id,
      company_id: companyId,
      created_at: new Date().toISOString(),
      is_consolidated: true,
      consolidated_from: applicationsToMerge.map(app => app.id),
      status_history: [{
        user_id: user?.id,
        user_email: user?.email,
        action: 'consolidated',
        timestamp: new Date().toISOString(),
        details: `Объединено ${applicationsToMerge.length} заявок`
      }],
      viewed_by_supply_admin: false
    };
    
    // Сохраняем объединённую заявку
    const { data: newApp, error: insertError } = await supabase
      .from('applications')
      .insert([consolidatedApplication])
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    // Помечаем исходные заявки как объединённые
    const updatePromises = applicationsToMerge.map(app =>
      supabase
        .from('applications')
        .update({
          status: 'consolidated',
          consolidated_into: newApp.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', app.id)
    );
    
    await Promise.all(updatePromises);
    
    // ✅ ВАЖНО: Сначала вызываем onMergeComplete с skipReload
    if (onMergeComplete) {
      await onMergeComplete({ skipReload: true });
    }
    
    // ✅ Затем обновляем локальное состояние
    if (setApplications) {
      setApplications(prev => {
        // Удаляем объединённые заявки
        const filtered = prev.filter(app =>
          !applicationsToMerge.some(a => a.id === app.id)
        );
        // Добавляем новую заявку в начало списка
        return [newApp, ...filtered];
      });
    }
    
    showNotification(`✅ Объединено ${applicationsToMerge.length} заявок в одну`, 'success');
    
  } catch (err) {
    console.error('Ошибка объединения:', err);
    showNotification('❌ Ошибка при объединении: ' + err.message, 'error');
  } finally {
    setIsLoading(false);
    setMergeInProgress(null);
  }
};
  
  // ============================================================
  // 🎯 ОБРАБОТЧИКИ
  // ============================================================
  const toggleObject = (objectName) => {
    setExpandedObjects(prev => ({
      ...prev,
      [objectName]: !prev[objectName]
    }));
  };
  
  const handleMerge = (objectName) => {
    const apps = groupedApplications[objectName] || [];
    if (apps.length < 2) {
      showNotification('Для объединения нужно минимум 2 заявки', 'warning');
      return;
    }
    mergeObjectMaterials(objectName, apps);
  };
  
  // ============================================================
  // 🖼️ RENDER
  // ============================================================
  const objectNames = Object.keys(groupedApplications);
  
  if (objectNames.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-4 page-enter">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Нет заявок для объединения
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Создайте несколько заявок на один объект, чтобы объединить их материалы
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto p-4 page-enter">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-[#4A6572]" />
              Объединение материалов
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Выберите объект для объединения всех материалов из его заявок
            </p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Всего объектов: <span className="font-semibold">{objectNames.length}</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {objectNames.map((objectName) => {
            const apps = groupedApplications[objectName] || [];
            const isExpanded = expandedObjects[objectName] || false;
            const hasConsolidated = applications.some(app =>
              app.object_name === objectName &&
              app.is_consolidated === true
            );
            const isMergingThis = mergeInProgress === objectName;
            
            // Подсчёт материалов
            let totalMaterials = 0;
            const uniqueMaterials = new Set();
            apps.forEach(app => {
              if (app.materials) {
                app.materials.forEach(m => {
                  if (m.description) {
                    uniqueMaterials.add(m.description.trim().toLowerCase());
                  }
                  totalMaterials += Number(m.quantity) || 0;
                });
              }
            });
            
            return (
              <div
                key={objectName}
                className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:border-[#4A6572]/30 transition-colors"
              >
                {/* Заголовок объекта */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  onClick={() => toggleObject(objectName)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {objectName}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{apps.length} заявок</span>
                        <span>•</span>
                        <span>{uniqueMaterials.size} уникальных материалов</span>
                        <span>•</span>
                        <span>{totalMaterials} шт.</span>
                        {hasConsolidated && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-[10px]">
                            Объединено
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Кнопка объединения */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMerge(objectName);
                    }}
                    disabled={isLoading || apps.length < 2 || hasConsolidated || isMergingThis}
                    className={`ml-2 flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                      apps.length >= 2 && !hasConsolidated && !isMergingThis && !isLoading
                        ? 'bg-[#4A6572] text-white hover:bg-[#344955]'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {isMergingThis ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                        Объединение...
                      </>
                    ) : hasConsolidated ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Уже объединено
                      </>
                    ) : apps.length >= 2 ? (
                      <>
                        <Plus className="w-4 h-4" />
                        Объединить ({apps.length})
                      </>
                    ) : (
                      'Нет заявок для объединения'
                    )}
                  </button>
                </div>
                
                {/* Список заявок (раскрывается) */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="p-4 space-y-2">
                      {apps.map((app, index) => (
                        <div
                          key={app.id}
                          className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">#{index + 1}</span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {app.foreman_name || 'Не указан'}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${
                                  app.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                  app.status === 'partial_received' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                }`}>
                                  {app.status || 'pending'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">
                                Материалов: {app.materials?.length || 0} • 
                                Создана: {new Date(app.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {app.materials?.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0) || 0} шт.
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Информация о том, как работает объединение */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Как работает объединение?
              </p>
              <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                <li>• Все материалы из выбранных заявок суммируются</li>
                <li>• Одинаковые материалы группируются в одну позицию</li>
                <li>• Исходные заявки помечаются как объединённые</li>
                <li>• Создаётся новая заявка со всеми материалами</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObjectMaterialsMerger;