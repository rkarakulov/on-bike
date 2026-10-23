import { type RegistrationPollResponse, Session } from '@on-bike/contracts';
import { useEffect } from 'react';

import { useRegistrationStore } from './registration-store';
import { persistSession, useSessionStore } from './session-store';

/** «E-mail подтверждён» держится около секунды, затем вход (прототип, V-09). */
export const VERIFIED_HOLD_MS = 1000;

/**
 * Опрос вернул `verified` + сессию: сессия сразу уходит в SecureStore (закрытие приложения в эту секунду
 * её не теряет), через ~1 с — вход; гард переключает стек на вкладки. Токен регистрации больше не нужен.
 */
export function useSignInWhenVerified(poll: RegistrationPollResponse | undefined) {
  useEffect(() => {
    if (poll?.state !== 'verified') return;
    // TODO(F5b S3b): web (транспорт cookie) — сессия без refreshToken, через session-persistence.web;
    // пока клиент шлёт транспорт body (native) — ответ всегда полный Session
    const parsed = Session.safeParse(poll.session);
    if (!parsed.success) return;
    const session = parsed.data;
    void persistSession(session);
    const timer = setTimeout(() => {
      void (async () => {
        await useSessionStore.getState().signIn(session);
        await useRegistrationStore.getState().clear();
      })();
    }, VERIFIED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [poll]);
}
