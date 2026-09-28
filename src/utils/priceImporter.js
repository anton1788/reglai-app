// src/utils/priceImporter.js
import * as XLSX from 'xlsx';

/**
 * Универсальный результат импорта
 * @typedef {Object} ImportedRow
 * @property {string} description
 * @property {string} unit
 * @property {number} price
 * @property {string} supplier_name
 * @property {string} supplier_phone
 * @property {boolean} selected
 * @property {string} [error]
 */

const UNIT_NORMALIZE = {
  'шт': 'шт', 'штук': 'шт', 'штука': 'шт', 'pcs': 'шт', 'pc': 'шт',
  'м': 'м', 'метр': 'м', 'м.п.': 'м', 'мп': 'м', 'm': 'м',
  'м2': 'м²', 'м²': 'м²', 'кв.м': 'м²', 'кв м': 'м²',
  'м3': 'м³', 'м³': 'м³', 'куб.м': 'м³', 'куб м': 'м³',
  'кг': 'кг', 'kg': 'кг', 'килограмм': 'кг',
  'т': 'т', 'тонна': 'т', 'ton': 'т',
  'л': 'л', 'литр': 'л', 'l': 'л',
  'упак': 'упак', 'упаковка': 'упак', 'уп': 'упак', 'pack': 'упак',
  'комплект': 'комплект', 'компл': 'комплект', 'set': 'комплект',
  'партия': 'партия', 'парт': 'партия',
};

const normalizeUnit = (raw) => {
  if (!raw) return 'шт';
  const key = String(raw).trim().toLowerCase().replace(/\./g, '');
  return UNIT_NORMALIZE[key] || UNIT_NORMALIZE[String(raw).trim()] || 'шт';
};

const parsePrice = (raw) => {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  // Убираем пробелы-разделители тысяч, запятые → точки, валюту
    const cleaned = String(raw)
    .replace(/\s/g, '')
    .replace(/[₽$€]/g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// ────────────────────────────────────────────────────────────
// 📊 EXCEL / CSV
// ────────────────────────────────────────────────────────────
export const parseExcelOrCsv = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      resolve(extractRowsFromMatrix(json));
    } catch (err) {
      reject(err);
    }
  };
  reader.onerror = reject;
  reader.readAsArrayBuffer(file);
});

// ────────────────────────────────────────────────────────────
// 📄 TXT
// ────────────────────────────────────────────────────────────
export const parseTxt = (text) => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const matrix = lines.map((line) => {
    // Разделители: таб, ;, |, множественные пробелы
    if (line.includes('\t')) return line.split('\t');
    if (line.includes(';')) return line.split(';');
    if (line.includes('|')) return line.split('|');
    // Разбиваем по 2+ пробелам
    return line.split(/\s{2,}/);
  });
  return extractRowsFromMatrix(matrix);
};

// ────────────────────────────────────────────────────────────
// 🧩 XML
// ────────────────────────────────────────────────────────────
export const parseXml = (text) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');

  // Ищем повторяющиеся элементы, у которых есть дочерние с названием/ценой
  const candidates = ['item', 'product', 'position', 'price', 'material', 'товар', 'позиция'];
  let items = [];

  for (const tag of candidates) {
    const nodes = doc.getElementsByTagName(tag);
    if (nodes.length > 0) {
      items = Array.from(nodes);
      break;
    }
  }

  // Если стандартных тегов нет — берём корневые элементы с дочерними
  if (items.length === 0) {
    const root = doc.documentElement;
    items = Array.from(root.children);
  }

  const rows = items.map((node) => {
    const get = (names) => {
      for (const n of names) {
        const el = node.querySelector(n) || node.getElementsByTagName(n)[0];
        if (el) return el.textContent?.trim() || '';
      }
      return '';
    };

    return {
      description: get(['name', 'title', 'название', 'наименование', 'description']),
      unit: normalizeUnit(get(['unit', 'ед', 'единица', 'measure'])),
      price: parsePrice(get(['price', 'cost', 'цена', 'стоимость'])),
      supplier_name: get(['supplier', 'vendor', 'поставщик']),
      supplier_phone: get(['phone', 'tel', 'телефон']),
    };
  });

  return rows
    .filter((r) => r.description)
    .map((r) => ({ ...r, selected: true, error: !r.price ? 'Нет цены' : null }));
};

