// src/utils/promoManager.js

// ============================================================
// 📦 КОНФИГУРАЦИЯ ПРОМОКОДОВ
// ============================================================

export const PROMO_CONFIG = {
  'FREE3M': {
    planId: 'pro',
    discountPercent: 100,
    durationMonths: 3,
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 50,
    usedBy: [],
    description: '3 месяца бесплатного доступа (Профессиональный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'HALF6M': {
    planId: 'business',
    discountPercent: 50,
    durationMonths: 6,
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 30,
    usedBy: [],
    description: 'Скидка 50% на 6 месяцев (Бизнес)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'PARTNER2026': {
    planId: 'enterprise',
    discountPercent: 70,
    durationMonths: 12,
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 20,
    usedBy: [],
    description: 'Партнёрский доступ на 1 год (Корпоративный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'TEST7D': {
    planId: 'pro',
    discountPercent: 100,
    durationDays: 7,
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 100,
    usedBy: [],
    description: '7 дней бесплатного тестирования (Профессиональный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'STARTUP30': {
    planId: 'business',
    discountPercent: 30,
    durationMonths: 12,
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 15,
    usedBy: [],
    description: 'Скидка 30% для стартапов на 1 год (Бизнес)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'WELCOME20': {
    planId: 'pro',
    discountPercent: 20,
    durationMonths: 2,
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 200,
    usedBy: [],
    description: 'Скидка 20% для новых клиентов (Профессиональный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'NGO2026': {
    planId: 'pro',
    discountPercent: 100,
    durationMonths: 12,
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 10,
    usedBy: [],
    description: 'Бесплатный доступ для НКО на 1 год (Профессиональный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-06-28'
  },
  'MICRO50': {
    planId: 'micro',
    discountPercent: 50,
    durationMonths: 3,
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 150,
    usedBy: [],
    description: 'Скидка 50% на 3 месяца (Микро)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-09-13'
  },
  'MICRO3M': {
    planId: 'micro',
    discountPercent: 100,
    durationMonths: 3,
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 100,
    usedBy: [],
    description: '3 месяца бесплатно (Микро)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-09-13'
  },
  'GROWTH25': {
    planId: 'business',
    discountPercent: 25,
    durationMonths: 6,
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 50,
    usedBy: [],
    description: 'Скидка 25% на 6 месяцев (Бизнес)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-09-13'
  },
  'PRO40': {
    planId: 'pro',
    discountPercent: 40,
    durationMonths: 6,
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 75,
    usedBy: [],
    description: 'Скидка 40% на 6 месяцев (Профессиональный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-09-13'
  },
  'ENTERPRISE15': {
    planId: 'enterprise',
    discountPercent: 15,
    durationMonths: 12,
    expiresAt: '2027-06-28T23:59:59Z',
    maxUses: 25,
    usedBy: [],
    description: 'Скидка 15% на 1 год (Корпоративный)',
    isActive: true,
    createdBy: 'admin@reglai.ru',
    createdAt: '2026-09-13'
  }
};

// ============================================================
// 🔧 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

/**
 * ✅ ИСПРАВЛЕНО: считаем expiresAt корректно
 */
