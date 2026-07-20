// src/components/MaterialPriceView/MaterialPriceView.jsx
import React from 'react';
import { usePriceVisibility } from '../../hooks/usePriceVisibility';
import { sanitizeMaterialForMaster } from '../../utils/materialSanitizer';

const MaterialPriceView = ({ 
  materials, 
  userRole, 
  showSupplier = true,
  showPriceStatus = true,
  className = '',
  onMaterialClick = null
}) => {
  // ✅ ИСПРАВЛЕНО: убрали неиспользуемый canViewPrices
  const { isMaster, shouldHidePrices } = usePriceVisibility(userRole);
  
  // Если мастер - очищаем цены
  const displayMaterials = isMaster 
    ? materials.map(m => sanitizeMaterialForMaster(m))
    : materials;
  
  if (!displayMaterials || displayMaterials.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        Нет материалов
      </div>
    );
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      {displayMaterials.map((material, index) => {
        const isReceived = material.received && material.received >= material.quantity;
        const isPartial = material.received && material.received > 0 && material.received < material.quantity;
        
        return (
          <div 
            key={index}
            onClick={() => onMaterialClick?.(material, index)}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-[#4A6572]/30 transition-all cursor-pointer"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Основная информация */}
              <div className="col-span-2 md:col-span-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">Материал</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {material.description}
                </p>
              </div>
              
              {/* Количество */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Количество</p>
                <p className="text-sm">
                  {material.quantity} {material.unit}
                </p>
              </div>
              
              {/* Статус получения */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Статус</p>
                <div className="flex items-center gap-1">
                  {isReceived ? (
                    <span className="text-green-600 dark:text-green-400">✅ Получено</span>
                  ) : isPartial ? (
                    <span className="text-yellow-600 dark:text-yellow-400">🟡 Частично</span>
                  ) : material.received > 0 ? (
                    <span className="text-blue-600 dark:text-blue-400">📦 На складе</span>
                  ) : (
                    <span className="text-gray-400">⏳ Ожидает</span>
                  )}
                  {material.received > 0 && (
                    <span className="text-xs text-gray-500">
                      ({material.received} {material.unit})
                    </span>
                  )}
                </div>
              </div>
              
              {/* Цена - только для тех, у кого есть права */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {shouldHidePrices ? 'Информация' : 'Цена (₽)'}
                </p>
                {shouldHidePrices ? (
                  <p className="text-sm text-gray-400">—</p>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-[#4A6572] dark:text-[#F9AA33]">
                      {material.supplier_price || material.final_price 
                        ? Number(material.supplier_price || material.final_price).toLocaleString()
                        : '—'}
                    </p>
                    {showSupplier && material.supplier_name && (
                      <p className="text-xs text-gray-400 truncate max-w-[120px]">
                        {material.supplier_name}
                      </p>
                    )}
                    {showPriceStatus && material.price_status && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        material.price_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        material.price_status === 'quoted' ? 'bg-blue-100 text-blue-700' :
                        material.price_status === 'approved' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {material.price_status === 'pending' ? '⏳' :
                         material.price_status === 'quoted' ? '📋' :
                         material.price_status === 'approved' ? '✅' : '📌'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MaterialPriceView;