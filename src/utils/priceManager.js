// src/utils/priceManager.js
import { supabase } from './supabaseClient';

/**
 * Получить цену из справочника
 */
export const getMaterialPrice = async (companyId, description) => {
  try {
    const { data, error } = await supabase
      .from('material_prices')
      .select('price, supplier_name, supplier_phone, updated_at, unit')
      .eq('company_id', companyId)
      .eq('description', description)
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) throw error;
    return data || null;
  } catch (err) {
    console.error('Ошибка получения цены:', err);
    return null;
  }
};

/**
 * Получить цены для нескольких материалов
 */
export const getMaterialPricesBatch = async (companyId, descriptions) => {
  if (!descriptions || descriptions.length === 0) return {};
  
  try {
    const { data, error } = await supabase
      .from('material_prices')
      .select('description, price, supplier_name, supplier_phone, unit')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .in('description', descriptions);
    
    if (error) throw error;
    
    const priceMap = {};
    data.forEach(item => {
      priceMap[item.description] = {
        price: item.price,
        supplier_name: item.supplier_name,
        supplier_phone: item.supplier_phone,
        unit: item.unit
      };
    });
    
    return priceMap;
  } catch (err) {
    console.error('Ошибка получения цен:', err);
    return {};
  }
};

/**
 * Сохранить цену в справочник
 */
export const saveMaterialPrice = async (companyId, material, userId, userEmail) => {
  try {
    const { data, error } = await supabase
      .from('material_prices')
      .upsert({
        company_id: companyId,
        description: material.description.trim(),
        unit: material.unit || 'шт',
        price: material.supplier_price || material.final_price || material.price || 0,
        supplier_name: material.supplier_name || null,
        supplier_phone: material.supplier_phone || null,
        updated_by: userId,
        updated_by_email: userEmail,
        updated_at: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'company_id,description,unit'  // ← ИСПРАВЛЕНО
      })
      .select();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Ошибка сохранения цены:', err);
    return null;
  }
};

/**
 * Обновить цены в заявке
 */
export const updateApplicationPrices = async (applicationId, materialsWithPrices) => {
  try {
    const totalAmount = materialsWithPrices.reduce((sum, m) => {
      const price = m.final_price || m.supplier_price || m.price || 0;
      return sum + (m.quantity * price);
    }, 0);
    
    const { error } = await supabase
      .from('applications')
      .update({
        materials: materialsWithPrices,
        materials_with_prices: materialsWithPrices,
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Ошибка обновления цен:', err);
    return false;
  }
};

/**
 * Получить историю цен для материала
 */
export const getMaterialPriceHistory = async (companyId, description) => {
  try {
    const { data, error } = await supabase
      .from('material_prices')
      .select('price, supplier_name, updated_at, updated_by_email')
      .eq('company_id', companyId)
      .eq('description', description)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Ошибка получения истории цен:', err);
    return [];
  }
};

/**
 * Проверить, может ли пользователь редактировать цены
 */
export const canEditPrices = (userRole) => {
  return ['supply_admin', 'manager', 'director', 'accountant'].includes(userRole);
};

/**
 * Проверить, может ли пользователь видеть цены
 */
export const canViewPrices = (userRole) => {
  return ['supply_admin', 'manager', 'director', 'accountant', 'client_manager'].includes(userRole);
};