import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Define manifest in config for a single source of truth
      manifest: {
        name: 'Fasfood Delivery',
        short_name: 'Fasfood',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        description: 'Đặt món nhanh chóng và tiện lợi',
        icons: [
          {
            src: '/vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      manifestFilename: 'manifest.json',
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Cache-first for static assets; network-first for navigation
        navigateFallback: '/index.html',
      },
      includeAssets: [
        'apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-192-maskable.png',
        'icons/icon-512-maskable.png',
      ],
    }),
  ],
  server: {
    host: '0.0.0.0', // Cho phép truy cập từ mạng bên ngoài
    port: 5175, // Cổng mặc định của Vite, thay đổi nếu bạn dùng cổng khác
    allowedHosts: [
      '889a40004afa.ngrok-free.app', // Thêm URL ngrok của bạn
      'localhost', // Giữ localhost để chạy cục bộ
    ],
    proxy: {
      '/potato-api': {
        target: process.env.VITE_PROXY_TARGET || 'https://integrity-release-measuring-highly.trycloudflare.com/potato-api',
        changeOrigin: true,
        secure: false,
        ws: false,
        rewrite: (path) => path.replace(/^\/potato-api/, ''),
      },
    },
  },
});