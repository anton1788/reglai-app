// src/utils/priceListParser.js
// ============================================================
// ПАРСЕР ПРАЙС-ЛИСТОВ ПОСТАВЩИКОВ
// Reglai — преобразование XLSX / CSV / текста в массив price_list_items
// ============================================================

import * as XLSX from 'xlsx';

// ============================================================
// 📋 СЛОВАРИ РАСПОЗНАВАНИЯ КОЛОНОК
// ============================================================

/**
 * Каждое поле — массив regex-паттернов (без регистра).
 * Порядок проверки: первое совпадение выигрывает.
 */
const COLUMN_PATTERNS = {
  name: [
    /^наименован/i, /^название/i, /^товар/i, /^позиц/i, /^продукт/i,
    /^материал/i, /^номенклатур/i, /^описан/i,
    /^name$/i, /^title$/i, /^product$/i, /^item$/i, /^description$/i,
  ],
  article: [
    /^артикул/i, /^код$/i, /^код\s*товар/i, /^sku$/i, /^part\s*num/i,
    /^article$/i, /^code$/i, /^vendor\s*code$/i, /^каталожн/i,
  ],
  price: [
    /^цена$/i, /^цена\s*(за|без|с)/i, /^стоимост/i, /^прайс/i,
    /^price$/i, /^cost$/i, /^unit\s*price$/i,
  ],
  unit: [
    /^ед\.?\s*(изм|измер)?/i, /^единиц/i, /^мера$/i,
    /^unit$/i, /^uom$/i, /^measure$/i,
  ],
  category: [
    /^категори/i, /^раздел/i, /^групп/i, /^тип$/i, /^вид$/i,
    /^category$/i, /^group$/i, /^section$/i, /^type$/i,
  ],
  subcategory: [
    /^подкатегори/i, /^подраздел/i, /^подгрупп/i,
    /^subcategory$/i, /^subgroup$/i,
  ],
  brand: [
    /^бренд/i, /^производител/i, /^марка/i, /^торговая\s*марка/i,
    /^brand$/i, /^manufacturer$/i, /^vendor$/i, /^maker$/i,
  ],
  min_quantity: [
    /^мин\.?\s*(кол|заказ|партия)/i, /^минимальн/i,
    /^min\.?\s*(qty|quantity|order)/i,
  ],
  stock_quantity: [
    /^остаток/i, /^наличие/i, /^кол-?во\s*на\s*склад/i, /^склад/i,
    /^stock$/i, /^quantity$/i, /^qty$/i, /^available$/i,
  ],
  warehouse_location: [
    /^место/i, /^ячейка/i, /^складское\s*место/i, /^адрес\s*склад/i,
    /^location$/i, /^warehouse$/i, /^bin$/i,
  ],
  description: [
    /^описан/i, /^примечан/i, /^коммент/i, /^характеристик/i, /^спецификац/i,
    /^comment$/i, /^notes?$/i, /^specs?$/i,
  ],
};

// ============================================================
// 🧹 ХЕЛПЕРЫ НОРМАЛИЗАЦИИ
// ============================================================

const cleanString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
};

const normalizeNameKey = (name) => cleanString(name).toLowerCase();

/**
 * "1 234,56 ₽" | "1,234.56" | "1 234.56 руб." | 1234.56 → 1234.56
 */
const parsePrice = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let s = cleanString(value)
    .replace(/[₽$€¥]|руб\.?|р\.?|rub|usd|eur/gi, '')
    .trim();
  if (!s) return null;

  // Убираем пробелы-разделители тысяч
  s = s.replace(/\s/g, '');

  // Определяем десятичный разделитель: последний из , или .
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    // Запятая — десятичная, точки — тысячи
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // Точка — десятичная, запятые — тысячи
    s = s.replace(/,/g, '');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/**
 * "1 234,5" → 1234.5 | "шт." → "шт" | "1000" → 1000
 */
