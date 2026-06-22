// src/components/ObjectMaterialsMerger.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Package, AlertCircle, CheckCircle, 
  Layers, Merge, X,
  ClipboardList, Building, Calendar, Users,
  Loader2
} from 'lucide-react';

const ObjectMaterialsMerger = ({ 
  supabase, 
  companyId, 
  applications, 
  showNotification,
  userRole // добавим для проверки прав
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mergedData, setMergedData] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Получение текущего пользователя
  useEffect(() => {
    const getUser = async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) setCurrentUser(data.user);
      } catch (err) {
        console.warn('Не удалось получить пользователя:', err);
      }
    };
    getUser();
  }, [supabase]);

  // Проверка прав доступа
  const canMerge = userRole === 'manager' || userRole === 'supply_admin';

  // Группировка заявок по объектам
  const objectsWithApplications = useMemo(() => {
    if (!applications || applications.length === 0) return [];
    
    const objects = {};
    
    applications.forEach(app => {
      // Пропускаем уже объединённые заявки
      if (app.status === 'consolidated' || app.is_consolidated) return;
      
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
        const key = mat.description?.toLowerCase() || '';
        if (!key) return;
        
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
            name: mat.description || 'Без названия',
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
    
    // Конвертируем Map в массив
    return Object.values(objects)
      .filter(obj => obj.applications.length > 0)
      .map(obj => ({
        ...obj,
        uniqueMaterialsArray: Array.from(obj.uniqueMaterials.values()),
        totalUniqueMaterials: obj.uniqueMaterials.size,
        lastActivity: obj.createdDates.length > 0 
          ? new Date(Math.max(...obj.createdDates)).toLocaleDateString('ru-RU')
          : '—'
      }));
  }, [applications]);

  // Автоматическое обнаружение дубликатов
  const duplicates = useMemo(() => {
    if (!applications || applications.length === 0) return [];
    
    const allMaterials = {};
    
    applications.forEach(app => {
      if (app.status === 'consolidated' || app.is_consolidated) return;
      
      app.materials?.forEach(mat => {
        const key = `${app.object_name}|${mat.description?.toLowerCase() || ''}`;
        if (!allMaterials[key]) {
          allMaterials[key] = {
            objectName: app.object_name,
            materialName: mat.description || 'Без названия',
            unit: mat.unit || 'шт',
            applications: []
          };
        }
        allMaterials[key].applications.push({
          id: app.id,
          foreman: app.foreman_name,
          quantity: mat.quantity || 0,
          date: app.created_at,
          status: app.status
        });
      });
    });
    
    // Только материалы, которые заказаны в нескольких заявках
    return Object.values(allMaterials).filter(m => m.applications.length > 1);
  }, [applications]);

  // Функция для объединения материалов по объекту
  const mergeObjectMaterials = async (objectName, applicationsToMerge) => {
    if (!canMerge) {
      showNotification('У вас нет прав на объединение заявок', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Собираем все уникальные материалы
      const mergedMaterials = new Map();
      
      applicationsToMerge.forEach(app => {
        app.materials?.forEach(mat => {
          const key = mat.description?.toLowerCase() || '';
          if (!key) return;
          
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
              description: mat.description || 'Без названия',
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
    if (!mergedData || !supabase || !companyId) {
      showNotification('Недостаточно данных для создания сводной заявки', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const userId = currentUser?.id;
      if (!userId) {
        showNotification('Пользователь не авторизован', 'error');
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
          status: 'pending'
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
      
      if (!data || data.length === 0) {
        throw new Error('Не удалось создать сводную заявку');
      }
      
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
                user_id: userId,
                timestamp: new Date().toISOString(),
                details: `Объединено в сводную заявку #${data[0].id.slice(0, 8)}`
              }
            ]
          })
          .eq('id', app.id);
      }
      
      showNotification(`✅ Создана сводная заявка для объекта "${mergedData.objectName}"`, 'success');
      setShowMergeModal(false);
      setMergedData(null);
      
      // Обновляем данные через callback
      if (window.location) {
        setTimeout(() => window.location.reload(), 1000);
      }
      
    } catch (err) {
      console.error('Ошибка создания сводной заявки:', err);
      showNotification('Ошибка при создании сводной заявки: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Рендер карточки объекта
  const ObjectCard = ({ obj }) => {
    const duplicateCount = duplicates.filter(d => d.objectName === obj.name).length;
    const canMergeThis = obj.applications.length >= 2 && canMerge;
    
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
            <span>{obj.applications.length} заявок</span>
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
            <span>{new Set(obj.applications.map(a => a.foreman_name)).size} бригад</span>
          </div>
        </div>
        
        {duplicateCount > 0 && (
          <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              ⚠️ Обнаружены повторяющиеся материалы в разных заявках
            </p>
          </div>
        )}
        
        <button
          onClick={() => mergeObjectMaterials(obj.name, obj.applications)}
          disabled={!canMergeThis || isLoading}
          className={`w-full mt-2 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            canMergeThis && !isLoading
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Загрузка...
            </>
          ) : (
            <>
              <Merge className="w-4 h-4" />
              {canMergeThis ? 'Объединить заявки' : 'Нет заявок для объединения'}
            </>
          )}
        </button>
        
        {!canMerge && (
          <p className="text-xs text-red-500 mt-2 text-center">
            Недостаточно прав для объединения
          </p>
        )}
      </div>
    );
  };

  // Модальное окно предпросмотра объединения
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
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Создать сводную заявку
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Если нет заявок
  if (!applications || applications.length === 0) {
    return (
      <div className="text-center py-12 bg-white/80 dark:bg-gray-800/80 rounded-2xl">
        <Building className="w-16 h-16 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">Нет заявок для объединения</p>
        <p className="text-sm text-gray-400 mt-1">Создайте заявки на объекты, чтобы объединить их</p>
      </div>
    );
  }

  if (objectsWithApplications.length === 0) {
    return (
      <div className="text-center py-12 bg-white/80 dark:bg-gray-800/80 rounded-2xl">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-3" />
        <p className="text-gray-500">Нет объектов с несколькими заявками</p>
        <p className="text-sm text-gray-400 mt-1">Все заявки уже оптимально распределены</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl">
          <div className="text-2xl font-bold text-indigo-600">{objectsWithApplications.length}</div>
          <div className="text-sm text-gray-600">Объектов с заявками</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl">
          <div className="text-2xl font-bold text-yellow-600">{duplicates.length}</div>
          <div className="text-sm text-gray-600">Потенциальных дублей</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
          <div className="text-2xl font-bold text-green-600">
            {objectsWithApplications.reduce((sum, obj) => sum + obj.applications.length, 0)}
          </div>
          <div className="text-sm text-gray-600">Всего заявок</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
          <div className="text-2xl font-bold text-purple-600">
            {objectsWithApplications.reduce((sum, obj) => sum + obj.totalUniqueMaterials, 0)}
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
        {objectsWithApplications.map((obj, idx) => (
          <ObjectCard key={idx} obj={obj} />
        ))}
      </div>
      
      {/* Модальное окно */}
      <MergePreviewModal />
    </div>
  );
};

export default ObjectMaterialsMerger;