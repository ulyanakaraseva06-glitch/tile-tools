import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        app: resolve(rootDir, 'app/index.html'),
        analyticsAdmin: resolve(rootDir, 'admin/analytics/index.html'),
        terms: resolve(rootDir, 'terms/index.html'),
        privacy: resolve(rootDir, 'privacy/index.html'),
        help: resolve(rootDir, 'help/index.html'),
        about: resolve(rootDir, 'about/index.html')
      }
    }
  }
});
