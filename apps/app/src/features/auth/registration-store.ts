import { RegistrationToken, type RegisterResponse } from '@pokatim/contracts';
import { z } from 'zod';
import { create } from 'zustand';

import { readJson } from './read-json';
import { secureStorage } from './secure-storage';

const KEY = 'pokatim.registration';
/** Срок токена регистрации (ADR-0002); каждый повтор письма продлевает его (task.md §8.1). */
export const REGISTRATION_TTL_MS = 24 * 3600_000;

/** Формат записи в хранилище (SecureStore; web — sessionStorage), локальный, не API. */
const PendingRegistrationRecord = z.object({
  registrationToken: RegistrationToken,
  email: z.string(),
  /** мс: раньше этого момента повтор письма недоступен */
  resendAvailableAt: z.number(),
  /** мс: оценка срока токена на клиенте; точный срок знает сервер (401) */
  expiresAt: z.number(),
});
export type PendingRegistration = z.infer<typeof PendingRegistrationRecord>;

/** Черновик формы для «Вернуться к регистрации» — без пароля и только в памяти. */
export interface RegistrationDraft {
  email?: string;
  birthDate?: string;
  personalDataConsent?: boolean;
}

interface RegistrationState {
  pending: PendingRegistration | null;
  draft: RegistrationDraft;
  hydrated: boolean;
  /** при запуске найдена живая регистрация — открыть «Подтвердите e-mail» один раз */
  resumeOnLaunch: boolean;
  hydrate: (now?: number) => Promise<void>;
  start: (response: RegisterResponse, now?: number) => Promise<void>;
  /** письмо отправлено ещё раз: новая пауза и продление срока */
  resent: (resendAvailableInSec: number, now?: number) => Promise<void>;
  /** 429: пауза по retryAfterSec, срок не меняется */
  pauseResend: (retryAfterSec: number, now?: number) => Promise<void>;
  saveDraft: (draft: RegistrationDraft) => void;
  consumeResume: () => void;
  clear: () => Promise<void>;
}

export const useRegistrationStore = create<RegistrationState>()((set, get) => {
  // Сначала память, потом хранилище: аккаунт уже создан на сервере, поэтому сбой Keychain/Keystore
  // не должен остановить сценарий — продолжаем с токеном в памяти (после перезапуска не восстановится).
  const save = async (pending: PendingRegistration) => {
    set({ pending });
    try {
      await secureStorage.set(KEY, JSON.stringify(pending));
    } catch (error) {
      console.warn(`registration not persisted: ${(error as Error).name}`);
    }
  };

  return {
    pending: null,
    draft: {},
    hydrated: false,
    resumeOnLaunch: false,
    hydrate: async (now = Date.now()) => {
      const pending = await readJson(KEY, (value) => {
        const parsed = PendingRegistrationRecord.safeParse(value);
        return parsed.success && parsed.data.expiresAt > now ? parsed.data : undefined;
      });
      set((state) => ({
        pending: pending ?? null,
        draft: pending
          ? { ...state.draft, email: state.draft.email ?? pending.email }
          : state.draft,
        hydrated: true,
        resumeOnLaunch: pending !== undefined,
      }));
    },
    start: (response, now = Date.now()) =>
      save({
        registrationToken: response.registrationToken,
        email: response.email,
        resendAvailableAt: now + response.resendAvailableInSec * 1000,
        expiresAt: now + REGISTRATION_TTL_MS,
      }),
    resent: async (resendAvailableInSec, now = Date.now()) => {
      const { pending } = get();
      if (!pending) return;
      await save({
        ...pending,
        resendAvailableAt: now + resendAvailableInSec * 1000,
        expiresAt: now + REGISTRATION_TTL_MS,
      });
    },
    pauseResend: async (retryAfterSec, now = Date.now()) => {
      const { pending } = get();
      if (!pending) return;
      await save({ ...pending, resendAvailableAt: now + retryAfterSec * 1000 });
    },
    saveDraft: (draft) => set({ draft }),
    consumeResume: () => set({ resumeOnLaunch: false }),
    // как и save: сначала память, затем хранилище; сбой удаления не мешает сценарию
    clear: async () => {
      set({ pending: null, resumeOnLaunch: false });
      try {
        await secureStorage.delete(KEY);
      } catch (error) {
        console.warn(`registration not cleared: ${(error as Error).name}`);
      }
    },
  };
});

/** Для тестов: состояние «только что запущено». */
export const resetRegistrationStore = () =>
  useRegistrationStore.setState({
    pending: null,
    draft: {},
    hydrated: false,
    resumeOnLaunch: false,
  });
