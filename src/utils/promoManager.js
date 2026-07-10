// ============================================================
// 📦 КОНФИГУРАЦИЯ ПРОМОКОДОВ (ВСЕ ПРОМОКОДЫ В ОДНОМ МЕСТЕ)
// ============================================================

export const PROMO_CONFIG = {
  // === СТАРЫЕ ПРОМОКОДЫ ===
  'FRIEND2024': {
    planId: 'pro',
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 100,
    usedBy: [],
    discountPercent: 100,
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
    discountPercent: 100,
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
    discountPercent: 100,
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
    discountPercent: 100,
    description: 'Акционный промокод',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-04-08'
  },

  // === НОВЫЕ ПРОМОКОДЫ ===
  'FREE3M': {
    planId: 'pro',
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 50,
    usedBy: [],
    discountPercent: 100,
    description: '3 месяца бесплатного доступа (Профессиональный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'HALF6M': {
    planId: 'business',
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 30,
    usedBy: [],
    discountPercent: 50,
    description: 'Скидка 50% на 6 месяцев (Бизнес)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'PARTNER2026': {
    planId: 'enterprise',
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 20,
    usedBy: [],
    discountPercent: 70,
    description: 'Партнёрский доступ на 1 год (Корпоративный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'TEST7D': {
    planId: 'pro',
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 100,
    usedBy: [],
    discountPercent: 100,
    description: '7 дней бесплатного тестирования (Профессиональный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'STARTUP30': {
    planId: 'business',
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 15,
    usedBy: [],
    discountPercent: 30,
    description: 'Скидка 30% для стартапов на 1 год (Бизнес)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'WELCOME20': {
    planId: 'pro',
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 200,
    usedBy: [],
    discountPercent: 20,
    description: 'Скидка 20% для новых клиентов (Профессиональный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'NGO2026': {
    planId: 'pro',
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 10,
    usedBy: [],
    discountPercent: 100,
    description: 'Бесплатный доступ для НКО на 1 год (Профессиональный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  }
};

// ============================================================
// 🔄 СИНХРОНИЗАЦИЯ КОНФИГА С БД (ОДНА ВЕРСИЯ!)
// ============================================================

export const syncPromoCodesToDB = async (supabaseClient) => {
  console.log('🔄 [SYNC] Начинаем синхронизацию промокодов...');
  let synced = 0;
  let errors = 0;
  let datesUpdated = 0;
  
  for (const [code, config] of Object.entries(PROMO_CONFIG)) {
    try {
      const { data: existing, error: findError } = await supabaseClient
        .from('promo_codes')
        .select('id, code, used_count')
        .eq('code', code)
        .maybeSingle();
      
      if (findError && findError.code !== 'PGRST116') {
        console.error(`❌ Ошибка поиска ${code}:`, findError);
        errors++;
        continue;
      }
      
      if (!existing) {
        const { error: insertError } = await supabaseClient
          .from('promo_codes')
          .insert([{
            code: code,
            plan_id: config.planId,
            discount_percent: config.discountPercent || 0,
            max_uses: config.maxUses,
            used_count: config.usedBy.length,
            expires_at: config.expiresAt,
            description: config.description,
            is_active: config.isActive,
            created_by: config.createdBy,
            created_at: config.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        
        if (insertError) {
          console.error(`❌ Ошибка создания ${code}:`, insertError);
          errors++;
        } else {
          console.log(`✅ Создан промокод: ${code} (скидка ${config.discountPercent || 0}%)`);
          synced++;
        }
      } else {
        const needUpdate = 
          existing.max_uses !== config.maxUses ||
          existing.plan_id !== config.planId ||
          existing.is_active !== config.isActive;
        
        if (needUpdate) {
          const { error: updateError } = await supabaseClient
            .from('promo_codes')
            .update({
              plan_id: config.planId,
              max_uses: config.maxUses,
              expires_at: config.expiresAt,
              discount_percent: config.discountPercent || 0,
              description: config.description,
              is_active: config.isActive,
              updated_at: new Date().toISOString()
            })
            .eq('code', code);
          
          if (updateError) {
            console.error(`❌ Ошибка обновления ${code}:`, updateError);
            errors++;
          } else {
            console.log(`🔄 Обновлён промокод: ${code} (скидка ${config.discountPercent || 0}%)`);
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

// ============================================================
// 🔍 ПРОВЕРКА ПРОМОКОДА
// ============================================================

export const validatePromoCode = async (supabaseClient, code, companyId, userId) => {
  console.log('🔍 [validatePromoCode] Проверка:', { code, companyId, userId });
  
  let promo = null;
  let source = null;
  
  if (PROMO_CONFIG[code.toUpperCase()]) {
    promo = PROMO_CONFIG[code.toUpperCase()];
    source = 'config';
  } else {
    const { data, error } = await supabaseClient
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();
    
    if (!error && data) {
      promo = data;
      source = 'database';
    }
  }
  
  if (!promo) {
    return { valid: false, error: 'Промокод не найден' };
  }
  
  const expiresAt = source === 'config' 
    ? new Date(promo.expiresAt)
    : new Date(promo.expires_at);
  
  if (expiresAt < new Date()) {
    return { valid: false, error: 'Срок действия промокода истек' };
  }
  
  const maxUses = source === 'config' ? promo.maxUses : promo.max_uses;
  const usedCount = source === 'config' ? promo.usedBy.length : (promo.used_count || 0);
  
  if (usedCount >= maxUses) {
    return { valid: false, error: 'Лимит использований промокода исчерпан' };
  }
  
  return { 
    valid: true, 
    planId: source === 'config' ? promo.planId : promo.plan_id,
    discountPercent: source === 'config' ? (promo.discountPercent || 0) : (promo.discount_percent || 0),
    description: promo.description,
    promoData: promo,
    source: source
  };
};

// ============================================================
// 🚀 АКТИВАЦИЯ ПРОМОКОДА
// ============================================================

export const activatePromoPlan = async (supabaseClient, code, companyId, userId) => {
  console.log('🚀 [activatePromoPlan] Начало:', { code, companyId, userId });
  
  const validation = await validatePromoCode(supabaseClient, code, companyId, userId);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  try {
    const discountPercent = validation.discountPercent || 0;
    const planId = validation.planId;
    const codeUpper = code.toUpperCase();
    
    let expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
    
    const expiresAtISO = expiresAt.toISOString();
    
    const { error: updateError } = await supabaseClient
      .from('companies')
      .update({
        plan_tier: planId,
        plan_expires_at: expiresAtISO,
        promo_code_used: codeUpper,
        promo_activated_at: new Date().toISOString(),
        promo_activated_by: userId,
        promo_discount_percent: discountPercent,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId);
    
    if (updateError) throw updateError;
    
    if (validation.source === 'config') {
      const promoConfig = PROMO_CONFIG[codeUpper];
      if (promoConfig && !promoConfig.usedBy.includes(companyId)) {
        promoConfig.usedBy.push(companyId);
      }
    }
    
    return { 
      success: true, 
      planId: planId,
      discountPercent: discountPercent,
      message: `✅ Тариф активирован по промокоду ${codeUpper}`
    };
    
  } catch (err) {
    console.error('❌ Ошибка активации:', err);
    return { success: false, error: err.message || 'Ошибка активации промокода' };
  }
};

// ============================================================
// 📋 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

export const getAllPromoCodesFromConfig = () => {
  return Object.entries(PROMO_CONFIG).map(([code, data]) => ({
    code,
    ...data,
    usedCount: data.usedBy?.length || 0
  }));
};

export const checkUserPromoCode = async (supabaseClient, companyId) => {
  try {
    const { data, error } = await supabaseClient
      .from('companies')
      .select('promo_code_used, promo_activated_at, promo_discount_percent, plan_tier')
      .eq('id', companyId)
      .single();
    
    if (error) throw error;
    
    return {
      hasPromo: !!data?.promo_code_used,
      promoCode: data?.promo_code_used,
      activatedAt: data?.promo_activated_at,
      discountPercent: data?.promo_discount_percent || 0,
      currentPlan: data?.plan_tier
    };
  } catch (err) {
    console.error('checkUserPromoCode error:', err);
    return { hasPromo: false };
  }
};

export const getPromoInfo = (code) => {
  const upperCode = code?.toUpperCase();
  return PROMO_CONFIG[upperCode] || null;
};

export const isPromoActive = (code) => {
  const promo = getPromoInfo(code);
  if (!promo) return false;
  
  const now = new Date();
  const expiresAt = new Date(promo.expiresAt);
  
  return promo.isActive && expiresAt > now && promo.usedBy.length < promo.maxUses;
};

export const getActivePromoCodes = () => {
  return Object.entries(PROMO_CONFIG)
    .filter(([, config]) => config.isActive)
    .map(([code, config]) => ({
      code,
      ...config
    }));
};

// ============================================================
// 📦 ЭКСПОРТ ПО УМОЛЧАНИЮ
// ============================================================

export default {
  PROMO_CONFIG,
  syncPromoCodesToDB,
  validatePromoCode,
  activatePromoPlan,
  getAllPromoCodesFromConfig,
  checkUserPromoCode,
  getPromoInfo,
  isPromoActive,
  getActivePromoCodes
};