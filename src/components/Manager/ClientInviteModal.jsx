// src/components/Manager/ClientInviteModal.jsx
import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const ClientInviteModal = ({ isOpen, onClose, companyId, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    objectName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Валидация
    if (!formData.fullName.trim()) {
      setError('Введите ФИО заказчика');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Введите телефон заказчика');
      return;
    }

    setIsLoading(true);
    try {
      // Получаем текущего пользователя
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Создаём приглашение в таблице invitations (БЕЗ expires_at)
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert([{
          email: formData.email || null,
          role: 'client',
          company_id: companyId,
          invited_by: user?.id,
          metadata: {
            full_name: formData.fullName,
            phone: formData.phone,
            object_name: formData.objectName
          },
          created_at: new Date().toISOString(),
          accepted: false
        }])
        .select()
        .single();

      if (inviteError) throw inviteError;

      // 2. Формируем ссылку для регистрации
      const inviteLink = `${window.location.origin}/?invite=${invitation.id}`;
      
      // 3. Копируем ссылку в буфер
      await navigator.clipboard.writeText(inviteLink);
      
      onSuccess?.();
      onClose();
      
      // Показываем уведомление
      alert(`✅ Приглашение создано!\n\nСсылка для регистрации скопирована в буфер обмена:\n${inviteLink}\n\nОтправьте её заказчику.`);
      
    } catch (err) {
      console.error('Ошибка приглашения:', err);
      setError(err.message || 'Ошибка при создании приглашения');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 modal-enter">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold">Пригласить заказчика</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">ФИО заказчика *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Иванов Иван Иванович"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Телефон *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="+7 (999) 123-45-67"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email (необязательно)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="client@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Объект</label>
            <input
              type="text"
              value={formData.objectName}
              onChange={(e) => setFormData({ ...formData, objectName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Квартира 45, ЖК Солнечный"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg dark:border-gray-600"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Отправка...' : 'Отправить приглашение'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientInviteModal;