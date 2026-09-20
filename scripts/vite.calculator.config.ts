import { fileURLToPath, URL } from 'node:url';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [{ name: 'force-tsx-babel-transform', visitor: {} }],
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        app: resolve(rootDir, 'app/index.html'),
      },
      output: {
        manualChunks: {
          canvas: ['konva', 'react-konva'],
          icons: ['lucide-react'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
