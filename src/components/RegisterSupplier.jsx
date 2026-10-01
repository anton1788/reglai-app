// src/components/RegisterSupplier.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  Loader2, AlertCircle, CheckCircle2, Building2, Mail, Phone,
  User, Lock, ArrowRight, ShieldCheck,
} from 'lucide-react';

import { supabase } from '../utils/supabaseClient';

// ============================================================
// 🛠️ ДЕКОДИРОВАНИЕ ТОКЕНА
// ============================================================
const base64urlDecode = (str) => {
  try {
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const utf8 = atob(b64);
    return decodeURIComponent(escape(utf8));
  } catch (e) {
    console.error('[RegisterSupplier] base64url decode error:', e);
    return null;
  }
};

const parseInviteToken = (token) => {
  if (!token) return null;
  try {
    const json = base64urlDecode(token);
    if (!json) return null;
    const payload = JSON.parse(json);
    if (!payload?.s || !payload?.c) return null;
    if (payload.exp && Date.now() > payload.exp) {
      return { ...payload, expired: true };
    }
    return payload;
  } catch (e) {
    console.error('[RegisterSupplier] token parse error:', e);
    return null;
  }
};

const formatPhone = (value) => {
  let digits = (value || '').replace(/\D/g, '');
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (digits.length > 0 && !digits.startsWith('7')) digits = '7' + digits;
  digits = digits.substring(0, 11);
  if (digits.length === 0) return '';
  let formatted = '+7';
  if (digits.length > 1) formatted += ` (${digits.slice(1, 4)}`;
  if (digits.length > 4) formatted += `) ${digits.slice(4, 7)}`;
  if (digits.length > 7) formatted += `-${digits.slice(7, 9)}`;
  if (digits.length > 9) formatted += `-${digits.slice(9, 11)}`;
  return formatted;
};

