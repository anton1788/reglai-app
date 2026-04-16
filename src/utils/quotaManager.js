// src/utils/quotaManager.js
import { TARIFF_PLANS, checkQuota, logApiUsage } from './tariffPlans';
import { supabase } from '../lib/supabaseClient';  // ← lib, а не config

// Middleware для проверки квоты
export const quotaMiddleware = async (req, res, next) => {
  const apiKey = req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required',
      code: 'MISSING_API_KEY'
    });
  }
  
  // Валидация ключа
  const { data: keyData, error } = await supabase
    .from('api_keys')
    .select('id, company_id, plan_tier, monthly_quota, daily_quota, is_active, allowed_ips')
    .eq('key_hash', await hashKey(apiKey))
    .single();
  
  if (error || !keyData) {
    return res.status(401).json({ 
      error: 'Invalid API key',
      code: 'INVALID_API_KEY'
    });
  }
  
  if (!keyData.is_active) {
    return res.status(403).json({ 
      error: 'API key revoked',
      code: 'KEY_REVOKED'
    });
  }
  
  // Проверка IP (если настроено)
  if (keyData.allowed_ips?.length > 0) {
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!keyData.allowed_ips.includes(clientIp)) {
      return res.status(403).json({ 
        error: 'IP not allowed',
        code: 'IP_NOT_ALLOWED'
      });
    }
  }
  
  // Проверка квоты
  const quotaStatus = await checkQuota(supabase, keyData.company_id, keyData.id);
  
  if (!quotaStatus.allowed) {
    return res.status(429).json({ 
      error: 'Quota exceeded',
      code: 'QUOTA_EXCEEDED',
      quota: {
        daily: quotaStatus.dailyLimit,
        used: quotaStatus.dailyUsage,
        remaining: quotaStatus.dailyRemaining,
        resetAt: quotaStatus.resetAt
      }
    });
  }
  
  // Добавляем информацию в request
  req.apiKey = keyData;
  req.quotaStatus = quotaStatus;
  
  next();
};

// Обновление квоты (вызывается после успешного запроса)
export const updateQuota = async (apiKeyId, companyId, requestData, responseData) => {
  const startTime = Date.now();
  
  await logApiUsage(supabase, {
    apiKeyId,
    companyId,
    endpoint: requestData.endpoint,
    method: requestData.method,
    statusCode: responseData.statusCode,
    responseTimeMs: Date.now() - startTime,
    requestSizeBytes: JSON.stringify(requestData.body || {}).length,
    responseSizeBytes: JSON.stringify(responseData.body || {}).length,
    ipAddress: requestData.ip,
    userAgent: requestData.userAgent
  });
};

// Хеширование ключа
const hashKey = async (key) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Получение статистики использования
export const getUsageStats = async (companyId, period = 'month') => {
  const now = new Date();
  let startDate;
  
  if (period === 'day') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  const { data, error } = await supabase
    .from('api_usage_logs')
    .select('endpoint, method, status_code, response_time_ms, created_at')
    .eq('company_id', companyId)
    .gte('created_at', startDate.toISOString());
  
  if (error) throw error;
  
  const stats = {
    totalRequests: data.length,
    successRequests: data.filter(d => d.status_code >= 200 && d.status_code < 300).length,
    errorRequests: data.filter(d => d.status_code >= 400).length,
    avgResponseTime: data.reduce((sum, d) => sum + (d.response_time_ms || 0), 0) / (data.length || 1),
    byEndpoint: {},
    byStatusCode: {}
  };
  
  // Группировка по эндпоинтам
  data.forEach(log => {
    stats.byEndpoint[log.endpoint] = (stats.byEndpoint[log.endpoint] || 0) + 1;
    stats.byStatusCode[log.status_code] = (stats.byStatusCode[log.status_code] || 0) + 1;
  });
  
  return stats;
};

export default {
  quotaMiddleware,
  updateQuota,
  getUsageStats
};