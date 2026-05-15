// src/components/CompanyProfileForm.jsx
import React, { useState, useEffect } from 'react';
import { Building, Phone, Mail, MapPin, CreditCard, Upload, Save } from 'lucide-react';

export const CompanyProfileForm = ({ companyId, supabase, onSave }) => {
  const [formData, setFormData] = useState({  // ← БЫЛО: setFormData useState → ИСПРАВЛЕНО: setFormData = useState
    legal_form: 'ООО',
    inn: '',
    kpp: '',
    ogrn: '',
    legal_address: '',
    actual_address: '',
    bank_name: '',
    bik: '',
    correspondent_account: '',
    checking_account: '',
    ceo_name: '',
    accountant_name: '',
    company_phone: '',
    company_email: '',
  });
  
  const [logoFile, setLogoFile] = useState(null);
  const [stampFile, setStampFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Загрузка существующих данных
  useEffect(() => {
    const loadCompanyData = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (data && !error) {
        setFormData({
          legal_form: data.legal_form || 'ООО',
          inn: data.inn || '',
          kpp: data.kpp || '',
          ogrn: data.ogrn || '',
          legal_address: data.legal_address || '',
          actual_address: data.actual_address || '',
          bank_name: data.bank_name || '',
          bik: data.bik || '',
          correspondent_account: data.correspondent_account || '',
          checking_account: data.checking_account || '',
          ceo_name: data.ceo_name || '',
          accountant_name: data.accountant_name || '',
          company_phone: data.company_phone || '',
          company_email: data.company_email || '',
        });
      }
    };
    
    if (companyId) loadCompanyData();
  }, [companyId, supabase]);

  const uploadFile = async (file, path) => {
    if (!file) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${companyId}/${path}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('company_files')
      .upload(fileName, file, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage
      .from('company_files')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Загружаем файлы
      const [logoUrl, stampUrl, signatureUrl] = await Promise.all([
        logoFile ? uploadFile(logoFile, 'logo') : null,
        stampFile ? uploadFile(stampFile, 'stamp') : null,
        signatureFile ? uploadFile(signatureFile, 'signature') : null,
      ]);
      
      // Обновляем данные компании
      const { error } = await supabase
        .from('companies')
        .update({
          ...formData,
          logo_url: logoUrl,
          stamp_image_url: stampUrl,
          signature_image_url: signatureUrl,
          company_profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companyId);
      
      if (error) throw error;
      
      if (onSave) onSave();
      alert('Данные компании сохранены!');
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      alert('Ошибка при сохранении данных');
    } finally {
      setLoading(false);
    }
  };

  // Автоматический расчет КПП для ИП
  const handleInnChange = (value) => {
    setFormData(prev => ({ ...prev, inn: value }));
    
    // Если ИП и ИНН из 12 цифр, КПП не нужен
    if (value.length === 12) {
      setFormData(prev => ({ ...prev, kpp: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Building className="w-6 h-6 text-[#4A6572]" />
          Реквизиты организации
        </h2>
        
        {/* Основная информация */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Организационная форма</label>
            <select
              value={formData.legal_form}
              onChange={(e) => setFormData(prev => ({ ...prev, legal_form: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
            >
              <option value="ООО">ООО</option>
              <option value="ИП">ИП</option>
              <option value="АО">АО</option>
              <option value="ЗАО">ЗАО</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              ИНН {formData.legal_form === 'ИП' ? '(12 цифр)' : '(10 цифр)'}
            </label>
            <input
              type="text"
              value={formData.inn}
              onChange={(e) => handleInnChange(e.target.value)}
              maxLength={formData.legal_form === 'ИП' ? 12 : 10}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              placeholder={formData.legal_form === 'ИП' ? '123456789012' : '1234567890'}
            />
          </div>
          
          {formData.legal_form !== 'ИП' && (
            <div>
              <label className="block text-sm font-medium mb-1">КПП</label>
              <input
                type="text"
                value={formData.kpp}
                onChange={(e) => setFormData(prev => ({ ...prev, kpp: e.target.value }))}
                maxLength={9}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="123456789"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">ОГРН</label>
            <input
              type="text"
              value={formData.ogrn}
              onChange={(e) => setFormData(prev => ({ ...prev, ogrn: e.target.value }))}
              maxLength={13}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
              placeholder="1234567890123"
            />
          </div>
        </div>
        
        {/* Адреса */}
        <div className="border-t pt-4 mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Адреса
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Юридический адрес</label>
              <textarea
                value={formData.legal_address}
                onChange={(e) => setFormData(prev => ({ ...prev, legal_address: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="г. Москва, ул. Примерная, д. 1, оф. 101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Фактический адрес</label>
              <textarea
                value={formData.actual_address}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_address: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="г. Москва, ул. Фактическая, д. 2"
              />
            </div>
          </div>
        </div>
        
        {/* Банковские реквизиты */}
        <div className="border-t pt-4 mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Банковские реквизиты
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Название банка</label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="ПАО Сбербанк"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">БИК</label>
              <input
                type="text"
                value={formData.bik}
                onChange={(e) => setFormData(prev => ({ ...prev, bik: e.target.value }))}
                maxLength={9}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Корреспондентский счет</label>
              <input
                type="text"
                value={formData.correspondent_account}
                onChange={(e) => setFormData(prev => ({ ...prev, correspondent_account: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="30101810400000000225"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Расчетный счет</label>
              <input
                type="text"
                value={formData.checking_account}
                onChange={(e) => setFormData(prev => ({ ...prev, checking_account: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="40702810400000000000"
              />
            </div>
          </div>
        </div>
        
        {/* Контактные данные */}
        <div className="border-t pt-4 mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Контактные данные
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Телефон компании</label>
              <input
                type="tel"
                value={formData.company_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, company_phone: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="+7 (495) 123-45-67"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email компании</label>
              <input
                type="email"
                value={formData.company_email}
                onChange={(e) => setFormData(prev => ({ ...prev, company_email: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="info@company.ru"
              />
            </div>
          </div>
        </div>
        
        {/* Руководители */}
        <div className="border-t pt-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">Руководство</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Генеральный директор</label>
              <input
                type="text"
                value={formData.ceo_name}
                onChange={(e) => setFormData(prev => ({ ...prev, ceo_name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="Иванов Иван Иванович"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Главный бухгалтер</label>
              <input
                type="text"
                value={formData.accountant_name}
                onChange={(e) => setFormData(prev => ({ ...prev, accountant_name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700"
                placeholder="Петрова Анна Сергеевна"
              />
            </div>
          </div>
        </div>
        
        {/* Загрузка файлов */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3">Печать и подписи</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Логотип компании</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files[0])}
                className="w-full"
              />
              {formData.logo_url && (
                <img src={formData.logo_url} alt="Логотип" className="mt-2 h-16 object-contain" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Изображение печати</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setStampFile(e.target.files[0])}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Подпись руководителя</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSignatureFile(e.target.files[0])}
                className="w-full"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg hover:shadow-md transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Сохранение...' : 'Сохранить реквизиты'}
          </button>
        </div>
      </div>
    </form>
  );
};