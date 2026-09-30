// src/api/suppliers.js
// ============================================================
// API МОДУЛЯ B2B-ПОСТАВЩИКОВ
// Reglai — управление строительными материалами
// ============================================================

import { supabase, getSafeCompanyId } from '../utils/supabaseClient';

// ============================================================
// 📋 КОНСТАНТЫ И ENUM-ЗНАЧЕНИЯ (из CHECK-констрейнтов БД)
// ============================================================

export const SUPPLIER_STATUSES = ['active', 'pending', 'blocked', 'archived'];
export const RFQ_STATUSES = ['draft', 'sent', 'collecting', 'analyzing', 'completed', 'canceled'];
export const INVITATION_STATUSES = ['pending', 'viewed', 'responded', 'declined'];
export const OFFER_STATUSES = ['active', 'selected', 'rejected', 'expired'];
export const ORDER_STATUSES = ['created', 'confirmed', 'paid', 'shipped', 'delivered', 'received', 'canceled'];
export const PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'];

const CHUNK_SIZE = 500;
const DEFAULT_OFFER_VALID_DAYS = 14;

// ============================================================
// 🛠️ ВАЛИДАЦИЯ И НОРМАЛИЗАЦИЯ
// ============================================================

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUuid = (value) =>
  typeof value === 'string' && UUID_RE.test(value.trim());

const assertUuid = (value, fieldName) => {
  const safe = getSafeCompanyId(value) || (typeof value === 'string' ? value.trim() : null);
  if (!safe || !isValidUuid(safe)) {
    throw new Error(`${fieldName}: невалидный UUID — получено "${value}"`);
  }
  return safe;
};