const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = cleanString(value).replace(/\s/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/**
 * Нормализация единиц измерения к короткому виду.
 */
const UNIT_MAP = {
  'шт': 'шт', 'штук': 'шт', 'штука': 'шт', 'штуки': 'шт', 'pcs': 'шт', 'pc': 'шт',
  'м': 'м', 'метр': 'м', 'метров': 'м', 'пог.м': 'м', 'пог. м': 'м', 'пм': 'м', 'm': 'м',
  'м2': 'м²', 'кв.м': 'м²', 'кв. м': 'м²', 'квадратный метр': 'м²', 'm2': 'м²',
  'м3': 'м³', 'куб.м': 'м³', 'куб. м': 'м³', 'кубический метр': 'м³', 'm3': 'м³',
  'кг': 'кг', 'килограмм': 'кг', 'kg': 'кг',
  'т': 'т', 'тонна': 'т', 'тонн': 'т', 'ton': 'т',
  'л': 'л', 'литр': 'л', 'литров': 'л', 'l': 'л',
  'уп': 'уп', 'упак': 'уп', 'упаковка': 'уп', 'pack': 'уп',
  'рул': 'рул', 'рулон': 'рул', 'roll': 'рул',
  'компл': 'компл', 'комплект': 'компл', 'set': 'компл',
  'лист': 'лист', 'sheet': 'лист',
  'м.п.': 'м',
};

const normalizeUnit = (value) => {
  const raw = cleanString(value).toLowerCase().replace(/\.$/, '');
  if (!raw) return 'шт';
  return UNIT_MAP[raw] || raw;
};

/**
 * Нормализация артикула: trim, убираем пробелы, если все буквы одного регистра — оставляем.
 * Если есть смешанный регистр (типичный артикул "ABC-123") — не трогаем регистр.
 */
const normalizeArticle = (value) => {
  const s = cleanString(value).replace(/\s+/g, '');
  return s || null;
};

// ============================================================
// 🔍 ОПРЕДЕЛЕНИЕ КОЛОНОК
// ============================================================

/**
 * Определить индекс колонки в массиве заголовков по паттернам.
 * @returns {number|null}
 */
const findColumnIndex = (headers, patterns) => {
  for (let i = 0; i < headers.length; i++) {
    const h = cleanString(headers[i]);
    if (!h) continue;
    for (const re of patterns) {
      if (re.test(h)) return i;
    }
  }
  return null;
};

/**
 * Сопоставить заголовки с полями price_list_items.
 * @param {string[]} headers
 * @returns {{mapping: object, unmatched: string[]}}
 */
export const detectColumns = (headers) => {
  const mapping = {};
  const usedIndexes = new Set();

  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    const idx = findColumnIndex(headers, patterns);
    if (idx !== null && !usedIndexes.has(idx)) {
      mapping[field] = idx;
      usedIndexes.add(idx);
    }
  }

  const unmatched = headers
    .map((h, i) => (usedIndexes.has(i) ? null : cleanString(h)))
    .filter(Boolean);

  return { mapping, unmatched };
};

// ============================================================
// 📊 ПАРСИНГ ВХОДНЫХ ДАННЫХ
// ============================================================

/**
 * Превратить File | ArrayBuffer | string (CSV) | string (вставка) → 2D-массив.
 * @returns {Promise<string[][]>}
 */
const readRawRows = async (input) => {
  // 1. File / Blob (браузер)
  if (typeof File !== 'undefined' && input instanceof File) {
    const buffer = await input.arrayBuffer();
    return parseWorkbook(buffer);
  }

  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    const buffer = await input.arrayBuffer();
    return parseWorkbook(buffer);
  }

  // 2. ArrayBuffer
  if (input instanceof ArrayBuffer) {
    return parseWorkbook(input);
  }

  // 3. Строка — либо CSV, либо TSV (вставка из Excel), либо просто текст
  if (typeof input === 'string') {
    return parseDelimitedText(input);
  }

  // 4. Уже готовый 2D-массив
  if (Array.isArray(input)) {
    if (input.length === 0) return [];
    if (Array.isArray(input[0])) return input;
    // Массив объектов — конвертируем в 2D с заголовками из ключей
    const keys = Object.keys(input[0]);
    return [keys, ...input.map((row) => keys.map((k) => row[k]))];
  }

  throw new Error('priceListParser: неподдерживаемый тип входа');
};

