import { defineConfig } from '@playwright/test';

import { API_URL, BASE_URL, DEV_PORT, DEV_URL, PORT, WITH_API } from './e2e/urls';

// Смоук web в браузере: `pnpm e2e:web` после `pnpm build:web` (docs/runbooks/local-dev.md, «Web»).
// Браузер — установленный Google Chrome (есть на ubuntu-latest): без загрузки браузеров Playwright.
// Без Chrome: PW_CHANNEL=chromium и один раз `pnpm exec playwright install chromium`.
const channel = process.env.PW_CHANNEL ?? 'chrome';

const server = (port: number, dist: string, url: string) => ({
  PORT: String(port),
  HOST: '127.0.0.1',
  WEB_DIST: dist,
  WEB_ORIGIN: url,
  // on-bike: с API — посев SSR публичных экранов (loader /status)
  ...(WITH_API ? { API_INTERNAL_URL: API_URL } : {}),
});

// on-bike, E2E_API=1: API и worker из apps/api/dist (`pnpm --filter @on-bike/api build`), остальное окружение —
// apps/api/.env локально или переменные CI. Ссылки писем ведут на production-сборку смоука, её origin-ы —
// доверенные для CORS/CSRF (иначе POST с web — 403). Свой процесс, не dev-API: у него другие APP_LINK_BASE и CORS.
const api = {
  PORT: new URL(API_URL).port || '80',
  APP_LINK_BASE: `${BASE_URL}/`,
  CORS_ORIGINS: `${BASE_URL},${DEV_URL}`,
};
const apiServers = WITH_API
  ? [
      {
        name: 'api',
        command: 'node dist/main.js',
        cwd: '../api',
        url: `${API_URL}/v1/health`,
        env: api,
        reuseExistingServer: false,
      },
      {
        // письма регистрации отправляет worker (outbox → BullMQ → SMTP Mailpit); готовность — по письму в тесте
        name: 'worker',
        command: 'node dist/worker.js',
        cwd: '../api',
        env: api,
      },
    ]
  : [];

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: { baseURL: BASE_URL, channel, trace: 'retain-on-failure' },
  webServer: [
    ...apiServers,
    {
      // production-сборка: SSR, PWA (service worker), /ui-kit → Главная
      command: 'node --env-file-if-exists=.env server/main.ts',
      url: BASE_URL,
      env: server(PORT, 'dist', BASE_URL),
      reuseExistingServer: !process.env.CI,
    },
    {
      // dev-сборка: витрина /ui-kit (в production её нет)
      command: 'pnpm build:web:dev && node --env-file-if-exists=.env server/main.ts',
      url: DEV_URL,
      env: server(DEV_PORT, 'dist-dev', DEV_URL),
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
