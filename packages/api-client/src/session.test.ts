import { describe, expect, it } from 'vitest';

import { createApiClient, type ApiClientOptions } from './index.ts';

const token = 'R'.repeat(43);
const cookieSession = {
  accessToken: 'jwt',
  accessTokenExpiresAt: '2026-10-22T10:15:00.000Z',
  refreshTokenExpiresAt: '2026-11-21T10:00:00.000Z',
};
const session = { ...cookieSession, refreshToken: token };

interface Call {
  url: string;
  method: string | undefined;
  credentials: RequestCredentials | undefined;
  body: unknown;
}

/** fetch-заглушка: запоминает запросы; `null` в ответе — пустое тело (204). */
function client(status: number, response: unknown, options: Partial<ApiClientOptions> = {}) {
  const calls: Call[] = [];
  const fetchImpl = ((url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method,
      credentials: init?.credentials,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    const body = response === null ? null : JSON.stringify(response);
    return Promise.resolve(new Response(body, { status }));
  }) as typeof fetch;
  return { calls, api: createApiClient({ baseUrl: 'https://api.test', fetchImpl, ...options }) };
}

describe('api-client: credentials (web — cookie сессии)', () => {
  it('credentials из опций уходит в каждый fetch: GET и POST', async () => {
    const { calls, api } = client(200, { state: 'pending' }, { credentials: 'include' });
    await api.pollRegistration({ registrationToken: token });
    await api.getVerificationLink(token).catch(() => undefined);
    expect(calls.map((call) => call.credentials)).toEqual(['include', 'include']);
  });

  it('без опции — поле не задаётся (fetch по умолчанию, native)', async () => {
    const { calls, api } = client(200, { state: 'pending' });
    await api.pollRegistration({ registrationToken: token });
    expect(calls[0]?.credentials).toBeUndefined();
  });
});

describe('api-client: транспорт сессии в poll', () => {
  it('sessionTransport из опций уходит в тело poll', async () => {
    const { calls, api } = client(
      200,
      { state: 'verified', session: cookieSession },
      { sessionTransport: 'cookie' },
    );
    await expect(api.pollRegistration({ registrationToken: token })).resolves.toEqual({
      state: 'verified',
      session: cookieSession,
    });
    expect(calls[0]?.body).toEqual({ registrationToken: token, sessionTransport: 'cookie' });
  });

  it('без опции тело poll — как у старых сборок native, ответ — полный Session', async () => {
    const { calls, api } = client(200, { state: 'verified', session });
    await expect(api.pollRegistration({ registrationToken: token })).resolves.toEqual({
      state: 'verified',
      session,
    });
    expect(calls[0]?.body).toEqual({ registrationToken: token });
  });
});

describe('api-client: refreshSession и signOut', () => {
  it('refreshSession без тела (web) — POST {} в путь сессии, ответ без refreshToken', async () => {
    const { calls, api } = client(200, cookieSession, { credentials: 'include' });
    await expect(api.refreshSession()).resolves.toEqual(cookieSession);
    expect(calls).toEqual([
      {
        url: 'https://api.test/v1/auth/session/refresh',
        method: 'POST',
        credentials: 'include',
        body: {},
      },
    ]);
  });

  it('refreshSession с refreshToken (native) — токен в теле, ответ — Session', async () => {
    const { calls, api } = client(200, session);
    await expect(api.refreshSession({ refreshToken: token })).resolves.toEqual(session);
    expect(calls[0]?.body).toEqual({ refreshToken: token });
  });

  it('signOut — 204 без тела не падает', async () => {
    const { calls, api } = client(204, null);
    await expect(api.signOut()).resolves.toBeUndefined();
    expect(calls[0]).toMatchObject({
      url: 'https://api.test/v1/auth/session/sign-out',
      method: 'POST',
      body: {},
    });
  });

  it('signOut с refreshToken — токен в теле', async () => {
    const { calls, api } = client(204, null);
    await api.signOut({ refreshToken: token });
    expect(calls[0]?.body).toEqual({ refreshToken: token });
  });
});
