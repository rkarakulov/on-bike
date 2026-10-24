/// <reference types="jest" />
import type * as ApiClient from '@pokatim/api-client';
import type { Session } from '@pokatim/contracts';

import { revalidateSession } from './session-persistence';

// настоящий клиент API (разбор ответа, классификация ошибок), подменён только fetch
const mockFetch = jest.fn();
jest.mock('@/lib/api', () => {
  const { createApiClient } = jest.requireActual<typeof ApiClient>('@pokatim/api-client');
  return {
    api: createApiClient({
      baseUrl: 'https://api.test',
      fetchImpl: (...args: Parameters<typeof fetch>) => mockFetch(...args),
    }),
  };
});

const NOW = new Date('2026-10-22T10:00:00Z').getTime();
const session: Session = {
  accessToken: 'access-token',
  accessTokenExpiresAt: '2026-10-22T10:15:00.000Z',
  refreshToken: 'R'.repeat(43),
  refreshTokenExpiresAt: '2026-11-21T10:00:00.000Z',
};
const rotated: Session = { ...session, accessToken: 'access-2', refreshToken: 'N'.repeat(43) };

const stored = () =>
  jest.requireMock<{ __store: Map<string, string> }>('expo-secure-store').__store;

/** Ответ 200, тело которого оборвалось при чтении (заголовки получены, `json()` отклонён). */
const brokenBody = () =>
  ({
    ok: true,
    status: 200,
    json: () => Promise.reject(new TypeError('Network request failed')),
  }) as unknown as Response;
const okBody = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

beforeEach(() => {
  mockFetch.mockReset();
  stored().set('pokatim.session', JSON.stringify(session));
});

describe('native revalidateSession — ответ не получен целиком', () => {
  it('обрыв при чтении тела 200 — одна немедленная повторная попытка (сервер мог ротировать — повтор в окне)', async () => {
    mockFetch.mockResolvedValueOnce(brokenBody()).mockResolvedValueOnce(okBody(rotated));

    await expect(revalidateSession(NOW)).resolves.toEqual({ status: 'rotated', session: rotated });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    for (const [, init] of mockFetch.mock.calls) {
      expect(JSON.parse(String((init as RequestInit).body))).toEqual({
        refreshToken: session.refreshToken,
      });
    }
    expect(JSON.parse(stored().get('pokatim.session') ?? '')).toEqual(rotated);
  });

  it('обрыв и при повторе — остаёмся в аккаунте, сохранённая сессия не тронута', async () => {
    mockFetch.mockResolvedValue(brokenBody());

    await expect(revalidateSession(NOW)).resolves.toEqual({ status: 'unchanged' });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(stored().get('pokatim.session') ?? '')).toEqual(session);
  });

  it('ответ сервера с ошибкой (401) — без повтора, выход', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ code: 'UNAUTHORIZED', message: 'x' }), { status: 401 }),
    );

    await expect(revalidateSession(NOW)).resolves.toEqual({ status: 'signedOut' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(stored().has('pokatim.session')).toBe(false);
  });

  it('ответ 5xx — без повтора, остаёмся', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 503 }));

    await expect(revalidateSession(NOW)).resolves.toEqual({ status: 'unchanged' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
