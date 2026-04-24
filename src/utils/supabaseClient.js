import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

// 🔍 Валидация переменных окружения
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL: Supabase credentials are missing!');
  console.error('Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// 🔗 Отладка инициализации (можно убрать после проверки)
console.log('🔗 Supabase client initialized:', {
  url: supabaseUrl ? '✓' : '✗',
  key: supabaseKey ? '✓' : '✗',
  env: import.meta.env.MODE
});

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: { 'x-application-name': 'reglai' },
    // 🔁 Ретрай для сетевых ошибок
    fetch: async (url, options) => {
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch(url, options);
          
          // Логируем ошибки сервера для отладки
          if (response.status >= 500) {
            console.warn(`⚠️ Server error ${response.status}, attempt ${attempt}/${maxRetries}`);
            if (attempt === maxRetries) {
              return response; // Возвращаем, чтобы ошибка обработалась в коде приложения
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
            continue;
          }
          
          return response;
        } catch (error) {
          // Логируем сетевые ошибки
          console.warn(`⚠️ Network error, attempt ${attempt}/${maxRetries}:`, error.message);
          
          if (attempt === maxRetries) {
            throw error;
          }
          
          // Экспоненциальная задержка: 1s → 2s → 4s
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
      
      // Фоллбэк на случай непредвиденного
      return fetch(url, options);
    }
  },
  realtime: { 
    params: { 
      eventsPerSecond: 10 
    }
  }
});

// 🔐 Функция хеширования ключа (SHA-256)
export const hashKey = async (key) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};