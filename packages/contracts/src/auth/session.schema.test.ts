import { describe, expect, it } from 'vitest';

import {
  AnySession,
  CookieSession,
  RefreshSessionRequest,
  RefreshSessionResponse,
  Session,
  SESSION_COOKIE,
  SessionTransport,
  SignOutRequest,
} from './session.schema.ts';

const token = 'r'.repeat(43);
const cookieSession = {
  accessToken: 'jwt',
  accessTokenExpiresAt: '2026-10-22T10:15:00.000Z',
  refreshTokenExpiresAt: '2026-11-21T10:00:00.000Z',
};
const session = { ...cookieSession, refreshToken: token };

describe('SessionTransport', () => {
  it('body (native) или cookie (web), другое — ошибка', () => {
    expect(SessionTransport.options).toEqual(['body', 'cookie']);
    expect(SessionTransport.safeParse('header').success).toBe(false);
  });
});

describe('CookieSession — ответ web: refresh только в cookie', () => {
  it('отбрасывает refreshToken, даже если сервер его прислал', () => {
    expect(CookieSession.parse(session)).toEqual(cookieSession);
    expect('refreshToken' in CookieSession.parse(session)).toBe(false);
  });

  it('access и сроки обязательны', () => {
    expect(CookieSession.safeParse({ accessToken: 'jwt' }).success).toBe(false);
  });
});

describe('AnySession / RefreshSessionResponse', () => {
  it('body-ответ — полный Session с refreshToken', () => {
    expect(AnySession.parse(session)).toEqual(session);
    expect(Session.safeParse(RefreshSessionResponse.parse(session)).success).toBe(true);
  });

  it('cookie-ответ — без refreshToken', () => {
    expect(RefreshSessionResponse.parse(cookieSession)).toEqual(cookieSession);
  });
});

describe('RefreshSessionRequest / SignOutRequest', () => {
  it('refreshToken в теле (native) или пусто — тогда из cookie (web)', () => {
    expect(RefreshSessionRequest.parse({ refreshToken: token })).toEqual({ refreshToken: token });
    expect(RefreshSessionRequest.parse({})).toEqual({});
    expect(SignOutRequest.parse({})).toEqual({});
  });

  it('refreshToken — непрозрачный токен 43 символа base64url', () => {
    expect(RefreshSessionRequest.safeParse({ refreshToken: 'short' }).success).toBe(false);
    expect(SignOutRequest.safeParse({ refreshToken: `${'a'.repeat(42)}!` }).success).toBe(false);
  });
});

describe('SESSION_COOKIE', () => {
  it('имя с префиксом __Secure-, путь сужен до эндпоинтов сессии', () => {
    expect(SESSION_COOKIE).toEqual({ name: '__Secure-pokatim_rt', path: '/v1/auth/session' });
  });
});
