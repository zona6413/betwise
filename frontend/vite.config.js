import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    // Proxy API vers le backend Express pour éviter les problèmes CORS en dev
    proxy: {
      '/api': {
        target: 'https://betwise-suh4.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
