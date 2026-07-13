// ============================================================
// 📦 КОНФИГУРАЦИЯ ПРОМОКОДОВ (ОБНОВЛЁННАЯ)
// ============================================================

export const PROMO_CONFIG = {
  // ✅ БЕСПЛАТНЫЙ ДОСТУП НА 3 МЕСЯЦА
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
  
  // ✅ СКИДКА 50% НА 6 МЕСЯЦЕВ
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
  
  // ✅ ПАРТНЁРСКИЙ ДОСТУП (ГОДОВОЙ)
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
  
  // ✅ БЕСПЛАТНЫЙ ТЕСТОВЫЙ ДОСТУП (7 ДНЕЙ)
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
  
  // ✅ СКИДКА 30% ДЛЯ СТАРТАПОВ (ГОД)
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
  
  // ✅ СКИДКА 20% ДЛЯ НОВЫХ КЛИЕНТОВ
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
  
  // ✅ БЕСПЛАТНЫЙ ДОСТУП ДЛЯ НЕКОММЕРЧЕСКИХ ОРГАНИЗАЦИЙ
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
// 🔄 СИНХРОНИЗАЦИЯ КОНФИГА С БД
// ============================================================

export const syncPromoCodesToDB = async (supabaseClient) => {
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
      
      // 2. Если нет - создаём новый промокод
      if (!existing) {
        const { error: insertError } = await supabaseClient
          .from('promo_codes')
          .insert([{
            code: code,
            plan_id: config.planId,
            max_uses: config.maxUses,
            used_count: config.usedBy.length,
            expires_at: config.expiresAt,
            discount_percent: config.discountPercent || 0,
            description: config.description,
            is_active: config.isActive,
            created_by: config.createdBy,
            created_at: config.createdAt || new Date().toISOString()
          }]);
        
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
  const usedCount = source === 'config' ? promo.usedBy.length : (promo.used_count || 0);
  
  if (usedCount >= maxUses) {
    return { valid: false, error: 'Лимит использований промокода исчерпан' };
  }
  
  // Проверка, не использовала ли компания
  if (source === 'database') {
    const { data: existingUsage } = await supabaseClient
      .from('company_promo_usage')
      .select('id')
      .eq('company_id', companyId)
      .eq('promo_code', code.toUpperCase())
      .maybeSingle();
    
    if (existingUsage) {
      return { valid: false, error: 'Ваша компания уже использовала этот промокод' };
    }
  } else if (source === 'config') {
    if (promo.usedBy.includes(companyId)) {
      return { valid: false, error: 'Ваша компания уже использовала этот промокод' };
    }
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
      // По умолчанию: 1 месяц
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }
    
    const expiresAtISO = expiresAt.toISOString();
    
    // Обновляем компанию
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
    
    // Обновляем использователи в конфиге
    if (validation.source === 'config') {
      const promoConfig = PROMO_CONFIG[codeUpper];
      if (promoConfig && !promoConfig.usedBy.includes(companyId)) {
        promoConfig.usedBy.push(companyId);
      }
    }
    
    // Записываем в БД использование (если таблица существует)
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
    
    // Увеличиваем счётчик в БД (если есть RPC)
    try {
      await supabaseClient.rpc('increment_promo_usage', { p_code: codeUpper });
    } catch (err) {
      console.warn('⚠️ RPC increment_promo_usage не найден:', err.message);
      // Пытаемся обновить напрямую
      try {
        await supabaseClient
          .from('promo_codes')
          .update({ 
            used_count: supabaseClient.sql`used_count + 1`,
            updated_at: new Date().toISOString()
          })
          .eq('code', codeUpper);
      } catch (err2) {
        console.warn('⚠️ Не удалось обновить счётчик:', err2.message);
      }
    }
    
    // Логируем в аудит
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

// 🆕 Получить информацию о промокоде по коду
export const getPromoInfo = (code) => {
  const upperCode = code?.toUpperCase();
  return PROMO_CONFIG[upperCode] || null;
};

// 🆕 Проверить, активен ли промокод
export const isPromoActive = (code) => {
  const promo = getPromoInfo(code);
  if (!promo) return false;
  
  const now = new Date();
  const expiresAt = new Date(promo.expiresAt);
  
  return promo.isActive && expiresAt > now && promo.usedBy.length < promo.maxUses;
};

// 🆕 Получить все активные промокоды
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