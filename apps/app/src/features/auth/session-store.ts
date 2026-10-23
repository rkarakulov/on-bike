import type { AnySession, CookieSession } from '@on-bike/contracts';
import { create } from 'zustand';

import { isSessionAlive } from './session-expiry';
import { clearSession, persistSession, restoreSession } from './session-persistence';

/**
 * `unknown` — до восстановления сессии при запуске (native: SecureStore; web: refresh по cookie);
 * `unavailable` — проверить не удалось (web: 429, сеть, сбой API после повторов): не выход, повтор — `hydrate()`
 */
export type SessionStatus = 'unknown' | 'unavailable' | 'signedOut' | 'signedIn';

interface SessionState {
  status: SessionStatus;
  /** общая часть native и web: access и сроки; refresh на web — только в httpOnly cookie */
  session: CookieSession | null;
  /** причина `unavailable` — «Нет соединения» или «Не удалось загрузить» */
  restoreError: unknown;
  hydrate: (now?: number) => Promise<void>;
  signIn: (session: AnySession) => Promise<void>;
  signOut: () => Promise<void>;
}

/** Условие гарда: есть сессия с непросроченным refresh. */
export const isSignedIn = (state: Pick<SessionState, 'status' | 'session'>, now = Date.now()) =>
  state.status === 'signedIn' && state.session !== null && isSessionAlive(state.session, now);

/** Гард пускает в вкладки и регистрацию, пока сессия не известна: вкладки показывают скелетон или повтор. */
export const isSessionPending = (status: SessionStatus) =>
  status === 'unknown' || status === 'unavailable';

type Restored = Pick<SessionState, 'status' | 'session' | 'restoreError'>;

async function restore(now: number): Promise<Restored> {
  try {
    const session = await restoreSession(now);
    return session
      ? { status: 'signedIn', session, restoreError: null }
      : { status: 'signedOut', session: null, restoreError: null };
  } catch (error) {
    // native не бросает; web — временный сбой после повторов: сессия, может быть, жива — не выход
    return { status: 'unavailable', session: null, restoreError: error };
  }
}

export const useSessionStore = create<SessionState>()((set) => ({
  status: 'unknown',
  session: null,
  restoreError: null,
  hydrate: async (now = Date.now()) => {
    // повтор после «не удалось» — снова «неизвестно» (скелетон)
    set((state) =>
      state.status === 'unavailable' ? { status: 'unknown', restoreError: null } : state,
    );
    const restored = await restore(now);
    // вход, случившийся пока шло восстановление (web: refresh — сетевой запрос), ответ не затирает
    set((state) => (state.status !== 'unknown' ? state : restored));
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
  useSessionStore.setState({ status: 'unknown', session: null, restoreError: null });