const assertNonEmpty = (value, fieldName) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName}: обязательное поле не заполнено`);
  }
  return value.trim();
};

const assertOneOf = (value, allowed, fieldName) => {
  if (!allowed.includes(value)) {
    throw new Error(
      `${fieldName}: недопустимое значение "${value}". Разрешено: ${allowed.join(', ')}`
    );
  }
  return value;
};

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : null;

const normalizeName = (name) =>
  typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';

const normalizeNameKey = (name) =>
  normalizeName(name).toLowerCase();

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const toNumberOr = (value, fallback = 0) => {
  const n = toNumberOrNull(value);
  return n === null ? fallback : n;
};

const unwrap = ({ data, error }, context = '') => {
  if (error) {
    const msg = error.message || error.details || 'Неизвестная ошибка Supabase';
    throw new Error(`${context ? context + ': ' : ''}${msg}`);
  }
  return data;
};

const chunk = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};

// ============================================================
// 🏢 SUPPLIERS — Поставщики
// ============================================================

/**
 * Список поставщиков компании с фильтрами.
 * @param {string} companyId
 * @param {{status?: string, category?: string, search?: string, limit?: number, offset?: number}} [filters]
 */
export async function getSuppliers(companyId, filters = {}) {
  const safeCompanyId = assertUuid(companyId, 'companyId');
  const { status, category, search, limit, offset } = filters;

  let query = supabase
    .from('suppliers')
    .select('*', { count: 'exact' })
    .eq('company_id', safeCompanyId)
    .order('created_at', { ascending: false });

  if (status) {
    assertOneOf(status, SUPPLIER_STATUSES, 'status');
    query = query.eq('status', status);
  }

  if (category) {
    query = query.contains('categories', [category]);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `name.ilike.${term},inn.ilike.${term},email.ilike.${term},contact_person.ilike.${term},phone.ilike.${term}`
    );
  }

  if (Number.isInteger(limit) && limit > 0) {
    query = query.limit(limit);
  }
  if (Number.isInteger(offset) && offset > 0) {
    query = query.range(offset, offset + (limit || 50) - 1);
  }

  return unwrap(await query, 'getSuppliers');
}

/**
 * Получить поставщика по ID.
 */
export async function getSupplierById(supplierId) {
  const safeId = assertUuid(supplierId, 'supplierId');
  const data = unwrap(
    await supabase.from('suppliers').select('*').eq('id', safeId).maybeSingle(),
    'getSupplierById'
  );
  return data;
}

/**
 * Создать поставщика.
 */
export async function createSupplier(supplier) {
  if (!supplier || typeof supplier !== 'object') {
    throw new Error('createSupplier: объект поставщика обязателен');
  }

  const name = assertNonEmpty(supplier.name, 'name');
  const company_id = assertUuid(supplier.company_id, 'company_id');

  if (supplier.status) assertOneOf(supplier.status, SUPPLIER_STATUSES, 'status');

  const payload = {
    company_id,
    name,
    inn: supplier.inn?.trim() || null,
    kpp: supplier.kpp?.trim() || null,
    ogrn: supplier.ogrn?.trim() || null,
    address: supplier.address?.trim() || null,
    phone: supplier.phone?.trim() || null,
    email: normalizeEmail(supplier.email),
    contact_person: supplier.contact_person?.trim() || null,
    website: supplier.website?.trim() || null,
    description: supplier.description?.trim() || null,
    logo_url: supplier.logo_url || null,
    status: supplier.status || 'active',
    is_verified: Boolean(supplier.is_verified),
    payment_terms: supplier.payment_terms?.trim() || null,
    delivery_terms: supplier.delivery_terms?.trim() || null,
    min_order_amount: toNumberOr(supplier.min_order_amount, 0),
    delivery_days: Number.isInteger(supplier.delivery_days) ? supplier.delivery_days : 3,
    categories: Array.isArray(supplier.categories) ? supplier.categories.filter(Boolean) : null,
    regions: Array.isArray(supplier.regions) ? supplier.regions.filter(Boolean) : null,
    user_id: supplier.user_id || null,
  };

  const data = unwrap(
    await supabase.from('suppliers').insert(payload).select().single(),
    'createSupplier'
  );
  return data;
}

/**
 * Обновить поставщика.
 */
export async function updateSupplier(supplierId, updates) {
  const safeId = assertUuid(supplierId, 'supplierId');
  if (!updates || typeof updates !== 'object') {
    throw new Error('updateSupplier: объект изменений обязателен');
  }

  if (updates.status) assertOneOf(updates.status, SUPPLIER_STATUSES, 'status');

  const payload = { ...updates };
  // Запрещённые к изменению поля (их ставит триггер / БД)
  delete payload.id;
  delete payload.created_at;
  delete payload.updated_at;
  delete payload.company_id;

  if (payload.email !== undefined) payload.email = normalizeEmail(payload.email);
  if (payload.name !== undefined) payload.name = assertNonEmpty(payload.name, 'name');
  if (payload.min_order_amount !== undefined) {
    payload.min_order_amount = toNumberOr(payload.min_order_amount, 0);
  }

  const data = unwrap(
    await supabase.from('suppliers').update(payload).eq('id', safeId).select().single(),
    'updateSupplier'
  );
  return data;
}

/**
 * Soft-delete: пометить как 'archived'.
 */
export async function archiveSupplier(supplierId) {
  return updateSupplier(supplierId, { status: 'archived' });
}

/**
 * Жёсткое удаление (CASCADE снесёт прайсы, RFQ-приглашения, офферы).
 */
export async function deleteSupplier(supplierId) {
  const safeId = assertUuid(supplierId, 'supplierId');
  unwrap(
    await supabase.from('suppliers').delete().eq('id', safeId),
    'deleteSupplier'
  );
  return { id: safeId, deleted: true };
}

// ============================================================
// 💰 PRICE LISTS — Прайс-листы
// ============================================================

/**
 * Список прайс-листов поставщика.
 */
export async function getPriceLists(supplierId) {
  const safeId = assertUuid(supplierId, 'supplierId');
  return unwrap(
    await supabase
      .from('price_lists')
      .select('*')
      .eq('supplier_id', safeId)
      .order('created_at', { ascending: false }),
    'getPriceLists'
  );
}

/**
 * Позиции прайса с фильтрами.
 */
export async function getPriceListItems(supplierId, filters = {}) {
  const safeId = assertUuid(supplierId, 'supplierId');
  const { category, search, availableOnly, priceListId, limit, offset } = filters;

  let query = supabase
    .from('price_list_items')
    .select('*', { count: 'exact' })
    .eq('supplier_id', safeId)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (priceListId) query = query.eq('price_list_id', assertUuid(priceListId, 'priceListId'));
  if (category) query = query.eq('category', category);
  if (availableOnly) query = query.eq('is_available', true);

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`name.ilike.${term},article.ilike.${term},brand.ilike.${term},normalized_name.ilike.${term}`);
  }

  if (Number.isInteger(limit) && limit > 0) query = query.limit(limit);
  if (Number.isInteger(offset) && offset > 0) {
    query = query.range(offset, offset + (limit || 100) - 1);
  }

  return unwrap(await query, 'getPriceListItems');
}

const buildPriceItemPayload = (item) => {
  if (!item || typeof item !== 'object') throw new Error('Позиция прайса: объект обязателен');

  const name = assertNonEmpty(item.name, 'name');
  const supplier_id = assertUuid(item.supplier_id, 'supplier_id');
  const price = toNumberOrNull(item.price);
  if (price === null || price < 0) throw new Error('price: должно быть неотрицательное число');

  return {
    supplier_id,
    price_list_id: item.price_list_id || null,
    name,
    normalized_name: item.normalized_name || normalizeNameKey(name),
    article: item.article?.toString().trim() || null,
    description: item.description?.trim() || null,
    unit: item.unit?.trim() || 'шт',
    price,
    min_quantity: toNumberOr(item.min_quantity, 1),
    max_quantity: toNumberOrNull(item.max_quantity),
    discount_percent: toNumberOr(item.discount_percent, 0),
    discount_from_quantity: toNumberOrNull(item.discount_from_quantity),
    brand: item.brand?.trim() || null,
    category: item.category?.trim() || null,
    subcategory: item.subcategory?.trim() || null,
    specs: item.specs || null,
    stock_quantity: toNumberOrNull(item.stock_quantity),
    stock_unit: item.stock_unit?.trim() || null,
    warehouse_location: item.warehouse_location?.trim() || null,
    is_available: item.is_available !== undefined ? Boolean(item.is_available) : true,
  };
};

export async function createPriceListItem(item) {
  const payload = buildPriceItemPayload(item);
  return unwrap(
    await supabase.from('price_list_items').insert(payload).select().single(),
    'createPriceListItem'
  );
}

export async function updatePriceListItem(itemId, updates) {
  const safeId = assertUuid(itemId, 'itemId');
  if (!updates || typeof updates !== 'object') {
    throw new Error('updatePriceListItem: объект изменений обязателен');
  }

  const payload = { ...updates };
  delete payload.id;
  delete payload.created_at;
  delete payload.supplier_id;

  if (payload.name !== undefined) {
    payload.name = assertNonEmpty(payload.name, 'name');
    payload.normalized_name = payload.normalized_name || normalizeNameKey(payload.name);
  }
  if (payload.price !== undefined) {
    const p = toNumberOrNull(payload.price);
    if (p === null || p < 0) throw new Error('price: должно быть неотрицательное число');
    payload.price = p;
  }
  if (payload.last_updated === undefined) {
    payload.last_updated = new Date().toISOString();
  }

  return unwrap(
    await supabase.from('price_list_items').update(payload).eq('id', safeId).select().single(),
    'updatePriceListItem'
  );
}

export async function deletePriceListItem(itemId) {
  const safeId = assertUuid(itemId, 'itemId');
  unwrap(await supabase.from('price_list_items').delete().eq('id', safeId), 'deletePriceListItem');
  return { id: safeId, deleted: true };
}

/**
 * Массовый импорт позиций прайса через upsert по (supplier_id, article).
 * Требует UNIQUE индекс uq_price_items_supplier_article.
 * Позиции без article идут обычным insert (upsert требует непустой конфликтный ключ).
 */
export async function bulkUpsertPriceItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { inserted: 0, chunks: 0 };
  }

  const prepared = items.map(buildPriceItemPayload);
  const withArticle = prepared.filter((it) => it.article !== null);
  const withoutArticle = prepared.filter((it) => it.article === null);

  let inserted = 0;
  let chunksCount = 0;

  if (withArticle.length > 0) {
    for (const batch of chunk(withArticle, CHUNK_SIZE)) {
      const data = unwrap(
        await supabase
          .from('price_list_items')
          .upsert(batch, { onConflict: 'supplier_id,article' })
          .select('id'),
        'bulkUpsertPriceItems (upsert)'
      );
      inserted += data?.length || batch.length;
      chunksCount += 1;
    }
  }

  if (withoutArticle.length > 0) {
    for (const batch of chunk(withoutArticle, CHUNK_SIZE)) {
      const data = unwrap(
        await supabase.from('price_list_items').insert(batch).select('id'),
        'bulkUpsertPriceItems (insert)'
      );
      inserted += data?.length || batch.length;
      chunksCount += 1;
    }
  }

  return { inserted, chunks: chunksCount };
}

/**
 * Сквозной поиск по прайсам всех поставщиков через RPC.
 * ⚠️ Проверьте имена параметров RPC в вашей БД и при необходимости поправьте.
 */
export async function searchMaterialsAcrossSuppliers(companyId, searchTerm, options = {}) {
  const safeCompanyId = assertUuid(companyId, 'companyId');
  const term = (searchTerm || '').trim();
  if (!term) throw new Error('searchMaterialsAcrossSuppliers: поисковый запрос пуст');

  const { category, limit = 100, availableOnly = false } = options;

  const { data, error } = await supabase.rpc('search_materials_across_suppliers', {
    p_company_id: safeCompanyId,
    p_search_term: term,
    p_category: category || null,
    p_limit: Number.isInteger(limit) ? limit : 100,
    p_available_only: Boolean(availableOnly),
  });

  if (error) {
    throw new Error(`searchMaterialsAcrossSuppliers: ${error.message || 'RPC failed'}`);
  }
  return data || [];
}

// ============================================================
// 📨 RFQ — Запросы цен
// ============================================================

const buildRfqPayload = (rfq) => {
  if (!rfq || typeof rfq !== 'object') throw new Error('RFQ: объект обязателен');

  const title = assertNonEmpty(rfq.title, 'title');
  const company_id = assertUuid(rfq.company_id, 'company_id');
  const items = Array.isArray(rfq.items) ? rfq.items : [];
  if (items.length === 0) throw new Error('RFQ: items должен быть непустым массивом');

  return {
    company_id,
    application_id: rfq.application_id || null,
    created_by: rfq.created_by || null,
    title,
    description: rfq.description?.trim() || null,
    items,
    delivery_address: rfq.delivery_address?.trim() || null,
    required_date: rfq.required_date || null,
    payment_terms: rfq.payment_terms?.trim() || null,
    status: rfq.status || 'draft',
    deadline: rfq.deadline || null,
  };
};

export async function createRFQ(rfq) {
  const payload = buildRfqPayload({ ...rfq, status: 'draft' });
  return unwrap(
    await supabase.from('rfq_requests').insert(payload).select().single(),
    'createRFQ'
  );
}

/**
 * Список RFQ компании с подсчётом приглашений и предложений.
 */
export async function getRFQList(companyId, filters = {}) {
  const safeCompanyId = assertUuid(companyId, 'companyId');
  const { status, search, limit, offset } = filters;

  let query = supabase
    .from('rfq_requests')
    .select(
      `*,
       rfq_invitations!rfq_invitations_rfq_id_fkey (id, status),
       supplier_offers!supplier_offers_rfq_id_fkey (id, total, status)`,
      { count: 'exact' }
    )
    .eq('company_id', safeCompanyId)
    .order('created_at', { ascending: false });

  if (status) {
    assertOneOf(status, RFQ_STATUSES, 'status');
    query = query.eq('status', status);
  }
  if (search && search.trim()) {
    query = query.ilike('title', `%${search.trim()}%`);
  }
  if (Number.isInteger(limit) && limit > 0) query = query.limit(limit);
  if (Number.isInteger(offset) && offset > 0) {
    query = query.range(offset, offset + (limit || 50) - 1);
  }

  const data = unwrap(await query, 'getRFQList');
  return (data || []).map((rfq) => ({
    ...rfq,
    invitations_count: rfq.rfq_invitations?.length || 0,
    offers_count: rfq.supplier_offers?.length || 0,
    best_offer_total: rfq.supplier_offers?.length
      ? Math.min(...rfq.supplier_offers.map((o) => Number(o.total) || Infinity))
      : null,
  }));
}

export async function getRFQById(rfqId) {
  const safeId = assertUuid(rfqId, 'rfqId');
  return unwrap(
    await supabase.from('rfq_requests').select('*').eq('id', safeId).maybeSingle(),
    'getRFQById'
  );
}

/**
 * Отправить RFQ выбранным поставщикам: создать приглашения + статус 'sent'.
 */
export async function sendRFQToSuppliers(rfqId, supplierIds) {
  const safeRfqId = assertUuid(rfqId, 'rfqId');
  if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
    throw new Error('sendRFQToSuppliers: supplierIds должен быть непустым массивом');
  }

  const uniqueIds = Array.from(new Set(supplierIds.map((id) => assertUuid(id, 'supplierId'))));

  // Проверяем RFQ
  const rfq = await getRFQById(safeRfqId);
  if (!rfq) throw new Error('sendRFQToSuppliers: RFQ не найден');
  if (['completed', 'canceled'].includes(rfq.status)) {
    throw new Error(`sendRFQToSuppliers: нельзя отправить RFQ в статусе "${rfq.status}"`);
  }

  // Проверяем, какие приглашения уже существуют
  const existing = unwrap(
    await supabase
      .from('rfq_invitations')
      .select('supplier_id')
      .eq('rfq_id', safeRfqId),
    'sendRFQToSuppliers:check'
  ) || [];
  const existingSet = new Set(existing.map((r) => r.supplier_id));

  const toInsert = uniqueIds
    .filter((id) => !existingSet.has(id))
    .map((supplier_id) => ({
      rfq_id: safeRfqId,
      supplier_id,
      status: 'pending',
    }));

  let invitations = [];
  if (toInsert.length > 0) {
    invitations = unwrap(
      await supabase.from('rfq_invitations').insert(toInsert).select(),
      'sendRFQToSuppliers:insert'
    );
  }

  // Обновляем статус RFQ
  unwrap(
    await supabase.from('rfq_requests').update({ status: 'sent' }).eq('id', safeRfqId),
    'sendRFQToSuppliers:updateStatus'
  );

  return {
    rfq_id: safeRfqId,
    created: invitations?.length || 0,
    skipped: uniqueIds.length - (invitations?.length || 0),
    invitations: invitations || [],
  };
}

/**
 * Приглашения по RFQ с JOIN на поставщиков.
 */
export async function getRFQInvitations(rfqId) {
  const safeId = assertUuid(rfqId, 'rfqId');
  return unwrap(
    await supabase
      .from('rfq_invitations')
      .select(
        `*,
         suppliers!rfq_invitations_supplier_id_fkey (id, name, email, phone, contact_person, rating, status)`
      )
      .eq('rfq_id', safeId)
      .order('invited_at', { ascending: true }),
    'getRFQInvitations'
  );
}

export async function updateRFQStatus(rfqId, status) {
  const safeId = assertUuid(rfqId, 'rfqId');
  assertOneOf(status, RFQ_STATUSES, 'status');
  return unwrap(
    await supabase.from('rfq_requests').update({ status }).eq('id', safeId).select().single(),
    'updateRFQStatus'
  );
}

// ============================================================
// 🎁 OFFERS — Предложения поставщиков
// ============================================================

const buildOfferPayload = (offer) => {
  if (!offer || typeof offer !== 'object') throw new Error('Offer: объект обязателен');

  const rfq_id = assertUuid(offer.rfq_id, 'rfq_id');
  const supplier_id = assertUuid(offer.supplier_id, 'supplier_id');
  const items = Array.isArray(offer.items) ? offer.items : [];
  if (items.length === 0) throw new Error('Offer: items должен быть непустым массивом');

  return {
    rfq_id,
    supplier_id,
    supplier_user_id: offer.supplier_user_id || null,
    items,
    subtotal: toNumberOr(offer.subtotal, 0),
    discount: toNumberOr(offer.discount, 0),
    delivery_cost: toNumberOr(offer.delivery_cost, 0),
    vat: toNumberOr(offer.vat, 0),
    total: toNumberOr(offer.total, 0),
    delivery_days: Number.isInteger(offer.delivery_days) ? offer.delivery_days : null,
    payment_terms: offer.payment_terms?.trim() || null,
    valid_until:
      offer.valid_until ||
      new Date(Date.now() + DEFAULT_OFFER_VALID_DAYS * 86400_000).toISOString(),
    comment: offer.comment?.trim() || null,
    file_url: offer.file_url || null,
    status: 'active',
  };
};

/**
 * Отправить предложение от поставщика. Обновляет статус приглашения на 'responded'.
 */
export async function submitOffer(offer) {
  const payload = buildOfferPayload(offer);

  const created = unwrap(
    await supabase.from('supplier_offers').insert(payload).select().single(),
    'submitOffer'
  );

  // Обновляем приглашение
  const invitations = unwrap(
    await supabase
      .from('rfq_invitations')
      .select('id')
      .eq('rfq_id', payload.rfq_id)
      .eq('supplier_id', payload.supplier_id),
    'submitOffer:invitations'
  ) || [];

  if (invitations.length > 0) {
    await supabase
      .from('rfq_invitations')
      .update({ status: 'responded', responded_at: new Date().toISOString() })
      .eq('id', invitations[0].id);
  }

  // Если RFQ в статусе 'sent' — переводим в 'collecting'
  const rfq = await getRFQById(payload.rfq_id);
  if (rfq && rfq.status === 'sent') {
    await supabase.from('rfq_requests').update({ status: 'collecting' }).eq('id', payload.rfq_id);
  }

  return created;
}

/**
 * Все предложения по RFQ с JOIN на поставщиков, сортировка по total ASC.
 */
export async function getOffersForRFQ(rfqId) {
  const safeId = assertUuid(rfqId, 'rfqId');
  return unwrap(
    await supabase
      .from('supplier_offers')
      .select(
        `*,
         suppliers!supplier_offers_supplier_id_fkey (id, name, email, phone, contact_person, rating, delivery_days, payment_terms)`
      )
      .eq('rfq_id', safeId)
      .order('total', { ascending: true, nullsFirst: false }),
    'getOffersForRFQ'
  );
}

export async function getOfferById(offerId) {
  const safeId = assertUuid(offerId, 'offerId');
  return unwrap(
    await supabase
      .from('supplier_offers')
      .select(`*, suppliers!supplier_offers_supplier_id_fkey (id, name, email, contact_person)`)
      .eq('id', safeId)
      .maybeSingle(),
    'getOfferById'
  );
}

/**
 * Выбрать предложение-победителя: остальные → 'rejected', RFQ → 'completed'.
 */
export async function selectOffer(rfqId, offerId) {
  const safeRfqId = assertUuid(rfqId, 'rfqId');
  const safeOfferId = assertUuid(offerId, 'offerId');

  const offer = unwrap(
    await supabase.from('supplier_offers').select('*').eq('id', safeOfferId).maybeSingle(),
    'selectOffer:fetch'
  );
  if (!offer) throw new Error('selectOffer: предложение не найдено');
  if (offer.rfq_id !== safeRfqId) {
    throw new Error('selectOffer: предложение не относится к указанному RFQ');
  }

  // 1. Выбранное → 'selected'
  unwrap(
    await supabase
      .from('supplier_offers')
      .update({ status: 'selected' })
      .eq('id', safeOfferId),
    'selectOffer:selected'
  );

  // 2. Остальные активные → 'rejected'
  unwrap(
    await supabase
      .from('supplier_offers')
      .update({ status: 'rejected' })
      .eq('rfq_id', safeRfqId)
      .eq('status', 'active')
      .neq('id', safeOfferId),
    'selectOffer:rejected'
  );

  // 3. RFQ → 'completed'
  unwrap(
    await supabase
      .from('rfq_requests')
      .update({ status: 'completed' })
      .eq('id', safeRfqId),
    'selectOffer:rfqCompleted'
  );

  return { rfq_id: safeRfqId, offer_id: safeOfferId, status: 'selected' };
}

export async function rejectOffer(offerId) {
  const safeId = assertUuid(offerId, 'offerId');
  return unwrap(
    await supabase
      .from('supplier_offers')
      .update({ status: 'rejected' })
      .eq('id', safeId)
      .select()
      .single(),
    'rejectOffer'
  );
}

// ============================================================
// 📦 PURCHASE ORDERS — Заказы поставщикам
// ============================================================

const buildOrderPayload = (order) => {
  if (!order || typeof order !== 'object') throw new Error('Order: объект обязателен');

  const company_id = assertUuid(order.company_id, 'company_id');
  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length === 0) throw new Error('Order: items должен быть непустым массивом');

  if (order.status) assertOneOf(order.status, ORDER_STATUSES, 'status');
  if (order.payment_status) assertOneOf(order.payment_status, PAYMENT_STATUSES, 'payment_status');

  return {
    company_id,
    supplier_id: order.supplier_id || null,
    offer_id: order.offer_id || null,
    rfq_id: order.rfq_id || null,
    application_id: order.application_id || null,
    // order_number НЕ передаём — его ставит триггер trg_order_number
    items,
    total: toNumberOr(order.total, 0),
    status: order.status || 'created',
    payment_status: order.payment_status || 'unpaid',
    expected_delivery: order.expected_delivery || null,
    delivery_address: order.delivery_address?.trim() || null,
    tracking_number: order.tracking_number?.trim() || null,
    created_by: order.created_by || null,
  };
};

export async function createPurchaseOrder(order) {
  const payload = buildOrderPayload(order);
  return unwrap(
    await supabase.from('purchase_orders').insert(payload).select().single(),
    'createPurchaseOrder'
  );
}

export async function getPurchaseOrders(companyId, filters = {}) {
  const { status, supplierId, search, limit, offset, forSupplier = false } = filters;

  let query = supabase
    .from('purchase_orders')
    .select(
      `*,
       suppliers!purchase_orders_supplier_id_fkey (id, name, email, phone, contact_person)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  // 🆕 Закупщик — фильтр по своей компании
  if (!forSupplier && companyId) {
    query = query.eq('company_id', assertUuid(companyId, 'companyId'));
  }
  // 🆕 Поставщик — фильтр по supplier_id
  if (supplierId) {
    query = query.eq('supplier_id', assertUuid(supplierId, 'supplierId'));
  }

  if (status) {
    assertOneOf(status, ORDER_STATUSES, 'status');
    query = query.eq('status', status);
  }
  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`order_number.ilike.${term},tracking_number.ilike.${term}`);
  }

  if (Number.isInteger(limit) && limit > 0) query = query.limit(limit);
  if (Number.isInteger(offset) && offset > 0) {
    query = query.range(offset, offset + (limit || 50) - 1);
  }

  return unwrap(await query, 'getPurchaseOrders');
}

