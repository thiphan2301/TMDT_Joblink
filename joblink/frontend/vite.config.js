import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => ({
  // "npm run dev:https" chạy https://localhost:5173 với chứng chỉ tự ký:
  // Facebook Login chỉ hoạt động trên trang https.
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],

  server: {
    port: 5173,
    strictPort: true,

    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
