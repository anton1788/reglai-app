// src/utils/supportCenter.js
// ============================================================
// 🎧 УТИЛИТЫ КОЛ-ЦЕНТРА ПОДДЕРЖКИ
// ============================================================

import { supabase } from './supabaseClient';

// ============================================================
// СОЗДАНИЕ ТИКЕТА (клиент)
// ============================================================
export async function createSupportTicket({
  userId,
  userEmail,
  userName,
  userRole,
  companyId,
  subject,
  category = 'other',
  priority = 'normal',
  firstMessage,
  context = {},
}) {
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert([{
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      user_role: userRole,
      company_id: companyId,
      subject,
      category,
      priority,
      status: 'new',
      context,
    }])
    .select()
    .single();

  if (error) throw error;

  if (firstMessage?.trim()) {
    const { error: msgError } = await supabase
      .from('support_messages')
      .insert([{
        ticket_id: ticket.id,
        sender_id: userId,
        sender_role: 'client',
        sender_name: userName,
        content: firstMessage.trim(),
      }]);

    if (msgError) {
      console.warn('[supportCenter] Не удалось создать первое сообщение:', msgError.message);
    }
  }

  return ticket;
}

// ============================================================
// СПИСОК ТИКЕТОВ
// ============================================================
export async function fetchTickets({ userId, isAgent, status = 'all' }) {
  let query = supabase
    .from('support_tickets')
    .select('*')
    .order('updated_at', { ascending: false });

  if (!isAgent) {
    query = query.eq('user_id', userId);
  }
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ============================================================
// СООБЩЕНИЯ ТИКЕТА
// ============================================================
export async function fetchTicketMessages(ticketId) {
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function sendTicketMessage({
  ticketId,
  senderId,
  senderRole,
  senderName,
  content,
  isInternal = false,
}) {
  const { data, error } = await supabase
    .from('support_messages')
    .insert([{
      ticket_id: ticketId,
      sender_id: senderId,
      sender_role: senderRole,
      sender_name: senderName,
      content,
      is_internal: isInternal,
    }])
    .select()
    .single();

  if (error) throw error;

  // Первое сообщение агента — фиксируем first_response_at
  if (senderRole === 'agent' && !isInternal) {
    const { error: updError } = await supabase
      .from('support_tickets')
      .update({ first_response_at: new Date().toISOString() })
      .eq('id', ticketId)
      .is('first_response_at', null);

    if (updError) {
      console.warn('[supportCenter] Не удалось записать first_response_at:', updError.message);
    }
  }

  return data;
}

// ============================================================
// ВЗЯТЬ ТИКЕТ В РАБОТУ
// ============================================================
export async function assignTicketToMe(ticketId, agentUserId) {
  const { data: agent, error: agentErr } = await supabase
    .from('support_agents')
    .select('id, display_name')
    .eq('user_id', agentUserId)
    .single();

  if (agentErr || !agent) {
    throw new Error('Вы не являетесь оператором поддержки');
  }

  const { error } = await supabase
    .from('support_tickets')
    .update({
      assigned_agent_id: agentUserId,
      assigned_at: new Date().toISOString(),
      status: 'open',
    })
    .eq('id', ticketId);

  if (error) throw error;

  await supabase.from('support_messages').insert([{
    ticket_id: ticketId,
    sender_id: agentUserId,
    sender_role: 'system',
    sender_name: 'Система',
    content: `Тикет взят в работу оператором ${agent.display_name}`,
  }]);
}

// ============================================================
// СМЕНА СТАТУСА ТИКЕТА
// ============================================================
export async function updateTicketStatus(ticketId, status, extra = {}) {
  const updates = { status, ...extra };
  if (status === 'resolved') updates.resolved_at = new Date().toISOString();
  if (status === 'closed') updates.closed_at = new Date().toISOString();

  const { error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', ticketId);

  if (error) throw error;
}

// ============================================================
// HEARTBEAT: онлайн-статус оператора
// ============================================================
export async function updateAgentHeartbeat(agentId, isOnline) {
  const { error } = await supabase
    .from('support_agent_status')
    .upsert({
      agent_id: agentId,
      is_online: isOnline,
      last_seen_at: new Date().toISOString(),
    });

  if (error) console.warn('[heartbeat]', error.message);
}

// ============================================================
// СПИСОК ОНЛАЙН-ОПЕРАТОРОВ
// ============================================================
export async function getOnlineAgents() {
  const cutoff = new Date(Date.now() - 60_000).toISOString();

  const { data, error } = await supabase
    .from('support_agent_status')
    .select('agent_id, is_online, last_seen_at, current_tickets_count')
    .eq('is_online', true)
    .gte('last_seen_at', cutoff);

  if (error) {
    console.warn('[getOnlineAgents]', error.message);
    return [];
  }
  return data || [];
}

// ============================================================
// МЕТРИКИ ДЛЯ ДАШБОРДА ОПЕРАТОРА
// ============================================================
export async function getSupportMetrics(companyId = null) {
  let q = supabase.from('support_tickets').select('*');
  if (companyId) q = q.eq('company_id', companyId);

  const { data: all, error } = await q;
  if (error) {
    console.warn('[getSupportMetrics]', error.message);
    return null;
  }
  if (!all) return null;

  const now = Date.now();
  const dayAgo = now - 24 * 3600_000;

  const newToday = all.filter(t =>
    new Date(t.created_at).getTime() > dayAgo
  ).length;

  const open = all.filter(t =>
    ['new', 'open', 'pending'].includes(t.status)
  ).length;

  const resolved = all.filter(t => t.status === 'resolved').length;

  const resolvedWithTime = all.filter(t => t.first_response_at && t.created_at);
  const avgResponseMin = resolvedWithTime.length
    ? resolvedWithTime.reduce((sum, t) =>
        sum + (new Date(t.first_response_at) - new Date(t.created_at)) / 60000, 0
      ) / resolvedWithTime.length
    : 0;

  const csatScores = all.filter(t => t.csat_score).map(t => t.csat_score);
  const avgCsat = csatScores.length
    ? csatScores.reduce((a, b) => a + b, 0) / csatScores.length
    : 0;

  return {
    total: all.length,
    newToday,
    open,
    resolved,
    avgResponseMin: Math.round(avgResponseMin),
    avgCsat: Number(avgCsat.toFixed(1)),
  };
}