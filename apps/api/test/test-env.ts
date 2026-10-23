import { env, type Env } from '../src/config/env';

// пользователь и пароль = имя dev-БД (infra/docker-compose.dev.yml); тестовая база — `<имя>_test`
const DB = 'on_bike';

// тестовые адреса задаются только переменными *_TEST — dev-базу тесты не трогают
export const DATABASE_URL_TEST =
  process.env.DATABASE_URL_TEST ?? `postgres://${DB}:${DB}@127.0.0.1:5432/${DB}_test`;
export const REDIS_URL_TEST = process.env.REDIS_URL_TEST ?? 'redis://127.0.0.1:6379/1';

/** Окружение API для тестов: несекретные фиктивные значения, SMTP не используется (fake MAILER). */
export function testEnv(overrides: Partial<Record<keyof Env, string>> = {}): Env {
  // явный источник: .env разработчика не читается
  return env.load({
    NODE_ENV: 'test',
    DATABASE_URL: DATABASE_URL_TEST,
    REDIS_URL: REDIS_URL_TEST,
    SMTP_URL: 'smtp://127.0.0.1:1025',
    JWT_SECRET: 'test-jwt-secret-test-jwt-secret-0000',
    EMAIL_TOKEN_SECRET: 'test-email-secret-test-email-secret-0',
    MAIL_FROM: 'on-bike <no-reply@on-bike.test>',
    APP_LINK_BASE: 'onbike://',
    AGREEMENT_VERSION: 'test-agreement',
    TRUST_PROXY: '0',
    ...overrides,
  });
}
