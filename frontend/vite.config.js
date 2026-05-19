import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
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
