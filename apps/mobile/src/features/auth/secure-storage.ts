import * as SecureStore from 'expo-secure-store';

/** Ключи хранилища (Keychain / Keystore допускают только `[A-Za-z0-9._-]`). */
export type SecureKey = 'onbike.session' | 'onbike.registration';

/**
 * Единственная точка доступа к защищённому хранилищу: экраны и сторы не знают о нативном модуле,
 * web-реализация добавляется файлом `secure-storage.web.ts` рядом.
 */
export const secureStorage = {
  get: (key: SecureKey): Promise<string | null> => SecureStore.getItemAsync(key),
  set: (key: SecureKey, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
  delete: (key: SecureKey): Promise<void> => SecureStore.deleteItemAsync(key),
};

/** JSON из хранилища по схеме; битое или чужое значение удаляется и считается отсутствующим. */
export async function readJson<T>(
  key: SecureKey,
  parse: (value: unknown) => T | undefined,
): Promise<T | undefined> {
  try {
    const raw = await secureStorage.get(key);
    if (raw === null) return undefined;
    const value = parse(JSON.parse(raw));
    if (value === undefined) await secureStorage.delete(key);
    return value;
  } catch {
    // недоступное хранилище или не-JSON — начинаем с чистого состояния, не блокируя запуск
    await secureStorage.delete(key).catch(() => undefined);
    return undefined;
  }
}
