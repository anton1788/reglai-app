// src/components/ObjectMaterialsMerger.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Package, AlertCircle, CheckCircle, 
  Layers, Merge, X,
  ClipboardList, Building, Calendar, Users,
  Loader2, Filter, Search, ChevronDown, ChevronUp,
  Trash2, Edit3, Eye, FileText, Download,
  Sparkles, RefreshCw, Bell, BellOff, 
  Clock, DollarSign, TrendingUp, BarChart3
} from 'lucide-react';

const ObjectMaterialsMerger = ({ 
  supabase, 
  companyId, 
  applications, 
  showNotification,
  onMerged,
  onRefresh
}) => {
  // ===== СОСТОЯНИЯ =====
  const [isLoading, setIsLoading] = useState(false);
  const [mergedData, setMergedData] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedObjects, setExpandedObjects] = useState(new Set());
  const [viewMode, setViewMode] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [showArchived, setShowArchived] = useState(false);
  const [mergingInProgress, setMergingInProgress] = useState(new Set());
  const [mergeHistory, setMergeHistory] = useState([]);

  // ===== ЗАГРУЗКА ИСТОРИИ ОБЪЕДИНЕНИЙ =====
  useEffect(() => {
    const loadMergeHistory = async () => {
      if (!companyId) return;
      try {
        const { data } = await supabase
          .from('applications')
          .select('id, object_name, foreman_name, created_at, consolidated_from')
          .eq('company_id', companyId)
          .eq('is_consolidated', true)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (data) setMergeHistory(data);
      } catch (err) {
        console.warn('Не удалось загрузить историю:', err);
      }
    };
    loadMergeHistory();
  }, [companyId, supabase]);

  // ===== ГРУППИРОВКА ЗАЯВОК ПО ОБЪЕКТАМ =====
  const objectsWithApplications = useMemo(() => {
    const objects = {};
    
    applications.forEach(app => {
      if (app.status === 'consolidated' && !showArchived) return;
      
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
          receivedQuantity: 0,
          totalCost: 0,
          isConsolidated: false
        };
      }
      
      const obj = objects[objName];
      obj.applications.push(app);
      obj.statuses.add(app.status);
      obj.createdDates.push(new Date(app.created_at));
      obj.foremen.add(app.foreman_name);
      
      if (app.is_consolidated) obj.isConsolidated = true;
      
      app.materials?.forEach(mat => {
        const key = mat.description.toLowerCase().trim();
        const existing = obj.uniqueMaterials.get(key);
        const qty = Number(mat.quantity) || 0;
        const received = Number(mat.received) || 0;
        const price = Number(mat.price) || 0;
        
        if (existing) {
          existing.totalQuantity += qty;
          existing.totalReceived += received;
          existing.totalCost += qty * price;
          existing.applications.push({
            id: app.id,
            date: app.created_at,
            foreman: app.foreman_name,
            quantity: qty,
            received: received,
            status: mat.status,
            price: price
          });
        } else {
          obj.uniqueMaterials.set(key, {
            name: mat.description,
            unit: mat.unit || 'шт',
            totalQuantity: qty,
            totalReceived: received,
            totalCost: qty * price,
            applications: [{
              id: app.id,
              date: app.created_at,
              foreman: app.foreman_name,
              quantity: qty,
              received: received,
              status: mat.status,
              price: price
            }]
          });
        }
        
        obj.totalQuantity += qty;
        obj.receivedQuantity += received;
        obj.totalCost += qty * price;
      });
      
      obj.totalMaterials += app.materials?.length || 0;
    });
    
    return Object.values(objects)
      .map(obj => ({
        ...obj,
        uniqueMaterialsArray: Array.from(obj.uniqueMaterials.values()),
        totalUniqueMaterials: obj.uniqueMaterials.size,
        lastActivity: obj.createdDates.length > 0 
          ? new Date(Math.max(...obj.createdDates)).toLocaleDateString('ru-RU')
          : '—',
        mergeScore: obj.applications.filter(a => a.status !== 'consolidated').length * 10 + obj.uniqueMaterials.size,
        foremen: Array.from(obj.foremen),
        activeApplications: obj.applications.filter(a => a.status !== 'consolidated').length,
        mergeable: obj.applications.filter(a => a.status !== 'consolidated').length >= 2
      }))
      .sort((a, b) => {
        switch (sortBy) {
          case 'applications': return b.activeApplications - a.activeApplications;
          case 'materials': return b.totalUniqueMaterials - a.totalUniqueMaterials;
          case 'foremen': return b.foremen.length - a.foremen.length;
          case 'cost': return b.totalCost - a.totalCost;
          default: return b.mergeScore - a.mergeScore;
        }
      });
  }, [applications, showArchived, sortBy]);

  // ===== ФИЛЬТРАЦИЯ =====
  const filteredObjects = useMemo(() => {
    let result = objectsWithApplications;
    
    if (viewMode === 'mergeable') {
      result = result.filter(obj => obj.mergeable);
    } else if (viewMode === 'duplicates') {
      result = result.filter(obj => obj.totalUniqueMaterials > obj.uniqueMaterialsArray.filter(m => m.applications.length > 1).length);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(obj => 
        obj.name.toLowerCase().includes(query) ||
        obj.foremen?.some(f => f.toLowerCase().includes(query)) ||
        obj.uniqueMaterialsArray.some(m => m.name.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [objectsWithApplications, viewMode, searchQuery]);

  // ===== ОБНАРУЖЕНИЕ ДУБЛИКАТОВ МЕЖДУ ЗАЯВКАМИ =====
  const duplicates = useMemo(() => {
    const allMaterials = {};
    
    applications.forEach(app => {
      if (app.status === 'consolidated' && !showArchived) return;
      
      app.materials?.forEach(mat => {
        const key = `${app.object_name}|${mat.description.toLowerCase().trim()}`;
        if (!allMaterials[key]) {
          allMaterials[key] = {
            objectName: app.object_name,
            materialName: mat.description,
            unit: mat.unit || 'шт',
            applications: [],
            totalQuantity: 0,
            totalCost: 0
          };
        }
        const qty = Number(mat.quantity) || 0;
        const price = Number(mat.price) || 0;
        allMaterials[key].applications.push({
          id: app.id,
          foreman: app.foreman_name,
          quantity: qty,
          date: app.created_at,
          status: app.status,
          price: price
        });
        allMaterials[key].totalQuantity += qty;
        allMaterials[key].totalCost += qty * price;
      });
    });
    
    return Object.values(allMaterials)
      .filter(m => m.applications.length > 1)
      .sort((a, b) => b.applications.length - a.applications.length);
  }, [applications, showArchived]);

  // ===== ОБНАРУЖЕНИЕ ДУБЛИРУЮЩИХСЯ МАТЕРИАЛОВ ВНУТРИ ОДНОЙ ЗАЯВКИ =====
  const findDuplicatesInsideApplications = useMemo(() => {
    const result = [];
    
    applications.forEach(app => {
      if (app.status === 'consolidated') return;
      
      const materialMap = new Map();
      
      app.materials?.forEach((mat, index) => {
        const key = mat.description.toLowerCase().trim();
        const existing = materialMap.get(key);
        
        if (existing) {
          // Нашли дубль внутри заявки
          result.push({
            applicationId: app.id,
            applicationName: app.object_name,
            materialName: mat.description,
            unit: mat.unit || 'шт',
            occurrences: [
              { index: existing.index, quantity: existing.quantity },
              { index: index, quantity: Number(mat.quantity) || 0 }
            ],
            totalQuantity: existing.quantity + (Number(mat.quantity) || 0),
            totalReceived: (existing.received || 0) + (Number(mat.received) || 0)
          });
        } else {
          materialMap.set(key, {
            index: index,
            quantity: Number(mat.quantity) || 0,
            received: Number(mat.received) || 0
          });
        }
      });
    });
    
    return result;
  }, [applications]);

  // ===== ОБЪЕДИНЕНИЕ ДУБЛЕЙ ВНУТРИ ОДНОЙ ЗАЯВКИ =====
  const consolidateApplicationMaterials = useCallback(async (applicationId) => {
    if (!applicationId) return { success: false, error: 'Нет ID заявки' };
    
    // Находим заявку
    const app = applications.find(a => a.id === applicationId);
    if (!app || !app.materials) {
      return { success: false, error: 'Заявка не найдена' };
    }
    
    // Группируем материалы по названию
    const materialMap = new Map();
    app.materials.forEach(mat => {
      const key = mat.description.toLowerCase().trim();
      const existing = materialMap.get(key);
      if (existing) {
        existing.quantity += Number(mat.quantity) || 0;
        existing.received += Number(mat.received) || 0;
        existing._mergedFrom = existing._mergedFrom || [];
        existing._mergedFrom.push(mat);
      } else {
        materialMap.set(key, { 
          ...mat, 
          quantity: Number(mat.quantity) || 0,
          received: Number(mat.received) || 0 
        });
      }
    });
    
    const consolidatedMaterials = Array.from(materialMap.values());
    const removedCount = app.materials.length - consolidatedMaterials.length;
    
    if (removedCount === 0) {
      showNotification('Нет дублей для объединения', 'info');
      return { success: false, removedCount: 0 };
    }
    
    // Обновляем в БД
    const { error } = await supabase
      .from('applications')
      .update({ 
        materials: consolidatedMaterials,
        status_history: [
          ...(app.status_history || []),
          {
            action: 'consolidated_duplicates',
            timestamp: new Date().toISOString(),
            details: `Объединено ${removedCount} дублирующихся материалов`
          }
        ]
      })
      .eq('id', applicationId);
    
    if (error) throw error;
    
    showNotification(`✅ Объединено ${removedCount} дублей в заявке "${app.object_name}"`, 'success');
    
    // Обновляем UI
    if (onRefresh) onRefresh();
    
    return { success: true, removedCount };
  }, [applications, supabase, showNotification, onRefresh]);

  // ===== ФУНКЦИЯ ОБЪЕДИНЕНИЯ =====
  const mergeObjectMaterials = useCallback(async (objectName, applicationsToMerge) => {
    if (mergingInProgress.has(objectName)) return;
    
    setMergingInProgress(prev => new Set(prev).add(objectName));
    setIsLoading(true);
    
    try {
      const mergedMaterials = new Map();
      let totalCost = 0;
      
      applicationsToMerge.forEach(app => {
        app.materials?.forEach(mat => {
          const key = mat.description.toLowerCase().trim();
          const existing = mergedMaterials.get(key);
          const qty = Number(mat.quantity) || 0;
          const received = Number(mat.received) || 0;
          const price = Number(mat.price) || 0;
          
          if (existing) {
            existing.totalQuantity += qty;
            existing.totalReceived += received;
            existing.totalCost += qty * price;
            existing.applications.push({
              id: app.id,
              foreman: app.foreman_name,
              quantity: qty,
              received: received,
              date: app.created_at,
              price: price
            });
          } else {
            mergedMaterials.set(key, {
              description: mat.description,
              unit: mat.unit || 'шт',
              totalQuantity: qty,
              totalReceived: received,
              totalCost: qty * price,
              requestedQuantity: qty,
              receivedQuantity: received,
              applications: [{
                id: app.id,
                foreman: app.foreman_name,
                quantity: qty,
                received: received,
                date: app.created_at,
                price: price
              }]
            });
          }
          totalCost += qty * price;
        });
      });
      
      const materialsArray = Array.from(mergedMaterials.values());
      const categories = {
        'Строительные': [],
        'Отделочные': [],
        'Электрика': [],
        'Сантехника': [],
        'Прочее': []
      };
      
      materialsArray.forEach(m => {
        const name = m.description.toLowerCase();
        if (name.includes('цемент') || name.includes('песок') || name.includes('щебень') || name.includes('кирпич')) {
          categories['Строительные'].push(m);
        } else if (name.includes('плитка') || name.includes('краска') || name.includes('шпаклёвка')) {
          categories['Отделочные'].push(m);
        } else if (name.includes('кабель') || name.includes('провод') || name.includes('розетка')) {
          categories['Электрика'].push(m);
        } else if (name.includes('труба') || name.includes('фитинг') || name.includes('смеситель')) {
          categories['Сантехника'].push(m);
        } else {
          categories['Прочее'].push(m);
        }
      });
      
      setMergedData({
        objectName,
        applications: applicationsToMerge,
        materials: materialsArray,
        materialsByCategory: categories,
        totalApplications: applicationsToMerge.length,
        totalMaterials: mergedMaterials.size,
        foremen: [...new Set(applicationsToMerge.map(a => a.foreman_name))],
        totalQuantity: materialsArray.reduce((sum, m) => sum + m.totalQuantity, 0),
        totalCost: totalCost,
        createdDates: applicationsToMerge.map(a => new Date(a.created_at))
      });
      
      setShowMergeModal(true);
      
    } catch (err) {
      console.error('Ошибка объединения:', err);
      showNotification('Ошибка при анализе заявок: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
      setMergingInProgress(prev => {
        const next = new Set(prev);
        next.delete(objectName);
        return next;
      });
    }
  }, [mergingInProgress, showNotification]);

  // ===== БЫСТРОЕ ОБЪЕДИНЕНИЕ ВСЕХ ПОДХОДЯЩИХ ОБЪЕКТОВ =====
  const handleMergeAll = useCallback(async () => {
    const mergeable = objectsWithApplications.filter(obj => obj.mergeable);
    if (mergeable.length === 0) {
      showNotification('Нет объектов для массового объединения', 'warning');
      return;
    }
    
    if (!window.confirm(`Объединить заявки на ${mergeable.length} объектах? Это создаст ${mergeable.length} сводных заявок.`)) {
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const obj of mergeable) {
      try {
        await mergeObjectMaterials(obj.name, obj.applications.filter(a => a.status !== 'consolidated'));
        await new Promise(resolve => setTimeout(resolve, 500));
        successCount++;
      } catch (err) {
        failCount++;
        console.error(`Ошибка объединения ${obj.name}:`, err);
      }
    }
    
    showNotification(`✅ Объединено: ${successCount}, ❌ Ошибок: ${failCount}`, 
      failCount === 0 ? 'success' : 'warning'
    );
    
    if (onRefresh) onRefresh();
  }, [objectsWithApplications, mergeObjectMaterials, showNotification, onRefresh]);

  // ===== СОЗДАНИЕ СВОДНОЙ ЗАЯВКИ =====
  const createConsolidatedApplication = useCallback(async () => {
    if (!mergedData) return;
    
    setIsLoading(true);
    
    try {
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
          price: m.applications.reduce((sum, a) => sum + (a.price || 0), 0) / m.applications.length,
          original_applications: m.applications.map(a => a.id),
          original_quantities: m.applications.map(a => ({
            applicationId: a.id,
            quantity: a.quantity,
            foreman: a.foreman,
            price: a.price || 0
          }))
        })),
        status: 'pending',
        user_id: (await supabase.auth.getUser()).data.user?.id,
        company_id: companyId,
        created_at: new Date().toISOString(),
        is_consolidated: true,
        consolidated_from: mergedData.applications.map(a => a.id),
        total_amount: mergedData.totalCost || mergedData.materials.reduce((sum, m) => sum + (m.totalQuantity * 1000), 0),
        status_history: [{
          action: 'created_consolidated',
          timestamp: new Date().toISOString(),
          details: `Объединено ${mergedData.applications.length} заявок от ${mergedData.foremen.join(', ')}`,
          total_cost: mergedData.totalCost || 0
        }]
      };
      
      const { data, error } = await supabase
        .from('applications')
        .insert([consolidatedApp])
        .select();
      
      if (error) throw error;
      
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
      
      showNotification(`✅ Создана сводная заявка для "${mergedData.objectName}"`, 'success');
      setShowMergeModal(false);
      setMergedData(null);
      
      if (onMerged) {
        onMerged(data[0]);
      }
      if (onRefresh) {
        onRefresh();
      }
      
    } catch (err) {
      console.error('Ошибка создания сводной заявки:', err);
      showNotification('Ошибка при создании сводной заявки: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [mergedData, supabase, companyId, showNotification, onMerged, onRefresh]);

  // ===== ПЕРЕКЛЮЧЕНИЕ РАЗВОРАЧИВАНИЯ =====
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

  // ===== ОЧИСТКА ФИЛЬТРОВ =====
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setViewMode('all');
    setSortBy('score');
  }, []);

  // ===== СТАТИСТИКА =====
  const stats = useMemo(() => {
    const activeApps = applications.filter(a => a.status !== 'consolidated');
    const totalApps = activeApps.length;
    const totalObjects = objectsWithApplications.filter(o => o.activeApplications > 0).length;
    const totalDuplicates = duplicates.length;
    const totalInsideDuplicates = findDuplicatesInsideApplications.length;
    const mergeableObjects = objectsWithApplications.filter(o => o.mergeable).length;
    const totalCost = objectsWithApplications.reduce((sum, o) => sum + o.totalCost, 0);
    
    return { totalApps, totalObjects, totalDuplicates, totalInsideDuplicates, mergeableObjects, totalCost };
  }, [applications, objectsWithApplications, duplicates, findDuplicatesInsideApplications]);

  // ===== КОМПОНЕНТ КАРТОЧКИ ОБЪЕКТА =====
  const ObjectCard = useCallback(({ obj }) => {
    const duplicateCount = duplicates.filter(d => d.objectName === obj.name).length;
    const insideDuplicateCount = findDuplicatesInsideApplications.filter(d => d.applicationName === obj.name).length;
    const isExpanded = expandedObjects.has(obj.name);
    const canMerge = obj.activeApplications >= 2 && !obj.isConsolidated;
    const isMerging = mergingInProgress.has(obj.name);
    const totalQty = obj.uniqueMaterialsArray.reduce((sum, m) => sum + m.totalQuantity, 0);
    const receivedQty = obj.uniqueMaterialsArray.reduce((sum, m) => sum + m.totalReceived, 0);
    const completionPercent = totalQty > 0 ? Math.round((receivedQty / totalQty) * 100) : 0;
    
    return (
      <div 
        className={`bg-white dark:bg-gray-800 rounded-xl border transition-all ${
          canMerge ? 'border-indigo-200 dark:border-indigo-800 hover:shadow-lg' : 
          obj.isConsolidated ? 'border-green-200 dark:border-green-800' :
          'border-gray-200/60 dark:border-gray-700/60'
        }`}
      >
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors"
          onClick={() => toggleObject(obj.name)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Building className={`w-5 h-5 flex-shrink-0 ${obj.isConsolidated ? 'text-green-500' : 'text-indigo-500'}`} />
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {obj.name}
                {obj.isConsolidated && (
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    Сводная
                  </span>
                )}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Бейдж с дублями внутри заявок */}
              {insideDuplicateCount > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-full text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {insideDuplicateCount}
                </span>
              )}
              {duplicateCount > 0 && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {duplicateCount}
                </span>
              )}
              {obj.activeApplications > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs">
                  {obj.activeApplications}
                </span>
              )}
              <ChevronDown 
                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" />
              {obj.activeApplications} заявок
            </span>
            <span className="flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
              {obj.totalUniqueMaterials} материалов
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {obj.foremen.length} бригад
            </span>
            {obj.totalCost > 0 && (
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <DollarSign className="w-3.5 h-3.5" />
                {obj.totalCost.toLocaleString()} ₽
              </span>
            )}
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
        
        {isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700">
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Заявки:</p>
              {obj.applications.map((app, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 bg-gray-50 dark:bg-gray-700/20 rounded">
                  <span className="text-gray-700 dark:text-gray-300">
                    #{app.id?.slice(0, 8)} • {app.foreman_name}
                    {app.status === 'consolidated' && (
                      <span className="ml-2 text-green-600">(объединена)</span>
                    )}
                  </span>
                  <span className="text-gray-500">
                    {app.materials?.length || 0} материалов
                  </span>
                </div>
              ))}
            </div>
            
            {/* ДУБЛИ ВНУТРИ ЗАЯВОК - ОБЩАЯ КНОПКА */}
{insideDuplicateCount > 0 && (
  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-red-700 dark:text-red-300 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Обнаружены дубли внутри заявок ({insideDuplicateCount})
        </p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
          Одинаковые материалы указаны несколько раз в заявках
        </p>
      </div>
      <button
        onClick={async () => {
          // Находим все заявки объекта с дублями
          const appIds = [...new Set(
            findDuplicatesInsideApplications
              .filter(d => d.applicationName === obj.name)
              .map(d => d.applicationId)
          )];
          
          let successCount = 0;
          for (const appId of appIds) {
            const result = await consolidateApplicationMaterials(appId);
            if (result.success) successCount++;
          }
          
          showNotification(`✅ Объединено дублей в ${successCount} заявках`, 'success');
        }}
        className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
      >
        <Merge className="w-3.5 h-3.5" />
        Объединить все дубли
      </button>
    </div>
    
    {/* Список дублей */}
    <div className="mt-2 space-y-1">
      {findDuplicatesInsideApplications
        .filter(d => d.applicationName === obj.name)
        .slice(0, 3)
        .map((d, idx) => (
          <div key={idx} className="text-xs text-red-600 dark:text-red-400 flex justify-between items-center bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded">
            <span>
              • {d.materialName}
              <span className="text-gray-500 text-[10px] ml-1">
                (повторяется {d.occurrences.length} раза)
              </span>
            </span>
            <span className="font-medium">
              всего {d.totalQuantity} {d.unit}
            </span>
          </div>
        ))}
      {insideDuplicateCount > 3 && (
        <p className="text-xs text-red-500">
          + ещё {insideDuplicateCount - 3}
        </p>
      )}
    </div>
  </div>
)}
            
            {/* ДУБЛИ МЕЖДУ ЗАЯВКАМИ - ЖЁЛТАЯ КАРТОЧКА */}
            {duplicateCount > 0 && (
              <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                  ⚠️ {duplicateCount} материалов заказаны в нескольких заявках
                </p>
                <div className="mt-1 space-y-0.5 max-h-20 overflow-y-auto">
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
            
            <button
              onClick={() => mergeObjectMaterials(obj.name, obj.applications.filter(a => a.status !== 'consolidated'))}
              disabled={isLoading || !canMerge || isMerging}
              className={`w-full mt-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                canMerge && !isMerging
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {isMerging ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Merge className="w-4 h-4" />
              )}
              {canMerge ? `Объединить ${obj.activeApplications} заявок` : 
               obj.isConsolidated ? 'Уже объединено' : 
               'Нет заявок для объединения'}
            </button>
          </div>
        )}
      </div>
    );
  }, [duplicates, findDuplicatesInsideApplications, expandedObjects, toggleObject, mergingInProgress, isLoading, mergeObjectMaterials, consolidateApplicationMaterials]);

  // ===== МОДАЛЬНОЕ ОКНО ПРЕДПРОСМОТРА =====
  const MergePreviewModal = useCallback(() => {
    if (!showMergeModal || !mergedData) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold">Объединение заявок</h3>
              <span className="ml-2 text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                {mergedData.totalApplications} заявок
              </span>
            </div>
            <button 
              onClick={() => setShowMergeModal(false)} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-4 rounded-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-lg">{mergedData.objectName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Объединяется {mergedData.totalApplications} заявок от {mergedData.foremen.join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Всего материалов: <span className="font-bold">{mergedData.totalMaterials}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Общая стоимость: <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {mergedData.totalCost?.toLocaleString() || 0} ₽
                    </span>
                  </p>
                </div>
              </div>
            </div>
            
            {mergedData.materialsByCategory && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Материалы по категориям
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(mergedData.materialsByCategory).map(([category, items]) => 
                    items.length > 0 && (
                      <div key={category} className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                          {category} ({items.length})
                        </p>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {items.slice(0, 3).map((mat, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="truncate">{mat.description}</span>
                              <span className="font-medium">{mat.totalQuantity} {mat.unit}</span>
                            </div>
                          ))}
                          {items.length > 3 && (
                            <p className="text-xs text-gray-400">+ ещё {items.length - 3}</p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                Полный список ({mergedData.materials.length} позиций)
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {mergedData.materials.map((mat, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{mat.description}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {mat.totalQuantity} {mat.unit}
                          </span>
                          {mat.totalCost > 0 && (
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {mat.totalCost.toLocaleString()} ₽
                            </span>
                          )}
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
  }, [showMergeModal, mergedData, isLoading, createConsolidatedApplication]);

  // ===== РЕНДЕР =====
  if (objectsWithApplications.length === 0 && !showArchived) {
    return (
      <div className="text-center py-12 bg-white/80 dark:bg-gray-800/80 rounded-2xl">
        <Building className="w-16 h-16 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">Нет активных объектов с заявками</p>
        {!showArchived && (
          <button
            onClick={() => setShowArchived(true)}
            className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
          >
            Показать архивные объединения
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Merge className="w-6 h-6 text-indigo-600" />
            Объединение заявок
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({stats.totalApps} заявок)
            </span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Объединяйте заявки на одном объекте для оптимизации закупок
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.mergeableObjects > 1 && (
            <button
              onClick={handleMergeAll}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              Объединить всё ({stats.mergeableObjects})
            </button>
          )}
          
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl">
          <div className="text-2xl font-bold text-indigo-600">{stats.totalObjects}</div>
          <div className="text-xs text-gray-600">Объектов</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl">
          <div className="text-2xl font-bold text-yellow-600">{stats.totalDuplicates}</div>
          <div className="text-xs text-gray-600">Дублей между заявками</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
          <div className="text-2xl font-bold text-red-600">{stats.totalInsideDuplicates}</div>
          <div className="text-xs text-gray-600">Дублей внутри заявок</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
          <div className="text-2xl font-bold text-green-600">{stats.mergeableObjects}</div>
          <div className="text-xs text-gray-600">Для объединения</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
          <div className="text-2xl font-bold text-blue-600">{stats.totalCost.toLocaleString()} ₽</div>
          <div className="text-xs text-gray-600">Общая стоимость</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по объекту, бригадиру, материалу..."
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white/80 dark:bg-gray-700/80 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">Все объекты</option>
          <option value="mergeable">Доступны для объединения</option>
          <option value="duplicates">С дубликатами</option>
        </select>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="score">По приоритету</option>
          <option value="applications">По количеству заявок</option>
          <option value="materials">По материалам</option>
          <option value="foremen">По бригадам</option>
          <option value="cost">По стоимости</option>
        </select>
        
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Показать архив
        </label>
        
        {(searchQuery || viewMode !== 'all' || sortBy !== 'score') && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {duplicates.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300">
                Обнаружены повторяющиеся материалы между заявками ({duplicates.length})
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Некоторые материалы заказаны в нескольких заявках на одном объекте.
                Рекомендуем объединить заявки для оптимизации закупок.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {duplicates.slice(0, 5).map((d, i) => (
                  <span key={i} className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                    {d.materialName} ({d.totalQuantity} {d.unit})
                  </span>
                ))}
                {duplicates.length > 5 && (
                  <span className="text-xs text-yellow-600">+ ещё {duplicates.length - 5}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {findDuplicatesInsideApplications.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800 dark:text-red-300">
                ⚠️ Обнаружены дубли внутри заявок ({findDuplicatesInsideApplications.length})
              </h4>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                В некоторых заявках одинаковые материалы указаны несколько раз.
                Рекомендуем объединить их для упрощения учёта.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {findDuplicatesInsideApplications.slice(0, 5).map((d, i) => (
                  <span key={i} className="text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-2 py-0.5 rounded-full">
                    {d.materialName} ({d.totalQuantity} {d.unit})
                  </span>
                ))}
                {findDuplicatesInsideApplications.length > 5 && (
                  <span className="text-xs text-red-600">+ ещё {findDuplicatesInsideApplications.length - 5}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredObjects.map((obj, idx) => (
          <ObjectCard key={idx} obj={obj} />
        ))}
      </div>

      {filteredObjects.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Search className="w-12 h-12 mx-auto text-gray-300 mb-2" />
          <p>Ничего не найдено по заданным фильтрам</p>
          <button onClick={clearFilters} className="mt-2 text-indigo-600 hover:text-indigo-800">
            Сбросить фильтры
          </button>
        </div>
      )}

      {mergeHistory.length > 0 && (
        <div className="mt-6 p-4 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Последние объединения
          </h4>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {mergeHistory.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm py-1.5 px-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">
                  {item.object_name}
                  <span className="text-xs text-gray-400 ml-2">
                    ({item.consolidated_from?.length || 0} заявок)
                  </span>
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <MergePreviewModal />
    </div>
  );
};

export default ObjectMaterialsMerger;