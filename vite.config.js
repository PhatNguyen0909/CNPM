import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Cho phép truy cập từ mạng bên ngoài
    port: 5173, // Cổng mặc định của Vite, thay đổi nếu bạn dùng cổng khác
    allowedHosts: [
      '889a40004afa.ngrok-free.app', // Thêm URL ngrok của bạn
      'localhost', // Giữ localhost để chạy cục bộ
    ],
    proxy: {
      '/potato-api': {
        target: process.env.VITE_PROXY_TARGET || 'https://cruise-silk-licence-shed.trycloudflare.com',
        changeOrigin: true,
        secure: false,
        ws: false,
        rewrite: (path) => path.replace(/^\/potato-api/, '/potato-api'),
      },
    },
  },
});