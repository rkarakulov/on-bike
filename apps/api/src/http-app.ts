import { API_VERSION } from '@on-bike/contracts';
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { configureHttpApp } from '@rkarakulov/api-kit';

import type { Env } from './config/env';

/**
 * HTTP-конфигурация on-bike поверх базы (`main.ts` и тест `http-app.test.ts`), до `app.init()`:
 * - CORS с credentials — только для `CORS_ORIGINS` (dev: web на другом порту того же хоста шлёт cookie
 *   сессии); пусто — CORS выключен (прод: web и API за одним origin);
 * - CSRF — Fetch Metadata (`Sec-Fetch-Site`) с fallback `Origin`/`Host` глобально: небезопасный запрос
 *   с чужого сайта → 403, native без этих заголовков проходит. Доверены только те же `CORS_ORIGINS`.
 * Вне production пустой `CORS_ORIGINS` — предупреждение в лог: web в dev (другой порт) без него не ходит в API.
 */
export function configureHttp(
  app: NestFastifyApplication,
  env: Pick<Env, 'CORS_ORIGINS' | 'NODE_ENV'>,
): NestFastifyApplication {
  configureHttpApp(app, { prefix: API_VERSION });
  if (env.CORS_ORIGINS.length > 0) {
    app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  } else if (env.NODE_ENV !== 'production') {
    new Logger('Http').warn(
      'CORS_ORIGINS пуст: браузер с другого origin (web в dev) не получит ответы API — задайте origin-ы web (apps/api/.env.example)',
    );
  }
  app.enableCsrfProtection({ trustedOrigins: env.CORS_ORIGINS });
  return app;
}
