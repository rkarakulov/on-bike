import { describe, expect, it } from 'vitest';

import {
  ApiError,
  ErrorCode,
  FieldErrorCode,
  RateLimitedDetails,
  ValidationErrorDetails,
} from './common.ts';
import { LinkExpiredDetails } from './auth/verification.schema.ts';

describe('коды ошибок', () => {
  it('содержат коды регистрации', () => {
    for (const code of ['EMAIL_TAKEN', 'EMAIL_UNAVAILABLE', 'LINK_EXPIRED'] as const) {
      expect(ErrorCode.parse(code)).toBe(code);
    }
    expect(ApiError.safeParse({ code: 'SOMETHING_NEW', message: 'x' }).success).toBe(false);
  });

  it('детали ошибок по кодам', () => {
    expect(
      ValidationErrorDetails.parse({ fields: [{ path: 'email', code: 'INVALID_EMAIL' }] }),
    ).toEqual({ fields: [{ path: 'email', code: 'INVALID_EMAIL' }] });
    expect(FieldErrorCode.safeParse('WHATEVER').success).toBe(false);
    expect(RateLimitedDetails.parse({ retryAfterSec: 42 })).toEqual({ retryAfterSec: 42 });
    expect(RateLimitedDetails.safeParse({ retryAfterSec: -1 }).success).toBe(false);
    expect(LinkExpiredDetails.parse({ email: 'rider@example.com' })).toEqual({
      email: 'rider@example.com',
    });
  });
});
