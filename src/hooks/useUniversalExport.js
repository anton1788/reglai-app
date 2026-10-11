// src/hooks/useUniversalExport.js
// ============================================================
// 📤 УНИВЕРСАЛЬНЫЙ ЭКСПОРТ: CSV / XLSX / PDF
// ============================================================
//
// Использование:
//   const { exportData, isExporting } = useUniversalExport({
//     filename: 'отчёт',
//     sheetName: 'Данные',
//     columns: [
//       { key: 'name', label: 'Название' },
//       { key: 'price', label: 'Цена', format: (v) => `${v} ₽` },
//     ],
//     showNotification,
//   });
//
//   <button onClick={() => exportData(data, 'xlsx')}>XLSX</button>
// ============================================================

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';

/**
 * @param {object} params
 * @param {string} params.filename — базовое имя файла (без расширения)
 * @param {string} [params.sheetName] — имя листа для XLSX
 * @param {string} [params.title] — заголовок для PDF (по умолчанию = filename)
 * @param {Array<{key: string, label: string, format?: (v: any, row: any) => string}>} params.columns
 * @param {(msg: string, type?: string) => void} [params.showNotification]
 */
export function useUniversalExport({
  filename = 'export',
  sheetName = 'Данные',
  title,
  columns = [],
  showNotification,
}) {
  const [isExporting, setIsExporting] = useState({
    csv: false,
    xlsx: false,
    pdf: false,
  });

  const notify = useCallback(
    (msg, type = 'info') => {
      if (typeof showNotification === 'function') showNotification(msg, type);
      else console.log(`[${type}] ${msg}`);
    },
    [showNotification]
  );

  // ─────────────────────────────────────────────
  // 🧩 Хелпер: нормализуем строку данных
  // ─────────────────────────────────────────────
  const normalizeRow = useCallback(
    (row) => {
      const out = {};
      for (const col of columns) {
        const raw = row[col.key];
        out[col.label] = col.format ? col.format(raw, row) : (raw ?? '');
      }
      return out;
    },
    [columns]
  );

  // ─────────────────────────────────────────────
  // 📄 CSV
  // ─────────────────────────────────────────────
  const exportCSV = useCallback(
    (rows) => {
      if (!rows?.length) {
        notify('⚠️ Нечего экспортировать', 'warning');
        return;
      }

      const headers = columns.map((c) => c.label);
      const lines = [headers.join(';')];
      for (const row of rows) {
        const norm = normalizeRow(row);
        const cells = columns.map((c) => {
          const val = String(norm[c.label] ?? '').replace(/"/g, '""');
          return `"${val}"`;
        });
        lines.push(cells.join(';'));
      }

      const csv = '\uFEFF' + lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      notify(`📥 CSV: экспортировано ${rows.length} строк`, 'success');
    },
    [columns, filename, normalizeRow, notify]
  );

  // ─────────────────────────────────────────────
  // 📊 XLSX
  // ─────────────────────────────────────────────
  const exportXLSX = useCallback(
    (rows) => {
      if (!rows?.length) {
        notify('⚠️ Нечего экспортировать', 'warning');
        return;
      }

      try {
        const data = rows.map(normalizeRow);
        const ws = XLSX.utils.json_to_sheet(data, {
          header: columns.map((c) => c.label),
        });

        // Авто-ширина колонок
        const colWidths = columns.map((c) => {
          const maxLen = Math.max(
            c.label.length,
            ...data.map((r) => String(r[c.label] ?? '').length)
          );
          return { wch: Math.min(maxLen + 2, 50) };
        });
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(
          wb,
          `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`
        );

        notify(`📊 XLSX: экспортировано ${rows.length} строк`, 'success');
      } catch (err) {
        console.error('[exportXLSX]', err);
        notify('❌ Ошибка экспорта XLSX', 'error');
      }
    },
    [columns, filename, sheetName, normalizeRow, notify]
  );

  // ─────────────────────────────────────────────
  // 🖨 PDF (через печать браузера + HTML-шаблон)
  // ─────────────────────────────────────────────
  const exportPDF = useCallback(
    (rows, options = {}) => {
      if (!rows?.length) {
        notify('⚠️ Нечего экспортировать', 'warning');
        return;
      }

      const reportTitle = options.title || title || filename;
      const subtitle = options.subtitle || '';

      const style = `
        @page { size: A4 landscape; margin: 15mm; }
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          color: #1f2937;
          margin: 0;
          padding: 0;
          font-size: 11px;
        }
        h1 {
          font-size: 18px;
          margin: 0 0 4px 0;
          color: #4A6572;
        }
        .subtitle {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 16px;
        }
        .meta {
          font-size: 10px;
          color: #9ca3af;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          page-break-inside: auto;
        }
        thead {
          display: table-header-group;
          background: #f3f4f6;
        }
        th {
          text-align: left;
          padding: 6px 8px;
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
          color: #4A6572;
          border-bottom: 1px solid #d1d5db;
        }
        td {
          padding: 5px 8px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 10px;
          vertical-align: top;
        }
        tbody tr:nth-child(even) {
          background: #f9fafb;
        }
        tfoot td {
          font-weight: 600;
          background: #f3f4f6;
          border-top: 2px solid #4A6572;
        }
      `;

      const headers = columns.map((c) => `<th>${escapeHTML(c.label)}</th>`).join('');

      const bodyRows = rows
        .map((row) => {
          const norm = normalizeRow(row);
          const cells = columns
            .map((c) => `<td>${escapeHTML(String(norm[c.label] ?? ''))}</td>`)
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');

      const footer =
        options.totalLabel != null
          ? `<tfoot><tr><td colspan="${columns.length - 1}" style="text-align:right">${escapeHTML(
              options.totalLabel
            )}</td><td>${escapeHTML(options.totalValue || '')}</td></tr></tfoot>`
          : '';

      const html = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHTML(reportTitle)}</title>
          <style>${style}</style>
        </head>
        <body>
          <h1>${escapeHTML(reportTitle)}</h1>
          ${subtitle ? `<div class="subtitle">${escapeHTML(subtitle)}</div>` : ''}
          <div class="meta">
            <span>Всего записей: ${rows.length}</span>
            <span>Сформировано: ${new Date().toLocaleString('ru-RU')}</span>
          </div>
          <table>
            <thead><tr>${headers}</tr></thead>
            <tbody>${bodyRows}</tbody>
            ${footer}
          </table>
        </body>
        </html>
      `;

      const win = window.open('', '_blank', 'width=1200,height=800');
      if (!win) {
        notify('❌ Разрешите всплывающие окна для экспорта PDF', 'error');
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();

      // Небольшая задержка, чтобы браузер отрисовал
      setTimeout(() => {
        win.focus();
        win.print();
      }, 300);

      notify('🖨 Открыто окно печати — сохраните как PDF', 'info');
    },
    [columns, filename, title, normalizeRow, notify]
  );

  // ─────────────────────────────────────────────
  // 🎯 Единая функция: exportData(rows, 'csv' | 'xlsx' | 'pdf', options)
  // ─────────────────────────────────────────────
  const exportData = useCallback(
    async (rows, format = 'csv', options = {}) => {
      const key = format.toLowerCase();
      if (!['csv', 'xlsx', 'pdf'].includes(key)) {
        notify(`❌ Неизвестный формат: ${format}`, 'error');
        return;
      }

      setIsExporting((s) => ({ ...s, [key]: true }));
      try {
        if (key === 'csv') exportCSV(rows);
        else if (key === 'xlsx') exportXLSX(rows);
        else if (key === 'pdf') exportPDF(rows, options);
      } finally {
        // Небольшая задержка, чтобы кнопка успела показать спиннер
        setTimeout(() => {
          setIsExporting((s) => ({ ...s, [key]: false }));
        }, 400);
      }
    },
    [exportCSV, exportXLSX, exportPDF, notify]
  );

  return { exportData, isExporting };
}

// ─────────────────────────────────────────────
// 🔒 Хелпер: экранирование HTML
// ─────────────────────────────────────────────
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default useUniversalExport;