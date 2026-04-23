import { supabase } from './supabaseClient';
import { APPROVAL_RULES, APPROVAL_STATUS, APPROVAL_ACTIONS } from '../types/approval.types';

class ApprovalEngine {
  constructor() {
    // Кэш цен материалов для уменьшения количества запросов
    this.priceCache = new Map();
    // Цена по умолчанию, если материал не найден
    this.defaultPrice = 1000;
  }

  /**
   * Рассчитать необходимый уровень согласования
   * @param {number} totalAmount - Общая сумма материалов
   * @returns {string} - Уровень согласования ('auto_approve' | 'manager' | 'director')
   */
  calculateApprovalLevel(totalAmount) {
    if (totalAmount <= APPROVAL_RULES.auto_approve.limit) {
      return 'auto_approve';
    }
    if (totalAmount <= APPROVAL_RULES.manager.limit) {
      return 'manager';
    }
    return 'director';
  }

  /**
   * Создать запрос на согласование
   * @param {Object} application - Заявка
   * @param {string} companyId - ID компании
   * @returns {Object} - Созданный approval
   */
    /**
   * Создать запрос на согласование
   */
    async createApprovalRequest(application, companyId) {
    try {
      const totalAmount = await this.calculateTotalAmount(application.materials);
      const approvalLevel = this.calculateApprovalLevel(totalAmount);
      
      if (approvalLevel === 'auto_approve') {
        console.log('✅ [APPROVAL] Авто-согласование суммы:', totalAmount);
        return { status: 'auto_approved', message: 'Автоматическое согласование' };
      }
      
      const approver = await this.getApproverByRole(companyId, approvalLevel);
      if (!approver) {
        console.warn('⚠️ [APPROVAL] Нет доступного согласующего для уровня:', approvalLevel);
        return null;
      }
      
      // 🔥 ВАЖНО: пишем в approval_requests (а не approvals)
      const { data, error } = await supabase
        .from('approval_requests')
        .insert([{
          application_id: application.id,
          company_id: companyId,
          requester_id: application.user_id,
          approver_id: approver.user_id,
          approver_role: approvalLevel,
          total_amount: totalAmount,
          status: 'pending',
          created_at: new Date().toISOString(),
          deadline: new Date(Date.now() + 48 * 3600000).toISOString(),
          level: approvalLevel
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ [APPROVAL] Ошибка создания:', error);
        return null;
      }
      
      console.log('✅ [APPROVAL] Заявка создана в очереди:', data.id);
      return data;
    } catch (err) {
      console.error('❌ [APPROVAL] Критическая ошибка:', err);
      return null;
    }
  }
  
  /**
   * Рассчитать общую сумму материалов с учетом цен из БД
   * @param {Array} materials - Массив материалов
   * @returns {Promise<number>} - Общая сумма
   */
  async calculateTotalAmount(materials) {
    if (!materials || materials.length === 0) return 0;
    
    let total = 0;
    
    for (const material of materials) {
      // Если в материале уже есть цена - используем её
      let price = material.price;
      
      if (!price) {
        // Иначе получаем цену из справочника
        price = await this.getMaterialPrice(material.description);
      }
      
      const quantity = Number(material.quantity) || 0;
      const itemTotal = quantity * price;
      total += itemTotal;
      
      // Добавляем цену в объект материала для сохранения в БД
      material.calculated_price = price;
      material.total_price = itemTotal;
    }
    
    return total;
  }

  /**
   * Получить цену материала из справочника
   * @param {string} materialName - Название материала
   * @returns {Promise<number>} - Цена материала
   */
  async getMaterialPrice(materialName) {
    if (!materialName) return this.defaultPrice;
    
    // Нормализуем название для кэша
    const cacheKey = materialName.toLowerCase().trim();
    
    // Проверяем кэш
    if (this.priceCache.has(cacheKey)) {
      return this.priceCache.get(cacheKey);
    }
    
    try {
      // Ищем цену в справочнике материалов
      const { data, error } = await supabase
        .from('material_prices')
        .select('price, name, unit')
        .eq('name', materialName)
        .single();
      
      let price = this.defaultPrice;
      
      if (!error && data && data.price) {
        price = Number(data.price);
        // Сохраняем в кэш
        this.priceCache.set(cacheKey, price);
      } else {
        // Если материал не найден, пробуем найти по частичному совпадению
        const { data: similarData, error: similarError } = await supabase
          .from('material_prices')
          .select('price, name')
          .ilike('name', `%${materialName}%`)
          .limit(1)
          .single();
        
        if (!similarError && similarData && similarData.price) {
          price = Number(similarData.price);
          this.priceCache.set(cacheKey, price);
          console.log(`Найдена похожая цена для "${materialName}": ${price} (по "${similarData.name}")`);
        } else {
          console.warn(`Цена не найдена для материала: ${materialName}, используется цена по умолчанию: ${this.defaultPrice} ₽`);
          this.priceCache.set(cacheKey, this.defaultPrice);
        }
      }
      
      return price;
    } catch (err) {
      console.error(`Ошибка получения цены для материала ${materialName}:`, err);
      return this.defaultPrice;
    }
  }

  /**
   * Получить цены для нескольких материалов (batch запрос)
   * @param {Array<string>} materialNames - Массив названий материалов
   * @returns {Promise<Map>} - Map с ценами
   */
  async getBatchMaterialPrices(materialNames) {
    const uniqueNames = [...new Set(materialNames.map(n => n?.toLowerCase().trim()).filter(Boolean))];
    const result = new Map();
    
    // Проверяем кэш
    const uncachedNames = [];
    for (const name of uniqueNames) {
      if (this.priceCache.has(name)) {
        result.set(name, this.priceCache.get(name));
      } else {
        uncachedNames.push(name);
      }
    }
    
    if (uncachedNames.length === 0) {
      return result;
    }
    
    try {
      // Массовый запрос к БД
      const { data, error } = await supabase
        .from('material_prices')
        .select('name, price')
        .in('name', uncachedNames);
      
      if (!error && data) {
        // Создаем Map для быстрого доступа
        const priceMap = new Map();
        data.forEach(item => {
          const normalizedName = item.name.toLowerCase().trim();
          const price = Number(item.price);
          priceMap.set(normalizedName, price);
          this.priceCache.set(normalizedName, price);
        });
        
        // Для отсутствующих материалов используем цену по умолчанию
        for (const name of uncachedNames) {
          if (!priceMap.has(name)) {
            priceMap.set(name, this.defaultPrice);
            this.priceCache.set(name, this.defaultPrice);
          }
          result.set(name, priceMap.get(name));
        }
      } else {
        // При ошибке используем цены по умолчанию
        for (const name of uncachedNames) {
          result.set(name, this.defaultPrice);
          this.priceCache.set(name, this.defaultPrice);
        }
      }
    } catch (err) {
      console.error('Ошибка массового получения цен:', err);
      for (const name of uncachedNames) {
        result.set(name, this.defaultPrice);
        this.priceCache.set(name, this.defaultPrice);
      }
    }
    
    return result;
  }

  /**
   * Обновить цену материала в справочнике
   * @param {string} materialName - Название материала
   * @param {number} price - Новая цена
   * @param {string} unit - Единица измерения
   * @returns {Promise<boolean>} - Результат обновления
   */
  async updateMaterialPrice(materialName, price, unit = 'шт') {
    if (!materialName || !price) return false;
    
    try {
      const { error } = await supabase
        .from('material_prices')
        .upsert({
          name: materialName,
          price: Number(price),
          unit: unit,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'name'
        });
      
      if (!error) {
        // Обновляем кэш
        const cacheKey = materialName.toLowerCase().trim();
        this.priceCache.set(cacheKey, Number(price));
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Ошибка обновления цены материала:', err);
      return false;
    }
  }

  /**
   * Очистить кэш цен
   */
  clearPriceCache() {
    this.priceCache.clear();
  }
  
  /**
   * Найти согласующего по роли
   */
  async getApproverByRole(companyId, role) {
    const roleMap = {
      manager: 'manager',
      director: 'director'
    };
    
    const { data, error } = await supabase
      .from('company_users')
      .select('user_id, full_name, email')
      .eq('company_id', companyId)
      .eq('role', roleMap[role])
      .eq('is_active', true)
      .limit(1)
      .single();
    
    if (error) return null;
    return data;
  }
  
  /**
   * Обработать действие согласования
   */
  async processApproval(approvalId, action, comment, userId) {
    const { data: approval, error: fetchError } = await supabase
      .from('approvals')
      .select('*, applications(*)')
      .eq('id', approvalId)
      .single();
    
    if (fetchError) throw fetchError;
    if (approval.status !== APPROVAL_STATUS.PENDING) {
      throw new Error('Заявка уже согласована или отклонена');
    }
    
    let newStatus;
    let newApplicationStatus;
    
    switch(action) {
      case APPROVAL_ACTIONS.APPROVE:
        newStatus = APPROVAL_STATUS.APPROVED;
        newApplicationStatus = 'approved';
        break;
      case APPROVAL_ACTIONS.REJECT:
        newStatus = APPROVAL_STATUS.REJECTED;
        newApplicationStatus = 'rejected';
        break;
      case APPROVAL_ACTIONS.REQUEST_CHANGES:
        newStatus = APPROVAL_STATUS.REJECTED;
        newApplicationStatus = 'needs_changes';
        break;
      case APPROVAL_ACTIONS.ESCALATE:
        newStatus = APPROVAL_STATUS.ESCALATED;
        newApplicationStatus = 'pending';
        // Создаем эскалацию на следующий уровень
        await this.escalateApproval(approval);
        break;
      default:
        throw new Error('Неизвестное действие');
    }
    
    // Обновляем approval
    const { error: updateError } = await supabase
      .from('approvals')
      .update({
        status: newStatus,
        comment: comment,
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', approvalId);
    
    if (updateError) throw updateError;
    
    // Если заявка одобрена или отклонена - обновляем её статус
    if (newApplicationStatus !== 'pending') {
      await supabase
        .from('applications')
        .update({
          status: newApplicationStatus,
          approval_status: newStatus,
          approval_comment: comment
        })
        .eq('id', approval.application_id);
    }
    
    // Логируем в аудит
    await supabase.from('audit_logs').insert([{
      company_id: approval.company_id,
      user_id: userId,
      action_type: `approval_${action}`,
      entity_type: 'application',
      entity_id: approval.application_id,
      new_value: { status: newStatus, comment },
      created_at: new Date().toISOString()
    }]);
    
    return { success: true, newStatus };
  }
  
  /**
   * Эскалация на следующий уровень
   */
  async escalateApproval(approval) {
    const nextLevel = approval.level === 'manager' ? 'director' : 'ceo';
    const nextApprover = await this.getApproverByRole(approval.company_id, nextLevel);
    
    if (nextApprover) {
      await supabase.from('approvals').insert([{
        application_id: approval.application_id,
        company_id: approval.company_id,
        approver_user_id: nextApprover.user_id,
        approver_role: nextLevel,
        total_amount: approval.total_amount,
        status: APPROVAL_STATUS.PENDING,
        created_by: approval.created_by,
        parent_approval_id: approval.id,
        created_at: new Date().toISOString(),
        deadline: new Date(Date.now() + APPROVAL_RULES[nextLevel].timeout_hours * 3600000),
        level: nextLevel
      }]);
      
      // Уведомляем нового согласующего
      await this.notifyApprover({ level: nextLevel }, approval.application);
    }
  }
  
  /**
   * Установить таймаут на согласование
   */
  setApprovalTimeout(approvalId, hours) {
    setTimeout(async () => {
      const { data: approval } = await supabase
        .from('approvals')
        .select('status')
        .eq('id', approvalId)
        .single();
      
      if (approval && approval.status === APPROVAL_STATUS.PENDING) {
        await this.processApproval(
          approvalId,
          APPROVAL_ACTIONS.ESCALATE,
          'Автоматическая эскалация (таймаут)',
          'system'
        );
      }
    }, hours * 3600000);
  }
  
  /**
   * Уведомить согласующего
   */
  async notifyApprover(approval, application) {
    // Здесь интеграция с email/telegram
    console.log(`Уведомление отправлено ${approval.approver_role}:`, {
      application: application.object_name,
      amount: approval.total_amount,
      deadline: approval.deadline
    });
  }
}

export default new ApprovalEngine();