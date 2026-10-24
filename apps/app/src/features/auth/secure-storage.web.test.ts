/// <reference types="jest" />
import { secureStorage } from './secure-storage';

const KEY = 'pokatim.registration';

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => jest.restoreAllMocks());

describe('хранилище (web): sessionStorage вкладки', () => {
  it('запись, чтение и удаление — в sessionStorage, не в localStorage', async () => {
    await secureStorage.set(KEY, 'value');
    expect(sessionStorage.getItem(KEY)).toBe('value');
    expect(localStorage.length).toBe(0);
    await expect(secureStorage.get(KEY)).resolves.toBe('value');

    await secureStorage.delete(KEY);
    await expect(secureStorage.get(KEY)).resolves.toBeNull();
  });

  it('сбой хранилища (квота, запрет сайта) — не бросает: значения нет, запись пропущена', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failure = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(failure);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(failure);
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(failure);

    await expect(secureStorage.get(KEY)).resolves.toBeNull();
    await expect(secureStorage.set(KEY, 'value')).resolves.toBeUndefined();
    await expect(secureStorage.delete(KEY)).resolves.toBeUndefined();
    // в лог — только имя ошибки, без значения
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('SecurityError'));
    expect(JSON.stringify(warn.mock.calls)).not.toContain('value');
  });

  it('без sessionStorage (SSR, заблокированный доступ) — не бросает', async () => {
    jest.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    await expect(secureStorage.get(KEY)).resolves.toBeNull();
    await expect(secureStorage.set(KEY, 'value')).resolves.toBeUndefined();
    await expect(secureStorage.delete(KEY)).resolves.toBeUndefined();
  });
});