export async function getPurchaseOrderById(orderId) {
  const safeId = assertUuid(orderId, 'orderId');
  return unwrap(
    await supabase
      .from('purchase_orders')
      .select(
        `*,
         suppliers!purchase_orders_supplier_id_fkey (id, name, email, phone, contact_person, address),
         rfq_requests!purchase_orders_rfq_id_fkey (id, title),
         supplier_offers!purchase_orders_offer_id_fkey (id, total, delivery_days)`
      )
      .eq('id', safeId)
      .maybeSingle(),
    'getPurchaseOrderById'
  );
}

/**
 * Обновить статус заказа. При 'delivered' проставляет actual_delivery.
 */
export async function updatePurchaseOrderStatus(orderId, status) {
  const safeId = assertUuid(orderId, 'orderId');
  assertOneOf(status, ORDER_STATUSES, 'status');

  const payload = { status };
  if (status === 'delivered') {
    payload.actual_delivery = new Date().toISOString().slice(0, 10);
  }

  return unwrap(
    await supabase.from('purchase_orders').update(payload).eq('id', safeId).select().single(),
    'updatePurchaseOrderStatus'
  );
}

/**
 * Обновить статус оплаты. При 'paid' ставит paid_at.
 */
export async function updatePaymentStatus(orderId, paymentStatus) {
  const safeId = assertUuid(orderId, 'orderId');
  assertOneOf(paymentStatus, PAYMENT_STATUSES, 'paymentStatus');

  const payload = { payment_status: paymentStatus };
  if (paymentStatus === 'paid') {
    payload.paid_at = new Date().toISOString();
  } else {
    payload.paid_at = null;
  }

  return unwrap(
    await supabase.from('purchase_orders').update(payload).eq('id', safeId).select().single(),
    'updatePaymentStatus'
  );
}

