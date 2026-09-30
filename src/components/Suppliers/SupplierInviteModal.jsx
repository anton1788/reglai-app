// src/components/Suppliers/SupplierInviteModal.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  X, Send, Link2, Mail, Copy, Check, Loader2, AlertCircle,
  UserPlus, MessageCircle, Clock, ShieldCheck,
} from 'lucide-react';

import { supabase } from '../../utils/supabaseClient';
import { getSuppliers, logSupplierInteraction, getSupplierHistory } from '../../api/suppliers';

// ============================================================
// 🛠️ ГЕНЕРАЦИЯ ТОКЕНА ПРИГЛАШЕНИЯ
// ============================================================

const DEFAULT_TTL_DAYS = 14;

/**
 * Кодирование в base64url (без padding) — безопасно для URL.
 */
const base64url = (str) => {
  try {
    const utf8 = unescape(encodeURIComponent(str));
    const b64 = btoa(utf8);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error('[invite] base64url error:', e);
    return '';
  }
};

const safeRandomNonce = () => {
  try {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Math.random().toString(36).slice(2, 18);
  }
};

/**
 * Генерирует токен приглашения.
 * ⚠️ Без подписи — только для маршрутизации.
 * Для продакшена — заменить на Supabase Edge Function с HMAC.
 */
const generateInviteToken = ({ supplierId, companyId, invitedBy, ttlDays = DEFAULT_TTL_DAYS }) => {
  const now = Date.now();
  const payload = {
    s: supplierId,                       // supplier id
    c: companyId,                        // company id
    u: invitedBy || null,                // кто приглашает
    iat: now,                            // issued at
    exp: now + ttlDays * 86400_000,      // expires at
    n: safeRandomNonce(),                // nonce (защита от повторов)
    v: 1,                                // version схемы
  };
  return base64url(JSON.stringify(payload));
};

/**
 * Формирует полную ссылку-приглашение.
 */
const buildInviteUrl = (token) => {
  const base = typeof window !== 'undefined'
    ? `${window.location.origin}`
    : 'https://reglai-app.vercel.app';
  return `${base}/register-supplier?token=${token}`;
};

// ============================================================
// 🎨 КОМПОНЕНТ
// ============================================================

/**
 * Модалка «Пригласить поставщика».
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.companyId
 * @param {string} props.userId
 * @param {string} [props.preselectedSupplierId] — если открываем из карточки поставщика
 * @param {(msg: string, type?: 'success'|'error'|'info'|'warning') => void} props.showNotification
 */
