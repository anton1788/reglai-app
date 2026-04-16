// src/utils/auditLogger.d.ts
import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// 🏷️ ТИПЫ ДАННЫХ
// ============================================================================

export type AuditActionType = 
  | 'application_created'
  | 'application_canceled'
  | 'status_changed'
  | 'application_received_full'
  | 'application_received_partial'
  | 'comment_added'
  | 'template_created'
  | 'template_used'
  | 'user_invited'
  | 'employee_blocked'
  | 'employee_unblocked'
  | 'balance_adjusted'
  | 'transfer_created';

export type AuditEntityType = 
  | 'application'
  | 'comment'
  | 'template'
  | 'user'
  | 'employee'
  | 'warehouse_item'
  | 'transfer';

export interface UserContext {
  companyId: string;
  userId: string;
  userEmail?: string;
  userRole?: string;
  userFullName?: string;
  userPhone?: string;
}

export interface LogOptions {
  actionType: AuditActionType;
  entityType: AuditEntityType;
  entityId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  userContext: UserContext;
  extraMetadata?: Record<string, any>;
  immediate?: boolean;
}

export interface AuditQueueStats {
  queued: number;
  online: boolean;
}

export interface AuditLoggerConfig {
  MAX_RETRY_ATTEMPTS: number;
  RETRY_DELAY_MS: number;
  BATCH_INTERVAL_MS: number;
  MAX_QUEUE_SIZE: number;
  STORAGE_KEY: string;
}

// ============================================================================
// 📝 ФУНКЦИИ
// ============================================================================

/**
 * Основная функция логирования аудита
 */
export function logAuditAction(
  supabase: SupabaseClient,
  options: LogOptions
): Promise<boolean>;

/**
 * Логирование создания заявки
 */
export function logApplicationCreated(
  supabase: SupabaseClient,
  application: Record<string, any>,
  userContext: UserContext
): Promise<boolean>;

/**
 * Логирование отмены заявки
 */
export function logApplicationCanceled(
  supabase: SupabaseClient,
  application: Record<string, any>,
  oldStatus: string,
  userContext: UserContext
): Promise<boolean>;

/**
 * Логирование изменения статуса
 */
export function logStatusChanged(
  supabase: SupabaseClient,
  application: Record<string, any>,
  oldStatus: string,
  newStatus: string,
  userContext: UserContext
): Promise<boolean>;

/**
 * Логирование получения материалов
 */
export function logMaterialsReceived(
  supabase: SupabaseClient,
  application: Record<string, any>,
  receivedCount: number,
  totalCount: number,
  userContext: UserContext
): Promise<boolean>;

/**
 * Логирование комментария
 */
export function logCommentAdded(
  supabase: SupabaseClient,
  applicationId: string,
  content: string,
  userContext: UserContext
): Promise<boolean>;

/**
 * Логирование создания шаблона
 */
export function logTemplateCreated(
  supabase: SupabaseClient,
  templateId: string,
  templateName: string,
  materials: Array<Record<string, any>>,
  userContext: UserContext
): Promise<boolean>;

/**
 * Логирование использования шаблона
 */
export function logTemplateUsed(
  supabase: SupabaseClient,
  templateName: string,
  materialsCount: number,
  userContext: UserContext
): Promise<boolean>;

/**
 * Логирование приглашения пользователя
 */
export function logUserInvited(
  supabase: SupabaseClient,
  email: string,
  role: string,
  invitedBy: string,
  userContext: UserContext
): Promise<boolean>;

/**
 * Логирование блокировки/разблокировки сотрудника
 */
export function logEmployeeBlocked(
  supabase: SupabaseClient,
  employeeId: string,
  isActive: boolean,
  userContext: UserContext
): Promise<boolean>;

/**
 * Логирование корректировки остатка на складе
 */
export function logBalanceAdjusted(
  supabase: SupabaseClient,
  itemName: string,
  oldBalance: number,
  newBalance: number,
  adjustment: number,
  userContext: UserContext
): Promise<boolean>;

/**
 * Логирование создания передачи
 */
export function logTransferCreated(
  supabase: SupabaseClient,
  transferId: string,
  itemName: string,
  quantity: number,
  recipientName: string,
  userContext: UserContext
): Promise<boolean>;

/**
 * Получение контекста пользователя для аудита
 * ✅ ИСПРАВЛЕНИЕ: обязательный параметр userCompanyId перемещён перед необязательными
 */
export function getUserContext(
  user: Record<string, any>,
  userCompanyId: string,  // ✅ Обязательный параметр первым
  profileData?: Record<string, any>,
  userRole?: string
): UserContext;

/**
 * Принудительно отправить все queued записи
 */
export function flushAuditQueue(supabase: SupabaseClient): Promise<number>;

/**
 * Получить статистику очереди
 */
export function getAuditQueueStats(): AuditQueueStats;

/**
 * Очистить очередь
 */
export function clearAuditQueue(): void;

/**
 * Валидация UUID
 */
export function isValidUUID(uuid: string): boolean;

/**
 * Санитизация строки
 */
export function sanitizeString(value: string | null | undefined, maxLength?: number): string;

/**
 * Подготовка JSON-поля
 */
export function prepareJsonField(value: any): Record<string, any> | null;

// ============================================================================
// 📦 КОНСТАНТЫ И ЭКСПОРТ
// ============================================================================

/**
 * Типы действий аудита
 */
export const AuditActionType: Record<string, AuditActionType>;

/**
 * Типы сущностей аудита
 */
export const AuditEntityType: Record<string, AuditEntityType>;

/**
 * Конфигурация аудит-логгера
 */
export const CONFIG: AuditLoggerConfig;

/**
 * ✅ ИСПРАВЛЕНИЕ: Экспорт по умолчанию через интерфейс
 */
declare const auditLogger: {
  logAuditAction: typeof logAuditAction;
  logApplicationCreated: typeof logApplicationCreated;
  logApplicationCanceled: typeof logApplicationCanceled;
  logStatusChanged: typeof logStatusChanged;
  logMaterialsReceived: typeof logMaterialsReceived;
  logCommentAdded: typeof logCommentAdded;
  logTemplateCreated: typeof logTemplateCreated;
  logTemplateUsed: typeof logTemplateUsed;
  logUserInvited: typeof logUserInvited;
  logEmployeeBlocked: typeof logEmployeeBlocked;
  logBalanceAdjusted: typeof logBalanceAdjusted;
  logTransferCreated: typeof logTransferCreated;
  getUserContext: typeof getUserContext;
  flushAuditQueue: typeof flushAuditQueue;
  getAuditQueueStats: typeof getAuditQueueStats;
  clearAuditQueue: typeof clearAuditQueue;
  isValidUUID: typeof isValidUUID;
  sanitizeString: typeof sanitizeString;
  prepareJsonField: typeof prepareJsonField;
  AuditActionType: typeof AuditActionType;
  AuditEntityType: typeof AuditEntityType;
  CONFIG: typeof CONFIG;
};

export default auditLogger;