// ============================================================
// 📝 INTERACTIONS — История взаимодействий
// ============================================================

export async function logSupplierInteraction({
  supplierId,
  companyId,
  userId,
  type,
  description,
  metadata,
}) {
  const payload = {
    supplier_id: assertUuid(supplierId, 'supplierId'),
    company_id: assertUuid(companyId, 'companyId'),
    user_id: userId || null,
    type: assertNonEmpty(type, 'type'),
    description: description?.trim() || null,
    metadata: metadata || null,
  };

  return unwrap(
    await supabase.from('supplier_interactions').insert(payload).select().single(),
    'logSupplierInteraction'
  );
}

export async function getSupplierHistory(supplierId, limit = 50) {
  const safeId = assertUuid(supplierId, 'supplierId');
  let query = supabase
    .from('supplier_interactions')
    .select('*')
    .eq('supplier_id', safeId)
    .order('created_at', { ascending: false });

  if (Number.isInteger(limit) && limit > 0) query = query.limit(limit);
  return unwrap(await query, 'getSupplierHistory');
}

// ============================================================
// 📊 ANALYTICS — Аналитика
// ============================================================

/**
 * Сводная статистика закупок компании.
 */
export async function getProcurementStats(companyId, period = '30d') {
  const safeCompanyId = assertUuid(companyId, 'companyId');

  const now = new Date();
  let from = null;
  if (period === '7d') from = new Date(now.getTime() - 7 * 86400_000);
  else if (period === '30d') from = new Date(now.getTime() - 30 * 86400_000);
  else if (period === '90d') from = new Date(now.getTime() - 90 * 86400_000);
  else if (period === '365d' || period === '1y') from = new Date(now.getTime() - 365 * 86400_000);

  const fromIso = from ? from.toISOString() : null;

  const [suppliers, orders, rfqs] = await Promise.all([
    supabase.from('suppliers').select('id, status').eq('company_id', safeCompanyId),
    (async () => {
      let q = supabase
        .from('purchase_orders')
        .select('id, status, total, created_at')
        .eq('company_id', safeCompanyId);
      if (fromIso) q = q.gte('created_at', fromIso);
      return q;
    })(),
    (async () => {
      let q = supabase
        .from('rfq_requests')
        .select('id, status, created_at')
        .eq('company_id', safeCompanyId);
      if (fromIso) q = q.gte('created_at', fromIso);
      return q;
    })(),
  ]);

  const suppliersData = unwrap(suppliers, 'getProcurementStats:suppliers') || [];
  const ordersData = unwrap(orders, 'getProcurementStats:orders') || [];
  const rfqsData = unwrap(rfqs, 'getProcurementStats:rfqs') || [];

  const activeOrderStatuses = ['created', 'confirmed', 'paid', 'shipped'];
  const completedOrderStatuses = ['delivered', 'received'];

  return {
    period,
    totalSuppliers: suppliersData.length,
    activeSuppliers: suppliersData.filter((s) => s.status === 'active').length,
    totalOrders: ordersData.length,
    activeOrders: ordersData.filter((o) => activeOrderStatuses.includes(o.status)).length,
    completedOrders: ordersData.filter((o) => completedOrderStatuses.includes(o.status)).length,
    totalSpent: ordersData
      .filter((o) => completedOrderStatuses.includes(o.status))
      .reduce((sum, o) => sum + Number(o.total || 0), 0),
    totalRFQ: rfqsData.length,
    activeRFQ: rfqsData.filter((r) => ['sent', 'collecting', 'analyzing'].includes(r.status)).length,
    completedRFQ: rfqsData.filter((r) => r.status === 'completed').length,
  };
}

