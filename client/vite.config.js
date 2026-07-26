import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Force dev server restart to load new tailwind config
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
