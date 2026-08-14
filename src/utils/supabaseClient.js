// utils/supabaseClient.js

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

// ============================================================
// 🔒 БЕЗОПАСНОЕ ПОЛУЧЕНИЕ COMPANY_ID (УНИВЕРСАЛЬНАЯ ФУНКЦИЯ)
// ============================================================

/**
 * 🔒 Безопасное получение company_id из любого формата
 * @param {string|object|null|undefined} companyId - company_id в любом формате
 * @returns {string|null} - строка UUID или null
 */
const getSafeCompanyIdInternal = (companyId) => {
  // Если null/undefined
  if (!companyId) {
    return null;
  }

  // Если это уже строка
  if (typeof companyId === 'string') {
    const trimmed = companyId.trim();
    if (trimmed === '[object Object]' || trimmed === '') {
      return null;
    }
    return trimmed;
  }

  // Если это объект
  if (typeof companyId === 'object' && companyId !== null) {
    // Пробуем получить id из разных полей
    const id = companyId.id || companyId.company_id || companyId._id || null;
    if (id) {
      return getSafeCompanyIdInternal(id); // Рекурсивно
    }

    // Если есть поле toString и оно не стандартное
    try {
      const str = JSON.stringify(companyId);
      // Если это простой объект с одним полем
      const parsed = JSON.parse(str);
      if (typeof parsed === 'string' && parsed !== '[object Object]') {
        return parsed;
      }
      if (parsed.id && typeof parsed.id === 'string') {
        return getSafeCompanyIdInternal(parsed.id);
      }
    } catch {
      // Игнорируем ошибки парсинга
    }

    console.error('❌ getSafeCompanyId: не удалось извлечь id из объекта:', companyId);
    return null;
  }

  // Если это число или другой тип
  try {
    const str = String(companyId);
    if (str === '[object Object]' || str === '') {
      return null;
    }
    return str;
  } catch {
    return null;
  }
};

// ============================================================
// 🔥 ПРОКСИ ДЛЯ SUPABASE С АВТОМАТИЧЕСКОЙ ОЧИСТКОЙ company_id
// ============================================================

/**
 * Создаёт прокси для автоматической очистки company_id во всех запросах
 */
const createSafeSupabase = (client) => {
  return new Proxy(client, {
    get(target, prop) {
      const original = target[prop];

      // Если это не функция from - возвращаем как есть
      if (prop !== 'from' || typeof original !== 'function') {
        return original;
      }

      // Возвращаем обёрнутую функцию from
      return function(tableName) {
        const query = original.call(target, tableName);

        // Оборачиваем все методы, которые используют eq
        return new Proxy(query, {
          get(targetQuery, queryProp) {
            const originalQueryMethod = targetQuery[queryProp];

            // Если это не функция - возвращаем как есть
            if (typeof originalQueryMethod !== 'function') {
              return originalQueryMethod;
            }

            // Возвращаем обёрнутую функцию
            return function(...args) {
              // Проверяем, не является ли это eq('company_id', ...)
              if (queryProp === 'eq' && args.length >= 2 && args[0] === 'company_id') {
                const safeId = getSafeCompanyIdInternal(args[1]);
                if (!safeId) {
                  console.warn('⚠️ [SupabaseProxy] Попытка использовать невалидный company_id:', args[1]);
                  // Возвращаем пустой результат, чтобы не было ошибки
                  return {
                    then: (resolve) => resolve({ data: [], error: null }),
                    catch: () => null,
                    data: [],
                    error: null
                  };
                }
                // Заменяем на безопасный ID
                return originalQueryMethod.call(targetQuery, args[0], safeId);
              }

              // Для всех остальных методов - просто вызываем
              return originalQueryMethod.apply(targetQuery, args);
            };
          }
        });
      };
    }
  });
};

// ============================================================
// 🔥 СОЗДАЁМ ПРОКСИ ДЛЯ RPC (автоматическая очистка)
// ============================================================

const createSafeRpc = (client) => {
  return new Proxy(client, {
    get(target, prop) {
      const original = target[prop];

      if (prop !== 'rpc' || typeof original !== 'function') {
        return original;
      }

      return function(functionName, params) {
        // Если это функция с company_id параметрами
        if (
          (functionName === 'update_warehouse_balance' || 
           functionName === 'receive_materials' ||
           functionName === 'reset_company_limits' ||
           functionName === 'check_or_create_direct_chat' ||
           functionName === 'check_quota' ||
           functionName === 'increment_application_usage' ||
           functionName === 'check_materials_limit') &&
          params
        ) {
          // Очищаем все возможные поля с company_id
          const safeParams = { ...params };
          
          const fieldsToClean = [
            'p_company_id', 
            'company_id'
          ];
          
          fieldsToClean.forEach(field => {
            if (safeParams[field]) {
              const cleaned = getSafeCompanyIdInternal(safeParams[field]);
              if (cleaned) {
                safeParams[field] = cleaned;
              } else {
                console.warn(`⚠️ [RPC Proxy] Невалидный ${field} для функции ${functionName}:`, safeParams[field]);
                // Возвращаем пустой результат
                return Promise.resolve({ data: { success: false, error: 'Invalid company_id' }, error: null });
              }
            }
          });
          
          return original.call(target, functionName, safeParams);
        }
        
        return original.call(target, functionName, params);
      };
    }
  });
};

// ============================================================
// 🔧 СОЗДАЁМ ОСНОВНОЙ КЛИЕНТ С ПРОКСИ
// ============================================================

const rawClient = createClient(supabaseUrl, supabaseKey, {
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

// 🔐 Создаём защищённый клиент с прокси
const safeClient = createSafeRpc(createSafeSupabase(rawClient));

// ============================================================
// 📤 ЭКСПОРТ
// ============================================================

// ✅ Экспортируем защищённый клиент как supabase
export const supabase = safeClient;

// ✅ Экспортируем утилиту для прямого использования (только ОДИН раз)
export const getSafeCompanyId = getSafeCompanyIdInternal;

// ✅ Хеширование ключа
export const hashKey = async (key) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Для обратной совместимости (если где-то используется rawClient)
export const rawSupabase = rawClient;

console.log('✅ Supabase client with automatic company_id sanitization initialized');