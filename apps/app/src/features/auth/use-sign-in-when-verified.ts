import type { RegistrationPollResponse } from '@pokatim/contracts';
import { useEffect } from 'react';

import { useRegistrationStore } from './registration-store';
import { useSessionStore } from './session-store';

/** «E-mail подтверждён» держится около секунды, затем вход (прототип, V-09). */
export const VERIFIED_HOLD_MS = 1000;

/**
 * Опрос вернул `verified` + сессию: она уже сохранена под замком сессии вместе с ответом (`fetchRegistrationPoll`:
 * native — SecureStore, закрытие приложения в эту секунду её не теряет; web — refresh в cookie из ответа), через
 * ~1 с — вход в памяти; гард переключает стек на вкладки. Токен регистрации больше не нужен.
 */
export function useSignInWhenVerified(poll: RegistrationPollResponse | undefined) {
  useEffect(() => {
    if (poll?.state !== 'verified') return;
    const { session } = poll;
    const timer = setTimeout(() => {
      void (async () => {
        await useSessionStore.getState().signIn(session);
        await useRegistrationStore.getState().clear();
      })();
    }, VERIFIED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [poll]);
}
