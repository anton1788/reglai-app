// src/components/Suppliers/SupplierCard.jsx
import { useState, useRef, useEffect } from 'react';
import {
  Building2, Mail, Phone, MapPin, Star, CheckCircle2,
  MoreVertical, Pencil, Archive, Trash2, Package2, TrendingUp,
  Globe, User,
} from 'lucide-react';

const STATUS_META = {
  active:   { label: 'Активен',    color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  pending:  { label: 'Ожидает',    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  blocked:  { label: 'Заблокирован', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  archived: { label: 'В архиве',   color: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
};

const formatMoney = (value) => {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} млн ₽`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} тыс ₽`;
  return `${n.toLocaleString('ru-RU')} ₽`;
};

const formatRating = (value) => {
  const n = Number(value) || 0;
  return n.toFixed(1);
};

export default function SupplierCard({ supplier, onSelect, onEdit, onArchive, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const hasActions = Boolean(onEdit || onArchive || onDelete);

  // Закрытие меню по клику снаружи
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const status = STATUS_META[supplier.status] || STATUS_META.active;
  const categories = Array.isArray(supplier.categories) ? supplier.categories : [];

  const handleCardClick = (e) => {
    if (menuRef.current && menuRef.current.contains(e.target)) return;
    if (onSelect) onSelect(supplier);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 
        hover:border-[#F9AA33]/50 dark:hover:border-[#F9AA33]/50 hover:shadow-lg transition-all duration-200
        ${onSelect ? 'cursor-pointer' : ''} p-4`}
    >
      {/* Верхняя строка: логотип + имя + меню */}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          {supplier.logo_url ? (
            <img src={supplier.logo_url} alt={supplier.name} className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-6 h-6 text-[#4A6572] dark:text-gray-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {supplier.name}
            </h3>
            {supplier.is_verified && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" title="Проверенный" />
            )}
          </div>

          {supplier.inn && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              ИНН {supplier.inn}
            </p>
          )}
        </div>

        {/* Меню действий — только если есть хотя бы один колбэк */}
        {hasActions && (
          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              aria-label="Действия"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden">
                {onEdit && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(supplier); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Pencil className="w-4 h-4" /> Редактировать
                  </button>
                )}
                {onArchive && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onArchive(supplier); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Archive className="w-4 h-4" /> В архив
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(supplier); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" /> Удалить
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Статус + рейтинг */}
      <div className="flex items-center gap-2 mt-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${status.color}`}>
          {status.label}
        </span>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Star className="w-3.5 h-3.5 fill-[#F9AA33] text-[#F9AA33]" />
          <span className="font-medium">{formatRating(supplier.rating)}</span>
        </div>
      </div>

      {/* Контакты */}
      <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
        {supplier.contact_person && (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{supplier.contact_person}</span>
          </div>
        )}
        {supplier.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{supplier.phone}</span>
          </div>
        )}
        {supplier.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{supplier.email}</span>
          </div>
        )}
        {supplier.address && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{supplier.address}</span>
          </div>
        )}
        {supplier.website && (
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{supplier.website.replace(/^https?:\/\//, '')}</span>
          </div>
        )}
      </div>

      {/* Категории */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {categories.slice(0, 3).map((cat, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-md bg-[#4A6572]/10 dark:bg-[#4A6572]/30 text-[#344955] dark:text-gray-300 text-[10px] font-medium"
            >
              {cat}
            </span>
          ))}
          {categories.length > 3 && (
            <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[10px]">
              +{categories.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Футер: заказы + сумма */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Package2 className="w-3.5 h-3.5" />
          <span>{supplier.total_orders || 0} заказов</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-[#344955] dark:text-[#F9AA33]">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{formatMoney(supplier.total_amount)}</span>
        </div>
      </div>
    </div>
  );
}