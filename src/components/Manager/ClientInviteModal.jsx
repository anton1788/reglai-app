// src/components/Manager/ClientInviteModal.jsx
import React, { useState } from 'react';
import { X, UserPlus, Mail, Phone, Building } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';

const ClientInviteModal = ({ isOpen, onClose, companyId, onSuccess, t }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    objectName: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone) {
      alert(t('fillRequiredFields') || 'Заполните ФИО и телефон');
      return;
    }

    setIsLoading(true);
    try {
      const { data: invitation, error: inviteError } = await supabase
        .from('invitations')
        .insert([{
          email: formData.email || null,
          role: 'client',
          company_id: companyId,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
          metadata: {
            full_name: formData.fullName,
            phone: formData.phone,
            object_name: formData.objectName
          },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single();

      if (inviteError) throw inviteError;

      const inviteLink = `${window.location.origin}/auth/register?invite=${invitation.id}`;
      console.log('Ссылка для регистрации:', inviteLink);

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Ошибка приглашения:', err);
      alert(t('inviteFailed') || 'Ошибка: ' + err.message);
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
            <h3 className="text-lg font-bold">{t('inviteClient') || 'Пригласить заказчика'}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('fullName') || 'ФИО заказчика'} *</label>
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
            <label className="block text-sm font-medium mb-1">{t('phoneNumber') || 'Телефон'} *</label>
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
            <label className="block text-sm font-medium mb-1">{t('email') || 'Email'} ({t('optional') || 'необязательно'})</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="client@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('objectName') || 'Объект'}</label>
            <input
              type="text"
              value={formData.objectName}
              onChange={(e) => setFormData({ ...formData, objectName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder={t('objectPlaceholder') || 'Квартира 45, ЖК Солнечный'}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg dark:border-gray-600"
            >
              {t('cancel') || 'Отмена'}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg disabled:opacity-50"
            >
              {isLoading ? (t('sending') || 'Отправка...') : (t('sendInvite') || 'Отправить приглашение')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientInviteModal;