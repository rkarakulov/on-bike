import type { AnySession, CookieSession } from '@on-bike/contracts';
import { create } from 'zustand';

import { isSessionAlive } from './session-expiry';
import { clearSession, persistSession, restoreSession } from './session-persistence';

export type SessionStatus = 'unknown' | 'signedOut' | 'signedIn';

interface SessionState {
  /** `unknown` — до восстановления сессии при запуске (native: SecureStore; web: refresh по cookie) */
  status: SessionStatus;
  /** общая часть native и web: access и сроки; refresh на web — только в httpOnly cookie */
  session: CookieSession | null;
  hydrate: (now?: number) => Promise<void>;
  signIn: (session: AnySession) => Promise<void>;
  signOut: () => Promise<void>;
}

/** Условие гарда: есть сессия с непросроченным refresh. */
export const isSignedIn = (state: Pick<SessionState, 'status' | 'session'>, now = Date.now()) =>
  state.status === 'signedIn' && state.session !== null && isSessionAlive(state.session, now);

export const useSessionStore = create<SessionState>()((set) => ({
  status: 'unknown',
  session: null,
  hydrate: async (now = Date.now()) => {
    const session = await restoreSession(now);
    // вход, случившийся пока шло восстановление (web: refresh — сетевой запрос), ответ не затирает
    set((state) =>
      state.status !== 'unknown'
        ? state
        : session
          ? { status: 'signedIn', session }
          : { status: 'signedOut', session: null },
    );
  },
  // сначала память (вход состоялся), затем хранилище — сбой записи вход не отменяет
  signIn: async (session) => {
    set({ status: 'signedIn', session });
    await persistSession(session);
  },
  signOut: async () => {
    await clearSession();
    set({ status: 'signedOut', session: null });
  },
}));

/** Для тестов: состояние «только что запущено». */
export const resetSessionStore = () =>
  useSessionStore.setState({ status: 'unknown', session: null });