/**
 * Распарсить XLSX/CSV буфер через SheetJS.
 */
const parseWorkbook = (buffer) => {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false, raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('priceListParser: в файле нет листов');

  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  });

  return rows
    .map((row) => (Array.isArray(row) ? row.map(cleanString) : []))
    .filter((row) => row.some((c) => c !== ''));
};

/**
 * Распарсить CSV/TSV-строку. Автодетект разделителя: `\t`, `;`, `,`.
 */
const parseDelimitedText = (text) => {
  const normalized = String(text).replace(/\r\n?/g, '\n').replace(/\u00A0/g, ' ');
  const lines = normalized.split('\n').filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];

  // Автодетект разделителя
  const sample = lines.slice(0, Math.min(5, lines.length)).join('\n');
  const counts = {
    '\t': (sample.match(/\t/g) || []).length,
    ';': (sample.match(/;/g) || []).length,
    ',': (sample.match(/,/g) || []).length,
  };
  const delimiter = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

  return lines.map((line) => splitDelimited(line, delimiter).map(cleanString));
};

/**
 * Умный split с учётом кавычек.
 */
const splitDelimited = (line, delimiter) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
};

// ============================================================
// 🎯 ОСНОВНАЯ ФУНКЦИЯ ПАРСИНГА
// ============================================================

/**
 * Найти строку заголовков в первых N строках файла.
 * Иногда прайсы содержат шапку компании сверху.
 */
const findHeaderRowIndex = (rows, scanLimit = 10) => {
  const limit = Math.min(scanLimit, rows.length);
  let bestIdx = 0;
  let bestScore = 0;

  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const { mapping } = detectColumns(row);
    const score = Object.keys(mapping).length;
    // Обязательные поля — name + price
    if (mapping.name !== undefined && mapping.price !== undefined) {
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    } else if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
};

/**
 * Основная функция: парсит вход и возвращает items + метаданные.
 *
 * @param {File|Blob|ArrayBuffer|string|Array} input
 * @param {object} [options]
 * @param {string} [options.supplier_id]      — UUID поставщика (обязателен для валидных items)
 * @param {string} [options.price_list_id]    — UUID прайс-листа (опционально)
 * @param {string} [options.default_category] — категория по умолчанию
 * @param {string} [options.default_unit]     — единица по умолчанию
 * @param {boolean} [options.strictMode]      — если true, строки без name/price отбрасываются молча (по умолчанию true)
 * @returns {Promise<{items, raw, columns, warnings, stats}>}
 */
