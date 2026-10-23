// Адреса web-серверов смоука (playwright.config.ts): production-сборка (dist) и dev-сборка (dist-dev).
export const PORT = Number(process.env.E2E_PORT ?? 8090);
export const DEV_PORT = Number(process.env.E2E_DEV_PORT ?? PORT + 1);

export const BASE_URL = `http://127.0.0.1:${PORT}`;
export const DEV_URL = `http://127.0.0.1:${DEV_PORT}`;

// on-bike: сценарии с API (регистрация → письмо → вход) — только при E2E_API=1; API и worker поднимает
// playwright.config.ts из apps/api/dist, PostgreSQL, Redis и Mailpit — `pnpm infra:up` (в CI — services)
export const WITH_API = process.env.E2E_API === '1';
/** Адрес API — тот же, что вшит в сборку (`EXPO_PUBLIC_API_URL`), иначе запросы web ушли бы мимо. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
);
/** HTTP API Mailpit (письма регистрации). */
export const MAILPIT_URL = (process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025').replace(/\/$/, '');
