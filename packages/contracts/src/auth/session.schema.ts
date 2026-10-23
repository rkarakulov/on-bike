import { z } from 'zod';

import { OpaqueToken } from './verification.schema.ts';

/**
 * Сессия: короткий access JWT (15 мин) + refresh (30 дней от выдачи; на сервере хранится только хеш).
 * Ротация refresh — `POST /v1/auth/session/refresh` (срок не продлевается); вход по паролю — слайс 2.
 */
export const Session = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: z.iso.datetime(),
  refreshToken: z.string().min(1),
  refreshTokenExpiresAt: z.iso.datetime(),
});
export type Session = z.infer<typeof Session>;

/**
 * Как клиент получает и передаёт refresh: `body` — в теле (native, SecureStore; по умолчанию),
 * `cookie` — только в httpOnly cookie `SESSION_COOKIE` (web: access в памяти, refresh скриптам недоступен).
 */
export const SessionTransport = z.enum(['body', 'cookie']);
export type SessionTransport = z.infer<typeof SessionTransport>;

/** Сессия для web (`cookie`): refresh в теле не приходит; схема отбрасывает его, даже если он есть. */
export const CookieSession = Session.omit({ refreshToken: true });
export type CookieSession = z.infer<typeof CookieSession>;

/** Ответ с сессией по любому транспорту. `Session` первым: он шире, с `refreshToken`. */
export const AnySession = z.union([Session, CookieSession]);
export type AnySession = z.infer<typeof AnySession>;

/**
 * `POST /v1/auth/session/refresh` — ротация: новый refresh взамен старого. `refreshToken` в теле → ответ
 * `Session` (body); тела нет → refresh из cookie, ответ `CookieSession` и новая cookie.
 */
export const RefreshSessionRequest = z.object({ refreshToken: OpaqueToken.optional() });
export type RefreshSessionRequest = z.infer<typeof RefreshSessionRequest>;

export const RefreshSessionResponse = AnySession;
export type RefreshSessionResponse = z.infer<typeof RefreshSessionResponse>;

/** `POST /v1/auth/session/sign-out` — отзыв сессии (refresh из тела или cookie), идемпотентно; ответ 204. */
export const SignOutRequest = RefreshSessionRequest;
export type SignOutRequest = z.infer<typeof SignOutRequest>;

/**
 * Cookie refresh для web: `HttpOnly; Secure; SameSite=Strict`, без `Domain`. Путь — только эндпоинты сессии:
 * cookie не уходит ни на регистрацию, ни на SSR-запросы web-сервера.
 */
export const SESSION_COOKIE = { name: '__Secure-onbike_rt', path: '/v1/auth/session' } as const;
