import { existsSync } from 'node:fs';

import { z } from 'zod';

const Secret = z.string().min(32, 'не короче 32 символов');

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  /**
   * Сколько прокси перед API доверять в X-Forwarded-For (лимит регистраций по IP). 0 — не доверять;
   * за Caddy — 1: берётся адрес, который добавил Caddy, а не самый левый (его задаёт клиент).
   */
  TRUST_PROXY: z.preprocess(
    // совместимость со старыми .env: false/true → 0/1
    (value) => (value === 'false' ? 0 : value === 'true' ? 1 : value),
    z.coerce.number().int().min(0).max(5).default(0),
  ),
  /** Подпись access JWT (HS256). */
  JWT_SECRET: Secret,
  /** Ключ HMAC для токенов ссылок в письмах: ссылку можно пересобрать по id строки, сырого токена нет нигде. */
  EMAIL_TOKEN_SECRET: Secret,
  SMTP_URL: z.url(),
  MAIL_FROM: z.string().min(3),
  /** База ссылок приложения: `onbike://` в сборках, `exp://<host>:8081/--/` в Expo Go. */
  APP_LINK_BASE: z
    .string()
    .regex(/^[a-z][a-z0-9+.-]*:\/\/(.*\/)?$/i, 'схема://…/ — с завершающим слешем'),
  /** Версия соглашения и согласия на обработку данных, которую принимает пользователь при регистрации. */
  AGREEMENT_VERSION: z.string().min(1),
});
export type Env = z.infer<typeof Env>;

/**
 * Падаем на старте, если окружение невалидно — лучше, чем в рантайме.
 * Локально подхватываем apps/api/.env; уже заданные переменные (прод, CI) он не перекрывает.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (source === process.env && existsSync('.env')) process.loadEnvFile('.env');
  return Env.parse(source);
}

export const ENV = Symbol('ENV');
