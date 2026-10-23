import { createApiClient } from '@on-bike/api-client';

import { apiPlatformOptions } from './api-platform';

/** dev по умолчанию: телефон ходит на API компьютера через `adb reverse tcp:3000 tcp:3000` (Android) / симулятор. */
const DEV_API_URL = 'http://127.0.0.1:3000';

function apiBaseUrl(): string {
  // EXPO_PUBLIC_* Metro подставляет при сборке — только прямое обращение к process.env.EXPO_PUBLIC_….
  // Серверный бандл web (SSR) их не подставляет: читает из окружения web-сервера во время запроса —
  // EXPO_PUBLIC_API_URL нужен и на сборке, и процессу `start:web`
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, '');
  if (__DEV__) return DEV_API_URL;
  throw new Error('EXPO_PUBLIC_API_URL не задан для сборки');
}

// опции платформы: web — cookie сессии (`api-platform.web.ts`), native — сессия в теле ответа
export const api = createApiClient({ baseUrl: apiBaseUrl(), ...apiPlatformOptions });
