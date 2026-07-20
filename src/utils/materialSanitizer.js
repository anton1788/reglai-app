// src/utils/materialSanitizer.js

/**
 * Поля, которые НЕ должны видеть мастер и прораб
 */
export const HIDDEN_FIELDS_FOR_MASTER = [
  'price',
  'supplier_price',
  'final_price',
  'supplier_name',
  'supplier_phone',
  'price_status',
  'price_history',
  'total_amount',
  'estimated_price'
];

/**
 * Проверка, может ли пользователь видеть цены
 */
export const canSeePrices = (userRole) => {
  return !['master', 'foreman'].includes(userRole);
};

/**
 * Очистка материала от цен для мастера
 */
export const sanitizeMaterialForMaster = (material) => {
  if (!material) return material;
  
  // Если это массив
  if (Array.isArray(material)) {
    return material.map(m => sanitizeMaterialForMaster(m));
  }
  
  // Если это объект
  const clean = { ...material };
  HIDDEN_FIELDS_FOR_MASTER.forEach(field => {
    delete clean[field];
  });
  
  return clean;
};

/**
 * Очистка заявки от цен для мастера
 */
export const sanitizeApplicationForMaster = (application) => {
  if (!application) return application;
  
  const clean = { ...application };
  
  // Очищаем материалы
  if (clean.materials) {
    clean.materials = sanitizeMaterialForMaster(clean.materials);
  }
  
  // Удаляем общую сумму
  delete clean.total_amount;
  delete clean.materials_with_prices;
  
  return clean;
};

/**
 * Очистка массива заявок для мастера
 */
export const sanitizeApplicationsForMaster = (applications) => {
  if (!applications) return applications;
  if (!Array.isArray(applications)) return applications;
  
  return applications.map(app => sanitizeApplicationForMaster(app));
};

/**
 * Проверка, является ли пользователь мастером или прорабом
 */
export const isMasterRole = (userRole) => {
  return userRole === 'master' || userRole === 'foreman';
};

/**
 * Получение безопасных полей для отображения в зависимости от роли
 */
export const getVisibleFields = (userRole) => {
  if (isMasterRole(userRole)) {
    return {
      material: ['description', 'quantity', 'unit', 'received', 'status'],
      application: ['object_name', 'foreman_name', 'foreman_phone', 'created_at', 'status']
    };
  }
  
  // Для всех остальных (снабженец, бухгалтер, руководитель)
  return {
    material: ['description', 'quantity', 'unit', 'received', 'status', 
               'supplier_price', 'final_price', 'supplier_name', 'price_status'],
    application: ['object_name', 'foreman_name', 'foreman_phone', 'created_at', 
                  'status', 'total_amount']
  };
};