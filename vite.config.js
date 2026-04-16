// ============================================
// vite.config.js
// ============================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ✅ Единая строка CSP для переиспользования (dev + build)
const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https: https://*.supabase.co https://*.supabase.storage",
  "connect-src 'self' https://*.supabase.co https://*.supabase.rest https://*.supabase.storage https://*.supabase.auth wss://*.supabase.co ws://localhost:* http://localhost:*",
  "manifest-src 'self'",
  "frame-src 'self' https://*.supabase.co",
  "worker-src 'self' blob:"
].join('; ');

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: '/index.html'
      },
      
      // ✅ Workbox: кэширование и стратегии
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/rest\/v1\//,
          /^\/auth\//,
          /^\/functions\//,
          /^\/admin\//
        ],
        
        // ✅ Runtime caching стратегии
        runtimeCaching: [
          {
            // Статические ресурсы: изображения, шрифты, иконки
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 дней
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Supabase REST API (GET-запросы)
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60 // 5 минут
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Supabase Storage (файлы, изображения)
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-storage',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 24 * 60 * 60 // 24 часа
              }
            }
          },
          {
            // Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 дней
              }
            }
          }
        ],
        
        // ✅ Глобальные настройки
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },
      
      // ✅ PWA Manifest
      manifest: {
        short_name: 'Снабжение ВиК',
        name: 'Снабжение Вентиляция и Кондиционирование',
        description: 'Система управления заявками на материалы для подрядных организаций',
        lang: 'ru',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#4A6572',
        background_color: '#F5F7FA',
        icons: [
          {
            src: '/icon-48.png',
            sizes: '48x48',
            type: 'image/png'
          },
          {
            src: '/icon-72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: '/icon-96.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: '/icon-128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: '/icon-144.png',
            sizes: '144x144',
            type: 'image/png'
          },
          {
            src: '/icon-152.png',
            sizes: '152x152',
            type: 'image/png'
          },
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: '/icon-384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        // ✅ Для тёмной темы (опционально, поддерживается в Android 12+)
        screenshots: [],
        related_applications: [],
        prefer_related_applications: false,
        categories: ['business', 'productivity', 'utilities']
      },
      
      // ✅ Отключаем авто-инъекцию CSP в SW (управляем вручную в index.html)
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}']
      }
    })
  ],
  
  // ✅ Dev-сервер: CSP-заголовки для локальной разработки
  server: {
    headers: {
      'Content-Security-Policy': CSP_POLICY,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    allowedHosts: true,
    // ✅ Оптимизация для PWA в dev-режиме
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/utils/supabaseClient.js'
      ]
    }
  },
  
  // ✅ Production build настройки
  build: {
    // ✅ Уменьшаем размер бандла
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    // ✅ Code splitting для оптимизации загрузки
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-utils': ['xlsx', 'jspdf', 'jspdf-autotable'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons': ['lucide-react']
        },
        // ✅ Имена файлов с хешами для кэширования
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // ✅ Увеличиваем лимит предупреждения о размере чанка
    chunkSizeWarningLimit: 1000,
    
    // ✅ Оптимизация для PWA
    target: 'esnext',
    cssCodeSplit: true
  },
  
  // ✅ Оптимизация зависимостей
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'recharts',
      'xlsx',
      'jspdf',
      'lucide-react'
    ],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  
  // ✅ Resolve aliases (опционально, если используете @/imports)
  resolve: {
    alias: {
      // '@': path.resolve(__dirname, './src') // Раскомментируйте при необходимости
    }
  }
});