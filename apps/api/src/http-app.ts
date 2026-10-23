import { API_VERSION } from '@on-bike/contracts';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { configureHttpApp } from '@rkarakulov/api-kit';

import type { Env } from './config/env';

/**
 * HTTP-конфигурация on-bike поверх базы (`main.ts` и тест `http-app.test.ts`), до `app.init()`:
 * - CORS с credentials — только для `CORS_ORIGINS` (dev: web на другом порту того же хоста шлёт cookie
 *   сессии); пусто — CORS выключен (прод: web и API за одним origin);
 * - CSRF — Fetch Metadata (`Sec-Fetch-Site`) с fallback `Origin`/`Host` глобально: небезопасный запрос
 *   с чужого сайта → 403, native без этих заголовков проходит. Доверены только те же `CORS_ORIGINS`.
 */
export function configureOnBikeHttp(
  app: NestFastifyApplication,
  env: Pick<Env, 'CORS_ORIGINS'>,
): NestFastifyApplication {
  configureHttpApp(app, { prefix: API_VERSION });
  if (env.CORS_ORIGINS.length > 0) {
    app.enableCors({ origin: env.CORS_ORIGINS, credentials: true });
  }
  app.enableCsrfProtection({ trustedOrigins: env.CORS_ORIGINS });
  return app;
}
