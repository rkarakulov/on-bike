import { createApiClient } from '@pokatim/api-client';

// тот же origin: в dev Vite проксирует /v1 на API (:3000), в проде — обратный прокси
export const api = createApiClient({ baseUrl: '' });
