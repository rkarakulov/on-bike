import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useRegistrationStore } from './registration-store';
import { useSessionStore } from './session-store';

/**
 * Выход (native и web): сервер отзывает сессию, устройство её забывает (SecureStore / cookie), кеш запросов прежнего
 * пользователя и незавершённая регистрация очищаются. Не бросает: офлайн — локальный выход всё равно. Гард ведёт на
 * «Вход» (`returning`).
 */
export function useSignOut() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await useSessionStore.getState().signOut();
    queryClient.clear();
    await useRegistrationStore.getState().clear();
  }, [queryClient]);
}
