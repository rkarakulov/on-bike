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

/** Запрос не дошёл до сервера (нет сети, DNS, обрыв). Всё остальное — ответ сервера или его форма. */
export class ApiNetworkError extends Error {
  constructor(override readonly cause: unknown) {
    super('Network request failed');
  }
}

/** Единственный признак «нет соединения» для UI (AGENTS.md §4.12); прочие ошибки — «Не удалось загрузить». */
export const isNetworkError = (error: unknown): error is ApiNetworkError =>
  error instanceof ApiNetworkError;

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
    }).catch((error: unknown) => {
      throw new ApiNetworkError(error);
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
