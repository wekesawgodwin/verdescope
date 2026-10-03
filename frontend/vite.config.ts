import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Verde-Scope Africa',
        short_name: 'Verde-Scope',
        description: 'Environmental & sustainable development consultancy — website, stakeholder and staff portal.',
        theme_color: '#0a120d',
        background_color: '#0a120d',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Portal', url: '/portal', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Contact us', url: '/contact', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'icons/*.png', 'favicon.png', 'assets/img/brand/*.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Public content keeps working offline (last fetched copy)
            urlPattern: ({ url }) => url.pathname.startsWith('/api/public/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'public-api', networkTimeoutSeconds: 4, expiration: { maxEntries: 60, maxAgeSeconds: 7 * 86400 } },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 30 * 86400 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20, maxAgeSeconds: 365 * 86400 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8000', '/uploads': 'http://localhost:8000' },
  },
  build: { chunkSizeWarningLimit: 700 },
});
