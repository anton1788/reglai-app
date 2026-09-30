// ============================================
// vite.config.js
// 0.0.103-beta
// ============================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ✅ Единая строка CSP для переиспользования (dev + build)
// 🔧 ФИКС: blob: добавлен в connect-src — иначе fetch(blobUrl) падает
const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://*.supabase.co https://cdn.tailwindcss.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https: https://*.supabase.co https://*.supabase.storage",
  "connect-src 'self' blob: https://*.supabase.co https://*.supabase.rest https://*.supabase.storage https://*.supabase.auth https://cdn.tailwindcss.com wss://*.supabase.co ws://localhost:* http://localhost:*",
  "manifest-src 'self'",
  "frame-src 'self' about: blob: https://*.supabase.co https://*.supabase.storage",
  "child-src 'self' about: blob: https://*.supabase.co",
  "object-src 'self' blob: https://*.supabase.co https://*.supabase.storage",
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'"
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

      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/rest\/v1\//,
          /^\/auth\//,
          /^\/functions\//,
          /^\/admin\//
        ],

        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff2?|ttf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\.mjs$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mjs-resources',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 30 * 24 * 60 * 60
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-storage',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 24 * 60 * 60
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 30 * 24 * 60 * 60
              }
            }
          },
          {
            urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tailwind-cdn',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 30 * 24 * 60 * 60
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ],

        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      },

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
          { src: '/icon-48.png',  sizes: '48x48',   type: 'image/png' },
          { src: '/icon-72.png',  sizes: '72x72',   type: 'image/png' },
          { src: '/icon-96.png',  sizes: '96x96',   type: 'image/png' },
          { src: '/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-256.png', sizes: '256x256', type: 'image/png' },
          { src: '/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ],
        screenshots: [],
        related_applications: [],
        prefer_related_applications: false,
        categories: ['business', 'productivity', 'utilities']
      },

      injectManifest: {
        globPatterns: ['**/*.{js,mjs,css,html,png,svg,ico,woff2}']
      }
    })
  ],

  server: {
    headers: {
      'Content-Security-Policy': CSP_POLICY,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    },
    allowedHosts: true,
    warmup: {
      clientFiles: [
        './src/main.jsx',
        './src/App.jsx',
        './src/utils/supabaseClient.js'
      ]
    }
  },

  build: {
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        // 🔧 ФИКС: убран 'vendor-charts': ['recharts'] —
        //    вызывал циклическую инициализацию
        //    "Cannot access 'Sn' before initialization" в vendor-charts-*.js
        //    Теперь recharts попадёт в общий чанк, Rollup сам разберётся с порядком.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-utils': ['xlsx', 'jspdf', 'jspdf-autotable'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons': ['lucide-react'],
          'vendor-pdf': ['react-pdf', 'pdfjs-dist']
        },
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1500,
    target: 'esnext',
    cssCodeSplit: true,
    commonjsOptions: {
      include: [/recharts/, /pdfjs-dist/, /node_modules/]
    }
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      // 🔧 ФИКС: удалена строка 'recharts > react-is' — невалидный синтаксис
      'recharts',
      'xlsx',
      'jspdf',
      'lucide-react',
      'react-pdf',
      'pdfjs-dist'
    ],
    esbuildOptions: { target: 'esnext' },
    force: false
  },

  resolve: {
    alias: {}
  }
});