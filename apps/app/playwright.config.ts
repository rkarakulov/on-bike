import { defineConfig } from '@playwright/test';

import { BASE_URL, DEV_PORT, DEV_URL, PORT } from './e2e/urls';

// Смоук web в браузере: `pnpm e2e:web` после `pnpm build:web` (docs/runbooks/local-dev.md, «Web»).
// Браузер — установленный Google Chrome (есть на ubuntu-latest): без загрузки браузеров Playwright.
// Без Chrome: PW_CHANNEL=chromium и один раз `pnpm exec playwright install chromium`.
const channel = process.env.PW_CHANNEL ?? 'chrome';

const server = (port: number, dist: string, url: string) => ({
  PORT: String(port),
  HOST: '127.0.0.1',
  WEB_DIST: dist,
  WEB_ORIGIN: url,
});

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  use: { baseURL: BASE_URL, channel, trace: 'retain-on-failure' },
  webServer: [
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
