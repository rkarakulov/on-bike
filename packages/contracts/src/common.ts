import { defineErrorCodes, defineFieldErrorCodes } from '@rkarakulov/contracts-core';
import type { z } from 'zod';

/** Версия публичного API: установленные приложения живут на старых версиях, ломать нельзя. */
export const API_VERSION = 'v1' as const;

export { PageQuery, RateLimitedDetails, Uuid } from '@rkarakulov/contracts-core';

/** Коды базы: их тексты и обработку даёт инфраструктура базы (фильтр ошибок api-kit, клиент). */
export { BASE_ERROR_CODES, type BaseErrorCode } from '@rkarakulov/contracts-core';

/** Коды ошибок API: коды базы + коды on-bike (регистрация). Порядок — база первой. */
export const { ErrorCode, ApiError } = defineErrorCodes([
  'EMAIL_TAKEN',
  'EMAIL_UNAVAILABLE',
  'LINK_EXPIRED',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;
export type ApiError = z.infer<typeof ApiError>;

/**
 * Коды ошибок полей: коды базы (`REQUIRED`, `INVALID`, …) + коды on-bike. Сообщение zod-схемы = код,
 * текст для человека выбирает клиент (i18n). `fieldError` — с кодами on-bike, не базовый.
 */
export const { FieldErrorCode, ValidationErrorDetails, fieldError } = defineFieldErrorCodes([
  'AGE_BELOW_18',
  'CONSENT_REQUIRED',
]);
export type FieldErrorCode = z.infer<typeof FieldErrorCode>;
export type ValidationErrorDetails = z.infer<typeof ValidationErrorDetails>;
