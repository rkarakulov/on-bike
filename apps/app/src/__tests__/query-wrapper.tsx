import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * QueryClient для рендера маршрутов без корневого layout: без повторов, чтобы ошибка была видна сразу.
 * Новый клиент на каждый вызов — кеш одного теста не попадает в другой.
 */
export function createQueryWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
