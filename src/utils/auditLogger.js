// src/utils/auditLogger.js

// === 🌍 Универсальная проверка режима разработки ===
// Работает в Vite, Webpack, CRA, Next.js, Node.js и браузере
const isDevelopment = () => {
  try {
    // 🔹 Vite
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      return true;
    }
    
    // 🔹 Webpack / CRA / Next.js / Node.js
    // eslint-disable-next-line no-undef
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      return true;
    }
    
    // 🔹 Глобальная переменная для кастомных сборок
    if (typeof window !== 'undefined') {
      if (window.__APP_ENV__ === 'development') return true;
      if (window.__DEV__ === true) return true;
    }
    
    // 🔹 Проверка по URL (для локальной разработки без сборщика)
    if (typeof location !== 'undefined' && location.hostname === 'localhost') {
      return true;
    }
    
  } catch (e) {
    console.warn('[isDevelopment] Error checking env:', e);
  }
  
  return false;
};

// === ✅ Допустимые значения action_type (должны совпадать с ENUM в БД) ===
export const VALID_ACTION_TYPES = [
  'created', 'updated', 'deleted', 'viewed', 'approved', 'rejected',
  'received', 'canceled', 'status_changed', 'application_created',
  'application_canceled', 'application_received_full', 'application_received_partial',
  'comment_added', 'template_created', 'template_used', 'user_invited',
  'user_blocked', 'employee_blocked', 'employee_unblocked', 'api_key_generated',
  'api_key_revoked', 'data_exported', 'feature_used', 'warehouse_income',
  'warehouse_expense', 'chat_message_sent', 'chat_message_edited', 'chat_message_deleted',
  // ✅ Тарифы:
  'plan_changed', 'plan_upgraded', 'plan_downgraded', 'quota_exceeded', 'billing_updated',
  // ✅ Fallback для неизвестных действий:
  'settings_changed'
];

// === Валидация UUID ===
export const isValidUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid.trim());
};

// === Валидация типа сущности ===
const VALID_ENTITY_TYPES = [
  'application', 'material', 'comment', 'user', 'company', 
  'chat_message', 'template', 'employee', 'export', 'feature'
];
export const isValidEntityType = (type) => VALID_ENTITY_TYPES.includes(type);

// === Подготовка JSON поля ===
const prepareJsonField = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    try {
      JSON.stringify(value); // Проверка на циклические ссылки
      return value;
    } catch (e) {
      console.warn('[AUDIT] Циклическая ссылка, упрощаем:', e);
      return { value: '[CIRCULAR REFERENCE]' };
    }
  }
  return { value: String(value) };
};

// === 🔄 Основная функция логирования (ОБЪЕДИНЁННАЯ) ===
export const logAuditAction = async (supabase, {
  actionType,
  entityType,
  entityId,
  oldValue = null,
  newValue,
  companyId,
  userId,
  userEmail,
  userRole,
  userFullName,
  userPhone = '',
  metadata = null
}) => {
  try {
    // 🔐 1. Проверка обязательных полей
    if (!userId || !companyId) {
      console.warn('⚠️ [AUDIT] Пропущены обязательные поля:', { userId, companyId });
      return false;
    }

    // 🔐 2. Валидация UUID
    if (!isValidUUID(userId) || !isValidUUID(companyId)) {
      console.warn('⚠️ [AUDIT] Неверный формат UUID:', { userId, companyId });
      return false;
    }

    // 🔐 3. Проверка существования компании (защита от 409/23503)
    if (companyId) {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .maybeSingle();
      
      if (companyError || !company) {
        console.warn('[AUDIT] Компания не найдена, пропуск лога:', {
          companyId,
          error: companyError
        });
        return false;
      }
    }

    // 🔐 4. Валидация entityType
    if (!isValidEntityType(entityType)) {
      console.warn('⚠️ [AUDIT] Неверный entityType:', entityType);
      return false;
    }

    // 🔐 4.1 Валидация actionType против ENUM
    if (!VALID_ACTION_TYPES.includes(actionType)) {
      console.warn('⚠️ [AUDIT] Неверный actionType, используем fallback:', actionType);
      actionType = 'settings_changed'; // ← Безопасное значение по умолчанию
    }

    // 🔐 5. entity_id: только UUID или null
    const safeEntityId = (entityId && isValidUUID(entityId)) ? String(entityId).trim() : null;

    // 🌐 IP и User-Agent
    const { data: { session } } = await supabase.auth.getSession();
    const ipAddress = session?.user?.app_metadata?.ip_address || null;
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

    const combinedMetadata = {
      ...(metadata || {}),
      ...(ipAddress && { ip_address: ipAddress }),
      ...(userAgent && { user_agent: userAgent })
    };

    // 📝 Подготовка записи
    const auditEntry = {
      user_id: String(userId).trim(),
      user_email: String(userEmail || '').trim(),
      user_role: String(userRole || 'foreman').trim(),
      user_full_name: String(userFullName || '').trim(),
      user_phone: String(userPhone || '').trim(),
      company_id: String(companyId).trim(),
      action_type: String(actionType).trim(),
      entity_type: String(entityType || '').trim(),
      entity_id: safeEntityId,
      old_value: prepareJsonField(oldValue),
      new_value: prepareJsonField(newValue),
      metadata: Object.keys(combinedMetadata).length > 0 ? combinedMetadata : null,
      created_at: new Date().toISOString()
    };

    // 📤 Вставка в Supabase
    const { error } = await supabase
      .from('audit_logs')
      .insert([auditEntry])
      .select('id');

    if (error) {
      // 🔁 Обработка конфликтов (дубликаты, нарушенные FK)
      if (error.code === '23503' || error.code === '23505' || error.status === 409) {
        console.warn('[AUDIT] Конфликт записи, пропускаем:', {
          code: error.code,
          companyId,
          entityType
        });
        return false;
      }
      console.error('❌ [AUDIT] Ошибка Supabase:', error);
      return false;
    }

    // 🧪 Отладка в режиме разработки (универсальная проверка)
    if (isDevelopment()) {
      console.log('[AUDIT DEBUG] Успешно записано:', {
        actionType,
        entityType,
        entityId: safeEntityId,
        companyId,
        timestamp: new Date().toISOString()
      });
    }

    return true;
  } catch (err) {
    console.error('❌ [AUDIT] Исключение:', err);
    // ❗ Не прерываем работу приложения при ошибке аудита
    return false;
  }
};

