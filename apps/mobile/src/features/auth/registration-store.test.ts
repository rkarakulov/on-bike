/// <reference types="jest" />
import { resetRegistrationStore, useRegistrationStore } from './registration-store';
import { EMAIL, NOW, REGISTRATION_TOKEN, registerResponse } from '@/__tests__/auth-fixtures';

const stored = () =>
  jest.requireMock<{ __store: Map<string, string> }>('expo-secure-store').__store;
const now = NOW.getTime();
const HOUR = 3600_000;

beforeEach(() => resetRegistrationStore());

describe('ожидающая регистрация', () => {
  it('после регистрации: токен, e-mail и момент повтора — в SecureStore', async () => {
    await useRegistrationStore.getState().start(registerResponse, now);

    const pending = useRegistrationStore.getState().pending;
    expect(pending).toEqual({
      registrationToken: REGISTRATION_TOKEN,
      email: EMAIL,
      resendAvailableAt: now + 60_000,
      expiresAt: now + 24 * HOUR,
    });
    expect(JSON.parse(stored().get('onbike.registration') ?? '')).toEqual(pending);
  });

  it('переживает перезапуск, пока жив токен (24 ч), и просит открыть «Подтвердите e-mail»', async () => {
    await useRegistrationStore.getState().start(registerResponse, now);
    resetRegistrationStore();

    await useRegistrationStore.getState().hydrate(now + 23 * HOUR);
    const state = useRegistrationStore.getState();
    expect(state).toMatchObject({ hydrated: true, resumeOnLaunch: true });
    expect(state.pending?.registrationToken).toBe(REGISTRATION_TOKEN);
    // e-mail восстановленной регистрации подставляется в форму
    expect(state.draft.email).toBe(EMAIL);
  });

  it('через 24 ч токен мёртв: состояние очищается', async () => {
    await useRegistrationStore.getState().start(registerResponse, now);
    resetRegistrationStore();

    await useRegistrationStore.getState().hydrate(now + 24 * HOUR + 1);
    expect(useRegistrationStore.getState()).toMatchObject({ pending: null, resumeOnLaunch: false });
    expect(stored().has('onbike.registration')).toBe(false);
  });

  it('повтор письма сдвигает паузу и продлевает срок (TTL скользящий, task.md §8.1)', async () => {
    await useRegistrationStore.getState().start(registerResponse, now);
    await useRegistrationStore.getState().resent(60, now + 20 * HOUR);

    expect(useRegistrationStore.getState().pending).toMatchObject({
      resendAvailableAt: now + 20 * HOUR + 60_000,
      expiresAt: now + 44 * HOUR,
    });
  });

  it('пауза после 429 — без продления срока', async () => {
    await useRegistrationStore.getState().start(registerResponse, now);
    await useRegistrationStore.getState().pauseResend(900, now + 1000);
    expect(useRegistrationStore.getState().pending).toMatchObject({
      resendAvailableAt: now + 1000 + 900_000,
      expiresAt: now + 24 * HOUR,
    });
  });

  it('clear удаляет токен из хранилища; черновик формы (без пароля) живёт в памяти', async () => {
    useRegistrationStore.getState().saveDraft({ email: EMAIL, birthDate: '1991-03-14' });
    await useRegistrationStore.getState().start(registerResponse, now);
    await useRegistrationStore.getState().clear();

    expect(useRegistrationStore.getState().pending).toBeNull();
    expect(stored().has('onbike.registration')).toBe(false);
    expect(useRegistrationStore.getState().draft).toEqual({
      email: EMAIL,
      birthDate: '1991-03-14',
    });
  });
});
