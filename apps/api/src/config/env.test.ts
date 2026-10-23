import { describe, expect, it } from 'vitest';

import { testEnv } from '../../test/test-env';

describe('env', () => {
  it('APP_LINK_BASE: схема приложения или Expo Go, всегда с завершающим слешем', () => {
    expect(testEnv({ APP_LINK_BASE: 'onbike://' }).APP_LINK_BASE).toBe('onbike://');
    expect(testEnv({ APP_LINK_BASE: 'exp://127.0.0.1:8081/--/' }).APP_LINK_BASE).toBe(
      'exp://127.0.0.1:8081/--/',
    );
    expect(() => testEnv({ APP_LINK_BASE: 'exp://127.0.0.1:8081/--' })).toThrow();
  });

  it('секреты короче 32 символов не принимаются', () => {
    expect(() => testEnv({ JWT_SECRET: 'short' })).toThrow();
    expect(() => testEnv({ EMAIL_TOKEN_SECRET: 'short' })).toThrow();
  });

  it('почта: SMTP_URL — URL, MAIL_FROM — не пустой', () => {
    expect(testEnv().SMTP_URL).toBe('smtp://127.0.0.1:1025');
    expect(() => testEnv({ SMTP_URL: 'not a url' })).toThrow();
    expect(() => testEnv({ MAIL_FROM: '' })).toThrow();
  });

  it('CORS_ORIGINS: список origin через запятую; пусто — CORS выключен', () => {
    expect(testEnv().CORS_ORIGINS).toEqual([]);
    expect(testEnv({ CORS_ORIGINS: '' }).CORS_ORIGINS).toEqual([]);
    expect(
      testEnv({ CORS_ORIGINS: 'http://localhost:8081, https://app.example.com' }).CORS_ORIGINS,
    ).toEqual(['http://localhost:8081', 'https://app.example.com']);
  });

  it('CORS_ORIGINS: не origin (путь, «/» в конце, не URL) — ошибка', () => {
    expect(() => testEnv({ CORS_ORIGINS: 'https://app.example.com/path' })).toThrow();
    expect(() => testEnv({ CORS_ORIGINS: 'https://app.example.com/' })).toThrow();
    expect(() => testEnv({ CORS_ORIGINS: 'localhost:8081' })).toThrow();
    expect(() => testEnv({ CORS_ORIGINS: '*' })).toThrow();
  });

  it('адреса PostgreSQL и Redis обязательны и валидны', () => {
    expect(() => testEnv({ DATABASE_URL: 'nope' })).toThrow();
    expect(() => testEnv({ REDIS_URL: '' })).toThrow();
  });
});
