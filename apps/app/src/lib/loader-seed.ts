/**
 * Посев данных экрана из `loader` маршрута (web: SSR и клиентская навигация). Источник данных экрана на всех
 * платформах — API через TanStack Query; посев — `initialData`, чтобы web отдавал HTML уже с данными.
 * Native: серверных данных маршрута нет — `undefined`, экран берёт данные из API.
 */
export function useLoaderSeed<T>(): T | undefined {
  return undefined;
}
