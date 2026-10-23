import { ApiHttpError } from '@on-bike/api-client';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager, QueryClient } from '@tanstack/react-query';

const MAX_RETRIES = 2;

/**
 * В RN нет `navigator.onLine`: без NetInfo onlineManager считает сеть всегда доступной,
 * запросы не встают на паузу и «Нет соединения» видно только после всех ретраев (rules/mobile.md).
 */
export function connectOnlineManager() {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
}

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
