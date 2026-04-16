// src/components/ProgressBar.jsx
import React, { useMemo } from 'react';

// ─────────────────────────────────────────────────────────────
// 📦 КОНСТАНТЫ
// ─────────────────────────────────────────────────────────────

const SIZE_CONFIG = {
  sm: { height: 'h-1', text: 'text-xs', padding: 'py-1' },
  md: { height: 'h-2', text: 'text-sm', padding: 'py-1.5' },
  lg: { height: 'h-3', text: 'text-base', padding: 'py-2' }
};

const VARIANT_CONFIG = {
  solid: '',
  striped: 'bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]',
  animated: 'animate-[progress-stripes_1s_linear_infinite] bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem]'
};

const COLOR_SCHEMES = {
  default: {
    get: (percent) => percent === 100 ? 'bg-green-500' : percent > 50 ? 'bg-amber-500' : 'bg-orange-500'
  },
  success: {
    get: () => 'bg-green-500'
  },
  warning: {
    get: () => 'bg-amber-500'
  },
  danger: {
    get: () => 'bg-red-500'
  },
  info: {
    get: () => 'bg-blue-500'
  },
  custom: {
    get: (colors) => (percent) => {
      if (!colors) return COLOR_SCHEMES.default.get(percent);
      if (percent === 100) return colors.complete || 'bg-green-500';
      if (percent > 50) return colors.mid || 'bg-amber-500';
      return colors.low || 'bg-orange-500';
    }
  }
};

// ─────────────────────────────────────────────────────────────
// 🔧 ХЕЛПЕРЫ
// ─────────────────────────────────────────────────────────────

/**
 * Валидация и нормализация числового значения
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clampNumber = (value, min = 0, max = 100) => {
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return min;
  return Math.max(min, Math.min(num, max));
};

/**
 * Форматирование процента для отображения
 * @param {number} percent
 * @returns {string}
 */
const formatPercent = (percent) => `${Math.round(clampNumber(percent))}%`;

// ─────────────────────────────────────────────────────────────
// 🧩 КОМПОНЕНТ
// ─────────────────────────────────────────────────────────────

/**
 * Компонент прогресс-бара с поддержкой a11y и кастомизации
 * 
 * @param {Object} props
 * @param {number} props.received - Текущее значение
 * @param {number} props.total - Максимальное значение
 * @param {string} [props.className] - Дополнительные CSS-классы
 * @param {string} [props.size='md'] - Размер: 'sm' | 'md' | 'lg'
 * @param {string} [props.variant='solid'] - Стиль: 'solid' | 'striped' | 'animated'
 * @param {string|Object} [props.colorScheme='default'] - Цветовая схема
 * @param {boolean} [props.showLabel=true] - Показывать текстовую метку
 * @param {Function} [props.labelFormat] - Кастомный форматер метки: (received, total, percent) => string
 * @param {string} [props.ariaLabel] - ARIA-метка для скринридеров
 * @param {boolean} [props.animateOnChange=true] - Анимировать изменение значения
 */
const ProgressBar = React.memo(({
  received,
  total,
  className = '',
  size = 'md',
  variant = 'solid',
  colorScheme = 'default',
  showLabel = true,
  labelFormat,
  ariaLabel,
  animateOnChange = true
}) => {
  // ─────────────────────────────────────────────────────────
  // 📋 ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ
  // ─────────────────────────────────────────────────────────
  
  const { percent, colorClass, displayLabel } = useMemo(() => {
    const safeReceived = clampNumber(received, 0, Infinity);
    const safeTotal = clampNumber(total, 0, Infinity);
    const percent = safeTotal > 0 ? (safeReceived / safeTotal) * 100 : 0;
    const clampedPercent = clampNumber(percent, 0, 100);
    
    // Определение цвета
    let getColor;
    if (typeof colorScheme === 'string' && COLOR_SCHEMES[colorScheme]) {
      getColor = COLOR_SCHEMES[colorScheme].get;
    } else if (typeof colorScheme === 'object' && colorScheme !== null) {
      getColor = COLOR_SCHEMES.custom.get(colorScheme);
    } else {
      getColor = COLOR_SCHEMES.default.get;
    }
    const colorClass = getColor(clampedPercent);
    
    // Форматирование метки
    const label = typeof labelFormat === 'function'
      ? labelFormat(safeReceived, safeTotal, clampedPercent)
      : `${safeReceived}/${safeTotal}`;
    
    return {
      percent: clampedPercent,
      colorClass,
      displayLabel: label
    };
  }, [received, total, colorScheme, labelFormat]);

  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const variantClass = VARIANT_CONFIG[variant] || VARIANT_CONFIG.solid;
  const isComplete = percent === 100;
  
  const progressAriaLabel = useMemo(() => {
    if (ariaLabel) return ariaLabel;
    return `Progress: ${Math.round(percent)}% complete (${displayLabel})`;
  }, [ariaLabel, percent, displayLabel]);

  // ─────────────────────────────────────────────────────────
  // 📋 РЕНДЕРИНГ
  // ─────────────────────────────────────────────────────────

  return (
    <div 
      className={`w-full ${sizeConfig.padding} ${className}`}
      role="group"
      aria-label={progressAriaLabel}
    >
      {/* Label */}
      {showLabel && (
        <div className={`flex justify-between ${sizeConfig.text} mb-1`}>
          <span 
            className="font-medium text-gray-700 dark:text-gray-300"
            title={displayLabel}
          >
            {displayLabel}
          </span>
          <span 
            className="text-gray-500 dark:text-gray-400 tabular-nums"
            aria-hidden="true"
          >
            {formatPercent(percent)}
          </span>
        </div>
      )}
      
      {/* Progress Track */}
      <div 
        className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizeConfig.height}`}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={progressAriaLabel}
        aria-live="polite"
      >
        {/* Progress Fill */}
        <div
          className={`
            ${sizeConfig.height} 
            rounded-full 
            ${colorClass} 
            ${variantClass}
            ${animateOnChange ? 'transition-all duration-300 ease-out' : ''}
            relative
            flex items-center justify-end pr-1
          `}
          style={{ width: `${percent}%` }}
        >
          {/* Completion Indicator */}
          {isComplete && (
            <span 
              className="text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              aria-hidden="true"
              title="Completed"
            >
              ✓
            </span>
          )}
        </div>
      </div>
      
      {/* Screen Reader Only Status */}
      <span className="sr-only" aria-live="polite">
        {isComplete ? 'Progress complete' : `Progress at ${Math.round(percent)} percent`}
      </span>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;