// src/components/ObjectMaterialsMerger.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, AlertCircle, CheckCircle, 
  Layers, Merge, X,
  ClipboardList, Building, Calendar, Users,
  RefreshCw
} from 'lucide-react';

const ObjectMaterialsMerger = ({ 
  supabase, 
  companyId, 
  applications, 
  showNotification,
  onMergeComplete,
  user,
  setApplications,
  loadApplications,
  page = 1
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mergedData, setMergedData] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [localApplications, setLocalApplications] = useState(applications);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Обновляем локальные заявки при изменении пропсов
  useEffect(() => {
    setLocalApplications(applications);
  }, [applications]);

  // Группировка заявок по объектам
  const objectsWithApplications = useMemo(() => {
    const objects = {};
    
    localApplications.forEach(app => {
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
          createdDates: []
        };
      }
      
      objects[objName].applications.push(app);
      objects[objName].statuses.add(app.status);
      objects[objName].createdDates.push(new Date(app.created_at));
      
      // Сбор материалов
      app.materials?.forEach(mat => {
        const key = mat.description.toLowerCase();
        const existing = objects[objName].uniqueMaterials.get(key);
        if (existing) {
          existing.totalQuantity += mat.quantity || 0;
          existing.applications.push({
            id: app.id,
            date: app.created_at,
            foreman: app.foreman_name,
            quantity: mat.quantity
          });
        } else {
          objects[objName].uniqueMaterials.set(key, {
            name: mat.description,
            unit: mat.unit || 'шт',
            totalQuantity: mat.quantity || 0,
            requestedQuantity: mat.quantity || 0,
            receivedQuantity: mat.received || 0,
            applications: [{
              id: app.id,
              date: app.created_at,
              foreman: app.foreman_name,
              quantity: mat.quantity
            }]
          });
        }
      });
      
      objects[objName].totalMaterials += app.materials?.length || 0;
    });
    
    return Object.values(objects).map(obj => ({
      ...obj,
      uniqueMaterialsArray: Array.from(obj.uniqueMaterials.values()),
      totalUniqueMaterials: obj.uniqueMaterials.size,
      lastActivity: obj.createdDates.length > 0 
        ? new Date(Math.max(...obj.createdDates)).toLocaleDateString('ru-RU')
        : '—'
    }));
  }, [localApplications]);

  // Автоматическое обнаружение дубликатов
  const duplicates = useMemo(() => {
    const allMaterials = {};
    
    localApplications.forEach(app => {
      if (app.status === 'consolidated') return;
      
      app.materials?.forEach(mat => {
        const key = `${app.object_name}|${mat.description.toLowerCase()}`;
        if (!allMaterials[key]) {
          allMaterials[key] = {
            objectName: app.object_name,
            materialName: mat.description,
            unit: mat.unit,
            applications: []
          };
        }
        allMaterials[key].applications.push({
          id: app.id,
          foreman: app.foreman_name,
          quantity: mat.quantity,
          date: app.created_at,
          status: app.status
        });
      });
    });
    
    return Object.values(allMaterials).filter(m => m.applications.length > 1);
  }, [localApplications]);

  // Функция для объединения материалов по объекту
  const mergeObjectMaterials = async (objectName, applicationsToMerge) => {
    setIsLoading(true);
    
    try {
      const mergedMaterials = new Map();
      
      applicationsToMerge.forEach(app => {
        app.materials?.forEach(mat => {
          const key = mat.description.toLowerCase();
          const existing = mergedMaterials.get(key);
          
          if (existing) {
            existing.totalQuantity += mat.quantity || 0;
            existing.applications.push({
              id: app.id,
              foreman: app.foreman_name,
              quantity: mat.quantity,
              date: app.created_at
            });
          } else {
            mergedMaterials.set(key, {
              description: mat.description,
              unit: mat.unit || 'шт',
              totalQuantity: mat.quantity || 0,
              requestedQuantity: mat.quantity || 0,
              receivedQuantity: mat.received || 0,
              applications: [{
                id: app.id,
                foreman: app.foreman_name,
                quantity: mat.quantity,
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
        foremen: [...new Set(applicationsToMerge.map(a => a.foreman_name))]
      });
      
      setShowMergeModal(true);
      
    } catch (err) {
      console.error('Ошибка объединения:', err);
      showNotification('Ошибка при анализе заявок', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Создание сводной заявки из объединённых материалов
  const createConsolidatedApplication = async () => {
    if (!mergedData) return;
    
    setIsLoading(true);
    
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userId = currentUser?.id || user?.id;
      
      if (!userId) {
        showNotification('Пользователь не авторизован', 'error');
        return;
      }

      // Создаём новую заявку
      const consolidatedApp = {
        object_name: mergedData.objectName,
        foreman_name: `Сводная заявка (${mergedData.foremen.join(', ')})`,
        foreman_phone: mergedData.applications[0]?.foreman_phone || '',
        materials: mergedData.materials.map(m => ({
          description: m.description,
          quantity: m.totalQuantity,
          unit: m.unit,
          received: 0,
          status: 'pending',
          original_applications: m.applications.map(a => a.id)
        })),
        status: 'pending',
        user_id: userId,
        company_id: companyId,
        created_at: new Date().toISOString(),
        is_consolidated: true,
        consolidated_from: mergedData.applications.map(a => a.id),
        status_history: [{
          action: 'created_consolidated',
          user_id: userId,
          timestamp: new Date().toISOString(),
          details: `Объединено ${mergedData.applications.length} заявок`
        }]
      };
      
      const { data, error } = await supabase
        .from('applications')
        .insert([consolidatedApp])
        .select();
      
      if (error) throw error;
      
      // Помечаем исходные заявки как объединённые
      const updatedApps = [];
      for (const app of mergedData.applications) {
        const { data: updatedApp, error: updateError } = await supabase
          .from('applications')
          .update({
            status: 'consolidated',
            consolidated_into: data[0].id,
            status_history: [
              ...(app.status_history || []),
              {
                action: 'consolidated',
                user_id: userId,
                timestamp: new Date().toISOString(),
                details: `Объединено в сводную заявку #${data[0].id}`
              }
            ]
          })
          .eq('id', app.id)
          .select()
          .single();
        
        if (!updateError && updatedApp) {
          updatedApps.push(updatedApp);
        }
      }
      
      // ✅ ФИЛЬТРУЕМ ОБЪЕДИНЁННЫЕ ЗАЯВКИ
      const mergedIds = new Set(mergedData.applications.map(a => a.id));
      const filteredApps = localApplications.filter(app => !mergedIds.has(app.id));
      
      // Добавляем новую заявку
      const newApp = data[0];
      const finalApps = [newApp, ...filteredApps];
      
      // Обновляем состояние
      setLocalApplications(finalApps);
      if (setApplications) {
        setApplications(finalApps);
      }
      
      showNotification(`✅ Создана сводная заявка для объекта "${mergedData.objectName}"`, 'success');
      setShowMergeModal(false);
      setMergedData(null);
      
      // ✅ ОБНОВЛЯЕМ ДАННЫЕ БЕЗ ПЕРЕЗАГРУЗКИ
      // Просто обновляем список, не вызывая loadApplications
      // Это предотвращает "мигание" заявок
      
    } catch (err) {
      console.error('Ошибка создания сводной заявки:', err);
      showNotification('Ошибка при создании сводной заявки', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Рендер карточки объекта
  const ObjectCard = ({ obj }) => {
    const duplicateCount = duplicates.filter(d => d.objectName === obj.name).length;
    const hasConsolidated = obj.applications.some(a => a.status === 'consolidated');
    const activeApps = obj.applications.filter(a => a.status !== 'consolidated');
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200/60 dark:border-gray-700/60 p-5 hover:shadow-lg transition-all">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{obj.name}</h3>
          </div>
          {duplicateCount > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {duplicateCount} дублей
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>{activeApps.length} заявок</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Package className="w-3.5 h-3.5" />
            <span>{obj.totalUniqueMaterials} уникальных материалов</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Активность: {obj.lastActivity}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Users className="w-3.5 h-3.5" />
            <span>{new Set(activeApps.map(a => a.foreman_name)).size} бригад</span>
          </div>
        </div>
        
        {duplicateCount > 0 && !hasConsolidated && activeApps.length > 1 && (
          <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              ⚠️ Обнаружены повторяющиеся материалы в разных заявках
            </p>
          </div>
        )}

        {hasConsolidated && (
          <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
            <p className="text-xs text-green-700 dark:text-green-300">
              ✅ Заявки объединены в сводную
            </p>
          </div>
        )}
        
        <button
          onClick={() => mergeObjectMaterials(obj.name, activeApps)}
          disabled={isLoading || activeApps.length < 2 || hasConsolidated}
          className={`w-full mt-2 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            activeApps.length >= 2 && !hasConsolidated
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          <Merge className="w-4 h-4" />
          {hasConsolidated 
            ? 'Уже объединено' 
            : activeApps.length >= 2 
              ? 'Объединить заявки' 
              : 'Нет заявок для объединения'}
        </button>
      </div>
    );
  };

  // Модальное окно предпросмотра объединения
  const MergePreviewModal = () => {
    if (!showMergeModal || !mergedData) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold">Объединение заявок</h3>
            </div>
            <button onClick={() => setShowMergeModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
              <p className="font-medium">Объект: {mergedData.objectName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Объединяется {mergedData.applications.length} заявок от {mergedData.foremen.join(', ')}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Сводный список материалов ({mergedData.materials.length} позиций)
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {mergedData.materials.map((mat, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{mat.description}</p>
                        <p className="text-sm text-gray-500">
                          {mat.totalQuantity} {mat.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          Заказано в {mat.applications.length} заявках:
                        </p>
                        {mat.applications.map((app, i) => (
                          <p key={i} className="text-xs">
                            {app.foreman}: {app.quantity} {mat.unit}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 p-4 border-t">
            <button
              onClick={() => setShowMergeModal(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Отмена
            </button>
            <button
              onClick={createConsolidatedApplication}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
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

  // Кнопка обновления данных - ТОЛЬКО ПО ЗАПРОСУ ПОЛЬЗОВАТЕЛЯ
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (loadApplications) {
        await loadApplications(page);
      } else if (onMergeComplete) {
        await onMergeComplete();
      }
      showNotification('🔄 Данные обновлены', 'success');
    } catch (err) {
      console.error('Ошибка обновления:', err);
      showNotification('Ошибка при обновлении данных', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const activeObjects = objectsWithApplications.filter(
    obj => obj.applications.filter(a => a.status !== 'consolidated').length > 0
  );

  if (activeObjects.length === 0) {
    return (
      <div className="text-center py-12 bg-white/80 dark:bg-gray-800/80 rounded-2xl">
        <Building className="w-16 h-16 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">Нет активных заявок для объединения</p>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 mx-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Обновление...' : 'Обновить'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl">
          <div className="text-2xl font-bold text-indigo-600">{activeObjects.length}</div>
          <div className="text-sm text-gray-600">Объектов с заявками</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl">
          <div className="text-2xl font-bold text-yellow-600">{duplicates.length}</div>
          <div className="text-sm text-gray-600">Потенциальных дублей</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
          <div className="text-2xl font-bold text-green-600">
            {activeObjects.reduce((sum, obj) => sum + obj.applications.filter(a => a.status !== 'consolidated').length, 0)}
          </div>
          <div className="text-sm text-gray-600">Активных заявок</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
          <div className="text-2xl font-bold text-purple-600">
            {activeObjects.reduce((sum, obj) => sum + obj.totalUniqueMaterials, 0)}
          </div>
          <div className="text-sm text-gray-600">Уникальных материалов</div>
        </div>
      </div>
      
      {/* Предупреждение о дублях */}
      {duplicates.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300">
                Обнаружены повторяющиеся материалы
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
        {activeObjects.map((obj, idx) => (
          <ObjectCard key={idx} obj={obj} />
        ))}
      </div>
      
      {/* Кнопка обновления */}
      <div className="flex justify-center">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Обновление...' : 'Обновить данные'}
        </button>
      </div>
      
      {/* Модальное окно */}
      <MergePreviewModal />
    </div>
  );
};

export default ObjectMaterialsMerger;