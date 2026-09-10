import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  css: { postcss: { plugins: [tailwindcss()] } },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // QA writes large screenshots while the server is running. On Windows,
    // registering a watcher on a still-locked PNG can throw EBUSY and stop Vite.
    watch: { ignored: ['**/docs/qa/**', '**/outputs/**', '**/work/**'] },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1700,
    rolldownOptions: {
      input: {
        game: fileURLToPath(new URL('./index.html', import.meta.url)),
        lab: fileURLToPath(new URL('./lab/index.html', import.meta.url)),
      },
    },
  },
});
