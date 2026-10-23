import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // берём исходники workspace-пакетов напрямую, без сборки
  resolve: {
    conditions: ['@on-bike/source', 'module', 'browser', 'development|production'],
  },
  // vitest работает в SSR-режиме — те же исходники пакетов
  ssr: {
    resolve: { conditions: ['@on-bike/source', 'module', 'node', 'development|production'] },
  },
  server: {
    port: 5173,
    proxy: { '/v1': 'http://localhost:3000' },
  },
});
