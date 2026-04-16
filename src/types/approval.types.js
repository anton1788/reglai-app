// Типы статусов согласования
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
  EXPIRED: 'expired'
};

// Правила согласования по суммам
export const APPROVAL_RULES = {
  // Автоматическое согласование (без участия)
  auto_approve: {
    limit: 50000, // до 50k ₽
    require_comment: false
  },
  // Менеджер
  manager: {
    limit: 200000, // до 200k ₽
    require_comment: true,
    timeout_hours: 24,
    escalate_to: 'director'
  },
  // Директор
  director: {
    limit: null, // без лимита
    require_comment: true,
    timeout_hours: 48,
    escalate_to: null
  }
};

// Уровни согласования
export const APPROVAL_LEVELS = {
  LEVEL_1: 'manager',
  LEVEL_2: 'director',
  LEVEL_3: 'ceo'
};

// Действия
export const APPROVAL_ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
  REQUEST_CHANGES: 'request_changes',
  ESCALATE: 'escalate'
};