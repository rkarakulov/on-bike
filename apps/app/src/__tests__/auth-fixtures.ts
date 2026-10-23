/// <reference types="jest" />
import type { RegisterResponse, Session } from '@on-bike/contracts';

import { useSessionStore } from '@/features/auth/session-store';

/** Фикстуры для тестов auth. Токены — 43 символа base64url, как в контракте. */
export const NOW = new Date('2026-10-22T10:00:00Z');

export const REGISTRATION_TOKEN = 'r'.repeat(43);
export const LINK_TOKEN = 'L'.repeat(43);
export const EMAIL = 'ivan.k@mail.by';

export const registerResponse: RegisterResponse = {
  registrationToken: REGISTRATION_TOKEN,
  email: EMAIL,
  resendAvailableInSec: 60,
};

export const session: Session = {
  accessToken: 'access-token',
  accessTokenExpiresAt: '2026-10-22T10:15:00.000Z',
  refreshToken: 'refresh-token',
  refreshTokenExpiresAt: '2026-11-21T10:00:00.000Z',
};

const secureStore = () =>
  jest.requireMock<{ __store: Map<string, string> }>('expo-secure-store').__store;

/** Сессия, сохранённая прошлым запуском. */
export function storeSession(value: Session = session) {
  secureStore().set('onbike.session', JSON.stringify(value));
}

/** Вошедший пользователь без корневого layout: вкладки рендерят контент только при известной сессии. */
export const signInForTest = () => useSessionStore.setState({ status: 'signedIn', session });

/** Регистрация, начатая прошлым запуском (токен жив). */
export function storePendingRegistration(now = Date.now(), resendInSec = 60) {
  secureStore().set(
    'onbike.registration',
    JSON.stringify({
      registrationToken: REGISTRATION_TOKEN,
      email: EMAIL,
      resendAvailableAt: now + resendInSec * 1000,
      expiresAt: now + 24 * 3600_000,
    }),
  );
}

export const storedValue = (key: 'onbike.session' | 'onbike.registration') =>
  secureStore().get(key);
