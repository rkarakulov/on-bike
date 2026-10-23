import type { ApiClientOptions } from '@on-bike/api-client';

/**
 * Web (ADR-0003 п. 4): refresh — в httpOnly cookie, которую ставит API. `credentials: 'include'` — cookie уходит
 * и на API другого origin в dev (`127.0.0.1:8081` → `:3000`, same-site); транспорт `cookie` — сервер не кладёт
 * refresh в тело ответа.
 */
export const apiPlatformOptions: Partial<ApiClientOptions> = {
  credentials: 'include',
  sessionTransport: 'cookie',
};
