/// <reference types="jest" />
import { ApiHttpError, ApiNetworkError } from '@on-bike/api-client';
import type { CookieSession } from '@on-bike/contracts';

import { api } from '@/lib/api';

import { resetSessionStore, useSessionStore } from './session-store';

jest.mock('@/lib/api', () => ({ api: { refreshSession: jest.fn(), signOut: jest.fn() } }));

const refresh = jest.mocked(api.refreshSession);
const signOut = jest.mocked(api.signOut);
const NOW = new Date('2026-10-22T10:00:00Z').getTime();

const cookieSession: CookieSession = {
  accessToken: 'access-token',
  accessTokenExpiresAt: '2026-10-22T10:15:00.000Z',
  refreshTokenExpiresAt: '2026-11-21T10:00:00.000Z',
};

type Locks = { request: jest.Mock };
const setLocks = (locks: Locks | undefined) =>
  Object.defineProperty(navigator, 'locks', { value: locks, configurable: true });

beforeEach(() => {
  resetSessionStore();
  sessionStorage.clear();
  localStorage.clear();
  setLocks(undefined);
});
afterEach(() => jest.resetAllMocks());

describe('сессия web: refresh в httpOnly cookie, access в памяти', () => {
  it('запуск: refresh по cookie (без тела) → вошёл; в хранилища браузера ничего не пишется', async () => {
    refresh.mockResolvedValue(cookieSession);
    await useSessionStore.getState().hydrate(NOW);

    expect(refresh).toHaveBeenCalledWith();
    expect(useSessionStore.getState()).toMatchObject({
      status: 'signedIn',
      session: cookieSession,
    });
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
  });

  it('ответ с refreshToken (чужой транспорт) — в памяти его нет', async () => {
    refresh.mockResolvedValue({ ...cookieSession, refreshToken: 'r'.repeat(43) });
    await useSessionStore.getState().hydrate(NOW);

    expect(useSessionStore.getState().session).toEqual(cookieSession);
  });

  it('401 (нет cookie, отозвана, истекла) → не вошёл', async () => {
    refresh.mockRejectedValue(new ApiHttpError(401, { code: 'UNAUTHORIZED', message: 'x' }));
    await useSessionStore.getState().hydrate(NOW);

    expect(useSessionStore.getState().status).toBe('signedOut');
  });

  it('нет сети → не вошёл, cookie не трогаем (без sign-out)', async () => {
    refresh.mockRejectedValue(new ApiNetworkError(new TypeError('Failed to fetch')));
    await useSessionStore.getState().hydrate(NOW);

    expect(useSessionStore.getState().status).toBe('signedOut');
    expect(signOut).not.toHaveBeenCalled();
  });

  it('Web Lock: refresh под замком — вкладки не ротируют одну cookie одновременно', async () => {
    const request = jest.fn((_name: string, task: () => Promise<unknown>) => task());
    setLocks({ request });
    refresh.mockResolvedValue(cookieSession);
    await useSessionStore.getState().hydrate(NOW);

    expect(request).toHaveBeenCalledWith('onbike.session-refresh', expect.any(Function));
    expect(useSessionStore.getState().status).toBe('signedIn');
  });

  it('вход во время запуска не затирается ответом refresh', async () => {
    let fail: (error: unknown) => void = () => undefined;
    refresh.mockReturnValue(
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
    );
    const hydrating = useSessionStore.getState().hydrate(NOW);

    await useSessionStore.getState().signIn(cookieSession);
    fail(new ApiHttpError(401, null));
    await hydrating;

    expect(useSessionStore.getState()).toMatchObject({
      status: 'signedIn',
      session: cookieSession,
    });
  });

  it('вход (сессия из ответа poll) — только память', async () => {
    await useSessionStore.getState().signIn(cookieSession);

    expect(useSessionStore.getState().status).toBe('signedIn');
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
  });

  it('выход — sign-out по cookie; сбой сети не мешает выйти локально', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await useSessionStore.getState().signIn(cookieSession);
    signOut.mockRejectedValue(new ApiNetworkError(new TypeError('Failed to fetch')));
    await useSessionStore.getState().signOut();

    expect(signOut).toHaveBeenCalledWith();
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedOut', session: null });
    warn.mockRestore();
  });
});
