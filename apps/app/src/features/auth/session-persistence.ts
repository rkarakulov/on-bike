import { type AnySession, type CookieSession, Session } from '@on-bike/contracts';

import { readJson } from './read-json';
import { secureStorage } from './secure-storage';
import { isSessionAlive } from './session-expiry';

/**
 * Native: сессия целиком (с refresh) — в SecureStore, как до F5b. Web — `session-persistence.web.ts`
 * (refresh в httpOnly cookie, access в памяти). Стор сессии знает только эти три операции.
 */
const KEY = 'onbike.session';

/** Сессия прошлого запуска; просроченная или битая удаляется. Не бросает. */
export function restoreSession(now: number): Promise<CookieSession | undefined> {
  return readJson(KEY, (value) => {
    const parsed = Session.safeParse(value);
    return parsed.success && isSessionAlive(parsed.data, now) ? parsed.data : undefined;
  });
}

/**
 * Сохранить сессию (сразу, ещё до входа: закрытие приложения в «E-mail подтверждён» вход не теряет).
 * Никогда не бросает: токен регистрации уже обменян, повторно сессию не получить — сбой Keychain/Keystore
 * не блокирует вход (сессия живёт в памяти до перезапуска).
 */
export async function persistSession(session: AnySession): Promise<boolean> {
  // native просит сессию в теле (транспорт body): без refresh сохранять нечего
  const full = Session.safeParse(session);
  if (!full.success) {
    console.warn('session not persisted: no refresh token');
    return false;
  }
  try {
    await secureStorage.set(KEY, JSON.stringify(full.data));
    return true;
  } catch (error) {
    console.warn(`session not persisted: ${(error as Error).name}`);
    return false;
  }
}

/** Забыть сессию на устройстве. Не бросает: выход локально состоится в любом случае. */
export async function clearSession(): Promise<void> {
  try {
    await secureStorage.delete(KEY);
  } catch (error) {
    console.warn(`session not cleared: ${(error as Error).name}`);
  }
}
