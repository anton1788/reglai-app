import { supabase } from './supabaseClient';

// Создание API ключа
export const createApiKey = async (companyId, userId, name, permissions = ['read', 'write']) => {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .insert([{
        company_id: companyId,
        created_by: userId,
        name: name,
        key_hash: crypto.randomUUID().replace(/-/g, ''),
        permissions: permissions,
        is_active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 год
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, apiKey: data };
  } catch (err) {
    console.error('createApiKey error:', err);
    return { success: false, error: err.message };
  }
};

// Получение списка API ключей
export const getApiKeys = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getApiKeys error:', err);
    return [];
  }
};

// Отзыв API ключа
export const revokeApiKey = async (keyId) => {
  try {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', keyId);
    
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('revokeApiKey error:', err);
    return { success: false, error: err.message };
  }
};

// Инкремент использования API ключа
export const incrementApiKeyUsage = async (keyId) => {
  try {
    const { data, error } = await supabase.rpc('increment_api_key_usage', {
      p_api_key_id: keyId
    });
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('incrementApiKeyUsage error:', err);
    return null;
  }
};
