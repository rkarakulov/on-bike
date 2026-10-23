import { ApiHttpError } from '@on-bike/api-client';
import { type AnySession, CookieSession } from '@on-bike/contracts';

import { api } from '@/lib/api';

import { apiErrorCode, retryAfterSec } from './error-messages';
import { withSessionLock } from './session-lock';

/**
 * Web (ADR-0003 п. 4, R10 task.md F5b): refresh — только в httpOnly cookie (`SESSION_COOKIE`), его ставит
 * и ротирует API; access — только в памяти (стор). В браузерных хранилищах сессии нет. Операции, меняющие
 * cookie (refresh, выход и poll регистрации), — под одним Web Lock (`session-lock.web.ts`).
 */

/** Попыток восстановления при временном сбое (429, сеть, 5xx): первая + 2 повтора. */
const RESTORE_ATTEMPTS = 3;
/** Пауза перед повтором после сбоя сети или сервера. */
const TRANSIENT_RETRY_SEC = 2;
/** Дольше на скелетоне не ждём: 429 с большей паузой — сразу «не удалось» с кнопкой повтора. */
const MAX_RETRY_WAIT_SEC = 10;

const isUnauthorized = (error: unknown) => error instanceof ApiHttpError && error.status === 401;

/** Пауза до повтора; `undefined` — повторять сейчас бессмысленно. */
function retryDelaySec(error: unknown): number | undefined {
  if (apiErrorCode(error) !== 'RATE_LIMITED') return TRANSIENT_RETRY_SEC;
  const wait = retryAfterSec(error) ?? TRANSIENT_RETRY_SEC;
  return wait <= MAX_RETRY_WAIT_SEC ? wait : undefined;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Сессия по cookie: `POST /v1/auth/session/refresh` без тела. 401 (нет cookie, отозвана, истекла) — «не вошёл».
 * 429, сеть, сбой сервера — не выход: повтор (429 — через `retryAfterSec`), после попыток — бросает последнюю
 * ошибку, стор показывает «сессию проверить не удалось» с повтором. Cookie при сбое не трогаем.
 */
export async function restoreSession(_now: number): Promise<CookieSession | undefined> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      // refreshToken в памяти web не держим, даже если сервер ответил телом
      return CookieSession.parse(await withSessionLock(() => api.refreshSession()));
    } catch (error) {
      if (isUnauthorized(error)) return undefined;
      const waitSec = retryDelaySec(error);
      if (attempt >= RESTORE_ATTEMPTS || waitSec === undefined) throw error;
      // ждём вне замка: другие вкладки тем временем не стоят в очереди
      await sleep(waitSec * 1000);
    }
  }
}

/** Cookie уже выставил сервер (ответ poll/refresh), сохранять на клиенте нечего. */
export async function persistSession(_session: AnySession): Promise<boolean> {
  return true;
}

/** Выход: сервер отзывает сессию и снимает cookie. Не бросает: локально выход состоится в любом случае. */
export async function clearSession(): Promise<void> {
  try {
    await withSessionLock(() => api.signOut());
  } catch (error) {
    console.warn(`sign-out failed: ${(error as Error).name}`);
  }
}
