/**
 * Цветовая палитра для объектов
 */
export const OBJECT_COLORS = {
  // Строительные объекты
  'жилой': '#4A6572',
  'коммерческий': '#F9AA33',
  'промышленный': '#EF4444',
  'инфраструктура': '#3B82F6',
  'ремонт': '#10B981',
  'отделка': '#8B5CF6',
  'фасад': '#EC4899',
  'кровля': '#F59E0B',
  
  // Типы работ
  'новострой': '#6B7280',
  'реконструкция': '#F97316',
  'капитальный ремонт': '#DC2626',
  'текущий ремонт': '#22C55E',
  
  // По умолчанию
  'default': '#4A6572'
};

/**
 * Получение цвета для объекта
 */
export const getObjectColor = (objectName) => {
  if (!objectName) return OBJECT_COLORS.default;
  
  const lowerName = objectName.toLowerCase();
  
  for (const [key, color] of Object.entries(OBJECT_COLORS)) {
    if (key === 'default') continue;
    if (lowerName.includes(key)) {
      return color;
    }
  }
  
  // Генерация цвета на основе хеша
  const hash = objectName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 60%, 45%)`;
};

/**
 * Получение светлого варианта цвета
 */
export const getLightColor = (color) => {
  if (color.startsWith('hsl')) {
    return color.replace(/hsl\(([^,]+),\s*([^,]+),\s*([^)]+)\)/, (match, h, s, l) => {
      return `hsl(${h}, ${s}, ${Math.min(parseInt(l) + 30, 95)}%)`;
    });
  }
  return color + '33'; // Добавляем прозрачность
};

/**
 * Проверка тёмного цвета для текста
 */
export const isDarkColor = (color) => {
  if (color.startsWith('hsl')) {
    const match = color.match(/hsl\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
    if (match) {
      const lightness = parseInt(match[3]);
      return lightness < 60;
    }
  }
  return true;
};

export default {
  OBJECT_COLORS,
  getObjectColor,
  getLightColor,
  isDarkColor
};