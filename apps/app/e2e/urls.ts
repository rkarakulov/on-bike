import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

// Адреса web-серверов смоука (playwright.config.ts): production-сборка (dist) и dev-сборка (dist-dev).
export const PORT = Number(process.env.E2E_PORT ?? 8090);
export const DEV_PORT = Number(process.env.E2E_DEV_PORT ?? PORT + 1);

export const BASE_URL = `http://127.0.0.1:${PORT}`;
export const DEV_URL = `http://127.0.0.1:${DEV_PORT}`;

/** API доступен смоуку (`E2E_API=1`): поднят заранее или серверами проекта (`e2e/project.ts`). */
export const WITH_API = process.env.E2E_API === '1';
/**
 * Адрес API смоука — тот же, что вшит в сборку: `EXPO_PUBLIC_API_URL` из env процесса, иначе из `apps/app/.env`
 * (`expo export` читает его сам, Playwright и turbo — нет), иначе адрес dev. Из `.env` — только эта переменная:
 * `PORT`/`HOST` оттуда не должны попасть в серверы смоука.
 */
export function resolveApiUrl(
  env: Record<string, string | undefined>,
  dotenv: string | undefined,
): string {
  const fromFile = dotenv === undefined ? undefined : parseEnv(dotenv).EXPO_PUBLIC_API_URL;
  return (env.EXPO_PUBLIC_API_URL || fromFile || 'http://127.0.0.1:3000').replace(/\/$/, '');
}

const DOTENV = resolve(__dirname, '../.env');
export const API_URL = resolveApiUrl(
  process.env,
  existsSync(DOTENV) ? readFileSync(DOTENV, 'utf8') : undefined,
);