export default function SupplierInviteModal({
  open,
  onClose,
  companyId,
  userId,
  preselectedSupplierId = null,
  showNotification,
}) {
  const notify = (msg, type = 'info') => {
    if (typeof showNotification === 'function') showNotification(msg, type);
    else console.log(`[${type}] ${msg}`);
  };

  // ─── Состояние ─────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [supplierId, setSupplierId] = useState(preselectedSupplierId || '');
  const [channel, setChannel] = useState('link'); // 'link' | 'email'
  const [emailOverride, setEmailOverride] = useState('');
  const [ttlDays, setTtlDays] = useState(DEFAULT_TTL_DAYS);

  const [generating, setGenerating] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState(null); // { url, token, expiresAt }
  const [copied, setCopied] = useState(false);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ─── Сброс при открытии ────────────────────────────────
  useEffect(() => {
    if (!open) return;

    setSupplierId(preselectedSupplierId || '');
    setChannel('link');
    setEmailOverride('');
    setTtlDays(DEFAULT_TTL_DAYS);
    setGeneratedInvite(null);
    setCopied(false);
    setHistory([]);
    setLoadError(null);
  }, [open, preselectedSupplierId]);

  // ─── Загрузка списка поставщиков ───────────────────────
  useEffect(() => {
    if (!open || !companyId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getSuppliers(companyId, { status: 'active' });
        if (!cancelled) setSuppliers(data || []);
      } catch (err) {
        console.error('[invite] load suppliers error:', err);
        if (!cancelled) setLoadError(err.message || 'Не удалось загрузить поставщиков');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [open, companyId]);

  // ─── Автозагрузка истории при выборе поставщика ────────
  useEffect(() => {
    if (!open || !supplierId) {
      setHistory([]);
      return;
    }
    let cancelled = false;

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const data = await getSupplierHistory(supplierId, 5);
        if (!cancelled) {
          setHistory((data || []).filter((h) => h.type === 'invited'));
        }
      } catch (err) {
        console.warn('[invite] history load failed:', err);
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };

    loadHistory();
    return () => { cancelled = true; };
  }, [open, supplierId]);

  // ─── Выбранный поставщик ───────────────────────────────
  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === supplierId) || null,
    [suppliers, supplierId]
  );

  const emailToSend = useMemo(
    () => (emailOverride.trim() || selectedSupplier?.email || '').trim(),
    [emailOverride, selectedSupplier]
  );

  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToSend),
    [emailToSend]
  );

  // ─── Генерация приглашения ─────────────────────────────
  const handleGenerate = async () => {
    if (!supplierId) {
      notify('Выберите поставщика', 'error');
      return;
    }
    if (!companyId) {
      notify('Не определена компания', 'error');
      return;
    }
    if (channel === 'email' && !emailValid) {
      notify('Введите корректный email', 'error');
      return;
    }

        setGenerating(true);
    try {
      // 🆕 1. Определяем email для приглашения
      const inviteEmail = (
        channel === 'email'
          ? emailToSend
          : (selectedSupplier?.email || '')
      ).toLowerCase().trim();

      if (!inviteEmail) {
        notify('У поставщика нет email. Укажите email вручную.', 'error');
        setGenerating(false);
        return;
      }

      // 🆕 2. Проверяем, нет ли уже активного приглашения
      const { data: existing } = await supabase
        .from('invitations')
        .select('id')
        .eq('email', inviteEmail)
        .eq('company_id', companyId)
        .eq('accepted', false)
        .maybeSingle();

      let invitationId = existing?.id;

      // 🆕 3. Если нет — создаём новое приглашение
      if (!existing) {
        const { data: invitation, error: inviteError } = await supabase
          .from('invitations')
          .insert([{
            email: inviteEmail,
            role: 'supplier_admin',
            company_id: companyId,
            supplier_id: supplierId,
            invited_by: userId,
            accepted: false,
            created_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (inviteError) throw inviteError;
        invitationId = invitation.id;
      }

      // 4. Генерируем токен
      const token = generateInviteToken({
        supplierId,
        companyId,
        invitedBy: userId,
        ttlDays,
      });
      const url = buildInviteUrl(token);
      const expiresAt = new Date(Date.now() + ttlDays * 86400_000);

      setGeneratedInvite({ url, token, expiresAt, invitationId });

      // Логирование
      try {
        await logSupplierInteraction({
          supplierId,
          companyId,
          userId,
          type: 'invited',
          description:
            channel === 'email'
              ? `Приглашение отправлено на ${emailToSend}`
              : `Сгенерирована ссылка-приглашение (${ttlDays} дн.)`,
                    metadata: {
            channel,
            ttl_days: ttlDays,
            email: channel === 'email' ? emailToSend : null,
            expires_at: expiresAt.toISOString(),
            invitation_id: invitationId,  // 🆕
          },
        });
      } catch (logErr) {
        console.warn('[invite] log failed:', logErr);
      }

      if (channel === 'email') {
        // TODO: вызов Supabase Edge Function `send-supplier-invite`
        // await supabase.functions.invoke('send-supplier-invite', {
        //   body: { to: emailToSend, url, supplierName: selectedSupplier?.name },
        // });
        notify(
          `📧 Email-отправка пока не реализована — скопируйте ссылку вручную`,
          'warning'
        );
      } else {
        notify('✅ Ссылка-приглашение сгенерирована', 'success');
      }

      // Обновляем историю
      if (supplierId) {
        const data = await getSupplierHistory(supplierId, 5).catch(() => []);
        setHistory((data || []).filter((h) => h.type === 'invited'));
      }
    } catch (err) {
      console.error('[invite] generate error:', err);
      notify(err.message || 'Ошибка генерации приглашения', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // ─── Копирование ссылки ────────────────────────────────
  const handleCopy = async () => {
    if (!generatedInvite?.url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedInvite.url);
      } else {
        // Fallback для http:// и старых браузеров
        const ta = document.createElement('textarea');
        ta.value = generatedInvite.url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      notify('📋 Ссылка скопирована в буфер обмена', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('[invite] copy error:', err);
      notify('Не удалось скопировать. Скопируйте ссылку вручную.', 'error');
    }
  };

  if (!open) return null;

  // ─── Рендер ────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] fade-enter flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-[#4A6572] text-white">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Пригласить поставщика</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Ошибка загрузки */}
          {loadError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
            </div>
          )}

          {/* Поставщик */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Поставщик <span className="text-red-500">*</span>
            </label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Загрузка списка…
              </div>
            ) : (
              <select
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  setGeneratedInvite(null);
                  setEmailOverride('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50"
              >
                <option value="">— Выберите поставщика —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.email ? ` · ${s.email}` : ''}
                  </option>
                ))}
              </select>
            )}
            {selectedSupplier && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3">
                {selectedSupplier.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {selectedSupplier.email}
                  </span>
                )}
                {selectedSupplier.phone && (
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {selectedSupplier.phone}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Канал отправки */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Способ отправки
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChannel('link')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition
                  ${
                    channel === 'link'
                      ? 'bg-[#4A6572] text-white border-[#4A6572]'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-[#4A6572]/50'
                  }`}
              >
                <Link2 className="w-4 h-4" />
                Ссылка
              </button>
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition
                  ${
                    channel === 'email'
                      ? 'bg-[#4A6572] text-white border-[#4A6572]'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-[#4A6572]/50'
                  }`}
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            </div>
          </div>

          {/* Email-override */}
          {channel === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Email получателя
              </label>
              <input
                type="email"
                value={emailOverride}
                onChange={(e) => setEmailOverride(e.target.value)}
                placeholder={selectedSupplier?.email || 'supplier@example.com'}
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F9AA33]/50
                  ${emailOverride && !emailValid ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Оставьте пустым, чтобы использовать email из карточки поставщика
              </p>
            </div>
          )}

          {/* Срок действия */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Срок действия ссылки
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {[7, 14, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setTtlDays(days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
                    ${
                      ttlDays === days
                        ? 'bg-[#4A6572] text-white border-[#4A6572]'
                        : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-[#4A6572]/50'
                    }`}
                >
                  {days} дн.
                </button>
              ))}
            </div>
          </div>

          {/* Сгенерированная ссылка */}
          {generatedInvite && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Ссылка-приглашение готова
                <span className="ml-auto flex items-center gap-1 text-gray-500 dark:text-gray-400 font-normal">
                  <Clock className="w-3 h-3" />
                  до {generatedInvite.expiresAt.toLocaleDateString('ru-RU')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={generatedInvite.url}
                  onClick={(e) => e.target.select()}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-gray-900 text-xs font-mono text-gray-800 dark:text-gray-200 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-xs font-medium transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Скопировано
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Копировать
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Отправьте эту ссылку поставщику. После перехода он зарегистрируется и получит доступ к
                порталу с ограниченными правами.
              </p>
            </div>
          )}

          {/* История приглашений */}
          {supplierId && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  История приглашений
                </span>
              </div>
              {loadingHistory ? (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Загрузка…
                </div>
              ) : history.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Ещё не приглашали этого поставщика
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {history.slice(0, 5).map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-lg px-2 py-1.5"
                    >
                      <Mail className="w-3 h-3 shrink-0 text-gray-400" />
                      <span className="truncate flex-1">{h.description || 'Приглашение'}</span>
                      <span className="text-gray-400 shrink-0">
                        {new Date(h.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
          >
            Закрыть
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !supplierId}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium disabled:opacity-50 transition"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Генерация…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {generatedInvite ? 'Сгенерировать заново' : 'Сгенерировать ссылку'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
