import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// React + Tailwind v4, with a dev proxy so the browser talks to one origin and
// no CORS preflight is involved during local development.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/media': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') return;
            console.warn('[Vite WS Proxy]', err.message);
          });
        },
      },
    },
  },
});
