import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api calls are proxied to the Node API on :3000.
// In production, CloudFront routes /api/* to the load balancer, so the
// frontend and API share one domain and no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: { outDir: 'dist', sourcemap: false },
});
