import { z } from 'zod';

/** Версия публичного API: установленные приложения живут на старых версиях, ломать нельзя. */
export const API_VERSION = 'v1' as const;

export const Uuid = z.uuid();

export const PageQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PageQuery = z.infer<typeof PageQuery>;

export const ErrorCode = z.enum([
  'VALIDATION_FAILED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL',
  // регистрация
  'EMAIL_TAKEN',
  'EMAIL_UNAVAILABLE',
  'LINK_EXPIRED',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ApiError = z.object({
  code: ErrorCode,
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiError>;

/**
 * Коды ошибок полей: сообщение zod-схемы = код, текст для человека выбирает клиент (i18n).
 * `INVALID` — общий случай для полей без своего кода.
 */
export const FieldErrorCode = z.enum([
  'REQUIRED',
  'INVALID',
  'INVALID_EMAIL',
  'TOO_SHORT',
  'TOO_LONG',
  'INVALID_DATE',
  'AGE_BELOW_18',
  'CONSENT_REQUIRED',
]);
export type FieldErrorCode = z.infer<typeof FieldErrorCode>;

/** `details` для `VALIDATION_FAILED`: путь поля через точку и код, без введённого значения. */
export const ValidationErrorDetails = z.object({
  fields: z.array(z.object({ path: z.string(), code: FieldErrorCode })),
});
export type ValidationErrorDetails = z.infer<typeof ValidationErrorDetails>;

/** `details` для `RATE_LIMITED`; то же значение — в заголовке `Retry-After`. */
export const RateLimitedDetails = z.object({ retryAfterSec: z.number().int().nonnegative() });
export type RateLimitedDetails = z.infer<typeof RateLimitedDetails>;

/** Сообщение zod = код поля; `undefined` на входе — `REQUIRED`. */
export const fieldError =
  (code: FieldErrorCode) =>
  (issue: { input?: unknown }): FieldErrorCode =>
    issue.input === undefined ? 'REQUIRED' : code;
