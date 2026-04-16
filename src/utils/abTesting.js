// src/utils/abTesting.js

const AB_TEST_CONFIG = {
  cta_button: {
    variants: ['variant_a', 'variant_b'],
    weights: [0.5, 0.5],
    description: 'Тест цвета и текста CTA-кнопки'
  },
  pricing_display: {
    variants: ['monthly', 'annual'],
    weights: [0.7, 0.3],
    description: 'Тест отображения цен (месяц vs год)'
  },
  invite_button: {
    variants: ['icon_only', 'icon_text'],
    weights: [0.5, 0.5],
    description: 'Тест формата кнопки приглашения'
  }
};

// 🔐 Более надёжный хеш (FNV-1a алгоритм)
const hashString = (str) => {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash);
};

// Получить вариант теста для пользователя
export const getABTestVariant = (testName, userId) => {
  const config = AB_TEST_CONFIG[testName];
  if (!config) return null;

  const hash = userId ? hashString(userId) : Date.now();
  const normalizedHash = hash % 100;
  
  let cumulativeWeight = 0;
  for (let i = 0; i < config.weights.length; i++) {
    cumulativeWeight += config.weights[i] * 100;
    if (normalizedHash < cumulativeWeight) {
      return config.variants[i];
    }
  }
  
  return config.variants[0];
};

// Сохранить результат теста в localStorage
export const saveABTestResult = (testName, variant, userId) => {
  try {
    const key = `ab_test_${testName}_${userId}`;
    localStorage.setItem(key, JSON.stringify({
      variant,
      timestamp: new Date().toISOString(),
      testName
    }));
  } catch (err) {
    console.warn('[AB Test] Ошибка сохранения в localStorage:', err);
  }
};

// Получить сохранённый результат
export const getSavedABTestResult = (testName, userId) => {
  try {
    const key = `ab_test_${testName}_${userId}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (err) {
    console.warn('[AB Test] Ошибка чтения из localStorage:', err);
    return null;
  }
};

// ✅ ИСПРАВЛЕНО: принимаем supabase как параметр
export const trackABTestConversion = async (supabase, testName, variant, userId, companyId, conversionType) => {
  if (!supabase) {
    console.warn('[AB Test] Supabase client not provided');
    return;
  }
  
  try {
    await supabase.from('ab_test_results').insert([{
      test_name: testName,
      variant,
      user_id: userId,
      company_id: companyId,
      conversion_type: conversionType,
      created_at: new Date().toISOString()
    }]);
  } catch (err) {
    // ❗ Не блокируем приложение при ошибке аналитики
    console.warn('[AB Test] Ошибка отслеживания конверсии:', err);
  }
};

// Получить стили для варианта CTA-кнопки
export const getCTAButtonStyles = (variant) => {
  const styles = {
    variant_a: {
      className: 'bg-gradient-to-r from-[#4A6572] to-[#344955] text-white',
      text: 'Начать бесплатно',
      hoverEffect: 'hover:shadow-lg hover:scale-105'
    },
    variant_b: {
      className: 'bg-gradient-to-r from-[#F9AA33] to-[#F57C00] text-white',
      text: 'Попробовать сейчас',
      hoverEffect: 'hover:shadow-xl hover:scale-110'
    }
  };
  return styles[variant] || styles.variant_a;
};

export default AB_TEST_CONFIG;