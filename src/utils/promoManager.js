// ============================================
// 4. ДОБАВИТЬ В utils/promoManager.js
// ============================================

// ========== КОНФИГУРАЦИЯ ПРОМОКОДОВ (ТОЛЬКО ЗДЕСЬ) ==========
export const PROMO_CONFIG = {
  'FRIEND2024': {
    planId: 'pro',
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 100,
    usedBy: [],
    description: 'Партнерский доступ (Профессиональный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2024-01-01'
  },
  'PARTNER_PRO': {
    planId: 'enterprise',
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 50,
    usedBy: [],
    description: 'Для стратегических партнеров (Корпоративный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2024-01-01'
  },
  'TEST2024': {
    planId: 'pro',
    expiresAt: '2025-12-31T23:59:59Z',
    maxUses: 1,
    usedBy: [],
    description: 'Тестовый доступ (Профессиональный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2024-01-01'
  },
  'ПОЛЬЗУЙСЯ': {
    planId: 'pro',
    expiresAt: '2030-12-31T23:59:59Z',
    maxUses: 1000,
    usedBy: [],
    description: 'Акционный промокод',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-04-08'
  }
};

// ========== СИНХРОНИЗАЦИЯ КОНФИГА С БД ==========
export const syncPromoCodesToDB = async (supabase) => {
  console.log('🔄 [SYNC] Начинаем синхронизацию промокодов...');
  let synced = 0;
  let errors = 0;
  let datesUpdated = 0;
  
  for (const [code, config] of Object.entries(PROMO_CONFIG)) {
    try {
      // 1. Проверяем, есть ли уже промокод в БД
      const { data: existing, error: findError } = await supabase
        .from('promo_codes')
        .select('id, code, used_count')
        .eq('code', code)
        .maybeSingle();
      
      if (findError && findError.code !== 'PGRST116') {
        console.error(`❌ Ошибка поиска ${code}:`, findError);
        errors++;
        continue;
      }
      
      // 2. Если нет - создаём новый промокод
      if (!existing) {
        // 🔥 ИСПРАВЛЕНО: используем правильные названия колонок
        const { error: insertError } = await supabase
          .from('promo_codes')
          .insert([{
            code: code,
            plan_id: config.planId,           // ← plan_id вместо plan_tier
            max_uses: config.maxUses,
            used_count: config.usedBy.length,
            expires_at: config.expiresAt,
            description: config.description,
            is_active: config.isActive,
            created_by: config.createdBy,
            created_at: config.createdAt || new Date().toISOString(),
            discount_type: 'percent',          // ← обязательное поле
            discount_value: 100                // ← обязательное поле
          }]);
        
        if (insertError) {
          console.error(`❌ Ошибка создания ${code}:`, insertError);
          errors++;
        } else {
          console.log(`✅ Создан промокод: ${code}`);
          synced++;
        }
      } 
      // 3. Если есть - обновляем существующий
      else {
        // Проверяем, нужно ли обновление
        const needUpdate = 
          existing.max_uses !== config.maxUses ||
          existing.plan_id !== config.planId ||
          existing.is_active !== config.isActive;
        
        if (needUpdate) {
          const { error: updateError } = await supabase
            .from('promo_codes')
            .update({
              plan_id: config.planId,
              max_uses: config.maxUses,
              expires_at: config.expiresAt,
              description: config.description,
              is_active: config.isActive,
              updated_at: new Date().toISOString()
            })
            .eq('code', code);
          
          if (updateError) {
            console.error(`❌ Ошибка обновления ${code}:`, updateError);
            errors++;
          } else {
            console.log(`🔄 Обновлён промокод: ${code}`);
            synced++;
          }
        }
      }
      
    } catch (err) {
      console.error(`❌ Критическая ошибка при обработке ${code}:`, err);
      errors++;
    }
  }
  
  console.log(`📊 [SYNC] Завершено: создано/обновлено ${synced} промокодов, ошибок ${errors}`);
  return { synced, errors, datesUpdated };
};

