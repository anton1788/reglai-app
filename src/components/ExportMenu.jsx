// src/components/ExportMenu.jsx
// ============================================================
// 📤 УНИВЕРСАЛЬНЫЙ КОМПОНЕНТ: три кнопки экспорта
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Printer, Loader2, Lock } from 'lucide-react';

/**
 * @param {object} props
 * @param {(format: 'csv' | 'xlsx' | 'pdf') => void} props.onExport
 * @param {{ csv: boolean, xlsx: boolean, pdf: boolean }} [props.isExporting]
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.compact] — компактный режим (одна кнопка с дропдауном)
 * @param {string} [props.label] — текст на кнопке (compact = false)
 */
export default function ExportMenu({
  onExport,
  isExporting = { csv: false, xlsx: false, pdf: false },
  disabled = false,
  compact = false,
  label = 'Экспорт',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isAnyLoading = isExporting.csv || isExporting.xlsx || isExporting.pdf;

  // Компактный режим — одна кнопка с дропдауном
  if (compact) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={disabled || isAnyLoading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition"
        >
          {isAnyLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {label}
        </button>

        {open && (
          <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-xl z-50 overflow-hidden">
            <MenuItem
              icon={<FileText className="w-4 h-4" />}
              label="CSV"
              loading={isExporting.csv}
              onClick={() => { setOpen(false); onExport?.('csv'); }}
            />
            <MenuItem
              icon={<FileSpreadsheet className="w-4 h-4" />}
              label="Excel (XLSX)"
              loading={isExporting.xlsx}
              onClick={() => { setOpen(false); onExport?.('xlsx'); }}
            />
            <MenuItem
              icon={<Printer className="w-4 h-4" />}
              label="PDF (печать)"
              loading={isExporting.pdf}
              onClick={() => { setOpen(false); onExport?.('pdf'); }}
            />
          </div>
        )}
      </div>
    );
  }

  // Обычный режим — три кнопки в ряд
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onExport?.('csv')}
        disabled={disabled || isExporting.csv}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition"
        title="Экспорт в CSV"
      >
        {isExporting.csv ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        CSV
      </button>

      <button
        onClick={() => onExport?.('xlsx')}
        disabled={disabled || isExporting.xlsx}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition"
        title="Экспорт в Excel"
      >
        {isExporting.xlsx ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        XLSX
      </button>

      <button
        onClick={() => onExport?.('pdf')}
        disabled={disabled || isExporting.pdf}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition"
        title="Печать / PDF"
      >
        {isExporting.pdf ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Printer className="w-4 h-4" />
        )}
        PDF
      </button>
    </div>
  );
}

function MenuItem({ icon, label, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}