import { describe, expect, it } from 'vitest';

import {
  ConfirmPasswordResetRequest,
  ConfirmPasswordResetResponse,
  PasswordResetLinkInfo,
  RequestPasswordResetRequest,
  RequestPasswordResetResponse,
} from './password-reset.schema.ts';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './registration.schema.ts';

const token = 'Ab9_-'.repeat(8) + 'xyz';

const issues = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) =>
  result.success
    ? []
    : (result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]);

describe('RequestPasswordResetRequest', () => {
  it('пробелы по краям e-mail срезаются, регистр приводит сервер', () => {
    expect(RequestPasswordResetRequest.parse({ email: ' Rider@Example.com ' })).toEqual({
      email: 'Rider@Example.com',
    });
  });

  it('неверный e-mail — INVALID_EMAIL, нет e-mail — REQUIRED', () => {
    expect(issues(RequestPasswordResetRequest.safeParse({ email: 'ivan@' }))).toEqual([
      ['email', 'INVALID_EMAIL'],
    ]);
    expect(issues(RequestPasswordResetRequest.safeParse({}))).toEqual([['email', 'REQUIRED']]);
  });

  it('лишний ключ — ошибка', () => {
    expect(RequestPasswordResetRequest.safeParse({ email: 'a@b.by', extra: 1 }).success).toBe(
      false,
    );
  });
});

describe('RequestPasswordResetResponse', () => {
  it('только пауза повтора — один ответ для любого адреса', () => {
    expect(RequestPasswordResetResponse.parse({ resendAvailableInSec: 60 })).toEqual({
      resendAvailableInSec: 60,
    });
    expect(RequestPasswordResetResponse.safeParse({ resendAvailableInSec: -1 }).success).toBe(
      false,
    );
  });
});

describe('PasswordResetLinkInfo', () => {
  it('три состояния, каждое несёт e-mail', () => {
    for (const state of ['valid', 'expired', 'used'] as const) {
      expect(PasswordResetLinkInfo.parse({ state, email: 'rider@example.com' }).state).toBe(state);
      expect(PasswordResetLinkInfo.safeParse({ state }).success).toBe(false);
    }
    expect(PasswordResetLinkInfo.safeParse({ state: 'verified', email: 'a@b.by' }).success).toBe(
      false,
    );
  });
});

describe('ConfirmPasswordResetRequest', () => {
  it('токен и пароль по политике регистрации', () => {
    const body = { token, password: 'x'.repeat(PASSWORD_MIN_LENGTH) };
    expect(ConfirmPasswordResetRequest.parse(body)).toEqual(body);
    expect(
      ConfirmPasswordResetRequest.safeParse({ token, password: 'x'.repeat(PASSWORD_MAX_LENGTH) })
        .success,
    ).toBe(true);
  });

  it('пароль короче 8 — TOO_SHORT, длиннее 128 — TOO_LONG', () => {
    expect(
      issues(
        ConfirmPasswordResetRequest.safeParse({
          token,
          password: 'x'.repeat(PASSWORD_MIN_LENGTH - 1),
        }),
      ),
    ).toEqual([['password', 'TOO_SHORT']]);
    expect(
      issues(
        ConfirmPasswordResetRequest.safeParse({
          token,
          password: 'x'.repeat(PASSWORD_MAX_LENGTH + 1),
        }),
      ),
    ).toEqual([['password', 'TOO_LONG']]);
  });

  it('токен не по формату — INVALID, лишний ключ — ошибка', () => {
    expect(
      issues(
        ConfirmPasswordResetRequest.safeParse({ token: token.slice(1), password: 'long-enough' }),
      ),
    ).toEqual([['token', 'INVALID']]);
    expect(
      ConfirmPasswordResetRequest.safeParse({ token, password: 'long-enough', email: 'a@b.by' })
        .success,
    ).toBe(false);
  });
});

describe('ConfirmPasswordResetResponse', () => {
  it('passwordChanged с e-mail, сессии нет', () => {
    expect(
      ConfirmPasswordResetResponse.parse({ state: 'passwordChanged', email: 'a@b.by' }),
    ).toEqual({ state: 'passwordChanged', email: 'a@b.by' });
    expect(
      ConfirmPasswordResetResponse.safeParse({ state: 'signedIn', email: 'a@b.by' }).success,
    ).toBe(false);
  });
});
