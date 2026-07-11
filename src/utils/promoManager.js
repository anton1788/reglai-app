// ============================================================
// 📦 КОНФИГУРАЦИЯ ПРОМОКОДОВ (СОГЛАСОВАНА С БД)
// ============================================================

export const PROMO_CONFIG = {
  'FREE3M': {
    planId: 'pro',
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 50,
    discountPercent: 100,
    description: '3 месяца бесплатного доступа (Профессиональный)',
    isActive: true,
    createdAt: '2026-06-28'
  },
  
  'HALF6M': {
    planId: 'business',
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 30,
    discountPercent: 50,
    description: 'Скидка 50% на 6 месяцев (Бизнес)',
    isActive: true,
    createdAt: '2026-06-28'
  },
  
  'PARTNER2026': {
    planId: 'enterprise',
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 20,
    discountPercent: 70,
    description: 'Партнёрский доступ на 1 год (Корпоративный)',
    isActive: true,
    createdAt: '2026-06-28'
  },
  
  'TEST7D': {
    planId: 'pro',
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 100,
    discountPercent: 100,
    description: '7 дней бесплатного тестирования (Профессиональный)',
    isActive: true,
    createdAt: '2026-06-28'
  },
  
  'STARTUP30': {
    planId: 'business',
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 15,
    discountPercent: 30,
    description: 'Скидка 30% для стартапов на 1 год (Бизнес)',
    isActive: true,
    createdAt: '2026-06-28'
  },
  
  'WELCOME20': {
    planId: 'pro',
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 200,
    discountPercent: 20,
    description: 'Скидка 20% для новых клиентов (Профессиональный)',
    isActive: true,
    createdAt: '2026-06-28'
  },
  
  'NGO2026': {
    planId: 'pro',
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 10,
    discountPercent: 100,
    description: 'Бесплатный доступ для НКО на 1 год (Профессиональный)',
    isActive: true,
    createdAt: '2026-06-28'
  }
};

// ============================================================
// 🔄 СИНХРОНИЗАЦИЯ КОНФИГА С БД
// ============================================================

