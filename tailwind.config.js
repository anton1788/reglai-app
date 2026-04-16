/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // ⬅️ ОБЯЗАТЕЛЬНО: управление через класс "dark"
  
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  
  // ✅ SAFELIST: Динамические классы для аналитики
  safelist: [
    // ── MetricCard: text colors ──
    'text-indigo-600', 'dark:text-indigo-400',
    'text-emerald-600', 'dark:text-emerald-400',
    'text-amber-600', 'dark:text-amber-400',
    'text-rose-600', 'dark:text-rose-400',
    'text-slate-600', 'dark:text-slate-400',
    
    // ── ProgressBar: gradient fills ──
    'from-indigo-500', 'to-blue-500',
    'from-emerald-500', 'to-teal-500',
    'from-amber-500', 'to-orange-500',
    'from-rose-500', 'to-pink-500',
    
    // ── Status badges (если используются динамически) ──
    'bg-green-500', 'bg-yellow-500', 'bg-blue-500', 'bg-red-500',
    
    // ── Ring utilities (уже были) ──
    'ring-red-500', 'ring-orange-500', 'ring-yellow-500',
    'ring-blue-500', 'ring-purple-500', 'ring-gray-500', 'ring-slate-500',
  ],
  
  theme: {
    extend: {
      // ✅ Опционально: кастомные анимации из GLOBAL_STYLES
      keyframes: {
        slideIn: {
          'from': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          'to': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        slideIn: 'slideIn 200ms ease-out forwards',
        fadeIn: 'fadeIn 200ms ease-out forwards',
        pulse: 'pulse 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}