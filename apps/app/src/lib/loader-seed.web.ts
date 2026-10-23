import { useLoaderData } from 'expo-router';

/**
 * Web: данные `loader` маршрута — при SSR из HTML ответа, при клиентской навигации — `/_expo/loaders/<маршрут>`.
 * `null` от loader (API недоступен) — нет посева: экран загрузит данные из API сам.
 */
export function useLoaderSeed<T>(): T | undefined {
  return (useLoaderData() as T | null) ?? undefined;
}