/**
 * Статистика по одному поставщику.
 */
export async function getSupplierStats(supplierId) {
  const safeId = assertUuid(supplierId, 'supplierId');

  const [supplier, orders, offers] = await Promise.all([
    supabase.from('suppliers').select('*').eq('id', safeId).maybeSingle(),
    supabase.from('purchase_orders').select('id, status, total').eq('supplier_id', safeId),
    supabase.from('supplier_offers').select('id, status, total').eq('supplier_id', safeId),
  ]);

  const supplierData = unwrap(supplier, 'getSupplierStats:supplier');
  const ordersData = unwrap(orders, 'getSupplierStats:orders') || [];
  const offersData = unwrap(offers, 'getSupplierStats:offers') || [];

  const activeOrderStatuses = ['created', 'confirmed', 'paid', 'shipped'];
  const completedOrderStatuses = ['delivered', 'received'];

  const wonOffers = offersData.filter((o) => o.status === 'selected').length;
  const respondedOffers = offersData.filter((o) =>
    ['selected', 'rejected', 'active', 'expired'].includes(o.status)
  ).length;

  return {
    supplier: supplierData,
    totalOrders: ordersData.length,
    activeOrders: ordersData.filter((o) => activeOrderStatuses.includes(o.status)).length,
    completedOrders: ordersData.filter((o) => completedOrderStatuses.includes(o.status)).length,
    totalAmount: ordersData
      .filter((o) => completedOrderStatuses.includes(o.status))
      .reduce((sum, o) => sum + Number(o.total || 0), 0),
    totalOffers: offersData.length,
    wonOffers,
    winRate: respondedOffers > 0 ? Math.round((wonOffers / respondedOffers) * 100) : 0,
  };
}

