import type { CookieSession } from '@pokatim/contracts';

/**
 * Итог проверки сессии на сервере (`revalidateSession`, обе платформы): новая сессия, сервер её не знает (выход)
 * или проверить не удалось — остаёмся в аккаунте.
 */
export type Revalidation =
  { status: 'rotated'; session: CookieSession } | { status: 'signedOut' } | { status: 'unchanged' };
