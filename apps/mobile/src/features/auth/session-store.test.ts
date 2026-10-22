/// <reference types="jest" />
import * as SecureStore from 'expo-secure-store';

import { isSignedIn, resetSessionStore, useSessionStore } from './session-store';
import { NOW, session } from '@/__tests__/auth-fixtures';

const stored = () =>
  jest.requireMock<{ __store: Map<string, string> }>('expo-secure-store').__store;

beforeEach(() => resetSessionStore());

describe('сессия', () => {
  it('до гидрации статус неизвестен; пустое хранилище → не вошёл', async () => {
    expect(useSessionStore.getState().status).toBe('unknown');
    await useSessionStore.getState().hydrate(NOW.getTime());
    expect(useSessionStore.getState().status).toBe('signedOut');
  });

  it('вход сохраняет сессию в SecureStore, гидрация после перезапуска её восстанавливает', async () => {
    await useSessionStore.getState().signIn(session);
    expect(JSON.parse(stored().get('onbike.session') ?? '')).toEqual(session);
    expect(isSignedIn(useSessionStore.getState(), NOW.getTime())).toBe(true);

    resetSessionStore();
    await useSessionStore.getState().hydrate(NOW.getTime());
    expect(useSessionStore.getState()).toMatchObject({ status: 'signedIn', session });
  });

  it('гард: вошедшим считается только непросроченный refresh (access 15 мин не важен)', async () => {
    await useSessionStore.getState().signIn(session);
    const afterAccess = new Date('2026-10-22T12:00:00Z').getTime();
    expect(isSignedIn(useSessionStore.getState(), afterAccess)).toBe(true);
    const afterRefresh = new Date('2026-11-21T10:00:01Z').getTime();
    expect(isSignedIn(useSessionStore.getState(), afterRefresh)).toBe(false);
  });

  it('просроченная или битая сессия при запуске удаляется', async () => {
    stored().set('onbike.session', JSON.stringify(session));
    await useSessionStore.getState().hydrate(new Date('2026-12-01T00:00:00Z').getTime());
    expect(useSessionStore.getState().status).toBe('signedOut');
    expect(stored().has('onbike.session')).toBe(false);

    stored().set('onbike.session', '{"accessToken":1');
    await useSessionStore.getState().hydrate(NOW.getTime());
    expect(useSessionStore.getState().status).toBe('signedOut');
    expect(stored().has('onbike.session')).toBe(false);
  });

  it('хранилище недоступно — запуск не блокируется, пользователь не вошёл', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keychain locked'));
    await useSessionStore.getState().hydrate(NOW.getTime());
    expect(useSessionStore.getState().status).toBe('signedOut');
  });
});
