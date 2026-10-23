import { defineEnv, mailEnvShape } from '@rkarakulov/api-kit';
import { z } from 'zod';

const Secret = z.string().min(32, 'не короче 32 символов');

/** Окружение проекта: основа базы (процесс, PostgreSQL, Redis, TRUST_PROXY) + почта; свои переменные — сюда. */
export const env = defineEnv({
  ...mailEnvShape,
  /** Подпись access JWT (HS256). */
  JWT_SECRET: Secret,
  /** Ключ HMAC для токенов ссылок в письмах: ссылку можно пересобрать по id строки, сырого токена нет нигде. */
  EMAIL_TOKEN_SECRET: Secret,
  /** База ссылок приложения: `onbike://` в сборках, `exp://<host>:8081/--/` в Expo Go. */
  APP_LINK_BASE: z
    .string()
    .regex(/^[a-z][a-z0-9+.-]*:\/\/(.*\/)?$/i, 'схема://…/ — с завершающим слешем'),
  /** Версия соглашения и согласия на обработку данных, которую принимает пользователь при регистрации. */
  AGREEMENT_VERSION: z.string().min(1),
});
export type Env = ReturnType<typeof env.load>;

/**
 * Падаем на старте, если окружение невалидно — лучше, чем в рантайме.
 * Локально подхватываем apps/api/.env; уже заданные переменные (прод, CI) он не перекрывает.
 */
export const loadEnv = (source?: NodeJS.ProcessEnv): Env => env.load(source);
