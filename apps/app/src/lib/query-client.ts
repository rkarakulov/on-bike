import { ApiHttpError } from '@on-bike/api-client';
import { QueryClient } from '@tanstack/react-query';

const MAX_RETRIES = 2;

/** Повторяем то, что может пройти со второй попытки: сеть и 5xx. Ответ 4xx не изменится. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiHttpError && error.status < 500) return false;
  return failureCount < MAX_RETRIES;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry },
      mutations: { retry: false },
    },
  });
}
