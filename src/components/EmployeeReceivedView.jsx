// src/components/EmployeeReceivedView.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Package, CheckCircle, XCircle, AlertCircle, Loader2, Truck, 
  Calendar, MapPin, Info, Send, SkipForward, RefreshCw 
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// 📦 КОНСТАНТЫ
// ─────────────────────────────────────────────────────────────

const TRANSFER_STATUS_CONFIG = {
  pending_confirmation: {
    label: { ru: 'На подтверждении', en: 'Pending' },
    color: 'orange',
    icon: AlertCircle
  },
  confirmed: {
    label: { ru: 'Подтверждено', en: 'Confirmed' },
    color: 'green',
    icon: CheckCircle
  },
  partially_confirmed: {
    label: { ru: 'Частично', en: 'Partial' },
    color: 'yellow',
    icon: AlertCircle
  },
  rejected: {
    label: { ru: 'Отклонено', en: 'Rejected' },
    color: 'red',
    icon: XCircle
  }
};

const MAX_QUANTITY = 10000;

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ (чистые функции)
// ─────────────────────────────────────────────────────────────

const escapeHtml = (text) => {
  if (typeof text !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
};

const sanitizeNumber = (value, min = 0, max = MAX_QUANTITY) => {
  const num = parseInt(value, 10);
  if (isNaN(num)) return 0;
  return Math.max(min, Math.min(num, max));
};

// 🔹 НОВЫЙ ХЕЛПЕР: нормализация строк для сравнения
const normalize = (str) => (str || '').toString().trim().toLowerCase();

const validateQuantities = (item, confirmed, rejected) => {
  const rawIssued = item?.issued_quantity;
  const issued = (typeof rawIssued === 'number') ? rawIssued : parseFloat(rawIssued);
  
  if (isNaN(issued) || issued < 0) return false;

  const conf = parseFloat(confirmed);
  const rej = parseFloat(rejected);
  
  const finalConf = isNaN(conf) ? 0 : conf;
  const finalRej = isNaN(rej) ? 0 : rej;

  const total = finalConf + finalRej;
  const epsilon = 0.001; 
  
  return (total <= issued + epsilon) && finalConf >= 0 && finalRej >= 0;
};

const formatDate = (dateString, language) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ (мемоизированные)
// ─────────────────────────────────────────────────────────────

const TransferSkeleton = () => (
  <div className="animate-pulse bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border-2 border-gray-200 dark:border-gray-700">
    <div className="flex justify-between items-start mb-4">
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20" />
    </div>
    <div className="space-y-3">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const StatusBadge = React.memo(({ status }) => {
  const config = TRANSFER_STATUS_CONFIG[status] || TRANSFER_STATUS_CONFIG.pending_confirmation;
  const Icon = config.icon;
  const colorClasses = {
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  };

  const statusLabel = config.label?.en || config.label?.ru || status;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold ${colorClasses[config.color]}`}>
      <Icon className="w-3 h-3" aria-hidden="true" />
      {statusLabel}
    </span>
  );
});
StatusBadge.displayName = 'StatusBadge';

const TransferItem = React.memo(({ 
  item, 
  index, 
  confirmation, 
  onUpdate, 
  onQuickAction, 
  isSubmitting,  
  t 
}) => {
  const issuedQty = Number(item.issued_quantity) || 0;
  const confirmedQty = Number(confirmation?.confirmed_quantity) || 0;
  const rejectedQty = Number(confirmation?.rejected_quantity) || 0;
  const isValid = validateQuantities(item, confirmedQty, rejectedQty);
  const isConfirmed = confirmedQty > 0;
  const isRejected = rejectedQty > 0;

  const borderClass = isConfirmed 
    ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20' 
    : isRejected 
      ? 'border-red-500 bg-red-50/50 dark:bg-red-900/20'
      : !isValid 
        ? 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30';

  return (
    <article 
      className={`p-4 rounded-lg border-2 transition-all ${borderClass}`}
      role="listitem"
      aria-labelledby={`item-title-${item.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 id={`item-title-${item.id}`} className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
            {index + 1}. {escapeHtml(item.item_name || '—')}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{t('issued')}:</span>{' '}
            <span className="font-bold">{issuedQty}</span>{' '}
            <span className="text-gray-500">{escapeHtml(item.unit || 'шт')}</span>
          </p>
          {!isValid && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1" role="alert">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              {t('quantityExceeded')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0" role="group" aria-label={t('quickActions')}>
          <button
            type="button"
            onClick={() => onQuickAction(item.id, 'confirm', issuedQty)}
            disabled={isSubmitting}
            className={`p-2 rounded-lg transition-all focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              isConfirmed
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
            } disabled:opacity-50`}
            aria-label={`${t('confirmAll')} - ${item.item_name}`}
            title={t('confirmAll')}
          >
            <CheckCircle className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onQuickAction(item.id, 'reject', issuedQty)}
            disabled={isSubmitting}
            className={`p-2 rounded-lg transition-all focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              isRejected
                ? 'bg-red-600 text-white shadow-lg'
                : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
            } disabled:opacity-50`}
            aria-label={`${t('reject')} - ${item.item_name}`}
            title={t('reject')}
          >
            <XCircle className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`confirmed-${item.id}`} className="block text-xs font-medium text-green-700 dark:text-green-400 mb-1">
            {t('confirmed')}
          </label>
          <input
            id={`confirmed-${item.id}`}
            type="number"
            inputMode="numeric"
            min="0"
            max={issuedQty}
            value={confirmation?.confirmed_quantity ?? ''}
            onChange={(e) => onUpdate(item.id, 'confirmed_quantity', sanitizeNumber(e.target.value))}
            disabled={isSubmitting}
            className={`w-full px-3 py-2 border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 transition-colors ${
              !isValid ? 'border-yellow-500' : 'border-green-300 dark:border-green-700'
            }`}
            placeholder="0"
            aria-invalid={!isValid}
            aria-describedby={`confirmed-help-${item.id}`}
          />
          <span id={`confirmed-help-${item.id}`} className="sr-only">{t('confirmedQuantityHelp')}</span>
        </div>
        <div>
          <label htmlFor={`rejected-${item.id}`} className="block text-xs font-medium text-red-700 dark:text-red-400 mb-1">
            {t('rejected')}
          </label>
          <input
            id={`rejected-${item.id}`}
            type="number"
            inputMode="numeric"
            min="0"
            max={issuedQty}
            value={confirmation?.rejected_quantity ?? ''}
            onChange={(e) => onUpdate(item.id, 'rejected_quantity', sanitizeNumber(e.target.value))}
            disabled={isSubmitting}
            className={`w-full px-3 py-2 border-2 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 transition-colors ${
              !isValid ? 'border-yellow-500' : 'border-red-300 dark:border-red-700'
            }`}
            placeholder="0"
            aria-invalid={!isValid}
            aria-describedby={`rejected-help-${item.id}`}
          />
          <span id={`rejected-help-${item.id}`} className="sr-only">{t('rejectedQuantityHelp')}</span>
        </div>
      </div>

      {(rejectedQty > 0 || isRejected) && (
        <div className="mt-3">
          <label htmlFor={`comment-${item.id}`} className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('rejectionReason')}
          </label>
          <textarea
            id={`comment-${item.id}`}
            value={confirmation?.employee_comment || ''}
            onChange={(e) => onUpdate(item.id, 'employee_comment', escapeHtml(e.target.value.slice(0, 500)))}
            disabled={isSubmitting}
            placeholder={t('rejectionReasonPlaceholder')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 transition-colors resize-none"
            rows="2"
            maxLength={500}
            aria-describedby={`comment-help-${item.id}`}
          />
          <span id={`comment-help-${item.id}`} className="sr-only">{t('rejectionReasonHelp')}</span>
        </div>
      )}
    </article>
  );
});
TransferItem.displayName = 'TransferItem';

const TransferCard = React.memo(({ 
  transfer, 
  confirmations, 
  onUpdateConfirmation, 
  onQuickAction, 
  onSubmit, 
  onSkip, 
  isSubmitting, 
  hasConfirmations, 
  language, 
  t,
  WAREHOUSE_ENABLED 
}) => {
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    onSubmit(transfer);
  }, [onSubmit, transfer]);

  return (
    <article 
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border-2 border-orange-200 dark:border-orange-800 hover:shadow-xl transition-shadow"
      role="region"
      aria-labelledby={`transfer-title-${transfer.id}`}
    >
      <header className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="w-4 h-4 text-orange-600 flex-shrink-0" aria-hidden="true" />
            <h3 id={`transfer-title-${transfer.id}`} className="font-bold text-lg text-gray-900 dark:text-white truncate">
              {escapeHtml(transfer.target_object_name || '—')}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            {transfer.applications?.object_name && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{escapeHtml(transfer.applications.object_name)}</span>
              </span>
            )}
            {transfer.issued_at && (
              <time dateTime={transfer.issued_at} className="flex items-center gap-1">
                <Calendar className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                {formatDate(transfer.issued_at, language)}
              </time>
            )}
          </div>
        </div>
        <StatusBadge status={transfer.transfer_status} />
      </header>

      <section className="space-y-3" role="list" aria-label={t('transferItems')}>
        {(transfer.transfer_items || []).map((item, index) => (
          <TransferItem
            key={item.id}
            item={item}
            index={index}
            confirmation={confirmations[item.id]}
            onUpdate={onUpdateConfirmation}
            onQuickAction={onQuickAction}
            isSubmitting={isSubmitting}
            t={t}
          />
        ))}
      </section>

      <footer className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !hasConfirmations}
          className="flex-1 min-w-[200px] py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-all disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center gap-2"
          aria-label={t('submitConfirmation')}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>{t('submitting')}</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" aria-hidden="true" />
              <span>{t('submitConfirmation')}</span>
            </>
          )}
        </button>
        
        <button
          type="button"
          onClick={() => onSkip(transfer)}
          disabled={isSubmitting}
          className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-all disabled:opacity-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center gap-2"
          aria-label={t('skipTransfer')}
        >
          <SkipForward className="w-4 h-4" aria-hidden="true" />
          <span>{t('skip')}</span>
        </button>
      </footer>

      {WAREHOUSE_ENABLED && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2" role="note">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>{t('warehouseNote')}</span>
        </div>
      )}
    </article>
  );
});
TransferCard.displayName = 'TransferCard';

