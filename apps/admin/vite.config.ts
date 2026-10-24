import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // путь панели на сайте: по умолчанию корень своего хоста (Caddy, ADMIN_HOST); dev-сервер деплоя отдаёт
  // её под /admin/ того же домена (ADMIN_BASE=/admin/, infra/docker/Dockerfile)
  base: process.env.ADMIN_BASE ?? '/',
  plugins: [react()],
  // берём исходники workspace-пакетов напрямую, без сборки
  resolve: {
    conditions: ['@pokatim/source', 'module', 'browser', 'development|production'],
  },
  // vitest работает в SSR-режиме — те же исходники пакетов
  ssr: {
    resolve: { conditions: ['@pokatim/source', 'module', 'node', 'development|production'] },
  },
  server: {
    port: 5173,
    proxy: { '/v1': 'http://localhost:3000' },
  },
});