export const parsePriceList = async (input, options = {}) => {
  const {
    supplier_id = null,
    price_list_id = null,
    default_category = null,
    default_unit = 'шт',
    strictMode = true,
  } = options;

  const warnings = [];
  const rows = await readRawRows(input);

  if (rows.length === 0) {
    return {
      items: [],
      raw: [],
      columns: {},
      warnings: ['Файл пуст или не содержит данных'],
      stats: emptyStats(),
    };
  }

  // 1. Находим строку заголовков
  const headerIdx = findHeaderRowIndex(rows);
  if (headerIdx > 0) {
    warnings.push(`Обнаружена шапка файла: заголовки начинаются со строки ${headerIdx + 1}`);
  }

  const headers = rows[headerIdx].map(cleanString);
  const dataRows = rows.slice(headerIdx + 1).filter((r) => r.some((c) => c !== ''));

  // 2. Определяем колонки
  const { mapping, unmatched } = detectColumns(headers);

  if (mapping.name === undefined) {
    warnings.push('Не найдена колонка с наименованием — парсинг невозможен');
    return {
      items: [],
      raw: [],
      columns: mapping,
      warnings,
      stats: emptyStats(dataRows.length),
    };
  }
  if (mapping.price === undefined) {
    warnings.push('Не найдена колонка с ценой — парсинг невозможен');
    return {
      items: [],
      raw: [],
      columns: mapping,
      warnings,
      stats: emptyStats(dataRows.length),
    };
  }
  if (unmatched.length > 0) {
    warnings.push(`Не распознаны колонки: ${unmatched.join(', ')}`);
  }

  // 3. Строим items
  const items = [];
  const raw = [];
  const seenKeys = new Set();
  let skipped = 0;
  let duplicates = 0;
  const categoriesSet = new Set();
  let priceMin = Infinity;
  let priceMax = -Infinity;

  const getCell = (row, idx) => (idx !== undefined && idx !== null ? cleanString(row[idx]) : '');

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const name = getCell(row, mapping.name);
    const priceRaw = getCell(row, mapping.price);
    const price = parsePrice(priceRaw);

    // Пропуск пустых/невалидных
    if (!name || price === null || price < 0) {
      skipped++;
      if (!strictMode && name) {
        warnings.push(`Строка ${headerIdx + i + 2}: пропущена (name="${name}", price="${priceRaw}")`);
      }
      continue;
    }

    const article = normalizeArticle(getCell(row, mapping.article));
    const category =
      getCell(row, mapping.category) || default_category || null;
    const subcategory = getCell(row, mapping.subcategory) || null;
    const brand = getCell(row, mapping.brand) || null;
    const unit = normalizeUnit(getCell(row, mapping.unit) || default_unit);
    const description = getCell(row, mapping.description) || null;
    const warehouse_location = getCell(row, mapping.warehouse_location) || null;
    const stock_quantity = parseNumber(getCell(row, mapping.stock_quantity));
    const min_quantity = parseNumber(getCell(row, mapping.min_quantity)) ?? 1;

    // Дедупликация по (article || normalized_name)
    const dedupKey = article ? `a:${article}` : `n:${normalizeNameKey(name)}`;
    if (seenKeys.has(dedupKey)) {
      duplicates++;
      continue;
    }
    seenKeys.add(dedupKey);

    const item = {
      supplier_id,
      price_list_id,
      name,
      normalized_name: normalizeNameKey(name),
      article,
      description,
      unit,
      price,
      min_quantity,
      max_quantity: null,
      discount_percent: 0,
      discount_from_quantity: null,
      brand,
      category,
      subcategory,
      specs: null,
      stock_quantity,
      stock_unit: stock_quantity !== null ? unit : null,
      warehouse_location,
      is_available: stock_quantity === null ? true : stock_quantity > 0,
    };

    items.push(item);
    raw.push({
      row: headerIdx + i + 2,
      name,
      article,
      price,
      unit,
      category,
      brand,
      stock_quantity,
    });

    if (category) categoriesSet.add(category);
    if (price < priceMin) priceMin = price;
    if (price > priceMax) priceMax = price;
  }

  // 4. Статистика
  const stats = {
    totalRows: dataRows.length,
    validRows: items.length,
    skippedRows: skipped,
    duplicates,
    categoriesFound: Array.from(categoriesSet),
    priceRange: items.length > 0 ? { min: priceMin, max: priceMax } : { min: 0, max: 0 },
    currencyDetected: null, // можно расширить детект по символам ₽/$/€ в priceRaw
  };

  if (items.length === 0) {
    warnings.push('После обработки не осталось валидных позиций');
  }

  return { items, raw, columns: mapping, warnings, stats };
};

const emptyStats = (totalRows = 0) => ({
  totalRows,
  validRows: 0,
  skippedRows: 0,
  duplicates: 0,
  categoriesFound: [],
  priceRange: { min: 0, max: 0 },
  currencyDetected: null,
});

// ============================================================
// 🧪 ХЕЛПЕР ДЛЯ UI — ПРЕВЬЮ ПЕРВЫХ N СТРОК
// ============================================================

/**
 * Быстрое превью: читает файл, возвращает первые N распарсенных items
 * и информацию о колонках — для показа пользователю перед импортом.
 */
export const previewPriceList = async (input, { limit = 10, ...options } = {}) => {
  const result = await parsePriceList(input, options);
  return {
    ...result,
    items: result.items.slice(0, limit),
    raw: result.raw.slice(0, limit),
  };
};

// ============================================================
// 📤 ЭКСПОРТ
// ============================================================

export default {
  parsePriceList,
  previewPriceList,
  detectColumns,
};