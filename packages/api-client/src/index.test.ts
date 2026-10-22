import { describe, expect, it } from 'vitest';

import { ApiHttpError, ApiNetworkError, createApiClient, isNetworkError } from './index.ts';

const ok = { status: 'ok', version: 'dev', checks: { database: 'up' } };
const respond = (status: number, body: unknown) =>
  (() => Promise.resolve(new Response(JSON.stringify(body), { status }))) as typeof fetch;

describe('api-client: классы ошибок для UI', () => {
  it('ответ валиден — данные по схеме', async () => {
    const api = createApiClient({ baseUrl: '', fetchImpl: respond(200, ok) });
    await expect(api.health()).resolves.toEqual(ok);
  });

  it('fetch упал — ApiNetworkError («Нет соединения»)', async () => {
    const fetchImpl = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch;
    const error = await createApiClient({ baseUrl: '', fetchImpl })
      .health()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiNetworkError);
    expect(isNetworkError(error)).toBe(true);
  });

  it('HTTP-ошибка — ApiHttpError, не сеть', async () => {
    const error = await createApiClient({ baseUrl: '', fetchImpl: respond(503, null) })
      .health()
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiHttpError);
    expect(isNetworkError(error)).toBe(false);
  });

  it('2xx неожиданной формы (старый клиент vs новый сервер) — не сеть', async () => {
    const error = await createApiClient({
      baseUrl: '',
      fetchImpl: respond(200, { status: 'weird' }),
    })
      .health()
      .catch((e: unknown) => e);
    expect(isNetworkError(error)).toBe(false);
  });
});
