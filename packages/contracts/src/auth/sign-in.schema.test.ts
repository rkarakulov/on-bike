import { describe, expect, it } from 'vitest';

import { PASSWORD_MAX_LENGTH } from './registration.schema.ts';
import { SignInPassword, SignInRequest, SignInResponse } from './sign-in.schema.ts';

const token = 'r'.repeat(43);
const cookieSession = {
  accessToken: 'jwt',
  accessTokenExpiresAt: '2026-10-24T10:15:00.000Z',
  refreshTokenExpiresAt: '2026-11-23T10:00:00.000Z',
};
const session = { ...cookieSession, refreshToken: token };

const fieldCodes = (input: unknown) => {
  const result = SignInRequest.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => [issue.path.join('.'), issue.message]);
};

describe('SignInRequest', () => {
  it('e-mail и пароль; пробелы по краям e-mail срезаются, регистр приводит сервер', () => {
    expect(SignInRequest.parse({ email: ' Rider@Example.com ', password: 'x' })).toEqual({
      email: 'Rider@Example.com',
      password: 'x',
    });
  });

  it('транспорт сессии — body или cookie, другое — ошибка', () => {
    expect(
      SignInRequest.parse({ email: 'a@b.by', password: 'x', sessionTransport: 'cookie' }),
    ).toMatchObject({ sessionTransport: 'cookie' });
    expect(
      SignInRequest.safeParse({ email: 'a@b.by', password: 'x', sessionTransport: 'header' })
        .success,
    ).toBe(false);
  });

  it('пустой пароль — REQUIRED, длиннее предела — TOO_LONG; короткий пароль не отвергается (политика — у регистрации)', () => {
    expect(fieldCodes({ email: 'a@b.by', password: '' })).toEqual([['password', 'REQUIRED']]);
    expect(fieldCodes({ email: 'a@b.by' })).toEqual([['password', 'REQUIRED']]);
    expect(fieldCodes({ email: 'a@b.by', password: 'x'.repeat(PASSWORD_MAX_LENGTH + 1) })).toEqual([
      ['password', 'TOO_LONG'],
    ]);
    expect(SignInPassword.safeParse('x'.repeat(PASSWORD_MAX_LENGTH)).success).toBe(true);
    expect(SignInPassword.safeParse('short').success).toBe(true);
  });

  it('неверный e-mail — INVALID_EMAIL', () => {
    expect(fieldCodes({ email: 'ivan@', password: 'x' })).toEqual([['email', 'INVALID_EMAIL']]);
  });

  it('лишний ключ — ошибка (вход не принимает ничего, кроме контракта)', () => {
    expect(
      SignInRequest.safeParse({ email: 'a@b.by', password: 'x', remember: true }).success,
    ).toBe(false);
  });
});

describe('SignInResponse', () => {
  it('signedIn: Session (body) или CookieSession (cookie, refresh отброшен)', () => {
    expect(SignInResponse.parse({ state: 'signedIn', session })).toEqual({
      state: 'signedIn',
      session,
    });
    expect(SignInResponse.parse({ state: 'signedIn', session: cookieSession })).toEqual({
      state: 'signedIn',
      session: cookieSession,
    });
  });

  it('verificationRequired: токен регистрации, e-mail и пауза повтора письма', () => {
    const body = {
      state: 'verificationRequired',
      registrationToken: token,
      email: 'rider@example.com',
      resendAvailableInSec: 60,
    };
    expect(SignInResponse.parse(body)).toEqual(body);
    expect(SignInResponse.safeParse({ ...body, registrationToken: 'short' }).success).toBe(false);
    expect(SignInResponse.safeParse({ ...body, resendAvailableInSec: -1 }).success).toBe(false);
  });

  it('незнакомое состояние — ошибка', () => {
    expect(SignInResponse.safeParse({ state: 'locked' }).success).toBe(false);
  });
});
