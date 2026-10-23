/// <reference types="jest" />
import { ApiHttpError, ApiNetworkError } from '@on-bike/api-client';
import type { CookieSession } from '@on-bike/contracts';

import { api } from '@/lib/api';

import { fetchRegistrationPoll } from './queries';
import { resetSessionStore, useSessionStore } from './session-store';

jest.mock('@/lib/api', () => ({
  api: { refreshSession: jest.fn(), signOut: jest.fn(), pollRegistration: jest.fn() },
}));

const refresh = jest.mocked(api.refreshSession);
const signOut = jest.mocked(api.signOut);
const pollRegistration = jest.mocked(api.pollRegistration);
const NOW = new Date('2026-10-22T10:00:00Z').getTime();

const cookieSession: CookieSession = {
  accessToken: 'access-token',
  accessTokenExpiresAt: '2026-10-22T10:15:00.000Z',
  refreshTokenExpiresAt: '2026-11-21T10:00:00.000Z',
};

type Locks = { request: jest.Mock };
const setLocks = (locks: Locks | undefined) =>
  Object.defineProperty(navigator, 'locks', { value: locks, configurable: true });

/** LockManager как в браузере: задачи одного имени — строго по очереди. */
function queueLocks(): Locks {
  const tails = new Map<string, Promise<unknown>>();
  const request = jest.fn((name: string, task: () => Promise<unknown>) => {
    const run = (tails.get(name) ?? Promise.resolve()).then(task);
    tails.set(
      name,
      run.catch(() => undefined),
    );
    return run;
  });
  return { request };
}

/** Промис, который тест завершает сам: «ответ сервера пришёл позже». */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const unauthorized = () => new ApiHttpError(401, { code: 'UNAUTHORIZED', message: 'x' });
const rateLimited = (retryAfterSec: number) =>
  new ApiHttpError(429, { code: 'RATE_LIMITED', message: 'x', details: { retryAfterSec } });
const offline = () => new ApiNetworkError(new TypeError('Failed to fetch'));
const REGISTRATION_TOKEN = 'r'.repeat(43);

