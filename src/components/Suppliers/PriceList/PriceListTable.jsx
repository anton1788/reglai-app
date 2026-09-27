// src/components/Suppliers/PriceList/PriceListTable.jsx
import { useState, useRef, useEffect } from 'react';
import {
  MoreVertical, Pencil, Trash2, Package, Tag, Boxes, MapPin,
} from 'lucide-react';

const formatPrice = (value) => {
  const n = Number(value) || 0;
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatQuantity = (value) => {
  const n = Number(value) || 0;
  if (Number.isInteger(n)) return n.toLocaleString('ru-RU');
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
};

/**
 * Таблица позиций прайс-листа.
 *
 * @param {object} props
 * @param {Array} props.items
 * @param {boolean} [props.canEdit]
 * @param {(item) => void} [props.onEdit]
 * @param {(item) => void} [props.onDelete]
 */
export default function PriceListTable({ items, canEdit, onEdit, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-4 py-3">
                Наименование
              </th>
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-4 py-3 w-[140px]">
                Артикул
              </th>
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-4 py-3 w-[120px]">
                Категория
              </th>
              <th className="text-right font-medium text-gray-500 dark:text-gray-400 px-4 py-3 w-[120px]">
                Цена
              </th>
              <th className="text-right font-medium text-gray-500 dark:text-gray-400 px-4 py-3 w-[100px]">
                Наличие
              </th>
              {canEdit && <th className="w-[60px]" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item) => (
              <Row
                key={item.id}
                item={item}
                canEdit={canEdit}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
        {items.map((item) => (
          <MobileRow
            key={item.id}
            item={item}
            canEdit={canEdit}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Desktop Row ─────────────────────────────────────────
function Row({ item, canEdit, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const hasActions = Boolean(onEdit || onDelete);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const hasStock = item.stock_quantity === null || item.stock_quantity === undefined
    ? null
    : Number(item.stock_quantity) > 0;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900 dark:text-white truncate max-w-[420px]">
          {item.name}
        </div>
        {item.brand && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {item.brand}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {item.article ? (
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {item.article}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {item.category ? (
          <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-[#4A6572]/10 dark:bg-[#4A6572]/30 text-[#344955] dark:text-gray-300">
            <Tag className="w-3 h-3" />
            {item.category}
          </span>
        ) : (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="font-semibold text-[#344955] dark:text-[#F9AA33]">
          {formatPrice(item.price)} ₽
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400">
          / {item.unit || 'шт'}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {hasStock === null ? (
          <span className="text-xs text-gray-400">—</span>
        ) : hasStock ? (
          <span className="text-xs font-medium text-emerald-500">
            {formatQuantity(item.stock_quantity)}
          </span>
        ) : (
          <span className="text-xs font-medium text-red-500">Нет</span>
        )}
      </td>
      {canEdit && (
        <td className="px-4 py-3">
          {hasActions && (
            <div ref={menuRef} className="relative flex justify-end">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                aria-label="Действия"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
                  {onEdit && (
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(item); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Pencil className="w-4 h-4" /> Редактировать
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => { setMenuOpen(false); onDelete(item); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" /> Удалить
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </td>
      )}
    </tr>
  );
}

// ─── Mobile Row ──────────────────────────────────────────
function MobileRow({ item, canEdit, onEdit, onDelete }) {
  const hasStock = item.stock_quantity === null || item.stock_quantity === undefined
    ? null
    : Number(item.stock_quantity) > 0;

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 dark:text-white text-sm leading-snug">
            {item.name}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {item.article && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                {item.article}
              </span>
            )}
            {item.brand && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.brand}</span>
            )}
            {item.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#4A6572]/10 text-[#344955] dark:text-gray-300">
                {item.category}
              </span>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1 shrink-0">
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Редактировать"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(item)}
                className="p-2 rounded-lg border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                aria-label="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div>
          <div className="text-lg font-bold text-[#344955] dark:text-[#F9AA33]">
            {formatPrice(item.price)} ₽
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            / {item.unit || 'шт'}
          </div>
        </div>
        {hasStock !== null && (
          <span
            className={`text-[11px] font-medium px-2 py-1 rounded ${
              hasStock
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-red-500/10 text-red-500'
            }`}
          >
            {hasStock ? `${formatQuantity(item.stock_quantity)} ${item.unit || 'шт'}` : 'Нет'}
          </span>
        )}
      </div>
    </div>
  );
}