// ========== ПРОВЕРКА ПРОМОКОДА ==========
export const validatePromoCode = async (supabase, code, companyId, userId) => {
  console.log('🔍 [validatePromoCode] Проверка:', { code, companyId, userId });
  
  let promo = null;
  let source = null;
  
  // 1️⃣ СНАЧАЛА проверяем конфиг
  if (PROMO_CONFIG[code.toUpperCase()]) {
    promo = PROMO_CONFIG[code.toUpperCase()];
    source = 'config';
    console.log('✅ Найден в КОНФИГЕ:', promo);
  } 
  // 2️⃣ Если в конфиге нет — проверяем БД
  else {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();
    
    if (!error && data) {
      promo = data;
      source = 'database';
      console.log('✅ Найден в БД:', promo);
    }
  }
  
  if (!promo) {
    console.error('❌ Промокод не найден');
    return { valid: false, error: 'Промокод не найден' };
  }
  
  // Проверка срока действия
  const expiresAt = source === 'config' 
    ? new Date(promo.expiresAt)
    : new Date(promo.expires_at);
  
  if (expiresAt < new Date()) {
    return { valid: false, error: 'Срок действия промокода истек' };
  }
  
  // Проверка лимита
  const maxUses = source === 'config' ? promo.maxUses : promo.max_uses;
  const usedCount = source === 'config' ? promo.usedBy.length : (promo.used_count || 0);
  
  if (usedCount >= maxUses) {
    return { valid: false, error: 'Лимит использований промокода исчерпан' };
  }
  
  // Проверка прав (только владелец компании)
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .select('is_company_owner')
    .eq('id', companyId)
    .single();
  
  if (companyError || companyData?.is_company_owner !== userId) {
    console.error('❌ Не владелец компании');
    return { valid: false, error: 'Только владелец компании может активировать промокод' };
  }
  
  return { 
    valid: true, 
    planId: source === 'config' ? promo.planId : promo.plan_id,
    description: promo.description,
    promoData: promo,
    source: source
  };
};

// ========== АКТИВАЦИЯ ПРОМОКОДА ==========
export const activatePromoPlan = async (supabase, code, companyId, userId, userEmail) => {
  console.log('🚀 [activatePromoPlan] Начало:', { code, companyId, userId });
  
  // Валидация
  const validation = await validatePromoCode(supabase, code, companyId, userId);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  try {
    // 🔥 ИСПРАВЛЕНО: используем правильные названия колонок
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        plan_tier: validation.planId,
        plan_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        promo_code_used: code.toUpperCase(),
        promo_applied_at: new Date().toISOString(),
        promo_discount_percent: validation.source === 'config' 
          ? (PROMO_CONFIG[code.toUpperCase()]?.discount_percent || 0)
          : validation.promoData?.discount_percent || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId);
    
    if (updateError) throw updateError;
    
    // Обновляем использователи в конфиге
    if (validation.source === 'config') {
      const promo = PROMO_CONFIG[code.toUpperCase()];
      if (promo && !promo.usedBy.includes(companyId)) {
        promo.usedBy.push(companyId);
      }
    }
    
    // Увеличиваем счётчик в БД
    try {
      const { error: updateCountError } = await supabase
        .from('promo_codes')
        .update({
          used_count: (validation.source === 'database' ? validation.promoData?.used_count || 0 : 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('code', code.toUpperCase());
      
      if (updateCountError) {
        console.warn('⚠️ Не удалось обновить счётчик использований:', updateCountError.message);
      }
    } catch (err) {
      console.warn('⚠️ Ошибка обновления счётчика:', err.message);
    }
    
    // 🔥 ИСПРАВЛЕНО: запись в audit_logs с правильными полями
    try {
      await supabase
        .from('audit_logs')
        .insert([{
          company_id: companyId,
          user_id: userId,
          user_email: userEmail,
          action_type: 'promo_code_activated',
          entity_type: 'company',
          entity_id: companyId,
          new_value: JSON.stringify({
            promo_code: code,
            plan: validation.planId,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          }),
          created_at: new Date().toISOString()
        }]);
    } catch (err) {
      console.warn('⚠️ Не удалось записать в аудит:', err.message);
    }
    
    return { 
      success: true, 
      planId: validation.planId,
      message: `✅ Тариф "${validation.planId === 'pro' ? 'Профессиональный' : validation.planId === 'enterprise' ? 'Корпоративный' : 'Базовый'}" активирован по промокоду ${code} до ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}`
    };
    
  } catch (err) {
    console.error('❌ Ошибка активации:', err);
    return { success: false, error: err.message };
  }
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
export const getAllPromoCodesFromConfig = () => {
  return Object.entries(PROMO_CONFIG).map(([code, data]) => ({
    code,
    ...data,
    usedCount: data.usedBy?.length || 0
  }));
};

export const checkUserPromoCode = async (supabase, companyId) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('promo_code_used, promo_applied_at, plan_tier')
      .eq('id', companyId)
      .single();
    
    if (error) throw error;
    
    return {
      hasPromo: !!data?.promo_code_used,
      promoCode: data?.promo_code_used,
      activatedAt: data?.promo_applied_at,
      currentPlan: data?.plan_tier
    };
  } catch (err) {
    console.error('checkUserPromoCode error:', err);
    return { hasPromo: false };
  }
};

// Экспорт по умолчанию
export default {
  PROMO_CONFIG,
  syncPromoCodesToDB,
  validatePromoCode,
  activatePromoPlan,
  getAllPromoCodesFromConfig,
  checkUserPromoCode
};