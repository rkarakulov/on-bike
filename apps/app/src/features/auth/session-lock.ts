/** Хвост очереди сессионных операций приложения. */
let tail: Promise<unknown> = Promise.resolve();

/**
 * Native: сессионные операции одного приложения — по одной (вход, фоновая ротация refresh, выход, poll регистрации):
 * выход во время ротации ждёт её и отзывает уже новый refresh, а ответ ротации не придёт поверх выхода. Замок — в
 * памяти процесса (цепочка промисов): cookie и вкладок на native нет. Web — `session-lock.web.ts` (Web Lock).
 * Сбой задачи очередь не останавливает.
 */
export function withSessionLock<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task);
  tail = run.catch(() => undefined);
  return run;
}
