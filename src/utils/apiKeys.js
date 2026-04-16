// src/utils/apiKeys.js
// ✅ ИМПОРТ из общего клиента вместо создания нового
import { supabase, hashKey } from './supabaseClient';

// Генерация API-ключа
export const generateAPIKey = async (userId, companyId, name, permissions = []) => {
  if (!userId || !companyId) {
    throw new Error('userId and companyId are required');
  }
  
  const sanitizedName = (name || 'API Key').trim().slice(0, 100);
  if (!sanitizedName) {
    throw new Error('Key name cannot be empty');
  }
  
  const validPermissions = Array.isArray(permissions) 
    ? permissions.filter(p => typeof p === 'string' && p.length > 0).slice(0, 20)
    : ['read:applications', 'write:applications'];
  
  const keyPrefix = 'rk_live_';
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const apiKey = `${keyPrefix}${randomPart}`;
  
  const { data, error } = await supabase
    .from('api_keys')
    .insert([{
      user_id: userId,
      company_id: companyId,
      name: sanitizedName,
      key_hash: await hashKey(apiKey),
      permissions: validPermissions,
      is_active: true,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      last_used_at: null,
      usage_count: 0
    }])
    .select()
    .single();
  
  if (error) throw error;
  
  return { ...data, key: apiKey };
};

// Получение всех API-ключей компании
export const getCompanyAPIKeys = async (companyId) => {
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, permissions, is_active, created_at, expires_at, last_used_at, usage_count')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
};

// Отзыв API-ключа
export const revokeAPIKey = async (keyId) => {
  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId);
  
  if (error) throw error;
  return true;
};

// Проверка API-ключа
export const validateAPIKey = async (apiKey) => {
  try {
    const keyHash = await hashKey(apiKey);
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, user_id, company_id, permissions, is_active, expires_at, usage_count')
      .eq('key_hash', keyHash)
      .single();
    
    if (error || !data) return { valid: false };
    if (!data.is_active) return { valid: false, reason: 'Key revoked' };
    if (new Date(data.expires_at) < new Date()) return { valid: false, reason: 'Key expired' };
    
    // Обновление счётчика без блокировки
    supabase.rpc('increment_api_key_usage', { p_key_id: data.id })
      .catch(err => console.warn('[API] Не удалось обновить usage_count:', err));
    
    return {
      valid: true,
      userId: data.user_id,
      companyId: data.company_id,
      permissions: data.permissions
    };
  } catch (err) {
    console.error('[API] Ошибка валидации ключа:', err);
    return { valid: false, reason: 'Internal error' };
  }
};

// Rate limiting
export const checkRateLimit = async (companyId, limit = 100, windowMs = 60000) => {
  const now = Date.now();
  const windowStart = new Date(now - windowMs).toISOString();
  
  const { count, error } = await supabase
    .from('api_requests_log')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', windowStart);
  
  if (error) return { allowed: true };
  
  return {
    allowed: count < limit,
    remaining: Math.max(0, limit - count),
    resetAt: new Date(now + windowMs).toISOString()
  };
};

// Логирование запросов
export const logAPIRequest = async (companyId, endpoint, method, statusCode) => {
  try {
    await supabase
      .from('api_requests_log')
      .insert([{
        company_id: companyId,
        endpoint,
        method,
        status_code: statusCode,
        created_at: new Date().toISOString()
      }]);
  } catch (err) {
    console.warn('[API Log] Failed to log request:', { endpoint, method, statusCode, error: err?.message });
  }
};

export default {
  generateAPIKey,
  getCompanyAPIKeys,
  revokeAPIKey,
  validateAPIKey,
  checkRateLimit,
  logAPIRequest
};