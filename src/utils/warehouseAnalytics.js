// src/utils/warehouseAnalytics.js

export const predictMaterialConsumption = async (historicalData, model) => {
  if (!model) {
    // Fallback: простое среднее за 30 дней
    const last30Days = historicalData.filter(d => {
      const date = new Date(d.date);
      return (Date.now() - date.getTime()) <= 30 * 24 * 60 * 60 * 1000;
    });
    
    return last30Days.reduce((acc, day) => {
      day.materials.forEach(m => {
        if (!acc[m.name]) {
          acc[m.name] = { total: 0, count: 0, unit: m.unit };
        }
        acc[m.name].total += m.quantity;
        acc[m.name].count += 1;
        acc[m.name].unit = m.unit;
      });
      return acc;
    }, {});
  }
  
  // TODO: Реализация через TensorFlow
  return [];
};

export const calculateReorderPoint = (prediction, config = {}) => {
  const { safetyStock = 1.5, leadTimeDays = 3 } = config;
  if (!prediction?.predictedWeekly) return 10;
  
  const dailyUsage = prediction.predictedWeekly / 7;
  return Math.ceil(dailyUsage * leadTimeDays * safetyStock);
};

export const generatePurchaseOrder = async (supabase, orderData) => {
  return await supabase
    .from('purchase_orders')
    .insert([{
      ...orderData,
      status: 'draft',
      created_at: new Date().toISOString(),
      created_by: orderData.created_by || null
    }])
    .select();
};