// ============================================================
// 🎨 КОМПОНЕНТ
// ============================================================
export default function RegisterSupplier() {
  // ─── Токен из URL ──────────────────────────────────────
  const tokenPayload = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    return parseInviteToken(token);
  }, []);

  // ─── Состояние ─────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ─── Загрузка данных приглашения ───────────────────────
  const [invitation, setInvitation] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [buyerCompany, setBuyerCompany] = useState(null);
  const [loadingInvitation, setLoadingInvitation] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!tokenPayload?.s || !tokenPayload?.c) {
        setLoadingInvitation(false);
        return;
      }

      try {
        // 1. Загружаем поставщика
        const { data: sup } = await supabase
          .from('suppliers')
          .select('id, name, email, phone, inn, user_id')
          .eq('id', tokenPayload.s)
          .maybeSingle();

        if (sup) {
          setSupplier(sup);
          if (sup.email) setEmail(sup.email);
          if (sup.phone) setPhone(sup.phone);
          if (sup.name) setCompanyName(sup.name);
        }

        // 2. Загружаем компанию-заказчика (buyer company)
        const { data: buyer } = await supabase
          .from('companies')
          .select('id, name')
          .eq('id', tokenPayload.c)
          .maybeSingle();

        if (buyer) {
          setBuyerCompany(buyer);
        }

        // 3. Загружаем приглашение (если есть)
        try {
          const { data: inv } = await supabase
            .from('invitations')
            .select('id, email, role, accepted, supplier_id')
            .eq('supplier_id', tokenPayload.s)
            .eq('accepted', false)
            .maybeSingle();

          if (inv) {
            setInvitation(inv);
            if (inv.email) setEmail((prev) => prev || inv.email);
          }
        } catch (invErr) {
          console.warn('[RegisterSupplier] invitations lookup skipped:', invErr?.message);
        }
      } catch (err) {
        console.error('[RegisterSupplier] load error:', err);
      } finally {
        setLoadingInvitation(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenPayload?.s, tokenPayload?.c]);

  // ─── Валидация ─────────────────────────────────────────
  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    [email]
  );

  const phoneDigits = phone.replace(/\D/g, '');
  const phoneValid = phoneDigits.length >= 10;

  const passwordValid = password.length >= 6;
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const canSubmit =
    emailValid &&
    phoneValid &&
    passwordValid &&
    passwordsMatch &&
    fullName.trim().length >= 2 &&
    companyName.trim().length >= 2 &&
    !submitting;

  // ─── Регистрация ───────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError('Проверьте правильность заполнения полей');
      return;
    }

    if (!tokenPayload?.s || !tokenPayload?.c) {
      setError('Недействительная ссылка-приглашение');
      return;
    }

    if (supplier?.user_id) {
      setError('Этот поставщик уже зарегистрирован в системе');
      return;
    }

    setSubmitting(true);

    try {
      // ============================================================
      // 1. Создаём auth-пользователя
      // ============================================================
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            role: 'supplier_admin',
            full_name: fullName.trim(),
            phone,
            is_supplier: true,
          },
        },
      });

      if (authError) throw authError;
      if (!authData?.user) throw new Error('Не удалось создать пользователя');

      const userId = authData.user.id;

      // ============================================================
      // 2. Компания поставщика = компания ЗАКАЗЧИКА (из токена)
      // ============================================================
      const buyerCompanyId = tokenPayload.c;

      const { data: buyerData, error: buyerErr } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', buyerCompanyId)
        .maybeSingle();

      if (buyerErr || !buyerData) {
        throw new Error('Компания-заказчик не найдена');
      }

      const companyId = buyerData.id;
      console.log('✅ Регистрируем поставщика в компании:', buyerData.name);

      // ============================================================
      // 3. Обновляем метаданные auth-пользователя
      //    ⚠️ Может упасть, если включён "Confirm email"
      // ============================================================
      try {
        const { error: metaErr } = await supabase.auth.updateUser({
          data: {
            company_id: companyId,
            company_name: buyerData.name,
            role: 'supplier_admin',
            supplier_id: tokenPayload.s,
          },
        });
        if (metaErr) {
          console.warn('⚠️ updateUser failed (не критично):', metaErr.message);
        } else {
          console.log('✅ Метаданные обновлены');
        }
      } catch (metaErr) {
        console.warn('⚠️ updateUser exception (не критично):', metaErr?.message);
      }

      // ============================================================
      // 4. Добавляем в company_users
      // ============================================================
      const { error: cuError } = await supabase
        .from('company_users')
        .insert({
          user_id: userId,
          company_id: companyId,
          role: 'supplier_admin',
          full_name: fullName.trim(),
          phone,
          is_active: true,
        });

      if (cuError && cuError.code !== '23505') {
        console.warn('⚠️ company_users insert:', cuError);
      }

      // ============================================================
      // 5. Привязываем user_id к записи suppliers (ГЛАВНЫЙ ШАГ)
      // ============================================================
      const { error: linkError } = await supabase
        .from('suppliers')
        .update({
          user_id: userId,
          email: email.trim().toLowerCase(),
          phone: phone || supplier?.phone || null,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenPayload.s);

      if (linkError) {
        console.error('❌ Не удалось привязать supplier.user_id:', linkError);
        // Не бросаем — пользователь всё равно создан
      } else {
        console.log('✅ supplier.user_id привязан к', userId);
      }

      // ============================================================
      // 6. Помечаем приглашение принятым
      // ============================================================
      if (invitation?.id) {
        await supabase
          .from('invitations')
          .update({ accepted: true })
          .eq('id', invitation.id);
      }

      setSuccess(true);

      // ============================================================
      // 7. Через 2.5 сек редирект на главную
      // ============================================================
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
    } catch (err) {
      console.error('[RegisterSupplier] error:', err);
      setError(err.message || 'Ошибка регистрации');
      setSubmitting(false);
    }
  };

  // ─── Рендер: невалидный токен ──────────────────────────
  if (!tokenPayload) {
    return (
      <Wrapper>
        <ErrorCard
          title="Ссылка недействительна"
          message="Приглашение повреждено или устарело. Обратитесь к менеджеру по закупкам за новой ссылкой."
        />
      </Wrapper>
    );
  }

  if (tokenPayload.expired) {
    return (
      <Wrapper>
        <ErrorCard
          title="Ссылка истекла"
          message="Срок действия приглашения закончился. Обратитесь к менеджеру по закупкам за новой ссылкой."
        />
      </Wrapper>
    );
  }

  if (!loadingInvitation && !supplier) {
    return (
      <Wrapper>
        <ErrorCard
          title="Поставщик не найден"
          message="Запись поставщика удалена или ссылка недействительна."
        />
      </Wrapper>
    );
  }

  if (!loadingInvitation && !buyerCompany) {
    return (
      <Wrapper>
        <ErrorCard
          title="Компания-заказчик не найдена"
          message="Компания, отправившая приглашение, не существует. Обратитесь к менеджеру по закупкам."
        />
      </Wrapper>
    );
  }

  if (supplier?.user_id) {
    return (
      <Wrapper>
        <ErrorCard
          title="Уже зарегистрирован"
          message="Этот поставщик уже активировал свой аккаунт. Войдите через обычную форму."
        />
      </Wrapper>
    );
  }

  // ─── Рендер: успех ─────────────────────────────────────
  if (success) {
    return (
      <Wrapper>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Регистрация успешна!
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Вы зарегистрированы как поставщик <strong>{supplier?.name}</strong>.
            Сейчас перенаправим вас на дашборд.
          </p>
          <Loader2 className="w-5 h-5 animate-spin text-[#4A6572] mx-auto" />
        </div>
      </Wrapper>
    );
  }

  // ─── Рендер: форма ─────────────────────────────────────
  return (
    <Wrapper>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-[#4A6572] text-white px-6 py-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Регистрация поставщика</h1>
              <p className="text-xs text-white/70 mt-0.5">
                {supplier?.name ? `Приглашение для "${supplier.name}"` : 'Заполните данные для входа'}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Инфо о приглашении */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-100">
              Вы приглашены как <strong>администратор поставщика</strong>
              {buyerCompany?.name && (
                <>
                  {' '}в компанию <strong>{buyerCompany.name}</strong>
                </>
              )}
              .
              {supplier?.inn && (
                <span className="block mt-0.5">ИНН: {supplier.inn}</span>
              )}
            </div>
          </div>

          {/* Ошибка */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Email */}
          <Field label="Email" icon={Mail} required>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="supplier@example.com"
              required
              className={inputCls}
            />
          </Field>

          {/* ФИО */}
          <Field label="Ваше ФИО" icon={User} required>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванов Иван Иванович"
              required
              className={inputCls}
            />
          </Field>

          {/* Телефон */}
          <Field label="Телефон" icon={Phone} required>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="+7 (___) ___-__-__"
              required
              className={inputCls}
            />
          </Field>

          {/* Название компании */}
          <Field label="Название компании" icon={Building2} required>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="ООО Металл-Трейд"
              required
              className={inputCls}
            />
          </Field>

          {/* Пароль */}
          <Field label="Пароль" icon={Lock} required>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 6 символов"
              minLength={6}
              required
              className={inputCls}
            />
            {password && !passwordValid && (
              <p className="text-[11px] text-red-500 mt-1">Минимум 6 символов</p>
            )}
          </Field>

          {/* Подтверждение пароля */}
          <Field label="Подтвердите пароль" icon={Lock} required>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Повторите пароль"
              required
              className={inputCls}
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-[11px] text-red-500 mt-1">Пароли не совпадают</p>
            )}
          </Field>

          {/* Кнопка */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white font-medium disabled:opacity-50 transition"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Регистрация…
              </>
            ) : (
              <>
                Зарегистрироваться
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-gray-500 dark:text-gray-400">
            Нажимая «Зарегистрироваться», вы соглашаетесь с политикой конфиденциальности.
          </p>
        </div>
      </form>
    </Wrapper>
  );
}

// ─── UI helpers ──────────────────────────────────────────
const inputCls =
  'w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50';

function Wrapper({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#F5F7FA] via-white to-[#E4EDF5] dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {children}
    </div>
  );
}

function Field({ label, icon: IconCmp, required, children }) {
  const Icon = IconCmp;
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        )}
        <div className={Icon ? 'pl-9' : ''}>{children}</div>
      </div>
    </div>
  );
}

function ErrorCard({ title, message }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center max-w-md w-full">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/15 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}