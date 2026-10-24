import { z } from 'zod';

import { Email, Password } from './registration.schema.ts';
import { OpaqueToken } from './verification.schema.ts';

/** Токен из ссылки `…auth/reset/<token>` в письме сброса пароля. */
export const PasswordResetToken = OpaqueToken;
export type PasswordResetToken = z.infer<typeof PasswordResetToken>;

/** `POST /v1/auth/password-reset` — запрос ссылки по e-mail. Лишние ключи — 400. */
export const RequestPasswordResetRequest = z.strictObject({ email: Email });
export type RequestPasswordResetRequest = z.infer<typeof RequestPasswordResetRequest>;

/** Один и тот же ответ для любого адреса: существует ли аккаунт — не раскрывается. */
export const RequestPasswordResetResponse = z.object({
  resendAvailableInSec: z.number().int().nonnegative(),
});
export type RequestPasswordResetResponse = z.infer<typeof RequestPasswordResetResponse>;

export const PasswordResetLinkState = z.enum(['valid', 'expired', 'used']);
export type PasswordResetLinkState = z.infer<typeof PasswordResetLinkState>;

/**
 * `GET /v1/auth/password-reset/:token` — без побочных эффектов. `expired` — истекла или заменена новой ссылкой;
 * `used` — пароль по ней уже сменили. Неизвестный токен и удалённый аккаунт — 404.
 */
export const PasswordResetLinkInfo = z.discriminatedUnion('state', [
  z.object({ state: z.literal('valid'), email: z.string() }),
  z.object({ state: z.literal('expired'), email: z.string() }),
  z.object({ state: z.literal('used'), email: z.string() }),
]);
export type PasswordResetLinkInfo = z.infer<typeof PasswordResetLinkInfo>;

/**
 * `POST /v1/auth/password-reset/confirm` — смена пароля по живой ссылке; отзывает все сессии аккаунта.
 * Пароль — по политике регистрации (8–128). Устаревшая или использованная ссылка — 410 `LINK_EXPIRED`.
 */
export const ConfirmPasswordResetRequest = z.strictObject({
  token: PasswordResetToken,
  password: Password,
});
export type ConfirmPasswordResetRequest = z.infer<typeof ConfirmPasswordResetRequest>;

/** Сессию сброс не выдаёт: дальше — «Вход» с новым паролем. */
export const ConfirmPasswordResetResponse = z.object({
  state: z.literal('passwordChanged'),
  email: z.string(),
});
export type ConfirmPasswordResetResponse = z.infer<typeof ConfirmPasswordResetResponse>;
