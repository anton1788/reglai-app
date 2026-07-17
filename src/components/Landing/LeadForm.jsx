// src/components/Landing/LeadForm.jsx
import React, { useState } from 'react';
import { supabase } from '../../utils/supabaseClient';

const LeadForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    name: '',
    phone: '',
    email: '',
    employees: '',
    problem: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('leads')
        .insert([{
          ...formData,
          status: 'new',
          source: 'landing',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      setSubmitted(true);
      onSuccess?.();
      
      // Очищаем форму
      setFormData({
        companyName: '',
        name: '',
        phone: '',
        email: '',
        employees: '',
        problem: ''
      });
    } catch (error) {
      console.error('Ошибка:', error);
      alert('❌ Не удалось отправить заявку. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Спасибо за заявку!
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Мы свяжемся с вами в ближайшее время.<br />
          А пока можете посмотреть <a href="/demo" className="text-[#4A6572] hover:underline">демо-версию</a>.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 px-4 py-2 text-sm text-[#4A6572] hover:underline"
        >
          Отправить ещё
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Название компании *
        </label>
        <input
          type="text"
          required
          value={formData.companyName}
          onChange={(e) => setFormData(prev => ({...prev, companyName: e.target.value}))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="ООО СтройГрупп"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Ваше имя *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Иван Иванов"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Телефон *
        </label>
        <input
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="+7 (999) 123-45-67"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Email *
        </label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="info@stroygroup.ru"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Количество сотрудников
        </label>
        <select
          value={formData.employees}
          onChange={(e) => setFormData(prev => ({...prev, employees: e.target.value}))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Выберите...</option>
          <option value="1-5">До 5 человек</option>
          <option value="5-15">5-15 человек</option>
          <option value="15-50">15-50 человек</option>
          <option value="50+">Более 50 человек</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Какая проблема вас беспокоит?
        </label>
        <textarea
          value={formData.problem}
          onChange={(e) => setFormData(prev => ({...prev, problem: e.target.value}))}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#4A6572] focus:border-[#4A6572] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows="3"
          placeholder="Опишите, что хотите улучшить..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white rounded-lg font-medium hover:shadow-lg transition flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Отправка...
          </>
        ) : (
          'Получить бесплатный доступ'
        )}
      </button>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        🔒 Ваши данные защищены. Никакого спама, только полезная информация.
      </p>
    </form>
  );
};

export default LeadForm;