// ────────────────────────────────────────────────────────────
// 📋 ВСТАВКА ТЕКСТА ИЗ PDF (пользователь копирует вручную)
// ────────────────────────────────────────────────────────────
export const parsePdfText = (text) => {
  // Сначала пробуем как TXT
  const rows = parseTxt(text);
  if (rows.length > 0) return rows;

  // Если не получилось — построчный парсинг с поиском цен регулярками
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result = [];

  for (const line of lines) {
    // Ищем "название ... 1234.56 ... шт"
    const priceMatch = line.match(/(\d[\d\s]*[.,]?\d*)\s*(₽|руб|RUB)?$/i);
    const unitMatch = line.match(/\b(шт|м|м2|м3|кг|т|л|упак|комплект)\b/i);

    if (priceMatch) {
      const description = line.replace(priceMatch[0], '').trim();
      if (description.length < 3) continue;
      result.push({
        description,
        unit: normalizeUnit(unitMatch?.[1]),
        price: parsePrice(priceMatch[1]),
        supplier_name: '',
        supplier_phone: '',
        selected: true,
        error: null,
      });
    }
  }

  return result;
};

// ────────────────────────────────────────────────────────────
// 🔧 ОБЩИЙ ПАРСЕР МАТРИЦЫ (для Excel/CSV/TXT)
// ────────────────────────────────────────────────────────────
function extractRowsFromMatrix(matrix) {
  if (!matrix || matrix.length === 0) return [];

  // Ищем строку заголовков: где есть "наименование", "цена", "ед"
  let headerIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 15); i++) {
    const row = matrix[i].map((c) => String(c).toLowerCase());
    const hasName = row.some((c) => /наимен|назван|материал|description|name|товар/.test(c));
    const hasPrice = row.some((c) => /цена|стоим|price|cost|сумма/.test(c));
    if (hasName || hasPrice) {
      headerIdx = i;
      break;
    }
  }

  // Если заголовков нет — считаем, что первые колонки: [name, qty, unit, price]
  if (headerIdx === -1) {
    return matrix
      .filter((r) => r.length >= 2 && String(r[0]).trim())
      .map((r) => ({
        description: String(r[0] || '').trim(),
        unit: normalizeUnit(r[2]),
        price: parsePrice(r[r.length - 1]),
        supplier_name: '',
        supplier_phone: '',
        selected: true,
        error: null,
      }));
  }

  // Нашли заголовок — мапим по названиям колонок
  const header = matrix[headerIdx].map((c) => String(c).toLowerCase().trim());
  const idx = {
    description: findCol(header, [/наимен/, /назван/, /материал/, /товар/, /description/, /^name$/]),
    unit: findCol(header, [/ед/, /изм/, /unit/, /measure/]),
    price: findCol(header, [/цена/, /стоим/, /price/, /cost/]),
    supplier_name: findCol(header, [/поставщик/, /supplier/, /vendor/, /контрагент/]),
    supplier_phone: findCol(header, [/телефон/, /phone/, /tel/]),
  };

  const rows = [];
  for (let i = headerIdx + 1; i < matrix.length; i++) {
    const r = matrix[i];
    if (!r || !r.length) continue;

    const description = idx.description >= 0 ? String(r[idx.description] || '').trim() : '';
    if (!description || description.length < 2) continue;
    // Пропускаем повторяющиеся заголовки
    if (/^(наимен|назван|материал)/i.test(description)) continue;

    const price = idx.price >= 0 ? parsePrice(r[idx.price]) : 0;
    const row = {
      description,
      unit: normalizeUnit(idx.unit >= 0 ? r[idx.unit] : 'шт'),
      price,
      supplier_name: idx.supplier_name >= 0 ? String(r[idx.supplier_name] || '').trim() : '',
      supplier_phone: idx.supplier_phone >= 0 ? String(r[idx.supplier_phone] || '').trim() : '',
      selected: true,
      error: null,
    };

    if (!row.price || row.price <= 0) {
      row.error = 'Нет цены';
      row.selected = false;
    }
    rows.push(row);
  }

  return rows;
}

function findCol(header, patterns) {
  for (let i = 0; i < header.length; i++) {
    if (patterns.some((p) => p.test(header[i]))) return i;
  }
  return -1;
}