import { supabase } from './supabaseClient';

// Генерация QR-кода для материала
export const generateMaterialQR = (material, applicationId, materialIndex) => {
  // Формат данных: APP_ID|MATERIAL_IDX|NAME|QUANTITY|UNIT|COMPANY_ID
  const qrData = JSON.stringify({
    type: 'material',
    application_id: applicationId,
    material_index: materialIndex,
    name: material.description,
    quantity: material.quantity,
    unit: material.unit,
    company_id: material.company_id
  });
  
  // Кодируем в base64 для QR
  return btoa(encodeURIComponent(qrData));
};

// Сохранение QR-кода в БД
export const saveQRToDatabase = async (applicationId, materialIndex, qrData) => {
  const { error } = await supabase
    .from('material_qr_codes')
    .insert([{
      application_id: applicationId,
      material_index: materialIndex,
      qr_data: qrData,
      generated_at: new Date().toISOString(),
      is_used: false
    }]);
  
  if (error) throw error;
};

// Отметить QR как использованный (при сканировании)
export const markQRAsUsed = async (qrData) => {
  const { error } = await supabase
    .from('material_qr_codes')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('qr_data', qrData);
  
  if (error) throw error;
};

// Получение информации по QR-коду
export const getQRInfo = async (qrData) => {
  const { data, error } = await supabase
    .from('material_qr_codes')
    .select(`
      *,
      applications:application_id (
        object_name,
        foreman_name,
        status
      )
    `)
    .eq('qr_data', qrData)
    .single();
  
  if (error) throw error;
  return data;
};