import { describe, expect, it } from 'vitest';

import { ApiHttpError, ApiNetworkError, createApiClient, isNetworkError } from './index.ts';

const ok = { status: 'ok', version: 'dev', checks: { database: 'up' } };
const respond = (status: number, body: unknown) =>
  (() => Promise.resolve(new Response(JSON.stringify(body), { status }))) as typeof fetch;

describe('api-client: health и классы ошибок (реэкспорт базы)', () => {
  it('ответ валиден — данные по схеме', async () => {
    const api = createApiClient({ baseUrl: '', fetchImpl: respond(200, ok) });
    await expect(api.health()).resolves.toEqual(ok);
  });

  it('клиент бросает те же классы, что экспортирует пакет: сеть и HTTP различимы', async () => {
    const fetchImpl = (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch;
    const network = await createApiClient({ baseUrl: '', fetchImpl })
      .health()
      .catch((e: unknown) => e);
    expect(network).toBeInstanceOf(ApiNetworkError);
    expect(isNetworkError(network)).toBe(true);

    const http = await createApiClient({ baseUrl: '', fetchImpl: respond(503, null) })
      .health()
      .catch((e: unknown) => e);
    expect(http).toBeInstanceOf(ApiHttpError);
    expect(isNetworkError(http)).toBe(false);
  });
});
