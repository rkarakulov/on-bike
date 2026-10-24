import { z } from 'zod';

import { fieldError } from '../common.ts';
import { Email, PASSWORD_MAX_LENGTH, RegistrationToken } from './registration.schema.ts';
import { AnySession, SessionTransport } from './session.schema.ts';

/**
 * Пароль входа: только «не пусто» и верхний предел (он же ограничивает работу argon2). Без `TOO_SHORT`:
 * политика длины — у регистрации, вход не подсказывает, каким пароль быть не может.
 */
export const SignInPassword = z
  .string({ error: fieldError('REQUIRED') })
  .min(1, { error: 'REQUIRED' })
  .max(PASSWORD_MAX_LENGTH, { error: 'TOO_LONG' });

/**
 * `POST /v1/auth/session/sign-in` — вход по e-mail и паролю. Путь — под `SESSION_COOKIE.path`: вход видит прежнюю
 * cookie браузера и отзывает её сессию. `sessionTransport` — как у poll (`body` по умолчанию). Лишние ключи — 400.
 */
export const SignInRequest = z.strictObject({
  email: Email,
  password: SignInPassword,
  sessionTransport: SessionTransport.optional(),
});
export type SignInRequest = z.infer<typeof SignInRequest>;

/**
 * `signedIn` — сессия по транспорту (`Session` / `CookieSession`). `verificationRequired` — пароль верный, но
 * e-mail не подтверждён (AD-28): сессии нет, новый токен регистрации для «Подтвердите e-mail» (poll, resend).
 * Неверный пароль, неизвестный и удалённый адрес — одинаковый 401 `INVALID_CREDENTIALS`.
 */
export const SignInResponse = z.discriminatedUnion('state', [
  z.object({ state: z.literal('signedIn'), session: AnySession }),
  z.object({
    state: z.literal('verificationRequired'),
    registrationToken: RegistrationToken,
    email: z.string(),
    resendAvailableInSec: z.number().int().nonnegative(),
  }),
]);
export type SignInResponse = z.infer<typeof SignInResponse>;