// === 🆕 Логирование использования функций ===
export const logFeatureUsed = async (supabase, featureName, userContext, additionalMeta = {}) => {
  return logAuditAction(supabase, {
    actionType: 'feature_used',
    entityType: 'feature',
    entityId: null,
    oldValue: null,
    newValue: { 
      feature_name: featureName, 
      used_at: new Date().toISOString(),
      ...additionalMeta
    },
    metadata: { feature_name: featureName },
    ...userContext
  });
};

// === 📦 Логирование доступа к складу ===
export const logWarehouseAccess = async (supabase, userContext, action = 'view') => {
  return logFeatureUsed(supabase, 'warehouse', userContext, {
    action_type: action,
    timestamp: new Date().toISOString()
  });
};

// === 💬 Логирование использования чата ===
export const logChatAccess = async (supabase, userContext, action = 'open') => {
  return logFeatureUsed(supabase, 'chat', userContext, {
    action_type: action,
    timestamp: new Date().toISOString()
  });
};

// === 📊 Логирование использования аналитики ===
export const logAnalyticsAccess = async (supabase, userContext, featureName = 'dashboard') => {
  return logFeatureUsed(supabase, 'analytics', userContext, {
    feature_name: featureName,
    accessed_at: new Date().toISOString()
  });
};

// === Логирование создания заявки ===
export const logApplicationCreated = async (supabase, application, userContext) => {
  return logAuditAction(supabase, {
    actionType: 'application_created',
    entityType: 'application',
    entityId: application.id,
    oldValue: null,
    newValue: {
      object_name: application.object_name,
      foreman_name: application.foreman_name,
      materials: application.materials?.map(m => ({
        description: m.description,
        quantity: m.quantity,
        unit: m.unit
      })),
      status: application.status
    },
    ...userContext
  });
};

// === Логирование отмены заявки ===
export const logApplicationCanceled = async (supabase, application, oldStatus, userContext) => {
  return logAuditAction(supabase, {
    actionType: 'application_canceled',
    entityType: 'application',
    entityId: application.id,
    oldValue: { status: oldStatus },
    newValue: { status: 'canceled', canceled_at: new Date().toISOString() },
    ...userContext
  });
};

// === Логирование изменения статуса ===
export const logStatusChanged = async (supabase, application, oldStatus, newStatus, userContext) => {
  return logAuditAction(supabase, {
    actionType: 'status_changed',
    entityType: 'application',
    entityId: application.id,
    oldValue: { status: oldStatus },
    newValue: { status: newStatus, changed_at: new Date().toISOString() },
    ...userContext
  });
};

