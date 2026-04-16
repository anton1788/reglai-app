// src/utils/validation.js
import { z } from 'zod';

// --- Схемы валидации ---

export const signupSchema = z.object({
  email: z.string().email('Некорректный email').min(5).max(255),
  password: z.string().min(8, 'Пароль минимум 8 символов').max(100),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Введите имя').max(100),
  phone: z.string().min(10, 'Введите корректный телефон'),
  companyName: z.string().min(2, 'Название компании').max(100),
  consent: z.literal(true, { errorMap: () => ({ message: 'Необходимо согласие' }) })
}).refine(data => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль')
});

export const applicationSchema = z.object({
  objectName: z.string().min(3, 'Название объекта минимум 3 символа').max(200),
  foremanName: z.string().min(2, 'Введите имя прораба').max(100),
  foremanPhone: z.string().min(10, 'Введите корректный телефон'),
  materials: z.array(z.object({
    description: z.string().min(1, 'Описание обязательно'),
    quantity: z.number().positive('Количество должно быть больше 0'),
    unit: z.string().min(1, 'Единица измерения обязательна')
  })).min(1, 'Добавьте хотя бы один материал')
});

export const commentSchema = z.object({
  content: z.string().min(1, 'Комментарий не может быть пустым').max(2000, 'Комментарий слишком длинный')
});

export const inviteUserSchema = z.object({
  email: z.string().email('Некорректный email'),
  role: z.string().min(1, 'Выберите роль')
});

export const templateSchema = z.object({
  templateName: z.string().min(1, 'Введите название шаблона').max(100)
});

// --- Функции санитизации ---

export const sanitizeInput = (str) => {
  if (!str) return '';
  return str
    .replace(/[<>]/g, '')           // Удаляем теги
    .replace(/javascript:/gi, '')   // Удаляем javascript:
    .replace(/on\w+=/gi, '')        // Удаляем on* обработчики
    .trim();
};

export const sanitizeHtml = (str) => {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

export const sanitizeJson = (obj) => {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj, (key, value) => 
    typeof value === 'string' ? sanitizeInput(value) : value
  ));
};

export const validatePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.startsWith('7');
};