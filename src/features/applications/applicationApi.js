// src/features/applications/applicationApi.js

import { supabase } from '../../utils/supabaseClient';  // ← ИСПРАВЛЕНО!
import { APPLICATION_STATUS } from '../../utils/applicationStatuses';  // ← ИСПРАВЛЕНО!

export const applicationApi = {
  getById: async (id, companyId) => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();
    
    if (error) throw error;
    return data;
  },

  getByCompany: async (companyId, page = 1, perPage = 20, filters = {}) => {
    let query = supabase
      .from('applications')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    if (filters.search) {
      query = query.or(`object_name.ilike.%${filters.search}%,foreman_name.ilike.%${filters.search}%`);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: data || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / perPage),
    };
  },

  updateStatus: async (id, status, historyEntry) => {
    const { data: current } = await supabase
      .from('applications')
      .select('status_history')
      .eq('id', id)
      .single();

    const history = [...(current?.status_history || []), historyEntry];

    const { data, error } = await supabase
      .from('applications')
      .update({
        status,
        status_history: history,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateMaterials: async (id, materials) => {
    const { data, error } = await supabase
      .from('applications')
      .update({
        materials,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  receiveMaterials: async (applicationId, companyId, userId, userEmail, items, invoiceUrl = null) => {
    const { data, error } = await supabase.rpc('receive_materials', {
      p_application_id: applicationId,
      p_company_id: companyId,
      p_user_id: userId,
      p_user_email: userEmail,
      p_materials: items.map(item => ({
        item_name: item.item_name || item.description || '',
        quantity: Number(item.quantity) || 0,
        unit: item.unit || 'шт',
        invoice_url: item.invoice_url || invoiceUrl,
      })),
      p_invoice_url: invoiceUrl,
    });

    if (error) {
      console.error('❌ RPC receive_materials error:', error);
      throw error;
    }

    return data;
  },

  sendToMaster: async (applicationId, companyId, userId, userEmail, items, targetObject, recipientName, recipientPhone) => {
    const { data, error } = await supabase.rpc('send_materials_to_master', {
      p_application_id: applicationId,
      p_company_id: companyId,
      p_user_id: userId,
      p_user_email: userEmail,
      p_materials: items.map(item => ({
        item_name: item.description || item.item_name || '',
        quantity: Number(item.quantityToSend) || Number(item.quantity) || 0,
        unit: item.unit || 'шт',
      })),
      p_target_object: targetObject,
      p_recipient_name: recipientName,
      p_recipient_phone: recipientPhone,
    });

    if (error) {
      console.error('❌ RPC send_materials_to_master error:', error);
      throw error;
    }

    return data;
  },

  confirmByMaster: async (applicationId, userId, userEmail, confirmations) => {
    const { data, error } = await supabase.rpc('confirm_materials_by_master', {
      p_application_id: applicationId,
      p_user_id: userId,
      p_user_email: userEmail,
      p_confirmations: confirmations.map(c => ({
        material_index: c.materialIndex,
        action: c.action || 'confirm',
        quantity: Number(c.quantity) || 0,
        feedback: c.feedback || '',
      })),
    });

    if (error) {
      console.error('❌ RPC confirm_materials_by_master error:', error);
      throw error;
    }

    return data;
  },

  cancel: async (id, userId, userEmail, reason = '') => {
    const { data: current } = await supabase
      .from('applications')
      .select('status, status_history')
      .eq('id', id)
      .single();

    if (!current) throw new Error('Заявка не найдена');

    const historyEntry = {
      user_id: userId,
      user_email: userEmail,
      action: 'canceled',
      old_status: current.status,
      new_status: APPLICATION_STATUS.CANCELED,
      timestamp: new Date().toISOString(),
      details: reason || 'Заявка отменена',
    };

    const history = [...(current.status_history || []), historyEntry];

    const { data, error } = await supabase
      .from('applications')
      .update({
        status: APPLICATION_STATUS.CANCELED,
        status_history: history,
        updated_at: new Date().toISOString(),
        canceled_at: new Date().toISOString(),
        cancel_reason: reason || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getComments: async (applicationId) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  addComment: async (applicationId, userId, userEmail, userRole, companyId, content) => {
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        application_id: applicationId,
        user_id: userId,
        user_email: userEmail,
        user_role: userRole,
        user_company_id: companyId,
        content: content.trim(),
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};