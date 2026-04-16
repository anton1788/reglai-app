// src/components/MaterialCart.jsx
import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  ShoppingCart, CheckCircle, Trash2, X, Undo2, AlertCircle,
  Package, ChevronDown, ChevronUp, RotateCcw
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// 📦 КОНСТАНТЫ
// ─────────────────────────────────────────────────────────────

const MAX_DESCRIPTION_LENGTH = 200;
const UNDO_TIMEOUT_MS = 3000;
const ANIMATION_DURATION = 200;

// ─────────────────────────────────────────────────────────────
// 🎨 СТИЛИ И АНИМАЦИИ
// ─────────────────────────────────────────────────────────────

const styles = `
@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(20px); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
.cart-item-enter { animation: slideIn ${ANIMATION_DURATION}ms ease-out forwards; }
.cart-item-exit { animation: fadeOut ${ANIMATION_DURATION}ms ease-out forwards; }
.cart-item-shake { animation: shake 0.3s ease-in-out; }
`;

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ
// ─────────────────────────────────────────────────────────────

const sanitizeText = (text, maxLength = MAX_DESCRIPTION_LENGTH) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[<>]/g, '')
    .slice(0, maxLength)
    .trim();
};

const formatNumber = (num) => new Intl.NumberFormat('ru-RU').format(num);

// ─────────────────────────────────────────────────────────────
// 🎨 UI КОМПОНЕНТЫ
// ─────────────────────────────────────────────────────────────