const calculateExpiresAt = (promo) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime());

  if (promo.durationMonths && promo.durationMonths > 0) {
    expiresAt.setMonth(expiresAt.getMonth() + promo.durationMonths);
  } else if (promo.durationDays && promo.durationDays > 0) {
    expiresAt.setDate(expiresAt.getDate() + promo.durationDays);
  } else {
    // Fallback — 30 дней
    expiresAt.setDate(expiresAt.getDate() + 30);
  }

  return expiresAt.toISOString();
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
      const { data: existing, error: findError } = await supabaseClient
        .from('promo_codes')
        .select('id, code, used_count, plan_id, max_uses, is_active')
        .eq('code', code)
        .maybeSingle();

      if (findError && findError.code !== 'PGRST116') {
        console.error(`❌ Ошибка поиска ${code}:`, findError);
        errors++;
        continue;
      }

      const payload = {
        code: code,
        plan_id: config.planId,
        max_uses: config.maxUses,
        used_count: config.usedBy?.length || 0,
        expires_at: config.expiresAt,
        discount_percent: config.discountPercent || 0,
        description: config.description,
        is_active: config.isActive,
        created_at: config.createdAt || new Date().toISOString()
      };

      if (!existing) {
        const { error: insertError } = await supabaseClient
          .from('promo_codes')
          .insert([payload]);

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

  if (PROMO_CONFIG[code.toUpperCase()]) {
    promo = PROMO_CONFIG[code.toUpperCase()];
    source = 'config';
    console.log('✅ Найден в КОНФИГЕ:', promo);
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
      console.log('✅ Найден в БД:', promo);
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
  const usedCount = source === 'config' ? (promo.usedBy?.length || 0) : (promo.used_count || 0);

  if (usedCount >= maxUses) {
    return { valid: false, error: 'Лимит использований промокода исчерпан' };
  }

  // ✅ ИСПРАВЛЕНО: ВСЕГДА проверяем company_promo_usage (и для config, и для database)
  const { data: existingUsage } = await supabaseClient
    .from('company_promo_usage')
    .select('id')
    .eq('company_id', companyId)
    .eq('promo_code', code.toUpperCase())
    .maybeSingle();

  if (existingUsage) {
    return { valid: false, error: 'Ваша компания уже использовала этот промокод' };
  }

  // Дополнительная проверка через память конфига
  if (source === 'config' && promo.usedBy?.includes(companyId)) {
    return { valid: false, error: 'Ваша компания уже использовала этот промокод' };
  }

  const { data: companyData, error: companyError } = await supabaseClient
    .from('companies')
    .select('is_company_owner')
    .eq('id', companyId)
    .single();

  if (companyError || companyData?.is_company_owner !== userId) {
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

  const validation = await validatePromoCode(supabaseClient, code, companyId, userId);

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const discountPercent = validation.discountPercent || 0;
    const planId = validation.planId;
    const codeUpper = code.toUpperCase();
    const promoData = validation.promoData;
    const isConfig = validation.source === 'config';

    const durationDays = isConfig ? promoData.durationDays : null;
    const durationMonths = isConfig ? promoData.durationMonths : null;

    const expiresAtISO = calculateExpiresAt({
      durationDays: durationDays || null,
      durationMonths: durationMonths || null
    });

    // ✅ ИСПРАВЛЕНО: добавлена запись plan_activated_at
    const nowISO = new Date().toISOString();

    const { error: updateError } = await supabaseClient
      .from('companies')
      .update({
        plan_tier: planId,
        plan_activated_at: nowISO,      // ✅ ДОБАВЛЕНО
        plan_expires_at: expiresAtISO,
        promo_code_used: codeUpper,
        promo_activated_at: nowISO,     // ✅ уже было
        promo_applied_at: nowISO,       // ✅ уже было
        promo_activated_by: userId,
        promo_discount_percent: discountPercent,
        updated_at: nowISO
      })
      .eq('id', companyId);

    if (updateError) throw updateError;

    if (isConfig) {
      const promoConfig = PROMO_CONFIG[codeUpper];
      if (promoConfig && !promoConfig.usedBy.includes(companyId)) {
        promoConfig.usedBy.push(companyId);
      }
    }

    try {
      await supabaseClient
        .from('company_promo_usage')
        .insert([{
          company_id: companyId,
          promo_code: codeUpper,
          activated_by: userId,
          activated_at: nowISO
        }]);
    } catch (err) {
      console.warn('⚠️ Не удалось записать usage:', err.message);
    }

    try {
      await supabaseClient.rpc('increment_promo_usage', { p_code: codeUpper });
    } catch {
      console.warn('⚠️ RPC increment_promo_usage не найден, используем fallback');

      try {
        const { data: currentPromo } = await supabaseClient
          .from('promo_codes')
          .select('used_count')
          .eq('code', codeUpper)
          .single();

        if (currentPromo) {
          await supabaseClient
            .from('promo_codes')
            .update({
              used_count: (currentPromo.used_count || 0) + 1,
              updated_at: nowISO
            })
            .eq('code', codeUpper);
        }
      } catch (err2) {
        console.warn('⚠️ Не удалось обновить счётчик:', err2.message);
      }
    }

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
          created_at: nowISO
        }]);
    } catch (err) {
      console.warn('⚠️ Не удалось записать аудит:', err.message);
    }

    const planNames = {
      basic: 'Базовый',
      micro: 'Микро',
      pro: 'Профессиональный',
      business: 'Бизнес',
      enterprise: 'Корпоративный'
    };

    const discountText = discountPercent === 100 ? 'БЕСПЛАТНО' : `со скидкой ${discountPercent}%`;

    return {
      success: true,
      planId: planId,
      discountPercent: discountPercent,
      expiresAt: expiresAtISO,
      message: `✅ Тариф "${planNames[planId] || planId}" активирован ${discountText} по промокоду ${codeUpper} до ${new Date(expiresAtISO).toLocaleDateString('ru-RU')}`
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
      .select('promo_code_used, promo_activated_at, promo_applied_at, promo_discount_percent, plan_tier')
      .eq('id', companyId)
      .single();

    if (error) throw error;

    return {
      hasPromo: !!data?.promo_code_used,
      promoCode: data?.promo_code_used,
      activatedAt: data?.promo_activated_at || data?.promo_applied_at,
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
  const usedCount = promo.usedBy?.length || 0;
  return promo.isActive && expiresAt > now && usedCount < promo.maxUses;
};

export const getActivePromoCodes = () => {
  return Object.entries(PROMO_CONFIG)
    .filter(([, config]) => config.isActive)
    .map(([code, config]) => ({
      code,
      ...config,
      usedCount: config.usedBy?.length || 0
    }));
};

export const getPromoStats = async (supabaseClient, code) => {
  const codeUpper = code.toUpperCase();
  const configPromo = PROMO_CONFIG[codeUpper];

  const { data: dbPromo } = await supabaseClient
    .from('promo_codes')
    .select('*')
    .eq('code', codeUpper)
    .maybeSingle();

  const { count: usageCount } = await supabaseClient
    .from('company_promo_usage')
    .select('*', { count: 'exact', head: true })
    .eq('promo_code', codeUpper);

  const { data: companies } = await supabaseClient
    .from('companies')
    .select('id, name, plan_tier, promo_activated_at, plan_expires_at')
    .eq('promo_code_used', codeUpper)
    .order('promo_activated_at', { ascending: false })
    .limit(50);

  return {
    code: codeUpper,
    config: configPromo,
    db: dbPromo,
    usageCount: usageCount || 0,
    companies: companies || [],
    remaining: configPromo
      ? Math.max(0, configPromo.maxUses - (usageCount || 0))
      : null
  };
};

export const deactivatePromoCode = async (supabaseClient, code) => {
  const codeUpper = code.toUpperCase();
  const { error } = await supabaseClient
    .from('promo_codes')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('code', codeUpper);

  if (error) {
    console.error('❌ Ошибка деактивации промокода:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const reactivatePromoCode = async (supabaseClient, code) => {
  const codeUpper = code.toUpperCase();
  const { error } = await supabaseClient
    .from('promo_codes')
    .update({
      is_active: true,
      updated_at: new Date().toISOString()
    })
    .eq('code', codeUpper);

  if (error) {
    console.error('❌ Ошибка реактивации промокода:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

export const createPromoCode = async (supabaseClient, promoData) => {
  const {
    code,
    planId,
    discountPercent,
    maxUses,
    expiresAt,
    description,
    createdBy
  } = promoData;

  if (!code || !planId || !expiresAt) {
    return { success: false, error: 'Не хватает обязательных полей' };
  }

  const { data, error } = await supabaseClient
    .from('promo_codes')
    .insert([{
      code: code.toUpperCase(),
      plan_id: planId,
      discount_percent: discountPercent || 0,
      max_uses: maxUses || 100,
      used_count: 0,
      expires_at: expiresAt,
      description: description || '',
      is_active: true,
      created_by: createdBy || null,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) {
    console.error('❌ Ошибка создания промокода:', error);
    return { success: false, error: error.message };
  }

  return { success: true, promo: data };
};

export default {
  PROMO_CONFIG,
  syncPromoCodesToDB,
  validatePromoCode,
  activatePromoPlan,
  getAllPromoCodesFromConfig,
  checkUserPromoCode,
  getPromoInfo,
  isPromoActive,
  getActivePromoCodes,
  getPromoStats,
  deactivatePromoCode,
  reactivatePromoCode,
  createPromoCode
};