const HistoryCard = React.memo(({ transfer, language }) => {
  const statusConfig = TRANSFER_STATUS_CONFIG[transfer.transfer_status] || {};
  const colorClasses = {
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    partially_confirmed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  };
  
  const lang = language || 'ru';
  const statusLabel = statusConfig.label?.[lang] || statusConfig.label?.en || statusConfig.label?.ru || transfer.transfer_status;
  const badgeClass = colorClasses[transfer.transfer_status] || colorClasses.default;
  
  return (
    <article className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border border-gray-200 dark:border-gray-700" role="listitem">
      <header className="flex justify-between items-start mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
            {escapeHtml(transfer.target_object_name || '—')}
          </h4>
          {transfer.confirmed_at && (
            <time dateTime={transfer.confirmed_at} className="text-sm text-gray-500 dark:text-gray-400 mt-1 block">
              {formatDate(transfer.confirmed_at, language)}
            </time>
          )}
        </div>
        <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${badgeClass}`}>
          {statusLabel}
        </span>
      </header>
      
      <div className="space-y-2">
        {(transfer.transfer_items || []).map(item => (
          <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
            <span className="text-gray-700 dark:text-gray-300 truncate flex-1 mr-2">
              {escapeHtml(item.item_name || '—')}
            </span>
            <span className={`font-medium flex-shrink-0 ${
              item.item_status === 'confirmed' ? 'text-green-600' :
              item.item_status === 'rejected' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {(item.confirmed_quantity || 0)}/{item.issued_quantity || 0} {escapeHtml(item.unit || 'шт')}
            </span>
          </div>
        ))}
        {(transfer.transfer_items || []).some(i => i.employee_comment) && (
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm text-yellow-800 dark:text-yellow-400">
            {(transfer.transfer_items || [])
              .filter(i => i.employee_comment)
              .map(i => `${escapeHtml(i.item_name)}: ${escapeHtml(i.employee_comment)}`)
              .join('; ')}
          </div>
        )}
      </div>
    </article>
  );
});
HistoryCard.displayName = 'HistoryCard';