const CartHeader = memo(({ count, showCart, onToggle, t, isStandalone, onClearAll }) => (
  <header className="relative mb-4 pb-3 border-b border-gray-200/60 dark:border-gray-700/60">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3 flex-1">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/20">
          <ShoppingCart className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {t('cart')}
            <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full">
              {count}
            </span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {count} {count === 1 ? 'позиция' : count < 5 ? 'позиции' : 'позиций'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {count >= 3 && !isStandalone && (
          <button
            type="button"
            onClick={onClearAll}
            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title={t('clearCart')}
            aria-label={t('clearCart')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        {!isStandalone && count > 0 && (
          <button
            type="button"
            onClick={onToggle}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
            aria-expanded={showCart}
            aria-label={showCart ? t('hideCart') : t('showCart')}
          >
            {showCart ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  </header>
));
CartHeader.displayName = 'CartHeader';

const EmptyState = memo(({ t }) => (
  <div className="text-center py-10" role="status" aria-live="polite">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
      <ShoppingCart className="w-8 h-8 text-gray-400 dark:text-gray-500" aria-hidden="true" />
    </div>
    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
      {t('cartEmpty')}
    </p>
    <p className="text-xs text-gray-500 dark:text-gray-400">
  {t('emptyCartHint') || 'Переместите материалы из заявки в корзину'}
</p>
  </div>
));
EmptyState.displayName = 'EmptyState';

const CartItem = memo(({ 
  material, 
  index, 
  onRestore, 
  onDelete,
  pendingDelete,
  t 
}) => {
  const description = sanitizeText(material.description);
  const quantity = Math.max(1, parseInt(material.quantity, 10) || 1);
  const unit = sanitizeText(material.unit || 'шт', 20);
  const isPendingDelete = pendingDelete === index;

  const handleKeyDown = useCallback((e, action) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  }, []);

  return (
    <article 
      className={`cart-item-enter flex items-center justify-between p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border transition-all group ${
        isPendingDelete 
          ? 'border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10' 
          : 'border-gray-200/60 dark:border-gray-700/60 hover:border-indigo-300/60 dark:hover:border-indigo-600/60 hover:shadow-md'
      }`}
      role="listitem"
      aria-label={`${description}, ${quantity} ${unit}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate" title={description}>
            {description || <span className="text-gray-400 italic">{t('unnamedItem')}</span>}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              {formatNumber(quantity)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{unit}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0 ml-3" role="group" aria-label={t('itemActions')}>
        {/* Restore Button */}
        <button
          type="button"
          onClick={() => onRestore(index)}
          onKeyDown={(e) => handleKeyDown(e, () => onRestore(index))}
          className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors focus:ring-2 focus:ring-green-500"
          title={t('restore')}
          aria-label={`${t('restore')}: ${description}`}
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
        </button>
        
        {/* Delete Button with Undo */}
        {isPendingDelete ? (
          <div className="flex items-center gap-2 ml-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <button
              type="button"
              onClick={() => onDelete(index, true)}
              className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 font-medium text-xs flex items-center gap-1"
              title={t('undo')}
              aria-label={`${t('undo')}: ${description}`}
            >
              <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('undo')}</span>
            </button>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {t('confirmDelete')}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onDelete(index, false)}
            onKeyDown={(e) => handleKeyDown(e, () => onDelete(index, false))}
            className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus:ring-2 focus:ring-red-500"
            title={t('permanentlyDelete')}
            aria-label={`${t('permanentlyDelete')}: ${description}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
});
CartItem.displayName = 'CartItem';

const UndoToast = memo(({ message, onUndo, onClose, t }) => (
  <div className="fixed bottom-4 right-4 z-[80] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 modal-enter max-w-sm">
    <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
    <p className="text-sm font-medium flex-1">{message}</p>
    <button
      onClick={onUndo}
      className="px-3 py-1 text-xs font-medium bg-white/70 dark:bg-gray-700/50 rounded-lg hover:bg-white/90 dark:hover:bg-gray-600/50 transition-colors flex items-center gap-1"
    >
      <Undo2 className="w-3.5 h-3.5" />
      {t('undo')}
    </button>
    <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
      <X className="w-4 h-4" aria-hidden="true" />
    </button>
  </div>
));
UndoToast.displayName = 'UndoToast';

// ─────────────────────────────────────────────────────────────
// 🧩 ОСНОВНОЙ КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────

const MaterialCart = memo(({ 
  cart = [], 
  restoreMaterial, 
  removeMaterialPermanently, 
  t, 
  isStandaloneView = false 
}) => {
  // ─────────────────────────────────────────────────────────
  // 📊 STATE
  // ─────────────────────────────────────────────────────────
  
  const [showCart, setShowCart] = useState(isStandaloneView);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [deletedItem, setDeletedItem] = useState(null);
  const timerRef = useRef(null);

  // ─────────────────────────────────────────────────────────
  // 📞 INJECT STYLES
  // ─────────────────────────────────────────────────────────
  
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    return () => document.head.removeChild(styleEl);
  }, []);

  // ─────────────────────────────────────────────────────────
  // 🎛️ ОБРАБОТЧИКИ
  // ─────────────────────────────────────────────────────────
  
  const handleToggle = useCallback(() => {
    setShowCart(prev => !prev);
  }, []);

  const handleRestore = useCallback((index) => {
    restoreMaterial?.(index);
    if (pendingDelete === index) {
      setPendingDelete(null);
      setShowToast(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [restoreMaterial, pendingDelete]);

  const handleDelete = useCallback((index, undo) => {
    if (undo) {
      setPendingDelete(null);
      setShowToast(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    if (pendingDelete === index) {
      const item = cart[index];
      setDeletedItem(item);
      removeMaterialPermanently?.(index);
      setPendingDelete(null);
      setShowToast(true);
      
      timerRef.current = setTimeout(() => {
        setShowToast(false);
        setDeletedItem(null);
        timerRef.current = null;
      }, UNDO_TIMEOUT_MS);
    } else {
      setPendingDelete(index);
      
      timerRef.current = setTimeout(() => {
        const item = cart[index];
        setDeletedItem(item);
        removeMaterialPermanently?.(index);
        setPendingDelete(null);
        setShowToast(true);
        
        setTimeout(() => {
          setShowToast(false);
          setDeletedItem(null);
        }, UNDO_TIMEOUT_MS);
        
        timerRef.current = null;
      }, UNDO_TIMEOUT_MS);
    }
  }, [cart, pendingDelete, removeMaterialPermanently]);

  const handleClearAll = useCallback(() => {
    if (window.confirm(t('clearCartConfirm') || 'Очистить всю корзину?')) {
      while (cart.length > 0) {
        removeMaterialPermanently?.(0);
      }
    }
  }, [cart, removeMaterialPermanently, t]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // 📋 RENDER
  // ─────────────────────────────────────────────────────────

  if (!isStandaloneView && cart.length === 0) return null;

  return (
    <section 
      className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-5 mb-6 border border-gray-200/50 dark:border-gray-700/50"
      aria-labelledby="cart-heading"
    >
      <CartHeader 
        count={cart.length}
        showCart={showCart}
        onToggle={handleToggle}
        t={t}
        isStandalone={isStandaloneView}
        onClearAll={handleClearAll}
      />

      {cart.length === 0 ? (
        <EmptyState t={t} />
      ) : showCart || isStandaloneView ? (
        <div 
          className="space-y-2.5"
          role="list"
          aria-label={t('cartItems')}
        >
          {cart.map((material, index) => (
            <CartItem
              key={material.id || `${material.description}-${material.quantity}-${material.unit}-${index}`}
              material={material}
              index={index}
              onRestore={handleRestore}
              onDelete={handleDelete}
              pendingDelete={pendingDelete}
              t={t}
            />
          ))}
          
          {/* Summary */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {t('totalItems') || 'Всего позиций'}:
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {cart.length}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Undo Toast */}
      {showToast && deletedItem && (
        <UndoToast
          message={`"${sanitizeText(deletedItem.description)}" удалена из корзины`}
          onUndo={() => handleDelete(pendingDelete, true)}
          onClose={() => setShowToast(false)}
          t={t}
        />
      )}
    </section>
  );
});

MaterialCart.displayName = 'MaterialCart';

export default MaterialCart;