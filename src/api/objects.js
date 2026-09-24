// src/api/objects.js
// ============================================================
// API-обёртка над таблицей public.objects
// Все операции с объектами идут через этот модуль
// ============================================================

import { supabase } from '../utils/supabaseClient';
import { OBJECT_STATUS } from '../utils/objectStatuses';

// ────────────────────────────────────────────────────────────
// Утилита нормализации имени (та же логика, что в SQL)
// ────────────────────────────────────────────────────────────
export const normalizeObjectName = (input) => {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .replace(/["'«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// ────────────────────────────────────────────────────────────
// Защита от мусорного company_id
// ────────────────────────────────────────────────────────────
const getCleanCompanyId = (companyId) => {
  if (!companyId) return null;
  if (typeof companyId === 'string') return companyId.trim();
  if (typeof companyId === 'object') {
    return companyId.id || companyId.company_id || null;
  }
  return null;
};

// ────────────────────────────────────────────────────────────
// LIST — список объектов компании
// ────────────────────────────────────────────────────────────
/**
 * @param {string} companyId
 * @param {object} options
 * @param {string} [options.status]      — фильтр по статусу
 * @param {string} [options.search]      — поиск по имени/адресу
 * @param {boolean} [options.onlyActive] — только status='active'
 * @param {number} [options.limit]       — по умолчанию 100
 * @returns {Promise<{data: Array, error: string|null}>}
 */
export const listObjects = async (companyId, options = {}) => {
  const cleanId = getCleanCompanyId(companyId);
  if (!cleanId) {
    return { data: [], error: 'Invalid company_id' };
  }

  try {
    let query = supabase
      .from('objects')
      .select('*')
      .eq('company_id', cleanId)
      .order('updated_at', { ascending: false });

    if (options.status) {
      query = query.eq('status', options.status);
    } else if (options.onlyActive) {
      query = query.eq('status', OBJECT_STATUS.ACTIVE);
    } else {
      // По умолчанию архивные не показываем
      query = query.neq('status', OBJECT_STATUS.ARCHIVED);
    }

    if (options.search && options.search.trim()) {
      const term = options.search.trim();
      query = query.or(`name.ilike.%${term}%,address.ilike.%${term}%,description.ilike.%${term}%`);
    }

    query = query.limit(options.limit || 100);

    const { data, error } = await query;
    if (error) throw error;

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[objects.list] error:', err);
    return { data: [], error: err.message };
  }
};

// ────────────────────────────────────────────────────────────
// GET — один объект по id
// ────────────────────────────────────────────────────────────
export const getObject = async (objectId) => {
  if (!objectId) return { data: null, error: 'Invalid object_id' };

  try {
    const { data, error } = await supabase
      .from('objects')
      .select('*')
      .eq('id', objectId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[objects.get] error:', err);
    return { data: null, error: err.message };
  }
};

// ────────────────────────────────────────────────────────────
// CREATE — создание объекта
// ────────────────────────────────────────────────────────────
/**
 * @param {object} payload
 * @param {string} payload.company_id   — обязательно
 * @param {string} payload.name         — обязательно
 * @param {string} [payload.address]
 * @param {string} [payload.description]
 * @param {string} [payload.client_id]      — company_users.id (role='client')
 * @param {string} [payload.foreman_user_id] — company_users.id (role='master'/'foreman')
 * @param {string} [payload.created_by]     — auth.users.id
 * @param {string} [payload.status]         — по умолчанию 'planning'
 * @param {string} [payload.start_date]
 * @param {string} [payload.planned_end_date]
 * @param {number} [payload.budget]
 * @param {string[]} [payload.tags]
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
export const createObject = async (payload) => {
  const cleanId = getCleanCompanyId(payload.company_id);
  if (!cleanId) {
    return { data: null, error: 'Invalid company_id' };
  }

  const name = (payload.name || '').trim();
  if (!name) {
    return { data: null, error: 'Название объекта обязательно' };
  }

  const normalized_name = normalizeObjectName(name);

  try {
    const insertPayload = {
      company_id: cleanId,
      name,
      normalized_name,
      address: payload.address?.trim() || null,
      description: payload.description?.trim() || null,
      client_id: payload.client_id || null,
      foreman_user_id: payload.foreman_user_id || null,
      created_by: payload.created_by || null,
      status: payload.status || OBJECT_STATUS.PLANNING,
      start_date: payload.start_date || null,
      planned_end_date: payload.planned_end_date || null,
      budget: payload.budget != null ? Number(payload.budget) : 0,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      notes: payload.notes?.trim() || null,
    };

    const { data, error } = await supabase
      .from('objects')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      // Проверка на дубль (unique constraint)
      if (error.code === '23505') {
        return {
          data: null,
          error: `Объект "${name}" уже существует в компании`,
        };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    console.error('[objects.create] error:', err);
    return { data: null, error: err.message };
  }
};

// ────────────────────────────────────────────────────────────
// UPDATE — обновление объекта
// ────────────────────────────────────────────────────────────
export const updateObject = async (objectId, patch) => {
  if (!objectId) return { data: null, error: 'Invalid object_id' };

  try {
    const updatePayload = { ...patch };

    // Если меняется имя — пересчитываем normalized_name
    if (updatePayload.name) {
      updatePayload.name = updatePayload.name.trim();
      updatePayload.normalized_name = normalizeObjectName(updatePayload.name);
    }

    // Убираем поля, которые нельзя обновлять напрямую
    delete updatePayload.id;
    delete updatePayload.company_id;
    delete updatePayload.created_at;
    delete updatePayload.total_applications;
    delete updatePayload.total_materials;
    delete updatePayload.received_materials;
    delete updatePayload.progress_percent;

    const { data, error } = await supabase
      .from('objects')
      .update(updatePayload)
      .eq('id', objectId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'Объект с таким названием уже существует' };
      }
      throw error;
    }

    return { data, error: null };
  } catch (err) {
    console.error('[objects.update] error:', err);
    return { data: null, error: err.message };
  }
};

// ────────────────────────────────────────────────────────────
// ARCHIVE — переместить в архив (soft delete)
// ────────────────────────────────────────────────────────────
export const archiveObject = async (objectId) => {
  if (!objectId) return { data: null, error: 'Invalid object_id' };

  try {
    const { data, error } = await supabase
      .from('objects')
      .update({
        status: OBJECT_STATUS.ARCHIVED,
        archived_at: new Date().toISOString(),
      })
      .eq('id', objectId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[objects.archive] error:', err);
    return { data: null, error: err.message };
  }
};

// ────────────────────────────────────────────────────────────
// RESTORE — вернуть из архива
// ────────────────────────────────────────────────────────────
export const restoreObject = async (objectId) => {
  if (!objectId) return { data: null, error: 'Invalid object_id' };

  try {
    const { data, error } = await supabase
      .from('objects')
      .update({
        status: OBJECT_STATUS.ACTIVE,
        archived_at: null,
      })
      .eq('id', objectId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[objects.restore] error:', err);
    return { data: null, error: err.message };
  }
};

// ────────────────────────────────────────────────────────────
// DELETE — полное удаление (осторожно!)
// ────────────────────────────────────────────────────────────
export const deleteObject = async (objectId) => {
  if (!objectId) return { success: false, error: 'Invalid object_id' };

  try {
    const { error } = await supabase
      .from('objects')
      .delete()
      .eq('id', objectId);

    if (error) throw error;
    return { success: true, error: null };
  } catch (err) {
    console.error('[objects.delete] error:', err);
    return { success: false, error: err.message };
  }
};

// ────────────────────────────────────────────────────────────
// FIND OR CREATE — для автокомплита в форме заявки
// ────────────────────────────────────────────────────────────
/**
 * Ищет объект по нормализованному имени. Если не найден — создаёт.
 * Используется в CreateApplicationForm, когда мастер пишет имя объекта.
 *
 * @returns {Promise<{data: object|null, error: string|null, created: boolean}>}
 */
export const findOrCreateObject = async (companyId, name, extras = {}) => {
  const cleanId = getCleanCompanyId(companyId);
  if (!cleanId) return { data: null, error: 'Invalid company_id', created: false };

  const trimmed = (name || '').trim();
  if (!trimmed) return { data: null, error: 'Пустое имя объекта', created: false };

  const normalized = normalizeObjectName(trimmed);

  try {
    // 1. Ищем существующий
    const { data: existing } = await supabase
      .from('objects')
      .select('*')
      .eq('company_id', cleanId)
      .eq('normalized_name', normalized)
      .maybeSingle();

    if (existing) {
      return { data: existing, error: null, created: false };
    }

    // 2. Не нашли — создаём
    const result = await createObject({
      company_id: cleanId,
      name: trimmed,
      ...extras,
    });

    if (result.error) {
      return { data: null, error: result.error, created: false };
    }

    return { data: result.data, error: null, created: true };
  } catch (err) {
    console.error('[objects.findOrCreate] error:', err);
    return { data: null, error: err.message, created: false };
  }
};

// ────────────────────────────────────────────────────────────
// STATS — агрегированная статистика по всем объектам компании
// ────────────────────────────────────────────────────────────
export const getObjectsStats = async (companyId) => {
  const cleanId = getCleanCompanyId(companyId);
  if (!cleanId) return { data: null, error: 'Invalid company_id' };

  try {
    const { data, error } = await supabase
      .from('objects')
      .select('status, progress_percent, total_applications, total_materials, received_materials')
      .eq('company_id', cleanId);

    if (error) throw error;

    const rows = data || [];
    const total = rows.length;
    const active = rows.filter(r => r.status === OBJECT_STATUS.ACTIVE).length;
    const completed = rows.filter(r => r.status === OBJECT_STATUS.COMPLETED).length;
    const planning = rows.filter(r => r.status === OBJECT_STATUS.PLANNING).length;
    const avgProgress = total > 0
      ? Math.round(rows.reduce((sum, r) => sum + (r.progress_percent || 0), 0) / total)
      : 0;

    return {
      data: {
        total,
        active,
        completed,
        planning,
        avgProgress,
        totalApplications: rows.reduce((s, r) => s + (r.total_applications || 0), 0),
        totalMaterials: rows.reduce((s, r) => s + (r.total_materials || 0), 0),
        receivedMaterials: rows.reduce((s, r) => s + (r.received_materials || 0), 0),
      },
      error: null,
    };
  } catch (err) {
    console.error('[objects.stats] error:', err);
    return { data: null, error: err.message };
  }
};

// ────────────────────────────────────────────────────────────
// APPLICATION COUNT — сколько заявок привязано к объекту
// ────────────────────────────────────────────────────────────
export const getObjectApplicationsCount = async (objectId) => {
  if (!objectId) return { count: 0, error: 'Invalid object_id' };

  try {
    const { count, error } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('object_id', objectId)
      .eq('is_deleted', false);

    if (error) throw error;
    return { count: count || 0, error: null };
  } catch (err) {
    console.error('[objects.applicationsCount] error:', err);
    return { count: 0, error: err.message };
  }
};

// ────────────────────────────────────────────────────────────
// EXPORT
// ────────────────────────────────────────────────────────────
export default {
  normalizeObjectName,
  listObjects,
  getObject,
  createObject,
  updateObject,
  archiveObject,
  restoreObject,
  deleteObject,
  findOrCreateObject,
  getObjectsStats,
  getObjectApplicationsCount,
};