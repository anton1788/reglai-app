// src/components/PriceEditor/PriceEditor.jsx
import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { 
  saveMaterialPrice, 
  updateApplicationPrices,
  getMaterialPricesBatch
} from '../../utils/priceManager';
import { usePriceVisibility } from '../../hooks/usePriceVisibility';

const PriceEditor = ({ 
  application, 
  onSave, 
  onClose,
  showNotification,
  user,
  userRole
}) => {
  const { canEditPrices } = usePriceVisibility(userRole);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Загрузка цен из справочника при открытии
  useEffect(() => {
    const loadPrices = async () => {
      setLoading(true);
      try {
        const appMaterials = application.materials || [];
        
        const descriptions = [...new Set(appMaterials.map(m => m.description))];
        
        const priceMap = await getMaterialPricesBatch(application.company_id, descriptions);
        
        const enrichedMaterials = appMaterials.map(m => {
          const priceData = priceMap[m.description];
          return {
            ...m,
            supplier_price: m.supplier_price || priceData?.price || null,
            supplier_name: m.supplier_name || priceData?.supplier_name || null,
            supplier_phone: m.supplier_phone || priceData?.supplier_phone || null,
            price_status: m.price_status || (priceData?.price ? 'quoted' : 'pending'),
            price_history: m.price_history || []
          };
        });
        
        setMaterials(enrichedMaterials);
      } catch (err) {
        console.error('Ошибка загрузки цен:', err);
        showNotification('❌ Ошибка загрузки цен', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    if (canEditPrices) {
      loadPrices();
    } else {
      showNotification('❌ У вас нет прав на редактирование цен', 'error');
      onClose();
    }
  }, [application, canEditPrices, showNotification, onClose]);
  
  const updateMaterialPrice = (index, field, value) => {
    setMaterials(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'supplier_price' && value > 0) {
        updated[index].price_status = 'quoted';
      }
      
      return updated;
    });
  };
  
  const addManualMaterial = () => {
    setMaterials(prev => [...prev, {
      description: '',
      quantity: 1,
      unit: 'шт',
      supplier_price: null,
      supplier_name: null,
      supplier_phone: null,
      price_status: 'pending',
      received: 0,
      status: 'pending'
    }]);
  };
  
  const removeMaterial = (index) => {
    if (window.confirm('Удалить этот материал?')) {
      setMaterials(prev => prev.filter((_, i) => i !== index));
    }
  };
  
  const handleSave = async () => {
    const invalidMaterials = materials.filter(m => !m.description.trim());
    if (invalidMaterials.length > 0) {
      showNotification('⚠️ Заполните описание для всех материалов', 'warning');
      return;
    }
    
    setSaving(true);
    try {
      const materialsToSave = materials.map(m => ({
        ...m,
        price_status: m.supplier_price > 0 ? 'approved' : m.price_status,
        final_price: m.supplier_price > 0 ? m.supplier_price : null
      }));
      
      // ✅ ИСПРАВЛЕНО: убрали лишние параметры
      const success = await updateApplicationPrices(
        application.id,
        materialsToSave
      );
      
      if (!success) throw new Error('Ошибка обновления заявки');
      
      for (const material of materialsToSave) {
        if (material.supplier_price > 0 && material.description.trim()) {
          await saveMaterialPrice(
            application.company_id,
            material,
            user.id,
            user.email
          );
        }
      }
      
      showNotification('✅ Цены сохранены и добавлены в справочник', 'success');
      onSave(materialsToSave);
      onClose();
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      showNotification('❌ Ошибка сохранения цен: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };
  
  const totalAmount = materials.reduce((sum, m) => {
    const price = m.supplier_price || m.final_price || 0;
    return sum + (m.quantity * price);
  }, 0);
  
  const pricedCount = materials.filter(m => m.supplier_price > 0).length;
  const totalCount = materials.length;
  
  if (!canEditPrices) {
    return null;
  }
  
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#4A6572]/5 to-transparent">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              💰 Редактирование цен
              <span className="text-sm font-normal text-gray-500 ml-2">
                {application.object_name}
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {application.foreman_name} • {new Date(application.created_at).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#4A6572]" />
              <p className="mt-3 text-gray-500">Загрузка цен...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
                  <div className="text-xs text-gray-500">Всего материалов</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{pricedCount}</div>
                  <div className="text-xs text-gray-500">С ценами</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {totalAmount.toLocaleString()} ₽
                  </div>
                  <div className="text-xs text-gray-500">Общая сумма</div>
                </div>
              </div>
              
              <div className="space-y-3">
                {materials.map((material, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Материал *
                        </label>
                        <input
                          type="text"
                          value={material.description || ''}
                          onChange={(e) => updateMaterialPrice(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Введите название"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Кол-во
                        </label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            value={material.quantity || 1}
                            onChange={(e) => updateMaterialPrice(index, 'quantity', Number(e.target.value))}
                            className="w-20 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            min="1"
                          />
                          <input
                            type="text"
                            value={material.unit || 'шт'}
                            onChange={(e) => updateMaterialPrice(index, 'unit', e.target.value)}
                            className="w-16 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="шт"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Цена от поставщика (₽)
                        </label>
                        <input
                          type="number"
                          value={material.supplier_price || ''}
                          onChange={(e) => updateMaterialPrice(index, 'supplier_price', Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Введите цену"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Поставщик
                        </label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={material.supplier_name || ''}
                            onChange={(e) => updateMaterialPrice(index, 'supplier_name', e.target.value)}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Название"
                          />
                          <button
                            onClick={() => removeMaterial(index)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">Статус:</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          material.price_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          material.price_status === 'quoted' ? 'bg-blue-100 text-blue-700' :
                          material.price_status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {material.price_status === 'pending' && '⏳ Ожидает цену'}
                          {material.price_status === 'quoted' && '📋 Цена получена'}
                          {material.price_status === 'approved' && '✅ Согласована'}
                          {material.price_status === 'final' && '📌 Финальная'}
                        </span>
                      </div>
                      
                      {material.supplier_price > 0 && material.price_status === 'quoted' && (
                        <button
                          onClick={() => {
                            if (window.confirm('Подтвердить финальную цену?')) {
                              updateMaterialPrice(index, 'price_status', 'approved');
                              updateMaterialPrice(index, 'final_price', material.supplier_price);
                              showNotification('✅ Цена подтверждена', 'success');
                            }
                          }}
                          className="text-xs text-green-600 hover:text-green-700 font-medium"
                        >
                          ✅ Подтвердить
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={addManualMaterial}
                className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:border-[#4A6572] hover:text-[#4A6572] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить материал
              </button>
            </>
          )}
        </div>
        
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 rounded-b-2xl">
          <div className="text-sm text-gray-500">
            💡 Цены будут сохранены в справочник
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-6 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  💾 Сохранить цены
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceEditor;