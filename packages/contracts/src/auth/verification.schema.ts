import { z } from 'zod';

import { fieldError } from '../common.ts';

/** Токен ссылки и токен регистрации: 32 байта в base64url без паддинга. */
export const OpaqueToken = z
  .string({ error: fieldError('INVALID') })
  .regex(/^[A-Za-z0-9_-]{43}$/, { error: 'INVALID' });

/** Токен из ссылки `…auth/verify/<token>` в письме. */
export const VerificationToken = OpaqueToken;
export type VerificationToken = z.infer<typeof VerificationToken>;

export const VerificationLinkState = z.enum(['valid', 'verified', 'expired']);
export type VerificationLinkState = z.infer<typeof VerificationLinkState>;

/**
 * `GET /v1/auth/verification/:token` — без побочных эффектов (C2).
 * `expired` — истекла или заменена новой ссылкой; `verified` важнее `expired`.
 */
export const VerificationLinkInfo = z.discriminatedUnion('state', [
  z.object({ state: z.literal('valid'), email: z.string() }),
  z.object({ state: z.literal('verified'), email: z.string() }),
  z.object({ state: z.literal('expired'), email: z.string() }),
]);
export type VerificationLinkInfo = z.infer<typeof VerificationLinkInfo>;

/** `POST /v1/auth/verification/confirm` — активация только POST; повтор — тот же ответ. */
export const ConfirmVerificationRequest = z.object({ token: VerificationToken });
export type ConfirmVerificationRequest = z.infer<typeof ConfirmVerificationRequest>;

export const ConfirmVerificationResponse = z.object({
  state: z.literal('verified'),
  email: z.string(),
});
export type ConfirmVerificationResponse = z.infer<typeof ConfirmVerificationResponse>;

/** `details` для `LINK_EXPIRED` (410): кому отправить новую ссылку. */
export const LinkExpiredDetails = z.object({ email: z.string() });
export type LinkExpiredDetails = z.infer<typeof LinkExpiredDetails>;

/** `POST /v1/auth/verification/resend` — с экрана «Подтвердите e-mail» или с устаревшей ссылки. */
export const ResendVerificationRequest = z.union([
  z.object({ registrationToken: OpaqueToken }),
  z.object({ linkToken: VerificationToken }),
]);
export type ResendVerificationRequest = z.infer<typeof ResendVerificationRequest>;

export const ResendVerificationResponse = z.union([
  z.object({ resendAvailableInSec: z.number().int().nonnegative() }),
  z.object({ state: z.literal('verified') }),
]);
export type ResendVerificationResponse = z.infer<typeof ResendVerificationResponse>;
