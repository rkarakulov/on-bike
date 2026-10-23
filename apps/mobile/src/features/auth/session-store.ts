import { Session } from '@on-bike/contracts';
import { create } from 'zustand';

import { readJson, secureStorage } from './secure-storage';

const KEY = 'onbike.session';

export type SessionStatus = 'unknown' | 'signedOut' | 'signedIn';

interface SessionState {
  /** `unknown` — до чтения SecureStore при запуске (splash ещё держится) */
  status: SessionStatus;
  session: Session | null;
  hydrate: (now?: number) => Promise<void>;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
}

/** Слайс 1: refresh-ротации ещё нет, поэтому сессия жива, пока жив refresh (access — 15 мин). */
export const isSessionAlive = (session: Session, now: number) =>
  Date.parse(session.refreshTokenExpiresAt) > now;

/** Условие гарда: есть сессия с непросроченным refresh. */
export const isSignedIn = (state: Pick<SessionState, 'status' | 'session'>, now = Date.now()) =>
  state.status === 'signedIn' && state.session !== null && isSessionAlive(state.session, now);

/**
 * Сохранить сессию сразу, ещё до входа: если приложение закроют во время «E-mail подтверждён», вход не потеряется.
 * Никогда не бросает: токен регистрации уже обменян, повторно сессию не получить — сбой Keychain/Keystore
 * не должен блокировать вход (сессия живёт в памяти до перезапуска).
 */
export async function persistSession(session: Session): Promise<boolean> {
  try {
    await secureStorage.set(KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    console.warn(`session not persisted: ${(error as Error).name}`);
    return false;
  }
}

export const useSessionStore = create<SessionState>()((set) => ({
  status: 'unknown',
  session: null,
  hydrate: async (now = Date.now()) => {
    const session = await readJson(KEY, (value) => {
      const parsed = Session.safeParse(value);
      return parsed.success && isSessionAlive(parsed.data, now) ? parsed.data : undefined;
    });
    set(session ? { status: 'signedIn', session } : { status: 'signedOut', session: null });
  },
  // сначала память (вход состоялся), затем хранилище — сбой записи вход не отменяет
  signIn: async (session) => {
    set({ status: 'signedIn', session });
    await persistSession(session);
  },
  signOut: async () => {
    await secureStorage.delete(KEY);
    set({ status: 'signedOut', session: null });
  },
}));

/** Для тестов: состояние «только что запущено». */
export const resetSessionStore = () =>
  useSessionStore.setState({ status: 'unknown', session: null });
