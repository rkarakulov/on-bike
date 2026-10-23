/// <reference types="jest" />
import type { CookieSession } from '@on-bike/contracts';
import { act, renderHook } from '@testing-library/react';

import { resetSessionStore, useSessionStore } from './session-store';
import { useSignInWhenVerified, VERIFIED_HOLD_MS } from './use-sign-in-when-verified';

jest.mock('@/lib/api', () => ({ api: { refreshSession: jest.fn(), signOut: jest.fn() } }));

const cookieSession: CookieSession = {
  accessToken: 'access-token',
  accessTokenExpiresAt: '2026-10-22T10:15:00.000Z',
  refreshTokenExpiresAt: '2026-11-21T10:00:00.000Z',
};

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-10-22T10:00:00Z') });
  resetSessionStore();
});
afterEach(() => jest.useRealTimers());

describe('вход после подтверждения (web)', () => {
  it('сессия без refreshToken (cookie) → вход через ~1 с, браузерные хранилища пусты', async () => {
    renderHook(() => useSignInWhenVerified({ state: 'verified', session: cookieSession }));
    expect(useSessionStore.getState().status).toBe('unknown');

    await act(() => jest.advanceTimersByTimeAsync(VERIFIED_HOLD_MS));

    expect(useSessionStore.getState()).toMatchObject({
      status: 'signedIn',
      session: cookieSession,
    });
    expect(sessionStorage.getItem('onbike.session')).toBeNull();
    expect(localStorage.length).toBe(0);
  });
});
