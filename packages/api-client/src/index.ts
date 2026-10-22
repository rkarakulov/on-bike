import { HealthResponse } from '@on-bike/contracts';
import type { z } from 'zod';

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | undefined;
  fetchImpl?: typeof fetch;
}

export class ApiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`API ${status}`);
  }
}

/** Тонкий клиент: каждый ответ валидируется той же zod-схемой, что и на сервере. */
export function createApiClient({ baseUrl, getAccessToken, fetchImpl = fetch }: ApiClientOptions) {
  async function request<S extends z.ZodType>(path: string, schema: S, init?: RequestInit) {
    const token = getAccessToken?.();
    const response = await fetchImpl(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
    const body: unknown = await response.json().catch(() => undefined);
    if (!response.ok) throw new ApiHttpError(response.status, body);
    return schema.parse(body) as z.infer<S>;
  }

  return {
    health: () => request('/v1/health', HealthResponse),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
