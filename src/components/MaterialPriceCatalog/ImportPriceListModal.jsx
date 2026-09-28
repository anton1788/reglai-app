// src/components/MaterialPriceCatalog/ImportPriceListModal.jsx
import React, { useState, useRef } from 'react';
import {
  X, Upload, FileSpreadsheet, FileText, FileCode,
  ClipboardPaste, Loader2, CheckCircle, AlertCircle, Trash2
} from 'lucide-react';
import {
  parseExcelOrCsv,
  parseTxt,
  parseXml,
  parsePdfText,
} from '../../utils/priceImporter';

const TABS = [
  { id: 'excel', label: 'Excel / CSV', icon: FileSpreadsheet, hint: 'xlsx, xls, csv' },
  { id: 'txt', label: 'TXT', icon: FileText, hint: 'текстовый прайс' },
  { id: 'xml', label: 'XML', icon: FileCode, hint: '1С, поставщики' },
  { id: 'pdf', label: 'Из PDF', icon: ClipboardPaste, hint: 'вставить текст' },
];

const ImportPriceListModal = ({
  isOpen,
  onClose,
  onImport,
  supplier_name: initialSupplier = '',
  supplier_phone: initialPhone = '',
}) => {
  const [tab, setTab] = useState('excel');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [supplierName, setSupplierName] = useState(initialSupplier);
  const [supplierPhone, setSupplierPhone] = useState(initialPhone);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const reset = () => {
    setRows([]);
    setError(null);
    setPastedText('');
    setLoading(false);
  };

  const handleFile = async (file) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      let parsed = [];
      const name = file.name.toLowerCase();

      if (tab === 'excel' || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
        parsed = await parseExcelOrCsv(file);
      } else if (tab === 'txt' || name.endsWith('.txt')) {
        const text = await file.text();
        parsed = parseTxt(text);
      } else if (tab === 'xml' || name.endsWith('.xml')) {
        const text = await file.text();
        parsed = parseXml(text);
      }

      if (parsed.length === 0) {
        setError('Не удалось найти данные. Проверьте формат файла.');
      } else {
        setRows(parsed);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || 'Ошибка чтения файла');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteParse = () => {
    if (!pastedText.trim()) {
      setError('Вставьте текст');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const parsed = parsePdfText(pastedText);
      if (parsed.length === 0) {
        setError('Не удалось найти строки с ценами');
      } else {
        setRows(parsed);
      }
    } catch (err) {
      setError(err.message || 'Ошибка парсинга');
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (idx, patch) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const toggleRow = (idx) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r))
    );
  };

  const removeRow = (idx) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const selectedCount = rows.filter((r) => r.selected && !r.error).length;

  const handleConfirm = () => {
    const toImport = rows
      .filter((r) => r.selected && !r.error)
      .map((r) => ({
        description: r.description.trim(),
        unit: r.unit || 'шт',
        price: Number(r.price) || 0,
        supplier_name: supplierName.trim() || r.supplier_name || null,
        supplier_phone: supplierPhone.trim() || r.supplier_phone || null,
      }));

    if (toImport.length === 0) {
      setError('Нет строк для импорта');
      return;
    }

    onImport(toImport);
    reset();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[10000] fade-enter"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#4A6572]" />
            Импорт прайс-листа
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-700 px-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); reset(); }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition ${
                  tab === t.id
                    ? 'border-[#4A6572] text-[#4A6572] dark:text-[#F9AA33]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Supplier fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Поставщик (применится ко всем строкам)
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="ООО Вент-Сервис"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Телефон
              </label>
              <input
                type="tel"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
                placeholder="+7 (___) ___-__-__"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Input area */}
          {rows.length === 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
              {tab === 'pdf' ? (
                <>
                  <ClipboardPaste className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Откройте PDF, выделите текст, скопируйте (Ctrl+C) и вставьте сюда:
                  </p>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Воздуховод 250x100    1500   шт&#10;Воздуховод 300x100    1550   шт&#10;Отвод 250x100-90°     320    шт"
                    rows={8}
                    className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-y"
                  />
                  <button
                    onClick={handlePasteParse}
                    disabled={!pastedText.trim() || loading}
                    className="mt-3 px-4 py-2 bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Разобрать текст
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {tab === 'excel' && 'Загрузите файл Excel (.xlsx, .xls) или CSV'}
                    {tab === 'txt' && 'Загрузите текстовый файл (.txt)'}
                    {tab === 'xml' && 'Загрузите файл XML (.xml)'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={
                      tab === 'excel' ? '.xlsx,.xls,.csv' :
                      tab === 'txt' ? '.txt' :
                      tab === 'xml' ? '.xml' : '*'
                    }
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="px-4 py-2 bg-[#4A6572] hover:bg-[#344955] text-white text-sm font-medium rounded-lg disabled:opacity-50 flex items-center gap-2 mx-auto"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Выбрать файл
                  </button>
                  <p className="text-xs text-gray-400 mt-3">
                    💡 В первой строке должны быть заголовки: «Наименование», «Ед.», «Цена», «Поставщик».
                  </p>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-4 mb-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Найдено строк: <b>{rows.length}</b> · Выбрано: <b className="text-green-600">{selectedCount}</b>
                </p>
                <button
                  onClick={reset}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Загрузить другой файл
                </button>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[40vh]">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/30 text-xs uppercase text-gray-500 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left w-8"></th>
                        <th className="px-2 py-2 text-left">Материал</th>
                        <th className="px-2 py-2 text-left w-20">Ед.</th>
                        <th className="px-2 py-2 text-right w-24">Цена ₽</th>
                        <th className="px-2 py-2 text-left w-40">Поставщик</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {rows.map((r, i) => (
                        <tr
                          key={i}
                          className={r.error ? 'bg-red-50 dark:bg-red-900/10' : ''}
                        >
                          <td className="px-2 py-2">
                            <input
                              type="checkbox"
                              checked={r.selected && !r.error}
                              disabled={!!r.error}
                              onChange={() => toggleRow(i)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={r.description}
                              onChange={(e) => updateRow(i, { description: e.target.value })}
                              className="w-full px-2 py-1 text-sm bg-transparent border-0 focus:ring-1 focus:ring-[#4A6572] rounded"
                            />
                            {r.error && (
                              <p className="text-xs text-red-500 mt-0.5">{r.error}</p>
                            )}
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={r.unit}
                              onChange={(e) => updateRow(i, { unit: e.target.value })}
                              className="w-full px-2 py-1 text-sm bg-transparent border-0 focus:ring-1 focus:ring-[#4A6572] rounded"
                            />
                          </td>
                          <td className="px-2 py-1 text-right">
                            <input
                              type="number"
                              value={r.price}
                              onChange={(e) => updateRow(i, { price: Number(e.target.value) })}
                              className="w-24 px-2 py-1 text-sm text-right bg-transparent border-0 focus:ring-1 focus:ring-[#4A6572] rounded"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              type="text"
                              value={r.supplier_name}
                              onChange={(e) => updateRow(i, { supplier_name: e.target.value })}
                              placeholder="—"
                              className="w-full px-2 py-1 text-sm bg-transparent border-0 focus:ring-1 focus:ring-[#4A6572] rounded"
                            />
                          </td>
                          <td className="px-2 py-1">
                            <button
                              onClick={() => removeRow(i)}
                              className="p-1 text-red-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 rounded-b-2xl">
          <div className="text-sm text-gray-500">
            {rows.length > 0 ? `Готово к импорту: ${selectedCount} строк` : 'Выберите файл или вставьте текст'}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="px-5 py-2 bg-gradient-to-r from-[#4A6572] to-[#344955] text-white text-sm font-medium rounded-lg hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Импортировать {selectedCount > 0 ? `(${selectedCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportPriceListModal;