import { env, type Env } from '../src/config/env';

// тестовые адреса задаются только переменными *_TEST — dev-базу тесты не трогают
export const DATABASE_URL_TEST =
  process.env.DATABASE_URL_TEST ?? 'postgres://onbike:onbike@127.0.0.1:5432/onbike_test';
export const REDIS_URL_TEST = process.env.REDIS_URL_TEST ?? 'redis://127.0.0.1:6379/1';

/** Окружение API для тестов: несекретные фиктивные значения, SMTP не используется (fake MAILER). */
export function testEnv(overrides: Partial<Record<keyof Env, string>> = {}): Env {
  // явный источник: .env разработчика не читается
  return env.load({
    NODE_ENV: 'test',
    DATABASE_URL: DATABASE_URL_TEST,
    REDIS_URL: REDIS_URL_TEST,
    JWT_SECRET: 'test-jwt-secret-test-jwt-secret-0000',
    EMAIL_TOKEN_SECRET: 'test-email-secret-test-email-secret-0',
    SMTP_URL: 'smtp://127.0.0.1:1025',
    MAIL_FROM: 'on-bike <no-reply@on-bike.test>',
    APP_LINK_BASE: 'onbike://',
    AGREEMENT_VERSION: 'test-agreement',
    TRUST_PROXY: '0',
    ...overrides,
  });
}
