/** Один межвкладочный замок на все операции, меняющие cookie сессии: refresh, обмен регистрации (poll), выход. */
export const SESSION_LOCK = 'onbike.session-refresh';

/**
 * Cookie сессии одна на все вкладки, а ответ каждой операции её переписывает: refresh ротирует (две вкладки с одной
 * cookie — вторая получила бы 401), poll выставляет новую, выход стирает. Web Lock выстраивает их в очередь — ответ
 * одной операции не приходит поверх результата другой. Без `navigator.locks` (старый браузер, SSR) — без замка.
 */
export function withSessionLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  return locks ? locks.request(SESSION_LOCK, task) : task();
}