// ============================================================
// 🆕 SUPPLIER-SIDE HELPERS (Модель B)
// ============================================================

/**
 * Получить поставщика, привязанного к текущему пользователю.
 */
export async function getMySupplier() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return null;
  return unwrap(
    await supabase.from('suppliers').select('*').eq('user_id', user.id).maybeSingle(),
    'getMySupplier'
  );
}

/**
 * RFQ, куда приглашён данный поставщик.
 * Идёт через rfq_invitations → rfq_requests.
 */
export async function getRFQListForSupplier(supplierId, filters = {}) {
  const safeId = assertUuid(supplierId, 'supplierId');
  const { status, limit } = filters;

  const invitations = unwrap(
    await supabase.from('rfq_invitations').select('rfq_id, status').eq('supplier_id', safeId),
    'getRFQListForSupplier:invitations'
  ) || [];

  if (invitations.length === 0) return [];

  const rfqIds = Array.from(new Set(invitations.map(i => i.rfq_id)));

  let query = supabase
    .from('rfq_requests')
    .select(`
      *,
      rfq_invitations!rfq_invitations_rfq_id_fkey (id, status, supplier_id),
      supplier_offers!supplier_offers_rfq_id_fkey (id, total, status, supplier_id)
    `, { count: 'exact' })
    .in('id', rfqIds)
    .order('created_at', { ascending: false });

  if (status) {
    assertOneOf(status, RFQ_STATUSES, 'status');
    query = query.eq('status', status);
  }
  if (Number.isInteger(limit) && limit > 0) query = query.limit(limit);

  const data = unwrap(await query, 'getRFQListForSupplier:rfq') || [];

  return data.map(rfq => {
    const myInvitation = rfq.rfq_invitations?.find(i => i.supplier_id === safeId);
    const myOffer = rfq.supplier_offers?.find(o => o.supplier_id === safeId);
    return {
      ...rfq,
      my_invitation_status: myInvitation?.status || null,
      my_offer_id: myOffer?.id || null,
      my_offer_status: myOffer?.status || null,
      my_offer_total: myOffer?.total || null,
      invitations_count: rfq.rfq_invitations?.length || 0,
      offers_count: rfq.supplier_offers?.length || 0,
    };
  });
}

// ============================================================
// 📤 EXPORT DEFAULT
// ============================================================

export default {
  // Suppliers
  getSuppliers,
  getSupplierById,
  getMySupplier,        // 🆕
  createSupplier,
  updateSupplier,
  archiveSupplier,
  deleteSupplier,
  // Price Lists
  getPriceLists,
  getPriceListItems,
  createPriceListItem,
  updatePriceListItem,
  deletePriceListItem,
  bulkUpsertPriceItems,
  searchMaterialsAcrossSuppliers,
    // RFQ
  createRFQ,
  getRFQList,
  getRFQListForSupplier,  // 🆕
  getRFQById,
  sendRFQToSuppliers,
  getRFQInvitations,
  updateRFQStatus,
  // Offers
  submitOffer,
  getOffersForRFQ,
  getOfferById,
  selectOffer,
  rejectOffer,
  // Orders
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrderStatus,
  updatePaymentStatus,
  // Interactions
  logSupplierInteraction,
  getSupplierHistory,
  // Analytics
  getProcurementStats,
  getSupplierStats,
  // Constants
  SUPPLIER_STATUSES,
  RFQ_STATUSES,
  INVITATION_STATUSES,
  OFFER_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
};