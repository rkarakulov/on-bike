import { type AnySession, CookieSession } from '@on-bike/contracts';

import { api } from '@/lib/api';

/**
 * Web (ADR-0003 п. 4, R10 task.md F5b): refresh — только в httpOnly cookie (`SESSION_COOKIE`), его ставит
 * и ротирует API; access — только в памяти (стор). В браузерных хранилищах сессии нет.
 */
const REFRESH_LOCK = 'onbike.session-refresh';

/**
 * Refresh ротирует cookie: две вкладки, перезагруженные одновременно, отправили бы одну и ту же cookie,
 * и вторая получила бы 401. Web Lock выстраивает их в очередь (вторая идёт уже с новой cookie).
 */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks ? locks.request(REFRESH_LOCK, task) : task();
}

/**
 * Сессия по cookie: `POST /v1/auth/session/refresh` без тела. 401 (нет cookie, отозвана, истекла) и сбой сети —
 * «не вошёл»; cookie при сбое сети не трогаем — следующий запуск попробует снова. Не бросает.
 */
export async function restoreSession(_now: number): Promise<CookieSession | undefined> {
  try {
    // refreshToken в памяти web не держим, даже если сервер ответил телом
    return CookieSession.parse(await withRefreshLock(() => api.refreshSession()));
  } catch {
    return undefined;
  }
}

/** Cookie уже выставил сервер (ответ poll/refresh), сохранять на клиенте нечего. */
export async function persistSession(_session: AnySession): Promise<boolean> {
  return true;
}

/** Выход: сервер отзывает сессию и снимает cookie. Не бросает: локально выход состоится в любом случае. */
export async function clearSession(): Promise<void> {
  try {
    await api.signOut();
  } catch (error) {
    console.warn(`sign-out failed: ${(error as Error).name}`);
  }
}