// === Логирование получения материалов ===
export const logMaterialsReceived = async (supabase, application, receivedCount, totalCount, userContext) => {
  return logAuditAction(supabase, {
    actionType: receivedCount === totalCount ? 'application_received_full' : 'application_received_partial',
    entityType: 'application',
    entityId: application.id,
    oldValue: {
      status: application.status,
      materials: application.materials?.map(m => ({
        description: m.description,
        quantity: m.quantity,
        received: m.received
      }))
    },
    newValue: {
      status: application.status,
      received_count: receivedCount,
      total_count: totalCount,
      completed_at: receivedCount === totalCount ? new Date().toISOString() : null
    },
    ...userContext
  });
};

// === Логирование комментария ===
export const logCommentAdded = async (supabase, applicationId, content, userContext) => {
  return logAuditAction(supabase, {
    actionType: 'comment_added',
    entityType: 'comment',
    entityId: applicationId,
    oldValue: null,
    newValue: { 
      application_id: applicationId, 
      content_preview: content?.substring(0, 100),
      added_at: new Date().toISOString()
    },
    ...userContext
  });
};

// === Логирование шаблона ===
export const logTemplateCreated = async (supabase, templateId, templateName, materials, userContext) => {
  return logAuditAction(supabase, {
    actionType: 'template_created',
    entityType: 'template',
    entityId: templateId,
    oldValue: null,
    newValue: {
      template_name: templateName,
      materials_count: materials?.length || 0,
      created_at: new Date().toISOString()
    },
    ...userContext
  });
};

export const logTemplateUsed = async (supabase, templateName, materialsCount, userContext) => {
  return logAuditAction(supabase, {
    actionType: 'template_used',
    entityType: 'template',
    entityId: null,
    oldValue: null,
    newValue: {
      template_name: templateName,
      materials_count: materialsCount,
      used_at: new Date().toISOString()
    },
    ...userContext
  });
};

// === Логирование приглашения пользователя ===
export const logUserInvited = async (supabase, email, role, invitedBy, userContext) => {
  return logAuditAction(supabase, {
    actionType: 'user_invited',
    entityType: 'user',
    entityId: null,
    oldValue: null,
    newValue: {
      email: email,
      role: role,
      invited_by: invitedBy,
      invited_at: new Date().toISOString()
    },
    ...userContext
  });
};

// === Логирование блокировки сотрудника ===
export const logEmployeeBlocked = async (supabase, employeeId, isActive, userContext) => {
  return logAuditAction(supabase, {
    actionType: isActive ? 'employee_unblocked' : 'employee_blocked',
    entityType: 'employee',
    entityId: employeeId,
    oldValue: { is_active: !isActive },
    newValue: { is_active: isActive, changed_at: new Date().toISOString() },
    ...userContext
  });
};

// === Логирование экспорта данных ===
export const logDataExport = async (supabase, format, section, userContext) => {
  return logAuditAction(supabase, {
    actionType: 'data_exported',
    entityType: 'export',
    entityId: null,
    oldValue: null,
    newValue: {
      format: format,
      section: section,
      exported_at: new Date().toISOString()
    },
    ...userContext
  });
};

// === Получение контекста пользователя ===
export const getUserContext = (user, profileData, userRole, userCompanyId) => ({
  companyId: userCompanyId,
  userId: user?.id,
  userEmail: user?.email,
  userRole: userRole || 'foreman',
  userFullName: profileData?.fullName || '',
  userPhone: profileData?.phone || ''
});

// === Хелпер: дебаунс логирования ===
const lastLogged = {};
export const shouldLogFeature = (featureName, userCompanyId, lastLoggedRef = lastLogged) => {
  const key = `${featureName}_${userCompanyId}`;
  const now = Date.now();
  const lastTime = lastLoggedRef[key] || 0;
  const MIN_INTERVAL = 300000; // 5 минут
  
  if (now - lastTime >= MIN_INTERVAL) {
    lastLoggedRef[key] = now;
    return true;
  }
  return false;
};

// === Экспорт всех функций ===
export default {
  logAuditAction,
  logFeatureUsed,
  logWarehouseAccess,
  logChatAccess,
  logAnalyticsAccess,
  logApplicationCreated,
  logApplicationCanceled,
  logStatusChanged,
  logMaterialsReceived,
  logCommentAdded,
  logTemplateCreated,
  logTemplateUsed,
  logUserInvited,
  logEmployeeBlocked,
  logDataExport,
  getUserContext,
  isValidUUID,
  isValidEntityType,
  shouldLogFeature,
  VALID_ACTION_TYPES, // ← Экспортируем массив для внешних проверок
  isDevelopment      // ← Экспортируем для внешних проверок
};