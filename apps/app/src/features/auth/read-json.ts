import { secureStorage, type SecureKey } from './secure-storage';

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
