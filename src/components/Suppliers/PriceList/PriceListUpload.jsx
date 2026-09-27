// src/components/Suppliers/PriceList/PriceListUpload.jsx
import { useState, useRef, useCallback } from 'react';
import {
  X, Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle,
  AlertTriangle, ArrowRight, RotateCcw, Save,
} from 'lucide-react';

import { parsePriceList, previewPriceList } from '../../../utils/priceListParser';
import { bulkUpsertPriceItems } from '../../../api/suppliers';

const ACCEPTED = '.xlsx,.xls,.csv,.txt,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Загрузка прайс-листа из файла.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.supplierId
 * @param {(result: {inserted: number, chunks: number}) => void} props.onSuccess
 * @param {Function} [props.showNotification]
 */
export default function PriceListUpload({
  open,
  onClose,
  supplierId,
  onSuccess,
  showNotification,
}) {
  const notify = (msg, type = 'info') => {
    if (typeof showNotification === 'function') showNotification(msg, type);
    else console.log(`[${type}] ${msg}`);
  };

  const [step, setStep] = useState('select'); // select | preview | importing | done
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  // ─── Сброс при открытии ────────────────────────────────
  const reset = useCallback(() => {
    setStep('select');
    setFile(null);
    setPreview(null);
    setParseError(null);
    setImporting(false);
    setImportResult(null);
    setDragActive(false);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

  // ─── Обработка файла ───────────────────────────────────
  const processFile = async (f) => {
    if (!f) return;
    setFile(f);
    setParseError(null);
    setPreview(null);

    try {
      const result = await previewPriceList(f, {
        supplier_id: supplierId,
        limit: 10,
      });
      setPreview(result);
      setStep('preview');
    } catch (err) {
      console.error('[PriceListUpload] parse error:', err);
      setParseError(err.message || 'Не удалось разобрать файл');
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  // ─── Drag & Drop ───────────────────────────────────────
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  // ─── Импорт ────────────────────────────────────────────
  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setStep('importing');

    try {
      const result = await parsePriceList(file, {
        supplier_id: supplierId,
      });

      if (!result.items?.length) {
        throw new Error('После обработки не осталось валидных позиций');
      }

      const insertResult = await bulkUpsertPriceItems(result.items);

      setImportResult({
        ...insertResult,
        parsed: result.items.length,
        warnings: result.warnings,
      });
      setStep('done');

      if (typeof onSuccess === 'function') {
        onSuccess(insertResult);
      }
    } catch (err) {
      console.error('[PriceListUpload] import error:', err);
      notify(err.message || 'Ошибка импорта', 'error');
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  // ─── Рендер ────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] fade-enter flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-[#4A6572] text-white">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Загрузка прайс-листа</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={importing}
            className="p-1.5 rounded-lg hover:bg-white/10 transition disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
          <StepDot label="Выбор файла" active={step === 'select'} done={step !== 'select'} />
          <StepArrow />
          <StepDot label="Превью" active={step === 'preview'} done={step === 'done' || step === 'importing'} />
          <StepArrow />
          <StepDot label="Импорт" active={step === 'importing' || step === 'done'} done={step === 'done'} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {step === 'select' && (
            <SelectStep
              dragActive={dragActive}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              parseError={parseError}
            />
          )}

          {step === 'preview' && preview && (
            <PreviewStep preview={preview} fileName={file?.name} />
          )}

          {step === 'importing' && (
            <ImportingStep />
          )}

          {step === 'done' && importResult && (
            <DoneStep result={importResult} />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {step === 'preview' && preview && (
              <>Готово к импорту: <span className="font-medium text-gray-700 dark:text-gray-200">{preview.stats?.validRows ?? 0}</span> позиций</>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 'preview' && (
              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <RotateCcw className="w-4 h-4" />
                Другой файл
              </button>
            )}

            {step === 'select' && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Отмена
              </button>
            )}

            {step === 'preview' && (
              <button
                type="button"
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium transition"
              >
                <Save className="w-4 h-4" />
                Импортировать
              </button>
            )}

            {step === 'done' && (
              <button
                type="button"
                onClick={handleClose}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium transition"
              >
                <CheckCircle className="w-4 h-4" />
                Готово
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}

// ─── Шаг 1: выбор файла ──────────────────────────────────
function SelectStep({ dragActive, onDragEnter, onDragLeave, onDrop, onClick, parseError }) {
  return (
    <div className="space-y-4">
      <div
        onDragEnter={onDragEnter}
        onDragOver={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition
          ${dragActive
            ? 'border-[#F9AA33] bg-[#F9AA33]/5'
            : 'border-gray-300 dark:border-gray-600 hover:border-[#4A6572]/50 hover:bg-gray-50 dark:hover:bg-gray-900/30'
          }`}
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-[#4A6572]/10 dark:bg-[#4A6572]/30 flex items-center justify-center mb-4">
          <FileSpreadsheet className="w-8 h-8 text-[#4A6572]" />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
          Перетащите файл сюда
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          или нажмите, чтобы выбрать
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
          Поддерживаются: <span className="font-mono">.xlsx, .xls, .csv</span>
        </p>
      </div>

      {parseError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{parseError}</p>
        </div>
      )}
    </div>
  );
}

// ─── Шаг 2: превью ───────────────────────────────────────
function PreviewStep({ preview, fileName }) {
  const { columns, warnings, stats, items } = preview || {};

  const mapped = Object.keys(columns || {});

  return (
    <div className="space-y-4">
      {/* Файл */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
        <FileSpreadsheet className="w-8 h-8 text-emerald-500 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {fileName || 'Файл'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Найдено {stats?.totalRows ?? 0} строк · валидных {stats?.validRows ?? 0}
            {stats?.duplicates > 0 && ` · дубликатов ${stats.duplicates}`}
          </div>
        </div>
      </div>

      {/* Распознанные колонки */}
      {mapped.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Распознанные колонки
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mapped.map((key) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                <CheckCircle className="w-3 h-3" />
                {key}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings?.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            Предупреждения
          </div>
          <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
            {warnings.slice(0, 5).map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Превью данных */}
      {items?.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Первые {Math.min(items.length, 5)} из {stats?.validRows ?? items.length} позиций
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left px-3 py-1.5 font-medium text-gray-500 dark:text-gray-400">Название</th>
                  <th className="text-left px-3 py-1.5 font-medium text-gray-500 dark:text-gray-400 w-[90px]">Артикул</th>
                  <th className="text-right px-3 py-1.5 font-medium text-gray-500 dark:text-gray-400 w-[90px]">Цена</th>
                  <th className="text-left px-3 py-1.5 font-medium text-gray-500 dark:text-gray-400 w-[60px]">Ед.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.slice(0, 5).map((it, i) => (
                  <tr key={i} className="bg-white dark:bg-gray-800">
                    <td className="px-3 py-1.5 text-gray-900 dark:text-white truncate max-w-[220px]">
                      {it.name}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-gray-500 dark:text-gray-400">
                      {it.article || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right text-gray-900 dark:text-white">
                      {Number(it.price).toLocaleString('ru-RU')}
                    </td>
                    <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{it.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Шаг 3: импорт ───────────────────────────────────────
function ImportingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-10 h-10 animate-spin text-[#4A6572] mb-4" />
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Импортируем позиции в базу данных…
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
        Это может занять несколько секунд
      </p>
    </div>
  );
}

// ─── Шаг 4: готово ───────────────────────────────────────
function DoneStep({ result }) {
  return (
    <div className="flex flex-col items-center text-center py-8">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-emerald-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        Импорт завершён
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Загружено <span className="font-medium text-gray-700 dark:text-gray-200">{result.inserted}</span> позиций
        {result.chunks > 1 && ` (${result.chunks} пакетов)`}
      </p>

      {result.warnings?.length > 0 && (
        <div className="mt-4 w-full max-w-md p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-left">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
            Предупреждения при импорте
          </div>
          <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
            {result.warnings.slice(0, 3).map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Мелкие UI-компоненты ────────────────────────────────
function StepDot({ label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold border-2
          ${
            done
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : active
                ? 'bg-[#4A6572] border-[#4A6572] text-white'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
          }`}
      >
        {done ? '✓' : ''}
      </div>
      <span
        className={`text-xs font-medium ${
          active || done
            ? 'text-gray-900 dark:text-white'
            : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function StepArrow() {
  return <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />;
}
