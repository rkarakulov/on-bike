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
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ApiError = z.object({
  code: ErrorCode,
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof ApiError>;
