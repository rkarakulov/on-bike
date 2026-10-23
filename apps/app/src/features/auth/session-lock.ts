/**
 * Native: cookie сессии нет, запросы сессии одного приложения не гоняются за общим состоянием — замок не нужен.
 * Web — `session-lock.web.ts` (Web Lock между вкладками).
 */
export function withSessionLock<T>(task: () => Promise<T>): Promise<T> {
  return task();
}
