import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001', '/uploads': 'http://localhost:3001', '/sitemap.xml': 'http://localhost:3001', '/robots.txt': 'http://localhost:3001' } },
  build: { target: 'es2020', cssCodeSplit: true, rollupOptions: { output: { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'] } } } }
});