export const syncPromoCodesToDB = async (supabaseClient, userId = null) => {
  console.log('🔄 [SYNC] Начинаем синхронизацию промокодов...');
  let synced = 0;
  let errors = 0;
  let datesUpdated = 0;
  
  for (const [code, config] of Object.entries(PROMO_CONFIG)) {
    try {
      // 1. Проверяем, есть ли уже промокод в БД
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
      
      // ✅ ПРАВИЛЬНЫЙ МАППИНГ ДЛЯ ТАБЛИЦЫ
      const insertData = {
        code: code,
        plan_id: config.planId,
        max_uses: config.maxUses,
        used_count: 0,
        expires_at: config.expiresAt,
        discount_percent: config.discountPercent || 0,
        discount_type: 'percent',
        discount_value: config.discountPercent || 0,
        description: config.description || '',
        is_active: config.isActive ?? true,
        created_by: userId || null,
        created_at: config.createdAt ? new Date(config.createdAt).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // 2. Если нет - создаём новый промокод
      if (!existing) {
        const { error: insertError } = await supabaseClient
          .from('promo_codes')
          .insert([insertData]);
        
        if (insertError) {
          console.error(`❌ Ошибка создания ${code}:`, insertError);
          errors++;
        } else {
          console.log(`✅ Создан промокод: ${code} (скидка ${config.discountPercent || 0}%)`);
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
          const updateData = {
            plan_id: config.planId,
            max_uses: config.maxUses,
            expires_at: config.expiresAt,
            discount_percent: config.discountPercent || 0,
            discount_value: config.discountPercent || 0,
            description: config.description,
            is_active: config.isActive,
            updated_at: new Date().toISOString()
          };
          
          const { error: updateError } = await supabaseClient
            .from('promo_codes')
            .update(updateData)
            .eq('code', code);
          
          if (updateError) {
            console.error(`❌ Ошибка обновления ${code}:`, updateError);
            errors++;
          } else {
            console.log(`🔄 Обновлён промокод: ${code} (скидка ${config.discountPercent || 0}%)`);
            synced++;
          }
        }
        
        // 4. СИНХРОНИЗАЦИЯ ДАТ ДЛЯ АКТИВИРОВАННЫХ КОМПАНИЙ
        const { data: companies, error: companiesError } = await supabaseClient
          .from('companies')
          .select('id, name')
          .eq('promo_code_used', code);
        
        if (companiesError) {
          console.error(`❌ Ошибка поиска компаний для ${code}:`, companiesError);
        } else if (companies && companies.length > 0) {
          console.log(`📅 Обновляем даты для ${companies.length} компаний (${code})...`);
          
          for (const company of companies) {
            const { error: updateDateError } = await supabaseClient
              .from('companies')
              .update({
                plan_expires_at: config.expiresAt,
                promo_discount_percent: config.discountPercent || 0
              })
              .eq('id', company.id);
            
            if (updateDateError) {
              console.error(`❌ Ошибка обновления даты для компании ${company.id}:`, updateDateError);
              errors++;
            } else {
              datesUpdated++;
            }
          }
          
          if (datesUpdated > 0) {
            console.log(`✅ Обновлены даты для ${datesUpdated} компаний`);
          }
        }
      }
      
    } catch (err) {
      console.error(`❌ Критическая ошибка при обработке ${code}:`, err);
      errors++;
    }
  }
  
  console.log(`📊 [SYNC] Завершено: создано/обновлено ${synced} промокодов, обновлено дат у ${datesUpdated} компаний, ошибок ${errors}`);
  return { synced, errors, datesUpdated };
};

// ============================================================
// 🔍 ПРОВЕРКА ПРОМОКОДА
// ============================================================

export const validatePromoCode = async (supabaseClient, code, companyId, userId) => {
  console.log('🔍 [validatePromoCode] Проверка:', { code, companyId, userId });
  
  let promo = null;
  let source = null;
  
  // 1️⃣ СНАЧАЛА проверяем конфиг (код) - самый свежий
  if (PROMO_CONFIG[code.toUpperCase()]) {
    promo = PROMO_CONFIG[code.toUpperCase()];
    source = 'config';
    console.log('✅ Найден в КОНФИГЕ:', promo);
  } 
  // 2️⃣ Если в конфиге нет — проверяем БД (для обратной совместимости)
  else {
    const { data, error } = await supabaseClient
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
  const usedCount = source === 'config' ? 0 : (promo.used_count || 0);
  
  if (usedCount >= maxUses) {
    return { valid: false, error: 'Лимит использований промокода исчерпан' };
  }
  
  // Проверка, не использовала ли компания (через отдельную таблицу company_promo_usage)
  // ✅ ИСПРАВЛЕНО: убрана неиспользуемая переменная error
  const { data: existingUsage } = await supabaseClient
    .from('company_promo_usage')
    .select('id')
    .eq('company_id', companyId)
    .eq('promo_code', code.toUpperCase())
    .maybeSingle();

  if (existingUsage) {
    return { valid: false, error: 'Ваша компания уже использовала этот промокод' };
  }
  
  // Проверка прав (только владелец компании)
  const { data: companyData, error: companyError } = await supabaseClient
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
    discountPercent: source === 'config' ? (promo.discountPercent || 0) : (promo.discount_percent || 0),
    description: promo.description,
    promoData: promo,
    source: source
  };
};

// ============================================================
// 🚀 АКТИВАЦИЯ ПРОМОКОДА
// ============================================================

export const activatePromoPlan = async (supabaseClient, code, companyId, userId, userEmail) => {
  console.log('🚀 [activatePromoPlan] Начало:', { code, companyId, userId });
  
  // Валидация
  const validation = await validatePromoCode(supabaseClient, code, companyId, userId);
  
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  try {
    const discountPercent = validation.discountPercent || 0;
    const planId = validation.planId;
    const codeUpper = code.toUpperCase();
    
    // 🆕 Рассчитываем дату окончания в зависимости от типа промокода
    let expiresAt = new Date();
    
    if (codeUpper === 'FREE3M') {
      expiresAt.setMonth(expiresAt.getMonth() + 3);
    } else if (codeUpper === 'HALF6M' || codeUpper === 'STARTUP30') {
      expiresAt.setMonth(expiresAt.getMonth() + 6);
    } else if (codeUpper === 'PARTNER2026' || codeUpper === 'NGO2026') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else if (codeUpper === 'TEST7D') {
      expiresAt.setDate(expiresAt.getDate() + 7);
    } else if (codeUpper === 'WELCOME20') {
      expiresAt.setMonth(expiresAt.getMonth() + 2);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }
    
    const expiresAtISO = expiresAt.toISOString();
    
    // ✅ Обновляем компанию
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
    
    // ✅ Записываем использование
    try {
      await supabaseClient
        .from('company_promo_usage')
        .insert([{
          company_id: companyId,
          promo_code: codeUpper,
          activated_by: userId,
          activated_at: new Date().toISOString()
        }]);
    } catch (err) {
      console.warn('⚠️ Не удалось записать usage (таблица может отсутствовать):', err.message);
    }
    
    // ✅ Увеличиваем счётчик в БД
    try {
      await supabaseClient.rpc('increment_promo_usage', { p_code: codeUpper });
    } catch (err) {
      console.warn('⚠️ RPC increment_promo_usage не найден:', err.message);
      try {
        const { data: existing } = await supabaseClient
          .from('promo_codes')
          .select('used_count')
          .eq('code', codeUpper)
          .single();
        
        if (existing) {
          await supabaseClient
            .from('promo_codes')
            .update({ 
              used_count: (existing.used_count || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('code', codeUpper);
        }
      } catch (err2) {
        console.warn('⚠️ Не удалось обновить счётчик:', err2.message);
      }
    }
    
    // ✅ Логируем в аудит
    try {
      await supabaseClient
        .from('audit_logs')
        .insert([{
          company_id: companyId,
          user_id: userId,
          user_email: userEmail,
          action_type: 'promo_code_activated',
          entity_type: 'company',
          entity_id: companyId,
          new_value: JSON.stringify({
            promo_code: codeUpper,
            plan: planId,
            discount_percent: discountPercent,
            expires_at: expiresAtISO
          }),
          created_at: new Date().toISOString()
        }]);
    } catch (err) {
      console.warn('⚠️ Не удалось записать аудит:', err.message);
    }
    
    const planNames = {
      basic: 'Базовый',
      pro: 'Профессиональный',
      business: 'Бизнес',
      enterprise: 'Корпоративный'
    };
    
    const discountText = discountPercent === 100 
      ? 'БЕСПЛАТНО' 
      : `со скидкой ${discountPercent}%`;
    
    return { 
      success: true, 
      planId: planId,
      discountPercent: discountPercent,
      message: `✅ Тариф "${planNames[planId] || planId}" активирован ${discountText} по промокоду ${codeUpper} до ${expiresAt.toLocaleDateString('ru-RU')}`
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
    usedCount: 0
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
  
  return promo.isActive && expiresAt > now;
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