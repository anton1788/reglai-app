// src/features/applications/hooks/useApplicationFlow.js

import { useState, useCallback, useRef } from 'react';
import { applicationApi } from '../api/applicationApi';
import {
  canTransition,
  calculateStatusFromMaterials,
  createHistoryEntry,
  updateMaterialStatus,
  canPerformAction,
} from '../services/applicationService';
import { APPLICATION_STATUS } from '../../../utils/applicationStatuses';

export const useApplicationFlow = (companyId, userId, userEmail, userRole) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortControllerRef = useRef(null);

  /**
   * Отмена текущего запроса
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Проверка возможности перехода статуса
   */
  const checkTransition = useCallback((currentStatus, targetStatus) => {
    return canTransition(currentStatus, targetStatus, userRole);
  }, [userRole]);

  /**
   * Обновление статуса материала
   */
  const getUpdatedMaterialStatus = useCallback((material) => {
    return updateMaterialStatus(material);
  }, []);

  /**
   * Приёмка материалов снабженцем
   */
  const receiveMaterials = useCallback(
    async (applicationId, items, invoiceUrl = null) => {
      abortControllerRef.current = new AbortController();
      
      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: items.length });

      try {
        // 1. Проверяем права
        if (!['supply_admin', 'manager'].includes(userRole)) {
          throw new Error('Нет прав на приёмку');
        }

        // 2. Проверяем, что есть что принимать
        const validItems = items.filter((item) => Number(item.quantity) > 0);
        if (validItems.length === 0) {
          throw new Error('Нет материалов для приёмки');
        }

        // 3. Получаем текущую заявку
        const currentApp = await applicationApi.getById(
          applicationId,
          companyId,
          abortControllerRef.current.signal
        );

        // 4. Проверяем возможность перехода
        const targetStatus = APPLICATION_STATUS.ADMIN_PROCESSING;
        if (!checkTransition(currentApp.status, targetStatus)) {
          throw new Error(`Невозможно перейти из статуса "${currentApp.status}" в "${targetStatus}"`);
        }

        // 5. Вызываем RPC приёмки
        const result = await applicationApi.receiveMaterials(
          applicationId,
          companyId,
          userId,
          userEmail,
          validItems,
          invoiceUrl,
          abortControllerRef.current.signal
        );

        if (!result || !result.success) {
          throw new Error(result?.error || 'Ошибка приёмки');
        }

        // 6. Обновляем прогресс
        setProgress({ current: validItems.length, total: validItems.length });

        // 7. Обновляем статусы материалов
        const updatedMaterials = (result.materials || currentApp.materials).map((material) => ({
          ...material,
          status: getUpdatedMaterialStatus(material),
        }));

        // 8. Рассчитываем новый статус заявки
        const newStatus = calculateStatusFromMaterials(updatedMaterials);

        // 9. Проверяем возможность перехода
        if (!checkTransition(currentApp.status, newStatus)) {
          console.warn(`⚠️ Переход из "${currentApp.status}" в "${newStatus}" не рекомендуется, но выполняется`);
        }

        // 10. Создаём запись истории
        const historyEntry = createHistoryEntry(
          userId,
          userEmail,
          'supplier_received',
          currentApp.status,
          newStatus,
          `Принято ${validItems.length} позиций на склад${invoiceUrl ? `, счет: ${invoiceUrl}` : ''}`
        );

        // 11. Обновляем статус заявки
        const updated = await applicationApi.updateStatus(
          applicationId,
          newStatus,
          historyEntry,
          abortControllerRef.current.signal
        );

        return {
          success: true,
          data: updated,
          materials: updatedMaterials,
          newStatus,
        };
      } catch (err) {
        if (err.name === 'AbortError') {
          return { success: false, error: 'Операция отменена', aborted: true };
        }
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [companyId, userId, userEmail, userRole, checkTransition, getUpdatedMaterialStatus]
  );

  /**
   * Отправка материалов мастеру
   */
  const sendToMaster = useCallback(
    async (applicationId, items, targetObject, recipientName, recipientPhone) => {
      abortControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      try {
        if (!['supply_admin', 'manager'].includes(userRole)) {
          throw new Error('Нет прав на отправку мастеру');
        }

        const validItems = items.filter((item) => Number(item.quantityToSend || item.quantity || 0) > 0);
        if (validItems.length === 0) {
          throw new Error('Нет материалов для отправки');
        }

        const currentApp = await applicationApi.getById(
          applicationId,
          companyId,
          abortControllerRef.current.signal
        );

        // Проверяем возможность перехода
        const targetStatus = APPLICATION_STATUS.PENDING_MASTER_CONFIRMATION;
        if (!checkTransition(currentApp.status, targetStatus)) {
          throw new Error(`Невозможно перейти из статуса "${currentApp.status}" в "${targetStatus}"`);
        }

        // Вызываем RPC отправки мастеру
        const result = await applicationApi.sendToMaster(
          applicationId,
          companyId,
          userId,
          userEmail,
          validItems,
          targetObject,
          recipientName,
          recipientPhone,
          abortControllerRef.current.signal
        );

        if (!result || !result.success) {
          throw new Error(result?.error || 'Ошибка отправки мастеру');
        }

        // Обновляем статусы материалов
        const updatedMaterials = (result.materials || currentApp.materials).map((material) => ({
          ...material,
          status: getUpdatedMaterialStatus(material),
        }));

        // Рассчитываем новый статус
        const newStatus = calculateStatusFromMaterials(updatedMaterials);

        // Проверяем возможность перехода
        if (!checkTransition(currentApp.status, newStatus)) {
          console.warn(`⚠️ Переход из "${currentApp.status}" в "${newStatus}" не рекомендуется, но выполняется`);
        }

        const historyEntry = createHistoryEntry(
          userId,
          userEmail,
          'sent_to_master',
          currentApp.status,
          newStatus,
          `Отправлено ${validItems.length} позиций мастеру на объект "${targetObject}"`
        );

        const updated = await applicationApi.updateStatus(
          applicationId,
          newStatus,
          historyEntry,
          abortControllerRef.current.signal
        );

        return {
          success: true,
          data: updated,
          materials: updatedMaterials,
          newStatus,
        };
      } catch (err) {
        if (err.name === 'AbortError') {
          return { success: false, error: 'Операция отменена', aborted: true };
        }
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [companyId, userId, userEmail, userRole, checkTransition, getUpdatedMaterialStatus]
  );

  /**
   * Подтверждение мастером
   */
  const confirmByMaster = useCallback(
    async (applicationId, confirmations) => {
      abortControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      try {
        if (!['master', 'foreman'].includes(userRole)) {
          throw new Error('Нет прав на подтверждение');
        }

        const validConfirmations = confirmations.filter(
          (c) => c.action === 'confirm' || c.action === 'reject'
        );
        if (validConfirmations.length === 0) {
          throw new Error('Нет подтверждений для обработки');
        }

        const currentApp = await applicationApi.getById(
          applicationId,
          companyId,
          abortControllerRef.current.signal
        );

        // Проверяем возможность перехода
        const targetStatus = APPLICATION_STATUS.RECEIVED;
        if (!checkTransition(currentApp.status, targetStatus)) {
          console.warn(`⚠️ Переход из "${currentApp.status}" в "${targetStatus}" возможен, но проверьте права`);
        }

        const result = await applicationApi.confirmByMaster(
          applicationId,
          userId,
          userEmail,
          validConfirmations,
          abortControllerRef.current.signal
        );

        if (!result || !result.success) {
          throw new Error(result?.error || 'Ошибка подтверждения');
        }

        // Обновляем статусы материалов
        const updatedMaterials = (result.materials || currentApp.materials).map((material) => ({
          ...material,
          status: getUpdatedMaterialStatus(material),
        }));

        const newStatus = calculateStatusFromMaterials(updatedMaterials);

        // Проверяем возможность перехода
        if (!checkTransition(currentApp.status, newStatus)) {
          console.warn(`⚠️ Переход из "${currentApp.status}" в "${newStatus}" не рекомендуется, но выполняется`);
        }

        const confirmedCount = validConfirmations.filter((c) => c.action === 'confirm').length;
        const rejectedCount = validConfirmations.filter((c) => c.action === 'reject').length;

        const historyEntry = createHistoryEntry(
          userId,
          userEmail,
          'master_confirmed',
          currentApp.status,
          newStatus,
          `Подтверждено ${confirmedCount} позиций, отклонено ${rejectedCount}`
        );

        const updated = await applicationApi.updateStatus(
          applicationId,
          newStatus,
          historyEntry,
          abortControllerRef.current.signal
        );

        return {
          success: true,
          data: updated,
          materials: updatedMaterials,
          newStatus,
        };
      } catch (err) {
        if (err.name === 'AbortError') {
          return { success: false, error: 'Операция отменена', aborted: true };
        }
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [companyId, userId, userEmail, userRole, checkTransition, getUpdatedMaterialStatus]
  );

  /**
   * Отмена заявки
   */
  const cancelApplication = useCallback(
    async (applicationId, reason = '') => {
      abortControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      try {
        const currentApp = await applicationApi.getById(
          applicationId,
          companyId,
          abortControllerRef.current.signal
        );

        // Проверяем права на отмену
        if (!canPerformAction(currentApp, userRole, userId)) {
          throw new Error('Нет прав на отмену заявки');
        }

        // Проверяем возможность перехода
        if (!checkTransition(currentApp.status, APPLICATION_STATUS.CANCELED)) {
          throw new Error(`Невозможно отменить заявку в статусе "${currentApp.status}"`);
        }

        const result = await applicationApi.cancel(
          applicationId,
          userId,
          userEmail,
          reason,
          abortControllerRef.current.signal
        );

        return {
          success: true,
          data: result,
        };
      } catch (err) {
        if (err.name === 'AbortError') {
          return { success: false, error: 'Операция отменена', aborted: true };
        }
        setError(err.message);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [companyId, userId, userEmail, userRole, checkTransition]
  );

  /**
   * Получить комментарии
   */
  const getComments = useCallback(
    async (applicationId) => {
      try {
        return await applicationApi.getComments(applicationId);
      } catch (err) {
        console.error('Ошибка получения комментариев:', err);
        return [];
      }
    },
    []
  );

  /**
   * Добавить комментарий
   */
  const addComment = useCallback(
    async (applicationId, content) => {
      try {
        if (!content?.trim()) {
          throw new Error('Комментарий не может быть пустым');
        }

        return await applicationApi.addComment(
          applicationId,
          userId,
          userEmail,
          userRole,
          companyId,
          content
        );
      } catch (err) {
        console.error('Ошибка добавления комментария:', err);
        throw err;
      }
    },
    [companyId, userId, userEmail, userRole]
  );

  return {
    receiveMaterials,
    sendToMaster,
    confirmByMaster,
    cancelApplication,
    getComments,
    addComment,
    checkTransition,
    getUpdatedMaterialStatus,
    loading,
    error,
    progress,
    abort,
  };
};