beforeEach(() => {
  resetSessionStore();
  sessionStorage.clear();
  localStorage.clear();
  setLocks(undefined);
});
afterEach(() => {
  jest.useRealTimers();
  jest.resetAllMocks();
});

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

  it('401 (нет cookie, отозвана, истекла) → не вошёл, без повторов', async () => {
    refresh.mockRejectedValue(unauthorized());
    await useSessionStore.getState().hydrate(NOW);

    expect(useSessionStore.getState().status).toBe('signedOut');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('429 — не выход: повтор через retryAfterSec, затем вошёл', async () => {
    jest.useFakeTimers();
    refresh.mockRejectedValueOnce(rateLimited(5)).mockResolvedValueOnce(cookieSession);
    const hydrating = useSessionStore.getState().hydrate(NOW);

    await jest.advanceTimersByTimeAsync(4_999);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe('unknown');

    await jest.advanceTimersByTimeAsync(1);
    await hydrating;
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(useSessionStore.getState()).toMatchObject({
      status: 'signedIn',
      session: cookieSession,
    });
  });

  it('429 после повторов — «сессию проверить не удалось», не signedOut; cookie не трогаем', async () => {
    jest.useFakeTimers();
    const limited = rateLimited(1);
    refresh.mockRejectedValue(limited);
    const hydrating = useSessionStore.getState().hydrate(NOW);
    await jest.advanceTimersByTimeAsync(10_000);
    await hydrating;

    expect(refresh).toHaveBeenCalledTimes(3);
    expect(useSessionStore.getState()).toMatchObject({
      status: 'unavailable',
      session: null,
      restoreError: limited,
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('429 с паузой длиннее разумного ожидания — сразу «не удалось», без скелетона на минуту', async () => {
    refresh.mockRejectedValue(rateLimited(60));
    await useSessionStore.getState().hydrate(NOW);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe('unavailable');
  });

  it('нет сети — не выход: повторы, затем «не удалось» (ошибка сети — для «Нет соединения»)', async () => {
    jest.useFakeTimers();
    const error = offline();
    refresh.mockRejectedValue(error);
    const hydrating = useSessionStore.getState().hydrate(NOW);
    await jest.advanceTimersByTimeAsync(10_000);
    await hydrating;

    expect(refresh).toHaveBeenCalledTimes(3);
    expect(useSessionStore.getState()).toMatchObject({
      status: 'unavailable',
      restoreError: error,
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('повтор из «не удалось»: снова «неизвестно», затем вошёл', async () => {
    refresh.mockRejectedValueOnce(rateLimited(60)).mockResolvedValueOnce(cookieSession);
    await useSessionStore.getState().hydrate(NOW);
    expect(useSessionStore.getState().status).toBe('unavailable');

    const retrying = useSessionStore.getState().hydrate(NOW);
    expect(useSessionStore.getState().status).toBe('unknown');
    await retrying;

    expect(useSessionStore.getState()).toMatchObject({
      status: 'signedIn',
      session: cookieSession,
      restoreError: null,
    });
  });

  it('Web Lock: refresh, обмен регистрации (poll) и выход — под одним замком', async () => {
    const request = jest.fn((_name: string, task: () => Promise<unknown>) => task());
    setLocks({ request });
    refresh.mockResolvedValue(cookieSession);
    pollRegistration.mockResolvedValue({ state: 'pending' });

    await useSessionStore.getState().hydrate(NOW);
    await fetchRegistrationPoll(REGISTRATION_TOKEN);
    await useSessionStore.getState().signOut();

    expect(request.mock.calls.map(([name]) => name)).toEqual([
      'onbike.session-refresh',
      'onbike.session-refresh',
      'onbike.session-refresh',
    ]);
    expect(pollRegistration).toHaveBeenCalledWith({ registrationToken: REGISTRATION_TOKEN });
  });

  it('Web Lock: poll ждёт refresh — запоздалый 401 восстановления не приходит после выдачи cookie', async () => {
    setLocks(queueLocks());
    const refreshing = deferred<never>();
    refresh.mockReturnValue(refreshing.promise);
    pollRegistration.mockResolvedValue({ state: 'verified', session: cookieSession });

    const hydrating = useSessionStore.getState().hydrate(NOW);
    const polling = fetchRegistrationPoll(REGISTRATION_TOKEN);
    await Promise.resolve();
    expect(pollRegistration).not.toHaveBeenCalled();

    refreshing.reject(unauthorized());
    await hydrating;
    const poll = await polling;
    expect(pollRegistration).toHaveBeenCalledTimes(1);
    if (poll.state === 'verified') await useSessionStore.getState().signIn(poll.session);

    expect(useSessionStore.getState()).toMatchObject({
      status: 'signedIn',
      session: cookieSession,
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('без Web Lock: 401 восстановления пришёл после успешного poll — вход остаётся, выхода нет', async () => {
    const refreshing = deferred<never>();
    refresh.mockReturnValue(refreshing.promise);
    pollRegistration.mockResolvedValue({ state: 'verified', session: cookieSession });

    const hydrating = useSessionStore.getState().hydrate(NOW);
    const poll = await fetchRegistrationPoll(REGISTRATION_TOKEN);
    if (poll.state === 'verified') await useSessionStore.getState().signIn(poll.session);
    refreshing.reject(unauthorized());
    await hydrating;

    expect(useSessionStore.getState()).toMatchObject({
      status: 'signedIn',
      session: cookieSession,
    });
    expect(signOut).not.toHaveBeenCalled();
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
    fail(unauthorized());
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
    signOut.mockRejectedValue(offline());
    await useSessionStore.getState().signOut();

    expect(signOut).toHaveBeenCalledWith();
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedOut', session: null });
    warn.mockRestore();
  });
});