const EmptyState = React.memo(({ t, WAREHOUSE_ENABLED }) => (
  <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700" role="status">
    <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" aria-hidden="true" />
    <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
      {t('noMaterialsAwaiting')}
    </p>
    <p className="text-sm text-gray-500 dark:text-gray-500">
      {t('materialsWillAppearHere')}
    </p>
    {WAREHOUSE_ENABLED && (
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Info className="w-4 h-4" aria-hidden="true" />
        <span>{t('warehouseActiveNote')}</span>
      </div>
    )}
  </div>
));
EmptyState.displayName = 'EmptyState';

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────

const EmployeeReceivedView = React.memo(({ 
  supabase, 
  userCompanyId, 
  user, 
  t, 
  language = 'ru', 
  showNotification,
  WAREHOUSE_ENABLED = false,
  onApplicationUpdated
}) => {
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [confirmedTransfers, setConfirmedTransfers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [submittingTransferId, setSubmittingTransferId] = useState(null);
  const [confirmations, setConfirmations] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const abortControllerRef = useRef(null);

  const ensureCompanyUser = useCallback(async () => {
    if (!userCompanyId || !user?.id) return null;
    
    try {
      const { data: existing, error: checkError } = await supabase
        .from('company_users')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_id', userCompanyId)
        .maybeSingle();
      
      if (existing?.id) {
        return existing.id;
      }
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      const { data: newCompanyUser, error: insertError } = await supabase
        .from('company_users')
        .insert({
          user_id: user.id,
          company_id: userCompanyId,
          role: 'foreman',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Мастер',
          phone: user.user_metadata?.phone || '',
          is_active: true
        })
        .select('id')
        .single();
      
      if (insertError) {
        if (insertError.code === '23505') {
          const { data: fallback } = await supabase
            .from('company_users')
            .select('id')
            .eq('user_id', user.id)
            .eq('company_id', userCompanyId)
            .maybeSingle();
          return fallback?.id || null;
        }
        console.error('Failed to create company_users:', insertError);
        return null;
      }
      
      return newCompanyUser?.id || null;
      
    } catch (err) {
      console.error('ensureCompanyUser error:', err);
      return null;
    }
  }, [userCompanyId, user, supabase]);

  const loadTransfers = useCallback(async (isRefresh = false) => {
    if (!userCompanyId || !user?.id) return;
    
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      const companyUserId = await ensureCompanyUser();
      if (!companyUserId) {
        showNotification(t('profileNotFoundError'), 'error');
        return;
      }
      
      const [pendingResult, confirmedResult] = await Promise.all([
        supabase
          .from('material_transfers')
          .select(`
            *,
            transfer_items (
              id, item_name, unit, issued_quantity, 
              confirmed_quantity, rejected_quantity,
              employee_comment, item_status
            ),
            applications (object_name)
          `)
          .eq('company_id', userCompanyId)
          .eq('issued_to', companyUserId)
          .eq('transfer_status', 'pending_confirmation')
          .order('issued_at', { ascending: false }),
        
        supabase
          .from('material_transfers')
          .select(`
            *,
            transfer_items (
              id, item_name, unit, issued_quantity,
              confirmed_quantity, rejected_quantity,
              employee_comment, item_status
            ),
            applications (object_name)
          `)
          .eq('company_id', userCompanyId)
          .eq('issued_to', companyUserId)
          .in('transfer_status', ['confirmed', 'partially_confirmed', 'rejected'])
          .order('confirmed_at', { ascending: false })
          .limit(50)
      ]);
      
      if (pendingResult.error) throw pendingResult.error;
      if (confirmedResult.error) throw confirmedResult.error;
      
      setPendingTransfers((pendingResult.data || []).map(t => ({
        ...t,
        transfer_items: t.transfer_items || []
      })));
      
      setConfirmedTransfers((confirmedResult.data || []).map(t => ({
        ...t,
        transfer_items: t.transfer_items || []
      })));
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load transfers:', error);
        showNotification(t('loadTransfersError'), 'error');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userCompanyId, user, supabase, t, showNotification, ensureCompanyUser]);

  useEffect(() => {
    loadTransfers();
    return () => abortControllerRef.current?.abort();
  }, [loadTransfers]);

  const updateConfirmation = useCallback((itemId, field, value) => {
    setConfirmations(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  }, []);

  const handleQuickAction = useCallback((itemId, action, issuedQuantity) => {
    if (action === 'confirm') {
      updateConfirmation(itemId, 'confirmed_quantity', issuedQuantity);
      updateConfirmation(itemId, 'rejected_quantity', 0);
      updateConfirmation(itemId, 'item_status', 'confirmed');
    } else {
      updateConfirmation(itemId, 'confirmed_quantity', 0);
      updateConfirmation(itemId, 'rejected_quantity', issuedQuantity);
      updateConfirmation(itemId, 'item_status', 'rejected');
    }
  }, [updateConfirmation]);

  const hasValidConfirmations = useCallback((transfer) => {
    return (transfer.transfer_items || []).some(item => {
      const conf = confirmations[item.id];
      return conf && validateQuantities(item, conf.confirmed_quantity, conf.rejected_quantity);
    });
  }, [confirmations]);

  // 🔹 ОБНОВЛЁННАЯ ФУНКЦИЯ: submitConfirmation с нормализацией и защитой от дублей
  const submitConfirmation = useCallback(async (transfer) => {
    // ... валидация ...
    if (!hasValidConfirmations(transfer)) {
      showNotification(t('confirmAtLeastOneItem'), 'warning');
      return;
    }

    if (!window.confirm(t('confirmSubmission'))) return;

    setSubmittingTransferId(transfer.id);
    
    try {
      const confirmationsData = (transfer.transfer_items || []).map(item => {
        const conf = confirmations[item.id] || {};
        return {
          item_id: item.id,
          confirmed_quantity: sanitizeNumber(conf.confirmed_quantity),
          rejected_quantity: sanitizeNumber(conf.rejected_quantity),
          employee_comment: escapeHtml(conf.employee_comment || ''),
          item_status: conf.item_status || 
            (sanitizeNumber(conf.confirmed_quantity) > 0 ? 'confirmed' : 
             sanitizeNumber(conf.rejected_quantity) > 0 ? 'rejected' : 'pending')
        };
      });

      const { data, error: rpcError } = await supabase.rpc('confirm_transfer_items', {
        p_transfer_id: transfer.id,
        p_confirmations: JSON.stringify(confirmationsData)
      });

      if (rpcError || !data?.success) {
        throw new Error(data?.error || rpcError?.message || t('confirmationFailed'));
      }

      // 🔹 Списываем со склада ТОЛЬКО если не было подтверждено ранее
      if (WAREHOUSE_ENABLED) {
        const { data: app } = await supabase
          .from('applications')
          .select('materials')
          .eq('id', transfer.application_id)
          .single();
        
        const existingMaterials = app?.materials || [];

        for (const item of transfer.transfer_items || []) {
          const conf = confirmations[item.id] || {};
          const qty = sanitizeNumber(conf.confirmed_quantity);
          
          if (qty > 0) {
            // 🔍 Ищем по нормализованным полям
            const existingMat = existingMaterials.find(m => 
              normalize(m.description) === normalize(item.item_name) && 
              normalize(m.unit) === normalize(item.unit)
            );
            
            // ✅ Списываем только если материал ещё не был подтверждён
            if (!existingMat?.confirmed_by_employee_id) {
              await supabase.rpc('update_warehouse_balance', {
                p_company_id: userCompanyId,
                p_item_name: item.item_name,
                p_quantity: qty,
                p_transaction_type: 'expense',
                p_user_id: user?.id || null,
                p_user_email: user?.email || null,
                p_comment: `Мастер подтвердил: ${transfer.target_object_name}`,
                p_transfer_id: transfer.id,
                p_target_object_name: transfer.target_object_name || '',
                p_recipient_name: user?.user_metadata?.full_name || user?.email || 'Мастер',
                p_recipient_phone: user?.user_metadata?.phone || '',
                p_unit: item.unit || 'шт',
                p_application_id: transfer.application_id || null
              });
            }
          }
        }
      }

      // 🔹 Обновляем заявку в UI
      if (transfer.application_id && onApplicationUpdated) {
        const { data: app } = await supabase
          .from('applications')
          .select('materials, status')
          .eq('id', transfer.application_id)
          .single();
        
        if (app) {
          const updatedMaterials = (app.materials || []).map(mat => {
            const transferItem = (transfer.transfer_items || []).find(ti => 
              normalize(ti.item_name) === normalize(mat.description) && 
              normalize(ti.unit) === normalize(mat.unit)
            );
            
            if (transferItem) {
              const conf = confirmations[transferItem.id] || {};
              const confirmedQty = sanitizeNumber(conf.confirmed_quantity);
              
              return {
                ...mat,
                received: confirmedQty, // ✅ Перезапись, не накопление
                status: confirmedQty >= (mat.quantity || 0) ? 'received' :
                        confirmedQty > 0 ? 'partial' : 'pending_employee_confirmation',
                confirmed_by_employee_at: confirmedQty > 0 ? new Date().toISOString() : mat.confirmed_by_employee_at,
                confirmed_by_employee_id: confirmedQty > 0 ? user?.id : mat.confirmed_by_employee_id
              };
            }
            return mat;
          });
          
          // ✅ Корректный расчёт статуса заявки
          const allFullyReceived = updatedMaterials.every(m => 
            (m.received || 0) >= (m.quantity || 0) && (m.quantity || 0) > 0
          );
          const hasAnyConfirmed = updatedMaterials.some(m => (m.received || 0) > 0);
          const newAppStatus = allFullyReceived ? 'received' : 
                               hasAnyConfirmed ? 'partial' : 'pending_employee_confirmation';
          
          onApplicationUpdated({
            id: transfer.application_id,
            status: newAppStatus,
            materials: updatedMaterials,
            updated_at: new Date().toISOString()
          });
        }
      }

      showNotification(t('confirmationSuccess'), 'success');
      setConfirmations({});
      await loadTransfers();
      
    } catch (error) {
      console.error('Confirmation failed:', error);
      showNotification(error.message || t('confirmationFailed'), 'error');
    } finally {
      setSubmittingTransferId(null);
    }
  }, [
    hasValidConfirmations, 
    WAREHOUSE_ENABLED, 
    userCompanyId, 
    user, 
    supabase, 
    confirmations, 
    loadTransfers, 
    t, 
    showNotification,
    onApplicationUpdated
  ]);

  const skipTransfer = useCallback(async (transfer) => {
    if (!window.confirm(t('skipConfirmation'))) return;
    
    setSubmittingTransferId(transfer.id);
    
    try {
      const confirmationsData = (transfer.transfer_items || []).map(item => ({
        item_id: item.id,
        confirmed_quantity: 0,
        rejected_quantity: item.issued_quantity,
        employee_comment: 'Пропущено мастером',
        item_status: 'rejected'
      }));

      const { error } = await supabase.rpc('confirm_transfer_items', {
        p_transfer_id: transfer.id,
        p_confirmations: confirmationsData
      });

      if (error) throw error;

      showNotification(t('transferSkipped'), 'info');
      await loadTransfers();
    } catch (err) {
      showNotification(err.message || t('error'), 'error');
    } finally {
      setSubmittingTransferId(null);
    }
  }, [supabase, loadTransfers, t, showNotification]);

  const handleRefresh = useCallback(() => {
    loadTransfers(true);
  }, [loadTransfers]);

  const pendingWithStatus = useMemo(() => {
    return pendingTransfers.map(transfer => {
      const hasConfirmations = (transfer.transfer_items || []).some(item => {
        const conf = confirmations[item.id];
        if (!conf) return false;
        
        const cQty = Number(conf.confirmed_quantity);
        const rQty = Number(conf.rejected_quantity);
        
        if (isNaN(cQty) || isNaN(rQty)) return false;
        
        return validateQuantities(item, cQty, rQty);
      });
      
      return {
        ...transfer,
        isSubmitting: submittingTransferId === transfer.id,
        hasConfirmations
      };
    });
  }, [pendingTransfers, submittingTransferId, confirmations]);

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        {[...Array(2)].map((_, i) => <TransferSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <section className="max-w-7xl mx-auto p-4 space-y-6" aria-labelledby="page-title">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 id="page-title" className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-600" aria-hidden="true" />
          {t('receivedMaterials')}
        </h1>
        
        <div className="flex items-center gap-2">
          {WAREHOUSE_ENABLED && (
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" aria-hidden="true" />
              {t('warehouseActive')}
            </span>
          )}
          
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            aria-label={t('refresh')}
            title={t('refresh')}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </header>

      {pendingWithStatus.length > 0 && (
        <section aria-labelledby="pending-heading">
          <h2 id="pending-heading" className="text-lg font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
            {t('awaitingConfirmation')}
            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 rounded-full text-sm">
              {pendingWithStatus.length}
            </span>
          </h2>

          <div className="space-y-4" role="list" aria-label={t('pendingTransfers')}>
            {pendingWithStatus.map(transfer => (
              <TransferCard
                key={transfer.id}
                transfer={transfer}
                confirmations={confirmations}
                onUpdateConfirmation={updateConfirmation}
                onQuickAction={handleQuickAction}
                onSubmit={submitConfirmation}
                onSkip={skipTransfer}
                isSubmitting={transfer.isSubmitting}
                hasConfirmations={transfer.hasConfirmations}
                language={language}
                t={t}
                WAREHOUSE_ENABLED={WAREHOUSE_ENABLED}
              />
            ))}
          </div>
        </section>
      )}

      {confirmedTransfers.length > 0 && (
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />
            {t('confirmationHistory')}
          </h2>
          
          <div className="space-y-3" role="list" aria-label={t('confirmedTransfers')}>
            {confirmedTransfers.map(transfer => (
              <HistoryCard key={transfer.id} transfer={transfer} language={language} />
            ))}
          </div>
        </section>
      )}

      {pendingWithStatus.length === 0 && confirmedTransfers.length === 0 && (
        <EmptyState t={t} WAREHOUSE_ENABLED={WAREHOUSE_ENABLED} />
      )}
    </section>
  );
});

EmployeeReceivedView.displayName = 'EmployeeReceivedView';

export default EmployeeReceivedView;