import { RegisterRequest, ValidationErrorDetails } from '@on-bike/contracts';
import { describe, expect, it } from 'vitest';

import { DomainError } from './domain-error';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(RegisterRequest);

  it('валидный вход — разобранные данные', () => {
    const input = {
      email: 'rider@example.com',
      password: 'long-enough',
      birthDate: '1990-05-01',
      personalDataConsent: true,
    };
    expect(pipe.transform(input)).toEqual(input);
  });

  it('невалидный — VALIDATION_FAILED с кодами полей и без введённых значений', () => {
    const secret = 'short';
    const error = (() => {
      try {
        pipe.transform({ email: 'x', password: secret, birthDate: '1990-05-01' });
      } catch (e) {
        return e;
      }
    })() as DomainError;

    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.status).toBe(400);
    expect(ValidationErrorDetails.parse(error.details)).toEqual({
      fields: [
        { path: 'email', code: 'INVALID_EMAIL' },
        { path: 'password', code: 'TOO_SHORT' },
        { path: 'personalDataConsent', code: 'CONSENT_REQUIRED' },
      ],
    });
    expect(JSON.stringify(error.details)).not.toContain(secret);
  });

  it('сообщение не из кодов полей — INVALID', () => {
    const error = (() => {
      try {
        new ZodValidationPipe(RegisterRequest.pick({ email: true }).strict()).transform({
          email: 'a@b.by',
          extra: 1,
        });
      } catch (e) {
        return e;
      }
    })() as DomainError;
    expect(error.details).toEqual({ fields: [{ path: '', code: 'INVALID' }] });
  });
});
