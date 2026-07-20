// src/components/MasterMaterialsView/MasterMaterialsView.jsx
import React from 'react';
import { sanitizeMaterialForMaster } from '../../utils/materialSanitizer';

const MasterMaterialsView = ({ 
  materials, 
  className = '',
  onMaterialClick = null
}) => {
  if (!materials || materials.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        Нет материалов
      </div>
    );
  }
  
  // Очищаем цены для мастера
  const displayMaterials = materials.map(m => sanitizeMaterialForMaster(m));
  
  return (
    <div className={`space-y-2 ${className}`}>
      {displayMaterials.map((material, index) => {
        const isReceived = material.received && material.received >= material.quantity;
        const isPartial = material.received && material.received > 0 && material.received < material.quantity;
        
        return (
          <div 
            key={index}
            onClick={() => onMaterialClick?.(material, index)}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-[#4A6572]/30 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {material.description}
                </p>
                <p className="text-sm text-gray-500">
                  {material.quantity} {material.unit}
                </p>
              </div>
              
              <div className="text-right">
                {isReceived ? (
                  <span className="text-sm text-green-600 dark:text-green-400">✅ Получено</span>
                ) : isPartial ? (
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">🟡 Частично</span>
                ) : material.received > 0 ? (
                  <span className="text-sm text-blue-600 dark:text-blue-400">📦 На складе</span>
                ) : (
                  <span className="text-sm text-gray-400">⏳ Ожидает</span>
                )}
                {material.received > 0 && (
                  <span className="text-xs text-gray-500 block">
                    {material.received} {material.unit}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MasterMaterialsView;