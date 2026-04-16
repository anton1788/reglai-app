// src/utils/helpers.js

// === Утилита для получения читаемого названия роли ===
export const getRoleLabel = (role) => {
  const roles = {
    foreman: 'Мастер',
    supply_admin: 'Снабженец',
    manager: 'Руководитель',
    accountant: 'Бухгалтер',
    admin: 'Администратор',
    super_admin: 'Супер-админ'
  };
  return roles[role] || role;
};

// === 🔑 МАППИНГ ключей статусов для i18n ===
// Используйте эти ключи с функцией t() из приложения
export const STATUS_I18N_KEYS = {
  pending: 'statusPending',
  received: 'statusReceived',
  partial: 'statusPartial',
  canceled: 'statusCanceled',
  overdue: 'overdue',
  pending_employee_confirmation: 'statusPendingEmployeeConfirmation'
};

// === Валидация UUID ===
export const isValidUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return UUID_REGEX.test(uuid.trim());
};

// === Санитизация текста ===
export const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[<>]/g, '');
};

// === Форматирование даты ===
export const formatDate = (dateString, language = 'ru') => {
  try {
    const locale = language === 'ru' ? 'ru-RU' : 'en-US';
    return new Date(dateString).toLocaleString(locale, {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return dateString;
  }
};