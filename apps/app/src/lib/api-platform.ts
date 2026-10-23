import type { ApiClientOptions } from '@on-bike/api-client';

/** Native: сессия — в теле ответа (refresh в SecureStore), cookie не нужны; web — `api-platform.web.ts`. */
export const apiPlatformOptions: Partial<ApiClientOptions> = {};
