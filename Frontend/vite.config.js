import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Carga el .env desde la raíz del repo (un nivel arriba de /bodegaops)
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const backendPort = env.PORT || 3001;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`, // ← lee del .env raíz
          changeOrigin: true,
        }
      }
    }
  };
});